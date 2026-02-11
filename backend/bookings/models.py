from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator, EmailValidator
from django.utils import timezone
import threading

# Import intake models
from .models_intake import IntakeProfile, IntakeWellbeingDisclaimer

# Import payment models
from .models_payment import ClassPackage, ClientCredit, PaymentTransaction

class Service(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    duration_minutes = models.IntegerField(validators=[MinValueValidator(1)])
    price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.duration_minutes}min - ${self.price})"


class Staff(models.Model):
    name = models.CharField(max_length=200)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)
    photo_url = models.URLField(blank=True, help_text='URL to staff member photo')
    services = models.ManyToManyField(Service, related_name='staff_members', blank=True)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'Staff'

    def __str__(self):
        return self.name


class Client(models.Model):
    name = models.CharField(max_length=200)
    email = models.EmailField()
    phone = models.CharField(max_length=20)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.email})"


class Booking(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('no_show', 'No Show'),
    ]
    
    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Payment Pending'),
        ('paid', 'Paid'),
        ('failed', 'Payment Failed'),
        ('refunded', 'Refunded'),
        ('credit_used', 'Credit Used'),
    ]
    
    PAYMENT_TYPE_CHOICES = [
        ('single_class', 'Single Class'),
        ('package', 'Class Package'),
        ('credit', 'Used Credit'),
    ]

    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='bookings')
    service = models.ForeignKey(Service, on_delete=models.PROTECT, related_name='bookings')
    staff = models.ForeignKey(Staff, on_delete=models.PROTECT, related_name='bookings')
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    notes = models.TextField(blank=True)
    
    # Payment integration fields
    payment_status = models.CharField(
        max_length=20,
        choices=PAYMENT_STATUS_CHOICES,
        default='pending',
        help_text='Payment status from payment system'
    )
    payment_id = models.CharField(
        max_length=200,
        blank=True,
        help_text='Payment reference ID from payment system'
    )
    payment_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Amount paid for this booking'
    )
    payment_type = models.CharField(
        max_length=20,
        choices=PAYMENT_TYPE_CHOICES,
        default='single_class',
        help_text='Type of payment used'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-start_time']
        indexes = [
            models.Index(fields=['start_time', 'staff']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"{self.client.name} - {self.service.name} with {self.staff.name} on {self.start_time.strftime('%Y-%m-%d %H:%M')}"

    def save(self, *args, **kwargs):
        if not self.end_time:
            self.end_time = self.start_time + timezone.timedelta(minutes=self.service.duration_minutes)
        super().save(*args, **kwargs)


class Session(models.Model):
    """For Mind Department style group sessions"""
    title = models.CharField(max_length=200)
    description = models.TextField()
    service = models.ForeignKey(Service, on_delete=models.PROTECT, related_name='sessions')
    staff = models.ForeignKey(Staff, on_delete=models.PROTECT, related_name='sessions')
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    capacity = models.IntegerField(validators=[MinValueValidator(1)])
    enrolled_clients = models.ManyToManyField(Client, related_name='sessions', blank=True)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-start_time']

    def __str__(self):
        return f"{self.title} ({self.start_time.strftime('%Y-%m-%d %H:%M')})"

    @property
    def enrollment_count(self):
        return self.enrolled_clients.count()

    @property
    def is_full(self):
        return self.enrollment_count >= self.capacity

    @property
    def available_spots(self):
        return max(0, self.capacity - self.enrollment_count)


class BusinessHours(models.Model):
    """Business opening hours per day of week"""
    DAYS_OF_WEEK = [
        (0, 'Monday'),
        (1, 'Tuesday'),
        (2, 'Wednesday'),
        (3, 'Thursday'),
        (4, 'Friday'),
        (5, 'Saturday'),
        (6, 'Sunday'),
    ]
    
    day_of_week = models.IntegerField(choices=DAYS_OF_WEEK, unique=True)
    is_open = models.BooleanField(default=True)
    open_time = models.TimeField(default='09:00')
    close_time = models.TimeField(default='17:00')
    
    class Meta:
        ordering = ['day_of_week']
        verbose_name_plural = 'Business Hours'
    
    def __str__(self):
        day_name = dict(self.DAYS_OF_WEEK)[self.day_of_week]
        if not self.is_open:
            return f"{day_name}: Closed"
        return f"{day_name}: {self.open_time.strftime('%H:%M')} - {self.close_time.strftime('%H:%M')}"


class StaffSchedule(models.Model):
    """Staff member working hours per day of week"""
    DAYS_OF_WEEK = [
        (0, 'Monday'),
        (1, 'Tuesday'),
        (2, 'Wednesday'),
        (3, 'Thursday'),
        (4, 'Friday'),
        (5, 'Saturday'),
        (6, 'Sunday'),
    ]
    
    staff = models.ForeignKey(Staff, on_delete=models.CASCADE, related_name='schedules')
    day_of_week = models.IntegerField(choices=DAYS_OF_WEEK)
    is_working = models.BooleanField(default=True)
    start_time = models.TimeField(default='09:00')
    end_time = models.TimeField(default='17:00')
    
    class Meta:
        ordering = ['staff', 'day_of_week']
        unique_together = ['staff', 'day_of_week']
        verbose_name = 'Staff Schedule'
    
    def __str__(self):
        day_name = dict(self.DAYS_OF_WEEK)[self.day_of_week]
        if not self.is_working:
            return f"{self.staff.name} - {day_name}: Not Working"
        return f"{self.staff.name} - {day_name}: {self.start_time.strftime('%H:%M')} - {self.end_time.strftime('%H:%M')}"


class Closure(models.Model):
    """Business closures (holidays, special events)"""
    date = models.DateField(unique=True)
    reason = models.CharField(max_length=200)
    all_day = models.BooleanField(default=True)
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['date']
    
    def __str__(self):
        if self.all_day:
            return f"{self.date.strftime('%Y-%m-%d')}: {self.reason} (All Day)"
        return f"{self.date.strftime('%Y-%m-%d')}: {self.reason} ({self.start_time} - {self.end_time})"


class StaffLeave(models.Model):
    """Individual staff member time off"""
    staff = models.ForeignKey(Staff, on_delete=models.CASCADE, related_name='leave')
    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.CharField(max_length=200, blank=True)
    
    class Meta:
        ordering = ['start_date']
        verbose_name = 'Staff Leave'
        verbose_name_plural = 'Staff Leave'
    
    def __str__(self):
        if self.start_date == self.end_date:
            return f"{self.staff.name} - {self.start_date.strftime('%Y-%m-%d')}"
        return f"{self.staff.name} - {self.start_date.strftime('%Y-%m-%d')} to {self.end_date.strftime('%Y-%m-%d')}"
