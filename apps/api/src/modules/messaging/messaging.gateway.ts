import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

interface AuthenticatedSocket extends Socket {
  tenantId: string;
  userId: string;
  role: string;
}

interface SendMessageDto {
  channelId: string;
  body: string;
  messageType?: 'text' | 'image' | 'document' | 'voice';
  attachments?: string[];
}

interface JoinChannelDto {
  channelId: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.WEB_APP_URL ?? 'http://localhost:5173',
    credentials: true,
  },
  namespace: '/messaging',
})
export class MessagingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly connectedUsers = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth.token ??
        client.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('app.jwtSecret'),
      }) as { sub: string; tenantId: string; role: string; partial?: boolean };

      if (payload.partial) {
        client.disconnect();
        return;
      }

      client.userId = payload.sub;
      client.tenantId = payload.tenantId;
      client.role = payload.role;

      // Join tenant room for broadcast messages
      await client.join(`tenant:${payload.tenantId}`);
      await client.join(`user:${payload.sub}`);

      // Track online presence
      if (!this.connectedUsers.has(payload.tenantId)) {
        this.connectedUsers.set(payload.tenantId, new Set());
      }
      this.connectedUsers.get(payload.tenantId)!.add(payload.sub);

      // Broadcast presence update to tenant
      this.server.to(`tenant:${payload.tenantId}`).emit('presence:update', {
        userId: payload.sub,
        status: 'online',
      });
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (!client.tenantId || !client.userId) return;

    const tenantUsers = this.connectedUsers.get(client.tenantId);
    if (tenantUsers) {
      tenantUsers.delete(client.userId);
    }

    this.server.to(`tenant:${client.tenantId}`).emit('presence:update', {
      userId: client.userId,
      status: 'offline',
    });
  }

  @SubscribeMessage('channel:join')
  async handleJoinChannel(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() dto: JoinChannelDto,
  ) {
    // In production: verify user has access to this channel
    await client.join(`channel:${dto.channelId}`);
    return { event: 'channel:joined', data: { channelId: dto.channelId } };
  }

  @SubscribeMessage('channel:leave')
  async handleLeaveChannel(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() dto: JoinChannelDto,
  ) {
    await client.leave(`channel:${dto.channelId}`);
    return { event: 'channel:left', data: { channelId: dto.channelId } };
  }

  @SubscribeMessage('message:send')
  async handleMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() dto: SendMessageDto,
  ) {
    if (!client.userId) return;

    const message = {
      id: `msg_${Date.now()}`,
      channelId: dto.channelId,
      senderId: client.userId,
      tenantId: client.tenantId,
      body: dto.body,
      messageType: dto.messageType ?? 'text',
      attachments: dto.attachments ?? [],
      sentAt: new Date().toISOString(),
    };

    // Emit to everyone in the channel
    this.server.to(`channel:${dto.channelId}`).emit('message:new', message);

    return { event: 'message:sent', data: message };
  }

  @SubscribeMessage('message:typing')
  handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() dto: JoinChannelDto,
  ) {
    client.to(`channel:${dto.channelId}`).emit('message:typing', {
      userId: client.userId,
      channelId: dto.channelId,
    });
  }

  @SubscribeMessage('message:read')
  handleRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: { channelId: string; messageId: string },
  ) {
    client.to(`channel:${body.channelId}`).emit('message:read', {
      userId: client.userId,
      messageId: body.messageId,
    });
  }

  // Called by services to push notifications
  emitToUser(userId: string, event: string, data: unknown) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  emitToTenant(tenantId: string, event: string, data: unknown) {
    this.server.to(`tenant:${tenantId}`).emit(event, data);
  }

  // Emergency broadcast — sends to all online workers in the tenant
  broadcastEmergency(tenantId: string, message: string, severity: 'high' | 'critical') {
    this.server.to(`tenant:${tenantId}`).emit('emergency:broadcast', {
      message,
      severity,
      timestamp: new Date().toISOString(),
    });
  }

  getOnlineUsers(tenantId: string): string[] {
    return Array.from(this.connectedUsers.get(tenantId) ?? []);
  }
}
