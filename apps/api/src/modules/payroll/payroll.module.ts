import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';
import { PayrollPeriodEntity } from './entities/payroll-period.entity';
import { PayrollRecordEntity } from './entities/payroll-record.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PayrollPeriodEntity, PayrollRecordEntity])],
  controllers: [PayrollController],
  providers: [PayrollService],
  exports: [PayrollService],
})
export class PayrollModule {}
