from django.contrib import admin
from .models import (
    Department,
    Student,
    Exam,
    ExamDepartment,
    Question,
    Option,
    ExamQuestion,
    ExamAttempt,
    StudentAnswer,
)


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'code', 'created_at')
    search_fields = ('name', 'code')


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ('roll_number', 'full_name', 'department', 'active', 'created_at')
    list_filter = ('department', 'active')
    search_fields = ('roll_number', 'full_name')


class OptionInline(admin.TabularInline):
    model = Option
    extra = 4


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ('id', 'question_text', 'marks', 'category', 'difficulty', 'is_active')
    list_filter = ('category', 'difficulty', 'is_active')
    search_fields = ('question_text',)
    inlines = [OptionInline]


class ExamDepartmentInline(admin.TabularInline):
    model = ExamDepartment
    extra = 1


class ExamQuestionInline(admin.TabularInline):
    model = ExamQuestion
    extra = 1


@admin.register(Exam)
class ExamAdmin(admin.ModelAdmin):
    list_display = ('title', 'duration_minutes', 'start_datetime', 'end_datetime', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('title', 'description')
    inlines = [ExamDepartmentInline, ExamQuestionInline]


@admin.register(ExamAttempt)
class ExamAttemptAdmin(admin.ModelAdmin):
    list_display = ('student', 'exam', 'status', 'score', 'max_score', 'percentage', 'violation_count', 'started_at')
    list_filter = ('status', 'exam')
    search_fields = ('student__roll_number', 'student__full_name', 'exam__title')


@admin.register(StudentAnswer)
class StudentAnswerAdmin(admin.ModelAdmin):
    list_display = ('attempt', 'question', 'selected_option', 'answered_at')
