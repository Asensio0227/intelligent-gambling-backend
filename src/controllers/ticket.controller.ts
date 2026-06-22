import { NextFunction, Request, Response } from 'express';
import { Ticket } from '../models/Ticket';
import { buildSmartTicket, createTicket } from '../services/ticket.service';
import { CreateTicketBody, SmartBuildBody } from '../types/api.types';
import {
  createTicketSchema,
  smartBuildSchema,
} from '../validators/ticket.validator';

export const createNewTicket = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { value, error } = createTicketSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        data: {},
        message: 'Validation failed',
        error: error.message,
      });
      return;
    }

    const ticketData = value as CreateTicketBody;
    const userId = req.user?._id
      ? new (require('mongoose').Types.ObjectId)(req.user._id)
      : new (require('mongoose').Types.ObjectId)();
    const ticket = await createTicket({
      userId: userId.toString(),
      label: ticketData.label,
      legs: ticketData.legs.map((leg: any) => ({
        ...leg,
        predictionId: new (require('mongoose').Types.ObjectId)(
          leg.predictionId,
        ),
      })),
    });

    res
      .status(201)
      .json({ success: true, data: ticket, message: 'Ticket created' });
  } catch (error) {
    next(error);
  }
};

export const listOwnTickets = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const filter: Record<string, any> = { createdBy: req.user?._id };

    // Filter by status (won/lost/pending/partial)
    if (req.query.status) {
      filter.status = String(req.query.status).toUpperCase();
    }

    // Filter by minimum/maximum legs
    if (req.query.minLegs || req.query.maxLegs) {
      filter['summary.totalLegs'] = {};
      if (req.query.minLegs) filter['summary.totalLegs'].$gte = Number(req.query.minLegs);
      if (req.query.maxLegs) filter['summary.totalLegs'].$lte = Number(req.query.maxLegs);
    }

    // Filter by minimum/maximum average confidence
    if (req.query.minAvg || req.query.maxAvg) {
      filter['summary.averageConfidence'] = {};
      if (req.query.minAvg) filter['summary.averageConfidence'].$gte = Number(req.query.minAvg);
      if (req.query.maxAvg) filter['summary.averageConfidence'].$lte = Number(req.query.maxAvg);
    }

    // Sort: newest (default) or oldest
    const sortParam = String(req.query.sort ?? 'newest').toLowerCase();
    const sortOrder = sortParam === 'oldest' || sortParam === 'old' ? 1 : -1;

    const tickets = await Ticket.find(filter)
      .sort({ createdAt: sortOrder })
      .lean();

    res.json({
      success: true,
      data: tickets,
      message: 'User tickets fetched',
    });
  } catch (error) {
    next(error);
  }
};

export const getTicket = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const ticket = await Ticket.findById(req.params.id).lean();
    if (!ticket) {
      res.status(404).json({
        success: false,
        data: {},
        message: 'Ticket not found',
        error: 'Not found',
      });
      return;
    }

    const createdByStr = ticket.createdBy?.toString();
    const userIdStr = req.user?._id?.toString();
    const userRole = req.user?.role;

    if (
      createdByStr !== userIdStr &&
      !['admin', 'superadmin'].includes(userRole || '')
    ) {
      res.status(403).json({
        success: false,
        data: {},
        message: 'Forbidden',
        error: 'Not authorized',
      });
      return;
    }

    res.json({ success: true, data: ticket, message: 'Ticket fetched' });
  } catch (error) {
    next(error);
  }
};

export const deleteTicket = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      res.status(404).json({
        success: false,
        data: {},
        message: 'Ticket not found',
        error: 'Not found',
      });
      return;
    }

    const createdByStr = ticket.createdBy?.toString();
    const userIdStr = req.user?._id?.toString();
    const userRole = req.user?.role;

    if (
      createdByStr !== userIdStr &&
      !['admin', 'superadmin'].includes(userRole || '')
    ) {
      res.status(403).json({
        success: false,
        data: {},
        message: 'Forbidden',
        error: 'Not authorized',
      });
      return;
    }

    await Ticket.findByIdAndDelete(req.params.id);
    res.json({ success: true, data: {}, message: 'Ticket deleted' });
  } catch (error) {
    next(error);
  }
};

export const smartBuild = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { value, error } = smartBuildSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        data: {},
        message: 'Validation failed',
        error: error.message,
      });
      return;
    }

    const buildData = value as SmartBuildBody;
    const result = await buildSmartTicket(buildData);

    res.json({
      success: true,
      data: result,
      message: 'Smart ticket built',
    });
  } catch (error) {
    next(error);
  }
};
