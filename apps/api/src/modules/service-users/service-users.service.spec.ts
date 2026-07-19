import { ServiceUsersService } from './service-users.service';
import { ConsentGivenBy, ConsentStatus, ConsentType } from '@my-cura/shared-types';
import { BadRequestException } from '@nestjs/common';

/** Unit tests for consent recording — the MCA rules and append-only shape. */
describe('ServiceUsersService consents', () => {
  const TENANT = 't1';
  const SU = 'su1';
  const MANAGER = 'mgr1';

  const makeService = (existing: unknown[] = []) => {
    const suRepo = { findOne: jest.fn().mockResolvedValue({ id: SU, tenantId: TENANT }) };
    const consentRepo = {
      find: jest.fn().mockResolvedValue(existing),
      findOne: jest.fn().mockResolvedValue((existing as { consentType?: string }[])[0] ?? null),
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => ({ id: 'c-new', recordedAt: new Date(), ...x })),
    };
    return {
      service: new ServiceUsersService(suRepo as never, consentRepo as never),
      consentRepo,
    };
  };

  const dto = (over: Partial<Record<string, unknown>> = {}) => ({
    consentType: ConsentType.CARE_AND_SUPPORT,
    status: ConsentStatus.GRANTED,
    givenBy: ConsentGivenBy.SELF,
    ...over,
  });

  it('records consent given by the person themselves', async () => {
    const { service, consentRepo } = makeService();
    const saved = await service.recordConsent(TENANT, MANAGER, SU, dto() as never);
    expect(saved.status).toBe(ConsentStatus.GRANTED);
    expect(consentRepo.save).toHaveBeenCalled();
    const row = consentRepo.create.mock.calls[0][0] as Record<string, unknown>;
    expect(row['recordedBy']).toBe(MANAGER);
    expect(row['tenantId']).toBe(TENANT);
  });

  it('a decision by an attorney must name them', async () => {
    const { service } = makeService();
    await expect(
      service.recordConsent(TENANT, MANAGER, SU, dto({
        givenBy: ConsentGivenBy.ATTORNEY, capacityAssessed: true,
      }) as never),
    ).rejects.toThrow(/name the attorney/i);
  });

  it('a decision on someone’s behalf requires a capacity assessment', async () => {
    const { service } = makeService();
    await expect(
      service.recordConsent(TENANT, MANAGER, SU, dto({
        givenBy: ConsentGivenBy.BEST_INTERESTS, givenByName: 'Dr Amara Okafor',
      }) as never),
    ).rejects.toThrow(/capacity assessment/i);
  });

  it('withdrawal is only valid against granted consent', async () => {
    const { service } = makeService([]); // no prior consent
    await expect(
      service.recordConsent(TENANT, MANAGER, SU, dto({ status: ConsentStatus.WITHDRAWN }) as never),
    ).rejects.toThrow(/only granted/i);
  });

  it('withdrawing granted consent appends a new event (never edits)', async () => {
    const granted = {
      consentType: ConsentType.CARE_AND_SUPPORT,
      status: ConsentStatus.GRANTED,
      recordedAt: new Date('2026-07-01'),
    };
    const { service, consentRepo } = makeService([granted]);
    const saved = await service.recordConsent(
      TENANT, MANAGER, SU, dto({ status: ConsentStatus.WITHDRAWN }) as never,
    );
    expect(saved.status).toBe(ConsentStatus.WITHDRAWN);
    // append-only: save() called with a NEW row, no update of the old one
    expect(consentRepo.save).toHaveBeenCalledTimes(1);
  });

  it('rejects unknown consent vocabulary outright', async () => {
    const { service } = makeService();
    await expect(
      service.recordConsent(TENANT, MANAGER, SU, dto({ consentType: 'mind_reading' }) as never),
    ).rejects.toThrow(BadRequestException);
  });

  it('listConsents reports the newest event per type as current', async () => {
    const rows = [
      { consentType: ConsentType.DATA_PROCESSING, status: ConsentStatus.WITHDRAWN, recordedAt: new Date('2026-07-10') },
      { consentType: ConsentType.DATA_PROCESSING, status: ConsentStatus.GRANTED, recordedAt: new Date('2026-07-01') },
      { consentType: ConsentType.MEDICATION, status: ConsentStatus.GRANTED, recordedAt: new Date('2026-06-01') },
    ];
    const { service } = makeService(rows);
    const res = await service.listConsents(TENANT, SU);
    expect(res.history).toHaveLength(3);
    expect(res.current[ConsentType.DATA_PROCESSING]?.status).toBe(ConsentStatus.WITHDRAWN);
    expect(res.current[ConsentType.MEDICATION]?.status).toBe(ConsentStatus.GRANTED);
  });
});
