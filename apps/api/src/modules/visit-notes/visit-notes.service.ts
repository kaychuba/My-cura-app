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
import { ShiftEntity } from '../scheduling/entities/shift.entity';
import { NotificationsService } from '../notifications/notifications.service';

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
    private notifications: NotificationsService,
  ) {}

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
