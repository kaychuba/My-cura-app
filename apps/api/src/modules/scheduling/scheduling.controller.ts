import { Controller, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SchedulingService } from './scheduling.service';

@ApiTags('scheduling')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('scheduling')
export class SchedulingController {
  constructor(private schedulingService: SchedulingService) {}
}
