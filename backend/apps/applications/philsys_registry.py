from dataclasses import dataclass

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured


class PhilSysRegistryUnavailable(Exception):
    pass


@dataclass(frozen=True)
class PhilSysRecord:
    national_id_reference: str
    first_name: str
    middle_name: str
    last_name: str
    date_of_birth: str
    sex: str


class PhilSysRegistry:
    def find(self, *, national_id: str) -> PhilSysRecord | None:
        raise NotImplementedError


class UnavailablePhilSysRegistry(PhilSysRegistry):
    def find(self, *, national_id: str) -> PhilSysRecord | None:
        raise PhilSysRegistryUnavailable


class PhilSysApiRegistry(PhilSysRegistry):
    """Integration placeholder for the future PhilSys API."""

    def find(self, *, national_id: str) -> PhilSysRecord | None:
        raise PhilSysRegistryUnavailable


def get_philsys_registry() -> PhilSysRegistry:
    provider = settings.PHILSYS_REGISTRY_PROVIDER
    if provider == "unavailable":
        return UnavailablePhilSysRegistry()
    if provider == "philsys":
        return PhilSysApiRegistry()
    raise ImproperlyConfigured(f"Unsupported PHILSYS_REGISTRY_PROVIDER: {provider}")
