import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CarePlansController } from './care-plans.controller';
import { CarePlansService } from './care-plans.service';
import { CarePlanEntity } from './entities/care-plan.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CarePlanEntity])],
  controllers: [CarePlansController],
  providers: [CarePlansService],
  exports: [CarePlansService],
})
export class CarePlansModule {}
