import { JobCard } from "@/models/JobCard";
import { Trainset } from "@/models/Trainset";

const parseCsvLine = (line: string): string[] => {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === ',' && !inQuotes) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
};

const normalizeJobCardStatus = (raw: string): "OPEN" | "CLOSED" | "UNKNOWN" => {
  const s = (raw || "").trim().toLowerCase();
  if (["open", "wip", "in progress", "active"].includes(s)) return "OPEN";
  if (["closed", "complete", "completed", "resolved"].includes(s)) return "CLOSED";
  return "UNKNOWN";
};

export const ingestMaximoJobCardsCsv = async (args: {
  csv: string;
  source?: string;
  importedAt?: Date;
}): Promise<{
  importedAt: Date;
  rows: number;
  jobCardsUpserted: number;
  trainsetsTouched: number;
  trainsetsUpdated: number;
  results: Array<{ row: number; status: "UPSERTED" | "SKIPPED"; message?: string; trainsetId?: string; workOrderId?: string }>;
  trainsetUpdates: Array<{ trainsetId: string; status: "UPDATED" | "NOT_FOUND"; jobCardOpen?: boolean }>;
}> => {
  const importedAt = args.importedAt ?? new Date();

  const lines = args.csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    throw new Error("CSV must include header + at least 1 row");
  }

  const header = parseCsvLine(lines[0]).map((h) => h.replace(/^\uFEFF/, "").trim().toLowerCase());
  const idxTrainsetId = header.indexOf("trainsetid");
  const idxWorkOrderId = header.indexOf("workorderid");
  const idxStatus = header.indexOf("status");
  const idxSummary = header.indexOf("summary");

  if (idxTrainsetId === -1 || idxWorkOrderId === -1 || idxStatus === -1) {
    throw new Error("CSV header must include trainsetId, workOrderId, status");
  }

  const results: Array<{ row: number; status: "UPSERTED" | "SKIPPED"; message?: string; trainsetId?: string; workOrderId?: string }> = [];
  const touchedTrainsets = new Set<string>();
  let upserted = 0;

  for (let i = 1; i < lines.length; i++) {
    const rowNum = i + 1;
    const cols = parseCsvLine(lines[i]);
    const trainsetId = (cols[idxTrainsetId] || "").trim();
    const workOrderId = (cols[idxWorkOrderId] || "").trim();
    const rawStatus = (cols[idxStatus] || "").trim();
    const summary = idxSummary !== -1 ? (cols[idxSummary] || "").trim() : undefined;

    if (!trainsetId || !workOrderId) {
      results.push({ row: rowNum, status: "SKIPPED", message: "Missing trainsetId/workOrderId" });
      continue;
    }

    const status = normalizeJobCardStatus(rawStatus);
    const isOpen = status === "OPEN";

    await JobCard.findOneAndUpdate(
      { trainsetId, workOrderId },
      { trainsetId, workOrderId, status, isOpen, summary, source: args.source, importedAt },
      { upsert: true, new: true }
    );

    upserted++;
    touchedTrainsets.add(trainsetId);
    results.push({ row: rowNum, status: "UPSERTED", trainsetId, workOrderId });
  }

  let updatedTrainsets = 0;
  const trainsetUpdates: Array<{ trainsetId: string; status: "UPDATED" | "NOT_FOUND"; jobCardOpen?: boolean }> = [];

  for (const trainsetId of touchedTrainsets) {
    const trainset = await Trainset.findOne({ id: trainsetId });
    if (!trainset) {
      trainsetUpdates.push({ trainsetId, status: "NOT_FOUND" });
      continue;
    }

    const openCount = await JobCard.countDocuments({ trainsetId, isOpen: true });
    trainset.jobCardOpen = openCount > 0;
    trainset.lastUpdated = new Date();
    await trainset.save();

    updatedTrainsets++;
    trainsetUpdates.push({ trainsetId, status: "UPDATED", jobCardOpen: trainset.jobCardOpen });
  }

  return {
    importedAt,
    rows: lines.length - 1,
    jobCardsUpserted: upserted,
    trainsetsTouched: touchedTrainsets.size,
    trainsetsUpdated: updatedTrainsets,
    results,
    trainsetUpdates,
  };
};
