import { Router } from 'express';
import { FitnessCertificate } from '../types/decision';

const router = Router();

// IoT Fitness Sensor Data Structure
interface IoTSensorReading {
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

// Mock IoT sensor data storage
let iotReadings: IoTSensorReading[] = [
  {
    sensorId: 'RS-001',
    department: 'ROLLING_STOCK',
    trainsetId: 'TS-01',
    timestamp: new Date().toISOString(),
    readings: {
      status: 'PASS',
      details: 'All systems operational. Brake pressure: 120 PSI, Wheel wear: 2mm',
      metrics: {
        brakePressure: 120,
        wheelWear: 2,
        motorTemp: 65,
        vibrationLevel: 0.5
      },
      location: 'Bogie-A1'
    },
    confidence: 95,
    source: 'IOT_SENSOR'
  },
  {
    sensorId: 'SIG-003',
    department: 'SIGNALLING',
    trainsetId: 'TS-01',
    timestamp: new Date().toISOString(),
    readings: {
      status: 'WARN',
      details: 'Signal strength at 75%. Minor interference detected on frequency 2.4GHz',
      metrics: {
        signalStrength: 75,
        interference: 15,
        latency: 45,
        packetLoss: 0.1
      },
      location: 'Antenna-Front'
    },
    confidence: 88,
    source: 'IOT_SENSOR'
  },
  {
    sensorId: 'TEL-002',
    department: 'TELECOM',
    trainsetId: 'TS-02',
    timestamp: new Date().toISOString(),
    readings: {
      status: 'FAIL',
      details: 'Communication system offline. Router not responding to ping',
      metrics: {
        connectivity: 0,
        bandwidth: 0,
        latency: 9999,
        errorRate: 100
      },
      location: 'Router-Central'
    },
    confidence: 99,
    source: 'IOT_SENSOR'
  }
];

// Maximo Job Card Data Structure
interface MaximoJobCard {
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

// Mock Maximo data storage
let maximoJobCards: MaximoJobCard[] = [
  {
    workOrderId: 'WO-2025-001',
    trainsetId: 'TS-01',
    assetNumber: 'RS-TS01-A1',
    description: 'Replace worn brake pads on Bogie A1',
    status: 'OPEN',
    priority: 'HIGH',
    reportedDate: '2025-12-20T08:00:00Z',
    targetCompletion: '2025-12-27T18:00:00Z',
    workType: 'CORRECTIVE',
    location: 'Bogie-A1',
    laborHours: 4,
    partsCost: 2500,
    technician: 'TECH-001'
  },
  {
    workOrderId: 'WO-2025-002',
    trainsetId: 'TS-02',
    assetNumber: 'SIG-TS02-MAIN',
    description: 'Annual signaling system inspection',
    status: 'CLOSED',
    priority: 'MEDIUM',
    reportedDate: '2025-12-15T09:00:00Z',
    targetCompletion: '2025-12-20T18:00:00Z',
    actualCompletion: '2025-12-19T16:30:00Z',
    workType: 'PREVENTIVE',
    location: 'Signal-Cabinet',
    laborHours: 6,
    partsCost: 800,
    technician: 'TECH-003'
  }
];

// Manual Override Data Structure
interface ManualOverride {
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

// Mock manual overrides storage
let manualOverrides: ManualOverride[] = [
  {
    id: 'OVR-001',
    trainsetId: 'TS-03',
    field: 'FITNESS',
    overrideValue: {
      department: 'TELECOM',
      status: 'PASS',
      details: 'Manual inspection passed - sensor malfunction suspected'
    },
    reason: 'IoT sensor showing false failure',
    overriddenBy: 'SUPERVISOR-001',
    timestamp: '2025-12-26T10:00:00Z',
    expiresAt: '2025-12-27T06:00:00Z',
    approvedBy: 'MANAGER-001'
  }
];

// IoT Sensor Endpoints
router.get('/iot/readings', (req, res) => {
  const { trainsetId, department, since } = req.query;
  
  let filtered = iotReadings;
  
  if (trainsetId) {
    filtered = filtered.filter(reading => reading.trainsetId === trainsetId);
  }
  
  if (department) {
    filtered = filtered.filter(reading => reading.department === department);
  }
  
  if (since) {
    const sinceDate = new Date(since as string);
    filtered = filtered.filter(reading => new Date(reading.timestamp) >= sinceDate);
  }
  
  res.json(filtered);
});

router.post('/iot/readings', (req, res) => {
  const reading: IoTSensorReading = {
    ...req.body,
    timestamp: req.body.timestamp || new Date().toISOString(),
    confidence: req.body.confidence || 80
  };
  
  iotReadings.push(reading);
  res.status(201).json(reading);
});

router.get('/iot/readings/latest/:trainsetId', (req, res) => {
  const { trainsetId } = req.params;
  
  const latestReadings = iotReadings
    .filter(reading => reading.trainsetId === trainsetId)
    .reduce((acc: Record<string, IoTSensorReading>, reading) => {
      if (!acc[reading.department] || new Date(reading.timestamp) > new Date(acc[reading.department].timestamp)) {
        acc[reading.department] = reading;
      }
      return acc;
    }, {});
  
  res.json(latestReadings);
});

// Maximo Integration Endpoints
router.get('/maximo/jobcards', (req, res) => {
  const { trainsetId, status, priority } = req.query;
  
  let filtered = maximoJobCards;
  
  if (trainsetId) {
    filtered = filtered.filter(job => job.trainsetId === trainsetId);
  }
  
  if (status) {
    filtered = filtered.filter(job => job.status === status);
  }
  
  if (priority) {
    filtered = filtered.filter(job => job.priority === priority);
  }
  
  res.json(filtered);
});

router.post('/maximo/jobcards', (req, res) => {
  const jobCard: MaximoJobCard = {
    ...req.body,
    workOrderId: `WO-${Date.now()}`,
    reportedDate: req.body.reportedDate || new Date().toISOString()
  };
  
  maximoJobCards.push(jobCard);
  res.status(201).json(jobCard);
});

router.patch('/maximo/jobcards/:workOrderId', (req, res) => {
  const { workOrderId } = req.params;
  const updates = req.body;
  
  const index = maximoJobCards.findIndex(job => job.workOrderId === workOrderId);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Job card not found' });
  }
  
  maximoJobCards[index] = { ...maximoJobCards[index], ...updates };
  res.json(maximoJobCards[index]);
});

router.get('/maximo/jobcards/open/:trainsetId', (req, res) => {
  const { trainsetId } = req.params;
  
  const openJobs = maximoJobCards.filter(job => 
    job.trainsetId === trainsetId && job.status === 'OPEN'
  );
  
  res.json(openJobs);
});

// Manual Override Endpoints
router.get('/overrides', (req, res) => {
  const { trainsetId, field, active } = req.query;
  
  let filtered = manualOverrides;
  
  if (trainsetId) {
    filtered = filtered.filter(override => override.trainsetId === trainsetId);
  }
  
  if (field) {
    filtered = filtered.filter(override => override.field === field);
  }
  
  if (active === 'true') {
    const now = new Date();
    filtered = filtered.filter(override => {
      if (!override.expiresAt) return true;
      return new Date(override.expiresAt) > now;
    });
  }
  
  res.json(filtered);
});

router.post('/overrides', (req, res) => {
  const override: ManualOverride = {
    ...req.body,
    id: `OVR-${Date.now()}`,
    timestamp: new Date().toISOString()
  };
  
  manualOverrides.push(override);
  res.status(201).json(override);
});

router.delete('/overrides/:id', (req, res) => {
  const { id } = req.params;
  
  const index = manualOverrides.findIndex(override => override.id === id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Override not found' });
  }
  
  manualOverrides.splice(index, 1);
  res.json({ message: 'Override deleted successfully' });
});

// Data Integration Dashboard
router.get('/dashboard', (req, res) => {
  const now = new Date();
  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  const recentIoTReadings = iotReadings.filter(reading => 
    new Date(reading.timestamp) >= last24Hours
  );
  
  const openJobCards = maximoJobCards.filter(job => job.status === 'OPEN');
  const activeOverrides = manualOverrides.filter(override => {
    if (!override.expiresAt) return true;
    return new Date(override.expiresAt) > now;
  });
  
  // Data quality metrics
  const dataQuality = {
    iotSensorHealth: calculateSensorHealth(iotReadings),
    maximoSyncStatus: calculateMaximoSync(maximoJobCards),
    overrideCompliance: calculateOverrideCompliance(manualOverrides),
    lastDataUpdate: Math.max(
      ...iotReadings.map(r => new Date(r.timestamp).getTime()),
      ...maximoJobCards.map(j => new Date(j.reportedDate).getTime())
    )
  };
  
  res.json({
    summary: {
      totalIoTReadings: recentIoTReadings.length,
      openJobCards: openJobCards.length,
      activeOverrides: activeOverrides.length,
      dataQuality
    },
    recentActivity: {
      iotReadings: recentIoTReadings.slice(-10),
      jobCards: openJobCards.slice(-5),
      overrides: activeOverrides.slice(-3)
    }
  });
});

// Helper Functions
function calculateSensorHealth(readings: IoTSensorReading[]): number {
  if (readings.length === 0) return 0;
  
  const avgConfidence = readings.reduce((sum, reading) => sum + reading.confidence, 0) / readings.length;
  const recentReadings = readings.filter(r => 
    new Date(r.timestamp) >= new Date(Date.now() - 2 * 60 * 60 * 1000) // Last 2 hours
  );
  
  const recencyScore = recentReadings.length / Math.max(readings.length, 1) * 100;
  
  return Math.round((avgConfidence * 0.7 + recencyScore * 0.3));
}

function calculateMaximoSync(jobCards: MaximoJobCard[]): number {
  if (jobCards.length === 0) return 100;
  
  const recentJobs = jobCards.filter(job => 
    new Date(job.reportedDate) >= new Date(Date.now() - 24 * 60 * 60 * 1000)
  );
  
  return Math.min(100, (recentJobs.length / jobCards.length) * 100);
}

function calculateOverrideCompliance(overrides: ManualOverride[]): number {
  if (overrides.length === 0) return 100;
  
  const approvedOverrides = overrides.filter(override => override.approvedBy);
  const expiredOverrides = overrides.filter(override => 
    override.expiresAt && new Date(override.expiresAt) < new Date()
  );
  
  const complianceScore = (approvedOverrides.length / overrides.length) * 100;
  const expiredPenalty = (expiredOverrides.length / overrides.length) * 20;
  
  return Math.max(0, Math.round(complianceScore - expiredPenalty));
}

export default router;
