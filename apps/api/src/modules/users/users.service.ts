import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserRole, UserStatus, AuthUser } from '@my-cura/shared-types';
import { UserEntity } from './entities/user.entity';

const BCRYPT_ROUNDS = 12;

/** Fields that must never leave the API. */
const SENSITIVE_FIELDS = [
  'passwordHash',
  'totpSecretEnc',
  'biometricPublicKey',
  'biometricDeviceId',
] as const;

const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.SUPER_ADMIN]: 100,
  [UserRole.AGENCY_OWNER]: 80,
  [UserRole.MANAGER]: 60,
  [UserRole.CARE_WORKER]: 40,
  [UserRole.SERVICE_USER]: 20,
  [UserRole.FAMILY]: 10,
};

export type SafeUser = Omit<UserEntity, (typeof SENSITIVE_FIELDS)[number]>;

export interface CreateUserDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phone?: string;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: UserRole;
  status?: UserStatus;
}

export interface UserFilter {
  search?: string;
  role?: UserRole;
  status?: UserStatus;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private userRepo: Repository<UserEntity>,
  ) {}

  private sanitize(user: UserEntity): SafeUser {
    const copy: Partial<UserEntity> = { ...user };
    for (const field of SENSITIVE_FIELDS) delete copy[field];
    return copy as SafeUser;
  }

  /** An actor may only manage roles strictly below their own. */
  private assertCanManageRole(actor: AuthUser, targetRole: UserRole) {
    if (ROLE_HIERARCHY[actor.role] <= ROLE_HIERARCHY[targetRole]) {
      throw new ForbiddenException(
        'You cannot create or modify users at or above your own role',
      );
    }
  }

  async list(tenantId: string, filter: UserFilter, page = 1, limit = 20) {
    const base: Record<string, unknown> = { tenantId };
    if (filter.role) base['role'] = filter.role;
    if (filter.status) base['status'] = filter.status;

    const where = filter.search
      ? [
          { ...base, firstName: ILike(`%${filter.search}%`) },
          { ...base, lastName: ILike(`%${filter.search}%`) },
          { ...base, email: ILike(`%${filter.search}%`) },
        ]
      : [base];

    const [data, total] = await this.userRepo.findAndCount({
      where: where as never,
      order: { lastName: 'ASC', firstName: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: data.map((u) => this.sanitize(u)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getById(tenantId: string, id: string): Promise<SafeUser> {
    return this.sanitize(await this.findEntity(tenantId, id));
  }

  async create(tenantId: string, actor: AuthUser, dto: CreateUserDto): Promise<SafeUser> {
    this.assertCanManageRole(actor, dto.role);

    const existing = await this.userRepo.findOne({
      where: { tenantId, email: dto.email.toLowerCase() },
    });
    if (existing) throw new BadRequestException('A user with this email already exists');
    if (!dto.password || dto.password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    const user = this.userRepo.create({
      tenantId,
      email: dto.email.toLowerCase(),
      passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: dto.role,
      phone: dto.phone,
      status: UserStatus.ACTIVE,
    });
    return this.sanitize(await this.userRepo.save(user));
  }

  async update(tenantId: string, actor: AuthUser, id: string, dto: UpdateUserDto): Promise<SafeUser> {
    const user = await this.findEntity(tenantId, id);
    this.assertCanManageRole(actor, user.role);
    if (dto.role) this.assertCanManageRole(actor, dto.role);

    Object.assign(user, dto);
    return this.sanitize(await this.userRepo.save(user));
  }

  async deactivate(tenantId: string, actor: AuthUser, id: string): Promise<SafeUser> {
    if (actor.id === id) throw new BadRequestException('You cannot deactivate your own account');
    const user = await this.findEntity(tenantId, id);
    this.assertCanManageRole(actor, user.role);

    user.status = UserStatus.INACTIVE;
    return this.sanitize(await this.userRepo.save(user));
  }

  async resetPassword(
    tenantId: string,
    actor: AuthUser,
    id: string,
    newPassword: string,
  ): Promise<{ ok: true }> {
    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }
    const user = await this.findEntity(tenantId, id);
    if (actor.id !== id) this.assertCanManageRole(actor, user.role);

    user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.userRepo.save(user);
    return { ok: true };
  }

  private async findEntity(tenantId: string, id: string): Promise<UserEntity> {
    const user = await this.userRepo.findOne({ where: { id, tenantId } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
