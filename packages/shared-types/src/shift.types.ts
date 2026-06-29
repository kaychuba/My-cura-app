import { ShiftType, ShiftStatus, ClockEventType } from './enums';

export interface ShiftLocation {
  line1: string;
  line2?: string;
  city: string;
  postcode: string;
  lat: number;
  lon: number;
}

export interface ShiftSummary {
  id: string;
  tenantId: string;
  serviceUserId: string;
  careWorkerId?: string;
  scheduledStart: string;
  scheduledEnd: string;
  shiftType: ShiftType;
  status: ShiftStatus;
  location?: ShiftLocation;
}

export interface ClockInRequest {
  shiftId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  deviceId: string;
  eventType: ClockEventType;
  timestamp: string;
}

export interface ClockInResponse {
  success: boolean;
  eventId: string;
  gpsDistanceMetres: number;
  fraudFlag: boolean;
  message?: string;
}

export interface TimeSheet {
  shiftId: string;
  careWorkerId: string;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart?: string;
  actualEnd?: string;
  breakMinutes: number;
  totalHours: number;
  status: string;
}
