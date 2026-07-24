import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnquiryEntity } from './entities/enquiry.entity';
import { EnquiriesService } from './enquiries.service';
import { EnquiriesController } from './enquiries.controller';

@Module({
  imports: [TypeOrmModule.forFeature([EnquiryEntity])],
  controllers: [EnquiriesController],
  providers: [EnquiriesService],
})
export class EnquiriesModule {}
