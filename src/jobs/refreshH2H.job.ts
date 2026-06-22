import cron from 'node-cron';
import { H2HHistory } from '../models/H2HHistory';
import logger from '../utils/logger';

export const runRefreshH2H = async (): Promise<void> => {
  try {
    const histories = await H2HHistory.find();

    await Promise.all(
      histories.map(async (history) => {
        history.lastUpdated = new Date();
        await history.save();
      }),
    );

    logger.info('refreshH2H job complete', { count: histories.length });
  } catch (error) {
    logger.error('refreshH2H job failed', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const scheduleRefreshH2H = (): ReturnType<typeof cron.schedule> =>
  cron.schedule('0 1 * * *', async () => {
    logger.info('Running refreshH2H job');
    await runRefreshH2H();
  });
