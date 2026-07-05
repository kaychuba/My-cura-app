import {
  Controller, Get, Post, Patch, Param, Body, Query,
  UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { RecruitmentService, CreateApplicantDto } from './recruitment.service';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '@my-cura/shared-types';
import { ApplicantStage } from './entities/applicant.entity';

@ApiTags('recruitment')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.MANAGER)
@Controller('recruitment')
export class RecruitmentController {
  constructor(private readonly recruitmentService: RecruitmentService) {}

  @Post('applicants')
  @ApiOperation({ summary: 'Add an applicant to the pipeline' })
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateApplicantDto) {
    return this.recruitmentService.create(tenantId, dto);
  }

  @Get('applicants')
  @ApiOperation({ summary: 'Applicants with pipeline stage counts' })
  list(@CurrentTenant() tenantId: string, @Query('stage') stage?: ApplicantStage) {
    return this.recruitmentService.list(tenantId, stage);
  }

  @Patch('applicants/:id')
  update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateApplicantDto>,
  ) {
    return this.recruitmentService.update(tenantId, id, dto);
  }

  @Patch('applicants/:id/stage')
  @ApiOperation({ summary: 'Move an applicant through the pipeline' })
  moveStage(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('stage') stage: ApplicantStage,
  ) {
    return this.recruitmentService.moveStage(tenantId, id, stage);
  }
}
