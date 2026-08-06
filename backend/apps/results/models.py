import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class ExaminationSessionStatus(models.TextChoices):
    OPEN = "OPEN", "Open"
    CLOSED = "CLOSED", "Closed"


class ScoreBatchStatus(models.TextChoices):
    READY_FOR_PROCESSING = "READY_FOR_PROCESSING", "Ready for processing"
    SCORING_PROCESSED = "SCORING_PROCESSED", "Scoring processed"
    PARTIALLY_RELEASED = "PARTIALLY_RELEASED", "Partially released"
    RESULTS_RELEASED = "RESULTS_RELEASED", "Results released"


class ScoreProcessingBatchStatus(models.TextChoices):
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
    status = models.CharField(
        max_length=32,
        choices=ScoreProcessingBatchStatus.choices,
        default=ScoreProcessingBatchStatus.SCORING_PROCESSED,
    )
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


class ReleaseMetric(models.TextChoices):
    FINAL_SCORE = "FINAL_SCORE", "Final score"
    PERCENTILE = "PERCENTILE", "Percentile"


class ReleasePolicyStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    ACTIVE = "ACTIVE", "Active"
    RETIRED = "RETIRED", "Retired"


class ReleaseHoldSource(models.TextChoices):
    SYSTEM = "SYSTEM", "System"
    MANUAL = "MANUAL", "Manual"


class ReleaseHoldReason(models.TextChoices):
    MISSING_APPLICATION = "MISSING_APPLICATION", "Missing application"
    AMBIGUOUS_APPLICATION = "AMBIGUOUS_APPLICATION", "Ambiguous application"
    MISSING_STUDENT_ACCOUNT = "MISSING_STUDENT_ACCOUNT", "Missing student account"
    MISSING_COURSE_PREFERENCE = "MISSING_COURSE_PREFERENCE", "Missing course preference"
    UNRESOLVED_PREFERENCE = "UNRESOLVED_PREFERENCE", "Unresolved preference"
    MISSING_ACTIVE_POLICY = "MISSING_ACTIVE_POLICY", "Missing active policy"
    SCORE_NOT_PROCESSED = "SCORE_NOT_PROCESSED", "Score not processed"
    PENDING_REVIEW = "PENDING_REVIEW", "Pending review"
    PENDING_INCIDENT = "PENDING_INCIDENT", "Pending incident"
    RECHECK_REQUESTED = "RECHECK_REQUESTED", "Recheck requested"
    MANUAL_REVIEW = "MANUAL_REVIEW", "Manual review"


class ReleaseHoldStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active"
    RESOLVED = "RESOLVED", "Resolved"


class PublicationStatus(models.TextChoices):
    PUBLISHED = "PUBLISHED", "Published"
    SUPERSEDED = "SUPERSEDED", "Superseded"


class DecisionOutcome(models.TextChoices):
    QUALIFIED = "QUALIFIED", "Qualified"
    WAITLISTED = "WAITLISTED", "Waitlisted"
    FAILED = "FAILED", "Failed"


class ReleasePolicy(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(ExaminationSession, on_delete=models.PROTECT, related_name="release_policies")
    university = models.ForeignKey("configuration.University", on_delete=models.PROTECT, related_name="release_policies")
    metric = models.CharField(max_length=16, choices=ReleaseMetric.choices)
    qualified_threshold = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=(MinValueValidator(0), MaxValueValidator(100)),
    )
    waitlist_enabled = models.BooleanField(default=False)
    waitlist_lower_threshold = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=(MinValueValidator(0), MaxValueValidator(100)),
    )
    status = models.CharField(max_length=16, choices=ReleasePolicyStatus.choices, default=ReleasePolicyStatus.DRAFT)
    version = models.PositiveIntegerField(validators=(MinValueValidator(1),))
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="created_release_policies")
    activated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="activated_release_policies",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    activated_at = models.DateTimeField(null=True, blank=True)
    retired_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["session_id", "university_id", "-version"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(qualified_threshold__gte=0) & models.Q(qualified_threshold__lte=100),
                name="results_release_policy_qualified_threshold_range",
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(waitlist_enabled=False, waitlist_lower_threshold__isnull=True)
                    | (
                        models.Q(waitlist_enabled=True, waitlist_lower_threshold__isnull=False)
                        & models.Q(waitlist_lower_threshold__gte=0)
                        & models.Q(waitlist_lower_threshold__lte=100)
                        & models.Q(waitlist_lower_threshold__lt=models.F("qualified_threshold"))
                    )
                ),
                name="results_release_policy_waitlist_threshold_valid",
            ),
            models.CheckConstraint(
                condition=models.Q(version__gt=0),
                name="results_release_policy_version_positive",
            ),
            models.UniqueConstraint(
                fields=("session", "university", "version"),
                name="results_release_policy_scope_version_unique",
            ),
            models.UniqueConstraint(
                fields=("session", "university"),
                condition=models.Q(status=ReleasePolicyStatus.ACTIVE),
                name="results_one_active_policy_per_scope",
            ),
        ]
        indexes = [models.Index(fields=["session", "university", "status"])]

    def clean(self) -> None:
        super().clean()
        errors = {}
        if self.waitlist_enabled and self.waitlist_lower_threshold is None:
            errors["waitlist_lower_threshold"] = "A waitlist threshold is required when waitlisting is enabled."
        elif (
            self.waitlist_enabled
            and self.qualified_threshold is not None
            and self.waitlist_lower_threshold >= self.qualified_threshold
        ):
            errors["waitlist_lower_threshold"] = "The waitlist threshold must be below the qualified threshold."
        elif not self.waitlist_enabled and self.waitlist_lower_threshold is not None:
            errors["waitlist_lower_threshold"] = "A waitlist threshold requires waitlisting to be enabled."
        if errors:
            raise ValidationError(errors)


class ReleaseHold(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    score = models.ForeignKey(CandidateScore, on_delete=models.PROTECT, related_name="release_holds")
    university = models.ForeignKey(
        "configuration.University",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="release_holds",
    )
    source = models.CharField(max_length=16, choices=ReleaseHoldSource.choices)
    reason_code = models.CharField(max_length=32, choices=ReleaseHoldReason.choices)
    status = models.CharField(max_length=16, choices=ReleaseHoldStatus.choices, default=ReleaseHoldStatus.ACTIVE)
    safe_note = models.TextField(blank=True, default="")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="created_release_holds")
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="resolved_release_holds",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["score", "university", "status"])]


class PublicationBatch(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(ExaminationSession, on_delete=models.PROTECT, related_name="publication_batches")
    idempotency_key = models.CharField(max_length=255, unique=True)
    requested_universities = models.ManyToManyField("configuration.University", related_name="publication_batches")
    status = models.CharField(
        max_length=32,
        choices=(
            (ScoreBatchStatus.PARTIALLY_RELEASED, ScoreBatchStatus.PARTIALLY_RELEASED.label),
            (ScoreBatchStatus.RESULTS_RELEASED, ScoreBatchStatus.RESULTS_RELEASED.label),
        ),
        default=ScoreBatchStatus.PARTIALLY_RELEASED,
    )
    eligible_count = models.PositiveIntegerField(default=0)
    published_count = models.PositiveIntegerField(default=0)
    held_count = models.PositiveIntegerField(default=0)
    excluded_count = models.PositiveIntegerField(default=0)
    published_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="publication_batches")
    published_at = models.DateTimeField()

    class Meta:
        ordering = ["-published_at"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(status__in=[ScoreBatchStatus.PARTIALLY_RELEASED, ScoreBatchStatus.RESULTS_RELEASED]),
                name="results_publication_batch_status_valid",
            ),
        ]
        indexes = [models.Index(fields=["session", "-published_at"])]


class ResultPublication(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    batch = models.ForeignKey(PublicationBatch, on_delete=models.PROTECT, related_name="publications")
    score = models.ForeignKey(CandidateScore, on_delete=models.PROTECT, related_name="result_publications")
    student_account = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="result_publications")
    application = models.ForeignKey("applications.StudentApplication", on_delete=models.PROTECT, related_name="result_publications")
    version = models.PositiveIntegerField(validators=(MinValueValidator(1),))
    status = models.CharField(max_length=16, choices=PublicationStatus.choices, default=PublicationStatus.PUBLISHED)
    supersedes = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="superseding_publications",
    )
    candidate_identifier_snapshot = models.CharField(max_length=64)
    display_name_snapshot = models.CharField(max_length=180)
    session_identifier_snapshot = models.CharField(max_length=64)
    session_name_snapshot = models.CharField(max_length=160)
    raw_score_snapshot = models.PositiveSmallIntegerField()
    maximum_score_snapshot = models.PositiveSmallIntegerField()
    final_score_snapshot = models.DecimalField(max_digits=6, decimal_places=2)
    overall_rank_snapshot = models.PositiveIntegerField(null=True, blank=True)
    percentile_snapshot = models.DecimalField(max_digits=7, decimal_places=4, null=True, blank=True)
    published_at_snapshot = models.DateTimeField()
    region_snapshot = models.CharField(max_length=120)
    snapshot_digest = models.CharField(max_length=64)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["score_id", "-version"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(version__gt=0),
                name="results_publication_version_positive",
            ),
            models.UniqueConstraint(
                fields=("score", "version"),
                name="results_publication_score_version_unique",
            ),
            models.UniqueConstraint(
                fields=("score",),
                condition=models.Q(status=PublicationStatus.PUBLISHED),
                name="results_one_current_publication_per_score",
            ),
        ]
        indexes = [models.Index(fields=["student_account", "status", "-published_at_snapshot"])]

    def clean(self) -> None:
        super().clean()
        if not self._state.adding or not self.score_id:
            return
        previous = ResultPublication.objects.filter(score_id=self.score_id).order_by("-version").first()
        if previous is None:
            if self.version != 1 or self.supersedes_id is not None:
                raise ValidationError("The first publication for a score must be version 1 without a superseded publication.")
            return
        if self.version != previous.version + 1 or self.supersedes_id != previous.id:
            raise ValidationError("A publication must supersede the immediately preceding version for its score.")

    def save(self, *args, **kwargs):
        if self._state.adding:
            self.clean()
        else:
            original = ResultPublication.objects.get(pk=self.pk)
            immutable_fields = (
                "batch_id",
                "score_id",
                "student_account_id",
                "application_id",
                "version",
                "supersedes_id",
                "candidate_identifier_snapshot",
                "display_name_snapshot",
                "session_identifier_snapshot",
                "session_name_snapshot",
                "raw_score_snapshot",
                "maximum_score_snapshot",
                "final_score_snapshot",
                "overall_rank_snapshot",
                "percentile_snapshot",
                "published_at_snapshot",
                "region_snapshot",
                "snapshot_digest",
            )
            if any(getattr(self, field) != getattr(original, field) for field in immutable_fields):
                raise ValidationError("Published result snapshots are immutable.")
        super().save(*args, **kwargs)


class ResultDecision(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    publication = models.ForeignKey(ResultPublication, on_delete=models.PROTECT, related_name="decisions")
    university = models.ForeignKey("configuration.University", on_delete=models.PROTECT, related_name="result_decisions")
    course = models.ForeignKey("configuration.CollegeCourse", on_delete=models.PROTECT, related_name="result_decisions")
    policy = models.ForeignKey(ReleasePolicy, on_delete=models.PROTECT, related_name="result_decisions")
    preference_order = models.PositiveSmallIntegerField(validators=(MinValueValidator(1),))
    outcome = models.CharField(max_length=16, choices=DecisionOutcome.choices)
    metric = models.CharField(max_length=16, choices=ReleaseMetric.choices)
    metric_value = models.DecimalField(max_digits=7, decimal_places=4)
    qualified_threshold = models.DecimalField(max_digits=5, decimal_places=2)
    waitlist_lower_threshold = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    class Meta:
        ordering = ["publication_id", "preference_order"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(preference_order__gt=0),
                name="results_decision_preference_order_positive",
            ),
            models.UniqueConstraint(
                fields=("publication", "preference_order"),
                name="results_decision_publication_preference_unique",
            ),
        ]
        indexes = [models.Index(fields=["university", "outcome"])]


class ResultAuditEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    batch = models.ForeignKey(
        PublicationBatch,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="audit_events",
    )
    publication = models.ForeignKey(
        ResultPublication,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="audit_events",
    )
    hold = models.ForeignKey(
        ReleaseHold,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="audit_events",
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="result_audit_events",
    )
    event = models.CharField(max_length=64)
    outcome = models.CharField(max_length=32, blank=True, default="")
    actor_role = models.CharField(max_length=32, blank=True, default="")
    correlation_id = models.CharField(max_length=80, blank=True, default="")
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
