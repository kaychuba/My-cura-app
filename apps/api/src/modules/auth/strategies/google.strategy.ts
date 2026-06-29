import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get<string>('app.google.clientId') ?? 'not-configured',
      clientSecret: config.get<string>('app.google.clientSecret') ?? 'not-configured',
      callbackURL: config.get<string>('app.google.callbackUrl') ?? 'http://localhost:3000/api/v1/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ) {
    const email = profile.emails?.[0]?.value;
    const avatarUrl = profile.photos?.[0]?.value;

    return {
      googleId: profile.id,
      email,
      firstName: profile.name?.givenName ?? '',
      lastName: profile.name?.familyName ?? '',
      avatarS3Key: avatarUrl,
    };
  }
}
