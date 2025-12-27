import { Router } from "express";
import { body, validationResult } from "express-validator";
import { authMiddleware, AuthRequest, requireSuperAdmin } from "@/middleware/auth";
import { env } from "@/config/env";
import { Trainset } from "@/models/Trainset";
import { JobCard } from "@/models/JobCard";
import { AuditLog } from "@/models/AuditLog";
import { ingestFitnessUpdates } from "@/utils/fitnessIngest";
import { IngestionRun } from "@/models/IngestionRun";
import { runFitnessFileOnce, runMaximoJobCardsFileOnce } from "@/utils/scheduler";
import { notifyIngestionRun, verifyUnsSignature } from "@/utils/ingestionNotifications";

const router = Router();

const parseCsvLine = (line: string): string[] => {
  // Minimal CSV parser: handles commas and quoted fields with escaped quotes.
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === ',' && !inQuotes) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
};

const normalizeJobCardStatus = (raw: string): "OPEN" | "CLOSED" | "UNKNOWN" => {
  const s = (raw || "").trim().toLowerCase();
  if (["open", "wip", "in progress", "active"].includes(s)) return "OPEN";
  if (["closed", "complete", "completed", "resolved"].includes(s)) return "CLOSED";
  return "UNKNOWN";
};

router.get("/runs", authMiddleware, async (req: AuthRequest, res: any) => {
  try {
    const limit = Math.min(parseInt((req.query.limit as string) || "50", 10), 200);
    const skip = Math.max(parseInt((req.query.skip as string) || "0", 10), 0);
    const source = (req.query.source as string) || undefined;
    const status = (req.query.status as string) || undefined;

    const filter: any = {};
    if (source) filter.source = source;
    if (status) filter.status = status;

    const runs = await IngestionRun.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({ runs, skip, limit });
  } catch (error) {
    console.error("List ingestion runs error:", error);
    res.status(500).json({ error: "Failed to list ingestion runs" });
  }
});

router.get("/runs/:id", authMiddleware, async (req: AuthRequest, res: any) => {
  try {
    const run = await IngestionRun.findById(req.params.id).lean();
    if (!run) return res.status(404).json({ error: "Ingestion run not found" });
    res.json(run);
  } catch (error) {
    console.error("Get ingestion run error:", error);
    res.status(500).json({ error: "Failed to fetch ingestion run" });
  }
});

router.post("/run-now/maximo-jobcards", async (req: any, res: any) => {
  try {
    const run = await runMaximoJobCardsFileOnce({ triggeredBy: "system", mode: "MANUAL" });
    res.json({ ingestionRunId: run._id });
  } catch (error) {
    console.error("Run-now maximo jobcards error:", error);
    res.status(500).json({ error: "Failed to run maximo jobcards ingestion" });
  }
});

router.post("/run-now/maximo", async (req: any, res: any) => {
  try {
    const run = await runMaximoJobCardsFileOnce({ triggeredBy: "system", mode: "MANUAL" });
    res.json({ ingestionRunId: run._id });
  } catch (error) {
    console.error("Run-now maximo error:", error);
    res.status(500).json({ error: "Failed to run maximo ingestion" });
  }
});

router.post("/run-now/fitness", async (req: any, res: any) => {
  try {
    const run = await runFitnessFileOnce({ triggeredBy: "system", mode: "MANUAL" });
    res.json({ ingestionRunId: run._id });
  } catch (error) {
    console.error("Run-now fitness error:", error);
    res.status(500).json({ error: "Failed to run fitness ingestion" });
  }
});

router.post(
  "/maximo",
  authMiddleware,
  [body("updates").isArray()],
  async (req: AuthRequest, res: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { updates } = req.body as {
        updates: Array<{ trainsetId: string; jobCardOpen?: boolean; cleaningStatus?: string }>;
      };

      const results: Array<{ trainsetId: string; status: "UPDATED" | "NOT_FOUND"; message?: string }> = [];

      for (const u of updates) {
        const trainset = await Trainset.findOne({ id: u.trainsetId });
        if (!trainset) {
          results.push({ trainsetId: u.trainsetId, status: "NOT_FOUND" });
          continue;
        }

        if (typeof u.jobCardOpen === "boolean") {
          trainset.jobCardOpen = u.jobCardOpen;
        }

        if (u.cleaningStatus && ["COMPLETED", "PENDING", "OVERDUE"].includes(u.cleaningStatus)) {
          trainset.cleaningStatus = u.cleaningStatus as any;
        }

        trainset.lastUpdated = new Date();
        trainset.updatedBy = req.user?.email;
        await trainset.save();

        results.push({ trainsetId: u.trainsetId, status: "UPDATED" });
      }

      res.json({ updated: results.filter(r => r.status === "UPDATED").length, results });
    } catch (error) {
      console.error("Maximo ingest error:", error);
      res.status(500).json({ error: "Failed to ingest maximo updates" });
    }
  }
);

// Maximo Job Cards CSV ingestion
// Accepts body: { csv: string, source?: string }
// CSV required columns (header names, case-insensitive): trainsetId, workOrderId, status
router.post(
  "/maximo-jobcards-csv",
  authMiddleware,
  [body("csv").isString()],
  async (req: AuthRequest, res: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { csv, source } = req.body as { csv: string; source?: string };
      const importedAt = new Date();

      const lines = csv
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      if (lines.length < 2) {
        return res.status(400).json({ error: "CSV must include header + at least 1 row" });
      }

      const header = parseCsvLine(lines[0])
        .map((h) => h.replace(/^\uFEFF/, "").trim().toLowerCase());
      const idxTrainsetId = header.indexOf("trainsetid");
      const idxWorkOrderId = header.indexOf("workorderid");
      const idxStatus = header.indexOf("status");
      const idxSummary = header.indexOf("summary");

      if (idxTrainsetId === -1 || idxWorkOrderId === -1 || idxStatus === -1) {
        return res.status(400).json({
          error: "CSV header must include trainsetId, workOrderId, status",
          header,
        });
      }

      const results: Array<{
        row: number;
        status: "UPSERTED" | "SKIPPED";
        message?: string;
        trainsetId?: string;
        workOrderId?: string;
      }> = [];
      const touchedTrainsets = new Set<string>();
      let upserted = 0;

      for (let i = 1; i < lines.length; i++) {
        const rowNum = i + 1;
        const cols = parseCsvLine(lines[i]);
        const trainsetId = (cols[idxTrainsetId] || "").trim();
        const workOrderId = (cols[idxWorkOrderId] || "").trim();
        const rawStatus = (cols[idxStatus] || "").trim();
        const summary = idxSummary !== -1 ? (cols[idxSummary] || "").trim() : undefined;

        if (!trainsetId || !workOrderId) {
          results.push({ row: rowNum, status: "SKIPPED", message: "Missing trainsetId/workOrderId" });
          continue;
        }

        const status = normalizeJobCardStatus(rawStatus);
        const isOpen = status === "OPEN";

        await JobCard.findOneAndUpdate(
          { trainsetId, workOrderId },
          { trainsetId, workOrderId, status, isOpen, summary, source, importedAt },
          { upsert: true, new: true }
        );

        upserted++;
        touchedTrainsets.add(trainsetId);
        results.push({ row: rowNum, status: "UPSERTED", trainsetId, workOrderId });
      }

      // Update Trainset.jobCardOpen summary based on ingested job cards
      let updatedTrainsets = 0;
      const trainsetUpdates: Array<{ trainsetId: string; status: "UPDATED" | "NOT_FOUND"; jobCardOpen?: boolean }> = [];

      for (const trainsetId of touchedTrainsets) {
        const trainset = await Trainset.findOne({ id: trainsetId });
        if (!trainset) {
          trainsetUpdates.push({ trainsetId, status: "NOT_FOUND" });
          continue;
        }

        const openCount = await JobCard.countDocuments({ trainsetId, isOpen: true });
        trainset.jobCardOpen = openCount > 0;
        trainset.lastUpdated = new Date();
        trainset.updatedBy = req.user?.email;
        await trainset.save();

        updatedTrainsets++;
        trainsetUpdates.push({ trainsetId, status: "UPDATED", jobCardOpen: trainset.jobCardOpen });
      }

      await AuditLog.create({
        action: "MAXIMO_JOB_CARDS_IMPORT",
        actorEmail: req.user?.email,
        actorId: req.user?.id,
        metadata: {
          source,
          importedAt,
          rows: lines.length - 1,
          jobCardsUpserted: upserted,
          trainsetsTouched: touchedTrainsets.size,
          trainsetsUpdated: updatedTrainsets,
        },
      });

      res.json({
        importedAt,
        source: source || null,
        rows: lines.length - 1,
        jobCardsUpserted: upserted,
        trainsetsTouched: touchedTrainsets.size,
        trainsetsUpdated: updatedTrainsets,
        results,
        trainsetUpdates,
      });
    } catch (error) {
      console.error("Maximo job cards CSV ingest error:", error);
      res.status(500).json({ error: "Failed to ingest maximo job cards CSV" });
    }
  }
);

// UNS / IoT push ingestion for fitness (near real-time)
// Auth: send header `x-uns-token: <UNS_INGEST_TOKEN>`
// Body: { updates: [...] }
router.post(
  "/uns/fitness",
  [body("updates").isArray()],
  async (req: any, res: any) => {
    const token = (req.headers["x-uns-token"] as string | undefined) || "";
    const ts = (req.headers["x-uns-ts"] as string | undefined) || "";
    const sig = (req.headers["x-uns-signature"] as string | undefined) || "";

    const tokenOk = !!token && token === env.unsIngestToken;
    const sigOk = !!ts && !!sig && verifyUnsSignature({ token, timestamp: ts, signature: sig, maxSkewMs: env.unsSignatureMaxSkewMs });

    if (!tokenOk && !sigOk) {
      return res.status(401).json({ error: "Invalid UNS auth" });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const startedAt = new Date();
    const run = await IngestionRun.create({
      source: "UNS_FITNESS",
      status: "RUNNING",
      startedAt,
      metadata: {
        ip: req.ip,
        authMode: sigOk ? "SIGNATURE" : "TOKEN",
      },
    });

    try {
      const { updates } = req.body as { updates: any[] };
      const result = await ingestFitnessUpdates({ updates: updates as any, updatedBy: "uns" });

      run.status = "SUCCESS";
      run.finishedAt = new Date();
      run.recordsRead = Array.isArray(updates) ? updates.length : 0;
      run.recordsUpserted = result.updated;
      run.trainsetsUpdated = result.updated;
      await run.save();

      await notifyIngestionRun(run);

      await AuditLog.create({
        action: "UNS_FITNESS_IMPORT",
        metadata: {
          ingestionRunId: run._id,
          ip: req.ip,
          updated: result.updated,
        },
      });

      res.json({ ingestionRunId: run._id, ...result });
    } catch (error: any) {
      run.status = "FAILED";
      run.finishedAt = new Date();
      run.error = error?.message || String(error);
      await run.save();

      await notifyIngestionRun(run);

      console.error("UNS fitness ingest error:", error);
      res.status(500).json({ error: "Failed to ingest UNS fitness updates" });
    }
  }
);

router.post(
  "/fitness",
  authMiddleware,
  [body("updates").isArray()],
  async (req: AuthRequest, res: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { updates } = req.body as { updates: any[] };
      const result = await ingestFitnessUpdates({ updates: updates as any, updatedBy: req.user?.email });
      res.json(result);
    } catch (error) {
      console.error("Fitness ingest error:", error);
      res.status(500).json({ error: "Failed to ingest fitness updates" });
    }
  }
);

export default router;
