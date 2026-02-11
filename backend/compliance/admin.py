from django.contrib import admin
from .models import (
    IncidentReport, IncidentPhoto, SignOff, RAMSDocument,
    RiskAssessment, HazardFinding, Equipment, EquipmentInspection, ComplianceCategory,
)


# --- Inlines ---

class IncidentPhotoInline(admin.TabularInline):
    model = IncidentPhoto
    extra = 0


class SignOffInline(admin.TabularInline):
    model = SignOff
    extra = 0
    readonly_fields = ['signed_at']


class HazardFindingInline(admin.TabularInline):
    model = HazardFinding
    extra = 0
    fields = ['category', 'description', 'severity', 'status', 'regulatory_ref', 'due_date']


class EquipmentInspectionInline(admin.TabularInline):
    model = EquipmentInspection
    extra = 0
    readonly_fields = ['created_at']


# --- Incidents ---

@admin.register(IncidentReport)
class IncidentReportAdmin(admin.ModelAdmin):
    list_display = ['title', 'severity', 'status', 'location', 'incident_date', 'reported_by']
    list_filter = ['severity', 'status']
    search_fields = ['title', 'description']
    date_hierarchy = 'incident_date'
    inlines = [IncidentPhotoInline, SignOffInline]


@admin.register(IncidentPhoto)
class IncidentPhotoAdmin(admin.ModelAdmin):
    list_display = ['incident', 'caption', 'uploaded_at']


@admin.register(SignOff)
class SignOffAdmin(admin.ModelAdmin):
    list_display = ['incident', 'signed_by', 'role', 'signed_at']


# --- Risk Assessments & Findings ---

@admin.register(RiskAssessment)
class RiskAssessmentAdmin(admin.ModelAdmin):
    list_display = ['title', 'site_area', 'assessor', 'assessment_date', 'review_date', 'findings_count_display', 'high_risk_display', 'status']
    list_filter = ['status', 'assessment_date']
    search_fields = ['title', 'site_area', 'description']
    date_hierarchy = 'assessment_date'
    inlines = [HazardFindingInline]

    def findings_count_display(self, obj):
        return obj.findings_count
    findings_count_display.short_description = 'Findings'

    def high_risk_display(self, obj):
        count = obj.high_risk_count
        if count > 0:
            return f'{count} ⚠️'
        return '0'
    high_risk_display.short_description = 'High Risk'


@admin.register(HazardFinding)
class HazardFindingAdmin(admin.ModelAdmin):
    list_display = ['category', 'short_description', 'severity', 'status', 'assessment', 'regulatory_ref', 'due_date']
    list_filter = ['severity', 'status', 'category']
    search_fields = ['category', 'description', 'regulatory_ref']

    def short_description(self, obj):
        return obj.description[:80] + '...' if len(obj.description) > 80 else obj.description
    short_description.short_description = 'Description'


# --- Equipment ---

@admin.register(Equipment)
class EquipmentAdmin(admin.ModelAdmin):
    list_display = ['name', 'location', 'category', 'last_inspection', 'next_inspection', 'status', 'is_overdue_display']
    list_filter = ['status', 'category']
    search_fields = ['name', 'location', 'serial_number']
    inlines = [EquipmentInspectionInline]

    def is_overdue_display(self, obj):
        return obj.is_overdue
    is_overdue_display.boolean = True
    is_overdue_display.short_description = 'Overdue?'


@admin.register(EquipmentInspection)
class EquipmentInspectionAdmin(admin.ModelAdmin):
    list_display = ['equipment', 'inspection_date', 'inspector', 'result', 'next_due']
    list_filter = ['result', 'inspection_date']
    date_hierarchy = 'inspection_date'


# --- Compliance Scoring ---

@admin.register(ComplianceCategory)
class ComplianceCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'current_score', 'max_score', 'percentage_display', 'order']
    list_editable = ['current_score', 'max_score', 'order']
    ordering = ['order']

    def percentage_display(self, obj):
        pct = obj.percentage
        if pct >= 80:
            return f'{pct}% ✅'
        elif pct >= 60:
            return f'{pct}% ⚠️'
        return f'{pct}% ❌'
    percentage_display.short_description = 'Score %'


# --- RAMS ---

@admin.register(RAMSDocument)
class RAMSDocumentAdmin(admin.ModelAdmin):
    list_display = ['title', 'reference_number', 'status', 'issue_date', 'expiry_date', 'is_expired_display']
    list_filter = ['status']
    search_fields = ['title', 'reference_number']

    def is_expired_display(self, obj):
        return obj.is_expired
    is_expired_display.boolean = True
    is_expired_display.short_description = 'Expired?'
