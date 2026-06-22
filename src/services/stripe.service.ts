import Stripe from 'stripe';
import { enabled, stripeClient } from '../config/stripe';

interface StubbedResponse {
  stubbed: true;
  message: string;
}

type StripeResult = any;

const stubbedResponse = (action: string): StubbedResponse => ({
  stubbed: true,
  message: `Stripe is not enabled in this environment: ${action}`,
});

interface CreateCustomerParams {
  email: string;
  name: string;
}

export const createCustomer = async ({
  email,
  name,
}: CreateCustomerParams): Promise<StubbedResponse | StripeResult> => {
  if (!enabled) return stubbedResponse('createCustomer');
  if (!stripeClient) throw new Error('Stripe client not initialized');
  return stripeClient.customers.create({ email, name });
};

interface CreateSubscriptionParams {
  customerId: string;
  priceId: string;
}

export const createSubscription = async ({
  customerId,
  priceId,
}: CreateSubscriptionParams): Promise<StubbedResponse | StripeResult> => {
  if (!enabled) return stubbedResponse('createSubscription');
  if (!stripeClient) throw new Error('Stripe client not initialized');
  return stripeClient.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
  });
};

interface CancelSubscriptionParams {
  subscriptionId: string;
}

export const cancelSubscription = async ({
  subscriptionId,
}: CancelSubscriptionParams): Promise<StubbedResponse | StripeResult> => {
  if (!enabled) return stubbedResponse('cancelSubscription');
  if (!stripeClient) throw new Error('Stripe client not initialized');
  return stripeClient.subscriptions.cancel(subscriptionId);
};

interface CreateBillingPortalSessionParams {
  customerId: string;
  returnUrl: string;
}

export const createBillingPortalSession = async ({
  customerId,
  returnUrl,
}: CreateBillingPortalSessionParams): Promise<
  StubbedResponse | StripeResult
> => {
  if (!enabled) return stubbedResponse('createBillingPortalSession');
  if (!stripeClient) throw new Error('Stripe client not initialized');
  return stripeClient.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
};

interface CreateCreditPurchaseParams {
  customerId: string;
  amountCents: number;
  currency?: string;
}

export const createCreditPurchase = async ({
  customerId,
  amountCents,
  currency = 'usd',
}: CreateCreditPurchaseParams): Promise<StubbedResponse | StripeResult> => {
  if (!enabled) return stubbedResponse('createCreditPurchase');
  if (!stripeClient) throw new Error('Stripe client not initialized');
  return stripeClient.paymentIntents.create({
    amount: amountCents,
    currency,
    customer: customerId,
    metadata: { credits: String(amountCents) },
  });
};

interface WebhookEventParams {
  event: any;
}

export const handleWebhookEvent = async ({
  event,
}: WebhookEventParams): Promise<
  StubbedResponse | { handled: string; data?: unknown; type?: string }
> => {
  if (!enabled) return stubbedResponse('handleWebhookEvent');
  switch (event.type) {
    case 'customer.subscription.created':
      return { handled: 'subscription.created', data: event.data.object };
    case 'customer.subscription.deleted':
      return { handled: 'subscription.deleted', data: event.data.object };
    case 'invoice.payment_succeeded':
      return { handled: 'invoice.payment_succeeded', data: event.data.object };
    case 'invoice.payment_failed':
      return { handled: 'invoice.payment_failed', data: event.data.object };
    default:
      return { handled: 'unhandled', type: event.type };
  }
};
