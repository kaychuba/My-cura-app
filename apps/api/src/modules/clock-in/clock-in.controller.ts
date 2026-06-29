import { Controller, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UclockUinService } from './clock-in.service';

@ApiTags('clock-in')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('clock-in')
export class ClockInController {
  constructor(private clock-inService: UclockUinService) {}
}
