import cron from 'node-cron';
import {
  resolvePredictionOutcomes,
  resolveTicketStatuses,
} from '../services/outcome.service';
import { Fixture } from '../models/Fixture';
import logger from '../utils/logger';

export const runResolveOutcomes = async (): Promise<void> => {
  try {
    // Only flip status to FT for fixtures where real result data already exists
    // (populated by syncFixtures.job.ts pulling from football-data.org/API-Football).
    // Never guess based on elapsed time alone — that risks marking unplayed
    // matches as 0-0 finals and corrupting prediction/ticket outcomes.
    const fixturesWithResultButStaleStatus = await Fixture.find({
      status: 'NS',
      'result.homeGoals': { $ne: null },
      'result.awayGoals': { $ne: null },
    });

    if (fixturesWithResultButStaleStatus.length > 0) {
      const ids = fixturesWithResultButStaleStatus.map((f) => f._id);
      await Fixture.updateMany(
        { _id: { $in: ids } },
        { $set: { status: 'FT' } },
      );
      logger.info('Flipped status to FT for fixtures with confirmed results', {
        count: fixturesWithResultButStaleStatus.length,
      });
    }

    const predictionResults = await resolvePredictionOutcomes();
    const ticketResults = await resolveTicketStatuses();

    logger.info('resolveOutcomes job complete', {
      predictionResults,
      ticketResults,
    });
  } catch (error) {
    logger.error('resolveOutcomes job failed', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const scheduleResolveOutcomes = (): ReturnType<typeof cron.schedule> =>
  cron.schedule('0 * * * *', async () => {
    logger.info('Running resolveOutcomes job');
    await runResolveOutcomes();
  });
