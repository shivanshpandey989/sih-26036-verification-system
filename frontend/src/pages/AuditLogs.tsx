import { useEffect, useState } from 'react';
import AppLayout from '../components/AppLayout';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import type { AuditLogRow } from '../types';

export default function AuditLogs() {
  const { showToast } = useToast();
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/audit-logs')
      .then((res) => setLogs(res.data.logs))
      .catch(() => showToast('Could not load audit logs.', 'error'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AppLayout title="Audit Logs" breadcrumb={['Home', 'Audit Logs']}>
      <div className="rounded-xl border border-line bg-white shadow-card">
        <div className="table-scroll">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs text-navy-400">
                <th className="px-4 py-2 font-medium">User</th>
                <th className="px-4 py-2 font-medium">Action</th>
                <th className="px-4 py-2 font-medium">Entity</th>
                <th className="px-4 py-2 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={4} className="px-4 py-6 text-center text-navy-400">Loading…</td></tr>}
              {!loading && logs.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-navy-400">No audit activity yet.</td></tr>
              )}
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-line last:border-0 hover:bg-navy-50/50">
                  <td className="px-4 py-2">
                    <div className="font-medium text-navy-800">{log.user?.name || 'System'}</div>
                    <div className="text-xs text-navy-400">{log.user?.role || ''}</div>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{log.action}</td>
                  <td className="px-4 py-2 text-navy-400">{log.entityType}{log.entityId ? ` · ${log.entityId.slice(0, 8)}…` : ''}</td>
                  <td className="px-4 py-2 text-navy-400">{new Date(log.timestamp).toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
