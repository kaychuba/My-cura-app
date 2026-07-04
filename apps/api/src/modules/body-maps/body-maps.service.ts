import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { BodyMapEntity, BodyMapMarker } from './entities/body-map.entity';
import { ServiceUserEntity } from '../service-users/entities/service-user.entity';

export interface CreateBodyMapDto {
  serviceUserId: string;
  shiftId?: string;
  markers: BodyMapMarker[];
  summary: string;
}

@Injectable()
export class BodyMapsService {
  constructor(
    @InjectRepository(BodyMapEntity) private bodyMapRepo: Repository<BodyMapEntity>,
    @InjectRepository(ServiceUserEntity) private serviceUserRepo: Repository<ServiceUserEntity>,
  ) {}

  async create(tenantId: string, careWorkerId: string, dto: CreateBodyMapDto) {
    if (!dto.summary?.trim()) throw new BadRequestException('A summary of the observation is required');
    if (!Array.isArray(dto.markers) || dto.markers.length === 0) {
      throw new BadRequestException('At least one marker is required');
    }
    for (const m of dto.markers) {
      if (
        typeof m.x !== 'number' || typeof m.y !== 'number' ||
        m.x < 0 || m.x > 100 || m.y < 0 || m.y > 100 ||
        !['front', 'back'].includes(m.view)
      ) {
        throw new BadRequestException('Markers must have x/y between 0 and 100 and a front/back view');
      }
    }
    const su = await this.serviceUserRepo.findOne({ where: { id: dto.serviceUserId, tenantId } });
    if (!su) throw new NotFoundException('Service user not found');

    const map = this.bodyMapRepo.create({
      tenantId,
      serviceUserId: dto.serviceUserId,
      careWorkerId,
      shiftId: dto.shiftId,
      markers: dto.markers,
      summary: dto.summary.trim(),
    } as Partial<BodyMapEntity>);
    return this.bodyMapRepo.save(map);
  }

  async listForServiceUser(tenantId: string, serviceUserId: string, page = 1, limit = 20) {
    const [data, total] = await this.bodyMapRepo.findAndCount({
      where: { tenantId, serviceUserId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async list(tenantId: string, careWorkerId?: string, page = 1, limit = 20) {
    const where: FindOptionsWhere<BodyMapEntity> = { tenantId };
    if (careWorkerId) where.careWorkerId = careWorkerId;
    const [data, total] = await this.bodyMapRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getById(tenantId: string, id: string) {
    const map = await this.bodyMapRepo.findOne({ where: { id, tenantId } });
    if (!map) throw new NotFoundException('Body map not found');
    return map;
  }
}
