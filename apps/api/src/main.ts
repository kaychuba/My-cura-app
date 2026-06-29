import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:3001'],
    credentials: true,
  });

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
