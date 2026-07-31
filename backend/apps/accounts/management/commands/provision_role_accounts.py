from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandParser
from django.db import transaction

from apps.accounts.default_permissions import default_module_access_for_role
from apps.accounts.models import AccountProfile
from apps.accounts.permission_codes import ensure_account_assignment, ensure_role_baseline
from apps.accounts.roles import PortalRole


NON_STUDENT_ROLES = tuple(role for role in PortalRole if role != PortalRole.STUDENT)

ROLE_EMAIL_LOCAL_PARTS = {
    PortalRole.ADMISSIONS_REVIEWER: "admissions.reviewer",
    PortalRole.PROCTOR: "proctor",
    PortalRole.PROCTOR_ADMIN: "proctor.admin",
    PortalRole.UNIVERSITY_ADMIN: "university.admin",
    PortalRole.TESTING_CENTER_ADMIN: "testing.center.admin",
    PortalRole.EXAM_ADMINISTRATOR: "exam.admin",
    PortalRole.SYSTEM_ADMIN: "system.admin",
    PortalRole.CHED_ADMIN: "ched.admin",
    PortalRole.DEPED_ADMIN: "deped.admin",
    PortalRole.TESDA_ADMIN: "tesda.admin",
    PortalRole.EXECUTIVE: "executive",
}


class Command(BaseCommand):
    help = "Provision one local non-student account for each backend portal role."

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument(
            "--email-domain",
            default="yopmail.com",
            help="Synthetic email domain for generated accounts. Default: yopmail.com",
        )
        parser.add_argument(
            "--password",
            default="",
            help="Optional local password to assign to all created accounts. If omitted, accounts get unusable passwords.",
        )

    @transaction.atomic
    def handle(self, *args, **options) -> None:
        email_domain = options["email_domain"].strip().lower()
        password = options["password"]

        if not email_domain:
            raise SystemExit("--email-domain cannot be empty.")

        UserModel = get_user_model()
        created_count = 0
        updated_count = 0

        for role in NON_STUDENT_ROLES:
            ensure_role_baseline(role.value)
            username = role.value.lower()
            email = f"{ROLE_EMAIL_LOCAL_PARTS[role]}@{email_domain}"
            user, user_created = UserModel.objects.get_or_create(
                username=username,
                defaults={
                    "email": email,
                    "is_active": True,
                    "is_staff": role in {PortalRole.SYSTEM_ADMIN},
                    "is_superuser": False,
                },
            )

            changed = False
            if user.email != email:
                user.email = email
                changed = True
            if not user.is_active:
                user.is_active = True
                changed = True
            if role == PortalRole.SYSTEM_ADMIN and not user.is_staff:
                user.is_staff = True
                changed = True

            if user_created:
                if password:
                    user.set_password(password)
                else:
                    user.set_unusable_password()
                changed = True

            if changed:
                user.save()

            profile, profile_created = AccountProfile.objects.get_or_create(
                user=user,
                defaults={
                    "role": role.value,
                    "api_permissions": default_module_access_for_role(role.value),
                    "scopes": {},
                },
            )

            role_default_permissions = default_module_access_for_role(role.value)
            profile_changed = False
            if not profile_created and profile.role != role.value:
                profile.role = role.value
                profile_changed = True
            if not profile.api_permissions:
                profile.api_permissions = role_default_permissions
                profile_changed = True

            if profile_changed:
                profile.save(update_fields=["role", "api_permissions", "updated_at"])
                updated_count += 1
            elif user_created or profile_created:
                created_count += 1
            else:
                updated_count += 1

            password_state = "usable password set" if password and user_created else "unusable password" if user_created else "existing password unchanged"
            ensure_account_assignment(profile)
            self.stdout.write(f"{role.value}: {email} ({password_state})")

        self.stdout.write(self.style.SUCCESS(f"Provisioned non-student role accounts. Created: {created_count}. Existing/updated: {updated_count}."))
