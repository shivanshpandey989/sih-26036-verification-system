import { useEffect, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Link } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import StatusBadge from '../components/StatusBadge';
import api from '../api/client';
import type { DashboardStats, RecentActivityRow } from '../types';

interface ChartsData {
  monthly: { month: string; count: number }[];
  instrumentsByType: { type: string; count: number }[];
  resultBreakdown: { name: string; value: number }[];
}

const PIE_COLORS = ['#0F7B3F', '#B3261E'];

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-xl border border-line bg-white p-4 shadow-card">
      <p className="text-xs font-medium text-navy-400">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${accent || 'text-navy-800'}`}>{value}</p>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [charts, setCharts] = useState<ChartsData | null>(null);
  const [recent, setRecent] = useState<RecentActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    api
      .get('/dashboard/stats')
      .then((res) => {
        if (!mounted) return;
        setStats(res.data.stats);
        setCharts(res.data.charts);
        setRecent(res.data.recentActivity);
      })
      .catch(() => setError('Could not load dashboard statistics.'))
      .finally(() => setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <AppLayout title="Dashboard" breadcrumb={['Home']}>
      {loading && <p className="text-sm text-navy-400">Loading dashboard…</p>}
      {error && <p className="text-sm text-fail-600">{error}</p>}

      {stats && (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="Total Instruments" value={stats.totalInstruments} />
            <StatCard label="Pending Verifications" value={stats.pendingVerifications} accent="text-warn-600" />
            <StatCard label="Completed Verifications" value={stats.completedVerifications} />
            <StatCard label="Valid Certificates" value={stats.validCertificates} accent="text-pass-600" />
            <StatCard label="Expiring Soon" value={stats.expiringSoon} accent="text-warn-600" />
            <StatCard label="Expired Certificates" value={stats.expiredCertificates} accent="text-fail-600" />
            <StatCard label="Passed" value={stats.passed} accent="text-pass-600" />
            <StatCard label="Failed" value={stats.failed} accent="text-fail-600" />
          </div>

          {charts && (
            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="rounded-xl border border-line bg-white p-4 shadow-card lg:col-span-2">
                <p className="mb-3 text-sm font-medium text-navy-700">Monthly Verification Count</p>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={charts.monthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#DCE3EA" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#0F7B6C" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="rounded-xl border border-line bg-white p-4 shadow-card">
                <p className="mb-3 text-sm font-medium text-navy-700">Pass / Fail Breakdown</p>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={charts.resultBreakdown} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                      {charts.resultBreakdown.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="rounded-xl border border-line bg-white p-4 shadow-card lg:col-span-3">
                <p className="mb-3 text-sm font-medium text-navy-700">Instruments by Type</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={charts.instrumentsByType}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#DCE3EA" />
                    <XAxis dataKey="type" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#164A7A" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="mt-6 rounded-xl border border-line bg-white shadow-card">
            <div className="border-b border-line px-4 py-3">
              <p className="text-sm font-medium text-navy-700">Recent Activity</p>
            </div>
            <div className="table-scroll">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs text-navy-400">
                    <th className="px-4 py-2 font-medium">Instrument</th>
                    <th className="px-4 py-2 font-medium">Verification No.</th>
                    <th className="px-4 py-2 font-medium">Officer</th>
                    <th className="px-4 py-2 font-medium">Date</th>
                    <th className="px-4 py-2 font-medium">Result</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-navy-400">
                        No verification activity yet.
                      </td>
                    </tr>
                  )}
                  {recent.map((r) => (
                    <tr key={r.id} className="border-b border-line last:border-0 hover:bg-navy-50/50">
                      <td className="px-4 py-2">
                        <Link to={`/verifications/${r.id}`} className="text-teal-600 hover:underline font-mono text-xs">
                          {r.instrument}
                        </Link>
                      </td>
                      <td className="px-4 py-2 font-mono text-xs">{r.verificationNumber}</td>
                      <td className="px-4 py-2">{r.officer}</td>
                      <td className="px-4 py-2 text-navy-400">{new Date(r.date).toLocaleDateString('en-IN')}</td>
                      <td className="px-4 py-2"><StatusBadge status={r.result} /></td>
                      <td className="px-4 py-2"><StatusBadge status={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </AppLayout>
  );
}
