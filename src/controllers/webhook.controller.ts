import { NextFunction, Request, Response } from 'express';
import Stripe from 'stripe';
import { handleWebhookEvent } from '../services/stripe.service';

export const stripeWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const event = req.body as any;
    const result = await handleWebhookEvent({ event });
    res.json({
      success: true,
      data: result,
      message: 'Webhook received',
    });
  } catch (error) {
    next(error);
  }
};
