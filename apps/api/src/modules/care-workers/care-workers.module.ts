import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CareWorkersController } from './care-workers.controller';
import { CareWorkersService } from './care-workers.service';

import { CareWorkerEntity } from './entities/care-worker.entity';
import { UserEntity } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CareWorkerEntity, UserEntity])],
  controllers: [CareWorkersController],
  providers: [CareWorkersService],
  exports: [CareWorkersService],
})
export class CareWorkersModule {}
