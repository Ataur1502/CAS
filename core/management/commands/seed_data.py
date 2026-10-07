import os
import secrets
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.contrib.auth.hashers import make_password
from core.models import (
    Department,
    Student,
)


class Command(BaseCommand):
    help = "Seeds database with departments and 301 students (Idempotent). Does not hardcode default passwords."

    def handle(self, *args, **options):
        self.stdout.write("Starting database seeding...")

        # 1. Departments
        cs_dept, _ = Department.objects.get_or_create(
            code="CS",
            defaults={"name": "Cyber Security"}
        )
        if cs_dept.name != "Cyber Security":
            cs_dept.name = "Cyber Security"
            cs_dept.save()

        iot_dept, _ = Department.objects.get_or_create(
            code="IOT",
            defaults={"name": "Internet of Things"}
        )
        if iot_dept.name != "Internet of Things":
            iot_dept.name = "Internet of Things"
            iot_dept.save()

        self.stdout.write(self.style.SUCCESS(f"Departments confirmed: {cs_dept.code}, {iot_dept.code}"))

        # 2. Administrator (Secure creation via env vars only)
        admin_username = os.environ.get("ADMIN_USERNAME")
        admin_password = os.environ.get("ADMIN_PASSWORD")

        if admin_username and admin_password:
            admin_user, _ = User.objects.get_or_create(
                username=admin_username,
                defaults={
                    "is_staff": True,
                    "is_superuser": True,
                    "is_active": True,
                    "first_name": "System",
                    "last_name": "Administrator",
                    "email": "admin@university.edu",
                }
            )
            admin_user.is_staff = True
            admin_user.is_superuser = True
            admin_user.is_active = True
            admin_user.set_password(admin_password)
            admin_user.save()
            self.stdout.write(self.style.SUCCESS(f"Admin confirmed: {admin_username}"))
        else:
            self.stdout.write("ADMIN_PASSWORD is not configured; skipping admin account creation.")

        # 3. Student Cohorts (301 Students)
        student_password = os.environ.get("STUDENT_DEFAULT_PASSWORD") or os.environ.get("STUDENT_PASSWORD")
        if not student_password:
            student_password = secrets.token_urlsafe(12)
            self.stdout.write(self.style.WARNING(f"STUDENT_DEFAULT_PASSWORD not configured. Temporary password generated: {student_password}"))

        hashed_student_pw = make_password(student_password)

        # CS Cohort:
        # 2311CS040001 through 2311CS040180 (180 students)
        # plus 2211CS040008 (1 student) -> 181 students
        cs_roll_numbers = [f"2311CS04{i:04d}" for i in range(1, 181)]
        cs_roll_numbers.append("2211CS040008")

        # IoT Cohort:
        # 2311CS050001 through 2311CS050120 (120 students)
        iot_roll_numbers = [f"2311CS05{i:04d}" for i in range(1, 121)]

        total_cs_created = 0
        for roll in cs_roll_numbers:
            user, _ = User.objects.get_or_create(
                username=roll,
                defaults={
                    "is_active": True,
                    "email": f"{roll.lower()}@university.edu",
                    "first_name": "Student",
                    "last_name": roll,
                }
            )
            user.is_active = True
            user.password = hashed_student_pw
            user.save()

            Student.objects.update_or_create(
                roll_number=roll,
                defaults={
                    "user": user,
                    "full_name": f"Student {roll}",
                    "department": cs_dept,
                    "email": f"{roll.lower()}@university.edu",
                    "active": True,
                }
            )
            total_cs_created += 1

        total_iot_created = 0
        for roll in iot_roll_numbers:
            user, _ = User.objects.get_or_create(
                username=roll,
                defaults={
                    "is_active": True,
                    "email": f"{roll.lower()}@university.edu",
                    "first_name": "Student",
                    "last_name": roll,
                }
            )
            user.is_active = True
            user.password = hashed_student_pw
            user.save()

            Student.objects.update_or_create(
                roll_number=roll,
                defaults={
                    "user": user,
                    "full_name": f"Student {roll}",
                    "department": iot_dept,
                    "email": f"{roll.lower()}@university.edu",
                    "active": True,
                }
            )
            total_iot_created += 1

        self.stdout.write(self.style.SUCCESS(f"Students seeded: CS = {total_cs_created}, IoT = {total_iot_created}, Total = {total_cs_created + total_iot_created}"))
        self.stdout.write(self.style.SUCCESS("Seeding completed successfully!"))
