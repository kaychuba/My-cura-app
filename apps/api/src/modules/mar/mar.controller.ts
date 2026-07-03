import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { MARService, CreateMedicationDto, RecordMARDto } from './mar.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { AuthUser } from '@my-cura/shared-types';

@ApiTags('mar')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('mar')
export class MARController {
  constructor(private readonly marService: MARService) {}

  // ── Medications ─────────────────────────────────────────────────────────────

  @Get('medications')
  @ApiOperation({ summary: 'List all active medications for a service user' })
  listMedications(
    @CurrentTenant() tenantId: string,
    @Query('serviceUserId', ParseUUIDPipe) serviceUserId: string,
  ) {
    return this.marService.listMedications(tenantId, serviceUserId);
  }

  @Get('medications/:id')
  getMedication(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.marService.getMedication(tenantId, id);
  }

  @Post('medications')
  @ApiOperation({ summary: 'Prescribe a new medication for a service user' })
  createMedication(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateMedicationDto,
  ) {
    return this.marService.createMedication(tenantId, dto);
  }

  @Patch('medications/:id')
  updateMedication(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateMedicationDto>,
  ) {
    return this.marService.updateMedication(tenantId, id, dto);
  }

  @Delete('medications/:id')
  @ApiOperation({ summary: 'Discontinue a medication' })
  discontinueMedication(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.marService.discontinueMedication(tenantId, id);
  }

  @Patch('medications/:id/stock')
  updateStock(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('delta') delta: number,
  ) {
    return this.marService.updateStockLevel(tenantId, id, delta);
  }

  // ── MAR Records ─────────────────────────────────────────────────────────────

  @Post('records')
  @ApiOperation({ summary: 'Record a medication administration event' })
  recordMAR(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: RecordMARDto,
  ) {
    return this.marService.recordMAR(tenantId, user.id, dto);
  }

  @Get('records/:id')
  getMARRecord(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.marService.getMARRecordWithSignature(tenantId, id);
  }

  // ── Daily MAR chart ──────────────────────────────────────────────────────────

  @Get('daily')
  @ApiOperation({ summary: 'Get full daily MAR chart for a service user' })
  getDailyMAR(
    @CurrentTenant() tenantId: string,
    @Query('serviceUserId', ParseUUIDPipe) serviceUserId: string,
    @Query('date') date: string,
  ) {
    return this.marService.getDailyMAR(tenantId, serviceUserId, date);
  }

  @Get('chart')
  @ApiOperation({ summary: 'Get MAR compliance chart data over a date range' })
  getMARChart(
    @CurrentTenant() tenantId: string,
    @Query('serviceUserId', ParseUUIDPipe) serviceUserId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.marService.getMARChart(tenantId, { serviceUserId, startDate, endDate });
  }

  @Get('missed')
  @ApiOperation({ summary: 'Get missed/omitted medication records (last 24h by default)' })
  getMissedMedications(
    @CurrentTenant() tenantId: string,
    @Query('since') since?: string,
  ) {
    return this.marService.getMissedMedications(
      tenantId,
      since ? new Date(since) : undefined,
    );
  }
}
