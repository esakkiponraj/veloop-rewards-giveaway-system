import mongoose from 'mongoose';
import Counter from '../models/Counter.js';
import User from '../models/User.js';
import { inMemoryDB } from '../utils/inMemoryStore.js';

const isMongoConnected = () => mongoose.connection.readyState === 1;

/**
 * Initializes the user ID counter document based on the highest existing numeric VE user ID.
 * Prevents off-by-one errors (e.g. 10843 skipping to 10844).
 */
export const initializeUserCounter = async () => {
  if (!isMongoConnected()) {
    return;
  }

  const existing = await Counter.findById('userId');
  if (existing) {
    return existing.seq;
  }

  // Find all existing VE-formatted user IDs to discover maximum numeric ID
  const users = await User.find({ userId: /^VE\d+$/ }, { userId: 1 }).lean();
  let maxNumericId = 10842; // Canonical seed maximum (Alex Vance VE10842)

  for (const u of users) {
    const num = parseInt(u.userId.replace(/^VE/, ''), 10);
    if (!isNaN(num) && num > maxNumericId) {
      maxNumericId = num;
    }
  }

  try {
    const created = await Counter.create({ _id: 'userId', seq: maxNumericId });
    return created.seq;
  } catch (err) {
    if (err.code === 11000) {
      const c = await Counter.findById('userId');
      return c.seq;
    }
    throw err;
  }
};

/**
 * Concurrency-safe atomic generation of sequential user IDs.
 * Generates exact sequential ID: maxExisting + 1 (e.g., VE10843).
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
