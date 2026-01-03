import { Router } from "express";
import { body, validationResult } from "express-validator";
import { Trainset } from "@/models/Trainset";
import { AuditLog } from "@/models/AuditLog";
import { authMiddleware, AuthRequest } from "@/middleware/auth";
import { applySimulationRules, buildExplanation, detectConflicts } from "@/utils/simulation";
import { rankTrainsets, DEFAULT_WEIGHTS } from "@/utils/scoring";
import { ScoringConfig } from "@/models/ScoringConfig";
import { WhatIfSimulationResult } from "@/models/SimulationResult";
import { MLSuggestion } from "@/models/MLSuggestion";

const router = Router();

router.get("/ml-suggestions", async (req, res: any) => {
  try {
    const limit = Math.min(parseInt((req.query.limit as string) || "10", 10), 100);
    const onlyChanged = (req.query.onlyChanged as string) === "true";

    const trainsets = await Trainset.find().sort({ id: 1 }).lean();

    const statusPenalty = (s: string | undefined) => {
      if (s === "FAIL") return -50;
      if (s === "WARN") return -20;
      if (s === "PASS") return 10;
      return 0;
    };

    const suggestions = (trainsets as any[])
      .map((t) => {
        const reasons: string[] = [];
        let score = 0;

        const rs = t.fitness?.rollingStock?.status;
        const sig = t.fitness?.signalling?.status;
        const tel = t.fitness?.telecom?.status;

        const hasFail = [rs, sig, tel].includes("FAIL");
        const hasWarn = [rs, sig, tel].includes("WARN");

        score += statusPenalty(rs);
        score += statusPenalty(sig);
        score += statusPenalty(tel);
        if (hasFail) reasons.push("One or more fitness checks are FAIL");
        else if (hasWarn) reasons.push("One or more fitness checks are WARN");
        else reasons.push("All fitness checks PASS");

        if (t.jobCardOpen) {
          score -= 40;
          reasons.push("Open job card detected");
        } else {
          score += 5;
          reasons.push("No open job cards");
        }

        if (t.cleaningStatus === "OVERDUE") {
          score -= 30;
          reasons.push("Cleaning is OVERDUE");
        } else if (t.cleaningStatus === "PENDING") {
          score -= 10;
          reasons.push("Cleaning is PENDING");
        } else if (t.cleaningStatus === "COMPLETED") {
          score += 5;
          reasons.push("Cleaning is COMPLETED");
        }

        if (t.brandingPriority === "HIGH") {
          score += 10;
          reasons.push("Branding priority HIGH");
        } else if (t.brandingPriority === "MEDIUM") {
          score += 5;
          reasons.push("Branding priority MEDIUM");
        }

        const mileageKm = Number(t.mileageKm || 0);
        score += Math.min(15, Math.floor(mileageKm / 10000));
        if (mileageKm >= 40000) reasons.push("Higher mileage indicates maintenance attention soon");

        let suggestion: "REVENUE" | "STANDBY" | "IBL" = "STANDBY";
        if (hasFail || t.jobCardOpen || t.cleaningStatus === "OVERDUE") {
          suggestion = "IBL";
        } else if (score >= 20) {
          suggestion = "REVENUE";
        } else {
          suggestion = "STANDBY";
        }

        // Confidence: clamp to 0..100 based on absolute distance from neutral threshold
        const raw = suggestion === "IBL" ? 60 + Math.min(40, Math.abs(Math.min(score, 0))) : suggestion === "REVENUE" ? 55 + Math.min(45, Math.max(score, 0)) : 40 + Math.min(30, Math.abs(score));
        const confidence = Math.max(0, Math.min(100, Math.round(raw)));

        return {
          trainsetId: t.id,
          currentDecision: t.recommendation,
          suggestedDecision: suggestion,
          confidence,
          reasons: reasons.slice(0, 4),
          score,
        };
      })
      .filter((s) => (onlyChanged ? s.suggestedDecision !== s.currentDecision : true))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);

    // Save ML suggestions to MongoDB
    try {
      const timestamp = Date.now();
      const suggestionDocs = suggestions.map((s) => ({
        suggestionId: `ml-${s.trainsetId}-${timestamp}`,
        trainsetId: s.trainsetId,
        currentDecision: s.currentDecision,
        suggestedDecision: s.suggestedDecision,
        confidence: s.confidence,
        reasons: s.reasons,
        metadata: { score: s.score },
      }));

      // Use insertMany with ordered: false to handle duplicates gracefully
      await MLSuggestion.insertMany(suggestionDocs, { ordered: false }).catch((err: any) => {
        // Ignore duplicate key errors
        if (err.code !== 11000) {
          console.error("Error saving ML suggestions:", err);
        }
      });
    } catch (saveError) {
      console.error("Failed to save ML suggestions to MongoDB:", saveError);
      // Continue even if save fails
    }

    res.json({ generatedAt: new Date().toISOString(), limit, onlyChanged, suggestions });
  } catch (error) {
    console.error("ML suggestions error:", error);
    res.status(500).json({ error: "Failed to generate ML suggestions" });
  }
});

router.get("/", async (req, res) => {
  try {
    const trainsets = await Trainset.find().sort({ id: 1 }).lean();
    const withConflicts = trainsets.map((t: any) => {
      const conflicts = detectConflicts(t);
      const explanation = buildExplanation(
        t,
        {},
        t.recommendation,
        t.reason
      );
      return {
        ...t,
        conflicts,
        explanation,
        lastConflictCheck: new Date(),
      };
    });
    res.json(withConflicts);
  } catch (error) {
    console.error("List trainsets error:", error);
    res.status(500).json({ error: "Failed to fetch trainsets" });
  }
});

// Get all conflicts across all trainsets
router.get("/conflicts", async (req, res: any) => {
  try {
    const trainsets = await Trainset.find().sort({ id: 1 }).lean();
    const allConflicts: any[] = [];

    trainsets.forEach((trainset: any) => {
      const conflicts = detectConflicts(trainset);
      if (conflicts.length > 0) {
        allConflicts.push({
          trainsetId: trainset.id,
          conflicts,
          lastConflictCheck: new Date(),
        });
      }
    });

    res.json({ conflicts: allConflicts });
  } catch (error) {
    console.error("Get all conflicts error:", error);
    res.status(500).json({ error: "Failed to fetch conflicts" });
  }
});

// List audit logs (most recent first)
router.get("/audit", authMiddleware, async (req: AuthRequest, res: any) => {
  try {
    const limit = Math.min(parseInt((req.query.limit as string) || "50", 10), 200);
    const skip = Math.max(parseInt((req.query.skip as string) || "0", 10), 0);
    const trainsetId = (req.query.trainsetId as string) || undefined;
    const action = (req.query.action as string) || undefined;

    const filter: any = {};
    if (trainsetId) filter.trainsetId = trainsetId;
    if (action) filter.action = action;

    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({ logs, skip, limit });
  } catch (error) {
    console.error("List audit logs error:", error);
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
});

// Ranked induction list (scoring/optimization v0)
router.get("/scored-induction", async (req, res: any) => {
  try {
    const limit = Math.min(parseInt((req.query.limit as string) || "25", 10), 100);
    const skip = Math.max(parseInt((req.query.skip as string) || "0", 10), 0);

    const decision = (req.query.decision as string) || undefined;
    const brandingPriority = (req.query.brandingPriority as string) || undefined;
    const cleaningStatus = (req.query.cleaningStatus as string) || undefined;
    const jobCardOpen = (req.query.jobCardOpen as string) || undefined;
    const minScore = req.query.minScore !== undefined ? Number(req.query.minScore) : undefined;

    // Optional weight overrides (query params): w_<weightKey>=number
    const persisted = await ScoringConfig.findOne({ key: "default" }).lean();
    const baseWeights = (persisted?.weights as any) || DEFAULT_WEIGHTS;
    const weights = { ...baseWeights } as any;
    for (const [k, v] of Object.entries(req.query)) {
      if (!k.startsWith("w_")) continue;
      const key = k.slice(2);
      const num = Number(v);
      if (Number.isFinite(num) && key in weights) {
        weights[key] = num;
      }
    }

    const trainsets = await Trainset.find().sort({ id: 1 }).lean();

    // Enrich with conflicts + explanation so scoring v1 can apply penalties
    const enriched = (trainsets as any[]).map((t) => {
      const conflicts = detectConflicts(t);
      const explanation = buildExplanation(t, {}, t.recommendation, t.reason);
      return { ...t, conflicts, explanation };
    });

    const rankedAll = rankTrainsets(enriched as any, weights);

    // Apply filters after scoring
    let filtered = rankedAll;
    if (decision) filtered = filtered.filter((t) => t.recommendation === decision);
    if (brandingPriority) filtered = filtered.filter((t) => t.brandingPriority === brandingPriority);
    if (cleaningStatus) filtered = filtered.filter((t) => t.cleaningStatus === cleaningStatus);
    if (jobCardOpen === "true" || jobCardOpen === "false") {
      const bool = jobCardOpen === "true";
      filtered = filtered.filter((t) => t.jobCardOpen === bool);
    }
    if (minScore !== undefined && Number.isFinite(minScore)) {
      filtered = filtered.filter((t) => t.score >= (minScore as number));
    }

    const paginated = filtered.slice(skip, skip + limit);

    res.json({
      ranked: paginated,
      skip,
      limit,
      total: filtered.length,
      weights,
    });
  } catch (error) {
    console.error("Scored induction error:", error);
    res.status(500).json({ error: "Failed to compute scored induction" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const trainset = await Trainset.findOne({ id: req.params.id }).lean();
    if (!trainset) {
      return res.status(404).json({ error: "Trainset not found" });
    }
    const conflicts = detectConflicts(trainset as any);
    const explanation = buildExplanation(
      trainset as any,
      {},
      (trainset as any).recommendation,
      (trainset as any).reason
    );
    res.json({
      ...(trainset as any),
      conflicts,
      explanation,
      lastConflictCheck: new Date(),
    });
  } catch (error) {
    console.error("Get trainset error:", error);
    res.status(500).json({ error: "Failed to fetch trainset" });
  }
});

router.patch(
  "/:id",
  authMiddleware,
  [body("recommendation").optional().isIn(["REVENUE", "STANDBY", "IBL"])],
  async (req: AuthRequest, res: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const trainset = await Trainset.findOne({ id: req.params.id });
      if (!trainset) {
        return res.status(404).json({ error: "Trainset not found" });
      }

      const beforeSnapshot = trainset.toObject();

      const { recommendation, manualOverride } = req.body;

      if (recommendation) {
        trainset.recommendation = recommendation;
        trainset.manualOverride = manualOverride || false;
        trainset.updatedBy = req.user?.email;
        trainset.lastUpdated = new Date();
      }

      await trainset.save();

      await AuditLog.create({
        action: "UPDATE_DECISION",
        actorEmail: req.user?.email,
        actorId: req.user?.id,
        trainsetId: trainset.id,
        before: beforeSnapshot,
        after: trainset.toObject(),
        metadata: {
          manualOverride: trainset.manualOverride,
        },
      });

      res.json(trainset);
    } catch (error) {
      console.error("Update trainset error:", error);
      res.status(500).json({ error: "Failed to update trainset" });
    }
  }
);

router.post(
  "/simulate",
  [
    body("rules").isObject(),
  ],
  async (req: AuthRequest, res: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { rules } = req.body as { rules: any };

      const trainsets = await Trainset.find().lean();
      const simulated = applySimulationRules(trainsets, rules);

      // Apply scoring with saved config if available
      const scoringConfig = await ScoringConfig.findOne({ key: "default" }).lean();
      const weights = scoringConfig?.weights || DEFAULT_WEIGHTS;
      const ranked = rankTrainsets(simulated as any, weights);

      // Calculate result counts
      const resultCounts = ranked.reduce(
        (acc: any, t: any) => {
          acc[t.recommendation] = (acc[t.recommendation] || 0) + 1;
          return acc;
        },
        {}
      );

      // Save simulation result to MongoDB
      const simulationId = `sim-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      try {
        await WhatIfSimulationResult.create({
          simulationId,
          rules,
          resultCounts,
          results: ranked.map((t: any) => ({
            id: t.id,
            recommendation: t.recommendation,
            score: t.score,
            reason: t.reason,
            ...t,
          })),
          createdBy: req.user?.email || "SYSTEM",
        });
      } catch (saveError) {
        console.error("Failed to save simulation result to MongoDB:", saveError);
        // Continue even if save fails
      }

      await AuditLog.create({
        action: "SIMULATE",
        actorEmail: req.user?.email,
        actorId: req.user?.id,
        metadata: {
          rules,
          resultCounts,
          simulationId,
        },
      });

      res.json(ranked);
    } catch (error) {
      console.error("Simulation error:", error);
      res.status(500).json({ error: "Simulation failed" });
    }
  }
);

// Get conflicts for a specific trainset
router.get("/:id/conflicts", async (req, res: any) => {
  try {
    const trainset = await Trainset.findOne({ id: req.params.id }).lean();
    if (!trainset) {
      return res.status(404).json({ error: "Trainset not found" });
    }

    const conflicts = detectConflicts(trainset as any);
    res.json({ conflicts, lastConflictCheck: new Date() });
  } catch (error) {
    console.error("Get trainset conflicts error:", error);
    res.status(500).json({ error: "Failed to fetch conflicts" });
  }
});

export default router;
