import { Controller, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TrainingService } from './training.service';

@ApiTags('training')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('training')
export class TrainingController {
  constructor(private trainingService: TrainingService) {}
}
