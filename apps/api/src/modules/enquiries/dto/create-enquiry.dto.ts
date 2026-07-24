import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEnquiryDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name: string;

  @ApiProperty()
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  organisation?: string;

  @ApiProperty({ enum: ['demo', 'sales', 'general', 'support'] })
  @IsIn(['demo', 'sales', 'general', 'support'])
  enquiryType: 'demo' | 'sales' | 'general' | 'support';

  @ApiProperty()
  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  message: string;
}
