from __future__ import annotations

import random
from collections import defaultdict
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from typing import Literal, Sequence
from uuid import UUID, uuid4

from django.contrib.auth import get_user_model
from django.core.mail import EmailMultiAlternatives
from django.db import transaction
from django.utils import timezone

from .models import (
    CandidateScore,
    ExamSet,
    ExaminationSession,
    ExaminationSessionStatus,
    RankingPopulation,
    ScoreBatchStatus,
    ScoreProcessingBatch,
    ScoreReleaseAuditLog,
    ScoreReleaseNotification,
    ScoreReleaseNotificationStatus,
    ScoreReleaseStatus,
    ScoreReviewStatus,
)


ReviewStatus = Literal["APPROVED", "PENDING", "REJECTED"]
ReleaseStatus = Literal["NOT_RELEASED", "RELEASED"]


class ScoreProcessingError(ValueError):
    """Raised when a score processing precondition is not satisfied."""


class ScoreIntakeConflict(ValueError):
    """Raised when an Exam Review score cannot safely enter Score Management."""


@dataclass(frozen=True)
class ExamReviewScoreInput:
    review_id: UUID
    exam_set_code: str
    candidate_id: str
    lrn: str
    candidate_name: str
    raw_score: int
    max_score: int


@dataclass(frozen=True)
class ExamSessionSeed:
    id: str
    name: str
    is_closed: bool
    already_processed: bool
    exists: bool = True


@dataclass(frozen=True)
class RankingPopulationSeed:
    id: str
    name: str
    exam_set_ids: tuple[str, ...]


@dataclass(frozen=True)
class CandidateApplicationSeed:
    id: str
    candidate_id: str
    lrn: str
    candidate_name: str
    session_id: str


@dataclass(frozen=True)
class ApprovedScoreSeedRecord:
    id: str
    candidate_id: str
    candidate_name: str
    lrn: str
    session_id: str
    ranking_population_id: str
    exam_set_id: str
    raw_score: int
    max_score: int
    final_score: float
    review_status: ReviewStatus


@dataclass(frozen=True)
class ProcessedScoreRecord:
    id: str
    candidate_id: str
    candidate_name: str
    lrn: str
    session_id: str
    ranking_population_id: str
    exam_set_id: str
    raw_score: int
    max_score: int
    final_score: float
    review_status: ReviewStatus
    overall_rank: int
    percentile: float
    release_status: ReleaseStatus
    processing_batch_id: str
    processed_by: str


@dataclass(frozen=True)
class ScoreProcessingResult:
    processing_batch_id: str
    processed_by: str
    processed_record_count: int
    excluded_record_count: int
    records: tuple[ProcessedScoreRecord, ...]


@dataclass(frozen=True)
class ScoreReleaseQueueResult:
    queued_count: int
    skipped_count: int
    failed_count: int


@dataclass(frozen=True)
class ScoreReleaseDispatchResult:
    sent_count: int
    failed_count: int


@dataclass(frozen=True)
class ScoreReleaseResult:
    released_count: int
    notification_queued_count: int
    notification_skipped_count: int
    notification_failed_count: int


@dataclass(frozen=True)
class ScoreSeedData:
    exam_sessions: tuple[ExamSessionSeed, ...]
    ranking_populations: tuple[RankingPopulationSeed, ...]
    applications: tuple[CandidateApplicationSeed, ...]
    score_records: tuple[ApprovedScoreSeedRecord, ...]


REGULAR_SESSION_ID = "SESSION-2027-REGULAR"
STEM_SESSION_ID = "SESSION-2027-STEM"
SPECIAL_SESSION_ID = "SESSION-2027-SPECIAL"
REGULAR_POPULATION_ID = "POP-REGULAR-2027"
PWD_POPULATION_ID = "POP-PWD-2027"
REGULAR_EXAM_SETS = ("ES-BP0001", "ES-BP0002", "ES-BP0003", "ES-BP0004")
PWD_EXAM_SETS = ("ES-PWD0001",)
DEMO_SCORE_SESSIONS = (
    {
        "id": REGULAR_SESSION_ID,
        "name": "PhilSA Regular Examination 2027",
        "candidate_prefix": "PHL-2027",
        "lrn_prefix": "109",
        "regular_population_id": REGULAR_POPULATION_ID,
        "pwd_population_id": PWD_POPULATION_ID,
        "regular_exam_sets": REGULAR_EXAM_SETS,
        "pwd_exam_sets": PWD_EXAM_SETS,
    },
    {
        "id": STEM_SESSION_ID,
        "name": "PhilSA STEM Scholarship Examination 2027",
        "candidate_prefix": "PHL-2027-STEM",
        "lrn_prefix": "119",
        "regular_population_id": "POP-STEM-2027",
        "pwd_population_id": "POP-STEM-PWD-2027",
        "regular_exam_sets": ("ES-STEM0001", "ES-STEM0002", "ES-STEM0003", "ES-STEM0004"),
        "pwd_exam_sets": ("ES-STEM-PWD0001",),
    },
    {
        "id": SPECIAL_SESSION_ID,
        "name": "PhilSA Special Examination 2027",
        "candidate_prefix": "PHL-2027-SPC",
        "lrn_prefix": "129",
        "regular_population_id": "POP-SPECIAL-2027",
        "pwd_population_id": "POP-SPECIAL-PWD-2027",
        "regular_exam_sets": ("ES-SPC0001", "ES-SPC0002", "ES-SPC0003", "ES-SPC0004"),
        "pwd_exam_sets": ("ES-SPC-PWD0001",),
    },
)
DEMO_SCORE_SESSION_IDS = tuple(session["id"] for session in DEMO_SCORE_SESSIONS)
FIRST_NAMES = ("Alon", "Bituin", "Clara", "Diego", "Elena", "Francis", "Gio", "Hana")
LAST_NAMES = ("Reyes", "Santos", "Cruz", "Garcia", "Ramos", "Torres", "Mendoza", "Flores")


def _validate_exam_review_score_input(payload: ExamReviewScoreInput) -> None:
    if not payload.exam_set_code.strip():
        raise ScoreIntakeConflict("The Exam Review does not identify an Exam Set.")
    if not payload.candidate_id.strip() or len(payload.candidate_id) > 40:
        raise ScoreIntakeConflict("The Exam Review candidate ID is invalid.")
    if len(payload.lrn) != 12 or not payload.lrn.isdigit():
        raise ScoreIntakeConflict("The Exam Review candidate must have a valid 12-digit LRN.")
    if not payload.candidate_name.strip() or len(payload.candidate_name) > 180:
        raise ScoreIntakeConflict("The Exam Review candidate name is invalid.")
    if (
        isinstance(payload.raw_score, bool)
        or isinstance(payload.max_score, bool)
        or payload.raw_score < 0
        or payload.max_score <= 0
        or payload.raw_score > payload.max_score
        or payload.raw_score > 32767
        or payload.max_score > 32767
    ):
        raise ScoreIntakeConflict("The Exam Review score is outside the supported range.")


def _score_has_processing_data(score: CandidateScore) -> bool:
    return any(
        (
            score.overall_rank is not None,
            score.percentile is not None,
            score.processing_batch_id is not None,
            score.processed_at is not None,
            score.released_at is not None,
            score.release_status == ScoreReleaseStatus.RELEASED,
        )
    )


@transaction.atomic
def accept_exam_review_score(*, payload: ExamReviewScoreInput) -> CandidateScore:
    _validate_exam_review_score_input(payload)
    exam_sets = list(
        ExamSet.objects.select_for_update()
        .select_related("session", "ranking_population")
        .filter(code=payload.exam_set_code)[:2],
    )
    if len(exam_sets) != 1:
        raise ScoreIntakeConflict("Exam Review must match exactly one Score Management Exam Set.")

    exam_set = exam_sets[0]
    session = ExaminationSession.objects.select_for_update().get(pk=exam_set.session_id)
    if session.scoring_status != ScoreBatchStatus.READY_FOR_PROCESSING:
        raise ScoreIntakeConflict("This Score Management session has already entered processing.")

    final_score = (
        (Decimal(payload.raw_score) / Decimal(payload.max_score)) * Decimal("100")
    ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    existing = (
        CandidateScore.objects.select_for_update()
        .filter(session=session, candidate_id=payload.candidate_id)
        .first()
    )
    if existing is None:
        return CandidateScore.objects.create(
            id=f"EXAM-REVIEW-{payload.review_id}",
            session=session,
            ranking_population=exam_set.ranking_population,
            exam_set=exam_set,
            candidate_id=payload.candidate_id,
            lrn=payload.lrn,
            candidate_name=payload.candidate_name.strip(),
            raw_score=payload.raw_score,
            max_score=payload.max_score,
            final_score=final_score,
            review_status=ScoreReviewStatus.APPROVED,
            release_status=ScoreReleaseStatus.NOT_RELEASED,
        )

    if _score_has_processing_data(existing):
        raise ScoreIntakeConflict("This candidate score has already entered processing or release.")

    existing.ranking_population = exam_set.ranking_population
    existing.exam_set = exam_set
    existing.lrn = payload.lrn
    existing.candidate_name = payload.candidate_name.strip()
    existing.raw_score = payload.raw_score
    existing.max_score = payload.max_score
    existing.final_score = final_score
    existing.review_status = ScoreReviewStatus.APPROVED
    existing.release_status = ScoreReleaseStatus.NOT_RELEASED
    existing.save(
        update_fields=(
            "ranking_population",
            "exam_set",
            "lrn",
            "candidate_name",
            "raw_score",
            "max_score",
            "final_score",
            "review_status",
            "release_status",
            "updated_at",
        ),
    )
    return existing


def process_score_batch(
    session: ExamSessionSeed,
    records: Sequence[ApprovedScoreSeedRecord],
    *,
    processed_by: str,
    batch_id: str,
    allow_reprocessing: bool = False,
) -> ScoreProcessingResult:
    _validate_preconditions(session, records, allow_reprocessing=allow_reprocessing)
    approved_records = [record for record in records if record.review_status == "APPROVED"]
    excluded_count = len(records) - len(approved_records)
    processed_records: list[ProcessedScoreRecord] = []

    for population_records in _group_by_population(approved_records).values():
        ranked_records = _rank_population(population_records, processed_by=processed_by, batch_id=batch_id)
        processed_records.extend(ranked_records)

    processed_records.sort(
        key=lambda row: (row.ranking_population_id, row.overall_rank, -row.final_score, row.candidate_name),
    )

    return ScoreProcessingResult(
        processing_batch_id=batch_id,
        processed_by=processed_by,
        processed_record_count=len(processed_records),
        excluded_record_count=excluded_count,
        records=tuple(processed_records),
    )


def generate_score_seed_data(
    candidate_count: int = 500,
    seed: int = 2027,
    application_lrns: Sequence[str] = (),
) -> ScoreSeedData:
    if candidate_count < 0:
        raise ValueError("candidate_count must be non-negative")

    randomizer = random.Random(seed)
    applications: list[CandidateApplicationSeed] = []
    score_records: list[ApprovedScoreSeedRecord] = []

    for batch_index, session_config in enumerate(DEMO_SCORE_SESSIONS):
        for index in range(candidate_count):
            sequence = index + 1
            lrn_index = batch_index * candidate_count + index
            candidate_id = f"{session_config['candidate_prefix']}-{sequence:06d}"
            first_name = FIRST_NAMES[index % len(FIRST_NAMES)]
            last_name = LAST_NAMES[(index // len(FIRST_NAMES)) % len(LAST_NAMES)]
            candidate_name = f"{first_name} {last_name}"
            lrn = application_lrns[lrn_index] if lrn_index < len(application_lrns) else f"{session_config['lrn_prefix']}{sequence:09d}"
            uses_pwd_population = sequence % 50 == 0
            ranking_population_id = session_config["pwd_population_id"] if uses_pwd_population else session_config["regular_population_id"]
            exam_set_ids = session_config["pwd_exam_sets"] if uses_pwd_population else session_config["regular_exam_sets"]
            raw_score = _raw_score_for(randomizer, lrn_index + 1)
            max_score = 200

            applications.append(
                CandidateApplicationSeed(
                    id=candidate_id,
                    candidate_id=candidate_id,
                    lrn=lrn,
                    candidate_name=candidate_name,
                    session_id=session_config["id"],
                ),
            )
            score_records.append(
                ApprovedScoreSeedRecord(
                    id=f"SCORE-{candidate_id}",
                    candidate_id=candidate_id,
                    candidate_name=candidate_name,
                    lrn=lrn,
                    session_id=session_config["id"],
                    ranking_population_id=ranking_population_id,
                    exam_set_id=exam_set_ids[index % len(exam_set_ids)],
                    raw_score=raw_score,
                    max_score=max_score,
                    final_score=round((raw_score / max_score) * 100, 1),
                    review_status=_review_status_for(sequence),
                ),
            )

    return ScoreSeedData(
        exam_sessions=tuple(
            ExamSessionSeed(
                id=session_config["id"],
                name=session_config["name"],
                is_closed=True,
                already_processed=False,
            )
            for session_config in DEMO_SCORE_SESSIONS
        ),
        ranking_populations=tuple(
            population
            for session_config in DEMO_SCORE_SESSIONS
            for population in (
                RankingPopulationSeed(
                    id=session_config["regular_population_id"],
                    name=f"{session_config['name']} - Regular",
                    exam_set_ids=session_config["regular_exam_sets"],
                ),
                RankingPopulationSeed(
                    id=session_config["pwd_population_id"],
                    name=f"{session_config['name']} - PWD",
                    exam_set_ids=session_config["pwd_exam_sets"],
                ),
            )
        ),
        applications=tuple(applications),
        score_records=tuple(score_records),
    )


@transaction.atomic
def seed_score_management_data(candidate_count: int = 500, seed: int = 2027, *, reset: bool = False) -> ScoreSeedData:
    from apps.applications.models import StudentApplication

    application_lrns = list(
        StudentApplication.objects.exclude(status="DRAFT")
        .exclude(lrn="")
        .values_list("lrn", flat=True)
        .distinct()
        .order_by("lrn"),
    )
    seed_data = generate_score_seed_data(candidate_count=candidate_count, seed=seed, application_lrns=application_lrns)

    if reset:
        ScoreReleaseNotification.objects.filter(session_id__in=DEMO_SCORE_SESSION_IDS).delete()
        ScoreReleaseAuditLog.objects.filter(session_id__in=DEMO_SCORE_SESSION_IDS).delete()
        CandidateScore.objects.filter(session_id__in=DEMO_SCORE_SESSION_IDS).delete()
        ScoreProcessingBatch.objects.filter(session_id__in=DEMO_SCORE_SESSION_IDS).delete()
        ExamSet.objects.filter(session_id__in=DEMO_SCORE_SESSION_IDS).delete()
        RankingPopulation.objects.filter(session_id__in=DEMO_SCORE_SESSION_IDS).delete()
        ExaminationSession.objects.filter(id__in=DEMO_SCORE_SESSION_IDS).delete()

    if ExaminationSession.objects.filter(id__in=DEMO_SCORE_SESSION_IDS).exists():
        return seed_data

    ExaminationSession.objects.bulk_create(
        [
            ExaminationSession(
                id=session_seed.id,
                name=session_seed.name,
                status=ExaminationSessionStatus.CLOSED,
                scoring_status=ScoreBatchStatus.READY_FOR_PROCESSING,
            )
            for session_seed in seed_data.exam_sessions
        ],
    )

    RankingPopulation.objects.bulk_create(
        [
            RankingPopulation(id=population.id, session_id=_session_id_for_population(population.id), name=population.name)
            for population in seed_data.ranking_populations
        ],
    )

    exam_sets = []
    for population in seed_data.ranking_populations:
        for exam_set_id in population.exam_set_ids:
            exam_sets.append(
                ExamSet(
                    id=exam_set_id,
                    session_id=_session_id_for_population(population.id),
                    ranking_population_id=population.id,
                    code=exam_set_id,
                ),
            )
    ExamSet.objects.bulk_create(exam_sets)

    CandidateScore.objects.bulk_create(
        [
            CandidateScore(
                id=record.id,
                session_id=record.session_id,
                ranking_population_id=record.ranking_population_id,
                exam_set_id=record.exam_set_id,
                candidate_id=record.candidate_id,
                lrn=record.lrn,
                candidate_name=record.candidate_name,
                raw_score=record.raw_score,
                max_score=record.max_score,
                final_score=record.final_score,
                review_status=record.review_status,
            )
            for record in seed_data.score_records
        ],
        batch_size=5000,
    )
    return seed_data


@transaction.atomic
def process_score_session(
    *,
    session_id: str,
    processed_by,
    allow_reprocessing: bool = False,
) -> ScoreProcessingBatch:
    try:
        session = ExaminationSession.objects.select_for_update().get(id=session_id)
    except ExaminationSession.DoesNotExist as exc:
        raise ScoreProcessingError("examination session does not exist") from exc

    if session.scoring_status == ScoreBatchStatus.RESULTS_RELEASED:
        raise ScoreProcessingError("released results cannot be reprocessed")

    records = list(CandidateScore.objects.filter(session=session).select_related("ranking_population", "exam_set"))
    _validate_score_relationships(records)
    session_seed = ExamSessionSeed(
        id=session.id,
        name=session.name,
        is_closed=session.is_closed,
        already_processed=session.scoring_status in {ScoreBatchStatus.SCORING_PROCESSED, ScoreBatchStatus.RESULTS_RELEASED},
    )
    seed_records = [_score_model_to_seed_record(record) for record in records]
    batch_id = f"SCORE-PROC-{uuid4().hex[:12].upper()}"
    result = process_score_batch(
        session_seed,
        seed_records,
        processed_by=_actor_identifier(processed_by),
        batch_id=batch_id,
        allow_reprocessing=allow_reprocessing,
    )

    batch = ScoreProcessingBatch.objects.create(
        id=batch_id,
        session=session,
        processed_by=_user_or_none(processed_by),
        processed_by_identifier=_actor_identifier(processed_by),
        allow_reprocessing=allow_reprocessing,
        processed_record_count=result.processed_record_count,
        excluded_record_count=result.excluded_record_count,
    )

    now = timezone.now()
    CandidateScore.objects.filter(session=session).update(
        overall_rank=None,
        percentile=None,
        processing_batch=None,
        processed_at=None,
        release_status=ScoreReleaseStatus.NOT_RELEASED,
        released_at=None,
    )

    result_by_id = {record.id: record for record in result.records}
    approved_scores = list(CandidateScore.objects.filter(id__in=result_by_id))
    for score in approved_scores:
        processed = result_by_id[score.id]
        score.overall_rank = processed.overall_rank
        score.percentile = processed.percentile
        score.processing_batch = batch
        score.processed_at = now
        score.release_status = ScoreReleaseStatus.NOT_RELEASED
        score.released_at = None
    CandidateScore.objects.bulk_update(
        approved_scores,
        ["overall_rank", "percentile", "processing_batch", "processed_at", "release_status", "released_at"],
        batch_size=5000,
    )

    batch.status = ScoreBatchStatus.SCORING_PROCESSED
    batch.completed_at = now
    batch.save(update_fields=["status", "completed_at"])
    session.scoring_status = ScoreBatchStatus.SCORING_PROCESSED
    session.save(update_fields=["scoring_status", "updated_at"])
    return batch


@transaction.atomic
def release_score_session(*, session_id: str, released_by) -> ScoreReleaseResult:
    try:
        session = ExaminationSession.objects.select_for_update().get(id=session_id)
    except ExaminationSession.DoesNotExist as exc:
        raise ScoreProcessingError("examination session does not exist") from exc

    if session.scoring_status != ScoreBatchStatus.SCORING_PROCESSED:
        raise ScoreProcessingError("Scores must be processed before release.")

    batch = session.processing_batches.order_by("-started_at").first()
    if batch is None:
        raise ScoreProcessingError("Scores must be processed before release.")

    now = timezone.now()
    released_count = CandidateScore.objects.filter(
        session=session,
        review_status=ScoreReviewStatus.APPROVED,
        overall_rank__isnull=False,
    ).update(release_status=ScoreReleaseStatus.RELEASED, released_at=now)

    batch.status = ScoreBatchStatus.RESULTS_RELEASED
    batch.save(update_fields=["status"])
    session.scoring_status = ScoreBatchStatus.RESULTS_RELEASED
    session.save(update_fields=["scoring_status", "updated_at"])
    ScoreReleaseAuditLog.objects.create(
        session=session,
        processing_batch=batch,
        released_by=_user_or_none(released_by),
        released_by_identifier=_actor_identifier(released_by),
        released_count=released_count,
    )
    notification_result = queue_released_score_candidate_notifications(
        session=session,
        portal_url=f"{settings.FRONTEND_BASE_URL.rstrip('/')}/student/results",
    )
    if notification_result.queued_count and settings.SCORE_RELEASE_EMAIL_AUTO_ENQUEUE:
        from .jobs import enqueue_score_release_notification_dispatch

        transaction.on_commit(
            lambda: enqueue_score_release_notification_dispatch(
                limit=settings.SCORE_RELEASE_EMAIL_DISPATCH_BATCH_SIZE,
            ),
        )
    return ScoreReleaseResult(
        released_count=released_count,
        notification_queued_count=notification_result.queued_count,
        notification_skipped_count=notification_result.skipped_count,
        notification_failed_count=notification_result.failed_count,
    )


def queue_released_score_candidate_notifications(*, session: ExaminationSession, portal_url: str) -> ScoreReleaseQueueResult:
    from apps.applications.models import ApplicationStatus, StudentApplication

    skipped_count = 0
    score_rows = list(CandidateScore.objects.filter(
        session=session,
        review_status=ScoreReviewStatus.APPROVED,
        release_status=ScoreReleaseStatus.RELEASED,
        overall_rank__isnull=False,
    ).order_by("candidate_id").values("id", "lrn"))
    applications_by_lrn = defaultdict(list)
    lrns = {row["lrn"] for row in score_rows}

    if lrns:
        for application in (
            StudentApplication.objects.filter(lrn__in=lrns)
            .exclude(status__in=[ApplicationStatus.DRAFT, ApplicationStatus.REJECTED])
            .select_related("personal_info")
            .only("lrn", "submitted_at", "created_at", "personal_info")
            .order_by("lrn", "-submitted_at", "-created_at")
        ):
            applications_by_lrn[str(application.lrn)].append(application)

    notifications: list[ScoreReleaseNotification] = []
    for score in score_rows:
        applications = applications_by_lrn.get(str(score["lrn"]), [])
        if len(applications) != 1:
            skipped_count += 1
            continue

        application = applications[0]
        recipient_email = _application_email(application)
        if not recipient_email or _is_seeded_synthetic_email(recipient_email):
            skipped_count += 1
            continue

        notifications.append(
            ScoreReleaseNotification(
                session=session,
                score_id=str(score["id"]),
                recipient_email=recipient_email,
                recipient_name=_application_display_name(application),
                portal_url=portal_url,
            ),
        )

    created_notifications = ScoreReleaseNotification.objects.bulk_create(
        notifications,
        batch_size=5000,
        ignore_conflicts=True,
    )
    return ScoreReleaseQueueResult(
        queued_count=len(created_notifications),
        skipped_count=skipped_count,
        failed_count=0,
    )


def dispatch_score_release_notifications(*, limit: int = 100) -> ScoreReleaseDispatchResult:
    if limit <= 0:
        raise ValueError("limit must be positive")

    notifications = list(
        ScoreReleaseNotification.objects.filter(status=ScoreReleaseNotificationStatus.PENDING)
        .order_by("queued_at", "id")[:limit],
    )
    sent_count = 0
    failed_count = 0
    now = timezone.now()

    for notification in notifications:
        notification.attempts += 1
        try:
            email_message = EmailMultiAlternatives(
                subject="Your PhilSLA Examination Results Are Now Available",
                body=_score_release_email_body(
                    recipient_name=notification.recipient_name,
                    portal_url=notification.portal_url,
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[notification.recipient_email],
            )
            email_message.attach_alternative(
                _score_release_email_html_body(
                    recipient_name=notification.recipient_name,
                    portal_url=notification.portal_url,
                ),
                "text/html",
            )
            email_message.send(fail_silently=False)
        except Exception as exc:
            notification.status = ScoreReleaseNotificationStatus.FAILED
            notification.failure_reason = str(exc)[:240]
            notification.save(update_fields=["attempts", "status", "failure_reason", "updated_at"])
            failed_count += 1
        else:
            notification.status = ScoreReleaseNotificationStatus.SENT
            notification.failure_reason = ""
            notification.sent_at = now
            notification.save(update_fields=["attempts", "status", "failure_reason", "sent_at", "updated_at"])
            sent_count += 1

    return ScoreReleaseDispatchResult(sent_count=sent_count, failed_count=failed_count)


def _score_model_to_seed_record(score: CandidateScore) -> ApprovedScoreSeedRecord:
    return ApprovedScoreSeedRecord(
        id=score.id,
        candidate_id=score.candidate_id,
        candidate_name=score.candidate_name,
        lrn=score.lrn,
        session_id=score.session_id,
        ranking_population_id=score.ranking_population_id,
        exam_set_id=score.exam_set_id,
        raw_score=score.raw_score,
        max_score=score.max_score,
        final_score=float(score.final_score),
        review_status=score.review_status,
    )


def _application_email(application) -> str:
    personal = _application_personal(application)
    email = personal.get("email", "")
    if isinstance(email, str):
        return email.strip()
    return ""


def _is_seeded_synthetic_email(email: str) -> bool:
    return email.lower().endswith("@philsa.example.test")


def _application_display_name(application) -> str:
    personal = _application_personal(application)
    parts = [
        personal.get("firstName", ""),
        personal.get("middleName", ""),
        personal.get("lastName", ""),
        personal.get("suffix", ""),
    ]
    name = " ".join(part.strip() for part in parts if isinstance(part, str) and part.strip())
    return name or "Student"


def _application_personal(application) -> dict:
    if isinstance(application, dict):
        personal = application.get("personal") or {}
    else:
        personal = application.personal or {}
    return personal if isinstance(personal, dict) else {}


def _score_release_email_body(*, recipient_name: str, portal_url: str) -> str:
    return (
        f"Dear {recipient_name},\n\n"
        "Your PhilSLA examination results have been released.\n\n"
        "To securely view your official results, including your score, subject breakdown, "
        "and qualification status, please log in to the Student Portal.\n\n"
        f"View Results: {portal_url}\n"
    )


def _score_release_email_html_body(*, recipient_name: str, portal_url: str) -> str:
    display_name = recipient_name
    return f"""\
<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#FAFAFA;font-family:Arial,Helvetica,sans-serif;color:#111111;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#FAFAFA;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#ffffff;border:1px solid #E2E8F0;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:34px 42px 18px;text-align:center;border-bottom:1px solid #E2E8F0;">
                <div style="font-size:46px;line-height:1;font-weight:800;font-family:Arial Black,Arial,Helvetica,sans-serif;letter-spacing:0;">
                  <span style="color:#111111;">Phil</span><span style="color:#8A1538;">SLA</span>
                </div>
                <p style="margin:14px 0 0;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#555555;">Results Released</p>
              </td>
            </tr>
            <tr>
              <td style="padding:34px 42px 40px;font-size:14px;line-height:1.65;text-align:left;">
                <p style="margin:0 0 18px;">Dear {display_name},</p>
                <p style="margin:0 0 18px;">Your PhilSLA examination results have been released.</p>
                <p style="margin:0 0 26px;">
                  To securely view your official results, including your score, subject breakdown, and qualification status, please log in to the Student Portal.
                </p>
                <p style="margin:0 0 26px;">
                  <a href="{portal_url}" style="display:inline-block;background:#8A1538;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:8px;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">
                    View Results
                  </a>
                </p>
                <p style="margin:0 0 20px;color:#555555;">This notice does not contain your examination score for security reasons.</p>
                <p style="margin:0;">
                  Best regards,<br>
                  The PhilSLA Team
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
"""


def _session_id_for_population(population_id: str) -> str:
    for session_config in DEMO_SCORE_SESSIONS:
        if population_id in {session_config["regular_population_id"], session_config["pwd_population_id"]}:
            return session_config["id"]
    raise ScoreProcessingError("seed ranking population does not match a demo session")


def _validate_score_relationships(records: Sequence[CandidateScore]) -> None:
    for score in records:
        if score.exam_set.session_id != score.session_id:
            raise ScoreProcessingError("candidate score exam set does not match examination session")
        if score.ranking_population.session_id != score.session_id:
            raise ScoreProcessingError("candidate score ranking population does not match examination session")
        if score.exam_set.ranking_population_id != score.ranking_population_id:
            raise ScoreProcessingError("candidate score exam set does not match ranking population")


def _actor_identifier(user) -> str:
    return str(getattr(user, "user_id", getattr(user, "id", "SYSTEM_ADMIN")))


def _user_or_none(user):
    user_model = get_user_model()
    if isinstance(user, user_model):
        return user
    return None


def _validate_preconditions(
    session: ExamSessionSeed,
    records: Sequence[ApprovedScoreSeedRecord],
    *,
    allow_reprocessing: bool,
) -> None:
    if not session.exists:
        raise ScoreProcessingError("examination session does not exist")
    if not session.is_closed:
        raise ScoreProcessingError("examination session is not closed")
    if session.already_processed and not allow_reprocessing:
        raise ScoreProcessingError("session has already been processed")
    if not any(record.review_status == "APPROVED" for record in records):
        raise ScoreProcessingError("approved examination scores are not available")


def _group_by_population(
    records: Sequence[ApprovedScoreSeedRecord],
) -> dict[str, list[ApprovedScoreSeedRecord]]:
    groups: dict[str, list[ApprovedScoreSeedRecord]] = defaultdict(list)
    for record in records:
        groups[record.ranking_population_id].append(record)
    return groups


def _rank_population(
    records: Sequence[ApprovedScoreSeedRecord],
    *,
    processed_by: str,
    batch_id: str,
) -> list[ProcessedScoreRecord]:
    sorted_records = sorted(records, key=lambda row: (-row.final_score, row.candidate_name, row.candidate_id))
    processed: list[ProcessedScoreRecord] = []
    index = 0

    while index < len(sorted_records):
        score = sorted_records[index].final_score
        next_index = index + 1
        while next_index < len(sorted_records) and sorted_records[next_index].final_score == score:
            next_index += 1

        rank = index + 1
        lower_score_count = len(sorted_records) - next_index
        percentile = round((lower_score_count / len(sorted_records)) * 100, 4)

        for tied_record in sorted_records[index:next_index]:
            processed.append(
                ProcessedScoreRecord(
                    **tied_record.__dict__,
                    overall_rank=rank,
                    percentile=percentile,
                    release_status="NOT_RELEASED",
                    processing_batch_id=batch_id,
                    processed_by=processed_by,
                ),
            )

        index = next_index

    return processed


def _raw_score_for(randomizer: random.Random, sequence: int) -> int:
    if sequence % 17 == 0:
        return 193
    if sequence % 23 == 0:
        return 181
    return max(80, min(200, round(120 + randomizer.random() * 75)))


def _review_status_for(sequence: int) -> ReviewStatus:
    if sequence % 41 == 0:
        return "REJECTED"
    if sequence % 29 == 0:
        return "PENDING"
    return "APPROVED"
