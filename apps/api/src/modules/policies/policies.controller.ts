import {
  Controller, Get, Post, Patch, Param, Body,
  UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { PoliciesService, CreatePolicyDto } from './policies.service';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthUser, UserRole } from '@my-cura/shared-types';

@ApiTags('policies')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('policies')
export class PoliciesController {
  constructor(private readonly policiesService: PoliciesService) {}

  @Get()
  @ApiOperation({ summary: 'Active policies with my acknowledgement state' })
  list(@CurrentTenant() tenantId: string, @CurrentUser() user: AuthUser) {
    return this.policiesService.listForUser(tenantId, user.id);
  }

  @Get('quota')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'This month’s publish quota (max 3 per calendar month)' })
  quota(@CurrentTenant() tenantId: string) {
    return this.policiesService.monthlyQuota(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a policy' })
  getById(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.policiesService.getById(tenantId, id);
  }

  @Post()
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Publish a policy (content or external link; max 3/month)' })
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreatePolicyDto,
  ) {
    return this.policiesService.create(tenantId, user.id, dto);
  }

  @Post(':id/acknowledge')
  @ApiOperation({ summary: 'Confirm I have read this policy' })
  acknowledge(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.policiesService.acknowledge(tenantId, user.id, id);
  }

  @Get(':id/acknowledgements')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Acknowledgement status for a policy (managers and above)' })
  acknowledgements(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.policiesService.acknowledgementStatus(tenantId, id);
  }

  @Patch(':id/archive')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Archive a policy' })
  archive(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.policiesService.archive(tenantId, id);
  }
}
