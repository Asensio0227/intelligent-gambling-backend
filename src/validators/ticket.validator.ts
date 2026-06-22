import Joi from 'joi';
import { CreateTicketBody, SmartBuildBody } from '../types/api.types';

export const createTicketSchema: Joi.ObjectSchema<CreateTicketBody> =
  Joi.object({
    label: Joi.string().trim().required(),
    legs: Joi.array()
      .items(
        Joi.object({
          predictionId: Joi.string().required(),
          fixtureId: Joi.string().required(),
          market: Joi.string().required(),
          selection: Joi.string().required(),
          confidence: Joi.number().min(0).max(100).required(),
        }),
      )
      .min(1)
      .required(),
  });

export const smartBuildSchema: Joi.ObjectSchema<SmartBuildBody> = Joi.object({
  fixtureIds: Joi.array().items(Joi.string()).min(1).required(),
  minConfidence: Joi.number().min(0).max(100).default(70),
  minLegs: Joi.number().min(1).default(5),
  maxLegs: Joi.number().min(1).default(8),
  preferredMarkets: Joi.array()
    .items(
      Joi.string().valid(
        'result',
        'bts',
        'goalsOverUnder',
        'correctScore',
        'cornersOverUnder',
        'yellowCards',
        'highestScoringHalf',
      ),
    )
    .default(['result', 'bts', 'goalsOverUnder']),
});

export const autoGenerateSchema = Joi.object({
  numberOfTickets: Joi.number().min(1).max(10).default(3),
  legsPerTicket: Joi.number().min(5).max(8).default(5),
  minConfidence: Joi.number().min(0).max(100).default(70),
  diversify: Joi.boolean().default(true),
  preferredMarkets: Joi.array()
    .items(
      Joi.string().valid(
        'result',
        'correctScore',
        'goalsOverUnder',
        'bts',
        'cornersOverUnder',
        'yellowCards',
        'highestScoringHalf',
      ),
    )
    .optional(),
});

export const askQuerySchema = Joi.object({
  query: Joi.string().min(3).max(500).required(),
});

export const confirmTicketsSchema = Joi.object({
  proposals: Joi.array().items(Joi.object()).min(1).max(10).required(),
});
