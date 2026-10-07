# CAS — University Online MCQ Examination Platform

A simple, robust, secure, and production-ready University Online MCQ Examination Platform built with **Django**, **Django REST Framework (DRF)**, **SQLite**, and **React + TypeScript + Vite + Tailwind CSS**.

Designed strictly for lightweight, reliable university examination administration without unnecessary infrastructure overhead (no Redis, no Celery, no Mongo/Postgres/MySQL, no WebSockets).

---

## 🏛️ Architecture & System Design

```
+-------------------------------------------------------------+
|               Nginx Reverse Proxy (Port 80)                 |
|  - Serves compiled React SPA assets directly (caching/gzip) |
|  - SPA fallback route (try_files $uri $uri/ /index.html)    |
|  - Reverse-proxies /api/ and /django-admin/ to Gunicorn     |
|  - Serves staticfiles (Django admin assets)                 |
+-------------------------------------------------------------+
                               |
                               | HTTP (port 8000)
                               v
+-------------------------------------------------------------+
|             Gunicorn + Django 5.x / 6.x + DRF               |
|  - Server-side question randomization (e.g. 60 -> 30)       |
|  - Fixed AttemptQuestion persistence per student attempt    |
|  - Server-side timing & department eligibility control      |
|  - Integrity violation tracking (Visibility / Focus / Full) |
|  - Server-side atomic scoring (Answers never sent to UI)    |
|  - Role-based authorization (Student vs Admin)              |
+-------------------------------------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|              Persistent SQLite Database                     |
|           (/app/data/db.sqlite3 via Named Volume)           |
+-------------------------------------------------------------+
```

---

## 🎲 Question Bank Randomization (e.g. 60 Pool → 30 Selected)

- **Configurable Pool & Attempt Size**: Admins can assign any number of MCQs to an exam pool (e.g. 60 questions) and configure `questions_per_attempt` (e.g. 30 questions).
- **Server-Side Randomization**: Questions are randomly selected exclusively on the server (`random.sample`) when a student starts an exam attempt. No full question pools are ever leaked to the client.
- **Fixed Attempt Persistence (`AttemptQuestion`)**: Once chosen, the selected questions and their sequential display order (`1` to `30`) are persisted into `AttemptQuestion` records. Refreshing, reconnecting, navigating, or autosaving preserves the exact same questions and order for that attempt.
- **Unassigned Question Protection**: Any attempt to submit an answer for a question not assigned to the student's attempt is strictly rejected with a `400 Bad Request`.
- **Validation**: If an exam's question pool has fewer questions than `questions_per_attempt`, the server prevents starting and returns an error: *"This exam does not have enough questions. At least X questions are required."*
- **Strict Scoring**: The total marks, max score, and student score are calculated strictly from the assigned subset of questions.

---

## 👥 Student Cohorts (301 Students Total)

The university database is pre-configured with exactly 301 students across two departments:

1. **Department 1: Cyber Security (`CS`)** — **181 Students**
   - Roll numbers: `2311CS040001` through `2311CS040180` (180 students)
   - Plus exception student: `2211CS040008` (1 student)
2. **Department 2: Internet of Things (`IOT`)** — **120 Students**
   - Roll numbers: `2311CS050001` through `2311CS050120` (120 students)

---

## 🔑 Default Credentials

### Faculty Administrator
- **URL**: `http://localhost:5173/admin/login` (or port `8000`)
- **Username**: `ADMIN01`
- **Password**: `AdminPassword123!`

### Student Accounts
- **URL**: `http://localhost:5173/login` (or port `8000`)
- **Cyber Security Student**:
  - Roll Number: `2311CS040001` (or `2211CS040008`)
  - Password: `StudentPass123!`
- **IoT Student**:
  - Roll Number: `2311CS050001`
  - Password: `StudentPass123!`

*(Credentials are configurable via environment variables: `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `STUDENT_PASSWORD`)*

---

## 🚀 Quickstart & Local Development

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 1. Backend Setup

```bash
# Install Python dependencies
pip install -r requirements.txt

# Run database migrations (creates SQLite db.sqlite3)
python manage.py migrate

# Seed cohorts, admin, sample MCQs, and exams (Idempotent)
python manage.py seed_data

# Start Django development server
python manage.py runserver
```

The backend starts at `http://127.0.0.1:8000/`.

### 2. Frontend Setup

In a new terminal window:

```bash
cd frontend
npm install
npm run dev
```

The frontend will run at `http://localhost:5173/` and proxies `/api` calls directly to Django at `http://127.0.0.1:8000/`.

---

## 🐳 Production Docker Deployment (Nginx + Gunicorn + Persistent SQLite)

The application is deployed with production-grade separation of concerns:
- **`cas_nginx`**: Nginx reverse proxy listening on port `80`, serving compiled React SPA static assets directly with gzip compression and caching, handling SPA routing fallbacks, and forwarding `/api/` and `/django-admin/` to Gunicorn.
- **`cas_backend`**: Django REST Framework powered by Gunicorn WSGI on port `8000`. Runs migrations, seeds cohorts, and collects admin staticfiles on startup.
- **`sqlite_data`**: Named Docker volume mounted at `/app/data/`, persisting SQLite database `db.sqlite3` across container restarts and rebuilds.

```bash
docker compose up --build
```

Access the platform directly at `http://localhost/` (Port 80).

---

## 🧪 Running the Test Suite

A comprehensive test suite with **44 tests** verifies authentication, access control, server-side timing, question safety, question bank randomization, answer validation, autosaving, scoring, and integrity auto-submission:

```bash
python manage.py test core.test_platform
```

Output:
```text
Ran 44 tests in ~2.2s
OK
```

---

## 🛡️ Security & Examination Integrity

### 1. Zero Answer Leakage
- Option serialisers for students **NEVER** expose `is_correct`, answer keys, or solutions.
- Grading occurs exclusively server-side upon atomic submission.

### 2. Department-Scoped Access
- A Cyber Security student is strictly forbidden from viewing or attempting IoT-only exams, and vice-versa.
- Department membership is enforced in the database and validated on every API call.

### 3. Server-Authoritative Timer
- Start and end windows are governed exclusively by server datetime (`timezone.now()`).
- Attempt duration is calculated by `min(started_at + duration_minutes, exam.end_datetime)`.
- Client clock manipulation, browser refreshes, or state tampering cannot extend the exam duration.

### 4. Integrity Violation Tracking (Deterrence)
> [!IMPORTANT]
> A web browser cannot be 100% mechanically locked down from opening external apps or OS shortcuts. The system implements practical, non-intrusive detection and deterrence:

- **Visibility Detection**: `document.visibilityState` detects tab switching or window minimization.
- **Window Blur Detection**: `window.onblur` detects loss of browser window focus.
- **Fullscreen Mode**: Exam requires fullscreen; exiting fullscreen records an integrity violation.
- **Debounced Backend Increments**: Server increments `violation_count` atomically (with a 1.5s client debounce to avoid false multi-counts).
- **Auto-Submission**: Upon reaching **3 violations**, the server automatically submits the attempt with status `AUTO_SUBMITTED` and reason `EXAM_INTEGRITY_VIOLATION`. The attempt is permanently locked and cannot be reopened.
- **Interaction Protection**: Right-click, text selection, and copy shortcuts are disabled inside the exam room without interfering with option selection, scrolling, or navigation.

---

## 📊 Workflows

### Student Workflow
1. Log in at `/login` using roll number (e.g. `2311CS040001`) and password (`StudentPass123!`).
2. Dashboard displays available, upcoming, and completed exams for the student's department.
3. Click **Start Examination** &rarr; Review instructions and click **Enter Fullscreen & Begin Exam**.
4. Answer MCQ questions:
   - Palette tracks *Answered* (green) and *Pending* questions.
   - Answers autosave instantly to SQLite on every click.
   - Refreshing or reconnecting preserves all previously saved answers.
5. Click **Submit Exam** & confirm &rarr; Real-time score, marks, and percentage displayed.
6. Visit `/results` anytime to view completed exam history (strictly scoped to authenticated student).

### Admin Workflow
1. Log in at `/admin/login` using `ADMIN01` / `AdminPassword123!`.
2. **Dashboard**: View real-time database counts (181 CS, 120 IoT, 301 Total, Exams, Attempts).
3. **Student Directory**: Search roll numbers, filter by department, toggle active/inactive account status.
4. **Question Bank**: Create/edit MCQs with 4 options (A-D) and select the single correct answer.
5. **Exams**: Schedule exams, assign duration and date ranges, select eligible departments (CS, IoT, or both), and reorder assigned questions.
6. **Results**: Filter submissions by Exam/Department/Student, and click **Export Results to CSV** to download `exam_results.csv`.
