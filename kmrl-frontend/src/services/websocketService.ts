import { useEffect, useRef, useState } from 'react';

export interface WebSocketMessage {
  type: string;
  data?: any;
  trainsetId?: string;
  timestamp?: string;
}

export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private messageHandlers = new Map<string, ((data: any) => void)[]>();
  private connectionHandlers: ((connected: boolean) => void)[] = [];

  constructor(private url: string) {
    this.connect();
  }

  private connect() {
    try {
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.notifyConnectionHandlers(true);
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.notifyConnectionHandlers(false);
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      this.attemptReconnect();
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  private handleMessage(message: WebSocketMessage) {
    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(message.data);
        } catch (error) {
          console.error('Error in message handler:', error);
        }
      });
    }
  }

  private notifyConnectionHandlers(connected: boolean) {
    this.connectionHandlers.forEach(handler => {
      try {
        handler(connected);
      } catch (error) {
        console.error('Error in connection handler:', error);
      }
    });
  }

  subscribe(messageType: string, handler: (data: any) => void) {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, []);
    }
    this.messageHandlers.get(messageType)!.push(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.messageHandlers.get(messageType);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  onConnectionChange(handler: (connected: boolean) => void) {
    this.connectionHandlers.push(handler);

    // Return unsubscribe function
    return () => {
      const index = this.connectionHandlers.indexOf(handler);
      if (index > -1) {
        this.connectionHandlers.splice(index, 1);
      }
    };
  }

  send(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, message not sent:', message);
    }
  }

  subscribeToTrainset(trainsetId: string) {
    this.send({
      type: 'SUBSCRIBE_TRAINSET',
      trainsetId
    });
  }

  getRealTimeUpdates(trainsetId: string) {
    this.send({
      type: 'GET_REAL_TIME_UPDATES',
      trainsetId
    });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// React hook for WebSocket
export function useWebSocket(url: string = 'ws://localhost:8081') {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const wsRef = useRef<WebSocketService | null>(null);

  useEffect(() => {
    wsRef.current = new WebSocketService(url);

    const unsubscribeConnection = wsRef.current.onConnectionChange((connected) => {
      setIsConnected(connected);
    });

    const unsubscribeMessages = wsRef.current.subscribe('*', (data) => {
      setLastMessage(data);
    });

    return () => {
      unsubscribeConnection();
      unsubscribeMessages();
      wsRef.current?.disconnect();
    };
  }, [url]);

  const subscribe = (messageType: string, handler: (data: any) => void) => {
    return wsRef.current?.subscribe(messageType, handler);
  };

  const send = (message: any) => {
    wsRef.current?.send(message);
  };

  const subscribeToTrainset = (trainsetId: string) => {
    wsRef.current?.subscribeToTrainset(trainsetId);
  };

  const getRealTimeUpdates = (trainsetId: string) => {
    wsRef.current?.getRealTimeUpdates(trainsetId);
  };

  return {
    isConnected,
    lastMessage,
    subscribe,
    send,
    subscribeToTrainset,
    getRealTimeUpdates
  };
}

// React hook for real-time trainset updates
export function useRealTimeTrainset(trainsetId: string) {
  const [trainsetData, setTrainsetData] = useState<any>(null);
  const [fitnessCerts, setFitnessCerts] = useState<any[]>([]);
  const [brandingContract, setBrandingContract] = useState<any>(null);
  const [mileageBalance, setMileageBalance] = useState<any>(null);
  const { isConnected, subscribe, subscribeToTrainset, getRealTimeUpdates } = useWebSocket();

  useEffect(() => {
    if (isConnected && trainsetId) {
      // Subscribe to trainset-specific updates
      subscribeToTrainset(trainsetId);
      getRealTimeUpdates(trainsetId);

      // Subscribe to different message types
      const unsubscribeInitial = subscribe('INITIAL_DATA', (data) => {
        if (data.trainsets) {
          const trainset = data.trainsets.find((t: any) => t.id === trainsetId);
          if (trainset) setTrainsetData(trainset);
        }
        if (data.fitnessCerts) {
          const certs = data.fitnessCerts.filter((cert: any) => cert.trainsetId === trainsetId);
          setFitnessCerts(certs);
        }
        if (data.brandingContracts) {
          const contract = data.brandingContracts.find((c: any) => c.trainsetId === trainsetId);
          if (contract) setBrandingContract(contract);
        }
        if (data.mileageBalances) {
          const balance = data.mileageBalances.find((b: any) => b.trainsetId === trainsetId);
          if (balance) setMileageBalance(balance);
        }
      });

      const unsubscribeRealTime = subscribe('REAL_TIME_UPDATE', (data) => {
        if (data.trainsetId === trainsetId) {
          if (data.data.trainset) setTrainsetData(data.data.trainset);
          if (data.data.fitnessCerts) setFitnessCerts(data.data.fitnessCerts);
          if (data.data.brandingContract) setBrandingContract(data.data.brandingContract);
          if (data.data.mileageBalance) setMileageBalance(data.data.mileageBalance);
        }
      });

      const unsubscribeFitness = subscribe('MANUAL_FITNESS_UPDATE', (data) => {
        if (data.trainsetId === trainsetId && data.fitnessCert) {
          setFitnessCerts(prev => {
            const updated = [...prev];
            const index = updated.findIndex(cert => 
              cert.trainsetId === trainsetId && cert.department === data.fitnessCert.department
            );
            if (index > -1) {
              updated[index] = data.fitnessCert;
            } else {
              updated.push(data.fitnessCert);
            }
            return updated;
          });
        }
      });

      const unsubscribeMileage = subscribe('MANUAL_MILEAGE_UPDATE', (data) => {
        if (data.trainsetId === trainsetId && data.mileageBalance) {
          setMileageBalance(data.mileageBalance);
        }
      });

      const unsubscribeMaximo = subscribe('MAXIMO_UPDATE', (data) => {
        if (data.trainsetId === trainsetId && trainsetData) {
          setTrainsetData(prev => prev ? {
            ...prev,
            jobCardOpen: data.jobCard.status === 'OPEN',
            lastUpdated: new Date()
          } : null);
        }
      });

      return () => {
        unsubscribeInitial();
        unsubscribeRealTime();
        unsubscribeFitness();
        unsubscribeMileage();
        unsubscribeMaximo();
      };
    }
  }, [isConnected, trainsetId, subscribe, subscribeToTrainset, getRealTimeUpdates]);

  return {
    isConnected,
    trainsetData,
    fitnessCerts,
    brandingContract,
    mileageBalance
  };
}

// Global WebSocket instance
let globalWebSocketService: WebSocketService | null = null;

export function getGlobalWebSocketService() {
  if (!globalWebSocketService) {
    globalWebSocketService = new WebSocketService('ws://localhost:8081');
  }
  return globalWebSocketService;
}
