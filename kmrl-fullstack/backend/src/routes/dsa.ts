import { Router, Response } from "express";
import { SchedulingService } from "@/services/schedulingService";
import { RoutingService } from "@/services/routingService";
import { PredictiveService } from "@/services/predictiveService";
import { DSASchedulingResult, DSARoutingResult, DSAPredictionResult } from "@/models/DSAResult";

const router = Router();

// Initialize routing network on startup
RoutingService.initializeNetwork().catch(console.error);

/**
 * Trainset Scheduling Endpoints
 */
router.post("/schedule/greedy", async (req: any, res: Response) => {
  try {
    const startTime = Date.now();
    const result = await SchedulingService.greedySchedule(req.body);
    const executionTime = Date.now() - startTime;

    // Save result to MongoDB
    const runId = `schedule-greedy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    try {
      await DSASchedulingResult.create({
        runId,
        algorithm: "GREEDY",
        input: req.body,
        result,
        metadata: {
          executionTime,
          trainsetCount: Array.isArray(req.body.trainsets) ? req.body.trainsets.length : undefined,
        },
      });
    } catch (saveError) {
      console.error("Failed to save scheduling result to MongoDB:", saveError);
      // Continue even if save fails
    }

    res.json(result);
  } catch (error: any) {
    console.error("Greedy scheduling error:", error);
    res.status(500).json({ error: "Scheduling failed", details: error.message });
  }
});

router.post("/schedule/dp", async (req: any, res: Response) => {
  try {
    const startTime = Date.now();
    const result = await SchedulingService.dpSchedule(req.body);
    const executionTime = Date.now() - startTime;

    // Save result to MongoDB
    const runId = `schedule-dp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    try {
      await DSASchedulingResult.create({
        runId,
        algorithm: "DP",
        input: req.body,
        result,
        metadata: {
          executionTime,
          trainsetCount: Array.isArray(req.body.trainsets) ? req.body.trainsets.length : undefined,
        },
      });
    } catch (saveError) {
      console.error("Failed to save scheduling result to MongoDB:", saveError);
      // Continue even if save fails
    }

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
    const startTime = Date.now();
    const result = await RoutingService.findShortestPath(req.body);
    const executionTime = Date.now() - startTime;

    // Save result to MongoDB
    const runId = `route-dijkstra-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    try {
      await DSARoutingResult.create({
        runId,
        algorithm: "DIJKSTRA",
        input: req.body,
        result,
        metadata: {
          executionTime,
        },
      });
    } catch (saveError) {
      console.error("Failed to save routing result to MongoDB:", saveError);
      // Continue even if save fails
    }

    res.json(result);
  } catch (error: any) {
    console.error("Dijkstra routing error:", error);
    res.status(500).json({ error: "Routing failed", details: error.message });
  }
});

router.post("/route/astar", async (req: any, res: Response) => {
  try {
    const startTime = Date.now();
    const result = await RoutingService.findPathAStar(req.body);
    const executionTime = Date.now() - startTime;

    // Save result to MongoDB
    const runId = `route-astar-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    try {
      await DSARoutingResult.create({
        runId,
        algorithm: "ASTAR",
        input: req.body,
        result,
        metadata: {
          executionTime,
        },
      });
    } catch (saveError) {
      console.error("Failed to save routing result to MongoDB:", saveError);
      // Continue even if save fails
    }

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
    const startTime = Date.now();
    const result = await PredictiveService.generatePredictions(req.body);
    const executionTime = Date.now() - startTime;

    // Save result to MongoDB
    const runId = `predict-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    try {
      await DSAPredictionResult.create({
        runId,
        predictionType: "STANDARD",
        input: req.body,
        result,
        metadata: {
          executionTime,
        },
      });
    } catch (saveError) {
      console.error("Failed to save prediction result to MongoDB:", saveError);
      // Continue even if save fails
    }

    res.json(result);
  } catch (error: any) {
    console.error("Prediction error:", error);
    res.status(500).json({ error: "Prediction failed", details: error.message });
  }
});

router.post("/predict/advanced", async (req: any, res: Response) => {
  try {
    const startTime = Date.now();
    const result = await PredictiveService.advancedForecasting(req.body);
    const executionTime = Date.now() - startTime;

    // Save result to MongoDB
    const runId = `predict-advanced-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    try {
      await DSAPredictionResult.create({
        runId,
        predictionType: "ADVANCED",
        input: req.body,
        result,
        metadata: {
          executionTime,
        },
      });
    } catch (saveError) {
      console.error("Failed to save prediction result to MongoDB:", saveError);
      // Continue even if save fails
    }

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
