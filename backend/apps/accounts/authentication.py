from rest_framework.authentication import BaseAuthentication, get_authorization_header
from rest_framework.authentication import SessionAuthentication
from rest_framework.exceptions import AuthenticationFailed

from .services import validate_access_token


class PendingAwareBearerAuthentication(BaseAuthentication):
    """Bearer-token authentication hook for the ADR-011 auth flow."""

    keyword = b"bearer"
    www_authenticate_realm = "api"

    def authenticate(self, request):
        auth_parts = get_authorization_header(request).split()

        if not auth_parts:
            return None

        if auth_parts[0].lower() != self.keyword:
            return None

        if len(auth_parts) != 2:
            raise AuthenticationFailed("Invalid bearer token header.")

        token = auth_parts[1].decode()
        validated = validate_access_token(access_token=token)
        if validated is None:
            raise AuthenticationFailed("Invalid or expired bearer token.")
        return validated

    def authenticate_header(self, request) -> str:
        return f'Bearer realm="{self.www_authenticate_realm}"'


class ApiSessionAuthentication(SessionAuthentication):
    """Django session-cookie authentication for API session bridge endpoints."""

    def enforce_csrf(self, request) -> None:
        return None
