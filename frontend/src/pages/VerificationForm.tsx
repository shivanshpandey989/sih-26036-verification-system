import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import StatusBadge from '../components/StatusBadge';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import type { Verification, Observation } from '../types';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const AUTOSAVE_DELAY_MS = 700;

export default function VerificationForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [verification, setVerification] = useState<Verification | null>(null);
  const [loading, setLoading] = useState(true);
  const [remarks, setRemarks] = useState('');
  const [completing, setCompleting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  function load() {
    if (!id) return;
    setLoading(true);
    api
      .get(`/verifications/${id}`)
      .then((res) => {
        setVerification(res.data.verification);
        setRemarks(res.data.verification.remarks || '');
      })
      .catch(() => showToast('Could not load verification.', 'error'))
      .finally(() => setLoading(false));
  }

  // Load on mount, and again if the browser tab regains focus — this is
  // what demonstrates "close the browser, reopen, observations are still
  // there" pulling straight from PostgreSQL rather than local state.
  useEffect(load, [id]);

  function patchObservationLocal(obsId: string, patch: Partial<Observation>) {
    setVerification((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        observations: prev.observations.map((o) => (o.id === obsId ? { ...o, ...patch } : o)),
      };
    });
  }

  const readOnly = verification?.status === 'COMPLETED' || verification?.status === 'CANCELLED';

  const allResolved = useMemo(
    () => !!verification && verification.observations.length > 0 && verification.observations.every((o) => o.status !== 'PENDING'),
    [verification]
  );
  const anyFail = useMemo(
    () => !!verification && verification.observations.some((o) => o.status === 'FAIL'),
    [verification]
  );

  async function saveDraft() {
    if (!id) return;
    setSavingDraft(true);
    try {
      await api.put(`/verifications/${id}`, { remarks });
      showToast('Draft saved.', 'success');
    } catch {
      showToast('Could not save draft.', 'error');
    } finally {
      setSavingDraft(false);
    }
  }

  async function completeVerification() {
    if (!id) return;
    setCompleting(true);
    try {
      const res = await api.post(`/verifications/${id}/complete`, { remarks });
      setVerification(res.data.verification);
      showToast(
        res.data.verification.result === 'PASS'
          ? 'Verification passed. Certificate generated.'
          : 'Verification completed — instrument failed.',
        res.data.verification.result === 'PASS' ? 'success' : 'error'
      );
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Could not complete verification.', 'error');
    } finally {
      setCompleting(false);
    }
  }

  if (loading) {
    return (
      <AppLayout title="Verification" breadcrumb={['Home', 'Verification']}>
        <p className="text-sm text-navy-400">Loading…</p>
      </AppLayout>
    );
  }
  if (!verification) {
    return (
      <AppLayout title="Verification" breadcrumb={['Home', 'Verification']}>
        <p className="text-sm text-fail-600">Verification not found.</p>
      </AppLayout>
    );
  }

  const inst = verification.instrument;

  return (
    <AppLayout title={verification.verificationNumber} breadcrumb={['Home', 'Instruments', inst?.instrumentNumber || '', 'Verification']}>
      {/* Header info */}
      <div className="mb-6 rounded-xl border border-line bg-white p-5 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-navy-800">Verification Details</h2>
          <StatusBadge status={verification.status === 'COMPLETED' ? verification.result : verification.status} />
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-4">
          <Field label="Verification No." value={verification.verificationNumber} mono />
          <Field label="Application No." value={verification.applicationNumber} mono />
          <Field label="Instrument ID" value={inst?.instrumentNumber} mono />
          <Field label="Instrument Type" value={inst?.instrumentType} />
          <Field label="Manufacturer" value={inst?.manufacturer} />
          <Field label="Model" value={inst?.model} />
          <Field label="Serial Number" value={inst?.serialNumber} mono />
          <Field label="Business / Owner" value={inst?.business?.businessName} />
          <Field label="Location" value={inst?.location} />
          <Field label="Officer" value={verification.officer?.name} />
          <Field label="Date" value={new Date(verification.startedAt).toLocaleDateString('en-IN')} />
        </div>
      </div>

      {/* Observation table */}
      <div className="mb-6 rounded-xl border border-line bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <p className="text-sm font-medium text-navy-700">Observations</p>
          {!readOnly && <p className="text-xs text-navy-400">Each field autosaves automatically.</p>}
        </div>
        <div className="table-scroll">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs text-navy-400">
                <th className="px-4 py-2 font-medium">Parameter</th>
                <th className="px-4 py-2 font-medium">Expected</th>
                <th className="px-4 py-2 font-medium">Observation</th>
                <th className="px-4 py-2 font-medium">Remarks</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Saved</th>
              </tr>
            </thead>
            <tbody>
              {verification.observations.map((obs) => (
                <ObservationRow
                  key={obs.id}
                  observation={obs}
                  readOnly={!!readOnly}
                  onLocalChange={(patch) => patchObservationLocal(obs.id, patch)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Overall remarks + actions */}
      <div className="rounded-xl border border-line bg-white p-5 shadow-card">
        <label className="mb-1 block text-sm font-medium text-navy-700">Overall Remarks</label>
        <textarea
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          disabled={!!readOnly}
          rows={3}
          className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-teal-500 disabled:bg-navy-50"
          placeholder="Overall remarks for this verification…"
        />

        {!readOnly && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={saveDraft}
              disabled={savingDraft}
              className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-navy-600 hover:bg-navy-50 disabled:opacity-60"
            >
              {savingDraft ? 'Saving…' : 'Save Draft'}
            </button>

            <div className="flex items-center gap-3">
              {!allResolved && (
                <span className="text-xs text-warn-600">All observations must be entered to complete.</span>
              )}
              <button
                onClick={completeVerification}
                disabled={completing || !allResolved}
                className="rounded-lg bg-navy-700 px-5 py-2 text-sm font-medium text-white hover:bg-navy-600 disabled:opacity-50"
              >
                {completing ? 'Completing…' : 'Complete Verification'}
              </button>
            </div>
          </div>
        )}

        {readOnly && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-navy-700">Result:</span>
              {verification.result === 'PASS' ? (
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-pass-600">✓ VERIFIED / PASSED</span>
              ) : (
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-fail-600">✕ FAILED</span>
              )}
            </div>
            {verification.certificate && (
              <Link
                to={`/certificates/${verification.certificate.id}`}
                className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500"
              >
                View Certificate & QR →
              </Link>
            )}
          </div>
        )}

        {anyFail && !readOnly && (
          <p className="mt-3 text-xs text-fail-600">
            One or more observations are currently outside tolerance. The instrument will be marked FAILED if completed as-is.
          </p>
        )}
      </div>
    </AppLayout>
  );
}

function Field({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-navy-400">{label}</dt>
      <dd className={`text-navy-800 ${mono ? 'font-mono text-xs' : ''}`}>{value || '—'}</dd>
    </div>
  );
}

function ObservationRow({
  observation,
  readOnly,
  onLocalChange,
}: {
  observation: Observation;
  readOnly: boolean;
  onLocalChange: (patch: Partial<Observation>) => void;
}) {
  const { showToast } = useToast();
  const [value, setValue] = useState(observation.observationValue || '');
  const [remarks, setRemarksLocal] = useState(observation.remarks || '');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSentRef = useRef({ value: observation.observationValue || '', remarks: observation.remarks || '' });

  const save = useCallback(
    async (nextValue: string, nextRemarks: string) => {
      setSaveState('saving');
      try {
        const res = await api.put(`/observations/${observation.id}`, {
          observationValue: nextValue,
          remarks: nextRemarks,
        });
        lastSentRef.current = { value: nextValue, remarks: nextRemarks };
        setSaveState('saved');
        setSavedAt(res.data.savedAt);
        onLocalChange({ status: res.data.observation.status, observationValue: nextValue, remarks: nextRemarks });
      } catch (err) {
        setSaveState('error');
      }
    },
    [observation.id, onLocalChange]
  );

  function scheduleSave(nextValue: string, nextRemarks: string) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => save(nextValue, nextRemarks), AUTOSAVE_DELAY_MS);
  }

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function retry() {
    save(value, remarks);
  }

  return (
    <tr className="border-b border-line last:border-0 align-top">
      <td className="px-4 py-2.5 font-medium text-navy-800">{observation.parameter}</td>
      <td className="px-4 py-2.5 text-navy-400">
        {observation.expectedValue ?? '—'} {observation.unit || ''}
      </td>
      <td className="px-4 py-2.5">
        <input
          value={value}
          disabled={readOnly}
          onChange={(e) => {
            const v = e.target.value;
            setValue(v);
            scheduleSave(v, remarks);
          }}
          placeholder={observation.unit ? `Value in ${observation.unit}` : 'Value'}
          className="w-28 rounded-md border border-line px-2 py-1 text-sm outline-none focus:border-teal-500 disabled:bg-navy-50"
        />
      </td>
      <td className="px-4 py-2.5">
        <input
          value={remarks}
          disabled={readOnly}
          onChange={(e) => {
            const v = e.target.value;
            setRemarksLocal(v);
            scheduleSave(value, v);
          }}
          placeholder="Optional remarks"
          className="w-40 rounded-md border border-line px-2 py-1 text-sm outline-none focus:border-teal-500 disabled:bg-navy-50"
        />
      </td>
      <td className="px-4 py-2.5"><StatusBadge status={observation.status} /></td>
      <td className="px-4 py-2.5 text-xs">
        {saveState === 'saving' && <span className="text-navy-400">Saving…</span>}
        {saveState === 'saved' && (
          <span className="text-pass-600">
            ✓ Saved{savedAt ? ` at ${new Date(savedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : ''}
          </span>
        )}
        {saveState === 'error' && (
          <span className="text-fail-600">
            ⚠ Not saved{' '}
            <button onClick={retry} className="underline">Retry</button>
          </span>
        )}
        {saveState === 'idle' && observation.enteredAt && (
          <span className="text-navy-400">
            ✓ Saved at {new Date(observation.enteredAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </td>
    </tr>
  );
}
