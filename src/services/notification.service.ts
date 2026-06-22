import { Types } from 'mongoose';
import {
  INotificationDocument,
  INotificationPayload,
  Notification,
  NotificationType,
} from '../models/Notification';

const getNotificationContent = (
  type: NotificationType,
  payload: INotificationPayload,
): { title: string; body: string } => {
  switch (type) {
    case 'ticket_created':
      return {
        title: '🎟️ Ticket Created',
        body: `Your ticket "${payload.label ?? 'New Ticket'}" has been saved with ${payload.totalLegs ?? 0} legs.`,
      };
    case 'prediction_hit':
      return {
        title: '🎯 Prediction Hit!',
        body: `${payload.market ?? 'Your prediction'} — ${payload.selection ?? ''} came in!`,
      };
    case 'ticket_won':
      return {
        title: '🏆 Ticket Won!',
        body: `Your ticket "${payload.label ?? ''}" won! ${payload.legsWon ?? 0}/${payload.totalLegs ?? 0} legs correct.`,
      };
    case 'ticket_lost':
      return {
        title: '❌ Ticket Lost',
        body: `Your ticket "${payload.label ?? ''}" lost. ${payload.legsWon ?? 0}/${payload.totalLegs ?? 0} legs correct.`,
      };
    default:
      return { title: 'Notification', body: '' };
  }
};

export const createNotification = async (
  userId: Types.ObjectId | string,
  type: NotificationType,
  payload: INotificationPayload = {},
): Promise<INotificationDocument> => {
  const { title, body } = getNotificationContent(type, payload);
  const notification = new Notification({ userId, type, title, body, payload });
  await notification.save();
  return notification;
};

export const getNotificationsForUser = async (
  userId: string,
  page = 1,
  limit = 20,
) => {
  const skip = (page - 1) * limit;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find({ userId })
      .sort({ read: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments({ userId }),
    Notification.countDocuments({ userId, read: false }),
  ]);

  return { notifications, total, unreadCount, page, limit };
};

export const markOneRead = async (
  notificationId: string,
  userId: string,
): Promise<boolean> => {
  const result = await Notification.updateOne(
    { _id: notificationId, userId },
    { read: true },
  );
  return result.modifiedCount > 0;
};

export const markAllRead = async (userId: string): Promise<number> => {
  const result = await Notification.updateMany(
    { userId, read: false },
    { read: true },
  );
  return result.modifiedCount;
};

export const deleteOneNotification = async (
  notificationId: string,
  userId: string,
): Promise<boolean> => {
  const result = await Notification.deleteOne({ _id: notificationId, userId });
  return result.deletedCount > 0;
};

export const getUnreadCount = async (userId: string): Promise<number> =>
  Notification.countDocuments({ userId, read: false });
