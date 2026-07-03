import {
  Controller, Get, Post, Patch, Param, Body, Query,
  UseGuards, ParseUUIDPipe, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { LeaveService, CreateLeaveRequestDto, LeaveFilter } from './leave.service';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthUser, LeaveStatus, UserRole } from '@my-cura/shared-types';

@ApiTags('leave')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('leave')
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Post()
  @ApiOperation({ summary: 'Request leave (annual, sick, maternity, …)' })
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateLeaveRequestDto,
  ) {
    return this.leaveService.create(tenantId, user.id, dto);
  }

  @Get('mine')
  @ApiOperation({ summary: 'My leave requests' })
  mine(@CurrentTenant() tenantId: string, @CurrentUser() user: AuthUser) {
    return this.leaveService.mine(tenantId, user.id);
  }

  @Get('balance')
  @ApiOperation({ summary: 'My annual-leave balance for the current year' })
  balance(@CurrentTenant() tenantId: string, @CurrentUser() user: AuthUser) {
    return this.leaveService.balance(tenantId, user.id);
  }

  @Get()
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'List leave requests (managers and above)' })
  list(
    @CurrentTenant() tenantId: string,
    @Query() filter: LeaveFilter,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.leaveService.list(tenantId, filter, page, limit);
  }

  @Patch(':id/approve')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Approve a pending leave request' })
  approve(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reviewNotes') reviewNotes?: string,
  ) {
    return this.leaveService.review(tenantId, id, user.id, LeaveStatus.APPROVED, reviewNotes);
  }

  @Patch(':id/decline')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Decline a pending leave request' })
  decline(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reviewNotes') reviewNotes?: string,
  ) {
    return this.leaveService.review(tenantId, id, user.id, LeaveStatus.DECLINED, reviewNotes);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel my own leave request' })
  cancel(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.leaveService.cancel(tenantId, id, user.id);
  }
}
