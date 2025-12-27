import { Trainset } from "@/models/Trainset";
import { Admin } from "@/models/Admin";

export const seedTrainsets = async () => {
  const count = await Trainset.countDocuments();
  if (count > 0) {
    console.log("Trainsets already seeded");
    return;
  }

  const trainsets = [
    {
      id: "TS-01",
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

  await Trainset.insertMany(trainsets);
  console.log("Trainsets seeded successfully");
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

  await Admin.insertMany(admins);
  console.log("Admins seeded successfully");
};
