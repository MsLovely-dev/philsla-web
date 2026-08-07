from django.utils import timezone
from rest_framework import serializers

from .models import CollegeCourse, University


class UniversitySerializer(serializers.ModelSerializer):
    presidentRector = serializers.CharField(
        source="president_rector", required=False, allow_blank=True, default=""
    )
    establishedYear = serializers.IntegerField(
        source="established_year", required=False, allow_null=True, min_value=1000
    )
    courseCount = serializers.SerializerMethodField()
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = University
        fields = (
            "id",
            "code",
            "classification",
            "name",
            "region",
            "city",
            "presidentRector",
            "email",
            "phone",
            "establishedYear",
            "status",
            "courseCount",
            "createdAt",
            "updatedAt",
        )
        read_only_fields = ("id", "code", "courseCount", "createdAt", "updatedAt")

    def get_courseCount(self, obj) -> int:
        annotated = getattr(obj, "course_count", None)
        if annotated is not None:
            return annotated
        return obj.courses.count()

    def validate_name(self, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("University name is required.")
        return cleaned

    def validate_establishedYear(self, value):
        if value is not None and value > timezone.now().year:
            raise serializers.ValidationError("Established year cannot be in the future.")
        return value

    def validate(self, attrs):
        # A university name must be unique within a region (case-insensitive).
        # Names may repeat across regions.
        name = attrs.get("name", getattr(self.instance, "name", None))
        region = attrs.get("region", getattr(self.instance, "region", None))
        if name and region:
            duplicates = University.objects.filter(name__iexact=name.strip(), region=region)
            if self.instance is not None:
                duplicates = duplicates.exclude(pk=self.instance.pk)
            if duplicates.exists():
                raise serializers.ValidationError(
                    {"name": "A university with this name already exists in this region."}
                )
        return attrs


class CollegeCourseSerializer(serializers.ModelSerializer):
    universityId = serializers.IntegerField(source="university_id", read_only=True)
    universityCode = serializers.CharField(source="university.code", read_only=True)
    collegeName = serializers.CharField(source="college_name")
    programCode = serializers.CharField(source="program_code")
    programName = serializers.CharField(source="program_name")
    degreeType = serializers.CharField(source="degree_type", required=False, allow_blank=True)
    majorSpecialization = serializers.CharField(
        source="major_specialization", required=False, allow_blank=True, default=""
    )
    durationYears = serializers.IntegerField(source="duration_years", required=False, min_value=1, max_value=10)
    totalUnits = serializers.IntegerField(source="total_units", required=False, min_value=0, max_value=500)
    cutoffPercentile = serializers.FloatField(
        source="cutoff_percentile", required=False, min_value=0, max_value=100
    )
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = CollegeCourse
        fields = (
            "id",
            "universityId",
            "universityCode",
            "collegeName",
            "programCode",
            "programName",
            "degreeType",
            "majorSpecialization",
            "durationYears",
            "totalUnits",
            "cutoffPercentile",
            "status",
            "createdAt",
            "updatedAt",
        )
        read_only_fields = ("id", "universityId", "universityCode", "createdAt", "updatedAt")

    def validate_programName(self, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Program name is required.")
        return cleaned

    def validate(self, attrs):
        # A program code must be unique within its university (case-insensitive).
        # The parent university comes from the URL (create) or the instance (update).
        program_code = attrs.get("program_code", getattr(self.instance, "program_code", None))
        university = self.context.get("university") or getattr(self.instance, "university", None)
        if program_code and university is not None:
            duplicates = CollegeCourse.objects.filter(
                university=university, program_code__iexact=program_code.strip()
            )
            if self.instance is not None:
                duplicates = duplicates.exclude(pk=self.instance.pk)
            if duplicates.exists():
                raise serializers.ValidationError(
                    {"programCode": "A course with this program code already exists for this university."}
                )
        return attrs
