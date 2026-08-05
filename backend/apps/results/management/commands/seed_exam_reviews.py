from datetime import datetime
from zoneinfo import ZoneInfo

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.applications.models import (
    ApplicationStatus,
    StudentApplication,
    StudentApplicationPersonalInfo,
)
from apps.results.models import (
    ExamReviewItem,
    ExamReviewItemType,
    ExamReviewRecord,
    ExamReviewStatus,
    ExamReviewSubject,
)


SUBJECT_ITEM_TEMPLATES = {
    ExamReviewSubject.MATH: (
        {"question": "Solve for x in the equation: 3x + 7 = 22.", "options": ["x = 3", "x = 4", "x = 5", "x = 6"], "expected": "x = 5", "alternate": "x = 4", "seconds": 45},
        {"question": "What is the derivative of f(x) = 3x² + 5x?", "options": ["6x + 5", "3x + 5", "6x", "5x"], "expected": "6x + 5", "alternate": "3x + 5", "seconds": 120},
        {"question": "In a right triangle, if the adjacent side is 3 and the opposite side is 4, what is the hypotenuse?", "options": ["5", "6", "7", "8"], "expected": "5", "alternate": "6", "seconds": 30},
        {"question": "Calculate the value of log₂(64).", "options": ["4", "5", "6", "8"], "expected": "6", "alternate": "5", "seconds": 95},
        {
            "question": "Show the step-by-step solution to find the area bounded by the curve y = x² and the x-axis from x = 0 to x = 3.",
            "expected": "Set up and evaluate the definite integral ∫₀³x² dx to obtain 9 square units.",
            "response": "Candidate Signature: _________________\n\nTo find the area bounded by y = x² from x = 0 to x = 3, we perform definite integration of the function with respect to x:\n\nArea = ∫(x²) dx evaluated from 0 to 3\nArea = [x³ / 3] evaluated from 0 to 3\nArea = (3³ / 3) - (0³ / 3)\nArea = 27 / 3 - 0\nArea = 9 square units.\n\nHence, the total area bounded under the curve is exactly 9 square units. My step-by-step evaluation matches the physical limit definitions.",
            "seconds": 240,
            "rubric": "Mathematical formulation (4pts), algebraic accuracy (4pts), final integration (2pts)",
            "ai_score": 9,
            "word_count": 89,
            "submitted_at": datetime(2026, 5, 7, 19, 0, tzinfo=ZoneInfo("Asia/Manila")),
        },
    ),
    ExamReviewSubject.ENGLISH: (
        {"question": "Choose the verb in the sentence: The scholars analyze the results.", "options": ["scholars", "analyze", "the", "results"], "expected": "analyze", "alternate": "scholars", "seconds": 38},
        {"question": "Which word is a synonym for concise?", "options": ["brief", "distant", "uncertain", "elaborate"], "expected": "brief", "alternate": "distant", "seconds": 42},
        {"question": "Identify the subject in: The new policy supports learners.", "options": ["The new policy", "supports", "learners", "new"], "expected": "The new policy", "alternate": "learners", "seconds": 51},
        {"question": "What is the main purpose of a thesis statement?", "options": ["To state the central claim", "To list every source", "To repeat the title", "To define every word"], "expected": "To state the central claim", "alternate": "To list every source", "seconds": 70},
        {"question": "Explain how context clues help a reader understand an unfamiliar word.", "expected": "Nearby words and ideas provide evidence for inferring the unfamiliar word's meaning.", "response": "A reader can examine definitions, examples, contrasts, and related ideas around an unfamiliar word to infer its likely meaning before consulting a dictionary.", "seconds": 185, "rubric": "Identifies surrounding evidence (4pts), explains inference (4pts), clarity (2pts)", "ai_score": 8},
    ),
    ExamReviewSubject.FILIPINO: (
        {"question": "Ano ang kasingkahulugan ng salitang 'masaya'?", "options": ["maligaya", "malungkot", "mabagal", "matahimik"], "expected": "maligaya", "alternate": "malungkot", "seconds": 35},
        {"question": "Alin ang pang-uri sa pangungusap: Masipag ang mag-aaral.", "options": ["Masipag", "ang", "mag-aaral", "pangungusap"], "expected": "Masipag", "alternate": "mag-aaral", "seconds": 44},
        {"question": "Ano ang salitang-ugat ng 'pinag-aralan'?", "options": ["aral", "paaralan", "pinag", "aralan"], "expected": "aral", "alternate": "paaralan", "seconds": 48},
        {"question": "Ano ang pangunahing layunin ng buod?", "options": ["Ilahad ang mahahalagang ideya nang maikli", "Dagdagan ang lahat ng detalye", "Baguhin ang paksa", "Magbigay ng bagong tauhan"], "expected": "Ilahad ang mahahalagang ideya nang maikli", "alternate": "Dagdagan ang lahat ng detalye", "seconds": 76},
        {"question": "Ipaliwanag kung paano natutukoy ang pangunahing ideya ng isang talata.", "expected": "Sinusuri ang paksa at ang mga detalyeng paulit-ulit na sumusuporta rito.", "response": "Tinutukoy muna ang paksa, saka sinusuri ang mga detalyeng magkakaugnay at paulit-ulit na sumusuporta sa pinakamahalagang mensahe ng talata.", "seconds": 170, "rubric": "Pagkilala sa paksa (4pts), paggamit ng detalye (4pts), linaw (2pts)", "ai_score": 8},
    ),
    ExamReviewSubject.SCIENCE: (
        {"question": "Which organelle is responsible for photosynthesis?", "options": ["Chloroplast", "Mitochondrion", "Nucleus", "Ribosome"], "expected": "Chloroplast", "alternate": "Mitochondrion", "seconds": 32},
        {"question": "What force pulls objects toward Earth?", "options": ["Gravity", "Magnetism", "Friction", "Tension"], "expected": "Gravity", "alternate": "Magnetism", "seconds": 29},
        {"question": "What is the chemical symbol for oxygen?", "options": ["O", "Ox", "Og", "On"], "expected": "O", "alternate": "Ox", "seconds": 25},
        {"question": "What process changes liquid water into water vapor?", "options": ["Evaporation", "Condensation", "Freezing", "Melting"], "expected": "Evaporation", "alternate": "Condensation", "seconds": 41},
        {"question": "Explain why a controlled variable is important in an experiment.", "expected": "It keeps other conditions constant so the tested variable can be evaluated fairly.", "response": "Controlled variables keep other conditions the same, allowing observed changes to be attributed to the independent variable instead of another factor.", "seconds": 160, "rubric": "Defines controlled variables (4pts), links to fair testing (4pts), clarity (2pts)", "ai_score": 9},
    ),
}


SEED_ROWS = (
    {
        "candidate_id": "PS-DEMO-0001",
        "first_name": "Demo",
        "last_name": "Candidate 001",
        "attempt_code": "DEMO-ATTEMPT-001",
        "submitted_at": datetime(2026, 8, 1, 9, 15, tzinfo=ZoneInfo("Asia/Manila")),
        "status": ExamReviewStatus.SUBMITTED,
        "total_score": 76,
        "system_initial_score": 68,
        "max_score": 120,
        "pending_subjective_items": 2,
    },
    {
        "candidate_id": "PS-DEMO-0002",
        "first_name": "Demo",
        "last_name": "Candidate 002",
        "attempt_code": "DEMO-ATTEMPT-002",
        "submitted_at": datetime(2026, 8, 1, 10, 30, tzinfo=ZoneInfo("Asia/Manila")),
        "status": ExamReviewStatus.GRADED,
        "total_score": 84,
        "system_initial_score": 76,
        "max_score": 120,
        "pending_subjective_items": 0,
    },
    {
        "candidate_id": "PS-DEMO-0003",
        "first_name": "Demo",
        "last_name": "Candidate 003",
        "attempt_code": "DEMO-ATTEMPT-003",
        "submitted_at": datetime(2026, 8, 2, 13, 45, tzinfo=ZoneInfo("Asia/Manila")),
        "status": ExamReviewStatus.FINALIZED,
        "total_score": 91,
        "system_initial_score": 78,
        "max_score": 120,
        "pending_subjective_items": 0,
    },
    {
        "candidate_id": "PS-DEMO-0004",
        "first_name": "Demo",
        "last_name": "Candidate 004",
        "attempt_code": "DEMO-ATTEMPT-004",
        "submitted_at": datetime(2026, 8, 2, 14, 20, tzinfo=ZoneInfo("Asia/Manila")),
        "status": ExamReviewStatus.SUBMITTED,
        "total_score": 72,
        "system_initial_score": 72,
        "max_score": 120,
        "pending_subjective_items": 3,
    },
    {
        "candidate_id": "PS-DEMO-0005",
        "first_name": "Demo",
        "last_name": "Candidate 005",
        "attempt_code": "DEMO-ATTEMPT-005",
        "submitted_at": datetime(2026, 8, 2, 15, 5, tzinfo=ZoneInfo("Asia/Manila")),
        "status": ExamReviewStatus.SUBMITTED,
        "total_score": 65,
        "system_initial_score": 65,
        "max_score": 120,
        "pending_subjective_items": 1,
    },
    {
        "candidate_id": "PS-DEMO-0006",
        "first_name": "Demo",
        "last_name": "Candidate 006",
        "attempt_code": "DEMO-ATTEMPT-006",
        "submitted_at": datetime(2026, 8, 3, 8, 40, tzinfo=ZoneInfo("Asia/Manila")),
        "status": ExamReviewStatus.SUBMITTED,
        "total_score": 79,
        "system_initial_score": 79,
        "max_score": 120,
        "pending_subjective_items": 2,
    },
    {
        "candidate_id": "PS-DEMO-0007",
        "first_name": "Demo",
        "last_name": "Candidate 007",
        "attempt_code": "DEMO-ATTEMPT-007",
        "submitted_at": datetime(2026, 8, 3, 11, 10, tzinfo=ZoneInfo("Asia/Manila")),
        "status": ExamReviewStatus.SUBMITTED,
        "total_score": 70,
        "system_initial_score": 70,
        "max_score": 120,
        "pending_subjective_items": 4,
    },
)


class Command(BaseCommand):
    help = "Create or update minimal synthetic Exam Review records for local development."

    @transaction.atomic
    def handle(self, *args, **options) -> None:
        created_count = 0
        updated_count = 0

        for row in SEED_ROWS:
            application, _ = StudentApplication.objects.update_or_create(
                candidate_id=row["candidate_id"],
                defaults={
                    "exam_cycle_id": "DEMO-2026",
                    "status": ApplicationStatus.APPROVED,
                    "submitted_at": row["submitted_at"],
                },
            )
            StudentApplicationPersonalInfo.objects.update_or_create(
                application=application,
                defaults={
                    "first_name": row["first_name"],
                    "last_name": row["last_name"],
                },
            )
            review, created = ExamReviewRecord.objects.update_or_create(
                attempt_code=row["attempt_code"],
                defaults={
                    "application": application,
                    "exam_set_code": "DEMO-SET-2026",
                    "submitted_at": row["submitted_at"],
                    "status": row["status"],
                    "total_score": row["total_score"],
                    "system_initial_score": row["system_initial_score"],
                    "max_score": row["max_score"],
                    "pending_subjective_items": row["pending_subjective_items"],
                },
            )
            if created:
                created_count += 1
            else:
                updated_count += 1

            self._seed_review_items(review=review, row=row)

        self.stdout.write(
            self.style.SUCCESS(
                f"Exam Review seed complete. Created: {created_count}. Updated: {updated_count}."
            )
        )

    def _seed_review_items(self, *, review: ExamReviewRecord, row: dict) -> None:
        candidate_number = int(row["candidate_id"].rsplit("-", 1)[-1])
        if candidate_number == 1:
            objective_scores = [5, 5, 5, 0] + self._allocate_points(
                total=row["system_initial_score"] - 15,
                item_count=12,
                max_per_item=5,
                rotation=3,
            )
        else:
            objective_scores = self._allocate_points(
                total=row["system_initial_score"],
                item_count=16,
                max_per_item=5,
                rotation=(candidate_number * 3) % 16,
            )
        pending_count = row["pending_subjective_items"]
        pending_subject_indexes = {
            (candidate_number + offset) % 4 for offset in range(pending_count)
        }
        reviewed_subject_indexes = [index for index in range(4) if index not in pending_subject_indexes]
        manual_scores = {index: 0 for index in range(4)}
        remaining_manual_score = row["total_score"] - row["system_initial_score"]
        for subject_index in reviewed_subject_indexes:
            awarded = min(10, remaining_manual_score)
            manual_scores[subject_index] = awarded
            remaining_manual_score -= awarded

        objective_index = 0
        position = 1
        review.review_items.all().delete()
        for subject_index, (subject, templates) in enumerate(SUBJECT_ITEM_TEMPLATES.items()):
            for item_number, template in enumerate(templates, start=1):
                is_subjective = not template.get("options")
                if is_subjective:
                    points_awarded = None if subject_index in pending_subject_indexes else manual_scores[subject_index]
                    student_answer = template["response"]
                    max_points = 10
                    item_type = ExamReviewItemType.SUBJECTIVE
                else:
                    points_awarded = objective_scores[objective_index]
                    objective_index += 1
                    student_answer = template["expected"] if points_awarded == 5 else template["alternate"]
                    max_points = 5
                    item_type = ExamReviewItemType.OBJECTIVE

                ExamReviewItem.objects.create(
                    review=review,
                    position=position,
                    subject=subject,
                    item_number=item_number,
                    item_type=item_type,
                    question_text=template["question"],
                    answer_options=template.get("options", []),
                    student_answer=student_answer,
                    expected_answer=template["expected"],
                    response_seconds=template["seconds"] + (candidate_number - 1) * 3,
                    rubric_text=template.get("rubric", ""),
                    ai_proposed_score=template.get("ai_score"),
                    word_count=template.get("word_count") or (len(student_answer.split()) if is_subjective else None),
                    response_submitted_at=template.get("submitted_at", row["submitted_at"]),
                    points_awarded=points_awarded,
                    max_points=max_points,
                )
                position += 1

    @staticmethod
    def _allocate_points(*, total: int, item_count: int, max_per_item: int, rotation: int) -> list[int]:
        scores = [0] * item_count
        order = list(range(item_count))
        order = order[rotation:] + order[:rotation]
        remaining = total
        for index in order:
            scores[index] = min(max_per_item, remaining)
            remaining -= scores[index]
            if remaining == 0:
                break
        return scores
