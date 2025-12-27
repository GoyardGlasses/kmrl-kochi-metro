import type { IoTSensorReading, MaximoJobCard, ManualOverride } from "@/types/dataIntegration";
import { httpClient } from "./httpClient";

export class DataIntegrationService {
  // IoT Sensor Integration
  async getIoTReadings(params?: {
    trainsetId?: string;
    department?: string;
    since?: string;
  }): Promise<IoTSensorReading[]> {
    const searchParams = new URLSearchParams();
    if (params?.trainsetId) searchParams.append('trainsetId', params.trainsetId);
    if (params?.department) searchParams.append('department', params.department);
    if (params?.since) searchParams.append('since', params.since);
    
    const query = searchParams.toString();
    return httpClient.get<IoTSensorReading[]>(`/data-integration/iot/readings${query ? `?${query}` : ''}`);
  }

  async submitIoTReading(reading: Omit<IoTSensorReading, 'timestamp'>): Promise<IoTSensorReading> {
    return httpClient.post<IoTSensorReading>('/data-integration/iot/readings', reading);
  }

  async getLatestIoTReadings(trainsetId: string): Promise<Record<string, IoTSensorReading>> {
    return httpClient.get<Record<string, IoTSensorReading>>(`/data-integration/iot/readings/latest/${trainsetId}`);
  }

  // Maximo Integration
  async getMaximoJobCards(params?: {
    trainsetId?: string;
    status?: string;
    priority?: string;
  }): Promise<MaximoJobCard[]> {
    const searchParams = new URLSearchParams();
    if (params?.trainsetId) searchParams.append('trainsetId', params.trainsetId);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.priority) searchParams.append('priority', params.priority);
    
    const query = searchParams.toString();
    return httpClient.get<MaximoJobCard[]>(`/data-integration/maximo/jobcards${query ? `?${query}` : ''}`);
  }

  async createMaximoJobCard(jobCard: Omit<MaximoJobCard, 'workOrderId' | 'reportedDate'>): Promise<MaximoJobCard> {
    return httpClient.post<MaximoJobCard>('/data-integration/maximo/jobcards', jobCard);
  }

  async updateMaximoJobCard(workOrderId: string, updates: Partial<MaximoJobCard>): Promise<MaximoJobCard> {
    return httpClient.patch<MaximoJobCard>(`/data-integration/maximo/jobcards/${workOrderId}`, updates);
  }

  async getOpenJobCards(trainsetId: string): Promise<MaximoJobCard[]> {
    return httpClient.get<MaximoJobCard[]>(`/data-integration/maximo/jobcards/open/${trainsetId}`);
  }

  // Manual Overrides
  async getManualOverrides(params?: {
    trainsetId?: string;
    field?: string;
    active?: boolean;
  }): Promise<ManualOverride[]> {
    const searchParams = new URLSearchParams();
    if (params?.trainsetId) searchParams.append('trainsetId', params.trainsetId);
    if (params?.field) searchParams.append('field', params.field);
    if (params?.active !== undefined) searchParams.append('active', params.active.toString());
    
    const query = searchParams.toString();
    return httpClient.get<ManualOverride[]>(`/data-integration/overrides${query ? `?${query}` : ''}`);
  }

  async createManualOverride(override: Omit<ManualOverride, 'id' | 'timestamp'>): Promise<ManualOverride> {
    return httpClient.post<ManualOverride>('/data-integration/overrides', override);
  }

  async deleteManualOverride(id: string): Promise<void> {
    return httpClient.delete(`/data-integration/overrides/${id}`);
  }

  // Data Integration Dashboard
  async getDataIntegrationDashboard(): Promise<{
    summary: {
      totalIoTReadings: number;
      openJobCards: number;
      activeOverrides: number;
      dataQuality: {
        iotSensorHealth: number;
        maximoSyncStatus: number;
        overrideCompliance: number;
        lastDataUpdate: number;
      };
    };
    recentActivity: {
      iotReadings: IoTSensorReading[];
      jobCards: MaximoJobCard[];
      overrides: ManualOverride[];
    };
  }> {
    return httpClient.get('/data-integration/dashboard');
  }

  // Real-time Data Streaming (WebSocket simulation)
  async subscribeToIoTUpdates(callback: (reading: IoTSensorReading) => void): Promise<void> {
    // In a real implementation, this would establish a WebSocket connection
    // For now, we'll simulate with polling
    const pollInterval = setInterval(async () => {
      try {
        const latestReadings = await this.getIoTReadings({ since: new Date(Date.now() - 60000).toISOString() });
        latestReadings.forEach(callback);
      } catch (error) {
        console.error('Error polling IoT updates:', error);
      }
    }, 30000); // Poll every 30 seconds

    // Return cleanup function
    return () => clearInterval(pollInterval);
  }

  async subscribeToMaximoUpdates(callback: (jobCard: MaximoJobCard) => void): Promise<void> {
    // Similar polling implementation for Maximo updates
    const pollInterval = setInterval(async () => {
      try {
        const recentJobs = await this.getMaximoJobCards({ status: 'OPEN' });
        recentJobs.forEach(callback);
      } catch (error) {
        console.error('Error polling Maximo updates:', error);
      }
    }, 60000); // Poll every minute

    return () => clearInterval(pollInterval);
  }
}

export const dataIntegrationService = new DataIntegrationService();
