from rest_framework import serializers
from .models import Service, Staff, Client, Booking, Session


class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = ['id', 'name', 'description', 'duration_minutes', 'price', 'active', 'created_at', 'updated_at']


class StaffSerializer(serializers.ModelSerializer):
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
        fields = ['id', 'name', 'email', 'phone', 'photo_url', 'services', 'service_ids', 'active', 'created_at', 'updated_at']


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
