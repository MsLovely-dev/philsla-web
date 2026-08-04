from rest_framework import serializers

from .models import ConfigurableField


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
