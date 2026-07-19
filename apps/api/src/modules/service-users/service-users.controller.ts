import {
  Controller, Get, Post, Patch, Param, Body, Query,
  UseGuards, ParseUUIDPipe, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  ServiceUsersService, CreateServiceUserDto, UpdateServiceUserDto, ServiceUserFilter,
  RecordConsentDto,
} from './service-users.service';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthUser, UserRole } from '@my-cura/shared-types';

@ApiTags('service-users')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('service-users')
export class ServiceUsersController {
  constructor(private readonly serviceUsersService: ServiceUsersService) {}

  @Get(':id/consents')
  @ApiOperation({ summary: 'Consent position per type + full immutable history' })
  listConsents(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.serviceUsersService.listConsents(tenantId, id);
  }

  @Post(':id/consents')
  @Roles(UserRole.MANAGER)
  @ApiOperation({
    summary: 'Record a consent decision (granted/refused/withdrawn) — append-only',
  })
  recordConsent(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordConsentDto,
  ) {
    return this.serviceUsersService.recordConsent(tenantId, user.id, id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List service users with optional search/filters' })
  list(
    @CurrentTenant() tenantId: string,
    @Query() filter: ServiceUserFilter,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.serviceUsersService.list(tenantId, filter, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a service user by id' })
  getById(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.serviceUsersService.getById(tenantId, id);
  }

  @Post()
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a service user' })
  create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateServiceUserDto,
  ) {
    return this.serviceUsersService.create(tenantId, dto);
  }

  @Patch(':id')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Update a service user' })
  update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateServiceUserDto,
  ) {
    return this.serviceUsersService.update(tenantId, id, dto);
  }

  @Patch(':id/archive')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Archive (deactivate) a service user' })
  archive(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.serviceUsersService.archive(tenantId, id);
  }
}
