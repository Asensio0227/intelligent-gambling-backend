import { embeddingModel, openaiClient } from '../config/openai';
import { Fixture } from '../models/Fixture';
import { Prediction } from '../models/Prediction';
import { ISimilarFixtureResult } from '../types/models.types';
import logger from '../utils/logger';

export const generateEmbedding = async (text: string): Promise<number[]> => {
  if (!openaiClient) {
    throw new Error('OpenAI client not configured');
  }

  const response = await openaiClient.embeddings.create({
    model: embeddingModel,
    input: text,
  });

  return response.data[0].embedding;
};

export const generatePredictionEmbedding = async (
  predictionId: string,
): Promise<void> => {
  try {
    // Fetch prediction from MongoDB by _id
    const prediction = await Prediction.findById(predictionId)
      .populate('fixtureId')
      .lean();

    if (!prediction) {
      throw new Error(`Prediction ${predictionId} not found`);
    }

    const fixture = prediction.fixtureId as any;

    // Build embeddable text string combining:
    // - homeTeam name, awayTeam name, league
    // - dataSnapshot summary (form, avgGoals, h2h count)
    // - reasoning.summary
    // - all market predictions and confidence scores
    const homeForm = prediction.dataSnapshot?.homeForm?.join('') || '';
    const awayForm = prediction.dataSnapshot?.awayForm?.join('') || '';
    const h2hCount = prediction.dataSnapshot?.h2hHistory?.length || 0;
    const homeAvgGoals = prediction.dataSnapshot?.homeAvgGoals || 0;
    const awayAvgGoals = prediction.dataSnapshot?.awayAvgGoals || 0;

    const markets = prediction.markets || {};
    const marketSummary = Object.entries(markets)
      .map(([key, value]: [string, any]) => {
        const prediction = value?.prediction;
        const confidence = value?.confidence || 0;
        return `${key}: ${prediction} (${confidence}%)`;
      })
      .join(', ');

    const embeddableText = `
Match: ${fixture.homeTeam?.name || ''} vs ${fixture.awayTeam?.name || ''} (${fixture.league?.name || ''})
Home Form: ${homeForm}, Away Form: ${awayForm}
Home Avg Goals: ${homeAvgGoals}, Away Avg Goals: ${awayAvgGoals}
H2H History Count: ${h2hCount}
Predictions: ${marketSummary}
Reasoning: ${prediction.reasoning?.summary || ''}
    `.trim();

    // Call generateEmbedding(text)
    const vector = await generateEmbedding(embeddableText);

    // Save vector to prediction.embedding.vector
    await Prediction.updateOne(
      { _id: predictionId },
      {
        embedding: {
          vector,
          generatedAt: new Date(),
        },
      },
    );

    // Log: predictionId, vector dimensions
    logger.info('Prediction embedding generated', {
      predictionId,
      vectorDimensions: vector.length,
    });
  } catch (error) {
    logger.error('Prediction embedding generation failed', {
      predictionId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};

export const findSimilarFixtures = async (
  predictionId: string,
  topK: number = 3,
): Promise<ISimilarFixtureResult[]> => {
  // Fetch prediction to get its embedding vector
  const prediction = await Prediction.findById(predictionId).lean();

  if (!prediction || !(prediction as any).embedding?.vector) {
    throw new Error('Prediction or embedding vector not found');
  }

  const queryVector = (prediction as any).embedding.vector;

  // Run MongoDB Atlas $vectorSearch aggregation pipeline
  // Note: This requires a vector search index to be created manually in MongoDB Atlas
  const results = await (Prediction.collection as any)
    .aggregate([
      {
        $vectorSearch: {
          index: 'prediction_vector_index',
          path: 'embedding.vector',
          queryVector: queryVector,
          numCandidates: topK * 10,
          limit: topK,
        },
      },
      {
        $project: {
          similarityScore: { $meta: 'vectorSearchScore' },
          document: '$$ROOT',
        },
      },
      {
        $limit: topK,
      },
    ])
    .toArray();

  // Populate fixture data on results and map to ISimilarFixtureResult[]
  const similarResults: ISimilarFixtureResult[] = [];

  for (const result of results) {
    const pred = result.document;
    const fixture = await Fixture.findById(pred.fixtureId).lean();

    if (fixture) {
      similarResults.push({
        predictionId: pred._id.toString(),
        fixtureId: fixture._id.toString(),
        homeTeam: fixture.homeTeam?.name || '',
        awayTeam: fixture.awayTeam?.name || '',
        score: `${fixture.result?.homeGoals || 0}-${fixture.result?.awayGoals || 0}`,
        date: fixture.kickoff || new Date(),
        similarityScore: result.similarityScore || 0,
        markets: pred.markets || {},
        reasoning: pred.reasoning?.summary || '',
      });
    }
  }

  logger.info('Similar fixtures found', {
    predictionId,
    topK,
    resultsFound: similarResults.length,
  });

  return similarResults;
};

export const findSimilarProbabilityProfile = async (
  markets: Record<string, any>,
  topK: number = 5,
): Promise<ISimilarFixtureResult[]> => {
  // Build descriptive text from markets object
  const marketDescriptions = Object.entries(markets)
    .map(([key, value]: [string, any]) => {
      const prediction = value?.prediction;
      const confidence = value?.confidence || 0;
      return `${key}: ${prediction} ${confidence}%`;
    })
    .join(', ');

  const embeddableText = `Markets: ${marketDescriptions}`;

  // Call generateEmbedding on that text
  const queryVector = await generateEmbedding(embeddableText);

  // Run $vectorSearch pipeline same as findSimilarFixtures
  const results = await (Prediction.collection as any)
    .aggregate([
      {
        $vectorSearch: {
          index: 'prediction_vector_index',
          path: 'embedding.vector',
          queryVector: queryVector,
          numCandidates: topK * 10,
          limit: topK,
        },
      },
      {
        $project: {
          similarityScore: { $meta: 'vectorSearchScore' },
          document: '$$ROOT',
        },
      },
      {
        $limit: topK,
      },
    ])
    .toArray();

  // Map to ISimilarFixtureResult[]
  const similarResults: ISimilarFixtureResult[] = [];

  for (const result of results) {
    const pred = result.document;
    const fixture = await Fixture.findById(pred.fixtureId).lean();

    if (fixture) {
      similarResults.push({
        predictionId: pred._id.toString(),
        fixtureId: fixture._id.toString(),
        homeTeam: fixture.homeTeam?.name || '',
        awayTeam: fixture.awayTeam?.name || '',
        score: `${fixture.result?.homeGoals || 0}-${fixture.result?.awayGoals || 0}`,
        date: fixture.kickoff || new Date(),
        similarityScore: result.similarityScore || 0,
        markets: pred.markets || {},
        reasoning: pred.reasoning?.summary || '',
      });
    }
  }

  logger.info('Similar probability profiles found', {
    topK,
    resultsFound: similarResults.length,
  });

  return similarResults;
};
