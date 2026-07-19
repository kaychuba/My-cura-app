export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  AGENCY_OWNER = 'agency_owner',
  MANAGER = 'manager',
  CARE_WORKER = 'care_worker',
  SERVICE_USER = 'service_user',
  FAMILY = 'family',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

export enum ShiftType {
  PERSONAL_CARE = 'personal_care',
  MEDICATION = 'medication',
  SOCIAL = 'social',
  OVERNIGHT = 'overnight',
  SLEEP_IN = 'sleep_in',
  WAKING_NIGHT = 'waking_night',
  LIVE_IN = 'live_in',
  SUPPORTED_LIVING = 'supported_living',
  EMERGENCY_COVER = 'emergency_cover',
}

export enum ShiftStatus {
  UNASSIGNED = 'unassigned',
  ASSIGNED = 'assigned',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

export enum ClockEventType {
  CLOCK_IN = 'clock_in',
  CLOCK_OUT = 'clock_out',
  BREAK_START = 'break_start',
  BREAK_END = 'break_end',
}

export enum MARStatus {
  /** Admin has scheduled this dose; awaiting the carer's outcome. */
  SCHEDULED = 'scheduled',
  GIVEN = 'given',
  PARENT_ADMINISTERED = 'parent_administered',
  REFUSED = 'refused',
  NOT_ADMINISTERED = 'not_administered',
  OTHER = 'other',
  NOT_AVAILABLE = 'not_available',
  SELF_ADMINISTERED = 'self_administered',
  ADMINISTERED_BY_GP = 'administered_by_gp',
  WASTE = 'waste',
}

export enum MedicationFormulation {
  TABLET = 'tablet',
  CAPSULE = 'capsule',
  LIQUID = 'liquid',
  POWDER = 'powder',
  SUPPOSITORY = 'suppository',
  CREAM = 'cream',
  OINTMENT = 'ointment',
  PATCH = 'patch',
  INHALER = 'inhaler',
  DROPS = 'drops',
  INJECTION = 'injection',
  SPRAY = 'spray',
}

export enum LeaveType {
  ANNUAL = 'annual',
  SICK = 'sick',
  MATERNITY = 'maternity',
  PATERNITY = 'paternity',
  SHARED_PARENTAL = 'shared_parental',
  COMPASSIONATE = 'compassionate',
  EMERGENCY = 'emergency',
  TRAINING = 'training',
  UNPAID = 'unpaid',
  JURY_DUTY = 'jury_duty',
}

export enum LeaveStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  DECLINED = 'declined',
  CANCELLED = 'cancelled',
}

export enum IncidentType {
  FALL = 'fall',
  PRESSURE_ULCER = 'pressure_ulcer',
  MEDICATION_ERROR = 'medication_error',
  SAFEGUARDING = 'safeguarding',
  AGGRESSION = 'aggression',
  PROPERTY_DAMAGE = 'property_damage',
  NEAR_MISS = 'near_miss',
  HOSPITAL_ADMISSION = 'hospital_admission',
  OTHER = 'other',
}

export enum IncidentSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum EscalationLevel {
  NONE = 'none',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum Country {
  UK = 'UK',
  US = 'US',
}

export enum SubscriptionTier {
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
}

export enum EmploymentType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  ZERO_HOURS = 'zero_hours',
  CONTRACTOR = 'contractor',
  BANK = 'bank',
}

export enum ExpenseType {
  MILEAGE = 'mileage',
  PARKING = 'parking',
  TOLL = 'toll',
  FOOD = 'food',
  ACCOMMODATION = 'accommodation',
  OTHER = 'other',
}

export enum DocumentType {
  CONTRACT = 'contract',
  DBS = 'dbs',
  PASSPORT = 'passport',
  VISA = 'visa',
  TRAINING_CERTIFICATE = 'training_certificate',
  CARE_PLAN = 'care_plan',
  RISK_ASSESSMENT = 'risk_assessment',
  PAYSLIP = 'payslip',
  P60 = 'p60',
  P45 = 'p45',
  W2 = 'w2',
  OTHER = 'other',
}

export enum PayrollStatus {
  DRAFT = 'draft',
  PROCESSING = 'processing',
  APPROVED = 'approved',
  PAID = 'paid',
  LOCKED = 'locked',
}

export enum InvoiceStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  PAID = 'paid',
  OVERDUE = 'overdue',
  VOID = 'void',
}

export enum MedicationRoute {
  ORAL = 'oral',
  TOPICAL = 'topical',
  INHALED = 'inhaled',
  SUBCUTANEOUS = 'subcutaneous',
  INTRAVENOUS = 'intravenous',
  RECTAL = 'rectal',
  TRANSDERMAL = 'transdermal',
  NASAL = 'nasal',
  OCULAR = 'ocular',
  OTIC = 'otic',
}

export enum TrainingType {
  MANUAL_HANDLING = 'manual_handling',
  FIRE_SAFETY = 'fire_safety',
  SAFEGUARDING = 'safeguarding',
  FOOD_HYGIENE = 'food_hygiene',
  INFECTION_CONTROL = 'infection_control',
  FIRST_AID = 'first_aid',
  CPR = 'cpr',
  MEDICATION = 'medication',
  DEMENTIA = 'dementia',
  MENTAL_HEALTH = 'mental_health',
  DATA_PROTECTION = 'data_protection',
  LONE_WORKING = 'lone_working',
  OTHER = 'other',
}

export enum NotificationType {
  SHIFT_ASSIGNED = 'shift_assigned',
  SHIFT_CANCELLED = 'shift_cancelled',
  CLOCK_IN_REMINDER = 'clock_in_reminder',
  MEDICATION_DUE = 'medication_due',
  MEDICATION_MISSED = 'medication_missed',
  LEAVE_REQUEST_UPDATE = 'leave_request_update',
  INCIDENT_ESCALATION = 'incident_escalation',
  DOCUMENT_EXPIRY = 'document_expiry',
  TRAINING_EXPIRY = 'training_expiry',
  PAYSLIP_READY = 'payslip_ready',
  MESSAGE_RECEIVED = 'message_received',
  EMERGENCY_BROADCAST = 'emergency_broadcast',
}

export enum ConsentType {
  CARE_AND_SUPPORT = 'care_and_support',
  DATA_PROCESSING = 'data_processing',
  DATA_SHARING = 'data_sharing',
  MEDICATION = 'medication',
  PHOTOGRAPHY = 'photography',
}

export enum ConsentStatus {
  GRANTED = 'granted',
  REFUSED = 'refused',
  WITHDRAWN = 'withdrawn',
}

/** Who made the consent decision (Mental Capacity Act framing). */
export enum ConsentGivenBy {
  SELF = 'self',
  ATTORNEY = 'attorney',
  DEPUTY = 'deputy',
  BEST_INTERESTS = 'best_interests',
}
