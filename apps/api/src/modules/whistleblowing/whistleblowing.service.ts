import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import {
  WhistleblowingReportEntity, WhistleblowingCategory, WhistleblowingStatus,
} from './entities/whistleblowing-report.entity';

export interface CreateWhistleblowingDto {
  category: WhistleblowingCategory;
  description: string;
  context?: string;
  /** When true, no reporter identity is stored at all. */
  anonymous?: boolean;
}

const STATUSES: WhistleblowingStatus[] = ['submitted', 'under_review', 'investigating', 'closed'];

@Injectable()
export class WhistleblowingService {
  constructor(
    @InjectRepository(WhistleblowingReportEntity)
    private reportRepo: Repository<WhistleblowingReportEntity>,
  ) {}

  async create(tenantId: string, reporterId: string, dto: CreateWhistleblowingDto) {
    if (!dto.description?.trim()) throw new BadRequestException('A description is required');
    const report = this.reportRepo.create({
      tenantId,
      reporterId: dto.anonymous ? null : reporterId,
      category: dto.category ?? 'other',
      description: dto.description.trim(),
      context: dto.context,
      status: 'submitted',
    } as Partial<WhistleblowingReportEntity>);
    const saved = await this.reportRepo.save(report);
    // Never echo the reporter id back — even non-anonymous reports are
    // confidential; identity is only visible to agency owners via list().
    return { id: saved.id, status: saved.status, createdAt: saved.createdAt };
  }

  async list(tenantId: string, status?: WhistleblowingStatus, page = 1, limit = 20) {
    const where: FindOptionsWhere<WhistleblowingReportEntity> = { tenantId };
    if (status) where.status = status;
    const [reports, total] = await this.reportRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Resolve reporter names for named reports (owner-only view); anonymous
    // reports have no reporterId to resolve — by design.
    const reporterIds = [...new Set(reports.map((r) => r.reporterId).filter(Boolean))] as string[];
    const names = new Map<string, string>();
    if (reporterIds.length > 0) {
      const rows: { id: string; name: string }[] = await this.reportRepo.manager.query(
        `SELECT id, first_name || ' ' || last_name AS name FROM users WHERE id = ANY($1)`,
        [reporterIds],
      );
      rows.forEach((r) => names.set(r.id, r.name));
    }

    const data = reports.map((r) => ({
      ...r,
      reporterName: r.reporterId ? names.get(r.reporterId) ?? 'Unknown user' : null,
    }));
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async updateStatus(
    tenantId: string,
    id: string,
    reviewerId: string,
    status: WhistleblowingStatus,
    reviewNotes?: string,
  ) {
    if (!STATUSES.includes(status)) throw new BadRequestException(`Invalid status: ${status}`);
    const report = await this.reportRepo.findOne({ where: { id, tenantId } });
    if (!report) throw new NotFoundException('Report not found');
    report.status = status;
    report.reviewedBy = reviewerId;
    if (reviewNotes !== undefined) report.reviewNotes = reviewNotes;
    if (status === 'closed') report.closedAt = new Date();
    return this.reportRepo.save(report);
  }
}
