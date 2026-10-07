import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  GraduationCap, 
  LogOut, 
  User, 
  ShieldCheck, 
  FileText, 
  Award, 
  Users, 
  HelpCircle, 
  LayoutDashboard 
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate(role === 'ADMIN' ? '/admin/login' : '/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="bg-slate-900 text-white shadow-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Portal Name */}
          <div className="flex items-center space-x-3">
            <GraduationCap className="h-8 w-8 text-sky-400" />
            <div>
              <span className="text-xl font-bold tracking-tight text-white block leading-tight">
                CAS EXAM PORTAL
              </span>
              <span className="text-xs text-slate-400 block tracking-wide">
                University Online Examination System
              </span>
            </div>
          </div>

          {/* Navigation Links based on role */}
          {user && (
            <nav className="hidden md:flex items-center space-x-1">
              {role === 'STUDENT' && (
                <>
                  <Link
                    to="/dashboard"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                      isActive('/dashboard')
                        ? 'bg-slate-800 text-sky-400'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5">
                      <FileText className="h-4 w-4" />
                      <span>Exams</span>
                    </div>
                  </Link>
                  <Link
                    to="/results"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                      isActive('/results')
                        ? 'bg-slate-800 text-sky-400'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5">
                      <Award className="h-4 w-4" />
                      <span>My Results</span>
                    </div>
                  </Link>
                </>
              )}

              {role === 'ADMIN' && (
                <>
                  <Link
                    to="/admin/dashboard"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                      isActive('/admin/dashboard')
                        ? 'bg-slate-800 text-sky-400'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5">
                      <LayoutDashboard className="h-4 w-4" />
                      <span>Dashboard</span>
                    </div>
                  </Link>
                  <Link
                    to="/admin/students"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                      isActive('/admin/students')
                        ? 'bg-slate-800 text-sky-400'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5">
                      <Users className="h-4 w-4" />
                      <span>Students</span>
                    </div>
                  </Link>
                  <Link
                    to="/admin/questions"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                      isActive('/admin/questions')
                        ? 'bg-slate-800 text-sky-400'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5">
                      <HelpCircle className="h-4 w-4" />
                      <span>Question Bank</span>
                    </div>
                  </Link>
                  <Link
                    to="/admin/exams"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                      isActive('/admin/exams')
                        ? 'bg-slate-800 text-sky-400'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5">
                      <FileText className="h-4 w-4" />
                      <span>Exams</span>
                    </div>
                  </Link>
                  <Link
                    to="/admin/results"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                      isActive('/admin/results')
                        ? 'bg-slate-800 text-sky-400'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5">
                      <Award className="h-4 w-4" />
                      <span>Results</span>
                    </div>
                  </Link>
                </>
              )}
            </nav>
          )}

          {/* User info & Logout */}
          {user ? (
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm font-medium text-white flex items-center justify-end space-x-1.5">
                  {role === 'ADMIN' ? (
                    <>
                      <ShieldCheck className="h-4 w-4 text-emerald-400" />
                      <span>Admin ({user.username})</span>
                    </>
                  ) : (
                    <>
                      <User className="h-4 w-4 text-sky-400" />
                      <span>{user.roll_number}</span>
                    </>
                  )}
                </div>
                {role === 'STUDENT' && user.department && (
                  <div className="text-xs text-sky-300">
                    Dept: {user.department.name} ({user.department.code})
                  </div>
                )}
              </div>

              <button
                onClick={handleLogout}
                className="inline-flex items-center px-3 py-1.5 border border-slate-700 rounded-md text-sm font-medium text-slate-300 hover:bg-red-900/40 hover:text-red-300 hover:border-red-700 transition"
                title="Sign out"
              >
                <LogOut className="h-4 w-4 mr-1.5" />
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <Link
                to="/login"
                className="text-sm text-slate-300 hover:text-white font-medium"
              >
                Student Login
              </Link>
              <span className="text-slate-600">|</span>
              <Link
                to="/admin/login"
                className="text-sm text-sky-400 hover:text-sky-300 font-medium"
              >
                Admin Area
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
