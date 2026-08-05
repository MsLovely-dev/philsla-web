from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient, APITestCase

from apps.accounts.models import AccountProfile
from apps.accounts.roles import PortalRole

from .models import AcademicYear, Agency, BlueprintCategory, BlueprintVersion, ExamBlueprint, ExamSet, ExamType, Question, QuestionChoice, QuestionStatus, QuestionType, Subject, Topic, Competency


class ExamBlueprintApiTests(APITestCase):
    def setUp(self) -> None:
        self.client = APIClient()
        User = get_user_model()
        self.user = User.objects.create_superuser(
            username="system_admin",
            email="system.admin@example.test",
            password="Password1!",
        )
        AccountProfile.objects.get_or_create(user=self.user, defaults={"role": PortalRole.SYSTEM_ADMIN.value})
        self.client.force_authenticate(self.user)

        self.payload = {
            "code": "BP-2026-ADM-01",
            "name": "AY 2026 Admissions Exam Blueprint",
            "description": "Academic blueprint for admissions.",
            "exam_type": "Admission",
            "academic_year": "2026-2027",
            "institution": "Philippine Space Agency (PhilSA)",
            "exam_category": "General Academic & Science",
            "version": "1.0",
            "effective_date": "2026-06-15",
            "expiration_date": "2027-06-15",
            "rules": {
                "total_items": 2,
                "total_marks": 10,
                "total_time_limit": 20,
                "shared_stimulus_requirement": {
                    "required": False,
                    "min_count": 0,
                    "questions_per_stimulus": 0,
                },
                "randomization_rules": {
                    "shuffle_questions": True,
                    "shuffle_choices": True,
                    "fixed_sequence": False,
                },
                "max_reuse_limit": 3,
                "version_compatibility": ">= 1.0",
                "active_item_only": True,
            },
            "sections": [
                {
                    "name": "Section A: Reading Comprehension",
                    "subject": "Reading Comp (English, Filipino)",
                    "topics": ["Comprehension", "Theme Analysis"],
                    "competencies": ["Identify correct contextual elements"],
                    "cognitive_levels": {
                        "remembering": 1,
                        "understanding": 1,
                        "applying": 0,
                        "analyzing": 0,
                        "evaluating": 0,
                        "creating": 0,
                    },
                    "item_count": 2,
                    "marks_per_item": 5,
                    "total_marks": 10,
                    "passing_score": 6,
                    "time_allocation": 20,
                    "instructions": "Answer all items.",
                    "difficulty_distribution": {
                        "easy": 1,
                        "moderate": 1,
                        "difficult": 0,
                    },
                    "item_type_distribution": {
                        "mcq": 1,
                        "tf": 1,
                        "essay": 0,
                        "fib": 0,
                    },
                }
            ],
        }

    def test_create_and_list_blueprints(self) -> None:
        response = self.client.post(reverse("exams:blueprint_list"), self.payload, format="json")

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["code"], "BP-2026-ADM-01")
        self.assertEqual(response.data["status"], "DRAFT")
        self.assertEqual(response.data["sections"][0]["item_count"], 2)
        self.assertEqual(
            response.data["current_version_id"],
            str(BlueprintVersion.objects.get(blueprint_id=response.data["id"]).pk),
        )

        list_response = self.client.get(reverse("exams:blueprint_list"))
        self.assertEqual(list_response.status_code, 200)
        self.assertGreaterEqual(len(list_response.data), 1)
        self.assertEqual(list_response.data[0]["current_version_id"], response.data["current_version_id"])

    def test_transition_and_delete_draft_blueprint(self) -> None:
        created = self.client.post(reverse("exams:blueprint_list"), self.payload, format="json")
        blueprint_id = created.data["id"]

        transition_response = self.client.post(
            reverse("exams:blueprint_transition", kwargs={"blueprint_id": blueprint_id}),
            {"status": "PUBLISHED", "remarks": "Ready for release"},
            format="json",
        )
        self.assertEqual(transition_response.status_code, 200)
        self.assertEqual(transition_response.data["status"], "PUBLISHED")

        delete_response = self.client.delete(reverse("exams:blueprint_detail", kwargs={"blueprint_id": blueprint_id}))
        self.assertEqual(delete_response.status_code, 409)


class QuestionBankApiTests(APITestCase):
    def setUp(self) -> None:
        self.client = APIClient()
        User = get_user_model()
        self.user = User.objects.create_superuser(
            username="system_admin",
            email="system.admin@example.test",
            password="Password1!",
        )
        AccountProfile.objects.get_or_create(user=self.user, defaults={"role": PortalRole.SYSTEM_ADMIN.value})
        self.client.force_authenticate(self.user)

        self.payload = {
            "question_code": "Q-SCI-001",
            "question_type": "Multiple Choice",
            "subject": "Science",
            "topic": "Orbital Mechanics",
            "competency": "Evaluate orbital parameters for regional coverage",
            "difficulty": "MEDIUM",
            "question_text": "Which orbit is most suitable for continuous observation of a region?",
            "explanation": "A geostationary orbit remains over the same region.",
            "points": 5,
            "status": "draft",
            "choices": [
                {"option_label": "A", "option_text": "Geostationary orbit", "is_correct": True, "display_order": 1},
                {"option_label": "B", "option_text": "Polar orbit", "is_correct": False, "display_order": 2},
                {"option_label": "C", "option_text": "Elliptical orbit", "is_correct": False, "display_order": 3},
                {"option_label": "D", "option_text": "Transfer orbit", "is_correct": False, "display_order": 4},
            ],
            "answers": [
                {"answer_text": "Geostationary orbit", "is_case_sensitive": False, "is_primary_answer": True},
            ],
            "rubrics": [
                {"criterion": "Correct orbit selection", "description": "Chooses the right orbit type.", "maximum_points": 5, "display_order": 1},
            ],
            "tags": ["space science", "orbital mechanics"],
        }

    def test_create_list_and_transition_questions(self) -> None:
        response = self.client.post(reverse("exams:question_list"), self.payload, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["question_code"], "Q-SCI-001")
        self.assertEqual(response.data["status"], "DRAFT")
        self.assertEqual(len(response.data["choices"]), 4)
        self.assertEqual(response.data["choices"][0]["option_label"], "A")

        list_response = self.client.get(reverse("exams:question_list"))
        self.assertEqual(list_response.status_code, 200)
        self.assertGreaterEqual(len(list_response.data), 1)

        question_id = response.data["id"]
        transition_response = self.client.post(
            reverse("exams:question_transition", kwargs={"question_id": question_id}),
            {"status": "PENDING_REVIEW", "remarks": "Ready for review"},
            format="json",
        )
        self.assertEqual(transition_response.status_code, 200)
        self.assertEqual(transition_response.data["status"], "PENDING_REVIEW")


class ExamSetApiTests(APITestCase):
    def setUp(self) -> None:
        self.client = APIClient()
        User = get_user_model()
        self.user = User.objects.create_superuser(
            username="examset_admin",
            email="examset.admin@example.test",
            password="Password1!",
        )
        self.profile = AccountProfile.objects.get_or_create(user=self.user, defaults={"role": PortalRole.SYSTEM_ADMIN.value})[0]
        self.client.force_authenticate(self.user)

        self.agency = Agency.objects.create(code="PHILSA", name="PhilSA")
        self.category = BlueprintCategory.objects.create(name="Admissions", description="Admissions blueprint")
        self.academic_year = AcademicYear.objects.create(name="2026-2027")
        self.subject = Subject.objects.create(code="SCI", name="Science")
        self.topic = Topic.objects.create(subject=self.subject, code="ORBIT", name="Orbital Mechanics")
        self.competency = Competency.objects.create(topic=self.topic, code="ORBIT-01", name="Evaluate orbital parameters")
        self.question_type = QuestionType.objects.create(code="MCQ", name="Multiple Choice")

        self.blueprint = ExamBlueprint.objects.create(
            spec_code="BP-2026-SCI-01",
            exam_type="admission",
            agency=self.agency,
            category=self.category,
            created_by=self.profile,
        )
        self.blueprint_version = BlueprintVersion.objects.create(
            blueprint=self.blueprint,
            version_number="1.00",
            name="AY 2026 Admissions Exam Blueprint",
            academic_year=self.academic_year,
            status="approved",
            shuffle_questions=True,
            shuffle_choices=True,
            active_items_only=True,
            shared_stimulus_required=False,
            shared_stimulus_min_count=0,
            shared_stimulus_questions_per_stimulus=0,
            max_item_reuse_count=0,
            version_compatibility=">= 1.0",
            created_by=self.profile,
            approved_by=self.profile,
        )

        self.question = Question.objects.create(
            question_code="Q-SCI-001",
            question_type=self.question_type,
            subject=self.subject,
            topic=self.topic,
            competency=self.competency,
            difficulty="easy",
            question_text="Which orbit is most suitable for continuous observation?",
            explanation="Geostationary orbit stays above the same region.",
            points="5.00",
            status=QuestionStatus.APPROVED,
            created_by=self.profile,
            approved_by=self.profile,
        )
        QuestionChoice.objects.create(
            question=self.question,
            option_label="A",
            option_text="Geostationary orbit",
            is_correct=True,
            display_order=1,
        )

        self.payload = {
            "title": "National Space Science Fellowship - Form A",
            "academic_year_id": self.academic_year.id,
            "blueprint_version_id": self.blueprint_version.id,
            "exam_type": "admission",
            "duration_minutes": 60,
            "instructions": "Answer all questions carefully.",
            "items": [
                {
                    "question_id": self.question.id,
                    "display_order": 1,
                    "points": 5,
                    "selection_method": "manual",
                }
            ],
        }

    def test_create_list_clone_and_transition_exam_sets(self) -> None:
        create_response = self.client.post(reverse("exams:exam_set_list"), self.payload, format="json")
        self.assertEqual(create_response.status_code, 201)
        self.assertEqual(create_response.data["title"], "National Space Science Fellowship - Form A")
        self.assertEqual(create_response.data["status"], "DRAFT")
        self.assertEqual(len(create_response.data["items"]), 1)
        self.assertGreaterEqual(len(create_response.data["validation_results"]), 3)

        list_response = self.client.get(reverse("exams:exam_set_list"))
        self.assertEqual(list_response.status_code, 200)
        self.assertGreaterEqual(len(list_response.data), 1)

        exam_set_id = create_response.data["id"]

        transition_response = self.client.post(
            reverse("exams:exam_set_transition", kwargs={"exam_set_id": exam_set_id}),
            {"status": "APPROVED", "remarks": "Ready for publication"},
            format="json",
        )
        self.assertEqual(transition_response.status_code, 200)
        self.assertEqual(transition_response.data["status"], "APPROVED")

        clone_response = self.client.post(reverse("exams:exam_set_clone", kwargs={"exam_set_id": exam_set_id}))
        self.assertEqual(clone_response.status_code, 201)
        self.assertTrue(clone_response.data["exam_code"])
