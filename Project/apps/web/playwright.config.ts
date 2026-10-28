import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests run against a running stack (API + web + seeded database):
 *   npm run dev:db  &&  npm run seed -- --reset  &&  npm run dev
 *   npm run test:e2e
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000', trace: 'retain-on-failure', ...(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {}) },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, grep: /@mobile/ },
  ],
});
