import { Controller, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RecruitmentService } from './recruitment.service';

@ApiTags('recruitment')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('recruitment')
export class RecruitmentController {
  constructor(private recruitmentService: RecruitmentService) {}
}
