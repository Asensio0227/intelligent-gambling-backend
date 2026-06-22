/**
 * Unified admin / superadmin controller.
 *
 * Route-level role guards decide what each role can actually reach:
 *   - admin + superadmin  → user CRUD, tickets, predictions, fixture sync
 *   - superadmin only     → admin CRUD (promote/demote), usage stats, system config
 */
import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { Ticket } from '../models/Ticket';
import { Prediction } from '../models/Prediction';
import { MarketAccuracy } from '../models/MarketAccuracy';
import { getUsageStats } from '../services/usage.service';
import { syncFixtures } from './fixture.controller';
import { createUserSchema, updateUserSchema } from '../validators/admin.validator';
import { AdminCreateUserBody, AdminUpdateUserBody } from '../types/api.types';
import { tokenBlacklist } from '../utils/tokenBlacklist';
import logger from '../utils/logger';

// ─── Shared helpers ────────────────────────────────────────────────────────────

const notFound = (res: Response, entity: string) =>
  res.status(404).json({
    success: false,
    data: {},
    message: `${entity} not found`,
    error: `No ${entity.toLowerCase()} exists with the provided identifier`,
  });

// ─── User management (admin + superadmin) ─────────────────────────────────────

export const listUsers = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Superadmin sees everyone, admin sees only regular users
    const roleFilter =
      req.user?.role === 'superadmin'
        ? {}
        : { role: 'user' };

    const filter: Record<string, any> = { ...roleFilter };

    // Search by name or email
    if (req.query.search) {
      const searchRegex = new RegExp(String(req.query.search), 'i');
      filter.$or = [
        { name: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
      ];
    }

    // Filter by active status
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }

    // Filter by role (superadmin only)
    if (req.query.role && req.user?.role === 'superadmin') {
      filter.role = req.query.role;
    }

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: users,
      message: 'Users fetched successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const createUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { value, error } = createUserSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        data: {},
        message: 'Validation failed',
        error: error.message,
      });
      return;
    }

    const userData = value as AdminCreateUserBody;

    const existing = await User.findOne({ email: userData.email });
    if (existing) {
      res.status(409).json({
        success: false,
        data: {},
        message: 'Email already in use',
        error: 'An account with this email address already exists',
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(userData.password, 12);
    const user = await User.create({
      name: userData.name,
      lastName: userData.lastName,
      email: userData.email,
      password: hashedPassword,
      role: userData.role,
      dob: userData.dob,
      phoneNumber: userData.phoneNumber,
      physicalAddress: userData.physicalAddress,
      ideaNumber: userData.ideaNumber,
      gender: userData.gender,
      isActive: userData.isActive ?? true,
    });

    const { password: _pw, ...safeUser } = user.toObject();
    res.status(201).json({ success: true, data: safeUser, message: 'User created successfully' });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { value, error } = updateUserSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        data: {},
        message: 'Validation failed',
        error: error.message,
      });
      return;
    }

    const updateData = value as AdminUpdateUserBody;
    const user = await User.findByIdAndUpdate(req.params.id, updateData, {
      returnDocument: 'after',
    }).select('-password');

    if (!user) {
      notFound(res, 'User');
      return;
    }

    res.json({ success: true, data: user, message: 'User updated successfully' });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      notFound(res, 'User');
      return;
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, data: {}, message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Ban a user permanently — sets isActive: false and blacklists their sessions
export const banUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) { notFound(res, 'User'); return; }

    // Admins cannot ban other admins or superadmins
    if (
      req.user?.role === 'admin' &&
      (user.role === 'admin' || user.role === 'superadmin')
    ) {
      res.status(403).json({
        success: false,
        data: {},
        message: 'Admins cannot ban other admins or superadmins',
        error: 'Forbidden',
      });
      return;
    }

    // Cannot ban yourself
    if (user._id.toString() === req.user?._id?.toString()) {
      res.status(400).json({
        success: false,
        data: {},
        message: 'You cannot ban yourself',
        error: 'Bad request',
      });
      return;
    }

    user.isActive = false;
    await user.save();

    // Blacklist all active tokens for this user
    tokenBlacklist.blacklistUser(user._id.toString());

    logger.info('User banned', {
      bannedUserId: user._id,
      bannedBy: req.user?._id,
      role: req.user?.role,
    });

    const { password: _, ...userWithoutPassword } = user.toObject();
    res.json({
      success: true,
      data: userWithoutPassword,
      message: `User ${user.email} has been banned`,
    });
  } catch (error) {
    next(error);
  }
};

// Unban a user — restores isActive: true and removes from blacklist
export const unbanUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) { notFound(res, 'User'); return; }

    user.isActive = true;
    await user.save();

    // Remove from in-memory blacklist so new tokens work immediately
    tokenBlacklist.unblacklistUser(user._id.toString());

    logger.info('User unbanned', {
      unbannedUserId: user._id,
      unbannedBy: req.user?._id,
    });

    const { password: _, ...userWithoutPassword } = user.toObject();
    res.json({
      success: true,
      data: userWithoutPassword,
      message: `User ${user.email} has been unbanned`,
    });
  } catch (error) {
    next(error);
  }
};

// Suspend a user temporarily — same as ban but with a duration payload
export const suspendUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { days = 7, reason = 'Suspended by admin' } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) { notFound(res, 'User'); return; }

    if (
      req.user?.role === 'admin' &&
      (user.role === 'admin' || user.role === 'superadmin')
    ) {
      res.status(403).json({
        success: false,
        data: {},
        message: 'Admins cannot suspend other admins or superadmins',
        error: 'Forbidden',
      });
      return;
    }

    if (user._id.toString() === req.user?._id?.toString()) {
      res.status(400).json({
        success: false,
        data: {},
        message: 'You cannot suspend yourself',
        error: 'Bad request',
      });
      return;
    }

    user.isActive = false;
    await user.save();

    // Blacklist tokens immediately
    tokenBlacklist.blacklistUser(user._id.toString());

    logger.info('User suspended', {
      suspendedUserId: user._id,
      suspendedBy: req.user?._id,
      days,
      reason,
    });

    const { password: _, ...userWithoutPassword } = user.toObject();
    res.json({
      success: true,
      data: {
        user: userWithoutPassword,
        suspension: {
          days,
          reason,
          suspendedAt: new Date(),
          resumesAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
        },
      },
      message: `User ${user.email} has been suspended for ${days} days`,
    });
  } catch (error) {
    next(error);
  }
};

export const listTickets = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const filter: Record<string, any> = {};

    if (req.query.status) {
      filter.status = String(req.query.status).toUpperCase();
    }

    if (req.query.minLegs || req.query.maxLegs) {
      filter['summary.totalLegs'] = {};
      if (req.query.minLegs) filter['summary.totalLegs'].$gte = Number(req.query.minLegs);
      if (req.query.maxLegs) filter['summary.totalLegs'].$lte = Number(req.query.maxLegs);
    }

    if (req.query.minAvg || req.query.maxAvg) {
      filter['summary.averageConfidence'] = {};
      if (req.query.minAvg) filter['summary.averageConfidence'].$gte = Number(req.query.minAvg);
      if (req.query.maxAvg) filter['summary.averageConfidence'].$lte = Number(req.query.maxAvg);
    }

    const sortParam = String(req.query.sort ?? 'newest').toLowerCase();
    const sortOrder = sortParam === 'oldest' || sortParam === 'old' ? 1 : -1;

    const tickets = await Ticket.find(filter)
      .sort({ createdAt: sortOrder })
      .lean();

    res.json({
      success: true,
      data: tickets,
      message: 'All tickets fetched',
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
    const predictions = await Prediction.find().lean();
    res.json({ success: true, data: predictions, message: 'Predictions fetched successfully' });
  } catch (error) {
    next(error);
  }
};

export const adminSyncFixtures = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await syncFixtures(req, res, next);
  } catch (error) {
    next(error);
  }
};

// ─── Admin management (superadmin only) ───────────────────────────────────────

export const listAdmins = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const admins = await User.find({ role: 'admin' }).select('-password').lean();
    res.json({ success: true, data: admins, message: 'Admins fetched successfully' });
  } catch (error) {
    next(error);
  }
};

export const createAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { value, error } = createUserSchema.validate({ ...req.body, role: 'admin' });
    if (error) {
      res.status(400).json({
        success: false,
        data: {},
        message: 'Validation failed',
        error: error.message,
      });
      return;
    }

    const userData = value as AdminCreateUserBody;

    const existing = await User.findOne({ email: userData.email });
    if (existing) {
      res.status(409).json({
        success: false,
        data: {},
        message: 'Email already in use',
        error: 'An account with this email address already exists',
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(userData.password, 12);
    const admin = await User.create({
      name: userData.name,
      lastName: userData.lastName,
      email: userData.email,
      password: hashedPassword,
      role: 'admin',
      dob: userData.dob,
      phoneNumber: userData.phoneNumber,
      physicalAddress: userData.physicalAddress,
      ideaNumber: userData.ideaNumber,
      gender: userData.gender,
      isActive: userData.isActive ?? true,
    });

    const { password: _pw, ...safeAdmin } = admin.toObject();
    res.status(201).json({ success: true, data: safeAdmin, message: 'Admin created successfully' });
  } catch (error) {
    next(error);
  }
};

export const deleteAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const admin = await User.findOne({ _id: req.params.id, role: 'admin' });
    if (!admin) {
      notFound(res, 'Admin');
      return;
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, data: {}, message: 'Admin removed successfully' });
  } catch (error) {
    next(error);
  }
};

// ─── Superadmin system routes ──────────────────────────────────────────────────

export const usage = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const stats = await getUsageStats();
    res.json({ success: true, data: stats, message: 'Usage stats fetched successfully' });
  } catch (error) {
    next(error);
  }
};

export const systemConfig = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const config = {
      appName: process.env.APP_NAME,
      stripeEnabled: process.env.STRIPE_ENABLED === 'true',
      predictionMode: process.env.PREDICTION_MODE,
      openAIModel: process.env.OPENAI_MODEL,
      apiFootballHost: process.env.API_FOOTBALL_HOST,
      environment: process.env.NODE_ENV,
    };
    res.json({ success: true, data: config, message: 'System config fetched successfully' });
  } catch (error) {
    next(error);
  }
};

export const getMarketAccuracy = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const stats = await MarketAccuracy.find().sort({ market: 1 }).lean();
    res.json({ success: true, data: stats, message: 'Market accuracy fetched' });
  } catch (error) {
    next(error);
  }
};
