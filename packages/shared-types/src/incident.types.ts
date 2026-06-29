import { IncidentType, IncidentSeverity } from './enums';

export interface IncidentReport {
  id: string;
  tenantId: string;
  serviceUserId: string;
  reportedBy: string;
  incidentType: IncidentType;
  severity: IncidentSeverity;
  occurredAt: string;
  location: string;
  description: string;
  immediateAction: string;
  witnesses: Array<{ name: string; role: string; contact?: string }>;
  injuriesSustained: string;
  notifiedPersons: Array<{ name: string; role: string; notifiedAt: string }>;
  regulatorNotified: boolean;
  status: 'open' | 'investigating' | 'closed';
}
