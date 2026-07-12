import { ClockInService } from './clock-in.service';
import { ClockEventType, ShiftStatus } from '@my-cura/shared-types';
import { BadRequestException } from '@nestjs/common';

/** Unit tests for the safety-critical GPS/fraud rules and manager override. */
describe('ClockInService', () => {
  const TENANT = 't1';
  const WORKER = 'w1';

  const baseShift = () => ({
    id: 's1',
    tenantId: TENANT,
    careWorkerId: WORKER,
    serviceUserId: 'su1',
    scheduledStart: new Date('2026-07-14T09:00:00Z'),
    scheduledEnd: new Date('2026-07-14T11:00:00Z'),
    status: ShiftStatus.ASSIGNED,
    locationLat: 53.0,
    locationLon: -2.0,
  });

  const makeService = (shift = baseShift()) => {
    const clockRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => ({ ...x, id: 'evt1' })),
    };
    const shiftRepo = {
      findOne: jest.fn().mockResolvedValue(shift),
      update: jest.fn(),
    };
    const suRepo = { findOne: jest.fn() };
    const service = new ClockInService(
      clockRepo as never,
      shiftRepo as never,
      suRepo as never,
    );
    return { service, clockRepo, shiftRepo };
  };

  const dto = (over: Partial<Record<string, unknown>> = {}) => ({
    shiftId: 's1',
    eventType: ClockEventType.CLOCK_IN,
    latitude: 53.0,
    longitude: -2.0,
    accuracy: 10,
    deviceId: 'test',
    timestamp: '2026-07-14T09:00:00Z',
    ...over,
  });

  it('accepts an in-range, on-time clock-in', async () => {
    const { service, shiftRepo } = makeService();
    const res = await service.recordClockEvent(TENANT, WORKER, dto() as never);
    expect(res.success).toBe(true);
    expect(res.fraudFlag).toBe(false);
    expect(shiftRepo.update).toHaveBeenCalledWith('s1', { status: ShiftStatus.IN_PROGRESS });
  });

  it('rejects a clock-in more than 3km from the care address', async () => {
    const { service, shiftRepo } = makeService();
    // 0.03° of latitude ≈ 3.3km
    const res = await service.recordClockEvent(TENANT, WORKER, dto({ latitude: 53.03 }) as never);
    expect(res.success).toBe(false);
    expect(res.fraudFlag).toBe(true);
    expect(res.gpsDistanceMetres).toBeGreaterThan(3000);
    expect(shiftRepo.update).not.toHaveBeenCalled();
  });

  it('allows a clock-in inside 3km even when away from the door', async () => {
    const { service } = makeService();
    // 0.02° ≈ 2.2km — inside the hard limit
    const res = await service.recordClockEvent(TENANT, WORKER, dto({ latitude: 53.02 }) as never);
    expect(res.success).toBe(true);
  });

  it('flags poor GPS accuracy', async () => {
    const { service } = makeService();
    const res = await service.recordClockEvent(TENANT, WORKER, dto({ accuracy: 120 }) as never);
    expect(res.fraudFlag).toBe(true);
  });

  it("refuses someone else's shift", async () => {
    const { service } = makeService();
    await expect(
      service.recordClockEvent(TENANT, 'intruder', dto() as never),
    ).rejects.toThrow(BadRequestException);
  });

  it('blocks duplicate clock-ins inside 30 minutes', async () => {
    const { service, clockRepo } = makeService();
    clockRepo.findOne.mockResolvedValue({ recordedAt: new Date(Date.now() - 5 * 60000) });
    const res = await service.recordClockEvent(TENANT, WORKER, dto({ timestamp: new Date().toISOString() }) as never);
    expect(res.fraudFlag).toBe(true);
  });

  describe('manager override', () => {
    it('stamps the scheduled start time and marks the event manual', async () => {
      const { service, clockRepo, shiftRepo } = makeService();
      const res = await service.managerClockEvent(TENANT, 'mgr1', 's1', ClockEventType.CLOCK_IN);
      expect(res.recordedAt).toEqual(new Date('2026-07-14T09:00:00Z'));
      expect(clockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ isManual: true, deviceId: 'manager:mgr1' }),
      );
      expect(shiftRepo.update).toHaveBeenCalledWith('s1', { status: ShiftStatus.IN_PROGRESS });
    });

    it('refuses clock-out when the worker is not clocked in', async () => {
      const { service } = makeService();
      await expect(
        service.managerClockEvent(TENANT, 'mgr1', 's1', ClockEventType.CLOCK_OUT),
      ).rejects.toThrow('not clocked in');
    });

    it('stamps the scheduled end on clock-out', async () => {
      const shift = { ...baseShift(), status: ShiftStatus.IN_PROGRESS };
      const { service } = makeService(shift as never);
      const res = await service.managerClockEvent(TENANT, 'mgr1', 's1', ClockEventType.CLOCK_OUT);
      expect(res.recordedAt).toEqual(new Date('2026-07-14T11:00:00Z'));
    });
  });
});
