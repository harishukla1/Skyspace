import { MongoMemoryReplSet } from 'mongodb-memory-server';
import type { TestProject } from 'vitest/node';

let rs: MongoMemoryReplSet;

/** Isolated, throw-away MongoDB for integration tests — never touches development or production data. */
export async function setup(project: TestProject) {
  rs = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  project.provide('mongoUri', rs.getUri('skyspace_test'));
}

export async function teardown() {
  await rs?.stop();
}

declare module 'vitest' {
  export interface ProvidedContext {
    mongoUri: string;
  }
}
