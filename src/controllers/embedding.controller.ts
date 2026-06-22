import { NextFunction, Request, Response } from 'express';
import {
  findSimilarFixtures,
  findSimilarProbabilityProfile,
} from '../services/embedding.service';
import logger from '../utils/logger';

export const getSimilarFixtures = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Check if embeddings are enabled
    if (process.env.EMBEDDINGS_ENABLED !== 'true') {
      res.status(403).json({
        success: false,
        data: {},
        message: 'Embeddings feature is not enabled',
        error: 'EMBEDDINGS_ENABLED is false in environment configuration',
      });
      return;
    }

    const predictionId = req.params.id as string;
    const topK = req.query.topK ? parseInt(req.query.topK as string) : 3;

    const results = await findSimilarFixtures(predictionId, topK);

    res.json({
      success: true,
      data: results,
      message: 'Similar fixtures found',
    });
  } catch (error) {
    next(error);
  }
};

export const getSimilarProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Check if embeddings are enabled
    if (process.env.EMBEDDINGS_ENABLED !== 'true') {
      res.status(403).json({
        success: false,
        data: {},
        message: 'Embeddings feature is not enabled',
        error: 'EMBEDDINGS_ENABLED is false in environment configuration',
      });
      return;
    }

    const { markets, topK = 5 } = req.body;

    if (!markets || typeof markets !== 'object') {
      res.status(400).json({
        success: false,
        data: {},
        message: 'Validation failed',
        error: 'markets object is required in request body',
      });
      return;
    }

    const results = await findSimilarProbabilityProfile(markets, topK);

    res.json({
      success: true,
      data: results,
      message: 'Similar probability profiles found',
    });
  } catch (error) {
    next(error);
  }
};
