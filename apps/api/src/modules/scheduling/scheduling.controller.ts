import {
  Controller, Get, Post, Patch, Param, Body, Query,
  UseGuards, ParseUUIDPipe, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  SchedulingService, CreateShiftDto, UpdateShiftDto, ShiftFilter,
} from './scheduling.service';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthUser, UserRole } from '@my-cura/shared-types';

@ApiTags('scheduling')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('shifts')
export class SchedulingController {
  constructor(private readonly schedulingService: SchedulingService) {}

  @Get('mine')
  @ApiOperation({ summary: "The logged-in care worker's shifts (defaults to today)" })
  myShifts(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.schedulingService.myShifts(tenantId, user.id, from, to);
  }

  @Get()
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'List shifts with filters (managers and above)' })
  list(
    @CurrentTenant() tenantId: string,
    @Query() filter: ShiftFilter,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.schedulingService.list(tenantId, filter, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a shift by id' })
  getById(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.schedulingService.getById(tenantId, id);
  }

  @Post()
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a shift (optionally assigned to a care worker)' })
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateShiftDto,
  ) {
    return this.schedulingService.create(tenantId, user.id, dto);
  }

  @Patch(':id')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Update / reassign a shift' })
  update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateShiftDto,
  ) {
    return this.schedulingService.update(tenantId, id, dto);
  }

  @Patch(':id/cancel')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Cancel a shift' })
  cancel(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.schedulingService.cancel(tenantId, id);
  }
}
