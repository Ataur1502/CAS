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
|  - Server-side question randomization (60 pool -> 30 active)|
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

## 🎲 Examination Formats

The platform supports two distinct examination formats:

### 1. Multiple Choice Questions (`MCQ`) Quiz
- **Authoritative Question Pool**: Exactly 60 comprehensive technical MCQs loaded from `core/data/mcq_pool.json`.
- **Configurable Pool & Attempt Size**: Exams support configurable `questions_per_attempt` (default: 30) selected from the assigned pool.
- **Server-Side Randomization**: Questions are randomly selected exclusively on the server (`random.sample`) when a student starts an exam attempt. No answer keys or full pools are ever leaked to the client.
- **Attempt Persistence (`AttemptQuestion`)**: The selected questions and display order are persisted into `AttemptQuestion` records. Refreshing or reconnecting preserves the exact same questions and order.
- **Full Integrity Monitoring**: Enforces Full Screen mode with leniency tracking (5–7 strikes) and automatic submission on threshold reached.

### 2. Practical Coding & Problem Solving (`CODING`)
- **10-Problem Coding Pool**: 10 comprehensive coding problems loaded from `core/data/coding_pool.json` via `python manage.py seed_coding_exam` (Algorithms, Data Structures, Concurrency, and System Design).
- **Random 3 Problems per Student**: When a student begins the exam, exactly 3 distinct problems are randomly selected from the 10-question pool (`questions_per_attempt = 3`) and persisted to `AttemptQuestion`.
- **Local IDE Freedom (No Violations / No In-Browser Editor)**: Students write, compile, run, and test solutions in their preferred local environment (VS Code, IntelliJ, PyCharm, CLion, Terminal, etc.). Fullscreen enforcement, blur tracking, and window-switching penalties are completely disabled.
- **Source Code File Submission**: Students upload their source code file (`.py`, `.java`, `.cpp`, `.c`, `.js`, `.ts`, `.cs`, `.go`, `.rs`, etc., up to 15MB) per problem. Files can be replaced or removed anytime before final submission.
- **Evaluator Inspection & Download**: Admin results console displays each student's submitted source files with direct download links for code grading and plagiarism analysis.

---

## 👥 Student Cohorts (301 Students Total)

The university database is pre-configured with exactly 301 students across two departments:

1. **Department 1: Cyber Security (`CS`)** — **181 Students**
   - Roll numbers: `2311CS040001` through `2311CS040180` (180 students)
   - Plus exception student: `2211CS040008` (1 student)
2. **Department 2: Internet of Things (`IOT`)** — **120 Students**
   - Roll numbers: `2311CS050001` through `2311CS050120` (120 students)

---

## 🔒 Authentication & Account Management

### Student Authentication
- **Route**: `/login` (Student-only portal)
- Students authenticate using their University Roll Number and password.
- The student portal contains no links, credentials, or shortcuts to the faculty administration console.

### Administrator Management
- **Route**: Dedicated admin portal at `/admin/login` and `/django-admin/`.
- Administrators can be created via standard Django commands:
  ```bash
  python manage.py createsuperuser
  ```
  or by setting environment variables (`ADMIN_USERNAME` and `ADMIN_PASSWORD`) before executing `seed_data`.
- Admin endpoints are protected server-side; student accounts attempting to access admin APIs receive `403 Forbidden`.

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

# Seed student cohorts (301 students)
# Set STUDENT_DEFAULT_PASSWORD env var if you wish to configure a specific initial password
python manage.py seed_data

# Create an administrator
python manage.py createsuperuser

# Import the authoritative 60-question pool and configure the assessment exam
python manage.py import_question_pool

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

The frontend runs at `http://localhost:5173/` and proxies `/api` calls directly to Django at `http://127.0.0.1:8000/`.

---

## 🐳 Production Docker Deployment (Nginx + Gunicorn + Persistent SQLite)

The application is deployed with production-grade separation of concerns:
- **`cas_nginx`**: Nginx reverse proxy listening on port `80`, serving compiled React SPA static assets directly with gzip compression and caching, handling SPA routing fallbacks, and forwarding `/api/` and `/django-admin/` to Gunicorn.
- **`cas_backend`**: Django REST Framework powered by Gunicorn WSGI on port `8000`. Runs migrations, seeds cohorts, imports question pool, and collects admin staticfiles on startup.
- **`sqlite_data`**: Named Docker volume mounted at `/app/data/`, persisting SQLite database `db.sqlite3` across container restarts and rebuilds.

```bash
docker compose up --build
```

Access the platform directly at `http://localhost/` (Port 80).

---

## 🧪 Running the Test Suite

A comprehensive test suite with **65 tests** verifies authentication, access control, server-side timing, question safety, 60-question pool loading, question bank randomization, answer validation, autosaving, scoring, integrity auto-submission, and practical coding exam workflows (3-question selection, source file upload, violation bypass):

```bash
python manage.py test core.test_platform
```

Output:
```text
Ran 65 tests in ~6s
OK
```

---

## 🛡️ Security & Examination Integrity

### 1. Zero Answer Leakage
- Option serializers for students **NEVER** expose `is_correct`, answer keys, or solutions.
- Grading occurs exclusively server-side upon atomic submission.

### 2. Department-Scoped Access
- A Cyber Security student is strictly forbidden from viewing or attempting IoT-only exams, and vice-versa.
- Department membership is enforced in the database and validated on every API call.

### 3. Server-Authoritative Timer
- Start and end windows are governed exclusively by server datetime (`timezone.now()`).
- Attempt duration is calculated by `min(started_at + duration_minutes, exam.end_datetime)`.
- Client clock manipulation, browser refreshes, or state tampering cannot extend the exam duration.

### 4. Integrity Violation Tracking & Leniency (Deterrence)
- **Visibility Detection**: `document.visibilityState` detects tab switching or window minimization.
- **Window Blur Detection**: `window.onblur` detects loss of browser window focus.
- **Fullscreen Mode & Exam Window Controls**: Exam requires fullscreen; dedicated **Full Screen** buttons in the header, question navigation toolbar, warning banner, and floating restore button allow students to enter or re-engage fullscreen immediately at any time.
- **Debounced Backend Increments**: Server increments `violation_count` atomically (with a client debounce to avoid false multi-counts).
- **Configurable Leniency (5–7 Violations)**: To provide students with fair leniency for accidental window unfocusing or trackpad gestures, exams support configurable `max_violations` (default: **6**, recommended: 5–7 strikes). Clear warning counters (`Violations: X / Max`) and a prominent *"FINAL WARNING"* alert students before reaching the threshold.
- **Auto-Submission**: Upon reaching the configured limit (e.g. 6 violations), the server automatically submits the attempt with status `AUTO_SUBMITTED` and reason `EXAM_INTEGRITY_VIOLATION`. The attempt is permanently locked and cannot be reopened.
- **Interaction Protection**: Right-click, text selection, and copy shortcuts are disabled inside the exam room without interfering with option selection, scrolling, or navigation.

---

## 📊 Workflows

### Student Workflow
1. Log in at `/login` using roll number and password.
2. Dashboard displays available, upcoming, and completed exams for the student's department.
3. Click **Start Examination** &rarr; Review instructions and click **Enter Fullscreen & Begin Exam**.
4. Answer MCQ questions:
   - Palette tracks *Answered* (green) and *Pending* questions.
   - Answers autosave instantly to SQLite on every click.
   - Refreshing or reconnecting preserves all previously saved answers.
5. Click **Submit Exam** & confirm &rarr; Real-time score, marks, and percentage displayed.
6. Visit `/results` anytime to view completed exam history (strictly scoped to authenticated student).

### Admin Workflow
1. Log in at `/admin/login` using administrator credentials.
2. **Dashboard**: View real-time database counts (181 CS, 120 IoT, 301 Total, Exams, Attempts).
3. **Student Directory**: Search roll numbers, filter by department, toggle active/inactive account status.
4. **Question Bank**: View/edit the 60 authoritative MCQs, categories, and options.
5. **Exams**: Manage exams, schedule duration and date ranges, configure question pool and `questions_per_attempt` (30).
6. **Results**: Filter submissions by Exam/Department/Student, and click **Export Results to CSV** to download `exam_results.csv`.
