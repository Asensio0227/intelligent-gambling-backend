import mongoose from 'mongoose';
import { Fixture } from '../models/Fixture';
import { IPredictionDocument, Prediction } from '../models/Prediction';
import { ITicketDocument, Ticket } from '../models/Ticket';
import logger from '../utils/logger';
import { createNotification } from './notification.service';

interface MatchOutcome {
  winner: 'HOME' | 'AWAY' | 'DRAW';
  correctScore: string;
  goalsTotal: number;
  cornersTotal: number;
  yellowCardsTotal: number;
  highestScoringHalf: 'FIRST' | 'SECOND' | 'EQUAL';
}

interface TicketResolutionResult {
  ticketId: mongoose.Types.ObjectId;
  status: string;
  legsWon: number;
  legsLost: number;
}

const getMatchOutcome = (fixture: any): MatchOutcome => {
  const homeGoals = fixture.result?.homeGoals ?? 0;
  const awayGoals = fixture.result?.awayGoals ?? 0;
  return {
    winner:
      homeGoals > awayGoals ? 'HOME' : homeGoals < awayGoals ? 'AWAY' : 'DRAW',
    correctScore: `${homeGoals}-${awayGoals}`,
    goalsTotal: homeGoals + awayGoals,
    cornersTotal:
      (fixture.result?.corners?.home || 0) +
      (fixture.result?.corners?.away || 0),
    yellowCardsTotal:
      (fixture.result?.yellowCards?.home || 0) +
      (fixture.result?.yellowCards?.away || 0),
    highestScoringHalf: (() => {
      const first =
        (fixture.result?.htHomeGoals || 0) + (fixture.result?.htAwayGoals || 0);
      const second = homeGoals + awayGoals - first;
      if (first > second) return 'FIRST';
      if (second > first) return 'SECOND';
      return 'EQUAL';
    })(),
  };
};

const compareOverUnder = (
  total: number,
  line: number | undefined,
  side: string | boolean | undefined,
): boolean => {
  if (side === 'OVER') return total > Number(line);
  if (side === 'UNDER') return total < Number(line);
  return false;
};

export const resolvePredictionOutcomes = async (): Promise<{
  resolved: number;
}> => {
  const completedFixtures = await Fixture.find({ status: 'FT' }).lean();
  const fixtureMap = new Map(
    completedFixtures.map((fixture) => [fixture._id.toString(), fixture]),
  );

  const predictions = await Prediction.find({
    'outcome.resolved': false,
    fixtureId: {
      $in: Array.from(fixtureMap.keys()).map(
        (id) => new mongoose.Types.ObjectId(id),
      ),
    },
  });

  const updates = predictions.map(async (prediction) => {
    const fixture = fixtureMap.get(prediction.fixtureId.toString());
    if (!fixture) return null;

    const actual = getMatchOutcome(fixture);
    const accuracy = {
      result: (prediction.markets as any)?.result?.prediction === actual.winner,
      correctScore:
        (prediction.markets as any)?.correctScore?.prediction ===
        actual.correctScore,
      goalsOverUnder: compareOverUnder(
        actual.goalsTotal,
        (prediction.markets as any)?.goalsOverUnder?.line,
        (prediction.markets as any)?.goalsOverUnder?.prediction,
      ),
      bts:
        (prediction.markets as any)?.bts?.prediction === actual.goalsTotal > 0,
      cornersOverUnder: compareOverUnder(
        actual.cornersTotal,
        (prediction.markets as any)?.cornersOverUnder?.line,
        (prediction.markets as any)?.cornersOverUnder?.prediction,
      ),
      yellowCards: compareOverUnder(
        actual.yellowCardsTotal,
        (prediction.markets as any)?.yellowCards?.line,
        (prediction.markets as any)?.yellowCards?.prediction,
      ),
      highestScoringHalf:
        (prediction.markets as any)?.highestScoringHalf?.prediction ===
        actual.highestScoringHalf,
    };

    prediction.outcome = {
      resolved: true,
      resolvedAt: new Date(),
      accuracy,
    };
    await prediction.save();

    // --- Notification: fire prediction_hit per correct market ---
    if (prediction.userId) {
      const hitMarkets = Object.entries(accuracy)
        .filter(([, correct]) => correct === true)
        .map(([market]) => market);

      for (const market of hitMarkets) {
        const marketData = (prediction.markets as any)?.[market];
        createNotification(prediction.userId, 'prediction_hit', {
          ticketId: prediction._id.toString(),
          market,
          selection: String(marketData?.prediction ?? ''),
          odds: marketData?.confidence,
        }).catch((err) =>
          logger.error('Failed to create prediction_hit notification', { err }),
        );
      }
    }

    return prediction;
  });

  const resolved = (await Promise.all(updates)).filter(Boolean).length;
  return { resolved };
};

export const resolveTicketStatuses = async (): Promise<
  TicketResolutionResult[]
> => {
  const pendingTickets = await Ticket.find({ status: 'PENDING' }).populate(
    'legs.predictionId',
  );
  const results: TicketResolutionResult[] = [];

  for (const ticket of pendingTickets) {
    let legsWon = 0;
    let legsLost = 0;
    let unresolved = false;

    for (const leg of ticket.legs || []) {
      const prediction = leg.predictionId as any;
      if (!prediction || !prediction.outcome?.resolved) {
        unresolved = true;
        continue;
      }

      const accuracy =
        prediction.outcome?.accuracy?.[
          leg.market as keyof typeof prediction.outcome.accuracy
        ];
      leg.outcome = typeof accuracy === 'boolean' ? accuracy : null;

      if (accuracy === true) legsWon += 1;
      if (accuracy === false) legsLost += 1;
    }

    let status = ticket.status || 'PENDING';
    if (!unresolved) {
      if (legsLost === 0 && legsWon === (ticket.legs?.length || 0))
        status = 'WON';
      else if (legsWon > 0) status = 'PARTIAL';
      else status = 'LOST';
    }

    ticket.summary = {
      totalLegs: ticket.legs?.length || 0,
      averageConfidence: ticket.summary?.averageConfidence || 0,
      legsWon,
      legsLost,
    };
    ticket.status = status as any;
    await ticket.save();

    // --- Notifications: ticket_won or ticket_lost ---
    if (!unresolved && (status === 'WON' || status === 'LOST')) {
      const notifType = status === 'WON' ? 'ticket_won' : 'ticket_lost';
      createNotification(ticket.createdBy, notifType, {
        ticketId: ticket._id.toString(),
        label: ticket.label,
        legsWon,
        totalLegs: ticket.legs?.length || 0,
      }).catch((err) =>
        logger.error(`Failed to create ${notifType} notification`, { err }),
      );
    }

    results.push({
      ticketId: ticket._id,
      status,
      legsWon,
      legsLost,
    });
  }

  return results;
};
