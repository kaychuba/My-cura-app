import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { CareWorkerEntity } from './entities/care-worker.entity';
import { UserEntity } from '../users/entities/user.entity';
import { LeaveService } from '../leave/leave.service';

// Fields only MANAGER and above may see. Care workers' own /me endpoint
// strips these — the original product requirement is that pay rates are
// never exposed to the care worker role.
const PAY_FIELDS = [
  'hourlyRate', 'weekendRate', 'bankHolidayRate', 'sleepInRate',
  'liveInDailyRate', 'niNumberEnc', 'taxCode', 'niCategory',
  'studentLoanPlan', 'ssnEnc', 'federalFilingStatus', 'bankAccountEnc',
  'ytdGross', 'ytdTax', 'ytdNi',
] as const;

export type SanitisedCareWorker = Omit<CareWorkerEntity, (typeof PAY_FIELDS)[number]> & {
  user?: Pick<UserEntity, 'id' | 'email' | 'firstName' | 'lastName' | 'phone' | 'status'>;
};

export interface CreateCareWorkerDto {
  userId: string;
  employeeId?: string;
  employmentType: CareWorkerEntity['employmentType'];
  contractStart?: string;
  hourlyRate: number;
  weekendRate?: number;
  bankHolidayRate?: number;
  sleepInRate?: number;
  liveInDailyRate?: number;
  payFrequency?: CareWorkerEntity['payFrequency'];
  taxCode?: string;
  niCategory?: string;
  pensionOptIn?: boolean;
  skills?: string[];
  dbsCertNumber?: string;
  dbsExpiresAt?: string;
  rtwExpiresAt?: string;
}

export type UpdateCareWorkerDto = Partial<Omit<CreateCareWorkerDto, 'userId'>>;

@Injectable()
export class CareWorkersService {
  constructor(
    @InjectRepository(CareWorkerEntity) private careWorkerRepo: Repository<CareWorkerEntity>,
    @InjectRepository(UserEntity) private userRepo: Repository<UserEntity>,
    @InjectDataSource() private dataSource: DataSource,
    private leaveService: LeaveService,
  ) {}

  /** Everything the worker's app home screen shows, in one call. */
  async dashboard(tenantId: string, userId: string) {
    const todayRows: Array<{
      id: string; scheduled_start: string; scheduled_end: string; status: string;
      first_name?: string; last_name?: string; address?: { line1?: string; postcode?: string };
    }> = await this.dataSource.query(
      `SELECT s.id, s.scheduled_start, s.scheduled_end, s.status,
              su.first_name, su.last_name, su.address
         FROM shifts s
         LEFT JOIN service_users su ON su.id = s.service_user_id
        WHERE s.tenant_id = $1 AND s.care_worker_id = $2
          AND s.scheduled_start::date = CURRENT_DATE
        ORDER BY s.scheduled_start ASC`,
      [tenantId, userId],
    );

    const [week] = await this.dataSource.query(
      `SELECT COUNT(*) AS shifts,
              COALESCE(SUM(EXTRACT(EPOCH FROM (scheduled_end - scheduled_start)) / 3600)
                FILTER (WHERE status = 'completed'), 0) AS hours
         FROM shifts
        WHERE tenant_id = $1 AND care_worker_id = $2
          AND scheduled_start >= date_trunc('week', CURRENT_DATE)
          AND scheduled_start < date_trunc('week', CURRENT_DATE) + interval '7 days'`,
      [tenantId, userId],
    );

    const [expenses] = await this.dataSource.query(
      `SELECT COUNT(*) AS pending FROM expenses
        WHERE tenant_id = $1 AND care_worker_id = $2 AND status = 'submitted'`,
      [tenantId, userId],
    );

    let leaveBalance = 0;
    try {
      leaveBalance = (await this.leaveService.balance(tenantId, userId)).annualRemaining;
    } catch { /* leave lookup failing must not break the home screen */ }

    return {
      todaysShifts: todayRows.map((r) => ({
        id: r.id,
        serviceUser: { firstName: r.first_name ?? 'Service', lastName: r.last_name ?? 'User' },
        scheduledStart: r.scheduled_start,
        scheduledEnd: r.scheduled_end,
        status: r.status,
        locationAddress: r.address ? [r.address.line1, r.address.postcode].filter(Boolean).join(', ') : '',
      })),
      hoursThisWeek: Math.round(Number(week?.hours ?? 0) * 10) / 10,
      shiftsThisWeek: Number(week?.shifts ?? 0),
      pendingExpenses: Number(expenses?.pending ?? 0),
      leaveBalance,
    };
  }

  private async attachUsers(workers: CareWorkerEntity[]) {
    if (workers.length === 0) return [];
    const users = await this.userRepo.find({
      where: { id: In(workers.map((w) => w.userId)) },
      select: ['id', 'email', 'firstName', 'lastName', 'phone', 'status'],
    });
    const byId = new Map(users.map((u) => [u.id, u]));
    return workers.map((w) => ({ ...w, user: byId.get(w.userId) }));
  }

  stripPayFields<T extends Record<string, unknown>>(worker: T): SanitisedCareWorker {
    const copy: Record<string, unknown> = { ...worker };
    for (const f of PAY_FIELDS) delete copy[f];
    return copy as unknown as SanitisedCareWorker;
  }

  async list(tenantId: string, page = 1, limit = 20) {
    const [workers, total] = await this.careWorkerRepo.findAndCount({
      where: { tenantId },
      order: { createdAt: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    const data = await this.attachUsers(workers);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getById(tenantId: string, id: string) {
    const worker = await this.careWorkerRepo.findOne({ where: { id, tenantId } });
    if (!worker) throw new NotFoundException('Care worker not found');
    const [withUser] = await this.attachUsers([worker]);
    return withUser;
  }

  async getByUserId(tenantId: string, userId: string) {
    const worker = await this.careWorkerRepo.findOne({ where: { userId, tenantId } });
    if (!worker) throw new NotFoundException('Care worker profile not found');
    const [withUser] = await this.attachUsers([worker]);
    return withUser;
  }

  async create(tenantId: string, dto: CreateCareWorkerDto) {
    const user = await this.userRepo.findOne({ where: { id: dto.userId, tenantId } });
    if (!user) throw new NotFoundException('User not found in this agency');

    const existing = await this.careWorkerRepo.findOne({ where: { userId: dto.userId } });
    if (existing) throw new ConflictException('Care worker profile already exists for this user');

    const worker = this.careWorkerRepo.create({
      ...dto,
      tenantId,
      payFrequency: dto.payFrequency ?? 'weekly',
      niCategory: dto.niCategory ?? 'A',
      pensionOptIn: dto.pensionOptIn ?? true,
    } as Partial<CareWorkerEntity>);
    const saved = await this.careWorkerRepo.save(worker);
    const [withUser] = await this.attachUsers([saved]);
    return withUser;
  }

  async update(tenantId: string, id: string, dto: UpdateCareWorkerDto) {
    const worker = await this.careWorkerRepo.findOne({ where: { id, tenantId } });
    if (!worker) throw new NotFoundException('Care worker not found');
    Object.assign(worker, dto);
    const saved = await this.careWorkerRepo.save(worker);
    const [withUser] = await this.attachUsers([saved]);
    return withUser;
  }
}
