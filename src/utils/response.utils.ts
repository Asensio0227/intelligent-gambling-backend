import { Response } from 'express';
import { ApiResponse } from '../types/api.types';

export const successResponse = <T = unknown>(
  res: Response,
  data: T = {} as T,
  message: string = 'Success',
  statusCode: number = 200,
): Response => res.status(statusCode).json({ success: true, data, message });

export const errorResponse = (
  res: Response,
  error: unknown,
  message: string = 'An error occurred',
  statusCode: number = 500,
  devError: string | null = null,
): Response => {
  const errorMessage =
    process.env.NODE_ENV === 'development'
      ? devError || (error instanceof Error ? error.message : String(error))
      : undefined;

  const payload: ApiResponse = {
    success: false,
    message,
    error: errorMessage,
  };
  return res.status(statusCode).json(payload);
};
