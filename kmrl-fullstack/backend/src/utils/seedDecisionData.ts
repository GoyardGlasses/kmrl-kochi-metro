import { FitnessCertificate, BrandingContract, MileageBalance, CleaningSlot, StablingGeometry } from '../models/Decision';
import { Trainset } from '../models/Trainset';

export async function seedDecisionData() {
  try {
    console.log('Seeding decision support data...');
    
    // Get existing trainsets
    const trainsets = await Trainset.find({});
    if (trainsets.length === 0) {
      console.log('No trainsets found. Please seed trainsets first.');
      return;
    }
    
    // Non-destructive seed: only create missing docs.
    // This supports fleet expansion without wiping existing operational data.
    
    console.log(`Found ${trainsets.length} trainsets. Ensuring decision data exists...`);
    
    // Seed Fitness Certificates (for all trainsets)
    for (const trainset of trainsets) {
      const departments = ['ROLLING_STOCK', 'SIGNALLING', 'TELECOM'];
      
      for (const department of departments as any[]) {
        const existing = await FitnessCertificate.findOne({ trainsetId: trainset.id, department });
        if (existing) continue;

        const status = Math.random() > 0.7 ? 'VALID' : Math.random() > 0.5 ? 'EXPIRING_SOON' : 'EXPIRED';
        const validFrom = new Date();
        const validUntil = new Date();
        validUntil.setMonth(validUntil.getMonth() + (status === 'VALID' ? 12 : status === 'EXPIRING_SOON' ? 1 : -1));

        await FitnessCertificate.create({
          department,
          trainsetId: trainset.id,
          status,
          validFrom,
          validUntil,
          lastInspection: new Date(validFrom.getTime() - 30 * 24 * 60 * 60 * 1000),
          nextInspectionDue: new Date(validUntil.getTime() - 7 * 24 * 60 * 60 * 1000),
          inspectorName: `INSPECTOR-${Math.floor(Math.random() * 10) + 1}`,
          details: `${department} fitness inspection completed. Status: ${status}.`
        });
      }
    }
    
    // Seed Branding Contracts
    const advertisers = ['Coca-Cola', 'Pepsi', 'Samsung', 'Apple', 'Nike', 'Adidas', 'BMW', 'Mercedes'];
    const priorities = ['HIGH', 'MEDIUM', 'LOW'];
    
    // Assign contracts to ~30% of fleet (scales with fleet size)
    const contractCount = Math.max(8, Math.floor(trainsets.length * 0.3));
    for (const trainset of trainsets.slice(0, contractCount)) {
      const existing = await BrandingContract.findOne({ trainsetId: trainset.id });
      if (existing) continue;

      const contractHours = 800 + Math.floor(Math.random() * 400);
      const currentHours = Math.floor(Math.random() * contractHours);

      await BrandingContract.create({
        trainsetId: trainset.id,
        advertiser: advertisers[Math.floor(Math.random() * advertisers.length)],
        contractHours,
        currentHours,
        remainingHours: contractHours - currentHours,
        priority: priorities[Math.floor(Math.random() * priorities.length)] as any,
        penaltyRisk: Math.floor(Math.random() * 30),
        expiryDate: new Date(Date.now() + Math.random() * 365 * 24 * 60 * 60 * 1000),
        lastUpdated: new Date(),
        updatedBy: 'SYSTEM'
      });
    }
    
    // Seed Mileage Balances
    for (const trainset of trainsets) {
      const existing = await MileageBalance.findOne({ trainsetId: trainset.id });
      if (existing) continue;

      const currentMileage = 30000 + Math.floor(Math.random() * 30000);
      const targetMileage = 50000;

      await MileageBalance.create({
        trainsetId: trainset.id,
        currentMileage,
        targetMileage,
        variance: currentMileage - targetMileage,
        lastService: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
        lastServiceMileage: currentMileage - Math.floor(Math.random() * 5000),
        componentWear: {
          bogie: 50 + Math.floor(Math.random() * 40),
          brakePad: 40 + Math.floor(Math.random() * 40),
          hvac: 30 + Math.floor(Math.random() * 50)
        },
        updatedBy: 'SYSTEM'
      });
    }
    
    // Seed Cleaning Slots (ensure baseline bays exist)
    const cleaningTypes = ['BASIC', 'DEEP', 'DETAILING'];
    for (let i = 1; i <= 5; i++) {
      const bayId = `BAY-${i.toString().padStart(2, '0')}`;
      const existing = await CleaningSlot.findOne({ bayId });
      if (existing) continue;

      const availableFrom = new Date();
      availableFrom.setHours(22, 0, 0, 0);
      const availableUntil = new Date(availableFrom);
      availableUntil.setHours(6, 0, 0, 0);
      availableUntil.setDate(availableUntil.getDate() + 1);

      await CleaningSlot.create({
        bayId,
        availableFrom,
        availableUntil,
        capacity: 2,
        currentOccupancy: Math.floor(Math.random() * 3),
        manpowerAvailable: 2 + Math.floor(Math.random() * 4),
        cleaningType: cleaningTypes[Math.floor(Math.random() * cleaningTypes.length)] as any,
        assignedTrainsets: [],
        status: 'AVAILABLE'
      });
    }
    
    // Seed Stabling Geometry (ensure enough positions for fleet size)
    const desiredPositions = Math.max(10, trainsets.length);
    for (let i = 1; i <= desiredPositions; i++) {
      const bayId = `STAB-${Math.floor((i - 1) / 2) + 1}`;
      const position = ((i - 1) % 2) + 1;

      const existing = await StablingGeometry.findOne({ bayId, position });
      if (existing) continue;

      await StablingGeometry.create({
        bayId,
        position,
        trainsetId: i <= trainsets.length ? trainsets[i - 1].id : undefined,
        shuntingDistance: 50 + Math.floor(Math.random() * 150),
        turnaroundTime: 10 + Math.floor(Math.random() * 30),
        constraints: {
          canExitAtDawn: Math.random() > 0.2,
          requiresShunting: Math.random() > 0.6,
          blockedBy: Math.random() > 0.8 ? `STAB-${Math.floor(Math.random() * 5) + 1}` : undefined
        },
        lastUpdated: new Date()
      });
    }
    
    console.log('Decision support data seeded successfully!');
    console.log(`- Created ${await FitnessCertificate.countDocuments()} fitness certificates`);
    console.log(`- Created ${await BrandingContract.countDocuments()} branding contracts`);
    console.log(`- Created ${await MileageBalance.countDocuments()} mileage balances`);
    console.log(`- Created ${await CleaningSlot.countDocuments()} cleaning slots`);
    console.log(`- Created ${await StablingGeometry.countDocuments()} stabling positions`);
    
  } catch (error) {
    console.error('Error seeding decision data:', error);
  }
}
