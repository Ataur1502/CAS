import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api, type ExamAttemptDetail, type Question } from '../../api/client';
import { CodingProblemView } from '../../components/CodingProblemView';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Send,
  Maximize,
  ShieldAlert,
  ArrowLeft,
  Info,
  Upload,
  FileCode,
  Code2,
  Trash2,
  Download
} from 'lucide-react';

interface FileAnswer {
  file_name: string;
  file_url: string | null;
  file_size: number;
}

export const ExamRoom: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  // State
  const [attempt, setAttempt] = useState<ExamAttemptDetail | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fullscreen gate and state
  const [hasEnteredFullscreen, setHasEnteredFullscreen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => Boolean(document.fullscreenElement));

  // Timer
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);

  // Local answers cache: { [questionId]: selectedOptionId }
  const [answers, setAnswers] = useState<Record<number, number | null>>({});
  const [fileAnswers, setFileAnswers] = useState<Record<number, FileAnswer | null>>({});
  const [savingAnswer, setSavingAnswer] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Integrity violation tracking
  const [violationCount, setViolationCount] = useState(0);
  const maxViolations = attempt?.max_violations || 6;
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const [autoSubmitReason, setAutoSubmitReason] = useState<string | null>(null);

  // Modals
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Cooldown ref for debouncing violations
  const lastViolationTimeRef = useRef<number>(0);
  const isTerminatedRef = useRef<boolean>(false);

  // 1. Initialize or resume exam attempt
  const initExam = useCallback(async () => {
    if (!examId) return;
    setLoading(true);
    setError(null);

    try {
      const data = await api.startExam(parseInt(examId, 10));
      setAttempt(data);
      setRemainingSeconds(data.remaining_seconds);
      setViolationCount(data.violation_count);

      // Restore saved answers (both MCQ and file uploads)
      const restoredOptions: Record<number, number | null> = {};
      const restoredFiles: Record<number, FileAnswer | null> = {};
      if (data.answers) {
        Object.entries(data.answers).forEach(([qIdStr, ans]) => {
          const qId = parseInt(qIdStr, 10);
          restoredOptions[qId] = ans.option_id ?? null;
          if (ans.file_name) {
            restoredFiles[qId] = {
              file_name: ans.file_name,
              file_url: ans.file_url ?? null,
              file_size: ans.file_size ?? 0,
            };
          }
        });
      }
      setAnswers(restoredOptions);
      setFileAnswers(restoredFiles);

      // Coding exam does not require entering fullscreen
      if (data.exam_type === 'CODING') {
        setHasEnteredFullscreen(true);
      }

      // Check if already completed
      if (data.status === 'SUBMITTED' || data.status === 'AUTO_SUBMITTED') {
        isTerminatedRef.current = true;
        setAutoSubmitted(data.status === 'AUTO_SUBMITTED');
        setAutoSubmitReason(data.submission_reason);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start or resume the examination.');
    } finally {
      setLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    initExam();
  }, [initExam]);

  // 2. Countdown Timer
  useEffect(() => {
    if (loading || !attempt || attempt.status !== 'IN_PROGRESS' || isTerminatedRef.current) {
      return;
    }

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, attempt]);

  const handleTimeExpire = async () => {
    if (!attempt || isTerminatedRef.current) return;
    isTerminatedRef.current = true;
    try {
      const res = await api.getAttemptDetail(attempt.id);
      setAttempt(res);
      setAutoSubmitted(true);
      setAutoSubmitReason('TIME_EXPIRED');
    } catch (e) {
      setAutoSubmitted(true);
      setAutoSubmitReason('TIME_EXPIRED');
    }
  };

  // 3. Violation handler with 1.5s cooldown
  const triggerViolation = useCallback(
    async (triggerName: string) => {
      if (
        !attempt ||
        attempt.status !== 'IN_PROGRESS' ||
        isTerminatedRef.current ||
        !hasEnteredFullscreen ||
        attempt.exam_type === 'CODING'
      ) {
        return;
      }

      const now = Date.now();
      if (now - lastViolationTimeRef.current < 1500) {
        return; // Debounce rapid consecutive events (e.g. blur + visibilitychange)
      }
      lastViolationTimeRef.current = now;

      try {
        const res = await api.recordViolation(attempt.id);
        setViolationCount(res.violation_count);

        if (res.auto_submitted) {
          isTerminatedRef.current = true;
          setAutoSubmitted(true);
          setAutoSubmitReason('EXAM_INTEGRITY_VIOLATION');
          setWarningMessage(res.message);
        } else {
          setWarningMessage(res.message || `Warning: Leaving the exam window has been detected (${triggerName}). This activity is recorded.`);
          setTimeout(() => {
            setWarningMessage(null);
          }, 7000);
        }
      } catch (err: any) {
        console.error('Failed to log violation:', err);
      }
    },
    [attempt, hasEnteredFullscreen]
  );

  // 4. Attach Security Listeners (Visibility, Blur, Fullscreen exit, Right-click prevention)
  // Completely bypassed for practical CODING examinations where students use local IDEs
  useEffect(() => {
    if (
      !hasEnteredFullscreen ||
      !attempt ||
      attempt.status !== 'IN_PROGRESS' ||
      isTerminatedRef.current ||
      attempt.exam_type === 'CODING'
    ) {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        triggerViolation('Tab / Window Hidden');
      }
    };

    const handleWindowBlur = () => {
      triggerViolation('Focus Lost');
    };

    const handleFullscreenChange = () => {
      const active = Boolean(document.fullscreenElement);
      setIsFullscreen(active);
      if (!active) {
        triggerViolation('Fullscreen Exited');
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Deter Ctrl+C, Ctrl+V, Ctrl+U, F12
      if (
        (e.ctrlKey && (e.key === 'c' || e.key === 'C' || e.key === 'u' || e.key === 'U')) ||
        e.key === 'F12'
      ) {
        e.preventDefault();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [hasEnteredFullscreen, attempt, triggerViolation]);

  // Keep fullscreen state in sync globally
  useEffect(() => {
    const handleSyncFullscreen = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleSyncFullscreen);
    return () => {
      document.removeEventListener('fullscreenchange', handleSyncFullscreen);
    };
  }, []);

  // Request fullscreen and begin exam (cross-browser)
  const enterExamFullscreen = async () => {
    try {
      const docEl = document.documentElement as any;
      if (docEl.requestFullscreen) {
        await docEl.requestFullscreen();
      } else if (docEl.webkitRequestFullscreen) {
        await docEl.webkitRequestFullscreen();
      } else if (docEl.mozRequestFullScreen) {
        await docEl.mozRequestFullScreen();
      } else if (docEl.msRequestFullscreen) {
        await docEl.msRequestFullscreen();
      }
      setIsFullscreen(true);
    } catch (err) {
      console.warn('Fullscreen request bypassed or denied:', err);
    }
    setHasEnteredFullscreen(true);
  };

  // Safe handler for Full Screen buttons:
  // Immediately requests/restores fullscreen mode without prompting exit or penalty.
  const handleFullscreenButtonClick = async () => {
    await enterExamFullscreen();
  };

  // 5. Select Option & Autosave (MCQ)
  const handleSelectOption = async (questionId: number, optionId: number) => {
    if (!attempt || attempt.status !== 'IN_PROGRESS' || isTerminatedRef.current) return;

    // Optimistically update local state
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));

    setSavingAnswer(true);
    try {
      await api.saveAnswer(attempt.id, questionId, optionId);
    } catch (err: any) {
      console.error('Error autosaving answer:', err);
      if (err.message.includes('expired') || err.message.includes('submitted')) {
        isTerminatedRef.current = true;
        setAutoSubmitted(true);
      }
    } finally {
      setSavingAnswer(false);
    }
  };

  // 5b. Upload Source Code File (Practical Coding)
  const handleFileUpload = async (questionId: number, file: File) => {
    if (!attempt || attempt.status !== 'IN_PROGRESS' || isTerminatedRef.current) return;
    setUploadError(null);

    if (file.size > 15 * 1024 * 1024) {
      setUploadError('File size exceeds the 15MB limit. Please upload a smaller file.');
      return;
    }

    setUploadingFile(true);
    try {
      const res = await api.uploadSourceFile(attempt.id, questionId, file);
      setFileAnswers((prev) => ({
        ...prev,
        [questionId]: {
          file_name: res.file_name,
          file_url: res.file_url,
          file_size: res.file_size,
        },
      }));
    } catch (err: any) {
      console.error('Error uploading source file:', err);
      setUploadError(err.message || 'Failed to upload source file.');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleRemoveFile = async (questionId: number) => {
    if (!attempt || attempt.status !== 'IN_PROGRESS' || isTerminatedRef.current) return;
    if (!confirm('Are you sure you want to remove your uploaded file for this problem?')) return;
    setUploadError(null);
    setUploadingFile(true);
    try {
      await api.removeSourceFile(attempt.id, questionId);
      setFileAnswers((prev) => ({
        ...prev,
        [questionId]: null,
      }));
    } catch (err: any) {
      console.error('Error removing file:', err);
      setUploadError(err.message || 'Failed to remove source file.');
    } finally {
      setUploadingFile(false);
    }
  };

  // 6. Manual Submit
  const handleConfirmSubmit = async () => {
    if (!attempt || isTerminatedRef.current) return;
    setSubmitting(true);
    isTerminatedRef.current = true;

    try {
      const res = await api.submitExam(attempt.id);
      if (res.submissions && res.submissions.length > 0) {
        setFileAnswers((prev) => {
          const updated = { ...prev };
          res.submissions!.forEach((s) => {
            updated[s.question_id] = {
              file_name: s.file_name,
              file_url: s.file_url ?? null,
              file_size: s.file_size,
            };
          });
          return updated;
        });
      }
      setAttempt((prev) =>
        prev
          ? {
              ...prev,
              status: 'SUBMITTED',
              score: res.score,
              max_score: res.max_score,
              percentage: res.percentage,
              submitted_at: res.submitted_at,
            }
          : null
      );
      setShowSubmitModal(false);
      // Exit fullscreen if active
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    } catch (err: any) {
      alert(err.message || 'Submission error');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-300 font-medium text-sm">Preparing secure examination room...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="bg-white max-w-md w-full p-8 rounded-xl shadow-lg border border-slate-200 text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-sm text-slate-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full inline-flex justify-center items-center py-2.5 px-4 rounded-lg bg-sky-700 text-white font-medium hover:bg-sky-800 transition"
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Gatekeeper: Fullscreen Prompt Modal (Bypassed for CODING exams)
  if (!hasEnteredFullscreen && attempt?.status === 'IN_PROGRESS' && !isTerminatedRef.current && attempt?.exam_type !== 'CODING') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white max-w-lg w-full rounded-2xl shadow-2xl p-8 border border-slate-200">
          <div className="flex items-center space-x-3 text-sky-700 mb-4">
            <Maximize className="h-8 w-8" />
            <h2 className="text-2xl font-bold text-slate-900">Examination Instructions</h2>
          </div>

          <div className="space-y-4 text-sm text-slate-600 mb-8 leading-relaxed">
            <div className="p-3 bg-sky-50 rounded-lg border border-sky-100 text-sky-900">
              <strong>{attempt.exam_title}</strong>
              <div className="text-xs text-sky-700 mt-0.5">Duration: {attempt.duration_minutes} minutes | Questions: {attempt.questions.length}</div>
            </div>

            <ul className="list-disc pl-5 space-y-2 text-slate-700">
              <li>The exam will run in <strong>Fullscreen Mode</strong>.</li>
              <li>Leaving the exam window, switching tabs, or exiting fullscreen is recorded as a violation.</li>
              <li>A maximum of <strong>{maxViolations} violations</strong> is permitted. On the {maxViolations}th violation, your exam will be automatically submitted.</li>
              <li>Your answers are autosaved in real-time to the university server.</li>
            </ul>
          </div>

          <button
            onClick={enterExamFullscreen}
            className="w-full flex items-center justify-center py-3.5 px-6 rounded-xl bg-sky-700 hover:bg-sky-800 text-white font-bold text-base shadow-lg transition"
          >
            <Maximize className="h-5 w-5 mr-2" /> Enter Fullscreen & Begin Exam
          </button>
        </div>
      </div>
    );
  }

  // Attempt Terminated / Submitted View
  if (attempt?.status === 'SUBMITTED' || attempt?.status === 'AUTO_SUBMITTED' || autoSubmitted) {
    const isAuto = attempt?.status === 'AUTO_SUBMITTED' || autoSubmitted;
    const uploadedCount = Object.values(fileAnswers).filter(Boolean).length;
    const totalAssigned = attempt?.questions?.length || 0;

    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white max-w-xl w-full rounded-2xl shadow-xl p-6 sm:p-8 border border-slate-200 text-center">
          {isAuto ? (
            <div className="h-16 w-16 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="h-10 w-10" />
            </div>
          ) : (
            <div className="h-16 w-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-10 w-10" />
            </div>
          )}

          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            {isAuto ? 'Exam Automatically Submitted' : 'Exam Successfully Submitted'}
          </h2>

          <p className="text-sm text-slate-600 mb-6">
            {autoSubmitReason === 'EXAM_INTEGRITY_VIOLATION' || attempt?.submission_reason === 'EXAM_INTEGRITY_VIOLATION'
              ? `Your exam was automatically submitted because the maximum number of integrity violations (${attempt?.violation_count || violationCount}/${maxViolations}) was reached.`
              : autoSubmitReason === 'TIME_EXPIRED' || attempt?.submission_reason === 'TIME_EXPIRED'
              ? 'Your exam was automatically submitted because the exam time expired.'
              : attempt?.exam_type === 'CODING'
              ? 'Your source code submissions have been recorded and saved safely on the server. Coding results will be published soon after post-exam validation.'
              : 'Your responses have been recorded on the server.'}
          </p>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 mb-6 text-left space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Student Roll Number:</span>
              <span className="font-mono font-bold text-slate-800">{user?.roll_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Status:</span>
              <span className="font-bold text-slate-800">{attempt?.status}</span>
            </div>
            {attempt?.exam_type === 'CODING' ? (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-500">Exam Format:</span>
                  <span className="font-bold text-purple-700">Practical Coding Assessment</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Evaluation:</span>
                  <span className="font-bold text-amber-700">Results will be published soon</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between">
                <span className="text-slate-500">Violations Recorded:</span>
                <span className={`font-bold ${(attempt?.violation_count || violationCount) >= maxViolations ? 'text-red-600' : 'text-slate-800'}`}>
                  {attempt?.violation_count || violationCount} / {maxViolations}
                </span>
              </div>
            )}
          </div>

          {/* Uploaded Solution Files Breakdown (Practical Coding) */}
          {attempt?.exam_type === 'CODING' && (
            <div className="mb-6 text-left">
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center">
                  <FileCode className="h-4 w-4 mr-1.5 text-purple-600" />
                  Your Uploaded Files ({uploadedCount} / {totalAssigned})
                </h3>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center">
                  <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" /> Saved on Server
                </span>
              </div>

              <div className="space-y-2">
                {attempt.questions && attempt.questions.length > 0 ? (
                  attempt.questions.map((q, idx) => {
                    const fileAns = fileAnswers[q.id];
                    const firstLine = q.question_text.split('\n')[0].replace(/^#+\s*/, '').trim();
                    return (
                      <div
                        key={q.id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/70 gap-2"
                      >
                        <div className="flex items-start sm:items-center space-x-2.5 min-w-0">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 text-purple-800 text-xs font-bold flex items-center justify-center mt-0.5 sm:mt-0">
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-800 truncate max-w-[240px] sm:max-w-xs" title={firstLine}>
                              {firstLine}
                            </p>
                            {fileAns ? (
                              <p className="text-[11px] font-mono text-emerald-700 flex items-center mt-0.5">
                                <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600 flex-shrink-0" />
                                <span className="truncate max-w-[180px] font-bold">{fileAns.file_name}</span>
                                <span className="text-slate-400 ml-1.5 font-sans">
                                  ({((fileAns.file_size || 0) / 1024).toFixed(1)} KB)
                                </span>
                              </p>
                            ) : (
                              <p className="text-[11px] text-amber-600 italic mt-0.5">
                                No solution file uploaded
                              </p>
                            )}
                          </div>
                        </div>

                        {fileAns?.file_url && (
                          <a
                            href={fileAns.file_url}
                            download={fileAns.file_name}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="self-end sm:self-center px-2.5 py-1 text-xs font-semibold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 flex-shrink-0 inline-flex items-center transition shadow-sm"
                          >
                            <Download className="h-3 w-3 mr-1" /> Download
                          </a>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-500 italic">No questions found.</p>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => navigate('/results')}
              className="flex-1 py-3 px-4 rounded-xl bg-sky-700 hover:bg-sky-800 text-white font-semibold text-sm transition shadow-sm"
            >
              {attempt?.exam_type === 'CODING' ? 'View My Submissions →' : 'View My Results →'}
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="flex-1 py-3 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-sm transition"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isCodingExam = attempt?.exam_type === 'CODING';
  const currentQuestion: Question | undefined = attempt?.questions[currentIndex];
  const isCodingQuestion = isCodingExam || currentQuestion?.question_type === 'CODING';
  const answeredCount = isCodingExam
    ? Object.values(fileAnswers).filter((v) => Boolean(v?.file_name)).length
    : Object.values(answers).filter((v) => v !== null && v !== undefined).length;
  const totalQuestions = attempt?.questions.length || 0;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col exam-secure-mode select-none">
      {/* Top Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800 px-6 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-4">
          <div className="font-bold text-base tracking-wide text-sky-400">
            {attempt?.exam_title}
          </div>
          <span className="text-slate-600">|</span>
          <div className="text-sm text-slate-300">
            Roll: <span className="font-mono font-semibold text-white">{user?.roll_number}</span>
          </div>
        </div>

        {/* Violations / Mode, Fullscreen & Timer */}
        <div className="flex items-center space-x-2.5 sm:space-x-3">
          {/* Mode Indicator or Violation Counter */}
          {isCodingExam ? (
            <div className="flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-950 text-purple-300 border border-purple-800">
              <Code2 className="h-3.5 w-3.5 mr-1.5 text-purple-400" />
              <span>Mode: <strong>Local IDE Allowed</strong></span>
            </div>
          ) : (
            <div
              className={`flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                violationCount >= maxViolations - 1
                  ? 'bg-red-950 text-red-300 border-red-700 animate-pulse'
                  : violationCount > 0
                  ? 'bg-amber-950 text-amber-300 border-amber-700'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
              title={`${Math.max(0, maxViolations - violationCount)} warnings remaining before auto-submission`}
            >
              <ShieldAlert className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
              <span>Violations: <strong>{violationCount}</strong> / {maxViolations}</span>
            </div>
          )}

          {/* Full Screen Button in Header (MCQ exams only) */}
          {!isCodingExam && (
            <button
              type="button"
              onClick={handleFullscreenButtonClick}
              className={`inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition border shadow-sm ${
                isFullscreen
                  ? 'bg-emerald-950/90 text-emerald-300 border-emerald-700 hover:bg-emerald-900'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold border-amber-300 animate-pulse'
              }`}
              title={isFullscreen ? 'Full Screen mode is active' : 'Click to Enter Full Screen Mode'}
              aria-label="Full Screen Mode"
            >
              {isFullscreen ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-1.5 text-emerald-400" />
                  <span>Full Screen Active</span>
                </>
              ) : (
                <>
                  <Maximize className="h-4 w-4 mr-1.5 text-slate-950" />
                  <span>Enter Full Screen</span>
                </>
              )}
            </button>
          )}

          {/* Countdown Clock */}
          <div
            className={`flex items-center px-4 py-1.5 rounded-lg text-sm font-mono font-bold tracking-wider ${
              remainingSeconds < 300
                ? 'bg-red-600 text-white animate-pulse'
                : 'bg-slate-800 text-amber-300 border border-slate-700'
            }`}
          >
            <Clock className="h-4 w-4 mr-2" />
            {formatTime(remainingSeconds)}
          </div>

          <button
            onClick={() => setShowSubmitModal(true)}
            className="inline-flex items-center px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-sm transition"
          >
            <Send className="h-3.5 w-3.5 mr-1.5" /> Submit Exam
          </button>
        </div>
      </header>

      {/* Violation Alert Banner (MCQ only) */}
      {!isCodingExam && warningMessage && (
        <div className="bg-red-600 text-white px-6 py-2.5 text-sm font-semibold flex items-center justify-center space-x-3 shadow-md animate-bounce">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>{warningMessage}</span>
          {!isFullscreen && (
            <button
              type="button"
              onClick={handleFullscreenButtonClick}
              className="ml-2 px-3.5 py-1 bg-white hover:bg-red-50 text-red-700 font-bold text-xs rounded-md shadow transition inline-flex items-center"
            >
              <Maximize className="h-3.5 w-3.5 mr-1" /> Re-enter Fullscreen
            </button>
          )}
        </div>
      )}

      {/* Non-Fullscreen Warning Strip (MCQ only) */}
      {!isCodingExam && !isFullscreen && hasEnteredFullscreen && (
        <div className="bg-amber-500 text-slate-950 px-6 py-2.5 text-xs sm:text-sm font-semibold flex items-center justify-between shadow-md border-b-2 border-amber-600 sticky top-0 z-30">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-slate-950 flex-shrink-0 animate-bounce" />
            <span>You are currently not in Full Screen mode. Full Screen is required for examination integrity.</span>
          </div>
          <button
            type="button"
            onClick={handleFullscreenButtonClick}
            className="ml-4 px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-lg transition inline-flex items-center shadow flex-shrink-0"
          >
            <Maximize className="h-4 w-4 mr-1.5 text-amber-400" /> Enter Full Screen Now
          </button>
        </div>
      )}

      {/* Main Workspace */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Question Area (3 cols) */}
        <div className="lg:col-span-3 flex flex-col justify-between bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          {currentQuestion ? (
            <div>
              {isCodingQuestion ? (
                <div>
                  <CodingProblemView
                    questionText={currentQuestion.question_text}
                    category={currentQuestion.category}
                    difficulty={currentQuestion.difficulty}
                    marks={currentQuestion.marks}
                    questionNumber={currentIndex + 1}
                    totalQuestions={totalQuestions}
                  />

                  {/* Coding File Upload Section */}
                  <div className="space-y-6 pt-6 border-t border-slate-200 mt-8">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                          <Upload className="h-4 w-4 text-sky-600" />
                          <span>Upload Solution File</span>
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Submit your completed source code (.py, .java, .cpp, .c, .js, .go, etc.) for this question.
                        </p>
                      </div>
                      {uploadingFile && (
                        <span className="text-xs text-sky-700 font-semibold flex items-center bg-sky-50 px-3 py-1.5 rounded-lg border border-sky-200">
                          <div className="w-3.5 h-3.5 border-2 border-sky-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                          Uploading & Saving File...
                        </span>
                      )}
                    </div>

                    {uploadError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-center">
                        <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0 text-red-500" />
                        {uploadError}
                      </div>
                    )}

                    {fileAnswers[currentQuestion.id]?.file_name ? (
                      <div className="border-2 border-emerald-200 bg-emerald-50/40 rounded-2xl p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div className="flex items-center space-x-3">
                            <div className="h-12 w-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                              <FileCode className="h-6 w-6" />
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-slate-900 text-sm sm:text-base font-mono">
                                  {fileAnswers[currentQuestion.id]?.file_name}
                                </span>
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                  <CheckCircle2 className="h-3 w-3 mr-1" /> Uploaded & Saved
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-1">
                                File size: {((fileAnswers[currentQuestion.id]!.file_size || 0) / 1024).toFixed(1)} KB
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            {fileAnswers[currentQuestion.id]?.file_url && (
                              <a
                                href={fileAnswers[currentQuestion.id]!.file_url!}
                                download={fileAnswers[currentQuestion.id]!.file_name}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition inline-flex items-center"
                              >
                                <Download className="h-3.5 w-3.5 mr-1" /> View / Download
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={uploadingFile}
                              className="px-3 py-1.5 rounded-lg bg-sky-700 hover:bg-sky-800 text-white text-xs font-semibold shadow-sm transition inline-flex items-center disabled:opacity-50"
                            >
                              <Upload className="h-3.5 w-3.5 mr-1" /> Replace File
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveFile(currentQuestion.id)}
                              disabled={uploadingFile}
                              className="px-2.5 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition inline-flex items-center disabled:opacity-50"
                              title="Remove File"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                            handleFileUpload(currentQuestion.id, e.dataTransfer.files[0]);
                          }
                        }}
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-300 hover:border-purple-500 hover:bg-purple-50/20 rounded-2xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center group"
                      >
                        <div className="h-14 w-14 rounded-2xl bg-purple-50 text-purple-600 group-hover:bg-purple-100 group-hover:scale-105 transition flex items-center justify-center mb-3">
                          <Upload className="h-7 w-7" />
                        </div>
                        <h4 className="text-base font-bold text-slate-900 group-hover:text-purple-700">
                          Upload Solution Source File
                        </h4>
                        <p className="text-xs text-slate-500 mt-1 max-w-sm">
                          Drag & drop your code file here, or click to browse from your computer.
                          <br />
                          Accepted: <span className="font-mono text-slate-700">.py, .java, .cpp, .c, .js, .ts, .cs, .go, .rs, .txt</span>
                        </p>
                        <span className="inline-flex items-center mt-3 text-xs font-bold text-purple-700 bg-purple-100 px-3 py-1 rounded-full">
                          Maximum file size: 15 MB
                        </span>
                      </div>
                    )}

                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept=".py,.java,.cpp,.c,.cc,.cxx,.h,.hpp,.js,.jsx,.ts,.tsx,.cs,.go,.rs,.php,.rb,.swift,.kt,.txt"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileUpload(currentQuestion.id, e.target.files[0]);
                          e.target.value = '';
                        }
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  {/* MCQ Question Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                    <div className="flex items-center space-x-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-sky-700 bg-sky-50 px-2.5 py-1 rounded-md">
                        Question {currentIndex + 1} of {totalQuestions}
                      </span>
                      {currentQuestion.category && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {currentQuestion.category}
                        </span>
                      )}
                      <span className="text-xs text-slate-500 font-medium">
                        Marks: <strong className="text-slate-800">{currentQuestion.marks}</strong>
                      </span>
                    </div>
                    <div>
                      {savingAnswer && (
                        <span className="text-xs text-slate-400 italic">Autosaving answer...</span>
                      )}
                    </div>
                  </div>

                  {/* Question Text */}
                  <div className="text-base text-slate-900 mb-6 leading-relaxed whitespace-pre-wrap font-sans font-medium">
                    {currentQuestion.question_text}
                  </div>

                  {/* Options List for MCQ */}
                  <div className="space-y-3.5">
                    {currentQuestion.options.map((opt) => {
                      const isSelected = answers[currentQuestion.id] === opt.id;
                      return (
                        <div
                          key={opt.id}
                          onClick={() => opt.id && handleSelectOption(currentQuestion.id, opt.id)}
                          className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition ${
                            isSelected
                              ? 'border-sky-600 bg-sky-50/50 shadow-sm'
                              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <div
                            className={`h-7 w-7 rounded-full flex items-center justify-center font-bold text-sm mr-4 transition ${
                              isSelected
                                ? 'bg-sky-700 text-white'
                                : 'bg-slate-100 text-slate-600 border border-slate-300'
                            }`}
                          >
                            {opt.option_key}
                          </div>
                          <div className="text-sm font-medium text-slate-800 flex-1">
                            {opt.option_text}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-20 text-slate-500">No questions found.</div>
          )}

          {/* Bottom Navigation Buttons */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-6 mt-8">
            <button
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="inline-flex items-center px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </button>

            <div className="flex items-center space-x-2.5 sm:space-x-3">
              {/* Full Screen Button in exam workspace (MCQ only) */}
              {!isCodingExam && (
                <button
                  type="button"
                  onClick={handleFullscreenButtonClick}
                  className={`inline-flex items-center px-3.5 py-2 rounded-lg border text-xs sm:text-sm font-semibold transition ${
                    isFullscreen
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                      : 'border-amber-400 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold animate-pulse shadow-sm'
                  }`}
                  title={isFullscreen ? 'Full Screen is currently active' : 'Click to enter full screen'}
                >
                  {isFullscreen ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-1.5 text-emerald-600" />
                      <span>Full Screen: Active</span>
                    </>
                  ) : (
                    <>
                      <Maximize className="h-4 w-4 mr-1.5" />
                      <span>Enter Full Screen</span>
                    </>
                  )}
                </button>
              )}

              <button
                onClick={() => {
                  if (currentIndex < totalQuestions - 1) {
                    setCurrentIndex((prev) => prev + 1);
                  }
                }}
                disabled={currentIndex === totalQuestions - 1}
                className="inline-flex items-center px-5 py-2 rounded-lg bg-sky-700 hover:bg-sky-800 text-white text-sm font-semibold shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Question Palette (1 col) */}
        <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-900 tracking-wide uppercase mb-4">
              {isCodingExam ? 'Problem Palette' : 'Question Palette'}
            </h4>

            {/* Status Legend */}
            <div className="grid grid-cols-2 gap-2 text-xs mb-6 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center space-x-2">
                <span className="w-3.5 h-3.5 rounded bg-emerald-500 block"></span>
                <span className="text-slate-600">{isCodingExam ? 'Uploaded' : 'Answered'} ({answeredCount})</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3.5 h-3.5 rounded bg-slate-200 border border-slate-300 block"></span>
                <span className="text-slate-600">Pending ({totalQuestions - answeredCount})</span>
              </div>
            </div>

            {/* Questions Grid */}
            <div className="grid grid-cols-5 gap-2.5">
              {attempt?.questions.map((q, idx) => {
                const isCurrent = idx === currentIndex;
                const isAnswered = isCodingExam
                  ? Boolean(fileAnswers[q.id]?.file_name)
                  : answers[q.id] !== null && answers[q.id] !== undefined;

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-10 rounded-lg text-xs font-bold transition flex items-center justify-center relative ${
                      isCurrent
                        ? 'ring-2 ring-sky-600 ring-offset-2'
                        : ''
                    } ${
                      isAnswered
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-100">
            <button
              onClick={() => setShowSubmitModal(true)}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition flex items-center justify-center"
            >
              <Send className="h-4 w-4 mr-2" /> {isCodingExam ? 'Submit Solutions' : 'Submit Final Answers'}
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Submit Examination?</h3>
            <p className="text-sm text-slate-600 mb-4">
              You have {isCodingExam ? 'uploaded solutions for' : 'answered'}{' '}
              <strong>{answeredCount}</strong> out of <strong>{totalQuestions}</strong> {isCodingExam ? 'problems' : 'questions'}.
            </p>
            <p className="text-xs text-amber-800 bg-amber-50 p-3 rounded-lg border border-amber-200 mb-6 flex items-start">
              <Info className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" />
              Once submitted, your examination attempt will be finalized and locked.
            </p>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowSubmitModal(false)}
                disabled={submitting}
                className="flex-1 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSubmit}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-sm transition flex items-center justify-center"
              >
                {submitting ? 'Submitting...' : 'Yes, Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Quick-Action Full Screen button when not in fullscreen (MCQ only) */}
      {!isCodingExam && !isFullscreen && hasEnteredFullscreen && (
        <button
          type="button"
          onClick={handleFullscreenButtonClick}
          className="fixed bottom-6 right-6 z-40 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-5 py-3.5 rounded-full shadow-2xl border-2 border-amber-300 animate-pulse flex items-center space-x-2 transition"
          title="Click to restore full screen immediately"
        >
          <Maximize className="h-5 w-5" />
          <span className="text-sm font-extrabold tracking-wide">Enter Full Screen</span>
        </button>
      )}
    </div>
  );
};
