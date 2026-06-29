import { Fixture } from '../models/Fixture';
import { Prediction } from '../models/Prediction';
import { Ticket } from '../models/Ticket';
import {
  IAutoGenerateTicketParams,
  IProposedLeg,
  ITicketProposal,
} from '../types/models.types';
import logger from '../utils/logger';

export const autoGenerateTickets = async (
  params: IAutoGenerateTicketParams,
): Promise<ITicketProposal[]> => {
  // 1. Fetch all predictions where:
  //    - fixture.kickoff is within next 7 days
  //    - outcome.resolved = false
  //    - Populate fixture data (homeTeam, awayTeam, league, kickoff)
  const now = new Date();
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const predictions = await Prediction.find({
    'outcome.resolved': false,
  })
    .populate({
      path: 'fixtureId',
      match: {
        kickoff: { $gte: now, $lte: sevenDaysLater },
      },
    })
    .lean();

  const validPredictions = predictions.filter((p) => p.fixtureId);

  // 2. Flatten all 7 markets across all predictions into IProposedLeg candidates array
  const candidatesMap = new Map<string, IProposedLeg>();

  for (const prediction of validPredictions) {
    const fixture = prediction.fixtureId as any;
    const markets = prediction.markets || {};

    const markets_list = [
      'result',
      'correctScore',
      'goalsOverUnder',
      'bts',
      'cornersOverUnder',
      'yellowCards',
      'highestScoringHalf',
      'doubleChance',
    ];

    for (const market of markets_list) {
      const marketData = (markets as any)[market];
      if (!marketData) continue;

      const key = `${prediction._id}-${market}`;
      const leg: IProposedLeg = {
        predictionId: prediction._id.toString(),
        fixtureId: fixture._id.toString(),
        homeTeam: fixture.homeTeam?.name || '',
        awayTeam: fixture.awayTeam?.name || '',
        league: fixture.league?.name || '',
        kickoff: fixture.kickoff,
        market,
        selection: String(marketData.prediction),
        confidence: marketData.confidence || 0,
      };
      candidatesMap.set(key, leg);
    }
  }

  let candidates = Array.from(candidatesMap.values());

  // 3. Filter candidates by params.minConfidence
  candidates = candidates.filter((c) => c.confidence >= params.minConfidence);

  // 4. If params.preferredMarkets provided, boost those markets to front of sort
  if (params.preferredMarkets && params.preferredMarkets.length > 0) {
    candidates.sort((a, b) => {
      const aIsPreferred = params.preferredMarkets?.includes(a.market) ? 1 : 0;
      const bIsPreferred = params.preferredMarkets?.includes(b.market) ? 1 : 0;
      if (aIsPreferred !== bIsPreferred) return bIsPreferred - aIsPreferred;
      return b.confidence - a.confidence;
    });
  } else {
    // 5. Sort all candidates by confidence descending
    candidates.sort((a, b) => b.confidence - a.confidence);
  }

  // 6. Build params.numberOfTickets tickets
  const proposals: ITicketProposal[] = [];
  const usedFixtureIds = new Set<string>();

  for (let i = 0; i < params.numberOfTickets; i++) {
    const legs: IProposedLeg[] = [];

    for (const candidate of candidates) {
      if (legs.length >= params.legsPerTicket) break;

      // If diversify=true: once a fixtureId is used in any ticket, skip it in subsequent tickets
      if (params.diversify && usedFixtureIds.has(candidate.fixtureId)) {
        continue;
      }

      // If diversify=false: same fixture can appear in different tickets with different markets only
      if (
        !params.diversify &&
        legs.some(
          (l) =>
            l.fixtureId === candidate.fixtureId &&
            l.market === candidate.market,
        )
      ) {
        continue;
      }

      legs.push(candidate);
      if (params.diversify) {
        usedFixtureIds.add(candidate.fixtureId);
      }
    }

    if (legs.length === 0) break;

    // 7. Calculate averageConfidence per ticket
    const averageConfidence =
      legs.reduce((sum, l) => sum + l.confidence, 0) / legs.length;

    // 8. Label each ticket
    const label = `Auto Ticket ${i + 1} — Avg ${averageConfidence.toFixed(0)}%`;

    // 9. Create proposal
    const proposal: ITicketProposal = {
      legs,
      averageConfidence,
      totalLegs: legs.length,
      label,
    };

    proposals.push(proposal);
  }

  // 10. Log stats
  logger.info('Auto-generate tickets complete', {
    candidatesFound: candidates.length,
    ticketsBuilt: proposals.length,
    avgConfidencePerTicket:
      proposals.map((p) => p.averageConfidence).reduce((a, b) => a + b, 0) /
      Math.max(proposals.length, 1),
  });

  return proposals;
};

export const confirmAndSaveTickets = async (
  proposals: ITicketProposal[],
  userId: string,
): Promise<any[]> => {
  const savedTickets = [];

  for (const proposal of proposals) {
    const legs = proposal.legs.map((leg) => ({
      predictionId: leg.predictionId,
      fixtureId: leg.fixtureId,
      market: leg.market,
      selection: leg.selection,
      confidence: leg.confidence,
      outcome: null,
    }));

    const ticket = await Ticket.create({
      createdBy: userId,
      label: proposal.label,
      status: 'PENDING',
      legs,
      summary: {
        totalLegs: proposal.totalLegs,
        averageConfidence: proposal.averageConfidence,
      },
    });

    savedTickets.push(ticket);
  }

  logger.info('Tickets saved', { count: savedTickets.length, userId });

  return savedTickets;
};
