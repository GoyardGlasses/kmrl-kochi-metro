import { Router } from 'express';
import { Trainset } from '../models/Trainset';

const router = Router();

// KPI Dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const trainsets = await Trainset.find({});
    
    // Calculate KPIs
    const totalTrainsets = trainsets.length;
    const revenueTrainsets = trainsets.filter(t => t.recommendation === 'REVENUE').length;
    const iblTrainsets = trainsets.filter(t => t.recommendation === 'IBL').length;
    
    // Punctuality KPI (based on fitness and conflicts)
    const punctualityScore = calculatePunctuality(trainsets);
    
    // Fleet Availability KPI
    const fleetAvailability = ((totalTrainsets - iblTrainsets) / totalTrainsets) * 100;
    
    // Maintenance Cost KPI (inverse of mileage and issues)
    const maintenanceCost = calculateMaintenanceCost(trainsets);
    
    // Branding Compliance KPI
    const brandingCompliance = calculateBrandingCompliance(trainsets);
    
    // Energy Consumption KPI (based on shunting and optimization)
    const energyConsumption = calculateEnergyConsumption(trainsets);
    
    res.json({
      punctuality: punctualityScore,
      fleetAvailability,
      maintenanceCost,
      brandingCompliance,
      energyConsumption
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch KPI data' });
  }
});

// Helper Functions
function calculatePunctuality(trainsets: any[]): number {
  let totalScore = 0;
  let count = 0;
  
  for (const trainset of trainsets) {
    let score = 100;
    
    // Deduct for fitness issues
    if (trainset.fitness.rollingStock.status === 'FAIL') score -= 30;
    else if (trainset.fitness.rollingStock.status === 'WARN') score -= 10;
    
    if (trainset.fitness.signalling.status === 'FAIL') score -= 25;
    else if (trainset.fitness.signalling.status === 'WARN') score -= 8;
    
    if (trainset.fitness.telecom.status === 'FAIL') score -= 25;
    else if (trainset.fitness.telecom.status === 'WARN') score -= 8;
    
    // Deduct for open job cards
    if (trainset.jobCardOpen) score -= 15;
    
    // Deduct for conflicts
    if (trainset.conflicts && trainset.conflicts.length > 0) {
      const highSeverityConflicts = trainset.conflicts.filter((c: any) => c.severity === 'HIGH').length;
      score -= highSeverityConflicts * 20;
    }
    
    totalScore += Math.max(0, score);
    count++;
  }
  
  return count > 0 ? Math.round((totalScore / count) * 100) / 100 : 0;
}

function calculateMaintenanceCost(trainsets: any[]): number {
  let totalCost = 0;
  let count = 0;
  
  for (const trainset of trainsets) {
    let cost = 50; // Base cost
    
    // Increase cost based on mileage
    if (trainset.mileageKm > 50000) cost += 20;
    else if (trainset.mileageKm > 40000) cost += 10;
    
    // Increase cost for fitness issues
    if (trainset.fitness.rollingStock.status === 'FAIL') cost += 30;
    if (trainset.fitness.signalling.status === 'FAIL') cost += 25;
    if (trainset.fitness.telecom.status === 'FAIL') cost += 25;
    
    // Increase cost for overdue cleaning
    if (trainset.cleaningStatus === 'OVERDUE') cost += 15;
    
    totalCost += cost;
    count++;
  }
  
  return count > 0 ? Math.round((totalCost / count) * 100) / 100 : 0;
}

function calculateBrandingCompliance(trainsets: any[]): number {
  let totalCompliance = 0;
  let count = 0;
  
  for (const trainset of trainsets) {
    let compliance = 100;
    
    // Check if high priority trains are in revenue service
    if (trainset.brandingPriority === 'HIGH') {
      if (trainset.recommendation !== 'REVENUE') {
        compliance -= 40; // Major penalty for not using high branding trains
      }
    } else if (trainset.brandingPriority === 'MEDIUM') {
      if (trainset.recommendation === 'IBL') {
        compliance -= 20; // Minor penalty for medium priority in IBL
      }
    }
    
    totalCompliance += Math.max(0, compliance);
    count++;
  }
  
  return count > 0 ? Math.round((totalCompliance / count) * 100) / 100 : 0;
}

function calculateEnergyConsumption(trainsets: any[]): number {
  let totalConsumption = 0;
  let count = 0;
  
  for (const trainset of trainsets) {
    let consumption = 30; // Base consumption
    
    // Increase consumption for IBL trains (more shunting)
    if (trainset.recommendation === 'IBL') {
      consumption += 25;
    }
    
    // Increase consumption for trains with conflicts (more movement)
    if (trainset.conflicts && trainset.conflicts.length > 0) {
      consumption += trainset.conflicts.length * 5;
    }
    
    // Decrease consumption for well-optimized trains
    if (trainset.recommendation === 'REVENUE' && !trainset.jobCardOpen) {
      consumption -= 10;
    }
    
    totalConsumption += Math.max(0, consumption);
    count++;
  }
  
  return count > 0 ? Math.round((totalConsumption / count) * 100) / 100 : 0;
}

export default router;
