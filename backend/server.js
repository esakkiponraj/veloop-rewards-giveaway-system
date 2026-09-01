import http from 'http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend folder or root
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import app from './src/app.js';
import connectDB from './src/config/db.js';
import { seedDatabase } from './src/utils/seedData.js';
import Giveaway from './src/models/Giveaway.js';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Connect to DB
  const conn = await connectDB();

  if (conn) {
    // Auto-seed if database is clean
    const giveawayCount = await Giveaway.countDocuments();
    if (giveawayCount === 0) {
      console.log('[Server] Database is empty. Seeding initial VELOOP giveaways and test accounts...');
      await seedDatabase();
    }
  }

  const server = http.createServer(app);

  server.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 VELOOP Rewards Backend running on port ${PORT}`);
    console.log(`📡 API Base: http://localhost:${PORT}/api`);
    console.log(`🎁 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`====================================================`);
  });
};

startServer();
