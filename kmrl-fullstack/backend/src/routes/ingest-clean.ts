import { Router } from "express";
import { body, validationResult } from "express-validator";
import { authMiddleware, AuthRequest } from "@/middleware/auth";
import { Trainset } from "@/models/Trainset";
import { ingestFitnessUpdates } from "@/utils/fitnessIngest";
import { IngestionRun } from "@/models/IngestionRun";
import { runFitnessFileOnce, runMaximoJobCardsFileOnce } from "@/utils/scheduler";
import { notifyIngestionRun } from "@/utils/ingestionNotifications";
import { IngestionNotificationSettings } from "@/models/IngestionNotificationSettings";

const router = Router();

// List ingestion runs
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

// Get single ingestion run
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

// Run Maximo ingestion now
router.post("/run-now/maximo", async (req: any, res: any) => {
  try {
    const run = await runMaximoJobCardsFileOnce({ triggeredBy: "system", mode: "MANUAL" });
    res.json({ ingestionRunId: run._id });
  } catch (error) {
    console.error("Run-now maximo error:", error);
    res.status(500).json({ error: "Failed to run maximo ingestion" });
  }
});

// Run Fitness ingestion now
router.post("/run-now/fitness", async (req: any, res: any) => {
  try {
    const run = await runFitnessFileOnce({ triggeredBy: "system", mode: "MANUAL" });
    res.json({ ingestionRunId: run._id });
  } catch (error) {
    console.error("Run-now fitness error:", error);
    res.status(500).json({ error: "Failed to run fitness ingestion" });
  }
});

// Maximo JSON ingestion
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

// Fitness JSON ingestion
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

// Get notification settings
router.get("/notification-settings", authMiddleware, async (req: AuthRequest, res: any) => {
  try {
    let settings = await IngestionNotificationSettings.findOne({ key: "default" });
    if (!settings) {
      settings = await IngestionNotificationSettings.create({
        key: "default",
        email: "",
        phone: "",
        notifyOnSuccess: false,
        notifyOnFailure: false,
      });
    }
    res.json(settings);
  } catch (error) {
    console.error("Get notification settings error:", error);
    res.status(500).json({ error: "Failed to get notification settings" });
  }
});

// Update notification settings
router.put("/notification-settings", authMiddleware, async (req: AuthRequest, res: any) => {
  try {
    const { email, phone, notifyOnSuccess, notifyOnFailure } = req.body;
    
    const settings = await IngestionNotificationSettings.findOneAndUpdate(
      { key: "default" },
      {
        email,
        phone,
        notifyOnSuccess,
        notifyOnFailure,
        updatedBy: req.user?.email,
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    );
    
    res.json(settings);
  } catch (error) {
    console.error("Update notification settings error:", error);
    res.status(500).json({ error: "Failed to update notification settings" });
  }
});

export default router;
