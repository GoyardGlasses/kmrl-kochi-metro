import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Database, ArrowLeft, Sparkles, CheckCircle2, XCircle, Lightbulb } from "lucide-react";
import { httpClient } from "@/services/httpClient";
import { showToast } from "@/lib/toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface MLSuggestion {
  type: "improvement" | "warning" | "info";
  message: string;
  example?: string;
}

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
  
  // ML Suggestions state
  const [showMaximoSuggestions, setShowMaximoSuggestions] = useState(false);
  const [showFitnessSuggestions, setShowFitnessSuggestions] = useState(false);
  const [maximoSuggestions, setMaximoSuggestions] = useState<MLSuggestion[]>([]);
  const [fitnessSuggestions, setFitnessSuggestions] = useState<MLSuggestion[]>([]);
  const [maximoConfirmed, setMaximoConfirmed] = useState(false);
  const [fitnessConfirmed, setFitnessConfirmed] = useState(false);

  const refreshAppData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["trainsets"] }),
      queryClient.invalidateQueries({ queryKey: ["conflict-alerts"] }),
      queryClient.invalidateQueries({ queryKey: ["service-readiness"] }),
      queryClient.invalidateQueries({ queryKey: ["ingestionRuns"] }),
    ]);
  };

  // Generate ML suggestions for Maximo data
  const generateMaximoSuggestions = (data: string): MLSuggestion[] => {
    const suggestions: MLSuggestion[] = [];
    
    try {
      const parsed = JSON.parse(data);
      
      if (!Array.isArray(parsed)) {
        suggestions.push({
          type: "warning",
          message: "Data should be an array of objects",
          example: '[{ "trainsetId": "TS-01", ... }]'
        });
        return suggestions;
      }

      parsed.forEach((item, index) => {
        if (!item.trainsetId) {
          suggestions.push({
            type: "warning",
            message: `Item ${index + 1}: Missing required field "trainsetId"`,
            example: '"trainsetId": "TS-01"'
          });
        }

        if (item.jobCardOpen === undefined) {
          suggestions.push({
            type: "info",
            message: `Item ${index + 1}: Consider adding "jobCardOpen" field (boolean)`,
            example: '"jobCardOpen": false'
          });
        }

        if (!item.cleaningStatus) {
          suggestions.push({
            type: "info",
            message: `Item ${index + 1}: Consider adding "cleaningStatus" field`,
            example: '"cleaningStatus": "COMPLETED" | "PENDING" | "IN_PROGRESS"'
          });
        }

        // Suggest multiple trainsets if only one is present
        if (parsed.length === 1 && item.trainsetId) {
          suggestions.push({
            type: "improvement",
            message: "Consider submitting data for multiple trainsets at once for efficiency",
            example: '[{ "trainsetId": "TS-01", ... }, { "trainsetId": "TS-02", ... }]'
          });
        }
      });
    } catch (error) {
      suggestions.push({
        type: "warning",
        message: "Invalid JSON format. Please check your syntax.",
        example: 'Valid JSON format: [{ "key": "value" }]'
      });
    }

    if (suggestions.length === 0) {
      suggestions.push({
        type: "info",
        message: "Data format looks good! Ready to submit.",
      });
    }

    return suggestions;
  };

  // Generate ML suggestions for Fitness data
  const generateFitnessSuggestions = (data: string): MLSuggestion[] => {
    const suggestions: MLSuggestion[] = [];
    
    try {
      const parsed = JSON.parse(data);
      
      if (!Array.isArray(parsed)) {
        suggestions.push({
          type: "warning",
          message: "Data should be an array of objects",
          example: '[{ "trainsetId": "TS-01", "fitness": {...} }]'
        });
        return suggestions;
      }

      parsed.forEach((item, index) => {
        if (!item.trainsetId) {
          suggestions.push({
            type: "warning",
            message: `Item ${index + 1}: Missing required field "trainsetId"`,
            example: '"trainsetId": "TS-01"'
          });
        }

        if (!item.fitness) {
          suggestions.push({
            type: "warning",
            message: `Item ${index + 1}: Missing required "fitness" object`,
            example: '"fitness": { "rollingStock": {...}, "signalling": {...}, "telecom": {...} }'
          });
        } else {
          const requiredDepartments = ["rollingStock", "signalling", "telecom"];
          requiredDepartments.forEach(dept => {
            if (!item.fitness[dept]) {
              suggestions.push({
                type: "info",
                message: `Item ${index + 1}: Consider adding "${dept}" department status`,
                example: `"${dept}": { "status": "PASS" | "WARN" | "FAIL", "details": "..." }`
              });
            } else if (!item.fitness[dept].status) {
              suggestions.push({
                type: "warning",
                message: `Item ${index + 1}: "${dept}" missing "status" field`,
                example: `"status": "PASS" | "WARN" | "FAIL"`
              });
            }
          });
        }

        // Suggest adding more detail
        if (item.fitness && Object.keys(item.fitness).length > 0) {
          const hasDetails = Object.values(item.fitness).some((dept: any) => dept?.details);
          if (!hasDetails) {
            suggestions.push({
              type: "improvement",
              message: `Item ${index + 1}: Add "details" field for better tracking`,
              example: '"details": "All systems operational"'
            });
          }
        }
      });
    } catch (error) {
      suggestions.push({
        type: "warning",
        message: "Invalid JSON format. Please check your syntax.",
        example: 'Valid JSON format: [{ "key": "value" }]'
      });
    }

    if (suggestions.length === 0) {
      suggestions.push({
        type: "info",
        message: "Data format looks good! Ready to submit.",
      });
    }

    return suggestions;
  };

  const handleMaximoSubmit = async () => {
    // First click - show suggestions
    if (!maximoConfirmed) {
      const suggestions = generateMaximoSuggestions(maximoData);
      setMaximoSuggestions(suggestions);
      setShowMaximoSuggestions(true);
      return;
    }

    // Second click - actually submit
    setIsLoading(true);
    try {
      const updates = JSON.parse(maximoData);
      const result = await httpClient.post<any>("/ingestion/maximo", { updates });
      showToast(`Maximo data submitted successfully (updated: ${result?.updated ?? 0})`, "success");
      await refreshAppData();
      setMaximoConfirmed(false);
      setShowMaximoSuggestions(false);
    } catch (error: any) {
      showToast(`Error: ${error.message}`, "error");
      setMaximoConfirmed(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFitnessSubmit = async () => {
    // First click - show suggestions
    if (!fitnessConfirmed) {
      const suggestions = generateFitnessSuggestions(fitnessData);
      setFitnessSuggestions(suggestions);
      setShowFitnessSuggestions(true);
      return;
    }

    // Second click - actually submit
    setIsLoading(true);
    try {
      const updates = JSON.parse(fitnessData);
      const result = await httpClient.post<any>("/ingestion/fitness", { updates });
      showToast(`Fitness data submitted successfully (updated: ${result?.updated ?? 0})`, "success");
      await refreshAppData();
      setFitnessConfirmed(false);
      setShowFitnessSuggestions(false);
    } catch (error: any) {
      showToast(`Error: ${error.message}`, "error");
      setFitnessConfirmed(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Apply suggestions to Maximo data
  const applyMaximoSuggestions = () => {
    try {
      const parsed = JSON.parse(maximoData);
      if (!Array.isArray(parsed)) {
        showToast("Cannot apply suggestions: Data must be an array", "error");
        return;
      }

      // Apply fixes based on suggestions
      const fixed = parsed.map((item: any) => {
        const fixedItem = { ...item };
        
        // Ensure trainsetId exists (use default if missing)
        if (!fixedItem.trainsetId) {
          fixedItem.trainsetId = "TS-01";
        }

        // Add jobCardOpen if missing
        if (fixedItem.jobCardOpen === undefined) {
          fixedItem.jobCardOpen = false;
        }

        // Add cleaningStatus if missing
        if (!fixedItem.cleaningStatus) {
          fixedItem.cleaningStatus = "PENDING";
        }

        return fixedItem;
      });

      // Format with proper indentation
      const formatted = JSON.stringify(fixed, null, 2);
      setMaximoData(formatted);
      setShowMaximoSuggestions(false);
      showToast("Suggestions applied successfully!", "success");
    } catch (error: any) {
      showToast(`Error applying suggestions: ${error.message}`, "error");
    }
  };

  // Apply suggestions to Fitness data
  const applyFitnessSuggestions = () => {
    try {
      const parsed = JSON.parse(fitnessData);
      if (!Array.isArray(parsed)) {
        showToast("Cannot apply suggestions: Data must be an array", "error");
        return;
      }

      // Apply fixes based on suggestions
      const fixed = parsed.map((item: any) => {
        const fixedItem = { ...item };
        
        // Ensure trainsetId exists
        if (!fixedItem.trainsetId) {
          fixedItem.trainsetId = "TS-01";
        }

        // Ensure fitness object exists
        if (!fixedItem.fitness) {
          fixedItem.fitness = {};
        }

        // Add missing departments with default values
        const requiredDepartments = ["rollingStock", "signalling", "telecom"];
        requiredDepartments.forEach(dept => {
          if (!fixedItem.fitness[dept]) {
            fixedItem.fitness[dept] = {
              status: "PASS",
              details: "OK"
            };
          } else {
            // Ensure status exists
            if (!fixedItem.fitness[dept].status) {
              fixedItem.fitness[dept].status = "PASS";
            }
            // Add details if missing
            if (!fixedItem.fitness[dept].details) {
              fixedItem.fitness[dept].details = "OK";
            }
          }
        });

        return fixedItem;
      });

      // Format with proper indentation
      const formatted = JSON.stringify(fixed, null, 2);
      setFitnessData(formatted);
      setShowFitnessSuggestions(false);
      showToast("Suggestions applied successfully!", "success");
    } catch (error: any) {
      showToast(`Error applying suggestions: ${error.message}`, "error");
    }
  };

  const handleMaximoConfirm = async () => {
    setMaximoConfirmed(true);
    setShowMaximoSuggestions(false);
    // Actually submit after confirmation
    setIsLoading(true);
    try {
      const updates = JSON.parse(maximoData);
      const result = await httpClient.post<any>("/ingestion/maximo", { updates });
      showToast(`Maximo data submitted successfully (updated: ${result?.updated ?? 0})`, "success");
      await refreshAppData();
      setMaximoConfirmed(false);
    } catch (error: any) {
      showToast(`Error: ${error.message}`, "error");
      setMaximoConfirmed(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFitnessConfirm = async () => {
    setFitnessConfirmed(true);
    setShowFitnessSuggestions(false);
    // Actually submit after confirmation
    setIsLoading(true);
    try {
      const updates = JSON.parse(fitnessData);
      const result = await httpClient.post<any>("/ingestion/fitness", { updates });
      showToast(`Fitness data submitted successfully (updated: ${result?.updated ?? 0})`, "success");
      await refreshAppData();
      setFitnessConfirmed(false);
    } catch (error: any) {
      showToast(`Error: ${error.message}`, "error");
      setFitnessConfirmed(false);
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
              <Button 
                onClick={handleMaximoSubmit} 
                disabled={isLoading} 
                className="w-full"
              >
                {isLoading ? "Submitting..." : maximoConfirmed ? "Confirm & Submit Maximo Data" : "Get Suggestions & Submit Maximo Data"}
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
              <Button 
                onClick={handleFitnessSubmit} 
                disabled={isLoading} 
                className="w-full"
              >
                {isLoading ? "Submitting..." : fitnessConfirmed ? "Confirm & Submit Fitness Data" : "Get Suggestions & Submit Fitness Data"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Maximo Suggestions Dialog */}
      <Dialog open={showMaximoSuggestions} onOpenChange={setShowMaximoSuggestions}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-500" />
              ML Suggestions for Maximo Data
            </DialogTitle>
            <DialogDescription>
              Review these suggestions to improve your data quality before submitting
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-4">
            {maximoSuggestions.map((suggestion, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  suggestion.type === "warning"
                    ? "bg-yellow-500/10 border-yellow-500/30"
                    : suggestion.type === "improvement"
                    ? "bg-blue-500/10 border-blue-500/30"
                    : "bg-slate-500/10 border-slate-500/30"
                }`}
              >
                <div className="flex items-start gap-3">
                  {suggestion.type === "warning" ? (
                    <XCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  ) : suggestion.type === "improvement" ? (
                    <Lightbulb className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground mb-1">
                      {suggestion.message}
                    </p>
                    {suggestion.example && (
                      <code className="text-xs bg-background/50 px-2 py-1 rounded block mt-2 font-mono text-muted-foreground">
                        {suggestion.example}
                      </code>
                    )}
                  </div>
                  <Badge
                    variant={
                      suggestion.type === "warning"
                        ? "destructive"
                        : suggestion.type === "improvement"
                        ? "default"
                        : "secondary"
                    }
                    className="flex-shrink-0"
                  >
                    {suggestion.type}
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="flex gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => {
                setShowMaximoSuggestions(false);
                setMaximoConfirmed(false);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={applyMaximoSuggestions}
              className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border-blue-500/30"
            >
              Apply Suggestions
            </Button>
            <Button onClick={handleMaximoConfirm} className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700">
              Submit Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fitness Suggestions Dialog */}
      <Dialog open={showFitnessSuggestions} onOpenChange={setShowFitnessSuggestions}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-500" />
              ML Suggestions for Fitness Data
            </DialogTitle>
            <DialogDescription>
              Review these suggestions to improve your data quality before submitting
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-4">
            {fitnessSuggestions.map((suggestion, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  suggestion.type === "warning"
                    ? "bg-yellow-500/10 border-yellow-500/30"
                    : suggestion.type === "improvement"
                    ? "bg-blue-500/10 border-blue-500/30"
                    : "bg-slate-500/10 border-slate-500/30"
                }`}
              >
                <div className="flex items-start gap-3">
                  {suggestion.type === "warning" ? (
                    <XCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  ) : suggestion.type === "improvement" ? (
                    <Lightbulb className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground mb-1">
                      {suggestion.message}
                    </p>
                    {suggestion.example && (
                      <code className="text-xs bg-background/50 px-2 py-1 rounded block mt-2 font-mono text-muted-foreground">
                        {suggestion.example}
                      </code>
                    )}
                  </div>
                  <Badge
                    variant={
                      suggestion.type === "warning"
                        ? "destructive"
                        : suggestion.type === "improvement"
                        ? "default"
                        : "secondary"
                    }
                    className="flex-shrink-0"
                  >
                    {suggestion.type}
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="flex gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => {
                setShowFitnessSuggestions(false);
                setFitnessConfirmed(false);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={applyFitnessSuggestions}
              className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border-blue-500/30"
            >
              Apply Suggestions
            </Button>
            <Button onClick={handleFitnessConfirm} className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700">
              Submit Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IngestPage;
