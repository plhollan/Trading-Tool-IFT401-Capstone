import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { TrendingUp } from 'lucide-react';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm]   = useState({ full_name: '', username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      navigate('/market');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const field = (key, label, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-xs text-slate-400 mb-1.5">{label}</label>
      <input className="input" type={type} placeholder={placeholder}
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-900 px-4">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1c264020_1px,transparent_1px),linear-gradient(to_bottom,#1c264020_1px,transparent_1px)] bg-[size:40px_40px]" />

      <div className="relative w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 font-display text-brand-500 text-2xl mb-2">
            <TrendingUp size={28} />
            TradingTool
          </div>
          <p className="text-slate-400 text-sm">Create your trading account</p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {field('full_name', 'Full Name', 'text', 'Jane Smith')}
            {field('username', 'Username', 'text', 'janesmith')}
            {field('email', 'Email', 'email', 'jane@example.com')}
            {field('password', 'Password (min 6 chars)', 'password', '••••••••')}

            {error && <p className="text-red-400 text-sm bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>}

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-400 hover:text-brand-300">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
