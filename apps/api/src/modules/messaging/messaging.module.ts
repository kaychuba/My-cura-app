import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MessagingController } from './messaging.controller';
import { MessagingService } from './messaging.service';
import { MessagingGateway } from './messaging.gateway';
import { ConversationEntity } from './entities/conversation.entity';
import { MessageEntity } from './entities/message.entity';
import { UserEntity } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ConversationEntity, MessageEntity, UserEntity]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get('app.jwtSecret'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [MessagingController],
  providers: [MessagingService, MessagingGateway],
  exports: [MessagingService, MessagingGateway],
})
export class MessagingModule {}
