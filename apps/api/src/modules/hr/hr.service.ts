import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { HRDocumentEntity } from './entities/hr-document.entity';

export interface CreateHRDocumentDto {
  userId: string;
  type: HRDocumentEntity['type'];
  title: string;
  fileKey?: string;
  issuedAt?: string;
  expiresAt?: string;
  notes?: string;
}

const DOC_TYPES: HRDocumentEntity['type'][] = [
  'contract', 'right_to_work', 'dbs_check', 'id_document', 'qualification', 'reference', 'other',
];

@Injectable()
export class HRService {
  constructor(
    @InjectRepository(HRDocumentEntity)
    private docRepo: Repository<HRDocumentEntity>,
  ) {}

  async add(tenantId: string, dto: CreateHRDocumentDto): Promise<HRDocumentEntity> {
    if (!DOC_TYPES.includes(dto.type)) {
      throw new BadRequestException(`Type must be one of: ${DOC_TYPES.join(', ')}`);
    }
    if (!dto.title?.trim()) throw new BadRequestException('Title is required');
    return this.docRepo.save(this.docRepo.create({ ...dto, tenantId, title: dto.title.trim() }));
  }

  async listByUser(tenantId: string, userId: string): Promise<HRDocumentEntity[]> {
    return this.docRepo.find({
      where: { tenantId, userId },
      order: { type: 'ASC', createdAt: 'DESC' },
    });
  }

  /** Documents expiring in the next N days — DBS renewals, right-to-work etc. */
  async expiring(tenantId: string, days = 60): Promise<HRDocumentEntity[]> {
    const today = new Date().toISOString().split('T')[0];
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + days);
    return this.docRepo.find({
      where: { tenantId, expiresAt: Between(today, horizon.toISOString().split('T')[0]) },
      order: { expiresAt: 'ASC' },
    });
  }

  async update(tenantId: string, id: string, dto: Partial<CreateHRDocumentDto>): Promise<HRDocumentEntity> {
    const doc = await this.getById(tenantId, id);
    if (dto.type && !DOC_TYPES.includes(dto.type)) {
      throw new BadRequestException(`Type must be one of: ${DOC_TYPES.join(', ')}`);
    }
    Object.assign(doc, dto);
    return this.docRepo.save(doc);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const doc = await this.getById(tenantId, id);
    await this.docRepo.softRemove(doc);
  }

  private async getById(tenantId: string, id: string): Promise<HRDocumentEntity> {
    const doc = await this.docRepo.findOne({ where: { id, tenantId } });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }
}
