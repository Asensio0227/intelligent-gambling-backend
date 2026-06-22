import 'dotenv/config';
import { connectDB } from '../config/db';
import { runSyncFixtures } from '../jobs/syncFixtures.job';
import logger from '../utils/logger';

(async () => {
  await connectDB();
  logger.info('Starting manual fixture sync for all leagues...');
  await runSyncFixtures();
  logger.info('Manual sync complete');
  process.exit(0);
})();
