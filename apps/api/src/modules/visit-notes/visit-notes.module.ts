import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VisitNotesController } from './visit-notes.controller';
import { VisitNotesService } from './visit-notes.service';
import { VisitNoteEntity } from './entities/visit-note.entity';
import { ShiftEntity } from '../scheduling/entities/shift.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([VisitNoteEntity, ShiftEntity]), NotificationsModule],
  controllers: [VisitNotesController],
  providers: [VisitNotesService],
  exports: [VisitNotesService],
})
export class VisitNotesModule {}
