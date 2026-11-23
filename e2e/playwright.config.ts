import { defineConfig, devices } from "@playwright/test";
import { loadEnv } from "./src/config/env";
import { STORAGE_STATE } from "./src/config/paths";

const env = loadEnv();
const isCI = Boolean(process.env.CI);

// How to read this file: top-level options apply to every test; "use" sets browser defaults;
// "projects" are named ways of running tests (which folder, which device, logged in or not).
// Explanations of each option: PLAYWRIGHT-FRAMEWORK-GUIDE.md, Step 6.
export default defineConfig({
  testDir: "./tests",
  // Tests are independent (each makes and removes its own uniquely named data), so they may run in parallel.
  fullyParallel: true,
  // A committed `test.only` must never silently skip the rest of the suite in CI.
  forbidOnly: isCI,
  // Retry once on CI to absorb a network blip; the report marks such tests "flaky" so they are noticed.
  retries: isCI ? 1 : 0,
  // Two workers: enough speed, gentle on the app's rate limits and the shared test account.
  workers: 2,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: env.baseUrl,
    // The app marks elements with data-testid; getByTestId() uses this attribute.
    testIdAttribute: "data-testid",
    // Evidence for failures only, so passing runs stay fast and small.
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    // The app registers a service worker for offline use; it would make page loads depend on a
    // previous test's cache. Block it here; offline behaviour gets its own dedicated project later.
    serviceWorkers: "block",
    // Vercel preview deployments can sit behind login protection; this header lets the tests in.
    extraHTTPHeaders: env.vercelBypassSecret
      ? { "x-vercel-protection-bypass": env.vercelBypassSecret, "x-vercel-set-bypass-cookie": "true" }
      : undefined,
  },

  projects: [
    // 1) Logs in once and saves the cookies.
    { name: "setup", testMatch: /.*\.setup\.ts/ },

    // 2) Tests that start logged OUT (login page, redirects).
    {
      name: "anonymous",
      testMatch: "anonymous/**/*.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },

    // 3) Tests that start logged IN on a desktop-size browser.
    {
      name: "desktop",
      testMatch: "app/**/*.spec.ts",
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], storageState: STORAGE_STATE },
    },

    // 4) Logged-in tests on a phone-size screen (bottom tab bar, "More" menu).
    {
      name: "mobile",
      testMatch: "mobile/**/*.spec.ts",
      dependencies: ["setup"],
      use: { ...devices["Pixel 7"], storageState: STORAGE_STATE },
    },
  ],
});
