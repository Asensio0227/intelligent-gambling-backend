import app from './app';
import { connectDB } from './config/db';
import logger from './utils/logger';
import {
  scheduleSyncFixtures,
  scheduleSyncTeamStats,
  scheduleResolveOutcomes,
  scheduleRefreshH2H,
  scheduleMarketAccuracy,
} from './jobs';

const port = process.env.PORT || 3000;

const start = async (): Promise<void> => {
  try {
    await connectDB();
    app.listen(port, () =>
      logger.info(`Server running on port ${port}`),
    );
    scheduleSyncFixtures();
    scheduleSyncTeamStats();
    scheduleResolveOutcomes();
    scheduleRefreshH2H();
    scheduleMarketAccuracy();
  } catch (error) {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
};

start();
