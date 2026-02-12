"""
URL configuration for booking_platform project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from bookings.api_views import ServiceViewSet, StaffViewSet, BookingViewSet, ClientViewSet, StaffBlockViewSet
from bookings.views_schedule import BusinessHoursViewSet, StaffScheduleViewSet, ClosureViewSet, StaffLeaveViewSet
from bookings.views_intake import IntakeProfileViewSet, IntakeWellbeingDisclaimerViewSet
from bookings.views_payment import ClassPackageViewSet, ClientCreditViewSet, PaymentIntegrationViewSet
from bookings.views_stripe import create_checkout_session, stripe_webhook
from bookings.views_dashboard import dashboard_summary, backfill_sbe
from bookings.views_reports import reports_overview, reports_daily, reports_monthly, reports_staff, reports_insights
from core.auth_views import login_view, me_view, set_password_view

router = DefaultRouter()
router.register(r'services', ServiceViewSet, basename='service')
router.register(r'staff', StaffViewSet, basename='staff')
router.register(r'bookings', BookingViewSet)
router.register(r'clients', ClientViewSet)
router.register(r'staff-blocks', StaffBlockViewSet, basename='staff-block')
router.register(r'business-hours', BusinessHoursViewSet)
router.register(r'staff-schedules', StaffScheduleViewSet)
router.register(r'closures', ClosureViewSet)
router.register(r'staff-leave', StaffLeaveViewSet)
router.register(r'intake', IntakeProfileViewSet)
router.register(r'intake-disclaimer', IntakeWellbeingDisclaimerViewSet)
router.register(r'packages', ClassPackageViewSet)
router.register(r'credits', ClientCreditViewSet)
router.register(r'payment', PaymentIntegrationViewSet, basename='payment')

urlpatterns = [
    path('admin/', admin.site.urls),
    # JWT Auth
    path('api/auth/login/', login_view, name='auth-login'),
    path('api/auth/me/', me_view, name='auth-me'),
    path('api/auth/me/set-password/', set_password_view, name='auth-set-password'),
    # Tenant/branding alias (frontend expects /api/tenant/branding/)
    path('api/tenant/branding/', include('core.api_urls_branding')),
    path('api/tenant/', include('core.api_urls_tenant')),
    # DRF router
    path('api/', include(router.urls)),
    path('api/', include('core.api_urls')),
    path('api/checkout/create/', create_checkout_session, name='checkout-create'),
    path('api/checkout/webhook/', stripe_webhook, name='stripe-webhook'),
    path('api/compliance/', include('compliance.urls')),
    path('api/crm/', include('crm.urls')),
    path('api/dashboard-summary/', dashboard_summary, name='dashboard-summary'),
    path('api/backfill-sbe/', backfill_sbe, name='backfill-sbe'),
    path('api/reports/overview/', reports_overview, name='reports-overview'),
    path('api/reports/daily/', reports_daily, name='reports-daily'),
    path('api/reports/monthly/', reports_monthly, name='reports-monthly'),
    path('api/reports/staff/', reports_staff, name='reports-staff'),
    path('api/reports/insights/', reports_insights, name='reports-insights'),
    path('', include('core.urls')),
]
