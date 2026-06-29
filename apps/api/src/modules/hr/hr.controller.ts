import { Controller, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { HRService } from './hr.service';

@ApiTags('hr')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('hr')
export class HRController {
  constructor(private hrService: HRService) {}
}
