import {
  Controller, Get, Patch, Body, Query,
  UseGuards, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { TenantsService, UpdateTenantDto } from './tenants.service';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '@my-cura/shared-types';

@ApiTags('tenants')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('current')
  @ApiOperation({ summary: "The logged-in user's agency profile and settings" })
  getCurrent(@CurrentTenant() tenantId: string) {
    return this.tenantsService.getCurrent(tenantId);
  }

  @Patch('current')
  @Roles(UserRole.AGENCY_OWNER)
  @ApiOperation({ summary: 'Update agency name/settings (owner only)' })
  updateCurrent(
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdateTenantDto,
  ) {
    return this.tenantsService.updateCurrent(tenantId, dto);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all tenants (platform admin only)' })
  listAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.tenantsService.listAll(page, limit);
  }
}
