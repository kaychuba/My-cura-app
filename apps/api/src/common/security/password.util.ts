import * as argon2 from 'argon2';
import * as bcrypt from 'bcrypt';

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
