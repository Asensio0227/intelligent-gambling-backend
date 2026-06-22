import bcrypt from 'bcryptjs';
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import { Fixture } from '../models/Fixture';
import { User } from '../models/User';
import logger from '../utils/logger';

const seed = async (): Promise<void> => {
  try {
    await connectDB();
    logger.info('Connected to database');

    // Clear existing data
    await User.deleteMany({});
    await Fixture.deleteMany({});

    // Get superadmin credentials from environment variables
    const superadminEmail =
      process.env.SEED_SUPERADMIN_EMAIL || 'superadmin@footballpredictor.com';
    const superadminPassword =
      process.env.SEED_SUPERADMIN_PASSWORD || 'SuperAdmin123!';

    // Create test users
    const superadminHashedPassword = await bcrypt.hash(superadminPassword, 12);
    const adminPassword = await bcrypt.hash('Admin123!', 12);
    const userPassword = await bcrypt.hash('User123!', 12);

    const users = await User.create([
      {
        name: 'Superadmin User',
        email: superadminEmail,
        password: superadminHashedPassword,
        role: 'superadmin',
        isActive: true,
        billing: { plan: 'pro', creditsRemaining: 1000 },
      },
      {
        name: 'Admin User',
        email: 'admin@footballpredictor.com',
        password: adminPassword,
        role: 'admin',
        isActive: true,
        billing: { plan: 'pro', creditsRemaining: 500 },
      },
      {
        name: 'Regular User',
        email: 'user@footballpredictor.com',
        password: userPassword,
        role: 'user',
        isActive: true,
        billing: { plan: 'free', creditsRemaining: 10 },
      },
    ]);

    logger.info('Created users', { count: users.length });
    logger.info('Superadmin credentials', { email: superadminEmail });

    // Create test fixtures
    const fixtures = await Fixture.create([
      {
        fixtureId: 'fixture-1',
        homeTeam: { id: '1', name: 'Arsenal', logo: 'arsenal.png' },
        awayTeam: { id: '2', name: 'Liverpool', logo: 'liverpool.png' },
        league: {
          id: '39',
          name: 'Premier League',
          country: 'England',
          logo: 'pl.png',
        },
        kickoff: new Date(Date.now() + 86400000),
        season: '2024',
        venue: 'Emirates Stadium',
        status: 'NS',
        predictionGenerated: false,
      },
      {
        fixtureId: 'fixture-2',
        homeTeam: { id: '3', name: 'Man City', logo: 'mancity.png' },
        awayTeam: { id: '4', name: 'Chelsea', logo: 'chelsea.png' },
        league: {
          id: '39',
          name: 'Premier League',
          country: 'England',
          logo: 'pl.png',
        },
        kickoff: new Date(Date.now() + 172800000),
        season: '2024',
        venue: 'Etihad Stadium',
        status: 'NS',
        predictionGenerated: false,
      },
    ]);

    logger.info('Created fixtures', { count: fixtures.length });
    logger.info('Database seeded successfully');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    logger.error('Seed failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
};

seed();
