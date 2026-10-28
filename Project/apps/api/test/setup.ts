import { afterAll, beforeAll, beforeEach, inject } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.ACCESS_TOKEN_SECRET = 'test-access-secret-that-is-long-enough-123';
process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret-that-is-long-enough-456';
process.env.RATE_LIMIT_ENABLED = 'false';
process.env.LOCAL_UPLOAD_DIR = '.test-uploads';
process.env.MONGODB_URI = inject('mongoUri');

const mongoose = (await import('mongoose')).default;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI!);
  await Promise.all(mongoose.modelNames().map((n) => mongoose.model(n).syncIndexes()));
});
beforeEach(async () => {
  const db = mongoose.connection.db!;
  const cols = await db.collections();
  await Promise.all(cols.map((c) => c.deleteMany({})));
});
afterAll(async () => {
  await mongoose.disconnect();
});
