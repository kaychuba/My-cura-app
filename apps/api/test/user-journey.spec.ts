/**
 * Full user-journey integration test, run against a LIVE API over HTTP:
 *
 *   agency signs up → owner is forced through MFA enrollment (real TOTP
 *   codes) → owner creates a carer, a service user, a medication, schedules
 *   a dose and a shift → the carer logs in, is blocked clocking in from too
 *   far away, clocks in on-site, signs the MAR with initials, writes the
 *   visit note, clocks out → the owner sees the completed records → and a
 *   second agency proves it can see none of it (tenant isolation).
 *
 * Opt-in so the ordinary unit-test run and CI stay green without a server:
 *
 *   RUN_JOURNEY=1 npx jest test/user-journey
 *
 * Requires the API on JOURNEY_API_URL (default http://localhost:3000/api/v1)
 * with its database up. Uses unique emails per run. NOTE: signup is
 * rate-limited to 3/15min per IP — wait out the window between repeat runs.
 */
import * as speakeasy from 'speakeasy';

const RUN = process.env['RUN_JOURNEY'] === '1';
const BASE = process.env['JOURNEY_API_URL'] ?? 'http://localhost:3000/api/v1';

const runId = Date.now().toString(36);
// Kentish Town, London — the service user's home; the carer clocks in here.
const HOME = { lat: 51.5504, lon: -0.1407 };
// ~11 km away — far outside the 3 km clock-in radius.
const FAR = { lat: 51.4613, lon: -0.0106 };

interface Http {
  status: number;
  body: Record<string, unknown> & { message?: string };
}

async function http(
  method: string,
  path: string,
  opts: { token?: string; body?: unknown } = {},
): Promise<Http> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  const text = await res.text();
  const parsed = { status: res.status, body: text ? JSON.parse(text) : {} };
  if (parsed.status >= 400 && process.env['JOURNEY_DEBUG']) {
    console.error(`${method} ${path} -> ${parsed.status}`, JSON.stringify(parsed.body));
  }
  return parsed;
}

/** Current 6-digit code for the otpauth secret the API handed us. */
function totp(secretBase32: string): string {
  return speakeasy.totp({ secret: secretBase32, encoding: 'base32' });
}

function secretFromOtpauthUrl(otpauthUrl: string): string {
  const secret = new URL(otpauthUrl).searchParams.get('secret');
  if (!secret) throw new Error('otpauth URL has no secret');
  return secret;
}

const asList = (x: unknown): Record<string, unknown>[] => {
  if (Array.isArray(x)) return x as Record<string, unknown>[];
  const o = x as Record<string, unknown>;
  return (o['records'] ?? o['data'] ?? []) as Record<string, unknown>[];
};

(RUN ? describe : describe.skip)('user journey (live API)', () => {
  // Shared state, built up step by step — Jest runs a file's tests in order.
  const s = {
    ownerToken: '',
    ownerPreMfaToken: '',
    workerToken: '',
    agencyBToken: '',
    workerId: '',
    serviceUserId: '',
    medicationId: '',
    marRecordId: '',
    shiftId: '',
  };

  const ownerEmail = `owner-${runId}@journey.test`;
  const workerEmail = `carer-${runId}@journey.test`;
  const password = 'Journey-Pass-9!';

  jest.setTimeout(30_000);

  // ── The agency arrives ────────────────────────────────────────────────────

  it('a new care agency signs itself up', async () => {
    const res = await http('POST', '/auth/signup', {
      body: {
        agencyName: `Journey Care ${runId}`,
        country: 'UK',
        firstName: 'Olivia',
        lastName: 'Owner',
        email: ownerEmail,
        password,
      },
    });
    expect(res.status).toBe(201);
    expect(res.body['accessToken']).toBeTruthy();
    expect(res.body['mfaSetupRequired']).toBe(true); // owners are staff: MFA or nothing
    s.ownerPreMfaToken = res.body['accessToken'] as string;
  });

  it('…but the owner is locked out of everything until MFA is enrolled', async () => {
    const res = await http('GET', '/users', { token: s.ownerPreMfaToken });
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/multi-factor/i);
  });

  it('the owner enrolls an authenticator and unlocks the account', async () => {
    const setup = await http('POST', '/auth/2fa/setup', { token: s.ownerPreMfaToken });
    expect(setup.status).toBe(201);
    const secret = secretFromOtpauthUrl(setup.body['otpauthUrl'] as string);

    const confirm = await http('POST', '/auth/2fa/confirm', {
      token: s.ownerPreMfaToken,
      body: { code: totp(secret) },
    });
    expect(confirm.status).toBe(201);
    expect(confirm.body['accessToken']).toBeTruthy();
    s.ownerToken = confirm.body['accessToken'] as string;

    const users = await http('GET', '/users', { token: s.ownerToken });
    expect(users.status).toBe(200); // the same call that 403'd a moment ago
  });

  // ── The owner builds the care setup ───────────────────────────────────────

  it('the owner creates a care worker (secrets never echoed back)', async () => {
    const res = await http('POST', '/users', {
      token: s.ownerToken,
      body: {
        email: workerEmail,
        password,
        firstName: 'Winnie',
        lastName: 'Worker',
        role: 'care_worker',
      },
    });
    expect(res.status).toBe(201);
    expect(res.body['passwordHash']).toBeUndefined();
    s.workerId = res.body['id'] as string;
  });

  it('the owner creates a service user with a home location', async () => {
    const res = await http('POST', '/service-users', {
      token: s.ownerToken,
      body: {
        firstName: 'Doris',
        lastName: 'Whitfield',
        dateOfBirth: '1938-02-14',
        conditionSummary: 'Early-stage dementia; medication support twice daily',
        careLevel: 'high',
        address: {
          line1: '5 Oak Lane',
          city: 'London',
          postcode: 'NW5 1AB',
          lat: HOME.lat,
          lon: HOME.lon,
        },
      },
    });
    expect(res.status).toBe(201);
    s.serviceUserId = res.body['id'] as string;
  });

  it('the owner records consent — MCA rules enforced, history append-only', async () => {
    // A best-interests decision WITHOUT a capacity assessment must be refused.
    const rejected = await http('POST', `/service-users/${s.serviceUserId}/consents`, {
      token: s.ownerToken,
      body: {
        consentType: 'care_and_support', status: 'granted',
        givenBy: 'best_interests', givenByName: 'Dr Amara Okafor',
      },
    });
    expect(rejected.status).toBe(400);
    expect(String(rejected.body.message)).toMatch(/capacity assessment/i);

    // Properly recorded: attorney consents to care, Doris herself refuses photos.
    const care = await http('POST', `/service-users/${s.serviceUserId}/consents`, {
      token: s.ownerToken,
      body: {
        consentType: 'care_and_support', status: 'granted',
        givenBy: 'attorney', givenByName: 'Margaret Whitfield (daughter, LPA)',
        capacityAssessed: true,
      },
    });
    expect(care.status).toBe(201);

    const photos = await http('POST', `/service-users/${s.serviceUserId}/consents`, {
      token: s.ownerToken,
      body: { consentType: 'photography', status: 'refused', givenBy: 'self' },
    });
    expect(photos.status).toBe(201);

    const consents = await http('GET', `/service-users/${s.serviceUserId}/consents`, {
      token: s.ownerToken,
    });
    expect(consents.status).toBe(200);
    const current = consents.body['current'] as Record<string, { status: string }>;
    expect(current['care_and_support']?.status).toBe('granted');
    expect(current['photography']?.status).toBe('refused');
  });

  it('the owner prescribes a medication and schedules today’s dose', async () => {
    const med = await http('POST', '/mar/medications', {
      token: s.ownerToken,
      body: {
        serviceUserId: s.serviceUserId,
        name: 'Paracetamol',
        purpose: 'Pain relief',
        dosage: '500mg',
        quantity: '2 tablets',
        formulation: 'tablet',
        route: 'oral',
        frequency: 'twice daily',
      },
    });
    expect(med.status).toBe(201);
    s.medicationId = med.body['id'] as string;

    const dose = await http('POST', '/mar/schedule', {
      token: s.ownerToken,
      body: {
        medicationId: s.medicationId,
        serviceUserId: s.serviceUserId,
        scheduledAt: new Date().toISOString(),
      },
    });
    expect(dose.status).toBe(201);
  });

  it('the owner schedules today’s shift for the carer', async () => {
    const now = Date.now();
    const res = await http('POST', '/shifts', {
      token: s.ownerToken,
      body: {
        serviceUserId: s.serviceUserId,
        careWorkerId: s.workerId,
        scheduledStart: new Date(now - 15 * 60_000).toISOString(),
        scheduledEnd: new Date(now + 2 * 3_600_000).toISOString(),
        shiftType: 'medication',
      },
    });
    expect(res.status).toBe(201);
    s.shiftId = res.body['id'] as string;
  });

  // ── The carer's day ───────────────────────────────────────────────────────

  it('the carer logs in (no MFA demanded for field staff) and sees the shift', async () => {
    const login = await http('POST', '/auth/login', {
      body: { email: workerEmail, password },
    });
    expect(login.status).toBe(200);
    expect(login.body['mfaSetupRequired']).toBeUndefined();
    s.workerToken = login.body['accessToken'] as string;

    const mine = await http('GET', '/shifts/mine', { token: s.workerToken });
    expect(mine.status).toBe(200);
    expect(asList(mine.body).some((sh) => sh['id'] === s.shiftId)).toBe(true);
  });

  it('clocking in at the door succeeds with the distance recorded', async () => {
    const res = await http('POST', '/clock-in', {
      token: s.workerToken,
      body: {
        shiftId: s.shiftId,
        latitude: HOME.lat,
        longitude: HOME.lon,
        accuracy: 8,
        deviceId: 'journey-test-device',
        eventType: 'clock_in',
        timestamp: new Date().toISOString(),
      },
    });
    expect(res.status).toBe(201);
    expect(res.body['success']).toBe(true);
    expect(res.body['fraudFlag']).toBe(false);
    expect(res.body['gpsDistanceMetres']).toBeLessThan(100);
  });

  it('a clock-in from 11 km away is fraud-flagged for the manager, not trusted', async () => {
    // Server-side design: suspicious events are RECORDED with fraudFlag so
    // managers see them (the mobile app additionally hard-blocks >3 km).
    const res = await http('POST', '/clock-in', {
      token: s.workerToken,
      body: {
        shiftId: s.shiftId,
        latitude: FAR.lat,
        longitude: FAR.lon,
        accuracy: 10,
        deviceId: 'journey-test-device',
        eventType: 'clock_in',
        timestamp: new Date().toISOString(),
      },
    });
    expect(res.status).toBe(201);
    expect(res.body['success']).toBe(false);
    expect(res.body['fraudFlag']).toBe(true);
    expect(res.body['gpsDistanceMetres']).toBeGreaterThan(3000);
    expect(String(res.body['message'])).toMatch(/GPS .*from expected location/);
  });

  it('the carer signs the scheduled dose on the MAR with their initials', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const daily = await http(
      'GET',
      `/mar/daily?serviceUserId=${s.serviceUserId}&date=${today}`,
      { token: s.workerToken },
    );
    expect(daily.status).toBe(200);
    const scheduled = asList(daily.body).find((r) => r['status'] === 'scheduled');
    expect(scheduled).toBeDefined();
    s.marRecordId = scheduled!['id'] as string;

    const given = await http('PATCH', `/mar/records/${s.marRecordId}/administer`, {
      token: s.workerToken,
      body: {
        status: 'given',
        timeCompleted: new Date().toISOString(),
        initials: 'ww',
      },
    });
    expect(given.status).toBe(200);
    expect(given.body['status']).toBe('given');
    expect(given.body['initials']).toBe('WW'); // signature normalised
  });

  it('the carer writes the visit note', async () => {
    const res = await http('POST', '/visit-notes', {
      token: s.workerToken,
      body: {
        shiftId: s.shiftId,
        narrative: 'Doris comfortable; medication taken with breakfast, good fluids.',
        mood: 'content',
        painLevel: 1,
      },
    });
    expect(res.status).toBe(201);
  });

  it('the carer clocks out at the end of the visit', async () => {
    const res = await http('POST', '/clock-in', {
      token: s.workerToken,
      body: {
        shiftId: s.shiftId,
        latitude: HOME.lat,
        longitude: HOME.lon,
        accuracy: 8,
        deviceId: 'journey-test-device',
        eventType: 'clock_out',
        timestamp: new Date().toISOString(),
      },
    });
    expect(res.status).toBe(201);
    expect(res.body['success']).toBe(true);
  });

  it('back at the office, the owner sees the signed MAR record', async () => {
    const record = await http('GET', `/mar/records/${s.marRecordId}`, {
      token: s.ownerToken,
    });
    expect(record.status).toBe(200);
    expect(record.body['status']).toBe('given');
    expect(record.body['initials']).toBe('WW');
  });

  // ── The eggshell: another agency sees nothing ─────────────────────────────

  it('a second agency signs up and enrolls MFA', async () => {
    const signup = await http('POST', '/auth/signup', {
      body: {
        agencyName: `Rival Care ${runId}`,
        country: 'UK',
        firstName: 'Rita',
        lastName: 'Rival',
        email: `rival-${runId}@journey.test`,
        password,
      },
    });
    expect(signup.status).toBe(201);
    const preMfa = signup.body['accessToken'] as string;

    const setup = await http('POST', '/auth/2fa/setup', { token: preMfa });
    const secret = secretFromOtpauthUrl(setup.body['otpauthUrl'] as string);
    const confirm = await http('POST', '/auth/2fa/confirm', {
      token: preMfa,
      body: { code: totp(secret) },
    });
    expect(confirm.status).toBe(201);
    s.agencyBToken = confirm.body['accessToken'] as string;
  });

  it('…and can see none of the first agency’s data', async () => {
    const list = await http('GET', '/service-users', { token: s.agencyBToken });
    expect(list.status).toBe(200);
    expect(asList(list.body).some((su) => su['id'] === s.serviceUserId)).toBe(false);

    const direct = await http('GET', `/service-users/${s.serviceUserId}`, {
      token: s.agencyBToken,
    });
    expect(direct.status).toBe(404); // not even "forbidden" — it does not exist for them

    const shift = await http('GET', `/shifts/${s.shiftId}`, { token: s.agencyBToken });
    expect(shift.status).toBe(404);
  });
});
