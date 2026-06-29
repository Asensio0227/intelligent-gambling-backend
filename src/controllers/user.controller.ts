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

export const updatePushToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!._id!.toString();
    const { pushToken } = req.body as { pushToken?: string };

    if (!pushToken || typeof pushToken !== 'string') {
      res.status(400).json({
        success: false,
        data: {},
        message: 'pushToken is required',
      });
      return;
    }

    await User.findByIdAndUpdate(userId, { pushToken });

    res.json({
      success: true,
      data: {},
      message: 'Push token updated',
    });
  } catch (error) {
    next(error);
  }
};
