import {
  Controller, Get, Query,
  UseGuards, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuditService, AuditFilter } from './audit.service';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '@my-cura/shared-types';

@ApiTags('audit')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Query the audit trail (who did what, when, from where)' })
  list(
    @CurrentTenant() tenantId: string,
    @Query() filter: AuditFilter,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.auditService.list(tenantId, filter, page, limit);
  }
}
