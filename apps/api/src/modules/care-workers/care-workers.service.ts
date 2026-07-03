import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CareWorkerEntity } from './entities/care-worker.entity';
import { UserEntity } from '../users/entities/user.entity';

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
  ) {}

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
