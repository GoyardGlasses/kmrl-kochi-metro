import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Filter, RefreshCw, Info } from "lucide-react";
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
} from "@/components/ui/dialog";
import { useScoredInduction } from "@/hooks/useScoredInduction";
import { useScoringConfig } from "@/hooks/useScoringConfig";
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

  const scoringConfig = useScoringConfig();

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
      await scoringConfig.save(currentWeights);
      setWeightOverrides({});
      await invalidate();
      toast.success("Saved scoring weights to DB");
    } catch (e: any) {
      toast.error(e?.message || "Failed to save scoring weights");
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

  useEffect(() => {
    setSkip(0);
  }, [decision, brandingPriority, cleaningStatus, jobCardOpen, minScore]);

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
            <div className="text-xs text-muted-foreground">Min score</div>
            <Input value={minScore} onChange={(e) => setMinScore(e.target.value)} placeholder="e.g. 10" />
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
            <span>Scoring Weights</span>
            <div className="flex items-center gap-2">
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

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(Object.keys(weights) as (keyof ScoringWeights)[]).map((k) => (
              <div key={String(k)} className="space-y-1">
                <div className="text-xs text-muted-foreground">{String(k)}</div>
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
                />
              </div>
            ))}
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
    </div>
  );
}
