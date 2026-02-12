from django.db import models


class Lead(models.Model):
    STATUS_CHOICES = [
        ('NEW', 'New'),
        ('CONTACTED', 'Contacted'),
        ('QUALIFIED', 'Qualified'),
        ('CONVERTED', 'Converted'),
        ('LOST', 'Lost'),
    ]
    SOURCE_CHOICES = [
        ('booking', 'Booking'),
        ('website', 'Website'),
        ('referral', 'Referral'),
        ('social', 'Social Media'),
        ('manual', 'Manual Entry'),
        ('other', 'Other'),
    ]

    name = models.CharField(max_length=200)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=30, blank=True)
    source = models.CharField(max_length=30, choices=SOURCE_CHOICES, default='manual')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='NEW')
    value_pence = models.IntegerField(default=0, help_text='Estimated value in pence')
    notes = models.TextField(blank=True)
    # Link to booking client if auto-created
    client_id = models.IntegerField(null=True, blank=True, help_text='bookings.Client FK')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.name} ({self.status})'
