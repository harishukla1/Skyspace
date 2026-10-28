import path from 'node:path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { allowedOrigins, isTest } from './config/env';
import { dbReady } from './config/db';
import { logger } from './utils/logger';
import { csrfProtection } from './middleware/csrf';
import { sanitizeInput, sanitizeQuery } from './middleware/sanitize';
import { errorHandler, notFoundHandler } from './middleware/error';
import { globalLimiter } from './middleware/rateLimit';
import { localUploadRoot } from './services/storage';
import { authRouter } from './modules/auth/auth.routes';
import { meRouter } from './modules/users/user.routes';
import { ownerRouter, propertyRouter } from './modules/properties/property.routes';
import { enquiryRouter } from './modules/enquiries/enquiry.routes';
import { siteVisitRouter } from './modules/site-visits/site-visit.routes';
import { agentRouter, agentsPublicRouter, ownerWorkspaceRouter } from './modules/agents/agent.routes';
import { catalogueRouter, contentRouter } from './modules/content/content.routes';
import { adminRouter } from './modules/admin/admin.routes';
import { buildOpenApi } from './docs/openapi';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(
    cors({
      origin: (origin, cb) => cb(null, !origin || allowedOrigins.includes(origin)),
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'X-Captcha-Token', 'Authorization'],
      maxAge: 600,
    }),
  );
  if (!isTest) app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/health' } }));
  app.use(express.json({ limit: '200kb' }));
  app.use(express.urlencoded({ extended: false, limit: '50kb' }));
  app.use(cookieParser());
  app.use((req, _res, next) => {
    req.valid = {};
    next();
  });
  // Requests that run longer than 30s are aborted with 503 rather than hanging the client.
  app.use((req, res, next) => {
    res.setTimeout(30_000, () => {
      if (!res.headersSent) res.status(503).json({ error: { code: 'TIMEOUT', message: 'Request timed out' } });
    });
    next();
  });

  app.get('/health', (_req, res) => {
    const ok = dbReady();
    res.status(ok ? 200 : 503).json({ status: ok ? 'ok' : 'degraded', db: ok ? 'connected' : 'disconnected', uptime: Math.round(process.uptime()) });
  });

  app.use('/uploads', express.static(localUploadRoot, { maxAge: '30d', immutable: true, fallthrough: false, index: false }));

  const openapi = buildOpenApi();
  app.get('/api/v1/openapi.json', (_req, res) => res.json(openapi));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi, { customSiteTitle: 'Sky Space Realty API' }));

  const api = express.Router();
  api.use(globalLimiter, sanitizeQuery, sanitizeInput, csrfProtection);
  api.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  api.use('/auth', authRouter);
  api.use('/users/me', meRouter);
  api.use('/properties', propertyRouter);
  api.use('/owner', ownerRouter);
  api.use('/owner', ownerWorkspaceRouter);
  api.use('/enquiries', enquiryRouter);
  api.use('/site-visits', siteVisitRouter);
  api.use('/agents', agentsPublicRouter);
  api.use('/agent', agentRouter);
  api.use('/content', contentRouter);
  api.use('/', catalogueRouter);
  api.use('/admin', adminRouter);
  app.use('/api/v1', api);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

export const uploadsPath = path.resolve(localUploadRoot);
