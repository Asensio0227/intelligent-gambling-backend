import { Router } from 'express';
import { getProfile } from '../controllers/user.controller';
import authMiddleware from '../middleware/auth';

const router = Router();

router.get('/profile', authMiddleware, getProfile);

export default router;
