from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class Department(models.Model):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.code})"


class Student(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='student_profile')
    roll_number = models.CharField(max_length=50, unique=True, db_index=True)
    full_name = models.CharField(max_length=150)
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='students')
    email = models.EmailField(blank=True, default='')
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.roll_number} - {self.full_name}"


class Exam(models.Model):
    EXAM_TYPE_CHOICES = (
        ('MCQ', 'Multiple Choice Quiz'),
        ('CODING', 'Coding / Practical Assignment'),
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    exam_type = models.CharField(max_length=20, choices=EXAM_TYPE_CHOICES, default='MCQ')
    duration_minutes = models.PositiveIntegerField(help_text="Duration in minutes")
    questions_per_attempt = models.PositiveIntegerField(default=30, help_text="Number of questions randomly selected per attempt")
    max_violations = models.PositiveIntegerField(default=6, help_text="Maximum allowed integrity violations before auto-submission (recommended: 5-7)")
    start_datetime = models.DateTimeField()
    end_datetime = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title


class ExamDepartment(models.Model):
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='exam_departments')
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='department_exams')

    class Meta:
        unique_together = ('exam', 'department')

    def __str__(self):
        return f"{self.exam.title} - {self.department.code}"


class Question(models.Model):
    QUESTION_TYPE_CHOICES = (
        ('MCQ', 'Multiple Choice Question'),
        ('CODING', 'Coding / Practical Question'),
    )
    source_id = models.CharField(max_length=50, blank=True, default='', db_index=True)
    question_type = models.CharField(max_length=20, choices=QUESTION_TYPE_CHOICES, default='MCQ')
    question_text = models.TextField()
    marks = models.PositiveIntegerField(default=1)
    category = models.CharField(max_length=100, blank=True, default='')
    difficulty = models.CharField(max_length=50, blank=True, default='Medium')
    explanation = models.TextField(blank=True, default='')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        prefix = f"[{self.source_id}] " if self.source_id else ""
        return f"{prefix}{self.question_text[:50]}"


class Option(models.Model):
    OPTION_KEYS = (
        ('A', 'A'),
        ('B', 'B'),
        ('C', 'C'),
        ('D', 'D'),
    )
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='options')
    option_key = models.CharField(max_length=1, choices=OPTION_KEYS)
    option_text = models.TextField()
    is_correct = models.BooleanField(default=False)

    class Meta:
        unique_together = ('question', 'option_key')
        ordering = ['option_key']

    def __str__(self):
        return f"{self.question_id} - {self.option_key}: {self.option_text[:30]}"


class ExamQuestion(models.Model):
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='exam_questions')
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='exam_questions')
    order = models.PositiveIntegerField(default=1)

    class Meta:
        unique_together = ('exam', 'question')
        ordering = ['order', 'id']

    def __str__(self):
        return f"{self.exam.title} - Q{self.order}: {self.question_id}"


class ExamAttempt(models.Model):
    STATUS_CHOICES = (
        ('NOT_STARTED', 'Not Started'),
        ('IN_PROGRESS', 'In Progress'),
        ('SUBMITTED', 'Submitted'),
        ('AUTO_SUBMITTED', 'Auto Submitted'),
    )
    REASON_CHOICES = (
        ('NORMAL', 'Normal Submission'),
        ('TIME_EXPIRED', 'Time Expired'),
        ('EXAM_INTEGRITY_VIOLATION', 'Exam Integrity Violation'),
    )
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='attempts')
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='attempts')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='NOT_STARTED')
    started_at = models.DateTimeField()
    submitted_at = models.DateTimeField(null=True, blank=True)
    score = models.FloatField(default=0.0)
    max_score = models.FloatField(default=0.0)
    percentage = models.FloatField(default=0.0)
    violation_count = models.PositiveIntegerField(default=0)
    submission_reason = models.CharField(max_length=50, choices=REASON_CHOICES, default='NORMAL')

    class Meta:
        unique_together = ('student', 'exam')

    def __str__(self):
        return f"{self.student.roll_number} - {self.exam.title} ({self.status})"


def student_submission_upload_path(instance, filename):
    """
    Saves student submitted coding files in the format:
      <question_number>/<roll_number>/<filename>
    e.g. for student 2311cs040156 uploading question 3:
      3/2311cs040156/solution.py
    and for question 9:
      9/2311cs040156/solution.py
    """
    import os, re
    roll_number = 'unknown_student'
    if hasattr(instance, 'attempt') and instance.attempt:
        student = getattr(instance.attempt, 'student', None)
        if student and getattr(student, 'roll_number', None):
            roll_number = str(student.roll_number).strip()

    q_folder = None
    question = getattr(instance, 'question', None)
    if not question and getattr(instance, 'question_id', None):
        try:
            from core.models import Question as QModel
            question = QModel.objects.filter(id=instance.question_id).first()
        except Exception:
            pass

    if question:
        src = getattr(question, 'source_id', '') or ''
        m = re.search(r'\d+', src)
        if m:
            q_folder = str(int(m.group(0)))
        else:
            q_text = getattr(question, 'question_text', '') or ''
            m2 = re.search(r'(?:Q|Question\s*|#+\s*)(\d+)', q_text, re.IGNORECASE)
            if m2:
                q_folder = str(int(m2.group(1)))

    if not q_folder and hasattr(instance, 'attempt') and instance.attempt:
        try:
            from core.models import AttemptQuestion, ExamQuestion
            aq = AttemptQuestion.objects.filter(attempt=instance.attempt, question_id=getattr(instance, 'question_id', None)).first()
            if aq and aq.question_order:
                q_folder = str(aq.question_order)
            else:
                eq = ExamQuestion.objects.filter(exam=instance.attempt.exam, question_id=getattr(instance, 'question_id', None)).first()
                if eq and eq.order:
                    q_folder = str(eq.order)
        except Exception:
            pass

    if not q_folder:
        q_folder = str(getattr(instance, 'question_id', 'unknown_question'))

    clean_filename = os.path.basename(filename)
    return f"{q_folder}/{roll_number}/{clean_filename}"


class StudentAnswer(models.Model):
    attempt = models.ForeignKey(ExamAttempt, on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='student_answers')
    selected_option = models.ForeignKey(Option, on_delete=models.SET_NULL, null=True, blank=True)
    uploaded_file = models.FileField(upload_to=student_submission_upload_path, null=True, blank=True)
    file_name = models.CharField(max_length=255, blank=True, default='')
    file_size = models.PositiveIntegerField(default=0)
    answered_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('attempt', 'question')

    def __str__(self):
        return f"Attempt {self.attempt_id} - Q{self.question_id}: {self.selected_option_id}"


class AttemptQuestion(models.Model):
    attempt = models.ForeignKey(ExamAttempt, on_delete=models.CASCADE, related_name='attempt_questions')
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='attempt_questions')
    question_order = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = (('attempt', 'question'), ('attempt', 'question_order'))
        ordering = ['question_order', 'id']

    def __str__(self):
        return f"Attempt {self.attempt_id} - Q{self.question_order}: {self.question_id}"
