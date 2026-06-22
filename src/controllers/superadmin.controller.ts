import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { getUsageStats } from '../services/usage.service';
import { Prediction } from '../models/Prediction';

export const listAdmins = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const admins = await User.find({ role: 'admin' }).select('-password').lean();
    res.json({ success: true, data: admins, message: 'Admins fetched' });
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
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({
        success: false,
        data: {},
        message: 'Validation failed',
        error: 'Missing required fields',
      });
      return;
    }

    const existing = await User.findOne({ email });
    if (existing) {
      res.status(409).json({
        success: false,
        data: {},
        message: 'Email already exists',
        error: 'Duplicate email',
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const admin = await User.create({
      name,
      email,
      password: hashedPassword,
      role: 'admin',
    });

    res.status(201).json({ success: true, data: admin, message: 'Admin created' });
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
      res.status(404).json({
        success: false,
        data: {},
        message: 'Admin not found',
        error: 'Not found',
      });
      return;
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, data: {}, message: 'Admin removed' });
  } catch (error) {
    next(error);
  }
};

export const usage = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const stats = await getUsageStats();
    res.json({
      success: true,
      data: stats,
      message: 'Usage stats fetched',
    });
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

    res.json({
      success: true,
      data: config,
      message: 'System config fetched',
    });
  } catch (error) {
    next(error);
  }
};
