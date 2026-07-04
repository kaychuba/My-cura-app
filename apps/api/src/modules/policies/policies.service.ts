import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { PolicyEntity } from './entities/policy.entity';
import { PolicyAcknowledgementEntity } from './entities/policy-acknowledgement.entity';

// Business rule from the agency owner: at most 3 policies may be published
// per calendar month, so carers are never flooded.
const MAX_POLICIES_PER_MONTH = 3;

export interface CreatePolicyDto {
  title: string;
  summary?: string;
  content?: string;
  externalUrl?: string;
  requiresAcknowledgement?: boolean;
}

@Injectable()
export class PoliciesService {
  constructor(
    @InjectRepository(PolicyEntity) private policyRepo: Repository<PolicyEntity>,
    @InjectRepository(PolicyAcknowledgementEntity)
    private ackRepo: Repository<PolicyAcknowledgementEntity>,
  ) {}

  async publishedThisMonth(tenantId: string): Promise<number> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return this.policyRepo.count({
      where: { tenantId, publishedAt: Between(monthStart, monthEnd) },
    });
  }

  async create(tenantId: string, createdBy: string, dto: CreatePolicyDto) {
    if (!dto.title?.trim()) throw new BadRequestException('Title is required');
    if (!dto.content?.trim() && !dto.externalUrl?.trim()) {
      throw new BadRequestException('Provide either the policy content or an external link');
    }
    if (dto.externalUrl && !/^https?:\/\//i.test(dto.externalUrl)) {
      throw new BadRequestException('externalUrl must be an http(s) link');
    }

    const publishedCount = await this.publishedThisMonth(tenantId);
    if (publishedCount >= MAX_POLICIES_PER_MONTH) {
      throw new ConflictException(
        `Policy limit reached: ${MAX_POLICIES_PER_MONTH} policies may be published per calendar month`,
      );
    }

    const policy = this.policyRepo.create({
      tenantId,
      title: dto.title.trim(),
      summary: dto.summary,
      content: dto.content,
      externalUrl: dto.externalUrl,
      requiresAcknowledgement: dto.requiresAcknowledgement ?? true,
      publishedAt: new Date(),
      createdBy,
      isActive: true,
    } as Partial<PolicyEntity>);
    return this.policyRepo.save(policy);
  }

  /** Active policies with the caller's acknowledgement state — the carer view. */
  async listForUser(tenantId: string, userId: string) {
    const policies = await this.policyRepo.find({
      where: { tenantId, isActive: true },
      order: { publishedAt: 'DESC' },
    });
    if (policies.length === 0) return [];
    const acks = await this.ackRepo.find({
      where: { userId, policyId: In(policies.map((p) => p.id)) },
    });
    const ackByPolicy = new Map(acks.map((a) => [a.policyId, a]));
    return policies.map((p) => ({
      ...p,
      acknowledgedAt: ackByPolicy.get(p.id)?.acknowledgedAt ?? null,
    }));
  }

  async getById(tenantId: string, id: string) {
    const policy = await this.policyRepo.findOne({ where: { id, tenantId, isActive: true } });
    if (!policy) throw new NotFoundException('Policy not found');
    return policy;
  }

  async acknowledge(tenantId: string, userId: string, policyId: string) {
    await this.getById(tenantId, policyId);
    const existing = await this.ackRepo.findOne({ where: { policyId, userId } });
    if (existing) return existing;
    const ack = this.ackRepo.create({
      tenantId,
      policyId,
      userId,
      acknowledgedAt: new Date(),
    } as Partial<PolicyAcknowledgementEntity>);
    return this.ackRepo.save(ack);
  }

  /** Admin compliance view: who has (not) read each policy. */
  async acknowledgementStatus(tenantId: string, policyId: string) {
    await this.getById(tenantId, policyId);
    const acks = await this.ackRepo.find({ where: { tenantId, policyId } });
    return { policyId, acknowledgedCount: acks.length, acknowledgements: acks };
  }

  async archive(tenantId: string, id: string) {
    const policy = await this.getById(tenantId, id);
    policy.isActive = false;
    return this.policyRepo.save(policy);
  }

  async monthlyQuota(tenantId: string) {
    const used = await this.publishedThisMonth(tenantId);
    return { limit: MAX_POLICIES_PER_MONTH, used, remaining: Math.max(0, MAX_POLICIES_PER_MONTH - used) };
  }
}
