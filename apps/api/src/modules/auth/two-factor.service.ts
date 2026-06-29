import { Injectable } from '@nestjs/common';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';

@Injectable()
export class TwoFactorService {
  generateSecret(email: string) {
    const secret = speakeasy.generateSecret({
      name: `My-Cura (${email})`,
      issuer: 'My-Cura Care Platform',
      length: 32,
    });

    return {
      secret: secret.base32,
      otpauthUrl: secret.otpauth_url!,
    };
  }

  verifyToken(secretBase32: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret: secretBase32,
      encoding: 'base32',
      token,
      window: 1,
    });
  }

  async generateQRCode(otpauthUrl: string): Promise<string> {
    return qrcode.toDataURL(otpauthUrl);
  }
}
