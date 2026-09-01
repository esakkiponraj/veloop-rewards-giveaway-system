import { repo } from '../utils/repository.js';

export const processPrizeClaim = async ({
  userId,
  giveawayId,
  prizeId,
  claimData,
  ipAddress,
  userAgent,
}) => {
  // 1. Authoritative Winner Check
  const winnerRecord = await repo.getUserWinnerRecord(userId, giveawayId);
  if (!winnerRecord) {
    const error = new Error('You are not registered as a winner for this prize/giveaway event.');
    error.code = 'CLAIM_NOT_ALLOWED';
    error.statusCode = 403;
    throw error;
  }

  // 2. Deadline Check
  const now = new Date();
  if (now > new Date(winnerRecord.claimDeadline)) {
    const error = new Error('The claim window for this prize has expired.');
    error.code = 'CLAIM_EXPIRED';
    error.statusCode = 400;
    throw error;
  }

  // 3. Existing Claim Check
  const existingClaim = await repo.getUserClaim(userId, giveawayId);
  if (existingClaim) {
    return {
      success: true,
      message: 'Claim details already submitted and under processing.',
      claim: existingClaim,
      alreadySubmitted: true,
    };
  }

  // 4. Authoritative Prize Verification
  const { prize } = await repo.getPrizeBySlug(winnerRecord.prizeId || prizeId);
  const prizeType = prize ? prize.prizeType : winnerRecord.prizeType || 'PHYSICAL';

  // 5. Input Validation Based on Authoritative Prize Type
  const claimId = `CLM-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  let claimPayload = {
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
    const pinCode = shipping.pinCode || shipping.postalCode;

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

  // 7. Audit Log
  await repo.createAuditLog({
    logId: `AUD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
    userId,
    giveawayId,
    action: 'CLAIM_SUBMITTED',
    result: 'SUCCESS',
    metadata: {
      claimId,
      prizeId: winnerRecord.prizeId,
      prizeType,
    },
    ipAddress,
    userAgent,
  });

  return {
    success: true,
    message: 'Prize claim successfully submitted! Our reward fulfillment team will process your dispatch.',
    claim: newClaim,
  };
};

export const getUserClaimStatus = async (userId, giveawayId) => {
  const winner = await repo.getUserWinnerRecord(userId, giveawayId);
  if (!winner) {
    return { isWinner: false, claim: null };
  }

  const claim = await repo.getUserClaim(userId, giveawayId);
  return {
    isWinner: true,
    winner,
    claim: claim || null,
    claimStatus: claim ? claim.status : 'NOT_SUBMITTED',
  };
};
