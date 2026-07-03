import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../database/base.entity';
import { UserRole, UserStatus } from '@my-cura/shared-types';

@Entity('users')
@Index(['tenantId', 'email'], { unique: true })
export class UserEntity extends BaseEntity {
  @Column({ unique: false })
  email: string;

  @Column({ name: 'password_hash', nullable: true })
  passwordHash?: string;

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ name: 'last_name' })
  lastName: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ name: 'avatar_s3_key', nullable: true })
  avatarS3Key?: string;

  @Column({ name: 'is_2fa_enabled', default: false })
  is2faEnabled: boolean;

  @Column({ name: 'totp_secret_enc', type: 'varchar', nullable: true })
  totpSecretEnc?: string | null;

  @Column({ name: 'biometric_public_key', nullable: true, type: 'text' })
  biometricPublicKey?: string;

  @Column({ name: 'biometric_device_id', nullable: true })
  biometricDeviceId?: string;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt?: Date;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  @Column({ name: 'google_id', nullable: true })
  googleId?: string;

  @Column({ name: 'apple_id', nullable: true })
  appleId?: string;
}
