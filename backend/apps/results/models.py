import uuid

from django.conf import settings
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


class ExaminationSessionStatus(models.TextChoices):
    OPEN = "OPEN", "Open"
    CLOSED = "CLOSED", "Closed"


class ScoreBatchStatus(models.TextChoices):
    READY_FOR_PROCESSING = "READY_FOR_PROCESSING", "Ready for processing"
    SCORING_PROCESSED = "SCORING_PROCESSED", "Scoring processed"
    RESULTS_RELEASED = "RESULTS_RELEASED", "Results released"


class ScoreReviewStatus(models.TextChoices):
    APPROVED = "APPROVED", "Approved"
    PENDING = "PENDING", "Pending"
    REJECTED = "REJECTED", "Rejected"


class ScoreReleaseStatus(models.TextChoices):
    NOT_RELEASED = "NOT_RELEASED", "Not released"
    RELEASED = "RELEASED", "Released"


class ExaminationSession(models.Model):
    id = models.CharField(max_length=64, primary_key=True)
    name = models.CharField(max_length=160)
    status = models.CharField(
        max_length=16,
        choices=ExaminationSessionStatus.choices,
        default=ExaminationSessionStatus.OPEN,
    )
    scoring_status = models.CharField(
        max_length=32,
        choices=ScoreBatchStatus.choices,
        default=ScoreBatchStatus.READY_FOR_PROCESSING,
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "id"]

    @property
    def is_closed(self) -> bool:
        return self.status == ExaminationSessionStatus.CLOSED


class RankingPopulation(models.Model):
    id = models.CharField(max_length=64, primary_key=True)
    session = models.ForeignKey(ExaminationSession, on_delete=models.CASCADE, related_name="ranking_populations")
    name = models.CharField(max_length=160)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["session_id", "name"]
        indexes = [models.Index(fields=["session", "name"])]


class ExamSet(models.Model):
    id = models.CharField(max_length=64, primary_key=True)
    session = models.ForeignKey(ExaminationSession, on_delete=models.CASCADE, related_name="exam_sets")
    ranking_population = models.ForeignKey(RankingPopulation, on_delete=models.PROTECT, related_name="exam_sets")
    code = models.CharField(max_length=64)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["session_id", "code"]
        constraints = [
            models.UniqueConstraint(fields=("session", "code"), name="unique_results_exam_set_code_per_session"),
        ]
        indexes = [
            models.Index(fields=["session", "ranking_population"]),
        ]


class ScoreProcessingBatch(models.Model):
    id = models.CharField(max_length=64, primary_key=True)
    session = models.ForeignKey(ExaminationSession, on_delete=models.PROTECT, related_name="processing_batches")
    status = models.CharField(max_length=32, choices=ScoreBatchStatus.choices, default=ScoreBatchStatus.SCORING_PROCESSED)
    processed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="score_processing_batches",
    )
    processed_by_identifier = models.CharField(max_length=80, blank=True, default="")
    allow_reprocessing = models.BooleanField(default=False)
    processed_record_count = models.PositiveIntegerField(default=0)
    excluded_record_count = models.PositiveIntegerField(default=0)
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-started_at"]
        indexes = [
            models.Index(fields=["session", "-started_at"]),
            models.Index(fields=["status"]),
        ]


class CandidateScore(models.Model):
    id = models.CharField(max_length=80, primary_key=True)
    session = models.ForeignKey(ExaminationSession, on_delete=models.PROTECT, related_name="candidate_scores")
    ranking_population = models.ForeignKey(RankingPopulation, on_delete=models.PROTECT, related_name="candidate_scores")
    exam_set = models.ForeignKey(ExamSet, on_delete=models.PROTECT, related_name="candidate_scores")
    candidate_id = models.CharField(max_length=40)
    lrn = models.CharField("LRN", max_length=12)
    candidate_name = models.CharField(max_length=180)
    raw_score = models.PositiveSmallIntegerField()
    max_score = models.PositiveSmallIntegerField()
    final_score = models.DecimalField(max_digits=6, decimal_places=2)
    review_status = models.CharField(
        max_length=16,
        choices=ScoreReviewStatus.choices,
        default=ScoreReviewStatus.PENDING,
        db_index=True,
    )
    overall_rank = models.PositiveIntegerField(null=True, blank=True, db_index=True)
    percentile = models.DecimalField(max_digits=7, decimal_places=4, null=True, blank=True)
    release_status = models.CharField(
        max_length=16,
        choices=ScoreReleaseStatus.choices,
        default=ScoreReleaseStatus.NOT_RELEASED,
        db_index=True,
    )
    processing_batch = models.ForeignKey(
        ScoreProcessingBatch,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="candidate_scores",
    )
    processed_at = models.DateTimeField(null=True, blank=True)
    released_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["ranking_population_id", "overall_rank", "-final_score", "candidate_name"]
        constraints = [
            models.UniqueConstraint(fields=("session", "candidate_id"), name="unique_candidate_score_per_session"),
            models.CheckConstraint(
                condition=models.Q(max_score__gt=0),
                name="results_candidate_score_max_score_positive",
            ),
            models.CheckConstraint(
                condition=models.Q(raw_score__lte=models.F("max_score")),
                name="results_candidate_score_raw_lte_max",
            ),
            models.CheckConstraint(
                condition=models.Q(final_score__gte=0) & models.Q(final_score__lte=100),
                name="results_candidate_score_final_score_range",
            ),
            models.CheckConstraint(
                condition=models.Q(percentile__isnull=True)
                | (models.Q(percentile__gte=0) & models.Q(percentile__lte=100)),
                name="results_candidate_score_percentile_range",
            ),
        ]
        indexes = [
            models.Index(fields=["session", "review_status"]),
            models.Index(fields=["session", "release_status"]),
            models.Index(fields=["ranking_population", "-final_score"]),
            models.Index(fields=["session", "overall_rank"]),
            models.Index(fields=["session", "review_status", "candidate_id"]),
            models.Index(fields=["session", "review_status", "lrn"]),
            models.Index(fields=["session", "review_status", "candidate_name"]),
            models.Index(fields=["session", "review_status", "release_status", "overall_rank"]),
            models.Index(fields=["session", "review_status", "final_score"]),
        ]


class ScoreReleaseAuditLog(models.Model):
    session = models.ForeignKey(ExaminationSession, on_delete=models.PROTECT, related_name="release_audit_logs")
    processing_batch = models.ForeignKey(ScoreProcessingBatch, on_delete=models.PROTECT, related_name="release_audit_logs")
    released_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="score_release_audit_logs",
    )
    released_by_identifier = models.CharField(max_length=80, blank=True, default="")
    released_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["session", "-created_at"])]
