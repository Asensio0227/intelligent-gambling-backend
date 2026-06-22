import cron from 'node-cron';
import { Fixture } from '../models/Fixture';
import { TeamStats } from '../models/TeamStats';
import { fetchTeamStatistics } from '../services/apifootball.service';
import logger from '../utils/logger';

const updateStatsForTeam = async (
  teamId: string,
  season: string,
  league: string,
) => {
  const apiResponse = await fetchTeamStatistics(teamId, season);
  const stats = (apiResponse as any)?.statistics?.[0] || {};
  const form = stats.form || '';

  return TeamStats.findOneAndUpdate(
    { teamId, season },
    {
      teamId,
      season,
      league,
      lastUpdated: new Date(),
      stats: {
        played: stats.matches?.played || 0,
        form,
        goalsFor: {
          home: stats.goals?.for?.home || 0,
          away: stats.goals?.for?.away || 0,
          total: stats.goals?.for?.total || 0,
        },
        goalsAgainst: {
          home: stats.goals?.against?.home || 0,
          away: stats.goals?.against?.away || 0,
          total: stats.goals?.against?.total || 0,
        },
        cleanSheets: {
          home: stats.cleanSheet?.home || 0,
          away: stats.cleanSheet?.away || 0,
        },
        btsPct: stats.goals?.btScore || 0,
        avgCorners: stats.corners?.avg || 0,
        avgYellowCards: stats.cards?.yellow?.avg || 0,
        firstHalfGoalsPct: stats.goals?.firstHalf?.pct || 0,
      },
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  );
};

export const runSyncTeamStats = async (): Promise<void> => {
  try {
    const fixtures = await Fixture.find({
      kickoff: { $gte: new Date() },
    }).lean();

    const teamPairs = new Map<
      string,
      { id: string; season: string; league: string }
    >();

    fixtures.forEach((fixture) => {
      if (fixture.homeTeam?.id && fixture.season && fixture.league?.name) {
        teamPairs.set(`${fixture.homeTeam.id}:${fixture.season}`, {
          id: fixture.homeTeam.id,
          season: fixture.season,
          league: fixture.league.name,
        });
      }
      if (fixture.awayTeam?.id && fixture.season && fixture.league?.name) {
        teamPairs.set(`${fixture.awayTeam.id}:${fixture.season}`, {
          id: fixture.awayTeam.id,
          season: fixture.season,
          league: fixture.league.name,
        });
      }
    });

    let processed = 0;
    for (const item of teamPairs.values()) {
      await updateStatsForTeam(item.id, item.season, item.league);
      processed += 1;
    }

    logger.info('syncTeamStats job complete', { processed });
  } catch (error) {
    logger.error('syncTeamStats job failed', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const scheduleSyncTeamStats = (): ReturnType<typeof cron.schedule> =>
  cron.schedule('0 0 * * *', async () => {
    logger.info('Running syncTeamStats job');
    await runSyncTeamStats();
  });
