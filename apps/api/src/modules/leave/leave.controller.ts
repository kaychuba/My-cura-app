import { Controller, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { LeaveService } from './leave.service';

@ApiTags('leave')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('leave')
export class LeaveController {
  constructor(private leaveService: LeaveService) {}
}
