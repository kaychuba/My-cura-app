import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { ServiceUserEntity } from './entities/service-user.entity';

export interface CreateServiceUserDto {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  address: ServiceUserEntity['address'];
  contactDetails?: Record<string, unknown>;
  fundingSource?: ServiceUserEntity['fundingSource'];
  careLevel?: ServiceUserEntity['careLevel'];
  careHoursPerDay?: number;
  careDayStart?: string;
  gender?: ServiceUserEntity['gender'];
  conditionSummary?: string;
  photoUrl?: string;
  careCommencedOn?: string;
  hospitalContact?: ServiceUserEntity['hospitalContact'];
  pharmacyContact?: ServiceUserEntity['pharmacyContact'];
  gpDetails?: Record<string, unknown>;
  allergies?: string[];
  medicalConditions?: string[];
  mobilityNeeds?: string;
  communicationNeeds?: string;
  emergencyContacts?: ServiceUserEntity['emergencyContacts'];
}

export type UpdateServiceUserDto = Partial<CreateServiceUserDto> & {
  status?: ServiceUserEntity['status'];
};

export interface ServiceUserFilter {
  search?: string;
  status?: ServiceUserEntity['status'];
  careLevel?: ServiceUserEntity['careLevel'];
}

@Injectable()
export class ServiceUsersService {
  constructor(
    @InjectRepository(ServiceUserEntity)
    private serviceUserRepo: Repository<ServiceUserEntity>,
  ) {}

  async list(tenantId: string, filter: ServiceUserFilter, page = 1, limit = 20) {
    const base: Record<string, unknown> = { tenantId };
    if (filter.status) base['status'] = filter.status;
    if (filter.careLevel) base['careLevel'] = filter.careLevel;

    const where = filter.search
      ? [
          { ...base, firstName: ILike(`%${filter.search}%`) },
          { ...base, lastName: ILike(`%${filter.search}%`) },
        ]
      : [base];

    const [data, total] = await this.serviceUserRepo.findAndCount({
      where: where as never,
      order: { lastName: 'ASC', firstName: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getById(tenantId: string, id: string): Promise<ServiceUserEntity> {
    const su = await this.serviceUserRepo.findOne({ where: { id, tenantId } });
    if (!su) throw new NotFoundException('Service user not found');
    return su;
  }

  async create(tenantId: string, dto: CreateServiceUserDto): Promise<ServiceUserEntity> {
    const su = this.serviceUserRepo.create({
      ...dto,
      tenantId,
      status: 'active',
    } as Partial<ServiceUserEntity>);
    return this.serviceUserRepo.save(su);
  }

  async update(tenantId: string, id: string, dto: UpdateServiceUserDto): Promise<ServiceUserEntity> {
    const su = await this.getById(tenantId, id);
    Object.assign(su, dto);
    return this.serviceUserRepo.save(su);
  }

  async archive(tenantId: string, id: string): Promise<ServiceUserEntity> {
    const su = await this.getById(tenantId, id);
    su.status = 'inactive';
    return this.serviceUserRepo.save(su);
  }
}
