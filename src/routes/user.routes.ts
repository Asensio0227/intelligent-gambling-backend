import { Router } from 'express';
import { getProfile, updatePushToken } from '../controllers/user.controller';
import authMiddleware from '../middleware/auth';

const router = Router();

router.get('/profile', authMiddleware, getProfile);
router.patch('/push-token', authMiddleware, updatePushToken);

export default router;
