from django.conf import settings


def _lrn_status() -> tuple[str, bool, str]:
    provider = settings.LRN_REGISTRY_PROVIDER
    if provider == "mock":
        return ("mock", False, "LRN verification is using synthetic local or test data.")
    if provider == "deped":
        return (
            "placeholder",
            False,
            "LRN verification is prepared for provider integration but no live DepEd connection is active.",
        )
    return (
        "unavailable",
        False,
        "LRN verification is not connected to a live provider.",
    )


def _philsys_status() -> tuple[str, bool, str]:
    provider = settings.PHILSYS_REGISTRY_PROVIDER
    if provider == "philsys":
        return (
            "placeholder",
            False,
            "PhilSys National ID integration is prepared for provider integration but no live connection is active.",
        )
    return (
        "locked",
        False,
        "PhilSys National ID integration is locked until official API requirements are approved.",
    )


def registration_integration_status() -> dict:
    lrn_status, lrn_active, lrn_message = _lrn_status()
    philsys_status, philsys_active, philsys_message = _philsys_status()
    return {
        "backend": {"status": "connected"},
        "methods": [
            {
                "id": "manual",
                "label": "Manual Registration",
                "status": "available",
                "active": True,
                "message": "Manual Registration is available.",
            },
            {
                "id": "lrn",
                "label": "LRN Verification",
                "status": lrn_status,
                "active": lrn_active,
                "message": lrn_message,
            },
            {
                "id": "philsys",
                "label": "PhilSys National ID",
                "status": philsys_status,
                "active": philsys_active,
                "message": philsys_message,
            },
        ],
    }
