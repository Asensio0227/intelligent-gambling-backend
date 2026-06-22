import jwt from 'jsonwebtoken';

type Role = 'superadmin' | 'admin' | 'user';

export const generateTestToken = (userId: string, role: Role): string => {
  const secret = process.env.JWT_SECRET || 'test-secret-key';
  return jwt.sign({ userId, role }, secret, { expiresIn: '1h' });
};

export const superadminToken = (): string =>
  generateTestToken('000000000000000000000001', 'superadmin');

export const adminToken = (): string =>
  generateTestToken('000000000000000000000002', 'admin');

export const userToken = (): string =>
  generateTestToken('000000000000000000000003', 'user');
