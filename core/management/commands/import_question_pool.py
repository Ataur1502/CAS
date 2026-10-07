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
    Option,
    ExamQuestion,
)


class Command(BaseCommand):
    help = "Imports authoritative 60-question MCQ pool from core/data/mcq_pool.json and configures assessment exam."

    def handle(self, *args, **options):
        pool_file = Path(__file__).resolve().parent.parent.parent / "data" / "mcq_pool.json"
        if not pool_file.exists():
            raise CommandError(f"Question pool file not found at: {pool_file}")

        try:
            with open(pool_file, "r", encoding="utf-8") as f:
                questions_data = json.load(f)
        except Exception as e:
            raise CommandError(f"Failed to read question pool JSON: {e}")

        total_in_file = len(questions_data)
        if total_in_file != 60:
            raise CommandError(f"FATAL: Question pool file contains {total_in_file} questions, expected exactly 60.")

        self.stdout.write("Importing authoritative 60-question MCQ pool...")

        imported_questions = []

        with transaction.atomic():
            # 1. Remove old demo/placeholder questions that do not have a Q1..Q60 source_id
            valid_source_ids = {item["source_id"] for item in questions_data}
            Question.objects.exclude(source_id__in=valid_source_ids).delete()

            # 2. Upsert each question and its 4 options
            for item in questions_data:
                source_id = item["source_id"]
                question_text = item["question_text"]
                category = item.get("category", "")
                difficulty = item.get("difficulty", "Medium")
                marks = item.get("marks", 2)
                explanation = item.get("explanation", "")
                options_list = item.get("options", [])

                if len(options_list) != 4:
                    raise CommandError(f"Question {source_id} does not have exactly 4 options.")

                correct_count = sum(1 for opt in options_list if opt.get("is_correct", False))
                if correct_count != 1:
                    raise CommandError(f"Question {source_id} must have exactly one correct option.")

                question, _ = Question.objects.update_or_create(
                    source_id=source_id,
                    defaults={
                        "question_text": question_text,
                        "category": category,
                        "difficulty": difficulty,
                        "marks": marks,
                        "explanation": explanation,
                        "is_active": True,
                    }
                )

                for opt_item in options_list:
                    Option.objects.update_or_create(
                        question=question,
                        option_key=opt_item["key"],
                        defaults={
                            "option_text": opt_item["text"],
                            "is_correct": opt_item["is_correct"],
                        }
                    )

                imported_questions.append(question)

            # 3. Post-import verification
            total_active_pool = Question.objects.filter(source_id__in=valid_source_ids, is_active=True).count()
            if total_active_pool != 60:
                raise CommandError(f"FATAL: Database contains {total_active_pool} active pool questions; expected exactly 60.")

            # Verify all have exactly 4 options and 1 correct option
            for q in Question.objects.filter(source_id__in=valid_source_ids):
                opts = list(q.options.all())
                if len(opts) != 4:
                    raise CommandError(f"Question {q.source_id} does not have 4 options in database.")
                if sum(1 for o in opts if o.is_correct) != 1:
                    raise CommandError(f"Question {q.source_id} does not have exactly 1 correct option.")

            # 4. Configure assessment exam using the 60 questions pool
            now = timezone.now()
            cs_dept = Department.objects.filter(code="CS").first()
            iot_dept = Department.objects.filter(code="IOT").first()

            exam, _ = Exam.objects.update_or_create(
                title="Final-Year B.Tech Technical Assessment",
                defaults={
                    "description": "Comprehensive Technical Assessment across Core CS & Engineering Domains (60-Question Pool, 30 Questions per Attempt).",
                    "duration_minutes": 60,
                    "questions_per_attempt": 30,
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

        self.stdout.write(self.style.SUCCESS("Question pool validation:"))
        self.stdout.write(self.style.SUCCESS("Expected: 60"))
        self.stdout.write(self.style.SUCCESS(f"Imported: {len(imported_questions)}"))
        self.stdout.write(self.style.SUCCESS("Status: OK"))
        self.stdout.write(self.style.SUCCESS(f"Configured exam '{exam.title}' with {exam.exam_questions.count()} pool questions (30 per attempt)."))
