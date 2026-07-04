import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CarePlanEntity } from './entities/care-plan.entity';

export interface CreateCarePlanDto {
  serviceUserId: string;
  title: string;
  content: CarePlanEntity['content'];
  riskAssessments?: CarePlanEntity['riskAssessments'];
  goals?: string[];
  nextReviewAt?: string;
}

export type UpdateCarePlanDto = Partial<Omit<CreateCarePlanDto, 'serviceUserId'>>;

@Injectable()
export class CarePlansService {
  constructor(
    @InjectRepository(CarePlanEntity)
    private carePlanRepo: Repository<CarePlanEntity>,
  ) {}

  /** All versions for a service user, newest first. */
  async listForServiceUser(tenantId: string, serviceUserId: string) {
    return this.carePlanRepo.find({
      where: { tenantId, serviceUserId },
      order: { version: 'DESC' },
    });
  }

  /** The single active plan — what care workers see before a visit. */
  async getActiveForServiceUser(tenantId: string, serviceUserId: string): Promise<CarePlanEntity> {
    const plan = await this.carePlanRepo.findOne({
      where: { tenantId, serviceUserId, status: 'active' },
      order: { version: 'DESC' },
    });
    if (!plan) throw new NotFoundException('No active care plan for this service user');
    return plan;
  }

  async getById(tenantId: string, id: string): Promise<CarePlanEntity> {
    const plan = await this.carePlanRepo.findOne({ where: { id, tenantId } });
    if (!plan) throw new NotFoundException('Care plan not found');
    return plan;
  }

  /** New plans start as drafts; version auto-increments per service user. */
  async create(tenantId: string, createdBy: string, dto: CreateCarePlanDto): Promise<CarePlanEntity> {
    const latest = await this.carePlanRepo.findOne({
      where: { tenantId, serviceUserId: dto.serviceUserId },
      order: { version: 'DESC' },
    });

    const plan = this.carePlanRepo.create({
      tenantId,
      serviceUserId: dto.serviceUserId,
      version: (latest?.version ?? 0) + 1,
      title: dto.title,
      content: dto.content ?? {},
      riskAssessments: dto.riskAssessments,
      goals: dto.goals,
      nextReviewAt: dto.nextReviewAt ? new Date(dto.nextReviewAt) : undefined,
      createdBy,
      status: 'draft',
    });
    return this.carePlanRepo.save(plan);
  }

  async update(tenantId: string, id: string, dto: UpdateCarePlanDto): Promise<CarePlanEntity> {
    const plan = await this.getById(tenantId, id);
    if (plan.status !== 'draft') {
      throw new BadRequestException(
        'Only draft plans can be edited — create a new version instead',
      );
    }
    const { nextReviewAt, ...rest } = dto;
    Object.assign(plan, rest);
    if (nextReviewAt) plan.nextReviewAt = new Date(nextReviewAt);
    return this.carePlanRepo.save(plan);
  }

  /** Activating a draft archives any previously active version. */
  async activate(tenantId: string, id: string): Promise<CarePlanEntity> {
    const plan = await this.getById(tenantId, id);
    if (plan.status !== 'draft') {
      throw new BadRequestException('Only draft plans can be activated');
    }

    await this.carePlanRepo.update(
      { tenantId, serviceUserId: plan.serviceUserId, status: 'active' },
      { status: 'archived' },
    );

    plan.status = 'active';
    return this.carePlanRepo.save(plan);
  }

  async review(
    tenantId: string,
    id: string,
    reviewedBy: string,
    nextReviewAt?: string,
  ): Promise<CarePlanEntity> {
    const plan = await this.getById(tenantId, id);
    if (plan.status !== 'active') {
      throw new BadRequestException('Only active plans can be reviewed');
    }
    plan.reviewedAt = new Date();
    plan.reviewedBy = reviewedBy;
    if (nextReviewAt) plan.nextReviewAt = new Date(nextReviewAt);
    return this.carePlanRepo.save(plan);
  }
}
