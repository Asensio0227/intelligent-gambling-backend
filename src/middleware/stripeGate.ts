import { Request, Response, NextFunction } from 'express';
import { enabled } from '../config/stripe';

const stripeGate = (req: Request, res: Response, next: NextFunction): void => {
  if (!enabled) {
    res.status(403).json({
      success: false,
      data: {},
      message: 'Stripe is not enabled',
      error: 'Feature disabled in this environment',
    });
    return;
  }
  next();
};

export default stripeGate;
