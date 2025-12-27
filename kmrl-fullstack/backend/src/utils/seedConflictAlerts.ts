import { ConflictAlert } from '../models/Decision';
import { FitnessCertificate, BrandingContract, MileageBalance } from '../models/Decision';

export async function seedConflictAlerts() {
  try {
    console.log('Seeding conflict alerts...');
    
    // Clear existing alerts
    await ConflictAlert.deleteMany({});
    
    // Get all decision data
    const fitnessCerts = await FitnessCertificate.find({});
    const brandingContracts = await BrandingContract.find({});
    const mileageBalances = await MileageBalance.find({});
    
    const alerts = [];
    
    // Generate fitness expiry alerts
    fitnessCerts.forEach(cert => {
      if (cert.status === 'EXPIRED') {
        alerts.push({
          type: 'FITNESS_EXPIRY',
          severity: 'HIGH',
          trainsetId: cert.trainsetId,
          message: `${cert.department} fitness certificate expired`,
          impact: 'Trainset cannot enter service until certificate renewed',
          suggestedAction: `Schedule immediate ${cert.department.toLowerCase()} inspection and certification`,
          status: 'ACTIVE',
          detectedAt: new Date()
        });
      } else if (cert.status === 'EXPIRING_SOON') {
        alerts.push({
          type: 'FITNESS_EXPIRY',
          severity: 'MEDIUM',
          trainsetId: cert.trainsetId,
          message: `${cert.department} fitness certificate expiring soon`,
          impact: 'May affect service availability soon',
          suggestedAction: `Schedule ${cert.department.toLowerCase()} inspection before expiry`,
          status: 'ACTIVE',
          detectedAt: new Date()
        });
      }
    });
    
    // Generate branding SLA alerts
    brandingContracts.forEach(contract => {
      if (contract.remainingHours < 50 && contract.priority === 'HIGH') {
        alerts.push({
          type: 'BRANDING_SLA',
          severity: 'HIGH',
          trainsetId: contract.trainsetId,
          message: `Branding hours below contract minimum for ${contract.advertiser}`,
          impact: 'Risk of breaching advertiser SLA and revenue penalties',
          suggestedAction: 'Prioritize trainset for revenue service to meet branding requirements',
          status: 'ACTIVE',
          detectedAt: new Date()
        });
      } else if (contract.remainingHours < 100) {
        alerts.push({
          type: 'BRANDING_SLA',
          severity: 'MEDIUM',
          trainsetId: contract.trainsetId,
          message: `Branding hours running low for ${contract.advertiser}`,
          impact: 'May affect branding compliance',
          suggestedAction: 'Monitor branding hours and plan service allocation',
          status: 'ACTIVE',
          detectedAt: new Date()
        });
      }
    });
    
    // Generate mileage imbalance alerts
    mileageBalances.forEach(balance => {
      const variancePercent = Math.abs(balance.variance) / balance.targetMileage * 100;
      if (variancePercent > 20) {
        alerts.push({
          type: 'MILEAGE_IMBALANCE',
          severity: 'MEDIUM',
          trainsetId: balance.trainsetId,
          message: `Mileage variance exceeds target by ${variancePercent.toFixed(1)}%`,
          impact: 'Uneven component wear may increase maintenance costs',
          suggestedAction: 'Consider for increased service to balance fleet mileage',
          status: 'ACTIVE',
          detectedAt: new Date()
        });
      }
    });
    
    // Insert alerts
    if (alerts.length > 0) {
      await ConflictAlert.insertMany(alerts);
      console.log(`Created ${alerts.length} conflict alerts`);
    } else {
      console.log('No conflict alerts generated');
    }
    
    console.log('Conflict alerts seeded successfully!');
  } catch (error) {
    console.error('Error seeding conflict alerts:', error);
  }
}
