import {
  Controller, Get, Post, Patch, Param, Body, UseGuards, ParseUUIDPipe, Query,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { PayrollService, RunPayrollDto } from './payroll.service';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthUser, UserRole } from '@my-cura/shared-types';

@ApiTags('payroll')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('payroll')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Get('periods')
  @Roles(UserRole.SUPER_ADMIN, UserRole.AGENCY_OWNER)
  @ApiOperation({ summary: 'List all payroll periods for this agency' })
  listPeriods(@CurrentTenant() tenantId: string) {
    return this.payrollService.listPeriods(tenantId);
  }

  @Get('periods/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.AGENCY_OWNER)
  @ApiOperation({ summary: 'Get a payroll period with all records' })
  getPeriod(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payrollService.getPeriod(tenantId, id);
  }

  @Post('run')
  @Roles(UserRole.SUPER_ADMIN, UserRole.AGENCY_OWNER)
  @ApiOperation({ summary: 'Start a new payroll run for the given period' })
  runPayroll(
    @CurrentTenant() tenantId: string,
    @Body() dto: RunPayrollDto,
  ) {
    return this.payrollService.runPayroll(tenantId, dto);
  }

  @Patch('periods/:id/approve')
  @Roles(UserRole.SUPER_ADMIN, UserRole.AGENCY_OWNER)
  @ApiOperation({ summary: 'Approve a completed payroll period' })
  approvePayroll(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payrollService.approvePayroll(tenantId, id);
  }

  @Patch('periods/:id/lock')
  @Roles(UserRole.SUPER_ADMIN, UserRole.AGENCY_OWNER)
  @ApiOperation({ summary: 'Lock a payroll period (prevents further changes)' })
  lockPayroll(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payrollService.lockPayroll(tenantId, id);
  }

  @Get('workers/:careWorkerId/payslips')
  @Roles(UserRole.SUPER_ADMIN, UserRole.AGENCY_OWNER, UserRole.CARE_WORKER)
  @ApiOperation({ summary: 'Get payslips for a specific care worker' })
  getWorkerPayslips(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('careWorkerId', ParseUUIDPipe) careWorkerId: string,
  ) {
    // Care workers may only see their own payslips
    if (user.role === UserRole.CARE_WORKER && careWorkerId !== user.id) {
      throw new ForbiddenException('You can only view your own payslips');
    }
    return this.payrollService.getWorkerPayslips(tenantId, careWorkerId);
  }
}
