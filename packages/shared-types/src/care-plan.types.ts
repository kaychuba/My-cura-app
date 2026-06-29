export interface CarePlanSection {
  personalCare: string;
  nutrition: string;
  mobility: string;
  continence: string;
  communication: string;
  sleep: string;
  socialAndWellbeing: string;
  medicationManagement: string;
  behaviourSupport?: string;
  palliativeCare?: string;
}

export interface RiskAssessment {
  riskTitle: string;
  riskDescription: string;
  likelihoodScore: 1 | 2 | 3 | 4 | 5;
  impactScore: 1 | 2 | 3 | 4 | 5;
  controlMeasures: string;
  reviewDate: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  isPrimaryContact: boolean;
  hasPortalAccess: boolean;
}
