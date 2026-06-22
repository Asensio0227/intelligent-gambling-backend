import { Document, Schema, model } from 'mongoose';

export interface IBillingData {
  stripeCustomerId?: string;
  plan?: 'free' | 'basic' | 'pro';
  creditsRemaining?: number;
  creditsUsed?: number;
  billingCycleStart?: Date;
  stripeSubscriptionId?: string;
  stripeEnabled?: boolean;
}

export type UserRole = 'superadmin' | 'admin' | 'user';
export type Gender = 'male' | 'female' | 'other';

export interface IUser {
  name: string;
  lastName: string;
  email: string;
  password: string;
  dob?: string;
  phoneNumber?: string;
  physicalAddress?: string;
  ideaNumber?: string;
  gender?: Gender;
  role?: UserRole;
  isActive?: boolean;
  billing?: IBillingData;
}

export interface IUserDocument extends IUser, Document {}

const billingSchema = new Schema<IBillingData>(
  {
    stripeCustomerId: String,
    plan: { type: String, enum: ['free', 'basic', 'pro'], default: 'free' },
    creditsRemaining: { type: Number, default: 10 },
    creditsUsed: { type: Number, default: 0 },
    billingCycleStart: Date,
    stripeSubscriptionId: String,
    stripeEnabled: { type: Boolean, default: false },
  },
  { _id: false },
);

const userSchema = new Schema<IUserDocument>(
  {
    name: { type: String, required: true },
    lastName: { type: String, required: true },
    email: {
      type: String,
      unique: true,
      required: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true },
    dob: { type: String },
    phoneNumber: { type: String, trim: true },
    physicalAddress: { type: String, trim: true },
    ideaNumber: { type: String, trim: true },
    gender: { type: String, enum: ['male', 'female', 'other'] },
    role: {
      type: String,
      enum: ['superadmin', 'admin', 'user'],
      default: 'user',
    },
    isActive: { type: Boolean, default: true },
    billing: { type: billingSchema, default: () => ({}) },
  },
  { timestamps: true },
);

export const User = model<IUserDocument>('User', userSchema);
