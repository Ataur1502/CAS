from datetime import timedelta
from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from core.models import (
    Department,
    Exam,
    ExamAttempt,
    ExamDepartment,
    ExamQuestion,
    Option,
    Question,
    Student,
    StudentAnswer,
)
from core.views import calculate_attempt_score


class CASPlatformComprehensiveTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # 1. Departments
        self.cs_dept = Department.objects.create(name="Cyber Security", code="CS")
        self.iot_dept = Department.objects.create(name="Internet of Things", code="IOT")

        # 2. Users & Profiles
        # Admin
        self.admin_user = User.objects.create_superuser(
            username="ADMIN01",
            password="AdminPassword123!",
            email="admin@university.edu"
        )

        # CS Student 1
        self.cs_user = User.objects.create_user(
            username="2311CS040001",
            password="StudentPass123!",
            first_name="Alice",
            last_name="CS"
        )
        self.cs_student = Student.objects.create(
            user=self.cs_user,
            roll_number="2311CS040001",
            full_name="Alice Cyber",
            department=self.cs_dept,
            active=True
        )

        # CS Student 2 (Exception roll number)
        self.cs_user_exc = User.objects.create_user(
            username="2211CS040008",
            password="StudentPass123!",
            first_name="Special",
            last_name="CS"
        )
        self.cs_student_exc = Student.objects.create(
            user=self.cs_user_exc,
            roll_number="2211CS040008",
            full_name="Special CS Student",
            department=self.cs_dept,
            active=True
        )

        # IoT Student
        self.iot_user = User.objects.create_user(
            username="2311CS050001",
            password="StudentPass123!",
            first_name="Bob",
            last_name="IoT"
        )
        self.iot_student = Student.objects.create(
            user=self.iot_user,
            roll_number="2311CS050001",
            full_name="Bob IoT",
            department=self.iot_dept,
            active=True
        )

        # Inactive Student
        self.inactive_user = User.objects.create_user(
            username="2311CS040002",
            password="StudentPass123!",
        )
        self.inactive_student = Student.objects.create(
            user=self.inactive_user,
            roll_number="2311CS040002",
            full_name="Inactive Student",
            department=self.cs_dept,
            active=False
        )

        # 3. Sample Questions
        self.q1 = Question.objects.create(
            question_text="What does CIA stand for in security?",
            marks=2,
            category="Security",
            difficulty="Easy"
        )
        self.q1_opt_a = Option.objects.create(question=self.q1, option_key="A", option_text="Confidentiality, Integrity, Availability", is_correct=True)
        self.q1_opt_b = Option.objects.create(question=self.q1, option_key="B", option_text="Control, Inspection, Access", is_correct=False)
        self.q1_opt_c = Option.objects.create(question=self.q1, option_key="C", option_text="Crypto, Identity, Auth", is_correct=False)
        self.q1_opt_d = Option.objects.create(question=self.q1, option_key="D", option_text="None of the above", is_correct=False)

        self.q2 = Question.objects.create(
            question_text="What port is HTTPS standard?",
            marks=3,
            category="Security",
            difficulty="Easy"
        )
        self.q2_opt_a = Option.objects.create(question=self.q2, option_key="A", option_text="80", is_correct=False)
        self.q2_opt_b = Option.objects.create(question=self.q2, option_key="B", option_text="443", is_correct=True)
        self.q2_opt_c = Option.objects.create(question=self.q2, option_key="C", option_text="22", is_correct=False)
        self.q2_opt_d = Option.objects.create(question=self.q2, option_key="D", option_text="8080", is_correct=False)

        self.q3 = Question.objects.create(
            question_text="What is MQTT?",
            marks=2,
            category="IoT",
            difficulty="Easy"
        )
        self.q3_opt_a = Option.objects.create(question=self.q3, option_key="A", option_text="A pub-sub messaging protocol", is_correct=True)
        self.q3_opt_b = Option.objects.create(question=self.q3, option_key="B", option_text="A relational database", is_correct=False)
        self.q3_opt_c = Option.objects.create(question=self.q3, option_key="C", option_text="An operating system", is_correct=False)
        self.q3_opt_d = Option.objects.create(question=self.q3, option_key="D", option_text="A hardware pin", is_correct=False)

        # 4. Sample Exams
        now = timezone.now()
        # CS-only exam (active now)
        self.cs_exam = Exam.objects.create(
            title="CS Security Exam",
            description="Cyber Security midterm",
            duration_minutes=30,
            start_datetime=now - timedelta(minutes=10),
            end_datetime=now + timedelta(minutes=50),
            is_active=True
        )
        ExamDepartment.objects.create(exam=self.cs_exam, department=self.cs_dept)
        ExamQuestion.objects.create(exam=self.cs_exam, question=self.q1, order=1)
        ExamQuestion.objects.create(exam=self.cs_exam, question=self.q2, order=2)

        # IoT-only exam (active now)
        self.iot_exam = Exam.objects.create(
            title="IoT Systems Exam",
            description="IoT test",
            duration_minutes=30,
            start_datetime=now - timedelta(minutes=10),
            end_datetime=now + timedelta(minutes=50),
            is_active=True
        )
        ExamDepartment.objects.create(exam=self.iot_exam, department=self.iot_dept)
        ExamQuestion.objects.create(exam=self.iot_exam, question=self.q3, order=1)

        # Future exam
        self.future_exam = Exam.objects.create(
            title="Future CS Exam",
            description="Not started yet",
            duration_minutes=30,
            start_datetime=now + timedelta(hours=2),
            end_datetime=now + timedelta(hours=3),
            is_active=True
        )
        ExamDepartment.objects.create(exam=self.future_exam, department=self.cs_dept)
        ExamQuestion.objects.create(exam=self.future_exam, question=self.q1, order=1)

        # Past exam
        self.past_exam = Exam.objects.create(
            title="Past CS Exam",
            description="Already ended",
            duration_minutes=30,
            start_datetime=now - timedelta(hours=3),
            end_datetime=now - timedelta(hours=1),
            is_active=True
        )
        ExamDepartment.objects.create(exam=self.past_exam, department=self.cs_dept)
        ExamQuestion.objects.create(exam=self.past_exam, question=self.q1, order=1)

    # 1. Student login
    def test_student_login_success(self):
        resp = self.client.post('/api/auth/login/', {
            'roll_number': '2311CS040001',
            'password': 'StudentPass123!'
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['role'], 'STUDENT')
        self.assertIn('token', resp.data)
        self.assertEqual(resp.data['user']['roll_number'], '2311CS040001')
        self.assertEqual(resp.data['user']['department']['code'], 'CS')

    # 2. Invalid login
    def test_invalid_login(self):
        resp = self.client.post('/api/auth/login/', {
            'roll_number': '2311CS040001',
            'password': 'WrongPassword123'
        })
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    # 3. Admin login
    def test_admin_login_success(self):
        resp = self.client.post('/api/auth/login/', {
            'username': 'ADMIN01',
            'password': 'AdminPassword123!'
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['role'], 'ADMIN')
        self.assertIn('token', resp.data)

    # Inactive student login
    def test_inactive_student_login(self):
        resp = self.client.post('/api/auth/login/', {
            'roll_number': '2311CS040002',
            'password': 'StudentPass123!'
        })
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    # 4. Student cannot access admin APIs
    def test_student_cannot_access_admin_apis(self):
        self.client.force_authenticate(user=self.cs_user)
        resp1 = self.client.get('/api/admin/dashboard/')
        self.assertEqual(resp1.status_code, status.HTTP_403_FORBIDDEN)
        resp2 = self.client.get('/api/admin/students/')
        self.assertEqual(resp2.status_code, status.HTTP_403_FORBIDDEN)
        resp3 = self.client.get('/api/admin/questions/')
        self.assertEqual(resp3.status_code, status.HTTP_403_FORBIDDEN)
        resp4 = self.client.get('/api/admin/exams/')
        self.assertEqual(resp4.status_code, status.HTTP_403_FORBIDDEN)

    # 5. Admin cannot use student-only authorization incorrectly
    def test_admin_cannot_use_student_only_authorization_incorrectly(self):
        self.client.force_authenticate(user=self.admin_user)
        resp = self.client.get('/api/exams/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        resp_start = self.client.post(f'/api/exams/{self.cs_exam.id}/start/')
        self.assertEqual(resp_start.status_code, status.HTTP_403_FORBIDDEN)

    # 6. CS student can access CS exam
    def test_cs_student_can_access_cs_exam(self):
        self.client.force_authenticate(user=self.cs_user)
        resp = self.client.get(f'/api/exams/{self.cs_exam.id}/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['exam']['title'], "CS Security Exam")

    # 7. IoT student can access IoT exam
    def test_iot_student_can_access_iot_exam(self):
        self.client.force_authenticate(user=self.iot_user)
        resp = self.client.get(f'/api/exams/{self.iot_exam.id}/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['exam']['title'], "IoT Systems Exam")

    # 8. CS student cannot access IoT-only exam
    def test_cs_student_cannot_access_iot_only_exam(self):
        self.client.force_authenticate(user=self.cs_user)
        resp = self.client.get(f'/api/exams/{self.iot_exam.id}/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        resp_start = self.client.post(f'/api/exams/{self.iot_exam.id}/start/')
        self.assertEqual(resp_start.status_code, status.HTTP_403_FORBIDDEN)

    # 9. IoT student cannot access CS-only exam
    def test_iot_student_cannot_access_cs_only_exam(self):
        self.client.force_authenticate(user=self.iot_user)
        resp = self.client.get(f'/api/exams/{self.cs_exam.id}/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        resp_start = self.client.post(f'/api/exams/{self.cs_exam.id}/start/')
        self.assertEqual(resp_start.status_code, status.HTTP_403_FORBIDDEN)

    # 10. Exam unavailable before start time
    def test_exam_unavailable_before_start_time(self):
        self.client.force_authenticate(user=self.cs_user)
        resp = self.client.post(f'/api/exams/{self.future_exam.id}/start/')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("has not started", resp.data['error'])

    # 11. Exam unavailable after end time
    def test_exam_unavailable_after_end_time(self):
        self.client.force_authenticate(user=self.cs_user)
        resp = self.client.post(f'/api/exams/{self.past_exam.id}/start/')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("has ended", resp.data['error'])

    # 12. Student can start exam
    def test_student_can_start_exam(self):
        self.client.force_authenticate(user=self.cs_user)
        resp = self.client.post(f'/api/exams/{self.cs_exam.id}/start/')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['status'], 'IN_PROGRESS')
        self.assertEqual(resp.data['exam_id'], self.cs_exam.id)
        self.assertTrue(len(resp.data['questions']) == 2)

    # 13. Student cannot create second attempt
    def test_student_cannot_create_second_attempt(self):
        self.client.force_authenticate(user=self.cs_user)
        resp1 = self.client.post(f'/api/exams/{self.cs_exam.id}/start/')
        self.assertEqual(resp1.status_code, status.HTTP_201_CREATED)
        attempt_id = resp1.data['id']

        # Submit attempt
        sub_resp = self.client.post(f'/api/attempts/{attempt_id}/submit/')
        self.assertEqual(sub_resp.status_code, status.HTTP_200_OK)

        # Attempt to start again
        resp2 = self.client.post(f'/api/exams/{self.cs_exam.id}/start/')
        self.assertEqual(resp2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already been submitted", resp2.data['error'])

    # 14. Answer can be saved
    def test_answer_can_be_saved(self):
        self.client.force_authenticate(user=self.cs_user)
        start_resp = self.client.post(f'/api/exams/{self.cs_exam.id}/start/')
        attempt_id = start_resp.data['id']

        resp = self.client.post(f'/api/attempts/{attempt_id}/answers/', {
            'question_id': self.q1.id,
            'option_id': self.q1_opt_a.id,
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data['success'])
        self.assertEqual(resp.data['selected_option_key'], 'A')

    # 15. Saved answer can be retrieved (e.g. after refresh)
    def test_saved_answer_can_be_retrieved(self):
        self.client.force_authenticate(user=self.cs_user)
        start_resp = self.client.post(f'/api/exams/{self.cs_exam.id}/start/')
        attempt_id = start_resp.data['id']

        self.client.post(f'/api/attempts/{attempt_id}/answers/', {
            'question_id': self.q1.id,
            'option_id': self.q1_opt_a.id,
        })

        detail_resp = self.client.get(f'/api/attempts/{attempt_id}/')
        self.assertEqual(detail_resp.status_code, status.HTTP_200_OK)
        answers = detail_resp.data['answers']
        self.assertIn(str(self.q1.id), [str(k) for k in answers.keys()])
        self.assertEqual(answers[self.q1.id]['option_id'], self.q1_opt_a.id)

    # 16. Student cannot see correct answer
    def test_student_cannot_see_correct_answer(self):
        self.client.force_authenticate(user=self.cs_user)
        start_resp = self.client.post(f'/api/exams/{self.cs_exam.id}/start/')
        questions = start_resp.data['questions']
        for q in questions:
            for opt in q['options']:
                self.assertNotIn('is_correct', opt)
                self.assertNotIn('correct', opt)
                self.assertNotIn('answer', opt)

    # 17. Submission calculates correct score
    def test_submission_calculates_correct_score(self):
        self.client.force_authenticate(user=self.cs_user)
        start_resp = self.client.post(f'/api/exams/{self.cs_exam.id}/start/')
        attempt_id = start_resp.data['id']

        # Answer Q1 correctly (2 marks)
        self.client.post(f'/api/attempts/{attempt_id}/answers/', {
            'question_id': self.q1.id,
            'option_id': self.q1_opt_a.id,
        })
        # Answer Q2 correctly (3 marks)
        self.client.post(f'/api/attempts/{attempt_id}/answers/', {
            'question_id': self.q2.id,
            'option_id': self.q2_opt_b.id,
        })

        sub_resp = self.client.post(f'/api/attempts/{attempt_id}/submit/')
        self.assertEqual(sub_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(sub_resp.data['score'], 5.0)
        self.assertEqual(sub_resp.data['max_score'], 5.0)
        self.assertEqual(sub_resp.data['percentage'], 100.0)
        self.assertEqual(sub_resp.data['status'], 'SUBMITTED')

    # 18. Incorrect answers receive zero
    def test_incorrect_answers_receive_zero(self):
        self.client.force_authenticate(user=self.cs_user)
        start_resp = self.client.post(f'/api/exams/{self.cs_exam.id}/start/')
        attempt_id = start_resp.data['id']

        # Answer Q1 correctly (2 marks)
        self.client.post(f'/api/attempts/{attempt_id}/answers/', {
            'question_id': self.q1.id,
            'option_id': self.q1_opt_a.id,
        })
        # Answer Q2 INCORRECTLY (0 marks)
        self.client.post(f'/api/attempts/{attempt_id}/answers/', {
            'question_id': self.q2.id,
            'option_id': self.q2_opt_a.id,  # Port 80 is wrong for HTTPS
        })

        sub_resp = self.client.post(f'/api/attempts/{attempt_id}/submit/')
        self.assertEqual(sub_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(sub_resp.data['score'], 2.0)
        self.assertEqual(sub_resp.data['max_score'], 5.0)
        self.assertEqual(sub_resp.data['percentage'], 40.0)

    # 19. Unanswered questions receive zero
    def test_unanswered_questions_receive_zero(self):
        self.client.force_authenticate(user=self.cs_user)
        start_resp = self.client.post(f'/api/exams/{self.cs_exam.id}/start/')
        attempt_id = start_resp.data['id']

        # Only answer Q1 (2 marks), leave Q2 unanswered
        self.client.post(f'/api/attempts/{attempt_id}/answers/', {
            'question_id': self.q1.id,
            'option_id': self.q1_opt_a.id,
        })

        sub_resp = self.client.post(f'/api/attempts/{attempt_id}/submit/')
        self.assertEqual(sub_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(sub_resp.data['score'], 2.0)
        self.assertEqual(sub_resp.data['max_score'], 5.0)
        self.assertEqual(sub_resp.data['percentage'], 40.0)

    # 20. Submitted attempt cannot be modified
    def test_submitted_attempt_cannot_be_modified(self):
        self.client.force_authenticate(user=self.cs_user)
        start_resp = self.client.post(f'/api/exams/{self.cs_exam.id}/start/')
        attempt_id = start_resp.data['id']

        self.client.post(f'/api/attempts/{attempt_id}/submit/')

        # Try to modify answer
        mod_resp = self.client.post(f'/api/attempts/{attempt_id}/answers/', {
            'question_id': self.q1.id,
            'option_id': self.q1_opt_b.id,
        })
        self.assertEqual(mod_resp.status_code, status.HTTP_400_BAD_REQUEST)

    # 21. Student can only see own results (prevent IDOR)
    def test_student_can_only_see_own_results(self):
        # CS student submits
        self.client.force_authenticate(user=self.cs_user)
        s1 = self.client.post(f'/api/exams/{self.cs_exam.id}/start/')
        self.client.post(f"/api/attempts/{s1.data['id']}/submit/")

        # IoT student submits
        self.client.force_authenticate(user=self.iot_user)
        s2 = self.client.post(f'/api/exams/{self.iot_exam.id}/start/')
        self.client.post(f"/api/attempts/{s2.data['id']}/submit/")

        # IoT student checks results
        res = self.client.get('/api/results/')
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['roll_number'], '2311CS050001')

        # Try accessing attempt of CS student directly
        idor_resp = self.client.get(f"/api/attempts/{s1.data['id']}/")
        self.assertEqual(idor_resp.status_code, status.HTTP_404_NOT_FOUND)

    # 22. Admin can view results and CSV export
    def test_admin_can_view_results(self):
        # Create completed attempt
        self.client.force_authenticate(user=self.cs_user)
        s1 = self.client.post(f'/api/exams/{self.cs_exam.id}/start/')
        self.client.post(f"/api/attempts/{s1.data['id']}/submit/")

        self.client.force_authenticate(user=self.admin_user)
        resp = self.client.get('/api/admin/results/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        # CSV Export
        csv_resp = self.client.get('/api/admin/results/?export=csv')
        self.assertEqual(csv_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(csv_resp['Content-Type'], 'text/csv')
        self.assertIn("2311CS040001", csv_resp.content.decode('utf-8'))

    # 23. Admin can create question
    def test_admin_can_create_question(self):
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            "question_text": "What is asymmetric encryption?",
            "marks": 2,
            "category": "Cryptography",
            "difficulty": "Medium",
            "is_active": True,
            "options": [
                {"option_key": "A", "option_text": "Uses a key pair (public and private)", "is_correct": True},
                {"option_key": "B", "option_text": "Uses only one shared secret key", "is_correct": False},
                {"option_key": "C", "option_text": "Does not use any keys", "is_correct": False},
                {"option_key": "D", "option_text": "Encrypts only hard drives", "is_correct": False},
            ]
        }
        resp = self.client.post('/api/admin/questions/', payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['question_text'], payload['question_text'])
        self.assertEqual(len(resp.data['options']), 4)

    # 24. Admin question validation (must have exactly 1 correct option)
    def test_admin_question_validation(self):
        self.client.force_authenticate(user=self.admin_user)
        # Invalid: 2 correct options
        payload = {
            "question_text": "Invalid question test",
            "marks": 1,
            "category": "Test",
            "difficulty": "Easy",
            "options": [
                {"option_key": "A", "option_text": "Option 1", "is_correct": True},
                {"option_key": "B", "option_text": "Option 2", "is_correct": True},
                {"option_key": "C", "option_text": "Option 3", "is_correct": False},
                {"option_key": "D", "option_text": "Option 4", "is_correct": False},
            ]
        }
        resp = self.client.post('/api/admin/questions/', payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    # 25. Admin can edit question
    def test_admin_can_edit_question(self):
        self.client.force_authenticate(user=self.admin_user)
        resp = self.client.patch(f'/api/admin/questions/{self.q1.id}/', {
            'marks': 4
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.q1.refresh_from_db()
        self.assertEqual(self.q1.marks, 4)

    # 26. Admin can create exam and assign departments
    def test_admin_can_create_exam(self):
        self.client.force_authenticate(user=self.admin_user)
        now = timezone.now()
        payload = {
            "title": "Comprehensive Cyber Exam",
            "description": "Midterm test",
            "duration_minutes": 45,
            "start_datetime": now.isoformat(),
            "end_datetime": (now + timedelta(hours=2)).isoformat(),
            "is_active": True,
            "departments": [self.cs_dept.id],
            "questions": [
                {"id": self.q1.id, "order": 1},
                {"id": self.q2.id, "order": 2},
            ]
        }
        resp = self.client.post('/api/admin/exams/', payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['question_count'], 2)
        self.assertEqual(resp.data['total_marks'], 5)

    # 27. Department assignment works
    def test_department_assignment_works(self):
        # CS exam has CS dept
        self.assertTrue(self.cs_exam.exam_departments.filter(department=self.cs_dept).exists())
        self.assertFalse(self.cs_exam.exam_departments.filter(department=self.iot_dept).exists())

    # 28. Violation count increments
    def test_violation_count_increments(self):
        self.client.force_authenticate(user=self.cs_user)
        start_resp = self.client.post(f'/api/exams/{self.cs_exam.id}/start/')
        attempt_id = start_resp.data['id']

        v1 = self.client.post(f'/api/attempts/{attempt_id}/violation/')
        self.assertEqual(v1.status_code, status.HTTP_200_OK)
        self.assertEqual(v1.data['violation_count'], 1)
        self.assertFalse(v1.data['auto_submitted'])

        v2 = self.client.post(f'/api/attempts/{attempt_id}/violation/')
        self.assertEqual(v2.status_code, status.HTTP_200_OK)
        self.assertEqual(v2.data['violation_count'], 2)
        self.assertFalse(v2.data['auto_submitted'])

    # 29. Violation count cannot be spoofed by client
    def test_violation_count_cannot_be_spoofed(self):
        self.client.force_authenticate(user=self.cs_user)
        start_resp = self.client.post(f'/api/exams/{self.cs_exam.id}/start/')
        attempt_id = start_resp.data['id']

        # Attempt to post violation_count=0
        v = self.client.post(f'/api/attempts/{attempt_id}/violation/', {'violation_count': 0})
        self.assertEqual(v.data['violation_count'], 1)

    # 30. Third violation auto-submits
    def test_third_violation_auto_submits(self):
        self.client.force_authenticate(user=self.cs_user)
        start_resp = self.client.post(f'/api/exams/{self.cs_exam.id}/start/')
        attempt_id = start_resp.data['id']

        self.client.post(f'/api/attempts/{attempt_id}/violation/')
        self.client.post(f'/api/attempts/{attempt_id}/violation/')
        v3 = self.client.post(f'/api/attempts/{attempt_id}/violation/')

        self.assertEqual(v3.status_code, status.HTTP_200_OK)
        self.assertEqual(v3.data['violation_count'], 3)
        self.assertTrue(v3.data['auto_submitted'])
        self.assertEqual(v3.data['status'], 'AUTO_SUBMITTED')

        # Check DB state
        attempt = ExamAttempt.objects.get(id=attempt_id)
        self.assertEqual(attempt.status, 'AUTO_SUBMITTED')
        self.assertEqual(attempt.submission_reason, 'EXAM_INTEGRITY_VIOLATION')

    # 31. Auto-submitted attempt cannot be reopened
    def test_auto_submitted_attempt_cannot_be_reopened(self):
        self.client.force_authenticate(user=self.cs_user)
        start_resp = self.client.post(f'/api/exams/{self.cs_exam.id}/start/')
        attempt_id = start_resp.data['id']

        # Trigger 3 violations
        for _ in range(3):
            self.client.post(f'/api/attempts/{attempt_id}/violation/')

        # Try to modify answer
        mod = self.client.post(f'/api/attempts/{attempt_id}/answers/', {
            'question_id': self.q1.id,
            'option_id': self.q1_opt_a.id,
        })
        self.assertEqual(mod.status_code, status.HTTP_400_BAD_REQUEST)

        # Try to start again
        reopen = self.client.post(f'/api/exams/{self.cs_exam.id}/start/')
        self.assertEqual(reopen.status_code, status.HTTP_400_BAD_REQUEST)

    # 32. Student cohort verification
    def test_student_cohort_special_roll_number(self):
        # 2211CS040008 is in CS
        self.assertEqual(self.cs_student_exc.department.code, "CS")
        self.client.force_authenticate(user=self.cs_user_exc)
        resp = self.client.get(f'/api/exams/{self.cs_exam.id}/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    # 33. Seed data idempotence and exact cohort counts test
    def test_seed_data_command_idempotent_and_counts(self):
        from django.core.management import call_command
        initial_exams = Exam.objects.count()
        # Run seed_data once
        call_command('seed_data')
        total_students = Student.objects.count()
        cs_students = Student.objects.filter(department__code='CS').count()
        iot_students = Student.objects.filter(department__code='IOT').count()

        self.assertEqual(total_students, 301)
        self.assertEqual(cs_students, 181)
        self.assertEqual(iot_students, 120)

        # Verify special roll number exists and belongs to CS
        special = Student.objects.get(roll_number='2211CS040008')
        self.assertEqual(special.department.code, 'CS')
        self.assertEqual(Exam.objects.count(), initial_exams + 3)

        # Run seed_data again to verify idempotence
        call_command('seed_data')
        self.assertEqual(Student.objects.count(), 301)
        self.assertEqual(Student.objects.filter(department__code='CS').count(), 181)
        self.assertEqual(Student.objects.filter(department__code='IOT').count(), 120)
        self.assertEqual(Exam.objects.count(), initial_exams + 3)
