import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fmtCurrency } from '../utils/format';
import { LayoutDashboard, Briefcase, History, Settings, LogOut, BarChart2, List } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handleLogout = () => { logout(); navigate('/login'); };

  const navLinks = user?.role === 'admin'
    ? [
        { to: '/admin',         label: 'Dashboard',    icon: LayoutDashboard },
        { to: '/admin/stocks',  label: 'Stocks',       icon: List },
        { to: '/admin/market',  label: 'Market Hours', icon: Settings },
        { to: '/admin/users',   label: 'Users',        icon: Briefcase },
        { to: '/admin/orders',  label: 'All Orders',   icon: History },
      ]
    : [
        { to: '/market',      label: 'Market',      icon: BarChart2 },
        { to: '/portfolio',   label: 'Portfolio',   icon: Briefcase },
        { to: '/history',     label: 'History',     icon: History },
      ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-surface-600 bg-surface-900/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 flex items-center h-14 gap-6">
        {/* Logo */}
        <Link to={user?.role === 'admin' ? '/admin' : '/market'}
          className="flex items-center gap-2 font-display text-brand-500 font-medium text-lg shrink-0">
          TradingTool
        </Link>

        {/* Nav links */}
        {user && (
          <div className="flex items-center gap-1">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors
                  ${pathname.startsWith(to)
                    ? 'bg-brand-600/20 text-brand-400'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-surface-700'
                  }`}>
                <Icon size={15} />
                {label}
              </Link>
            ))}
          </div>
        )}

        <div className="ml-auto flex items-center gap-3">
          {user && user.role === 'customer' && (
            <span className="font-mono text-sm text-slate-300">
              Cash: <span className="text-brand-400">{fmtCurrency(user.cash_balance)}</span>
            </span>
          )}
          {user && (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span className="font-medium text-slate-200">{user.username}</span>
              {user.role === 'admin' && (
                <span className="text-xs bg-brand-600/20 text-brand-400 px-2 py-0.5 rounded-full">admin</span>
              )}
              <button onClick={handleLogout} title="Logout"
                className="p-1.5 hover:text-red-400 transition-colors">
                <LogOut size={15} />
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
