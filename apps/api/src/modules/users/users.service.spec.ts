import { UsersService } from './users.service';
import { UserRole, UserStatus } from '@my-cura/shared-types';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

/** Unit tests for account safety: role hierarchy + secret stripping. */
describe('UsersService', () => {
  const TENANT = 't1';
  const manager = { id: 'mgr', role: UserRole.MANAGER } as never;
  const owner = { id: 'own', role: UserRole.AGENCY_OWNER } as never;

  const worker = () => ({
    id: 'u1',
    tenantId: TENANT,
    email: 'w@x.com',
    role: UserRole.CARE_WORKER,
    status: UserStatus.ACTIVE,
    firstName: 'W',
    lastName: 'One',
    passwordHash: 'hash',
    totpSecretEnc: 'secret',
    biometricPublicKey: 'key',
    biometricDeviceId: 'device',
  });

  const makeService = (found: unknown = null) => {
    const repo = {
      findOne: jest.fn().mockResolvedValue(found),
      findAndCount: jest.fn().mockResolvedValue([[worker()], 1]),
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => x),
    };
    return { service: new UsersService(repo as never), repo };
  };

  it('strips every sensitive field from list responses', async () => {
    const { service } = makeService();
    const res = await service.list(TENANT, {});
    const u = res.data[0] as Record<string, unknown>;
    for (const secret of ['passwordHash', 'totpSecretEnc', 'biometricPublicKey', 'biometricDeviceId']) {
      expect(u[secret]).toBeUndefined();
    }
    expect(u['email']).toBe('w@x.com');
  });

  it('a manager cannot create another manager (or higher)', async () => {
    const { service } = makeService();
    await expect(
      service.create(TENANT, manager, {
        email: 'new@x.com', password: 'Password1!', firstName: 'A', lastName: 'B',
        role: UserRole.MANAGER,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('an owner can create a manager', async () => {
    const { service, repo } = makeService();
    const res = await service.create(TENANT, owner, {
      email: 'New@X.com', password: 'Password1!', firstName: 'A', lastName: 'B',
      role: UserRole.MANAGER,
    });
    expect(repo.save).toHaveBeenCalled();
    expect((res as Record<string, unknown>)['email']).toBe('new@x.com'); // lowercased
    expect((res as Record<string, unknown>)['passwordHash']).toBeUndefined();
  });

  it('rejects short passwords', async () => {
    const { service } = makeService();
    await expect(
      service.create(TENANT, owner, {
        email: 'a@b.com', password: 'short', firstName: 'A', lastName: 'B',
        role: UserRole.CARE_WORKER,
      }),
    ).rejects.toThrow('at least 8');
  });

  it('you cannot deactivate your own account', async () => {
    const { service } = makeService(worker());
    await expect(
      service.deactivate(TENANT, { id: 'u1', role: UserRole.AGENCY_OWNER } as never, 'u1'),
    ).rejects.toThrow(BadRequestException);
  });
});
