import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Route, Calendar, TrendingUp, AlertCircle, CheckCircle, ArrowLeft, Home, Brain, TrendingUp as TrendingUpIcon, Cpu } from "lucide-react";
import { httpClient } from "@/services/httpClient";

interface ScheduleResult {
  schedule: Array<{
    trainsetId: string;
    startTime: string;
    endTime: string;
    revenue: number;
    conflicts: string[];
  }>;
  summary: {
    totalRevenue: number;
    utilization: number;
    conflictsResolved: number;
    unscheduledTrainsets: string[];
  };
}

interface RouteResult {
  path: string[];
  totalDistance: number;
  totalTime: number;
  conflicts: string[];
  alternatives: Array<{
    path: string[];
    totalDistance: number;
    totalTime: number;
    reason: string;
  }>;
}

interface PredictionResult {
  trainsetId: string;
  predictions: {
    fitness: Array<{
      date: string;
      predictedScore: number;
      confidence: number;
      riskLevel: string;
    }>;
    mileage: Array<{
      date: string;
      predictedMileage: number;
      dailyAverage: number;
      remainingDays: number;
    }>;
    cleaning: Array<{
      date: string;
      predictedCleaningNeed: number;
      urgency: string;
    }>;
  };
  recommendations: Array<{
    type: string;
    priority: string;
    recommendedDate: string;
    estimatedCost: number;
    reasoning: string;
  }>;
}

const DSADemoPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("scheduling");
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const [results, setResults] = useState<{ [key: string]: any }>({});
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [error, setError] = useState<string | null>(null);

  // Scheduling state
  const [horizonHours, setHorizonHours] = useState("24");
  const [schedulingObjective, setSchedulingObjective] = useState("revenue");
  const [scheduleResult, setScheduleResult] = useState<ScheduleResult | null>(null);

  // Routing state
  const [fromStation, setFromStation] = useState("ALUVA");
  const [toStation, setToStation] = useState("TERMS");
  const [routeTrainsetId, setRouteTrainsetId] = useState("TS-01");
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);

  // Prediction state
  const [predictionHorizon, setPredictionHorizon] = useState("30");
  const [predictionMetrics, setPredictionMetrics] = useState(["fitness", "mileage", "cleaning"]);
  const [predictionTrainsetId, setPredictionTrainsetId] = useState("TS-01");
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);

  const stations = [
    "ALUVA", "PULI", "COMP", "AMB", "MUTT", "KALOOR", "COCH", "PATHA", "EDAP",
    "CHANG", "PONE", "ELAM", "SOUTH", "COLLE", "KALAM", "CUSAT", "PATHA2", "IDAP",
    "MUPP", "KADU", "ELAM2", "VYTILA", "THAMP", "PETTA", "MGR", "MAH", "BROA",
    "MARINE", "ERNA", "TOWN", "FORT", "VALLA", "PETTA2", "TERMS"
  ];

  const runScheduling = async (algorithm: "greedy" | "dp") => {
    setLoading({ ...loading, [`schedule-${algorithm}`]: true });
    setErrors({ ...errors, [`schedule-${algorithm}`]: "" });
    setError(null);
    try {
      const response = await httpClient.post<ScheduleResult>(`/dsa/schedule/${algorithm}`, {
        horizonHours: parseInt(horizonHours),
        objective: schedulingObjective
      });
      setResults({ ...results, [`schedule-${algorithm}`]: response });
      setScheduleResult(response);
    } catch (err: any) {
      const errorMsg = err.message || "Scheduling failed";
      setErrors({ ...errors, [`schedule-${algorithm}`]: errorMsg });
      setError(errorMsg);
    } finally {
      setLoading({ ...loading, [`schedule-${algorithm}`]: false });
    }
  };

  const runRouting = async (algorithm: "dijkstra" | "astar") => {
    setLoading({ ...loading, [`route-${algorithm}`]: true });
    setError(null);
    try {
      const response = await httpClient.post<RouteResult>(`/dsa/route/${algorithm}`, {
        from: fromStation,
        to: toStation,
        trainsetId: routeTrainsetId,
        avoidConflicts: true
      });
      setRouteResult(response);
    } catch (err: any) {
      setError(err.message || "Routing failed");
    } finally {
      setLoading({ ...loading, [`route-${algorithm}`]: false });
    }
  };

  const runPrediction = async (algorithm: "basic" | "advanced") => {
    setLoading({ ...loading, [`prediction-${algorithm}`]: true });
    setError(null);
    try {
      const endpoint = algorithm === "advanced" ? "/dsa/predict/advanced" : "/dsa/predict";
      const response = await httpClient.post<PredictionResult>(endpoint, {
        trainsetId: predictionTrainsetId,
        horizonDays: parseInt(predictionHorizon),
        metrics: predictionMetrics
      });
      setPredictionResult(response);
    } catch (err: any) {
      setError(err.message || "Prediction failed");
    } finally {
      setLoading({ ...loading, [`prediction-${algorithm}`]: false });
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "high": return "destructive";
      case "medium": return "secondary";
      case "low": return "default";
      default: return "default";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "destructive";
      case "medium": return "secondary";
      case "low": return "outline";
      default: return "outline";
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Control Center
          </Button>
          <div className="h-6 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Cpu className="w-6 h-6 text-orange-500" />
            <h1 className="text-2xl font-bold">DSA Algorithms</h1>
            <Badge variant="secondary" className="ml-2">Live</Badge>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate("/decision")}
            className="flex items-center gap-2"
          >
            <Brain className="w-4 h-4" />
            Decision Support
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate("/whatif")}
            className="flex items-center gap-2"
          >
            <TrendingUpIcon className="w-4 h-4" />
            What-If Analysis
          </Button>
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-gradient-to-r from-orange-500/20 to-blue-500/20 border border-orange-500/30 rounded-lg p-4 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50" />
              <span className="text-sm font-medium text-foreground">All Systems Operational</span>
            </div>
            <div className="text-sm text-foreground/90 font-medium">
              3 Algorithms Active • 127 Predictions Today • 94.2% Optimization Score
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs bg-secondary/80 text-secondary-foreground border-secondary-foreground/20">
              Last Updated: Just Now
            </Badge>
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="scheduling" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="scheduling">Trainset Scheduling</TabsTrigger>
          <TabsTrigger value="routing">Real-time Routing</TabsTrigger>
          <TabsTrigger value="prediction">Predictive Analytics</TabsTrigger>
        </TabsList>

        {/* Scheduling Tab */}
        <TabsContent value="scheduling" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Trainset Scheduling
              </CardTitle>
              <CardDescription>
                Optimize trainset allocation using greedy or dynamic programming algorithms
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="horizon">Horizon (hours)</Label>
                  <Input
                    id="horizon"
                    type="number"
                    value={horizonHours}
                    onChange={(e) => setHorizonHours(e.target.value)}
                    placeholder="24"
                  />
                </div>
                <div>
                  <Label htmlFor="objective">Objective</Label>
                  <Select value={schedulingObjective} onValueChange={setSchedulingObjective}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="revenue">Maximize Revenue</SelectItem>
                      <SelectItem value="utilization">Maximize Utilization</SelectItem>
                      <SelectItem value="conflicts">Minimize Conflicts</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => runScheduling("greedy")}
                  disabled={loading["schedule-greedy"]}
                  className="flex-1"
                >
                  {loading["schedule-greedy"] ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Greedy Algorithm
                </Button>
                <Button
                  onClick={() => runScheduling("dp")}
                  disabled={loading["schedule-dp"]}
                  variant="outline"
                  className="flex-1"
                >
                  {loading["schedule-dp"] ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Dynamic Programming
                </Button>
              </div>
            </CardContent>
          </Card>

          {scheduleResult && (
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Schedule Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Revenue</p>
                      <p className="text-2xl font-bold">${scheduleResult.summary.totalRevenue.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Utilization</p>
                      <p className="text-2xl font-bold">{scheduleResult.summary.utilization.toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Conflicts Resolved</p>
                      <p className="text-2xl font-bold">{scheduleResult.summary.conflictsResolved}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Unscheduled</p>
                      <p className="text-2xl font-bold">{scheduleResult.summary.unscheduledTrainsets.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Scheduled Trainsets</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {scheduleResult.schedule.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <p className="font-medium">{item.trainsetId}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(item.startTime).toLocaleString()} - {new Date(item.endTime).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">${item.revenue}</p>
                          {item.conflicts.length > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {item.conflicts.length} conflicts
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Routing Tab */}
        <TabsContent value="routing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Route className="w-5 h-5" />
                Real-time Routing
              </CardTitle>
              <CardDescription>
                Find optimal routes using Dijkstra's algorithm or A* pathfinding
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="from">From Station</Label>
                  <Select value={fromStation} onValueChange={setFromStation}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {stations.map((station) => (
                        <SelectItem key={station} value={station}>{station}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="to">To Station</Label>
                  <Select value={toStation} onValueChange={setToStation}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {stations.map((station) => (
                        <SelectItem key={station} value={station}>{station}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="routeTrainset">Trainset ID</Label>
                  <Input
                    id="routeTrainset"
                    value={routeTrainsetId}
                    onChange={(e) => setRouteTrainsetId(e.target.value)}
                    placeholder="TS-01"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => runRouting("dijkstra")}
                  disabled={loading["route-dijkstra"]}
                  className="flex-1"
                >
                  {loading["route-dijkstra"] ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Dijkstra Algorithm
                </Button>
                <Button
                  onClick={() => runRouting("astar")}
                  disabled={loading["route-astar"]}
                  variant="outline"
                  className="flex-1"
                >
                  {loading["route-astar"] ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  A* Algorithm
                </Button>
              </div>
            </CardContent>
          </Card>

          {routeResult && (
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Route Result</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Distance</p>
                      <p className="text-xl font-bold">{routeResult.totalDistance.toFixed(1)} km</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Time</p>
                      <p className="text-xl font-bold">{routeResult.totalTime} min</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Conflicts</p>
                      <p className="text-xl font-bold">{routeResult.conflicts.length}</p>
                    </div>
                  </div>
                  <div>
                    <p className="font-medium mb-2">Path:</p>
                    <div className="flex flex-wrap gap-1">
                      {routeResult.path.map((station, idx) => (
                        <div key={idx} className="flex items-center">
                          <Badge variant="outline">{station}</Badge>
                          {idx < routeResult.path.length - 1 && (
                            <span className="mx-1 text-muted-foreground">→</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {routeResult.alternatives.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Alternative Routes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {routeResult.alternatives.map((alt, idx) => (
                        <div key={idx} className="p-3 border rounded">
                          <div className="flex justify-between items-center mb-1">
                            <p className="font-medium">{alt.reason}</p>
                            <p className="text-sm text-muted-foreground">
                              {alt.totalDistance.toFixed(1)} km, {alt.totalTime} min
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {alt.path.map((station, sIdx) => (
                              <div key={sIdx} className="flex items-center">
                                <Badge variant="outline" className="text-xs">{station}</Badge>
                                {sIdx < alt.path.length - 1 && (
                                  <span className="mx-1 text-muted-foreground">→</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* Prediction Tab */}
        <TabsContent value="prediction" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Predictive Analytics
              </CardTitle>
              <CardDescription>
                Forecast maintenance needs using time-series analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="predTrainset">Trainset ID</Label>
                  <Input
                    id="predTrainset"
                    value={predictionTrainsetId}
                    onChange={(e) => setPredictionTrainsetId(e.target.value)}
                    placeholder="TS-01"
                  />
                </div>
                <div>
                  <Label htmlFor="predHorizon">Horizon (days)</Label>
                  <Input
                    id="predHorizon"
                    type="number"
                    value={predictionHorizon}
                    onChange={(e) => setPredictionHorizon(e.target.value)}
                    placeholder="30"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => runPrediction("basic")}
                  disabled={loading["prediction-basic"]}
                  className="flex-1"
                >
                  {loading["prediction-basic"] ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Basic Forecasting
                </Button>
                <Button
                  onClick={() => runPrediction("advanced")}
                  disabled={loading["prediction-advanced"]}
                  variant="outline"
                  className="flex-1"
                >
                  {loading["prediction-advanced"] ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  ARIMA Forecasting
                </Button>
              </div>
            </CardContent>
          </Card>

          {predictionResult && (
            <div className="grid gap-4">
              {predictionResult.predictions.fitness.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Fitness Predictions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {predictionResult.predictions.fitness.slice(0, 10).map((pred, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 border rounded">
                          <div>
                            <p className="font-medium">{new Date(pred.date).toLocaleDateString()}</p>
                            <p className="text-sm text-muted-foreground">Score: {pred.predictedScore.toFixed(1)}</p>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant={getRiskColor(pred.risk)}>{pred.risk}</Badge>
                            <Badge variant="outline">{(pred.confidence * 100).toFixed(0)}% confidence</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {predictionResult.predictions.mileage.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Mileage Predictions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {predictionResult.predictions.mileage.slice(0, 10).map((pred, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 border rounded">
                          <div>
                            <p className="font-medium">{new Date(pred.date).toLocaleDateString()}</p>
                            <p className="text-sm text-muted-foreground">Daily avg: {pred.dailyAverage.toFixed(1)} km</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{pred.predictedMileage.toFixed(0)} km</p>
                            <p className="text-sm text-muted-foreground">{pred.remainingDays} days to service</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {predictionResult.recommendations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Maintenance Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {predictionResult.recommendations.map((rec, idx) => (
                        <div key={idx} className="p-3 border rounded">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              <p className="font-medium capitalize">{rec.type.replace('_', ' ')}</p>
                              <Badge variant={getPriorityColor(rec.priority)}>{rec.priority}</Badge>
                            </div>
                            <p className="font-medium">${rec.estimatedCost}</p>
                          </div>
                          <p className="text-sm text-muted-foreground">{rec.reasoning}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Recommended: {new Date(rec.recommendedDate).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DSADemoPage;
