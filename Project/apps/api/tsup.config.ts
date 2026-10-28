import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts', 'src/scripts/seed.ts'],
  format: ['esm'],
  target: 'node20',
  platform: 'node',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  // Bundle the TypeScript-source workspace package; keep npm dependencies external.
  noExternal: ['@skyspace/shared'],
});
