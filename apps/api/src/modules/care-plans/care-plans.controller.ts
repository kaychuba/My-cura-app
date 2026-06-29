import { Controller, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CarePlansService } from './care-plans.service';

@ApiTags('care-plans')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('care-plans')
export class CarePlansController {
  constructor(private care-plansService: CarePlansService) {}
}
