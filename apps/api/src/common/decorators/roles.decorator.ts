import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@my-cura/shared-types';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
