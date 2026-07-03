import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClockInController } from './clock-in.controller';
import { ClockInService } from './clock-in.service';
import { ClockEventEntity } from './entities/clock-event.entity';
import { ShiftEntity } from '../scheduling/entities/shift.entity';
import { ServiceUserEntity } from '../service-users/entities/service-user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ClockEventEntity, ShiftEntity, ServiceUserEntity])],
  controllers: [ClockInController],
  providers: [ClockInService],
  exports: [ClockInService],
})
export class ClockInModule {}
