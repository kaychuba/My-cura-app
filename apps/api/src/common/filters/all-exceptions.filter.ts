import { ArgumentsHost, Catch, HttpException, HttpStatus, HttpServer } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Request } from 'express';
import { SecurityMonitorService } from '../security/security-monitor.service';

/**
 * Default Nest error handling, plus security telemetry: 5xx responses and
 * 403s (privilege probing) feed the SecurityMonitorService so spikes fire
 * alerts instead of sitting silently in the logs.
 */
@Catch()
export class AllExceptionsFilter extends BaseExceptionFilter {
  // applicationRef is what BaseExceptionFilter uses to write the response —
  // without it every handled exception becomes a process crash.
  constructor(
    private readonly monitor: SecurityMonitorService,
    applicationRef: HttpServer,
  ) {
    super(applicationRef);
  }

  override catch(exception: unknown, host: ArgumentsHost): void {
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    if (status >= 500) {
      this.monitor.record('server_error');
    } else if (status === HttpStatus.FORBIDDEN && host.getType() === 'http') {
      const req = host.switchToHttp().getRequest<Request & { user?: { id?: string } }>();
      this.monitor.record('forbidden', req.user?.id ?? req.ip);
    }

    super.catch(exception, host);
  }
}
