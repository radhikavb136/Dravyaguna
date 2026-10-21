import dotenv from 'dotenv';

dotenv.config();

const required = ['DATABASE_URL', 'JWT_SECRET'];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

function parseFrontendOrigin(value) {
  if (!value) {
    return ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:20322'];
  }
  if (Array.isArray(value)) {
    return value;
  }
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export const env = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  frontendOrigin: parseFrontendOrigin(process.env.FRONTEND_ORIGIN),
  importDefaultStatus: process.env.IMPORT_DEFAULT_STATUS || 'reviewed',
  pgPoolMax: Number(process.env.PG_POOL_MAX || 10),
  prodDbRef: process.env.PROD_DB_REF || '',
};
