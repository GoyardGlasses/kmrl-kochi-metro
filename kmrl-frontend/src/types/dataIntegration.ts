export interface IoTSensorReading {
  sensorId: string;
  department: 'ROLLING_STOCK' | 'SIGNALLING' | 'TELECOM';
  trainsetId: string;
  timestamp: string;
  readings: {
    status: 'PASS' | 'WARN' | 'FAIL';
    details: string;
    metrics?: Record<string, number>;
    location?: string;
  };
  confidence: number; // 0-100
  source: 'IOT_SENSOR' | 'MANUAL_INSPECTION' | 'AUTOMATED_TEST';
}

export interface MaximoJobCard {
  workOrderId: string;
  trainsetId: string;
  assetNumber: string;
  description: string;
  status: 'OPEN' | 'CLOSED' | 'IN_PROGRESS';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  reportedDate: string;
  targetCompletion: string;
  actualCompletion?: string;
  workType: 'CORRECTIVE' | 'PREVENTIVE' | 'EMERGENCY';
  location: string;
  laborHours: number;
  partsCost: number;
  technician: string;
}

export interface ManualOverride {
  id: string;
  trainsetId: string;
  field: 'FITNESS' | 'JOB_CARD' | 'BRANDING' | 'MILEAGE' | 'CLEANING';
  overrideValue: any;
  reason: string;
  overriddenBy: string;
  timestamp: string;
  expiresAt?: string;
  approvedBy?: string;
}

export interface DataIntegrationDashboard {
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
}
