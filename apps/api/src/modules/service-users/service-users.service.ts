import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { ConsentGivenBy, ConsentStatus, ConsentType } from '@my-cura/shared-types';
import { ServiceUserEntity } from './entities/service-user.entity';
import { ServiceUserConsentEntity } from './entities/service-user-consent.entity';

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

export interface RecordConsentDto {
  consentType: ConsentType;
  status: ConsentStatus;
  givenBy: ConsentGivenBy;
  givenByName?: string;
  capacityAssessed?: boolean;
  notes?: string;
  reviewBy?: string;
}

@Injectable()
export class ServiceUsersService {
  constructor(
    @InjectRepository(ServiceUserEntity)
    private serviceUserRepo: Repository<ServiceUserEntity>,
    @InjectRepository(ServiceUserConsentEntity)
    private consentRepo: Repository<ServiceUserConsentEntity>,
  ) {}

  // ── Consent (append-only event log; MCA-aware) ───────────────────────────

  async recordConsent(
    tenantId: string,
    recordedBy: string,
    serviceUserId: string,
    dto: RecordConsentDto,
  ): Promise<ServiceUserConsentEntity> {
    await this.getById(tenantId, serviceUserId); // 404 if not ours

    if (!Object.values(ConsentType).includes(dto.consentType)) {
      throw new BadRequestException('Unknown consent type');
    }
    if (!Object.values(ConsentStatus).includes(dto.status)) {
      throw new BadRequestException('Unknown consent status');
    }
    if (!Object.values(ConsentGivenBy).includes(dto.givenBy)) {
      throw new BadRequestException('Unknown decision-maker type');
    }
    // A decision made for the person by someone else must name them and
    // reflect a capacity assessment — CQC will ask for exactly this.
    if (dto.givenBy !== ConsentGivenBy.SELF) {
      if (!dto.givenByName?.trim()) {
        throw new BadRequestException(
          'Name the attorney/deputy (or record the best-interests decision maker)',
        );
      }
      if (!dto.capacityAssessed) {
        throw new BadRequestException(
          'A decision on someone’s behalf requires a capacity assessment to be recorded',
        );
      }
    }
    if (dto.status === ConsentStatus.WITHDRAWN) {
      const current = await this.currentConsent(tenantId, serviceUserId, dto.consentType);
      if (current?.status !== ConsentStatus.GRANTED) {
        throw new BadRequestException('Only granted consent can be withdrawn');
      }
    }

    return this.consentRepo.save(
      this.consentRepo.create({
        tenantId,
        serviceUserId,
        consentType: dto.consentType,
        status: dto.status,
        givenBy: dto.givenBy,
        givenByName: dto.givenByName?.trim() || null,
        capacityAssessed: dto.capacityAssessed ?? false,
        notes: dto.notes,
        reviewBy: dto.reviewBy,
        recordedBy,
      }),
    );
  }

  /** Current position per consent type + the full immutable history. */
  async listConsents(tenantId: string, serviceUserId: string) {
    await this.getById(tenantId, serviceUserId);
    const history = await this.consentRepo.find({
      where: { tenantId, serviceUserId },
      order: { recordedAt: 'DESC' },
    });
    const current: Partial<Record<ConsentType, ServiceUserConsentEntity>> = {};
    for (const event of history) {
      current[event.consentType] ??= event; // newest first — first wins
    }
    return { current, history };
  }

  private async currentConsent(
    tenantId: string,
    serviceUserId: string,
    consentType: ConsentType,
  ): Promise<ServiceUserConsentEntity | null> {
    return this.consentRepo.findOne({
      where: { tenantId, serviceUserId, consentType },
      order: { recordedAt: 'DESC' },
    });
  }

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
