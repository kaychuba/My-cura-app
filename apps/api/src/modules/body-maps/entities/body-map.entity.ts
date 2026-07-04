import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../database/base.entity';

export type BodyMapMarkerType =
  | 'bruise'
  | 'cut_or_graze'
  | 'pressure_sore'
  | 'rash'
  | 'swelling'
  | 'burn'
  | 'scratch'
  | 'other';

export interface BodyMapMarker {
  /** Percentage coordinates (0-100) on the body outline, so any screen size renders identically. */
  x: number;
  y: number;
  view: 'front' | 'back';
  type: BodyMapMarkerType;
  note: string;
}

@Entity('body_maps')
@Index(['tenantId', 'serviceUserId', 'createdAt'])
export class BodyMapEntity extends BaseEntity {
  @Column({ name: 'service_user_id', type: 'uuid' })
  serviceUserId: string;

  /** User id of the care worker recording the observation. */
  @Column({ name: 'care_worker_id', type: 'uuid' })
  careWorkerId: string;

  @Column({ name: 'shift_id', type: 'uuid', nullable: true })
  shiftId?: string;

  @Column({ type: 'jsonb' })
  markers: BodyMapMarker[];

  /** Overall observation summary, e.g. "new bruising on left forearm, not present yesterday". */
  @Column({ type: 'text' })
  summary: string;

  /** Whether this observation was escalated as an incident. */
  @Column({ name: 'incident_id', type: 'uuid', nullable: true })
  incidentId?: string;
}
