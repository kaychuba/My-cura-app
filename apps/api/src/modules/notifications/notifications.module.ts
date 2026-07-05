import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationEntity } from './entities/notification.entity';
import { UserEntity } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationEntity, UserEntity])],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
