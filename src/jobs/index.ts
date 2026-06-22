import { scheduleSyncFixtures } from './syncFixtures.job';
import { scheduleSyncTeamStats } from './syncTeamStats.job';
import { scheduleResolveOutcomes } from './resolveOutcomes.job';
import { scheduleRefreshH2H } from './refreshH2H.job';
import { scheduleMarketAccuracy } from './calculateMarketAccuracy.job';

export {
  scheduleSyncFixtures,
  scheduleSyncTeamStats,
  scheduleResolveOutcomes,
  scheduleRefreshH2H,
  scheduleMarketAccuracy,
};
