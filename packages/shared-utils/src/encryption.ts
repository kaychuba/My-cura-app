// AES-256-GCM encryption utilities
// The key is provided by the caller (from AWS Secrets Manager in production)
// Node-only module: the reference below pulls in Node globals (Buffer) for
// consumers whose tsconfig does not include @types/node (web, mobile).

/// <reference types="node" />

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

export function encrypt(plaintext: string, keyHex: string): string {
  const key = Buffer.from(keyHex, 'hex');
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

export function decrypt(ciphertext: string, keyHex: string): string {
  const key = Buffer.from(keyHex, 'hex');
  const buf = Buffer.from(ciphertext, 'base64');
  const iv = buf.subarray(0, IV_LENGTH);
  const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = buf.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted) + decipher.final('utf8');
}

// ---------------------------------------------------------------------------
// Versioned keyring: ciphertexts carry a `v<N>:` prefix naming the key that
// produced them, so keys can be rotated without re-encrypting everything at
// once. Unprefixed ciphertexts are legacy (pre-versioning) and decrypt with
// key version 1.
// ---------------------------------------------------------------------------

export interface EncryptionKeyring {
  /** Version number of the key new ciphertexts are written with. */
  current: number;
  /** version -> 64-hex AES-256 key. Must include `current`. */
  keys: Record<number, string>;
}

const VERSION_PREFIX = /^v(\d+):(.*)$/s;

export function encryptWithKeyring(plaintext: string, ring: EncryptionKeyring): string {
  const key = ring.keys[ring.current];
  if (!key) throw new Error(`Keyring has no key for current version v${ring.current}`);
  return `v${ring.current}:${encrypt(plaintext, key)}`;
}

export function decryptWithKeyring(ciphertext: string, ring: EncryptionKeyring): string {
  const match = VERSION_PREFIX.exec(ciphertext);
  const version = match ? Number(match[1]) : 1;
  const body = match ? match[2] : ciphertext;
  const key = ring.keys[version];
  if (!key) {
    throw new Error(
      `Ciphertext was written with key v${version}, which is not in the keyring. ` +
        'Retired keys must stay available until their data is re-encrypted.',
    );
  }
  return decrypt(body, key);
}

/** Key version a ciphertext was written with (1 for legacy unprefixed data). */
export function ciphertextKeyVersion(ciphertext: string): number {
  const match = VERSION_PREFIX.exec(ciphertext);
  return match ? Number(match[1]) : 1;
}

/** True when a ciphertext predates the keyring's current key and should be re-encrypted. */
export function needsReencryption(ciphertext: string, ring: EncryptionKeyring): boolean {
  return ciphertextKeyVersion(ciphertext) !== ring.current;
}
