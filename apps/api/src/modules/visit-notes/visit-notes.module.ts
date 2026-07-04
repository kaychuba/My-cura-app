import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VisitNotesController } from './visit-notes.controller';
import { VisitNotesService } from './visit-notes.service';
import { VisitNoteEntity } from './entities/visit-note.entity';
import { ShiftEntity } from '../scheduling/entities/shift.entity';

@Module({
  imports: [TypeOrmModule.forFeature([VisitNoteEntity, ShiftEntity])],
  controllers: [VisitNotesController],
  providers: [VisitNotesService],
  exports: [VisitNotesService],
})
export class VisitNotesModule {}
