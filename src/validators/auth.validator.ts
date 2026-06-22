import Joi from 'joi';
import { LoginBody, RegisterBody } from '../types/api.types';

export const registerSchema: Joi.ObjectSchema<RegisterBody> = Joi.object({
  name: Joi.string().trim().min(2).required(),
  lastName: Joi.string().trim().min(2).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  dob: Joi.string()
    .pattern(/^\d{2}\/\d{2}\/\d{4}$/)
    .optional()
    .messages({ 'string.pattern.base': 'dob must be in DD/MM/YYYY format' }),
  phoneNumber: Joi.string().trim().min(7).max(15).optional(),
  physicalAddress: Joi.string().trim().min(5).optional(),
  ideaNumber: Joi.string().trim().optional(),
  gender: Joi.string().valid('male', 'female', 'other').optional(),
});

export const loginSchema: Joi.ObjectSchema<LoginBody> = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});
