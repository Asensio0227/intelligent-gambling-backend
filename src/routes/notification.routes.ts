import { Router } from 'express';
import {
  deleteNotification,
  listNotifications,
  markAllAsRead,
  markRead,
  unreadCount,
} from '../controllers/notification.controller';
import authMiddleware from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

router.get('/', listNotifications);
router.get('/unread-count', unreadCount);
router.patch('/read-all', markAllAsRead);
router.patch('/:id/read', markRead);
router.delete('/:id', deleteNotification);

export default router;
