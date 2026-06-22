import Stripe from 'stripe';

export const enabled: boolean = process.env.STRIPE_ENABLED === 'true';

export const stripeClient = (
  enabled && process.env.STRIPE_SECRET_KEY
    ? new Stripe(process.env.STRIPE_SECRET_KEY)
    : null
) as InstanceType<typeof Stripe> | null;
