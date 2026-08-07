from django.test import SimpleTestCase

from apps.results.services import (
    ApprovedScoreSeedRecord,
    ExamSessionSeed,
    ScoreProcessingError,
    generate_score_seed_data,
    process_score_batch,
)


def session(**overrides):
    data = {
        "id": "SESSION-2027-REGULAR",
        "name": "PhilSA Regular Examination 2027",
        "is_closed": True,
        "already_processed": False,
        "exists": True,
    }
    data.update(overrides)
    return ExamSessionSeed(**data)


def score(candidate_id, population_id, final_score, review_status="APPROVED"):
    return ApprovedScoreSeedRecord(
        id=f"SCORE-{candidate_id}",
        candidate_id=candidate_id,
        candidate_name=f"Candidate {candidate_id}",
        lrn=f"10932656{candidate_id[-4:]}",
        session_id="SESSION-2027-REGULAR",
        ranking_population_id=population_id,
        exam_set_id="ES-BP0001",
        raw_score=int(final_score * 2),
        max_score=200,
        final_score=final_score,
        review_status=review_status,
    )


class ScoreProcessingTests(SimpleTestCase):
    def test_computes_competition_rank_and_lower_score_percentile_for_ties(self):
        records = [
            score("PHL-A", "POP-REGULAR", 98.2),
            score("PHL-B", "POP-REGULAR", 96.5),
            score("PHL-C", "POP-REGULAR", 96.5),
            score("PHL-D", "POP-REGULAR", 95.9),
            score("PHL-E", "POP-REGULAR", 90.0),
        ]

        result = process_score_batch(session(), records, processed_by="SYSTEM_ADMIN", batch_id="PROC-001")

        by_candidate = {row.candidate_id: row for row in result.records}
        self.assertEqual(by_candidate["PHL-A"].overall_rank, 1)
        self.assertEqual(by_candidate["PHL-A"].percentile, 80)
        self.assertEqual(by_candidate["PHL-B"].overall_rank, 2)
        self.assertEqual(by_candidate["PHL-B"].percentile, 40)
        self.assertEqual(by_candidate["PHL-C"].overall_rank, 2)
        self.assertEqual(by_candidate["PHL-C"].percentile, 40)
        self.assertEqual(by_candidate["PHL-D"].overall_rank, 4)
        self.assertEqual(by_candidate["PHL-D"].percentile, 20)
        self.assertEqual(by_candidate["PHL-E"].overall_rank, 5)
        self.assertEqual(by_candidate["PHL-E"].percentile, 0)

    def test_computes_each_ranking_population_independently(self):
        records = [
            score("PHL-REG-A", "POP-REGULAR", 90),
            score("PHL-REG-B", "POP-REGULAR", 80),
            score("PHL-PWD-A", "POP-PWD", 85),
            score("PHL-PWD-B", "POP-PWD", 75),
        ]

        result = process_score_batch(session(), records, processed_by="SYSTEM_ADMIN", batch_id="PROC-001")

        by_candidate = {row.candidate_id: row for row in result.records}
        self.assertEqual(by_candidate["PHL-REG-A"].overall_rank, 1)
        self.assertEqual(by_candidate["PHL-REG-A"].percentile, 50)
        self.assertEqual(by_candidate["PHL-REG-B"].overall_rank, 2)
        self.assertEqual(by_candidate["PHL-REG-B"].percentile, 0)
        self.assertEqual(by_candidate["PHL-PWD-A"].overall_rank, 1)
        self.assertEqual(by_candidate["PHL-PWD-A"].percentile, 50)
        self.assertEqual(by_candidate["PHL-PWD-B"].overall_rank, 2)
        self.assertEqual(by_candidate["PHL-PWD-B"].percentile, 0)

    def test_excludes_pending_and_rejected_records_from_processing(self):
        records = [
            score("PHL-APPROVED", "POP-REGULAR", 90, "APPROVED"),
            score("PHL-PENDING", "POP-REGULAR", 99, "PENDING"),
            score("PHL-REJECTED", "POP-REGULAR", 98, "REJECTED"),
        ]

        result = process_score_batch(session(), records, processed_by="SYSTEM_ADMIN", batch_id="PROC-001")

        self.assertEqual([row.candidate_id for row in result.records], ["PHL-APPROVED"])
        self.assertEqual(result.excluded_record_count, 2)
        self.assertEqual(result.processed_record_count, 1)

    def test_validates_processing_preconditions(self):
        records = [score("PHL-A", "POP-REGULAR", 90)]

        with self.assertRaisesMessage(ScoreProcessingError, "examination session does not exist"):
            process_score_batch(session(exists=False), records, processed_by="SYSTEM_ADMIN", batch_id="PROC-001")

        with self.assertRaisesMessage(ScoreProcessingError, "examination session is not closed"):
            process_score_batch(session(is_closed=False), records, processed_by="SYSTEM_ADMIN", batch_id="PROC-001")

        with self.assertRaisesMessage(ScoreProcessingError, "session has already been processed"):
            process_score_batch(session(already_processed=True), records, processed_by="SYSTEM_ADMIN", batch_id="PROC-001")

        with self.assertRaisesMessage(ScoreProcessingError, "approved examination scores are not available"):
            process_score_batch(session(), [score("PHL-PENDING", "POP-REGULAR", 90, "PENDING")], processed_by="SYSTEM_ADMIN", batch_id="PROC-001")

    def test_allows_reprocessing_when_explicitly_enabled(self):
        records = [score("PHL-A", "POP-REGULAR", 90)]

        result = process_score_batch(
            session(already_processed=True),
            records,
            processed_by="SYSTEM_ADMIN",
            batch_id="PROC-002",
            allow_reprocessing=True,
        )

        self.assertEqual(result.processing_batch_id, "PROC-002")
        self.assertEqual(result.processed_record_count, 1)

    def test_generates_deterministic_visual_and_scale_seed_data(self):
        first = generate_score_seed_data(candidate_count=120, seed=2027)
        second = generate_score_seed_data(candidate_count=120, seed=2027)

        self.assertEqual(first.score_records, second.score_records)
        self.assertEqual(len(first.exam_sessions), 3)
        self.assertEqual(len(first.applications), 360)
        self.assertEqual(len(first.score_records), 360)
        self.assertEqual(first.exam_sessions[0].is_closed, True)
        self.assertEqual(first.exam_sessions[0].already_processed, False)
        self.assertEqual(
            [population.id for population in first.ranking_populations],
            [
                "POP-REGULAR-2027",
                "POP-PWD-2027",
                "POP-STEM-2027",
                "POP-STEM-PWD-2027",
                "POP-SPECIAL-2027",
                "POP-SPECIAL-PWD-2027",
            ],
        )
        self.assertTrue(any(record.review_status == "PENDING" for record in first.score_records))
        self.assertTrue(any(record.review_status == "REJECTED" for record in first.score_records))

        scale = generate_score_seed_data(candidate_count=200_000, seed=2027)
        self.assertEqual(len(scale.applications), 600_000)
        self.assertEqual(len(scale.score_records), 600_000)
