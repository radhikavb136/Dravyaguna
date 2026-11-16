import dotenv from 'dotenv';

dotenv.config();

const required = ['DATABASE_URL', 'JWT_SECRET'];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const defaultFrontendOrigins = [
  'http://localhost:5173',
  'http://localhost:5180',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5180',
];

export function parseFrontendOrigin(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (value === undefined || value === null) return [...defaultFrontendOrigins];
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

const nodeEnv = process.env.NODE_ENV || 'development';
const rawFrontendOrigin = process.env.FRONTEND_ORIGIN;
const frontendOrigin = rawFrontendOrigin?.trim()
  ? parseFrontendOrigin(rawFrontendOrigin)
  : nodeEnv === 'production' ? [] : [...defaultFrontendOrigins];
if (nodeEnv === 'production') {
  if (!process.env.FRONTEND_ORIGIN?.trim() || frontendOrigin.length === 0) {
    throw new Error('FRONTEND_ORIGIN must contain at least one origin in production.');
  }
  if (frontendOrigin.some((origin) => origin.includes('*'))) {
    throw new Error('FRONTEND_ORIGIN must not contain wildcard origins in production.');
  }
}

export const env = {
  port: Number(process.env.PORT || 4000),
  nodeEnv,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  frontendOrigin,
  importDefaultStatus: process.env.IMPORT_DEFAULT_STATUS || 'reviewed',
  pgPoolMax: Number(process.env.PG_POOL_MAX || (nodeEnv === 'test' ? 3 : 10)),
  prodDbRef: process.env.PROD_DB_REF || '',
  llmProvider: process.env.LLM_PROVIDER || 'mock',
  llmApiKey: process.env.LLM_API_KEY || '',
  llmModel: process.env.LLM_MODEL || '',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  sarvamApiKey: process.env.SARVAM_API_KEY || '',
  googleTranslateApiKey: process.env.GOOGLE_TRANSLATE_API_KEY || '',
  azureTranslatorKey: process.env.AZURE_TRANSLATOR_KEY || '',
  azureTranslatorRegion: process.env.AZURE_TRANSLATOR_REGION || '',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  supabaseStorageBucket: process.env.SUPABASE_STORAGE_BUCKET || '',
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpUser: process.env.SMTP_USER || '',
  smtpPassword: process.env.SMTP_PASSWORD || '',
  smtpFrom: process.env.SMTP_FROM || '',
  passwordResetPublicPath: process.env.PASSWORD_RESET_PUBLIC_PATH || '/password-reset',
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
};
