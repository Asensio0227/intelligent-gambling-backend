import mongoose from 'mongoose';
import { Prediction, IPredictionDocument } from '../models/Prediction';
import { Ticket, ITicketDocument } from '../models/Ticket';
import { ITicketLeg } from '../types/models.types';
import { SmartBuildBody } from '../types/api.types';

interface SmartTicketResult {
  legs: ITicketLeg[];
  summary: {
    totalLegs: number;
    averageConfidence: number;
  };
}

export const buildSmartTicket = async ({
  fixtureIds,
  minConfidence = 70,
  minLegs = 5,
  maxLegs = 8,
  preferredMarkets = ['result', 'bts', 'goalsOverUnder'],
}: SmartBuildBody): Promise<SmartTicketResult> => {
  const objectIds = fixtureIds
    .map((id) => (mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null))
    .filter(Boolean) as mongoose.Types.ObjectId[];

  const predictions = await Prediction.find({
    fixtureId: { $in: objectIds },
  }).lean();

  const entries: ITicketLeg[] = [];

  predictions.forEach((prediction) => {
    const markets = preferredMarkets.length
      ? preferredMarkets
      : Object.keys(prediction.markets || {});
    markets.forEach((market) => {
      const marketData = (prediction.markets as any)?.[market];
      if (!marketData || marketData.confidence == null) return;
      entries.push({
        predictionId: prediction._id,
        fixtureId: prediction.fixtureId,
        market,
        selection: String(marketData.prediction),
        confidence: marketData.confidence,
      });
    });
  });

  const filtered = entries.filter((entry) => entry.confidence! >= minConfidence);
  filtered.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
  const selected = filtered.slice(0, Math.min(maxLegs, filtered.length));
  const legs = selected.slice(0, Math.max(minLegs, selected.length));

  const averageConfidence = legs.length
    ? legs.reduce((sum, item) => sum + (item.confidence || 0), 0) / legs.length
    : 0;

  return {
    legs,
    summary: {
      totalLegs: legs.length,
      averageConfidence: Number(averageConfidence.toFixed(2)),
    },
  };
};

interface CreateTicketParams {
  userId: string;
  label: string;
  legs: ITicketLeg[];
}

export const createTicket = async ({
  userId,
  label,
  legs,
}: CreateTicketParams): Promise<ITicketDocument> => {
  const averageConfidence = legs.length
    ? legs.reduce((sum, item) => sum + (item.confidence || 0), 0) / legs.length
    : 0;

  const ticket = await Ticket.create({
    createdBy: userId,
    label,
    legs,
    summary: {
      totalLegs: legs.length,
      averageConfidence: Number(averageConfidence.toFixed(2)),
      legsWon: null,
      legsLost: null,
    },
  });

  return ticket;
};
