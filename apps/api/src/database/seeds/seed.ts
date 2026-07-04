// Demo seed data for local development and E2E tests.
// Idempotent: re-running updates nothing that already exists.
// Run with: pnpm --filter @my-cura/api seed

import * as bcrypt from 'bcrypt';
import { DeepPartial } from 'typeorm';
import dataSource from '../data-source';
import { TenantEntity } from '../../modules/tenants/entities/tenant.entity';
import { UserEntity } from '../../modules/users/entities/user.entity';
import { CareWorkerEntity } from '../../modules/care-workers/entities/care-worker.entity';
import { ServiceUserEntity } from '../../modules/service-users/entities/service-user.entity';
import { MedicationEntity } from '../../modules/mar/entities/medication.entity';
import { MARRecordEntity } from '../../modules/mar/entities/mar-record.entity';
import { ShiftEntity } from '../../modules/scheduling/entities/shift.entity';
import {
  Country,
  EmploymentType,
  MARStatus,
  MedicationFormulation,
  MedicationRoute,
  ShiftStatus,
  ShiftType,
  SubscriptionTier,
  UserRole,
  UserStatus,
} from '@my-cura/shared-types';

const BCRYPT_ROUNDS = 12;
const DEMO_PASSWORD = 'Demo1234!';

async function main() {
  await dataSource.initialize();

  const tenants = dataSource.getRepository(TenantEntity);
  const users = dataSource.getRepository(UserEntity);
  const careWorkers = dataSource.getRepository(CareWorkerEntity);
  const serviceUsers = dataSource.getRepository(ServiceUserEntity);
  const medications = dataSource.getRepository(MedicationEntity);
  const marRecords = dataSource.getRepository(MARRecordEntity);
  const shifts = dataSource.getRepository(ShiftEntity);

  // ── Tenant ────────────────────────────────────────────────────────────────
  let tenant = await tenants.findOne({ where: { slug: 'demo-care' } });
  if (!tenant) {
    tenant = await tenants.save(
      tenants.create({
        slug: 'demo-care',
        name: 'Demo Care Agency',
        country: Country.UK,
        subscriptionTier: SubscriptionTier.PROFESSIONAL,
        subscriptionStatus: 'active',
        settings: {
          locale: 'en-GB',
          timezone: 'Europe/London',
          payFrequency: 'weekly',
          gpsRadiusMetres: 200,
          clockInWindowMinutes: 30,
        },
      }),
    );
    console.log('Created tenant', tenant.slug);
  }
  const tenantId = tenant.id;

  // ── Users ─────────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS);
  async function upsertUser(
    email: string,
    role: UserRole,
    firstName: string,
    lastName: string,
  ): Promise<UserEntity> {
    let user = await users.findOne({ where: { tenantId, email } });
    if (!user) {
      user = await users.save(
        users.create({
          tenantId,
          email,
          passwordHash,
          role,
          firstName,
          lastName,
          status: UserStatus.ACTIVE,
        } as DeepPartial<UserEntity>),
      );
      console.log('Created user', email, `(${role})`);
    }
    return user;
  }

  const owner = await upsertUser('admin@demo-care.local', UserRole.AGENCY_OWNER, 'Ada', 'Okafor');
  await upsertUser('manager@demo-care.local', UserRole.MANAGER, 'Marcus', 'Reid');
  const w1 = await upsertUser('worker1@demo-care.local', UserRole.CARE_WORKER, 'Sarah', 'Jones');
  const w2 = await upsertUser('worker2@demo-care.local', UserRole.CARE_WORKER, 'Tunde', 'Bakare');
  const w3 = await upsertUser('worker3@demo-care.local', UserRole.CARE_WORKER, 'Emily', 'Nowak');

  // ── Care worker profiles (pay rates live here — admin-only via RBAC) ─────
  const workerProfiles: Array<[UserEntity, string, number]> = [
    [w1, 'CW-001', 13.5],
    [w2, 'CW-002', 12.75],
    [w3, 'CW-003', 14.25],
  ];
  for (const [user, employeeId, hourlyRate] of workerProfiles) {
    const existing = await careWorkers.findOne({ where: { userId: user.id } });
    if (!existing) {
      await careWorkers.save(
        careWorkers.create({
          tenantId,
          userId: user.id,
          employeeId,
          employmentType: EmploymentType.FULL_TIME,
          contractStart: '2025-01-06',
          hourlyRate,
          weekendRate: hourlyRate * 1.25,
          bankHolidayRate: hourlyRate * 1.5,
          payFrequency: 'weekly',
          taxCode: '1257L',
          niCategory: 'A',
          pensionOptIn: true,
          skills: ['personal_care', 'medication'],
        } as DeepPartial<CareWorkerEntity>),
      );
      console.log('Created care worker profile', employeeId);
    }
  }

  // ── Service users ─────────────────────────────────────────────────────────
  async function upsertServiceUser(
    firstName: string,
    lastName: string,
    dateOfBirth: string,
    address: ServiceUserEntity['address'],
  ): Promise<ServiceUserEntity> {
    let su = await serviceUsers.findOne({ where: { tenantId, firstName, lastName } });
    if (!su) {
      su = await serviceUsers.save(
        serviceUsers.create({
          tenantId,
          firstName,
          lastName,
          dateOfBirth,
          address,
          fundingSource: 'local_authority',
          careLevel: 'medium',
          status: 'active',
        } as DeepPartial<ServiceUserEntity>),
      );
      console.log('Created service user', `${firstName} ${lastName}`);
    }
    return su;
  }

  const su1 = await upsertServiceUser('Margaret', 'Hughes', '1941-03-14', {
    line1: '12 Rosewood Lane',
    city: 'Manchester',
    postcode: 'M20 4WX',
    lat: 53.4308,
    lon: -2.2343,
  });
  const su2 = await upsertServiceUser('Harold', 'Bennett', '1936-11-02', {
    line1: 'Willow Court Care Home, 3 Elm Street',
    city: 'Manchester',
    postcode: 'M14 5TP',
    lat: 53.4451,
    lon: -2.2189,
  });

  // ── Medications (admin-set: purpose, dose, quantity, formulation, route) ──
  const meds: Array<[
    ServiceUserEntity, string, string, string, string,
    MedicationFormulation, string, string[], MedicationRoute, boolean,
  ]> = [
    [su1, 'Paracetamol', 'Pain relief and fever reduction', '500mg', '1 tablet',
      MedicationFormulation.TABLET, 'Twice daily', ['08:00', '20:00'], MedicationRoute.ORAL, false],
    [su1, 'Amlodipine', 'Lowers blood pressure', '5mg', '1 tablet',
      MedicationFormulation.TABLET, 'Once daily', ['08:00'], MedicationRoute.ORAL, false],
    [su1, 'Lactulose', 'Relieves constipation', '10ml', '10 ml',
      MedicationFormulation.LIQUID, 'Once daily', ['12:00'], MedicationRoute.ORAL, false],
    [su2, 'Morphine sulfate', 'Severe pain management', '10mg', '5 ml',
      MedicationFormulation.LIQUID, 'Twice daily', ['09:00', '21:00'], MedicationRoute.ORAL, true],
    [su2, 'Glycerin', 'Relieves constipation', '4g', '1 suppository',
      MedicationFormulation.SUPPOSITORY, 'As required', ['09:00'], MedicationRoute.RECTAL, false],
  ];
  const medEntities: MedicationEntity[] = [];
  for (const [su, name, purpose, dosage, quantity, formulation, frequency, timesOfDay, route, isControlled] of meds) {
    let med = await medications.findOne({ where: { tenantId, serviceUserId: su.id, name } });
    if (!med) {
      med = await medications.save(
        medications.create({
          tenantId,
          serviceUserId: su.id,
          name,
          purpose,
          dosage,
          quantity,
          formulation,
          frequency,
          timesOfDay,
          route,
          isControlled,
          cdSchedule: isControlled ? 'schedule_2' : undefined,
          status: 'active',
        } as DeepPartial<MedicationEntity>),
      );
      console.log('Created medication', name, 'for', su.firstName);
    } else if (!med.purpose) {
      // Existing databases: backfill the new admin-set fields
      Object.assign(med, { purpose, quantity, formulation });
      med = await medications.save(med);
      console.log('Backfilled medication details for', name);
    }
    medEntities.push(med);
  }

  // ── Today's scheduled doses (admin sets the exact date & time) ────────────
  const doseDayStart = new Date();
  doseDayStart.setHours(0, 0, 0, 0);
  const doseDayEnd = new Date(doseDayStart);
  doseDayEnd.setDate(doseDayEnd.getDate() + 1);

  const scheduledToday = await marRecords
    .createQueryBuilder('r')
    .where('r.tenant_id = :tenantId', { tenantId })
    .andWhere('r.scheduled_at >= :doseDayStart AND r.scheduled_at < :doseDayEnd', { doseDayStart, doseDayEnd })
    .getCount();

  if (scheduledToday === 0) {
    for (const med of medEntities) {
      for (const hhmm of med.timesOfDay ?? []) {
        const [h, m] = hhmm.split(':').map(Number);
        const scheduledAt = new Date(doseDayStart);
        scheduledAt.setHours(h, m, 0, 0);
        await marRecords.save(
          marRecords.create({
            tenantId,
            medicationId: med.id,
            serviceUserId: med.serviceUserId,
            scheduledAt,
            status: MARStatus.SCHEDULED,
          } as DeepPartial<MARRecordEntity>),
        );
      }
      console.log('Scheduled today\'s doses for', med.name);
    }
  }

  // ── Today's shifts ────────────────────────────────────────────────────────
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const existingToday = await shifts
    .createQueryBuilder('s')
    .where('s.tenant_id = :tenantId', { tenantId })
    .andWhere('s.scheduled_start >= :dayStart AND s.scheduled_start < :dayEnd', { dayStart, dayEnd })
    .getCount();

  if (existingToday === 0) {
    const at = (h: number, m = 0) => {
      const d = new Date(dayStart);
      d.setHours(h, m, 0, 0);
      return d;
    };
    const shiftSpecs: Array<[UserEntity, ServiceUserEntity, number, number, ShiftType]> = [
      [w1, su1, 9, 10, ShiftType.PERSONAL_CARE],
      [w1, su1, 20, 21, ShiftType.MEDICATION],
      [w2, su2, 9, 11, ShiftType.PERSONAL_CARE],
      [w3, su2, 21, 22, ShiftType.MEDICATION],
    ];
    for (const [worker, su, startH, endH, shiftType] of shiftSpecs) {
      await shifts.save(
        shifts.create({
          tenantId,
          serviceUserId: su.id,
          careWorkerId: worker.id,
          scheduledStart: at(startH),
          scheduledEnd: at(endH),
          shiftType,
          status: ShiftStatus.ASSIGNED,
          locationAddress: su.address as unknown as Record<string, unknown>,
          locationLat: su.address.lat,
          locationLon: su.address.lon,
          createdBy: owner.id,
        } as DeepPartial<ShiftEntity>),
      );
    }
    console.log(`Created ${shiftSpecs.length} shifts for today`);
  }

  console.log('\nSeed complete.');
  console.log(`  Tenant:   Demo Care Agency (${tenantId})`);
  console.log(`  Login:    admin@demo-care.local / ${DEMO_PASSWORD}`);
  console.log(`  Workers:  worker1|worker2|worker3@demo-care.local / ${DEMO_PASSWORD}`);
  await dataSource.destroy();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
