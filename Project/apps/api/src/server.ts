import { createApp } from './app';
import { connectDb, disconnectDb } from './config/db';
import { env } from './config/env';
import { logger } from './utils/logger';

async function main() {
  await connectDb();
  const app = createApp();
  const server = app.listen(env.PORT, () => logger.info(`Sky Space Realty API listening on :${env.PORT} (docs: ${env.API_PUBLIC_URL}/api/docs)`));
  server.requestTimeout = 60_000;
  server.headersTimeout = 65_000;

  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Shutting down gracefully');
    server.close(async () => {
      await disconnectDb().catch(() => undefined);
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 15_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (err) => logger.error({ err }, 'Unhandled rejection'));
}

main().catch((err) => {
  logger.fatal({ err }, 'Failed to start');
  process.exit(1);
});
