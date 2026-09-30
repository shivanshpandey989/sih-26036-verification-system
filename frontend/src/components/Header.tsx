import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Header({ title, breadcrumb }: { title: string; breadcrumb?: string[] }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="flex items-center justify-between border-b border-line bg-white px-6 py-4">
      <div>
        {breadcrumb && breadcrumb.length > 0 && (
          <p className="text-xs text-navy-400 mb-0.5">
            {breadcrumb.join('  /  ')}
          </p>
        )}
        <h1 className="text-lg font-semibold text-navy-800">{title}</h1>
      </div>
      <button
        onClick={() => {
          logout();
          navigate('/login');
        }}
        className="rounded-md border border-line px-3 py-1.5 text-sm font-medium text-navy-600 hover:bg-navy-50"
      >
        Sign out
      </button>
    </header>
  );
}
