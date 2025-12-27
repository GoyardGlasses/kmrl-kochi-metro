import mongoose from "mongoose";
import { env } from "@/config/env";
import { Trainset } from "@/models/Trainset";
import { Admin } from "@/models/Admin";

const generateTrainsets = () => {
  const trainsets = [];
  const recommendations: Array<"REVENUE" | "STANDBY" | "IBL"> = ["REVENUE", "STANDBY", "IBL"];
  const priorities: Array<"HIGH" | "MEDIUM" | "LOW"> = ["HIGH", "MEDIUM", "LOW"];
  const cleaningStatuses: Array<"COMPLETED" | "PENDING" | "OVERDUE"> = ["COMPLETED", "PENDING", "OVERDUE"];
  const fitnessStatuses: Array<"PASS" | "WARN" | "FAIL"> = ["PASS", "WARN", "FAIL"];

  const reasons = {
    REVENUE: [
      "All systems operational. Ready for peak service deployment.",
      "Premium trainset with excellent condition. High branding priority.",
      "Recently serviced. All fitness checks passed.",
      "Low mileage and optimal performance. Cleared for revenue service.",
      "New components installed. Fully operational and ready.",
    ],
    STANDBY: [
      "Minor warning detected. Suitable for standby until cleared.",
      "Approaching maintenance threshold. Hold for non-peak deployment.",
      "Cleaning pending. Ready after completion.",
      "System warning detected. Monitor closely before deployment.",
      "Scheduled for maintenance. Available for standby service.",
    ],
    IBL: [
      "Critical system failure. Requires immediate attention.",
      "Open job card for defect. Not safe for service.",
      "Multiple system failures detected. Maintenance required.",
      "Telecom failure reported. Requires repair.",
      "Rolling stock defect. Awaiting parts and inspection.",
    ],
  };

  for (let i = 1; i <= 25; i++) {
    const id = `TS-${String(i).padStart(2, "0")}`;
    const recommendation = recommendations[Math.floor(Math.random() * recommendations.length)];
    const priority = priorities[Math.floor(Math.random() * priorities.length)];
    const cleaning = cleaningStatuses[Math.floor(Math.random() * cleaningStatuses.length)];
    const mileage = Math.floor(Math.random() * 60000) + 5000;

    const rollingStockStatus = fitnessStatuses[Math.floor(Math.random() * fitnessStatuses.length)];
    const signallingStatus = fitnessStatuses[Math.floor(Math.random() * fitnessStatuses.length)];
    const telecomStatus = fitnessStatuses[Math.floor(Math.random() * fitnessStatuses.length)];

    trainsets.push({
      id,
      recommendation,
      reason: reasons[recommendation][Math.floor(Math.random() * reasons[recommendation].length)],
      mileageKm: mileage,
      brandingPriority: priority,
      jobCardOpen: Math.random() > 0.7,
      cleaningStatus: cleaning,
      fitness: {
        rollingStock: {
          status: rollingStockStatus,
          details: `Rolling stock status: ${rollingStockStatus}. Last inspection: ${Math.floor(Math.random() * 30)} days ago.`,
        },
        signalling: {
          status: signallingStatus,
          details: `Signalling system status: ${signallingStatus}. Signal strength: ${Math.floor(Math.random() * 100)}%.`,
        },
        telecom: {
          status: telecomStatus,
          details: `Telecom system status: ${telecomStatus}. Communication systems operational.`,
        },
      },
    });
  }

  return trainsets;
};

const mockTrainsets = generateTrainsets();

const migrateData = async () => {
  try {
    await mongoose.connect(env.mongoUri);
    console.log("Connected to MongoDB");

    await Trainset.deleteMany({});
    console.log("Cleared existing trainsets");

    const result = await Trainset.insertMany(mockTrainsets);
    console.log(`Migrated ${result.length} trainsets to MongoDB`);

    console.log("\nMigrated Trainsets:");
    result.forEach((ts) => {
      console.log(`  - ${ts.id}: ${ts.recommendation}`);
    });

    await mongoose.disconnect();
    console.log("\nMigration complete!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
};

migrateData();
