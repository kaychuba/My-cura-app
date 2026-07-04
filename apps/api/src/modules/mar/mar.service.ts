import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, IsNull } from 'typeorm';
import { MedicationEntity } from './entities/medication.entity';
import { MARRecordEntity } from './entities/mar-record.entity';
import { MARStatus, MedicationFormulation, MedicationRoute } from '@my-cura/shared-types';
import { encrypt, decrypt } from '@my-cura/shared-utils';
const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
const endOfDay = (d: Date) => { const x = new Date(d); x.setHours(23,59,59,999); return x; };

export interface CreateMedicationDto {
  serviceUserId: string;
  name: string;
  genericName?: string;
  purpose?: string;
  dosage: string;
  quantity?: string;
  formulation?: MedicationFormulation;
  frequency: string;
  timesOfDay?: string[];
  route: MedicationRoute;
  prescriber?: string;
  prescriberContact?: string;
  startDate?: string;
  endDate?: string;
  barcode?: string;
  storageInstructions?: string;
  isControlled?: boolean;
  cdSchedule?: 'schedule_2' | 'schedule_3' | 'schedule_4' | 'schedule_5';
}

export interface RecordMARDto {
  medicationId: string;
  serviceUserId: string;
  shiftId?: string;
  scheduledAt: string;
  status: MARStatus;
  doseGiven?: string;
  reasonNotGiven?: string;
  sideEffects?: string;
  signatureSvg?: string;
  witnessId?: string;
  witnessSvg?: string;
  barcodeVerified?: boolean;
  notes?: string;
}

export interface ScheduleDoseDto {
  medicationId: string;
  serviceUserId: string;
  /** One or more exact date-times the admin wants the dose given. */
  scheduledAt: string | string[];
}

/** Outcomes a carer may record against an admin-scheduled dose. */
const CARER_OUTCOMES: readonly MARStatus[] = [
  MARStatus.GIVEN,
  MARStatus.PARENT_ADMINISTERED,
  MARStatus.REFUSED,
  MARStatus.NOT_ADMINISTERED,
  MARStatus.OTHER,
];

export interface AdministerDoseDto {
  status: MARStatus;
  /** The carer's "time completed" selection. */
  timeCompleted: string;
  /** Carer initials, entered as their signature. */
  initials: string;
  /** Required when status is OTHER; optional context otherwise. */
  reason?: string;
  notes?: string;
  witnessId?: string;
  witnessInitials?: string;
  signatureSvg?: string;
}

export interface MARChartQuery {
  serviceUserId: string;
  startDate: string;
  endDate: string;
}

export interface DailyMARSummary {
  date: string;
  total: number;
  given: number;
  missed: number;
  refused: number;
  complianceRate: number;
}

@Injectable()
export class MARService {
  constructor(
    @InjectRepository(MedicationEntity)
    private medicationRepo: Repository<MedicationEntity>,
    @InjectRepository(MARRecordEntity)
    private marRepo: Repository<MARRecordEntity>,
  ) {}

  async listMedications(tenantId: string, serviceUserId: string): Promise<MedicationEntity[]> {
    return this.medicationRepo.find({
      where: { tenantId, serviceUserId, status: 'active' },
      order: { name: 'ASC' },
    });
  }

  async getMedication(tenantId: string, id: string): Promise<MedicationEntity> {
    const med = await this.medicationRepo.findOne({ where: { id, tenantId } });
    if (!med) throw new NotFoundException('Medication not found');
    return med;
  }

  async createMedication(tenantId: string, dto: CreateMedicationDto): Promise<MedicationEntity> {
    const med = this.medicationRepo.create({ ...dto, tenantId });
    return this.medicationRepo.save(med);
  }

  async updateMedication(
    tenantId: string, id: string, dto: Partial<CreateMedicationDto>,
  ): Promise<MedicationEntity> {
    const med = await this.getMedication(tenantId, id);
    Object.assign(med, dto);
    return this.medicationRepo.save(med);
  }

  async discontinueMedication(tenantId: string, id: string): Promise<void> {
    const med = await this.getMedication(tenantId, id);
    med.status = 'discontinued';
    await this.medicationRepo.save(med);
  }

  /** Admin schedules dose(s): exact date & time the medication must be given. */
  async scheduleDoses(tenantId: string, dto: ScheduleDoseDto): Promise<MARRecordEntity[]> {
    const med = await this.getMedication(tenantId, dto.medicationId);
    if (med.status !== 'active') {
      throw new BadRequestException('Cannot schedule a discontinued medication');
    }
    if (med.serviceUserId !== dto.serviceUserId) {
      throw new BadRequestException('Medication does not belong to this service user');
    }

    const times = (Array.isArray(dto.scheduledAt) ? dto.scheduledAt : [dto.scheduledAt])
      .map((t) => new Date(t));
    if (times.some((t) => isNaN(t.getTime()))) {
      throw new BadRequestException('Invalid scheduledAt date');
    }

    const created: MARRecordEntity[] = [];
    for (const scheduledAt of times) {
      const duplicate = await this.marRepo.findOne({
        where: { tenantId, medicationId: dto.medicationId, scheduledAt },
      });
      if (duplicate) continue;

      created.push(
        await this.marRepo.save(
          this.marRepo.create({
            tenantId,
            medicationId: dto.medicationId,
            serviceUserId: dto.serviceUserId,
            scheduledAt,
            status: MARStatus.SCHEDULED,
          }),
        ),
      );
    }
    return created;
  }

  /**
   * Carer records the outcome of an admin-scheduled dose. Only records the
   * admin created (status = SCHEDULED) can be completed — this is what makes
   * the options appear in the carer portal only when a dose is due.
   */
  async administerScheduled(
    tenantId: string,
    careWorkerId: string,
    recordId: string,
    dto: AdministerDoseDto,
  ): Promise<MARRecordEntity> {
    const record = await this.marRepo.findOne({ where: { id: recordId, tenantId } });
    if (!record) throw new NotFoundException('Scheduled dose not found');
    if (record.status !== MARStatus.SCHEDULED) {
      throw new BadRequestException('This dose has already been recorded');
    }
    if (!CARER_OUTCOMES.includes(dto.status)) {
      throw new BadRequestException(
        'Status must be one of: given, parent_administered, refused, not_administered, other',
      );
    }
    if (!dto.initials?.trim()) {
      throw new BadRequestException('Your initials are required as a signature');
    }
    if (dto.status === MARStatus.OTHER && !dto.reason?.trim()) {
      throw new BadRequestException('Please state the reason when selecting Other');
    }
    const timeCompleted = new Date(dto.timeCompleted);
    if (isNaN(timeCompleted.getTime())) {
      throw new BadRequestException('Invalid time completed');
    }

    const med = await this.getMedication(tenantId, record.medicationId);
    if (med.isControlled && dto.status === MARStatus.GIVEN && !dto.witnessId && !dto.witnessInitials?.trim()) {
      throw new BadRequestException('Controlled drug administration requires a witness');
    }

    record.careWorkerId = careWorkerId;
    record.status = dto.status;
    record.administeredAt = timeCompleted;
    record.recordedAt = new Date();
    record.initials = dto.initials.trim().toUpperCase();
    record.reasonNotGiven = dto.reason;
    record.notes = dto.notes;
    record.witnessId = dto.witnessId;
    record.witnessInitials = dto.witnessInitials?.trim().toUpperCase();
    if (dto.signatureSvg) {
      record.signatureSvgEnc = encrypt(dto.signatureSvg, process.env['ENCRYPTION_KEY'] ?? '');
    }
    return this.marRepo.save(record);
  }

  async recordMAR(tenantId: string, careWorkerId: string, dto: RecordMARDto): Promise<MARRecordEntity> {
    // Verify medication belongs to this tenant and is active
    const med = await this.getMedication(tenantId, dto.medicationId);
    if (med.status !== 'active') {
      throw new BadRequestException('Cannot record MAR for a discontinued medication');
    }

    // For controlled drugs: witness ID is mandatory
    if (med.isControlled && !dto.witnessId) {
      throw new BadRequestException('Controlled drug administration requires a witness');
    }

    // Prevent duplicate MAR records for same medication within 30 min window
    const scheduledAt = new Date(dto.scheduledAt);
    const windowStart = new Date(scheduledAt.getTime() - 30 * 60 * 1000);
    const windowEnd = new Date(scheduledAt.getTime() + 30 * 60 * 1000);

    const existing = await this.marRepo.findOne({
      where: {
        tenantId,
        medicationId: dto.medicationId,
        scheduledAt: Between(windowStart, windowEnd),
        status: MARStatus.GIVEN,
      },
    });

    if (existing) {
      throw new BadRequestException('A MAR record already exists for this medication at this scheduled time');
    }

    // Encrypt sensitive data (signatures)
    let signatureSvgEnc: string | undefined;
    let witnessSigEnc: string | undefined;
    if (dto.signatureSvg) {
      signatureSvgEnc = encrypt(dto.signatureSvg, process.env['ENCRYPTION_KEY'] ?? '');
    }
    if (dto.witnessSvg) {
      witnessSigEnc = encrypt(dto.witnessSvg, process.env['ENCRYPTION_KEY'] ?? '');
    }

    const record = this.marRepo.create({
      tenantId,
      careWorkerId,
      medicationId: dto.medicationId,
      serviceUserId: dto.serviceUserId,
      shiftId: dto.shiftId,
      scheduledAt,
      administeredAt: dto.status === MARStatus.GIVEN ? new Date() : undefined,
      status: dto.status,
      doseGiven: dto.doseGiven,
      reasonNotGiven: dto.reasonNotGiven,
      sideEffects: dto.sideEffects,
      signatureSvgEnc,
      witnessId: dto.witnessId,
      witnessSigEnc,
      barcodeVerified: dto.barcodeVerified ?? false,
      notes: dto.notes,
    });

    return this.marRepo.save(record);
  }

  async getDailyMAR(tenantId: string, serviceUserId: string, date: string): Promise<{
    medications: MedicationEntity[];
    records: MARRecordEntity[];
    summary: { total: number; given: number; missed: number; refused: number; pending: number; complianceRate: number };
  }> {
    const day = new Date(date);
    const medications = await this.listMedications(tenantId, serviceUserId);
    const records = await this.marRepo.find({
      where: {
        tenantId,
        serviceUserId,
        scheduledAt: Between(startOfDay(day), endOfDay(day)),
      },
      order: { scheduledAt: 'ASC' },
    });

    const ADMINISTERED = [
      MARStatus.GIVEN, MARStatus.SELF_ADMINISTERED,
      MARStatus.PARENT_ADMINISTERED, MARStatus.ADMINISTERED_BY_GP,
    ];
    const given = records.filter((r) => ADMINISTERED.includes(r.status)).length;
    const missed = records.filter((r) =>
      r.status === MARStatus.NOT_AVAILABLE || r.status === MARStatus.NOT_ADMINISTERED,
    ).length;
    const refused = records.filter((r) => r.status === MARStatus.REFUSED).length;
    const pending = records.filter((r) => r.status === MARStatus.SCHEDULED).length;
    const total = records.length - pending;

    return {
      medications,
      records,
      summary: {
        total,
        given,
        missed,
        refused,
        pending,
        complianceRate: total > 0 ? Math.round((given / total) * 100) : 100,
      },
    };
  }

  async getMARChart(tenantId: string, query: MARChartQuery): Promise<DailyMARSummary[]> {
    const records = await this.marRepo.find({
      where: {
        tenantId,
        serviceUserId: query.serviceUserId,
        scheduledAt: Between(new Date(query.startDate), new Date(query.endDate)),
      },
      order: { scheduledAt: 'ASC' },
    });

    // Group by date
    const byDate = new Map<string, MARRecordEntity[]>();
    for (const record of records) {
      const dateKey = record.scheduledAt.toISOString().split('T')[0];
      if (!byDate.has(dateKey)) byDate.set(dateKey, []);
      byDate.get(dateKey)!.push(record);
    }

    return Array.from(byDate.entries()).map(([date, dayRecords]) => {
      const given = dayRecords.filter((r) =>
        r.status === MARStatus.GIVEN || r.status === MARStatus.SELF_ADMINISTERED,
      ).length;
      const missed = dayRecords.filter((r) => r.status === MARStatus.NOT_AVAILABLE).length;
      const refused = dayRecords.filter((r) => r.status === MARStatus.REFUSED).length;
      const total = dayRecords.length;
      return {
        date,
        total,
        given,
        missed,
        refused,
        complianceRate: total > 0 ? Math.round((given / total) * 100) : 100,
      };
    });
  }

  async getMissedMedications(tenantId: string, since: Date = new Date(Date.now() - 24 * 60 * 60 * 1000)): Promise<MARRecordEntity[]> {
    return this.marRepo.find({
      where: {
        tenantId,
        scheduledAt: Between(since, new Date()),
        status: MARStatus.NOT_AVAILABLE,
      },
      order: { scheduledAt: 'DESC' },
    });
  }

  async updateStockLevel(tenantId: string, medicationId: string, delta: number): Promise<void> {
    const med = await this.getMedication(tenantId, medicationId);
    const current = med.stockLevel ?? 0;
    const newLevel = current + delta;
    if (newLevel < 0) throw new BadRequestException('Stock level cannot go below zero');
    med.stockLevel = newLevel;
    await this.medicationRepo.save(med);
  }

  async getMARRecordWithSignature(tenantId: string, recordId: string): Promise<MARRecordEntity & { signatureSvg?: string }> {
    const record = await this.marRepo.findOne({ where: { id: recordId, tenantId } });
    if (!record) throw new NotFoundException('MAR record not found');

    const result = record as MARRecordEntity & { signatureSvg?: string };
    if (record.signatureSvgEnc) {
      result.signatureSvg = decrypt(record.signatureSvgEnc, process.env['ENCRYPTION_KEY'] ?? '');
    }
    return result;
  }
}
