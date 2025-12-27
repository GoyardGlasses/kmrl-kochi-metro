import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Database, ArrowLeft } from "lucide-react";
import { httpClient } from "@/services/httpClient";
import { showToast } from "@/lib/toast";
import { useQueryClient } from "@tanstack/react-query";

const IngestPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [maximoData, setMaximoData] = useState(`[
  {
    "trainsetId": "TS-01",
    "jobCardOpen": false,
    "cleaningStatus": "COMPLETED"
  }
]`);
  const [fitnessData, setFitnessData] = useState(`[
  {
    "trainsetId": "TS-01",
    "fitness": {
      "rollingStock": {"status": "PASS", "details": "OK"},
      "signalling": {"status": "PASS", "details": "OK"},
      "telecom": {"status": "PASS", "details": "OK"}
    }
  }
]`);

  const refreshAppData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["trainsets"] }),
      queryClient.invalidateQueries({ queryKey: ["conflict-alerts"] }),
      queryClient.invalidateQueries({ queryKey: ["service-readiness"] }),
      queryClient.invalidateQueries({ queryKey: ["ingestionRuns"] }),
    ]);
  };

  const handleMaximoSubmit = async () => {
    setIsLoading(true);
    try {
      const updates = JSON.parse(maximoData);
      const result = await httpClient.post<any>("/ingestion/maximo", { updates });
      showToast(`Maximo data submitted successfully (updated: ${result?.updated ?? 0})`, "success");
      await refreshAppData();
    } catch (error: any) {
      showToast(`Error: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFitnessSubmit = async () => {
    setIsLoading(true);
    try {
      const updates = JSON.parse(fitnessData);
      const result = await httpClient.post<any>("/ingestion/fitness", { updates });
      showToast(`Fitness data submitted successfully (updated: ${result?.updated ?? 0})`, "success");
      await refreshAppData();
    } catch (error: any) {
      showToast(`Error: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <Database className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Data Ingestion</h1>
                <p className="text-sm text-muted-foreground">KMRL Trainset Management</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Maximo Data */}
          <Card>
            <CardHeader>
              <CardTitle>Maximo Updates</CardTitle>
              <CardDescription>Job card and cleaning status updates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={maximoData}
                onChange={(e) => setMaximoData(e.target.value)}
                placeholder="Enter Maximo data as JSON..."
                className="min-h-[150px] font-mono text-sm"
              />
              <Button onClick={handleMaximoSubmit} disabled={isLoading} className="w-full">
                {isLoading ? "Submitting..." : "Submit Maximo Data"}
              </Button>
            </CardContent>
          </Card>

          {/* Fitness Data */}
          <Card>
            <CardHeader>
              <CardTitle>Fitness Data</CardTitle>
              <CardDescription>Rolling stock, signalling, and telecom fitness</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={fitnessData}
                onChange={(e) => setFitnessData(e.target.value)}
                placeholder="Enter fitness data as JSON..."
                className="min-h-[150px] font-mono text-sm"
              />
              <Button onClick={handleFitnessSubmit} disabled={isLoading} className="w-full">
                {isLoading ? "Submitting..." : "Submit Fitness Data"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default IngestPage;
