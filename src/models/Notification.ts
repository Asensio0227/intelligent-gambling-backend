import { Document, Schema, Types, model } from 'mongoose';

export type NotificationType =
  | 'ticket_created'
  | 'prediction_hit'
  | 'ticket_won'
  | 'ticket_lost';

export interface INotificationPayload {
  ticketId?: string;
  label?: string;
  market?: string;
  selection?: string;
  odds?: number;
  legsWon?: number;
  totalLegs?: number;
}

export interface INotification {
  userId: Types.ObjectId;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  payload: INotificationPayload;
  createdAt?: Date;
}

export interface INotificationDocument extends INotification, Document {}

const notificationSchema = new Schema<INotificationDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['ticket_created', 'prediction_hit', 'ticket_won', 'ticket_lost'],
      required: true,
    },
    title: { type: String, default: '' },
    body: { type: String, default: '' },
    read: {
      type: Boolean,
      default: false,
    },
    payload: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true },
);

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

export const Notification = model<INotificationDocument>(
  'Notification',
  notificationSchema,
);
