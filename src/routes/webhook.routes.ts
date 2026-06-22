import express, { Router } from 'express';
import { stripeWebhook } from '../controllers/webhook.controller';

const router = Router();

router.post(
  '/stripe',
  express.raw({ type: 'application/json' }),
  stripeWebhook,
);

export default router;
