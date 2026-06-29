import { MARStatus, MedicationRoute } from './enums';

export interface MedicationSchedule {
  medicationId: string;
  name: string;
  dosage: string;
  route: MedicationRoute;
  timesOfDay: string[];
  isControlled: boolean;
  barcode?: string;
}

export interface MARRecord {
  id: string;
  medicationId: string;
  medicationName: string;
  dosage: string;
  scheduledAt: string;
  administeredAt?: string;
  status: MARStatus;
  careWorkerId: string;
  notes?: string;
  barcodeVerified: boolean;
}

export interface MARChartData {
  serviceUserName: string;
  month: number;
  year: number;
  medications: Array<{
    id: string;
    name: string;
    dosage: string;
    route: string;
    records: Array<{
      day: number;
      time: string;
      status: MARStatus;
      administeredBy?: string;
    }>;
  }>;
}

export interface DailyMARSummary {
  date: string;
  totalScheduled: number;
  totalGiven: number;
  totalRefused: number;
  totalMissed: number;
  totalOther: number;
}
