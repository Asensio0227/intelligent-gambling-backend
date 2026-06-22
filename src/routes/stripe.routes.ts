import { Router } from 'express';
import {
  getPlans,
  subscribe,
  cancel,
  portal,
  purchaseCredits,
} from '../controllers/stripe.controller';
import authMiddleware from '../middleware/auth';
import { checkRole } from '../middleware/roles';
import stripeGate from '../middleware/stripeGate';

const router = Router();
router.use(authMiddleware, stripeGate);

router.get('/plans', getPlans);
router.post('/subscribe', checkRole('user', 'admin', 'superadmin'), subscribe);
router.delete('/subscribe', checkRole('user', 'admin', 'superadmin'), cancel);
router.get('/portal', checkRole('user', 'admin', 'superadmin'), portal);
router.post(
  '/credits',
  checkRole('user', 'admin', 'superadmin'),
  purchaseCredits,
);

export default router;
