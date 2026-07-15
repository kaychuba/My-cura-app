import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { initializeTransactionalContext, StorageDriver } from 'typeorm-transactional';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { SecurityMonitorService } from './common/security/security-monitor.service';

async function bootstrap() {
  // Must run before any DataSource exists: gives every request its own
  // async-local transaction context for row-level-security enforcement.
  initializeTransactionalContext({ storageDriver: StorageDriver.ASYNC_LOCAL_STORAGE });

  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });

  // Correct client IPs for rate limiting when behind a load balancer/proxy.
  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          // 'unsafe-inline' is required by Swagger UI only; the API itself
          // serves JSON, where CSP scripts never execute.
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
        },
      },
      strictTransportSecurity: {
        maxAge: 15552000, // 180 days
        includeSubDomains: true,
      },
      frameguard: { action: 'deny' },
      referrerPolicy: { policy: 'no-referrer' },
      // noSniff (X-Content-Type-Options) and the rest of helmet's defaults stay on.
    }),
  );
  app.use((_req: unknown, res: { setHeader: (k: string, v: string) => void }, next: () => void) => {
    res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=(), payment=()');
    next();
  });
  app.use(cookieParser());

  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:3001'],
    credentials: true,
  });

  // Default error handling + security telemetry (5xx / 403 spike alerts).
  app.useGlobalFilters(
    new AllExceptionsFilter(app.get(SecurityMonitorService), app.getHttpAdapter()),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.setGlobalPrefix('api/v1');

  const config = new DocumentBuilder()
    .setTitle('My-Cura API')
    .setDescription('Care Management Platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('tenants', 'Agency / organisation management')
    .addTag('users', 'User management')
    .addTag('care-workers', 'Care worker profiles')
    .addTag('service-users', 'Service user (client) management')
    .addTag('scheduling', 'Shift scheduling and rostering')
    .addTag('clock-in', 'GPS clock-in/out')
    .addTag('visit-notes', 'Visit notes and observations')
    .addTag('mar', 'Medication Administration Records')
    .addTag('payroll', 'Payroll management')
    .addTag('leave', 'Leave management')
    .addTag('expenses', 'Expense management')
    .addTag('incidents', 'Incident reporting')
    .addTag('messaging', 'Real-time messaging')
    .addTag('finance', 'Finance and invoicing')
    .addTag('reports', 'Report generation')
    .addTag('analytics', 'Analytics and dashboards')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`My-Cura API running on http://localhost:${port}/api/v1`);
  console.log(`Swagger docs: http://localhost:${port}/api/docs`);
}

void bootstrap();
