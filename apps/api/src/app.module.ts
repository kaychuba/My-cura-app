import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';

import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import { validationSchema } from './config/validation.schema';

import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsersModule } from './modules/users/users.module';
import { CareWorkersModule } from './modules/care-workers/care-workers.module';
import { ServiceUsersModule } from './modules/service-users/service-users.module';
import { CarePlansModule } from './modules/care-plans/care-plans.module';
import { SchedulingModule } from './modules/scheduling/scheduling.module';
import { ClockInModule } from './modules/clock-in/clock-in.module';
import { VisitNotesModule } from './modules/visit-notes/visit-notes.module';
import { MARModule } from './modules/mar/mar.module';
import { PayrollModule } from './modules/payroll/payroll.module';
import { LeaveModule } from './modules/leave/leave.module';
import { HRModule } from './modules/hr/hr.module';
import { RecruitmentModule } from './modules/recruitment/recruitment.module';
import { TrainingModule } from './modules/training/training.module';
import { IncidentsModule } from './modules/incidents/incidents.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { FinanceModule } from './modules/finance/finance.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { StorageModule } from './modules/storage/storage.module';
import { AIModule } from './modules/ai/ai.module';
import { AuditModule } from './modules/audit/audit.module';
import { WhistleblowingModule } from './modules/whistleblowing/whistleblowing.module';
import { BodyMapsModule } from './modules/body-maps/body-maps.module';
import { PoliciesModule } from './modules/policies/policies.module';
import { ImportsModule } from './modules/imports/imports.module';
import { EnquiriesModule } from './modules/enquiries/enquiries.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { getDatabaseConfig, getAuthDatabaseConfig } from './config/database.config';
import { DataSource } from 'typeorm';
import { addTransactionalDataSource } from 'typeorm-transactional';
import { TenantContextModule } from './common/tenant-context.module';
import { SecurityModule } from './common/security/security.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig],
      validationSchema,
    }),

    TypeOrmModule.forRootAsync({
      useFactory: getDatabaseConfig,
      // Register with typeorm-transactional so repositories resolve the
      // request's transaction (where set_tenant_id has been applied).
      dataSourceFactory: async (options) =>
        addTransactionalDataSource(new DataSource(options!)),
    }),
    // Privileged connection for the pre-tenant surface (login/token lookups).
    TypeOrmModule.forRootAsync({
      name: 'auth',
      useFactory: getAuthDatabaseConfig,
    }),
    // First so its interceptor wraps all others (audit runs inside it)
    TenantContextModule,

    // Encryption keyring + security-event monitoring (global providers)
    SecurityModule,

    // Global request budget per IP. Auth endpoints override this with much
    // stricter per-route limits via @Throttle (see auth.controller.ts).
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 120,
      },
    ]),

    ScheduleModule.forRoot(),

    // Feature modules
    AuthModule,
    TenantsModule,
    UsersModule,
    CareWorkersModule,
    ServiceUsersModule,
    CarePlansModule,
    SchedulingModule,
    ClockInModule,
    VisitNotesModule,
    MARModule,
    PayrollModule,
    LeaveModule,
    HRModule,
    RecruitmentModule,
    TrainingModule,
    IncidentsModule,
    MessagingModule,
    ExpensesModule,
    FinanceModule,
    ReportsModule,
    AnalyticsModule,
    NotificationsModule,
    StorageModule,
    AIModule,
    AuditModule,
    WhistleblowingModule,
    BodyMapsModule,
    PoliciesModule,
    ImportsModule,
    EnquiriesModule,
  ],
  providers: [
    // Enforce the rate limits on every route (without this the @Throttle
    // decorators are inert).
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
