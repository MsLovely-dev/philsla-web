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
from __future__ import annotations

import random
from collections import defaultdict
from dataclasses import dataclass
from typing import Literal, Sequence
from uuid import uuid4

from django.contrib.auth import get_user_model
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
    ScoreReleaseStatus,
    ScoreReviewStatus,
)


ReviewStatus = Literal["APPROVED", "PENDING", "REJECTED"]
ReleaseStatus = Literal["NOT_RELEASED", "RELEASED"]


class ScoreProcessingError(ValueError):
    """Raised when a score processing precondition is not satisfied."""


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
class ScoreSeedData:
    exam_sessions: tuple[ExamSessionSeed, ...]
    ranking_populations: tuple[RankingPopulationSeed, ...]
    applications: tuple[CandidateApplicationSeed, ...]
    score_records: tuple[ApprovedScoreSeedRecord, ...]


REGULAR_SESSION_ID = "SESSION-2027-REGULAR"
REGULAR_POPULATION_ID = "POP-REGULAR-2027"
PWD_POPULATION_ID = "POP-PWD-2027"
REGULAR_EXAM_SETS = ("ES-BP0001", "ES-BP0002", "ES-BP0003", "ES-BP0004")
PWD_EXAM_SETS = ("ES-PWD0001",)
FIRST_NAMES = ("Alon", "Bituin", "Clara", "Diego", "Elena", "Francis", "Gio", "Hana")
LAST_NAMES = ("Reyes", "Santos", "Cruz", "Garcia", "Ramos", "Torres", "Mendoza", "Flores")


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

    for index in range(candidate_count):
        sequence = index + 1
        candidate_id = f"PHL-2027-{sequence:06d}"
        first_name = FIRST_NAMES[index % len(FIRST_NAMES)]
        last_name = LAST_NAMES[(index // len(FIRST_NAMES)) % len(LAST_NAMES)]
        candidate_name = f"{first_name} {last_name}"
        lrn = application_lrns[index] if index < len(application_lrns) else f"109{sequence:09d}"
        uses_pwd_population = sequence % 50 == 0
        ranking_population_id = PWD_POPULATION_ID if uses_pwd_population else REGULAR_POPULATION_ID
        exam_set_ids = PWD_EXAM_SETS if uses_pwd_population else REGULAR_EXAM_SETS
        raw_score = _raw_score_for(randomizer, sequence)
        max_score = 200

        applications.append(
            CandidateApplicationSeed(
                id=candidate_id,
                candidate_id=candidate_id,
                lrn=lrn,
                candidate_name=candidate_name,
                session_id=REGULAR_SESSION_ID,
            ),
        )
        score_records.append(
            ApprovedScoreSeedRecord(
                id=f"SCORE-{candidate_id}",
                candidate_id=candidate_id,
                candidate_name=candidate_name,
                lrn=lrn,
                session_id=REGULAR_SESSION_ID,
                ranking_population_id=ranking_population_id,
                exam_set_id=exam_set_ids[index % len(exam_set_ids)],
                raw_score=raw_score,
                max_score=max_score,
                final_score=round((raw_score / max_score) * 100, 1),
                review_status=_review_status_for(sequence),
            ),
        )

    return ScoreSeedData(
        exam_sessions=(
            ExamSessionSeed(
                id=REGULAR_SESSION_ID,
                name="PhilSA Regular Examination 2027",
                is_closed=True,
                already_processed=False,
            ),
        ),
        ranking_populations=(
            RankingPopulationSeed(
                id=REGULAR_POPULATION_ID,
                name="Regular Examination",
                exam_set_ids=REGULAR_EXAM_SETS,
            ),
            RankingPopulationSeed(
                id=PWD_POPULATION_ID,
                name="PWD Examination",
                exam_set_ids=PWD_EXAM_SETS,
            ),
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
        ScoreReleaseAuditLog.objects.filter(session_id=REGULAR_SESSION_ID).delete()
        CandidateScore.objects.filter(session_id=REGULAR_SESSION_ID).delete()
        ScoreProcessingBatch.objects.filter(session_id=REGULAR_SESSION_ID).delete()
        ExamSet.objects.filter(session_id=REGULAR_SESSION_ID).delete()
        RankingPopulation.objects.filter(session_id=REGULAR_SESSION_ID).delete()
        ExaminationSession.objects.filter(id=REGULAR_SESSION_ID).delete()

    if ExaminationSession.objects.filter(id=REGULAR_SESSION_ID).exists():
        return seed_data

    session_seed = seed_data.exam_sessions[0]
    ExaminationSession.objects.create(
        id=session_seed.id,
        name=session_seed.name,
        status=ExaminationSessionStatus.CLOSED,
        scoring_status=ScoreBatchStatus.READY_FOR_PROCESSING,
    )

    RankingPopulation.objects.bulk_create(
        [
            RankingPopulation(id=population.id, session_id=REGULAR_SESSION_ID, name=population.name)
            for population in seed_data.ranking_populations
        ],
    )

    exam_sets = []
    for population in seed_data.ranking_populations:
        for exam_set_id in population.exam_set_ids:
            exam_sets.append(
                ExamSet(
                    id=exam_set_id,
                    session_id=REGULAR_SESSION_ID,
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
def release_score_session(*, session_id: str, released_by) -> int:
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
    return released_count


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
