import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserEntity } from '../users/entities/user.entity';
import { TokenService } from './token.service';
import { TwoFactorService } from './two-factor.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Verify2FADto } from './dto/verify-2fa.dto';
import { BiometricChallengeDto } from './dto/biometric-challenge.dto';
import { Country, SubscriptionTier, UserRole, UserStatus } from '@my-cura/shared-types';
import { createPublicKey, createVerify } from 'crypto';
import { TenantEntity } from '../tenants/entities/tenant.entity';

const BCRYPT_ROUNDS = 12;

export interface SignupDto {
  agencyName: string;
  country?: 'UK' | 'US';
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity, 'auth') private userRepo: Repository<UserEntity>,
    @InjectRepository(TenantEntity, 'auth') private tenantRepo: Repository<TenantEntity>,
    private tokenService: TokenService,
    private twoFactorService: TwoFactorService,
  ) {}

  async validateLocalUser(email: string, password: string): Promise<UserEntity> {
    const user = await this.userRepo.findOne({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) throw new UnauthorizedException('Invalid credentials');

    if (user.status !== 'active') {
      throw new UnauthorizedException('Account is not active');
    }

    return user;
  }

  async login(dto: LoginDto) {
    const user = await this.validateLocalUser(dto.email, dto.password);

    if (user.is2faEnabled) {
      // Return a partial token that only allows 2FA verification
      const partialToken = await this.tokenService.signPartialToken(user.id);
      return { requires2FA: true, partialToken };
    }

    await this.userRepo.update(user.id, { lastLoginAt: new Date() });
    return this.tokenService.generateTokenPair(user);
  }

  /** Self-serve: a new care agency creates its tenant + owner in one step. */
  async signup(dto: SignupDto) {
    if (!dto.agencyName?.trim()) throw new ConflictException('Agency name is required');
    if (!dto.password || dto.password.length < 8) {
      throw new ConflictException('Password must be at least 8 characters');
    }
    const email = dto.email.toLowerCase().trim();
    const emailTaken = await this.userRepo.findOne({ where: { email } });
    if (emailTaken) throw new ConflictException('An account with this email already exists');

    const baseSlug = dto.agencyName.trim().toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'agency';
    let slug = baseSlug;
    for (let n = 2; await this.tenantRepo.findOne({ where: { slug } }); n++) {
      slug = `${baseSlug}-${n}`;
    }

    const tenant = await this.tenantRepo.save(
      this.tenantRepo.create({
        slug,
        name: dto.agencyName.trim(),
        country: dto.country === 'US' ? Country.US : Country.UK,
        subscriptionTier: SubscriptionTier.STARTER,
        subscriptionStatus: 'trial',
        settings: {},
        isActive: true,
      }),
    );

    await this.userRepo.save(
      this.userRepo.create({
        tenantId: tenant.id,
        email,
        passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        role: UserRole.AGENCY_OWNER,
        status: UserStatus.ACTIVE,
      }),
    );

    return this.login({ email, password: dto.password });
  }

  async register(dto: RegisterDto, tenantId: string) {
    const existing = await this.userRepo.findOne({
      where: { email: dto.email.toLowerCase().trim(), tenantId },
    });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = this.userRepo.create({
      email: dto.email.toLowerCase().trim(),
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      role: dto.role ?? UserRole.CARE_WORKER,
      tenantId,
      status: UserStatus.ACTIVE,
    } as unknown as UserEntity);

    const saved = (await this.userRepo.save(user)) as unknown as UserEntity;
    return this.tokenService.generateTokenPair(saved);
  }

  async verify2FA(dto: Verify2FADto) {
    const userId = await this.tokenService.verifyPartialToken(dto.partialToken);
    const user = await this.userRepo.findOneOrFail({ where: { id: userId } });

    if (!user.totpSecretEnc) throw new UnauthorizedException('2FA not configured');

    const isValid = this.twoFactorService.verifyToken(user.totpSecretEnc, dto.code);
    if (!isValid) throw new UnauthorizedException('Invalid 2FA code');

    await this.userRepo.update(user.id, { lastLoginAt: new Date() });
    return this.tokenService.generateTokenPair(user);
  }

  async setup2FA(userId: string) {
    const user = await this.userRepo.findOneOrFail({ where: { id: userId } });
    const { secret, otpauthUrl } = this.twoFactorService.generateSecret(user.email);

    // Store encrypted secret temporarily — confirmed on first verification
    await this.userRepo.update(userId, {
      totpSecretEnc: secret,
      is2faEnabled: false,
    });

    const qrCodeDataUrl = await this.twoFactorService.generateQRCode(otpauthUrl);
    return { otpauthUrl, qrCodeDataUrl };
  }

  async confirm2FA(userId: string, code: string) {
    const user = await this.userRepo.findOneOrFail({ where: { id: userId } });
    if (!user.totpSecretEnc) throw new NotFoundException('2FA setup not initiated');

    const isValid = this.twoFactorService.verifyToken(user.totpSecretEnc, code);
    if (!isValid) throw new UnauthorizedException('Invalid 2FA code — setup failed');

    await this.userRepo.update(userId, { is2faEnabled: true });
    return { success: true };
  }

  async disable2FA(userId: string, code: string) {
    const user = await this.userRepo.findOneOrFail({ where: { id: userId } });
    if (!user.is2faEnabled) throw new UnauthorizedException('2FA is not enabled');

    const isValid = this.twoFactorService.verifyToken(user.totpSecretEnc!, code);
    if (!isValid) throw new UnauthorizedException('Invalid 2FA code');

    await this.userRepo.update(userId, { is2faEnabled: false, totpSecretEnc: null });
    return { success: true };
  }

  async registerBiometricKey(userId: string, publicKeyBase64: string, deviceId: string) {
    await this.userRepo.update(userId, {
      biometricPublicKey: publicKeyBase64,
      biometricDeviceId: deviceId,
    });
    return { success: true };
  }

  async verifyBiometricChallenge(dto: BiometricChallengeDto) {
    const user = await this.userRepo.findOneOrFail({ where: { id: dto.userId } });

    if (!user.biometricPublicKey) {
      throw new UnauthorizedException('Biometric not registered for this account');
    }

    try {
      const publicKey = createPublicKey({
        key: Buffer.from(user.biometricPublicKey, 'base64'),
        format: 'der',
        type: 'spki',
      });
      const verify = createVerify('SHA256');
      verify.update(dto.challenge);
      const isValid = verify.verify(publicKey, dto.signature, 'base64');
      if (!isValid) throw new UnauthorizedException('Biometric verification failed');
    } catch {
      throw new UnauthorizedException('Biometric verification failed');
    }

    return this.tokenService.generateTokenPair(user);
  }

  async refreshTokens(refreshToken: string) {
    return this.tokenService.refreshTokens(refreshToken);
  }

  async logout(userId: string, refreshToken: string) {
    await this.tokenService.revokeRefreshToken(refreshToken);
    return { success: true };
  }

  async handleOAuthCallback(oauthUser: Partial<UserEntity>, tenantId?: string) {
    let user = await this.userRepo.findOne({
      where: { email: oauthUser.email! },
    });

    if (!user) {
      if (!tenantId) {
        throw new UnauthorizedException('No account found. Please register first.');
      }
      user = this.userRepo.create({
        ...oauthUser,
        tenantId,
        role: UserRole.CARE_WORKER,
        status: UserStatus.ACTIVE,
      } as unknown as UserEntity);
      user = (await this.userRepo.save(user)) as unknown as UserEntity;
    }

    return this.tokenService.generateTokenPair(user);
  }
}
