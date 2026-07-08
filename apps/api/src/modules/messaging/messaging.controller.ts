import {
  Controller, Get, Post, Param, Body, Query,
  UseGuards, ParseUUIDPipe, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { MessagingService, StartConversationDto } from './messaging.service';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '@my-cura/shared-types';

@ApiTags('messaging')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('messaging')
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Get('contacts')
  @ApiOperation({ summary: 'People in your agency you can message' })
  contacts(@CurrentTenant() tenantId: string, @CurrentUser() user: AuthUser) {
    return this.messagingService.contacts(tenantId, user.id);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Your conversations, most recent first' })
  myConversations(@CurrentTenant() tenantId: string, @CurrentUser() user: AuthUser) {
    return this.messagingService.myConversations(tenantId, user.id);
  }

  @Post('conversations')
  @ApiOperation({ summary: 'Start a conversation (optionally with a first message)' })
  start(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: StartConversationDto,
  ) {
    return this.messagingService.start(tenantId, user.id, dto);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Messages in a conversation (participants only)' })
  listMessages(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.messagingService.listMessages(tenantId, user.id, id, page, limit);
  }

  @Post('conversations/:id/messages')
  @ApiOperation({ summary: 'Send a message' })
  send(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('body') body: string,
  ) {
    return this.messagingService.send(tenantId, user.id, id, body);
  }
}
