import {
  Controller, Get, Query, Req, Res, UseGuards,
  DefaultValuePipe, ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '@my-cura/shared-types';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const CSV_MIME = 'text/csv';

function sendFile(
  res: Response,
  data: Buffer | string,
  filename: string,
  format: 'xlsx' | 'csv',
) {
  const mime = format === 'xlsx' ? XLSX_MIME : CSV_MIME;
  const ext = format === 'xlsx' ? 'xlsx' : 'csv';
  res.set({
    'Content-Type': mime,
    'Content-Disposition': `attachment; filename="${filename}.${ext}"`,
    'Cache-Control': 'no-store',
  });
  res.send(data);
}

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('payroll')
  @Roles(UserRole.AGENCY_OWNER, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Download payroll report (XLSX or CSV)' })
  @ApiQuery({ name: 'from', required: true })
  @ApiQuery({ name: 'to', required: true })
  @ApiQuery({ name: 'format', required: false, enum: ['xlsx', 'csv'] })
  async downloadPayroll(
    @Req() req: any,
    @Res() res: Response,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('format') format: 'xlsx' | 'csv' = 'xlsx',
  ) {
    const data = await this.reportsService.payrollReport(req.user.tenantId, from, to, format);
    sendFile(res, data, `payroll-report-${from}-${to}`, format);
  }

  @Get('timesheet')
  @Roles(UserRole.AGENCY_OWNER, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Download timesheet / attendance report' })
  @ApiQuery({ name: 'from', required: true })
  @ApiQuery({ name: 'to', required: true })
  @ApiQuery({ name: 'workerId', required: false })
  @ApiQuery({ name: 'format', required: false, enum: ['xlsx', 'csv'] })
  async downloadTimesheet(
    @Req() req: any,
    @Res() res: Response,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('workerId') workerId?: string,
    @Query('format') format: 'xlsx' | 'csv' = 'xlsx',
  ) {
    const data = await this.reportsService.timesheetReport(
      req.user.tenantId, from, to, workerId, format,
    );
    sendFile(res, data, `timesheet-${from}-${to}`, format);
  }

  @Get('mar-compliance')
  @Roles(UserRole.AGENCY_OWNER, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Download MAR compliance report' })
  @ApiQuery({ name: 'from', required: true })
  @ApiQuery({ name: 'to', required: true })
  @ApiQuery({ name: 'serviceUserId', required: false })
  @ApiQuery({ name: 'format', required: false, enum: ['xlsx', 'csv'] })
  async downloadMAR(
    @Req() req: any,
    @Res() res: Response,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('serviceUserId') serviceUserId?: string,
    @Query('format') format: 'xlsx' | 'csv' = 'xlsx',
  ) {
    const data = await this.reportsService.marComplianceReport(
      req.user.tenantId, from, to, serviceUserId, format,
    );
    sendFile(res, data, `mar-compliance-${from}-${to}`, format);
  }

  @Get('incidents')
  @Roles(UserRole.AGENCY_OWNER, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Download incident report' })
  @ApiQuery({ name: 'from', required: true })
  @ApiQuery({ name: 'to', required: true })
  @ApiQuery({ name: 'severity', required: false })
  @ApiQuery({ name: 'format', required: false, enum: ['xlsx', 'csv'] })
  async downloadIncidents(
    @Req() req: any,
    @Res() res: Response,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('severity') severity?: string,
    @Query('format') format: 'xlsx' | 'csv' = 'xlsx',
  ) {
    const data = await this.reportsService.incidentReport(
      req.user.tenantId, from, to, severity, format,
    );
    sendFile(res, data, `incidents-${from}-${to}`, format);
  }

  @Get('care-hours')
  @Roles(UserRole.AGENCY_OWNER, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Download care hours report' })
  @ApiQuery({ name: 'from', required: true })
  @ApiQuery({ name: 'to', required: true })
  @ApiQuery({ name: 'format', required: false, enum: ['xlsx', 'csv'] })
  async downloadCareHours(
    @Req() req: any,
    @Res() res: Response,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('format') format: 'xlsx' | 'csv' = 'xlsx',
  ) {
    const data = await this.reportsService.careHoursReport(req.user.tenantId, from, to, format);
    sendFile(res, data, `care-hours-${from}-${to}`, format);
  }

  @Get('document-expiry')
  @Roles(UserRole.AGENCY_OWNER, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Download document expiry report' })
  @ApiQuery({ name: 'daysAhead', required: false, type: Number })
  @ApiQuery({ name: 'format', required: false, enum: ['xlsx', 'csv'] })
  async downloadDocExpiry(
    @Req() req: any,
    @Res() res: Response,
    @Query('daysAhead', new DefaultValuePipe(30), ParseIntPipe) daysAhead: number,
    @Query('format') format: 'xlsx' | 'csv' = 'xlsx',
  ) {
    const data = await this.reportsService.documentExpiryReport(
      req.user.tenantId, daysAhead, format,
    );
    sendFile(res, data, `document-expiry-${new Date().toISOString().split('T')[0]}`, format);
  }

  @Get('training-compliance')
  @Roles(UserRole.AGENCY_OWNER, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Download training compliance report' })
  @ApiQuery({ name: 'format', required: false, enum: ['xlsx', 'csv'] })
  async downloadTraining(
    @Req() req: any,
    @Res() res: Response,
    @Query('format') format: 'xlsx' | 'csv' = 'xlsx',
  ) {
    const data = await this.reportsService.trainingComplianceReport(req.user.tenantId, format);
    sendFile(res, data, `training-compliance-${new Date().toISOString().split('T')[0]}`, format);
  }
}
