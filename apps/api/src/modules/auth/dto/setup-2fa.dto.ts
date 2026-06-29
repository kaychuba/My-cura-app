import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class Setup2FADto {
  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  code: string;
}
