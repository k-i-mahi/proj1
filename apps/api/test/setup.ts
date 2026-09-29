import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach, inject } from 'vitest';

beforeAll(async () => {
  // A fresh database per test file keeps files isolated while they run in parallel.
  await mongoose.connect(inject('mongoUri'), { dbName: `test-${randomUUID()}` });
  await mongoose.connection.syncIndexes();
});

beforeEach(async () => {
  const collections = await mongoose.connection.db!.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
