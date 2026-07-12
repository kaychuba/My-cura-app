import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImportsController } from './imports.controller';
import { ImportsService } from './imports.service';
import { ImportJobEntity } from './entities/import-job.entity';
import { ServiceUserEntity } from '../service-users/entities/service-user.entity';
import { MedicationEntity } from '../mar/entities/medication.entity';
import { UserEntity } from '../users/entities/user.entity';
import { CareWorkerEntity } from '../care-workers/entities/care-worker.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ImportJobEntity, ServiceUserEntity, MedicationEntity, UserEntity, CareWorkerEntity,
    ]),
  ],
  controllers: [ImportsController],
  providers: [ImportsService],
  exports: [ImportsService],
})
export class ImportsModule {}
