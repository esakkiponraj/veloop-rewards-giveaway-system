import mongoose from 'mongoose';
import Counter from '../models/Counter.js';
import User from '../models/User.js';
import { inMemoryDB } from '../utils/inMemoryStore.js';

const isMongoConnected = () => mongoose.connection.readyState === 1;

/**
 * Initializes the user ID counter document based on the highest existing numeric VE user ID.
 * Uses atomic $max initialization, duplicate initialization retry, and guarantees monotonic allocation.
 *
 * System Guarantee: Uniqueness and monotonic allocation only. Does NOT claim permanently gapless IDs.
 */
export const initializeUserCounter = async () => {
  if (!isMongoConnected()) {
    return;
  }

  // Discover maximum numeric existing user ID across all VE-formatted user records
  const users = await User.find({ userId: /^VE\d+$/ }, { userId: 1 }).lean();
  let maxNumericId = 10842; // Canonical seed maximum (Alex Vance VE10842)

  for (const u of users) {
    const num = parseInt(u.userId.replace(/^VE/, ''), 10);
    if (!isNaN(num) && num > maxNumericId) {
      maxNumericId = num;
    }
  }

  try {
    // Atomic $max initialization: sets initial sequence if new, guarantees counter never decrements
    const counter = await Counter.findOneAndUpdate(
      { _id: 'userId' },
      {
        $setOnInsert: { _id: 'userId' },
        $max: { seq: maxNumericId },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return counter.seq;
  } catch (err) {
    // Duplicate initialization race retry
    if (err.code === 11000 || (err.name === 'MongoServerError' && err.code === 11000)) {
      const c = await Counter.findById('userId');
      return c ? c.seq : maxNumericId;
    }
    throw err;
  }
};

/**
 * Concurrency-safe atomic generation of sequential user IDs via atomic $inc.
 * Guarantees uniqueness and monotonic allocation.
 */
export const getNextUserId = async () => {
  if (isMongoConnected()) {
    await initializeUserCounter();

    const counter = await Counter.findOneAndUpdate(
      { _id: 'userId' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    return `VE${String(counter.seq).padStart(5, '0')}`;
  }

  // Fallback in-memory store support
  if (typeof inMemoryDB.getNextSequence === 'function') {
    const seq = inMemoryDB.getNextSequence('userId');
    return `VE${String(seq).padStart(5, '0')}`;
  }

  if (!inMemoryDB._userSeq) {
    let maxNumericId = 10842;
    for (const u of inMemoryDB.users) {
      if (u.userId && /^VE\d+$/.test(u.userId)) {
        const num = parseInt(u.userId.replace(/^VE/, ''), 10);
        if (!isNaN(num) && num > maxNumericId) {
          maxNumericId = num;
        }
      }
    }
    inMemoryDB._userSeq = maxNumericId;
  }

  inMemoryDB._userSeq += 1;
  return `VE${String(inMemoryDB._userSeq).padStart(5, '0')}`;
};

/**
 * Computes privacy-masked ID from user ID (e.g. VE10843 -> VE****43)
 */
export const computeMaskedId = (userId) => {
  if (!userId) return 'VE****00';
  return `VE****${userId.slice(-2)}`;
};
