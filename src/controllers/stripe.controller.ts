import { Request, Response, NextFunction } from 'express';
import {
  createSubscription,
  cancelSubscription,
  createBillingPortalSession,
  createCreditPurchase,
} from '../services/stripe.service';

export const getPlans = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json({
      success: true,
      data: [
        { id: 'plan_free', name: 'Free', priceCents: 0 },
        { id: 'plan_basic', name: 'Basic', priceCents: 999 },
        { id: 'plan_pro', name: 'Pro', priceCents: 1999 },
      ],
      message: 'Plans fetched',
    });
  } catch (error) {
    next(error);
  }
};

export const subscribe = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { customerId, priceId } = req.body;
    const result = await createSubscription({ customerId, priceId });
    res.json({
      success: true,
      data: result,
      message: 'Subscription created',
    });
  } catch (error) {
    next(error);
  }
};

export const cancel = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { subscriptionId } = req.body;
    const result = await cancelSubscription({ subscriptionId });
    res.json({
      success: true,
      data: result,
      message: 'Subscription cancelled',
    });
  } catch (error) {
    next(error);
  }
};

export const portal = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { customerId, returnUrl } = req.query;
    const result = await createBillingPortalSession({
      customerId: customerId as string,
      returnUrl: returnUrl as string,
    });
    res.json({
      success: true,
      data: result,
      message: 'Billing portal session created',
    });
  } catch (error) {
    next(error);
  }
};

export const purchaseCredits = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { customerId, amountCents } = req.body;
    const result = await createCreditPurchase({ customerId, amountCents });
    res.json({
      success: true,
      data: result,
      message: 'Credit purchase initiated',
    });
  } catch (error) {
    next(error);
  }
};
