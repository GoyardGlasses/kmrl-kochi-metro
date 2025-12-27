import { readFile } from "fs/promises";
import { env } from "@/config/env";
import { IngestionRun } from "@/models/IngestionRun";
import { AuditLog } from "@/models/AuditLog";
import { Trainset } from "@/models/Trainset";
import { ingestMaximoJobCardsCsv } from "@/utils/maximoJobCardsIngest";
import { ingestFitnessUpdates } from "@/utils/fitnessIngest";
import { notifyIngestionRun } from "@/utils/ingestionNotifications";

const parseTimeHHMM = (s: string): { hours: number; minutes: number } => {
  const m = /^\s*(\d{1,2}):(\d{2})\s*$/.exec(s);
  if (!m) throw new Error("Invalid time format, expected HH:MM");
  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error("Invalid time value");
  }
  return { hours, minutes };
};

export const runFitnessFileOnce = async (opts?: { triggeredBy?: string; mode?: string }) => {
  const startedAt = new Date();
  const run = await IngestionRun.create({
    source: "FITNESS",
    status: "RUNNING",
    startedAt,
    metadata: {
      filePath: env.fitnessJsonPath,
      schedule: env.fitnessSchedule,
      mode: opts?.mode || "SCHEDULED_FILE",
      triggeredBy: opts?.triggeredBy,
    },
  });

  try {
    let updates: any[] = [];
    try {
      const raw = await readFile(env.fitnessJsonPath, "utf8");
      const parsed = JSON.parse(raw);
      updates = Array.isArray(parsed?.updates) ? parsed.updates : (Array.isArray(parsed) ? parsed : []);
    } catch (e: any) {
      if (e?.code === "ENOENT" && env.nodeEnv === "development") {
        const trainsets = await Trainset.find({}, { id: 1 }).sort({ id: 1 }).lean();
        const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
        updates = trainsets.map((t: any) => {
          const rs = pick(["PASS", "WARN", "FAIL"]);
          const sig = pick(["PASS", "WARN", "FAIL"]);
          const tel = pick(["PASS", "WARN", "FAIL"]);
          return {
            trainsetId: t.id,
            fitness: {
              rollingStock: { status: rs, details: "Dev mock update" },
              signalling: { status: sig, details: "Dev mock update" },
              telecom: { status: tel, details: "Dev mock update" },
            },
          };
        });
      } else {
        throw e;
      }
    }

    const result = await ingestFitnessUpdates({ updates, updatedBy: "scheduler" });

    run.status = "SUCCESS";
    run.finishedAt = new Date();
    run.recordsRead = Array.isArray(updates) ? updates.length : 0;
    run.recordsUpserted = result.updated;
    run.trainsetsUpdated = result.updated;
    await run.save();

    await notifyIngestionRun(run);

    await AuditLog.create({
      action: "FITNESS_IMPORT",
      metadata: {
        mode: "SCHEDULED_FILE",
        filePath: env.fitnessJsonPath,
        ingestionRunId: run._id,
        updated: result.updated,
      },
    });

    return run;
  } catch (e: any) {
    run.status = "FAILED";
    run.finishedAt = new Date();
    run.error = e?.message || String(e);
    await run.save();

    await notifyIngestionRun(run);

    return run;
  }
};

export const runMaximoJobCardsFileOnce = async (opts?: { triggeredBy?: string; mode?: string }) => {
  const startedAt = new Date();
  const run = await IngestionRun.create({
    source: "MAXIMO_JOB_CARDS",
    status: "RUNNING",
    startedAt,
    metadata: {
      filePath: env.maximoJobCardsCsvPath,
      schedule: env.maximoJobCardsSchedule,
      mode: opts?.mode || "SCHEDULED_FILE",
      triggeredBy: opts?.triggeredBy,
    },
  });

  try {
    let csv: string;
    try {
      csv = await readFile(env.maximoJobCardsCsvPath, "utf8");
    } catch (e: any) {
      if (e?.code === "ENOENT" && env.nodeEnv === "development") {
        const trainsets = await Trainset.find({}, { id: 1 }).sort({ id: 1 }).lean();
        const lines: string[] = ["trainsetId,workOrderId,status,summary"]; 
        for (const t of trainsets) {
          if (Math.random() < 0.25) {
            const status = Math.random() < 0.7 ? "OPEN" : "CLOSED";
            const workOrderId = `WO-${Math.floor(1000 + Math.random() * 9000)}`;
            lines.push(`${(t as any).id},${workOrderId},${status},Dev mock job card`);
          }
        }
        if (lines.length === 1) {
          const t0 = trainsets[0];
          if (t0) lines.push(`${(t0 as any).id},WO-0001,OPEN,Dev mock job card`);
        }
        csv = lines.join("\n");
      } else {
        throw e;
      }
    }

    const result = await ingestMaximoJobCardsCsv({
      csv,
      source: `scheduled:${env.maximoJobCardsCsvPath}`,
      importedAt: new Date(),
    });

    run.status = "SUCCESS";
    run.finishedAt = new Date();
    run.recordsRead = result.rows;
    run.recordsUpserted = result.jobCardsUpserted;
    run.trainsetsUpdated = result.trainsetsUpdated;
    await run.save();

    await notifyIngestionRun(run);

    await AuditLog.create({
      action: "MAXIMO_JOB_CARDS_IMPORT",
      metadata: {
        mode: "SCHEDULED_FILE",
        filePath: env.maximoJobCardsCsvPath,
        ingestionRunId: run._id,
        ...result,
      },
    });

    return run;
  } catch (e: any) {
    run.status = "FAILED";
    run.finishedAt = new Date();
    run.error = e?.message || String(e);
    await run.save();

    await notifyIngestionRun(run);

    return run;
  }
};

const msUntilNextRun = (hhmm: string, now = new Date()): number => {
  const { hours, minutes } = parseTimeHHMM(hhmm);
  const next = new Date(now);
  next.setHours(hours, minutes, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  return next.getTime() - now.getTime();
};

export const startSchedulers = () => {
  const startLoop = (schedule: string, fn: () => Promise<unknown>) => {
    const tick = async () => {
      try {
        await fn();
      } finally {
        const delay = msUntilNextRun(schedule);
        setTimeout(tick, delay);
      }
    };

    const delay = msUntilNextRun(schedule);
    setTimeout(tick, delay);
  };

  startLoop(env.maximoJobCardsSchedule, runMaximoJobCardsFileOnce);
  startLoop(env.fitnessSchedule, runFitnessFileOnce);
};
