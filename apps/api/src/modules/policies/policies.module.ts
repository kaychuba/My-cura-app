import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PoliciesController } from './policies.controller';
import { PoliciesService } from './policies.service';
import { PolicyEntity } from './entities/policy.entity';
import { PolicyAcknowledgementEntity } from './entities/policy-acknowledgement.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PolicyEntity, PolicyAcknowledgementEntity])],
  controllers: [PoliciesController],
  providers: [PoliciesService],
  exports: [PoliciesService],
})
export class PoliciesModule {}
