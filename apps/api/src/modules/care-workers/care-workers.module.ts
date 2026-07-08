import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CareWorkersController } from './care-workers.controller';
import { CareWorkersService } from './care-workers.service';

import { CareWorkerEntity } from './entities/care-worker.entity';
import { UserEntity } from '../users/entities/user.entity';
import { LeaveModule } from '../leave/leave.module';

@Module({
  imports: [TypeOrmModule.forFeature([CareWorkerEntity, UserEntity]), LeaveModule],
  controllers: [CareWorkersController],
  providers: [CareWorkersService],
  exports: [CareWorkersService],
})
export class CareWorkersModule {}
