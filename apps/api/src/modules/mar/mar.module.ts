import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MARController } from './mar.controller';
import { MARService } from './mar.service';
import { MedicationEntity } from './entities/medication.entity';
import { MARRecordEntity } from './entities/mar-record.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MedicationEntity, MARRecordEntity])],
  controllers: [MARController],
  providers: [MARService],
  exports: [MARService],
})
export class MARModule {}
