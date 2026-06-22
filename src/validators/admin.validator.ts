import Joi from 'joi';
import { AdminCreateUserBody, AdminUpdateUserBody } from '../types/api.types';

export const createUserSchema: Joi.ObjectSchema<AdminCreateUserBody> = Joi.object({
  name: Joi.string().trim().min(2).required(),
  lastName: Joi.string().trim().min(2).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  role: Joi.string().valid('admin', 'user').required(),
  dob: Joi.string()
    .pattern(/^\d{2}\/\d{2}\/\d{4}$/)
    .optional()
    .messages({ 'string.pattern.base': 'dob must be in DD/MM/YYYY format' }),
  phoneNumber: Joi.string().trim().min(7).max(15).optional(),
  physicalAddress: Joi.string().trim().min(5).optional(),
  ideaNumber: Joi.string().trim().optional(),
  gender: Joi.string().valid('male', 'female', 'other').optional(),
  isActive: Joi.boolean().default(true),
});

export const updateUserSchema: Joi.ObjectSchema<AdminUpdateUserBody> = Joi.object({
  name: Joi.string().trim().min(2).optional(),
  lastName: Joi.string().trim().min(2).optional(),
  email: Joi.string().email().optional(),
  role: Joi.string().valid('admin', 'user').optional(),
  dob: Joi.string()
    .pattern(/^\d{2}\/\d{2}\/\d{4}$/)
    .optional()
    .messages({ 'string.pattern.base': 'dob must be in DD/MM/YYYY format' }),
  phoneNumber: Joi.string().trim().min(7).max(15).optional(),
  physicalAddress: Joi.string().trim().min(5).optional(),
  ideaNumber: Joi.string().trim().optional(),
  gender: Joi.string().valid('male', 'female', 'other').optional(),
  isActive: Joi.boolean().optional(),
});
