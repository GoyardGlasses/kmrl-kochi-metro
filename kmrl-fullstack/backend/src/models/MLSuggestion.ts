import mongoose, { Schema, Document } from 'mongoose';

export interface MLSuggestionDocument extends Document {
  suggestionId: string;
  trainsetId: string;
  currentDecision: 'REVENUE' | 'STANDBY' | 'IBL';
  suggestedDecision: 'REVENUE' | 'STANDBY' | 'IBL';
  confidence: number;
  reasons: string[];
  metadata?: {
    score?: number;
    [key: string]: any;
  };
  createdAt: Date;
}

const mlSuggestionSchema = new Schema<MLSuggestionDocument>(
  {
    suggestionId: { type: String, required: true, unique: true, index: true },
    trainsetId: { type: String, required: true, ref: 'Trainset', index: true },
    currentDecision: { type: String, enum: ['REVENUE', 'STANDBY', 'IBL'], required: true },
    suggestedDecision: { type: String, enum: ['REVENUE', 'STANDBY', 'IBL'], required: true },
    confidence: { type: Number, required: true, min: 0, max: 100 },
    reasons: [{ type: String }],
    metadata: { type: Schema.Types.Mixed }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

mlSuggestionSchema.index({ trainsetId: 1, createdAt: -1 });
mlSuggestionSchema.index({ suggestedDecision: 1, createdAt: -1 });
mlSuggestionSchema.index({ confidence: -1, createdAt: -1 });

export const MLSuggestion = mongoose.model<MLSuggestionDocument>(
  'MLSuggestion',
  mlSuggestionSchema
);

