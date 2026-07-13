from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase

from apps.accounts.models import AccountProfile
from apps.accounts.roles import PortalRole


class RoleAccountProvisioningCommandTests(TestCase):
    def test_command_provisions_all_non_student_roles_with_unusable_passwords(self) -> None:
        output = StringIO()

        call_command("provision_role_accounts", stdout=output)

        provisioned_roles = set(AccountProfile.objects.values_list("role", flat=True))
        expected_roles = {role.value for role in PortalRole if role != PortalRole.STUDENT}
        self.assertEqual(provisioned_roles, expected_roles)
        self.assertNotIn(PortalRole.STUDENT.value, provisioned_roles)
        self.assertEqual(get_user_model().objects.count(), len(expected_roles))
        self.assertFalse(get_user_model().objects.get(username="proctor").has_usable_password())
        self.assertIn("Provisioned non-student role accounts", output.getvalue())

    def test_command_can_assign_local_password_when_explicitly_requested(self) -> None:
        call_command("provision_role_accounts", password="Password1!", stdout=StringIO())

        user = get_user_model().objects.get(username="system_admin")

        self.assertTrue(user.check_password("Password1!"))
