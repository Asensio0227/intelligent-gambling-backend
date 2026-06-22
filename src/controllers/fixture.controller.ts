import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Fixture, IFixture } from '../models/Fixture';
import { fetchUpcomingFixtures } from '../services/apifootball.service';
import { ApiFootballFixture } from '../types/apifootball.types';

export const mapApiFixture = (apiFixture: ApiFootballFixture): Partial<IFixture> => {
  const fixture = apiFixture.fixture || {};
  return {
    fixtureId: String(fixture.id),
    homeTeam: {
      id: String(apiFixture.teams?.home?.id || ''),
      name: apiFixture.teams?.home?.name,
      logo: apiFixture.teams?.home?.logo,
    },
    awayTeam: {
      id: String(apiFixture.teams?.away?.id || ''),
      name: apiFixture.teams?.away?.name,
      logo: apiFixture.teams?.away?.logo,
    },
    league: {
      id: String(apiFixture.league?.id || ''),
      name: apiFixture.league?.name,
      country: apiFixture.league?.country,
      logo: apiFixture.league?.logo,
    },
    kickoff: fixture.date ? new Date(fixture.date) : undefined,
    season: String(apiFixture.league?.season || ''),
    venue: apiFixture.fixture?.venue?.name,
    status: (apiFixture.fixture?.status?.short || 'NS') as any,
    result: {
      homeGoals: apiFixture.goals?.home || undefined,
      awayGoals: apiFixture.goals?.away || undefined,
      htHomeGoals: (apiFixture.score?.halftime as any)?.home,
      htAwayGoals: (apiFixture.score?.halftime as any)?.away,
      corners: {
        home: (apiFixture.statistics as any)
          ?.find((stat: any) => stat.type === 'Corner Kicks')
          ?.statistics?.find((item: any) => item.value?.endsWith('home'))?.value ||
          undefined,
        away: (apiFixture.statistics as any)
          ?.find((stat: any) => stat.type === 'Corner Kicks')
          ?.statistics?.find((item: any) => item.value?.endsWith('away'))?.value ||
          undefined,
      },
      yellowCards: {
        home: undefined,
        away: undefined,
      },
    },
  };
};

export const listFixtures = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const filter: any = {};
    if (req.query.league) filter['league.name'] = req.query.league;
    if (req.query.status) {
      if (req.query.status === 'FT') {
        // Show past fixtures — either FT status or kickoff already passed
        const now = new Date();
        filter.$or = [
          { status: { $in: ['FT', 'AET', 'PEN'] } },
          { kickoff: { $lt: now }, status: 'NS' }, // matches that should have finished
        ];
      } else {
        filter.status = req.query.status;
      }
    }
    if (req.query.from || req.query.to) {
      filter.kickoff = {};
      if (req.query.from) filter.kickoff.$gte = new Date(req.query.from as string);
      if (req.query.to) filter.kickoff.$lte = new Date(req.query.to as string);
    }

    // Search by team name — matches either home or away team
    if (req.query.search) {
      const searchRegex = new RegExp(String(req.query.search), 'i');
      const searchClause = {
        $or: [
          { 'homeTeam.name': searchRegex },
          { 'awayTeam.name': searchRegex },
        ],
      };
      // Combine with existing $or (status=FT) using $and if both are present
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, searchClause];
        delete filter.$or;
      } else {
        Object.assign(filter, searchClause);
      }
    }

    // Sort direction — defaults to ascending (soonest/oldest first)
    const sortParam = String(req.query.sort ?? 'asc').toLowerCase();
    const sortOrder = sortParam === 'desc' ? -1 : 1;

    const fixtures = await Fixture.find(filter).sort({ kickoff: sortOrder }).lean();
    res.json({
      success: true,
      data: fixtures,
      message: 'Fixtures fetched',
    });
  } catch (error) {
    next(error);
  }
};

export const getFixture = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({
        success: false,
        data: {},
        message: 'Invalid fixture ID format',
        error: 'Bad request',
      });
      return;
    }

    const fixture = await Fixture.findById(req.params.id).lean();
    if (!fixture) {
      res.status(404).json({
        success: false,
        data: {},
        message: 'Fixture not found',
        error: 'Not found',
      });
      return;
    }

    res.json({
      success: true,
      data: fixture,
      message: 'Fixture fetched',
    });
  } catch (error) {
    next(error);
  }
};

export const syncFixtures = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const fromDate = new Date().toISOString().split('T')[0];
    const toDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const apiFixtures = await fetchUpcomingFixtures(fromDate, toDate);
    const results = [];

    for (const apiFixture of apiFixtures) {
      const payload = mapApiFixture(apiFixture);
      if (!payload.fixtureId) continue;

      const fixture = await Fixture.findOneAndUpdate(
        { fixtureId: payload.fixtureId },
        payload,
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
      );
      results.push(fixture);
    }

    res.json({
      success: true,
      data: results,
      message: 'Fixtures synced',
    });
  } catch (error) {
    next(error);
  }
};

export const liveFixtures = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const fixtures = await Fixture.find({
      $or: [
        { status: 'LIVE' },
        { status: '1H' },
        { status: 'HT' },
        { status: '2H' },
        { status: 'ET' },
        { status: 'P' },
      ],
    }).sort({ kickoff: 1 }).lean();
    res.json({ success: true, data: fixtures, message: 'Live fixtures fetched' });
  } catch (error) {
    next(error);
  }
};

export const upcomingFixtures = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const now = new Date();
    const future = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000); // 45 days
    const fixtures = await Fixture.find({
      status: 'NS',
      kickoff: { $gte: now, $lte: future },
    }).sort({ kickoff: 1 }).lean();
    res.json({ success: true, data: fixtures, message: 'Upcoming fixtures fetched' });
  } catch (error) {
    next(error);
  }
};
