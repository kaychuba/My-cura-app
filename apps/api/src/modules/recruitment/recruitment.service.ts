import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApplicantEntity, ApplicantStage } from './entities/applicant.entity';

export interface CreateApplicantDto {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  roleAppliedFor: string;
  cvKey?: string;
  notes?: string;
}

const STAGES: ApplicantStage[] = ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'];

@Injectable()
export class RecruitmentService {
  constructor(
    @InjectRepository(ApplicantEntity)
    private applicantRepo: Repository<ApplicantEntity>,
  ) {}

  async create(tenantId: string, dto: CreateApplicantDto): Promise<ApplicantEntity> {
    if (!dto.firstName?.trim() || !dto.lastName?.trim() || !dto.email?.trim()) {
      throw new BadRequestException('Name and email are required');
    }
    return this.applicantRepo.save(
      this.applicantRepo.create({
        ...dto,
        tenantId,
        email: dto.email.toLowerCase().trim(),
        stage: 'applied',
      }),
    );
  }

  async list(tenantId: string, stage?: ApplicantStage) {
    const where: Record<string, unknown> = { tenantId };
    if (stage) {
      if (!STAGES.includes(stage)) throw new BadRequestException('Unknown stage');
      where['stage'] = stage;
    }
    const applicants = await this.applicantRepo.find({
      where: where as never,
      order: { createdAt: 'DESC' },
    });
    // Pipeline counts for the kanban header
    const counts: Record<string, number> = {};
    for (const s of STAGES) counts[s] = 0;
    const all = stage ? await this.applicantRepo.find({ where: { tenantId } }) : applicants;
    for (const a of all) counts[a.stage] = (counts[a.stage] ?? 0) + 1;
    return { data: applicants, counts };
  }

  async update(tenantId: string, id: string, dto: Partial<CreateApplicantDto>): Promise<ApplicantEntity> {
    const applicant = await this.getById(tenantId, id);
    Object.assign(applicant, dto);
    return this.applicantRepo.save(applicant);
  }

  async moveStage(tenantId: string, id: string, stage: ApplicantStage): Promise<ApplicantEntity> {
    if (!STAGES.includes(stage)) {
      throw new BadRequestException(`Stage must be one of: ${STAGES.join(', ')}`);
    }
    const applicant = await this.getById(tenantId, id);
    applicant.stage = stage;
    return this.applicantRepo.save(applicant);
  }

  private async getById(tenantId: string, id: string): Promise<ApplicantEntity> {
    const applicant = await this.applicantRepo.findOne({ where: { id, tenantId } });
    if (!applicant) throw new NotFoundException('Applicant not found');
    return applicant;
  }
}
