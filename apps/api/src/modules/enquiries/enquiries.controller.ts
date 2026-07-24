import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { EnquiriesService } from './enquiries.service';
import { CreateEnquiryDto } from './dto/create-enquiry.dto';

const FIFTEEN_MINUTES = 15 * 60_000;

@ApiTags('enquiries')
@Controller('enquiries')
export class EnquiriesController {
  constructor(private readonly enquiriesService: EnquiriesService) {}

  // Public by design (marketing contact form) — protected by validation and
  // a strict per-IP throttle rather than authentication.
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 3, ttl: FIFTEEN_MINUTES } })
  @ApiOperation({ summary: 'Submit a contact/demo enquiry from the public site' })
  create(@Body() dto: CreateEnquiryDto) {
    return this.enquiriesService.create(dto);
  }
}
