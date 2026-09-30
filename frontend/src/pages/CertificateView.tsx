import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import StatusBadge from '../components/StatusBadge';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import type { Certificate, Verification } from '../types';

interface CertificateWithVerification extends Certificate {
  verificationUrl: string;
  verification: Verification;
}

export default function CertificateView() {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();
  const [certificate, setCertificate] = useState<CertificateWithVerification | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .get(`/certificates/${id}`)
      .then((res) => setCertificate(res.data.certificate))
      .catch(() => showToast('Could not load certificate.', 'error'))
      .finally(() => setLoading(false));

    api
      .get(`/certificates/${id}/qr`, { responseType: 'blob' })
      .then((res) => setQrUrl(URL.createObjectURL(res.data)))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function downloadPdf() {
    if (!id) return;
    setDownloading(true);
    try {
      const res = await api.get(`/certificates/${id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${certificate?.certificateNumber || 'certificate'}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      showToast('Certificate PDF is not available yet.', 'error');
    } finally {
      setDownloading(false);
    }
  }

  if (loading) {
    return (
      <AppLayout title="Certificate" breadcrumb={['Home', 'Certificate']}>
        <p className="text-sm text-navy-400">Loading…</p>
      </AppLayout>
    );
  }
  if (!certificate) {
    return (
      <AppLayout title="Certificate" breadcrumb={['Home', 'Certificate']}>
        <p className="text-sm text-fail-600">Certificate not found.</p>
      </AppLayout>
    );
  }

  const inst = certificate.verification.instrument;

  return (
    <AppLayout title={certificate.certificateNumber} breadcrumb={['Home', 'Certificate']}>
      <div className="mx-auto max-w-3xl rounded-xl border border-line bg-white p-8 shadow-card">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">Government of India</p>
          <p className="text-lg font-semibold text-navy-800">Department of Legal Metrology</p>
          <p className="mt-1 text-sm text-navy-400">Certificate of Verification</p>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2">
          <StatusBadge status={certificate.status} />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <Row label="Certificate Number" value={certificate.certificateNumber} mono />
          <Row label="Verification Number" value={certificate.verification.verificationNumber} mono />
          <Row label="Instrument Type" value={inst?.instrumentType} />
          <Row label="Manufacturer" value={inst?.manufacturer} />
          <Row label="Model" value={inst?.model} />
          <Row label="Serial Number" value={inst?.serialNumber} mono />
          <Row label="Owner / Business" value={inst?.business?.businessName} />
          <Row label="Verification Officer" value={certificate.verification.officer?.name} />
          <Row label="Issue Date" value={new Date(certificate.issueDate).toLocaleDateString('en-IN')} />
          <Row label="Valid Until" value={new Date(certificate.validUntil).toLocaleDateString('en-IN')} />
        </div>

        <div className="mt-8 flex flex-col items-center gap-3 border-t border-line pt-6">
          {qrUrl ? (
            <img src={qrUrl} alt="Certificate QR code" className="h-40 w-40 rounded-lg border border-line p-2" />
          ) : (
            <div className="flex h-40 w-40 items-center justify-center rounded-lg border border-line text-xs text-navy-400">
              QR unavailable
            </div>
          )}
          <p className="text-xs text-navy-400">Scan this QR to verify the certificate publicly, or visit:</p>
          <a href={certificate.verificationUrl} target="_blank" rel="noreferrer" className="font-mono text-xs text-teal-600 hover:underline break-all">
            {certificate.verificationUrl}
          </a>
        </div>

        <div className="mt-6 flex justify-center">
          <button
            onClick={downloadPdf}
            disabled={downloading}
            className="rounded-lg bg-navy-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-navy-600 disabled:opacity-60"
          >
            {downloading ? 'Preparing PDF…' : 'Download Certificate PDF'}
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-navy-300">
          Certificate authenticity confirmed by the Online Verification System.
        </p>
      </div>

      <div className="mx-auto mt-4 max-w-3xl text-center">
        <Link to={`/instruments/${inst?.id}`} className="text-xs text-teal-600 hover:underline">
          ← Back to instrument
        </Link>
      </div>
    </AppLayout>
  );
}

function Row({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="flex justify-between border-b border-line/70 pb-2">
      <span className="text-navy-400">{label}</span>
      <span className={`text-navy-800 ${mono ? 'font-mono text-xs' : ''}`}>{value || '—'}</span>
    </div>
  );
}
