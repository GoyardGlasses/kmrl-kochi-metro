import { Trainset } from "@/models/Trainset";
import { Admin } from "@/models/Admin";
import { ScoringConfig } from "@/models/ScoringConfig";
import { DEFAULT_WEIGHTS } from "@/utils/scoring";

export const migrateAdminPasswords = async () => {
  const admins = await Admin.find({});
  let migrated = 0;

  for (const admin of admins) {
    const current = admin.password;
    const looksHashed = typeof current === "string" && /^\$2[aby]\$/.test(current);
    if (looksHashed) {
      continue;
    }

    admin.password = current;
    admin.markModified("password");
    await admin.save();
    migrated += 1;
  }

  if (migrated > 0) {
    console.log(`Migrated ${migrated} admin password(s) to bcrypt`);
  }
};

export const seedTrainsets = async () => {
  const desiredCount = 40;
  const existing = await Trainset.find({}, { id: 1 }).lean();
  const existingIds = new Set(existing.map((t: any) => t.id));

  const trainsets = [
    {
      id: "TS-01",
      depotId: "DEPOT-1",
      recommendation: "REVENUE",
      reason: "All systems operational. Low mileage since last maintenance. High branding priority for morning rush deployment.",
      mileageKm: 12450,
      brandingPriority: "HIGH",
      jobCardOpen: false,
      cleaningStatus: "COMPLETED",
      fitness: {
        rollingStock: { status: "PASS", details: "All components within tolerance. Last inspection: 2 days ago." },
        signalling: { status: "PASS", details: "CBTC fully operational. Signal strength optimal." },
        telecom: { status: "PASS", details: "PA system tested. CCTV functional on all cars." },
      },
    },
    {
      id: "TS-02",
      depotId: "DEPOT-1",
      recommendation: "STANDBY",
      reason: "Minor signalling warning detected. Suitable for standby until cleared. Cleaning pending.",
      mileageKm: 28900,
      brandingPriority: "MEDIUM",
      jobCardOpen: false,
      cleaningStatus: "PENDING",
      fitness: {
        rollingStock: { status: "PASS", details: "Brake wear at 65%. Scheduled for check next week." },
        signalling: { status: "WARN", details: "Intermittent beacon response on car 3. Under investigation." },
        telecom: { status: "PASS", details: "All communication systems operational." },
      },
    },
    {
      id: "TS-03",
      depotId: "DEPOT-1",
      recommendation: "IBL",
      reason: "Open job card for rolling stock defect. Critical telecom failure reported. Requires immediate attention.",
      mileageKm: 45200,
      brandingPriority: "LOW",
      jobCardOpen: true,
      cleaningStatus: "OVERDUE",
      fitness: {
        rollingStock: { status: "FAIL", details: "Door sensor malfunction on car 2. Awaiting parts." },
        signalling: { status: "PASS", details: "Signalling systems operational." },
        telecom: { status: "FAIL", details: "Emergency intercom non-functional. PA system degraded." },
      },
    },
    {
      id: "TS-04",
      depotId: "DEPOT-1",
      recommendation: "REVENUE",
      reason: "Premium trainset with high branding priority. All fitness checks passed. Recently serviced.",
      mileageKm: 8900,
      brandingPriority: "HIGH",
      jobCardOpen: false,
      cleaningStatus: "COMPLETED",
      fitness: {
        rollingStock: { status: "PASS", details: "New bogies installed. Full service completed yesterday." },
        signalling: { status: "PASS", details: "ATP/ATO systems calibrated and verified." },
        telecom: { status: "PASS", details: "WiFi coverage at 98%. All displays functional." },
      },
    },
    {
      id: "TS-05",
      depotId: "DEPOT-1",
      recommendation: "STANDBY",
      reason: "Approaching maintenance threshold. Branding refresh scheduled. Hold for non-peak deployment.",
      mileageKm: 34500,
      brandingPriority: "MEDIUM",
      jobCardOpen: false,
      cleaningStatus: "COMPLETED",
      fitness: {
        rollingStock: { status: "WARN", details: "Mileage at 85% of service interval. Monitor closely." },
        signalling: { status: "PASS", details: "All signalling parameters nominal." },
        telecom: { status: "PASS", details: "Minor display flicker on car 1. Non-critical." },
      },
    },
    {
      id: "TS-06",
      depotId: "DEPOT-1",
      recommendation: "REVENUE",
      reason: "Cleared from previous maintenance hold. All systems verified. Ready for peak service.",
      mileageKm: 15600,
      brandingPriority: "HIGH",
      jobCardOpen: false,
      cleaningStatus: "COMPLETED",
      fitness: {
        rollingStock: { status: "PASS", details: "Post-maintenance inspection complete." },
        signalling: { status: "PASS", details: "Signal response time within spec." },
        telecom: { status: "PASS", details: "All passenger information systems verified." },
      },
    },
    {
      id: "TS-07",
      depotId: "DEPOT-1",
      recommendation: "IBL",
      reason: "Multiple system failures. Rolling stock and signalling both require attention. Not safe for service.",
      mileageKm: 52000,
      brandingPriority: "LOW",
      jobCardOpen: true,
      cleaningStatus: "OVERDUE",
      fitness: {
        rollingStock: { status: "FAIL", details: "Traction motor overheating detected. Immediate inspection required." },
        signalling: { status: "FAIL", details: "ATO mode degraded. Manual operation only." },
        telecom: { status: "WARN", details: "CCTV recording intermittent on cars 2-4." },
      },
    },
  ];

  const generated: any[] = [];
  const priorities = ["HIGH", "MEDIUM", "LOW"] as const;
  const cleaning = ["COMPLETED", "PENDING", "OVERDUE"] as const;
  const fitnessStatus = ["PASS", "WARN", "FAIL"] as const;
  const pick = <T,>(arr: readonly T[]) => arr[Math.floor(Math.random() * arr.length)];

  for (let i = 1; i <= desiredCount; i++) {
    const id = `TS-${i.toString().padStart(2, "0")}`;
    if (trainsets.find((t: any) => t.id === id)) continue;
    if (existingIds.has(id)) continue;

    const bp = pick(priorities);
    const cs = pick(cleaning);
    const jobCardOpen = Math.random() < 0.2;
    const rs = pick(fitnessStatus);
    const sig = pick(fitnessStatus);
    const tel = pick(fitnessStatus);

    // Keep IBL more likely if there are FAILs or open job card
    const hasFail = rs === "FAIL" || sig === "FAIL" || tel === "FAIL";
    const recommendation = hasFail || jobCardOpen || cs === "OVERDUE" ? "IBL" : Math.random() < 0.7 ? "REVENUE" : "STANDBY";

    generated.push({
      id,
      depotId: "DEPOT-1",
      recommendation,
      reason: "Auto-generated trainset seed for expanded fleet.",
      mileageKm: 8000 + Math.floor(Math.random() * 50000),
      brandingPriority: bp,
      jobCardOpen,
      cleaningStatus: cs,
      fitness: {
        rollingStock: { status: rs, details: "Generated" },
        signalling: { status: sig, details: "Generated" },
        telecom: { status: tel, details: "Generated" },
      },
    });
  }

  const toInsert = trainsets.filter((t: any) => !existingIds.has(t.id)).concat(generated);
  if (toInsert.length === 0) {
    console.log(`Trainsets already seeded (${existingIds.size})`);
    return;
  }

  await Trainset.insertMany(toInsert);
  const total = await Trainset.countDocuments();
  console.log(`Trainsets seeded/extended successfully. Total trainsets: ${total}`);
};

export const seedAdmins = async () => {
  const count = await Admin.countDocuments();
  if (count > 0) {
    console.log("Admins already seeded");
    return;
  }

  const admins = [
    {
      email: "admin@kmrl.in",
      password: "admin123",
      name: "Admin User",
      role: "admin",
    },
    {
      email: "superadmin@kmrl.in",
      password: "superadmin123",
      name: "Super Admin",
      role: "superadmin",
    },
  ];

  for (const admin of admins) {
    const doc = new Admin(admin);
    await doc.save();
  }
  console.log("Admins seeded successfully");
};

export const seedScoringConfig = async () => {
  const existing = await ScoringConfig.findOne({ key: "default" });
  if (existing) {
    console.log("Scoring config already seeded");
    return;
  }
  await ScoringConfig.create({ key: "default", weights: DEFAULT_WEIGHTS });
  console.log("Scoring config seeded successfully");
};
