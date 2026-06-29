import { Controller, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { StorageService } from './storage.service';

@ApiTags('storage')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('storage')
export class StorageController {
  constructor(private storageService: StorageService) {}
}
