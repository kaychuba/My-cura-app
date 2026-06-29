import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Request } from 'express';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request & { user?: { id: string; tenantId: string } }>();

    if (!MUTATING_METHODS.has(request.method) || !request.user) {
      return next.handle();
    }

    const { user, method, url, ip, headers } = request;

    return next.handle().pipe(
      tap(async () => {
        try {
          await this.dataSource.query(
            `INSERT INTO audit_logs
              (id, tenant_id, user_id, action, resource_type, resource_id, ip_address, user_agent, created_at)
             VALUES
              (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW())`,
            [
              user.tenantId,
              user.id,
              method,
              url.split('/')[3] ?? 'unknown',
              null,
              ip,
              headers['user-agent'] ?? '',
            ],
          );
        } catch {
          // Audit log failure must never break the main request
        }
      }),
    );
  }
}
