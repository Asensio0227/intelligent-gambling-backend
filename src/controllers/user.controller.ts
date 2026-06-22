import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';

export const getProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json({
      success: true,
      data: req.user,
      message: 'User profile fetched',
    });
  } catch (error) {
    next(error);
  }
};
