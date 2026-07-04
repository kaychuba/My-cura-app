import {
  Controller, Get, Post, Param, Body, Query,
  UseGuards, ParseUUIDPipe, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { BodyMapsService, CreateBodyMapDto } from './body-maps.service';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthUser, UserRole } from '@my-cura/shared-types';

@ApiTags('body-maps')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('body-maps')
export class BodyMapsController {
  constructor(private readonly bodyMapsService: BodyMapsService) {}

  @Post()
  @ApiOperation({ summary: 'Record a body map observation for a service user' })
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateBodyMapDto,
  ) {
    return this.bodyMapsService.create(tenantId, user.id, dto);
  }

  @Get('mine')
  @ApiOperation({ summary: 'Body maps I have recorded' })
  mine(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.bodyMapsService.list(tenantId, user.id, page, limit);
  }

  @Get('service-user/:serviceUserId')
  @ApiOperation({ summary: 'Body map history for a service user (visible to care staff)' })
  forServiceUser(
    @CurrentTenant() tenantId: string,
    @Param('serviceUserId', ParseUUIDPipe) serviceUserId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.bodyMapsService.listForServiceUser(tenantId, serviceUserId, page, limit);
  }

  @Get()
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'All body maps (managers and above)' })
  list(
    @CurrentTenant() tenantId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.bodyMapsService.list(tenantId, undefined, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a body map by id' })
  getById(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.bodyMapsService.getById(tenantId, id);
  }
}
