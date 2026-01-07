import { Router } from 'express';
import { ServiceReadiness, ConflictAlert, OptimizationResult, WhatIfScenario } from '../types/decision';
import { Trainset } from '../models/Trainset';
import { FitnessCertificate, BrandingContract, MileageBalance, CleaningSlot, StablingGeometry, ServiceReadiness as ServiceReadinessModel, ConflictAlert as ConflictAlertModel, OptimizationResult as OptimizationResultModel, WhatIfScenario as WhatIfScenarioModel } from '../models/Decision';

const router = Router();

// Service Readiness Calculation
router.get('/readiness', async (req, res) => {
  try {
    const trainsets = await Trainset.find({});
    const readiness: ServiceReadiness[] = [];

    for (const trainset of trainsets) {
      // Get actual data from MongoDB
      const fitnessCerts = await FitnessCertificate.find({ trainsetId: trainset.id });
      const brandingContract = await BrandingContract.findOne({ trainsetId: trainset.id });
      const mileageBalance = await MileageBalance.findOne({ trainsetId: trainset.id });
      const cleaningSlots = await CleaningSlot.find({ assignedTrainsets: trainset.id });
      const stablingGeometry = await StablingGeometry.findOne({ trainsetId: trainset.id });

      const factors = calculateReadinessFactors(trainset, fitnessCerts, brandingContract, mileageBalance, cleaningSlots, stablingGeometry);
      const overallScore = calculateOverallScore(factors);
      const { blockers, warnings, recommendations } = generateInsights(trainset, factors);

      readiness.push({
        trainsetId: trainset.id,
        overallScore,
        factors,
        blockers,
        warnings,
        recommendations
      });
    }

    res.json(readiness);
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate service readiness' });
  }
});

router.post('/readiness/:trainsetId', async (req, res) => {
  try {
    const { trainsetId } = req.params;
    const trainset = await Trainset.findOne({ id: trainsetId });
    
    if (!trainset) {
      return res.status(404).json({ error: 'Trainset not found' });
    }

    // Get actual data from MongoDB
    const fitnessCerts = await FitnessCertificate.find({ trainsetId: trainset.id });
    const brandingContract = await BrandingContract.findOne({ trainsetId: trainset.id });
    const mileageBalance = await MileageBalance.findOne({ trainsetId: trainset.id });
    const cleaningSlots = await CleaningSlot.find({ assignedTrainsets: trainset.id });
    const stablingGeometry = await StablingGeometry.findOne({ trainsetId: trainset.id });

    const factors = calculateReadinessFactors(trainset, fitnessCerts, brandingContract, mileageBalance, cleaningSlots, stablingGeometry);
    const overallScore = calculateOverallScore(factors);
    const { blockers, warnings, recommendations } = generateInsights(trainset, factors);

    const readiness: ServiceReadiness = {
      trainsetId: trainset.id,
      overallScore,
      factors,
      blockers,
      warnings,
      recommendations
    };

    res.json(readiness);
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate service readiness' });
  }
});

// Conflict Alerts
router.get('/alerts', async (req, res) => {
  try {
    const alerts = await ConflictAlertModel.find({ status: 'ACTIVE' }).sort({ detectedAt: -1 });
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch conflict alerts' });
  }
});

router.post('/alerts/:alertId/resolve', async (req, res) => {
  try {
    const { alertId } = req.params;
    const { action } = req.body;
    
    const resolvedAlert = await ConflictAlertModel.findByIdAndUpdate(
      alertId,
      {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolvedBy: 'SYSTEM'
      },
      { new: true }
    );
    
    if (!resolvedAlert) {
      return res.status(404).json({ error: 'Conflict alert not found' });
    }
    
    res.json(resolvedAlert);
  } catch (error) {
    res.status(500).json({ error: 'Failed to resolve conflict alert' });
  }
});

// Optimization Engine
router.post('/run', async (req, res) => {
  try {
    const { target } = req.query;
    const depotId = (req.query.depotId as string) || (req.body?.depotId as string) || undefined;
    const trainsets = await Trainset.find(depotId ? { depotId } : {});
    
    const results: OptimizationResult[] = [];
    const optimizationRunId = `run-${Date.now()}`;
    
    for (const trainset of trainsets) {
      const result = await optimizeTrainset(trainset, target as string, optimizationRunId);
      results.push(result);
    }
    
    // Save results to MongoDB
    await OptimizationResultModel.insertMany(results);
    
    // Sort by confidence score
    results.sort((a, b) => b.confidence - a.confidence);
    
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Failed to run optimization' });
  }
});

router.get('/history', async (req, res) => {
  try {
    const history = await OptimizationResultModel.find({})
      .sort({ calculatedAt: -1 })
      .limit(50);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch optimization history' });
  }
});

// Optimization runs grouped by optimizationRunId
router.get('/runs', async (req, res) => {
  try {
    const limit = Math.min(parseInt((req.query.limit as string) || '20', 10), 100);

    const runs = await OptimizationResultModel.aggregate([
      {
        $group: {
          _id: '$optimizationRunId',
          createdAt: { $max: '$calculatedAt' },
          count: { $sum: 1 },
          avgConfidence: { $avg: '$confidence' }
        }
      },
      { $sort: { createdAt: -1 } },
      { $limit: limit }
    ]);

    res.json({
      runs: runs.map((r: any) => ({
        runId: r._id,
        createdAt: r.createdAt,
        count: r.count,
        avgConfidence: Math.round((r.avgConfidence || 0) * 100) / 100
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch optimization runs' });
  }
});

router.get('/runs/:runId', async (req, res) => {
  try {
    const { runId } = req.params;
    const results = await OptimizationResultModel.find({ optimizationRunId: runId })
      .sort({ confidence: -1 })
      .lean();

    if (results.length === 0) {
      return res.status(404).json({ error: 'Optimization run not found' });
    }

    const createdAt = results.reduce((acc: Date, r: any) => {
      const d = new Date(r.calculatedAt);
      return d > acc ? d : acc;
    }, new Date(results[0].calculatedAt));

    res.json({
      runId,
      createdAt,
      count: results.length,
      results
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch optimization run' });
  }
});

// What-If Scenarios
router.get('/scenarios', async (req, res) => {
  try {
    const scenarios = await WhatIfScenarioModel.find({}).sort({ createdAt: -1 });
    res.json(scenarios);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch what-if scenarios' });
  }
});

router.post('/scenarios', async (req, res) => {
  try {
    const scenario = new WhatIfScenarioModel({
      ...req.body,
      createdBy: 'SYSTEM',
      createdAt: new Date()
    });
    await scenario.save();
    res.status(201).json(scenario);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create what-if scenario' });
  }
});

router.post('/scenarios/:scenarioId/run', async (req, res) => {
  try {
    const { scenarioId } = req.params;
    const trainsets = await Trainset.find({});
    
    const results: OptimizationResult[] = [];
    const optimizationRunId = `whatif-${Date.now()}`;
    
    for (const trainset of trainsets) {
      const result = await optimizeTrainset(trainset, 'BRANDING', optimizationRunId);
      results.push(result);
    }
    
    const scenario = await WhatIfScenarioModel.findByIdAndUpdate(
      scenarioId,
      {
        results,
        summary: {
          revenueCount: results.filter(r => r.recommendation === 'REVENUE').length,
          standbyCount: results.filter(r => r.recommendation === 'STANDBY').length,
          iblCount: results.filter(r => r.recommendation === 'IBL').length,
          overallScore: results.reduce((acc, r) => acc + r.confidence, 0) / results.length
        }
      },
      { new: true }
    );
    
    if (!scenario) {
      return res.status(404).json({ error: 'Scenario not found' });
    }
    
    res.json(scenario);
  } catch (error) {
    res.status(500).json({ error: 'Failed to run what-if scenario' });
  }
});

router.delete('/scenarios/:scenarioId', async (req, res) => {
  try {
    const { scenarioId } = req.params;
    const result = await WhatIfScenarioModel.findByIdAndDelete(scenarioId);
    
    if (!result) {
      return res.status(404).json({ error: 'Scenario not found' });
    }
    
    res.json({ message: 'Scenario deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete scenario' });
  }
});

// Helper Functions
function calculateReadinessFactors(trainset: any, fitnessCerts: any[], brandingContract: any, mileageBalance: any, cleaningSlots: any[], stablingGeometry: any) {
  // Calculate fitness score from certificates
  let fitness = 100;
  fitnessCerts.forEach(cert => {
    if (cert.status === 'EXPIRED') fitness -= 40;
    else if (cert.status === 'EXPIRING_SOON') fitness -= 20;
  });
  
  const jobCards = trainset.jobCardOpen ? 30 : 100;
  
  // Calculate branding score from contract
  let branding = 100;
  if (brandingContract) {
    if (brandingContract.priority === 'HIGH' && brandingContract.remainingHours < 100) branding -= 30;
    else if (brandingContract.priority === 'MEDIUM' && brandingContract.remainingHours < 50) branding -= 20;
  }
  
  // Calculate mileage score
  let mileage = 100;
  if (mileageBalance) {
    const variancePercent = Math.abs(mileageBalance.variance) / mileageBalance.targetMileage * 100;
    if (variancePercent > 20) mileage -= 40;
    else if (variancePercent > 10) mileage -= 20;
  }
  
  const cleaning = trainset.cleaningStatus === 'COMPLETED' ? 100 : trainset.cleaningStatus === 'PENDING' ? 60 : 30;
  const stabling = stablingGeometry ? (stablingGeometry.constraints.requiresShunting ? 70 : 90) : 80;
  
  return {
    fitness,
    jobCards,
    branding,
    mileage,
    cleaning,
    stabling
  };
}

function calculateOverallScore(factors: any) {
  const weights = {
    fitness: 0.25,
    jobCards: 0.20,
    branding: 0.15,
    mileage: 0.15,
    cleaning: 0.15,
    stabling: 0.10
  };
  
  return Math.round(
    factors.fitness * weights.fitness +
    factors.jobCards * weights.jobCards +
    factors.branding * weights.branding +
    factors.mileage * weights.mileage +
    factors.cleaning * weights.cleaning +
    factors.stabling * weights.stabling
  );
}

function calculateFitnessScore(fitness: any) {
  let score = 100;
  if (fitness.rollingStock.status === 'FAIL') score -= 40;
  else if (fitness.rollingStock.status === 'WARN') score -= 20;
  
  if (fitness.signalling.status === 'FAIL') score -= 30;
  else if (fitness.signalling.status === 'WARN') score -= 15;
  
  if (fitness.telecom.status === 'FAIL') score -= 30;
  else if (fitness.telecom.status === 'WARN') score -= 15;
  
  return Math.max(0, score);
}

function calculateBrandingScore(priority: string) {
  switch (priority) {
    case 'HIGH': return 100;
    case 'MEDIUM': return 75;
    case 'LOW': return 50;
    default: return 50;
  }
}

function calculateMileageScore(mileage: number) {
  if (mileage < 30000) return 100;
  if (mileage < 40000) return 80;
  if (mileage < 50000) return 60;
  return 40;
}

function calculateCleaningScore(status: string) {
  switch (status) {
    case 'COMPLETED': return 100;
    case 'PENDING': return 70;
    case 'OVERDUE': return 30;
    default: return 50;
  }
}

function generateInsights(trainset: any, factors: any) {
  const blockers = [];
  const warnings = [];
  const recommendations = [];
  
  if (trainset.fitness.rollingStock.status === 'FAIL') {
    blockers.push('Rolling stock fitness failed - immediate maintenance required');
  }
  
  if (trainset.fitness.signalling.status === 'FAIL') {
    blockers.push('Signalling system failed - cannot enter service');
  }
  
  if (trainset.jobCardOpen) {
    warnings.push('Open job card may affect service availability');
  }
  
  if (factors.mileage < 60) {
    recommendations.push('Consider for revenue service to balance mileage');
  }
  
  if (factors.branding === 100 && trainset.brandingPriority === 'HIGH') {
    recommendations.push('Prioritize for revenue service - high branding value');
  }
  
  return { blockers, warnings, recommendations };
}

function generateConflictAlerts(): ConflictAlert[] {
  return [
    {
      type: 'FITNESS_EXPIRY',
      severity: 'HIGH',
      trainsetId: 'TS-03',
      message: 'Telecom fitness certificate expired',
      impact: 'Trainset cannot enter service until certificate renewed',
      suggestedAction: 'Schedule immediate telecom inspection and certification'
    },
    {
      type: 'BRANDING_SLA',
      severity: 'MEDIUM',
      trainsetId: 'TS-05',
      message: 'Branding hours below contract minimum',
      impact: 'Risk of breaching advertiser SLA and revenue penalties',
      suggestedAction: 'Prioritize trainset for revenue service to meet branding requirements'
    },
    {
      type: 'MILEAGE_IMBALANCE',
      severity: 'LOW',
      trainsetId: 'TS-07',
      message: 'Mileage variance exceeds target by 15%',
      impact: 'Uneven component wear may increase maintenance costs',
      suggestedAction: 'Consider for increased service to balance fleet mileage'
    }
  ];
}

async function optimizeTrainset(trainset: any, targetKpi?: string, optimizationRunId?: string): Promise<OptimizationResult> {
  // Get actual data from MongoDB
  const fitnessCerts = await FitnessCertificate.find({ trainsetId: trainset.id });
  const brandingContract = await BrandingContract.findOne({ trainsetId: trainset.id });
  const mileageBalance = await MileageBalance.findOne({ trainsetId: trainset.id });
  const cleaningSlots = await CleaningSlot.find({ assignedTrainsets: trainset.id });
  const stablingGeometry = await StablingGeometry.findOne({ trainsetId: trainset.id });

  const factors = calculateReadinessFactors(trainset, fitnessCerts, brandingContract, mileageBalance, cleaningSlots, stablingGeometry);
  const overallScore = calculateOverallScore(factors);
  const { blockers, warnings } = generateInsights(trainset, factors);
  
  let recommendation: 'REVENUE' | 'STANDBY' | 'IBL' = 'STANDBY';
  let confidence = 50;
  
  // Simple optimization logic
  if (blockers.length > 0) {
    recommendation = 'IBL';
    confidence = 95;
  } else if (overallScore >= 85 && warnings.length === 0) {
    recommendation = 'REVENUE';
    confidence = 90 + Math.round((overallScore - 85) * 0.2);
  } else if (overallScore >= 70) {
    recommendation = 'STANDBY';
    confidence = 70 + Math.round((overallScore - 70) * 0.5);
  } else {
    recommendation = 'IBL';
    confidence = 60 + Math.round(overallScore * 0.4);
  }
  
  // Adjust based on target KPI
  if (targetKpi === 'PUNCTUALITY' && factors.fitness >= 90) {
    confidence += 5;
  } else if (targetKpi === 'COST' && mileageBalance && mileageBalance.currentMileage < 40000) {
    confidence += 5;
  } else if (targetKpi === 'BRANDING' && brandingContract && brandingContract.priority === 'HIGH') {
    confidence += 5;
  }
  
  const conflicts: ConflictAlert[] = [];
  if (factors.fitness < 70) {
    conflicts.push({
      type: 'FITNESS_EXPIRY',
      severity: 'MEDIUM',
      trainsetId: trainset.id,
      message: 'Fitness issues detected',
      impact: 'May affect service availability',
      suggestedAction: 'Schedule inspection before next service period'
    });
  }
  
  return {
    trainsetId: trainset.id,
    recommendation,
    confidence: Math.min(100, confidence),
    reasoning: generateReasoning(recommendation, factors, blockers, warnings),
    conflicts,
    kpiImpact: {
      punctuality: recommendation === 'REVENUE' ? 99.2 : 98.5,
      cost: recommendation === 'IBL' ? 85 : 92,
      brandingCompliance: brandingContract && brandingContract.priority === 'HIGH' && recommendation === 'REVENUE' ? 95 : 88,
      fleetAvailability: recommendation === 'REVENUE' ? 88 : 85
    }
  };
}

function generateReasoning(recommendation: string, factors: any, blockers: any[], warnings: any[]): string[] {
  const reasoning = [];
  
  if (recommendation === 'REVENUE') {
    if (factors.fitness >= 90) reasoning.push('Excellent fitness status');
    if (factors.jobCards === 100) reasoning.push('No open job cards');
    if (factors.branding === 100) reasoning.push('High branding priority');
    if (factors.mileage >= 80) reasoning.push('Mileage within optimal range');
  } else if (recommendation === 'STANDBY') {
    if (warnings.length > 0) reasoning.push('Minor issues present');
    if (factors.fitness >= 70) reasoning.push('Acceptable fitness level');
    if (factors.mileage < 60) reasoning.push('Low mileage - suitable for standby');
  } else {
    if (blockers.length > 0) reasoning.push('Critical issues require maintenance');
    if (factors.fitness < 60) reasoning.push('Poor fitness status');
  }
  
  return reasoning;
}

export default router;
