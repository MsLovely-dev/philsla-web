import random

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import AccountProfile, AccountRoleAssignment
from apps.accounts.roles import PortalRole
from apps.applications.models import ApplicationStatus, StudentApplication
from apps.results.services import generate_score_seed_data


REGIONS = (
    ("NCR", "Metro Manila", "Quezon City", "Bagong Pag-asa", "12 Kalayaan Ave"),
    ("Region III", "Bulacan", "Malolos", "Sto. Rosario", "45 Rizal St"),
    ("Region IV-A", "Cavite", "Dasmarinas", "San Agustin", "78 Aguinaldo Hwy"),
    ("Region VII", "Cebu", "Cebu City", "Lahug", "23 Osmena Blvd"),
    ("Region XI", "Davao del Sur", "Davao City", "Buhangin", "9 Mabini St"),
)
SCHOOLS = (
    ("Makati Science High School", "Kalayaan Ave, Makati City"),
    ("Quezon City Science High School", "Don Enrique Ave, Quezon City"),
    ("Malolos National High School", "Sto. Rosario, Malolos, Bulacan"),
    ("Cebu City National Science High School", "Lahug, Cebu City"),
    ("Davao City National High School", "Buhangin, Davao City"),
)
PHOTO_IDS = (
    "1544005313-94ddf0286df2",
    "1507003211169-0a1dd7228f2d",
    "1500648767791-00dcc994a43e",
    "1517841905240-472988babdf9",
    "1519085360753-af0119f7cbe7",
    "1524504388940-b1c1722653e1",
    "1531123897727-8f129e1688ce",
    "1502685104226-ee32379fefbe",
)
DEMO_STUDENT_PASSWORD = "ScoreDemo2027!"


class Command(BaseCommand):
    help = "Seed real StudentApplication records that share LRNs with synthetic Score Management candidates."

    def add_arguments(self, parser):
        parser.add_argument("--count", type=int, default=500, help="Number of candidate profiles to create (should match the score-management seed count).")
        parser.add_argument("--seed", type=int, default=2027, help="Deterministic random seed (matches score-management seed).")
        parser.add_argument("--reset", action="store_true", help="Delete previously seeded profiles before recreating them.")

    def handle(self, *args, **options):
        count = options["count"]
        seed = options["seed"]
        seed_data = generate_score_seed_data(candidate_count=count, seed=seed)
        randomizer = random.Random(seed)

        lrns = [application.lrn for application in seed_data.applications]
        if options["reset"]:
            deleted, _ = StudentApplication.objects.filter(lrn__in=lrns).delete()
            self.stdout.write(f"Removed {deleted} previously seeded application row(s).")

        existing_lrns = set(
            StudentApplication.objects.filter(lrn__in=lrns).values_list("lrn", flat=True),
        )

        created = 0
        password_hash = make_password(DEMO_STUDENT_PASSWORD)
        with transaction.atomic():
            for application_seed in seed_data.applications:
                if application_seed.lrn in existing_lrns:
                    continue

                first_name, _, last_name = application_seed.candidate_name.partition(" ")
                region, province, city, barangay, street = REGIONS[randomizer.randrange(len(REGIONS))]
                school_name, school_address = SCHOOLS[randomizer.randrange(len(SCHOOLS))]
                photo_id = PHOTO_IDS[randomizer.randrange(len(PHOTO_IDS))]
                gender = "Male" if randomizer.random() < 0.5 else "Female"
                birth_year = randomizer.randint(2006, 2009)
                birth_month = randomizer.randint(1, 12)
                birth_day = randomizer.randint(1, 28)
                email_handle = f"{first_name}.{last_name}".lower().replace(" ", "")
                mobile = f"09{randomizer.randint(100000000, 999999999)}"
                email = f"{email_handle}.{application_seed.candidate_id[-6:]}@philsa.example.test"
                owner = _ensure_student_account(
                    candidate_id=application_seed.candidate_id,
                    lrn=application_seed.lrn,
                    email=email,
                    first_name=first_name,
                    last_name=last_name or "Candidate",
                    password_hash=password_hash,
                )

                application = StudentApplication(
                    owner=owner,
                    lrn=application_seed.lrn,
                    exam_cycle_id=settings.ACTIVE_EXAM_CYCLE_ID,
                    status=ApplicationStatus.APPROVED,
                    submitted_at=timezone.now(),
                )
                application.personal = {
                    "firstName": first_name,
                    "middleName": "",
                    "lastName": last_name or "Candidate",
                    "suffix": "",
                    "dateOfBirth": f"{birth_year:04d}-{birth_month:02d}-{birth_day:02d}",
                    "sex": gender,
                    "email": email,
                    "mobile": mobile,
                    "identityVerificationStatus": "VERIFIED",
                    "birthPlace": f"{city}, {province}",
                    "nationality": "Filipino",
                    "photoUrl": f"https://images.unsplash.com/photo-{photo_id}?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
                }
                application.address = {
                    "region": region,
                    "province": province,
                    "city": city,
                    "barangay": barangay,
                    "street": street,
                    "postalCode": "",
                }
                application.school = {
                    "lrn": application_seed.lrn,
                    "schoolId": f"SCH-{randomizer.randint(1000, 9999)}",
                    "name": school_name,
                    "academicTrack": "STEM",
                    "gradeLevel": "Grade 12",
                    "enrollmentStatus": "Enrolled",
                    "schoolYear": "2025-2026",
                    "gwa": str(round(randomizer.uniform(85, 98), 2)),
                    "address": school_address,
                }
                application.save()
                created += 1

        self.stdout.write(self.style.SUCCESS(f"Seeded {created} student application profile(s) linked to Score Management LRNs."))


def _ensure_student_account(*, candidate_id: str, lrn: str, email: str, first_name: str, last_name: str, password_hash: str):
    user_model = get_user_model()
    username = f"score.student.{candidate_id.lower()}"
    profile = AccountProfile.objects.select_related("user").filter(
        role=PortalRole.STUDENT.value,
        lrn=lrn,
    ).first()
    if profile is not None:
        user = profile.user
        updated_fields = []
        if user.email != email:
            user.email = email
            updated_fields.append("email")
        if getattr(user, "first_name", "") != first_name:
            user.first_name = first_name
            updated_fields.append("first_name")
        if getattr(user, "last_name", "") != last_name:
            user.last_name = last_name
            updated_fields.append("last_name")
        if updated_fields:
            user.save(update_fields=updated_fields)
    else:
        user, created = user_model.objects.get_or_create(
            username=username,
            defaults={
                "email": email,
                "first_name": first_name,
                "last_name": last_name,
                "is_active": True,
                "password": password_hash,
            },
        )
        if created:
            pass
        else:
            user.email = email
            user.first_name = first_name
            user.last_name = last_name
            user.is_active = True
            user.password = password_hash
            user.save(update_fields=["email", "first_name", "last_name", "is_active", "password"])
        profile, _ = AccountProfile.objects.update_or_create(
            user=user,
            defaults={
                "role": PortalRole.STUDENT.value,
                "lrn": lrn,
                "scopes": {},
            },
        )

    AccountRoleAssignment.objects.get_or_create(
        account_profile=profile,
        defaults={
            "role": PortalRole.STUDENT.value,
            "permission_mode": AccountRoleAssignment.PermissionMode.INHERIT,
        },
    )
    return profile.user
