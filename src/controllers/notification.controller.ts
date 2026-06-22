import { NextFunction, Request, Response } from 'express';
import {
  deleteOneNotification,
  getNotificationsForUser,
  getUnreadCount,
  markAllRead,
  markOneRead,
} from '../services/notification.service';
import { errorResponse, successResponse } from '../utils/response.utils';

export const listNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!._id!.toString();
    const page = Math.max(1, parseInt(String(req.query.page ?? '')) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(String(req.query.limit ?? '')) || 20),
    );

    const result = await getNotificationsForUser(userId, page, limit);
    successResponse(res, result, 'Notifications fetched');
  } catch (error) {
    next(error);
  }
};

export const unreadCount = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!._id!.toString();
    const count = await getUnreadCount(userId);
    successResponse(res, { count }, 'Unread count fetched');
  } catch (error) {
    next(error);
  }
};

export const markRead = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!._id!.toString();
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const updated = await markOneRead(id, userId);
    if (!updated) {
      errorResponse(res, null, 'Notification not found', 404);
      return;
    }

    successResponse(res, {}, 'Notification marked as read');
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!._id!.toString();
    const count = await markAllRead(userId);
    successResponse(
      res,
      { updated: count },
      'All notifications marked as read',
    );
  } catch (error) {
    next(error);
  }
};

export const deleteNotification = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!._id!.toString();
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const deleted = await deleteOneNotification(id, userId);
    if (!deleted) {
      errorResponse(res, null, 'Notification not found', 404);
      return;
    }

    successResponse(res, {}, 'Notification deleted');
  } catch (error) {
    next(error);
  }
};
