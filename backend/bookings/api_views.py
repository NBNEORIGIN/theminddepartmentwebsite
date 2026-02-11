from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Service, Staff, Client, Booking, Session
from .serializers import ServiceSerializer, StaffSerializer, ClientSerializer, BookingSerializer, SessionSerializer
from .utils import generate_time_slots, get_available_dates


class ServiceViewSet(viewsets.ModelViewSet):
    queryset = Service.objects.filter(active=True)
    serializer_class = ServiceSerializer


class StaffViewSet(viewsets.ModelViewSet):
    queryset = Staff.objects.filter(active=True)
    serializer_class = StaffSerializer


class ClientViewSet(viewsets.ModelViewSet):
    queryset = Client.objects.all()
    serializer_class = ClientSerializer


class BookingViewSet(viewsets.ModelViewSet):
    queryset = Booking.objects.all()
    serializer_class = BookingSerializer
    
    def create(self, request, *args, **kwargs):
        """
        Create a booking. Accepts client details and creates/finds client automatically.
        Expected data: service, staff, date, time, client_name, client_email, client_phone, notes
        """
        from datetime import datetime
        from django.db import transaction
        
        # Extract data
        service_id = request.data.get('service')
        staff_id = request.data.get('staff')
        date_str = request.data.get('date')
        time_str = request.data.get('time')
        client_name = request.data.get('client_name')
        client_email = request.data.get('client_email')
        client_phone = request.data.get('client_phone')
        notes = request.data.get('notes', '')
        
        # Validate required fields
        if not all([service_id, staff_id, date_str, time_str, client_name, client_email, client_phone]):
            return Response(
                {'error': 'Missing required fields: service, staff, date, time, client_name, client_email, client_phone'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            with transaction.atomic():
                # Find or create client by email
                client, created = Client.objects.get_or_create(
                    email=client_email,
                    defaults={
                        'name': client_name,
                        'phone': client_phone,
                    }
                )
                
                # If client exists but name/phone changed, update them
                if not created:
                    if client.name != client_name or client.phone != client_phone:
                        client.name = client_name
                        client.phone = client_phone
                        client.save()
                
                # Get staff and service
                staff = Staff.objects.get(id=staff_id, active=True)
                service = Service.objects.get(id=service_id, active=True)
                
                # Parse date and time into datetime
                from django.utils import timezone as tz
                datetime_str = f"{date_str} {time_str}"
                start_datetime = datetime.strptime(datetime_str, '%Y-%m-%d %H:%M')
                start_datetime = tz.make_aware(start_datetime)
                
                # Calculate end time based on service duration
                from datetime import timedelta
                end_datetime = start_datetime + timedelta(minutes=service.duration_minutes)
                
                # Check for overlapping bookings with this staff member
                overlapping_bookings = Booking.objects.filter(
                    staff=staff,
                    status__in=['pending', 'confirmed'],
                    start_time__lt=end_datetime,
                    end_time__gt=start_datetime
                )
                
                if overlapping_bookings.exists():
                    return Response(
                        {'error': 'This time slot is no longer available. Please select a different time.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Create booking
                booking = Booking.objects.create(
                    client=client,
                    staff=staff,
                    service=service,
                    start_time=start_datetime,
                    end_time=end_datetime,
                    status='confirmed',
                    notes=notes
                )
                
                # Prepare response data first
                response_data = {
                    'id': booking.id,
                    'client': booking.client.id,
                    'client_name': booking.client.name,
                    'service': booking.service.id,
                    'service_name': booking.service.name,
                    'staff': booking.staff.id,
                    'staff_name': booking.staff.name,
                    'start_time': booking.start_time.isoformat(),
                    'end_time': booking.end_time.isoformat(),
                    'status': booking.status,
                    'notes': booking.notes,
                    'created_at': booking.created_at.isoformat(),
                    'updated_at': booking.updated_at.isoformat(),
                }
                
                # Send confirmation email asynchronously (don't block response)
                try:
                    from django.core.mail import send_mail
                    from django.conf import settings
                    import threading
                    
                    def send_email_async():
                        try:
                            print(f"[EMAIL] Starting email send to {client.email}")
                            
                            # Try Resend first, fallback to SMTP
                            from django.conf import settings
                            resend_api_key = getattr(settings, 'RESEND_API_KEY', None)
                            
                            use_resend = resend_api_key and resend_api_key.strip()
                            
                            if use_resend:
                                print(f"[EMAIL] Using Resend API")
                                import resend
                                resend.api_key = resend_api_key
                            else:
                                print(f"[EMAIL] Resend not configured, using SMTP")
                            
                            subject = f'Booking Confirmation - {service.name}'
                            message = f"""Dear {client.name},

Your appointment has been confirmed!

Booking Details:
- Service: {service.name}
- Staff: {staff.name}
- Date: {start_datetime.strftime('%A, %B %d, %Y')}
- Time: {start_datetime.strftime('%H:%M')}
- Duration: {service.duration_minutes} minutes
- Price: £{service.price}

Reference: #{booking.id}

If you need to cancel or reschedule, please contact us.

Thank you,
The Mind Department"""
                            
                            if use_resend:
                                # Use Resend API
                                from_email = getattr(settings, 'RESEND_FROM_EMAIL', 'onboarding@resend.dev')
                                params = {
                                    "from": f"The Mind Department <{from_email}>",
                                    "to": [client.email],
                                    "subject": subject,
                                    "text": message
                                }
                                email = resend.Emails.send(params)
                                print(f"[EMAIL] Successfully sent via Resend to {client.email}, ID: {email.get('id')}")
                            else:
                                # Use Django SMTP
                                from django.core.mail import send_mail
                                send_mail(
                                    subject=subject,
                                    message=message,
                                    from_email=settings.DEFAULT_FROM_EMAIL,
                                    recipient_list=[client.email],
                                    fail_silently=False,
                                )
                                print(f"[EMAIL] Successfully sent via SMTP to {client.email}")
                        except Exception as e:
                            print(f"[EMAIL] ERROR: {type(e).__name__}: {str(e)}")
                            import traceback
                            print(f"[EMAIL] Traceback: {traceback.format_exc()}")
                    
                    # Start email sending in background thread
                    email_thread = threading.Thread(target=send_email_async)
                    email_thread.daemon = True
                    email_thread.start()
                except Exception as e:
                    print(f"Failed to start email thread: {e}")
                
                # Return booking data immediately
                return Response(response_data, status=status.HTTP_201_CREATED)
            
        except (Staff.DoesNotExist, Service.DoesNotExist):
            return Response(
                {'error': 'Invalid staff or service ID'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': f'Failed to create booking: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def slots(self, request):
        """
        Get available time slots for booking.
        Query params: staff_id, service_id, date (YYYY-MM-DD)
        """
        staff_id = request.query_params.get('staff_id')
        service_id = request.query_params.get('service_id')
        date = request.query_params.get('date')
        
        if not all([staff_id, service_id, date]):
            return Response(
                {'error': 'staff_id, service_id, and date are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        slots = generate_time_slots(staff_id, service_id, date)
        return Response({'slots': slots})
    
    @action(detail=False, methods=['get'])
    def available_dates(self, request):
        """
        Get dates with available slots.
        Query params: staff_id, service_id, days_ahead (optional, default 30)
        """
        staff_id = request.query_params.get('staff_id')
        service_id = request.query_params.get('service_id')
        days_ahead = int(request.query_params.get('days_ahead', 30))
        
        if not all([staff_id, service_id]):
            return Response(
                {'error': 'staff_id and service_id are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        dates = get_available_dates(staff_id, service_id, days_ahead)
        return Response({'available_dates': dates})


class SessionViewSet(viewsets.ModelViewSet):
    queryset = Session.objects.filter(active=True)
    serializer_class = SessionSerializer
    
    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """Get upcoming sessions"""
        from django.utils import timezone
        sessions = Session.objects.filter(
            active=True,
            start_time__gte=timezone.now()
        ).order_by('start_time')
        serializer = self.get_serializer(sessions, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def enroll(self, request, pk=None):
        """Enroll a client in a session"""
        session = self.get_object()
        client_id = request.data.get('client_id')
        
        if not client_id:
            return Response(
                {'error': 'client_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            client = Client.objects.get(id=client_id)
        except Client.DoesNotExist:
            return Response(
                {'error': 'Client not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if session.is_full:
            return Response(
                {'error': 'Session is full'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        session.enrolled_clients.add(client)
        serializer = self.get_serializer(session)
        return Response(serializer.data)
