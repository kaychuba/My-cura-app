import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { TrainingCourseEntity } from './entities/training-course.entity';
import { TrainingRecordEntity } from './entities/training-record.entity';
import { NotificationsService } from '../notifications/notifications.service';

export interface CreateCourseDto {
  name: string;
  description?: string;
  validityMonths?: number;
  mandatory?: boolean;
}

@Injectable()
export class TrainingService {
  constructor(
    @InjectRepository(TrainingCourseEntity)
    private courseRepo: Repository<TrainingCourseEntity>,
    @InjectRepository(TrainingRecordEntity)
    private recordRepo: Repository<TrainingRecordEntity>,
    private notifications: NotificationsService,
  ) {}

  // ── Courses ────────────────────────────────────────────────────────────────

  async listCourses(tenantId: string): Promise<TrainingCourseEntity[]> {
    return this.courseRepo.find({ where: { tenantId, isActive: true }, order: { name: 'ASC' } });
  }

  async createCourse(tenantId: string, dto: CreateCourseDto): Promise<TrainingCourseEntity> {
    if (!dto.name?.trim()) throw new BadRequestException('Course name is required');
    return this.courseRepo.save(
      this.courseRepo.create({
        tenantId,
        name: dto.name.trim(),
        description: dto.description,
        validityMonths: dto.validityMonths,
        mandatory: dto.mandatory ?? false,
      }),
    );
  }

  async updateCourse(tenantId: string, id: string, dto: Partial<CreateCourseDto> & { isActive?: boolean }) {
    const course = await this.courseRepo.findOne({ where: { id, tenantId } });
    if (!course) throw new NotFoundException('Course not found');
    Object.assign(course, dto);
    return this.courseRepo.save(course);
  }

  // ── Records ────────────────────────────────────────────────────────────────

  /** Assign a course to one or more workers; skips anyone already assigned. */
  async assign(tenantId: string, courseId: string, userIds: string[]): Promise<TrainingRecordEntity[]> {
    const course = await this.courseRepo.findOne({ where: { id: courseId, tenantId, isActive: true } });
    if (!course) throw new NotFoundException('Course not found');
    if (!userIds?.length) throw new BadRequestException('Provide at least one user');

    const existing = await this.recordRepo.find({
      where: { tenantId, courseId, userId: In(userIds), status: 'assigned' },
    });
    const alreadyAssigned = new Set(existing.map((r) => r.userId));
    const fresh = [...new Set(userIds)].filter((u) => !alreadyAssigned.has(u));

    const created = await this.recordRepo.save(
      fresh.map((userId) => this.recordRepo.create({ tenantId, courseId, userId, status: 'assigned' })),
    );

    await this.notifications.notify(
      tenantId,
      fresh,
      'training_assigned',
      'Training assigned',
      `You have been assigned: ${course.name}`,
      { courseId },
    );
    return created;
  }

  async complete(
    tenantId: string,
    actor: { id: string; isManager: boolean },
    recordId: string,
    certificateKey?: string,
  ): Promise<TrainingRecordEntity> {
    const record = await this.recordRepo.findOne({ where: { id: recordId, tenantId } });
    if (!record) throw new NotFoundException('Training record not found');
    if (!actor.isManager && record.userId !== actor.id) {
      throw new ForbiddenException('You can only complete your own training');
    }
    if (record.status === 'completed') {
      throw new BadRequestException('Already completed');
    }

    const course = await this.courseRepo.findOne({ where: { id: record.courseId, tenantId } });
    record.status = 'completed';
    record.completedAt = new Date();
    record.certificateKey = certificateKey;
    if (course?.validityMonths) {
      const exp = new Date();
      exp.setMonth(exp.getMonth() + course.validityMonths);
      record.expiresAt = exp;
    }
    return this.recordRepo.save(record);
  }

  async listMine(tenantId: string, userId: string) {
    return this.withCourses(tenantId, await this.recordRepo.find({
      where: { tenantId, userId },
      order: { createdAt: 'DESC' },
    }));
  }

  async listByUser(tenantId: string, userId: string) {
    return this.listMine(tenantId, userId);
  }

  /** Records expiring in the next N days — the manager's chase list. */
  async expiring(tenantId: string, days = 60) {
    const now = new Date();
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + days);
    return this.withCourses(tenantId, await this.recordRepo.find({
      where: { tenantId, status: 'completed', expiresAt: Between(now, horizon) },
      order: { expiresAt: 'ASC' },
    }));
  }

  private async withCourses(tenantId: string, records: TrainingRecordEntity[]) {
    if (records.length === 0) return [];
    const courses = await this.courseRepo.find({
      where: { tenantId, id: In([...new Set(records.map((r) => r.courseId))]) },
    });
    const byId = new Map(courses.map((c) => [c.id, c]));
    return records.map((r) => ({ ...r, course: byId.get(r.courseId) }));
  }
}
