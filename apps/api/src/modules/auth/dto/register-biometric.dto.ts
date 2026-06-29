import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterBiometricDto {
  @ApiProperty()
  @IsString()
  publicKeyBase64: string;

  @ApiProperty()
  @IsString()
  deviceId: string;
}
