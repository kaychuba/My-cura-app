import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { EscalationLevel } from '@my-cura/shared-types';
import { VisitNoteEntity } from './entities/visit-note.entity';
import { CareDocEntryEntity, CareExecution } from './entities/care-doc-entry.entity';
import { ShiftEntity } from '../scheduling/entities/shift.entity';
import { ServiceUserEntity } from '../service-users/entities/service-user.entity';
import { UserEntity } from '../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';

/** Allowed reasons per execution outcome — mirrored by the carer app. */
export const EXECUTION_REASONS: Record<CareExecution, string[]> = {
  executed: ['fully_executed', 'adequate', 'satisfactory', 'insufficient'],
  partially_executed: ['partially_executed'],
  not_executed: ['refused', 'other'],
  other: ['not_required'],
};

export interface RecordCareDocDto {
  serviceUserId: string;
  slotAt: string;
  documentation: string;
  execution: CareExecution;
  reason: string;
}

export interface CreateVisitNoteDto {
  shiftId: string;
  narrative?: string;
  mood?: VisitNoteEntity['mood'];
  appetite?: VisitNoteEntity['appetite'];
  fluidIntakeMl?: number;
  continence?: VisitNoteEntity['continence'];
  painLevel?: number;
  sleepQuality?: VisitNoteEntity['sleepQuality'];
  mobilityNotes?: string;
  attachmentKeys?: string[];
  escalationLevel?: EscalationLevel;
  escalationNotes?: string;
}

export interface UpdateEscalationDto {
  status: 'acknowledged' | 'resolved' | 'closed';
  notes?: string;
}

@Injectable()
export class VisitNotesService {
  constructor(
    @InjectRepository(VisitNoteEntity)
    private noteRepo: Repository<VisitNoteEntity>,
    @InjectRepository(ShiftEntity)
    private shiftRepo: Repository<ShiftEntity>,
    @InjectRepository(CareDocEntryEntity)
    private careDocRepo: Repository<CareDocEntryEntity>,
    @InjectRepository(ServiceUserEntity)
    private serviceUserRepo: Repository<ServiceUserEntity>,
    @InjectRepository(UserEntity)
    private userRepo: Repository<UserEntity>,
    private notifications: NotificationsService,
  ) {}

  /** The day's hourly slots for a service user, from the admin's allocation. */
  private daySlots(su: ServiceUserEntity, date: Date): Date[] {
    if (!su.careHoursPerDay || su.careHoursPerDay < 1) return [];
    const [h, m] = (su.careDayStart ?? '08:00').split(':').map(Number);
    const start = new Date(date);
    start.setHours(h, m || 0, 0, 0);
    return Array.from({ length: su.careHoursPerDay }, (_, i) => {
      const slot = new Date(start);
      slot.setHours(start.getHours() + i);
      return slot;
    });
  }

  /** Hourly care documentation sheet for one service user and day. */
  async getCareDoc(tenantId: string, serviceUserId: string, dateStr?: string) {
    const su = await this.serviceUserRepo.findOne({ where: { id: serviceUserId, tenantId } });
    if (!su) throw new NotFoundException('Service user not found');

    const date = dateStr ? new Date(dateStr) : new Date();
    const slots = this.daySlots(su, date);
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const dayEntries = await this.careDocRepo
      .createQueryBuilder('e')
      .where('e.tenant_id = :tenantId', { tenantId })
      .andWhere('e.service_user_id = :serviceUserId', { serviceUserId })
      .andWhere('e.slot_at >= :dayStart AND e.slot_at < :dayEnd', { dayStart, dayEnd })
      .getMany();

    // Resolve carer names so managers can see who documented each hour
    const workerIds = [...new Set(dayEntries.map((e) => e.careWorkerId))];
    const workers = workerIds.length
      ? await this.userRepo.find({
          where: { tenantId, id: In(workerIds) },
          select: ['id', 'firstName', 'lastName'],
        })
      : [];
    const workerById = new Map(workers.map((w) => [w.id, `${w.firstName} ${w.lastName}`]));

    const byTime = new Map(dayEntries.map((e) => [new Date(e.slotAt).getTime(), e]));
    return {
      serviceUser: { id: su.id, firstName: su.firstName, lastName: su.lastName },
      allocatedHours: su.careHoursPerDay ?? 0,
      careDayStart: su.careDayStart ?? '08:00',
      slots: slots.map((slotAt) => {
        const entry = byTime.get(slotAt.getTime()) ?? null;
        return {
          slotAt: slotAt.toISOString(),
          entry: entry
            ? { ...entry, careWorkerName: workerById.get(entry.careWorkerId) ?? 'Unknown' }
            : null,
        };
      }),
    };
  }

  /** Carer writes the documentation for one allocated hour. */
  async recordCareDoc(
    tenantId: string,
    careWorkerId: string,
    dto: RecordCareDocDto,
  ): Promise<CareDocEntryEntity> {
    const su = await this.serviceUserRepo.findOne({ where: { id: dto.serviceUserId, tenantId } });
    if (!su) throw new NotFoundException('Service user not found');
    if (!su.careHoursPerDay) {
      throw new BadRequestException('No care hours allocated — ask your manager to set them');
    }
    if (!dto.documentation?.trim()) {
      throw new BadRequestException('Please write the care documentation for this hour');
    }
    const allowedReasons = EXECUTION_REASONS[dto.execution];
    if (!allowedReasons) {
      throw new BadRequestException(
        'Execution must be one of: executed, partially_executed, not_executed, other',
      );
    }
    if (!allowedReasons.includes(dto.reason)) {
      throw new BadRequestException(
        `For "${dto.execution.replace(/_/g, ' ')}" the reason must be one of: ${allowedReasons.join(', ')}`,
      );
    }

    const slotAt = new Date(dto.slotAt);
    if (isNaN(slotAt.getTime())) throw new BadRequestException('Invalid slot time');
    const validSlot = this.daySlots(su, slotAt).some((s) => s.getTime() === slotAt.getTime());
    if (!validSlot) {
      throw new BadRequestException("That time is not one of this service user's allocated hours");
    }

    const existing = await this.careDocRepo.findOne({
      where: { tenantId, serviceUserId: dto.serviceUserId, slotAt },
    });
    if (existing) throw new BadRequestException('This hour has already been documented');

    return this.careDocRepo.save(
      this.careDocRepo.create({
        tenantId,
        serviceUserId: dto.serviceUserId,
        careWorkerId,
        slotAt,
        documentation: dto.documentation.trim(),
        execution: dto.execution,
        reason: dto.reason,
      }),
    );
  }

  /** Care worker writes up their own visit; the shift must be theirs. */
  async create(tenantId: string, careWorkerId: string, dto: CreateVisitNoteDto): Promise<VisitNoteEntity> {
    const shift = await this.shiftRepo.findOne({
      where: { id: dto.shiftId, tenantId },
    });
    if (!shift) throw new NotFoundException('Shift not found');
    if (shift.careWorkerId !== careWorkerId) {
      throw new ForbiddenException('You can only write notes for your own shifts');
    }
    if (dto.painLevel != null && (dto.painLevel < 0 || dto.painLevel > 10)) {
      throw new BadRequestException('painLevel must be between 0 and 10');
    }

    const escalationLevel = dto.escalationLevel ?? EscalationLevel.NONE;
    const isEscalated = escalationLevel !== EscalationLevel.NONE;

    const note = this.noteRepo.create({
      tenantId,
      shiftId: shift.id,
      careWorkerId,
      serviceUserId: shift.serviceUserId,
      narrative: dto.narrative,
      mood: dto.mood,
      appetite: dto.appetite,
      fluidIntakeMl: dto.fluidIntakeMl,
      continence: dto.continence,
      painLevel: dto.painLevel,
      sleepQuality: dto.sleepQuality,
      mobilityNotes: dto.mobilityNotes,
      attachmentKeys: dto.attachmentKeys,
      escalationLevel,
      escalationStatus: isEscalated ? 'raised' : 'none',
      escalatedAt: isEscalated ? new Date() : undefined,
      escalationNotes: dto.escalationNotes,
    });
    const saved = await this.noteRepo.save(note);

    if (isEscalated) {
      await this.notifications.notifyManagers(
        tenantId,
        'escalation',
        `${escalationLevel.toUpperCase()} escalation raised`,
        dto.escalationNotes ?? dto.narrative ?? 'A care worker has raised a concern',
        { visitNoteId: saved.id, serviceUserId: saved.serviceUserId },
      );
    }
    return saved;
  }

  async listMine(tenantId: string, careWorkerId: string, page = 1, limit = 20) {
    return this.paginated({ tenantId, careWorkerId }, page, limit);
  }

  async listForServiceUser(tenantId: string, serviceUserId: string, page = 1, limit = 20) {
    return this.paginated({ tenantId, serviceUserId }, page, limit);
  }

  async getByShift(tenantId: string, shiftId: string, requester: { id: string; isManager: boolean }) {
    const notes = await this.noteRepo.find({
      where: { tenantId, shiftId },
      order: { createdAt: 'DESC' },
    });
    if (!requester.isManager && notes.some((n) => n.careWorkerId !== requester.id)) {
      throw new ForbiddenException('You can only view notes for your own shifts');
    }
    return notes;
  }

  /** Open escalations, most urgent first — the manager's action list. */
  async listOpenEscalations(tenantId: string) {
    const notes = await this.noteRepo.find({
      where: { tenantId, escalationStatus: In(['raised', 'acknowledged']) },
      order: { escalatedAt: 'ASC' },
    });
    const rank: Record<string, number> = {
      [EscalationLevel.URGENT]: 0,
      [EscalationLevel.HIGH]: 1,
      [EscalationLevel.MEDIUM]: 2,
      [EscalationLevel.LOW]: 3,
    };
    return notes.sort(
      (a, b) => (rank[a.escalationLevel] ?? 9) - (rank[b.escalationLevel] ?? 9),
    );
  }

  async updateEscalation(tenantId: string, id: string, dto: UpdateEscalationDto): Promise<VisitNoteEntity> {
    const note = await this.noteRepo.findOne({ where: { id, tenantId } });
    if (!note) throw new NotFoundException('Visit note not found');
    if (note.escalationStatus === 'none') {
      throw new BadRequestException('This note has no escalation to update');
    }

    const allowed: Record<string, string[]> = {
      raised: ['acknowledged', 'resolved', 'closed'],
      acknowledged: ['resolved', 'closed'],
      resolved: ['closed'],
      closed: [],
    };
    if (!allowed[note.escalationStatus]?.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot move escalation from '${note.escalationStatus}' to '${dto.status}'`,
      );
    }

    note.escalationStatus = dto.status;
    if (dto.notes) {
      note.escalationNotes = note.escalationNotes
        ? `${note.escalationNotes}\n---\n${dto.notes}`
        : dto.notes;
    }
    return this.noteRepo.save(note);
  }

  private async paginated(where: Record<string, unknown>, page: number, limit: number) {
    const [data, total] = await this.noteRepo.findAndCount({
      where: where as never,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
