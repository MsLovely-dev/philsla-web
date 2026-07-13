from rest_framework.authentication import BaseAuthentication, get_authorization_header
from rest_framework.exceptions import AuthenticationFailed


class PendingAwareBearerAuthentication(BaseAuthentication):
    """Bearer-token authentication hook for the ADR-011 auth flow.

    Token issuance and validation are intentionally not implemented in this
    foundation slice. Protected endpoints reject supplied bearer tokens until
    the login, refresh, and revocation workflows are built.
    """

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

        raise AuthenticationFailed("Bearer token validation is not implemented.")

    def authenticate_header(self, request) -> str:
        return f'Bearer realm="{self.www_authenticate_realm}"'
