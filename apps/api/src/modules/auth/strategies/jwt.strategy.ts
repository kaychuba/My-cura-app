import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { JwtPayload, AuthUser } from '@my-cura/shared-types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    @InjectRepository(UserEntity) private userRepo: Repository<UserEntity>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('app.jwtSecret')!,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    if (payload.partial) {
      throw new UnauthorizedException('2FA verification required');
    }

    const user = await this.userRepo.findOne({
      where: { id: payload.sub, status: 'active' },
      select: ['id', 'email', 'role', 'tenantId', 'firstName', 'lastName'],
    });

    if (!user) throw new UnauthorizedException('User not found or inactive');

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }
}
