from rest_framework import serializers

from .models import School


class SchoolSerializer(serializers.ModelSerializer):
    examineeCapacity = serializers.IntegerField(source="examinee_capacity", min_value=0)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = School
        fields = (
            "id",
            "code",
            "classification",
            "name",
            "examineeCapacity",
            "region",
            "createdAt",
            "updatedAt",
        )
        read_only_fields = ("id", "code", "createdAt", "updatedAt")

    def validate_name(self, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("School name is required.")
        return cleaned

    def validate(self, attrs):
        # A school name must be unique within a region (case-insensitive).
        # Names may repeat across regions (real DepEd SHS naming).
        name = attrs.get("name", getattr(self.instance, "name", None))
        region = attrs.get("region", getattr(self.instance, "region", None))
        if name and region:
            duplicates = School.objects.filter(name__iexact=name.strip(), region=region)
            if self.instance is not None:
                duplicates = duplicates.exclude(pk=self.instance.pk)
            if duplicates.exists():
                raise serializers.ValidationError(
                    {"name": "A school with this name already exists in this region."}
                )
        return attrs
