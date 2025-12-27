import { Router } from 'express';
import { FitnessCertificate, BrandingContract, MileageBalance, CleaningSlot, StablingGeometry } from '../models/Decision';

const router = Router();

// Fitness Certificates Routes
router.get('/certificates', async (req, res) => {
  try {
    const { trainsetId, department } = req.query;
    
    let query: any = {};
    if (trainsetId) query.trainsetId = trainsetId;
    if (department) query.department = department;
    
    const certificates = await FitnessCertificate.find(query).sort({ validUntil: 1 });
    res.json(certificates);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch fitness certificates' });
  }
});

router.post('/certificates', async (req, res) => {
  try {
    const certificate = new FitnessCertificate(req.body);
    await certificate.save();
    res.status(201).json(certificate);
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(400).json({ error: 'Fitness certificate already exists for this trainset and department' });
    } else {
      res.status(500).json({ error: 'Failed to create fitness certificate' });
    }
  }
});

router.patch('/certificates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const certificate = await FitnessCertificate.findByIdAndUpdate(id, updates, { new: true });
    
    if (!certificate) {
      return res.status(404).json({ error: 'Fitness certificate not found' });
    }
    
    res.json(certificate);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update fitness certificate' });
  }
});

// Branding Contracts Routes
router.get('/contracts', async (req, res) => {
  try {
    const { trainsetId, priority } = req.query;
    
    let query: any = {};
    if (trainsetId) query.trainsetId = trainsetId;
    if (priority) query.priority = priority;
    
    const contracts = await BrandingContract.find(query).sort({ expiryDate: 1 });
    res.json(contracts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch branding contracts' });
  }
});

router.post('/contracts', async (req, res) => {
  try {
    const contract = new BrandingContract({
      ...req.body,
      lastUpdated: new Date()
    });
    await contract.save();
    res.status(201).json(contract);
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(400).json({ error: 'Branding contract already exists for this trainset' });
    } else {
      res.status(500).json({ error: 'Failed to create branding contract' });
    }
  }
});

router.patch('/contracts/:trainsetId', async (req, res) => {
  try {
    const { trainsetId } = req.params;
    const updates = {
      ...req.body,
      lastUpdated: new Date()
    };
    
    const contract = await BrandingContract.findOneAndUpdate(
      { trainsetId },
      updates,
      { new: true }
    );
    
    if (!contract) {
      return res.status(404).json({ error: 'Branding contract not found' });
    }
    
    res.json(contract);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update branding contract' });
  }
});

// Mileage Balancing Routes
router.get('/balances', async (req, res) => {
  try {
    const { trainsetId } = req.query;
    
    let query: any = {};
    if (trainsetId) query.trainsetId = trainsetId;
    
    const balances = await MileageBalance.find(query).sort({ currentMileage: -1 });
    res.json(balances);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch mileage balances' });
  }
});

router.post('/balances', async (req, res) => {
  try {
    const balance = new MileageBalance(req.body);
    await balance.save();
    res.status(201).json(balance);
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(400).json({ error: 'Mileage balance already exists for this trainset' });
    } else {
      res.status(500).json({ error: 'Failed to create mileage balance' });
    }
  }
});

router.post('/optimize', async (req, res) => {
  try {
    const balances = await MileageBalance.find({});
    
    const optimized = balances.map(balance => ({
      ...balance.toObject(),
      variance: balance.variance > 0 ? balance.variance * 0.8 : balance.variance * 1.2,
      componentWear: {
        bogie: Math.max(0, balance.componentWear.bogie - 5),
        brakePad: Math.max(0, balance.componentWear.brakePad - 5),
        hvac: Math.max(0, balance.componentWear.hvac - 5)
      }
    }));
    
    // Update all balances in database
    for (let i = 0; i < balances.length; i++) {
      await MileageBalance.findByIdAndUpdate(balances[i]._id, optimized[i]);
    }
    
    res.json(optimized);
  } catch (error) {
    res.status(500).json({ error: 'Failed to optimize mileage balances' });
  }
});

// Cleaning Slots Routes
router.get('/slots', async (req, res) => {
  try {
    const { date, status } = req.query;
    
    let query: any = {};
    if (status) query.status = status;
    if (date) {
      const targetDate = new Date(date as string);
      query.availableFrom = { $lte: targetDate };
      query.availableUntil = { $gte: targetDate };
    }
    
    const slots = await CleaningSlot.find(query).sort({ bayId: 1, position: 1 });
    res.json(slots);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cleaning slots' });
  }
});

router.post('/slots', async (req, res) => {
  try {
    const slot = new CleaningSlot(req.body);
    await slot.save();
    res.status(201).json(slot);
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(400).json({ error: 'Cleaning slot already exists for this bay' });
    } else {
      res.status(500).json({ error: 'Failed to create cleaning slot' });
    }
  }
});

router.post('/slots/:bayId/book', async (req, res) => {
  try {
    const { bayId } = req.params;
    const { trainsetId, cleaningType } = req.body;
    
    const slot = await CleaningSlot.findOne({ bayId });
    
    if (!slot) {
      return res.status(404).json({ error: 'Cleaning slot not found' });
    }
    
    if (slot.currentOccupancy >= slot.capacity) {
      return res.status(400).json({ error: 'Slot is full' });
    }
    
    // Update slot
    slot.currentOccupancy += 1;
    slot.assignedTrainsets.push(trainsetId);
    slot.cleaningType = cleaningType;
    slot.status = slot.currentOccupancy >= slot.capacity ? 'FULL' : 'PARTIAL';
    
    await slot.save();
    res.json(slot);
  } catch (error) {
    res.status(500).json({ error: 'Failed to book cleaning slot' });
  }
});

// Stabling Geometry Routes
router.get('/geometry', async (req, res) => {
  try {
    const { trainsetId } = req.query;
    
    let query: any = {};
    if (trainsetId) query.trainsetId = trainsetId;
    
    const geometry = await StablingGeometry.find(query).sort({ bayId: 1, position: 1 });
    res.json(geometry);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stabling geometry' });
  }
});

router.post('/geometry', async (req, res) => {
  try {
    const geometry = new StablingGeometry({
      ...req.body,
      lastUpdated: new Date()
    });
    await geometry.save();
    res.status(201).json(geometry);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create stabling geometry' });
  }
});

router.post('/optimize', async (req, res) => {
  try {
    const geometry = await StablingGeometry.find({});
    
    // Simple optimization - sort by shunting distance
    const optimized = geometry
      .sort((a, b) => a.shuntingDistance - b.shuntingDistance)
      .map((item, index) => ({
        ...item.toObject(),
        position: index + 1
      }));
    
    // Update all geometry records
    for (let i = 0; i < optimized.length; i++) {
      await StablingGeometry.findByIdAndUpdate(optimized[i]._id, {
        position: optimized[i].position,
        lastUpdated: new Date()
      });
    }
    
    res.json(optimized);
  } catch (error) {
    res.status(500).json({ error: 'Failed to optimize stabling geometry' });
  }
});

export default router;
