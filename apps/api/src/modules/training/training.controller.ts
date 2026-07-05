import {
  Controller, Get, Post, Patch, Param, Body, Query,
  UseGuards, ParseUUIDPipe, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { TrainingService, CreateCourseDto } from './training.service';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole, AuthUser } from '@my-cura/shared-types';

const MANAGER_ROLES: UserRole[] = [UserRole.MANAGER, UserRole.AGENCY_OWNER, UserRole.SUPER_ADMIN];

@ApiTags('training')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('training')
export class TrainingController {
  constructor(private readonly trainingService: TrainingService) {}

  @Get('courses')
  @ApiOperation({ summary: 'Active training courses' })
  listCourses(@CurrentTenant() tenantId: string) {
    return this.trainingService.listCourses(tenantId);
  }

  @Post('courses')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a course' })
  createCourse(@CurrentTenant() tenantId: string, @Body() dto: CreateCourseDto) {
    return this.trainingService.createCourse(tenantId, dto);
  }

  @Patch('courses/:id')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Update or deactivate a course' })
  updateCourse(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateCourseDto> & { isActive?: boolean },
  ) {
    return this.trainingService.updateCourse(tenantId, id, dto);
  }

  @Post('assign')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Assign a course to workers (notifies them)' })
  assign(
    @CurrentTenant() tenantId: string,
    @Body() dto: { courseId: string; userIds: string[] },
  ) {
    return this.trainingService.assign(tenantId, dto.courseId, dto.userIds);
  }

  @Get('mine')
  @ApiOperation({ summary: 'Your own training records' })
  listMine(@CurrentTenant() tenantId: string, @CurrentUser() user: AuthUser) {
    return this.trainingService.listMine(tenantId, user.id);
  }

  @Get('user/:userId')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: "A worker's training records" })
  listByUser(
    @CurrentTenant() tenantId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.trainingService.listByUser(tenantId, userId);
  }

  @Patch('records/:id/complete')
  @ApiOperation({ summary: 'Mark training complete (own, or any as manager)' })
  complete(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('certificateKey') certificateKey?: string,
  ) {
    return this.trainingService.complete(
      tenantId,
      { id: user.id, isManager: MANAGER_ROLES.includes(user.role) },
      id,
      certificateKey,
    );
  }

  @Get('expiring')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Completions expiring soon (default 60 days)' })
  expiring(
    @CurrentTenant() tenantId: string,
    @Query('days', new DefaultValuePipe(60), ParseIntPipe) days: number,
  ) {
    return this.trainingService.expiring(tenantId, days);
  }
}
