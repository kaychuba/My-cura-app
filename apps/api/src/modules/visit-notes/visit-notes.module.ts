import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VisitNotesController } from './visit-notes.controller';
import { VisitNotesService } from './visit-notes.service';

@Module({
  controllers: [VisitNotesController],
  providers: [VisitNotesService],
  exports: [VisitNotesService],
})
export class VisitNotesModule {}
