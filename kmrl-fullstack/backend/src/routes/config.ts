import { Router } from "express";
import { body, validationResult } from "express-validator";
import { authMiddleware, AuthRequest, requireSuperAdmin } from "@/middleware/auth";
import { ScoringConfig } from "@/models/ScoringConfig";
import { IngestionNotificationSettings } from "@/models/IngestionNotificationSettings";
import { DEFAULT_WEIGHTS } from "@/utils/scoring";

const router = Router();

router.get("/scoring", authMiddleware, async (req: AuthRequest, res: any) => {
  try {
    const existing = await ScoringConfig.findOne({ key: "default" }).lean();
    if (!existing) {
      return res.json({ key: "default", weights: DEFAULT_WEIGHTS });
    }
    res.json({ key: existing.key, weights: existing.weights, updatedBy: existing.updatedBy, updatedAt: existing.updatedAt });
  } catch (error) {
    console.error("Get scoring config error:", error);
    res.status(500).json({ error: "Failed to fetch scoring config" });
  }
});

router.put(
  "/scoring",
  authMiddleware,
  requireSuperAdmin,
  [body("weights").isObject()],
  async (req: AuthRequest, res: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { weights } = req.body as { weights: Record<string, any> };

      const updated = await ScoringConfig.findOneAndUpdate(
        { key: "default" },
        { key: "default", weights, updatedBy: req.user?.email },
        { new: true, upsert: true }
      ).lean();

      res.json({ key: updated.key, weights: updated.weights, updatedBy: updated.updatedBy, updatedAt: updated.updatedAt });
    } catch (error) {
      console.error("Update scoring config error:", error);
      res.status(500).json({ error: "Failed to update scoring config" });
    }
  }
);

router.get("/ingestion-notifications", authMiddleware, async (req: AuthRequest, res: any) => {
  try {
    const existing = await IngestionNotificationSettings.findOne({ key: "default" }).lean();
    if (!existing) {
      return res.json({
        key: "default",
        email: "",
        phone: "",
        notifyOnSuccess: false,
        notifyOnFailure: true,
      });
    }

    res.json({
      key: existing.key,
      email: existing.email || "",
      phone: existing.phone || "",
      notifyOnSuccess: !!existing.notifyOnSuccess,
      notifyOnFailure: !!existing.notifyOnFailure,
      updatedBy: existing.updatedBy,
      updatedAt: existing.updatedAt,
    });
  } catch (error) {
    console.error("Get ingestion notification settings error:", error);
    res.status(500).json({ error: "Failed to fetch ingestion notification settings" });
  }
});

router.put(
  "/ingestion-notifications",
  authMiddleware,
  requireSuperAdmin,
  [
    body("email").optional().isString(),
    body("phone").optional().isString(),
    body("notifyOnSuccess").isBoolean(),
    body("notifyOnFailure").isBoolean(),
  ],
  async (req: AuthRequest, res: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { email, phone, notifyOnSuccess, notifyOnFailure } = req.body as {
        email?: string;
        phone?: string;
        notifyOnSuccess: boolean;
        notifyOnFailure: boolean;
      };

      const updated = await IngestionNotificationSettings.findOneAndUpdate(
        { key: "default" },
        {
          key: "default",
          email: (email || "").trim() || undefined,
          phone: (phone || "").trim() || undefined,
          notifyOnSuccess,
          notifyOnFailure,
          updatedBy: req.user?.email,
        },
        { new: true, upsert: true }
      ).lean();

      res.json({
        key: updated.key,
        email: updated.email || "",
        phone: updated.phone || "",
        notifyOnSuccess: !!updated.notifyOnSuccess,
        notifyOnFailure: !!updated.notifyOnFailure,
        updatedBy: updated.updatedBy,
        updatedAt: updated.updatedAt,
      });
    } catch (error) {
      console.error("Update ingestion notification settings error:", error);
      res.status(500).json({ error: "Failed to update ingestion notification settings" });
    }
  }
);

router.delete(
  "/scoring",
  authMiddleware,
  requireSuperAdmin,
  async (req: AuthRequest, res: any) => {
    try {
      await ScoringConfig.deleteOne({ key: "default" });
      res.json({ key: "default", weights: DEFAULT_WEIGHTS, message: "Reset to default weights" });
    } catch (error) {
      console.error("Reset scoring config error:", error);
      res.status(500).json({ error: "Failed to reset scoring config" });
    }
  }
);

export default router;
