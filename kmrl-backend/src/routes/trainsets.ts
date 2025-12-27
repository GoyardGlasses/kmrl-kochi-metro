import { Router } from "express";
import { body, validationResult } from "express-validator";
import { Trainset } from "@/models/Trainset";
import { authMiddleware, AuthRequest } from "@/middleware/auth";
import { applySimulationRules } from "@/utils/simulation";

const router = Router();

router.get("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const trainsets = await Trainset.find().sort({ id: 1 });
    res.json(trainsets);
  } catch (error) {
    console.error("List trainsets error:", error);
    res.status(500).json({ error: "Failed to fetch trainsets" });
  }
});

router.get("/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const trainset = await Trainset.findOne({ id: req.params.id });
    if (!trainset) {
      return res.status(404).json({ error: "Trainset not found" });
    }
    res.json(trainset);
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

      const { recommendation, manualOverride } = req.body;

      if (recommendation) {
        trainset.recommendation = recommendation;
        trainset.manualOverride = manualOverride || false;
        trainset.updatedBy = req.user?.email;
        trainset.lastUpdated = new Date();
      }

      await trainset.save();
      res.json(trainset);
    } catch (error) {
      console.error("Update trainset error:", error);
      res.status(500).json({ error: "Failed to update trainset" });
    }
  }
);

router.post(
  "/simulate",
  authMiddleware,
  [
    body("rules").isObject(),
  ],
  async (req: AuthRequest, res: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const trainsets = await Trainset.find().sort({ id: 1 });
      const { rules } = req.body;

      const simulated = applySimulationRules(trainsets, rules);

      res.json(simulated);
    } catch (error) {
      console.error("Simulation error:", error);
      res.status(500).json({ error: "Simulation failed" });
    }
  }
);

export default router;
