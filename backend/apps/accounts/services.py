from rest_framework.exceptions import APIException


class LoginFlowRejected(APIException):
    status_code = 401
    default_code = "authentication_failed"


class ActivationUnavailable(APIException):
    status_code = 409
    default_code = "conflict"


def start_identifier_login(*, identifier: str) -> None:
    """Resolve the login identifier and issue a Step-1 pending-auth token.

    Account lookup, anti-enumeration timing controls, pending-auth token
    persistence, and audit logging are intentionally deferred until the
    account model and token store are implemented. Until then, valid
    identifiers receive the same safe failure used for invalid or unavailable
    accounts.
    """

    raise LoginFlowRejected("Identifier not found or invalid. Please check and try again.")


def verify_login_password(*, pending_auth_token: str, password: str) -> None:
    """Validate the password and issue an OTP-scoped pending-auth token."""

    raise LoginFlowRejected("Your session has expired. Please start again.")


def verify_login_otp(*, otp_pending_auth_token: str, code: str) -> None:
    """Validate the email OTP and issue the full backend session."""

    raise LoginFlowRejected("Invalid or expired code. Please try again.")


def rotate_refresh_token(*, refresh_token: str | None) -> None:
    """Rotate the refresh token and issue a new access token."""

    raise LoginFlowRejected("Your session has expired. Please log in again.")


def revoke_current_session(*, user: object, auth: object) -> None:
    """Revoke the current session's refresh token and access-token family."""

    return None


def revoke_tokens(*, user: object, scope: str) -> None:
    """Revoke refresh/access tokens for the requested scope."""

    return None


def activate_student_registration_account(*, registration_application_id: str, actor: object) -> None:
    """Create and activate a student account after registration approval."""

    raise ActivationUnavailable("Student account activation is unavailable until registration approval storage exists.")


def complete_staff_activation(*, activation_token: str, password: str) -> None:
    """Complete first-time staff/admin activation from a time-limited link."""

    raise LoginFlowRejected("This activation link has expired. Please request a new one from your administrator.")


def request_password_recovery(*, identifier: str) -> None:
    """Request a password recovery link without revealing account existence."""

    return None


def complete_password_recovery(*, recovery_token: str, password: str) -> None:
    """Complete password reset and revoke active sessions."""

    raise LoginFlowRejected("This recovery link has expired. Please request a new one.")


def request_admin_account_recovery(*, email: str, actor: object) -> None:
    """System Admin initiated staff/admin account recovery request."""

    return None
