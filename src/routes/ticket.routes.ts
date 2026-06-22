import { Router } from 'express';
import {
  askQuery,
  autoGenerate,
  confirmTickets,
} from '../controllers/autoTicket.controller';
import {
  createNewTicket,
  deleteTicket,
  getTicket,
  listOwnTickets,
  smartBuild,
} from '../controllers/ticket.controller';
import authMiddleware from '../middleware/auth';

const router = Router();

// Specific routes MUST come before /:id wildcard routes
router.post('/auto-generate/confirm', authMiddleware, confirmTickets);
router.post('/auto-generate', authMiddleware, autoGenerate);
router.post('/ask', authMiddleware, askQuery);
router.post('/smart-build', authMiddleware, smartBuild);

// CRUD routes
router.post('/', authMiddleware, createNewTicket);
router.get('/', authMiddleware, listOwnTickets);
router.get('/:id', authMiddleware, getTicket);
router.delete('/:id', authMiddleware, deleteTicket);

export default router;
