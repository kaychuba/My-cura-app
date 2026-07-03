import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { LeaveRequestEntity } from './entities/leave-request.entity';
import { TenantEntity } from '../tenants/entities/tenant.entity';
import { LeaveStatus, LeaveType } from '@my-cura/shared-types';

// UK statutory minimum: 5.6 weeks × 5 days = 28 days (incl. bank holidays).
// Tenants can override via settings.annualLeaveDays.
const DEFAULT_ANNUAL_LEAVE_DAYS = 28;

export interface CreateLeaveRequestDto {
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  daysRequested: number;
  reason?: string;
}

export interface LeaveFilter {
  status?: LeaveStatus;
  careWorkerId?: string;
  leaveType?: LeaveType;
}

@Injectable()
export class LeaveService {
  constructor(
    @InjectRepository(LeaveRequestEntity) private leaveRepo: Repository<LeaveRequestEntity>,
    @InjectRepository(TenantEntity) private tenantRepo: Repository<TenantEntity>,
  ) {}

  async create(tenantId: string, careWorkerId: string, dto: CreateLeaveRequestDto) {
    if (new Date(dto.endDate) < new Date(dto.startDate)) {
      throw new BadRequestException('endDate must not be before startDate');
    }
    if (!(dto.daysRequested > 0)) {
      throw new BadRequestException('daysRequested must be positive');
    }

    const overlap = await this.leaveRepo
      .createQueryBuilder('l')
      .where('l.tenant_id = :tenantId', { tenantId })
      .andWhere('l.care_worker_id = :careWorkerId', { careWorkerId })
      .andWhere('l.status IN (:...active)', { active: [LeaveStatus.PENDING, LeaveStatus.APPROVED] })
      .andWhere('l.start_date <= :endDate AND l.end_date >= :startDate', {
        startDate: dto.startDate,
        endDate: dto.endDate,
      })
      .getOne();
    if (overlap) {
      throw new BadRequestException('You already have leave requested or approved for these dates');
    }

    const request = this.leaveRepo.create({
      tenantId,
      careWorkerId,
      leaveType: dto.leaveType,
      startDate: dto.startDate,
      endDate: dto.endDate,
      daysRequested: dto.daysRequested,
      reason: dto.reason,
      status: LeaveStatus.PENDING,
      isPaid: dto.leaveType !== LeaveType.UNPAID,
    } as Partial<LeaveRequestEntity>);
    return this.leaveRepo.save(request);
  }

  async list(tenantId: string, filter: LeaveFilter, page = 1, limit = 20) {
    const where: FindOptionsWhere<LeaveRequestEntity> = { tenantId };
    if (filter.status) where.status = filter.status;
    if (filter.careWorkerId) where.careWorkerId = filter.careWorkerId;
    if (filter.leaveType) where.leaveType = filter.leaveType;

    const [data, total] = await this.leaveRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async mine(tenantId: string, careWorkerId: string) {
    return this.leaveRepo.find({
      where: { tenantId, careWorkerId },
      order: { startDate: 'DESC' },
    });
  }

  async review(
    tenantId: string,
    id: string,
    reviewerId: string,
    decision: LeaveStatus.APPROVED | LeaveStatus.DECLINED,
    reviewNotes?: string,
  ) {
    const request = await this.leaveRepo.findOne({ where: { id, tenantId } });
    if (!request) throw new NotFoundException('Leave request not found');
    if (request.status !== LeaveStatus.PENDING) {
      throw new BadRequestException(`Only pending requests can be reviewed (current: ${request.status})`);
    }
    request.status = decision;
    request.reviewedBy = reviewerId;
    request.reviewedAt = new Date();
    request.reviewNotes = reviewNotes;
    return this.leaveRepo.save(request);
  }

  async cancel(tenantId: string, id: string, requesterId: string) {
    const request = await this.leaveRepo.findOne({ where: { id, tenantId } });
    if (!request) throw new NotFoundException('Leave request not found');
    if (request.careWorkerId !== requesterId) {
      throw new BadRequestException('You can only cancel your own leave requests');
    }
    if (request.status === LeaveStatus.CANCELLED) return request;
    request.status = LeaveStatus.CANCELLED;
    return this.leaveRepo.save(request);
  }

  /** Annual-leave balance for the current calendar year. */
  async balance(tenantId: string, careWorkerId: string) {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    const entitlement =
      Number((tenant?.settings as Record<string, unknown> | undefined)?.['annualLeaveDays']) ||
      DEFAULT_ANNUAL_LEAVE_DAYS;

    const year = new Date().getFullYear();
    const rows = await this.leaveRepo
      .createQueryBuilder('l')
      .select('l.leave_type', 'leaveType')
      .addSelect('l.status', 'status')
      .addSelect('SUM(l.days_requested)', 'days')
      .where('l.tenant_id = :tenantId', { tenantId })
      .andWhere('l.care_worker_id = :careWorkerId', { careWorkerId })
      .andWhere('l.start_date >= :from AND l.start_date <= :to', {
        from: `${year}-01-01`,
        to: `${year}-12-31`,
      })
      .andWhere('l.status IN (:...counted)', { counted: [LeaveStatus.PENDING, LeaveStatus.APPROVED] })
      .groupBy('l.leave_type')
      .addGroupBy('l.status')
      .getRawMany<{ leaveType: LeaveType; status: LeaveStatus; days: string }>();

    const sum = (type: LeaveType, status: LeaveStatus) =>
      rows
        .filter((r) => r.leaveType === type && r.status === status)
        .reduce((acc, r) => acc + Number(r.days), 0);

    const annualTaken = sum(LeaveType.ANNUAL, LeaveStatus.APPROVED);
    const annualPending = sum(LeaveType.ANNUAL, LeaveStatus.PENDING);
    const sickTaken = sum(LeaveType.SICK, LeaveStatus.APPROVED);

    return {
      year,
      entitlementDays: entitlement,
      annualTaken,
      annualPending,
      annualRemaining: entitlement - annualTaken - annualPending,
      sickTaken,
    };
  }
}
