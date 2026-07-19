import * as argon2 from 'argon2';
import * as bcrypt from 'bcrypt';
import { BadRequestException } from '@nestjs/common';

// NCSC guidance: prefer length + a denylist of the passwords attackers try
// first over composition rules that push users toward "P@ssw0rd1".
const MIN_LENGTH = 8;
const MAX_LENGTH = 128;
const DENYLIST = new Set([
  'password', 'password1', 'password!', 'password123', 'passw0rd', 'p@ssw0rd',
  '12345678', '123456789', '1234567890', '87654321', '11111111', '00000000',
  'qwertyui', 'qwerty123', 'asdfghjk', 'asdf1234', '1q2w3e4r', 'zaq12wsx',
  'iloveyou', 'sunshine', 'princess', 'welcome1', 'letmein1', 'monkey12',
  'football', 'baseball', 'superman', 'trustno1', 'dragon12', 'master12',
  'mycura12', 'mycura123', 'carehome', 'carehome1', 'careworker', 'admin123',
  'changeme', 'change_me', 'temp1234', 'test1234', 'demo1234', 'summer2026',
]);

/**
 * Throws BadRequestException when the password is unacceptable. `identity`
 * values (email, names) are rejected as password material.
 */
export function assertAcceptablePassword(password: string, identity: string[] = []): void {
  if (!password || password.length < MIN_LENGTH) {
    throw new BadRequestException(`Password must be at least ${MIN_LENGTH} characters`);
  }
  if (password.length > MAX_LENGTH) {
    throw new BadRequestException(`Password must be at most ${MAX_LENGTH} characters`);
  }
  const lower = password.toLowerCase();
  if (DENYLIST.has(lower)) {
    throw new BadRequestException('That password is too common — choose something less guessable');
  }
  if (/^(.)\1+$/.test(password)) {
    throw new BadRequestException('Password cannot be one repeated character');
  }
  for (const raw of identity) {
    const part = raw?.split('@')[0]?.toLowerCase();
    if (part && part.length >= 4 && lower.includes(part)) {
      throw new BadRequestException('Password must not contain your name or email');
    }
  }
}

// OWASP-recommended Argon2id parameters (memory-hard: 64 MiB, 3 passes).
const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
};

export function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, ARGON2_OPTIONS);
}

export interface PasswordCheck {
  valid: boolean;
  /**
   * Present when the stored hash uses a legacy algorithm (bcrypt) and the
   * password verified — callers should persist this Argon2id hash so the
   * account migrates transparently on its next successful login.
   */
  upgradedHash?: string;
}

export async function verifyPassword(plain: string, storedHash: string): Promise<PasswordCheck> {
  if (storedHash.startsWith('$argon2')) {
    return { valid: await argon2.verify(storedHash, plain) };
  }
  // Legacy bcrypt hash ($2a$/$2b$): verify, then upgrade in place.
  const valid = await bcrypt.compare(plain, storedHash);
  if (!valid) return { valid: false };
  return { valid: true, upgradedHash: await hashPassword(plain) };
}
