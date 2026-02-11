from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from bookings.models import Service, Staff, IntakeWellbeingDisclaimer, ClassPackage
from decimal import Decimal


class Command(BaseCommand):
    help = 'Setup production data including superuser'

    def handle(self, *args, **kwargs):
        # Create superuser
        if not User.objects.filter(username='admin').exists():
            User.objects.create_superuser('admin', 'aly@theminddepartment.com', 'admin123')
            self.stdout.write(self.style.SUCCESS('✓ Superuser created: admin'))
        else:
            self.stdout.write('✓ Superuser already exists')

        # Create Service
        service, created = Service.objects.get_or_create(
            name='Mindfulness Session',
            defaults={
                'description': '60-minute guided mindfulness practice to support your wellbeing',
                'duration_minutes': 60,
                'price': Decimal('25.00'),
                'active': True
            }
        )
        self.stdout.write(self.style.SUCCESS(f'✓ {"Created" if created else "Found"} service: {service.name}'))

        # Staff members should be created manually via admin interface
        self.stdout.write(self.style.SUCCESS('✓ Staff members managed via admin interface'))

        # Create Disclaimer
        disclaimer_content = """<h2>The Mind Department - Health & Wellness Consent and Liability Waiver</h2>

<h3>Introduction</h3>
<p>Welcome to The Mind Department ("the Practice"). Our wellness services (including mindfulness sessions, meditation, and wellness coaching) are designed to help you make healthier lifestyle choices to enhance your physical and mental well-being.</p>

<h3>Not Medical Advice</h3>
<p>I understand that The Mind Department is not a licensed medical care provider. The services provided are not a substitute for professional medical advice, diagnosis, or treatment. I agree that I should not discontinue or avoid any medical treatment recommended by my physician or other licensed healthcare provider.</p>

<h3>Assumption of Risk</h3>
<p>I understand that participating in wellness services may involve physical exertion, stretching, or other activities that carry inherent risks, such as fatigue, muscle soreness, or, in rare cases, injury. I voluntarily assume full responsibility for any risks, injuries, or damages, known or unknown, which I might incur as a result of participating in the services.</p>

<h3>Health Conditions</h3>
<p>I confirm that I am in good medical condition/health and am sufficiently fit to participate in the services. It is my responsibility to inform The Mind Department immediately of any pre-existing conditions, including pregnancy or the presence of a pacemaker, that may be affected by the services.</p>

<h3>Release of Liability</h3>
<p>I hereby for myself, my heirs, executors, or assigns, waive and release The Mind Department, its employees, agents, and representatives from any and all claims, demands, or causes of action for injuries, damages, or losses that I may incur arising from my participation in the services, to the fullest extent permitted by law.</p>

<h3>Confidentiality</h3>
<p>The Mind Department will keep all personal information and records confidential, unless I consent in writing to share this information with others or if disclosure is required by law.</p>

<h3>Cancellation Policy</h3>
<p>I understand that a 24-hour notice is required to cancel or reschedule appointments. Failure to do so may result in a charge for the full cost of the session.</p>

<h3>Acknowledgment</h3>
<p>I have read and fully understand the above statements. By completing this intake form and checking the consent boxes below, I am acknowledging that I understand and agree to these terms.</p>"""
        
        disclaimer, created = IntakeWellbeingDisclaimer.objects.get_or_create(
            version='1.0',
            defaults={
                'content': disclaimer_content,
                'active': True
            }
        )
        self.stdout.write(self.style.SUCCESS(f'✓ {"Created" if created else "Found"} disclaimer: v{disclaimer.version}'))

        # Create Package
        package, created = ClassPackage.objects.get_or_create(
            name='5 Class Pass',
            defaults={
                'description': 'Package of 5 mindfulness sessions',
                'class_count': 5,
                'price': Decimal('100.00'),
                'validity_days': 90,
                'active': True
            }
        )
        self.stdout.write(self.style.SUCCESS(f'✓ {"Created" if created else "Found"} package: {package.name}'))

        self.stdout.write(self.style.SUCCESS('\n✅ Production setup complete!'))
