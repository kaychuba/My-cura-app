import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchedulingController } from './scheduling.controller';
import { SchedulingService } from './scheduling.service';

import { ShiftEntity } from './entities/shift.entity';
import { ServiceUserEntity } from '../service-users/entities/service-user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ShiftEntity, ServiceUserEntity])],
  controllers: [SchedulingController],
  providers: [SchedulingService],
  exports: [SchedulingService],
})
export class SchedulingModule {}
