import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../database/base.entity';
import { SubscriptionTier } from '@my-cura/shared-types';

export enum SubscriptionStatus {
  TRIALING = 'trialing',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELLED = 'cancelled',
  UNPAID = 'unpaid',
}

@Entity('subscriptions')
@Index(['tenantId'], { unique: true })
export class SubscriptionEntity extends BaseEntity {
  @Column({ name: 'stripe_customer_id', nullable: true })
  stripeCustomerId?: string;

  @Column({ name: 'stripe_subscription_id', nullable: true })
  stripeSubscriptionId?: string;

  @Column({ name: 'stripe_price_id', nullable: true })
  stripePriceId?: string;

  @Column({ type: 'enum', enum: SubscriptionTier, default: SubscriptionTier.STARTER })
  tier: SubscriptionTier;

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.TRIALING,
  })
  status: SubscriptionStatus;

  @Column({ name: 'current_period_start', type: 'timestamptz', nullable: true })
  currentPeriodStart?: Date;

  @Column({ name: 'current_period_end', type: 'timestamptz', nullable: true })
  currentPeriodEnd?: Date;

  @Column({ name: 'cancel_at_period_end', default: false })
  cancelAtPeriodEnd: boolean;

  @Column({ name: 'trial_end', type: 'timestamptz', nullable: true })
  trialEnd?: Date;

  @Column({ name: 'seats_used', default: 0 })
  seatsUsed: number;

  @Column({ name: 'seats_limit', default: 10 })
  seatsLimit: number;
}
