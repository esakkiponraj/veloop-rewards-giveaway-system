/**
 * Safe Test Database Configuration Utility
 *
 * Guarantees:
 * - Strictly rejects test execution if NODE_ENV=production.
 * - Enforces dedicated test database isolation (MONGO_TEST_URI or isolated test DB name).
 * - Fails immediately if test database equals production database.
 * - Strictly redacts and masks credentials from all output logs.
 */

export const maskMongoUri = (uri) => {
  if (!uri || typeof uri !== 'string') return '[UNCONFIGURED]';
  return uri.replace(/(mongodb(?:\+srv)?:\/\/)([^:]+):([^@]+)@/, '$1****:****@');
};

export const getDatabaseNameFromUri = (uri) => {
  if (!uri || typeof uri !== 'string') return '';
  try {
    const withoutProtocol = uri.replace(/^mongodb(?:\+srv)?:\/\//, 'http://');
    const parsed = new URL(withoutProtocol);
    const pathname = parsed.pathname.replace(/^\//, '');
    return pathname || 'test';
  } catch {
    const match = uri.match(/\/([^/?]+)(?:\?|$)/);
    return match ? match[1] : 'test';
  }
};

export const getSafeTestDbConfig = () => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: Automated test execution is strictly rejected when NODE_ENV=production.');
  }

  const prodUri = process.env.MONGO_URI;
  const testUriEnv = process.env.MONGO_TEST_URI;

  const prodDbName = getDatabaseNameFromUri(prodUri);

  let targetTestUri;
  let targetTestDbName;

  if (testUriEnv && testUriEnv.trim()) {
    targetTestUri = testUriEnv.trim();
    targetTestDbName = getDatabaseNameFromUri(targetTestUri);

    if (targetTestDbName === prodDbName) {
      throw new Error(
        `FATAL: Test database name ("${targetTestDbName}") equals production database name. Tests cannot run against production.`
      );
    }
  } else {
    // Automatically derive an isolated test database (e.g. "veloop_test_isolated")
    if (!prodUri) {
      throw new Error('FATAL: Neither MONGO_TEST_URI nor MONGO_URI is configured.');
    }

    targetTestDbName = prodDbName === 'test' ? 'veloop_isolated_test' : `${prodDbName}_test`;

    if (prodUri.includes('?')) {
      targetTestUri = prodUri.replace(/\/[^/?]*\?/, `/${targetTestDbName}?`);
    } else {
      targetTestUri = prodUri.replace(/\/?$/, `/${targetTestDbName}`);
    }
  }

  if (targetTestDbName === prodDbName) {
    throw new Error('FATAL: Test database cannot match production database.');
  }

  return {
    testUri: targetTestUri,
    testDbName: targetTestDbName,
    prodDbName,
    maskedUri: maskMongoUri(targetTestUri),
  };
};
