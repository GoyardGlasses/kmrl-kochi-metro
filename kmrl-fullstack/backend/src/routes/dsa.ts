import { Router, Response } from "express";
import { SchedulingService } from "@/services/schedulingService";
import { RoutingService } from "@/services/routingService";
import { PredictiveService } from "@/services/predictiveService";

const router = Router();

// Initialize routing network on startup
RoutingService.initializeNetwork().catch(console.error);

/**
 * Trainset Scheduling Endpoints
 */
router.post("/schedule/greedy", async (req: any, res: Response) => {
  try {
    const result = await SchedulingService.greedySchedule(req.body);
    res.json(result);
  } catch (error: any) {
    console.error("Greedy scheduling error:", error);
    res.status(500).json({ error: "Scheduling failed", details: error.message });
  }
});

router.post("/schedule/dp", async (req: any, res: Response) => {
  try {
    const result = await SchedulingService.dpSchedule(req.body);
    res.json(result);
  } catch (error: any) {
    console.error("DP scheduling error:", error);
    res.status(500).json({ error: "DP scheduling failed", details: error.message });
  }
});

/**
 * Routing Endpoints
 */
router.post("/route/dijkstra", async (req: any, res: Response) => {
  try {
    const result = await RoutingService.findShortestPath(req.body);
    res.json(result);
  } catch (error: any) {
    console.error("Dijkstra routing error:", error);
    res.status(500).json({ error: "Routing failed", details: error.message });
  }
});

router.post("/route/astar", async (req: any, res: Response) => {
  try {
    const result = await RoutingService.findPathAStar(req.body);
    res.json(result);
  } catch (error: any) {
    console.error("A* routing error:", error);
    res.status(500).json({ error: "A* routing failed", details: error.message });
  }
});

/**
 * Predictive Maintenance Endpoints
 */
router.post("/predict", async (req: any, res: Response) => {
  try {
    const result = await PredictiveService.generatePredictions(req.body);
    res.json(result);
  } catch (error: any) {
    console.error("Prediction error:", error);
    res.status(500).json({ error: "Prediction failed", details: error.message });
  }
});

router.post("/predict/advanced", async (req: any, res: Response) => {
  try {
    const result = await PredictiveService.advancedForecasting(req.body);
    res.json(result);
  } catch (error: any) {
    console.error("Advanced prediction error:", error);
    res.status(500).json({ error: "Advanced prediction failed", details: error.message });
  }
});

/**
 * Health check for DSA services
 */
router.get("/health", (req: any, res: Response) => {
  res.json({
    status: "healthy",
    services: {
      scheduling: "active",
      routing: "active",
      predictive: "active"
    },
    timestamp: new Date().toISOString()
  });
});

export default router;
