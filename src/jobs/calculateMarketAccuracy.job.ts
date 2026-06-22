import cron from 'node-cron';
import { Prediction } from '../models/Prediction';
import { MarketAccuracy } from '../models/MarketAccuracy';
import logger from '../utils/logger';

export interface MarketAccuracyStats {
  market: string;
  totalResolved: number;
  correct: number;
  accuracyPct: number;
}

const MARKETS = [
  'result', 'correctScore', 'goalsOverUnder', 'bts',
  'cornersOverUnder', 'yellowCards', 'highestScoringHalf',
];

export const calculateMarketAccuracy = async (): Promise<MarketAccuracyStats[]> => {
  const stats: MarketAccuracyStats[] = [];

  // Look at the last 200 resolved predictions per market — recent enough to
  // reflect current model behavior, large enough to be statistically meaningful.
  for (const market of MARKETS) {
    const accuracyField = `outcome.accuracy.${market}`;

    const resolved = await Prediction.find({
      'outcome.resolved': true,
      [accuracyField]: { $ne: null },
    })
      .sort({ createdAt: -1 })
      .limit(200)
      .select(`outcome.accuracy.${market}`)
      .lean();

    const totalResolved = resolved.length;
    const correct = resolved.filter((p: any) => p.outcome?.accuracy?.[market] === true).length;
    const accuracyPct = totalResolved > 0 ? Math.round((correct / totalResolved) * 100) : 0;

    stats.push({ market, totalResolved, correct, accuracyPct });

    await MarketAccuracy.findOneAndUpdate(
      { market },
      { totalResolved, correct, accuracyPct },
      { upsert: true },
    );
  }

  logger.info('Market accuracy calculated', { stats });
  return stats;
};

export const scheduleMarketAccuracy = (): ReturnType<typeof cron.schedule> =>
  cron.schedule('0 */6 * * *', async () => {
    logger.info('Running calculateMarketAccuracy job');
    await calculateMarketAccuracy();
  });
