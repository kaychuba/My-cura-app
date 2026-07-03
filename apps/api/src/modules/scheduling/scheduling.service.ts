import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, Repository } from 'typeorm';
import { ShiftEntity } from './entities/shift.entity';
import { ServiceUserEntity } from '../service-users/entities/service-user.entity';
import { ShiftStatus, ShiftType } from '@my-cura/shared-types';

export interface CreateShiftDto {
  serviceUserId: string;
  careWorkerId?: string;
  scheduledStart: string;
  scheduledEnd: string;
  shiftType: ShiftType;
  notes?: string;
  payRateOverride?: number;
}

export type UpdateShiftDto = Partial<CreateShiftDto> & { status?: ShiftStatus };

export interface ShiftFilter {
  from?: string;
  to?: string;
  careWorkerId?: string;
  serviceUserId?: string;
  status?: ShiftStatus;
}

@Injectable()
export class SchedulingService {
  constructor(
    @InjectRepository(ShiftEntity) private shiftRepo: Repository<ShiftEntity>,
    @InjectRepository(ServiceUserEntity) private serviceUserRepo: Repository<ServiceUserEntity>,
  ) {}

  async list(tenantId: string, filter: ShiftFilter, page = 1, limit = 50) {
    const where: FindOptionsWhere<ShiftEntity> = { tenantId };
    if (filter.careWorkerId) where.careWorkerId = filter.careWorkerId;
    if (filter.serviceUserId) where.serviceUserId = filter.serviceUserId;
    if (filter.status) where.status = filter.status;
    if (filter.from && filter.to) {
      where.scheduledStart = Between(new Date(filter.from), new Date(filter.to));
    }

    const [data, total] = await this.shiftRepo.findAndCount({
      where,
      order: { scheduledStart: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    const withServiceUsers = await this.attachServiceUsers(tenantId, data);
    return { data: withServiceUsers, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /** A care worker's own schedule; defaults to today when no range given. */
  async myShifts(tenantId: string, careWorkerId: string, from?: string, to?: string) {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const shifts = await this.shiftRepo.find({
      where: {
        tenantId,
        careWorkerId,
        scheduledStart: Between(from ? new Date(from) : dayStart, to ? new Date(to) : dayEnd),
      },
      order: { scheduledStart: 'ASC' },
    });
    return this.attachServiceUsers(tenantId, shifts);
  }

  async getById(tenantId: string, id: string) {
    const shift = await this.shiftRepo.findOne({ where: { id, tenantId } });
    if (!shift) throw new NotFoundException('Shift not found');
    const [withSu] = await this.attachServiceUsers(tenantId, [shift]);
    return withSu;
  }

  async create(tenantId: string, createdBy: string, dto: CreateShiftDto) {
    const start = new Date(dto.scheduledStart);
    const end = new Date(dto.scheduledEnd);
    if (!(start < end)) throw new BadRequestException('scheduledEnd must be after scheduledStart');

    const su = await this.serviceUserRepo.findOne({ where: { id: dto.serviceUserId, tenantId } });
    if (!su) throw new NotFoundException('Service user not found');

    if (dto.careWorkerId) {
      await this.assertNoOverlap(tenantId, dto.careWorkerId, start, end);
    }

    const shift = this.shiftRepo.create({
      tenantId,
      serviceUserId: dto.serviceUserId,
      careWorkerId: dto.careWorkerId,
      scheduledStart: start,
      scheduledEnd: end,
      shiftType: dto.shiftType,
      status: dto.careWorkerId ? ShiftStatus.ASSIGNED : ShiftStatus.UNASSIGNED,
      notes: dto.notes,
      payRateOverride: dto.payRateOverride,
      locationAddress: su.address as unknown as Record<string, unknown>,
      locationLat: su.address?.lat,
      locationLon: su.address?.lon,
      createdBy,
    } as Partial<ShiftEntity>);
    return this.shiftRepo.save(shift);
  }

  async update(tenantId: string, id: string, dto: UpdateShiftDto) {
    const shift = await this.shiftRepo.findOne({ where: { id, tenantId } });
    if (!shift) throw new NotFoundException('Shift not found');

    const start = dto.scheduledStart ? new Date(dto.scheduledStart) : shift.scheduledStart;
    const end = dto.scheduledEnd ? new Date(dto.scheduledEnd) : shift.scheduledEnd;
    if (!(start < end)) throw new BadRequestException('scheduledEnd must be after scheduledStart');

    const workerId = dto.careWorkerId ?? shift.careWorkerId;
    if (workerId && (dto.careWorkerId || dto.scheduledStart || dto.scheduledEnd)) {
      await this.assertNoOverlap(tenantId, workerId, start, end, id);
    }

    // Assigning a worker to an unassigned shift moves it to ASSIGNED
    const status =
      dto.status ??
      (dto.careWorkerId && shift.status === ShiftStatus.UNASSIGNED ? ShiftStatus.ASSIGNED : shift.status);

    Object.assign(shift, {
      ...dto,
      scheduledStart: start,
      scheduledEnd: end,
      status,
    });
    return this.shiftRepo.save(shift);
  }

  async cancel(tenantId: string, id: string) {
    const shift = await this.shiftRepo.findOne({ where: { id, tenantId } });
    if (!shift) throw new NotFoundException('Shift not found');
    shift.status = ShiftStatus.CANCELLED;
    return this.shiftRepo.save(shift);
  }

  private async assertNoOverlap(
    tenantId: string,
    careWorkerId: string,
    start: Date,
    end: Date,
    excludeShiftId?: string,
  ) {
    const qb = this.shiftRepo
      .createQueryBuilder('s')
      .where('s.tenant_id = :tenantId', { tenantId })
      .andWhere('s.care_worker_id = :careWorkerId', { careWorkerId })
      .andWhere('s.status NOT IN (:...excluded)', {
        excluded: [ShiftStatus.CANCELLED, ShiftStatus.NO_SHOW],
      })
      .andWhere('s.scheduled_start < :end AND s.scheduled_end > :start', { start, end });
    if (excludeShiftId) qb.andWhere('s.id != :excludeShiftId', { excludeShiftId });

    const clash = await qb.getOne();
    if (clash) {
      throw new BadRequestException(
        `Care worker already has a shift ${clash.scheduledStart.toISOString()} – ${clash.scheduledEnd.toISOString()}`,
      );
    }
  }

  private async attachServiceUsers(tenantId: string, shifts: ShiftEntity[]) {
    if (shifts.length === 0) return [];
    const ids = [...new Set(shifts.map((s) => s.serviceUserId))];
    const sus = await this.serviceUserRepo
      .createQueryBuilder('su')
      .where('su.tenant_id = :tenantId', { tenantId })
      .andWhere('su.id IN (:...ids)', { ids })
      .getMany();
    const byId = new Map(sus.map((su) => [su.id, su]));
    return shifts.map((s) => ({
      ...s,
      serviceUser: byId.get(s.serviceUserId)
        ? {
            id: s.serviceUserId,
            firstName: byId.get(s.serviceUserId)!.firstName,
            lastName: byId.get(s.serviceUserId)!.lastName,
            address: byId.get(s.serviceUserId)!.address,
          }
        : undefined,
    }));
  }
}
