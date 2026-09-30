import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const DEMO_ACCOUNTS = [
  { role: 'Admin', email: 'admin@demo.com' },
  { role: 'LMO', email: 'lmo@demo.com' },
  { role: 'GATC', email: 'gatc@demo.com' },
  { role: 'Business', email: 'business@demo.com' },
];

export default function Login() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      showToast('Signed in successfully.', 'success');
      navigate('/');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Invalid credentials. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-navy-800">
      <div className="hidden flex-1 flex-col justify-between bg-navy-900 p-10 text-white lg:flex">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-saffron-500 font-mono text-sm font-semibold text-navy-900">
            LM
          </div>
          <span className="font-semibold">Online Verification System</span>
        </div>
        <div>
          <p className="text-3xl font-semibold leading-tight max-w-md">
            Digital verification of weighing and measuring instruments,
            end to end.
          </p>
          <p className="mt-4 max-w-md text-sm text-navy-200">
            Every observation is written to the database the moment it is
            entered. Certificates are generated with a verifiable QR code
            the instant a verification passes.
          </p>
        </div>
        <p className="text-xs text-navy-300">Department of Legal Metrology · Smart India Hackathon 2026 · PS 26036</p>
      </div>

      <div className="flex flex-1 items-center justify-center bg-surface p-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-saffron-500 font-mono text-sm font-semibold text-navy-900">
              LM
            </div>
          </div>
          <h2 className="text-xl font-semibold text-navy-800">Sign in</h2>
          <p className="mt-1 text-sm text-navy-400">Access your verification dashboard.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-navy-700">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-teal-500"
                placeholder="you@department.gov.in"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-navy-700">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-teal-500"
                placeholder="••••••••"
              />
            </div>
            {error && <p className="text-sm text-fail-600">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-navy-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-navy-600 disabled:opacity-60"
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-8 rounded-lg border border-line bg-white p-4">
            <p className="text-xs font-medium text-navy-600 mb-2">Demo accounts (password: Demo@1234)</p>
            <ul className="space-y-1">
              {DEMO_ACCOUNTS.map((a) => (
                <li key={a.email} className="flex items-center justify-between text-xs">
                  <span className="text-navy-400">{a.role}</span>
                  <button
                    type="button"
                    onClick={() => setEmail(a.email)}
                    className="font-mono text-teal-600 hover:underline"
                  >
                    {a.email}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
