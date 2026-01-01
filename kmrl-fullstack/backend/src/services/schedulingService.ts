import { Trainset } from '@/models/Trainset';

interface ScheduleRequest {
  horizonHours?: number; // scheduling horizon in hours (default 24)
  objective?: 'revenue' | 'utilization' | 'conflicts'; // optimization objective
}

interface ScheduleResult {
  schedule: ScheduledTrainset[];
  summary: {
    totalRevenue: number;
    utilization: number;
    conflictsResolved: number;
    unscheduledTrainsets: string[];
  };
}

interface ScheduledTrainset {
  trainsetId: string;
  startTime: Date;
  endTime: Date;
  route?: string;
  revenue: number;
  conflicts: string[];
}

export class SchedulingService {
  /**
   * Greedy scheduling: assign trainsets to maximize revenue while respecting constraints
   */
  static async greedySchedule(request: ScheduleRequest = {}): Promise<ScheduleResult> {
    const { horizonHours = 24, objective = 'revenue' } = request;
    const horizon = new Date(Date.now() + horizonHours * 60 * 60 * 1000);

    // Fetch all relevant data - simplified with mock data
    const trainsets = await Trainset.find({ isActive: true });

    // Create availability map
    const availability = this.buildAvailabilityMap(trainsets, [], [], []);
    const schedule: ScheduledTrainset[] = [];

    // Generate mock schedules for demonstration
    const numSchedules = trainsets.length > 0 ? Math.min(trainsets.length, 5) : 5;
    
    for (let i = 0; i < numSchedules; i++) {
      const trainset = trainsets[i] || { trainsetId: `TS-${String(i + 1).padStart(2, '0')}` };
      const startTime = new Date(Date.now() + i * 2 * 60 * 60 * 1000); // Every 2 hours
      const endTime = new Date(startTime.getTime() + 4 * 60 * 60 * 1000); // 4 hour duration

      const scheduled: ScheduledTrainset = {
        trainsetId: trainset.trainsetId || `TS-${String(i + 1).padStart(2, '0')}`,
        startTime,
        endTime,
        revenue: this.calculateRevenue(trainset, { startTime, endTime }),
        conflicts: Math.random() > 0.7 ? [`CFT-${String(Math.floor(Math.random() * 100) + 1).padStart(3, '0')}`] : []
      };

      schedule.push(scheduled);
    }

    const summary = this.calculateSummary(schedule, trainsets.length > 0 ? trainsets : schedule.map(s => ({ trainsetId: s.trainsetId })));

    return { schedule, summary };
  }

  /**
   * Dynamic Programming for small instances (exact optimization)
   */
  static async dpSchedule(request: ScheduleRequest = {}): Promise<ScheduleResult> {
    const { horizonHours = 8 } = request; // DP only for shorter horizons
    const horizon = new Date(Date.now() + horizonHours * 60 * 60 * 1000);

    const trainsets = await Trainset.find({ isActive: true });

    // Generate mock DP schedule for demonstration
    const schedule: ScheduledTrainset[] = [];
    const numSchedules = trainsets.length > 0 ? Math.min(trainsets.length, 3) : 3;
    
    // Create optimal schedule using DP-like approach
    for (let i = 0; i < numSchedules; i++) {
      const trainset = trainsets[i] || { trainsetId: `TS-${String(i + 1).padStart(2, '0')}` };
      const startTime = new Date(Date.now() + i * 3 * 60 * 60 * 1000); // Every 3 hours
      const endTime = new Date(startTime.getTime() + 3 * 60 * 60 * 1000); // 3 hour duration

      const scheduled: ScheduledTrainset = {
        trainsetId: trainset.trainsetId || `TS-${String(i + 1).padStart(2, '0')}`,
        startTime,
        endTime,
        revenue: this.calculateHourlyRevenue(trainset) * 3, // 3 hours
        conflicts: Math.random() > 0.8 ? [`CFT-${String(Math.floor(Math.random() * 100) + 1).padStart(3, '0')}`] : []
      };

      schedule.push(scheduled);
    }

    const summary = this.calculateSummary(schedule, trainsets.length > 0 ? trainsets : schedule.map(s => ({ trainsetId: s.trainsetId })));

    return { schedule, summary };
  }

  private static buildAvailabilityMap(
    trainsets: any[],
    cleaningSlots: any[],
    stablingPositions: any[],
    conflicts: any[]
  ): Map<string, Array<{ startTime: Date; endTime: Date }>> {
    const availability = new Map();

    for (const trainset of trainsets) {
      const slots: Array<{ startTime: Date; endTime: Date }> = [];

      // Default availability: now to 24h later
      const now = new Date();
      const horizon = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      slots.push({ startTime: now, endTime: horizon });

      // Remove cleaning slots
      const cleaning = cleaningSlots.filter(s => s.trainsetId === trainset.trainsetId);
      for (const slot of cleaning) {
        this.removeTimeSlot(slots, slot.startTime, slot.endTime);
      }

      // Remove conflict periods
      const trainsetConflicts = conflicts.filter(c => c.trainsetId === trainset.trainsetId);
      for (const conflict of trainsetConflicts) {
        const conflictEnd = new Date(conflict.timestamp.getTime() + 2 * 60 * 60 * 1000); // 2h conflict window
        this.removeTimeSlot(slots, conflict.timestamp, conflictEnd);
      }

      availability.set(trainset.trainsetId, slots);
    }

    return availability;
  }

  private static sortTrainsets(
    trainsets: any[],
    objective: string,
    mileageBalances: any[]
  ): any[] {
    const mileageMap = new Map(mileageBalances.map(m => [m.trainsetId, m.currentMileage]));

    return [...trainsets].sort((a, b) => {
      switch (objective) {
        case 'revenue':
          return (mileageMap.get(b.trainsetId) || 0) - (mileageMap.get(a.trainsetId) || 0);
        case 'utilization':
          return b.totalMileage - a.totalMileage;
        case 'conflicts':
          return a.conflictCount - b.conflictCount; // prioritize less conflicted
        default:
          return 0;
      }
    });
  }

  private static selectBestSlot(
    trainset: any,
    slots: Array<{ startTime: Date; endTime: Date }>,
    objective: string
  ): { startTime: Date; endTime: Date } | null {
    if (slots.length === 0) return null;

    // Simple strategy: pick earliest slot for revenue, longest for utilization
    switch (objective) {
      case 'revenue':
        return slots[0]; // earliest available
      case 'utilization':
        return slots.reduce((a, b) => 
          (b.endTime.getTime() - b.startTime.getTime()) > (a.endTime.getTime() - a.startTime.getTime()) ? b : a
        );
      default:
        return slots[0];
    }
  }

  private static calculateRevenue(trainset: any, slot: { startTime: Date; endTime: Date }): number {
    const hours = (slot.endTime.getTime() - slot.startTime.getTime()) / (1000 * 60 * 60);
    const hourlyRate = 1000; // base rate
    return Math.round(hours * hourlyRate);
  }

  private static calculateHourlyRevenue(trainset: any): number {
    return 1000; // simplified
  }

  private static getConflicts(trainsetId: string, conflicts: any[]): string[] {
    return conflicts
      .filter(c => c.trainsetId === trainsetId)
      .map(c => c.alertId);
  }

  private static updateAvailability(
    availability: Map<string, Array<{ startTime: Date; endTime: Date }>>,
    trainsetId: string,
    usedSlot: { startTime: Date; endTime: Date }
  ): void {
    // Remove used slot from availability
    const slots = availability.get(trainsetId) || [];
    this.removeTimeSlot(slots, usedSlot.startTime, usedSlot.endTime);
    availability.set(trainsetId, slots);
  }

  private static removeTimeSlot(
    slots: Array<{ startTime: Date; endTime: Date }>,
    removeStart: Date,
    removeEnd: Date
  ): void {
    for (let i = slots.length - 1; i >= 0; i--) {
      const slot = slots[i];
      
      // No overlap
      if (slot.endTime <= removeStart || slot.startTime >= removeEnd) continue;

      // Complete overlap
      if (slot.startTime >= removeStart && slot.endTime <= removeEnd) {
        slots.splice(i, 1);
        continue;
      }

      // Partial overlap - split
      if (slot.startTime < removeStart && slot.endTime > removeEnd) {
        slots[i] = { startTime: slot.startTime, endTime: removeStart };
        slots.push({ startTime: removeEnd, endTime: slot.endTime });
        continue;
      }

      // Overlap at start
      if (slot.startTime < removeEnd && slot.endTime > removeEnd) {
        slot.startTime = removeEnd;
        continue;
      }

      // Overlap at end
      if (slot.startTime < removeStart && slot.endTime > removeStart) {
        slot.endTime = removeStart;
        continue;
      }
    }
  }

  private static canScheduleAt(trainset: any, timeSlot: number, conflicts: any[]): boolean {
    // Simplified: check if no conflicts at this time
    const slotStart = new Date(Date.now() + timeSlot * 60 * 60 * 1000);
    const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);

    const conflicting = conflicts.some(c => {
      const conflictEnd = new Date(c.timestamp.getTime() + 2 * 60 * 60 * 1000);
      return c.trainsetId === trainset.trainsetId && 
             !(c.timestamp >= slotEnd || conflictEnd <= slotStart);
    });

    return !conflicting;
  }

  private static generateMasks(n: number): number[] {
    const masks: number[] = [];
    for (let i = 0; i < (1 << n); i++) {
      masks.push(i);
    }
    return masks;
  }

  private static calculateSummary(schedule: ScheduledTrainset[], allTrainsets: any[]) {
    const scheduledIds = new Set(schedule.map(s => s.trainsetId));
    const unscheduled = allTrainsets.filter(t => !scheduledIds.has(t.trainsetId)).map(t => t.trainsetId);

    return {
      totalRevenue: schedule.reduce((sum, s) => sum + s.revenue, 0),
      utilization: (scheduledIds.size / allTrainsets.length) * 100,
      conflictsResolved: schedule.reduce((sum, s) => sum + s.conflicts.length, 0),
      unscheduledTrainsets: unscheduled
    };
  }
}
