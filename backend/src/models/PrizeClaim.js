import mongoose from 'mongoose';

const prizeClaimSchema = new mongoose.Schema(
  {
    claimId: {
      type: String,
      required: true,
      unique: true,
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
    userId: {
      type: String,
      required: true,
      index: true,
    },
    winnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GiveawayWinner',
    },
    claimType: {
      type: String,
      enum: ['PHYSICAL', 'GIFT_CARD', 'DIGITAL'],
      required: true,
    },
    status: {
      type: String,
      enum: ['NOT_SUBMITTED', 'SUBMITTED', 'PROCESSING', 'COMPLETED', 'EXPIRED'],
      default: 'SUBMITTED',
      index: true,
    },
    physicalDetails: {
      fullName: { type: String, trim: true },
      phoneNumber: { type: String, trim: true },
      addressLine: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      pinCode: { type: String, trim: true },
    },
    giftCardDetails: {
      emailAddress: { type: String, trim: true, lowercase: true },
    },
    trackingInformation: {
      courierPartner: String,
      trackingNumber: String,
      estimatedDeliveryDate: Date,
      voucherCode: String,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    processedAt: {
      type: Date,
    },
    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// One claim per user per prize
prizeClaimSchema.index({ userId: 1, giveawayId: 1, prizeId: 1 }, { unique: true });

const PrizeClaim = mongoose.model('PrizeClaim', prizeClaimSchema);
export default PrizeClaim;
