import mongoose, { Schema, Document } from "mongoose";

export interface IngestionNotificationSettingsDocument extends Document {
  key: string;
  email?: string;
  phone?: string;
  notifyOnSuccess: boolean;
  notifyOnFailure: boolean;
  updatedBy?: string;
  updatedAt: Date;
  createdAt: Date;
}

const ingestionNotificationSettingsSchema = new Schema<IngestionNotificationSettingsDocument>(
  {
    key: { type: String, required: true, unique: true, index: true },
    email: { type: String },
    phone: { type: String },
    notifyOnSuccess: { type: Boolean, required: true, default: false },
    notifyOnFailure: { type: Boolean, required: true, default: true },
    updatedBy: { type: String },
  },
  { timestamps: true }
);

export const IngestionNotificationSettings = mongoose.model<IngestionNotificationSettingsDocument>(
  "IngestionNotificationSettings",
  ingestionNotificationSettingsSchema
);
