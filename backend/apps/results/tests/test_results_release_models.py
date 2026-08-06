from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.db.models.deletion import ProtectedError
from django.test import TestCase
from django.utils import timezone

from apps.applications.models import StudentApplication
from apps.results.models import (
    CandidateScore,
    DecisionOutcome,
    ExamSet,
    PublicationBatch,
    PublicationStatus,
    RankingPopulation,
    ReleaseMetric,
    ReleasePolicy,
    ReleasePolicyStatus,
    ResultDecision,
    ResultPublication,
    ScoreReviewStatus,
)
from apps.results.tests.results_release_fixtures import make_policy, make_release_fixture


class ReleaseModelTests(TestCase):
    def test_active_policy_is_unique_per_session_and_university(self):
        fixture = make_release_fixture()
        ReleasePolicy.objects.create(
            session=fixture.session,
            university=fixture.university,
            metric=ReleaseMetric.PERCENTILE,
            qualified_threshold=Decimal("85.00"),
            waitlist_enabled=True,
            waitlist_lower_threshold=Decimal("80.00"),
            status=ReleasePolicyStatus.ACTIVE,
            version=1,
            created_by=fixture.admin,
            activated_by=fixture.admin,
            activated_at=timezone.now(),
        )

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                ReleasePolicy.objects.create(
                    session=fixture.session,
                    university=fixture.university,
                    metric=ReleaseMetric.PERCENTILE,
                    qualified_threshold=Decimal("90.00"),
                    status=ReleasePolicyStatus.ACTIVE,
                    version=2,
                    created_by=fixture.admin,
                )

    def test_waitlist_threshold_must_be_below_qualified_threshold(self):
        policy = make_policy(
            qualified_threshold=Decimal("85.00"),
            waitlist_enabled=True,
            waitlist_lower_threshold=Decimal("85.00"),
        )

        with self.assertRaises(ValidationError):
            policy.full_clean()

    def test_invalid_waitlist_threshold_cannot_be_persisted(self):
        fixture = make_release_fixture()

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                ReleasePolicy.objects.create(
                    session=fixture.session,
                    university=fixture.university,
                    metric=ReleaseMetric.PERCENTILE,
                    qualified_threshold=Decimal("85.00"),
                    waitlist_enabled=True,
                    waitlist_lower_threshold=Decimal("85.00"),
                    status=ReleasePolicyStatus.DRAFT,
                    version=1,
                    created_by=fixture.admin,
                )

    def test_policy_version_must_be_positive(self):
        policy = make_policy(version=0)

        with self.assertRaises(ValidationError):
            policy.full_clean()

    def test_current_publication_is_unique_per_score(self):
        publication = self.make_publication()

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                ResultPublication.objects.create(
                    batch=publication.batch,
                    score=publication.score,
                    student_account=publication.student_account,
                    application=publication.application,
                    version=2,
                    status=PublicationStatus.PUBLISHED,
                    supersedes=publication,
                    candidate_identifier_snapshot="SYNTHETIC-CANDIDATE",
                    display_name_snapshot="Synthetic Student",
                    session_identifier_snapshot=publication.score.session_id,
                    session_name_snapshot=publication.score.session.name,
                    raw_score_snapshot=80,
                    maximum_score_snapshot=100,
                    final_score_snapshot=Decimal("80.00"),
                    overall_rank_snapshot=1,
                    percentile_snapshot=Decimal("80.0000"),
                    published_at_snapshot=timezone.now(),
                    region_snapshot="Region I",
                    snapshot_digest="a" * 64,
                )

    def test_publication_version_must_follow_the_prior_version_when_saved(self):
        publication = self.make_publication()
        correction = ResultPublication(
            batch=publication.batch,
            score=publication.score,
            student_account=publication.student_account,
            application=publication.application,
            version=3,
            status=PublicationStatus.SUPERSEDED,
            supersedes=publication,
            candidate_identifier_snapshot="SYNTHETIC-CANDIDATE",
            display_name_snapshot="Synthetic Student",
            session_identifier_snapshot=publication.score.session_id,
            session_name_snapshot=publication.score.session.name,
            raw_score_snapshot=80,
            maximum_score_snapshot=100,
            final_score_snapshot=Decimal("80.00"),
            overall_rank_snapshot=1,
            percentile_snapshot=Decimal("80.0000"),
            published_at_snapshot=timezone.now(),
            region_snapshot="Region I",
            snapshot_digest="b" * 64,
        )

        with self.assertRaises(ValidationError):
            correction.save()

    def test_publication_snapshot_cannot_be_changed_after_creation(self):
        publication = self.make_publication()
        publication.display_name_snapshot = "Changed Synthetic Student"

        with self.assertRaises(ValidationError):
            publication.save(update_fields=["display_name_snapshot"])

    def test_publication_batch_rejects_non_release_status(self):
        fixture = make_release_fixture()

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                PublicationBatch.objects.create(
                    session=fixture.session,
                    idempotency_key="invalid-publication-status",
                    status="SCORING_PROCESSED",
                    published_by=fixture.admin,
                    published_at=timezone.now(),
                )

    def test_release_foreign_keys_are_protected(self):
        publication = self.make_publication()
        policy = make_policy(fixture=self.fixture)
        policy.save()
        decision = ResultDecision.objects.create(
            publication=publication,
            university=publication.batch.requested_universities.first(),
            course=self.make_course(publication),
            policy=policy,
            preference_order=1,
            outcome=DecisionOutcome.QUALIFIED,
            metric=ReleaseMetric.PERCENTILE,
            metric_value=Decimal("90.0000"),
            qualified_threshold=Decimal("85.00"),
        )

        with self.assertRaises(ProtectedError):
            publication.score.delete()

        with self.assertRaises(ProtectedError):
            publication.delete()
        self.assertEqual(decision.publication_id, publication.id)

    def make_publication(self) -> ResultPublication:
        self.fixture = make_release_fixture()
        population = RankingPopulation.objects.create(
            id="RELEASE-POPULATION",
            session=self.fixture.session,
            name="Release population",
        )
        exam_set = ExamSet.objects.create(
            id="RELEASE-EXAM-SET",
            session=self.fixture.session,
            ranking_population=population,
            code="RELEASE-EXAM-SET",
        )
        score = CandidateScore.objects.create(
            id="RELEASE-SCORE",
            session=self.fixture.session,
            ranking_population=population,
            exam_set=exam_set,
            candidate_id="PHL-2026-TEST01",
            lrn="123456789012",
            candidate_name="Synthetic Student",
            raw_score=80,
            max_score=100,
            final_score=Decimal("80.00"),
            review_status=ScoreReviewStatus.APPROVED,
            overall_rank=1,
            percentile=Decimal("80.0000"),
        )
        student = get_user_model().objects.create_user(
            username="release-student",
            email="release-student@example.test",
        )
        application = StudentApplication.objects.create(
            owner=student,
            candidate_id=score.candidate_id,
            lrn=score.lrn,
            exam_cycle_id="2026",
        )
        batch = PublicationBatch.objects.create(
            session=self.fixture.session,
            idempotency_key="release-model-test-key",
            published_by=self.fixture.admin,
            published_at=timezone.now(),
        )
        batch.requested_universities.add(self.fixture.university)
        return ResultPublication.objects.create(
            batch=batch,
            score=score,
            student_account=student,
            application=application,
            version=1,
            status=PublicationStatus.PUBLISHED,
            candidate_identifier_snapshot=score.candidate_id,
            display_name_snapshot=score.candidate_name,
            session_identifier_snapshot=score.session_id,
            session_name_snapshot=score.session.name,
            raw_score_snapshot=score.raw_score,
            maximum_score_snapshot=score.max_score,
            final_score_snapshot=score.final_score,
            overall_rank_snapshot=score.overall_rank,
            percentile_snapshot=score.percentile,
            published_at_snapshot=timezone.now(),
            region_snapshot="Region I",
            snapshot_digest="c" * 64,
        )

    def make_course(self, publication):
        from apps.configuration.models import CollegeCourse, DegreeType

        return CollegeCourse.objects.create(
            university=publication.batch.requested_universities.first(),
            college_name="Synthetic College",
            program_code="BSSYN",
            program_name="Bachelor of Synthetic Studies",
            degree_type=DegreeType.BACHELOR_OF_SCIENCE,
            duration_years=4,
            total_units=120,
            cutoff_percentile=Decimal("80.00"),
            created_by=self.fixture.admin,
        )
