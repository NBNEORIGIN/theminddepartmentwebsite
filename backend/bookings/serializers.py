from rest_framework import serializers
from .models import Service, Staff, Client, Booking, Session


class ServiceSerializer(serializers.ModelSerializer):
    price_pence = serializers.IntegerField(read_only=True)
    is_active = serializers.BooleanField(source='active', required=False)
    staff_ids = serializers.SerializerMethodField()
    price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=0)

    class Meta:
        model = Service
        fields = ['id', 'name', 'description', 'category', 'duration_minutes', 'price',
                  'price_pence', 'payment_type', 'deposit_pence', 'deposit_percentage',
                  'colour', 'sort_order', 'active', 'is_active', 'staff_ids',
                  'created_at', 'updated_at']

    def get_staff_ids(self, obj):
        return list(obj.staff_members.values_list('id', flat=True))


class StaffSerializer(serializers.ModelSerializer):
    name = serializers.CharField(required=False)
    services = ServiceSerializer(many=True, read_only=True)
    service_ids = serializers.PrimaryKeyRelatedField(
        many=True, 
        queryset=Service.objects.all(), 
        source='services', 
        write_only=True,
        required=False
    )

    class Meta:
        model = Staff
        fields = ['id', 'name', 'role', 'email', 'phone', 'photo_url', 'services', 'service_ids', 'active', 'created_at', 'updated_at']


class ClientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = ['id', 'name', 'email', 'phone', 'notes', 'created_at', 'updated_at']


class BookingSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source='client.name', read_only=True)
    service_name = serializers.CharField(source='service.name', read_only=True)
    staff_name = serializers.CharField(source='staff.name', read_only=True)
    
    class Meta:
        model = Booking
        fields = ['id', 'client', 'client_name', 'service', 'service_name', 'staff', 'staff_name', 
                  'start_time', 'end_time', 'status', 'notes', 'created_at', 'updated_at']
        read_only_fields = ['end_time', 'created_at', 'updated_at']


class SessionSerializer(serializers.ModelSerializer):
    service_name = serializers.CharField(source='service.name', read_only=True)
    staff_name = serializers.CharField(source='staff.name', read_only=True)
    enrollment_count = serializers.IntegerField(read_only=True)
    is_full = serializers.BooleanField(read_only=True)
    available_spots = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Session
        fields = ['id', 'title', 'description', 'service', 'service_name', 'staff', 'staff_name',
                  'start_time', 'end_time', 'capacity', 'enrollment_count', 'is_full', 'available_spots',
                  'active', 'created_at', 'updated_at']
