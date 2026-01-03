import mongoose, { Schema, Document } from 'mongoose';

export interface DSASchedulingResultDocument extends Document {
  runId: string;
  algorithm: 'GREEDY' | 'DP' | 'DYNAMIC_PROGRAMMING';
  input: {
    trainsets: any[];
    horizonHours?: number;
    objective?: string;
    [key: string]: any;
  };
  result: {
    schedule: any[];
    totalScore?: number;
    efficiency?: number;
    [key: string]: any;
  };
  metadata?: {
    executionTime?: number;
    trainsetCount?: number;
    [key: string]: any;
  };
  createdAt: Date;
}

const dsaSchedulingResultSchema = new Schema<DSASchedulingResultDocument>(
  {
    runId: { type: String, required: true, index: true },
    algorithm: { type: String, enum: ['GREEDY', 'DP', 'DYNAMIC_PROGRAMMING'], required: true },
    input: { type: Schema.Types.Mixed, required: true },
    result: { type: Schema.Types.Mixed, required: true },
    metadata: { type: Schema.Types.Mixed }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

dsaSchedulingResultSchema.index({ runId: 1, createdAt: -1 });
dsaSchedulingResultSchema.index({ algorithm: 1, createdAt: -1 });

export interface DSARoutingResultDocument extends Document {
  runId: string;
  algorithm: 'DIJKSTRA' | 'ASTAR' | 'A_STAR';
  input: {
    fromStation?: string;
    toStation?: string;
    trainsetId?: string;
    [key: string]: any;
  };
  result: {
    path?: any[];
    distance?: number;
    time?: number;
    [key: string]: any;
  };
  metadata?: {
    executionTime?: number;
    [key: string]: any;
  };
  createdAt: Date;
}

const dsaRoutingResultSchema = new Schema<DSARoutingResultDocument>(
  {
    runId: { type: String, required: true, index: true },
    algorithm: { type: String, enum: ['DIJKSTRA', 'ASTAR', 'A_STAR'], required: true },
    input: { type: Schema.Types.Mixed, required: true },
    result: { type: Schema.Types.Mixed, required: true },
    metadata: { type: Schema.Types.Mixed }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

dsaRoutingResultSchema.index({ runId: 1, createdAt: -1 });
dsaRoutingResultSchema.index({ algorithm: 1, createdAt: -1 });

export interface DSAPredictionResultDocument extends Document {
  runId: string;
  predictionType: 'STANDARD' | 'ADVANCED';
  input: {
    trainsetId?: string;
    horizon?: number;
    [key: string]: any;
  };
  result: {
    predictions?: any[];
    confidence?: number;
    [key: string]: any;
  };
  metadata?: {
    executionTime?: number;
    [key: string]: any;
  };
  createdAt: Date;
}

const dsaPredictionResultSchema = new Schema<DSAPredictionResultDocument>(
  {
    runId: { type: String, required: true, index: true },
    predictionType: { type: String, enum: ['STANDARD', 'ADVANCED'], required: true },
    input: { type: Schema.Types.Mixed, required: true },
    result: { type: Schema.Types.Mixed, required: true },
    metadata: { type: Schema.Types.Mixed }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

dsaPredictionResultSchema.index({ runId: 1, createdAt: -1 });
dsaPredictionResultSchema.index({ predictionType: 1, createdAt: -1 });

export const DSASchedulingResult = mongoose.model<DSASchedulingResultDocument>(
  'DSASchedulingResult',
  dsaSchedulingResultSchema
);

export const DSARoutingResult = mongoose.model<DSARoutingResultDocument>(
  'DSARoutingResult',
  dsaRoutingResultSchema
);

export const DSAPredictionResult = mongoose.model<DSAPredictionResultDocument>(
  'DSAPredictionResult',
  dsaPredictionResultSchema
);

