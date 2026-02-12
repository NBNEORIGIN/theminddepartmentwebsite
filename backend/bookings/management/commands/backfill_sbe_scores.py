from django.core.management.base import BaseCommand
from bookings.models import Booking
from bookings.smart_engine import process_booking


class Command(BaseCommand):
    help = 'Backfill Smart Booking Engine scores for existing bookings'

    def handle(self, *args, **options):
        bookings = Booking.objects.filter(risk_score__isnull=True).select_related('client', 'service')
        total = bookings.count()
        self.stdout.write(f'Backfilling {total} bookings...')
        done = 0
        for booking in bookings:
            try:
                process_booking(booking)
                done += 1
            except Exception as e:
                self.stderr.write(f'  Error on booking #{booking.id}: {e}')
        self.stdout.write(self.style.SUCCESS(f'{done}/{total} bookings scored.'))
