from __future__ import annotations

from typing import Any

from rest_framework import serializers

from apps.accounts.models import AccountProfile

from .models import BlueprintStatus, ExamBlueprint
from .services import clone_exam_blueprint, create_exam_blueprint, serialize_blueprint, transition_blueprint_version, update_exam_blueprint, latest_blueprint_version
from .models import (
    BlueprintStatus,
    ExamBlueprint,
    QuestionStatus,
)
from .services import (
    clone_exam_blueprint,
    create_exam_blueprint,
    create_or_update_question,
    latest_blueprint_version,
    serialize_blueprint,
    serialize_question,
    transition_blueprint_version,
    transition_question,
    update_exam_blueprint,
)


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


class QuestionChoicePayloadSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    option_label = serializers.CharField(required=False, allow_blank=True, default="")
    option_text = serializers.CharField()
    is_correct = serializers.BooleanField(required=False, default=False)
    display_order = serializers.IntegerField(min_value=0)


class QuestionAnswerPayloadSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    answer_text = serializers.CharField()
    is_case_sensitive = serializers.BooleanField(required=False, default=False)
    is_primary_answer = serializers.BooleanField(required=False, default=True)


class EssayRubricPayloadSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    criterion = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    maximum_points = serializers.FloatField()
    display_order = serializers.IntegerField(min_value=0)


class QuestionAttachmentSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    original_filename = serializers.CharField(read_only=True)
    stored_filename = serializers.CharField(read_only=True)
    file_path = serializers.CharField(read_only=True)
    mime_type = serializers.CharField(read_only=True)
    file_size_bytes = serializers.IntegerField(read_only=True)
    uploaded_by = serializers.CharField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)


class QuestionWorkflowHistorySerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    previous_status = serializers.CharField(read_only=True, allow_null=True)
    new_status = serializers.CharField(read_only=True)
    action = serializers.CharField(read_only=True)
    remarks = serializers.CharField(read_only=True)
    initiated_by = serializers.CharField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)


class QuestionSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    question_code = serializers.CharField(max_length=50, required=False, allow_blank=True)
    question_type = serializers.CharField(max_length=100, required=False, allow_blank=True)
    subject = serializers.CharField(max_length=150, required=False, allow_blank=True)
    topic = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    competency = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    difficulty = serializers.CharField(max_length=20, required=False, allow_blank=True)
    question_text = serializers.CharField(required=False, allow_blank=True)
    explanation = serializers.CharField(required=False, allow_blank=True)
    points = serializers.FloatField(required=False)
    status = serializers.CharField(required=False, allow_blank=True)
    created_by = serializers.CharField(read_only=True)
    reviewed_by = serializers.CharField(read_only=True, allow_null=True)
    approved_by = serializers.CharField(read_only=True, allow_null=True)
    reviewed_at = serializers.DateTimeField(read_only=True, allow_null=True)
    approved_at = serializers.DateTimeField(read_only=True, allow_null=True)
    retired_at = serializers.DateTimeField(read_only=True, allow_null=True)
    archived_at = serializers.DateTimeField(read_only=True, allow_null=True)
    choices = QuestionChoicePayloadSerializer(many=True, required=False)
    answers = QuestionAnswerPayloadSerializer(many=True, required=False)
    rubrics = EssayRubricPayloadSerializer(many=True, required=False)
    tags = serializers.ListField(child=serializers.CharField(), required=False)
    attachments = QuestionAttachmentSerializer(many=True, read_only=True)
    workflow_history = QuestionWorkflowHistorySerializer(many=True, read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

    def to_representation(self, instance: Any) -> dict[str, Any]:
        if isinstance(instance, dict):
            return instance
        return serialize_question(instance)

    def create(self, validated_data: dict[str, Any]):
        actor_profile = self.context.get("actor_profile")
        if not isinstance(actor_profile, AccountProfile):
            raise serializers.ValidationError({"detail": "An authenticated account profile is required."})
        return create_or_update_question(payload=validated_data, actor_profile=actor_profile)

    def update(self, instance, validated_data: dict[str, Any]):
        actor_profile = self.context.get("actor_profile")
        if not isinstance(actor_profile, AccountProfile):
            raise serializers.ValidationError({"detail": "An authenticated account profile is required."})
        return create_or_update_question(question=instance, payload=validated_data, actor_profile=actor_profile)


class QuestionTransitionSerializer(serializers.Serializer):
    status = serializers.CharField()
    remarks = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_status(self, value: str) -> str:
        normalized = value.strip().lower().replace(" ", "_")
        if normalized not in QuestionStatus.values:
            raise serializers.ValidationError("Select a valid question status.")
        return normalized

    def save(self, **kwargs):  # type: ignore[override]
        actor_profile = self.context.get("actor_profile")
        question = self.context.get("question")
        if not isinstance(actor_profile, AccountProfile) or question is None:
            raise serializers.ValidationError({"detail": "Question transition requires an authenticated question context."})
        return transition_question(
            question=question,
            target_status=self.validated_data["status"],
            actor_profile=actor_profile,
            remarks=self.validated_data.get("remarks", ""),
        )
