import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EnquiryEntity } from './entities/enquiry.entity';
import { CreateEnquiryDto } from './dto/create-enquiry.dto';
import { SecurityMonitorService } from '../../common/security/security-monitor.service';

@Injectable()
export class EnquiriesService {
  constructor(
    @InjectRepository(EnquiryEntity)
    private enquiryRepo: Repository<EnquiryEntity>,
    private monitor: SecurityMonitorService,
  ) {}

  async create(dto: CreateEnquiryDto): Promise<{ received: true }> {
    await this.enquiryRepo.save(
      this.enquiryRepo.create({
        name: dto.name.trim(),
        email: dto.email.toLowerCase().trim(),
        phone: dto.phone?.trim() || null,
        organisation: dto.organisation?.trim() || null,
        enquiryType: dto.enquiryType,
        message: dto.message.trim(),
      }),
    );

    // Same ops webhook as backup/replication alerts — a new prospect is
    // exactly the kind of thing the founder wants pinged about immediately.
    await this.monitor.alertOps(
      `New ${dto.enquiryType} enquiry`,
      `${dto.name}${dto.organisation ? ` (${dto.organisation})` : ''} — ${dto.email}`,
    );

    return { received: true };
  }
}
