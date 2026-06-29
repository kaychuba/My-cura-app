import { Controller, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ServiceUsersService } from './service-users.service';

@ApiTags('service-users')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('service-users')
export class ServiceUsersController {
  constructor(private service-usersService: ServiceUsersService) {}
}
