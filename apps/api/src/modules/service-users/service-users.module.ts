import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceUsersController } from './service-users.controller';
import { ServiceUsersService } from './service-users.service';

import { ServiceUserEntity } from './entities/service-user.entity';
import { ServiceUserConsentEntity } from './entities/service-user-consent.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ServiceUserEntity, ServiceUserConsentEntity])],
  controllers: [ServiceUsersController],
  providers: [ServiceUsersService],
  exports: [ServiceUsersService],
})
export class ServiceUsersModule {}
