import bcrypt from 'bcryptjs';
import { NextFunction, Request, Response } from 'express';
import { User } from '../models/User';
import { createCustomer } from '../services/stripe.service';
import { LoginBody, RegisterBody } from '../types/api.types';
import { IBillingData } from '../types/models.types';
import { signToken } from '../utils/jwt.utils';
import { loginSchema, registerSchema } from '../validators/auth.validator';

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { value, error } = registerSchema.validate(req.body);
    if (error) {
      res.status(400).json({ success: false, data: {}, message: 'Validation failed', error: error.message });
      return;
    }

    const registerData = value as RegisterBody;
    const existing = await User.findOne({ email: registerData.email });
    if (existing) {
      res.status(409).json({ success: false, data: {}, message: 'Email already exists', error: 'Duplicate email' });
      return;
    }

    const hashedPassword = await bcrypt.hash(registerData.password, 12);
    const billing: IBillingData = { creditsRemaining: 10, plan: 'free', stripeEnabled: false };

    if (process.env.STRIPE_ENABLED === 'true') {
      const stripeCustomer = await createCustomer({
        email: registerData.email,
        name: `${registerData.name} ${registerData.lastName}`,
      });
      if ('id' in stripeCustomer && !('stubbed' in stripeCustomer)) {
        billing.stripeCustomerId = (stripeCustomer as any).id;
        billing.stripeEnabled = true;
      }
    }

    const userCount = await User.countDocuments();
    const role = userCount === 0 ? 'superadmin' : 'user';

    const user = await User.create({
      name: registerData.name,
      lastName: registerData.lastName,
      email: registerData.email,
      password: hashedPassword,
      dob: registerData.dob,
      phoneNumber: registerData.phoneNumber,
      physicalAddress: registerData.physicalAddress,
      ideaNumber: registerData.ideaNumber,
      gender: registerData.gender,
      role,
      billing,
    });

    const token = signToken({ userId: user._id.toString(), role: user.role || 'user' });
    const { password: _p, ...userWithoutPassword } = user.toObject();
    res.status(201).json({ success: true, data: { token, user: userWithoutPassword }, message: 'User registered successfully' });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { value, error } = loginSchema.validate(req.body);
    if (error) {
      res.status(400).json({ success: false, data: {}, message: 'Validation failed', error: error.message });
      return;
    }

    const loginData = value as LoginBody;
    const user = await User.findOne({ email: loginData.email });
    if (!user) {
      res.status(401).json({ success: false, data: {}, message: 'Invalid credentials', error: 'User not found' });
      return;
    }

    const valid = await bcrypt.compare(loginData.password, user.password);
    if (!valid) {
      res.status(401).json({ success: false, data: {}, message: 'Invalid credentials', error: 'Password mismatch' });
      return;
    }

    const token = signToken({ userId: user._id.toString(), role: user.role || 'user' });
    const { password: _p, ...userWithoutPassword } = user.toObject();
    res.json({ success: true, data: { token, user: userWithoutPassword }, message: 'Login successful' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/me
 * This is the one route that intentionally loads the full user from DB
 * so the client gets up-to-date billing, role and isActive state.
 * All other protected routes use the fast JWT stub from authMiddleware.
 */
export const me = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Use lean() and select only needed fields for speed
    const user = await User.findById((req as any)._jwtPayload?.userId)
      .select('-password -__v')
      .lean();
    if (!user) {
      res.status(404).json({ success: false, data: {}, message: 'User not found' });
      return;
    }
    res.json({ success: true, data: { user }, message: 'User fetched' });
  } catch (error) {
    next(error);
  }
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json({ success: true, data: {}, message: 'Logout successful' });
  } catch (error) {
    next(error);
  }
};
