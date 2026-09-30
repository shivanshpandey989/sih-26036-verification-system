import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../api/client';

interface PublicResult {
  success: boolean;
  valid: boolean;
  status: 'VALID' | 'EXPIRED' | 'REVOKED';
  certificate?: { certificateNumber: string; issueDate: string; validUntil: string };
  verification?: { verificationNumber: string; verificationDate: string };
  instrument?: { instrumentNumber: string; instrumentType: string; manufacturer: string; model: string; serialNumber: string };
  business?: { businessName: string; ownerName: string };
  authority?: { officer: string; role: string; organisation?: string };
  message?: string;
}

export default function VerifyPublic() {
  const { token } = useParams<{ token: string }>();
  const [result, setResult] = useState<PublicResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) return;
    // Intentionally uses a plain axios call (not the authenticated `api`
    // client) since this page must work without any login/JWT — anyone
    // scanning the QR code lands here.
    axios
      .get(`${API_BASE_URL}/verify/${token}`)
      .then((res) => setResult(res.data))
      .catch((err) => {
        if (err?.response?.data) {
          setResult(err.response.data);
        } else {
          setErrorMsg('Could not reach the verification service. Please try again.');
        }
      })
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="min-h-screen bg-navy-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-xl">
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-saffron-500 font-mono text-sm font-semibold text-navy-900">
            LM
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">Legal Metrology Certificate</p>
        </div>

        {loading && <p className="text-center text-sm text-navy-400">Verifying certificate…</p>}
        {errorMsg && <p className="text-center text-sm text-fail-600">{errorMsg}</p>}

        {!loading && result && !result.success && (
          <div className="text-center">
            <p className="text-2xl">✕</p>
            <p className="mt-2 text-lg font-semibold text-fail-600">INVALID CERTIFICATE</p>
            <p className="mt-1 text-sm text-navy-400">{result.message || 'This certificate could not be found.'}</p>
          </div>
        )}

        {!loading && result?.success && result.status === 'EXPIRED' && (
          <div className="text-center">
            <p className="text-2xl">⚠</p>
            <p className="mt-2 text-lg font-semibold text-warn-600">CERTIFICATE EXPIRED</p>
          </div>
        )}

        {!loading && result?.success && result.status === 'VALID' && (
          <div className="text-center">
            <p className="text-2xl text-pass-600">✓</p>
            <p className="mt-2 text-lg font-semibold text-pass-600">Certificate Verified</p>
          </div>
        )}

        {!loading && result?.success && (
          <div className="mt-6 space-y-2 border-t border-line pt-5 text-sm">
            <Row label="Certificate Number" value={result.certificate?.certificateNumber} mono />
            <Row label="Instrument ID" value={result.instrument?.instrumentNumber} mono />
            <Row label="Instrument Type" value={result.instrument?.instrumentType} />
            <Row label="Manufacturer" value={result.instrument?.manufacturer} />
            <Row label="Model" value={result.instrument?.model} />
            <Row label="Serial Number" value={result.instrument?.serialNumber} mono />
            <Row label="Owner / Business" value={result.business?.businessName} />
            <Row
              label="Verification Date"
              value={result.verification?.verificationDate ? new Date(result.verification.verificationDate).toLocaleDateString('en-IN') : '—'}
            />
            <Row
              label="Valid Until"
              value={result.certificate?.validUntil ? new Date(result.certificate.validUntil).toLocaleDateString('en-IN') : '—'}
            />
            <Row label="Verification Authority" value={result.authority ? `${result.authority.officer} (${result.authority.role})` : '—'} />
            <Row label="Status" value={result.status} />
          </div>
        )}

        <p className="mt-6 text-center text-xs text-navy-300">
          Certificate authenticity confirmed by the Online Verification System.
        </p>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="flex justify-between border-b border-line/70 pb-2">
      <span className="text-navy-400">{label}</span>
      <span className={`text-navy-800 font-medium ${mono ? 'font-mono text-xs' : ''}`}>{value || '—'}</span>
    </div>
  );
}
