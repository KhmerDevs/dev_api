export const EXAM_CONSTANTS = {
  MIN_PASS_SCORE: 60,
  DEFAULT_DURATION_MINUTES: 30,
  MAX_ATTEMPTS: 3,
};

export const SECURITY_CONSTANTS = {
  PASSWORD_SALT_ROUNDS: 12,
  JWT_EXPIRY: '24h',
  RATE_LIMIT: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  },
};

export const FILE_CONSTANTS = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_MIME_TYPES: ['application/pdf', 'image/jpeg', 'image/png'],
}; 