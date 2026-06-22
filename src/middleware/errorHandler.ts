import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

const HTTP_MESSAGES: Record<number, string> = {
  400: 'Bad Request — the request data is invalid or malformed',
  401: 'Unauthorized — valid authentication credentials are required to access this resource',
  403: 'Forbidden — you do not have permission to perform this action',
  404: 'Not Found — the requested resource could not be found',
  409: 'Conflict — the request conflicts with existing data',
  422: 'Unprocessable Entity — the request was well-formed but contains semantic errors',
  429: 'Too Many Requests — rate limit exceeded, please slow down and try again',
  500: 'Internal Server Error — something went wrong on our end, please try again later',
  502: 'Bad Gateway — an upstream service returned an invalid response',
  503: 'Service Unavailable — the server is temporarily unable to handle requests',
};

export const errorHandler = (
  err: AppError | Error,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const errorMsg = err instanceof Error ? err.message : 'Unhandled error';

  logger.error(errorMsg, {
    stack: err instanceof Error ? err.stack : undefined,
    path: req.path,
    method: req.method,
  });

  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const friendlyMessage =
    err instanceof AppError && err.isOperational
      ? err.message
      : (HTTP_MESSAGES[statusCode] ?? HTTP_MESSAGES[500]);

  res.status(statusCode).json({
    success: false,
    data: {},
    message: friendlyMessage,
    error:
      process.env.NODE_ENV === 'development'
        ? err instanceof Error
          ? err.stack
          : String(err)
        : HTTP_MESSAGES[statusCode] ?? HTTP_MESSAGES[500],
  });
};
