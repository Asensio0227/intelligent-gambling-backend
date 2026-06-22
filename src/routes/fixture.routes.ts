import { Router } from 'express';
import {
  listFixtures,
  getFixture,
  syncFixtures,
  liveFixtures,
  upcomingFixtures,
} from '../controllers/fixture.controller';
import authMiddleware from '../middleware/auth';
import { checkRole } from '../middleware/roles';

const router = Router();

router.get('/', authMiddleware, listFixtures);
router.get('/live', authMiddleware, liveFixtures);
router.get('/upcoming', authMiddleware, upcomingFixtures);
router.get('/:id', authMiddleware, getFixture);
router.post(
  '/sync',
  authMiddleware,
  checkRole('admin', 'superadmin'),
  syncFixtures,
);

export default router;
