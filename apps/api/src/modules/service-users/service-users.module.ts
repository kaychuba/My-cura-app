import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceUsersController } from './service-users.controller';
import { ServiceUsersService } from './service-users.service';

@Module({
  controllers: [ServiceUsersController],
  providers: [ServiceUsersService],
  exports: [ServiceUsersService],
})
export class ServiceUsersModule {}
