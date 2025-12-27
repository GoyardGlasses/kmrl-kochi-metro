import { Router } from "express";
import { Trainset } from "@/models/Trainset";
import { FitnessCertificate, BrandingContract, MileageBalance, CleaningSlot, StablingGeometry } from "@/models/Decision";
import { InductionRun } from "@/models/InductionRun";

const router = Router();

type Decision = "REVENUE" | "STANDBY" | "IBL";

function uniqueRunId() {
  return `induction-${Date.now()}`;
}

function normalizeReasons(reasons: string[]) {
  return Array.from(new Set(reasons)).filter(Boolean);
}

function buildHardConstraintBlockers(params: {
  trainsetId: string;
  fitnessCerts: any[];
  trainset: any;
  stabling: any | null;
}): string[] {
  const blockers: string[] = [];

  // 1) Fitness certificates
  for (const cert of params.fitnessCerts) {
    if (cert.status === "EXPIRED") {
      blockers.push(`${cert.department} fitness certificate EXPIRED`);
    }
  }

  // 2) Job card
  if (params.trainset.jobCardOpen) {
    blockers.push("Open job card present");
  }

  // 3) Cleaning
  if (params.trainset.cleaningStatus === "OVERDUE") {
    blockers.push("Cleaning OVERDUE");
  }

  // 4) Stabling geometry - treat "cannot exit at dawn" as blocker
  if (params.stabling && params.stabling.constraints && params.stabling.constraints.canExitAtDawn === false) {
    blockers.push("Stabling constraint: cannot exit at dawn");
  }

  return normalizeReasons(blockers);
}

function isCleaningSlotAvailableForTrainset(params: {
  trainsetId: string;
  cleaningSlotsAll: any[];
}): boolean {
  // MVP rule:
  // If any cleaning slot has remaining capacity and overlaps the night window, consider it available.
  // If the trainset is already assigned in any slot, also consider it available.
  const now = new Date();
  const assigned = params.cleaningSlotsAll.some((s) => (s.assignedTrainsets || []).includes(params.trainsetId));
  if (assigned) return true;

  // window check is lenient for MVP; we mainly enforce capacity
  return params.cleaningSlotsAll.some((s) => {
    const cap = typeof s.capacity === "number" ? s.capacity : 0;
    const occ = typeof s.currentOccupancy === "number" ? s.currentOccupancy : 0;
    const hasCapacity = occ < cap;

    const from = s.availableFrom ? new Date(s.availableFrom) : null;
    const until = s.availableUntil ? new Date(s.availableUntil) : null;
    const inWindow = from && until ? now <= until : true;

    return hasCapacity && inWindow;
  });
}

function scoreEligible(params: {
  brandingContract: any | null;
  mileageBalance: any | null;
  trainset: any;
  stabling: any | null;
}): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // Branding
  if (params.brandingContract) {
    if (params.brandingContract.priority === "HIGH") {
      score += 30;
      reasons.push("Branding priority HIGH");
    } else if (params.brandingContract.priority === "MEDIUM") {
      score += 15;
      reasons.push("Branding priority MEDIUM");
    }

    if (typeof params.brandingContract.remainingHours === "number" && params.brandingContract.remainingHours < 100) {
      score += 10;
      reasons.push("Branding hours running low (<100)");
    }
  }

  // Mileage balancing
  if (params.mileageBalance && typeof params.mileageBalance.variance === "number") {
    const absVar = Math.abs(params.mileageBalance.variance);
    // More variance = more priority to balance
    if (absVar > 10000) {
      score += 20;
      reasons.push("High mileage variance (>10k)");
    } else if (absVar > 5000) {
      score += 10;
      reasons.push("Moderate mileage variance (>5k)");
    }
  }

  // Cleaning state
  if (params.trainset.cleaningStatus === "COMPLETED") {
    score += 10;
    reasons.push("Cleaning completed");
  } else if (params.trainset.cleaningStatus === "PENDING") {
    score += 0;
    reasons.push("Cleaning pending");
  }

  // Stabling tie-break (lower shuntingDistance / turnaroundTime is better)
  if (params.stabling) {
    if (
      typeof params.stabling.constraints?.requiresShunting === "boolean" &&
      params.stabling.constraints.requiresShunting
    ) {
      score -= 5;
      reasons.push("Requires shunting (stabling)");
    }
    if (typeof params.stabling.shuntingDistance === "number") {
      score += Math.max(0, 10 - Math.floor(params.stabling.shuntingDistance / 50));
    }
    if (typeof params.stabling.turnaroundTime === "number") {
      score += Math.max(0, 10 - Math.floor(params.stabling.turnaroundTime / 10));
    }

    // Extra penalty if blockedBy is present (layout constraint)
    if (params.stabling.constraints?.blockedBy) {
      score -= 5;
      reasons.push("Stabling blocked by another position");
    }
  }

  return { score, reasons: normalizeReasons(reasons) };
}

// POST /api/induction/run
// MVP Rule (Option B + cap): REVENUE = top N eligible, STANDBY = remaining eligible, IBL = blocked.
router.post("/run", async (req, res) => {
  try {
    const runId = uniqueRunId();

    const revenueCountRaw = (req.query.revenueCount as string) || (req.body?.revenueCount as string);
    const revenueCount = revenueCountRaw ? Math.max(0, parseInt(revenueCountRaw, 10)) : undefined;

    const depotId = (req.query.depotId as string) || (req.body?.depotId as string) || undefined;

    const trainsets = await Trainset.find(depotId ? { depotId } : {})
      .sort({ id: 1 })
      .lean();

    const trainsetIds = (trainsets as any[]).map((t) => t.id);

    // Preload decision datasets
    const [fitnessCertsAll, brandingAll, mileageAll, cleaningSlotsAll, stablingAll] = await Promise.all([
      FitnessCertificate.find({ trainsetId: { $in: trainsetIds } }).lean(),
      BrandingContract.find({ trainsetId: { $in: trainsetIds } }).lean(),
      MileageBalance.find({ trainsetId: { $in: trainsetIds } }).lean(),
      CleaningSlot.find({}).lean(),
      StablingGeometry.find({ trainsetId: { $in: trainsetIds } }).lean(),
    ]);

    const fitnessByTrainset = new Map<string, any[]>();
    for (const c of fitnessCertsAll) {
      const arr = fitnessByTrainset.get(c.trainsetId) || [];
      arr.push(c);
      fitnessByTrainset.set(c.trainsetId, arr);
    }

    const brandingByTrainset = new Map<string, any>();
    for (const b of brandingAll) brandingByTrainset.set(b.trainsetId, b);

    const mileageByTrainset = new Map<string, any>();
    for (const m of mileageAll) mileageByTrainset.set(m.trainsetId, m);

    const stablingByTrainset = new Map<string, any>();
    for (const s of stablingAll) {
      if (s.trainsetId) stablingByTrainset.set(s.trainsetId, s);
    }

    const results: { trainsetId: string; decision: Decision; score: number; reasons: string[]; blockers: string[] }[] = [];

    for (const t of trainsets as any[]) {
      const trainsetId = t.id;
      const fitnessCerts = fitnessByTrainset.get(trainsetId) || [];
      const brandingContract = brandingByTrainset.get(trainsetId) || null;
      const mileageBalance = mileageByTrainset.get(trainsetId) || null;
      const stabling = stablingByTrainset.get(trainsetId) || null;

      const blockers = buildHardConstraintBlockers({
        trainsetId,
        fitnessCerts,
        trainset: t,
        stabling,
      });

      if (blockers.length > 0) {
        results.push({
          trainsetId,
          decision: "IBL",
          score: 0,
          reasons: blockers,
          blockers,
        });
        continue;
      }

      // Cleaning capacity gate: if cleaning is PENDING and no slot capacity is available, do not allow REVENUE
      if (t.cleaningStatus === "PENDING") {
        const cleaningOk = isCleaningSlotAvailableForTrainset({ trainsetId, cleaningSlotsAll });
        if (!cleaningOk) {
          results.push({
            trainsetId,
            decision: "STANDBY",
            score: 0,
            reasons: ["Cleaning pending and no slot capacity available"],
            blockers: [],
          });
          continue;
        }
      }

      const { score, reasons } = scoreEligible({
        brandingContract,
        mileageBalance,
        trainset: t,
        stabling,
      });

      results.push({ trainsetId, decision: "REVENUE", score, reasons, blockers: [] });
    }

    // Rank eligible by score and apply revenue cap
    const eligibleRanked = results
      .filter((r) => r.decision === "REVENUE")
      .sort((a, b) => b.score - a.score);

    const cap = revenueCount === undefined ? eligibleRanked.length : Math.min(revenueCount, eligibleRanked.length);
    const revenue = eligibleRanked.slice(0, cap);
    const standbyFromEligible = eligibleRanked.slice(cap).map((r) => ({ ...r, decision: "STANDBY" as const }));
    const standbyFromCleaning = results.filter((r) => r.decision === "STANDBY");
    const standby = [...standbyFromCleaning, ...standbyFromEligible].sort((a, b) => b.score - a.score);

    const ibl = results.filter((r) => r.decision === "IBL").sort((a, b) => a.trainsetId.localeCompare(b.trainsetId));

    const counts = {
      revenue: revenue.length,
      standby: standby.length,
      ibl: ibl.length,
    };

    const runDoc = await InductionRun.create({
      runId,
      rule: "OPTION_B",
      results: [...revenue, ...standby, ...ibl].map((r) => ({
        trainsetId: r.trainsetId,
        decision: r.decision,
        score: r.score,
        reasons: r.reasons,
        blockers: r.blockers,
      })),
      counts,
    });

    res.json({
      runId: runDoc.runId,
      createdAt: runDoc.createdAt,
      rule: runDoc.rule,
      counts,
      revenue,
      standby,
      ibl,
    });
  } catch (error) {
    console.error("Induction run error:", error);
    res.status(500).json({ error: "Failed to create induction run" });
  }
});

// GET /api/induction/runs
router.get("/runs", async (req, res) => {
  try {
    const limit = Math.min(parseInt((req.query.limit as string) || "20", 10), 100);
    const runs = await InductionRun.find({}).sort({ createdAt: -1 }).limit(limit).lean();
    res.json({ runs });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch induction runs" });
  }
});

// GET /api/induction/runs/:runId
router.get("/runs/:runId", async (req, res) => {
  try {
    const run = await InductionRun.findOne({ runId: req.params.runId }).lean();
    if (!run) return res.status(404).json({ error: "Induction run not found" });

    const revenue = run.results.filter((r: any) => r.decision === "REVENUE").sort((a: any, b: any) => b.score - a.score);
    const standby = run.results.filter((r: any) => r.decision === "STANDBY");
    const ibl = run.results.filter((r: any) => r.decision === "IBL");

    res.json({
      runId: run.runId,
      createdAt: run.createdAt,
      rule: run.rule,
      counts: run.counts,
      revenue,
      standby,
      ibl,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch induction run" });
  }
});

export default router;
