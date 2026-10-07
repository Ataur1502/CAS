import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, type DashboardStats } from '../../api/client';
import {
  Users,
  Shield,
  Cpu,
  FileText,
  CheckCircle,
  HelpCircle,
  Award,
  ArrowRight,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAdminDashboard();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load system metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Administrator Console</h1>
            <p className="text-sm text-slate-500 mt-1">
              University examination management, student cohort tracking, and exam analytics
            </p>
          </div>
          <button
            onClick={fetchStats}
            className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 shadow-sm transition self-start sm:self-auto"
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Metrics
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 flex items-start space-x-3 text-red-700">
            <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0 text-red-500" />
            <div className="text-sm">{error}</div>
          </div>
        )}

        {/* System Metric Cards (From SQLite Database) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {/* Total Students */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Students</p>
              <h3 className="text-3xl font-black text-slate-900 mt-1">
                {loading ? '...' : stats?.total_students}
              </h3>
              <p className="text-xs text-slate-400 mt-1">Registered university cohorts</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center">
              <Users className="h-6 w-6" />
            </div>
          </div>

          {/* Cyber Security Students */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Cyber Security</p>
              <h3 className="text-3xl font-black text-slate-900 mt-1">
                {loading ? '...' : stats?.cs_students}
              </h3>
              <p className="text-xs text-slate-400 mt-1">CS Dept cohort (181)</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Shield className="h-6 w-6" />
            </div>
          </div>

          {/* IoT Students */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-teal-600 uppercase tracking-wider">Internet of Things</p>
              <h3 className="text-3xl font-black text-slate-900 mt-1">
                {loading ? '...' : stats?.iot_students}
              </h3>
              <p className="text-xs text-slate-400 mt-1">IoT Dept cohort (120)</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <Cpu className="h-6 w-6" />
            </div>
          </div>

          {/* Total Exams */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Examinations</p>
              <h3 className="text-3xl font-black text-slate-900 mt-1">
                {loading ? '...' : stats?.total_exams}
              </h3>
              <p className="text-xs text-emerald-600 font-medium mt-1">
                {loading ? '...' : `${stats?.active_exams} active in window`}
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <FileText className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Second row metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Examination Attempts</p>
              <h3 className="text-3xl font-black text-slate-900 mt-1">
                {loading ? '...' : stats?.total_attempts}
              </h3>
              <p className="text-xs text-slate-400 mt-1">Started by students across all exams</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <FileText className="h-6 w-6" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Submitted Attempts</p>
              <h3 className="text-3xl font-black text-slate-900 mt-1">
                {loading ? '...' : stats?.submitted_attempts}
              </h3>
              <p className="text-xs text-slate-400 mt-1">Normal or auto-submitted attempts</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CheckCircle className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Quick Management Shortcuts */}
        <h2 className="text-lg font-bold text-slate-900 mb-4">Management Modules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link
            to="/admin/students"
            className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-sky-500 hover:shadow-md transition flex flex-col justify-between group"
          >
            <div>
              <div className="h-10 w-10 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center mb-4">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 group-hover:text-sky-700 transition">
                Student Directory
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Search, filter by department, and activate/deactivate student accounts.
              </p>
            </div>
            <div className="mt-4 text-xs font-bold text-sky-700 flex items-center">
              Manage Students <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </div>
          </Link>

          <Link
            to="/admin/questions"
            className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-sky-500 hover:shadow-md transition flex flex-col justify-between group"
          >
            <div>
              <div className="h-10 w-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center mb-4">
                <HelpCircle className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-700 transition">
                Question Bank
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Create and curate MCQ questions with 4 options and answer keys.
              </p>
            </div>
            <div className="mt-4 text-xs font-bold text-indigo-700 flex items-center">
              Manage Questions <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </div>
          </Link>

          <Link
            to="/admin/exams"
            className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-sky-500 hover:shadow-md transition flex flex-col justify-between group"
          >
            <div>
              <div className="h-10 w-10 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center mb-4">
                <FileText className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 group-hover:text-teal-700 transition">
                Examination Management
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Schedule exams, assign questions, set durations, and target departments.
              </p>
            </div>
            <div className="mt-4 text-xs font-bold text-teal-700 flex items-center">
              Manage Exams <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </div>
          </Link>

          <Link
            to="/admin/results"
            className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-sky-500 hover:shadow-md transition flex flex-col justify-between group"
          >
            <div>
              <div className="h-10 w-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
                <Award className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 group-hover:text-amber-700 transition">
                Results & CSV Export
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Review scores, monitor violations, and export grade sheets to CSV.
              </p>
            </div>
            <div className="mt-4 text-xs font-bold text-amber-700 flex items-center">
              View Results <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};
