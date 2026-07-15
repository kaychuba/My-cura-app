import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EncryptionKeyring,
  encryptWithKeyring,
  decryptWithKeyring,
  needsReencryption,
} from '@my-cura/shared-utils';

/**
 * Field-level encryption with key rotation support.
 *
 * Env contract:
 *   ENCRYPTION_KEY          current 64-hex AES-256 key (required)
 *   ENCRYPTION_KEY_VERSION  version number of ENCRYPTION_KEY (default 1)
 *   ENCRYPTION_KEYS_RETIRED optional JSON map of older versions still needed
 *                           to read data written before the last rotation,
 *                           e.g. {"1":"<old 64-hex key>"}
 *
 * Rotation: bump ENCRYPTION_KEY_VERSION, move the old key into
 * ENCRYPTION_KEYS_RETIRED, deploy, then run scripts/reencrypt-fields.ts.
 * See docs/DATA-PROTECTION.md §6.
 */
@Injectable()
export class EncryptionService {
  private readonly ring: EncryptionKeyring;

  constructor(config: ConfigService) {
    const current = Number(config.get('ENCRYPTION_KEY_VERSION') ?? 1);
    const keys: Record<number, string> = {
      [current]: config.getOrThrow<string>('ENCRYPTION_KEY'),
    };
    const retired = config.get<string>('ENCRYPTION_KEYS_RETIRED');
    if (retired) {
      for (const [version, key] of Object.entries(JSON.parse(retired) as Record<string, string>)) {
        keys[Number(version)] = key;
      }
    }
    this.ring = { current, keys };
  }

  encrypt(plaintext: string): string {
    return encryptWithKeyring(plaintext, this.ring);
  }

  decrypt(ciphertext: string): string {
    return decryptWithKeyring(ciphertext, this.ring);
  }

  needsRotation(ciphertext: string): boolean {
    return needsReencryption(ciphertext, this.ring);
  }

  keyring(): EncryptionKeyring {
    return this.ring;
  }
}
