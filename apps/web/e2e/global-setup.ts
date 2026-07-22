import { execSync } from 'child_process';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import * as speakeasy from 'speakeasy';

const API = process.env.E2E_API_URL ?? 'http://localhost:3000/api/v1';
const WEB_ORIGIN = 'http://localhost:3001';
// apps/web is ESM ("type": "module"), so no __dirname; Playwright runs from apps/web.
const AUTH_DIR = join(process.cwd(), 'e2e', '.auth');

/**
 * Login is rate-limited to 5 attempts / 15 min / IP (production behavior we
 * deliberately keep in dev), so the suite cannot log in per-test. Instead:
 *  1. reset the demo accounts' MFA enrollment (staff logins REQUIRE MFA),
 *  2. enroll + authenticate the admin ONCE via the API (real TOTP),
 *  3. save a Playwright storageState that every admin spec reuses.
 * Total login spend per run: 1 here + the few auth.spec tests that
 * genuinely exercise the login UI — comfortably inside the budget.
 */
export default async function globalSetup() {
  try {
    execSync(
      `psql -d mycura -c "UPDATE users SET is_2fa_enabled = false, totp_secret_enc = NULL WHERE email LIKE '%@demo-care.local'"`,
      { stdio: 'pipe' },
    );
  } catch (err) {
    console.warn(`[e2e setup] MFA reset skipped (psql unavailable?): ${(err as Error).message}`);
  }

  const post = async (path: string, body: unknown, token?: string) => {
    const res = await fetch(`${API}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`${path} -> ${res.status}: ${await res.text()}`);
    return res.json() as Promise<Record<string, unknown>>;
  };

  mkdirSync(AUTH_DIR, { recursive: true });

  // Two logins spent here (of the 5/15min budget); auth.spec spends the rest.
  for (const account of [
    { name: 'admin', email: 'admin@demo-care.local' },
    { name: 'manager', email: 'manager@demo-care.local' },
  ]) {
    const login = await post('/auth/login', { email: account.email, password: 'Demo1234!' });
    const preMfaToken = login['accessToken'] as string;

    const setup = await post('/auth/2fa/setup', {}, preMfaToken);
    const secret = new URL(setup['otpauthUrl'] as string).searchParams.get('secret')!;
    const confirm = await post(
      '/auth/2fa/confirm',
      { code: speakeasy.totp({ secret, encoding: 'base32' }) },
      preMfaToken,
    );

    writeFileSync(join(AUTH_DIR, `${account.name}-totp-secret`), secret);
    writeFileSync(
      join(AUTH_DIR, `${account.name}.json`),
      JSON.stringify({
        cookies: [],
        origins: [
          {
            origin: WEB_ORIGIN,
            localStorage: [
              {
                name: 'mycura-auth',
                value: JSON.stringify({
                  state: {
                    user: confirm['user'],
                    accessToken: confirm['accessToken'],
                    isAuthenticated: true,
                  },
                  version: 0,
                }),
              },
            ],
          },
        ],
      }),
    );
  }
  console.log('[e2e setup] admin + manager enrolled in MFA; sessions saved to e2e/.auth/');
}
