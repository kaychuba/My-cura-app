import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { UserRole, UserStatus } from '@my-cura/shared-types';
import { NotificationEntity } from './entities/notification.entity';
import { UserEntity } from '../users/entities/user.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(NotificationEntity)
    private notificationRepo: Repository<NotificationEntity>,
    @InjectRepository(UserEntity)
    private userRepo: Repository<UserEntity>,
  ) {}

  /** Create a notification for each recipient. Other modules call this. */
  async notify(
    tenantId: string,
    userIds: string[],
    type: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    if (userIds.length === 0) return;
    await this.notificationRepo.save(
      [...new Set(userIds)].map((userId) =>
        this.notificationRepo.create({ tenantId, userId, type, title, body, data }),
      ),
    );
  }

  /** Notify every active manager and owner in the tenant. */
  async notifyManagers(
    tenantId: string,
    type: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    const managers = await this.userRepo.find({
      where: {
        tenantId,
        role: In([UserRole.MANAGER, UserRole.AGENCY_OWNER]),
        status: UserStatus.ACTIVE,
      },
      select: ['id'],
    });
    await this.notify(tenantId, managers.map((m) => m.id), type, title, body, data);
  }

  async listMine(tenantId: string, userId: string, page = 1, limit = 30, unreadOnly = false) {
    const where: Record<string, unknown> = { tenantId, userId };
    if (unreadOnly) where['readAt'] = IsNull();
    const [data, total] = await this.notificationRepo.findAndCount({
      where: where as never,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async unreadCount(tenantId: string, userId: string): Promise<{ count: number }> {
    const count = await this.notificationRepo.count({
      where: { tenantId, userId, readAt: IsNull() },
    });
    return { count };
  }

  async markRead(tenantId: string, userId: string, id: string): Promise<NotificationEntity> {
    const n = await this.notificationRepo.findOne({ where: { id, tenantId, userId } });
    if (!n) throw new NotFoundException('Notification not found');
    if (!n.readAt) {
      n.readAt = new Date();
      await this.notificationRepo.save(n);
    }
    return n;
  }

  async markAllRead(tenantId: string, userId: string): Promise<{ updated: number }> {
    const result = await this.notificationRepo.update(
      { tenantId, userId, readAt: IsNull() },
      { readAt: new Date() },
    );
    return { updated: result.affected ?? 0 };
  }
}
