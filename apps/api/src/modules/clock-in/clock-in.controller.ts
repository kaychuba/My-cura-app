import {
  Controller, Get, Post, Param, Body, UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { ClockInService } from './clock-in.service';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthUser, ClockEventType, ClockInRequest, UserRole } from '@my-cura/shared-types';

@ApiTags('clock-in')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('clock-in')
export class ClockInController {
  constructor(private readonly clockInService: ClockInService) {}

  @Post()
  @ApiOperation({ summary: 'Record a GPS clock-in/out event for my shift' })
  record(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: ClockInRequest,
  ) {
    return this.clockInService.recordClockEvent(tenantId, user.id, dto);
  }

  @Post('manager/:shiftId')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Manager clocks the worker in/out; stamps the scheduled time by default' })
  managerClock(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('shiftId', ParseUUIDPipe) shiftId: string,
    @Body() dto: { eventType: 'clock_in' | 'clock_out'; atScheduledTime?: boolean },
  ) {
    return this.clockInService.managerClockEvent(
      tenantId,
      user.id,
      shiftId,
      dto.eventType === 'clock_out' ? ClockEventType.CLOCK_OUT : ClockEventType.CLOCK_IN,
      dto.atScheduledTime ?? true,
    );
  }

  @Get('shift/:shiftId')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Clock events for a shift (managers and above)' })
  getShiftEvents(
    @CurrentTenant() tenantId: string,
    @Param('shiftId', ParseUUIDPipe) shiftId: string,
  ) {
    return this.clockInService.getShiftClockEvents(shiftId, tenantId);
  }
}
