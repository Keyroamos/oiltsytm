import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('admin@elg.co.ke');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: authError } = await signIn(email, password);
      if (authError) {
        setError(authError.message || 'Invalid email or password.');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1e35] flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-[#0f1e35] via-[#1e3a5f] to-[#0f2a4a] relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 -right-20 w-96 h-96 bg-amber-400 rounded-full blur-3xl" />
          <div className="absolute bottom-20 -left-20 w-80 h-80 bg-blue-400 rounded-full blur-3xl" />
        </div>

        {/* Logo */}
        <div className="flex items-center gap-3.5 relative z-10">
          <div className="h-14 px-4 py-2 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-black/20">
            <img src="/tarita_logo.png" alt="Tarita Petroleum Logo" className="h-full w-auto object-contain" />
          </div>
        </div>

        {/* Center content */}
        <div className="relative z-10">
          <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
            Complete PMS & AGO
            <br />
            <span className="text-amber-400">Petroleum Operations</span>
          </h2>
          <p className="text-slate-400 text-base leading-relaxed max-w-sm">
            Track every litre of fuel from receiving through storage, dispatch, invoicing, and payment — in real time.
          </p>

          <div className="mt-10 space-y-4">
            {[
              'Real-time tank stock monitoring',
              'End-to-end dispatch workflow',
              'Customer credit management',
              'Automated audit trail',
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <div className="w-5 h-5 bg-amber-400/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 bg-amber-400 rounded-full" />
                </div>
                <span className="text-slate-300 text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <p className="text-slate-500 text-xs">© 2026 Tarita Petroleum. All rights reserved.</p>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex flex-col items-center justify-center mb-8">
            <div className="h-16 px-4 py-2 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-gray-200/50 mb-3 border border-gray-100">
              <img src="/tarita_logo.png" alt="Tarita Petroleum Logo" className="h-full w-auto object-contain" />
            </div>
            <p className="text-xs text-cyan-700 font-semibold tracking-wide">Fuelling Progress · Petroleum Operations</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-8">
            <div className="mb-7">
              <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
              <p className="text-sm text-gray-500 mt-1">Enter your credentials to continue</p>
            </div>

            {error && (
              <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 rounded-xl mb-5">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@elg.co.ke"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f] transition-colors"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded border-gray-300 text-[#1e3a5f] focus:ring-[#1e3a5f]/30" />
                  <span className="text-gray-600">Remember me</span>
                </label>
                <button type="button" className="text-blue-600 font-medium hover:text-blue-700 transition-colors">
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#1e3a5f] text-white text-sm font-semibold hover:bg-[#2d5282] disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Logging in…
                  </>
                ) : (
                  'Login'
                )}
              </button>
            </form>

            {/* Demo credentials hint */}
            <div className="mt-5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-xs font-semibold text-amber-800 mb-1">Admin Credentials</p>
              <p className="text-xs text-amber-700">Email: <span className="font-mono font-medium">admin@mafuta.co.ke</span></p>
              <p className="text-xs text-amber-700">Password: <span className="font-mono font-medium">Admin@1234</span></p>
              <p className="text-[10px] text-amber-600 mt-1">Live Tarita Petroleum account</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
