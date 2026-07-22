import { defineConfig, devices } from '@playwright/test';

// E2E tests for the admin web portal.
// Requires: Postgres with migrations + seed data (pnpm --filter @my-cura/api
// migration:run && pnpm --filter @my-cura/api seed). The API and Vite dev
// server are started automatically (or reused when already running).
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  // macOS creates AppleDouble ("._foo.spec.ts") sidecars on non-APFS drives
  testIgnore: '**/._*',
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:3001',
    // Admin session captured once in global-setup — login is rate-limited
    // (5/15min), so per-test UI logins would 429 the suite. Specs that need
    // a logged-out browser opt out with test.use({ storageState: LOGGED_OUT }).
    storageState: './e2e/.auth/admin.json',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [
    {
      command: 'node -r ts-node/register/transpile-only src/main.ts',
      cwd: '../api',
      port: 3000,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'npx vite --port 3001',
      port: 3001,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
