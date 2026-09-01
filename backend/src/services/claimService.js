import mongoose from 'mongoose';
import { repo } from '../utils/repository.js';
import GiveawayWinner from '../models/GiveawayWinner.js';

export const processPrizeClaim = async ({
  userId,
  giveawayId,
  prizeId,
  claimData,
  ipAddress,
  userAgent,
}) => {
  if (mongoose.connection.readyState !== 1) {
    const error = new Error('Database service is temporarily unavailable. Please try again shortly.');
    error.code = 'SERVICE_UNAVAILABLE';
    error.statusCode = 503;
    throw error;
  }

  // 1. Verify winner status
  const winnerRecord = await repo.getUserWinnerRecord(userId, giveawayId, prizeId);
  if (!winnerRecord) {
    const error = new Error('You are not a registered winner for this giveaway event.');
    error.code = 'CLAIM_NOT_ALLOWED';
    error.statusCode = 403;
    throw error;
  }

  // 2. Check if claim deadline expired
  const now = new Date();
  if (winnerRecord.claimDeadline && now > new Date(winnerRecord.claimDeadline)) {
    winnerRecord.status = 'EXPIRED';
    await winnerRecord.save();
    const error = new Error('The prize claim window has expired. Prize allocation forfeited.');
    error.code = 'CLAIM_DEADLINE_EXPIRED';
    error.statusCode = 400;
    throw error;
  }

  // 3. Check for existing claim
  const existingClaim = await repo.getUserClaim(userId, giveawayId, prizeId);
  if (existingClaim) {
    return {
      success: true,
      alreadySubmitted: true,
      claim: existingClaim,
      message: 'Claim details have already been submitted and are in review.',
    };
  }

  // 4. Validate claim payload according to prize type
  const prizeType = winnerRecord.prizeType || 'PHYSICAL';
  const claimId = `CLM-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  const claimPayload = {
    claimId,
    giveawayId,
    prizeId: winnerRecord.prizeId,
    userId,
    winnerId: winnerRecord._id,
    claimType: prizeType,
    status: 'SUBMITTED',
    submittedAt: new Date(),
  };

  const shipping = claimData?.shippingAddress || claimData?.physicalDetails || claimData || {};
  const digital = claimData?.giftCardDetails || claimData || {};

  if (prizeType === 'PHYSICAL') {
    const fullName = shipping.fullName;
    const phoneNumber = shipping.phoneNumber;
    const addressLine = shipping.addressLine || shipping.addressLine1;
    const city = shipping.city;
    const state = shipping.state;
    const pinCode = shipping.pinCode || shipping.postalCode || shipping.pincode;

    if (!fullName || !phoneNumber || !addressLine || !city || !state || !pinCode) {
      const error = new Error('All physical shipping fields are required.');
      error.code = 'MISSING_SHIPPING_FIELDS';
      error.statusCode = 400;
      throw error;
    }

    claimPayload.physicalDetails = {
      fullName: fullName.trim(),
      phoneNumber: phoneNumber.trim(),
      addressLine: addressLine.trim(),
      city: city.trim(),
      state: state.trim(),
      pinCode: pinCode.trim(),
    };
  } else {
    const emailAddress = digital.emailAddress || digital.email;
    if (!emailAddress || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress.trim())) {
      const error = new Error('A valid email address is required for digital voucher fulfillment.');
      error.code = 'INVALID_EMAIL_ADDRESS';
      error.statusCode = 400;
      throw error;
    }

    claimPayload.giftCardDetails = {
      emailAddress: emailAddress.trim().toLowerCase(),
    };
  }

  // 6. Save Claim
  const newClaim = await repo.createClaim(claimPayload);

  // 7. Update Winner Record Status
  winnerRecord.status = 'CLAIM_SUBMITTED';
  await winnerRecord.save();

  // 8. Audit Log
  await repo.createAuditLog({
    logId: `AUD-CLAIM-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
    userId,
    giveawayId,
    action: 'CLAIM_SUBMITTED',
    result: 'SUCCESS',
    metadata: {
      prizeId: winnerRecord.prizeId,
      prizeName: winnerRecord.prizeName,
      claimType: prizeType,
    },
    ipAddress,
    userAgent,
  });

  return {
    success: true,
    message: 'Prize claim submitted successfully! Fulfillment verification is in progress.',
    claim: newClaim,
  };
};

export const getUserClaimStatus = async (userId, giveawayId) => {
  const winnerRecord = await repo.getUserWinnerRecord(userId, giveawayId);
  const claimRecord = await repo.getUserClaim(userId, giveawayId);

  return {
    isWinner: !!winnerRecord,
    winner: winnerRecord || null,
    claim: claimRecord || null,
    claimStatus: claimRecord ? claimRecord.status : winnerRecord ? 'NOT_SUBMITTED' : null,
  };
};
