/**
 * Centralized environment variable validation.
 * Fail-fast if required secrets are missing or still using placeholder values.
 */
const REQUIRED_VARS = ['MONGO_URI', 'JWT_SECRET', 'JWT_EXPIRE'];
const OPTIONAL_BUT_WARN = ['WEATHER_API_KEY', 'MQTT_BROKER_URL'];

const PLACEHOLDER_PATTERNS = [
  /your_.*_here/i,
  /change_in_production/i,
  /CHANGE_ME/i,
];

function isPlaceholder(value) {
  if (!value) return true;
  return PLACEHOLDER_PATTERNS.some((re) => re.test(value));
}

function validateEnv() {
  const missing = REQUIRED_VARS.filter((k) => !process.env[k] || process.env[k].trim() === '');
  if (missing.length > 0) {
    console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
    console.error('   Copy server/.env.example to server/.env and fill in real values.');
    process.exit(1);
  }

  // Hard fail if JWT_SECRET is still a placeholder (prevents deploying with exposed default)
  if (isPlaceholder(process.env.JWT_SECRET)) {
    console.error('❌ JWT_SECRET is using a placeholder value! Generate a strong secret:');
    console.error("   node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\"");
    process.exit(1);
  }
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.error('❌ JWT_SECRET is too short (must be >= 32 chars). Generate a stronger secret.');
    process.exit(1);
  }

  // Warn but allow app to run with mock data
  OPTIONAL_BUT_WARN.forEach((k) => {
    if (!process.env[k] || isPlaceholder(process.env[k])) {
      console.warn(`⚠️  ${k} is not set or is placeholder - related features will use mock/fallback data.`);
    }
  });

  // In production, enforce stronger checks
  if (process.env.NODE_ENV === 'production') {
    if (process.env.MONGO_URI && process.env.MONGO_URI.includes('localhost')) {
      console.warn('⚠️  MONGO_URI points to localhost in production - is this intended?');
    }
  }
}

module.exports = { validateEnv };
