import {
  Controller, Get, Post, Patch, Param, Body, Query,
  UseGuards, ParseUUIDPipe, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { ExpensesService, SubmitExpenseDto } from './expenses.service';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole, AuthUser } from '@my-cura/shared-types';
import { ExpenseEntity } from './entities/expense.entity';

@ApiTags('expenses')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @Roles(UserRole.CARE_WORKER)
  @ApiOperation({ summary: 'Submit an expense claim' })
  submit(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: SubmitExpenseDto,
  ) {
    return this.expensesService.submit(tenantId, user.id, dto);
  }

  @Get('mine')
  @Roles(UserRole.CARE_WORKER)
  @ApiOperation({ summary: 'Your own expense claims' })
  listMine(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.expensesService.listMine(tenantId, user.id, page, limit);
  }

  @Get()
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'All expense claims (filter by status)' })
  listAll(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: ExpenseEntity['status'],
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit = 50,
  ) {
    return this.expensesService.listAll(tenantId, status, page, limit);
  }

  @Patch(':id/approve')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Approve a submitted expense' })
  approve(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('note') note?: string,
  ) {
    return this.expensesService.review(tenantId, user.id, id, 'approved', note);
  }

  @Patch(':id/reject')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Reject a submitted expense (with a note)' })
  reject(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('note') note?: string,
  ) {
    return this.expensesService.review(tenantId, user.id, id, 'rejected', note);
  }

  @Patch(':id/paid')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Mark an approved expense as paid' })
  markPaid(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.expensesService.markPaid(tenantId, id);
  }
}
