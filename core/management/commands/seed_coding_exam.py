import json
from pathlib import Path
from datetime import timedelta
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone
from core.models import (
    Department,
    Exam,
    ExamDepartment,
    Question,
    ExamQuestion,
)


class Command(BaseCommand):
    help = "Imports 10 authoritative coding questions from core/data/coding_pool.json and configures the Practical Coding Exam."

    def handle(self, *args, **options):
        pool_file = Path(__file__).resolve().parent.parent.parent / "data" / "coding_pool.json"
        if not pool_file.exists():
            raise CommandError(f"Coding question pool file not found at: {pool_file}")

        try:
            with open(pool_file, "r", encoding="utf-8") as f:
                questions_data = json.load(f)
        except Exception as e:
            raise CommandError(f"Failed to read coding question pool JSON: {e}")

        total_in_file = len(questions_data)
        if total_in_file != 10:
            raise CommandError(f"Expected exactly 10 coding questions, found {total_in_file}.")

        self.stdout.write("Importing 10 authoritative coding questions...")

        imported_questions = []

        with transaction.atomic():
            for item in questions_data:
                source_id = item["source_id"]
                question_text = item["question_text"]
                category = item.get("category", "Software Engineering")
                difficulty = item.get("difficulty", "Medium")
                marks = item.get("marks", 10)

                question, _ = Question.objects.update_or_create(
                    source_id=source_id,
                    defaults={
                        "question_text": question_text,
                        "question_type": "CODING",
                        "category": category,
                        "difficulty": difficulty,
                        "marks": marks,
                        "explanation": "",
                        "is_active": True,
                    }
                )
                imported_questions.append(question)

            # Configure the Coding Exam
            now = timezone.now()
            cs_dept = Department.objects.filter(code="CS").first()
            iot_dept = Department.objects.filter(code="IOT").first()

            exam, _ = Exam.objects.update_or_create(
                title="B.Tech Practical Coding & Problem Solving Assessment",
                defaults={
                    "description": "Practical Programming Assessment. Solve 3 randomly assigned algorithmic and systems programming challenges from a 10-problem pool. Work locally in your preferred IDE and upload your source code for each question. No window or fullscreen restrictions.",
                    "exam_type": "CODING",
                    "duration_minutes": 90,
                    "questions_per_attempt": 3,
                    "max_violations": 999,
                    "start_datetime": now - timedelta(hours=2),
                    "end_datetime": now + timedelta(days=30),
                    "is_active": True,
                }
            )

            # Assign departments
            if cs_dept:
                ExamDepartment.objects.get_or_create(exam=exam, department=cs_dept)
            if iot_dept:
                ExamDepartment.objects.get_or_create(exam=exam, department=iot_dept)

            # Re-link questions to exam
            ExamQuestion.objects.filter(exam=exam).delete()
            eq_records = [
                ExamQuestion(exam=exam, question=q, order=idx)
                for idx, q in enumerate(imported_questions, start=1)
            ]
            ExamQuestion.objects.bulk_create(eq_records)

        self.stdout.write(self.style.SUCCESS("Coding Question pool validation:"))
        self.stdout.write(self.style.SUCCESS("Expected: 10 questions"))
        self.stdout.write(self.style.SUCCESS(f"Imported: {len(imported_questions)}"))
        self.stdout.write(self.style.SUCCESS(f"Configured Practical Coding exam '{exam.title}' with {exam.exam_questions.count()} pool questions (3 per attempt)."))
