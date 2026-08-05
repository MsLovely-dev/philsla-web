from django.core.exceptions import ObjectDoesNotExist
from rest_framework import serializers

from .models import ExamReviewItem, ExamReviewItemType, ExamReviewRecord, ExamReviewStatus, ExamReviewTemplateSource


class ExamReviewItemSerializer(serializers.ModelSerializer):
    itemNumber = serializers.IntegerField(source="item_number", read_only=True)
    itemType = serializers.CharField(source="item_type", read_only=True)
    question = serializers.CharField(source="question_text", read_only=True)
    answerOptions = serializers.JSONField(source="answer_options", read_only=True)
    studentAnswer = serializers.CharField(source="student_answer", read_only=True)
    expectedAnswer = serializers.CharField(source="expected_answer", read_only=True)
    responseSeconds = serializers.IntegerField(source="response_seconds", read_only=True)
    rubric = serializers.CharField(source="rubric_text", read_only=True)
    aiProposedScore = serializers.IntegerField(source="ai_proposed_score", read_only=True, allow_null=True)
    wordCount = serializers.IntegerField(source="word_count", read_only=True, allow_null=True)
    responseSubmittedAt = serializers.DateTimeField(source="response_submitted_at", read_only=True, allow_null=True)
    pointsAwarded = serializers.IntegerField(source="points_awarded", read_only=True, allow_null=True)
    maxPoints = serializers.IntegerField(source="max_points", read_only=True)
    reviewStatus = serializers.SerializerMethodField()

    class Meta:
        model = ExamReviewItem
        fields = (
            "id",
            "subject",
            "itemNumber",
            "itemType",
            "question",
            "answerOptions",
            "studentAnswer",
            "expectedAnswer",
            "responseSeconds",
            "rubric",
            "aiProposedScore",
            "wordCount",
            "responseSubmittedAt",
            "pointsAwarded",
            "maxPoints",
            "reviewStatus",
        )

    def get_reviewStatus(self, item: ExamReviewItem) -> str:
        if item.points_awarded is None:
            return "PENDING_REVIEW"
        if item.item_type == ExamReviewItemType.SUBJECTIVE:
            return "GRADED"
        if item.points_awarded == item.max_points:
            return "CORRECT"
        if item.points_awarded == 0:
            return "INCORRECT"
        return "PARTIAL"


class ExamReviewRecordSerializer(serializers.ModelSerializer):
    attemptCode = serializers.CharField(source="attempt_code", read_only=True)
    candidateId = serializers.CharField(source="application.candidate_id", read_only=True)
    candidateName = serializers.SerializerMethodField()
    examSetCode = serializers.CharField(source="exam_set_code", read_only=True)
    submittedAt = serializers.DateTimeField(source="submitted_at", read_only=True)
    totalScore = serializers.IntegerField(source="total_score", read_only=True)
    systemInitialScore = serializers.IntegerField(source="system_initial_score", read_only=True)
    maxScore = serializers.IntegerField(source="max_score", read_only=True)
    pendingSubjectiveItems = serializers.IntegerField(source="pending_subjective_items", read_only=True)
    reviewedBy = serializers.CharField(source="reviewed_by", read_only=True)
    reviewedAt = serializers.DateTimeField(source="reviewed_at", read_only=True, allow_null=True)
    answerSheet = serializers.SerializerMethodField()

    class Meta:
        model = ExamReviewRecord
        fields = (
            "id",
            "attemptCode",
            "candidateId",
            "candidateName",
            "examSetCode",
            "submittedAt",
            "status",
            "totalScore",
            "systemInitialScore",
            "maxScore",
            "pendingSubjectiveItems",
            "reviewedBy",
            "reviewedAt",
            "answerSheet",
        )

    def get_candidateName(self, record: ExamReviewRecord) -> str:
        try:
            personal = record.application.personal_info
        except ObjectDoesNotExist:
            return "Synthetic candidate"
        return " ".join(part for part in (personal.first_name, personal.last_name) if part).strip()

    def get_answerSheet(self, record: ExamReviewRecord) -> dict | None:
        answer_sheet = record.answer_sheets.first()
        if answer_sheet is None:
            return None
        return {
            "id": answer_sheet.id,
            "contentType": answer_sheet.content_type,
            "size": answer_sheet.size,
            "templateSource": answer_sheet.template_source,
            "uploadedBy": answer_sheet.uploaded_by,
            "uploadedAt": answer_sheet.created_at,
        }


class ExamReviewDetailSerializer(ExamReviewRecordSerializer):
    examItems = ExamReviewItemSerializer(source="review_items", many=True, read_only=True)

    class Meta(ExamReviewRecordSerializer.Meta):
        fields = ExamReviewRecordSerializer.Meta.fields + ("examItems",)


class ExamReviewAnswerSheetUploadSerializer(serializers.Serializer):
    file = serializers.FileField()
    templateSource = serializers.ChoiceField(
        choices=ExamReviewTemplateSource.choices,
        default=ExamReviewTemplateSource.STANDARD_CSV,
        required=False,
    )


class ExamReviewGradingStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=(ExamReviewStatus.SUBMITTED, ExamReviewStatus.GRADED),
    )


class ExamReviewItemScoreSerializer(serializers.Serializer):
    points = serializers.IntegerField(min_value=0)
from rest_framework import serializers


class ScoreProcessRequestSerializer(serializers.Serializer):
    allowReprocessing = serializers.BooleanField(default=False, required=False)


class ScoreResultsQuerySerializer(serializers.Serializer):
    page = serializers.IntegerField(default=1, min_value=1, required=False)
    pageSize = serializers.IntegerField(default=25, min_value=1, max_value=100, required=False)
    sortKey = serializers.ChoiceField(
        choices=("candidateId", "candidateName", "examName", "finalScore", "percentile", "rank", "releaseStatus"),
        default="finalScore",
        required=False,
    )
    sortDirection = serializers.ChoiceField(choices=("asc", "desc"), default="desc", required=False)
    search = serializers.CharField(default="", allow_blank=True, trim_whitespace=True, required=False)
    releaseStatus = serializers.ChoiceField(choices=("NOT_RELEASED", "RELEASED"), required=False)
