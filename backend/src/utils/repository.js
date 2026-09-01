import mongoose from 'mongoose';
import User from '../models/User.js';
import Giveaway from '../models/Giveaway.js';
import Prize from '../models/Prize.js';
import GiveawayParticipation from '../models/GiveawayParticipation.js';
import GiveawayEntryTransaction from '../models/GiveawayEntryTransaction.js';
import GiveawayWinner from '../models/GiveawayWinner.js';
import PrizeClaim from '../models/PrizeClaim.js';
import FraudEvent from '../models/FraudEvent.js';
import AuditLog from '../models/AuditLog.js';
import { inMemoryDB } from './inMemoryStore.js';
import bcrypt from 'bcryptjs';

const isMongoConnected = () => mongoose.connection.readyState === 1;

const ensureMongoConnected = () => {
  if (!isMongoConnected()) {
    const error = new Error('Database service is temporarily unavailable. Please try again shortly.');
    error.code = 'SERVICE_UNAVAILABLE';
    error.statusCode = 503;
    throw error;
  }
};

export const repo = {
  // =========================================================================
  // USER OPERATIONS
  // =========================================================================
  findUserByEmailOrUsername: async (query) => {
    if (isMongoConnected()) {
      return await User.findOne({
        $or: [
          { email: query.toLowerCase().trim() },
          { username: query.trim() },
          { userId: query.trim() },
        ],
      });
    }
    const q = query.toLowerCase().trim();
    const u = inMemoryDB.users.find(
      (user) =>
        user.email.toLowerCase() === q ||
        user.username.toLowerCase() === q ||
        user.userId.toLowerCase() === q
    );
    if (!u) return null;
    return {
      ...u,
      matchPassword: async (p) => await bcrypt.compare(p, u.password),
    };
  },

  findUserById: async (userId) => {
    if (isMongoConnected()) {
      return await User.findOne({ userId }).select('-password');
    }
    const u = inMemoryDB.users.find((user) => user.userId === userId);
    if (!u) return null;
    const { password, ...safeUser } = u;
    return safeUser;
  },

  getAllDemoUsers: async () => {
    if (isMongoConnected()) {
      return await User.find({}).select('userId username email role wallet maskedId streak').limit(10);
    }
    return inMemoryDB.users.map(({ password, ...u }) => u);
  },

  updateUserWallet: async (userId, currency, newAmount) => {
    ensureMongoConnected();
    const u = await User.findOne({ userId });
    if (u) {
      u.wallet[currency] = newAmount;
      await u.save();
    }
    return u;
  },

  updateUserDailyBonus: async (userId, timestamp) => {
    ensureMongoConnected();
    const u = await User.findOne({ userId });
    if (u) {
      u.lastDailyBonusAt = timestamp;
      await u.save();
    }
    return u;
  },

  // =========================================================================
  // ADS & COMPLETION OPERATIONS
  // =========================================================================
  getAllAds: async () => {
    return inMemoryDB.ads.filter((ad) => ad.active);
  },

  getAdById: async (adId) => {
    return inMemoryDB.ads.find((ad) => ad.adId === adId);
  },

  getUserAdCompletions: async (userId) => {
    return inMemoryDB.adCompletions.filter((ac) => ac.userId === userId);
  },

  hasUserCompletedAdToday: async (userId, adId) => {
    const today = new Date().toDateString();
    return inMemoryDB.adCompletions.some(
      (ac) =>
        ac.userId === userId &&
        ac.adId === adId &&
        new Date(ac.completedAt).toDateString() === today
    );
  },

  recordAdCompletion: async (data) => {
    const record = {
      _id: `adcomp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      completedAt: new Date(),
      ...data,
    };
    inMemoryDB.adCompletions.push(record);
    return record;
  },

  // =========================================================================
  // TASKS & CLAIM OPERATIONS
  // =========================================================================
  getAllTasks: async () => {
    return inMemoryDB.tasks.filter((t) => t.active);
  },

  getTaskById: async (taskId) => {
    return inMemoryDB.tasks.find((t) => t.taskId === taskId);
  },

  getUserTaskClaims: async (userId) => {
    return inMemoryDB.taskClaims.filter((tc) => tc.userId === userId);
  },

  recordTaskClaim: async (data) => {
    const record = {
      _id: `taskclaim-${Date.now()}`,
      claimedAt: new Date(),
      ...data,
    };
    inMemoryDB.taskClaims.push(record);
    return record;
  },

  // =========================================================================
  // REFERRAL OPERATIONS
  // =========================================================================
  getUserReferrals: async (userId) => {
    return inMemoryDB.referrals.filter((ref) => ref.referrerUserId === userId);
  },

  recordReferral: async (data) => {
    const record = {
      _id: `ref-${Date.now()}`,
      referredAt: new Date(),
      ...data,
    };
    inMemoryDB.referrals.push(record);
    return record;
  },

  // =========================================================================
  // WITHDRAWAL OPERATIONS
  // =========================================================================
  createWithdrawal: async (data) => {
    const record = {
      _id: `wth-${Date.now()}`,
      status: 'PENDING',
      requestedAt: new Date(),
      ...data,
    };
    inMemoryDB.withdrawals.push(record);
    return record;
  },

  getUserWithdrawals: async (userId) => {
    return inMemoryDB.withdrawals.filter((w) => w.userId === userId);
  },

  // =========================================================================
  // UNIFIED TRANSACTIONS (Financial Audit Trail)
  // =========================================================================
  createTransaction: async (data, session = null) => {
    ensureMongoConnected();
    const docs = await GiveawayEntryTransaction.create([data], { session });
    return docs[0];
  },

  getUserTransactions: async (userId, filterType = 'ALL') => {
    if (isMongoConnected()) {
      const query = { userId };
      if (filterType && filterType !== 'ALL') {
        query.type = filterType;
      }
      return await GiveawayEntryTransaction.find(query).sort({ createdAt: -1 });
    }
    let list = inMemoryDB.transactions.filter((t) => t.userId === userId);
    if (filterType && filterType !== 'ALL') {
      list = list.filter((t) => t.type === filterType);
    }
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  // =========================================================================
  // GIVEAWAY OPERATIONS
  // =========================================================================
  getCurrentGiveaway: async () => {
    if (isMongoConnected()) {
      let gw = await Giveaway.findOne({ status: 'ACTIVE' }).populate({
        path: 'prizes',
        options: { sort: { positionRank: 1 } },
      });
      if (!gw) gw = await Giveaway.findOne({ status: 'UPCOMING' }).populate('prizes');
      if (!gw) gw = await Giveaway.findOne().sort({ createdAt: -1 }).populate('prizes');
      return gw;
    }
    return (
      inMemoryDB.giveaways.find((g) => g.status === 'ACTIVE') ||
      inMemoryDB.giveaways[0]
    );
  },

  getGiveawayById: async (id) => {
    if (isMongoConnected()) {
      return await Giveaway.findOne({
        $or: [{ giveawayId: id }, { slug: id }],
      }).populate({
        path: 'prizes',
        options: { sort: { positionRank: 1 } },
      });
    }
    const gw = inMemoryDB.giveaways.find((g) => g.giveawayId === id || g.slug === id);
    if (gw && (!gw.prizes || gw.prizes.length === 0)) {
      gw.prizes = inMemoryDB.prizes.filter((p) => p.giveawayId === gw.giveawayId);
    }
    return gw;
  },

  getPreviousGiveaways: async () => {
    if (isMongoConnected()) {
      return await Giveaway.find({ status: { $in: ['ENDED', 'ARCHIVED'] } })
        .sort({ endAt: -1 })
        .populate('prizes');
    }
    return inMemoryDB.giveaways.filter((g) => g.status === 'ENDED' || g.status === 'ARCHIVED');
  },

  getPrizeByIdOrSlug: async (giveawayId, prizeIdentifier) => {
    if (isMongoConnected()) {
      return await Prize.findOne({
        giveawayId,
        $or: [{ prizeId: prizeIdentifier }, { slug: prizeIdentifier }],
      });
    }
    return inMemoryDB.prizes.find(
      (p) => p.giveawayId === giveawayId && (p.prizeId === prizeIdentifier || p.slug === prizeIdentifier)
    );
  },

  getPrizeBySlug: async (slug) => {
    if (isMongoConnected()) {
      const prize = await Prize.findOne({ $or: [{ slug }, { prizeId: slug }] });
      if (!prize) return { prize: null, giveaway: null };
      const giveaway = await Giveaway.findOne({ giveawayId: prize.giveawayId }).populate('prizes');
      return { prize, giveaway };
    }
    const prize = inMemoryDB.prizes.find((p) => p.slug === slug || p.prizeId === slug);
    if (!prize) return { prize: null, giveaway: null };
    const giveaway = inMemoryDB.giveaways.find((g) => g.giveawayId === prize.giveawayId);
    return { prize, giveaway };
  },

  // =========================================================================
  // PARTICIPATION OPERATIONS (Strict Persistent MongoDB)
  // =========================================================================
  getUserParticipation: async (userId, giveawayId, prizeId = null) => {
    ensureMongoConnected();
    const query = { userId, giveawayId };
    if (prizeId) {
      query.prizeId = prizeId;
    }
    return await GiveawayParticipation.findOne(query);
  },

  createParticipation: async (data, session = null) => {
    ensureMongoConnected();
    const docs = await GiveawayParticipation.create([data], { session });
    return docs[0];
  },

  getUserParticipations: async (userId) => {
    ensureMongoConnected();
    return await GiveawayParticipation.find({ userId }).sort({ joinedAt: -1 });
  },

  // =========================================================================
  // WINNERS OPERATIONS (Strict Persistent MongoDB)
  // =========================================================================
  getGiveawayWinners: async (giveawayId) => {
    if (isMongoConnected()) {
      return await GiveawayWinner.find({ giveawayId }).sort({ selectedAt: -1 });
    }
    return (inMemoryDB.winners || []).filter((w) => w.giveawayId === giveawayId);
  },

  getAllPreviousWinners: async () => {
    if (isMongoConnected()) {
      return await GiveawayWinner.find({}).sort({ selectedAt: -1 }).limit(50);
    }
    return inMemoryDB.winners || [];
  },

  getUserWinnerRecord: async (userId, giveawayId, prizeId = null) => {
    ensureMongoConnected();
    const query = { userId, giveawayId };
    if (prizeId) {
      query.prizeId = prizeId;
    }
    return await GiveawayWinner.findOne(query);
  },

  // =========================================================================
  // CLAIMS OPERATIONS (Strict Persistent MongoDB)
  // =========================================================================
  getUserClaim: async (userId, giveawayId, prizeId = null) => {
    ensureMongoConnected();
    const query = { userId, giveawayId };
    if (prizeId) {
      query.prizeId = prizeId;
    }
    return await PrizeClaim.findOne(query);
  },

  createClaim: async (data, session = null) => {
    ensureMongoConnected();
    const docs = await PrizeClaim.create([data], { session });
    return docs[0];
  },

  getAllClaims: async () => {
    ensureMongoConnected();
    return await PrizeClaim.find({}).sort({ submittedAt: -1 });
  },

  // =========================================================================
  // TELEMETRY & AUDIT LOGS (Strict Persistent MongoDB)
  // =========================================================================
  createAuditLog: async (data, session = null) => {
    ensureMongoConnected();
    const docs = await AuditLog.create([data], { session });
    return docs[0];
  },

  createFraudEvent: async (data, session = null) => {
    ensureMongoConnected();
    const docs = await FraudEvent.create([data], { session });
    return docs[0];
  },

  getFraudEvents: async () => {
    ensureMongoConnected();
    return await FraudEvent.find().sort({ createdAt: -1 }).limit(100);
  },

  getAuditLogs: async () => {
    ensureMongoConnected();
    return await AuditLog.find().sort({ timestamp: -1 }).limit(100);
  },
};
