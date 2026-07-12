import { ImportsService } from './imports.service';

/** Unit tests for migration-import validation and normalisation. */
describe('ImportsService', () => {
  const TENANT = 't1';

  const makeService = (suFound: unknown = null) => {
    const chain = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(suFound),
    };
    const suRepo = {
      findOne: jest.fn().mockResolvedValue(suFound),
      createQueryBuilder: jest.fn(() => chain),
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => x),
    };
    const stub = { findOne: jest.fn(), create: jest.fn((x) => x), save: jest.fn(async (x) => ({ id: 'j', ...x })), find: jest.fn() };
    const service = new ImportsService(
      stub as never, suRepo as never, stub as never, stub as never, stub as never,
    );
    return { service, suRepo };
  };

  const validRow = {
    firstName: 'Doris', lastName: 'Whitfield', dateOfBirth: '14/02/1938',
    addressLine1: '5 Oak Lane', city: 'Manchester', postcode: 'm21 8xx',
    careLevel: 'High', careHoursPerDay: '6',
  };

  it('accepts a valid service-user row and flags a broken one', async () => {
    const { service } = makeService();
    const res = await service.preview(TENANT, {
      entityType: 'service_users',
      rows: [validRow, { firstName: 'Bad', lastName: 'Row', dateOfBirth: 'not a date', addressLine1: '', city: 'X', postcode: 'Y' }],
    });
    expect(res.rowCount).toBe(2);
    expect(res.validCount).toBe(1);
    expect(res.errors.some((e) => e.row === 2 && /date of birth/i.test(e.message))).toBe(true);
    expect(res.errors.some((e) => e.row === 2 && /Address/i.test(e.message))).toBe(true);
  });

  it('normalises UK dates, care levels and postcodes on commit', async () => {
    const { service, suRepo } = makeService();
    const res = await service.commit(TENANT, 'user1', {
      entityType: 'service_users',
      rows: [validRow],
    });
    expect(res.created).toBe(1);
    const saved = suRepo.save.mock.calls[0][0] as Record<string, never>;
    expect(saved['dateOfBirth']).toBe('1938-02-14');
    expect(saved['careLevel']).toBe('high');
    expect(saved['careHoursPerDay']).toBe(6);
    expect((saved['address'] as Record<string, string>)['postcode']).toBe('M21 8XX');
  });

  it('validates care worker emails and rates', async () => {
    const { service } = makeService();
    const res = await service.preview(TENANT, {
      entityType: 'care_workers',
      rows: [{ firstName: 'A', lastName: 'B', email: 'not-an-email', hourlyRate: 'abc' }],
    });
    expect(res.validCount).toBe(0);
    expect(res.errors.some((e) => /valid email/.test(e.message))).toBe(true);
    expect(res.errors.some((e) => /not a number/.test(e.message))).toBe(true);
  });

  it('rejects medications for unknown service users and unknown routes', async () => {
    const { service } = makeService(null);
    const res = await service.preview(TENANT, {
      entityType: 'medications',
      rows: [{ serviceUserRef: 'Nobody Known', name: 'X', dosage: '1', route: 'teleport', frequency: 'daily' }],
    });
    expect(res.errors.some((e) => /No service user matches/.test(e.message))).toBe(true);
    expect(res.errors.some((e) => /Unrecognised route/.test(e.message))).toBe(true);
  });

  it('refuses unknown entity types and oversize batches', async () => {
    const { service } = makeService();
    await expect(service.preview(TENANT, { entityType: 'hackers' as never, rows: [] })).rejects.toThrow();
    await expect(
      service.commit(TENANT, 'u', { entityType: 'service_users', rows: new Array(5001).fill(validRow) }),
    ).rejects.toThrow('5,000');
  });
});
