import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { TenantEntity } from './entities/tenant.entity';

@Module({
  // Privileged connection: SUPER_ADMIN lists all tenants (cross-tenant by
  // definition) and signup creates tenants before a context exists. Reads
  // and updates remain filtered by the JWT's tenant id in the service.
  imports: [TypeOrmModule.forFeature([TenantEntity], 'auth')],
  controllers: [TenantsController],
  providers: [TenantsService],
  exports: [TenantsService],
})
export class TenantsModule {}
