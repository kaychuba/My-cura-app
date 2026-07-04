import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhistleblowingController } from './whistleblowing.controller';
import { WhistleblowingService } from './whistleblowing.service';
import { WhistleblowingReportEntity } from './entities/whistleblowing-report.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WhistleblowingReportEntity])],
  controllers: [WhistleblowingController],
  providers: [WhistleblowingService],
  exports: [WhistleblowingService],
})
export class WhistleblowingModule {}
