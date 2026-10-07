import React, { useState, useEffect, useCallback } from 'react';
import { api, type Department, type ExamResult } from '../../api/client';
import {
  Award,
  Download,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  FileCode
} from 'lucide-react';

export const AdminResults: React.FC = () => {
  const [results, setResults] = useState<ExamResult[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [examFilter, setExamFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAdminResults({
        page,
        department_id: deptFilter,
        exam_id: examFilter,
        search,
      });

      if (res.results) {
        setResults(res.results);
        setTotalCount(res.count);
        setTotalPages(Math.ceil(res.count / 25) || 1);
      } else {
        setResults(res);
        setTotalCount(res.length);
        setTotalPages(1);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load results.');
    } finally {
      setLoading(false);
    }
  }, [page, deptFilter, examFilter, search]);

  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [d, e] = await Promise.all([api.getDepartments(), api.getAdminExams()]);
        setDepartments(d);
        setExams(e.results || e);
      } catch (err) {
        console.error('Failed to load filter metadata:', err);
      }
    };
    loadMetadata();
  }, []);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const handleExportCsv = () => {
    const csvUrl = api.getExportCsvUrl({
      exam_id: examFilter,
      department_id: deptFilter,
      search,
    });
    window.open(csvUrl, '_blank');
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center">
              <Award className="h-6 w-6 mr-2 text-amber-600" /> Student Examination Results
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Authoritative grades, percentages, and integrity reports ({totalCount} submissions)
            </p>
          </div>

          <button
            onClick={handleExportCsv}
            className="inline-flex items-center px-4 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm shadow-sm transition self-start sm:self-auto"
          >
            <Download className="h-4 w-4 mr-1.5" /> Export Results to CSV
          </button>
        </div>

        {/* Filter bar */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="w-full md:w-80 relative">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search student roll or name..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
            />
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={examFilter}
                onChange={(e) => {
                  setExamFilter(e.target.value);
                  setPage(1);
                }}
                className="py-2 px-3 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">All Examinations</option>
                {exams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={deptFilter}
                onChange={(e) => {
                  setDeptFilter(e.target.value);
                  setPage(1);
                }}
                className="py-2 px-3 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
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

        {/* Results Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-medium text-slate-500">Loading student scores...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              No examination submissions found matching criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-slate-700 font-semibold">
                  <tr>
                    <th scope="col" className="px-5 py-3.5">Roll Number</th>
                    <th scope="col" className="px-5 py-3.5">Student Name</th>
                    <th scope="col" className="px-5 py-3.5">Department</th>
                    <th scope="col" className="px-5 py-3.5">Examination</th>
                    <th scope="col" className="px-5 py-3.5">Submitted Files</th>
                    <th scope="col" className="px-5 py-3.5 text-center">Score</th>
                    <th scope="col" className="px-5 py-3.5 text-center">Percentage</th>
                    <th scope="col" className="px-5 py-3.5 text-center">Status</th>
                    <th scope="col" className="px-5 py-3.5 text-center">Violations</th>
                    <th scope="col" className="px-5 py-3.5 text-right">Submitted At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {results.map((res) => (
                    <tr key={res.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-5 py-4 font-mono font-bold text-slate-900">
                        {res.roll_number}
                      </td>
                      <td className="px-5 py-4 font-medium text-slate-800">
                        {res.student_name}
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-sky-100 text-sky-800">
                          {res.department_code}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-800 max-w-xs">
                        <div className="font-medium text-slate-900 truncate" title={res.exam_title}>
                          {res.exam_title}
                        </div>
                        <div className="mt-0.5">
                          {res.exam_type === 'CODING' ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                              💻 Coding
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                              📝 MCQ
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {res.submissions && res.submissions.length > 0 ? (
                          <div className="flex flex-col gap-1 text-xs">
                            {res.submissions.map((sub, sIdx) => (
                              <a
                                key={sIdx}
                                href={sub.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={sub.file_name}
                                className="inline-flex items-center text-purple-700 hover:text-purple-900 font-medium underline"
                                title={`Download ${sub.file_name} (${Math.round((sub.file_size || 0) / 1024)} KB)`}
                              >
                                <FileCode className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
                                <span className="max-w-[120px] truncate">{sub.file_name}</span>
                              </a>
                            ))}
                          </div>
                        ) : res.exam_type === 'CODING' ? (
                          <span className="text-xs text-amber-700 font-medium italic">No files attached</span>
                        ) : (
                          <span className="text-xs text-slate-400">Online MCQ</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-center font-bold text-slate-900">
                        {res.score} / {res.max_score}
                      </td>
                      <td className="px-5 py-4 text-center font-extrabold text-sky-700">
                        {res.percentage}%
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                            res.status === 'SUBMITTED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {res.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        {res.exam_type === 'CODING' ? (
                          <span className="text-xs text-slate-400 font-medium">Bypassed</span>
                        ) : (
                          <span
                            className={`font-semibold text-xs ${
                              res.violation_count > 0 ? 'text-red-600 font-bold' : 'text-slate-500'
                            }`}
                          >
                            {res.violation_count}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right text-xs text-slate-500 font-mono">
                        {formatDateTime(res.submitted_at)}
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
