import React, { useState, useEffect, useCallback } from 'react';
import { api, type Department } from '../../api/client';
import { 
  Users, 
  Search, 
  Filter, 
  CheckCircle, 
  XCircle, 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle 
} from 'lucide-react';

interface StudentItem {
  id: number;
  roll_number: string;
  full_name: string;
  department_name: string;
  department_code: string;
  email: string;
  active: boolean;
}

export const Students: React.FC = () => {
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAdminStudents({
        page,
        department: deptFilter,
        search,
      });

      if (res.results) {
        setStudents(res.results);
        setTotalCount(res.count);
        setTotalPages(Math.ceil(res.count / 25) || 1);
      } else {
        setStudents(res);
        setTotalCount(res.length);
        setTotalPages(1);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load students.');
    } finally {
      setLoading(false);
    }
  }, [page, deptFilter, search]);

  useEffect(() => {
    const loadDepts = async () => {
      try {
        const d = await api.getDepartments();
        setDepartments(d);
      } catch (e) {
        console.error('Failed to load departments', e);
      }
    };
    loadDepts();
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleToggleActive = async (student: StudentItem) => {
    try {
      await api.toggleStudentActive(student.id, !student.active);
      setStudents((prev) =>
        prev.map((s) => (s.id === student.id ? { ...s, active: !s.active } : s))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to update student status');
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchStudents();
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center">
              <Users className="h-6 w-6 mr-2 text-sky-700" /> Student Directory
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Registered student cohorts ({totalCount} total students)
            </p>
          </div>
        </div>

        {/* Filter / Search Bar */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
          <form onSubmit={handleSearchSubmit} className="flex-1 w-full md:w-auto relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by roll number or name..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600 focus:border-sky-600 font-medium"
            />
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
          </form>

          <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={deptFilter}
                onChange={(e) => {
                  setDeptFilter(e.target.value);
                  setPage(1);
                }}
                className="py-2 px-3 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-600"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.code}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 flex items-start space-x-3 text-red-700">
            <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0 text-red-500" />
            <div className="text-sm font-medium">{error}</div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-medium text-slate-500">Loading student directory...</p>
            </div>
          ) : students.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              No students found matching your filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-slate-700 font-semibold">
                  <tr>
                    <th scope="col" className="px-6 py-3.5">Roll Number</th>
                    <th scope="col" className="px-6 py-3.5">Full Name</th>
                    <th scope="col" className="px-6 py-3.5">Department</th>
                    <th scope="col" className="px-6 py-3.5">Email</th>
                    <th scope="col" className="px-6 py-3.5 text-center">Status</th>
                    <th scope="col" className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {students.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-6 py-4 font-mono font-bold text-slate-900">
                        {student.roll_number}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-800">
                        {student.full_name}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-200">
                          {student.department_code}
                        </span>
                        <span className="text-xs text-slate-500 ml-2">
                          {student.department_name}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 font-mono">
                        {student.email || '—'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {student.active ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                            <CheckCircle className="h-3 w-3 mr-1" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                            <XCircle className="h-3 w-3 mr-1" /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleToggleActive(student)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                            student.active
                              ? 'border border-red-300 text-red-700 hover:bg-red-50'
                              : 'border border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          {student.active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Page <strong className="text-slate-800">{page}</strong> of <strong className="text-slate-800">{totalPages}</strong>
              </span>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
