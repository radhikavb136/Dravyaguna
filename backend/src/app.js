import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { env } from './config/env.js';
import { pool } from './db/pool.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authRouter } from './routes/auth.routes.js';
import { searchRouter } from './routes/search.routes.js';
import { weightsRouter } from './routes/weights.routes.js';
import { herbRouter } from './routes/herb.routes.js';
import { vocabularyRouter } from './routes/vocabulary.routes.js';
import { adminRouter } from './routes/admin.routes.js';
import { favoritesRouter } from './routes/favorites.routes.js';
import { accountRouter } from './routes/account.routes.js';

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
      origin: Array.isArray(env.frontendOrigin) ? env.frontendOrigin : [env.frontendOrigin],
      credentials: true,
    })
  );
  app.use(express.json({ limit: '1mb' }));

  const health = async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ok', database: 'ok' });
    } catch {
      res.status(503).json({ status: 'error', database: 'unavailable' });
    }
  };
  app.get('/api/health', health);
  app.get('/health', health);

  app.use('/api/auth', authRouter);
  app.use('/api/account', accountRouter);
  app.use('/api/search', searchRouter);
  app.use('/api/scoring/weights', weightsRouter);
  app.use('/api/herbs', herbRouter);
  app.use('/api/vocabulary', vocabularyRouter);
  app.use('/api', adminRouter);
  app.use('/api', favoritesRouter);

  app.use(errorHandler);

  return app;
}
