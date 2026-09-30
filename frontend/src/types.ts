export type Role = 'ADMIN' | 'LMO' | 'GATC' | 'BUSINESS';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: Role;
  organisation?: string | null;
}

export interface Business {
  id: string;
  businessName: string;
  ownerName: string;
  address: string;
  phone: string;
  email: string;
}

export type InstrumentStatus =
  | 'VALID'
  | 'EXPIRING_SOON'
  | 'EXPIRED'
  | 'PENDING_VERIFICATION'
  | 'FAILED';

export interface Instrument {
  id: string;
  instrumentNumber: string;
  instrumentType: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  capacity: string;
  accuracyClass: string;
  location: string;
  businessId: string;
  business?: Business;
  registrationDate: string;
  currentStatus: InstrumentStatus;
  nextVerificationDate?: string | null;
  verifications?: Verification[];
}

export type ObservationStatus = 'PASS' | 'FAIL' | 'PENDING';

export interface Observation {
  id: string;
  verificationId: string;
  parameter: string;
  observationValue?: string | null;
  unit?: string | null;
  expectedValue?: string | null;
  minValue?: number | null;
  maxValue?: number | null;
  status: ObservationStatus;
  remarks?: string | null;
  enteredAt?: string | null;
}

export type VerificationStatus = 'DRAFT' | 'IN_PROGRESS' | 'SUBMITTED' | 'COMPLETED' | 'CANCELLED';
export type VerificationResult = 'PASS' | 'FAIL' | 'PENDING';

export interface Verification {
  id: string;
  instrumentId: string;
  officerId: string;
  officer?: { id?: string; name: string; role: Role };
  verificationNumber: string;
  applicationNumber: string;
  verificationType: 'INITIAL' | 'RE_VERIFICATION' | 'STAMPING';
  status: VerificationStatus;
  startedAt: string;
  completedAt?: string | null;
  result: VerificationResult;
  remarks?: string | null;
  observations: Observation[];
  instrument?: Instrument;
  certificate?: Certificate | null;
}

export interface Certificate {
  id: string;
  certificateNumber: string;
  verificationId: string;
  issueDate: string;
  validUntil: string;
  status: 'VALID' | 'EXPIRED' | 'REVOKED';
  qrToken: string;
  pdfPath?: string | null;
}

export interface DashboardStats {
  totalInstruments: number;
  pendingVerifications: number;
  completedVerifications: number;
  validCertificates: number;
  expiringSoon: number;
  expiredCertificates: number;
  passed: number;
  failed: number;
}

export interface RecentActivityRow {
  id: string;
  instrument: string;
  instrumentType: string;
  verificationNumber: string;
  officer: string;
  date: string;
  result: VerificationResult;
  status: VerificationStatus;
}

export interface AuditLogRow {
  id: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  timestamp: string;
  metadata?: Record<string, unknown> | null;
  user?: { name: string; role: Role } | null;
}
