import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query,
  UseGuards, ParseUUIDPipe, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { HRService, CreateHRDocumentDto } from './hr.service';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole, AuthUser } from '@my-cura/shared-types';

@ApiTags('hr')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('hr')
export class HRController {
  constructor(private readonly hrService: HRService) {}

  @Post('documents')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Add an HR document for a staff member' })
  add(@CurrentTenant() tenantId: string, @Body() dto: CreateHRDocumentDto) {
    return this.hrService.add(tenantId, dto);
  }

  @Get('documents/mine')
  @ApiOperation({ summary: 'Your own HR documents' })
  mine(@CurrentTenant() tenantId: string, @CurrentUser() user: AuthUser) {
    return this.hrService.listByUser(tenantId, user.id);
  }

  @Get('documents/expiring')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Documents expiring soon (DBS, right to work…)' })
  expiring(
    @CurrentTenant() tenantId: string,
    @Query('days', new DefaultValuePipe(60), ParseIntPipe) days: number,
  ) {
    return this.hrService.expiring(tenantId, days);
  }

  @Get('documents')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: "A staff member's HR documents" })
  listByUser(
    @CurrentTenant() tenantId: string,
    @Query('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.hrService.listByUser(tenantId, userId);
  }

  @Patch('documents/:id')
  @Roles(UserRole.MANAGER)
  update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateHRDocumentDto>,
  ) {
    return this.hrService.update(tenantId, id, dto);
  }

  @Delete('documents/:id')
  @Roles(UserRole.MANAGER)
  remove(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.hrService.remove(tenantId, id);
  }
}
