from __future__ import annotations

from typing import Any

from rest_framework import serializers

from apps.accounts.models import AccountProfile

from .models import BlueprintStatus, ExamBlueprint
from .services import clone_exam_blueprint, create_exam_blueprint, serialize_blueprint, transition_blueprint_version, update_exam_blueprint, latest_blueprint_version


class BlueprintSectionPayloadSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    name = serializers.CharField(max_length=255)
    subject = serializers.CharField(max_length=150)
    topics = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    competencies = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    cognitive_levels = serializers.DictField(required=False, default=dict)
    item_count = serializers.IntegerField(min_value=0)
    marks_per_item = serializers.FloatField(required=False)
    total_marks = serializers.FloatField(required=False)
    passing_score = serializers.FloatField(required=False)
    time_allocation = serializers.IntegerField(min_value=0, required=False)
    instructions = serializers.CharField(required=False, allow_blank=True, default="")
    difficulty_distribution = serializers.DictField(required=False, default=dict)
    item_type_distribution = serializers.DictField(required=False, default=dict)


class BlueprintRulesPayloadSerializer(serializers.Serializer):
    total_items = serializers.IntegerField(min_value=0, required=False)
    total_marks = serializers.FloatField(required=False)
    total_time_limit = serializers.IntegerField(min_value=0, required=False)
    shared_stimulus_requirement = serializers.DictField(required=False, default=dict)
    randomization_rules = serializers.DictField(required=False, default=dict)
    max_reuse_limit = serializers.IntegerField(min_value=0, required=False)
    version_compatibility = serializers.CharField(required=False, allow_blank=True, default=">= 1.0")
    active_item_only = serializers.BooleanField(required=False, default=True)


class BlueprintHistoryEntrySerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    version = serializers.CharField(read_only=True)
    action = serializers.CharField(read_only=True)
    updated_by = serializers.CharField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
    comments = serializers.CharField(read_only=True)


class ExamBlueprintSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    code = serializers.CharField(max_length=50)
    name = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    exam_type = serializers.CharField(required=False, allow_blank=True, default="admission")
    academic_year = serializers.CharField(max_length=20)
    institution = serializers.CharField(max_length=150)
    exam_category = serializers.CharField(max_length=100)
    status = serializers.CharField(read_only=True)
    version = serializers.CharField(required=False, default="1.0")
    owner = serializers.CharField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    effective_date = serializers.DateField(required=False, allow_null=True)
    expiration_date = serializers.DateField(required=False, allow_null=True)
    sections = BlueprintSectionPayloadSerializer(many=True, required=False, default=list)
    rules = BlueprintRulesPayloadSerializer(required=False, default=dict)
    history = BlueprintHistoryEntrySerializer(many=True, read_only=True)

    def to_representation(self, instance: ExamBlueprint | dict[str, Any]) -> dict[str, Any]:
        if isinstance(instance, dict):
            return instance
        return serialize_blueprint(instance)

    def create(self, validated_data: dict[str, Any]) -> ExamBlueprint:
        actor_profile = self.context.get("actor_profile")
        if not isinstance(actor_profile, AccountProfile):
            raise serializers.ValidationError({"detail": "An authenticated account profile is required."})
        return create_exam_blueprint(payload=validated_data, actor_profile=actor_profile)

    def update(self, instance: ExamBlueprint, validated_data: dict[str, Any]) -> ExamBlueprint:
        actor_profile = self.context.get("actor_profile")
        if not isinstance(actor_profile, AccountProfile):
            raise serializers.ValidationError({"detail": "An authenticated account profile is required."})
        return update_exam_blueprint(blueprint=instance, payload=validated_data, actor_profile=actor_profile)


class BlueprintCloneSerializer(serializers.Serializer):
    cloned_blueprint_id = serializers.CharField(read_only=True)

    def save(self, **kwargs):  # type: ignore[override]
        actor_profile = self.context.get("actor_profile")
        blueprint = self.context.get("blueprint")
        if not isinstance(actor_profile, AccountProfile) or not isinstance(blueprint, ExamBlueprint):
            raise serializers.ValidationError({"detail": "Blueprint cloning requires an authenticated blueprint context."})
        cloned = clone_exam_blueprint(blueprint=blueprint, actor_profile=actor_profile)
        return {"cloned_blueprint_id": str(cloned.pk)}


class BlueprintTransitionSerializer(serializers.Serializer):
    status = serializers.CharField()
    remarks = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_status(self, value: str) -> str:
        normalized = value.strip().lower().replace(" ", "_")
        if normalized not in BlueprintStatus.values:
            raise serializers.ValidationError("Select a valid blueprint status.")
        return normalized

    def save(self, **kwargs):  # type: ignore[override]
        actor_profile = self.context.get("actor_profile")
        version = self.context.get("version")
        if not isinstance(actor_profile, AccountProfile) or version is None:
            raise serializers.ValidationError({"detail": "Blueprint transition requires an authenticated version context."})
        return transition_blueprint_version(
            version=version,
            target_status=self.validated_data["status"],
            actor_profile=actor_profile,
            remarks=self.validated_data.get("remarks", ""),
        )


class BlueprintReferenceSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    code = serializers.CharField(read_only=True)
    name = serializers.CharField(read_only=True)
