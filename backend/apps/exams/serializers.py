from __future__ import annotations

from typing import Any

from rest_framework import serializers

from apps.accounts.models import AccountProfile

from .models import (
    BlueprintStatus,
    BlueprintSection,
    ExamBlueprint,
    ExamSet,
    ExamSetAssemblyRun,
    ExamSetAssemblyRunItem,
    ExamSetQuestion,
    ExamSetStatus,
    ExamSetValidationResult,
    ExamSetWorkflowHistory,
    SelectionMethod,
    QuestionStatus,
    Question,
    QuestionType,
    Subject,
)
from .services import (
    clone_exam_blueprint,
    clone_exam_set,
    create_exam_blueprint,
    create_or_update_exam_set,
    create_or_update_question,
    create_question_type,
    create_subject,
    latest_blueprint_version,
    serialize_blueprint,
    serialize_exam_set,
    serialize_question,
    transition_blueprint_version,
    transition_exam_set,
    transition_question,
    update_exam_blueprint,
    update_question_type,
    update_subject,
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


class ExamSetQuestionPayloadSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    question_id = serializers.IntegerField(required=False, allow_null=True)
    question_code = serializers.CharField(required=False, allow_blank=True)
    blueprint_section_id = serializers.IntegerField(required=False, allow_null=True)
    display_order = serializers.IntegerField(min_value=0)
    points = serializers.FloatField(required=False)
    selection_method = serializers.CharField(required=False, allow_blank=True)


class ExamSetValidationResultSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    validation_code = serializers.CharField(read_only=True)
    validation_name = serializers.CharField(read_only=True)
    result = serializers.CharField(read_only=True)
    expected_value = serializers.CharField(read_only=True)
    actual_value = serializers.CharField(read_only=True)
    message = serializers.CharField(read_only=True)
    validated_at = serializers.DateTimeField(read_only=True)


class ExamSetWorkflowHistorySerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    previous_status = serializers.CharField(read_only=True, allow_null=True)
    new_status = serializers.CharField(read_only=True)
    action = serializers.CharField(read_only=True)
    remarks = serializers.CharField(read_only=True)
    initiated_by = serializers.CharField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)


class ExamSetAssemblyRunItemSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    question = serializers.DictField(read_only=True)
    was_selected = serializers.BooleanField(read_only=True)
    rejection_reason = serializers.CharField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)


class ExamSetAssemblyRunSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    algorithm_version = serializers.CharField(read_only=True)
    status = serializers.CharField(read_only=True)
    selected_item_count = serializers.IntegerField(read_only=True)
    rejected_item_count = serializers.IntegerField(read_only=True)
    initiated_by = serializers.CharField(read_only=True)
    started_at = serializers.DateTimeField(read_only=True)
    completed_at = serializers.DateTimeField(read_only=True, allow_null=True)
    notes = serializers.CharField(read_only=True)
    items = ExamSetAssemblyRunItemSerializer(many=True, read_only=True)


class ExamSetSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    exam_code = serializers.CharField(required=False, allow_blank=True)
    title = serializers.CharField(max_length=255)
    examination_period = serializers.CharField(required=False, allow_blank=True, default="")
    exam_type = serializers.CharField(required=False, allow_blank=True, default="admission")
    instructions = serializers.CharField(required=False, allow_blank=True, default="")
    duration_minutes = serializers.IntegerField(min_value=1)
    status = serializers.CharField(read_only=True)
    blueprint_version_id = serializers.IntegerField(required=False, allow_null=True)
    academic_year_id = serializers.IntegerField(required=False, allow_null=True)
    academic_year = serializers.CharField(required=False, allow_blank=True, default="")
    cloned_from_exam_set_id = serializers.IntegerField(required=False, allow_null=True)
    items = ExamSetQuestionPayloadSerializer(many=True, required=False, default=list)
    questions = ExamSetQuestionPayloadSerializer(many=True, required=False, default=list)
    validation_results = ExamSetValidationResultSerializer(many=True, read_only=True)
    workflow_history = ExamSetWorkflowHistorySerializer(many=True, read_only=True)
    assembly_runs = ExamSetAssemblyRunSerializer(many=True, read_only=True)
    created_by = serializers.CharField(read_only=True)
    approved_by = serializers.CharField(read_only=True, allow_null=True)
    published_by = serializers.CharField(read_only=True, allow_null=True)
    archived_by = serializers.CharField(read_only=True, allow_null=True)
    approved_at = serializers.DateTimeField(read_only=True, allow_null=True)
    published_at = serializers.DateTimeField(read_only=True, allow_null=True)
    archived_at = serializers.DateTimeField(read_only=True, allow_null=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

    def to_representation(self, instance: ExamSet | dict[str, Any]) -> dict[str, Any]:
        if isinstance(instance, dict):
            return instance
        return serialize_exam_set(instance)

    def create(self, validated_data: dict[str, Any]) -> ExamSet:
        actor_profile = self.context.get("actor_profile")
        if not isinstance(actor_profile, AccountProfile):
            raise serializers.ValidationError({"detail": "An authenticated account profile is required."})
        return create_or_update_exam_set(payload=validated_data, actor_profile=actor_profile)

    def update(self, instance: ExamSet, validated_data: dict[str, Any]) -> ExamSet:
        actor_profile = self.context.get("actor_profile")
        if not isinstance(actor_profile, AccountProfile):
            raise serializers.ValidationError({"detail": "An authenticated account profile is required."})
        return create_or_update_exam_set(payload=validated_data, actor_profile=actor_profile, exam_set=instance)


class ExamSetTransitionSerializer(serializers.Serializer):
    status = serializers.CharField()
    remarks = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_status(self, value: str) -> str:
        normalized = value.strip().lower().replace(" ", "_")
        if normalized not in ExamSetStatus.values:
            raise serializers.ValidationError("Select a valid exam set status.")
        return normalized

    def save(self, **kwargs):  # type: ignore[override]
        actor_profile = self.context.get("actor_profile")
        exam_set = self.context.get("exam_set")
        if not isinstance(actor_profile, AccountProfile) or not isinstance(exam_set, ExamSet):
            raise serializers.ValidationError({"detail": "Exam set transition requires an authenticated exam set context."})
        return transition_exam_set(
            exam_set=exam_set,
            target_status=self.validated_data["status"],
            actor_profile=actor_profile,
            remarks=self.validated_data.get("remarks", ""),
        )


class SubjectSerializer(serializers.ModelSerializer):
    isActive = serializers.BooleanField(source="is_active", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = Subject
        fields = ("id", "code", "name", "description", "isActive", "createdAt", "updatedAt")


class SubjectInputSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=30, required=False)
    name = serializers.CharField(max_length=150, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    is_active = serializers.BooleanField(required=False)

    def validate_code(self, value: str) -> str:
        return value.strip().upper()

    def validate_name(self, value: str) -> str:
        return value.strip()

    def validate(self, attrs: dict) -> dict:
        if self.instance is None:
            if "code" not in attrs or not attrs.get("code"):
                raise serializers.ValidationError({"code": ["This field is required."]})
            if "name" not in attrs or not attrs.get("name"):
                raise serializers.ValidationError({"name": ["This field is required."]})
        return attrs

    def create(self, validated_data: dict) -> Subject:
        return create_subject(data=validated_data)

    def update(self, instance: Subject, validated_data: dict) -> Subject:
        return update_subject(subject_id=instance.pk, data=validated_data)


class QuestionTypeSerializer(serializers.ModelSerializer):
    isActive = serializers.BooleanField(source="is_active", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = QuestionType
        fields = ("id", "code", "name", "description", "isActive", "createdAt", "updatedAt")


class QuestionTypeInputSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=30, required=False)
    name = serializers.CharField(max_length=100, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    is_active = serializers.BooleanField(required=False)

    def validate_code(self, value: str) -> str:
        return value.strip().upper()

    def validate_name(self, value: str) -> str:
        return value.strip()

    def validate(self, attrs: dict) -> dict:
        if self.instance is None:
            if "code" not in attrs or not attrs.get("code"):
                raise serializers.ValidationError({"code": ["This field is required."]})
            if "name" not in attrs or not attrs.get("name"):
                raise serializers.ValidationError({"name": ["This field is required."]})
        return attrs

    def create(self, validated_data: dict) -> QuestionType:
        return create_question_type(data=validated_data)

    def update(self, instance: QuestionType, validated_data: dict) -> QuestionType:
        return update_question_type(question_type_id=instance.pk, data=validated_data)
