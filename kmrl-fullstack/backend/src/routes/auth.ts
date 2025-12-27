import { Router, Response } from "express";
import { body, validationResult } from "express-validator";
import { Admin } from "@/models/Admin";
import { generateToken, AuthRequest, authMiddleware } from "@/middleware/auth";

const router = Router();

router.post(
  "/signup",
  [
    body("email").isEmail().normalizeEmail(),
    body("password").isLength({ min: 6 }),
  ],
  async (req: any, res: Response) => {
    console.log("Signup request body:", { email: req.body.email, passwordProvided: !!req.body.password });
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.warn("Signup validation errors:", errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { email, password } = req.body;

      const existingAdmin = await Admin.findOne({ email });
      if (existingAdmin) {
        console.warn("Signup attempt with existing email:", email);
        return res.status(409).json({ error: "Email already registered" });
      }

      const admin = new Admin({ email, password });
      await admin.save();
      console.log("Admin created successfully:", { id: admin._id, email: admin.email, role: admin.role });

      const token = generateToken(admin._id.toString(), admin.email, admin.role);

      res.status(201).json({
        user: { id: admin._id, email: admin.email, role: admin.role },
        token,
      });
    } catch (error: any) {
      console.error("Signup error:", error);
      if (error.code === 11000) {
        // MongoDB duplicate key error
        return res.status(409).json({ error: "Email already registered" });
      }
      res.status(500).json({ error: "Signup failed", details: error.message });
    }
  }
);

router.post(
  "/login",
  [
    body("email").isEmail().normalizeEmail(),
    body("password").notEmpty(),
  ],
  async (req: any, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { email, password } = req.body;

      const admin = await Admin.findOne({ email });
      if (!admin) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const isPasswordValid = await admin.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      admin.lastLogin = new Date();
      await admin.save();

      const token = generateToken(admin._id.toString(), admin.email, admin.role);

      res.json({
        user: { id: admin._id, email: admin.email, role: admin.role },
        token,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  }
);

router.post("/refresh", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const admin = await Admin.findById(req.user.id);
    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    const token = generateToken(admin._id.toString(), admin.email, admin.role);

    res.json({
      user: { id: admin._id, email: admin.email, role: admin.role },
      token,
    });
  } catch (error) {
    console.error("Refresh error:", error);
    res.status(500).json({ error: "Token refresh failed" });
  }
});

export default router;
