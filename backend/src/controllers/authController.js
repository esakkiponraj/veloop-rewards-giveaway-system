import jwt from 'jsonwebtoken';
import { repo } from '../utils/repository.js';
import { getNextUserId, computeMaskedId } from '../services/userIdService.js';
import { verifyGoogleIdToken } from '../services/googleAuthService.js';

const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'veloop_super_secure_jwt_secret_key_2026',
    { expiresIn: '30d' }
  );
};

const sanitizeUser = (user) => {
  return {
    userId: user.userId,
    name: user.name || '',
    username: user.username,
    email: user.email,
    maskedId: user.maskedId,
    role: user.role,
    wallet: user.wallet || { VEs: 0, SVEs: 0, Tokens: 0 },
    authProviders: user.authProviders || ['LOCAL'],
    isEmailVerified: !!user.isEmailVerified,
    streak: user.streak || 0,
    termsAcceptedAt: user.termsAcceptedAt || null,
    termsVersion: user.termsVersion || null,
  };
};

/**
 * Standard password login
 */
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

    const redirectUrl = user.role === 'admin' ? '/admin' : '/giveaways';

    res.json({
      success: true,
      token: generateToken(user.userId),
      user: sanitizeUser(user),
      redirectUrl,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Local email/password registration
 */
export const registerUser = async (req, res, next) => {
  try {
    // 1. Strict privileged fields defense: Reject payloads with HTTP 400 instead of silently ignoring them
    const privilegedFields = [
      'role',
      'wallet',
      'isEmailVerified',
      'googleId',
      'authProviders',
      'isAdmin',
      'admin',
      'fraudRiskScore',
      'isFraudSuspended',
      'isSuspicious',
      'fraudEvents',
    ];

    const foundPrivileged = privilegedFields.filter((field) => field in req.body);
    if (foundPrivileged.length > 0) {
      return res.status(400).json({
        success: false,
        code: 'PRIVILEGED_FIELD_REJECTED',
        message: `Registration payload must not contain privileged fields: ${foundPrivileged.join(', ')}`,
      });
    }

    const { name, username, email, password, confirmPassword, acceptTerms } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Username, email, and password are required.',
      });
    }

    const trimmedUsername = String(username).trim();
    const normalizedEmail = String(email).toLowerCase().trim();

    if (trimmedUsername.length < 3 || trimmedUsername.length > 30) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_USERNAME',
        message: 'Username must be between 3 and 30 characters.',
      });
    }

    if (!/^[a-zA-Z0-9_.]+$/.test(trimmedUsername)) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_USERNAME',
        message: 'Username may only contain letters, numbers, underscores, and periods.',
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_EMAIL',
        message: 'Please provide a valid email address.',
      });
    }

    // Authoritative password validation: minimum 10 characters
    if (typeof password !== 'string' || password.length < 10) {
      return res.status(400).json({
        success: false,
        code: 'WEAK_PASSWORD',
        message: 'Password must be at least 10 characters long.',
      });
    }

    // Authoritative bcrypt 72 UTF-8 bytes maximum length enforcement
    if (Buffer.byteLength(password, 'utf8') > 72) {
      return res.status(400).json({
        success: false,
        code: 'PASSWORD_TOO_LONG',
        message: 'Password exceeds maximum length of 72 UTF-8 bytes.',
      });
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        code: 'PASSWORD_MISMATCH',
        message: 'Passwords do not match.',
      });
    }

    // Legal terms acceptance requirement with timestamp & version recording
    if (acceptTerms !== true) {
      return res.status(400).json({
        success: false,
        code: 'TERMS_NOT_ACCEPTED',
        message: 'You must accept the platform rules and terms to register.',
      });
    }

    const CURRENT_TERMS_VERSION = '2026.1';
    const termsAcceptedAt = new Date();

    // Duplicate checks (Email and Username)
    const [existingEmail, existingUsername] = await Promise.all([
      repo.findUserByEmail(normalizedEmail),
      repo.findUserByUsername(trimmedUsername),
    ]);

    if (existingEmail || existingUsername) {
      return res.status(409).json({
        success: false,
        code: 'USER_EXISTS',
        message: 'An account with this email or username already exists.',
      });
    }

    // Concurrency-safe atomic sequential user ID generation
    const userId = await getNextUserId();
    const maskedId = computeMaskedId(userId);

    // Strictly enforce role and zero starting balances. Local users omit googleId (do not save null)
    const newUser = await repo.createUser({
      userId,
      name: name ? String(name).trim() : '',
      username: trimmedUsername,
      email: normalizedEmail,
      password,
      maskedId,
      role: 'user',
      wallet: {
        VEs: 0,
        SVEs: 0,
        Tokens: 0,
      },
      authProviders: ['LOCAL'],
      isEmailVerified: false,
      streak: 0,
      termsAcceptedAt,
      termsVersion: CURRENT_TERMS_VERSION,
    });

    res.status(201).json({
      success: true,
      token: generateToken(newUser.userId),
      user: sanitizeUser(newUser),
      redirectUrl: '/giveaways',
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        code: 'USER_EXISTS',
        message: 'An account with this email or username already exists.',
      });
    }
    next(error);
  }
};

/**
 * Google ID Token Authentication (Sign In & Sign Up)
 */
export const googleAuth = async (req, res, next) => {
  try {
    const idToken = req.body.idToken || req.body.credential;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Google ID token credential is required.',
      });
    }

    let payload;
    try {
      payload = await verifyGoogleIdToken(idToken);
    } catch (err) {
      if (err.code === 'GOOGLE_AUTH_NOT_CONFIGURED') {
        return res.status(503).json({
          success: false,
          code: 'GOOGLE_AUTH_NOT_CONFIGURED',
          message: err.message,
        });
      }
      return res.status(401).json({
        success: false,
        code: 'INVALID_GOOGLE_TOKEN',
        message: err.message || 'Google token validation failed.',
      });
    }

    // Enforce verified email from Google
    if (!payload.email_verified) {
      return res.status(400).json({
        success: false,
        code: 'GOOGLE_EMAIL_NOT_VERIFIED',
        message: 'Google account email is not verified. Please verify your email with Google first.',
      });
    }

    const googleId = payload.sub;
    const email = String(payload.email).toLowerCase().trim();
    const name = payload.name || '';

    // Check if user with this googleId already exists
    let user = await repo.findUserByGoogleId(googleId);

    if (user) {
      // Identity security: Verify that the Google token email matches the user profile email bound to this googleId
      if (user.email.toLowerCase().trim() !== email) {
        return res.status(409).json({
          success: false,
          code: 'GOOGLE_ACCOUNT_CONFLICT',
          message: 'This Google ID is already associated with a different user account.',
        });
      }

      if (user.isFraudSuspended) {
        return res.status(403).json({
          success: false,
          code: 'ACCOUNT_SUSPENDED',
          message: 'This account is suspended due to security violations.',
        });
      }

      const redirectUrl = user.role === 'admin' ? '/admin' : '/giveaways';
      return res.json({
        success: true,
        token: generateToken(user.userId),
        user: sanitizeUser(user),
        redirectUrl,
      });
    }

    // Check if account with same email already exists (Linking flow)
    const existingUser = await repo.findUserByEmail(email);

    if (existingUser) {
      // Check for Google ID conflict
      if (existingUser.googleId && existingUser.googleId !== googleId) {
        return res.status(409).json({
          success: false,
          code: 'GOOGLE_ACCOUNT_CONFLICT',
          message: 'This email is already associated with a different Google account.',
        });
      }

      // Ensure this googleId is not already bound to a different user
      const userWithGoogleId = await repo.findUserByGoogleId(googleId);
      if (userWithGoogleId && userWithGoogleId.userId !== existingUser.userId) {
        return res.status(409).json({
          success: false,
          code: 'GOOGLE_ACCOUNT_CONFLICT',
          message: 'This Google account is already linked to another user profile.',
        });
      }

      // Link Google provider to existing account safely, catching concurrent E11000 races
      try {
        const updatedUser = await repo.linkGoogleAccount(existingUser.userId, googleId);
        const redirectUrl = updatedUser.role === 'admin' ? '/admin' : '/giveaways';

        return res.json({
          success: true,
          token: generateToken(updatedUser.userId),
          user: sanitizeUser(updatedUser),
          redirectUrl,
        });
      } catch (linkErr) {
        if (linkErr.code === 11000 || (linkErr.name === 'MongoServerError' && linkErr.code === 11000)) {
          return res.status(409).json({
            success: false,
            code: 'GOOGLE_ACCOUNT_CONFLICT',
            message: 'This Google account was linked concurrently by another user.',
          });
        }
        throw linkErr;
      }
    }

    // Create brand new Google user
    const userId = await getNextUserId();
    const maskedId = computeMaskedId(userId);

    // Generate safe username from email prefix
    let baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9_.]/g, '').slice(0, 20);
    if (baseUsername.length < 3) baseUsername = `user_${userId.toLowerCase()}`;

    let finalUsername = baseUsername;
    let usernameTaken = await repo.findUserByUsername(finalUsername);
    let attempts = 0;
    while (usernameTaken && attempts < 5) {
      attempts++;
      finalUsername = `${baseUsername}_${Math.floor(100 + Math.random() * 900)}`;
      usernameTaken = await repo.findUserByUsername(finalUsername);
    }

    try {
      const newUser = await repo.createUser({
        userId,
        name,
        username: finalUsername,
        email,
        maskedId,
        role: 'user', // Always user
        wallet: {
          VEs: 0, // Zero starting balance
          SVEs: 0,
          Tokens: 0,
        },
        authProviders: ['GOOGLE'],
        googleId,
        isEmailVerified: true,
        streak: 0,
        termsAcceptedAt: new Date(),
        termsVersion: '2026.1',
      });

      res.status(201).json({
        success: true,
        token: generateToken(newUser.userId),
        user: sanitizeUser(newUser),
        redirectUrl: '/giveaways',
      });
    } catch (createErr) {
      if (createErr.code === 11000 || (createErr.name === 'MongoServerError' && createErr.code === 11000)) {
        return res.status(409).json({
          success: false,
          code: 'GOOGLE_ACCOUNT_CONFLICT',
          message: 'An account with this email or Google ID was registered concurrently.',
        });
      }
      throw createErr;
    }
  } catch (error) {
    if (error.code === 11000 || (error.name === 'MongoServerError' && error.code === 11000)) {
      return res.status(409).json({
        success: false,
        code: 'GOOGLE_ACCOUNT_CONFLICT',
        message: 'This Google account or email is already registered.',
      });
    }
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await repo.findUserById(req.user.userId);
    res.json({
      success: true,
      user: sanitizeUser(user),
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
      accounts: users.map(sanitizeUser),
    });
  } catch (error) {
    next(error);
  }
};
