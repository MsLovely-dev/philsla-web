from rest_framework import serializers

from .models import ConfigurableField


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

    def validate(self, attrs):
        attrs = super().validate(attrs)
        input_type = attrs.get("input_type", getattr(self.instance, "input_type", "text"))
        option_values = attrs.get("option_values", getattr(self.instance, "option_values", []))
        if not isinstance(option_values, list) or any(not isinstance(option, str) for option in option_values):
            raise serializers.ValidationError({"optionValues": ["Options must be a list of text values."]})
        cleaned_options = [option.strip() for option in option_values if option.strip()]
        attrs["option_values"] = cleaned_options
        if input_type == "dropdown" and not cleaned_options:
            raise serializers.ValidationError({"optionValues": ["Dropdown fields require at least one option."]})
        if input_type != "dropdown":
            attrs["option_values"] = []
        return attrs
