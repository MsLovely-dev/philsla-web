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
