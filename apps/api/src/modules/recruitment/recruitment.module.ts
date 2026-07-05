import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecruitmentController } from './recruitment.controller';
import { RecruitmentService } from './recruitment.service';
import { ApplicantEntity } from './entities/applicant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ApplicantEntity])],
  controllers: [RecruitmentController],
  providers: [RecruitmentService],
  exports: [RecruitmentService],
})
export class RecruitmentModule {}
