import rateLimit from 'express-rate-limit';

export const joinLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Max 10 join requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      code: 'RATE_LIMITED',
      message: 'Too many participation requests. Please wait a moment before trying again.',
    });
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 25 : 1000, // Generous limit in non-production for automated tests
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      code: 'RATE_LIMITED',
      message: 'Too many authentication attempts. Please try again in a few minutes.',
    });
  },
});

export const claimLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 attempts per minute
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      code: 'RATE_LIMITED',
      message: 'Too many prize claim submissions. Please wait before retrying.',
    });
  },
});
