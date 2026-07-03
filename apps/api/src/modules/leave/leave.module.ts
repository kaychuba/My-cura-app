import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeaveController } from './leave.controller';
import { LeaveService } from './leave.service';
import { LeaveRequestEntity } from './entities/leave-request.entity';
import { TenantEntity } from '../tenants/entities/tenant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LeaveRequestEntity, TenantEntity])],
  controllers: [LeaveController],
  providers: [LeaveService],
  exports: [LeaveService],
})
export class LeaveModule {}
