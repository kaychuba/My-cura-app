import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HRController } from './hr.controller';
import { HRService } from './hr.service';
import { HRDocumentEntity } from './entities/hr-document.entity';

@Module({
  imports: [TypeOrmModule.forFeature([HRDocumentEntity])],
  controllers: [HRController],
  providers: [HRService],
  exports: [HRService],
})
export class HRModule {}
