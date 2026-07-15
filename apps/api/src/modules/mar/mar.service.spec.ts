import { MARService } from './mar.service';
import { MARStatus } from '@my-cura/shared-types';
import { BadRequestException, ConflictException } from '@nestjs/common';

/** Unit tests for medication administration safety rules. */
describe('MARService', () => {
  const TENANT = 't1';
  const WORKER = 'w1';

  const scheduledRecord = () => ({
    id: 'r1',
    tenantId: TENANT,
    medicationId: 'm1',
    serviceUserId: 'su1',
    scheduledAt: new Date('2026-07-14T08:00:00Z'),
    status: MARStatus.SCHEDULED,
  });

  const medication = (over: Partial<Record<string, unknown>> = {}) => ({
    id: 'm1',
    tenantId: TENANT,
    serviceUserId: 'su1',
    name: 'Paracetamol',
    status: 'active',
    isControlled: false,
    isPrn: false,
    ...over,
  });

  const makeService = (opts: { record?: unknown; med?: unknown; prnDuplicate?: unknown } = {}) => {
    const marRepo = {
      findOne: jest.fn(async (q: { where: Record<string, unknown> }) =>
        q.where['id'] ? (opts.record ?? null) : (opts.prnDuplicate ?? null)),
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => ({ id: 'saved', ...x })),
    };
    const medicationRepo = {
      findOne: jest.fn().mockResolvedValue(opts.med ?? medication()),
    };
    const notifications = { notifyManagers: jest.fn(), notify: jest.fn() };
    const encryption = {
      encrypt: jest.fn((v: string) => `enc:${v}`),
      decrypt: jest.fn((v: string) => v.replace(/^enc:/, '')),
    };
    const service = new MARService(
      medicationRepo as never,
      marRepo as never,
      notifications as never,
      encryption as never,
    );
    return { service, marRepo, notifications };
  };

  const administerDto = (over: Partial<Record<string, unknown>> = {}) => ({
    status: MARStatus.GIVEN,
    timeCompleted: '2026-07-14T08:05:00Z',
    initials: 'sj',
    ...over,
  });

  it('records an administered dose with uppercased initials and both timestamps', async () => {
    const { service } = makeService({ record: scheduledRecord() });
    const res = await service.administerScheduled(TENANT, WORKER, 'r1', administerDto() as never);
    expect(res.initials).toBe('SJ');
    expect(res.administeredAt).toEqual(new Date('2026-07-14T08:05:00Z'));
    expect(res.recordedAt).toBeInstanceOf(Date);
    expect(res.careWorkerId).toBe(WORKER);
  });

  it('refuses to record the same dose twice', async () => {
    const { service } = makeService({ record: { ...scheduledRecord(), status: MARStatus.GIVEN } });
    await expect(
      service.administerScheduled(TENANT, WORKER, 'r1', administerDto() as never),
    ).rejects.toThrow('already been recorded');
  });

  it('requires a reason for the Other outcome', async () => {
    const { service } = makeService({ record: scheduledRecord() });
    await expect(
      service.administerScheduled(TENANT, WORKER, 'r1', administerDto({ status: MARStatus.OTHER }) as never),
    ).rejects.toThrow('state the reason');
  });

  it('requires initials as a signature', async () => {
    const { service } = makeService({ record: scheduledRecord() });
    await expect(
      service.administerScheduled(TENANT, WORKER, 'r1', administerDto({ initials: '  ' }) as never),
    ).rejects.toThrow('initials');
  });

  it('demands a witness for controlled drugs', async () => {
    const { service } = makeService({
      record: scheduledRecord(),
      med: medication({ isControlled: true }),
    });
    await expect(
      service.administerScheduled(TENANT, WORKER, 'r1', administerDto() as never),
    ).rejects.toThrow('witness');
  });

  it('notifies managers when a dose is refused', async () => {
    const { service, notifications } = makeService({ record: scheduledRecord() });
    await service.administerScheduled(
      TENANT, WORKER, 'r1',
      administerDto({ status: MARStatus.REFUSED, reason: 'declined' }) as never,
    );
    expect(notifications.notifyManagers).toHaveBeenCalledWith(
      TENANT, 'medication_alert', expect.stringContaining('refused'), expect.any(String), expect.any(Object),
    );
  });

  describe('PRN', () => {
    it('rejects non-PRN medication on the PRN endpoint', async () => {
      const { service } = makeService();
      await expect(
        service.recordPRN(TENANT, WORKER, 'm1', administerDto() as never),
      ).rejects.toThrow(BadRequestException);
    });

    it('blocks a repeat within 30 minutes unless forced', async () => {
      const { service } = makeService({
        med: medication({ isPrn: true }),
        prnDuplicate: { id: 'dup' },
      });
      await expect(
        service.recordPRN(TENANT, WORKER, 'm1', administerDto() as never),
      ).rejects.toThrow(ConflictException);
    });

    it('allows the repeat when the carer confirms (force)', async () => {
      const { service } = makeService({
        med: medication({ isPrn: true }),
        prnDuplicate: { id: 'dup' },
      });
      const res = await service.recordPRN(
        TENANT, WORKER, 'm1', administerDto({ force: true }) as never,
      );
      expect(res.status).toBe(MARStatus.GIVEN);
    });
  });
});
