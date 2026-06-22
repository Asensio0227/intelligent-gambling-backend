import { Router } from 'express';
import {
  getSimilarFixtures,
  getSimilarProfile,
} from '../controllers/embedding.controller';
import {
  generatePrediction,
  getPredictionByFixture,
  getPredictionById,
  listPredictions,
  predictionAccuracy,
} from '../controllers/prediction.controller';
import authMiddleware from '../middleware/auth';
import { checkRole } from '../middleware/roles';

const router = Router();

router.post(
  '/generate',
  authMiddleware,
  checkRole('admin', 'superadmin'),
  generatePrediction,
);
router.get('/fixture/:id', authMiddleware, getPredictionByFixture);
router.get(
  '/accuracy',
  authMiddleware,
  checkRole('admin', 'superadmin'),
  predictionAccuracy,
);
router.get('/:id', authMiddleware, getPredictionById);
router.get('/', authMiddleware, listPredictions);

// Embedding routes
router.get('/:id/similar', authMiddleware, getSimilarFixtures);
router.post('/similar-profile', authMiddleware, getSimilarProfile);

export default router;
