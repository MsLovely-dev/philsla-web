from rest_framework import serializers

from .models import CollegeCourse, University


class UniversitySerializer(serializers.ModelSerializer):
    presidentRector = serializers.CharField(
        source="president_rector", required=False, allow_blank=True, default=""
    )
    establishedYear = serializers.IntegerField(
        source="established_year", required=False, allow_null=True, min_value=0
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
    durationYears = serializers.IntegerField(source="duration_years", required=False, min_value=1)
    totalUnits = serializers.IntegerField(source="total_units", required=False, min_value=0)
    cutoffPercentile = serializers.FloatField(source="cutoff_percentile", required=False, min_value=0)
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
