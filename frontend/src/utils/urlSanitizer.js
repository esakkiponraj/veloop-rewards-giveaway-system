/**
 * Strict open-redirect defense: only allows safe relative application routes
 * Unsafe or external return URLs safely fall back to '/giveaways'
 */
export const sanitizeReturnUrl = (url, defaultFallback = '/giveaways') => {
  if (!url || typeof url !== 'string') return defaultFallback;
  const trimmed = url.trim();

  // Must begin with single '/' and never '//' (protocol-relative external redirect)
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return defaultFallback;
  }

  // Reject URL schemes, backslashes, encoded slashes, or script injections
  const lower = trimmed.toLowerCase();
  if (
    lower.includes('javascript:') ||
    lower.includes('data:') ||
    lower.includes('vbscript:') ||
    lower.includes('http:') ||
    lower.includes('https:') ||
    lower.includes('%2f%2f') ||
    lower.includes('%5c') ||
    lower.includes('\\')
  ) {
    return defaultFallback;
  }

  return trimmed;
};
