import os
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.contrib.auth.hashers import make_password
from django.utils import timezone
from core.models import (
    Department,
    Student,
    Exam,
    ExamDepartment,
    Question,
    Option,
    ExamQuestion,
)


class Command(BaseCommand):
    help = "Seeds database with departments, admin, 301 students, sample MCQs, and exams (Idempotent)."

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

        # 2. Admin User
        admin_username = os.environ.get("ADMIN_USERNAME", "ADMIN01")
        admin_password = os.environ.get("ADMIN_PASSWORD", "AdminPassword123!")

        admin_user, created = User.objects.get_or_create(
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

        # 3. Students
        # Password for all students
        student_password = os.environ.get("STUDENT_PASSWORD", "StudentPass123!")
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

            student, s_created = Student.objects.update_or_create(
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

            student, s_created = Student.objects.update_or_create(
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

        # 4. Question Bank (20 high-quality sample MCQs)
        questions_data = [
            # Cyber Security Questions
            {
                "text": "What does the CIA triad stand for in information security?",
                "category": "Cyber Security",
                "difficulty": "Easy",
                "marks": 2,
                "options": [
                    ("A", "Confidentiality, Integrity, Availability", True),
                    ("B", "Control, Inspection, Authentication", False),
                    ("C", "Cryptography, Identity, Access", False),
                    ("D", "Certificate, Integrity, Authorization", False),
                ]
            },
            {
                "text": "Which symmetric encryption algorithm uses 128-bit, 192-bit, or 256-bit key sizes?",
                "category": "Cyber Security",
                "difficulty": "Easy",
                "marks": 2,
                "options": [
                    ("A", "RSA", False),
                    ("B", "AES", True),
                    ("C", "Diffie-Hellman", False),
                    ("D", "SHA-256", False),
                ]
            },
            {
                "text": "Which standard network port does HTTPS typically operate on?",
                "category": "Cyber Security",
                "difficulty": "Easy",
                "marks": 2,
                "options": [
                    ("A", "Port 80", False),
                    ("B", "Port 22", False),
                    ("C", "Port 443", True),
                    ("D", "Port 8080", False),
                ]
            },
            {
                "text": "What type of attack involves tricking users into revealing sensitive credentials using spoofed emails?",
                "category": "Cyber Security",
                "difficulty": "Easy",
                "marks": 2,
                "options": [
                    ("A", "SQL Injection", False),
                    ("B", "Phishing", True),
                    ("C", "Cross-Site Scripting", False),
                    ("D", "Buffer Overflow", False),
                ]
            },
            {
                "text": "Which protocol is designed to securely transfer files over an encrypted SSH connection?",
                "category": "Cyber Security",
                "difficulty": "Medium",
                "marks": 2,
                "options": [
                    ("A", "FTP", False),
                    ("B", "TFTP", False),
                    ("C", "SFTP", True),
                    ("D", "Telnet", False),
                ]
            },
            {
                "text": "In asymmetric cryptography, which key is used to decrypt a message encrypted with the recipient's public key?",
                "category": "Cyber Security",
                "difficulty": "Medium",
                "marks": 2,
                "options": [
                    ("A", "Sender Public Key", False),
                    ("B", "Recipient Private Key", True),
                    ("C", "Shared Symmetric Key", False),
                    ("D", "Certificate Authority Key", False),
                ]
            },
            {
                "text": "Which open-source tool is widely used for network packet capture and protocol analysis?",
                "category": "Cyber Security",
                "difficulty": "Easy",
                "marks": 2,
                "options": [
                    ("A", "Wireshark", True),
                    ("B", "Metasploit", False),
                    ("C", "Hashcat", False),
                    ("D", "John the Ripper", False),
                ]
            },
            {
                "text": "What type of vulnerability occurs when untrusted user input is directly concatenated into a SQL database query?",
                "category": "Cyber Security",
                "difficulty": "Medium",
                "marks": 2,
                "options": [
                    ("A", "Cross-Site Request Forgery (CSRF)", False),
                    ("B", "SQL Injection (SQLi)", True),
                    ("C", "Remote Code Execution (RCE)", False),
                    ("D", "Server-Side Request Forgery (SSRF)", False),
                ]
            },
            {
                "text": "Which cryptographic hash function produces a fixed 256-bit message digest?",
                "category": "Cyber Security",
                "difficulty": "Easy",
                "marks": 2,
                "options": [
                    ("A", "MD5", False),
                    ("B", "SHA-1", False),
                    ("C", "SHA-256", True),
                    ("D", "DES", False),
                ]
            },
            {
                "text": "What is the primary function of a network firewall?",
                "category": "Cyber Security",
                "difficulty": "Easy",
                "marks": 2,
                "options": [
                    ("A", "Encrypt all files stored on endpoints", False),
                    ("B", "Monitor and filter incoming and outgoing traffic based on security rules", True),
                    ("C", "Automatically generate complex passwords for users", False),
                    ("D", "Boost internet connection bandwidth", False),
                ]
            },

            # IoT Questions
            {
                "text": "Which lightweight publish-subscribe messaging protocol is commonly used for IoT telemetry?",
                "category": "IoT",
                "difficulty": "Easy",
                "marks": 2,
                "options": [
                    ("A", "HTTP", False),
                    ("B", "MQTT", True),
                    ("C", "FTP", False),
                    ("D", "SMTP", False),
                ]
            },
            {
                "text": "What does CoAP stand for in IoT communication architectures?",
                "category": "IoT",
                "difficulty": "Medium",
                "marks": 2,
                "options": [
                    ("A", "Constrained Application Protocol", True),
                    ("B", "Connected Appliance Protocol", False),
                    ("C", "Centralized Optical Access Point", False),
                    ("D", "Common Authentication Procedure", False),
                ]
            },
            {
                "text": "Which wireless protocol is optimized for ultra-low power consumption in battery-powered IoT sensor nodes?",
                "category": "IoT",
                "difficulty": "Easy",
                "marks": 2,
                "options": [
                    ("A", "Bluetooth Low Energy (BLE)", True),
                    ("B", "Wi-Fi 802.11ac", False),
                    ("C", "Gigabit Ethernet", False),
                    ("D", "LTE-Advanced", False),
                ]
            },
            {
                "text": "Which layer of the IoT architecture interacts directly with physical sensors and actuators?",
                "category": "IoT",
                "difficulty": "Easy",
                "marks": 2,
                "options": [
                    ("A", "Application Layer", False),
                    ("B", "Perception / Sensing Layer", True),
                    ("C", "Business Layer", False),
                    ("D", "Transport Layer", False),
                ]
            },
            {
                "text": "What is the primary advantage of Edge Computing in IoT deployments?",
                "category": "IoT",
                "difficulty": "Medium",
                "marks": 2,
                "options": [
                    ("A", "Eliminates all local processing hardware", False),
                    ("B", "Reduces latency and bandwidth usage by processing data closer to sensors", True),
                    ("C", "Completely replaces cloud computing across the enterprise", False),
                    ("D", "Increases sensor power consumption", False),
                ]
            },
            {
                "text": "Which network transport protocol does CoAP natively utilize for low overhead communication?",
                "category": "IoT",
                "difficulty": "Medium",
                "marks": 2,
                "options": [
                    ("A", "UDP", True),
                    ("B", "TCP", False),
                    ("C", "SCTP", False),
                    ("D", "BGP", False),
                ]
            },
            {
                "text": "What role does an actuator perform in an IoT system?",
                "category": "IoT",
                "difficulty": "Easy",
                "marks": 2,
                "options": [
                    ("A", "Measures temperature and humidity", False),
                    ("B", "Converts electrical control signals into physical actions or movements", True),
                    ("C", "Acts as a public certificate authority", False),
                    ("D", "Stores time-series telemetry records in SQLite", False),
                ]
            },
            {
                "text": "Which LPWAN technology operates in unlicensed sub-GHz spectrum for long-distance IoT communications?",
                "category": "IoT",
                "difficulty": "Medium",
                "marks": 2,
                "options": [
                    ("A", "LoRaWAN", True),
                    ("B", "Bluetooth 5.0", False),
                    ("C", "NFC", False),
                    ("D", "Zigbee High-Power", False),
                ]
            },
            {
                "text": "Which low-power wireless mesh network standard is based on IEEE 802.15.4?",
                "category": "IoT",
                "difficulty": "Medium",
                "marks": 2,
                "options": [
                    ("A", "Zigbee", True),
                    ("B", "5G Sub-6", False),
                    ("C", "Wi-Fi 6", False),
                    ("D", "Ethernet 100BASE-T", False),
                ]
            },
            {
                "text": "What is a 'Digital Twin' in modern IoT and Cyber-Physical systems?",
                "category": "IoT",
                "difficulty": "Easy",
                "marks": 2,
                "options": [
                    ("A", "A physical hardware spare in warehouse storage", False),
                    ("B", "A real-time virtual software replica of a physical asset or system", True),
                    ("C", "A second SIM card in a dual-SIM cellular modem", False),
                    ("D", "An encrypted backup file stored on a USB drive", False),
                ]
            },
        ]

        saved_questions = []
        for q_data in questions_data:
            q, _ = Question.objects.get_or_create(
                question_text=q_data["text"],
                defaults={
                    "category": q_data["category"],
                    "difficulty": q_data["difficulty"],
                    "marks": q_data["marks"],
                    "is_active": True,
                }
            )
            # Ensure options
            for opt_key, opt_text, is_corr in q_data["options"]:
                Option.objects.update_or_create(
                    question=q,
                    option_key=opt_key,
                    defaults={
                        "option_text": opt_text,
                        "is_correct": is_corr,
                    }
                )
            saved_questions.append(q)

        self.stdout.write(self.style.SUCCESS(f"Questions seeded: {len(saved_questions)} questions"))

        # 5. Exams
        now = timezone.now()
        start_time = now - timedelta(hours=1)
        end_time = now + timedelta(days=7)

        # Exam 1: Cyber Security Midterm
        cs_exam, _ = Exam.objects.get_or_create(
            title="Cyber Security Fundamentals Examination",
            defaults={
                "description": "Comprehensive assessment covering core information security, encryption, and network defense principles.",
                "duration_minutes": 30,
                "start_datetime": start_time,
                "end_datetime": end_time,
                "is_active": True,
            }
        )
        cs_exam.start_datetime = start_time
        cs_exam.end_datetime = end_time
        cs_exam.is_active = True
        cs_exam.save()

        ExamDepartment.objects.get_or_create(exam=cs_exam, department=cs_dept)
        # Assign 10 CS questions
        for idx, q in enumerate(saved_questions[:10], start=1):
            ExamQuestion.objects.update_or_create(exam=cs_exam, question=q, defaults={"order": idx})

        # Exam 2: IoT Assessment
        iot_exam, _ = Exam.objects.get_or_create(
            title="Internet of Things & Connected Systems Exam",
            defaults={
                "description": "Assessment of IoT protocols, sensors, edge computing, and LPWAN wireless technologies.",
                "duration_minutes": 30,
                "start_datetime": start_time,
                "end_datetime": end_time,
                "is_active": True,
            }
        )
        iot_exam.start_datetime = start_time
        iot_exam.end_datetime = end_time
        iot_exam.is_active = True
        iot_exam.save()

        ExamDepartment.objects.get_or_create(exam=iot_exam, department=iot_dept)
        # Assign 10 IoT questions
        for idx, q in enumerate(saved_questions[10:], start=1):
            ExamQuestion.objects.update_or_create(exam=iot_exam, question=q, defaults={"order": idx})

        # Exam 3: Joint Common Tech Exam (Both Departments)
        joint_exam, _ = Exam.objects.get_or_create(
            title="University Joint Technology & Computing Assessment",
            defaults={
                "description": "Joint technical assessment for both Cyber Security and Internet of Things cohorts.",
                "duration_minutes": 45,
                "start_datetime": start_time,
                "end_datetime": end_time,
                "is_active": True,
            }
        )
        joint_exam.start_datetime = start_time
        joint_exam.end_datetime = end_time
        joint_exam.is_active = True
        joint_exam.save()

        ExamDepartment.objects.get_or_create(exam=joint_exam, department=cs_dept)
        ExamDepartment.objects.get_or_create(exam=joint_exam, department=iot_dept)
        # Assign 10 mixed questions (5 CS, 5 IoT)
        mixed_qs = saved_questions[:5] + saved_questions[10:15]
        for idx, q in enumerate(mixed_qs, start=1):
            ExamQuestion.objects.update_or_create(exam=joint_exam, question=q, defaults={"order": idx})

        self.stdout.write(self.style.SUCCESS("Exams seeded: CS Exam, IoT Exam, and Joint Assessment"))
        self.stdout.write(self.style.SUCCESS("Seeding completed successfully!"))
