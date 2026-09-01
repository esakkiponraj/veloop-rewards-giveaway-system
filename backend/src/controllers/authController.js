import jwt from 'jsonwebtoken';
import { repo } from '../utils/repository.js';

const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'veloop_super_secure_jwt_secret_key_2026',
    { expiresIn: '30d' }
  );
};

export const loginUser = async (req, res, next) => {
  try {
    const { emailOrUsername, password } = req.body;

    if (!emailOrUsername || !password) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Please provide email/username and password.',
      });
    }

    const user = await repo.findUserByEmailOrUsername(emailOrUsername);

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email/username or password.',
      });
    }

    if (user.isFraudSuspended) {
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_SUSPENDED',
        message: 'This account is suspended due to security violations.',
      });
    }

    res.json({
      success: true,
      token: generateToken(user.userId),
      user: {
        userId: user.userId,
        username: user.username,
        email: user.email,
        maskedId: user.maskedId,
        role: user.role,
        wallet: user.wallet,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await repo.findUserById(req.user.userId);
    res.json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

export const getDemoAccounts = async (req, res, next) => {
  try {
    const users = await repo.getAllDemoUsers();
    res.json({
      success: true,
      accounts: users,
    });
  } catch (error) {
    next(error);
  }
};
