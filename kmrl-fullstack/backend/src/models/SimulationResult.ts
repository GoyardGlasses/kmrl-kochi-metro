import mongoose, { Schema, Document } from 'mongoose';

export interface WhatIfSimulationResultDocument extends Document {
  simulationId: string;
  rules: {
    [key: string]: any;
  };
  resultCounts: {
    REVENUE?: number;
    STANDBY?: number;
    IBL?: number;
  };
  results: Array<{
    id: string;
    recommendation: 'REVENUE' | 'STANDBY' | 'IBL';
    score?: number;
    reason?: string;
    [key: string]: any;
  }>;
  createdBy?: string;
  createdAt: Date;
}

const whatIfSimulationResultSchema = new Schema<WhatIfSimulationResultDocument>(
  {
    simulationId: { type: String, required: true, unique: true, index: true },
    rules: { type: Schema.Types.Mixed, required: true },
    resultCounts: {
      REVENUE: { type: Number, default: 0 },
      STANDBY: { type: Number, default: 0 },
      IBL: { type: Number, default: 0 }
    },
    results: [{
      id: { type: String, required: true },
      recommendation: { type: String, enum: ['REVENUE', 'STANDBY', 'IBL'], required: true },
      score: { type: Number },
      reason: { type: String },
      // Allow any additional fields
      _id: false
    }],
    createdBy: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

whatIfSimulationResultSchema.index({ createdAt: -1 });
whatIfSimulationResultSchema.index({ createdBy: 1 });

export const WhatIfSimulationResult = mongoose.model<WhatIfSimulationResultDocument>(
  'WhatIfSimulationResult',
  whatIfSimulationResultSchema
);

