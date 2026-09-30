type BadgeStatus =
  | 'VALID'
  | 'EXPIRING_SOON'
  | 'EXPIRED'
  | 'PENDING_VERIFICATION'
  | 'FAILED'
  | 'PASS'
  | 'FAIL'
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'DRAFT'
  | 'SUBMITTED'
  | 'CANCELLED'
  | 'REVOKED';

const STYLES: Record<string, string> = {
  VALID: 'bg-pass-50 text-pass-600 border-pass-500/30',
  PASS: 'bg-pass-50 text-pass-600 border-pass-500/30',
  COMPLETED: 'bg-pass-50 text-pass-600 border-pass-500/30',
  EXPIRING_SOON: 'bg-warn-50 text-warn-600 border-warn-500/30',
  PENDING: 'bg-warn-50 text-warn-600 border-warn-500/30',
  PENDING_VERIFICATION: 'bg-warn-50 text-warn-600 border-warn-500/30',
  IN_PROGRESS: 'bg-warn-50 text-warn-600 border-warn-500/30',
  DRAFT: 'bg-navy-50 text-navy-600 border-navy-200',
  SUBMITTED: 'bg-teal-50 text-teal-600 border-teal-400/30',
  EXPIRED: 'bg-fail-50 text-fail-600 border-fail-500/30',
  FAILED: 'bg-fail-50 text-fail-600 border-fail-500/30',
  FAIL: 'bg-fail-50 text-fail-600 border-fail-500/30',
  CANCELLED: 'bg-navy-50 text-navy-600 border-navy-200',
  REVOKED: 'bg-fail-50 text-fail-600 border-fail-500/30',
};

const LABELS: Record<string, string> = {
  VALID: 'Valid',
  PASS: 'Passed',
  COMPLETED: 'Completed',
  EXPIRING_SOON: 'Expiring Soon',
  PENDING: 'Pending',
  PENDING_VERIFICATION: 'Pending Verification',
  IN_PROGRESS: 'In Progress',
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  EXPIRED: 'Expired',
  FAILED: 'Failed',
  FAIL: 'Failed',
  CANCELLED: 'Cancelled',
  REVOKED: 'Revoked',
};

export default function StatusBadge({ status }: { status: BadgeStatus | string }) {
  const style = STYLES[status] || 'bg-navy-50 text-navy-600 border-navy-200';
  const label = LABELS[status] || status;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${style}`}>
      {label}
    </span>
  );
}
