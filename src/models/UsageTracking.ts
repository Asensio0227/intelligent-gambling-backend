import { Schema, model, Document, Types } from 'mongoose';

export interface IUsageTracking {
  userId: Types.ObjectId;
  month: string;
  predictionsGenerated?: number;
  tokensUsed?: number;
  estimatedCost?: number;
}

export interface IUsageTrackingDocument extends IUsageTracking, Document {}

const usageTrackingSchema = new Schema<IUsageTrackingDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    month: { type: String, required: true },
    predictionsGenerated: { type: Number, default: 0 },
    tokensUsed: { type: Number, default: 0 },
    estimatedCost: { type: Number, default: 0 },
  },
  { timestamps: true },
);

usageTrackingSchema.index({ userId: 1, month: 1 }, { unique: true });

export const UsageTracking = model<IUsageTrackingDocument>(
  'UsageTracking',
  usageTrackingSchema,
);
