import jwt from 'jsonwebtoken';
import { repo } from '../utils/repository.js';

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'veloop_super_secure_jwt_secret_key_2026'
      );

      const user = await repo.findUserById(decoded.userId);
      if (!user) {
        return res.status(401).json({
          success: false,
          code: 'LOGIN_REQUIRED',
          message: 'User session invalid or user not found.',
        });
      }

      if (user.isFraudSuspended) {
        return res.status(403).json({
          success: false,
          code: 'PARTICIPATION_BLOCKED',
          message: 'Account has been restricted due to suspicious activities.',
        });
      }

      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        code: 'LOGIN_REQUIRED',
        message: 'Not authorized, token failed or expired.',
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      code: 'LOGIN_REQUIRED',
      message: 'Authentication token required.',
    });
  }
};

export const optionalAuth = async (req, res, next) => {
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'veloop_super_secure_jwt_secret_key_2026'
      );
      const user = await repo.findUserById(decoded.userId);
      if (user) {
        req.user = user;
      }
    } catch (err) {
      // ignore
    }
  }
  next();
};

export const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      code: 'ADMIN_ACCESS_DENIED',
      message: 'Admin authorization required for this action.',
    });
  }
};
