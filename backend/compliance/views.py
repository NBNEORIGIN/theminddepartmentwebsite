"""
Compliance Intelligence API views.
Provides Peace of Mind Score dashboard, breakdown, and priority actions.
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from django.db.models import Count, Q

from .models import (
    ComplianceItem, ComplianceCategory, PeaceOfMindScore,
    ScoreAuditLog, IncidentReport, Equipment,
)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def dashboard(request):
    """
    Phase 3: Peace of Mind Score dashboard widget.
    Returns score, colour, interpretation, change messaging.
    
    GET /api/compliance/dashboard/
    """
    score_obj = PeaceOfMindScore.objects.filter(pk=1).first()

    if not score_obj:
        score_obj = PeaceOfMindScore.recalculate()

    # Phase 6: Score change messaging
    change_message = None
    change = score_obj.score_change
    if change > 0:
        change_message = f"Compliance improved by {change}% since last update."
    elif change < 0:
        overdue_count = score_obj.overdue_count
        if overdue_count > 0:
            change_message = f"{overdue_count} item{'s' if overdue_count != 1 else ''} became overdue."
        else:
            change_message = f"Score decreased by {abs(change)}%."

    # Open incidents count
    open_incidents = IncidentReport.objects.exclude(status__in=['RESOLVED', 'CLOSED']).count()

    # Overdue equipment count
    today = timezone.now().date()
    overdue_equipment = Equipment.objects.filter(
        next_inspection__lt=today
    ).exclude(status='OUT_OF_SERVICE').count()

    return Response({
        'score': score_obj.score,
        'previous_score': score_obj.previous_score,
        'colour': score_obj.colour,
        'interpretation': score_obj.interpretation,
        'change_message': change_message,
        'total_items': score_obj.total_items,
        'compliant_count': score_obj.compliant_count,
        'due_soon_count': score_obj.due_soon_count,
        'overdue_count': score_obj.overdue_count,
        'legal_items': score_obj.legal_items,
        'best_practice_items': score_obj.best_practice_items,
        'open_incidents': open_incidents,
        'overdue_equipment': overdue_equipment,
        'last_calculated_at': score_obj.last_calculated_at.isoformat(),
    })


@api_view(['GET'])
@permission_classes([IsAdminUser])
def breakdown(request):
    """
    Phase 4: Score breakdown by category.
    Supports ?type=LEGAL or ?type=BEST_PRACTICE filtering.
    
    GET /api/compliance/breakdown/
    GET /api/compliance/breakdown/?type=LEGAL
    """
    item_type_filter = request.query_params.get('type')

    categories = ComplianceCategory.objects.all()
    result = []

    for cat in categories:
        items = cat.items.all()
        if item_type_filter:
            items = items.filter(item_type=item_type_filter)

        total = items.count()
        if total == 0:
            continue

        compliant = items.filter(status='COMPLIANT').count()
        due_soon = items.filter(status='DUE_SOON').count()
        overdue = items.filter(status='OVERDUE').count()

        cat_total_weight = sum(i.weight for i in items)
        cat_achieved = sum(i.achieved_weight for i in items)
        cat_pct = round((cat_achieved / cat_total_weight) * 100) if cat_total_weight > 0 else 100

        result.append({
            'category': cat.name,
            'total_items': total,
            'compliant': compliant,
            'due_soon': due_soon,
            'overdue': overdue,
            'score_pct': cat_pct,
            'max_score': cat.max_score,
            'current_score': cat.current_score,
        })

    return Response({
        'categories': result,
        'filter': item_type_filter or 'all',
    })


@api_view(['GET'])
@permission_classes([IsAdminUser])
def priority_actions(request):
    """
    Phase 5: Smart priority list — top 5 actions.
    Sorted by: 1) Overdue LEGAL, 2) Overdue BEST_PRACTICE, 3) Due Soon LEGAL
    
    GET /api/compliance/priorities/
    """
    # Build priority ordering: overdue legal first, then overdue best practice, then due soon legal
    overdue_legal = ComplianceItem.objects.filter(
        status='OVERDUE', item_type='LEGAL'
    ).order_by('due_date')

    overdue_bp = ComplianceItem.objects.filter(
        status='OVERDUE', item_type='BEST_PRACTICE'
    ).order_by('due_date')

    due_soon_legal = ComplianceItem.objects.filter(
        status='DUE_SOON', item_type='LEGAL'
    ).order_by('due_date')

    due_soon_bp = ComplianceItem.objects.filter(
        status='DUE_SOON', item_type='BEST_PRACTICE'
    ).order_by('due_date')

    # Combine in priority order, take top 5
    combined = list(overdue_legal) + list(overdue_bp) + list(due_soon_legal) + list(due_soon_bp)
    top_5 = combined[:5]

    actions = []
    for item in top_5:
        actions.append({
            'id': item.id,
            'title': item.title,
            'category': item.category.name,
            'item_type': item.item_type,
            'status': item.status,
            'due_date': item.due_date.isoformat() if item.due_date else None,
            'regulatory_ref': item.regulatory_ref,
            'weight': item.weight,
        })

    return Response({'actions': actions})


@api_view(['POST'])
@permission_classes([IsAdminUser])
def mark_complete(request, item_id):
    """
    Phase 5: Mark a compliance item as compliant (complete).
    
    POST /api/compliance/items/<id>/complete/
    """
    try:
        item = ComplianceItem.objects.get(id=item_id)
    except ComplianceItem.DoesNotExist:
        return Response({'error': 'Item not found'}, status=status.HTTP_404_NOT_FOUND)

    item.status = 'COMPLIANT'
    item.completed_at = timezone.now()
    item.save()  # Signal triggers recalculation

    return Response({
        'id': item.id,
        'title': item.title,
        'status': 'COMPLIANT',
        'message': f'"{item.title}" marked as compliant.',
    })


@api_view(['GET'])
@permission_classes([IsAdminUser])
def audit_log(request):
    """
    Phase 7: Score audit log.
    
    GET /api/compliance/audit-log/
    GET /api/compliance/audit-log/?limit=20
    """
    limit = int(request.query_params.get('limit', 20))
    logs = ScoreAuditLog.objects.all()[:limit]

    return Response({
        'logs': [
            {
                'score': log.score,
                'previous_score': log.previous_score,
                'change': log.score - log.previous_score,
                'total_items': log.total_items,
                'compliant_count': log.compliant_count,
                'due_soon_count': log.due_soon_count,
                'overdue_count': log.overdue_count,
                'trigger': log.get_trigger_display(),
                'calculated_at': log.calculated_at.isoformat(),
            }
            for log in logs
        ]
    })


@api_view(['POST'])
@permission_classes([IsAdminUser])
def recalculate(request):
    """
    Manually trigger score recalculation.
    
    POST /api/compliance/recalculate/
    """
    result = PeaceOfMindScore.recalculate()

    # Update trigger to manual
    latest_log = ScoreAuditLog.objects.order_by('-calculated_at').first()
    if latest_log:
        latest_log.trigger = 'manual'
        latest_log.save(update_fields=['trigger'])

    return Response({
        'score': result.score,
        'previous_score': result.previous_score,
        'message': f'Score recalculated: {result.score}%',
    })
