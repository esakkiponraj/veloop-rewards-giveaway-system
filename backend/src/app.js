import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import authRoutes from './routes/authRoutes.js';
import giveawayRoutes from './routes/giveawayRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import adRoutes from './routes/adRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import referralRoutes from './routes/referralRoutes.js';
import walletRoutes from './routes/walletRoutes.js';
import { notFoundHandler, errorHandler } from './middleware/errorMiddleware.js';

import mongoose from 'mongoose';

dotenv.config();

const app = express();

// Security HTTP headers
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS configuration (Strict origins support)
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = [
  process.env.CLIENT_URL,
  !isProduction && 'http://localhost:5173',
  !isProduction && 'http://127.0.0.1:5173',
  !isProduction && 'http://localhost:3000',
  !isProduction && 'http://localhost:4173',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // In development/test, allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin && !isProduction) return callback(null, true);
      // If client origin is explicitly whitelisted
      if (origin && allowedOrigins.includes(origin)) return callback(null, true);
      // In development, permit localhost loopbacks
      if (!isProduction && origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
        return callback(null, true);
      }
      callback(new Error('CORS policy violation: Origin not permitted.'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-device-hash', 'x-idempotency-key'],
  })
);

// Request parsing & payload size protection
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Health and readiness check endpoint
app.get('/api/health', (req, res) => {
  const isMongo = mongoose.connection.readyState === 1;

  if (isProduction && !isMongo) {
    return res.status(503).json({
      status: 'UNHEALTHY',
      service: 'VELOOP Rewards Core API',
      database: 'DISCONNECTED',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  }

  res.json({
    status: isMongo ? 'HEALTHY' : (isProduction ? 'UNHEALTHY' : 'HEALTHY'),
    service: 'VELOOP Rewards Core API',
    database: isMongo ? 'CONNECTED' : 'IN_MEMORY_FALLBACK',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/giveaways', giveawayRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ads', adRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/wallet', walletRoutes);

// Error Handling Middleware
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
