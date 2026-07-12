import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TenantRlsInterceptor } from './interceptors/tenant-rls.interceptor';

/**
 * Imported FIRST among feature modules so the RLS transaction wraps every
 * other interceptor (including audit logging, whose insert must run inside
 * the tenant-scoped transaction).
 */
@Module({
  providers: [{ provide: APP_INTERCEPTOR, useClass: TenantRlsInterceptor }],
})
export class TenantContextModule {}
