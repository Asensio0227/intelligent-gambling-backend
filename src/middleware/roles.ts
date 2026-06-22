import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../models/User';

export const checkRole = (...roles: UserRole[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        data: {},
        message: 'Unauthorized — valid authentication credentials are required to access this resource',
        error: 'No authenticated user found on this request. Please log in and include a valid Bearer token.',
      });
      return;
    }

    if (!roles.includes(req.user.role as UserRole)) {
      res.status(403).json({
        success: false,
        data: {},
        message: 'Forbidden — you do not have permission to perform this action',
        error: `This endpoint requires one of the following roles: [${roles.join(', ')}]. Your current role is '${req.user.role}'.`,
      });
      return;
    }

    next();
  };
