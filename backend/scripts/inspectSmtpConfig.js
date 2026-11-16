/**
 * Prints SMTP configuration status (env var names only, no secrets).
 */
import dotenv from 'dotenv';
import { isSmtpConfigured, missingSmtpEnvVars, smtpEnvKeyCatalog } from '../src/services/auth/smtpConfig.js';

dotenv.config();

console.log(JSON.stringify({
  smtpConfigured: isSmtpConfigured(),
  missing_required_env: missingSmtpEnvVars(),
  catalog_env_keys: smtpEnvKeyCatalog(),
  notes: [
    'SMTP_USER and SMTP_PASSWORD are optional for some providers (IP allow-list).',
    'PASSWORD_RESET_PUBLIC_PATH defaults to /password-reset on FRONTEND_ORIGIN[0].',
  ],
}, null, 2));
