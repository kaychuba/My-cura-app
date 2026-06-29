import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CareWorkersController } from './care-workers.controller';
import { CareWorkersService } from './care-workers.service';

@Module({
  controllers: [CareWorkersController],
  providers: [CareWorkersService],
  exports: [CareWorkersService],
})
export class CareWorkersModule {}
