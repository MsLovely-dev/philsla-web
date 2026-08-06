from django.conf import settings
from django.db import models


UNIVERSITY_CODE_PREFIX = "UNI"
UNIVERSITY_CODE_PADDING = 5


class UniversityClassification(models.TextChoices):
    PUBLIC = "Public", "Public"
    PRIVATE = "Private", "Private"


class ActivationStatus(models.TextChoices):
    ACTIVE = "Active", "Active"
    INACTIVE = "Inactive", "Inactive"


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


def generate_university_code() -> str:
    """Build the next sequential ``UNI-00001`` style code from the latest row."""
    last_code = (
        University.objects.order_by("-id").values_list("code", flat=True).first()
    )
    next_number = 1
    if last_code and last_code.startswith(f"{UNIVERSITY_CODE_PREFIX}-"):
        try:
            next_number = int(last_code.rsplit("-", 1)[-1]) + 1
        except ValueError:
            next_number = University.objects.count() + 1
    return f"{UNIVERSITY_CODE_PREFIX}-{next_number:0{UNIVERSITY_CODE_PADDING}d}"


class University(models.Model):
    code = models.CharField(max_length=20, unique=True, editable=False)
    classification = models.CharField(
        max_length=10, choices=UniversityClassification.choices
    )
    name = models.CharField(max_length=200)
    region = models.CharField(max_length=20, choices=PhilippineRegion.choices)
    city = models.CharField(max_length=120)
    president_rector = models.CharField(max_length=200, blank=True, default="")
    email = models.EmailField(blank=True, default="")
    phone = models.CharField(max_length=40, blank=True, default="")
    established_year = models.PositiveIntegerField(null=True, blank=True)
    status = models.CharField(
        max_length=10,
        choices=ActivationStatus.choices,
        default=ActivationStatus.ACTIVE,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="universities",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return f"{self.code} - {self.name}"

    def save(self, *args, **kwargs):
        if not self.code:
            while True:
                candidate = generate_university_code()
                if not University.objects.filter(code=candidate).exists():
                    self.code = candidate
                    break
        super().save(*args, **kwargs)


class CollegeCourse(models.Model):
    university = models.ForeignKey(
        University,
        on_delete=models.CASCADE,
        related_name="courses",
    )
    college_name = models.CharField(max_length=200)
    program_code = models.CharField(max_length=40)
    program_name = models.CharField(max_length=200)
    degree_type = models.CharField(max_length=100, blank=True, default="Bachelor of Science")
    major_specialization = models.CharField(max_length=200, blank=True, default="")
    duration_years = models.PositiveSmallIntegerField(default=4)
    total_units = models.PositiveIntegerField(default=0)
    cutoff_percentile = models.FloatField(default=0)
    status = models.CharField(
        max_length=10,
        choices=ActivationStatus.choices,
        default=ActivationStatus.ACTIVE,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["program_code"]

    def __str__(self) -> str:
        return f"{self.program_code} - {self.program_name}"
