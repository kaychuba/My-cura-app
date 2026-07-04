import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantEntity } from './entities/tenant.entity';

export interface UpdateTenantDto {
  name?: string;
  settings?: Record<string, unknown>;
}

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(TenantEntity)
    private tenantRepo: Repository<TenantEntity>,
  ) {}

  async getCurrent(tenantId: string): Promise<TenantEntity> {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  /** Settings are merged, not replaced, so partial updates are safe. */
  async updateCurrent(tenantId: string, dto: UpdateTenantDto): Promise<TenantEntity> {
    const tenant = await this.getCurrent(tenantId);
    if (dto.name) tenant.name = dto.name;
    if (dto.settings) tenant.settings = { ...tenant.settings, ...dto.settings };
    return this.tenantRepo.save(tenant);
  }

  /** Platform-level view — SUPER_ADMIN only (enforced in controller). */
  async listAll(page = 1, limit = 50) {
    const [data, total] = await this.tenantRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
