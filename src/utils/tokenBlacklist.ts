const blacklist = new Set<string>();
const userBlacklist = new Set<string>();

export const blacklistToken = (token: string): void => {
  blacklist.add(token);
};

export const isTokenBlacklisted = (token: string): boolean => {
  return blacklist.has(token);
};

// Invalidate all sessions for a user by ID (ban / suspend)
export const blacklistUser = (userId: string): void => {
  userBlacklist.add(userId);
};

export const unblacklistUser = (userId: string): void => {
  userBlacklist.delete(userId);
};

export const isUserBlacklisted = (userId: string): boolean => {
  return userBlacklist.has(userId);
};

export const tokenBlacklist = {
  blacklistToken,
  isTokenBlacklisted,
  blacklistUser,
  unblacklistUser,
  isUserBlacklisted,
};
