"""
Phase 7 — Dashboard Intelligence API
GET /api/dashboard-summary/
"""
from datetime import timedelta
from decimal import Decimal
from django.utils import timezone
from django.db.models import Sum, Count, Q, F
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .models import Booking, Client, Service


@api_view(['GET'])
@permission_classes([AllowAny])
def dashboard_summary(request):
    now = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    week_end = today_start + timedelta(days=7)

    # Revenue today
    today_bookings = Booking.objects.filter(
        start_time__gte=today_start,
        start_time__lt=today_end,
        status__in=['confirmed', 'completed']
    )
    revenue_today = today_bookings.aggregate(
        total=Sum('service__price')
    )['total'] or Decimal('0')

    # Revenue next 7 days
    week_bookings = Booking.objects.filter(
        start_time__gte=today_start,
        start_time__lt=week_end,
        status__in=['confirmed', 'completed', 'pending']
    )
    revenue_7_days = week_bookings.aggregate(
        total=Sum('service__price')
    )['total'] or Decimal('0')

    # Revenue at risk (sum of revenue_at_risk for upcoming bookings)
    revenue_at_risk = Booking.objects.filter(
        start_time__gte=today_start,
        status__in=['confirmed', 'pending'],
        revenue_at_risk__isnull=False
    ).aggregate(total=Sum('revenue_at_risk'))['total'] or Decimal('0')

    # High risk bookings today
    high_risk_today = Booking.objects.filter(
        start_time__gte=today_start,
        start_time__lt=today_end,
        risk_level__in=['HIGH', 'CRITICAL'],
        status__in=['confirmed', 'pending']
    ).count()

    # Reliability distribution
    clients = Client.objects.all()
    reliability_dist = {
        'excellent': clients.filter(reliability_score__gte=85).count(),
        'good': clients.filter(reliability_score__gte=60, reliability_score__lt=85).count(),
        'fair': clients.filter(reliability_score__gte=40, reliability_score__lt=60).count(),
        'poor': clients.filter(reliability_score__lt=40).count(),
    }

    # Demand heatmap data: bookings by hour and day of week (last 30 days)
    thirty_days_ago = now - timedelta(days=30)
    heatmap_bookings = (
        Booking.objects.filter(
            start_time__gte=thirty_days_ago,
            status__in=['confirmed', 'completed']
        )
        .extra(select={
            'hour': 'EXTRACT(hour FROM start_time)',
            'dow': 'EXTRACT(dow FROM start_time)',
        })
        .values('hour', 'dow')
        .annotate(count=Count('id'))
    )
    heatmap = []
    for entry in heatmap_bookings:
        heatmap.append({
            'hour': int(entry['hour']),
            'day_of_week': int(entry['dow']),
            'count': entry['count'],
        })

    # Additional intelligence
    total_bookings_upcoming = Booking.objects.filter(
        start_time__gte=today_start,
        status__in=['confirmed', 'pending']
    ).count()

    avg_reliability = clients.aggregate(avg=Sum('reliability_score') / Count('id'))['avg'] or 0

    return Response({
        'revenue_today': float(revenue_today),
        'revenue_next_7_days': float(revenue_7_days),
        'revenue_at_risk': float(revenue_at_risk),
        'high_risk_bookings_today': high_risk_today,
        'reliability_distribution': reliability_dist,
        'demand_heatmap_data': heatmap,
        'total_upcoming_bookings': total_bookings_upcoming,
        'average_reliability_score': round(float(avg_reliability), 1),
    })
