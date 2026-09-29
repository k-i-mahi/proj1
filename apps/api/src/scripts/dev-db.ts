/**
 * Starts a real local MongoDB server for development, with no install or
 * Docker needed. Data is kept in apps/api/.mongo-data between runs.
 *
 *   npm run dev:db
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { MongoMemoryServer } from 'mongodb-memory-server';

const dbPath = path.resolve(process.cwd(), '.mongo-data');
await mkdir(dbPath, { recursive: true });

const server = await MongoMemoryServer.create({
  instance: { port: 27017, dbPath, storageEngine: 'wiredTiger' },
});

console.log(`MongoDB running at ${server.getUri()} (data: ${dbPath})`);
console.log('Press Ctrl+C to stop.');

const stop = async () => {
  await server.stop({ doCleanup: false });
  process.exit(0);
};
process.on('SIGINT', () => void stop());
process.on('SIGTERM', () => void stop());
