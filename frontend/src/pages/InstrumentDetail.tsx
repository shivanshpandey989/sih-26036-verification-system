import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import StatusBadge from '../components/StatusBadge';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { Instrument } from '../types';

const WORKFLOW_STEPS = [
  'Instrument Registered',
  'Application Received',
  'Officer Assigned',
  'Verification Scheduled',
  'Observations Entered',
  'Verification Completed',
  'Certificate Issued',
];

export default function InstrumentDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [instrument, setInstrument] = useState<Instrument | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  const canVerify = user?.role === 'ADMIN' || user?.role === 'LMO' || user?.role === 'GATC';

  function load() {
    setLoading(true);
    api
      .get(`/instruments/${id}`)
      .then((res) => setInstrument(res.data.instrument))
      .catch(() => showToast('Could not load instrument.', 'error'))
      .finally(() => setLoading(false));
  }

  useEffect(load, [id]);

  const ongoing = instrument?.verifications?.find((v) => v.status !== 'COMPLETED' && v.status !== 'CANCELLED');

  async function startVerification() {
    setStarting(true);
    try {
      const res = await api.post('/verifications', { instrumentId: id });
      navigate(`/verifications/${res.data.verification.id}`);
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Could not start verification.', 'error');
    } finally {
      setStarting(false);
    }
  }

  if (loading) {
    return (
      <AppLayout title="Instrument" breadcrumb={['Home', 'Instruments']}>
        <p className="text-sm text-navy-400">Loading…</p>
      </AppLayout>
    );
  }
  if (!instrument) {
    return (
      <AppLayout title="Instrument" breadcrumb={['Home', 'Instruments']}>
        <p className="text-sm text-fail-600">Instrument not found.</p>
      </AppLayout>
    );
  }

  const currentStepIndex = instrument.currentStatus === 'PENDING_VERIFICATION'
    ? (ongoing ? 4 : 1)
    : instrument.currentStatus === 'VALID' || instrument.currentStatus === 'EXPIRING_SOON'
    ? 6
    : instrument.currentStatus === 'FAILED'
    ? 5
    : 0;

  return (
    <AppLayout title={instrument.instrumentNumber} breadcrumb={['Home', 'Instruments', instrument.instrumentNumber]}>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4 rounded-xl border border-line bg-white p-5 shadow-card">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-navy-800">{instrument.instrumentType}</h2>
            <StatusBadge status={instrument.currentStatus} />
          </div>
          <p className="mt-1 text-sm text-navy-400">
            {instrument.manufacturer} · {instrument.model} · S/N {instrument.serialNumber}
          </p>
        </div>
        {canVerify && (
          ongoing ? (
            <Link
              to={`/verifications/${ongoing.id}`}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500"
            >
              Continue Verification
            </Link>
          ) : (
            <button
              onClick={startVerification}
              disabled={starting}
              className="rounded-lg bg-navy-700 px-4 py-2 text-sm font-medium text-white hover:bg-navy-600 disabled:opacity-60"
            >
              {starting ? 'Starting…' : 'Start Verification'}
            </button>
          )
        )}
      </div>

      {/* Workflow visualisation */}
      <div className="mb-6 rounded-xl border border-line bg-white p-5 shadow-card">
        <p className="mb-4 text-sm font-medium text-navy-700">Verification Workflow</p>
        <div className="flex flex-wrap items-center gap-1">
          {WORKFLOW_STEPS.map((step, i) => (
            <div key={step} className="flex items-center">
              <div
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${
                  i <= currentStepIndex
                    ? 'border-teal-500/40 bg-teal-50 text-teal-600'
                    : 'border-line bg-navy-50 text-navy-400'
                }`}
              >
                <span className="font-mono">{i + 1}</span>
                <span>{step}</span>
              </div>
              {i < WORKFLOW_STEPS.length - 1 && <span className="mx-1 text-navy-300">→</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-line bg-white p-5 shadow-card lg:col-span-1">
          <p className="mb-3 text-sm font-medium text-navy-700">Instrument Information</p>
          <dl className="space-y-2 text-sm">
            {[
              ['Capacity', instrument.capacity],
              ['Accuracy Class', instrument.accuracyClass],
              ['Location', instrument.location],
              ['Registration Date', new Date(instrument.registrationDate).toLocaleDateString('en-IN')],
              ['Next Verification', instrument.nextVerificationDate ? new Date(instrument.nextVerificationDate).toLocaleDateString('en-IN') : '—'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-line/70 pb-2">
                <dt className="text-navy-400">{k}</dt>
                <dd className="text-navy-800">{v}</dd>
              </div>
            ))}
          </dl>

          <p className="mb-3 mt-5 text-sm font-medium text-navy-700">Owner / Business</p>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between border-b border-line/70 pb-2">
              <dt className="text-navy-400">Business Name</dt>
              <dd className="text-navy-800">{instrument.business?.businessName}</dd>
            </div>
            <div className="flex justify-between border-b border-line/70 pb-2">
              <dt className="text-navy-400">Owner</dt>
              <dd className="text-navy-800">{instrument.business?.ownerName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-navy-400">Phone</dt>
              <dd className="text-navy-800">{instrument.business?.phone}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border border-line bg-white shadow-card lg:col-span-2">
          <div className="border-b border-line px-4 py-3">
            <p className="text-sm font-medium text-navy-700">Verification History</p>
          </div>
          <div className="table-scroll">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs text-navy-400">
                  <th className="px-4 py-2 font-medium">Verification No.</th>
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 font-medium">Officer</th>
                  <th className="px-4 py-2 font-medium">Result</th>
                  <th className="px-4 py-2 font-medium">Certificate</th>
                  <th className="px-4 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {(!instrument.verifications || instrument.verifications.length === 0) && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-navy-400">No verifications yet.</td></tr>
                )}
                {instrument.verifications?.map((v) => (
                  <tr key={v.id} className="border-b border-line last:border-0 hover:bg-navy-50/50">
                    <td className="px-4 py-2 font-mono text-xs">{v.verificationNumber}</td>
                    <td className="px-4 py-2 text-navy-400">
                      {new Date(v.completedAt || v.startedAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-4 py-2">{v.officer?.name}</td>
                    <td className="px-4 py-2"><StatusBadge status={v.status === 'COMPLETED' ? v.result : v.status} /></td>
                    <td className="px-4 py-2 font-mono text-xs">{v.certificate?.certificateNumber || '—'}</td>
                    <td className="px-4 py-2 text-right">
                      {user?.role === 'BUSINESS' && v.certificate ? (
                        <Link to={`/certificates/${v.certificate.id}`} className="text-teal-600 hover:underline text-xs font-medium">
                          View Certificate →
                        </Link>
                      ) : (
                        <Link to={`/verifications/${v.id}`} className="text-teal-600 hover:underline text-xs font-medium">
                          View →
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
