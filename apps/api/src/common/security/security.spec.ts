import { assertAcceptablePassword, hashPassword, verifyPassword } from './password.util';
import { validateUpload, UploadRejectedError } from './upload-guard.util';
import {
  encryptWithKeyring,
  decryptWithKeyring,
  encrypt,
  needsReencryption,
  EncryptionKeyring,
} from '@my-cura/shared-utils';
import { SecurityMonitorService } from './security-monitor.service';
import * as bcrypt from 'bcrypt';

describe('password hashing (Argon2id)', () => {
  it('hashes with Argon2id and verifies round-trip', async () => {
    const hash = await hashPassword('Correct-Horse-9');
    expect(hash.startsWith('$argon2id$')).toBe(true);
    expect((await verifyPassword('Correct-Horse-9', hash)).valid).toBe(true);
    expect((await verifyPassword('wrong', hash)).valid).toBe(false);
  }, 30_000);

  it('verifies legacy bcrypt hashes and upgrades them in flight', async () => {
    const legacy = await bcrypt.hash('OldPassword1!', 10);
    const check = await verifyPassword('OldPassword1!', legacy);
    expect(check.valid).toBe(true);
    expect(check.upgradedHash?.startsWith('$argon2id$')).toBe(true);
    // and the upgraded hash actually works
    expect((await verifyPassword('OldPassword1!', check.upgradedHash!)).valid).toBe(true);
  }, 30_000);

  it('rejects a wrong password against a bcrypt hash without upgrading', async () => {
    const legacy = await bcrypt.hash('OldPassword1!', 10);
    const check = await verifyPassword('nope', legacy);
    expect(check).toEqual({ valid: false });
  }, 30_000);
});

describe('password acceptance policy', () => {
  it('accepts a decent passphrase', () => {
    expect(() => assertAcceptablePassword('correct-horse-battery', ['w@x.com'])).not.toThrow();
  });

  it('rejects the passwords attackers try first', () => {
    expect(() => assertAcceptablePassword('password123')).toThrow(/too common/);
    expect(() => assertAcceptablePassword('Passw0rd')).toThrow(/too common/);
    expect(() => assertAcceptablePassword('demo1234')).toThrow(/too common/);
  });

  it('rejects passwords built from the user’s own identity', () => {
    expect(() =>
      assertAcceptablePassword('doris.whitfield99', ['doris.whitfield@agency.co.uk']),
    ).toThrow(/name or email/);
  });

  it('rejects trivial and out-of-bounds shapes', () => {
    expect(() => assertAcceptablePassword('aaaaaaaaaa')).toThrow(/repeated/);
    expect(() => assertAcceptablePassword('short7!')).toThrow(/at least 8/);
    expect(() => assertAcceptablePassword('x'.repeat(20) + 'y'.repeat(120))).toThrow(/at most 128/);
  });
});

describe('versioned encryption keyring', () => {
  const k1 = 'a'.repeat(64);
  const k2 = 'b'.repeat(64);

  it('round-trips and prefixes the key version', () => {
    const ring: EncryptionKeyring = { current: 2, keys: { 1: k1, 2: k2 } };
    const ct = encryptWithKeyring('NI: QQ123456C', ring);
    expect(ct.startsWith('v2:')).toBe(true);
    expect(decryptWithKeyring(ct, ring)).toBe('NI: QQ123456C');
  });

  it('still decrypts data written under a retired key', () => {
    const oldRing: EncryptionKeyring = { current: 1, keys: { 1: k1 } };
    const ct = encryptWithKeyring('signature-svg', oldRing);
    const rotated: EncryptionKeyring = { current: 2, keys: { 1: k1, 2: k2 } };
    expect(decryptWithKeyring(ct, rotated)).toBe('signature-svg');
    expect(needsReencryption(ct, rotated)).toBe(true);
  });

  it('treats unprefixed ciphertext as key v1 (pre-versioning data)', () => {
    const legacyCt = encrypt('legacy-secret', k1);
    const ring: EncryptionKeyring = { current: 2, keys: { 1: k1, 2: k2 } };
    expect(decryptWithKeyring(legacyCt, ring)).toBe('legacy-secret');
    expect(needsReencryption(legacyCt, ring)).toBe(true);
  });

  it('refuses to decrypt when the writing key is missing from the ring', () => {
    const ct = encryptWithKeyring('x', { current: 3, keys: { 3: k2 } });
    expect(() => decryptWithKeyring(ct, { current: 4, keys: { 4: k1 } })).toThrow(/v3/);
  });
});

describe('upload guard', () => {
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.from('fake image data'),
  ]);

  it('accepts a genuine PNG and assigns a random storage name', async () => {
    const result = await validateUpload(png, 'profile photo.PNG');
    expect(result.extension).toBe('png');
    expect(result.storageName).toMatch(/^[0-9a-f-]{36}\.png$/);
    // never the client's name
    expect(result.storageName).not.toContain('profile');
  });

  it('rejects content that does not match the declared extension', async () => {
    const script = Buffer.from('#!/bin/sh\nrm -rf /\n');
    await expect(validateUpload(script, 'innocent.png')).rejects.toThrow(UploadRejectedError);
  });

  it('rejects disallowed extensions outright', async () => {
    await expect(validateUpload(png, 'run-me.exe')).rejects.toThrow(/not allowed/);
    await expect(validateUpload(png, 'no-extension')).rejects.toThrow(/not allowed/);
  });

  it('enforces the per-endpoint allowlist and the size cap', async () => {
    await expect(
      validateUpload(png, 'x.png', { allowedExtensions: ['pdf'] }),
    ).rejects.toThrow(/Only pdf/);
    await expect(
      validateUpload(Buffer.alloc(11 * 1024 * 1024, 1), 'big.png', { maxBytes: 10 * 1024 * 1024 }),
    ).rejects.toThrow(/limit/);
  });

  it('rejects CSVs smuggling binary content', async () => {
    const binary = Buffer.concat([Buffer.from('a,b,c\n'), Buffer.from([0x00, 0x01])]);
    await expect(validateUpload(binary, 'import.csv')).rejects.toThrow(UploadRejectedError);
  });
});

describe('security monitor thresholds', () => {
  const makeMonitor = () => {
    const monitor = new SecurityMonitorService({ get: () => undefined } as never);
    const alerts: string[] = [];
    // capture instead of webhook/log
    (monitor as unknown as { dispatch: (t: string, d: string) => Promise<void> }).dispatch =
      async (title: string) => {
        alerts.push(title);
      };
    return { monitor, alerts };
  };

  it('stays quiet under the threshold, alerts once at it', () => {
    const { monitor, alerts } = makeMonitor();
    for (let i = 0; i < 9; i++) monitor.record('login_failure');
    expect(alerts).toHaveLength(0);
    monitor.record('login_failure'); // 10th within 5 min
    expect(alerts.some((a) => a.includes('Login failures'))).toBe(true);
  });

  it('flags one user hammering forbidden endpoints (privilege probing)', () => {
    const { monitor, alerts } = makeMonitor();
    for (let i = 0; i < 5; i++) monitor.record('forbidden', 'user-123');
    expect(alerts.some((a) => a.includes('privilege'))).toBe(true);
  });

  it('cools down instead of re-alerting on every subsequent event', () => {
    const { monitor, alerts } = makeMonitor();
    for (let i = 0; i < 30; i++) monitor.record('server_error');
    expect(alerts.length).toBe(1);
  });
});
