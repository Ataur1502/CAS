// API Client for CAS Examination Platform

const BASE_URL = '/api';

export interface UserProfile {
  id: number;
  username?: string;
  roll_number?: string;
  full_name: string;
  role: 'STUDENT' | 'ADMIN';
  department?: {
    id: number;
    name: string;
    code: string;
  };
}

export interface Department {
  id: number;
  name: string;
  code: string;
  created_at?: string;
}

export interface Option {
  id?: number;
  option_key: 'A' | 'B' | 'C' | 'D';
  option_text: string;
  is_correct?: boolean; // Only present for admin!
}

export interface Question {
  id: number;
  source_id?: string;
  question_type?: 'MCQ' | 'CODING';
  question_text: string;
  marks: number;
  category?: string;
  difficulty?: string;
  is_active?: boolean;
  options: Option[];
  order?: number;
  exam_question_id?: number;
}

export interface ExamCard {
  id: number;
  title: string;
  description: string;
  exam_type?: 'MCQ' | 'CODING';
  duration_minutes: number;
  start_datetime: string;
  end_datetime: string;
  status: 'UPCOMING' | 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED' | 'NOT_ELIGIBLE';
  has_attempted: boolean;
  attempt_id: number | null;
  attempt_status: string | null;
  score: number | null;
  max_score: number | null;
  percentage: number | null;
  question_count: number;
  question_pool_size?: number;
  questions_per_attempt?: number;
  max_violations?: number;
  total_marks: number;
}

export interface ExamAttemptDetail {
  id: number;
  exam_id: number;
  exam_title: string;
  exam_description: string;
  exam_type?: 'MCQ' | 'CODING';
  duration_minutes: number;
  max_violations?: number;
  end_datetime: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'AUTO_SUBMITTED';
  started_at: string;
  submitted_at: string | null;
  score: number | null;
  max_score: number;
  percentage: number | null;
  results_published?: boolean;
  violation_count: number;
  submission_reason: string;
  remaining_seconds: number;
  questions: Question[];
  answers: Record<number, {
    option_id?: number | null;
    option_key?: string | null;
    file_name?: string | null;
    file_url?: string | null;
    file_size?: number | null;
  }>;
  server_time: string;
}

export interface ExamResult {
  id: number;
  roll_number: string;
  student_name: string;
  department_name: string;
  department_code: string;
  exam_id: number;
  exam_title: string;
  exam_type?: 'MCQ' | 'CODING';
  score: number | null;
  max_score: number;
  percentage: number | null;
  results_published?: boolean;
  status: string;
  violation_count: number;
  submission_reason: string;
  submissions?: Array<{
    question_id: number;
    file_name: string;
    file_url: string;
    file_size: number;
    answered_at: string;
  }>;
  started_at: string;
  submitted_at: string;
}

export interface DashboardStats {
  total_students: number;
  cs_students: number;
  iot_students: number;
  total_exams: number;
  active_exams: number;
  total_attempts: number;
  submitted_attempts: number;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('cas_auth_token');
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Token ${token}`);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'same-origin',
  });

  if (response.status === 204) {
    return {} as T;
  }

  const contentType = response.headers.get('content-type');
  let data: any;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMsg =
      (typeof data === 'object' && (data.error || data.detail || JSON.stringify(data))) ||
      'Request failed';
    throw new Error(errorMsg);
  }

  return data as T;
}

export const api = {
  // Auth
  login: (credentials: { username?: string; roll_number?: string; password: string }) =>
    apiRequest<{ token: string; role: 'STUDENT' | 'ADMIN'; user: UserProfile }>('/auth/login/', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  logout: () =>
    apiRequest<{ message: string }>('/auth/logout/', {
      method: 'POST',
    }),

  getMe: () => apiRequest<UserProfile>('/auth/me/'),

  // Student endpoints
  getStudentExams: () =>
    apiRequest<{ server_time: string; exams: ExamCard[] }>('/exams/'),

  getStudentExamDetail: (examId: number) =>
    apiRequest<{ server_time: string; exam: ExamCard }>(`/exams/${examId}/`),

  startExam: (examId: number) =>
    apiRequest<ExamAttemptDetail>(`/exams/${examId}/start/`, {
      method: 'POST',
    }),

  getAttemptDetail: (attemptId: number) =>
    apiRequest<ExamAttemptDetail>(`/attempts/${attemptId}/`),

  saveAnswer: (attemptId: number, questionId: number, optionId: number | null) =>
    apiRequest<{ success: boolean; question_id: number; selected_option_id: number | null }>(
      `/attempts/${attemptId}/answers/`,
      {
        method: 'POST',
        body: JSON.stringify({ question_id: questionId, option_id: optionId }),
      }
    ),

  uploadSourceFile: (attemptId: number, questionId: number, file: File) => {
    const formData = new FormData();
    formData.append('question_id', questionId.toString());
    formData.append('file', file);
    return apiRequest<{
      success: boolean;
      question_id: number;
      file_name: string;
      file_url: string;
      file_size: number;
    }>(`/attempts/${attemptId}/answers/`, {
      method: 'POST',
      body: formData,
    });
  },

  removeSourceFile: (attemptId: number, questionId: number) =>
    apiRequest<{
      success: boolean;
      question_id: number;
      file_name: string;
      file_url: null;
    }>(`/attempts/${attemptId}/answers/`, {
      method: 'POST',
      body: JSON.stringify({ question_id: questionId, remove_file: true }),
    }),

  submitExam: (attemptId: number) =>
    apiRequest<{
      success: boolean;
      status: string;
      exam_type?: string;
      score: number | null;
      max_score: number;
      percentage: number | null;
      submitted_at: string;
      results_published?: boolean;
      message?: string;
      submissions?: Array<{
        question_id: number;
        question_text: string;
        file_name: string;
        file_url?: string;
        file_size: number;
      }>;
    }>(`/attempts/${attemptId}/submit/`, {
      method: 'POST',
    }),

  recordViolation: (attemptId: number) =>
    apiRequest<{
      violation_count: number;
      max_violations?: number;
      remaining_violations?: number;
      auto_submitted: boolean;
      status?: string;
      message: string;
    }>(`/attempts/${attemptId}/violation/`, {
      method: 'POST',
    }),

  getStudentResults: () => apiRequest<ExamResult[]>('/results/'),

  // Admin endpoints
  getAdminDashboard: () => apiRequest<DashboardStats>('/admin/dashboard/'),

  getDepartments: () => apiRequest<Department[]>('/admin/departments/'),

  getAdminStudents: (params: { page?: number; department?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params.page) q.append('page', params.page.toString());
    if (params.department) q.append('department', params.department);
    if (params.search) q.append('search', params.search);
    return apiRequest<any>(`/admin/students/?${q.toString()}`);
  },

  toggleStudentActive: (studentId: number, active: boolean) =>
    apiRequest<any>(`/admin/students/${studentId}/`, {
      method: 'PATCH',
      body: JSON.stringify({ active }),
    }),

  getAdminQuestions: (params: { category?: string; difficulty?: string; search?: string; question_type?: string; all?: boolean } = {}) => {
    const q = new URLSearchParams();
    if (params.category) q.append('category', params.category);
    if (params.difficulty) q.append('difficulty', params.difficulty);
    if (params.search) q.append('search', params.search);
    if (params.question_type) q.append('question_type', params.question_type);
    if (params.all) q.append('all', 'true');
    return apiRequest<any>(`/admin/questions/?${q.toString()}`);
  },

  createQuestion: (data: any) =>
    apiRequest<Question>('/admin/questions/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateQuestion: (id: number, data: any) =>
    apiRequest<Question>(`/admin/questions/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteQuestion: (id: number) =>
    apiRequest<void>(`/admin/questions/${id}/`, {
      method: 'DELETE',
    }),

  getAdminExams: () => apiRequest<any>('/admin/exams/'),

  createExam: (data: any) =>
    apiRequest<any>('/admin/exams/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateExam: (id: number, data: any) =>
    apiRequest<any>(`/admin/exams/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteExam: (id: number) =>
    apiRequest<void>(`/admin/exams/${id}/`, {
      method: 'DELETE',
    }),

  getAdminResults: (params: { page?: number; exam_id?: string; department_id?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params.page) q.append('page', params.page.toString());
    if (params.exam_id) q.append('exam_id', params.exam_id);
    if (params.department_id) q.append('department_id', params.department_id);
    if (params.search) q.append('search', params.search);
    return apiRequest<any>(`/admin/results/?${q.toString()}`);
  },

  getExportCsvUrl: (params: { exam_id?: string; department_id?: string; search?: string } = {}) => {
    const q = new URLSearchParams();
    q.append('export', 'csv');
    const token = localStorage.getItem('token');
    if (token) q.append('token', token);
    if (params.exam_id) q.append('exam_id', params.exam_id);
    if (params.department_id) q.append('department_id', params.department_id);
    if (params.search) q.append('search', params.search);
    return `${BASE_URL}/admin/results/?${q.toString()}`;
  },

  getDownloadSubmissionsZipUrl: (params: { exam_id?: string } = {}) => {
    const q = new URLSearchParams();
    const token = localStorage.getItem('token');
    if (token) q.append('token', token);
    if (params.exam_id) q.append('exam_id', params.exam_id);
    return `${BASE_URL}/admin/download-submissions/?${q.toString()}`;
  },
};
