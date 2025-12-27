import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Upload, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { httpClient } from "@/services/httpClient";
import { showToast } from "@/lib/toast";

type CleaningStatus = "COMPLETED" | "PENDING" | "OVERDUE";
type FitnessStatus = "PASS" | "WARN" | "FAIL";

const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T,>(arr: T[]) => arr[randInt(0, arr.length - 1)];

const makeIds = (count: number) => Array.from({ length: count }, (_, i) => `TS-${String(i + 1).padStart(3, "0")}`);

const generateMaximoPayload = (count: number) => {
  const ids = makeIds(25);
  const updates = Array.from({ length: count }, () => {
    const trainsetId = pick(ids);
    const jobCardOpen = Math.random() < 0.25; // 25% open
    const cleaningStatus: CleaningStatus = pick(["COMPLETED", "PENDING", "OVERDUE"]);
    return { trainsetId, jobCardOpen, cleaningStatus };
  });
  return { source: "mock-maximo", generatedAt: new Date().toISOString(), updates };
};

const generateFitnessPayload = (count: number) => {
  const ids = makeIds(25);

  const makeFitness = () => {
    const status: FitnessStatus = pick(["PASS", "PASS", "WARN", "FAIL"]);
    const details =
      status === "PASS"
        ? "Valid certificate"
        : status === "WARN"
          ? "Due for renewal soon"
          : "Expired/invalid certificate";
    return { status, details };
  };

  const updates = Array.from({ length: count }, () => {
    const trainsetId = pick(ids);
    return {
      trainsetId,
      fitness: {
        rollingStock: makeFitness(),
        signalling: makeFitness(),
        telecom: makeFitness(),
      },
    };
  });

  return { source: "mock-fitness", generatedAt: new Date().toISOString(), updates };
};

const downloadJson = (filename: string, obj: any) => {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const IngestPage = () => {
  const navigate = useNavigate();

  const [maximoCount, setMaximoCount] = useState(8);
  const [fitnessCount, setFitnessCount] = useState(8);

  const [maximoJson, setMaximoJson] = useState(() => JSON.stringify(generateMaximoPayload(8), null, 2));
  const [fitnessJson, setFitnessJson] = useState(() => JSON.stringify(generateFitnessPayload(8), null, 2));

  const maximoObj = useMemo(() => {
    try {
      return JSON.parse(maximoJson);
    } catch {
      return null;
    }
  }, [maximoJson]);

  const fitnessObj = useMemo(() => {
    try {
      return JSON.parse(fitnessJson);
    } catch {
      return null;
    }
  }, [fitnessJson]);

  const regenerateMaximo = () => setMaximoJson(JSON.stringify(generateMaximoPayload(maximoCount), null, 2));
  const regenerateFitness = () => setFitnessJson(JSON.stringify(generateFitnessPayload(fitnessCount), null, 2));

  const submitMaximo = async () => {
    if (!maximoObj) {
      showToast("Maximo JSON is invalid", "error");
      return;
    }
    const res = await httpClient.post<any, any>("/ingest/maximo", maximoObj);
    showToast(`Maximo ingest OK: updated ${res.updated}`, "success");
  };

  const submitFitness = async () => {
    if (!fitnessObj) {
      showToast("Fitness JSON is invalid", "error");
      return;
    }
    const res = await httpClient.post<any, any>("/ingest/fitness", fitnessObj);
    showToast(`Fitness ingest OK: updated ${res.updated}`, "success");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Mock Data Ingestion</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Generate realistic JSON payloads and ingest them into the backend. One click to download, one click to submit.
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Maximo (Job Cards + Cleaning)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <div className="text-xs text-muted-foreground mb-1">Number of updates</div>
                    <Input
                      type="number"
                      value={maximoCount}
                      min={1}
                      max={25}
                      onChange={(e) => setMaximoCount(Number(e.target.value || 1))}
                    />
                  </div>
                  <Button variant="outline" onClick={regenerateMaximo}>
                    <RefreshCw className="w-4 h-4 mr-2" /> Regenerate
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => downloadJson(`mock-maximo-${Date.now()}.json`, maximoObj ?? {})}
                    disabled={!maximoObj}
                  >
                    <Download className="w-4 h-4 mr-2" /> Download
                  </Button>
                </div>

                <Textarea value={maximoJson} onChange={(e) => setMaximoJson(e.target.value)} rows={14} />

                <Button onClick={submitMaximo} className="w-full">
                  <Upload className="w-4 h-4 mr-2" /> Submit to /api/ingest/maximo
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fitness Certificates (Rolling / Signalling / Telecom)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <div className="text-xs text-muted-foreground mb-1">Number of updates</div>
                    <Input
                      type="number"
                      value={fitnessCount}
                      min={1}
                      max={25}
                      onChange={(e) => setFitnessCount(Number(e.target.value || 1))}
                    />
                  </div>
                  <Button variant="outline" onClick={regenerateFitness}>
                    <RefreshCw className="w-4 h-4 mr-2" /> Regenerate
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => downloadJson(`mock-fitness-${Date.now()}.json`, fitnessObj ?? {})}
                    disabled={!fitnessObj}
                  >
                    <Download className="w-4 h-4 mr-2" /> Download
                  </Button>
                </div>

                <Textarea value={fitnessJson} onChange={(e) => setFitnessJson(e.target.value)} rows={14} />

                <Button onClick={submitFitness} className="w-full">
                  <Upload className="w-4 h-4 mr-2" /> Submit to /api/ingest/fitness
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default IngestPage;
