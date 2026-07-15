import { UserRole, EmploymentType } from './enums';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  tenantId: string;
  partial?: boolean;
  /** True when the session was established with (or after) MFA enrollment. */
  mfa?: boolean;
  iat?: number;
  exp?: number;
}

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  tenantId: string;
  firstName: string;
  lastName: string;
}

export interface TenantSettings {
  locale: 'en-GB' | 'en-US';
  timezone: string;
  country: 'UK' | 'US';
  payFrequency: 'weekly' | 'biweekly' | 'monthly';
  gpsRadiusMetres: number;
  clockInWindowMinutes: number;
  primaryColour?: string;
  logoUrl?: string;
  brandName?: string;
}

export interface CareWorkerProfile {
  id: string;
  userId: string;
  tenantId: string;
  employeeId?: string;
  employmentType: EmploymentType;
  hourlyRate: number;
  weekendRate?: number;
  bankHolidayRate?: number;
  sleepInRate?: number;
  startDate?: string;
  skills: string[];
  dbsExpiresAt?: string;
  rtwExpiresAt?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  message: string;
  statusCode: number;
  errors?: Record<string, string[]>;
}
