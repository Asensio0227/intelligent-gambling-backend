import jwt from 'jsonwebtoken';

export interface JwtPayload {
  userId: string;
  role: string;
  iat?: number;
  exp?: number;
}

export const signToken = (payload: JwtPayload): string => {
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  if (!secret) {
    throw new Error('JWT_SECRET is not defined');
  }
  return jwt.sign(payload, secret, { expiresIn } as any);
};

export const verifyToken = (token: string): JwtPayload => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined');
  }
  return jwt.verify(token, secret) as JwtPayload;
};
