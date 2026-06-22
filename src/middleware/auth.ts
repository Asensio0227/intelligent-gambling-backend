import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.utils';
import { User } from '../models/User';
import { tokenBlacklist } from '../utils/tokenBlacklist';

/**
 * Auth middleware — two-stage:
 *
 * 1. Verify + decode the JWT immediately (fast, no DB).
 *    Attach a lightweight `req.user` stub from the token payload so most
 *    routes (fixture reads, prediction reads) never need a DB round-trip.
 *
 * 2. For routes that need the full user document (billing, role changes, etc.)
 *    they can call `await req.loadFullUser()` themselves.
 *
 * This eliminates the 4 s DB lookup on /api/auth/me on every app launch.
 */
const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const authorization = req.headers.authorization || '';
  const token = authorization.startsWith('Bearer ')
    ? authorization.slice(7)
    : null;

  if (!token) {
    res.status(401).json({
      success: false,
      data: {},
      message: 'Unauthorized — no token provided',
      error: 'Include a Bearer token in the Authorization header.',
    });
    return;
  }

  try {
    const decoded = verifyToken(token);

    // Stage 0 — Block banned/suspended users immediately (in-memory, no DB).
    // banUser / suspendUser call tokenBlacklist.blacklistUser() on their userId.
    if (tokenBlacklist.isUserBlacklisted(decoded.userId)) {
      res.status(403).json({
        success: false,
        data: {},
        message: 'Your account has been suspended or banned. Please contact support.',
        error: 'Account suspended',
      });
      return;
    }

    // Stage 1 — fast path: build a minimal user object from the JWT payload.
    // The token was signed by us on login so userId/role are trustworthy.
    (req as any)._jwtPayload = decoded;

    // Provide a lazy loader for routes that need the full Mongo document.
    (req as any).loadFullUser = async () => {
      if (req.user && (req.user as any)._fromDb) return req.user;
      const user = await User.findById(decoded.userId).select('-password');
      if (!user || !user.isActive) return null;
      (user as any)._fromDb = true;
      req.user = user;
      return user;
    };

    // Attach a lightweight stub so req.user is always defined for downstream.
    // Routes that need billing / isActive etc. call req.loadFullUser().
    if (!req.user) {
      req.user = { _id: decoded.userId, role: decoded.role } as any;
    }

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      data: {},
      message: 'Unauthorized — token is invalid or has expired',
      error: error instanceof Error ? error.message : 'Token verification failed.',
    });
  }
};

export default authMiddleware;
