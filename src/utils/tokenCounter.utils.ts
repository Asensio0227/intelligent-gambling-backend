export const estimateTokensFromText = (text: string): number => {
  if (!text) return 0;
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 0.75));
};
