import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { UserEntity } from '../users/entities/user.entity';
import { JwtPayload } from '@my-cura/shared-types';

@Injectable()
export class TokenService {
  private readonly refreshSecret: string;
  private readonly refreshExpiresIn: string;

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectRepository(UserEntity, 'auth') private userRepo: Repository<UserEntity>,
  ) {
    this.refreshSecret = this.configService.get<string>('app.jwtRefreshSecret')!;
    this.refreshExpiresIn = this.configService.get<string>('app.jwtRefreshExpiresIn') ?? '30d';
  }

  async generateTokenPair(user: UserEntity) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      // Lets MfaRequiredGuard confine staff sessions minted before MFA
      // enrollment to the enrollment endpoints.
      mfa: user.is2faEnabled === true,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(
        { sub: user.id, jti: uuidv4() },
        { secret: this.refreshSecret, expiresIn: this.refreshExpiresIn },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        tenantId: user.tenantId,
        avatarS3Key: user.avatarS3Key,
      },
    };
  }

  async signPartialToken(userId: string): Promise<string> {
    return this.jwtService.signAsync(
      { sub: userId, partial: true },
      { expiresIn: '10m' },
    );
  }

  async verifyPartialToken(token: string): Promise<string> {
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string; partial: boolean }>(token);
      if (!payload.partial) throw new Error('Not a partial token');
      return payload.sub;
    } catch {
      throw new UnauthorizedException('Invalid or expired 2FA session');
    }
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string }>(refreshToken, {
        secret: this.refreshSecret,
      });

      const user = await this.userRepo.findOneOrFail({ where: { id: payload.sub } });
      if (user.status !== 'active') throw new UnauthorizedException('Account not active');

      return this.generateTokenPair(user);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async revokeRefreshToken(_refreshToken: string) {
    // In production: add the jti to a Redis blocklist with TTL matching the token expiry
    // For now: no-op (stateless JWT — refresh rotation is the primary protection)
    return true;
  }
}
