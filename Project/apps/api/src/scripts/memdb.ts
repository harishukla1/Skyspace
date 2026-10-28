/**
 * Development convenience: runs a local MongoDB (single-node replica set) via mongodb-memory-server with data
 * persisted under apps/api/.memdb. Use when you do not have MongoDB installed. Not for production.
 */
import fs from 'node:fs';
import path from 'node:path';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

const dbPath = path.resolve(process.cwd(), '.memdb');
fs.mkdirSync(dbPath, { recursive: true });
const port = Number(process.env.MEMDB_PORT ?? 27017);
const rs = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' }, instanceOpts: [{ port, dbPath }] });
console.log(`MongoDB running: ${rs.getUri('skyspace')}`);
console.log('Set MONGODB_URI to the URI above (default .env.example already matches port 27017). Ctrl+C to stop.');
const stop = async () => {
  await rs.stop({ doCleanup: false });
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
