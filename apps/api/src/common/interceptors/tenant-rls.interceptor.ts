import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { runInTransaction } from 'typeorm-transactional';
import { Observable, from } from 'rxjs';
import { lastValueFrom } from 'rxjs';

/**
 * The eggshell. Every authenticated request runs inside one database
 * transaction whose first statement is set_tenant_id(<jwt tenant>).
 * The API connects as the RLS-constrained mycura_app role, so Postgres
 * itself filters every row by tenant — even a missing WHERE clause in
 * application code cannot read or write another company's data.
 *
 * Unauthenticated routes (login, register) carry no tenant and skip the
 * wrapper; the auth module uses its own privileged connection instead.
 */
@Injectable()
export class TenantRlsInterceptor implements NestInterceptor {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const request = context
      .switchToHttp()
      .getRequest<{ user?: { tenantId?: string } }>();
    const tenantId = request.user?.tenantId;
    if (!tenantId) return next.handle();

    return from(
      runInTransaction(async () => {
        // Transaction-scoped GUC: resets automatically on commit/rollback,
        // so pooled connections can never leak a tenant context.
        await this.dataSource.manager.query('SELECT set_tenant_id($1)', [tenantId]);
        return lastValueFrom(next.handle(), { defaultValue: undefined });
      }),
    );
  }
}
