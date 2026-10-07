import React, { useState, useEffect, useCallback } from 'react';
import { api, type Department, type Question } from '../../api/client';
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
  Clock,
  Calendar,
  X,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Search
} from 'lucide-react';

interface ExamItem {
  id: number;
  title: string;
  description: string;
  exam_type?: 'MCQ' | 'CODING';
  duration_minutes: number;
  questions_per_attempt: number;
  max_violations?: number;
  question_pool_size?: number;
  start_datetime: string;
  end_datetime: string;
  is_active: boolean;
  department_ids: number[];
  department_details: Department[];
  question_count: number;
  total_marks: number;
  exam_questions: any[];
}

export const Exams: React.FC = () => {
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [questionSearch, setQuestionSearch] = useState('');
  const [showSelectedOrder, setShowSelectedOrder] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<ExamItem | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [examType, setExamType] = useState<'MCQ' | 'CODING'>('MCQ');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [questionsPerAttempt, setQuestionsPerAttempt] = useState(30);
  const [maxViolations, setMaxViolations] = useState(6);
  const [startDatetime, setStartDatetime] = useState('');
  const [endDatetime, setEndDatetime] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [selectedDepts, setSelectedDepts] = useState<number[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<number[]>([]);

  const fetchExams = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [examsRes, deptsRes, qRes] = await Promise.all([
        api.getAdminExams(),
        api.getDepartments(),
        api.getAdminQuestions({ all: true }),
      ]);
      setExams(examsRes.results || examsRes);
      setDepartments(deptsRes);
      const questionsList = Array.isArray(qRes) ? qRes : (qRes.results || []);
      setAllQuestions(questionsList);
    } catch (err: any) {
      setError(err.message || 'Failed to load examinations data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  const openCreateModal = () => {
    setEditingExam(null);
    setTitle('');
    setDescription('');
    setExamType('MCQ');
    setDurationMinutes(30);
    setQuestionsPerAttempt(30);
    setMaxViolations(6);

    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const toLocalISO = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

    setStartDatetime(toLocalISO(now));
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    setEndDatetime(toLocalISO(nextWeek));

    setIsActive(true);
    setSelectedDepts(departments.map((d) => d.id)); // Default to both
    // Pre-select all 60 MCQ questions by default:
    const mcqQuestions = allQuestions.filter((q) => (q.question_type || 'MCQ') === 'MCQ');
    setSelectedQuestions(mcqQuestions.map((q) => q.id));
    setQuestionSearch('');
    setShowSelectedOrder(false);
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (exam: ExamItem) => {
    setEditingExam(exam);
    setTitle(exam.title);
    setDescription(exam.description);
    const type = exam.exam_type || 'MCQ';
    setExamType(type);
    setDurationMinutes(exam.duration_minutes);
    setQuestionsPerAttempt(exam.questions_per_attempt || (type === 'CODING' ? 3 : 30));
    setMaxViolations(type === 'CODING' ? 0 : (exam.max_violations ?? 6));

    const toLocalISO = (isoStr: string) => {
      const d = new Date(isoStr);
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    setStartDatetime(toLocalISO(exam.start_datetime));
    setEndDatetime(toLocalISO(exam.end_datetime));
    setIsActive(exam.is_active);
    setSelectedDepts(exam.department_ids || []);

    const qIds = (exam.exam_questions || []).map((eq: any) => eq.id);
    setSelectedQuestions(qIds);

    setQuestionSearch('');
    setShowSelectedOrder(false);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleExamTypeChange = (newType: 'MCQ' | 'CODING') => {
    setExamType(newType);
    if (newType === 'CODING') {
      setQuestionsPerAttempt(3);
      setMaxViolations(0);
      setDurationMinutes(60);
      const codingQs = allQuestions.filter((q) => q.question_type === 'CODING');
      setSelectedQuestions(codingQs.map((q) => q.id));
    } else {
      setQuestionsPerAttempt(30);
      setMaxViolations(6);
      setDurationMinutes(30);
      const mcqQs = allQuestions.filter((q) => (q.question_type || 'MCQ') === 'MCQ');
      setSelectedQuestions(mcqQs.map((q) => q.id));
    }
  };

  const handleDeptToggle = (deptId: number) => {
    setSelectedDepts((prev) =>
      prev.includes(deptId) ? prev.filter((id) => id !== deptId) : [...prev, deptId]
    );
  };

  const handleQuestionToggle = (qId: number) => {
    setSelectedQuestions((prev) =>
      prev.includes(qId) ? prev.filter((id) => id !== qId) : [...prev, qId]
    );
  };

  const moveQuestion = (idx: number, direction: 'UP' | 'DOWN') => {
    const newArr = [...selectedQuestions];
    const targetIdx = direction === 'UP' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= newArr.length) return;
    const temp = newArr[idx];
    newArr[idx] = newArr[targetIdx];
    newArr[targetIdx] = temp;
    setSelectedQuestions(newArr);
  };

  const handleSaveExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!title.trim()) {
      setModalError('Exam title is required.');
      return;
    }

    if (selectedDepts.length === 0) {
      setModalError('Select at least one target department (Cyber Security, IoT, or both).');
      return;
    }

    const start = new Date(startDatetime);
    const end = new Date(endDatetime);
    if (start >= end) {
      setModalError('End date/time must be strictly after Start date/time.');
      return;
    }

    if (selectedQuestions.length < questionsPerAttempt) {
      setModalError(
        `Assigned question pool size (${selectedQuestions.length}) must be at least the questions per attempt (${questionsPerAttempt}).`
      );
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim(),
      exam_type: examType,
      duration_minutes: durationMinutes,
      questions_per_attempt: questionsPerAttempt,
      max_violations: maxViolations,
      start_datetime: start.toISOString(),
      end_datetime: end.toISOString(),
      is_active: isActive,
      departments: selectedDepts,
      questions: selectedQuestions.map((qId, idx) => ({ id: qId, order: idx + 1 })),
    };

    try {
      if (editingExam) {
        await api.updateExam(editingExam.id, payload);
      } else {
        await api.createExam(payload);
      }
      setIsModalOpen(false);
      fetchExams();
    } catch (err: any) {
      setModalError(err.message || 'Failed to save examination.');
    }
  };

  const handleDeleteExam = async (id: number) => {
    if (!confirm('Are you sure you want to delete this examination?')) return;
    try {
      await api.deleteExam(id);
      fetchExams();
    } catch (err: any) {
      alert(err.message || 'Failed to delete exam');
    }
  };

  const formatQuestionTitle = (text: string) => {
    if (!text) return '';
    const firstLine = text.split('\n')[0].replace(/^#+\s*/, '').trim();
    return firstLine || text.slice(0, 80);
  };

  // Questions pool matching the active examType
  const displayedPoolQuestions = allQuestions.filter(
    (q) => (q.question_type || 'MCQ') === examType
  );

  // Search filtered questions
  const displayedQuestions = displayedPoolQuestions.filter((q) => {
    if (!questionSearch.trim()) return true;
    const term = questionSearch.toLowerCase();
    return (
      q.question_text.toLowerCase().includes(term) ||
      (q.category && q.category.toLowerCase().includes(term)) ||
      (q.difficulty && q.difficulty.toLowerCase().includes(term))
    );
  });

  const handleSelectAllDisplayed = () => {
    const poolIds = displayedPoolQuestions.map((q) => q.id);
    setSelectedQuestions(poolIds);
  };

  const handleDeselectAll = () => {
    setSelectedQuestions([]);
  };

  // Calculate live question & marks summary for selected questions in modal
  const selectedQuestionObjects = selectedQuestions
    .map((qId) => allQuestions.find((q) => q.id === qId))
    .filter(Boolean) as Question[];

  const calculatedTotalMarks = selectedQuestionObjects.reduce((acc, q) => acc + q.marks, 0);

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center">
              <FileText className="h-6 w-6 mr-2 text-teal-700" /> Examination Management
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Configure exam schedules, target departments, and assign MCQ items ({exams.length} examinations)
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-semibold text-sm shadow-sm transition self-start sm:self-auto"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Create Examination
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 flex items-start space-x-3 text-red-700">
            <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0 text-red-500" />
            <div className="text-sm font-medium">{error}</div>
          </div>
        )}

        {/* Exams Grid */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-medium text-slate-500">Loading examinations...</p>
          </div>
        ) : exams.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-500 text-sm">
            No examinations configured. Click "Create Examination" to begin.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exams.map((exam) => (
              <div
                key={exam.id}
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between hover:shadow-md transition"
              >
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    {exam.exam_type === 'CODING' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                        💻 Practical Coding
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                        📝 MCQ Quiz
                      </span>
                    )}
                  </div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="text-base font-bold text-slate-900 leading-snug line-clamp-2">
                      {exam.title}
                    </h3>
                    <div className="flex items-center space-x-1 flex-shrink-0">
                      <button
                        onClick={() => openEditModal(exam)}
                        className="p-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
                        title="Edit Exam"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteExam(exam.id)}
                        className="p-1 rounded-md border border-red-200 text-red-600 hover:bg-red-50 transition"
                        title="Delete Exam"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 mb-4">
                    {exam.description || 'No description.'}
                  </p>

                  {/* Target Departments */}
                  <div className="mb-4 flex flex-wrap gap-1.5">
                    {exam.department_details && exam.department_details.length > 0 ? (
                      exam.department_details.map((dept) => (
                        <span
                          key={dept.id}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-sky-100 text-sky-800"
                        >
                          {dept.code}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-amber-700 italic">No department assigned</span>
                    )}
                  </div>

                  {/* Schedule Details */}
                  <div className="space-y-1.5 text-xs text-slate-500 border-t border-slate-100 pt-3">
                    <div className="flex items-center">
                      <Clock className="h-3.5 w-3.5 mr-2 text-slate-400" />
                      <span>Duration: <strong className="text-slate-700">{exam.duration_minutes} mins</strong></span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-3.5 w-3.5 mr-2 text-slate-400" />
                      <span>Start: <strong className="text-slate-700">{new Date(exam.start_datetime).toLocaleDateString()} {new Date(exam.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-3.5 w-3.5 mr-2 text-slate-400" />
                      <span>End: <strong className="text-slate-700">{new Date(exam.end_datetime).toLocaleDateString()} {new Date(exam.end_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-700">
                    Pool: {exam.question_pool_size || exam.question_count} Qs | {exam.questions_per_attempt || 30} per student | Max Violations: {exam.max_violations || 6} | {exam.total_marks} Marks
                  </span>
                  <span className={exam.is_active ? 'text-emerald-600' : 'text-slate-400'}>
                    {exam.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create / Edit Exam Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-hidden">
            <div className="bg-white max-w-4xl w-full rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
                <div className="flex items-center space-x-2.5">
                  <span className={`p-2 rounded-lg ${examType === 'CODING' ? 'bg-purple-100 text-purple-700' : 'bg-teal-100 text-teal-700'}`}>
                    <FileText className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {editingExam ? 'Edit Examination' : 'Create Examination'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Configure schedule, eligible cohorts, and question allocation
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Scrollable Modal Form Body */}
              <form onSubmit={handleSaveExam} className="flex flex-col flex-1 overflow-hidden">
                <div className="px-6 py-5 overflow-y-auto flex-1 space-y-5">
                  {modalError && (
                    <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-700 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0 text-red-500" />
                      {modalError}
                    </div>
                  )}

                  {/* Section 1: Exam Format Selection */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                      Exam Format & Type
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => handleExamTypeChange('MCQ')}
                        className={`p-3.5 rounded-xl border text-left flex items-start space-x-3 transition ${
                          examType === 'MCQ'
                            ? 'bg-teal-50/70 border-teal-600 ring-2 ring-teal-600/20 text-slate-900 shadow-sm'
                            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        <span className="text-2xl mt-0.5">📝</span>
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="font-bold text-sm text-slate-900">MCQ Quiz</span>
                            {examType === 'MCQ' && (
                              <span className="text-[10px] bg-teal-600 text-white font-bold px-1.5 py-0.2 rounded">Selected</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            Online MCQ test with violation detection, tab-switch warnings, and fullscreen timer.
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleExamTypeChange('CODING')}
                        className={`p-3.5 rounded-xl border text-left flex items-start space-x-3 transition ${
                          examType === 'CODING'
                            ? 'bg-purple-50/70 border-purple-600 ring-2 ring-purple-600/20 text-slate-900 shadow-sm'
                            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        <span className="text-2xl mt-0.5">💻</span>
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="font-bold text-sm text-slate-900">Practical Coding</span>
                            {examType === 'CODING' && (
                              <span className="text-[10px] bg-purple-600 text-white font-bold px-1.5 py-0.2 rounded">Selected</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            Solve 3 random problems from 10. Local IDE permitted. Students upload source files.
                          </p>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Section 2: Basic Info */}
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Exam Title
                      </label>
                      <input
                        type="text"
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Final-Year B.Tech Technical Assessment"
                        className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Description / Instructions
                      </label>
                      <textarea
                        rows={2}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Assessment instructions or syllabus guidelines..."
                        className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                      />
                    </div>
                  </div>

                  {/* Section 3: Assessment Parameters */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
                      Timing & Assessment Rules
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Duration (Minutes)
                        </label>
                        <input
                          type="number"
                          min="5"
                          max="300"
                          required
                          value={durationMinutes}
                          onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10))}
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                        />
                        <span className="text-[10px] text-slate-400 mt-0.5 block">Standard: {examType === 'CODING' ? '60-90m' : '30-60m'}</span>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Questions / Student
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="300"
                          required
                          value={questionsPerAttempt}
                          onChange={(e) => setQuestionsPerAttempt(parseInt(e.target.value, 10))}
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                        />
                        <span className="text-[10px] text-slate-400 mt-0.5 block">Random subset from pool</span>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Max Violations
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          required
                          disabled={examType === 'CODING'}
                          value={examType === 'CODING' ? 0 : maxViolations}
                          onChange={(e) => setMaxViolations(parseInt(e.target.value, 10) || 6)}
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 disabled:bg-slate-100 disabled:text-slate-400"
                        />
                        <span className="text-[10px] text-slate-400 mt-0.5 block">
                          {examType === 'CODING' ? 'Disabled (IDE allowed)' : 'Strikes allowed'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-3 border-t border-slate-200">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Start Datetime
                        </label>
                        <input
                          type="datetime-local"
                          required
                          value={startDatetime}
                          onChange={(e) => setStartDatetime(e.target.value)}
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          End Datetime
                        </label>
                        <input
                          type="datetime-local"
                          required
                          value={endDatetime}
                          onChange={(e) => setEndDatetime(e.target.value)}
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 4: Target Departments */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                      Eligible Student Departments
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {departments.map((dept) => {
                        const checked = selectedDepts.includes(dept.id);
                        return (
                          <label
                            key={dept.id}
                            className={`flex items-center space-x-2.5 px-3.5 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition ${
                              checked
                                ? 'bg-sky-50 border-sky-500 text-sky-900 shadow-sm'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleDeptToggle(dept.id)}
                              className="h-4 w-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
                            />
                            <span>{dept.name} ({dept.code})</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Section 5: Question Bank Pool Allocation */}
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                            Question Pool Allocation
                          </label>
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            examType === 'CODING' ? 'bg-purple-100 text-purple-800' : 'bg-teal-100 text-teal-800'
                          }`}>
                            {displayedPoolQuestions.length} Available {examType} Questions
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {examType === 'CODING'
                            ? `Each student will be served ${questionsPerAttempt} randomly selected problems from this ${selectedQuestions.length}-problem pool.`
                            : `Each student will be served ${questionsPerAttempt} randomly selected questions from this ${selectedQuestions.length}-question pool.`}
                        </p>
                      </div>

                      <div className="flex items-center space-x-2 self-start sm:self-auto shrink-0">
                        <button
                          type="button"
                          onClick={handleSelectAllDisplayed}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 transition"
                        >
                          Select All ({displayedPoolQuestions.length})
                        </button>
                        <button
                          type="button"
                          onClick={handleDeselectAll}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 transition"
                        >
                          Deselect All
                        </button>
                        <div className="text-xs font-bold text-teal-800 bg-white px-2.5 py-1 rounded-lg border border-teal-200 whitespace-nowrap shadow-sm">
                          {selectedQuestions.length} Selected • {calculatedTotalMarks}m
                        </div>
                      </div>
                    </div>

                    {/* Search Toolbar */}
                    <div className="relative mb-3">
                      <input
                        type="text"
                        placeholder={`Search ${displayedPoolQuestions.length} ${examType} questions by keyword, topic or difficulty...`}
                        value={questionSearch}
                        onChange={(e) => setQuestionSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                      />
                      <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                      {questionSearch && (
                        <button
                          type="button"
                          onClick={() => setQuestionSearch('')}
                          className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {/* Optional Reordering Collapsible */}
                    {selectedQuestions.length > 0 && (
                      <div className="mb-3">
                        <button
                          type="button"
                          onClick={() => setShowSelectedOrder(!showSelectedOrder)}
                          className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center space-x-1"
                        >
                          <span>{showSelectedOrder ? '▼ Hide' : '▶ Show'} Question Order & Weights ({selectedQuestions.length} selected)</span>
                        </button>

                        {showSelectedOrder && (
                          <div className="mt-2 max-h-36 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white p-2 text-xs">
                            {selectedQuestionObjects.map((q, idx) => (
                              <div key={q.id} className="flex items-center justify-between py-1 px-2 hover:bg-slate-50 rounded">
                                <span className="font-bold text-slate-500 w-6">#{idx + 1}</span>
                                <span className="flex-1 truncate mx-2 text-slate-800 font-medium">
                                  {formatQuestionTitle(q.question_text)}
                                </span>
                                <span className="text-slate-500 font-mono mr-2">{q.marks}m</span>
                                <div className="flex items-center space-x-1">
                                  <button
                                    type="button"
                                    onClick={() => moveQuestion(idx, 'UP')}
                                    disabled={idx === 0}
                                    className="p-0.5 rounded hover:bg-slate-200 disabled:opacity-20"
                                  >
                                    <ArrowUp className="h-3 w-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => moveQuestion(idx, 'DOWN')}
                                    disabled={idx === selectedQuestions.length - 1}
                                    className="p-0.5 rounded hover:bg-slate-200 disabled:opacity-20"
                                  >
                                    <ArrowDown className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Question Checkboxes List */}
                    <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white shadow-inner">
                      {displayedQuestions.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-400">
                          No {examType} questions found matching "{questionSearch}".
                        </div>
                      ) : (
                        displayedQuestions.map((q) => {
                          const isChecked = selectedQuestions.includes(q.id);
                          return (
                            <label
                              key={q.id}
                              className={`flex items-start space-x-3 py-2.5 px-3 cursor-pointer text-xs transition ${
                                isChecked ? 'bg-teal-50/40 hover:bg-teal-50/60' : 'hover:bg-slate-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleQuestionToggle(q.id)}
                                className="mt-0.5 h-4 w-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-semibold text-slate-900">
                                    {formatQuestionTitle(q.question_text)}
                                  </span>
                                  <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                    q.question_type === 'CODING'
                                      ? 'bg-purple-100 text-purple-700'
                                      : 'bg-blue-100 text-blue-700'
                                  }`}>
                                    {q.question_type || 'MCQ'}
                                  </span>
                                  {q.difficulty && (
                                    <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                                      {q.difficulty}
                                    </span>
                                  )}
                                  <span className="text-slate-400 text-[11px]">
                                    • {q.category || 'General'} • {q.marks} marks
                                  </span>
                                </div>
                                {q.question_text.includes('\n') && (
                                  <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                                    {q.question_text.split('\n').filter(Boolean).slice(1, 2).join(' ')}
                                  </p>
                                )}
                              </div>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* Sticky Footer */}
                <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
                  <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="h-4 w-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                    />
                    <span>Exam is Active & Available</span>
                  </label>

                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs shadow-sm transition"
                    >
                      {editingExam ? 'Update Examination' : 'Create Examination'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
