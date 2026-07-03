import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindOptionsWhere } from 'typeorm';
import { IncidentType, IncidentSeverity, EscalationLevel } from '@my-cura/shared-types';

// Temporary entity inline until full entity file is wired
import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../database/base.entity';

@Entity('incidents')
@Index(['tenantId', 'reportedAt'])
@Index(['serviceUserId', 'tenantId'])
export class IncidentEntity extends BaseEntity {
  @Column({ name: 'shift_id', type: 'uuid', nullable: true })
  shiftId?: string;

  @Column({ name: 'service_user_id', type: 'uuid' })
  serviceUserId: string;

  @Column({ name: 'reported_by', type: 'uuid' })
  reportedBy: string;

  @Column({ type: 'enum', enum: IncidentType })
  incidentType: IncidentType;

  @Column({ type: 'enum', enum: IncidentSeverity })
  severity: IncidentSeverity;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'actions_taken', type: 'text', nullable: true })
  actionsTaken?: string;

  @Column({ name: 'reported_at', type: 'timestamptz' })
  reportedAt: Date;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt?: Date;

  @Column({ name: 'escalation_level', type: 'enum', enum: EscalationLevel, nullable: true })
  escalationLevel?: EscalationLevel;

  @Column({ name: 'escalated_to_id', type: 'uuid', nullable: true })
  escalatedToId?: string;

  @Column({ name: 'escalated_at', type: 'timestamptz', nullable: true })
  escalatedAt?: Date;

  @Column({ name: 'witness_ids', type: 'simple-array', nullable: true })
  witnessIds?: string[];

  @Column({ name: 'attachment_keys', type: 'simple-array', nullable: true })
  attachmentKeys?: string[];

  @Column({ default: 'open' })
  status: 'open' | 'investigating' | 'resolved' | 'closed';

  @Column({ name: 'cqc_reportable', default: false })
  cqcReportable: boolean;

  @Column({ name: 'police_ref', nullable: true })
  policeRef?: string;
}

export interface CreateIncidentDto {
  shiftId?: string;
  serviceUserId: string;
  incidentType: IncidentType;
  severity: IncidentSeverity;
  description: string;
  actionsTaken?: string;
  reportedAt: string;
  witnessIds?: string[];
  cqcReportable?: boolean;
}

export interface UpdateIncidentDto {
  description?: string;
  actionsTaken?: string;
  severity?: IncidentSeverity;
  escalationLevel?: EscalationLevel;
  escalatedToId?: string;
  policeRef?: string;
  status?: IncidentEntity['status'];
}

export interface IncidentFilter {
  severity?: IncidentSeverity;
  incidentType?: IncidentType;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  serviceUserId?: string;
}

@Injectable()
export class IncidentsService {
  constructor(
    @InjectRepository(IncidentEntity)
    private incidentRepo: Repository<IncidentEntity>,
  ) {}

  async list(tenantId: string, filter: IncidentFilter, page = 1, limit = 20) {
    const where: FindOptionsWhere<IncidentEntity> = { tenantId };

    if (filter.severity) where.severity = filter.severity;
    if (filter.incidentType) where.incidentType = filter.incidentType;
    if (filter.status) where.status = filter.status as IncidentEntity['status'];
    if (filter.serviceUserId) where.serviceUserId = filter.serviceUserId;
    if (filter.dateFrom && filter.dateTo) {
      where.reportedAt = Between(new Date(filter.dateFrom), new Date(filter.dateTo)) as unknown as Date;
    }

    const [data, total] = await this.incidentRepo.findAndCount({
      where,
      order: { reportedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getById(tenantId: string, id: string): Promise<IncidentEntity> {
    const incident = await this.incidentRepo.findOne({ where: { id, tenantId } });
    if (!incident) throw new NotFoundException('Incident not found');
    return incident;
  }

  async create(tenantId: string, reportedBy: string, dto: CreateIncidentDto): Promise<IncidentEntity> {
    // Auto-escalate critical incidents
    let escalationLevel: EscalationLevel | undefined;
    if (dto.severity === IncidentSeverity.CRITICAL) {
      escalationLevel = EscalationLevel.HIGH;
    } else if (dto.severity === IncidentSeverity.HIGH) {
      escalationLevel = EscalationLevel.MEDIUM;
    }

    // CQC must be notified for: falls with injury, medication errors (critical), safeguarding concerns
    const cqcTypes = [IncidentType.FALL, IncidentType.MEDICATION_ERROR, IncidentType.SAFEGUARDING];
    const autoCqcReportable =
      dto.cqcReportable ||
      (dto.severity === IncidentSeverity.CRITICAL && cqcTypes.includes(dto.incidentType));

    const incident = this.incidentRepo.create({
      tenantId,
      reportedBy,
      ...dto,
      reportedAt: new Date(dto.reportedAt),
      escalationLevel,
      escalatedAt: escalationLevel ? new Date() : undefined,
      cqcReportable: autoCqcReportable,
      status: 'open',
    });

    return this.incidentRepo.save(incident);
  }

  async update(tenantId: string, id: string, dto: UpdateIncidentDto): Promise<IncidentEntity> {
    const incident = await this.getById(tenantId, id);

    if (dto.escalationLevel && dto.escalationLevel !== incident.escalationLevel) {
      incident.escalatedAt = new Date();
    }

    Object.assign(incident, dto);

    if (dto.status === 'resolved' && !incident.resolvedAt) {
      incident.resolvedAt = new Date();
    }

    return this.incidentRepo.save(incident);
  }

  async resolve(tenantId: string, id: string, actionsTaken: string): Promise<IncidentEntity> {
    const incident = await this.getById(tenantId, id);
    if (incident.status === 'closed') {
      throw new BadRequestException('Incident is already closed');
    }
    incident.status = 'resolved';
    incident.resolvedAt = new Date();
    incident.actionsTaken = actionsTaken;
    return this.incidentRepo.save(incident);
  }

  async getStats(tenantId: string): Promise<{
    openCount: number;
    criticalCount: number;
    cqcReportableCount: number;
    byType: Record<string, number>;
  }> {
    const [open, critical, cqcReportable, all] = await Promise.all([
      this.incidentRepo.count({ where: { tenantId, status: 'open' } }),
      this.incidentRepo.count({ where: { tenantId, severity: IncidentSeverity.CRITICAL, status: 'open' } }),
      this.incidentRepo.count({ where: { tenantId, cqcReportable: true } }),
      this.incidentRepo.find({ where: { tenantId }, select: ['incidentType'] }),
    ]);

    const byType = all.reduce((acc, i) => {
      acc[i.incidentType] = (acc[i.incidentType] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { openCount: open, criticalCount: critical, cqcReportableCount: cqcReportable, byType };
  }
}
