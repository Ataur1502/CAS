import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, Lock, AlertCircle, ArrowRight } from 'lucide-react';

export const Login: React.FC = () => {
  const [rollNumber, setRollNumber] = useState('2311CS040001');
  const [password, setPassword] = useState('StudentPass123!');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login({ roll_number: rollNumber.trim(), password });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="h-16 w-16 bg-sky-700 rounded-2xl flex items-center justify-center shadow-lg text-white">
            <GraduationCap className="h-10 w-10" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          University Examination Portal
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Student Authentication & MCQ Assessment System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-xl sm:px-10 border border-slate-200">
          {error && (
            <div className="mb-5 p-4 rounded-lg bg-red-50 border border-red-200 flex items-start space-x-3 text-red-700">
              <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0 text-red-500" />
              <div className="text-sm font-medium">{error}</div>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="rollNumber"
                className="block text-sm font-semibold text-slate-700"
              >
                University Roll Number
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  id="rollNumber"
                  type="text"
                  required
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  placeholder="e.g. 2311CS040001"
                  className="block w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600 focus:border-sky-600 text-sm font-mono"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-slate-700"
              >
                Password
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600 focus:border-sky-600 text-sm"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-sky-700 hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-600 disabled:opacity-50 transition"
              >
                {loading ? (
                  <span className="inline-flex items-center">
                    <span className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Authenticating...
                  </span>
                ) : (
                  <span className="inline-flex items-center">
                    Student Login <ArrowRight className="ml-2 h-4 w-4" />
                  </span>
                )}
              </button>
            </div>
          </form>

          {/* Dev credentials box */}
          <div className="mt-6 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
            <div className="font-semibold text-slate-700 mb-1 flex items-center">
              <Lock className="h-3 w-3 mr-1 text-slate-500" />
              Demo Credentials:
            </div>
            <div>CS Roll: <code className="font-mono font-bold text-sky-700">2311CS040001</code></div>
            <div>IoT Roll: <code className="font-mono font-bold text-sky-700">2311CS050001</code></div>
            <div>Password: <code className="font-mono font-bold text-sky-700">StudentPass123!</code></div>
          </div>

          <div className="mt-6 border-t border-slate-200 pt-4 text-center">
            <Link
              to="/admin/login"
              className="text-xs font-medium text-slate-500 hover:text-sky-700 transition"
            >
              Are you a faculty administrator? Go to Admin Login &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
