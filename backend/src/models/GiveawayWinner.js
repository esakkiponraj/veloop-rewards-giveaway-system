import mongoose from 'mongoose';

const giveawayWinnerSchema = new mongoose.Schema(
  {
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
    userId: {
      type: String,
      required: true,
      index: true,
    },
    maskedUserId: {
      type: String,
      required: true,
    },
    prizeName: {
      type: String,
      required: true,
    },
    prizeType: {
      type: String,
      enum: ['PHYSICAL', 'GIFT_CARD', 'DIGITAL'],
      required: true,
    },
    claimDeadline: {
      type: Date,
      required: true,
    },
    selectionMethod: {
      type: String,
      enum: ['CRYPTOGRAPHIC_RANDOM', 'ADMIN_FINALIZED', 'SYSTEM_DRAW'],
      default: 'CRYPTOGRAPHIC_RANDOM',
    },
    status: {
      type: String,
      enum: ['SELECTED', 'CLAIM_PENDING', 'CLAIM_SUBMITTED', 'VERIFIED', 'DELIVERED', 'EXPIRED'],
      default: 'SELECTED',
      index: true,
    },
    selectedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure uniqueness per prize winner assignment
giveawayWinnerSchema.index({ giveawayId: 1, prizeId: 1, userId: 1 }, { unique: true });

const GiveawayWinner = mongoose.model('GiveawayWinner', giveawayWinnerSchema);
export default GiveawayWinner;
