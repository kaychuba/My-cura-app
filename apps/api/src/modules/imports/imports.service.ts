import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import {
  EmploymentType, MedicationFormulation, MedicationRoute, UserRole, UserStatus,
} from '@my-cura/shared-types';
import { ImportJobEntity } from './entities/import-job.entity';
import { ServiceUserEntity } from '../service-users/entities/service-user.entity';
import { MedicationEntity } from '../mar/entities/medication.entity';
import { UserEntity } from '../users/entities/user.entity';
import { CareWorkerEntity } from '../care-workers/entities/care-worker.entity';

export type ImportEntityType = 'service_users' | 'care_workers' | 'medications';

export interface ImportRowsDto {
  entityType: ImportEntityType;
  /** Each row: ourFieldKey -> raw string value (already column-mapped by the wizard). */
  rows: Record<string, string>[];
  fileName?: string;
  template?: string;
  /** care_workers only: password given to newly created logins. */
  defaultPassword?: string;
}

export interface FieldDef {
  key: string;
  label: string;
  required?: boolean;
  /** lowercase, punctuation-stripped header spellings that auto-map to this field */
  aliases: string[];
}

// ── Field catalogues (also drive the wizard's mapping screen) ───────────────

const SERVICE_USER_FIELDS: FieldDef[] = [
  { key: 'externalRef', label: 'Source system ID', aliases: ['id', 'clientid', 'serviceuserid', 'personid', 'ref', 'reference', 'externalid'] },
  { key: 'firstName', label: 'First name', required: true, aliases: ['firstname', 'forename', 'givenname', 'clientfirstname'] },
  { key: 'lastName', label: 'Last name', required: true, aliases: ['lastname', 'surname', 'familyname', 'clientlastname', 'clientsurname'] },
  { key: 'dateOfBirth', label: 'Date of birth', required: true, aliases: ['dateofbirth', 'dob', 'birthdate', 'born'] },
  { key: 'gender', label: 'Gender', aliases: ['gender', 'sex'] },
  { key: 'addressLine1', label: 'Address line 1', required: true, aliases: ['addressline1', 'address1', 'address', 'street', 'houseandstreet', 'firstlineofaddress'] },
  { key: 'addressLine2', label: 'Address line 2', aliases: ['addressline2', 'address2'] },
  { key: 'city', label: 'City / town', required: true, aliases: ['city', 'town', 'towncity'] },
  { key: 'postcode', label: 'Postcode', required: true, aliases: ['postcode', 'postalcode', 'zip', 'zipcode'] },
  { key: 'phone', label: 'Phone', aliases: ['phone', 'telephone', 'phonenumber', 'contactnumber', 'tel', 'mobile'] },
  { key: 'email', label: 'Email', aliases: ['email', 'emailaddress'] },
  { key: 'conditionSummary', label: 'Condition / reason for care', aliases: ['condition', 'conditions', 'diagnosis', 'reasonforcare', 'medicalsummary', 'careneeds', 'summary'] },
  { key: 'allergies', label: 'Allergies (separated by ; or ,)', aliases: ['allergies', 'allergy', 'knownallergies'] },
  { key: 'medicalConditions', label: 'Medical conditions (separated)', aliases: ['medicalconditions', 'healthconditions', 'comorbidities'] },
  { key: 'careLevel', label: 'Care level', aliases: ['carelevel', 'level', 'acuity', 'dependency'] },
  { key: 'careHoursPerDay', label: 'Care hours per day', aliases: ['carehoursperday', 'carehours', 'hoursperday', 'commissionedhours', 'weeklyhours'] },
  { key: 'careCommencedOn', label: 'Care commenced on', aliases: ['carecommencedon', 'carestartdate', 'startdate', 'startofcare', 'admissiondate'] },
  { key: 'ecName', label: 'Emergency contact name', aliases: ['emergencycontactname', 'emergencycontact', 'nextofkin', 'nokname', 'nextofkinname'] },
  { key: 'ecRelationship', label: 'Emergency contact relationship', aliases: ['emergencycontactrelationship', 'nokrelationship', 'relationship'] },
  { key: 'ecPhone', label: 'Emergency contact phone', aliases: ['emergencycontactphone', 'emergencycontactnumber', 'nokphone', 'nextofkinphone'] },
  { key: 'hospitalName', label: 'Hospital name', aliases: ['hospital', 'hospitalname', 'registeredhospital'] },
  { key: 'hospitalPhone', label: 'Hospital phone', aliases: ['hospitalphone', 'hospitalnumber'] },
  { key: 'pharmacyName', label: 'Pharmacy name', aliases: ['pharmacy', 'pharmacyname', 'chemist'] },
  { key: 'pharmacyPhone', label: 'Pharmacy phone', aliases: ['pharmacyphone', 'pharmacynumber'] },
  { key: 'gpDetails', label: 'GP details', aliases: ['gp', 'gpname', 'gpdetails', 'doctor', 'gppractice'] },
];

const CARE_WORKER_FIELDS: FieldDef[] = [
  { key: 'employeeId', label: 'Employee ID', aliases: ['employeeid', 'staffid', 'payrollnumber', 'staffnumber', 'id', 'ref'] },
  { key: 'firstName', label: 'First name', required: true, aliases: ['firstname', 'forename', 'givenname'] },
  { key: 'lastName', label: 'Last name', required: true, aliases: ['lastname', 'surname', 'familyname'] },
  { key: 'email', label: 'Email (their app login)', required: true, aliases: ['email', 'emailaddress', 'workemail'] },
  { key: 'phone', label: 'Phone', aliases: ['phone', 'telephone', 'mobile', 'phonenumber', 'contactnumber'] },
  { key: 'employmentType', label: 'Employment type', aliases: ['employmenttype', 'contracttype', 'type'] },
  { key: 'hourlyRate', label: 'Hourly rate', required: true, aliases: ['hourlyrate', 'rate', 'payrate', 'basicrate'] },
  { key: 'weekendRate', label: 'Weekend rate', aliases: ['weekendrate', 'saturdayrate', 'sundayrate'] },
  { key: 'contractStart', label: 'Contract start', aliases: ['contractstart', 'startdate', 'employmentstart', 'datejoined'] },
  { key: 'skills', label: 'Skills (separated)', aliases: ['skills', 'competencies', 'qualifications'] },
  { key: 'dbsCertNumber', label: 'DBS certificate number', aliases: ['dbscertnumber', 'dbsnumber', 'dbscertificate', 'dbs'] },
  { key: 'dbsExpiresAt', label: 'DBS expiry', aliases: ['dbsexpiresat', 'dbsexpiry', 'dbsexpirydate', 'dbsrenewal'] },
  { key: 'rtwExpiresAt', label: 'Right-to-work expiry', aliases: ['rtwexpiresat', 'rtwexpiry', 'righttoworkexpiry', 'visaexpiry'] },
];

const MEDICATION_FIELDS: FieldDef[] = [
  { key: 'externalRef', label: 'Source system ID', aliases: ['id', 'medicationid', 'ref', 'reference'] },
  { key: 'serviceUserRef', label: 'Service user (source ID or full name)', required: true, aliases: ['serviceuser', 'client', 'clientid', 'serviceuserid', 'clientname', 'servicename', 'personid', 'patient'] },
  { key: 'name', label: 'Medication name', required: true, aliases: ['name', 'medication', 'medicationname', 'drug', 'drugname', 'medicine'] },
  { key: 'purpose', label: 'Function / what it is for', aliases: ['purpose', 'function', 'indication', 'reason', 'whatfor'] },
  { key: 'dosage', label: 'Dose required', required: true, aliases: ['dosage', 'dose', 'strength', 'doserequired'] },
  { key: 'quantity', label: 'Quantity', aliases: ['quantity', 'qty', 'amount'] },
  { key: 'formulation', label: 'Formulation', aliases: ['formulation', 'form', 'type', 'preparation'] },
  { key: 'route', label: 'Route', required: true, aliases: ['route', 'routeofadministration', 'method', 'how'] },
  { key: 'frequency', label: 'Frequency', required: true, aliases: ['frequency', 'howoften', 'timing', 'schedule'] },
  { key: 'timesOfDay', label: 'Times of day (e.g. 08:00;20:00)', aliases: ['timesofday', 'times', 'doseTimes', 'administrationtimes'] },
  { key: 'isPrn', label: 'PRN / as needed (yes/no)', aliases: ['isprn', 'prn', 'asneeded', 'whenrequired'] },
  { key: 'prnInstructions', label: 'PRN instructions', aliases: ['prninstructions', 'prnreason', 'whentogive'] },
  { key: 'isControlled', label: 'Controlled drug (yes/no)', aliases: ['iscontrolled', 'controlled', 'controlleddrug', 'cd'] },
];

export const FIELD_CATALOGUE: Record<ImportEntityType, FieldDef[]> = {
  service_users: SERVICE_USER_FIELDS,
  care_workers: CARE_WORKER_FIELDS,
  medications: MEDICATION_FIELDS,
};

/**
 * Starter templates: extra header spellings seen in exports from the big UK
 * systems. Fuzzy alias matching handles most files even without a template;
 * picking one just improves the automatic column mapping.
 */
export const TEMPLATES = [
  { id: 'generic', name: 'Generic CSV (auto-detect columns)' },
  { id: 'birdie', name: 'Birdie export' },
  { id: 'careplanner', name: 'CarePlanner export' },
  { id: 'logmycare', name: 'Log my Care export' },
  { id: 'access', name: 'Access Care Planning export' },
  { id: 'nourish', name: 'Nourish export' },
];

// ── Value normalisers ────────────────────────────────────────────────────────

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

function parseDate(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  let m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); // ISO
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = v.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/); // UK d/m/y
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  m = v.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2})$/); // d/m/yy
  if (m) {
    const yy = Number(m[3]);
    const year = yy > 30 ? 1900 + yy : 2000 + yy;
    return `${year}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
}

function parseBool(value: string): boolean {
  return ['yes', 'y', 'true', '1', 'x'].includes(value.trim().toLowerCase());
}

function parseList(value: string): string[] {
  return value.split(/[;,|]/).map((s) => s.trim()).filter(Boolean);
}

const ROUTE_SYNONYMS: Record<string, MedicationRoute> = {
  oral: MedicationRoute.ORAL, mouth: MedicationRoute.ORAL, bymouth: MedicationRoute.ORAL, po: MedicationRoute.ORAL,
  topical: MedicationRoute.TOPICAL, skin: MedicationRoute.TOPICAL, cream: MedicationRoute.TOPICAL,
  inhaled: MedicationRoute.INHALED, inhalation: MedicationRoute.INHALED, nebuliser: MedicationRoute.INHALED, nebulizer: MedicationRoute.INHALED, inhaler: MedicationRoute.INHALED,
  subcutaneous: MedicationRoute.SUBCUTANEOUS, subcut: MedicationRoute.SUBCUTANEOUS, sc: MedicationRoute.SUBCUTANEOUS,
  intravenous: MedicationRoute.INTRAVENOUS, iv: MedicationRoute.INTRAVENOUS,
  rectal: MedicationRoute.RECTAL, pr: MedicationRoute.RECTAL, suppository: MedicationRoute.RECTAL,
  transdermal: MedicationRoute.TRANSDERMAL, patch: MedicationRoute.TRANSDERMAL,
  nasal: MedicationRoute.NASAL, nose: MedicationRoute.NASAL,
  ocular: MedicationRoute.OCULAR, eye: MedicationRoute.OCULAR, eyedrops: MedicationRoute.OCULAR,
  otic: MedicationRoute.OTIC, ear: MedicationRoute.OTIC,
};

const FORMULATION_SYNONYMS: Record<string, MedicationFormulation> = {
  tablet: MedicationFormulation.TABLET, tablets: MedicationFormulation.TABLET, tab: MedicationFormulation.TABLET,
  capsule: MedicationFormulation.CAPSULE, capsules: MedicationFormulation.CAPSULE, cap: MedicationFormulation.CAPSULE,
  liquid: MedicationFormulation.LIQUID, syrup: MedicationFormulation.LIQUID, solution: MedicationFormulation.LIQUID, suspension: MedicationFormulation.LIQUID,
  powder: MedicationFormulation.POWDER, sachet: MedicationFormulation.POWDER,
  suppository: MedicationFormulation.SUPPOSITORY, suppositories: MedicationFormulation.SUPPOSITORY,
  cream: MedicationFormulation.CREAM, ointment: MedicationFormulation.OINTMENT, gel: MedicationFormulation.CREAM,
  patch: MedicationFormulation.PATCH, inhaler: MedicationFormulation.INHALER,
  drops: MedicationFormulation.DROPS, drop: MedicationFormulation.DROPS,
  injection: MedicationFormulation.INJECTION, injectable: MedicationFormulation.INJECTION,
  spray: MedicationFormulation.SPRAY,
};

const EMPLOYMENT_SYNONYMS: Record<string, EmploymentType> = {
  fulltime: EmploymentType.FULL_TIME, full: EmploymentType.FULL_TIME, permanent: EmploymentType.FULL_TIME,
  parttime: EmploymentType.PART_TIME, part: EmploymentType.PART_TIME,
  zerohours: EmploymentType.ZERO_HOURS, zerohour: EmploymentType.ZERO_HOURS, casual: EmploymentType.ZERO_HOURS,
  contractor: EmploymentType.CONTRACTOR, selfemployed: EmploymentType.CONTRACTOR,
  bank: EmploymentType.BANK, agency: EmploymentType.BANK,
};

const CARE_LEVEL_SYNONYMS: Record<string, string> = {
  low: 'low', minimal: 'low', medium: 'medium', moderate: 'medium',
  high: 'high', critical: 'critical', complex: 'critical',
};

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class ImportsService {
  constructor(
    @InjectRepository(ImportJobEntity) private jobRepo: Repository<ImportJobEntity>,
    @InjectRepository(ServiceUserEntity) private suRepo: Repository<ServiceUserEntity>,
    @InjectRepository(MedicationEntity) private medRepo: Repository<MedicationEntity>,
    @InjectRepository(UserEntity) private userRepo: Repository<UserEntity>,
    @InjectRepository(CareWorkerEntity) private cwRepo: Repository<CareWorkerEntity>,
  ) {}

  templates() {
    return {
      templates: TEMPLATES,
      fields: FIELD_CATALOGUE,
    };
  }

  async listJobs(tenantId: string) {
    return this.jobRepo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      take: 25,
    });
  }

  /** Validate every row; returns per-row errors without writing anything. */
  async preview(tenantId: string, dto: ImportRowsDto) {
    this.assertEntityType(dto);
    const errors: { row: number; message: string }[] = [];
    for (let i = 0; i < dto.rows.length; i++) {
      const rowErrors = await this.validateRow(tenantId, dto.entityType, dto.rows[i]);
      for (const message of rowErrors) errors.push({ row: i + 1, message });
    }
    return {
      rowCount: dto.rows.length,
      validCount: dto.rows.length - new Set(errors.map((e) => e.row)).size,
      errors,
    };
  }

  /**
   * Import for real. Runs inside the request's tenant transaction, so it is
   * all-or-nothing per call, and idempotent: re-importing the same file
   * updates rather than duplicates (matched on source IDs / natural keys).
   */
  async commit(tenantId: string, userId: string, dto: ImportRowsDto) {
    this.assertEntityType(dto);
    if (dto.rows.length === 0) throw new BadRequestException('No rows to import');
    if (dto.rows.length > 5000) throw new BadRequestException('Import in batches of up to 5,000 rows');

    let created = 0;
    let updated = 0;
    const errors: { row: number; message: string }[] = [];
    const workerPassword =
      dto.entityType === 'care_workers'
        ? dto.defaultPassword?.trim() || `Welcome-${randomBytes(4).toString('hex')}`
        : undefined;
    const workerPasswordHash = workerPassword ? await bcrypt.hash(workerPassword, 12) : undefined;

    for (let i = 0; i < dto.rows.length; i++) {
      const row = dto.rows[i];
      const rowErrors = await this.validateRow(tenantId, dto.entityType, row);
      if (rowErrors.length > 0) {
        for (const message of rowErrors) errors.push({ row: i + 1, message });
        continue;
      }
      try {
        const result =
          dto.entityType === 'service_users'
            ? await this.upsertServiceUser(tenantId, row)
            : dto.entityType === 'care_workers'
              ? await this.upsertCareWorker(tenantId, row, workerPasswordHash!)
              : await this.upsertMedication(tenantId, row);
        if (result === 'created') created++;
        else updated++;
      } catch (e) {
        errors.push({ row: i + 1, message: (e as Error).message ?? 'Failed to save' });
      }
    }

    const job = await this.jobRepo.save(
      this.jobRepo.create({
        tenantId,
        createdBy: userId,
        entityType: dto.entityType,
        fileName: dto.fileName,
        template: dto.template,
        rowCount: dto.rows.length,
        createdCount: created,
        updatedCount: updated,
        errorCount: errors.length,
        errors: errors.slice(0, 200),
      }),
    );

    return {
      jobId: job.id,
      rowCount: dto.rows.length,
      created,
      updated,
      errors,
      // Shown once so the manager can hand it to new staff; not stored.
      generatedPassword: dto.entityType === 'care_workers' && !dto.defaultPassword ? workerPassword : undefined,
    };
  }

  // ── Validation ────────────────────────────────────────────────────────────

  private assertEntityType(dto: ImportRowsDto) {
    if (!FIELD_CATALOGUE[dto.entityType]) {
      throw new BadRequestException('entityType must be service_users, care_workers or medications');
    }
    if (!Array.isArray(dto.rows)) throw new BadRequestException('rows must be an array');
  }

  private async validateRow(
    tenantId: string,
    entityType: ImportEntityType,
    row: Record<string, string>,
  ): Promise<string[]> {
    const errors: string[] = [];
    for (const field of FIELD_CATALOGUE[entityType]) {
      if (field.required && !row[field.key]?.trim()) {
        errors.push(`${field.label} is required`);
      }
    }

    if (entityType === 'service_users') {
      if (row['dateOfBirth']?.trim() && !parseDate(row['dateOfBirth'])) {
        errors.push(`Unrecognised date of birth "${row['dateOfBirth']}"`);
      }
    }

    if (entityType === 'care_workers') {
      if (row['email']?.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(row['email'].trim())) {
        errors.push(`"${row['email']}" is not a valid email`);
      }
      if (row['hourlyRate']?.trim() && isNaN(Number(row['hourlyRate'].replace(/[£$,]/g, '')))) {
        errors.push(`Hourly rate "${row['hourlyRate']}" is not a number`);
      }
    }

    if (entityType === 'medications') {
      if (row['route']?.trim() && !ROUTE_SYNONYMS[norm(row['route'])]) {
        errors.push(`Unrecognised route "${row['route']}" (try oral, topical, inhaled, rectal…)`);
      }
      if (row['serviceUserRef']?.trim()) {
        const su = await this.findServiceUserByRef(tenantId, row['serviceUserRef']);
        if (!su) errors.push(`No service user matches "${row['serviceUserRef']}" — import service users first`);
      }
    }
    return errors;
  }

  // ── Upserts (idempotent) ──────────────────────────────────────────────────

  private async upsertServiceUser(tenantId: string, row: Record<string, string>): Promise<'created' | 'updated'> {
    const externalRef = row['externalRef']?.trim() || undefined;
    const dob = parseDate(row['dateOfBirth'])!;

    let existing: ServiceUserEntity | null = null;
    if (externalRef) {
      existing = await this.suRepo.findOne({ where: { tenantId, externalRef } });
    }
    if (!existing) {
      existing = await this.suRepo.findOne({
        where: {
          tenantId,
          firstName: row['firstName'].trim(),
          lastName: row['lastName'].trim(),
          dateOfBirth: dob,
        },
      });
    }

    const patch: Partial<ServiceUserEntity> = {
      tenantId,
      externalRef,
      firstName: row['firstName'].trim(),
      lastName: row['lastName'].trim(),
      dateOfBirth: dob,
      status: 'active',
      address: {
        line1: row['addressLine1'].trim(),
        line2: row['addressLine2']?.trim() || undefined,
        city: row['city'].trim(),
        postcode: row['postcode'].trim().toUpperCase(),
        lat: existing?.address?.lat ?? 0,
        lon: existing?.address?.lon ?? 0,
      },
    };
    if (row['gender']?.trim()) {
      const g = norm(row['gender']);
      patch.gender = g.startsWith('f') ? 'female' : g.startsWith('m') ? 'male' : 'prefer_not_to_say';
    }
    if (row['phone']?.trim() || row['email']?.trim()) {
      patch.contactDetails = {
        ...(existing?.contactDetails ?? {}),
        phone: row['phone']?.trim() || (existing?.contactDetails as { phone?: string })?.phone,
        email: row['email']?.trim() || (existing?.contactDetails as { email?: string })?.email,
      };
    }
    if (row['conditionSummary']?.trim()) patch.conditionSummary = row['conditionSummary'].trim();
    if (row['allergies']?.trim()) patch.allergies = parseList(row['allergies']);
    if (row['medicalConditions']?.trim()) patch.medicalConditions = parseList(row['medicalConditions']);
    if (row['careLevel']?.trim()) {
      patch.careLevel = (CARE_LEVEL_SYNONYMS[norm(row['careLevel'])] ?? undefined) as ServiceUserEntity['careLevel'];
    }
    if (row['careHoursPerDay']?.trim() && !isNaN(Number(row['careHoursPerDay']))) {
      patch.careHoursPerDay = Math.min(24, Math.max(1, Math.round(Number(row['careHoursPerDay']))));
    }
    if (row['careCommencedOn']?.trim()) patch.careCommencedOn = parseDate(row['careCommencedOn']) ?? undefined;
    if (row['ecName']?.trim()) {
      patch.emergencyContacts = [{
        name: row['ecName'].trim(),
        relationship: row['ecRelationship']?.trim() || 'Next of kin',
        phone: row['ecPhone']?.trim() || '',
        isPrimaryContact: true,
        hasPortalAccess: false,
      }];
    }
    if (row['hospitalName']?.trim()) {
      patch.hospitalContact = { name: row['hospitalName'].trim(), phone: row['hospitalPhone']?.trim() || undefined };
    }
    if (row['pharmacyName']?.trim()) {
      patch.pharmacyContact = { name: row['pharmacyName'].trim(), phone: row['pharmacyPhone']?.trim() || undefined };
    }
    if (row['gpDetails']?.trim()) patch.gpDetails = { details: row['gpDetails'].trim() };

    if (existing) {
      Object.assign(existing, patch);
      await this.suRepo.save(existing);
      return 'updated';
    }
    await this.suRepo.save(this.suRepo.create(patch));
    return 'created';
  }

  private async upsertCareWorker(
    tenantId: string,
    row: Record<string, string>,
    passwordHash: string,
  ): Promise<'created' | 'updated'> {
    const email = row['email'].trim().toLowerCase();
    let user = await this.userRepo.findOne({ where: { tenantId, email } });
    let result: 'created' | 'updated' = 'updated';

    if (!user) {
      user = await this.userRepo.save(
        this.userRepo.create({
          tenantId,
          email,
          passwordHash,
          firstName: row['firstName'].trim(),
          lastName: row['lastName'].trim(),
          phone: row['phone']?.trim() || undefined,
          role: UserRole.CARE_WORKER,
          status: UserStatus.ACTIVE,
        }),
      );
      result = 'created';
    } else {
      user.firstName = row['firstName'].trim();
      user.lastName = row['lastName'].trim();
      if (row['phone']?.trim()) user.phone = row['phone'].trim();
      await this.userRepo.save(user);
    }

    const patch: Partial<CareWorkerEntity> = {
      tenantId,
      userId: user.id,
      employeeId: row['employeeId']?.trim() || undefined,
      employmentType: EMPLOYMENT_SYNONYMS[norm(row['employmentType'] ?? '')] ?? EmploymentType.FULL_TIME,
      hourlyRate: Number(row['hourlyRate'].replace(/[£$,]/g, '')),
      payFrequency: 'weekly',
      niCategory: 'A',
    };
    if (row['weekendRate']?.trim()) patch.weekendRate = Number(row['weekendRate'].replace(/[£$,]/g, ''));
    if (row['contractStart']?.trim()) patch.contractStart = parseDate(row['contractStart']) ?? undefined;
    if (row['skills']?.trim()) patch.skills = parseList(row['skills']);
    if (row['dbsCertNumber']?.trim()) patch.dbsCertNumber = row['dbsCertNumber'].trim();
    if (row['dbsExpiresAt']?.trim()) patch.dbsExpiresAt = parseDate(row['dbsExpiresAt']) ?? undefined;
    if (row['rtwExpiresAt']?.trim()) patch.rtwExpiresAt = parseDate(row['rtwExpiresAt']) ?? undefined;

    const existingWorker = await this.cwRepo.findOne({ where: { tenantId, userId: user.id } });
    if (existingWorker) {
      Object.assign(existingWorker, patch);
      await this.cwRepo.save(existingWorker);
    } else {
      await this.cwRepo.save(this.cwRepo.create(patch));
    }
    return result;
  }

  private async upsertMedication(tenantId: string, row: Record<string, string>): Promise<'created' | 'updated'> {
    const su = (await this.findServiceUserByRef(tenantId, row['serviceUserRef']))!;
    const externalRef = row['externalRef']?.trim() || undefined;

    let existing: MedicationEntity | null = null;
    if (externalRef) {
      existing = await this.medRepo.findOne({ where: { tenantId, externalRef } });
    }
    if (!existing) {
      existing = await this.medRepo.findOne({
        where: { tenantId, serviceUserId: su.id, name: row['name'].trim(), dosage: row['dosage'].trim() },
      });
    }

    const patch: Partial<MedicationEntity> = {
      tenantId,
      serviceUserId: su.id,
      externalRef,
      name: row['name'].trim(),
      dosage: row['dosage'].trim(),
      frequency: row['frequency'].trim(),
      route: ROUTE_SYNONYMS[norm(row['route'])],
      status: 'active',
    };
    if (row['purpose']?.trim()) patch.purpose = row['purpose'].trim();
    if (row['quantity']?.trim()) patch.quantity = row['quantity'].trim();
    if (row['formulation']?.trim()) patch.formulation = FORMULATION_SYNONYMS[norm(row['formulation'])];
    if (row['timesOfDay']?.trim()) {
      patch.timesOfDay = parseList(row['timesOfDay']).filter((t) => /^\d{1,2}:\d{2}$/.test(t));
    }
    if (row['isPrn'] !== undefined) patch.isPrn = parseBool(row['isPrn'] ?? '');
    if (row['prnInstructions']?.trim()) patch.prnInstructions = row['prnInstructions'].trim();
    if (row['isControlled'] !== undefined && row['isControlled'] !== '') {
      patch.isControlled = parseBool(row['isControlled']);
    }

    if (existing) {
      Object.assign(existing, patch);
      await this.medRepo.save(existing);
      return 'updated';
    }
    await this.medRepo.save(this.medRepo.create(patch));
    return 'created';
  }

  private async findServiceUserByRef(tenantId: string, ref: string): Promise<ServiceUserEntity | null> {
    const value = ref.trim();
    const byExternal = await this.suRepo.findOne({ where: { tenantId, externalRef: value } });
    if (byExternal) return byExternal;
    const parts = value.split(/\s+/);
    if (parts.length >= 2) {
      const firstName = parts[0];
      const lastName = parts.slice(1).join(' ');
      return this.suRepo
        .createQueryBuilder('su')
        .where('su.tenant_id = :tenantId', { tenantId })
        .andWhere('LOWER(su.first_name) = LOWER(:firstName)', { firstName })
        .andWhere('LOWER(su.last_name) = LOWER(:lastName)', { lastName })
        .getOne();
    }
    return null;
  }
}
