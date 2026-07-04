import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { AuditLogEntity } from './entities/audit-log.entity';

export interface AuditFilter {
  userId?: string;
  action?: string;
  resourceType?: string;
  from?: string;
  to?: string;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLogEntity)
    private auditRepo: Repository<AuditLogEntity>,
  ) {}

  async list(tenantId: string, filter: AuditFilter, page = 1, limit = 50) {
    const where: Record<string, unknown> = { tenantId };
    if (filter.userId) where['userId'] = filter.userId;
    if (filter.action) where['action'] = filter.action.toUpperCase();
    if (filter.resourceType) where['resourceType'] = filter.resourceType;

    if (filter.from && filter.to) {
      where['createdAt'] = Between(new Date(filter.from), new Date(filter.to));
    } else if (filter.from) {
      where['createdAt'] = MoreThanOrEqual(new Date(filter.from));
    } else if (filter.to) {
      where['createdAt'] = LessThanOrEqual(new Date(filter.to));
    }

    const [data, total] = await this.auditRepo.findAndCount({
      where: where as never,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
