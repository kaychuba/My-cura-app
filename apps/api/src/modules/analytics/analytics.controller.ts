import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '@my-cura/shared-types';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Agency-wide KPIs: people, shifts, medication, attention items' })
  overview(@CurrentTenant() tenantId: string) {
    return this.analyticsService.overview(tenantId);
  }
}
