import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { env } from './config/env.js';
import { pool } from './db/pool.js';
import { databaseEndpointFromUrl } from './utils/databaseEndpoint.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authRouter } from './routes/auth.routes.js';
import { searchRouter } from './routes/search.routes.js';
import { weightsRouter } from './routes/weights.routes.js';
import { herbRouter } from './routes/herb.routes.js';
import { vocabularyRouter } from './routes/vocabulary.routes.js';
import { adminRouter } from './routes/admin.routes.js';
import { favoritesRouter } from './routes/favorites.routes.js';
import { accountRouter } from './routes/account.routes.js';
import { explainRouter } from './routes/explain.routes.js';
import { translationsRouter } from './routes/translations.routes.js';
import { uploadRouter } from './routes/upload.routes.js';
import { supportRouter } from './routes/support.routes.js';
import { notificationsRouter } from './routes/notifications.routes.js';
import { modelRouter } from './routes/model.routes.js';
import { isStorageConfigured, missingStorageEnvVars } from './services/storage/storageConfig.js';
import { isSmtpConfigured, missingSmtpEnvVars } from './services/auth/smtpConfig.js';
import { isBillingConfigured } from './config/billingConfig.js';
import { isLiveLlmConfigured, resolveConfiguredLlmProviderName } from './services/explain/llmProvider.js';

export function createApp() {
  const app = express();

  app.use(
    pinoHttp({
      level: env.nodeEnv === 'production' ? 'info' : 'debug',
      redact: {
        paths: ['req.headers.authorization', 'req.headers.cookie'],
        censor: '[REDACTED]',
      },
    })
  );
  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        callback(null, !origin || env.frontendOrigin.includes(origin));
      },
      credentials: true,
      methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Authorization', 'Content-Type'],
    })
  );
  app.use(express.json({ limit: '1mb' }));

  const health = async (_req, res) => {
    const databaseEndpoint = databaseEndpointFromUrl(env.databaseUrl);
    try {
      await pool.query('SELECT 1');
      res.json({
        status: 'ok',
        database: 'ok',
        databaseEndpoint,
        loginRateLimitEnabled: process.env.DISABLE_RATE_LIMIT !== 'true',
        passwordResetRateLimitEnabled: process.env.DISABLE_RATE_LIMIT !== 'true',
        llmProvider: resolveConfiguredLlmProviderName(),
        llmConfigured: isLiveLlmConfigured(),
        translationProviderConfigured: Boolean(env.sarvamApiKey || env.googleTranslateApiKey || (env.azureTranslatorKey && env.azureTranslatorRegion)),
        billingConfigured: isBillingConfigured(),
        smtpConfigured: isSmtpConfigured(),
        smtpMissingEnv: isSmtpConfigured() ? [] : missingSmtpEnvVars(),
        storageConfigured: isStorageConfigured(),
        storageMissingEnv: isStorageConfigured() ? [] : missingStorageEnvVars(),
      });
    } catch {
      res.status(503).json({ status: 'error', database: 'unavailable', databaseEndpoint });
    }
  };
  app.get('/api/health', health);
  app.get('/health', health);

  app.use('/api/auth', authRouter);
  app.use('/api/account', accountRouter);
  app.use('/api/explain', explainRouter);
  app.use('/api/translations', translationsRouter);
  app.use('/api/upload', uploadRouter);
  app.use('/api/search', searchRouter);
  app.use('/api/scoring/weights', weightsRouter);
  app.use('/api/herbs', herbRouter);
  app.use('/api/vocabulary', vocabularyRouter);
  app.use('/api', adminRouter);
  app.use('/api', favoritesRouter);
  app.use('/api', supportRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/model', modelRouter);

  app.use(errorHandler);

  return app;
}
