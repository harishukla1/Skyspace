import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../utils/logger';

mongoose.set('strictQuery', true);

export async function connectDb(uri = env.MONGODB_URI) {
  await mongoose.connect(uri, {
    maxPoolSize: env.MONGODB_MAX_POOL_SIZE,
    serverSelectionTimeoutMS: 10_000,
    socketTimeoutMS: 45_000,
  });
  logger.info({ db: mongoose.connection.name }, 'MongoDB connected');
  return mongoose.connection;
}

export const disconnectDb = () => mongoose.disconnect();
export const dbReady = () => mongoose.connection.readyState === 1;
