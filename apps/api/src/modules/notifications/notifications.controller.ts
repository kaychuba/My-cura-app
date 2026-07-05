import {
  Controller, Get, Patch, Param, Query,
  UseGuards, ParseUUIDPipe, ParseIntPipe, DefaultValuePipe, ParseBoolPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '@my-cura/shared-types';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Your notifications, newest first' })
  listMine(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(30), ParseIntPipe) limit: number,
    @Query('unreadOnly', new DefaultValuePipe(false), ParseBoolPipe) unreadOnly: boolean,
  ) {
    return this.notificationsService.listMine(tenantId, user.id, page, limit, unreadOnly);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Badge count for the app icon/menu' })
  unreadCount(@CurrentTenant() tenantId: string, @CurrentUser() user: AuthUser) {
    return this.notificationsService.unreadCount(tenantId, user.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark one notification as read' })
  markRead(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notificationsService.markRead(tenantId, user.id, id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllRead(@CurrentTenant() tenantId: string, @CurrentUser() user: AuthUser) {
    return this.notificationsService.markAllRead(tenantId, user.id);
  }
}
