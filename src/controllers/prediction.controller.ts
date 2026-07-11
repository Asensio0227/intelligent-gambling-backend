import { Request, Response, NextFunction } from 'express';
import { PipelineStage } from 'mongoose';
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
    const { date, team, sort } = req.query;

    // Sort by fixture kickoff date: asc or desc (default desc = newest first)
    const sortOrder = String(sort ?? 'desc').toLowerCase() === 'asc' ? 1 : -1;

    const pipeline: PipelineStage[] = [
      {
        $lookup: {
          from: 'fixtures',
          localField: 'fixtureId',
          foreignField: '_id',
          as: 'fixtureId',
        },
      },
      { $unwind: { path: '$fixtureId', preserveNullAndEmptyArrays: true } },
    ];

    const match: Record<string, any> = {};

    // Search by date: matches the whole day of the fixture's kickoff
    if (date) {
      const dayStart = new Date(String(date));
      if (!isNaN(dayStart.getTime())) {
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);
        match['fixtureId.kickoff'] = { $gte: dayStart, $lt: dayEnd };
      }
    }

    // Search by team: partial, case-insensitive match on home or away team name
    if (team) {
      const teamRegex = new RegExp(String(team), 'i');
      match.$or = [
        { 'fixtureId.homeTeam.name': teamRegex },
        { 'fixtureId.awayTeam.name': teamRegex },
      ];
    }

    if (Object.keys(match).length > 0) {
      pipeline.push({ $match: match });
    }

    pipeline.push({
      $sort: { 'fixtureId.kickoff': sortOrder, createdAt: sortOrder },
    });

    const predictions = await Prediction.aggregate(pipeline, {
      allowDiskUse: true,
    });

    // Populate generatedBy / userId (name + email) after aggregation
    const populated = await Prediction.populate(predictions, [
      { path: 'generatedBy', select: 'name email' },
      { path: 'userId', select: 'name email' },
    ]);

    res.json({
      success: true,
      data: populated,
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
