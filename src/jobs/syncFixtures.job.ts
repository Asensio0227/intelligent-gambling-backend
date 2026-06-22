import cron from 'node-cron';
import { mapApiFixture } from '../controllers/fixture.controller';
import { Fixture } from '../models/Fixture';
import { fetchUpcomingFixtures } from '../services/apifootball.service';
import { fetchUpcomingFixturesFromFootballData } from '../services/footballdata.service';
import { ApiFootballFixture } from '../types/apifootball.types';
import logger from '../utils/logger';

const LEAGUES_TO_SYNC = [
  // International tournaments — active now (World Cup 2026)
  { id: 1, name: 'World Cup', season: 2026 },
  { id: 4, name: 'Euro Championship', season: 2024 },
  { id: 6, name: 'Africa Cup of Nations', season: 2025 },
  { id: 9, name: 'Copa America', season: 2024 },

  // Club leagues — off season, will have fixtures from August
  { id: 39, name: 'Premier League', season: 2025 },
  { id: 140, name: 'La Liga', season: 2025 },
  { id: 135, name: 'Serie A', season: 2025 },
  { id: 78, name: 'Bundesliga', season: 2025 },
  { id: 61, name: 'Ligue 1', season: 2025 },
  { id: 2, name: 'Champions League', season: 2025 },
  { id: 3, name: 'Europa League', season: 2025 },
  { id: 848, name: 'Conference League', season: 2025 },
  { id: 94, name: 'Primeira Liga', season: 2025 },
  { id: 88, name: 'Eredivisie', season: 2025 },
];

export const runSyncFixtures = async (): Promise<void> => {
  try {
    // Look back 3 days so recently finished matches are re-synced and get
    // their final result/status pulled in, not just upcoming fixtures.
    const fromDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    const toDate = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const source = process.env.FIXTURE_SOURCE ?? 'football-data';
    let allFixtures: ApiFootballFixture[] = [];

    if (source === 'football-data') {
      logger.info('Using football-data.org as fixture source');
      allFixtures = await fetchUpcomingFixturesFromFootballData(fromDate, toDate);
    } else {
      logger.info('Using API-Football as fixture source');
      for (const league of LEAGUES_TO_SYNC) {
        const fixtures = await fetchUpcomingFixtures(fromDate, toDate, league.id, league.season);
        allFixtures.push(...fixtures);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    let totalProcessed = 0;

    for (const apiFixture of allFixtures) {
      const payload = mapApiFixture(apiFixture);
      if (!payload.fixtureId) continue;

      await Fixture.findOneAndUpdate(
        { fixtureId: payload.fixtureId },
        payload,
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
      );
      totalProcessed += 1;
    }

    logger.info('syncFixtures job complete', { processed: totalProcessed, source });
  } catch (error) {
    logger.error('syncFixtures job failed', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const scheduleSyncFixtures = (): ReturnType<typeof cron.schedule> =>
  cron.schedule('0 */6 * * *', async () => {
    logger.info('Running syncFixtures job');
    await runSyncFixtures();
  });
