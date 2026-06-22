import Joi from 'joi';
import { GeneratePredictionBody } from '../types/api.types';

export const generatePredictionSchema: Joi.ObjectSchema<GeneratePredictionBody> = Joi.object({
  fixtureId: Joi.string().required(),
  mode: Joi.string().valid('shared', 'personal').default('shared'),
});
