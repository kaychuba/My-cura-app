import {
  Controller, Get, Post, Patch, Param, Body, Query,
  UseGuards, ParseUUIDPipe, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { UsersService, CreateUserDto, UpdateUserDto, UserFilter } from './users.service';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole, AuthUser } from '@my-cura/shared-types';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'List users with optional search/role/status filters' })
  list(
    @CurrentTenant() tenantId: string,
    @Query() filter: UserFilter,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.usersService.list(tenantId, filter, page, limit);
  }

  @Get(':id')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Get a user by id (sensitive fields stripped)' })
  getById(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.usersService.getById(tenantId, id);
  }

  @Post()
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a user (only roles below your own)' })
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthUser,
    @Body() dto: CreateUserDto,
  ) {
    return this.usersService.create(tenantId, actor, dto);
  }

  @Patch(':id')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Update a user profile, role or status' })
  update(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(tenantId, actor, id, dto);
  }

  @Patch(':id/deactivate')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Deactivate a user account' })
  deactivate(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.usersService.deactivate(tenantId, actor, id);
  }

  @Post(':id/reset-password')
  @ApiOperation({ summary: 'Reset a password (own, or a role below yours)' })
  resetPassword(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('password') password: string,
  ) {
    return this.usersService.resetPassword(tenantId, actor, id, password);
  }
}
