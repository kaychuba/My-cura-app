import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClockInController } from './clock-in.controller';
import { UclockUinService } from './clock-in.service';

@Module({
  controllers: [ClockInController],
  providers: [UclockUinService],
  exports: [UclockUinService],
})
export class ClockInModule {}
