import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AuditLogEntity } from './entities/audit-log.entity';
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLogEntity])],
  controllers: [AuditController],
  providers: [
    AuditService,
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
  ],
  exports: [AuditService],
})
export class AuditModule {}
