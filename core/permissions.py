from rest_framework import permissions


class IsAdminUser(permissions.BasePermission):
    """
    Allows access only to authenticated admin users (staff or superuser).
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


class IsStudentUser(permissions.BasePermission):
    """
    Allows access only to authenticated active students.
    Admins cannot use this to pretend to be a student.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        # Admin accounts are not students
        if request.user.is_staff or request.user.is_superuser:
            return False
        try:
            return hasattr(request.user, 'student_profile') and request.user.student_profile.active
        except Exception:
            return False
