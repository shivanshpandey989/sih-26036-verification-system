import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const linkBase =
  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors';
const linkActive = 'bg-navy-700 text-white';
const linkInactive = 'text-navy-100/80 hover:bg-navy-700/60 hover:text-white';

function Item({ to, label, icon }: { to: string; label: string; icon: string }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}
    >
      <span className="text-base leading-none" aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </NavLink>
  );
}

export default function Sidebar() {
  const { user } = useAuth();
  const role = user?.role;

  return (
    <aside className="flex h-full w-64 flex-col bg-navy-800 text-white">
      <div className="flex items-center gap-2 px-5 py-5 border-b border-white/10">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-saffron-500 font-mono text-sm font-semibold text-navy-900">
          LM
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">Verification System</p>
          <p className="text-[11px] text-navy-200 leading-tight">Legal Metrology</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <Item to="/" label="Dashboard" icon="⌂" />
        <Item to="/instruments" label="Instruments" icon="⚖" />
        {(role === 'ADMIN' || role === 'LMO' || role === 'GATC') && (
          <Item to="/users" label="Users" icon="◈" />
        )}
        {role === 'ADMIN' && <Item to="/audit-logs" label="Audit Logs" icon="≡" />}
      </nav>

      <div className="border-t border-white/10 px-5 py-4">
        <p className="text-xs text-navy-200">Signed in as</p>
        <p className="text-sm font-medium">{user?.name}</p>
        <p className="text-[11px] text-navy-200">{user?.role} · {user?.organisation}</p>
      </div>
    </aside>
  );
}
