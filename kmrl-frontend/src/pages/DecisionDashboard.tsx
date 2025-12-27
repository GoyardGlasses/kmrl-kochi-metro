import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Brain,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Target,
  Zap,
  ArrowLeft,
  BarChart3,
  Play,
  Settings,
  Shield,
  Wrench,
  Calendar,
  MessageSquare,
  Database,
  Wifi,
  Activity
} from "lucide-react";
import {
  useKPIDashboard,
  useConflictAlerts,
  useServiceReadiness,
  useMlSuggestions,
  useRunOptimization,
  useResolveConflict
} from "@/hooks/useDecision";
import { useWebSocket } from "@/services/websocketService";
import { showToast } from "@/lib/toast";
import type { ConflictAlert, Decision } from "@/types";
import { useServices } from "@/context/ServicesProvider";
import { httpClient } from "@/services/httpClient";

type InductionDecision = "REVENUE" | "STANDBY" | "IBL";

type InductionItem = {
  trainsetId: string;
  decision: InductionDecision;
  score: number;
  reasons: string[];
  blockers: string[];
};

type InductionRunResponse = {
  runId: string;
  createdAt: string;
  rule: string;
  counts: { revenue: number; standby: number; ibl: number };
  revenue: InductionItem[];
  standby: InductionItem[];
  ibl: InductionItem[];
};

type OptimizationRunSummary = {
  runId: string;
  createdAt: string;
  count: number;
  avgConfidence: number;
};

type OptimizationRunDetail = {
  runId: string;
  createdAt: string;
  count: number;
  results: any[];
};

const DecisionDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  
  // Real-time state
  const [realtimeStatus, setRealtimeStatus] = useState<any>(null);
  const [whatsappMessage, setWhatsappMessage] = useState("");
  const [inductionRun, setInductionRun] = useState<InductionRunResponse | null>(null);
  const [isRunningInduction, setIsRunningInduction] = useState(false);
  const [revenueCount, setRevenueCount] = useState<number>(0);

  // Optimization history (grouped by run)
  const [optimizationRuns, setOptimizationRuns] = useState<OptimizationRunSummary[]>([]);
  const [selectedOptimizationRunId, setSelectedOptimizationRunId] = useState<string>("");
  const [selectedOptimizationRun, setSelectedOptimizationRun] = useState<OptimizationRunDetail | null>(null);
  const [isLoadingOptimizationRuns, setIsLoadingOptimizationRuns] = useState(false);
  const [isLoadingOptimizationRun, setIsLoadingOptimizationRun] = useState(false);
  const [manualFitness, setManualFitness] = useState({
    trainsetId: "",
    department: "ROLLING_STOCK",
    status: "PASS",
    details: ""
  });
  const [manualMileage, setManualMileage] = useState({
    trainsetId: "",
    currentMileage: 0
  });
  
  const { isConnected, subscribe } = useWebSocket();
  
  const { data: kpiData, isLoading: kpiLoading } = useKPIDashboard();
  const { data: conflicts, isLoading: conflictsLoading } = useConflictAlerts();
  const { data: readiness, isLoading: readinessLoading } = useServiceReadiness();
  const { data: mlData, isLoading: mlLoading } = useMlSuggestions({ limit: 6, onlyChanged: true });
  const { data: mlAllData } = useMlSuggestions({ limit: 200, onlyChanged: false });
  const runOptimization = useRunOptimization();
  const resolveConflict = useResolveConflict();

  const { trainsets } = useServices();

  const [resolveOpen, setResolveOpen] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState<ConflictAlert | null>(null);
  const [manualDecision, setManualDecision] = useState<Decision>("STANDBY");
  const [applySuggestion, setApplySuggestion] = useState(true);
  const [isSubmittingResolve, setIsSubmittingResolve] = useState(false);

  useEffect(() => {
    // Load realtime status
    loadRealtimeStatus();
    
    // Subscribe to WebSocket updates
    if (isConnected) {
      const unsubscribeFitness = subscribe('MANUAL_FITNESS_UPDATE', (data) => {
        console.log('Fitness update received:', data);
        showToast('Fitness certificate updated!', 'success');
      });

      const unsubscribeMileage = subscribe('MANUAL_MILEAGE_UPDATE', (data) => {
        console.log('Mileage update received:', data);
        showToast('Mileage updated!', 'success');
      });

      const unsubscribeMaximo = subscribe('MAXIMO_UPDATE', (data) => {
        console.log('Maximo update received:', data);
        showToast('Maximo data updated!', 'info');
      });

      const unsubscribeWhatsApp = subscribe('WHATSAPP_UPDATE', (data) => {
        console.log('WhatsApp update received:', data);
        showToast('WhatsApp message processed!', 'success');
      });

      return () => {
        unsubscribeFitness();
        unsubscribeMileage();
        unsubscribeMaximo();
        unsubscribeWhatsApp();
      };
    }
  }, [isConnected, subscribe]);

  useEffect(() => {
    if (activeTab !== "optimization") return;
    loadOptimizationRuns();
  }, [activeTab]);

  const loadOptimizationRuns = async () => {
    try {
      setIsLoadingOptimizationRuns(true);
      const data = await httpClient.get<{ runs: OptimizationRunSummary[] }>("/optimization/runs?limit=20");
      const runs = (data?.runs || []) as OptimizationRunSummary[];
      setOptimizationRuns(runs);
      if (!selectedOptimizationRunId && runs.length > 0) {
        selectOptimizationRun(runs[0].runId);
      }
    } catch (e: any) {
      console.error(e);
      showToast(e?.message || "Failed to load optimization runs", "error");
    } finally {
      setIsLoadingOptimizationRuns(false);
    }
  };

  const selectOptimizationRun = async (runId: string) => {
    try {
      setSelectedOptimizationRunId(runId);
      setIsLoadingOptimizationRun(true);
      const data = await httpClient.get<OptimizationRunDetail>(`/optimization/runs/${runId}`);
      setSelectedOptimizationRun(data);
    } catch (e: any) {
      console.error(e);
      showToast(e?.message || "Failed to load optimization run", "error");
    } finally {
      setIsLoadingOptimizationRun(false);
    }
  };

  const runTonightPlan = async () => {
    try {
      setIsRunningInduction(true);
      const path = revenueCount > 0 ? `/induction/run?revenueCount=${revenueCount}` : "/induction/run";
      const data = await httpClient.post<InductionRunResponse>(path, {});

      setInductionRun(data);
      showToast(`Induction run created: ${data.runId}`, "success");
    } catch (error: any) {
      console.error("Failed to run induction:", error);
      showToast(error?.message || "Failed to run induction", "error");
    } finally {
      setIsRunningInduction(false);
    }
  };

  const exportInductionJson = () => {
    if (!inductionRun) return;
    const blob = new Blob([JSON.stringify(inductionRun, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${inductionRun.runId}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const loadRealtimeStatus = async () => {
    try {
      const status = await httpClient.get<any>("/realtime/monitoring");
      setRealtimeStatus(status);
    } catch (error) {
      console.error('Failed to load realtime status:', error);
    }
  };

  const sendWhatsAppTest = async () => {
    try {
      const result = await httpClient.post<any>("/realtime/whatsapp/webhook", {
        message: whatsappMessage,
        from: '+1234567890',
        timestamp: new Date().toISOString(),
      });
      if (result.success) {
        setWhatsappMessage("");
        showToast('WhatsApp test sent successfully!', 'success');
      }
    } catch (error) {
      console.error('Failed to send WhatsApp test:', error);
      showToast('Failed to send WhatsApp test', 'error');
    }
  };

  const sendManualFitness = async () => {
    try {
      const result = await httpClient.post<any>("/realtime/manual/fitness", manualFitness);
      if (result.success) {
        setManualFitness({
          trainsetId: "",
          department: "ROLLING_STOCK",
          status: "PASS",
          details: ""
        });
        showToast('Fitness certificate updated!', 'success');
      }
    } catch (error) {
      console.error('Failed to send manual fitness:', error);
      showToast('Failed to update fitness', 'error');
    }
  };

  const sendManualMileage = async () => {
    try {
      const result = await httpClient.post<any>("/realtime/manual/mileage", {
        ...manualMileage,
        updatedBy: 'DASHBOARD_USER'
      });
      if (result.success) {
        setManualMileage({
          trainsetId: "",
          currentMileage: 0
        });
        showToast('Mileage updated!', 'success');
      }
    } catch (error) {
      console.error('Failed to send manual mileage:', error);
      showToast('Failed to update mileage', 'error');
    }
  };

  const handleRunOptimization = (target?: string) => {
    runOptimization.mutate(target, {
      onSuccess: (data: any) => {
        // The backend assigns same optimizationRunId to all returned results
        const runId = Array.isArray(data) && data.length > 0 ? data[0].optimizationRunId : "";
        loadOptimizationRuns();
        if (runId) {
          setActiveTab("optimization");
          selectOptimizationRun(runId);
        }
      },
    });
  };

  const openResolveDialog = (conflict: ConflictAlert) => {
    if (!conflict?._id) {
      showToast("Conflict alert is missing an id. Please refresh.", "error");
      return;
    }
    setSelectedConflict(conflict);

    const mlSuggestion = (mlAllData?.suggestions || []).find((s) => s.trainsetId === conflict.trainsetId);
    if (mlSuggestion) {
      setManualDecision(mlSuggestion.suggestedDecision as any);
      setApplySuggestion(true);
    } else {
      setManualDecision((conflict as any).currentDecision || "STANDBY");
      setApplySuggestion(false);
    }

    setResolveOpen(true);
  };

  const submitResolve = async () => {
    if (!selectedConflict?._id) return;
    try {
      setIsSubmittingResolve(true);

      const mlSuggestion = (mlAllData?.suggestions || []).find((s) => s.trainsetId === selectedConflict.trainsetId);
      const decisionToApply = applySuggestion && mlSuggestion ? (mlSuggestion.suggestedDecision as any) : manualDecision;

      // Manual fix: update the trainset decision (non-blocking of main system; just an override)
      await (trainsets as any).updateDecision(selectedConflict.trainsetId, {
        recommendation: decisionToApply,
        manualOverride: true,
      });

      // Resolve the alert (uses Mongo alertId)
      await resolveConflict.mutateAsync({ alertId: selectedConflict._id, action: "manual-resolve" });

      setResolveOpen(false);
      setSelectedConflict(null);
    } catch (e: any) {
      console.error(e);
      showToast(e?.message || "Failed to resolve conflict", "error");
    } finally {
      setIsSubmittingResolve(false);
    }
  };

  const highPriorityConflicts = conflicts?.filter(c => c.severity === 'HIGH') || [];
  const criticalReadinessIssues = readiness?.filter(r => r.overallScore < 70) || [];

  const totalTrainsets = readiness?.length || 0;
  const fitnessValidCount = readiness ? readiness.filter((r) => (r.factors?.fitness ?? 0) >= 80).length : 0;
  const jobCardsClearCount = readiness ? readiness.filter((r) => (r.factors?.jobCards ?? 0) >= 80).length : 0;
  const brandingOnTrackCount = readiness ? readiness.filter((r) => (r.factors?.branding ?? 0) >= 80).length : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <Brain className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Decision Support Center</h1>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground">KMRL Fleet Optimization Platform</p>
                  <Badge variant="outline">Fleet Size: {totalTrainsets || "-"}</Badge>
                </div>
              </div>
            </div>
            <Button variant="outline" onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </header>

      {/* Real-time Status */}
      <div className="container mx-auto px-4 py-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Wifi className={`w-4 h-4 ${isConnected ? 'text-green-600' : 'text-red-600'}`} />
                <span className="font-medium text-sm">WebSocket</span>
              </div>
              <p className={`text-sm ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </p>
              {realtimeStatus && (
                <p className="text-xs text-muted-foreground">
                  {realtimeStatus.websocket.connectedClients} clients
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Database className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-sm">MongoDB</span>
              </div>
              <p className="text-sm text-green-600">Connected</p>
              <p className="text-xs text-muted-foreground">Live data</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-purple-600" />
                <span className="font-medium text-sm">WhatsApp</span>
              </div>
              <p className="text-sm text-green-600">Active</p>
              {realtimeStatus && (
                <p className="text-xs text-muted-foreground">
                  {realtimeStatus.whatsapp.messagesReceived} received
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-orange-600" />
                <span className="font-medium text-sm">Maximo</span>
              </div>
              <p className="text-sm text-green-600">Connected</p>
              {realtimeStatus && (
                <p className="text-xs text-muted-foreground">
                  {realtimeStatus.maximo.totalImported} imports
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Run Optimization</p>
                    <p className="text-xs text-muted-foreground">Generate induction plan</p>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => handleRunOptimization()}
                    disabled={runOptimization.isPending}
                  >
                    <Play className="w-3 h-3 mr-1" />
                    Run
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Target: Punctuality</p>
                    <p className="text-xs text-muted-foreground">99.5% KPI focus</p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleRunOptimization("PUNCTUALITY")}
                  >
                    <Target className="w-3 h-3 mr-1" />
                    Optimize
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-yellow-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Target: Cost</p>
                    <p className="text-xs text-muted-foreground">Minimize maintenance</p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleRunOptimization("COST")}
                  >
                    <TrendingUp className="w-3 h-3 mr-1" />
                    Optimize
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">What-If Analysis</p>
                    <p className="text-xs text-muted-foreground">Scenario testing</p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => navigate("/whatif")}
                  >
                    <Settings className="w-3 h-3 mr-1" />
                    Scenarios
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* KPI Dashboard */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                KPI Dashboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              {kpiLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-20 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {kpiData?.punctuality?.toFixed(1) || 0}%
                    </div>
                    <p className="text-xs text-muted-foreground">Punctuality</p>
                    <Progress value={kpiData?.punctuality || 0} className="mt-1" />
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {kpiData?.fleetAvailability?.toFixed(1) || 0}%
                    </div>
                    <p className="text-xs text-muted-foreground">Fleet Availability</p>
                    <Progress value={kpiData?.fleetAvailability || 0} className="mt-1" />
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      ₹{(kpiData?.maintenanceCost || 0).toFixed(0)}L
                    </div>
                    <p className="text-xs text-muted-foreground">Maintenance Cost</p>
                    <Progress value={100 - (kpiData?.maintenanceCost || 0)} className="mt-1" />
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {kpiData?.brandingCompliance?.toFixed(1) || 0}%
                    </div>
                    <p className="text-xs text-muted-foreground">Branding SLA</p>
                    <Progress value={kpiData?.brandingCompliance || 0} className="mt-1" />
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {(kpiData?.energyConsumption || 0).toFixed(0)}%
                    </div>
                    <p className="text-xs text-muted-foreground">Energy Usage</p>
                    <Progress value={100 - (kpiData?.energyConsumption || 0)} className="mt-1" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="conflicts">Conflicts</TabsTrigger>
              <TabsTrigger value="readiness">Service Readiness</TabsTrigger>
              <TabsTrigger value="optimization">Optimization</TabsTrigger>
              <TabsTrigger value="realtime">Real-time</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">System Health</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">High Priority Conflicts</span>
                      <Badge variant={highPriorityConflicts.length > 0 ? "destructive" : "default"}>
                        {highPriorityConflicts.length}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Critical Readiness Issues</span>
                      <Badge variant={criticalReadinessIssues.length > 0 ? "destructive" : "default"}>
                        {criticalReadinessIssues.length}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Optimization Status</span>
                      <Badge variant={runOptimization.isPending ? "default" : "secondary"}>
                        {runOptimization.isPending ? "Running..." : "Ready"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Quick Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-blue-500" />
                      <span className="text-sm">Fitness Certificates Valid</span>
                      <Badge variant="outline">{totalTrainsets ? `${fitnessValidCount}/${totalTrainsets}` : "-"}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-green-500" />
                      <span className="text-sm">Job Cards Clear</span>
                      <Badge variant="outline">{totalTrainsets ? `${jobCardsClearCount}/${totalTrainsets}` : "-"}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-purple-500" />
                      <span className="text-sm">Branding Hours On Track</span>
                      <Badge variant="outline">{totalTrainsets ? `${brandingOnTrackCount}/${totalTrainsets}` : "-"}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-lg">ML Suggestions (Advisory)</CardTitle>
                  <CardDescription>
                    Suggestions only. These do not change trainset decisions.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {mlLoading ? (
                    <div className="space-y-2">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                      ))}
                    </div>
                  ) : (mlData?.suggestions?.length || 0) === 0 ? (
                    <div className="text-sm text-muted-foreground">No suggestions right now.</div>
                  ) : (
                    <div className="space-y-3">
                      {mlData?.suggestions?.map((s) => (
                        <div key={s.trainsetId} className="flex items-start justify-between gap-4 border rounded-lg p-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm">{s.trainsetId}</span>
                              <Badge variant="outline">{s.currentDecision} → {s.suggestedDecision}</Badge>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {s.reasons?.slice(0, 3).join(" • ")}
                            </div>
                          </div>
                          <div className="min-w-[140px] text-right">
                            <div className="text-xs text-muted-foreground">Confidence</div>
                            <div className="text-sm font-semibold">{s.confidence}%</div>
                            <Progress value={s.confidence} className="mt-1" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Conflicts Tab */}
            <TabsContent value="conflicts" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Active Conflict Alerts</CardTitle>
                  <CardDescription>
                    System-detected issues requiring attention
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {conflictsLoading ? (
                    <div className="space-y-2">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                      ))}
                    </div>
                  ) : conflicts?.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                      <p className="text-muted-foreground">No active conflicts detected</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {conflicts?.map((conflict) => (
                        <Alert key={conflict._id || conflict.trainsetId} className="border-l-4 border-l-orange-500">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{conflict.message}</p>
                                <p className="text-sm text-muted-foreground">{conflict.impact}</p>
                              </div>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => openResolveDialog(conflict)}
                                disabled={resolveConflict.isPending}
                              >
                                Resolve
                              </Button>
                            </div>
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Dialog open={resolveOpen} onOpenChange={setResolveOpen}>
                <DialogContent className="max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>Resolve Conflict (Manual)</DialogTitle>
                    <DialogDescription>
                      Apply a manual fix and resolve this alert. ML suggestions are advisory only.
                    </DialogDescription>
                  </DialogHeader>

                  {selectedConflict && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="border rounded-lg p-3">
                          <div className="text-xs text-muted-foreground">Conflict</div>
                          <div className="font-medium">{selectedConflict.message}</div>
                          <div className="text-sm text-muted-foreground">{selectedConflict.impact}</div>
                          <div className="mt-2 text-xs font-mono">Trainset: {selectedConflict.trainsetId}</div>
                        </div>

                        <div className="border rounded-lg p-3 space-y-2">
                          <div className="text-sm font-medium">Manual fix</div>
                          <div className="text-xs text-muted-foreground">Set decision override (optional)</div>
                          <Select value={manualDecision} onValueChange={(v) => { setManualDecision(v as any); setApplySuggestion(false); }}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select decision" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="REVENUE">REVENUE</SelectItem>
                              <SelectItem value="STANDBY">STANDBY</SelectItem>
                              <SelectItem value="IBL">IBL</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="border rounded-lg p-3">
                          <div className="text-sm font-medium">ML suggests</div>
                          {(() => {
                            const s = (mlAllData?.suggestions || []).find((x) => x.trainsetId === selectedConflict.trainsetId);
                            if (!s) return <div className="text-sm text-muted-foreground">No suggestion available.</div>;
                            return (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <Badge variant="outline">{s.currentDecision} → {s.suggestedDecision}</Badge>
                                  <span className="text-sm font-semibold">{s.confidence}%</span>
                                </div>
                                <Progress value={s.confidence} />
                                <div className="text-xs text-muted-foreground">{s.reasons?.slice(0, 4).join(" • ")}</div>
                                <div className="flex items-center justify-between pt-2">
                                  <div className="text-xs text-muted-foreground">Use ML suggestion</div>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => { setManualDecision(s.suggestedDecision as any); setApplySuggestion(true); }}
                                  >
                                    Apply
                                  </Button>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  )}

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setResolveOpen(false)} disabled={isSubmittingResolve}>
                      Cancel
                    </Button>
                    <Button onClick={submitResolve} disabled={isSubmittingResolve || !selectedConflict?._id}>
                      {isSubmittingResolve ? "Resolving..." : "Save & Resolve"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TabsContent>

            {/* Service Readiness Tab */}
            <TabsContent value="readiness" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Service Readiness Scores</CardTitle>
                  <CardDescription>
                    Overall readiness assessment for each trainset
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {readinessLoading ? (
                    <div className="space-y-2">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {readiness?.map((trainset) => (
                        <div key={trainset.trainsetId} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{trainset.trainsetId}</span>
                            <Badge variant={trainset.overallScore >= 80 ? "default" : trainset.overallScore >= 60 ? "secondary" : "destructive"}>
                              {trainset.overallScore}%
                            </Badge>
                          </div>
                          <Progress value={trainset.overallScore} />
                          <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                            <div>Fitness: {trainset.factors.fitness}%</div>
                            <div>Branding: {trainset.factors.branding}%</div>
                            <div>Mileage: {trainset.factors.mileage}%</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Optimization Tab */}
            <TabsContent value="optimization" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Optimization Engine</CardTitle>
                  <CardDescription>
                    Multi-objective optimization for fleet induction
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Button 
                      onClick={() => handleRunOptimization("PUNCTUALITY")}
                      disabled={runOptimization.isPending}
                      className="w-full"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Optimize Punctuality
                    </Button>
                    <Button 
                      onClick={() => handleRunOptimization("COST")}
                      disabled={runOptimization.isPending}
                      variant="outline"
                      className="w-full"
                    >
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Optimize Cost
                    </Button>
                    <Button 
                      onClick={() => handleRunOptimization("BRANDING")}
                      disabled={runOptimization.isPending}
                      variant="outline"
                      className="w-full"
                    >
                      <Target className="w-4 h-4 mr-2" />
                      Optimize Branding
                    </Button>
                  </div>
                  
                  {runOptimization.isPending && (
                    <Alert>
                      <Clock className="h-4 w-4" />
                      <AlertDescription>
                        Optimization in progress... This may take a few moments.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <Card className="lg:col-span-1">
                      <CardHeader>
                        <CardTitle className="text-base">Past Runs</CardTitle>
                        <CardDescription>Grouped by runId</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2 max-h-[420px] overflow-auto">
                        {isLoadingOptimizationRuns ? (
                          <div className="space-y-2">
                            {[...Array(6)].map((_, i) => (
                              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                            ))}
                          </div>
                        ) : optimizationRuns.length === 0 ? (
                          <div className="text-sm text-muted-foreground">
                            No optimization runs yet. Click an Optimize button above.
                          </div>
                        ) : (
                          optimizationRuns.map((r) => (
                            <button
                              key={r.runId}
                              type="button"
                              className={`w-full text-left border rounded-md p-3 hover:bg-muted transition ${
                                selectedOptimizationRunId === r.runId ? "bg-muted" : ""
                              }`}
                              onClick={() => selectOptimizationRun(r.runId)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="font-medium text-sm">{r.runId}</div>
                                <Badge variant="secondary">{r.avgConfidence}</Badge>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {new Date(r.createdAt).toLocaleString()} • {r.count} results
                              </div>
                            </button>
                          ))
                        )}
                      </CardContent>
                    </Card>

                    <Card className="lg:col-span-2">
                      <CardHeader>
                        <CardTitle className="text-base">Run Details</CardTitle>
                        <CardDescription>
                          {selectedOptimizationRun ? (
                            <span>
                              {selectedOptimizationRun.runId} • {new Date(selectedOptimizationRun.createdAt).toLocaleString()}
                            </span>
                          ) : (
                            <span>Select a run to view details</span>
                          )}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {isLoadingOptimizationRun ? (
                          <div className="space-y-2">
                            {[...Array(8)].map((_, i) => (
                              <div key={i} className="h-10 bg-muted animate-pulse rounded" />
                            ))}
                          </div>
                        ) : !selectedOptimizationRun ? (
                          <div className="text-sm text-muted-foreground">No run selected.</div>
                        ) : (
                          <div className="space-y-2 max-h-[420px] overflow-auto">
                            {selectedOptimizationRun.results.map((row: any) => (
                              <div key={row._id || `${row.optimizationRunId}-${row.trainsetId}`} className="border rounded-md p-3">
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                                  <div className="font-medium">{row.trainsetId}</div>
                                  <div className="flex items-center gap-2">
                                    <Badge
                                      variant={
                                        row.recommendation === "REVENUE"
                                          ? "default"
                                          : row.recommendation === "STANDBY"
                                          ? "secondary"
                                          : "destructive"
                                      }
                                    >
                                      {row.recommendation}
                                    </Badge>
                                    <Badge variant="outline">Conf {row.confidence}</Badge>
                                  </div>
                                </div>

                                <div className="text-xs text-muted-foreground mt-2">
                                  {Array.isArray(row.reasoning) && row.reasoning.length > 0
                                    ? row.reasoning.slice(0, 4).join(" | ")
                                    : "No reasoning provided"}
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-xs">
                                  <div className="border rounded p-2">
                                    <div className="text-muted-foreground">Punctuality</div>
                                    <div className="font-medium">{row.kpiImpact?.punctuality ?? "-"}</div>
                                  </div>
                                  <div className="border rounded p-2">
                                    <div className="text-muted-foreground">Cost</div>
                                    <div className="font-medium">{row.kpiImpact?.cost ?? "-"}</div>
                                  </div>
                                  <div className="border rounded p-2">
                                    <div className="text-muted-foreground">Branding</div>
                                    <div className="font-medium">{row.kpiImpact?.brandingCompliance ?? "-"}</div>
                                  </div>
                                  <div className="border rounded p-2">
                                    <div className="text-muted-foreground">Availability</div>
                                    <div className="font-medium">{row.kpiImpact?.fleetAvailability ?? "-"}</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Real-time Tab */}
            <TabsContent value="realtime" className="space-y-4">
              {/* Nightly Induction Run (MVP) */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Play className="w-5 h-5" />
                    Tonight’s Induction Plan (MVP)
                  </CardTitle>
                  <CardDescription>
                    Option B: REVENUE = all eligible, IBL = blocked, STANDBY optional
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                    <div className="text-sm text-muted-foreground">
                      {inductionRun ? (
                        <div>
                          <div>
                            Last run: <span className="font-medium text-foreground">{inductionRun.runId}</span>
                          </div>
                          <div>
                            Counts:
                            <span className="ml-2">REVENUE {inductionRun.counts.revenue}</span>
                            <span className="ml-2">STANDBY {inductionRun.counts.standby}</span>
                            <span className="ml-2">IBL {inductionRun.counts.ibl}</span>
                          </div>
                        </div>
                      ) : (
                        <div>No induction run created yet.</div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Revenue count</span>
                        <Input
                          type="number"
                          value={revenueCount}
                          onChange={(e) => setRevenueCount(parseInt(e.target.value) || 0)}
                          className="w-24 h-9"
                          min={0}
                        />
                      </div>
                      <Button onClick={runTonightPlan} disabled={isRunningInduction}>
                        <Play className="w-4 h-4 mr-2" />
                        {isRunningInduction ? "Running..." : "Run Tonight’s Plan"}
                      </Button>
                      <Button variant="outline" onClick={exportInductionJson} disabled={!inductionRun}>
                        Export JSON
                      </Button>
                    </div>
                  </div>

                  {inductionRun && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">REVENUE</CardTitle>
                          <CardDescription>Eligible (ranked by score)</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 max-h-[420px] overflow-auto">
                          {inductionRun.revenue.length === 0 ? (
                            <div className="text-sm text-muted-foreground">No eligible trainsets</div>
                          ) : (
                            inductionRun.revenue.map((r) => (
                              <div key={r.trainsetId} className="border rounded-md p-3">
                                <div className="flex items-center justify-between">
                                  <div className="font-medium">{r.trainsetId}</div>
                                  <Badge variant="secondary">Score {r.score}</Badge>
                                </div>
                                <div className="text-xs text-muted-foreground mt-2">
                                  {r.reasons?.length ? r.reasons.join(" | ") : "Eligible"}
                                </div>
                              </div>
                            ))
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">STANDBY</CardTitle>
                          <CardDescription>Optional hold-back (empty in MVP)</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 max-h-[420px] overflow-auto">
                          {inductionRun.standby.length === 0 ? (
                            <div className="text-sm text-muted-foreground">None</div>
                          ) : (
                            inductionRun.standby.map((r) => (
                              <div key={r.trainsetId} className="border rounded-md p-3">
                                <div className="flex items-center justify-between">
                                  <div className="font-medium">{r.trainsetId}</div>
                                  <Badge variant="secondary">Score {r.score}</Badge>
                                </div>
                                <div className="text-xs text-muted-foreground mt-2">
                                  {r.reasons?.length ? r.reasons.join(" | ") : "Standby"}
                                </div>
                              </div>
                            ))
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">IBL</CardTitle>
                          <CardDescription>Blocked by hard constraints</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 max-h-[420px] overflow-auto">
                          {inductionRun.ibl.length === 0 ? (
                            <div className="text-sm text-muted-foreground">None blocked</div>
                          ) : (
                            inductionRun.ibl.map((r) => (
                              <div key={r.trainsetId} className="border rounded-md p-3">
                                <div className="flex items-center justify-between">
                                  <div className="font-medium">{r.trainsetId}</div>
                                  <Badge variant="destructive">Blocked</Badge>
                                </div>
                                <div className="text-xs text-muted-foreground mt-2">
                                  {(r.blockers?.length ? r.blockers : r.reasons)?.join(" | ")}
                                </div>
                              </div>
                            ))
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* WhatsApp Test */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-green-600" />
                      WhatsApp Test
                    </CardTitle>
                    <CardDescription>
                      Test WhatsApp message parsing and real-time updates
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Test Message</label>
                      <Input
                        value={whatsappMessage}
                        onChange={(e) => setWhatsappMessage(e.target.value)}
                        placeholder="fitness ROLLING_STOCK TS-01 PASS All good"
                      />
                    </div>
                    <Button onClick={sendWhatsAppTest} className="w-full">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Send WhatsApp Test
                    </Button>
                  </CardContent>
                </Card>

                {/* Manual Fitness Input */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-blue-600" />
                      Manual Fitness
                    </CardTitle>
                    <CardDescription>
                      Update fitness certificates manually
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Trainset ID</label>
                      <Input
                        value={manualFitness.trainsetId}
                        onChange={(e) => setManualFitness({...manualFitness, trainsetId: e.target.value})}
                        placeholder="TS-01"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Department</label>
                      <Select value={manualFitness.department} onValueChange={(value) => setManualFitness({...manualFitness, department: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ROLLING_STOCK">Rolling Stock</SelectItem>
                          <SelectItem value="SIGNALLING">Signalling</SelectItem>
                          <SelectItem value="TELECOM">Telecom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Status</label>
                      <Select value={manualFitness.status} onValueChange={(value) => setManualFitness({...manualFitness, status: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PASS">Pass</SelectItem>
                          <SelectItem value="WARN">Warn</SelectItem>
                          <SelectItem value="FAIL">Fail</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={sendManualFitness} className="w-full">
                      <Shield className="w-4 h-4 mr-2" />
                      Update Fitness
                    </Button>
                  </CardContent>
                </Card>

                {/* Manual Mileage Input */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-purple-600" />
                      Manual Mileage
                    </CardTitle>
                    <CardDescription>
                      Update trainset mileage manually
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Trainset ID</label>
                      <Input
                        value={manualMileage.trainsetId}
                        onChange={(e) => setManualMileage({...manualMileage, trainsetId: e.target.value})}
                        placeholder="TS-01"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Current Mileage</label>
                      <Input
                        type="number"
                        value={manualMileage.currentMileage}
                        onChange={(e) => setManualMileage({...manualMileage, currentMileage: parseInt(e.target.value) || 0})}
                        placeholder="45000"
                      />
                    </div>
                    <Button onClick={sendManualMileage} className="w-full">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Update Mileage
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Real-time Monitoring */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-orange-600" />
                    Real-time Monitoring
                  </CardTitle>
                  <CardDescription>
                    System status and WebSocket connection monitoring
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <Wifi className={`w-8 h-8 mx-auto mb-2 ${isConnected ? 'text-green-600' : 'text-red-600'}`} />
                      <p className="font-medium">WebSocket</p>
                      <p className={`text-sm ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                        {isConnected ? 'Connected' : 'Disconnected'}
                      </p>
                      {realtimeStatus && (
                        <p className="text-xs text-muted-foreground">
                          Port: {realtimeStatus.websocket.port}
                        </p>
                      )}
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <Database className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                      <p className="font-medium">MongoDB</p>
                      <p className="text-sm text-green-600">Connected</p>
                      <p className="text-xs text-muted-foreground">Live Data</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                      <p className="font-medium">WhatsApp</p>
                      <p className="text-sm text-green-600">Active</p>
                      {realtimeStatus && (
                        <p className="text-xs text-muted-foreground">
                          {realtimeStatus.whatsapp.messagesReceived} received
                        </p>
                      )}
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <Activity className="w-8 h-8 mx-auto mb-2 text-orange-600" />
                      <p className="font-medium">Maximo</p>
                      <p className="text-sm text-green-600">Connected</p>
                      {realtimeStatus && (
                        <p className="text-xs text-muted-foreground">
                          {realtimeStatus.maximo.totalImported} imports
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default DecisionDashboard;
