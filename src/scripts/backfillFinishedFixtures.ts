/**
 * backfillFinishedFixtures.ts
 *
 * One-off script to:
 *  1. Re-fetch FINISHED matches from football-data.org for the past N days
 *  2. Upsert them into MongoDB with status=FT and real scores
 *  3. Run resolvePredictionOutcomes + resolveTicketStatuses so pending tickets flip
 *
 * Usage:
 *   ts-node -e "require('dotenv').config(); require('./src/scripts/backfillFinishedFixtures')"
 * or add to package.json scripts:
 *   "backfill": "ts-node --transpile-only src/scripts/backfillFinishedFixtures.ts"
 * then run:  yarn backfill
 */

import 'dotenv/config';
import axios from 'axios';
import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import config from '../config/footballdata';
import { Fixture } from '../models/Fixture';
import { mapApiFixture } from '../controllers/fixture.controller';
import {
  resolvePredictionOutcomes,
  resolveTicketStatuses,
} from '../services/outcome.service';
import logger from '../utils/logger';
import { ApiFootballFixture } from '../types/apifootball.types';

// ── Same competition list as footballdata.service.ts ──────────────────────────
const COMPETITIONS = [
  { code: 'WC',  name: 'World Cup',          country: 'World',       leagueId: 1   },
  { code: 'CL',  name: 'Champions League',   country: 'Europe',      leagueId: 2   },
  { code: 'PL',  name: 'Premier League',     country: 'England',     leagueId: 39  },
  { code: 'PD',  name: 'La Liga',            country: 'Spain',       leagueId: 140 },
  { code: 'SA',  name: 'Serie A',            country: 'Italy',       leagueId: 135 },
  { code: 'BL1', name: 'Bundesliga',         country: 'Germany',     leagueId: 78  },
  { code: 'FL1', name: 'Ligue 1',            country: 'France',      leagueId: 61  },
  { code: 'PPL', name: 'Primeira Liga',      country: 'Portugal',    leagueId: 94  },
  { code: 'DED', name: 'Eredivisie',         country: 'Netherlands', leagueId: 88  },
];

const mapStatus = (status: string): string => {
  switch (status) {
    case 'SCHEDULED': case 'TIMED':           return 'NS';
    case 'IN_PLAY':   case 'PAUSED':          return 'LIVE';
    case 'FINISHED':                          return 'FT';
    case 'POSTPONED':                         return 'PST';
    case 'CANCELLED': case 'SUSPENDED':       return 'CANC';
    default:                                  return 'NS';
  }
};

const mapToApiFootballFixture = (
  match: any,
  competition: typeof COMPETITIONS[0],
): ApiFootballFixture => ({
  fixture: {
    id: match.id,
    referee: match.referees?.[0]?.name ?? null,
    timezone: 'Africa/Johannesburg',
    date: match.utcDate,
    timestamp: new Date(match.utcDate).getTime() / 1000,
    venue: { id: match.venue ? match.id : null, name: match.venue ?? null },
    status: {
      long: match.status,
      short: mapStatus(match.status),
      elapsed: match.minute ?? null,
    },
  },
  league: {
    id: competition.leagueId,
    name: competition.name,
    country: competition.country,
    logo: `https://media.api-sports.io/football/leagues/${competition.leagueId}.png`,
    season: match.season?.startDate
      ? new Date(match.season.startDate).getFullYear()
      : 2026,
    round: match.matchday ? `Regular Season - ${match.matchday}` : 'Unknown',
  } as any,
  teams: {
    home: {
      id: match.homeTeam?.id,
      name: match.homeTeam?.name,
      logo: match.homeTeam?.crest ?? null,
      winner: match.score?.winner === 'HOME_TEAM' ? true
             : match.score?.winner === 'AWAY_TEAM' ? false : null,
    } as any,
    away: {
      id: match.awayTeam?.id,
      name: match.awayTeam?.name,
      logo: match.awayTeam?.crest ?? null,
      winner: match.score?.winner === 'AWAY_TEAM' ? true
             : match.score?.winner === 'HOME_TEAM' ? false : null,
    } as any,
  },
  goals: {
    home: match.score?.fullTime?.home ?? null,
    away: match.score?.fullTime?.away ?? null,
  },
  score: {
    halftime:  { home: match.score?.halfTime?.home ?? null, away: match.score?.halfTime?.away ?? null },
    fulltime:  { home: match.score?.fullTime?.home ?? null, away: match.score?.fullTime?.away ?? null },
    extratime: { home: null, away: null },
    penalty:   { home: null, away: null },
  },
});

// ── Main ──────────────────────────────────────────────────────────────────────
const DAYS_BACK = 30; // covers your June 18-22 tickets and earlier

const run = async (): Promise<void> => {
  if (!config.apiKey) {
    console.error('FOOTBALL_DATA_API_KEY is not set in environment');
    process.exit(1);
  }

  await connectDB();

  const fromDate = new Date(Date.now() - DAYS_BACK * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];
  const toDate = new Date().toISOString().split('T')[0];

  console.log(`\n📅 Fetching FINISHED fixtures from ${fromDate} → ${toDate}\n`);

  let totalUpserted = 0;

  for (const competition of COMPETITIONS) {
    try {
      const url = `${config.baseUrl}/competitions/${competition.code}/matches`;
      const response = await axios.get(url, {
        headers: { 'X-Auth-Token': config.apiKey },
        params: {
          dateFrom: fromDate,
          dateTo: toDate,
          status: 'FINISHED',   // ← FINISHED only — that's the whole point
        },
      });

      const matches: any[] = response.data?.matches ?? [];
      console.log(`  ${competition.name}: ${matches.length} finished matches`);

      for (const match of matches) {
        const apiFixture = mapToApiFootballFixture(match, competition);
        const payload = mapApiFixture(apiFixture);
        if (!payload.fixtureId) continue;

        await Fixture.findOneAndUpdate(
          { fixtureId: payload.fixtureId },
          { $set: payload },
          { upsert: true },
        );
        totalUpserted++;
      }

      // Respect 10 req/min rate limit
      await new Promise(resolve => setTimeout(resolve, 6000));
    } catch (err: any) {
      // 404 = competition has no matches in this window — safe to skip
      if (err?.response?.status === 404) {
        console.log(`  ${competition.name}: no matches in range (404), skipping`);
      } else {
        console.error(`  ${competition.name}: fetch failed —`, err?.message ?? err);
      }
    }
  }

  console.log(`\n✅ Upserted ${totalUpserted} finished fixtures into MongoDB\n`);

  // ── Step 2: resolve predictions ──────────────────────────────────────────
  console.log('🔍 Resolving prediction outcomes...');
  const predictionResults = await resolvePredictionOutcomes();
  console.log(`   Resolved predictions: ${predictionResults.resolved}`);

  // ── Step 3: resolve tickets ───────────────────────────────────────────────
  console.log('🎟️  Resolving ticket statuses...');
  const ticketResults = await resolveTicketStatuses();

  const summary = ticketResults.reduce(
    (acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  console.log('\n📊 Ticket resolution summary:');
  Object.entries(summary).forEach(([status, count]) =>
    console.log(`   ${status}: ${count}`),
  );

  console.log('\n🏁 Backfill complete!\n');
  await mongoose.disconnect();
};

run().catch(err => {
  console.error('Backfill failed:', err);
  mongoose.disconnect();
  process.exit(1);
});
