import hashlib

from django.conf import settings
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from rest_framework.exceptions import APIException, ValidationError

from apps.accounts.roles import get_user_role

from .models import ExamReviewAnswerSheet, ExamReviewItem, ExamReviewItemType, ExamReviewRecord, ExamReviewStatus


class ExamReviewReleaseConflict(APIException):
    status_code = 409
    default_code = "exam_review_release_conflict"
    default_detail = "Only a graded Exam Review record can be released to Score Management."


class ExamReviewGradingStatusConflict(APIException):
    status_code = 409
    default_code = "exam_review_grading_status_conflict"
    default_detail = "Released Exam Review records cannot return to the grading queue."


class ExamReviewItemScoreConflict(APIException):
    status_code = 409
    default_code = "exam_review_item_score_conflict"
    default_detail = "Released Exam Review records cannot be rescored."


@transaction.atomic
def release_exam_review(*, review_id, actor: object) -> ExamReviewRecord:
    record = ExamReviewRecord.objects.select_for_update().get(id=review_id)
    if record.status != ExamReviewStatus.GRADED:
        raise ExamReviewReleaseConflict()

    record.status = ExamReviewStatus.FINALIZED
    record.reviewed_by = get_user_role(actor) or "LOCAL_PROTOTYPE"
    record.reviewed_at = timezone.now()
    record.save(update_fields=("status", "reviewed_by", "reviewed_at", "updated_at"))
    return record


@transaction.atomic
def set_exam_review_grading_status(*, review_id, status: str, actor: object) -> ExamReviewRecord:
    record = ExamReviewRecord.objects.select_for_update().get(id=review_id)
    if record.status == ExamReviewStatus.FINALIZED:
        raise ExamReviewGradingStatusConflict()

    record.status = status
    if status == ExamReviewStatus.GRADED:
        record.reviewed_by = get_user_role(actor) or "LOCAL_PROTOTYPE"
        record.reviewed_at = timezone.now()
    else:
        record.reviewed_by = ""
        record.reviewed_at = None
    record.save(update_fields=("status", "reviewed_by", "reviewed_at", "updated_at"))
    return record


@transaction.atomic
def score_exam_review_item(*, review_id, item_id, points: int, actor: object) -> ExamReviewRecord:
    record = ExamReviewRecord.objects.select_for_update().get(id=review_id)
    if record.status == ExamReviewStatus.FINALIZED:
        raise ExamReviewItemScoreConflict()

    item = ExamReviewItem.objects.select_for_update().get(id=item_id, review=record)
    if item.item_type != ExamReviewItemType.SUBJECTIVE:
        raise ValidationError({"points": ["Only subjective Exam Review items accept a manual score."]})
    if points > item.max_points:
        raise ValidationError({"points": [f"The score cannot exceed {item.max_points} points."]})

    item.points_awarded = points
    item.save(update_fields=("points_awarded", "updated_at"))
    subjective_items = record.review_items.filter(item_type=ExamReviewItemType.SUBJECTIVE)
    manual_total = subjective_items.aggregate(total=Sum("points_awarded"))["total"] or 0
    record.total_score = record.system_initial_score + manual_total
    record.pending_subjective_items = subjective_items.filter(points_awarded__isnull=True).count()
    record.save(update_fields=("total_score", "pending_subjective_items", "updated_at"))
    return record


def _validated_answer_sheet_content_type(uploaded_file) -> str:
    if uploaded_file.size <= 0:
        raise ValidationError({"file": ["The answer sheet file cannot be empty."]})
    if uploaded_file.size > settings.EXAM_REVIEW_MAX_ANSWER_SHEET_BYTES:
        raise ValidationError({"file": ["The answer sheet file must not exceed 10 MB."]})

    header = uploaded_file.read(16)
    uploaded_file.seek(0)
    if header.startswith(b"%PDF-"):
        return "application/pdf"
    if header.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if header.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    raise ValidationError({"file": ["Only valid PDF, JPEG, and PNG answer sheets are accepted."]})


@transaction.atomic
def upload_exam_review_answer_sheet(*, review_id, uploaded_file, template_source: str, actor: object) -> ExamReviewRecord:
    record = ExamReviewRecord.objects.select_for_update().get(id=review_id)
    if record.status == ExamReviewStatus.FINALIZED:
        raise ExamReviewReleaseConflict("Released Exam Review records cannot accept another answer sheet.")

    content_type = _validated_answer_sheet_content_type(uploaded_file)
    digest = hashlib.sha256()
    for chunk in uploaded_file.chunks():
        digest.update(chunk)
    uploaded_file.seek(0)
    ExamReviewAnswerSheet.objects.create(
        review=record,
        file=uploaded_file,
        content_type=content_type,
        size=uploaded_file.size,
        sha256=digest.hexdigest(),
        template_source=template_source,
        uploaded_by=get_user_role(actor) or "LOCAL_PROTOTYPE",
    )
    return record
