import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, IsNull } from 'typeorm';
import { MedicationEntity } from './entities/medication.entity';
import { MARRecordEntity } from './entities/mar-record.entity';
import { MARStatus, MedicationRoute } from '@my-cura/shared-types';
import { encrypt, decrypt } from '@my-cura/shared-utils';
const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
const endOfDay = (d: Date) => { const x = new Date(d); x.setHours(23,59,59,999); return x; };

export interface CreateMedicationDto {
  serviceUserId: string;
  name: string;
  genericName?: string;
  dosage: string;
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
    summary: { total: number; given: number; missed: number; refused: number; complianceRate: number };
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

    const given = records.filter((r) => r.status === MARStatus.GIVEN || r.status === MARStatus.SELF_ADMINISTERED).length;
    const missed = records.filter((r) => r.status === MARStatus.NOT_AVAILABLE).length;
    const refused = records.filter((r) => r.status === MARStatus.REFUSED).length;
    const total = records.length;

    return {
      medications,
      records,
      summary: {
        total,
        given,
        missed,
        refused,
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
