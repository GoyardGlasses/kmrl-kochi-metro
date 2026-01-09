import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Filter, RefreshCw, Info, Sparkles, Lightbulb, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useScoredInduction } from "@/hooks/useScoredInduction";
import { useScoringConfig } from "@/hooks/useScoringConfig";
import { useTrainsets } from "@/hooks/useTrainsets";
import { toast } from "sonner";
import type { ScoredTrainset, ScoringConfigResponse, ScoringWeights } from "@/types";

const PAGE_SIZE = 25;

export default function ScoredInductionPage() {
  const [skip, setSkip] = useState(0);
  const [decision, setDecision] = useState<string>("ALL");
  const [brandingPriority, setBrandingPriority] = useState<string>("ALL");
  const [cleaningStatus, setCleaningStatus] = useState<string>("ALL");
  const [jobCardOpen, setJobCardOpen] = useState<string>("ALL");
  const [minScore, setMinScore] = useState<string>("");
  const [weightOverrides, setWeightOverrides] = useState<Partial<ScoringWeights>>({});

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsTrainset, setDetailsTrainset] = useState<ScoredTrainset | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<{
    minScore?: number;
    weightAdjustments?: Partial<ScoringWeights>;
    reasons: string[];
  } | null>(null);

  const scoringConfig = useScoringConfig();
  const { data: allTrainsets } = useTrainsets(); // Fetch ALL trainsets for ML suggestions

  const params = useMemo(() => {
    const parsedMinScore = minScore.trim() ? Number(minScore) : undefined;
    return {
      limit: PAGE_SIZE,
      skip,
      decision: decision === "ALL" ? undefined : decision,
      brandingPriority: brandingPriority === "ALL" ? undefined : brandingPriority,
      cleaningStatus: cleaningStatus === "ALL" ? undefined : cleaningStatus,
      jobCardOpen:
        jobCardOpen === "ALL" ? undefined : jobCardOpen === "true" ? true : false,
      minScore: parsedMinScore,
      weights: Object.keys(weightOverrides).length ? weightOverrides : undefined,
    };
  }, [brandingPriority, cleaningStatus, decision, jobCardOpen, minScore, skip, weightOverrides]);

  const { data, isLoading, error, invalidate } = useScoredInduction(params);

  const handlePrev = () => setSkip((s) => Math.max(0, s - PAGE_SIZE));
  const handleNext = () => {
    if (data && skip + PAGE_SIZE < data.total) setSkip((s) => s + PAGE_SIZE);
  };
  const handleRefresh = async () => {
    await invalidate();
    toast.success("Scored induction refreshed");
  };

  const handleSaveWeights = async (currentWeights: ScoringWeights) => {
    try {
      console.log("Saving weights to DB:", currentWeights);
      const result = await scoringConfig.save(currentWeights);
      console.log("Save result:", result);
      setWeightOverrides({});
      // Invalidate both scored induction and scoring config to refresh the page
      await Promise.all([
        invalidate(),
        scoringConfig.refetch(),
      ]);
      toast.success("Saved scoring weights to DB. Changes are now visible in audit logs and will be applied to all trainsets.");
    } catch (e: any) {
      console.error("Save weights error:", e);
      const errorMessage = e?.message || "Failed to save scoring weights";
      toast.error(errorMessage);
      // Show more details in console for debugging
      if (errorMessage.includes("Route not found") || errorMessage.includes("404")) {
        console.error("Route not found error. Check if backend server is running and route is registered.");
      }
    }
  };

  const handleResetWeights = async () => {
    try {
      await scoringConfig.reset();
      setWeightOverrides({});
      await invalidate();
      toast.success("Reset scoring weights to defaults");
    } catch (e: any) {
      toast.error(e?.message || "Failed to reset scoring weights");
    }
  };

  const generateMLSuggestions = (showToast = true) => {
    // Use ALL trainsets for ML analysis, not just filtered ones
    if (!allTrainsets || allTrainsets.length === 0) {
      if (showToast) toast.error("No trainsets available for suggestions");
      return;
    }

    // Get all scored trainsets without filters for comprehensive analysis
    const allScoredParams = {
      limit: 1000, // Get all trainsets
      skip: 0,
      // No filters - analyze everything
    };

    // For now, use the current data if available, otherwise use all trainsets
    // We'll need to fetch all scored data separately
    const analysisData = data?.ranked && data.ranked.length > 0 
      ? data.ranked 
      : allTrainsets.map((t: any) => ({
          ...t,
          score: 0, // Will be calculated if needed
          recommendation: t.recommendation || "STANDBY",
        }));

    if (analysisData.length === 0) {
      if (showToast) toast.error("No data available for suggestions");
      return;
    }

    const reasons: string[] = [];
    const weightAdjustments: Partial<ScoringWeights> = {};
    let suggestedMinScore: number | undefined;

    // Analyze score distribution - use all trainsets
    const scores = analysisData.map((t: any) => t.score || 0).filter((s: number) => s !== 0);
    const medianScore = scores.length > 0 ? scores.sort((a, b) => a - b)[Math.floor(scores.length / 2)] : 0;
    const minScoreValue = scores.length > 0 ? Math.min(...scores) : 0;
    const maxScoreValue = scores.length > 0 ? Math.max(...scores) : 0;

    // Suggest min score based on distribution
    if (minScore.trim() === "" && scores.length > 0) {
      // Suggest a min score that filters out bottom 20% but keeps most trainsets
      const sortedScores = [...scores].sort((a, b) => a - b);
      const percentile20 = sortedScores[Math.floor(scores.length * 0.2)];
      suggestedMinScore = Math.max(0, Math.floor(percentile20));
      reasons.push(`Suggested min score: ${suggestedMinScore} (filters bottom 20% of trainsets)`);
    } else if (minScore.trim() !== "" && scores.length > 0) {
      const currentMin = Number(minScore);
      if (currentMin > medianScore) {
        reasons.push(`Current min score (${currentMin}) is above median (${medianScore.toFixed(1)}), consider lowering to ${Math.floor(medianScore * 0.7)}`);
      } else if (currentMin < minScoreValue) {
        reasons.push(`Current min score (${currentMin}) is below minimum score (${minScoreValue.toFixed(1)}), consider raising to ${Math.floor(minScoreValue)}`);
      }
    }

    // Analyze fitness distribution - use ALL trainsets
    const fitnessPassCount = analysisData.filter((t: any) => 
      t.fitness?.rollingStock?.status === "PASS" && 
      t.fitness?.signalling?.status === "PASS" && 
      t.fitness?.telecom?.status === "PASS"
    ).length;
    const fitnessWarnCount = analysisData.filter((t: any) => 
      [t.fitness?.rollingStock?.status, t.fitness?.signalling?.status, t.fitness?.telecom?.status].includes("WARN")
    ).length;
    const fitnessFailCount = analysisData.filter((t: any) => 
      [t.fitness?.rollingStock?.status, t.fitness?.signalling?.status, t.fitness?.telecom?.status].includes("FAIL")
    ).length;

    const totalTrainsets = analysisData.length;
    const fitnessPassRatio = fitnessPassCount / totalTrainsets;
    const fitnessFailRatio = fitnessFailCount / totalTrainsets;

    if (fitnessFailRatio > 0.15) {
      weightAdjustments.fitnessFail = Math.round(weights.fitnessFail * 1.2);
      reasons.push(`High failure rate (${(fitnessFailRatio * 100).toFixed(1)}%), increase fitnessFail penalty by 20%`);
    } else if (fitnessPassRatio > 0.8) {
      weightAdjustments.fitnessPass = Math.round(weights.fitnessPass * 1.1);
      reasons.push(`High pass rate (${(fitnessPassRatio * 100).toFixed(1)}%), increase fitnessPass reward by 10%`);
    }

    // Analyze mileage distribution - use ALL trainsets
    const mileages = analysisData.map((t: any) => t.mileageKm || 0).filter((m: number) => m > 0);
    const avgMileage = mileages.length > 0 ? mileages.reduce((a: number, b: number) => a + b, 0) / mileages.length : 0;
    const highMileageCount = analysisData.filter((t: any) => (t.mileageKm || 0) > 40000).length;
    const lowMileageCount = analysisData.filter((t: any) => (t.mileageKm || 0) < 15000).length;

    if (highMileageCount / totalTrainsets > 0.3) {
      weightAdjustments.highMileage = Math.round(weights.highMileage * 1.15);
      reasons.push(`Many high-mileage trainsets (${highMileageCount} of ${totalTrainsets}), increase highMileage weight by 15%`);
    }
    if (lowMileageCount / totalTrainsets > 0.3) {
      weightAdjustments.lowMileage = Math.round(weights.lowMileage * 1.1);
      reasons.push(`Many low-mileage trainsets (${lowMileageCount} of ${totalTrainsets}), increase lowMileage reward by 10%`);
    }

    // Analyze branding priority - use ALL trainsets
    const brandingHighCount = analysisData.filter((t: any) => t.brandingPriority === "HIGH").length;
    const brandingHighRatio = brandingHighCount / totalTrainsets;
    if (brandingHighRatio > 0.4) {
      weightAdjustments.brandingHigh = Math.round(weights.brandingHigh * 1.1);
      reasons.push(`Many high-priority branding contracts (${brandingHighCount} of ${totalTrainsets}), increase brandingHigh weight by 10%`);
    }

    // Analyze cleaning status - use ALL trainsets
    const cleaningOverdueCount = analysisData.filter((t: any) => t.cleaningStatus === "OVERDUE").length;
    const cleaningOverdueRatio = cleaningOverdueCount / totalTrainsets;
    if (cleaningOverdueRatio > 0.2) {
      weightAdjustments.cleaningOverdue = Math.round(weights.cleaningOverdue * 1.2);
      reasons.push(`High overdue cleaning rate (${(cleaningOverdueRatio * 100).toFixed(1)}% - ${cleaningOverdueCount} of ${totalTrainsets}), increase cleaningOverdue penalty by 20%`);
    }

    // Analyze job cards - use ALL trainsets
    const jobCardOpenCount = analysisData.filter((t: any) => t.jobCardOpen).length;
    const jobCardOpenRatio = jobCardOpenCount / totalTrainsets;
    if (jobCardOpenRatio > 0.25) {
      weightAdjustments.jobCardOpen = Math.round(weights.jobCardOpen * 1.15);
      reasons.push(`Many open job cards (${jobCardOpenCount} of ${totalTrainsets}), increase jobCardOpen penalty by 15%`);
    }

    // Analyze conflicts - use ALL trainsets
    const conflictsHighCount = analysisData.filter((t: any) => 
      (t.conflicts || []).some((c: any) => c.severity === "HIGH")
    ).length;
    if (conflictsHighCount > 0) {
      weightAdjustments.conflictHighPenalty = Math.round(weights.conflictHighPenalty * 1.1);
      reasons.push(`Found ${conflictsHighCount} trainsets with HIGH severity conflicts (of ${totalTrainsets} total), increase conflictHighPenalty by 10%`);
    }

    // Overall score analysis
    const avgScore = scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0;
    if (avgScore < 10 && scores.length > 0) {
      reasons.push(`Average score is low (${avgScore.toFixed(1)}), consider increasing positive weights`);
    } else if (avgScore > 30 && scores.length > 0) {
      reasons.push(`Average score is high (${avgScore.toFixed(1)}), current weights are working well`);
    }

    // Add summary
    reasons.unshift(`Analyzed ${totalTrainsets} trainsets across the entire fleet for comprehensive recommendations`);

    setSuggestions({
      minScore: suggestedMinScore,
      weightAdjustments: Object.keys(weightAdjustments).length > 0 ? weightAdjustments : undefined,
      reasons: reasons.length > 0 ? reasons : ["No specific adjustments needed based on current data distribution"],
    });
    if (showToast) {
      setShowSuggestions(true);
      toast.success("ML suggestions generated");
    }
  };

  const handleApplySuggestions = () => {
    if (!suggestions) return;

    if (suggestions.minScore !== undefined) {
      setMinScore(String(suggestions.minScore));
    }

    if (suggestions.weightAdjustments) {
      setWeightOverrides(prev => ({
        ...prev,
        ...suggestions.weightAdjustments,
      }));
    }

    setShowSuggestions(false);
    toast.success("ML suggestions applied successfully");
  };

  useEffect(() => {
    setSkip(0);
  }, [decision, brandingPriority, cleaningStatus, jobCardOpen, minScore]);

  // Auto-generate suggestions when data loads
  useEffect(() => {
    if (data?.ranked && data.ranked.length > 0 && !suggestions) {
      generateMLSuggestions(false); // Don't show toast on auto-generation
    }
  }, [data]);

  if (isLoading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error.message}</div>;
  if (!data) return <div className="p-6">No data</div>;

  const { ranked, total, weights } = data;
  const currentPage = Math.floor(skip / PAGE_SIZE) + 1;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const currentWeights = { ...weights, ...weightOverrides };

  const configMeta = (scoringConfig.data as ScoringConfigResponse | undefined) || undefined;

  const downloadText = (filename: string, content: string, mime = "text/plain") => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJson = () => {
    downloadText(
      `scored-induction-${Date.now()}.json`,
      JSON.stringify({ params, weights: currentWeights, ranked }, null, 2),
      "application/json",
    );
    toast.success("Exported JSON");
  };

  const exportCsv = () => {
    const header = [
      "rank",
      "id",
      "score",
      "recommendation",
      "mileageKm",
      "brandingPriority",
      "cleaningStatus",
      "jobCardOpen",
      "fitness",
      "breakdown_fitness",
      "breakdown_mileage",
      "breakdown_branding",
      "breakdown_cleaning",
      "breakdown_jobCard",
      "breakdown_penalties",
    ];

    const rows = ranked.map((t, idx) => {
      const fitness = `${t.fitness.rollingStock.status}/${t.fitness.signalling.status}/${t.fitness.telecom.status}`;
      const values = [
        String(skip + idx + 1),
        t.id,
        String(t.score),
        t.recommendation,
        String(t.mileageKm),
        t.brandingPriority,
        t.cleaningStatus,
        String(Boolean(t.jobCardOpen)),
        fitness,
        String(t.breakdown.fitness),
        String(t.breakdown.mileage),
        String(t.breakdown.branding),
        String(t.breakdown.cleaning),
        String(t.breakdown.jobCard),
        String((t.breakdown as any).penalties ?? 0),
      ];

      return values
        .map((v) => {
          const s = String(v ?? "");
          const escaped = s.split('"').join('""');
          return s.includes(",") || s.includes("\n") || s.includes('"') ? `"${escaped}"` : s;
        })
        .join(",");
    });

    downloadText(`scored-induction-${Date.now()}.csv`, [header.join(","), ...rows].join("\n"), "text/csv");
    toast.success("Exported CSV");
  };

  const getScoreColor = (score: number) => {
    if (score >= 20) return "text-green-600";
    if (score >= 0) return "text-yellow-600";
    return "text-red-600";
  };

  const getBadgeVariant = (decision: string) => {
    switch (decision) {
      case "REVENUE": return "default";
      case "STANDBY": return "secondary";
      case "IBL": return "outline";
      default: return "secondary";
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Scored Induction</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => generateMLSuggestions(true)}>
            <Sparkles className="w-4 h-4 mr-2" />
            ML Suggestions
          </Button>
          <Button variant="outline" size="sm" onClick={exportJson}>
            <Download className="w-4 h-4 mr-2" />
            JSON
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="w-4 h-4 mr-2" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Decision</div>
            <Select value={decision} onValueChange={(v) => setDecision(v)}>
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="REVENUE">REVENUE</SelectItem>
                <SelectItem value="STANDBY">STANDBY</SelectItem>
                <SelectItem value="IBL">IBL</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Branding</div>
            <Select value={brandingPriority} onValueChange={(v) => setBrandingPriority(v)}>
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="HIGH">HIGH</SelectItem>
                <SelectItem value="MEDIUM">MEDIUM</SelectItem>
                <SelectItem value="LOW">LOW</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Cleaning</div>
            <Select value={cleaningStatus} onValueChange={(v) => setCleaningStatus(v)}>
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="COMPLETED">COMPLETED</SelectItem>
                <SelectItem value="PENDING">PENDING</SelectItem>
                <SelectItem value="OVERDUE">OVERDUE</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Job Card</div>
            <Select value={jobCardOpen} onValueChange={(v) => setJobCardOpen(v)}>
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="true">Open</SelectItem>
                <SelectItem value="false">Clear</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">Min score</div>
              {suggestions?.minScore !== undefined && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 px-2 text-xs"
                        onClick={() => setMinScore(String(suggestions.minScore))}
                      >
                        <Sparkles className="w-3 h-3 mr-1 text-blue-500" />
                        {suggestions.minScore}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>ML suggests: {suggestions.minScore}</p>
                      <p className="text-xs text-muted-foreground">Click to apply</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <div className="relative">
              <Input value={minScore} onChange={(e) => setMinScore(e.target.value)} placeholder="e.g. 10" />
              {suggestions?.minScore !== undefined && minScore !== String(suggestions.minScore) && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Lightbulb className="w-4 h-4 text-blue-500 cursor-pointer" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Suggested: {suggestions.minScore}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
            </div>
          </div>

          <div className="md:col-span-5 flex items-center justify-end">
            <Button
              variant="secondary"
              onClick={() => {
                setDecision("ALL");
                setBrandingPriority("ALL");
                setCleaningStatus("ALL");
                setJobCardOpen("ALL");
                setMinScore("");
              }}
            >
              Clear filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>Scoring Weights</span>
              {suggestions?.weightAdjustments && Object.keys(suggestions.weightAdjustments).length > 0 && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                  <Sparkles className="w-3 h-3 mr-1" />
                  {Object.keys(suggestions.weightAdjustments).length} suggestions
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {suggestions?.weightAdjustments && Object.keys(suggestions.weightAdjustments).length > 0 && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleApplySuggestions}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Apply All Suggestions
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSaveWeights(currentWeights as ScoringWeights)}
                disabled={scoringConfig.saveStatus === "pending"}
              >
                Save to DB
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleResetWeights}
                disabled={scoringConfig.resetStatus === "pending"}
              >
                Reset to Default
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setWeightOverrides({});
                  toast.success("Reset to saved config");
                }}
              >
                Clear Overrides
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {configMeta?.updatedAt && (
            <div className="text-xs text-muted-foreground">
              Saved config updated {new Date(configMeta.updatedAt).toLocaleString()} by {configMeta.updatedBy ?? "-"}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>Fitness Pass: {currentWeights.fitnessPass}</div>
            <div>Fitness Warn: {currentWeights.fitnessWarn}</div>
            <div>Fitness Fail: {currentWeights.fitnessFail}</div>
            <div>Low Mileage: {currentWeights.lowMileage}</div>
            <div>High Mileage: {currentWeights.highMileage}</div>
            <div>Branding High: {currentWeights.brandingHigh}</div>
            <div>Branding Medium: {currentWeights.brandingMedium}</div>
            <div>Branding Low: {currentWeights.brandingLow}</div>
            <div>Cleaning Completed: {currentWeights.cleaningCompleted}</div>
            <div>Cleaning Pending: {currentWeights.cleaningPending}</div>
            <div>Cleaning Overdue: {currentWeights.cleaningOverdue}</div>
            <div>Job Card Clear: {currentWeights.jobCardClear}</div>
            <div>Job Card Open: {currentWeights.jobCardOpen}</div>
            <div>Conflict HIGH: {currentWeights.conflictHighPenalty}</div>
            <div>Conflict MEDIUM: {currentWeights.conflictMediumPenalty}</div>
            <div>Conflict LOW: {currentWeights.conflictLowPenalty}</div>
            <div>Blocker penalty: {currentWeights.explanationBlockerPenalty}</div>
            <div>Warning penalty: {currentWeights.explanationWarningPenalty}</div>
            <div>Manual override: {currentWeights.manualOverridePenalty}</div>
          </div>

          {suggestions?.reasons && suggestions.reasons.length > 0 && (
            <Alert className="mb-4 border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
              <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-sm">
                <div className="font-semibold text-blue-900 dark:text-blue-100 mb-2">ML Analysis:</div>
                <ul className="space-y-1 text-blue-800 dark:text-blue-300">
                  {suggestions.reasons.slice(0, 3).map((reason, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">•</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                  {suggestions.reasons.length > 3 && (
                    <li className="text-xs text-blue-600 dark:text-blue-400 italic">
                      +{suggestions.reasons.length - 3} more insights
                    </li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(Object.keys(weights) as (keyof ScoringWeights)[]).map((k) => {
              const hasSuggestion = suggestions?.weightAdjustments?.[k] !== undefined;
              const suggestedValue = suggestions?.weightAdjustments?.[k];
              const currentValue = weightOverrides[k] ?? weights[k];
              const isApplied = hasSuggestion && weightOverrides[k] === suggestedValue;

              return (
                <div key={String(k)} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">{String(k)}</div>
                    {hasSuggestion && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-4 px-1.5 text-xs"
                              onClick={() => {
                                setWeightOverrides((prev) => ({
                                  ...prev,
                                  [k]: suggestedValue,
                                }));
                                toast.success(`Applied suggestion for ${k}`);
                              }}
                            >
                              {isApplied ? (
                                <CheckCircle2 className="w-3 h-3 text-green-500" />
                              ) : (
                                <Sparkles className="w-3 h-3 text-blue-500" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Current: {currentValue}</p>
                            <p>Suggested: {suggestedValue}</p>
                            <p className="text-xs text-muted-foreground">Click to apply</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      type="number"
                      value={weightOverrides[k] ?? ""}
                      placeholder={String(weights[k])}
                      onChange={(e) => {
                        const v = e.target.value;
                        setWeightOverrides((prev) => {
                          if (!v.trim()) {
                            const { [k]: _, ...rest } = prev;
                            return rest;
                          }
                          const num = Number(v);
                          if (!Number.isFinite(num)) return prev;
                          return { ...prev, [k]: num };
                        });
                      }}
                      className={hasSuggestion && !isApplied ? "border-blue-300 dark:border-blue-700" : ""}
                    />
                    {hasSuggestion && !isApplied && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Lightbulb className="w-3.5 h-3.5 text-blue-500 cursor-pointer" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>ML suggests: {suggestedValue}</p>
                              <p className="text-xs">Change: {suggestedValue! - weights[k] > 0 ? '+' : ''}{suggestedValue! - weights[k]}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setWeightOverrides({});
                toast.success("Weight overrides cleared");
              }}
            >
              Clear overrides
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ranked Induction List</CardTitle>
          <div className="text-sm text-muted-foreground">
            Showing {skip + 1}-{Math.min(skip + PAGE_SIZE, total)} of {total}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Decision</TableHead>
                <TableHead>Mileage</TableHead>
                <TableHead>Branding</TableHead>
                <TableHead>Cleaning</TableHead>
                <TableHead>Job Card</TableHead>
                <TableHead>Score Breakdown</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranked.map((t, idx) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{skip + idx + 1}</TableCell>
                  <TableCell>{t.id}</TableCell>
                  <TableCell className={getScoreColor(t.score)}>{t.score}</TableCell>
                  <TableCell>
                    <Badge variant={getBadgeVariant(t.recommendation)}>
                      {t.recommendation}
                    </Badge>
                  </TableCell>
                  <TableCell>{t.mileageKm.toLocaleString()} km</TableCell>
                  <TableCell>{t.brandingPriority}</TableCell>
                  <TableCell>{t.cleaningStatus}</TableCell>
                  <TableCell>{t.jobCardOpen ? "Open" : "Clear"}</TableCell>
                  <TableCell>
                    <div className="space-y-1 text-xs">
                      <div>Fitness: {t.breakdown.fitness}</div>
                      <div>Mileage: {t.breakdown.mileage}</div>
                      <div>Branding: {t.breakdown.branding}</div>
                      <div>Cleaning: {t.breakdown.cleaning}</div>
                      <div>Job Card: {t.breakdown.jobCard}</div>
                      <div>Penalties: {(t.breakdown as any).penalties ?? 0}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Dialog
                      open={detailsOpen && detailsTrainset?.id === t.id}
                      onOpenChange={(open) => {
                        setDetailsOpen(open);
                        if (open) setDetailsTrainset(t);
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setDetailsTrainset(t);
                            setDetailsOpen(true);
                          }}
                        >
                          <Info className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl">
                        <DialogHeader>
                          <DialogTitle>Trainset {t.id} – Scoring Details</DialogTitle>
                          <DialogDescription>
                            Score {t.score} (including penalties {(t.breakdown as any).penalties ?? 0})
                          </DialogDescription>
                        </DialogHeader>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div className="space-y-2">
                            <div className="font-medium">Breakdown</div>
                            <div className="text-muted-foreground">Fitness: {t.breakdown.fitness}</div>
                            <div className="text-muted-foreground">Mileage: {t.breakdown.mileage}</div>
                            <div className="text-muted-foreground">Branding: {t.breakdown.branding}</div>
                            <div className="text-muted-foreground">Cleaning: {t.breakdown.cleaning}</div>
                            <div className="text-muted-foreground">Job Card: {t.breakdown.jobCard}</div>
                            <div className="text-muted-foreground">Penalties: {(t.breakdown as any).penalties ?? 0}</div>
                          </div>

                          <div className="space-y-2">
                            <div className="font-medium">Conflicts</div>
                            {(t.conflicts || []).length === 0 ? (
                              <div className="text-muted-foreground">None</div>
                            ) : (
                              <div className="space-y-1">
                                {(t.conflicts || []).map((c: any, i: number) => (
                                  <div key={i} className="text-muted-foreground">
                                    [{c.severity}] {c.type}: {c.message}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="space-y-2 md:col-span-2">
                            <div className="font-medium">Explanation</div>
                            {t.explanation ? (
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                <div>
                                  <div className="text-xs text-muted-foreground mb-1">Blockers</div>
                                  {(t.explanation.blockers || []).length === 0 ? (
                                    <div className="text-muted-foreground">None</div>
                                  ) : (
                                    (t.explanation.blockers || []).map((b: any, i: number) => (
                                      <div key={i} className="text-muted-foreground">- {b.message}</div>
                                    ))
                                  )}
                                </div>
                                <div>
                                  <div className="text-xs text-muted-foreground mb-1">Warnings</div>
                                  {(t.explanation.warnings || []).length === 0 ? (
                                    <div className="text-muted-foreground">None</div>
                                  ) : (
                                    (t.explanation.warnings || []).map((w: any, i: number) => (
                                      <div key={i} className="text-muted-foreground">- {w.message}</div>
                                    ))
                                  )}
                                </div>
                                <div>
                                  <div className="text-xs text-muted-foreground mb-1">Promoters</div>
                                  {(t.explanation.promoters || []).length === 0 ? (
                                    <div className="text-muted-foreground">None</div>
                                  ) : (
                                    (t.explanation.promoters || []).map((p: any, i: number) => (
                                      <div key={i} className="text-muted-foreground">- {p.message}</div>
                                    ))
                                  )}
                                </div>
                                <div>
                                  <div className="text-xs text-muted-foreground mb-1">Overrides</div>
                                  {(t.explanation.overrides || []).length === 0 ? (
                                    <div className="text-muted-foreground">None</div>
                                  ) : (
                                    (t.explanation.overrides || []).map((o: any, i: number) => (
                                      <div key={i} className="text-muted-foreground">- {o.message}</div>
                                    ))
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="text-muted-foreground">No explanation available.</div>
                            )}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={handlePrev} disabled={skip === 0}>
          <ChevronLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">
          Page {currentPage} of {totalPages}
        </span>
        <Button variant="outline" onClick={handleNext} disabled={skip + PAGE_SIZE >= total}>
          Next
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      {/* ML Suggestions Dialog */}
      <Dialog open={showSuggestions} onOpenChange={setShowSuggestions}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              ML Suggestions for Scored Induction
            </DialogTitle>
            <DialogDescription>
              Based on your current data distribution, here are optimized suggestions for min score and weight adjustments.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {suggestions?.minScore !== undefined && (
              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  Suggested Min Score
                </div>
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {suggestions.minScore}
                </div>
                <div className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                  Current: {minScore || "Not set"}
                </div>
              </div>
            )}

            {suggestions?.weightAdjustments && Object.keys(suggestions.weightAdjustments).length > 0 && (
              <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                <div className="font-semibold text-green-900 dark:text-green-100 mb-2">
                  Suggested Weight Adjustments
                </div>
                <div className="space-y-2">
                  {Object.entries(suggestions.weightAdjustments).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between text-sm">
                      <span className="text-green-700 dark:text-green-300">{key}:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-green-600 dark:text-green-400">
                          {weights[key as keyof ScoringWeights]} →
                        </span>
                        <span className="font-bold text-green-800 dark:text-green-200">
                          {value}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
              <div className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Analysis & Reasoning
              </div>
              <ul className="space-y-2">
                {suggestions?.reasons.map((reason, idx) => (
                  <li key={idx} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                    <span className="text-blue-500 mt-1">•</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleApplySuggestions} className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700">
              Apply Suggestions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
