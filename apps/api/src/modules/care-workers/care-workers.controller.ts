import {
  Controller, Get, Post, Patch, Param, Body, Query,
  UseGuards, ParseUUIDPipe, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  CareWorkersService, CreateCareWorkerDto, UpdateCareWorkerDto,
} from './care-workers.service';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthUser, UserRole } from '@my-cura/shared-types';

@ApiTags('care-workers')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('care-workers')
export class CareWorkersController {
  constructor(private readonly careWorkersService: CareWorkersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get my own care worker profile (pay fields stripped)' })
  async getMe(@CurrentTenant() tenantId: string, @CurrentUser() user: AuthUser) {
    const worker = await this.careWorkersService.getByUserId(tenantId, user.id);
    // Pay data is never exposed to the care worker role
    return this.careWorkersService.stripPayFields(worker as unknown as Record<string, unknown>);
  }

  @Get()
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'List care workers (managers and above)' })
  list(
    @CurrentTenant() tenantId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.careWorkersService.list(tenantId, page, limit);
  }

  @Get(':id')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Get a care worker with pay details (managers and above)' })
  getById(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.careWorkersService.getById(tenantId, id);
  }

  @Post()
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a care worker profile for an existing user' })
  create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateCareWorkerDto,
  ) {
    return this.careWorkersService.create(tenantId, dto);
  }

  @Patch(':id')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Update a care worker profile / pay rates' })
  update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCareWorkerDto,
  ) {
    return this.careWorkersService.update(tenantId, id, dto);
  }
}
