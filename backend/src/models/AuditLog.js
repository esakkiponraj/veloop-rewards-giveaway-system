import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    logId: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: String,
      index: true,
    },
    giveawayId: {
      type: String,
      index: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        'USER_LOGIN',
        'JOIN_GIVEAWAY',
        'ENTRY_FEE_DEDUCTED',
        'JOIN_REJECTED',
        'DUPLICATE_ATTEMPT',
        'FRAUD_FLAGGED',
        'CLAIM_SUBMITTED',
        'WINNER_SELECTED',
        'WINNERS_DRAWN',
        'ADMIN_EVENT_UPDATED',
        'ADMIN_GIVEAWAY_STATUS_CHANGED',
        'ADMIN_CLAIM_PROCESSED',
        'AD_REWARD_CLAIMED',
        'TASK_REWARD_CLAIMED',
        'DAILY_BONUS_CLAIMED',
        'REFERRAL_BONUS_EARNED',
        'WITHDRAWAL_REQUESTED',
        'WITHDRAWAL_PROCESSED',
      ],
      index: true,
    },
    amount: {
      type: Number,
    },
    currency: {
      type: String,
    },
    result: {
      type: String,
      enum: ['SUCCESS', 'FAILURE', 'FLAGGED', 'BLOCKED'],
      required: true,
    },
    metadata: {
      type: Object,
      default: {},
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
