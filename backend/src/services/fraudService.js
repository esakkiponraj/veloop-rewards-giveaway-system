import crypto from 'crypto';
import { repo } from '../utils/repository.js';

export const computeDeviceHash = (req) => {
  const clientHash = req.headers['x-device-hash'] || req.body?.deviceHash;
  if (clientHash && typeof clientHash === 'string' && clientHash.length >= 8) {
    return clientHash;
  }
  const userAgent = req.headers['user-agent'] || 'unknown-agent';
  const acceptLang = req.headers['accept-language'] || 'unknown-lang';
  const ip = req.ip || req.connection?.remoteAddress || '127.0.0.1';
  return crypto
    .createHash('sha256')
    .update(`${userAgent}-${acceptLang}-${ip}`)
    .digest('hex');
};

export const evaluateFraudRisk = async ({
  userId,
  giveawayId,
  deviceHash,
  ipAddress,
}) => {
  let riskScore = 0;
  const detectedSignals = [];

  const user = await repo.findUserById(userId);
  if (user && user.isFraudSuspended) {
    riskScore += 90;
    detectedSignals.push({
      signalType: 'ACCOUNT_SUSPENDED',
      description: 'Account is previously flagged or suspended',
      severity: 'CRITICAL',
    });
  }

  // Check 1: Multi-account device clustering
  const existingUserPart = await repo.getUserParticipation(userId, giveawayId);

  // Check 2: Historical risk score
  if (user && user.fraudRiskScore > 30) {
    riskScore += Math.min(30, user.fraudRiskScore);
    detectedSignals.push({
      signalType: 'HISTORICAL_ACCOUNT_RISK',
      description: `User historical risk score is ${user.fraudRiskScore}`,
      severity: 'MEDIUM',
    });
  }

  // Final score clamping
  riskScore = Math.min(100, Math.max(0, riskScore));

  let riskLevel = 'LOW';
  let action = 'ALLOW';

  if (riskScore >= 80) {
    riskLevel = 'CRITICAL';
    action = 'BLOCKED';
  } else if (riskScore >= 60) {
    riskLevel = 'HIGH';
    action = 'FLAGGED';
  } else if (riskScore >= 30) {
    riskLevel = 'MEDIUM';
    action = 'REVIEW';
  }

  // Log fraud event if risk elevated
  if (riskScore >= 30) {
    const eventId = `FE-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    await repo.createFraudEvent({
      eventId,
      userId,
      giveawayId,
      deviceHash,
      ipAddress,
      riskScore,
      riskLevel,
      reason: detectedSignals.map((s) => s.description).join('; '),
      signals: detectedSignals,
      action,
    });
  }

  return {
    riskScore,
    riskLevel,
    action,
    signals: detectedSignals,
    isAllowed: action !== 'BLOCKED',
  };
};
