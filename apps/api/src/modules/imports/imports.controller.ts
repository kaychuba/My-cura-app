import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { ImportsService, ImportRowsDto } from './imports.service';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthUser, UserRole } from '@my-cura/shared-types';

@ApiTags('imports')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.MANAGER)
@Controller('imports')
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @Get('templates')
  @ApiOperation({ summary: 'Field catalogue + starter templates for the wizard' })
  templates() {
    return this.importsService.templates();
  }

  @Get('jobs')
  @ApiOperation({ summary: 'Recent import runs for this agency' })
  jobs(@CurrentTenant() tenantId: string) {
    return this.importsService.listJobs(tenantId);
  }

  @Post('preview')
  @ApiOperation({ summary: 'Validate mapped rows — reports errors, writes nothing' })
  preview(@CurrentTenant() tenantId: string, @Body() dto: ImportRowsDto) {
    return this.importsService.preview(tenantId, dto);
  }

  @Post('commit')
  @ApiOperation({ summary: 'Import mapped rows (idempotent: re-runs update, never duplicate)' })
  commit(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: ImportRowsDto,
  ) {
    return this.importsService.commit(tenantId, user.id, dto);
  }
}
