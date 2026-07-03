import {
  Controller, Get, Post, Patch, Param, Body, Query,
  UseGuards, ParseUUIDPipe, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { IncidentsService, CreateIncidentDto, UpdateIncidentDto, IncidentFilter } from './incidents.service';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '@my-cura/shared-types';

@ApiTags('incidents')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('incidents')
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Get()
  @ApiOperation({ summary: 'List incidents with optional filters' })
  list(
    @CurrentTenant() tenantId: string,
    @Query() filter: IncidentFilter,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.incidentsService.list(tenantId, filter, page, limit);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get incident statistics (counts by type, severity, CQC)' })
  getStats(@CurrentTenant() tenantId: string) {
    return this.incidentsService.getStats(tenantId);
  }

  @Get(':id')
  getById(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.incidentsService.getById(tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Report a new incident' })
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateIncidentDto,
  ) {
    return this.incidentsService.create(tenantId, user.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateIncidentDto,
  ) {
    return this.incidentsService.update(tenantId, id, dto);
  }

  @Patch(':id/resolve')
  @ApiOperation({ summary: 'Resolve an incident with outcome notes' })
  resolve(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('actionsTaken') actionsTaken: string,
  ) {
    return this.incidentsService.resolve(tenantId, id, actionsTaken);
  }
}
