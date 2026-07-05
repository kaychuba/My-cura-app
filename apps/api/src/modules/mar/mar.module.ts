import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MARController } from './mar.controller';
import { MARService } from './mar.service';
import { MedicationEntity } from './entities/medication.entity';
import { MARRecordEntity } from './entities/mar-record.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([MedicationEntity, MARRecordEntity]), NotificationsModule],
  controllers: [MARController],
  providers: [MARService],
  exports: [MARService],
})
export class MARModule {}
