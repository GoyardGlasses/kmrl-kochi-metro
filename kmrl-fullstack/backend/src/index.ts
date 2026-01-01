import express from "express";
import cors from "cors";
import helmet from "helmet";
import mongoose from "mongoose";
import { env, isDev } from "@/config/env";
import authRoutes from "@/routes/auth";
import trainsetRoutes from "@/routes/trainsets";
import ingestRoutes from "@/routes/ingest";
import configRoutes from "@/routes/config";
import decisionRoutes from "@/routes/decision";
import serviceRoutes from "@/routes/service";
import dsaRoutes from "@/routes/dsa";
import kpiRoutes from "@/routes/kpi";
import realtimeRoutes from "@/routes/realtime";
import inductionRoutes from "@/routes/induction";
import { migrateAdminPasswords, seedTrainsets, seedAdmins, seedScoringConfig } from "@/utils/seedData";
import { seedDecisionData } from "@/utils/seedDecisionData";
import { seedConflictAlerts } from "@/utils/seedConflictAlerts";
import { Trainset } from "@/models/Trainset";
import { Admin } from "@/models/Admin";
import { startSchedulers } from "@/utils/scheduler";
import { authMiddleware } from "@/middleware/auth";

const app = express();

app.use(helmet());
app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());

mongoose
  .connect(env.mongoUri)
  .then(async () => {
    console.log("MongoDB connected");
    const trainsetCount = await Trainset.countDocuments();
    const adminCount = await Admin.countDocuments();

    // Ensure trainsets exist (and expand to configured fleet size if missing)
    console.log(`Found ${trainsetCount} trainsets in database`);
    await seedTrainsets();
    
    if (adminCount === 0) {
      console.log("Seeding admins...");
      await seedAdmins();
    } else {
      console.log(`Found ${adminCount} admins in database`);
    }

    await migrateAdminPasswords();

    await seedScoringConfig();
    await seedDecisionData();
    await seedConflictAlerts();
    startSchedulers();
  })
  .catch((err) => console.error("MongoDB connection error:", err));

app.use("/api/auth", authRoutes);
app.use("/api/trainsets", trainsetRoutes);
app.use("/api/ingestion", ingestRoutes);
app.use("/api/config", configRoutes);
app.use("/api/fitness", decisionRoutes);
app.use("/api/branding", decisionRoutes);
app.use("/api/mileage", decisionRoutes);
app.use("/api/cleaning", decisionRoutes);
app.use("/api/stabling", decisionRoutes);
app.use("/api/service", serviceRoutes);
app.use("/api/conflicts", serviceRoutes);
app.use("/api/optimization", serviceRoutes);
app.use("/api/whatif", serviceRoutes);
app.use("/api/dsa", dsaRoutes);
app.use("/api/kpi", kpiRoutes);
app.use("/api/realtime", realtimeRoutes);
app.use("/api/induction", inductionRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    error: isDev ? err.message : "Internal server error",
  });
});

const PORT = env.port;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${env.nodeEnv}`);
  console.log(`MongoDB: ${env.mongoUri}`);
});
