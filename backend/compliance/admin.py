from django.contrib import admin
from .models import IncidentReport, IncidentPhoto, SignOff, RAMSDocument


class IncidentPhotoInline(admin.TabularInline):
    model = IncidentPhoto
    extra = 0


class SignOffInline(admin.TabularInline):
    model = SignOff
    extra = 0
    readonly_fields = ['signed_at']


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


@admin.register(RAMSDocument)
class RAMSDocumentAdmin(admin.ModelAdmin):
    list_display = ['title', 'reference_number', 'status', 'issue_date', 'expiry_date', 'is_expired']
    list_filter = ['status']
    search_fields = ['title', 'reference_number']

    def is_expired(self, obj):
        return obj.is_expired
    is_expired.boolean = True
    is_expired.short_description = 'Expired?'
