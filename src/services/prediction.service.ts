import mongoose from 'mongoose';
import { Fixture } from '../models/Fixture';
import { H2HHistory, IH2HHistoryDocument } from '../models/H2HHistory';
import { IPredictionDocument, Prediction } from '../models/Prediction';
import { TeamStats } from '../models/TeamStats';
import { IDataSnapshot } from '../types/models.types';
import logger from '../utils/logger';
import { fetchTeamStatistics } from './apifootball.service';
import { generatePredictionEmbedding, findSimilarFixtures } from './embedding.service';
import { generatePrediction } from './openai.service';
import { recordUsage } from './usage.service';
import { MarketAccuracy } from '../models/MarketAccuracy';

interface GeneratePredictionParams {
  fixtureId: string;
  generatedBy: string;
  mode?: 'shared' | 'personal';
}

const getTeamStats = async (teamId: string, season: string, league: string) => {
  let teamStats = await TeamStats.findOne({ teamId, season });
  if (teamStats) {
    return teamStats;
  }

  const apiResponse = await fetchTeamStatistics(teamId, season);
  const stats = (apiResponse as any)?.statistics?.[0] || {};
  const form = stats.form || '';

  teamStats = await TeamStats.create({
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
  });

  return teamStats;
};

const buildDataSnapshot = (
  homeStats: any,
  awayStats: any,
  h2hHistory: IH2HHistoryDocument,
): IDataSnapshot => ({
  homeForm: homeStats.stats?.form ? homeStats.stats.form.split('') : [],
  awayForm: awayStats.stats?.form ? awayStats.stats.form.split('') : [],
  h2hHistory: h2hHistory?.matches || [],
  homeAvgGoals: homeStats.stats?.goalsFor?.total || 0,
  awayAvgGoals: awayStats.stats?.goalsFor?.total || 0,
  leagueAvgGoals:
    ((homeStats.stats?.goalsFor?.total || 0) +
      (awayStats.stats?.goalsFor?.total || 0)) /
      2 || 0,
  homeAvgCorners: homeStats.stats?.avgCorners || 0,
  awayAvgCorners: awayStats.stats?.avgCorners || 0,
  homeAvgYellowCards: homeStats.stats?.avgYellowCards || 0,
  awayAvgYellowCards: awayStats.stats?.avgYellowCards || 0,
});

const getH2H = async (
  homeId: string,
  awayId: string,
): Promise<IH2HHistoryDocument> => {
  const teamIds = [homeId, awayId].sort();
  let h2h = await H2HHistory.findOne({ teamIds });

  if (!h2h) {
    h2h = await H2HHistory.create({
      teamIds,
      matches: [],
      lastUpdated: new Date(),
    });
  }

  return h2h;
};

export const generatePredictionForFixture = async ({
  fixtureId,
  generatedBy,
  mode = 'shared',
}: GeneratePredictionParams): Promise<IPredictionDocument> => {
  const fixture = await Fixture.findOne({
    $or: [{ _id: fixtureId }, { fixtureId }],
  });

  if (!fixture) {
    throw new Error('Fixture not found');
  }

  const homeStats = await getTeamStats(
    fixture.homeTeam?.id || '',
    fixture.season || '',
    fixture.league?.name || '',
  );
  const awayStats = await getTeamStats(
    fixture.awayTeam?.id || '',
    fixture.season || '',
    fixture.league?.name || '',
  );
  const h2hHistory = await getH2H(
    fixture.homeTeam?.id || '',
    fixture.awayTeam?.id || '',
  );
  const dataSnapshot = buildDataSnapshot(homeStats, awayStats, h2hHistory);

  let similarMatches: any[] = [];
  if (process.env.EMBEDDINGS_ENABLED === 'true') {
    try {
      // Baseline check — completely independent of candidate-fixture logic.
      // Just asks: does ANY prediction with an embedding vector exist at all?
      const anyEmbedded = await Prediction.find({ 'embedding.vector': { $exists: true } })
        .select('_id fixtureId createdAt')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

      logger.info('Baseline embedded predictions check', {
        totalFoundIgnoringCandidates: anyEmbedded.length,
        sample: anyEmbedded.map((p: any) => ({
          predictionId: p._id.toString(),
          fixtureId: p.fixtureId?.toString(),
          fixtureIdType: typeof p.fixtureId,
          createdAt: p.createdAt,
        })),
      });

      // Find other fixtures involving either team — explicitly excluding the
      // current fixture itself, since the current fixture has no prediction
      // embedding yet at this point anyway, and including it would otherwise
      // risk matching against itself if a prediction already existed.
      const candidateFixtures = await Fixture.find({
        _id: { $ne: fixture._id },
        $or: [
          { 'homeTeam.id': fixture.homeTeam?.id },
          { 'awayTeam.id': fixture.homeTeam?.id },
          { 'homeTeam.id': fixture.awayTeam?.id },
          { 'awayTeam.id': fixture.awayTeam?.id },
        ],
      })
        .select('_id')
        .lean();

      if (candidateFixtures.length > 0) {
        const recentPrediction = await Prediction.findOne({
          fixtureId: { $in: candidateFixtures.map((f) => f._id) },
          'embedding.vector': { $exists: true },
        }).sort({ createdAt: -1 });

        logger.info('Recent prediction lookup for similar-match seed', {
          fixtureId: fixture._id.toString(),
          candidateFixtureIds: candidateFixtures.map((f) => f._id.toString()),
          recentPredictionFound: !!recentPrediction,
          recentPredictionId: recentPrediction?._id?.toString() ?? null,
          hasEmbeddingVector: !!(recentPrediction as any)?.embedding?.vector,
          embeddingVectorLength: (recentPrediction as any)?.embedding?.vector?.length ?? 0,
        });

        if (recentPrediction) {
          similarMatches = await findSimilarFixtures(recentPrediction._id.toString(), 3);
        }
      }

      logger.info('Similar matches lookup result', {
        fixtureId: fixture._id.toString(),
        homeTeam: fixture.homeTeam?.name,
        awayTeam: fixture.awayTeam?.name,
        embeddingsEnabled: process.env.EMBEDDINGS_ENABLED,
        candidateFixturesCount: candidateFixtures.length,
        similarMatchesCount: similarMatches?.length ?? 0,
        similarMatches: similarMatches?.map((m: any) => ({
          teams: `${m.homeTeam} vs ${m.awayTeam}`,
          score: m.score,
          similarityScore: m.similarityScore,
        })),
      });
    } catch (err) {
      logger.warn('Similar fixture lookup failed, continuing without it', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Only include markets with at least 20 resolved samples — avoids noisy
  // feedback from a tiny, statistically meaningless sample size.
  const accuracyStats = await MarketAccuracy.find({ totalResolved: { $gte: 20 } }).lean();

  const predictionPayload = await generatePrediction(
    fixture,
    dataSnapshot,
    h2hHistory,
    similarMatches,
    accuracyStats,
  );

  const prediction = await Prediction.create({
    fixtureId: fixture._id,
    generatedBy: new mongoose.Types.ObjectId(generatedBy),
    userId:
      mode === 'personal' ? new mongoose.Types.ObjectId(generatedBy) : null,
    mode,
    dataSnapshot,
    markets: predictionPayload.markets,
    reasoning: predictionPayload.reasoning,
    tokensUsed: predictionPayload.tokensUsed,
    outcome: { resolved: false },
  });

  await recordUsage({
    userId: generatedBy,
    tokens: (predictionPayload.tokensUsed?.input || 0) + (predictionPayload.tokensUsed?.output || 0),
    estimatedCost: predictionPayload.tokensUsed?.totalCost || 0,
  });

  fixture.predictionGenerated = true;
  await fixture.save();

  h2hHistory.matches?.push({
    fixtureId: fixture._id,
    date: fixture.kickoff,
    homeTeam: fixture.homeTeam?.name,
    awayTeam: fixture.awayTeam?.name,
    score: '',
    gptReasoning: predictionPayload.reasoning?.summary,
    predictionAccuracy: {},
  });
  h2hHistory.lastUpdated = new Date();
  await h2hHistory.save();

  if (process.env.EMBEDDINGS_ENABLED === 'true') {
    generatePredictionEmbedding(prediction._id.toString()).catch((err: Error) =>
      logger.warn('Embedding generation failed', { error: err.message }),
    );
  }

  return prediction;
};
