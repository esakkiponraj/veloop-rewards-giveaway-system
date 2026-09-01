import http from 'http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend folder or root
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import app from './src/app.js';
import connectDB from './src/config/db.js';
import { seedDatabase } from './src/utils/seedData.js';

let server = null;

// Fatal Process Error Handler: Logs error, terminates HTTP server, closes Mongo, and exits with code 1
const handleFatalError = async (type, err) => {
  console.error(`\n[Process] FATAL ${type}:`, err);
  if (server) {
    server.close(() => {
      console.error('[Process] HTTP server closed gracefully due to fatal error.');
    });
  }
  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.error('[Process] MongoDB connection disconnected.');
    }
  } catch (dbErr) {
    console.error('[Process] Error during emergency DB disconnect:', dbErr);
  }
  process.exit(1);
};

process.on('unhandledRejection', (reason, promise) => {
  handleFatalError('Unhandled Rejection', reason);
});

process.on('uncaughtException', (err) => {
  handleFatalError('Uncaught Exception', err);
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to DB
    const conn = await connectDB();

    if (conn) {
      // Idempotently verify catalogue configuration on boot
      await seedDatabase();
    }

    server = http.createServer(app);

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ [Server Error] Port ${PORT} is already in use by another running process.`);
        console.error(`👉 Run in PowerShell to terminate the blocking process:`);
        console.error(`   Get-Process -Id (Get-NetTCPConnection -LocalPort ${PORT}).OwningProcess | Stop-Process -Force\n`);
      } else {
        console.error('[Server Error]', err);
      }
      process.exit(1);
    });

    server.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`🚀 VELOOP Rewards Backend running on port ${PORT}`);
      console.log(`📡 API Base: http://localhost:${PORT}/api`);
      console.log(`🎁 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`====================================================`);
    });

    // Graceful shutdown handling on SIGINT/SIGTERM
    const shutdown = async () => {
      console.log('\n[Server] Gracefully shutting down...');
      if (server) {
        server.close(() => {
          console.log('[Server] Closed out remaining connections.');
        });
      }
      if (mongoose.connection.readyState === 1) {
        await mongoose.disconnect();
      }
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err) {
    console.error('[Server] Fatal startup error:', err);
    process.exit(1);
  }
};

startServer();
