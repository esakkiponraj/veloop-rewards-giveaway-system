import mongoose from 'mongoose';

const fraudEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
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
    deviceHash: {
      type: String,
      index: true,
    },
    ipAddress: {
      type: String,
    },
    riskScore: {
      type: Number,
      required: true, // 0 - 100
      min: 0,
      max: 100,
    },
    riskLevel: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    signals: [
      {
        signalType: String,
        description: String,
        severity: String,
      },
    ],
    action: {
      type: String,
      enum: ['ALLOW', 'REVIEW', 'FLAGGED', 'BLOCKED'],
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const FraudEvent = mongoose.model('FraudEvent', fraudEventSchema);
export default FraudEvent;
