import mongoose from 'mongoose';

const giveawayParticipationSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    giveawayId: {
      type: String,
      required: true,
      index: true,
    },
    prizeId: {
      type: String,
      required: true,
      index: true,
    },
    entryCount: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
    entryCurrency: {
      type: String,
      enum: ['VEs', 'SVEs', 'Tokens'],
      required: true,
    },
    entryAmount: {
      type: Number,
      required: true,
    },
    deviceHash: {
      type: String,
      required: true,
      index: true,
    },
    ipAddress: {
      type: String,
      default: '127.0.0.1',
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'FLAGGED', 'BLOCKED', 'CANCELLED'],
      default: 'ACTIVE',
      index: true,
    },
    transactionId: {
      type: String,
      required: true,
      unique: true,
    },
    idempotencyKey: {
      type: String,
      index: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// MANDATORY RULE: Compound unique database index guaranteeing one participation record per user per prize giveaway
giveawayParticipationSchema.index({ userId: 1, giveawayId: 1, prizeId: 1 }, { unique: true });

const GiveawayParticipation = mongoose.model('GiveawayParticipation', giveawayParticipationSchema);
export default GiveawayParticipation;
