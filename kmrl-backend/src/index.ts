import express from "express";
import cors from "cors";
import helmet from "helmet";
import mongoose from "mongoose";
import { env, isDev } from "@/config/env";
import authRoutes from "@/routes/auth";
import trainsetRoutes from "@/routes/trainsets";
import { seedTrainsets, seedAdmins } from "@/utils/seedData";
import { Trainset } from "@/models/Trainset";
import { Admin } from "@/models/Admin";

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
    
    if (trainsetCount === 0) {
      console.log("Seeding trainsets...");
      await seedTrainsets();
    } else {
      console.log(`Found ${trainsetCount} trainsets in database`);
    }
    
    if (adminCount === 0) {
      console.log("Seeding admins...");
      await seedAdmins();
    } else {
      console.log(`Found ${adminCount} admins in database`);
    }
  })
  .catch((err) => console.error("MongoDB connection error:", err));

app.use("/api/auth", authRoutes);
app.use("/api/trainsets", trainsetRoutes);

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
