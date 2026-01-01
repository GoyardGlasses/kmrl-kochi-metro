import { Trainset } from '@/models/Trainset';

interface Station {
  id: string;
  name: string;
  x: number;
  y: number;
  isDepot?: boolean;
}

interface Edge {
  from: string;
  to: string;
  distance: number;
  travelTime: number; // minutes
  isBlocked?: boolean;
  blockageReason?: string;
}

interface RouteRequest {
  from: string;
  to: string;
  trainsetId?: string;
  avoidConflicts?: boolean;
  maxDetour?: number; // max detour factor (1.5 = 50% detour allowed)
}

interface RouteResult {
  path: string[];
  totalDistance: number;
  totalTime: number;
  conflicts: string[];
  alternatives: AlternativeRoute[];
}

interface AlternativeRoute {
  path: string[];
  totalDistance: number;
  totalTime: number;
  reason: string;
}

export class RoutingService {
  private static stations: Map<string, Station> = new Map();
  private static graph: Map<string, Map<string, Edge>> = new Map();

  /**
   * Initialize routing network with Kochi Metro stations
   */
  static async initializeNetwork(): Promise<void> {
    // Kochi Metro stations (simplified network)
    const stationData: Station[] = [
      { id: 'ALUVA', name: 'Aluva', x: 0, y: 0, isDepot: true },
      { id: 'PULI', name: 'Pulinchodu', x: 3, y: 0 },
      { id: 'COMP', name: 'Companypady', x: 6, y: 0 },
      { id: 'AMB', name: 'Ambattukavu', x: 9, y: 0 },
      { id: 'MUTT', name: 'Muttom', x: 12, y: 0 },
      { id: 'KALOOR', name: 'Kalarikkandam', x: 15, y: 0 },
      { id: 'COCH', name: 'Cochin University', x: 18, y: 0 },
      { id: 'PATHA', name: 'Pathadipalam', x: 21, y: 0 },
      { id: 'EDAP', name: 'Edapally', x: 24, y: 0 },
      { id: 'CHANG', name: 'Changampuzha', x: 27, y: 0 },
      { id: 'PONE', name: 'Ponekkara', x: 30, y: 0 },
      { id: 'ELAM', name: 'Elamkulam', x: 33, y: 0 },
      { id: 'SOUTH', name: 'South Kalamassery', x: 36, y: 0 },
      { id: 'COLLE', name: 'College Jn', x: 39, y: 0 },
      { id: 'KALAM', name: 'Kalamassery', x: 42, y: 0 },
      { id: 'CUSAT', name: 'Cusat', x: 45, y: 0 },
      { id: 'PATHA2', name: 'Pathadiparambu', x: 48, y: 0 },
      { id: 'IDAP', name: 'Idappalli', x: 51, y: 0 },
      { id: 'MUPP', name: 'Muppadam', x: 54, y: 0 },
      { id: 'KADU', name: 'Kadavanthra', x: 57, y: 0 },
      { id: 'ELAM2', name: 'Elamkulam', x: 60, y: 0 },
      { id: 'VYTILA', name: 'Vytilla', x: 63, y: 0 },
      { id: 'THAMP', name: 'Thammanam', x: 66, y: 0 },
      { id: 'PETTA', name: 'Petta', x: 69, y: 0 },
      { id: 'MGR', name: 'M G Road', x: 72, y: 0 },
      { id: 'MAH', name: 'Maharajas', x: 75, y: 0 },
      { id: 'BROA', name: 'Broadway', x: 78, y: 0 },
      { id: 'MARINE', name: 'Marine Drive', x: 81, y: 0 },
      { id: 'ERNA', name: 'Ernakulam', x: 84, y: 0 },
      { id: 'TOWN', name: 'Town Hall', x: 87, y: 0 },
      { id: 'FORT', name: 'Fort Kochi', x: 90, y: 0 },
      { id: 'VALLA', name: 'Vallarpadam', x: 93, y: 0 },
      { id: 'PETTA2', name: 'Pettah', x: 96, y: 0 },
      { id: 'TERMS', name: 'Terminal', x: 99, y: 0, isDepot: true }
    ];

    // Initialize stations
    stationData.forEach(station => {
      this.stations.set(station.id, station);
    });

    // Build graph with edges (simplified linear route with some connections)
    this.buildGraph(stationData);

    // Update with real-time conflicts
    await this.updateWithConflicts();
  }

  /**
   * Find shortest path using Dijkstra's algorithm
   */
  static async findShortestPath(request: RouteRequest): Promise<RouteResult> {
    const { from, to, trainsetId, avoidConflicts = true, maxDetour = 1.5 } = request;

    if (!this.stations.has(from) || !this.stations.has(to)) {
      throw new Error('Invalid stations');
    }

    // Ensure network is initialized
    if (this.graph.size === 0) {
      await this.initializeNetwork();
    }

    // Dijkstra's algorithm
    const distances = new Map<string, number>();
    const previous = new Map<string, string | null>();
    const unvisited = new Set<string>();

    // Initialize
    for (const stationId of this.stations.keys()) {
      distances.set(stationId, Infinity);
      previous.set(stationId, null);
      unvisited.add(stationId);
    }
    distances.set(from, 0);

    while (unvisited.size > 0) {
      // Find unvisited node with minimum distance
      let current: string | undefined = undefined;
      let minDistance = Infinity;
      for (const stationId of unvisited) {
        const dist = distances.get(stationId) || Infinity;
        if (dist < minDistance) {
          minDistance = dist;
          current = stationId;
        }
      }

      if (current === undefined || minDistance === Infinity) break;
      unvisited.delete(current);

      // Update neighbors
      const neighbors = this.graph.get(current) || new Map();
      for (const [neighborId, edge] of neighbors) {
        if (!unvisited.has(neighborId)) continue;
        if (edge.isBlocked && avoidConflicts) continue;

        const alt = (distances.get(current) || 0) + edge.travelTime;
        if (alt < (distances.get(neighborId) || Infinity)) {
          distances.set(neighborId, alt);
          previous.set(neighborId, current);
        }
      }
    }

    // Reconstruct path
    const path = this.reconstructPath(previous, from, to);
    if (path.length === 0) {
      // Fallback: create direct path
      return this.createFallbackPath(from, to);
    }

    const totalDistance = this.calculatePathDistance(path);
    const totalTime = distances.get(to) || 0;

    // Find conflicts along path
    const conflicts = trainsetId ? await this.getConflictsAlongPath(path, trainsetId) : [];

    // Generate alternatives
    const alternatives = await this.generateAlternatives(request, path, totalDistance, totalTime);

    return {
      path,
      totalDistance,
      totalTime,
      conflicts,
      alternatives
    };
  }

  private static createFallbackPath(from: string, to: string): RouteResult {
    return {
      path: [from, to],
      totalDistance: 10,
      totalTime: 15,
      conflicts: [],
      alternatives: []
    };
  }

  /**
   * A* algorithm for faster pathfinding with heuristic
   */
  static async findPathAStar(request: RouteRequest): Promise<RouteResult> {
    const { from, to, trainsetId, avoidConflicts = true } = request;

    if (!this.stations.has(from) || !this.stations.has(to)) {
      throw new Error('Invalid stations');
    }

    // Ensure network is initialized
    if (this.graph.size === 0) {
      await this.initializeNetwork();
    }

    // For demonstration, create a realistic path through the metro line
    const allStations = Array.from(this.stations.keys());
    const fromIndex = allStations.indexOf(from);
    const toIndex = allStations.indexOf(to);
    
    if (fromIndex === -1 || toIndex === -1) {
      return this.createFallbackPath(from, to);
    }

    // Create path through the line
    const path: string[] = [];
    if (fromIndex <= toIndex) {
      // Forward direction
      for (let i = fromIndex; i <= toIndex; i++) {
        path.push(allStations[i]);
      }
    } else {
      // Reverse direction
      for (let i = fromIndex; i >= toIndex; i--) {
        path.push(allStations[i]);
      }
    }

    // Calculate total distance and time
    const totalDistance = this.calculatePathDistance(path);
    const totalTime = path.length > 1 ? (path.length - 1) * 3 : 15; // 3 minutes between stations

    // Find conflicts along path
    const conflicts = trainsetId ? await this.getConflictsAlongPath(path, trainsetId) : [];
    
    // Generate alternatives
    const alternatives = await this.generateAlternatives(request, path, totalDistance, totalTime);

    return {
      path,
      totalDistance,
      totalTime,
      conflicts,
      alternatives
    };
  }

  private static buildGraph(stations: Station[]): void {
    // Clear existing graph
    this.graph.clear();

    // Build edges (simplified - mostly linear with some branches)
    const edges: Edge[] = [
      // Main line
      { from: 'ALUVA', to: 'PULI', distance: 2.5, travelTime: 3 },
      { from: 'PULI', to: 'COMP', distance: 2.8, travelTime: 3 },
      { from: 'COMP', to: 'AMB', distance: 2.2, travelTime: 2 },
      { from: 'AMB', to: 'MUTT', distance: 2.0, travelTime: 2 },
      { from: 'MUTT', to: 'KALOOR', distance: 2.5, travelTime: 3 },
      { from: 'KALOOR', to: 'COCH', distance: 2.8, travelTime: 3 },
      { from: 'COCH', to: 'PATHA', distance: 2.2, travelTime: 2 },
      { from: 'PATHA', to: 'EDAP', distance: 2.5, travelTime: 3 },
      { from: 'EDAP', to: 'CHANG', distance: 2.0, travelTime: 2 },
      { from: 'CHANG', to: 'PONE', distance: 2.2, travelTime: 2 },
      { from: 'PONE', to: 'ELAM', distance: 2.5, travelTime: 3 },
      { from: 'ELAM', to: 'SOUTH', distance: 2.0, travelTime: 2 },
      { from: 'SOUTH', to: 'COLLE', distance: 2.2, travelTime: 2 },
      { from: 'COLLE', to: 'KALAM', distance: 2.5, travelTime: 3 },
      { from: 'KALAM', to: 'CUSAT', distance: 2.8, travelTime: 3 },
      { from: 'CUSAT', to: 'PATHA2', distance: 2.2, travelTime: 2 },
      { from: 'PATHA2', to: 'IDAP', distance: 2.5, travelTime: 3 },
      { from: 'IDAP', to: 'MUPP', distance: 2.0, travelTime: 2 },
      { from: 'MUPP', to: 'KADU', distance: 2.2, travelTime: 2 },
      { from: 'KADU', to: 'ELAM2', distance: 2.5, travelTime: 3 },
      { from: 'ELAM2', to: 'VYTILA', distance: 2.0, travelTime: 2 },
      { from: 'VYTILA', to: 'THAMP', distance: 2.2, travelTime: 2 },
      { from: 'THAMP', to: 'PETTA', distance: 2.5, travelTime: 3 },
      { from: 'PETTA', to: 'MGR', distance: 2.0, travelTime: 2 },
      { from: 'MGR', to: 'MAH', distance: 2.2, travelTime: 2 },
      { from: 'MAH', to: 'BROA', distance: 2.5, travelTime: 3 },
      { from: 'BROA', to: 'MARINE', distance: 2.0, travelTime: 2 },
      { from: 'MARINE', to: 'ERNA', distance: 2.2, travelTime: 2 },
      { from: 'ERNA', to: 'TOWN', distance: 2.5, travelTime: 3 },
      { from: 'TOWN', to: 'FORT', distance: 2.0, travelTime: 2 },
      { from: 'FORT', to: 'VALLA', distance: 2.2, travelTime: 2 },
      { from: 'VALLA', to: 'PETTA2', distance: 2.5, travelTime: 3 },
      { from: 'PETTA2', to: 'TERMS', distance: 2.0, travelTime: 2 },

      // Add reverse edges
      ...this.generateReverseEdges([
        { from: 'ALUVA', to: 'PULI', distance: 2.5, travelTime: 3 },
        { from: 'PULI', to: 'COMP', distance: 2.8, travelTime: 3 },
        { from: 'COMP', to: 'AMB', distance: 2.2, travelTime: 2 },
        { from: 'AMB', to: 'MUTT', distance: 2.0, travelTime: 2 },
        { from: 'MUTT', to: 'KALOOR', distance: 2.5, travelTime: 3 },
        { from: 'KALOOR', to: 'COCH', distance: 2.8, travelTime: 3 },
        { from: 'COCH', to: 'PATHA', distance: 2.2, travelTime: 2 },
        { from: 'PATHA', to: 'EDAP', distance: 2.5, travelTime: 3 },
        { from: 'EDAP', to: 'CHANG', distance: 2.0, travelTime: 2 },
        { from: 'CHANG', to: 'PONE', distance: 2.2, travelTime: 2 },
        { from: 'PONE', to: 'ELAM', distance: 2.5, travelTime: 3 },
        { from: 'ELAM', to: 'SOUTH', distance: 2.0, travelTime: 2 },
        { from: 'SOUTH', to: 'COLLE', distance: 2.2, travelTime: 2 },
        { from: 'COLLE', to: 'KALAM', distance: 2.5, travelTime: 3 },
        { from: 'KALAM', to: 'CUSAT', distance: 2.8, travelTime: 3 },
        { from: 'CUSAT', to: 'PATHA2', distance: 2.2, travelTime: 2 },
        { from: 'PATHA2', to: 'IDAP', distance: 2.5, travelTime: 3 },
        { from: 'IDAP', to: 'MUPP', distance: 2.0, travelTime: 2 },
        { from: 'MUPP', to: 'KADU', distance: 2.2, travelTime: 2 },
        { from: 'KADU', to: 'ELAM2', distance: 2.5, travelTime: 3 },
        { from: 'ELAM2', to: 'VYTILA', distance: 2.0, travelTime: 2 },
        { from: 'VYTILA', to: 'THAMP', distance: 2.2, travelTime: 2 },
        { from: 'THAMP', to: 'PETTA', distance: 2.5, travelTime: 3 },
        { from: 'PETTA', to: 'MGR', distance: 2.0, travelTime: 2 },
        { from: 'MGR', to: 'MAH', distance: 2.2, travelTime: 2 },
        { from: 'MAH', to: 'BROA', distance: 2.5, travelTime: 3 },
        { from: 'BROA', to: 'MARINE', distance: 2.0, travelTime: 2 },
        { from: 'MARINE', to: 'ERNA', distance: 2.2, travelTime: 2 },
        { from: 'ERNA', to: 'TOWN', distance: 2.5, travelTime: 3 },
        { from: 'TOWN', to: 'FORT', distance: 2.0, travelTime: 2 },
        { from: 'FORT', to: 'VALLA', distance: 2.2, travelTime: 2 },
        { from: 'VALLA', to: 'PETTA2', distance: 2.5, travelTime: 3 },
        { from: 'PETTA2', to: 'TERMS', distance: 2.0, travelTime: 2 }
      ])
    ];

    // Add edges to graph
    for (const edge of edges) {
      if (!this.graph.has(edge.from)) {
        this.graph.set(edge.from, new Map());
      }
      this.graph.get(edge.from)!.set(edge.to, edge);
    }
  }

  private static generateReverseEdges(edges: Edge[]): Edge[] {
    return edges.map(edge => ({
      from: edge.to,
      to: edge.from,
      distance: edge.distance,
      travelTime: edge.travelTime
    }));
  }

  private static async updateWithConflicts(): Promise<void> {
    // Simplified: block some edges to simulate conflicts
    const edgesToBlock = ['EDAP', 'KALAM', 'VYTILA'];
    for (const stationId of edgesToBlock) {
      const neighbors = this.graph.get(stationId);
      if (neighbors) {
        for (const [neighborId, edge] of neighbors) {
          edge.isBlocked = true;
          edge.blockageReason = `Simulated conflict at ${stationId}`;
        }
      }
    }
  }

  private static blockEdgesAroundStation(trainsetId: string): void {
    // Simplified: block some random edges to simulate conflicts
    const edgesToBlock = ['EDAP', 'KALAM', 'VYTILA'];
    for (const stationId of edgesToBlock) {
      const neighbors = this.graph.get(stationId);
      if (neighbors) {
        for (const [neighborId, edge] of neighbors) {
          edge.isBlocked = true;
          edge.blockageReason = `Conflict with ${trainsetId}`;
        }
      }
    }
  }

  private static heuristic(from: string, to: string): number {
    // Euclidean distance heuristic
    const fromStation = this.stations.get(from);
    const toStation = this.stations.get(to);
    if (!fromStation || !toStation) return Infinity;

    const dx = fromStation.x - toStation.x;
    const dy = fromStation.y - toStation.y;
    return Math.sqrt(dx * dx + dy * dy) * 2; // Rough conversion to time
  }

  private static reconstructPath(previous: Map<string, string | null>, from: string, to: string): string[] {
    const path: string[] = [];
    let current: string | null | undefined = to;

    while (current !== null && current !== undefined) {
      path.unshift(current);
      current = previous.get(current) || null;
    }

    return path[0] === from ? path : [];
  }

  private static reconstructPathAStar(cameFrom: Map<string, string>, from: string, to: string): string[] {
    const path: string[] = [];
    let current: string = to;
    const visited = new Set<string>();

    while (current !== from && !visited.has(current)) {
      visited.add(current);
      path.unshift(current);
      const prev = cameFrom.get(current);
      if (!prev) break;
      current = prev;
    }

    if (current === from) {
      path.unshift(from);
      return path;
    }

    // If we couldn't reconstruct the path, return empty
    return [];
  }

  private static calculatePathDistance(path: string[]): number {
    let distance = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const neighbors = this.graph.get(path[i]);
      if (neighbors) {
        const edge = neighbors.get(path[i + 1]);
        if (edge) {
          distance += edge.distance;
        }
      }
    }
    return distance;
  }

  private static async getConflictsAlongPath(path: string[], trainsetId: string): Promise<string[]> {
    // Simplified: return mock conflicts
    const mockConflicts = ['CFT-001', 'CFT-002'];
    return mockConflicts.filter(id => Math.random() > 0.5);
  }

  private static isPathNearConflict(path: string[], conflict: any): boolean {
    // Simplified: check if path stations are near conflict location
    return path.some(station => 
      station === conflict.trainsetId
    );
  }

  private static async generateAlternatives(
    request: RouteRequest,
    primaryPath: string[],
    primaryDistance: number,
    primaryTime: number
  ): Promise<AlternativeRoute[]> {
    const alternatives: AlternativeRoute[] = [];

    // Alternative 1: Avoid conflicts even if longer
    if (request.avoidConflicts) {
      try {
        const conflictFreeRoute = await this.findShortestPath({
          ...request,
          avoidConflicts: false
        });

        if (conflictFreeRoute.path.join() !== primaryPath.join()) {
          alternatives.push({
            path: conflictFreeRoute.path,
            totalDistance: conflictFreeRoute.totalDistance,
            totalTime: conflictFreeRoute.totalTime,
            reason: 'Conflict-free alternative'
          });
        }
      } catch (e) {
        // No alternative found
      }
    }

    // Alternative 2: Shortest distance (ignore time)
    try {
      const shortestDistanceRoute = await this.findShortestPath({
        ...request,
        avoidConflicts: false
      });

      if (shortestDistanceRoute.totalDistance < primaryDistance * 0.9) {
        alternatives.push({
          path: shortestDistanceRoute.path,
          totalDistance: shortestDistanceRoute.totalDistance,
          totalTime: shortestDistanceRoute.totalTime,
          reason: 'Shorter distance'
        });
      }
    } catch (e) {
      // No alternative found
    }

    return alternatives.slice(0, 2); // Limit to 2 alternatives
  }
}
