import uuid

from django.db import models


class ExamReviewStatus(models.TextChoices):
    SUBMITTED = "SUBMITTED", "Submitted"
    GRADED = "GRADED", "Graded"
    FINALIZED = "FINALIZED", "Finalized"


class ExamReviewRecord(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    attempt_code = models.CharField(max_length=40, unique=True)
    application = models.ForeignKey(
        "applications.StudentApplication",
        on_delete=models.PROTECT,
        related_name="exam_review_records",
    )
    exam_set_code = models.CharField(max_length=40)
    submitted_at = models.DateTimeField()
    status = models.CharField(
        max_length=20,
        choices=ExamReviewStatus.choices,
        default=ExamReviewStatus.SUBMITTED,
        db_index=True,
    )
    total_score = models.PositiveIntegerField(default=0)
    system_initial_score = models.PositiveIntegerField(default=0)
    max_score = models.PositiveIntegerField()
    pending_subjective_items = models.PositiveIntegerField(default=0)
    reviewed_by = models.CharField(max_length=80, blank=True, default="")
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-submitted_at", "attempt_code"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(total_score__lte=models.F("max_score")),
                name="exam_review_total_score_lte_max",
            ),
            models.CheckConstraint(
                condition=models.Q(system_initial_score__lte=models.F("max_score")),
                name="exam_review_initial_score_lte_max",
            ),
        ]


class ExamReviewSubject(models.TextChoices):
    MATH = "MATH", "Math"
    ENGLISH = "ENGLISH", "English"
    FILIPINO = "FILIPINO", "Filipino"
    SCIENCE = "SCIENCE", "Science"


class ExamReviewItemType(models.TextChoices):
    OBJECTIVE = "OBJECTIVE", "Objective"
    SUBJECTIVE = "SUBJECTIVE", "Subjective"


class ExamReviewItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    review = models.ForeignKey(ExamReviewRecord, on_delete=models.CASCADE, related_name="review_items")
    position = models.PositiveSmallIntegerField()
    subject = models.CharField(max_length=12, choices=ExamReviewSubject.choices)
    item_number = models.PositiveSmallIntegerField()
    item_type = models.CharField(max_length=12, choices=ExamReviewItemType.choices)
    question_text = models.TextField()
    answer_options = models.JSONField(default=list, blank=True)
    student_answer = models.TextField()
    expected_answer = models.TextField()
    response_seconds = models.PositiveIntegerField(default=0)
    rubric_text = models.TextField(blank=True, default="")
    ai_proposed_score = models.PositiveSmallIntegerField(null=True, blank=True)
    word_count = models.PositiveIntegerField(null=True, blank=True)
    response_submitted_at = models.DateTimeField(null=True, blank=True)
    points_awarded = models.PositiveSmallIntegerField(null=True, blank=True)
    max_points = models.PositiveSmallIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["position"]
        constraints = [
            models.UniqueConstraint(fields=("review", "position"), name="exam_review_item_unique_position"),
            models.UniqueConstraint(
                fields=("review", "subject", "item_number"),
                name="exam_review_item_unique_subject_number",
            ),
            models.CheckConstraint(
                condition=models.Q(points_awarded__isnull=True)
                | models.Q(points_awarded__lte=models.F("max_points")),
                name="exam_review_item_score_lte_max",
            ),
            models.CheckConstraint(
                condition=models.Q(ai_proposed_score__isnull=True)
                | models.Q(ai_proposed_score__lte=models.F("max_points")),
                name="exam_review_item_ai_score_lte_max",
            ),
        ]


def answer_sheet_upload_to(instance, filename):
    extension = {
        "application/pdf": ".pdf",
        "image/jpeg": ".jpg",
        "image/png": ".png",
    }[instance.content_type]
    return f"private/exam-review-answer-sheets/{instance.review_id}/{uuid.uuid4().hex}{extension}"


class ExamReviewTemplateSource(models.TextChoices):
    STANDARD_CSV = "STANDARD_CSV", "Standard CSV"
    HANDWRITTEN_OCR = "HANDWRITTEN_OCR", "Handwritten OCR"
    OMR_TEMPLATE_PAPER = "OMR_TEMPLATE_PAPER", "OMR Template Paper"


class ExamReviewAnswerSheet(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    review = models.ForeignKey(ExamReviewRecord, on_delete=models.CASCADE, related_name="answer_sheets")
    file = models.FileField(upload_to=answer_sheet_upload_to, max_length=160)
    content_type = models.CharField(max_length=32)
    size = models.PositiveIntegerField()
    sha256 = models.CharField(max_length=64)
    template_source = models.CharField(
        max_length=24,
        choices=ExamReviewTemplateSource.choices,
        default=ExamReviewTemplateSource.STANDARD_CSV,
    )
    uploaded_by = models.CharField(max_length=80, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
