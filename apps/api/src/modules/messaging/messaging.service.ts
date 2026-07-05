import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ConversationEntity } from './entities/conversation.entity';
import { MessageEntity } from './entities/message.entity';
import { UserEntity } from '../users/entities/user.entity';

export interface StartConversationDto {
  participantIds: string[];
  title?: string;
  firstMessage?: string;
}

@Injectable()
export class MessagingService {
  constructor(
    @InjectRepository(ConversationEntity)
    private conversationRepo: Repository<ConversationEntity>,
    @InjectRepository(MessageEntity)
    private messageRepo: Repository<MessageEntity>,
    @InjectRepository(UserEntity)
    private userRepo: Repository<UserEntity>,
  ) {}

  async myConversations(tenantId: string, userId: string) {
    const conversations = await this.conversationRepo
      .createQueryBuilder('c')
      .where('c.tenant_id = :tenantId', { tenantId })
      .andWhere(`c.participant_ids @> :uid::jsonb`, { uid: JSON.stringify([userId]) })
      .orderBy('c.last_message_at', 'DESC', 'NULLS LAST')
      .getMany();

    // Resolve participant names for display
    const allIds = [...new Set(conversations.flatMap((c) => c.participantIds))];
    const users = allIds.length
      ? await this.userRepo.find({
          where: { tenantId, id: In(allIds) },
          select: ['id', 'firstName', 'lastName'],
        })
      : [];
    const nameById = new Map(users.map((u) => [u.id, `${u.firstName} ${u.lastName}`]));

    return conversations.map((c) => ({
      ...c,
      participants: c.participantIds.map((id) => ({ id, name: nameById.get(id) ?? 'Unknown' })),
    }));
  }

  async start(tenantId: string, creatorId: string, dto: StartConversationDto) {
    const participantIds = [...new Set([creatorId, ...(dto.participantIds ?? [])])];
    if (participantIds.length < 2) {
      throw new BadRequestException('Pick at least one other person');
    }
    const members = await this.userRepo.count({ where: { tenantId, id: In(participantIds) } });
    if (members !== participantIds.length) {
      throw new BadRequestException('All participants must belong to your agency');
    }

    const conversation = await this.conversationRepo.save(
      this.conversationRepo.create({
        tenantId,
        title: dto.title,
        participantIds,
        createdBy: creatorId,
        lastMessageAt: dto.firstMessage ? new Date() : undefined,
      }),
    );
    if (dto.firstMessage?.trim()) {
      await this.messageRepo.save(
        this.messageRepo.create({
          tenantId,
          conversationId: conversation.id,
          senderId: creatorId,
          body: dto.firstMessage.trim(),
        }),
      );
    }
    return conversation;
  }

  async listMessages(tenantId: string, userId: string, conversationId: string, page = 1, limit = 50) {
    await this.assertParticipant(tenantId, userId, conversationId);
    const [data, total] = await this.messageRepo.findAndCount({
      where: { tenantId, conversationId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data: data.reverse(), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async send(tenantId: string, userId: string, conversationId: string, body: string) {
    if (!body?.trim()) throw new BadRequestException('Message cannot be empty');
    const conversation = await this.assertParticipant(tenantId, userId, conversationId);

    const message = await this.messageRepo.save(
      this.messageRepo.create({
        tenantId,
        conversationId,
        senderId: userId,
        body: body.trim(),
      }),
    );
    conversation.lastMessageAt = new Date();
    await this.conversationRepo.save(conversation);
    return message;
  }

  private async assertParticipant(tenantId: string, userId: string, conversationId: string) {
    const conversation = await this.conversationRepo.findOne({
      where: { id: conversationId, tenantId },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    if (!conversation.participantIds.includes(userId)) {
      throw new ForbiddenException('You are not part of this conversation');
    }
    return conversation;
  }
}
