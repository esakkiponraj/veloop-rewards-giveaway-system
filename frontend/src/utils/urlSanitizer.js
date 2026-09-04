/**
 * Sanitizes return URLs to defend against open-redirect and phishing attacks.
 * Allows only internal absolute paths starting with a single '/' and rejects
 * protocol-relative ('//'), backslash ('/\\'), and scheme-based ('javascript:', 'data:') attacks.
 */
export const sanitizeReturnUrl = (url, defaultPath = '/giveaways') => {
  if (!url || typeof url !== 'string') return defaultPath;
  const trimmed = url.trim();

  // Must start with exactly one '/' and cannot start with '//' or '/\'
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\')) {
    return defaultPath;
  }

  // Reject URL scheme injection
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return defaultPath;
  }

  return trimmed;
};
