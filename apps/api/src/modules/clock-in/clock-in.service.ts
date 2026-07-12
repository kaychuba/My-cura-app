import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClockEventEntity } from './entities/clock-event.entity';
import { ShiftEntity } from '../scheduling/entities/shift.entity';
import { ServiceUserEntity } from '../service-users/entities/service-user.entity';
import { ClockInRequest, ClockInResponse, ClockEventType, ShiftStatus } from '@my-cura/shared-types';
import { haversineDistanceMetres } from '@my-cura/shared-utils';

const CLOCK_IN_WINDOW_MINUTES = 30;
const DEFAULT_GPS_RADIUS_METRES = 3000; // hard limit: clock-ins beyond 3km are rejected
const MAX_GPS_ACCURACY_METRES = 50;
const DUPLICATE_WINDOW_MINUTES = 30;

@Injectable()
export class ClockInService {
  constructor(
    @InjectRepository(ClockEventEntity) private clockRepo: Repository<ClockEventEntity>,
    @InjectRepository(ShiftEntity) private shiftRepo: Repository<ShiftEntity>,
    @InjectRepository(ServiceUserEntity) private serviceUserRepo: Repository<ServiceUserEntity>,
  ) {}

  async recordClockEvent(tenantId: string, careWorkerId: string, dto: ClockInRequest): Promise<ClockInResponse> {
    const shift = await this.shiftRepo.findOne({
      where: { id: dto.shiftId, tenantId },
    });

    if (!shift) throw new NotFoundException('Shift not found');
    if (shift.careWorkerId !== careWorkerId) throw new BadRequestException('Shift not assigned to you');

    const fraudReasons: string[] = [];
    let gpsDistanceM = 0;

    if (dto.accuracy > MAX_GPS_ACCURACY_METRES) {
      fraudReasons.push(`GPS accuracy too low: ${dto.accuracy}m`);
    }

    if (dto.eventType === ClockEventType.CLOCK_IN) {
      const windowMs = CLOCK_IN_WINDOW_MINUTES * 60 * 1000;
      const diff = Math.abs(new Date(dto.timestamp).getTime() - shift.scheduledStart.getTime());
      if (diff > windowMs) {
        fraudReasons.push(`Clock-in is outside ${CLOCK_IN_WINDOW_MINUTES}min window`);
      }

      const recent = await this.clockRepo.findOne({
        where: { shiftId: dto.shiftId, eventType: ClockEventType.CLOCK_IN },
        order: { recordedAt: 'DESC' },
      });
      if (recent) {
        const minsAgo = (Date.now() - recent.recordedAt.getTime()) / 60000;
        if (minsAgo < DUPLICATE_WINDOW_MINUTES) {
          fraudReasons.push('Duplicate clock-in within 30 minutes');
        }
      }
    }

    // GPS proximity check
    let targetLat = shift.locationLat ? Number(shift.locationLat) : null;
    let targetLon = shift.locationLon ? Number(shift.locationLon) : null;

    if (!targetLat && shift.serviceUserId) {
      const su = await this.serviceUserRepo.findOne({ where: { id: shift.serviceUserId } });
      if (su?.address) {
        targetLat = su.address.lat;
        targetLon = su.address.lon;
      }
    }

    if (targetLat && targetLon) {
      gpsDistanceM = haversineDistanceMetres(dto.latitude, dto.longitude, targetLat, targetLon);
      if (gpsDistanceM > DEFAULT_GPS_RADIUS_METRES) {
        fraudReasons.push(`GPS ${Math.round(gpsDistanceM)}m from expected location`);
      }
    }

    const isFraud = fraudReasons.length > 0;
    const event = this.clockRepo.create({
      tenantId,
      shiftId: dto.shiftId,
      careWorkerId,
      eventType: dto.eventType,
      recordedAt: new Date(dto.timestamp),
      latitude: dto.latitude,
      longitude: dto.longitude,
      gpsAccuracy: dto.accuracy,
      gpsDistanceM,
      deviceId: dto.deviceId,
      isManual: false,
      fraudFlag: isFraud,
      fraudReasons,
    });

    const saved = await this.clockRepo.save(event);

    if (!isFraud) {
      if (dto.eventType === ClockEventType.CLOCK_IN) {
        await this.shiftRepo.update(dto.shiftId, { status: ShiftStatus.IN_PROGRESS });
      } else if (dto.eventType === ClockEventType.CLOCK_OUT) {
        await this.shiftRepo.update(dto.shiftId, { status: ShiftStatus.COMPLETED });
      }
    }

    return {
      success: !isFraud,
      eventId: saved.id,
      gpsDistanceMetres: Math.round(gpsDistanceM),
      fraudFlag: isFraud,
      message: isFraud ? fraudReasons.join('; ') : undefined,
    };
  }

  /**
   * Manager clocks a worker in/out on their behalf. By default the event is
   * stamped AT the scheduled time ("adjust the shift to match the set time"),
   * so recorded hours equal the rostered hours. No GPS/fraud checks — it is
   * flagged as a manual manager entry instead.
   */
  async managerClockEvent(
    tenantId: string,
    managerId: string,
    shiftId: string,
    eventType: ClockEventType,
    atScheduledTime = true,
  ) {
    const shift = await this.shiftRepo.findOne({ where: { id: shiftId, tenantId } });
    if (!shift) throw new NotFoundException('Shift not found');
    if (!shift.careWorkerId) throw new BadRequestException('Assign a care worker to this shift first');
    if (eventType === ClockEventType.CLOCK_IN && shift.status === ShiftStatus.IN_PROGRESS) {
      throw new BadRequestException('Already clocked in');
    }
    if (eventType === ClockEventType.CLOCK_OUT && shift.status !== ShiftStatus.IN_PROGRESS) {
      throw new BadRequestException('Worker is not clocked in on this shift');
    }

    const recordedAt = atScheduledTime
      ? (eventType === ClockEventType.CLOCK_IN ? shift.scheduledStart : shift.scheduledEnd)
      : new Date();

    const event = await this.clockRepo.save(
      this.clockRepo.create({
        tenantId,
        shiftId,
        careWorkerId: shift.careWorkerId,
        eventType,
        recordedAt,
        latitude: 0,
        longitude: 0,
        gpsAccuracy: 0,
        gpsDistanceM: 0,
        deviceId: `manager:${managerId}`,
        isManual: true,
        fraudFlag: false,
        fraudReasons: [],
      }),
    );

    await this.shiftRepo.update(shiftId, {
      status: eventType === ClockEventType.CLOCK_IN ? ShiftStatus.IN_PROGRESS : ShiftStatus.COMPLETED,
    });

    return { success: true, eventId: event.id, recordedAt };
  }

  async getShiftClockEvents(shiftId: string, tenantId: string) {
    return this.clockRepo.find({
      where: { shiftId, tenantId },
      order: { recordedAt: 'ASC' },
    });
  }
}
