import {
  Controller, Get, Post, Patch, Param, Body, Query,
  UseGuards, ParseUUIDPipe, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { WhistleblowingService, CreateWhistleblowingDto } from './whistleblowing.service';
import { WhistleblowingStatus } from './entities/whistleblowing-report.entity';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthUser, UserRole } from '@my-cura/shared-types';

@ApiTags('whistleblowing')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('whistleblowing')
export class WhistleblowingController {
  constructor(private readonly whistleblowingService: WhistleblowingService) {}

  @Post()
  @ApiOperation({ summary: 'Submit a confidential whistleblowing report (optionally anonymous)' })
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateWhistleblowingDto,
  ) {
    return this.whistleblowingService.create(tenantId, user.id, dto);
  }

  @Get()
  @Roles(UserRole.AGENCY_OWNER)
  @ApiOperation({ summary: 'List whistleblowing reports (agency owners only)' })
  list(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: WhistleblowingStatus,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.whistleblowingService.list(tenantId, status, page, limit);
  }

  @Patch(':id/status')
  @Roles(UserRole.AGENCY_OWNER)
  @ApiOperation({ summary: 'Progress a report through review (agency owners only)' })
  updateStatus(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: WhistleblowingStatus,
    @Body('reviewNotes') reviewNotes?: string,
  ) {
    return this.whistleblowingService.updateStatus(tenantId, id, user.id, status, reviewNotes);
  }
}
