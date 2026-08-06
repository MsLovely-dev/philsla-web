from django.conf import settings
from django.db import models
from django.db.models.functions import Lower


SCHOOL_CODE_PREFIX = "SCH"
SCHOOL_CODE_PADDING = 5


class SchoolClassification(models.TextChoices):
    PUBLIC = "Public", "Public"
    PRIVATE = "Private", "Private"


class PhilippineRegion(models.TextChoices):
    NCR = "NCR", "National Capital Region (NCR)"
    CAR = "CAR", "Cordillera Administrative Region (CAR)"
    REGION_I = "Region I", "Ilocos Region (Region I)"
    REGION_II = "Region II", "Cagayan Valley (Region II)"
    REGION_III = "Region III", "Central Luzon (Region III)"
    REGION_IV_A = "Region IV-A", "CALABARZON (Region IV-A)"
    MIMAROPA = "MIMAROPA", "MIMAROPA (Region IV-B)"
    REGION_V = "Region V", "Bicol Region (Region V)"
    REGION_VI = "Region VI", "Western Visayas (Region VI)"
    REGION_VII = "Region VII", "Central Visayas (Region VII)"
    REGION_VIII = "Region VIII", "Eastern Visayas (Region VIII)"
    REGION_IX = "Region IX", "Zamboanga Peninsula (Region IX)"
    REGION_X = "Region X", "Northern Mindanao (Region X)"
    REGION_XI = "Region XI", "Davao Region (Region XI)"
    REGION_XII = "Region XII", "SOCCSKSARGEN (Region XII)"
    REGION_XIII = "Region XIII", "Caraga (Region XIII)"
    BARMM = "BARMM", "Bangsamoro Autonomous Region in Muslim Mindanao (BARMM)"


def generate_school_code() -> str:
    """Build the next sequential ``SCH-00001`` style code from the latest row."""
    last_code = (
        School.objects.order_by("-id").values_list("code", flat=True).first()
    )
    next_number = 1
    if last_code and last_code.startswith(f"{SCHOOL_CODE_PREFIX}-"):
        try:
            next_number = int(last_code.rsplit("-", 1)[-1]) + 1
        except ValueError:
            next_number = School.objects.count() + 1
    return f"{SCHOOL_CODE_PREFIX}-{next_number:0{SCHOOL_CODE_PADDING}d}"


class School(models.Model):
    code = models.CharField(max_length=20, unique=True, editable=False)
    classification = models.CharField(max_length=10, choices=SchoolClassification.choices)
    name = models.CharField(max_length=200)
    examinee_capacity = models.PositiveIntegerField(default=0)
    region = models.CharField(max_length=20, choices=PhilippineRegion.choices)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="schools",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                Lower("name"),
                "region",
                name="unique_school_name_per_region",
            )
        ]

    def __str__(self) -> str:
        return f"{self.code} - {self.name}"

    def save(self, *args, **kwargs):
        if not self.code:
            while True:
                candidate = generate_school_code()
                if not School.objects.filter(code=candidate).exists():
                    self.code = candidate
                    break
        super().save(*args, **kwargs)
