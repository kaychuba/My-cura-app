import { Controller, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CareWorkersService } from './care-workers.service';

@ApiTags('care-workers')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('care-workers')
export class CareWorkersController {
  constructor(private careWorkersService: CareWorkersService) {}
}
