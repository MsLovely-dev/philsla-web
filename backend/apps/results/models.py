from django.conf import settings
from django.db import models


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


class ScoreReleaseNotificationStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    SENT = "SENT", "Sent"
    FAILED = "FAILED", "Failed"


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
                condition=models.Q(percentile__isnull=True) | (models.Q(percentile__gte=0) & models.Q(percentile__lte=100)),
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


class ScoreReleaseNotification(models.Model):
    session = models.ForeignKey(ExaminationSession, on_delete=models.PROTECT, related_name="release_notifications")
    score = models.ForeignKey(CandidateScore, on_delete=models.PROTECT, related_name="release_notifications")
    recipient_email = models.EmailField(max_length=254)
    recipient_name = models.CharField(max_length=180)
    portal_url = models.CharField(max_length=500)
    status = models.CharField(
        max_length=16,
        choices=ScoreReleaseNotificationStatus.choices,
        default=ScoreReleaseNotificationStatus.PENDING,
        db_index=True,
    )
    attempts = models.PositiveSmallIntegerField(default=0)
    failure_reason = models.CharField(max_length=240, blank=True, default="")
    queued_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["queued_at", "id"]
        constraints = [
            models.UniqueConstraint(fields=("session", "score"), name="unique_score_release_notification_per_score"),
        ]
        indexes = [
            models.Index(fields=["session", "status"]),
            models.Index(fields=["status", "queued_at"]),
        ]
