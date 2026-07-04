import {
  Controller, Get, Post, Patch, Param, Body, Query,
  UseGuards, ParseUUIDPipe, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  VisitNotesService, CreateVisitNoteDto, UpdateEscalationDto,
} from './visit-notes.service';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole, AuthUser } from '@my-cura/shared-types';

const MANAGER_ROLES: UserRole[] = [
  UserRole.MANAGER,
  UserRole.AGENCY_OWNER,
  UserRole.SUPER_ADMIN,
];

@ApiTags('visit-notes')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('visit-notes')
export class VisitNotesController {
  constructor(private readonly visitNotesService: VisitNotesService) {}

  @Post()
  @Roles(UserRole.CARE_WORKER)
  @ApiOperation({ summary: 'Write a visit note for one of your own shifts' })
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateVisitNoteDto,
  ) {
    return this.visitNotesService.create(tenantId, user.id, dto);
  }

  @Get('mine')
  @Roles(UserRole.CARE_WORKER)
  @ApiOperation({ summary: 'Your own visit notes, newest first' })
  listMine(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.visitNotesService.listMine(tenantId, user.id, page, limit);
  }

  @Get('escalations')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Open escalations, most urgent first' })
  listEscalations(@CurrentTenant() tenantId: string) {
    return this.visitNotesService.listOpenEscalations(tenantId);
  }

  @Get('service-user/:serviceUserId')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Visit history for a service user' })
  listForServiceUser(
    @CurrentTenant() tenantId: string,
    @Param('serviceUserId', ParseUUIDPipe) serviceUserId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.visitNotesService.listForServiceUser(tenantId, serviceUserId, page, limit);
  }

  @Get('shift/:shiftId')
  @Roles(UserRole.CARE_WORKER)
  @ApiOperation({ summary: 'Notes for a shift (own shift, or any as manager)' })
  getByShift(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('shiftId', ParseUUIDPipe) shiftId: string,
  ) {
    return this.visitNotesService.getByShift(tenantId, shiftId, {
      id: user.id,
      isManager: MANAGER_ROLES.includes(user.role),
    });
  }

  @Patch(':id/escalation')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Progress an escalation (acknowledge/resolve/close)' })
  updateEscalation(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEscalationDto,
  ) {
    return this.visitNotesService.updateEscalation(tenantId, id, dto);
  }
}
