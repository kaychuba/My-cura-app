import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@my-cura/shared-types';
import { ROLES_KEY } from '../decorators/roles.decorator';

const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.SUPER_ADMIN]: 100,
  [UserRole.AGENCY_OWNER]: 80,
  [UserRole.MANAGER]: 60,
  [UserRole.CARE_WORKER]: 40,
  [UserRole.SERVICE_USER]: 20,
  [UserRole.FAMILY]: 10,
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<{ user: { role: UserRole } }>();
    const userRole = request.user?.role;

    if (!userRole) return false;

    const userLevel = ROLE_HIERARCHY[userRole] ?? 0;
    return requiredRoles.some((role) => userLevel >= ROLE_HIERARCHY[role]);
  }
}
