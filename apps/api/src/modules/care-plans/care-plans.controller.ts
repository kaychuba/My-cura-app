import {
  Controller, Get, Post, Patch, Param, Body,
  UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  CarePlansService, CreateCarePlanDto, UpdateCarePlanDto,
} from './care-plans.service';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole, AuthUser } from '@my-cura/shared-types';

@ApiTags('care-plans')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('care-plans')
export class CarePlansController {
  constructor(private readonly carePlansService: CarePlansService) {}

  @Get('service-user/:serviceUserId')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'All care plan versions for a service user' })
  listForServiceUser(
    @CurrentTenant() tenantId: string,
    @Param('serviceUserId', ParseUUIDPipe) serviceUserId: string,
  ) {
    return this.carePlansService.listForServiceUser(tenantId, serviceUserId);
  }

  @Get('service-user/:serviceUserId/active')
  @Roles(UserRole.CARE_WORKER)
  @ApiOperation({ summary: 'The active care plan (care workers read this before a visit)' })
  getActive(
    @CurrentTenant() tenantId: string,
    @Param('serviceUserId', ParseUUIDPipe) serviceUserId: string,
  ) {
    return this.carePlansService.getActiveForServiceUser(tenantId, serviceUserId);
  }

  @Get(':id')
  @Roles(UserRole.CARE_WORKER)
  @ApiOperation({ summary: 'Get a care plan by id' })
  getById(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.carePlansService.getById(tenantId, id);
  }

  @Post()
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a new draft care plan version' })
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateCarePlanDto,
  ) {
    return this.carePlansService.create(tenantId, user.id, dto);
  }

  @Patch(':id')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Edit a draft care plan' })
  update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCarePlanDto,
  ) {
    return this.carePlansService.update(tenantId, id, dto);
  }

  @Patch(':id/activate')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Activate a draft (archives the previous active version)' })
  activate(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.carePlansService.activate(tenantId, id);
  }

  @Patch(':id/review')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Record a review of the active plan' })
  review(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('nextReviewAt') nextReviewAt?: string,
  ) {
    return this.carePlansService.review(tenantId, id, user.id, nextReviewAt);
  }
}
