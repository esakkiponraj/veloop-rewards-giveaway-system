export const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    code: 'ROUTE_NOT_FOUND',
    message: `Resource not found: ${req.originalUrl}`,
  });
};

export const errorHandler = (err, req, res, next) => {
  // Mongoose duplicate key error handler
  if (err.code === 11000) {
    const isParticipationDuplicate =
      err.keyPattern && err.keyPattern.userId && err.keyPattern.giveawayId;
    return res.status(409).json({
      success: false,
      code: isParticipationDuplicate ? 'ALREADY_PARTICIPATING' : 'DUPLICATE_RESOURCE',
      message: isParticipationDuplicate
        ? "You're already participating in this giveaway event. Only one entry is allowed per user."
        : 'A record with this identifier already exists.',
    });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((val) => val.message);
    return res.status(400).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: messages.join(', '),
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      code: 'LOGIN_REQUIRED',
      message: 'Invalid or expired session. Please log in again.',
    });
  }

  const statusCode = err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);
  res.status(statusCode).json({
    success: false,
    code: err.code || 'INTERNAL_SERVER_ERROR',
    message:
      process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred. Please try again later.'
        : err.message || 'Server error',
  });
};
