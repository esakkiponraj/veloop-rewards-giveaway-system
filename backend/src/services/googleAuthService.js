import { OAuth2Client } from 'google-auth-library';

let testTokenVerifier = null;

/**
 * Allows automated test suites to mock Google ID token verification without external network dependency.
 * Strictly forbidden in production.
 */
export const setGoogleTokenVerifierForTesting = (verifierFn) => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Mock Google token verifier is strictly prohibited in production.');
  }
  testTokenVerifier = verifierFn;
};

/**
 * Verifies a Google ID token's signature, issuer, audience, and expiration.
 * Returns the verified token payload.
 */
export const verifyGoogleIdToken = async (idToken) => {
  if (!idToken || typeof idToken !== 'string') {
    const error = new Error('Google ID token is required.');
    error.code = 'INVALID_GOOGLE_TOKEN';
    error.statusCode = 400;
    throw error;
  }

  // In-process mock verifier (when invoked within same process)
  if (testTokenVerifier) {
    return await testTokenVerifier(idToken);
  }

  // Test token decoding for automated multi-process test suites (non-production only)
  if (process.env.NODE_ENV !== 'production' && idToken.startsWith('test-google-token:')) {
    try {
      const b64 = idToken.replace('test-google-token:', '');
      const testPayload = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
      if (testPayload.signatureInvalid) {
        const err = new Error('Token signature invalid or expired');
        err.code = 'INVALID_GOOGLE_TOKEN';
        err.statusCode = 401;
        throw err;
      }
      return testPayload;
    } catch (err) {
      if (err.code === 'INVALID_GOOGLE_TOKEN') throw err;
      const parseErr = new Error('Invalid test token payload');
      parseErr.code = 'INVALID_GOOGLE_TOKEN';
      parseErr.statusCode = 401;
      throw parseErr;
    }
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    const error = new Error('Google authentication is not configured on this server.');
    error.code = 'GOOGLE_AUTH_NOT_CONFIGURED';
    error.statusCode = 503;
    throw error;
  }

  try {
    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({
      idToken,
      audience: clientId,
    });
    const payload = ticket.getPayload();
    if (!payload) {
      const error = new Error('Invalid Google token payload.');
      error.code = 'INVALID_GOOGLE_TOKEN';
      error.statusCode = 400;
      throw error;
    }
    return payload;
  } catch (err) {
    const error = new Error(`Google token verification failed: ${err.message}`);
    error.code = 'INVALID_GOOGLE_TOKEN';
    error.statusCode = 401;
    throw error;
  }
};
