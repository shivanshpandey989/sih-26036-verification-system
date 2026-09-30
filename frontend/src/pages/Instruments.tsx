import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import StatusBadge from '../components/StatusBadge';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { Instrument, Business } from '../types';

export default function Instruments() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [businesses, setBusinesses] = useState<Business[]>([]);

  const canManage = user?.role === 'ADMIN' || user?.role === 'LMO' || user?.role === 'GATC';

  function load() {
    setLoading(true);
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (status) params.status = status;
    api
      .get('/instruments', { params })
      .then((res) => setInstruments(res.data.instruments))
      .catch(() => showToast('Could not load instruments.', 'error'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    const t = setTimeout(load, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    if (canManage) {
      api.get('/businesses').then((res) => setBusinesses(res.data.businesses)).catch(() => {});
    }
  }, [canManage]);

  const statusOptions = useMemo(
    () => ['VALID', 'EXPIRING_SOON', 'EXPIRED', 'PENDING_VERIFICATION', 'FAILED'],
    []
  );

  return (
    <AppLayout title="Instruments" breadcrumb={['Home', 'Instruments']}>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by instrument no., manufacturer, model, serial…"
          className="w-80 rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-teal-500"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-teal-500"
        >
          <option value="">All statuses</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <div className="flex-1" />
        {canManage && (
          <button
            onClick={() => setShowAdd(true)}
            className="rounded-lg bg-navy-700 px-4 py-2 text-sm font-medium text-white hover:bg-navy-600"
          >
            + Add Instrument
          </button>
        )}
      </div>

      <div className="rounded-xl border border-line bg-white shadow-card">
        <div className="table-scroll">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs text-navy-400">
                <th className="px-4 py-2 font-medium">Instrument No.</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Owner / Business</th>
                <th className="px-4 py-2 font-medium">Location</th>
                <th className="px-4 py-2 font-medium">Next Verification</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-navy-400">Loading…</td></tr>
              )}
              {!loading && instruments.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-navy-400">No instruments found.</td></tr>
              )}
              {instruments.map((inst) => (
                <tr key={inst.id} className="border-b border-line last:border-0 hover:bg-navy-50/50">
                  <td className="px-4 py-2 font-mono text-xs">{inst.instrumentNumber}</td>
                  <td className="px-4 py-2">{inst.instrumentType}</td>
                  <td className="px-4 py-2">{inst.business?.businessName}</td>
                  <td className="px-4 py-2 text-navy-400">{inst.location}</td>
                  <td className="px-4 py-2 text-navy-400">
                    {inst.nextVerificationDate ? new Date(inst.nextVerificationDate).toLocaleDateString('en-IN') : '—'}
                  </td>
                  <td className="px-4 py-2"><StatusBadge status={inst.currentStatus} /></td>
                  <td className="px-4 py-2 text-right">
                    <Link to={`/instruments/${inst.id}`} className="text-teal-600 hover:underline text-xs font-medium">
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <AddInstrumentModal
          businesses={businesses}
          onClose={() => setShowAdd(false)}
          onCreated={() => {
            setShowAdd(false);
            load();
            showToast('Instrument registered.', 'success');
          }}
        />
      )}
    </AppLayout>
  );
}

function AddInstrumentModal({
  businesses,
  onClose,
  onCreated,
}: {
  businesses: Business[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const { showToast } = useToast();
  const [form, setForm] = useState({
    instrumentNumber: '',
    instrumentType: '',
    manufacturer: '',
    model: '',
    serialNumber: '',
    capacity: '',
    accuracyClass: '',
    location: '',
    businessId: businesses[0]?.id || '',
  });
  const [submitting, setSubmitting] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit() {
    setSubmitting(true);
    try {
      await api.post('/instruments', form);
      onCreated();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Could not register instrument.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  const fields: [keyof typeof form, string][] = [
    ['instrumentNumber', 'Instrument Number'],
    ['instrumentType', 'Instrument Type'],
    ['manufacturer', 'Manufacturer'],
    ['model', 'Model'],
    ['serialNumber', 'Serial Number'],
    ['capacity', 'Capacity'],
    ['accuracyClass', 'Accuracy Class'],
    ['location', 'Location'],
  ];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-navy-900/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h3 className="text-base font-semibold text-navy-800">Register New Instrument</h3>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {fields.map(([key, label]) => (
            <div key={key}>
              <label className="mb-1 block text-xs font-medium text-navy-600">{label}</label>
              <input
                value={form[key]}
                onChange={(e) => set(key, e.target.value)}
                className="w-full rounded-md border border-line px-2.5 py-1.5 text-sm outline-none focus:border-teal-500"
              />
            </div>
          ))}
          <div className="col-span-2">
            <label className="mb-1 block text-xs font-medium text-navy-600">Business / Owner</label>
            <select
              value={form.businessId}
              onChange={(e) => set('businessId', e.target.value)}
              className="w-full rounded-md border border-line px-2.5 py-1.5 text-sm outline-none focus:border-teal-500"
            >
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>{b.businessName}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-line px-4 py-2 text-sm font-medium text-navy-600 hover:bg-navy-50">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting || !form.instrumentNumber || !form.businessId}
            className="rounded-md bg-navy-700 px-4 py-2 text-sm font-medium text-white hover:bg-navy-600 disabled:opacity-60"
          >
            {submitting ? 'Saving…' : 'Register Instrument'}
          </button>
        </div>
      </div>
    </div>
  );
}
