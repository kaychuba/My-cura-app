import { Controller, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { VisitNotesService } from './visit-notes.service';

@ApiTags('visit-notes')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('visit-notes')
export class VisitNotesController {
  constructor(private visit-notesService: VisitNotesService) {}
}
