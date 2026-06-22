import { NextFunction, Request, Response } from 'express';
import {
  autoGenerateTickets,
  confirmAndSaveTickets,
} from '../services/autoTicket.service';
import { parseNaturalLanguageQuery } from '../services/naturalLanguage.service';
import { createNotification } from '../services/notification.service';
import {
  IAutoGenerateTicketParams,
  ITicketProposal,
} from '../types/models.types';
import logger from '../utils/logger';
import {
  askQuerySchema,
  autoGenerateSchema,
  confirmTicketsSchema,
} from '../validators/ticket.validator';

export const autoGenerate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { value, error } = autoGenerateSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        data: {},
        message: 'Validation failed',
        error: error.message,
      });
      return;
    }

    const params = value as IAutoGenerateTicketParams;
    const proposals = await autoGenerateTickets(params);

    res.json({
      success: true,
      data: proposals,
      message: 'Auto-tickets generated',
    });
  } catch (error) {
    next(error);
  }
};

export const confirmTickets = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { value, error } = confirmTicketsSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        data: {},
        message: 'Validation failed',
        error: error.message,
      });
      return;
    }

    const { proposals } = value as { proposals: ITicketProposal[] };
    const userId = req.user?._id?.toString() || '';

    const savedTickets = await confirmAndSaveTickets(proposals, userId);

    // --- Notification: ticket_created for each saved ticket ---
    for (const ticket of savedTickets) {
      createNotification(userId, 'ticket_created', {
        ticketId: (ticket as any)._id?.toString(),
        label: ticket.label,
        totalLegs: ticket.legs?.length,
      }).catch((err) =>
        logger.error('Failed to create ticket_created notification', { err }),
      );
    }

    res.json({
      success: true,
      data: savedTickets,
      message: 'Tickets confirmed and saved',
    });
  } catch (error) {
    next(error);
  }
};

export const askQuery = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { value, error } = askQuerySchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        data: {},
        message: 'Validation failed',
        error: error.message,
      });
      return;
    }

    const { query } = value as { query: string };

    const parsedParams = await parseNaturalLanguageQuery(query);
    const proposals = await autoGenerateTickets(parsedParams);

    res.json({
      success: true,
      data: {
        proposals,
        parsedParams,
      },
      message: 'Natural language query processed',
    });
  } catch (error) {
    next(error);
  }
};
