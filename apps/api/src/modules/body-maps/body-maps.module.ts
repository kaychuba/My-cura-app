import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BodyMapsController } from './body-maps.controller';
import { BodyMapsService } from './body-maps.service';
import { BodyMapEntity } from './entities/body-map.entity';
import { ServiceUserEntity } from '../service-users/entities/service-user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BodyMapEntity, ServiceUserEntity])],
  controllers: [BodyMapsController],
  providers: [BodyMapsService],
  exports: [BodyMapsService],
})
export class BodyMapsModule {}
