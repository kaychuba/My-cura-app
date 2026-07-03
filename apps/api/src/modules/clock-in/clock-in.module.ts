import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClockInController } from './clock-in.controller';
import { ClockInService } from './clock-in.service';

@Module({
  controllers: [ClockInController],
  providers: [ClockInService],
  exports: [ClockInService],
})
export class ClockInModule {}
