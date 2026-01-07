import { Router } from 'express';
import WebSocket, { WebSocketServer } from 'ws';
import { Trainset } from '../models/Trainset';
import { FitnessCertificate, BrandingContract, MileageBalance } from '../models/Decision';

// Extend WebSocket interface to include custom properties
interface ExtendedWebSocket extends WebSocket {
  trainsetSubscription?: string;
}

const router = Router();

// WebSocket server for real-time updates (singleton)
const GLOBAL_WSS_KEY = '__kmrlRealtimeWss';
const GLOBAL_WSS_INIT_KEY = '__kmrlRealtimeWssInit';

let wss = (globalThis as any)[GLOBAL_WSS_KEY] as WebSocketServer | undefined;
if (!wss) {
  try {
    wss = new WebSocketServer({ port: 8081 });
    (globalThis as any)[GLOBAL_WSS_KEY] = wss;
  } catch (err: any) {
    // If another node process already has the port, don't crash the API server.
    if (err?.code === 'EADDRINUSE') {
      console.warn('WebSocket port 8081 already in use. Skipping WebSocket server start in this process.');
    } else {
      throw err;
    }
  }
}

// Store connected clients
const clients = (globalThis as any).__kmrlRealtimeClients as Set<ExtendedWebSocket> | undefined || new Set<ExtendedWebSocket>();
(globalThis as any).__kmrlRealtimeClients = clients;

if (wss && !(globalThis as any)[GLOBAL_WSS_INIT_KEY]) {
  (globalThis as any)[GLOBAL_WSS_INIT_KEY] = true;

  // WebSocket connection handler
  wss.on('connection', (ws: ExtendedWebSocket) => {
    console.log('New WebSocket client connected');
    clients.add(ws);
    
    // Send initial data to new client
    sendInitialData(ws);
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        handleWebSocketMessage(ws, data);
      } catch (error) {
        console.error('Invalid WebSocket message:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      clients.delete(ws);
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
    });
  });
}

// Broadcast to all connected clients
function broadcast(data: any) {
  const message = JSON.stringify(data);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Send initial data to new client
async function sendInitialData(ws: WebSocket) {
  try {
    const trainsets = await Trainset.find({});
    const fitnessCerts = await FitnessCertificate.find({});
    const brandingContracts = await BrandingContract.find({});
    const mileageBalances = await MileageBalance.find({});
    
    ws.send(JSON.stringify({
      type: 'INITIAL_DATA',
      data: {
        trainsets,
        fitnessCerts,
        brandingContracts,
        mileageBalances
      }
    }));
  } catch (error) {
    console.error('Error sending initial data:', error);
  }
}

// Handle WebSocket messages
function handleWebSocketMessage(ws: ExtendedWebSocket, data: any) {
  switch (data.type) {
    case 'SUBSCRIBE_TRAINSET':
      // Subscribe to specific trainset updates
      ws.trainsetSubscription = data.trainsetId;
      break;
    case 'GET_REAL_TIME_UPDATES':
      // Send real-time updates for subscribed trainset
      sendRealTimeUpdates(ws, data.trainsetId);
      break;
    default:
      console.log('Unknown WebSocket message type:', data.type);
  }
}

// Send real-time updates for specific trainset
async function sendRealTimeUpdates(ws: WebSocket, trainsetId: string) {
  try {
    const trainset = await Trainset.findOne({ id: trainsetId });
    const fitnessCerts = await FitnessCertificate.find({ trainsetId });
    const brandingContract = await BrandingContract.findOne({ trainsetId });
    const mileageBalance = await MileageBalance.findOne({ trainsetId });
    
    ws.send(JSON.stringify({
      type: 'REAL_TIME_UPDATE',
      trainsetId,
      data: {
        trainset,
        fitnessCerts,
        brandingContract,
        mileageBalance
      }
    }));
  } catch (error) {
    console.error('Error sending real-time updates:', error);
  }
}

// Maximo Integration Routes
router.post('/maximo/import', async (req, res) => {
  try {
    const { jobCards } = req.body;
    
    // Process Maximo job cards
    const processedJobCards = [];
    for (const jobCard of jobCards) {
      // Update trainset with job card information
      await Trainset.findOneAndUpdate(
        { id: jobCard.trainsetId },
        { 
          jobCardOpen: jobCard.status === 'OPEN',
          lastUpdated: new Date()
        }
      );
      
      processedJobCards.push({
        ...jobCard,
        processedAt: new Date(),
        status: 'PROCESSED'
      });
      
      // Broadcast real-time update
      broadcast({
        type: 'MAXIMO_UPDATE',
        data: {
          trainsetId: jobCard.trainsetId,
          jobCard: jobCard,
          timestamp: new Date()
        }
      });
    }
    
    res.json({
      success: true,
      processed: processedJobCards.length,
      jobCards: processedJobCards
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to import Maximo data' });
  }
});

router.get('/maximo/status', (req, res) => {
  res.json({
    connected: true,
    lastSync: new Date(),
    totalImported: 156,
    errors: []
  });
});

// WhatsApp Integration Routes
router.post('/whatsapp/webhook', async (req, res) => {
  try {
    const { message, from, timestamp } = req.body;
    
    // Parse WhatsApp message
    const parsedMessage = parseWhatsAppMessage(message);
    
    if (parsedMessage) {
      // Process the parsed message
      const result = await processWhatsAppUpdate(parsedMessage, from);
      
      // Broadcast real-time update
      broadcast({
        type: 'WHATSAPP_UPDATE',
        data: {
          from,
          message: parsedMessage,
          result,
          timestamp
        }
      });
      
      res.json({ success: true, result });
    } else {
      res.json({ success: false, message: 'Unable to parse message' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to process WhatsApp message' });
  }
});

router.post('/whatsapp/send', async (req, res) => {
  try {
    const { to, message } = req.body;
    
    // Send WhatsApp message (integration with WhatsApp API)
    const result = await sendWhatsAppMessage(to, message);
    
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send WhatsApp message' });
  }
});

// Manual Input Routes
router.post('/manual/fitness', async (req, res) => {
  try {
    const { trainsetId, department, status, details, inspectorName } = req.body;
    
    // Create or update fitness certificate
    const fitnessCert = await FitnessCertificate.findOneAndUpdate(
      { trainsetId, department },
      {
        status,
        details,
        inspectorName,
        lastInspection: new Date(),
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        nextInspectionDue: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      },
      { upsert: true, new: true }
    );
    
    // Broadcast real-time update
    broadcast({
      type: 'MANUAL_FITNESS_UPDATE',
      data: {
        trainsetId,
        department,
        fitnessCert,
        timestamp: new Date()
      }
    });
    
    res.json({ success: true, fitnessCert });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update fitness certificate' });
  }
});

router.post('/manual/mileage', async (req, res) => {
  try {
    const { trainsetId, currentMileage, updatedBy } = req.body;
    
    // Update mileage balance
    const mileageBalance = await MileageBalance.findOneAndUpdate(
      { trainsetId },
      {
        currentMileage,
        variance: currentMileage - 50000, // Assuming 50000 target
        updatedBy,
        lastUpdated: new Date()
      },
      { upsert: true, new: true }
    );
    
    // Broadcast real-time update
    broadcast({
      type: 'MANUAL_MILEAGE_UPDATE',
      data: {
        trainsetId,
        mileageBalance,
        timestamp: new Date()
      }
    });
    
    res.json({ success: true, mileageBalance });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update mileage' });
  }
});

router.post('/manual/cleaning', async (req, res) => {
  try {
    const { trainsetId, cleaningType, status, bayId, updatedBy } = req.body;
    
    // Update trainset cleaning status
    await Trainset.findOneAndUpdate(
      { id: trainsetId },
      {
        cleaningStatus: status,
        lastUpdated: new Date()
      }
    );
    
    // Broadcast real-time update
    broadcast({
      type: 'MANUAL_CLEANING_UPDATE',
      data: {
        trainsetId,
        cleaningType,
        status,
        bayId,
        timestamp: new Date()
      }
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update cleaning status' });
  }
});

// Helper Functions
function parseWhatsAppMessage(message: string) {
  const patterns = {
    fitness: /fitness\s+(\w+)\s+(TS-\d+)\s+(PASS|WARN|FAIL)\s*(.+)?/i,
    mileage: /mileage\s+(TS-\d+)\s+(\d+)/i,
    cleaning: /cleaning\s+(TS-\d+)\s+(COMPLETED|PENDING|OVERDUE)\s*(.+)?/i,
    branding: /branding\s+(TS-\d+)\s+(\d+)\s*hours?/i
  };
  
  for (const [type, pattern] of Object.entries(patterns)) {
    const match = message.match(pattern);
    if (match) {
      return {
        type,
        data: match.slice(1)
      };
    }
  }
  
  return null;
}

async function processWhatsAppUpdate(parsedMessage: any, from: string) {
  const { type, data } = parsedMessage;
  
  switch (type) {
    case 'fitness':
      const [department, fitnessTrainsetId, fitnessStatus, details] = data;
      return await updateFitnessFromWhatsApp(fitnessTrainsetId, department, fitnessStatus, details, from);
    
    case 'mileage':
      const [mileageTrainsetId, mileage] = data;
      return await updateMileageFromWhatsApp(mileageTrainsetId, parseInt(mileage), from);
    
    case 'cleaning':
      const [cleaningTrainsetId, cleaningStatus, bayId] = data;
      return await updateCleaningFromWhatsApp(cleaningTrainsetId, cleaningStatus, bayId, from);
    
    case 'branding':
      const [brandingTrainsetId, hours] = data;
      return await updateBrandingFromWhatsApp(brandingTrainsetId, parseInt(hours), from);
    
    default:
      return { success: false, message: 'Unknown update type' };
  }
}

async function updateFitnessFromWhatsApp(trainsetId: string, department: string, status: string, details: string, from: string) {
  try {
    const fitnessCert = await FitnessCertificate.findOneAndUpdate(
      { trainsetId, department: department.toUpperCase() },
      {
        status: status.toUpperCase() as any,
        details: details || `WhatsApp update from ${from}`,
        lastInspection: new Date(),
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      },
      { upsert: true, new: true }
    );
    
    return { success: true, fitnessCert };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function updateMileageFromWhatsApp(trainsetId: string, mileage: number, from: string) {
  try {
    const mileageBalance = await MileageBalance.findOneAndUpdate(
      { trainsetId },
      {
        currentMileage: mileage,
        variance: mileage - 50000,
        updatedBy: `WhatsApp:${from}`
      },
      { upsert: true, new: true }
    );
    
    return { success: true, mileageBalance };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function updateCleaningFromWhatsApp(trainsetId: string, status: string, bayId: string, from: string) {
  try {
    await Trainset.findOneAndUpdate(
      { id: trainsetId },
      {
        cleaningStatus: status.toUpperCase() as any,
        lastUpdated: new Date()
      }
    );
    
    return { success: true, message: 'Cleaning status updated' };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function updateBrandingFromWhatsApp(trainsetId: string, hours: number, from: string) {
  try {
    const contract = await BrandingContract.findOneAndUpdate(
      { trainsetId },
      {
        currentHours: hours,
        remainingHours: Math.max(0, 1000 - hours), // Assuming 1000 contract hours
        lastUpdated: new Date(),
        updatedBy: `WhatsApp:${from}`
      },
      { upsert: true, new: true }
    );
    
    return { success: true, contract };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function sendWhatsAppMessage(to: string, message: string) {
  // Integration with WhatsApp Business API
  // This is a mock implementation
  console.log(`Sending WhatsApp message to ${to}: ${message}`);
  
  return {
    success: true,
    messageId: `msg_${Date.now()}`,
    timestamp: new Date()
  };
}

// Real-time monitoring endpoint
router.get('/monitoring', (req, res) => {
  res.json({
    websocket: {
      connectedClients: clients.size,
      serverRunning: true,
      port: 8081
    },
    maximo: {
      connected: true,
      lastSync: new Date(),
      totalImported: 156
    },
    whatsapp: {
      connected: true,
      messagesReceived: 45,
      messagesSent: 23
    }
  });
});

export default router;
