import { Request, Response, NextFunction } from 'express';
import { Prediction } from '../models/Prediction';
import { generatePredictionForFixture } from '../services/prediction.service';
import { GeneratePredictionBody } from '../types/api.types';

export const generatePrediction = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const payload = req.body as GeneratePredictionBody;
    const prediction = await generatePredictionForFixture({
      fixtureId: payload.fixtureId,
      generatedBy: req.user?._id?.toString() || '',
      mode: payload.mode || (process.env.PREDICTION_MODE as 'shared' | 'personal') || 'shared',
    });

    res.status(201).json({
      success: true,
      data: prediction,
      message: 'Prediction generated',
    });
  } catch (error) {
    next(error);
  }
};

export const getPredictionByFixture = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const prediction = await Prediction.findOne({
      fixtureId: req.params.id,
    }).lean();

    if (!prediction) {
      res.status(404).json({
        success: false,
        data: {},
        message: 'Prediction not found',
        error: 'Not found',
      });
      return;
    }

    res.json({
      success: true,
      data: prediction,
      message: 'Prediction fetched',
    });
  } catch (error) {
    next(error);
  }
};

export const getPredictionById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const prediction = await Prediction.findById(req.params.id).lean();

    if (!prediction) {
      res.status(404).json({
        success: false,
        data: {},
        message: 'Prediction not found',
        error: 'Not found',
      });
      return;
    }

    res.json({
      success: true,
      data: prediction,
      message: 'Prediction fetched',
    });
  } catch (error) {
    next(error);
  }
};

export const listPredictions = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const predictions = await Prediction.find()
      .populate('fixtureId generatedBy userId', 'fixtureId name email')
      .lean();

    res.json({
      success: true,
      data: predictions,
      message: 'Predictions listed',
    });
  } catch (error) {
    next(error);
  }
};

export const predictionAccuracy = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const stats = await Prediction.aggregate([
      { $match: { 'outcome.resolved': true } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          correctResult: {
            $sum: { $cond: ['$outcome.accuracy.result', 1, 0] },
          },
        },
      },
    ]);

    const summary = stats[0] || { total: 0, correctResult: 0 };
    res.json({
      success: true,
      data: { total: summary.total, correctResult: summary.correctResult },
      message: 'Prediction accuracy fetched',
    });
  } catch (error) {
    next(error);
  }
};
