from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.views.generic import TemplateView
from django.views.static import serve
import os

urlpatterns = [
    path('django-admin/', admin.site.urls),
    path('api/', include('core.urls')),
]

# If frontend build exists, serve the SPA assets and fallback
frontend_dist = settings.BASE_DIR / 'frontend' / 'dist'
if frontend_dist.exists():
    urlpatterns += [
        re_path(r'^assets/(?P<path>.*)$', serve, {'document_root': frontend_dist / 'assets'}),
        re_path(r'^(?!api/|django-admin/).*$', TemplateView.as_view(template_name='index.html')),
    ]
