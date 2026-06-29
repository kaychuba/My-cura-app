import { Controller, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MessagingService } from './messaging.service';

@ApiTags('messaging')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('messaging')
export class MessagingController {
  constructor(private messagingService: MessagingService) {}
}
