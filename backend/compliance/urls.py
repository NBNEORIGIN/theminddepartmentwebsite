from django.urls import path
from . import views

app_name = 'compliance'

urlpatterns = [
    path('dashboard/', views.dashboard, name='dashboard'),
    path('breakdown/', views.breakdown, name='breakdown'),
    path('priorities/', views.priority_actions, name='priorities'),
    path('items/<int:item_id>/complete/', views.mark_complete, name='mark-complete'),
    path('audit-log/', views.audit_log, name='audit-log'),
    path('recalculate/', views.recalculate, name='recalculate'),
]
