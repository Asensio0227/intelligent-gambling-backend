import { UsageTracking, IUsageTrackingDocument } from '../models/UsageTracking';

interface RecordUsageParams {
  userId: string;
  tokens?: number;
  estimatedCost?: number;
}

const getMonthKey = (): string => {
  const date = new Date();
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
};

export const recordUsage = async ({
  userId,
  tokens = 0,
  estimatedCost = 0,
}: RecordUsageParams): Promise<IUsageTrackingDocument | null> => {
  const month = getMonthKey();
  return UsageTracking.findOneAndUpdate(
    { userId, month },
    {
      $inc: { predictionsGenerated: 1, tokensUsed: tokens, estimatedCost },
      $set: { updatedAt: new Date() },
    },
    { upsert: true, returnDocument: 'after' },
  );
};

export const getUsageStats = async () =>
  UsageTracking.find().populate('userId', 'name email').lean();

export const getUserUsage = async (userId: string) =>
  UsageTracking.find({ userId }).lean();
