import { useEffect, useState } from 'react';
import AppLayout from '../components/AppLayout';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import type { User } from '../types';
import { useAuth } from '../context/AuthContext';

export default function Users() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'LMO', organisation: '' });
  const [submitting, setSubmitting] = useState(false);

  function load() {
    setLoading(true);
    api
      .get('/users')
      .then((res) => setUsers(res.data.users))
      .catch(() => showToast('Could not load users.', 'error'))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function submit() {
    setSubmitting(true);
    try {
      await api.post('/users', form);
      setShowAdd(false);
      setForm({ name: '', email: '', phone: '', password: '', role: 'LMO', organisation: '' });
      load();
      showToast('User created.', 'success');
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Could not create user.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppLayout title={isAdmin ? 'Users' : 'Business Users'} breadcrumb={['Home', isAdmin ? 'Users' : 'Business Users']}>
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setShowAdd(true)}
          className="rounded-lg bg-navy-700 px-4 py-2 text-sm font-medium text-white hover:bg-navy-600"
        >
          + {isAdmin ? 'Add User' : 'Add Business User'}
        </button>
      </div>

      <div className="rounded-xl border border-line bg-white shadow-card">
        <div className="table-scroll">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs text-navy-400">
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Role</th>
                <th className="px-4 py-2 font-medium">Organisation</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={4} className="px-4 py-6 text-center text-navy-400">Loading…</td></tr>}
              {users.map((u) => (
                <tr key={u.id} className="border-b border-line last:border-0 hover:bg-navy-50/50">
                  <td className="px-4 py-2 font-medium text-navy-800">{u.name}</td>
                  <td className="px-4 py-2 font-mono text-xs">{u.email}</td>
                  <td className="px-4 py-2">{u.role}</td>
                  <td className="px-4 py-2 text-navy-400">{u.organisation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-navy-900/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-navy-800">{isAdmin ? 'Add User' : 'Add Business User'}</h3>
            <div className="mt-4 space-y-3">
              <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-md border border-line px-2.5 py-1.5 text-sm outline-none focus:border-teal-500" />
              <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-md border border-line px-2.5 py-1.5 text-sm outline-none focus:border-teal-500" />
              <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded-md border border-line px-2.5 py-1.5 text-sm outline-none focus:border-teal-500" />
              <input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full rounded-md border border-line px-2.5 py-1.5 text-sm outline-none focus:border-teal-500" />
              {isAdmin ? (
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full rounded-md border border-line px-2.5 py-1.5 text-sm outline-none focus:border-teal-500">
                  <option value="ADMIN">Admin</option>
                  <option value="LMO">LMO</option>
                  <option value="GATC">GATC</option>
                  <option value="BUSINESS">Business</option>
                </select>
              ) : (
                <div className="rounded-md border border-line bg-navy-50 px-2.5 py-2 text-sm text-navy-700">Account type: Business</div>
              )}
              <input placeholder="Organisation" value={form.organisation} onChange={(e) => setForm({ ...form, organisation: e.target.value })} className="w-full rounded-md border border-line px-2.5 py-1.5 text-sm outline-none focus:border-teal-500" />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowAdd(false)} className="rounded-md border border-line px-4 py-2 text-sm font-medium text-navy-600 hover:bg-navy-50">Cancel</button>
              <button onClick={submit} disabled={submitting || !form.name || !form.email || !form.password} className="rounded-md bg-navy-700 px-4 py-2 text-sm font-medium text-white hover:bg-navy-600 disabled:opacity-60">
                {submitting ? 'Saving…' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
