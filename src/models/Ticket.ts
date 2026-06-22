import { Schema, model, Document, Types } from 'mongoose';

export interface ITicketLeg {
  predictionId: Types.ObjectId;
  fixtureId: Types.ObjectId;
  market?: string;
  selection?: string;
  confidence?: number;
  outcome?: boolean | null;
}

export interface ITicketSummary {
  totalLegs?: number;
  averageConfidence?: number;
  legsWon?: number | null;
  legsLost?: number | null;
}

export interface ITicket {
  createdBy: Types.ObjectId;
  label?: string;
  status?: 'PENDING' | 'WON' | 'LOST' | 'PARTIAL';
  legs?: ITicketLeg[];
  summary?: ITicketSummary;
}

export interface ITicketDocument extends ITicket, Document {}

const ticketLegSchema = new Schema<ITicketLeg>(
  {
    predictionId: {
      type: Schema.Types.ObjectId,
      ref: 'Prediction',
      required: true,
    },
    fixtureId: {
      type: Schema.Types.ObjectId,
      ref: 'Fixture',
      required: true,
    },
    market: String,
    selection: String,
    confidence: Number,
    outcome: { type: Boolean, default: null },
  },
  { _id: false },
);

const ticketSummarySchema = new Schema<ITicketSummary>(
  {
    totalLegs: Number,
    averageConfidence: Number,
    legsWon: { type: Number, default: null },
    legsLost: { type: Number, default: null },
  },
  { _id: false },
);

const ticketSchema = new Schema<ITicketDocument>(
  {
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    label: String,
    status: {
      type: String,
      enum: ['PENDING', 'WON', 'LOST', 'PARTIAL'],
      default: 'PENDING',
    },
    legs: [ticketLegSchema],
    summary: ticketSummarySchema,
  },
  { timestamps: true },
);

ticketSchema.index({ createdBy: 1, status: 1 });
ticketSchema.index({ createdAt: -1 });

export const Ticket = model<ITicketDocument>('Ticket', ticketSchema);
