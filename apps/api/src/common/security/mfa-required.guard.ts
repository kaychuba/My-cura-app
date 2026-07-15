import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@my-cura/shared-types';
import { Request } from 'express';
import { ALLOW_PRE_MFA } from './allow-pre-mfa.decorator';

/** Roles with tenant-wide reach — a stolen password alone must not be enough. */
export const MFA_REQUIRED_ROLES: ReadonlySet<string> = new Set<string>([
  UserRole.SUPER_ADMIN,
  UserRole.AGENCY_OWNER,
  UserRole.MANAGER,
]);

/**
 * Global guard: administrator and office-staff tokens minted before MFA
 * enrollment (payload `mfa: false`) may only reach the endpoints required to
 * finish enrolling (marked @AllowPreMfa). Everything else is refused until
 * the account has MFA.
 *
 * Runs before route guards, so it verifies the bearer token itself; requests
 * without a (valid) token pass through untouched — the route's own JwtAuthGuard
 * remains the authority on authentication.
 */
@Injectable()
export class MfaRequiredGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return true;

    let payload: { role?: string; mfa?: boolean; partial?: boolean };
    try {
      payload = this.jwtService.verify(header.slice(7));
    } catch {
      return true; // invalid/expired — the JWT guard on the route will reject it
    }

    if (payload.partial) return true; // 2FA-challenge token, scope-limited already
    if (!payload.role || !MFA_REQUIRED_ROLES.has(payload.role)) return true;
    if (payload.mfa) return true;

    const allowPreMfa = this.reflector.getAllAndOverride<boolean>(ALLOW_PRE_MFA, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (allowPreMfa) return true;

    throw new ForbiddenException(
      'Multi-factor authentication is required for administrator accounts. ' +
        'Enroll via POST /auth/2fa/setup, then confirm with POST /auth/2fa/confirm.',
    );
  }
}
