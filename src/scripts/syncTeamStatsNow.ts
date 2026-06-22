import 'dotenv/config';
import { connectDB } from '../config/db';
import { runSyncTeamStats } from '../jobs/syncTeamStats.job';
import logger from '../utils/logger';

(async () => {
  await connectDB();
  logger.info('Starting manual team stats sync...');
  await runSyncTeamStats();
  logger.info('Manual team stats sync complete');
  process.exit(0);
})();
