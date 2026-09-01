import mongoose from 'mongoose';

const giveawayEntryTransactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    giveawayId: {
      type: String,
      index: true,
    },
    prizeId: {
      type: String,
    },
    currency: {
      type: String,
      enum: ['VEs', 'SVEs', 'Tokens'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'SUCCESS', 'FAILED', 'REVERSED'],
      default: 'SUCCESS',
      index: true,
    },
    balanceBefore: {
      type: Number,
      required: true,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      enum: [
        'ENTRY_FEE',
        'REVERSAL',
        'BONUS_REFUND',
        'AD_REWARD',
        'TASK_REWARD',
        'DAILY_BONUS',
        'REFERRAL_BONUS',
        'WITHDRAW',
        'WITHDRAWAL',
      ],
      default: 'ENTRY_FEE',
      index: true,
    },
    metadata: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

const GiveawayEntryTransaction = mongoose.model(
  'GiveawayEntryTransaction',
  giveawayEntryTransactionSchema
);
export default GiveawayEntryTransaction;
