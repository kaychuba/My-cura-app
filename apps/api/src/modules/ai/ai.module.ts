import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AIController } from './ai.controller';
import { AIService } from './ai.service';

@Module({
  controllers: [AIController],
  providers: [AIService],
  exports: [AIService],
})
export class AIModule {}
