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
from bookings.api_views import ServiceViewSet, StaffViewSet, BookingViewSet, ClientViewSet
from bookings.views_schedule import BusinessHoursViewSet, StaffScheduleViewSet, ClosureViewSet, StaffLeaveViewSet
from bookings.views_intake import IntakeProfileViewSet, IntakeWellbeingDisclaimerViewSet
from bookings.views_payment import ClassPackageViewSet, ClientCreditViewSet, PaymentIntegrationViewSet

router = DefaultRouter()
router.register(r'services', ServiceViewSet)
router.register(r'staff', StaffViewSet)
router.register(r'bookings', BookingViewSet)
router.register(r'clients', ClientViewSet)
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
    path('api/', include(router.urls)),
    path('api/', include('core.api_urls')),
    path('', include('core.urls')),
]
