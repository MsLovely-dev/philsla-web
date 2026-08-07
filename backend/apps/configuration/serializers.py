from django.utils import timezone
from rest_framework import serializers

from .models import CollegeCourse, ConfigurableField, University


SUPPORTED_INPUT_TYPES = {"text", "date", "dropdown", "textarea", "checkbox", "file"}
STUDENT_REGISTRATION_MODULE = "student_registration"
STEP_1_REGISTRATION_SECTION = "Step 1 Registration"
VERIFICATION_METHOD_TYPE = "Verification Method"


class ConfigurableFieldSerializer(serializers.ModelSerializer):
    type = serializers.CharField(source="field_type", required=False)
    value = serializers.CharField(source="field_name")
    fieldSection = serializers.CharField(source="field_section", required=False)
    inputType = serializers.CharField(source="input_type", required=False)
    optionValues = serializers.JSONField(source="option_values", required=False)
    status = serializers.BooleanField(source="is_enabled", required=False)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)
    updatedBy = serializers.CharField(source="updated_by_id", read_only=True, allow_null=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = ConfigurableField
        fields = (
            "id",
            "module",
            "section",
            "type",
            "value",
            "fieldSection",
            "inputType",
            "optionValues",
            "priority",
            "remarks",
            "status",
            "display_order",
            "createdAt",
            "updatedAt",
            "updatedBy",
        )
        read_only_fields = ("id", "createdAt", "updatedAt")
        validators = []

    def validate(self, attrs):
        attrs = super().validate(attrs)
        module = attrs.get("module", getattr(self.instance, "module", ""))
        section = attrs.get("section", getattr(self.instance, "section", ""))
        field_type = attrs.get("field_type", getattr(self.instance, "field_type", ""))
        field_name = attrs.get("field_name", getattr(self.instance, "field_name", ""))
        input_type = attrs.get("input_type", getattr(self.instance, "input_type", "text"))
        option_values = attrs.get("option_values", getattr(self.instance, "option_values", []))
        if input_type not in SUPPORTED_INPUT_TYPES:
            raise serializers.ValidationError({"inputType": ["Unsupported input type."]})
        if not isinstance(option_values, list) or any(not isinstance(option, str) for option in option_values):
            raise serializers.ValidationError({"optionValues": ["Options must be a list of text values."]})
        cleaned_options = [option.strip() for option in option_values if option.strip()]
        attrs["option_values"] = cleaned_options
        if input_type == "dropdown" and not cleaned_options:
            raise serializers.ValidationError({"optionValues": ["Dropdown fields require at least one option."]})
        if input_type != "dropdown":
            attrs["option_values"] = []
        duplicate_exists = ConfigurableField.objects.filter(
            module=module,
            section=section,
            field_type=field_type,
            field_name=field_name,
        ).exclude(id=getattr(self.instance, "id", None)).exists()
        if duplicate_exists:
            if (
                module == STUDENT_REGISTRATION_MODULE
                and section == STEP_1_REGISTRATION_SECTION
                and field_type == VERIFICATION_METHOD_TYPE
            ):
                raise serializers.ValidationError({"value": ["This registration method already exists."]})
            raise serializers.ValidationError({"value": ["This configurable field already exists."]})
        return attrs


def _trim_text_fields(attrs: dict, field_names: tuple[str, ...]) -> dict:
    for field_name in field_names:
        if field_name in attrs:
            attrs[field_name] = attrs[field_name].strip()
    return attrs


class UniversitySerializer(serializers.ModelSerializer):
    presidentRector = serializers.CharField(source="president_rector")
    establishedYear = serializers.IntegerField(source="established_year")
    courseCount = serializers.SerializerMethodField()
    createdAt = serializers.DateTimeField(source="created_at")
    updatedAt = serializers.DateTimeField(source="updated_at")

    class Meta:
        model = University
        fields = (
            "id",
            "code",
            "name",
            "classification",
            "region",
            "city",
            "presidentRector",
            "email",
            "phone",
            "establishedYear",
            "status",
            "courseCount",
            "version",
            "createdAt",
            "updatedAt",
        )

    def get_courseCount(self, university: University) -> int:
        annotated_count = getattr(university, "course_count", None)
        if annotated_count is not None:
            return int(annotated_count)
        return university.college_courses.count()


class UniversityInputSerializer(serializers.ModelSerializer):
    presidentRector = serializers.CharField(source="president_rector", allow_blank=True, required=False)
    establishedYear = serializers.IntegerField(
        source="established_year",
        min_value=1000,
        max_value=timezone.localdate().year,
    )
    expectedVersion = serializers.IntegerField(source="expected_version", min_value=1, write_only=True, required=False)

    class Meta:
        model = University
        fields = (
            "code",
            "name",
            "classification",
            "region",
            "city",
            "presidentRector",
            "email",
            "phone",
            "establishedYear",
            "status",
            "expectedVersion",
        )
        extra_kwargs = {
            "email": {"allow_blank": True, "required": False},
            "phone": {"allow_blank": True, "required": False},
            "status": {"required": False},
        }

    def validate_code(self, value: str) -> str:
        return value.strip().upper()

    def validate(self, attrs):
        attrs = super().validate(attrs)
        if self.instance is not None and "expectedVersion" not in self.initial_data:
            raise serializers.ValidationError({"expectedVersion": ["The current record version is required."]})
        return _trim_text_fields(
            attrs,
            ("name", "region", "city", "president_rector", "email", "phone"),
        )


class CollegeCourseSerializer(serializers.ModelSerializer):
    universityId = serializers.UUIDField(source="university_id")
    universityCode = serializers.CharField(source="university.code")
    collegeName = serializers.CharField(source="college_name")
    programCode = serializers.CharField(source="program_code")
    programName = serializers.CharField(source="program_name")
    degreeType = serializers.CharField(source="degree_type")
    majorSpecialization = serializers.CharField(source="major_specialization")
    durationYears = serializers.IntegerField(source="duration_years")
    totalUnits = serializers.IntegerField(source="total_units")
    cutoffPercentile = serializers.FloatField(source="cutoff_percentile")
    createdAt = serializers.DateTimeField(source="created_at")
    updatedAt = serializers.DateTimeField(source="updated_at")

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
            "version",
            "createdAt",
            "updatedAt",
        )


class CollegeCourseInputSerializer(serializers.ModelSerializer):
    collegeName = serializers.CharField(source="college_name")
    programCode = serializers.CharField(source="program_code")
    programName = serializers.CharField(source="program_name")
    degreeType = serializers.CharField(source="degree_type")
    majorSpecialization = serializers.CharField(source="major_specialization", allow_blank=True, required=False)
    durationYears = serializers.IntegerField(source="duration_years", min_value=1, max_value=6)
    totalUnits = serializers.IntegerField(source="total_units", min_value=1, max_value=500)
    cutoffPercentile = serializers.FloatField(source="cutoff_percentile", min_value=0, max_value=100)
    expectedVersion = serializers.IntegerField(source="expected_version", min_value=1, write_only=True, required=False)

    class Meta:
        model = CollegeCourse
        fields = (
            "collegeName",
            "programCode",
            "programName",
            "degreeType",
            "majorSpecialization",
            "durationYears",
            "totalUnits",
            "cutoffPercentile",
            "status",
            "expectedVersion",
        )
        extra_kwargs = {"status": {"required": False}}

    def validate_programCode(self, value: str) -> str:
        return value.strip().upper()

    def validate(self, attrs):
        attrs = super().validate(attrs)
        if self.instance is not None and "expectedVersion" not in self.initial_data:
            raise serializers.ValidationError({"expectedVersion": ["The current record version is required."]})

        attrs = _trim_text_fields(
            attrs,
            ("college_name", "program_name", "major_specialization"),
        )
        university_id = self.context.get("university_id")
        program_code = attrs.get("program_code", getattr(self.instance, "program_code", ""))
        duplicate = CollegeCourse.objects.filter(university_id=university_id, program_code__iexact=program_code)
        if self.instance is not None:
            duplicate = duplicate.exclude(id=self.instance.id)
        if university_id and duplicate.exists():
            raise serializers.ValidationError({"programCode": ["This program code already exists for the university."]})
        return attrs


class RegistryVersionSerializer(serializers.Serializer):
    version = serializers.IntegerField(min_value=1)


class UniversityListQuerySerializer(serializers.Serializer):
    search = serializers.CharField(max_length=255, required=False, allow_blank=True, trim_whitespace=True)
    classification = serializers.ChoiceField(choices=University._meta.get_field("classification").choices, required=False)
    region = serializers.CharField(max_length=120, required=False, allow_blank=True, trim_whitespace=True)
    status = serializers.ChoiceField(choices=University._meta.get_field("status").choices, required=False)
    ordering = serializers.ChoiceField(
        choices=("code", "name", "region", "city", "createdAt", "-createdAt"),
        required=False,
        default="name",
    )


class CollegeCourseListQuerySerializer(serializers.Serializer):
    search = serializers.CharField(max_length=255, required=False, allow_blank=True, trim_whitespace=True)
    collegeName = serializers.CharField(max_length=255, required=False, allow_blank=True, trim_whitespace=True)
    status = serializers.ChoiceField(choices=CollegeCourse._meta.get_field("status").choices, required=False)
    ordering = serializers.ChoiceField(
        choices=("programCode", "programName", "collegeName", "createdAt", "-createdAt"),
        required=False,
        default="programCode",
    )
