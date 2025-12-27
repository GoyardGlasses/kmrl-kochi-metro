import { Trainset } from "@/models/Trainset";

export type FitnessStatus = "PASS" | "WARN" | "FAIL";

export interface FitnessUpdate {
  trainsetId: string;
  fitness?: {
    rollingStock?: { status: string; details?: string };
    signalling?: { status: string; details?: string };
    telecom?: { status: string; details?: string };
  };
}

export const ingestFitnessUpdates = async (args: {
  updates: FitnessUpdate[];
  updatedBy?: string;
}): Promise<{
  updated: number;
  results: Array<{ trainsetId: string; status: "UPDATED" | "NOT_FOUND"; message?: string }>;
}> => {
  const isValidStatus = (s: string): s is FitnessStatus => ["PASS", "WARN", "FAIL"].includes(s);

  const results: Array<{ trainsetId: string; status: "UPDATED" | "NOT_FOUND"; message?: string }> = [];
  let updated = 0;

  for (const u of args.updates) {
    const trainset = await Trainset.findOne({ id: u.trainsetId });
    if (!trainset) {
      results.push({ trainsetId: u.trainsetId, status: "NOT_FOUND" });
      continue;
    }

    if (u.fitness?.rollingStock?.status && isValidStatus(u.fitness.rollingStock.status)) {
      trainset.fitness.rollingStock.status = u.fitness.rollingStock.status as any;
      if (typeof u.fitness.rollingStock.details === "string") {
        trainset.fitness.rollingStock.details = u.fitness.rollingStock.details;
      }
    }

    if (u.fitness?.signalling?.status && isValidStatus(u.fitness.signalling.status)) {
      trainset.fitness.signalling.status = u.fitness.signalling.status as any;
      if (typeof u.fitness.signalling.details === "string") {
        trainset.fitness.signalling.details = u.fitness.signalling.details;
      }
    }

    if (u.fitness?.telecom?.status && isValidStatus(u.fitness.telecom.status)) {
      trainset.fitness.telecom.status = u.fitness.telecom.status as any;
      if (typeof u.fitness.telecom.details === "string") {
        trainset.fitness.telecom.details = u.fitness.telecom.details;
      }
    }

    trainset.lastUpdated = new Date();
    if (args.updatedBy) trainset.updatedBy = args.updatedBy;
    await trainset.save();

    updated++;
    results.push({ trainsetId: u.trainsetId, status: "UPDATED" });
  }

  return { updated, results };
};
