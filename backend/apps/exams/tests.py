import re

from django.contrib.auth import get_user_model
from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework.test import APIClient, APITestCase

from apps.accounts.models import AccountProfile
from apps.accounts.roles import PortalRole

from .models import AcademicYear, Agency, BlueprintCategory, BlueprintDifficultyDistribution, BlueprintQuestionTypeDistribution, BlueprintSection, BlueprintVersion, ExamBlueprint, ExamSet, ExamSetStatus, ExamType, Question, QuestionChoice, QuestionStatus, QuestionType, Subject, Topic, Competency
from .services import ExamSetLifecycleConflict, create_or_update_exam_set, transition_exam_set


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

    def create_profile(self, username: str, role: str) -> tuple[object, AccountProfile]:
        User = get_user_model()
        user = User.objects.create_user(
            username=username,
            email=f"{username}@example.test",
            password="Password1!",
        )
        profile = AccountProfile.objects.create(user=user, role=role)
        return user, profile

    def authenticate_as(self, user) -> None:
        self.client.force_authenticate(user=user)

    def create_blueprint(self, payload: dict | None = None) -> str:
        created = self.client.post(reverse("exams:blueprint_list"), payload or self.payload, format="json")
        self.assertEqual(created.status_code, 201)
        return created.data["id"]

    def transition_blueprint(self, blueprint_id: str, status: str, remarks: str = "workflow transition"):
        return self.client.post(
            reverse("exams:blueprint_transition", kwargs={"blueprint_id": blueprint_id}),
            {"status": status, "remarks": remarks},
            format="json",
        )

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

    def test_blueprint_forward_transitions_record_history(self) -> None:
        creator, _ = self.create_profile("blueprint_creator", PortalRole.ITEM_WRITER.value)
        reviewer, _ = self.create_profile("blueprint_reviewer", PortalRole.ACADEMIC_REVIEWER.value)

        self.authenticate_as(creator)
        blueprint_id = self.create_blueprint()

        submitted_response = self.transition_blueprint(blueprint_id, "submitted", "Ready for review")
        self.assertEqual(submitted_response.status_code, 200)
        self.assertEqual(submitted_response.data["status"], "SUBMITTED")
        self.assertEqual(submitted_response.data["history"][-1]["comments"], "Ready for review")

        self.authenticate_as(reviewer)
        academic_review_response = self.transition_blueprint(blueprint_id, "academic_review", "Queued for review")
        self.assertEqual(academic_review_response.status_code, 200)
        self.assertEqual(academic_review_response.data["status"], "ACADEMIC_REVIEW")

        approved_response = self.transition_blueprint(blueprint_id, "approved", "Approved by reviewer")
        self.assertEqual(approved_response.status_code, 200)
        self.assertEqual(approved_response.data["status"], "APPROVED")

        published_response = self.transition_blueprint(blueprint_id, "published", "Published for release")
        self.assertEqual(published_response.status_code, 200)
        self.assertEqual(published_response.data["status"], "PUBLISHED")
        self.assertGreaterEqual(len(published_response.data["history"]), 5)

    def test_blueprint_transition_rejects_malformed_status(self) -> None:
        blueprint_id = self.create_blueprint()

        response = self.transition_blueprint(blueprint_id, "not-a-status")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"]["code"], "VALIDATION_FAILED")
        self.assertIn("status", response.data["error"]["fields"])

    def test_blueprint_transition_rejects_user_without_required_role(self) -> None:
        blueprint_id = self.create_blueprint()
        reviewer, _ = self.create_profile("admissions_reviewer", PortalRole.ADMISSIONS_REVIEWER.value)
        self.authenticate_as(reviewer)

        response = self.transition_blueprint(blueprint_id, "submitted")
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data["error"]["code"], "PERMISSION_DENIED")

    def test_blueprint_transition_rejects_creator_self_approval(self) -> None:
        creator, _ = self.create_profile("blueprint_creator_self", PortalRole.ITEM_WRITER.value)
        reviewer, _ = self.create_profile("blueprint_reviewer_self", PortalRole.ACADEMIC_REVIEWER.value)

        self.authenticate_as(creator)
        blueprint_id = self.create_blueprint()
        self.transition_blueprint(blueprint_id, "submitted", "Submitted by creator")

        self.authenticate_as(reviewer)
        self.transition_blueprint(blueprint_id, "academic_review", "Moved to review")

        self.authenticate_as(creator)
        response = self.transition_blueprint(blueprint_id, "approved", "Creator cannot approve")
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data["error"]["code"], "PERMISSION_DENIED")

    def test_blueprint_transition_rejects_published_to_draft_and_preserves_state(self) -> None:
        creator, _ = self.create_profile("published_creator", PortalRole.ITEM_WRITER.value)
        reviewer, _ = self.create_profile("published_reviewer", PortalRole.ACADEMIC_REVIEWER.value)

        self.authenticate_as(creator)
        blueprint_id = self.create_blueprint()
        self.transition_blueprint(blueprint_id, "submitted", "Submitted")

        self.authenticate_as(reviewer)
        self.transition_blueprint(blueprint_id, "academic_review", "Under review")
        self.transition_blueprint(blueprint_id, "approved", "Approved")
        published_response = self.transition_blueprint(blueprint_id, "published", "Published")
        self.assertEqual(published_response.status_code, 200)

        conflict_response = self.transition_blueprint(blueprint_id, "draft", "Revert to draft")
        self.assertEqual(conflict_response.status_code, 409)
        self.assertEqual(conflict_response.data["error"]["code"], "INVALID_STATUS_TRANSITION")
        self.assertEqual(conflict_response.data["error"]["message"], "A published blueprint cannot be returned to draft.")
        self.assertEqual(conflict_response.data["error"]["fields"]["code"], "invalid_status_transition")
        self.assertEqual(conflict_response.data["error"]["fields"]["current_status"], "published")
        self.assertEqual(conflict_response.data["error"]["fields"]["requested_status"], "draft")

        latest = ExamBlueprint.objects.get(pk=blueprint_id)
        self.assertEqual(latest.versions.order_by("-version_number", "-created_at").first().status, "published")


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
            {"status": "ACADEMIC_REVIEW", "remarks": "Ready for review"},
            format="json",
        )
        self.assertEqual(transition_response.status_code, 200)
        self.assertEqual(transition_response.data["status"], "ACADEMIC_REVIEW")

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

    def test_rejects_invalid_lifecycle_transitions_and_locked_updates(self) -> None:
        created = self.client.post(reverse("exams:exam_set_list"), self.payload, format="json")
        exam_set_id = created.data["id"]
        transition_url = reverse("exams:exam_set_transition", kwargs={"exam_set_id": exam_set_id})
        detail_url = reverse("exams:exam_set_detail", kwargs={"exam_set_id": exam_set_id})

        direct_approval = self.client.post(transition_url, {"status": "APPROVED"}, format="json")
        self.assertEqual(direct_approval.status_code, 409)
        self.assertEqual(direct_approval.data["error"]["code"], "EXAM_SET_LIFECYCLE_CONFLICT")

        self.assertEqual(self.client.post(transition_url, {"status": "ACADEMIC_REVIEW"}, format="json").status_code, 200)
        self.assertEqual(self.client.post(transition_url, {"status": "PUBLISHED"}, format="json").status_code, 409)
        self.assertEqual(self.client.post(transition_url, {"status": "APPROVED"}, format="json").status_code, 200)

        locked_update = self.client.put(detail_url, {**self.payload, "title": "Changed after approval"}, format="json")
        self.assertEqual(locked_update.status_code, 409)

        self.assertEqual(self.client.post(transition_url, {"status": "PUBLISHED"}, format="json").status_code, 200)
        self.assertEqual(self.client.post(transition_url, {"status": "ARCHIVED"}, format="json").status_code, 200)
        self.assertEqual(self.client.post(transition_url, {"status": "DRAFT"}, format="json").status_code, 409)

    def test_rejects_submission_of_an_empty_exam_set(self) -> None:
        created = self.client.post(reverse("exams:exam_set_list"), {**self.payload, "items": []}, format="json")
        response = self.client.post(
            reverse("exams:exam_set_transition", kwargs={"exam_set_id": created.data["id"]}),
            {"status": "ACADEMIC_REVIEW"},
            format="json",
        )

        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data["error"]["code"], "EXAM_SET_VALIDATION_CONFLICT")

    def test_denies_unauthenticated_and_unapproved_roles(self) -> None:
        self.client.force_authenticate(user=None)
        self.assertEqual(self.client.get(reverse("exams:exam_set_list")).status_code, 401)

        User = get_user_model()
        university_user = User.objects.create_user(
            username="university_admin",
            email="university.admin@example.test",
            password="Password1!",
        )
        AccountProfile.objects.create(user=university_user, role=PortalRole.UNIVERSITY_ADMIN.value)
        self.client.force_authenticate(university_user)

        self.assertEqual(self.client.get(reverse("exams:exam_set_list")).status_code, 403)

    def test_creates_exam_set_for_a_genuinely_bearer_authenticated_user(self) -> None:
        """force_authenticate() attaches a real ORM User and bypasses PendingAwareBearerAuthentication
        entirely, so it cannot catch bugs specific to the real login-issued access token. This test
        drives the actual multi-step login flow to obtain a genuine bearer token."""

        real_client = APIClient()

        identifier_response = real_client.post(
            "/api/v1/auth/login/identifier/",
            {"identifier": self.user.email},
            format="json",
        )
        self.assertEqual(identifier_response.status_code, 202)

        password_response = real_client.post(
            "/api/v1/auth/login/password/",
            {"pendingAuthToken": identifier_response.data["pendingAuthToken"], "password": "Password1!"},
            format="json",
        )
        self.assertEqual(password_response.status_code, 202)

        code_match = re.search(r"\b(\d{6})\b", mail.outbox[-1].body)
        self.assertIsNotNone(code_match)

        otp_response = real_client.post(
            "/api/v1/auth/login/otp/",
            {"otpPendingAuthToken": password_response.data["otpPendingAuthToken"], "code": code_match.group(1)},
            format="json",
        )
        self.assertEqual(otp_response.status_code, 202)

        selfie_response = real_client.post(
            "/api/v1/auth/login/selfie/",
            {
                "selfiePendingAuthToken": otp_response.data["selfiePendingAuthToken"],
                "file": SimpleUploadedFile("selfie.jpg", b"selfie-image", content_type="image/jpeg"),
            },
        )
        self.assertEqual(selfie_response.status_code, 200)
        access_token = selfie_response.data["accessToken"]

        create_response = real_client.post(
            reverse("exams:exam_set_list"),
            self.payload,
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {access_token}",
        )
        self.assertEqual(create_response.status_code, 201)
        self.assertEqual(create_response.data["status"], "DRAFT")

    def test_rejects_invalid_item_references_without_replacing_existing_items(self) -> None:
        created = self.client.post(reverse("exams:exam_set_list"), self.payload, format="json")
        detail_url = reverse("exams:exam_set_detail", kwargs={"exam_set_id": created.data["id"]})

        unknown_question = self.client.put(
            detail_url,
            {**self.payload, "title": "Must roll back", "items": [{"question_id": 999999, "display_order": 1}]},
            format="json",
        )
        self.assertEqual(unknown_question.status_code, 400)
        self.assertEqual(unknown_question.data["error"]["code"], "VALIDATION_FAILED")

        duplicate_question = self.client.put(
            detail_url,
            {
                **self.payload,
                "items": [
                    {"question_id": self.question.id, "display_order": 1},
                    {"question_id": self.question.id, "display_order": 2},
                ],
            },
            format="json",
        )
        self.assertEqual(duplicate_question.status_code, 400)

        other_version = BlueprintVersion.objects.create(
            blueprint=self.blueprint,
            version_number="2.00",
            name="Another synthetic Blueprint Version",
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
        foreign_section = BlueprintSection.objects.create(
            blueprint_version=other_version,
            section_number=1,
            section_name="Foreign synthetic section",
            subject=self.subject,
            item_count=1,
            total_marks="5.00",
            passing_score="3.00",
            time_limit_minutes=10,
            display_order=1,
        )
        cross_version_section = self.client.put(
            detail_url,
            {
                **self.payload,
                "items": [{
                    "question_id": self.question.id,
                    "blueprint_section_id": foreign_section.id,
                    "display_order": 1,
                }],
            },
            format="json",
        )
        self.assertEqual(cross_version_section.status_code, 400)

        preserved = self.client.get(detail_url)
        self.assertEqual(preserved.data["title"], self.payload["title"])
        self.assertEqual([item["question"]["id"] for item in preserved.data["items"]], [str(self.question.id)])

    def test_rejects_unknown_blueprint_and_academic_year_with_safe_validation_errors(self) -> None:
        unknown_blueprint = self.client.post(
            reverse("exams:exam_set_list"),
            {**self.payload, "blueprint_version_id": 999999},
            format="json",
        )
        self.assertEqual(unknown_blueprint.status_code, 400)
        self.assertEqual(unknown_blueprint.data["error"]["code"], "VALIDATION_FAILED")

        unknown_academic_year = self.client.post(
            reverse("exams:exam_set_list"),
            {**self.payload, "academic_year_id": 999999},
            format="json",
        )
        self.assertEqual(unknown_academic_year.status_code, 400)
        self.assertEqual(unknown_academic_year.data["error"]["code"], "VALIDATION_FAILED")

    def test_updates_academic_year_by_name_and_rejects_unknown_or_conflicting_references(self) -> None:
        created = self.client.post(reverse("exams:exam_set_list"), self.payload, format="json")
        detail_url = reverse("exams:exam_set_detail", kwargs={"exam_set_id": created.data["id"]})
        next_year = AcademicYear.objects.create(name="2027-2028")
        by_name_payload = {**self.payload, "academic_year": next_year.name}
        by_name_payload.pop("academic_year_id")

        changed = self.client.put(detail_url, by_name_payload, format="json")
        self.assertEqual(changed.status_code, 200)
        self.assertEqual(changed.data["academic_year"], next_year.name)

        unknown_name = self.client.put(
            detail_url,
            {**by_name_payload, "academic_year": "2099-2100"},
            format="json",
        )
        self.assertEqual(unknown_name.status_code, 400)
        self.assertEqual(unknown_name.data["error"]["code"], "VALIDATION_FAILED")

        conflicting = self.client.put(
            detail_url,
            {**self.payload, "academic_year": next_year.name},
            format="json",
        )
        self.assertEqual(conflicting.status_code, 400)

        invalid_id_with_valid_name = self.client.put(
            detail_url,
            {**self.payload, "academic_year_id": 999999, "academic_year": next_year.name},
            format="json",
        )
        self.assertEqual(invalid_id_with_valid_name.status_code, 400)

    def test_stale_instances_cannot_overwrite_or_bypass_the_current_lifecycle(self) -> None:
        created = self.client.post(reverse("exams:exam_set_list"), self.payload, format="json")
        stale_exam_set = ExamSet.objects.get(pk=created.data["id"])
        ExamSet.objects.filter(pk=stale_exam_set.pk).update(status=ExamSetStatus.ACADEMIC_REVIEW)

        with self.assertRaises(ExamSetLifecycleConflict):
            create_or_update_exam_set(
                payload={**self.payload, "title": "Stale overwrite"},
                actor_profile=self.profile,
                exam_set=stale_exam_set,
            )

        transitioned = transition_exam_set(
            exam_set=stale_exam_set,
            target_status=ExamSetStatus.APPROVED,
            actor_profile=self.profile,
        )
        self.assertEqual(transitioned.status, ExamSetStatus.APPROVED)
        self.assertEqual(ExamSet.objects.get(pk=stale_exam_set.pk).status, ExamSetStatus.APPROVED)

    def test_publishing_sets_a_deterministic_content_hash(self) -> None:
        created = self.client.post(reverse("exams:exam_set_list"), self.payload, format="json")
        exam_set_id = created.data["id"]
        self.assertIsNone(created.data["published_hash"])
        transition_url = reverse("exams:exam_set_transition", kwargs={"exam_set_id": exam_set_id})

        self.client.post(transition_url, {"status": "ACADEMIC_REVIEW"}, format="json")
        approved = self.client.post(transition_url, {"status": "APPROVED"}, format="json")
        self.assertIsNone(approved.data["published_hash"])

        published = self.client.post(transition_url, {"status": "PUBLISHED"}, format="json")
        self.assertIsNotNone(published.data["published_hash"])
        self.assertEqual(len(published.data["published_hash"]), 64)

        refetched = self.client.get(reverse("exams:exam_set_detail", kwargs={"exam_set_id": exam_set_id}))
        self.assertEqual(refetched.data["published_hash"], published.data["published_hash"])

        archived = self.client.post(transition_url, {"status": "ARCHIVED"}, format="json")
        self.assertEqual(archived.data["published_hash"], published.data["published_hash"])

        other_question = Question.objects.create(
            question_code="Q-SCI-002",
            question_type=self.question_type,
            subject=self.subject,
            topic=self.topic,
            competency=self.competency,
            difficulty="moderate",
            question_text="Which propulsion system offers continuous low thrust over long durations?",
            explanation="Ion propulsion sustains low thrust for extended missions.",
            points="5.00",
            status=QuestionStatus.APPROVED,
            created_by=self.profile,
            approved_by=self.profile,
        )
        other_payload = {
            **self.payload,
            "items": [
                {
                    "question_id": other_question.id,
                    "display_order": 1,
                    "points": 5,
                    "selection_method": "manual",
                }
            ],
        }
        other_created = self.client.post(reverse("exams:exam_set_list"), other_payload, format="json")
        other_transition_url = reverse(
            "exams:exam_set_transition", kwargs={"exam_set_id": other_created.data["id"]}
        )
        self.client.post(other_transition_url, {"status": "ACADEMIC_REVIEW"}, format="json")
        self.client.post(other_transition_url, {"status": "APPROVED"}, format="json")
        other_published = self.client.post(other_transition_url, {"status": "PUBLISHED"}, format="json")

        self.assertIsNotNone(other_published.data["published_hash"])
        self.assertNotEqual(other_published.data["published_hash"], published.data["published_hash"])

    def test_validation_checklist_covers_section_difficulty_and_marks_compliance(self) -> None:
        section = BlueprintSection.objects.create(
            blueprint_version=self.blueprint_version,
            section_number=1,
            section_name="Science",
            subject=self.subject,
            item_count=2,
            total_marks="10.00",
            passing_score="5.00",
            time_limit_minutes=30,
            display_order=1,
        )
        BlueprintDifficultyDistribution.objects.create(blueprint_section=section, difficulty="easy", required_item_count=1)
        BlueprintDifficultyDistribution.objects.create(blueprint_section=section, difficulty="moderate", required_item_count=1)
        BlueprintQuestionTypeDistribution.objects.create(blueprint_section=section, question_type=self.question_type, required_item_count=1)

        created = self.client.post(reverse("exams:exam_set_list"), {
            **self.payload,
            "items": [{"question_id": self.question.id, "blueprint_section_id": section.id, "display_order": 1, "points": 5}],
        }, format="json")

        codes = {result["validation_code"]: result for result in created.data["validation_results"]}
        self.assertEqual(codes[f"section_item_count_{section.id}"]["result"], "warning")
        self.assertEqual(codes[f"section_difficulty_{section.id}_easy"]["result"], "passed")
        self.assertEqual(codes[f"section_difficulty_{section.id}_moderate"]["result"], "warning")
        self.assertEqual(codes[f"section_question_type_{section.id}_{self.question_type.id}"]["result"], "passed")
        self.assertEqual(codes["marks_compliance"]["result"], "warning")

    def test_updating_items_records_add_remove_and_replace_audit_entries(self) -> None:
        second_question = Question.objects.create(
            question_code="Q-SCI-002", question_type=self.question_type, subject=self.subject, topic=self.topic,
            competency=self.competency, difficulty="moderate", question_text="Second question.", points="5.00",
            status=QuestionStatus.APPROVED, created_by=self.profile, approved_by=self.profile,
        )
        third_question = Question.objects.create(
            question_code="Q-SCI-003", question_type=self.question_type, subject=self.subject, topic=self.topic,
            competency=self.competency, difficulty="difficult", question_text="Third question.", points="5.00",
            status=QuestionStatus.APPROVED, created_by=self.profile, approved_by=self.profile,
        )
        created = self.client.post(reverse("exams:exam_set_list"), self.payload, format="json")
        exam_set_id = created.data["id"]
        detail_url = reverse("exams:exam_set_detail", kwargs={"exam_set_id": exam_set_id})

        added = self.client.put(detail_url, {
            **self.payload,
            "items": [
                {"question_id": self.question.id, "display_order": 1, "points": 5},
                {"question_id": second_question.id, "display_order": 2, "points": 5},
            ],
        }, format="json")
        self.assertEqual(added.status_code, 200)
        self.assertIn("Added question Q-SCI-002", [entry["action"] for entry in added.data["workflow_history"]])

        replaced = self.client.put(detail_url, {
            **self.payload,
            "items": [
                {"question_id": self.question.id, "display_order": 1, "points": 5},
                {"question_id": third_question.id, "display_order": 2, "points": 5},
            ],
        }, format="json")
        self.assertEqual(replaced.status_code, 200)
        self.assertIn("Replaced question Q-SCI-002 with Q-SCI-003", [entry["action"] for entry in replaced.data["workflow_history"]])

        removed = self.client.put(detail_url, {
            **self.payload,
            "items": [{"question_id": self.question.id, "display_order": 1, "points": 5}],
        }, format="json")
        self.assertEqual(removed.status_code, 200)
        self.assertIn("Removed question Q-SCI-003", [entry["action"] for entry in removed.data["workflow_history"]])

    def test_auto_assemble_selects_items_per_section_and_records_assembly_run(self) -> None:
        section = BlueprintSection.objects.create(
            blueprint_version=self.blueprint_version, section_number=1, section_name="Science",
            subject=self.subject, item_count=2, total_marks="10.00", passing_score="5.00",
            time_limit_minutes=30, display_order=1,
        )
        BlueprintDifficultyDistribution.objects.create(blueprint_section=section, difficulty="easy", required_item_count=1)
        BlueprintDifficultyDistribution.objects.create(blueprint_section=section, difficulty="moderate", required_item_count=1)

        second_question = Question.objects.create(
            question_code="Q-SCI-002", question_type=self.question_type, subject=self.subject, topic=self.topic,
            competency=self.competency, difficulty="moderate", question_text="Second question.", points="5.00",
            status=QuestionStatus.APPROVED, created_by=self.profile, approved_by=self.profile,
        )

        created = self.client.post(reverse("exams:exam_set_list"), {**self.payload, "items": []}, format="json")
        exam_set_id = created.data["id"]

        response = self.client.post(reverse("exams:exam_set_auto_assemble", kwargs={"exam_set_id": exam_set_id}))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["items"]), 2)
        self.assertEqual(
            {item["question"]["id"] for item in response.data["items"]},
            {str(self.question.id), str(second_question.id)},
        )
        self.assertEqual(len(response.data["assembly_runs"]), 1)
        self.assertEqual(response.data["assembly_runs"][0]["selected_item_count"], 2)
        self.assertEqual(response.data["assembly_runs"][0]["status"], "completed")
        self.assertIn("Auto-assembled 2 items", [entry["action"] for entry in response.data["workflow_history"]])

    def test_auto_assemble_records_shortfall_when_pool_is_insufficient(self) -> None:
        section = BlueprintSection.objects.create(
            blueprint_version=self.blueprint_version, section_number=1, section_name="Science",
            subject=self.subject, item_count=5, total_marks="25.00", passing_score="10.00",
            time_limit_minutes=30, display_order=1,
        )
        BlueprintDifficultyDistribution.objects.create(blueprint_section=section, difficulty="easy", required_item_count=1)

        created = self.client.post(reverse("exams:exam_set_list"), {**self.payload, "items": []}, format="json")
        exam_set_id = created.data["id"]

        response = self.client.post(reverse("exams:exam_set_auto_assemble", kwargs={"exam_set_id": exam_set_id}))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["items"]), 1)
        self.assertEqual(response.data["assembly_runs"][0]["status"], "completed_with_shortfall")
        self.assertEqual(response.data["assembly_runs"][0]["rejected_item_count"], 4)

    def test_auto_assemble_rejects_non_editable_exam_sets(self) -> None:
        created = self.client.post(reverse("exams:exam_set_list"), self.payload, format="json")
        exam_set_id = created.data["id"]
        transition_url = reverse("exams:exam_set_transition", kwargs={"exam_set_id": exam_set_id})
        self.client.post(transition_url, {"status": "ACADEMIC_REVIEW"}, format="json")

        response = self.client.post(reverse("exams:exam_set_auto_assemble", kwargs={"exam_set_id": exam_set_id}))
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data["error"]["code"], "EXAM_SET_LIFECYCLE_CONFLICT")

    def test_auto_assemble_denies_unauthenticated_and_unapproved_roles(self) -> None:
        created = self.client.post(reverse("exams:exam_set_list"), self.payload, format="json")
        exam_set_id = created.data["id"]
        auto_assemble_url = reverse("exams:exam_set_auto_assemble", kwargs={"exam_set_id": exam_set_id})

        self.client.force_authenticate(user=None)
        self.assertEqual(self.client.post(auto_assemble_url).status_code, 401)

        User = get_user_model()
        university_user = User.objects.create_user(
            username="auto_assemble_denied_user", email="auto.assemble.denied@example.test", password="Password1!",
        )
        AccountProfile.objects.create(user=university_user, role=PortalRole.UNIVERSITY_ADMIN.value)
        self.client.force_authenticate(university_user)
        self.assertEqual(self.client.post(auto_assemble_url).status_code, 403)


class SubjectAdminApiTests(APITestCase):
    def setUp(self) -> None:
        self.client = APIClient()
        User = get_user_model()
        self.user = User.objects.create_superuser(
            username="blueprint_maintenance_admin",
            email="blueprint.maintenance.admin@example.test",
            password="Password1!",
        )
        self.profile = AccountProfile.objects.get_or_create(user=self.user, defaults={"role": PortalRole.SYSTEM_ADMIN.value})[0]
        self.client.force_authenticate(self.user)

    def test_create_list_and_update_subject(self) -> None:
        create_response = self.client.post(
            reverse("exams:subject_list"),
            {"code": "SCI", "name": "Science", "description": "Physical and life sciences"},
            format="json",
        )
        self.assertEqual(create_response.status_code, 201)
        self.assertEqual(create_response.data["code"], "SCI")
        self.assertTrue(create_response.data["isActive"])

        list_response = self.client.get(reverse("exams:subject_list"))
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.data), 1)

        subject_id = create_response.data["id"]
        update_response = self.client.patch(
            reverse("exams:subject_detail", kwargs={"subject_id": subject_id}),
            {"is_active": False},
            format="json",
        )
        self.assertEqual(update_response.status_code, 200)
        self.assertFalse(update_response.data["isActive"])
        self.assertEqual(update_response.data["code"], "SCI")

    def test_rejects_duplicate_subject_code(self) -> None:
        Subject.objects.create(code="SCI", name="Science")
        response = self.client.post(
            reverse("exams:subject_list"),
            {"code": "SCI", "name": "Science Again"},
            format="json",
        )
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data["error"]["code"], "CONFLICT")

    def test_rejects_missing_required_fields_with_400(self) -> None:
        missing_code = self.client.post(
            reverse("exams:subject_list"),
            {"name": "Science"},
            format="json",
        )
        self.assertEqual(missing_code.status_code, 400)

        missing_name = self.client.post(
            reverse("exams:subject_list"),
            {"code": "SCI"},
            format="json",
        )
        self.assertEqual(missing_name.status_code, 400)

    def test_denies_unauthenticated_and_unapproved_roles(self) -> None:
        self.client.force_authenticate(user=None)
        self.assertEqual(self.client.get(reverse("exams:subject_list")).status_code, 401)

        User = get_user_model()
        university_user = User.objects.create_user(
            username="subject_denied_user",
            email="subject.denied@example.test",
            password="Password1!",
        )
        AccountProfile.objects.create(user=university_user, role=PortalRole.UNIVERSITY_ADMIN.value)
        self.client.force_authenticate(university_user)
        self.assertEqual(self.client.get(reverse("exams:subject_list")).status_code, 403)

    def test_creates_subject_for_a_genuinely_bearer_authenticated_user(self) -> None:
        real_client = APIClient()

        identifier_response = real_client.post(
            "/api/v1/auth/login/identifier/",
            {"identifier": self.user.email},
            format="json",
        )
        self.assertEqual(identifier_response.status_code, 202)

        password_response = real_client.post(
            "/api/v1/auth/login/password/",
            {"pendingAuthToken": identifier_response.data["pendingAuthToken"], "password": "Password1!"},
            format="json",
        )
        self.assertEqual(password_response.status_code, 202)

        code_match = re.search(r"\b(\d{6})\b", mail.outbox[-1].body)
        self.assertIsNotNone(code_match)

        otp_response = real_client.post(
            "/api/v1/auth/login/otp/",
            {"otpPendingAuthToken": password_response.data["otpPendingAuthToken"], "code": code_match.group(1)},
            format="json",
        )
        self.assertEqual(otp_response.status_code, 202)

        selfie_response = real_client.post(
            "/api/v1/auth/login/selfie/",
            {
                "selfiePendingAuthToken": otp_response.data["selfiePendingAuthToken"],
                "file": SimpleUploadedFile("selfie.jpg", b"selfie-image", content_type="image/jpeg"),
            },
        )
        self.assertEqual(selfie_response.status_code, 200)
        access_token = selfie_response.data["accessToken"]

        create_response = real_client.post(
            reverse("exams:subject_list"),
            {"code": "MATH", "name": "Mathematics"},
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {access_token}",
        )
        self.assertEqual(create_response.status_code, 201)


class QuestionTypeAdminApiTests(APITestCase):
    def setUp(self) -> None:
        self.client = APIClient()
        User = get_user_model()
        self.user = User.objects.create_superuser(
            username="question_type_maintenance_admin",
            email="question.type.maintenance.admin@example.test",
            password="Password1!",
        )
        self.profile = AccountProfile.objects.get_or_create(user=self.user, defaults={"role": PortalRole.SYSTEM_ADMIN.value})[0]
        self.client.force_authenticate(self.user)

    def test_create_list_and_update_question_type(self) -> None:
        create_response = self.client.post(
            reverse("exams:question_type_list"),
            {"code": "MCQ", "name": "Multiple Choice"},
            format="json",
        )
        self.assertEqual(create_response.status_code, 201)
        self.assertEqual(create_response.data["code"], "MCQ")
        self.assertTrue(create_response.data["isActive"])

        list_response = self.client.get(reverse("exams:question_type_list"))
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.data), 1)

        question_type_id = create_response.data["id"]
        update_response = self.client.patch(
            reverse("exams:question_type_detail", kwargs={"question_type_id": question_type_id}),
            {"is_active": False},
            format="json",
        )
        self.assertEqual(update_response.status_code, 200)
        self.assertFalse(update_response.data["isActive"])

    def test_rejects_duplicate_question_type_code(self) -> None:
        QuestionType.objects.create(code="MCQ", name="Multiple Choice")
        response = self.client.post(
            reverse("exams:question_type_list"),
            {"code": "MCQ", "name": "Multiple Choice Again"},
            format="json",
        )
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data["error"]["code"], "CONFLICT")

    def test_rejects_missing_required_fields_with_400(self) -> None:
        missing_code = self.client.post(
            reverse("exams:question_type_list"),
            {"name": "Multiple Choice"},
            format="json",
        )
        self.assertEqual(missing_code.status_code, 400)

        missing_name = self.client.post(
            reverse("exams:question_type_list"),
            {"code": "MCQ"},
            format="json",
        )
        self.assertEqual(missing_name.status_code, 400)

    def test_denies_unauthenticated_and_unapproved_roles(self) -> None:
        self.client.force_authenticate(user=None)
        self.assertEqual(self.client.get(reverse("exams:question_type_list")).status_code, 401)

        User = get_user_model()
        university_user = User.objects.create_user(
            username="question_type_denied_user",
            email="question.type.denied@example.test",
            password="Password1!",
        )
        AccountProfile.objects.create(user=university_user, role=PortalRole.UNIVERSITY_ADMIN.value)
        self.client.force_authenticate(university_user)
        self.assertEqual(self.client.get(reverse("exams:question_type_list")).status_code, 403)

    def test_creates_question_type_for_a_genuinely_bearer_authenticated_user(self) -> None:
        real_client = APIClient()

        identifier_response = real_client.post(
            "/api/v1/auth/login/identifier/",
            {"identifier": self.user.email},
            format="json",
        )
        self.assertEqual(identifier_response.status_code, 202)

        password_response = real_client.post(
            "/api/v1/auth/login/password/",
            {"pendingAuthToken": identifier_response.data["pendingAuthToken"], "password": "Password1!"},
            format="json",
        )
        self.assertEqual(password_response.status_code, 202)

        code_match = re.search(r"\b(\d{6})\b", mail.outbox[-1].body)
        self.assertIsNotNone(code_match)

        otp_response = real_client.post(
            "/api/v1/auth/login/otp/",
            {"otpPendingAuthToken": password_response.data["otpPendingAuthToken"], "code": code_match.group(1)},
            format="json",
        )
        self.assertEqual(otp_response.status_code, 202)

        selfie_response = real_client.post(
            "/api/v1/auth/login/selfie/",
            {
                "selfiePendingAuthToken": otp_response.data["selfiePendingAuthToken"],
                "file": SimpleUploadedFile("selfie.jpg", b"selfie-image", content_type="image/jpeg"),
            },
        )
        self.assertEqual(selfie_response.status_code, 200)
        access_token = selfie_response.data["accessToken"]

        create_response = real_client.post(
            reverse("exams:question_type_list"),
            {"code": "ESSAY", "name": "Essay"},
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {access_token}",
        )
        self.assertEqual(create_response.status_code, 201)


class TopicAdminApiTests(APITestCase):
    def setUp(self) -> None:
        self.client = APIClient()
        User = get_user_model()
        self.user = User.objects.create_superuser(
            username="topic_maintenance_admin",
            email="topic.maintenance.admin@example.test",
            password="Password1!",
        )
        self.profile = AccountProfile.objects.get_or_create(user=self.user, defaults={"role": PortalRole.SYSTEM_ADMIN.value})[0]
        self.client.force_authenticate(self.user)
        self.subject = Subject.objects.create(code="SCI", name="Science")

    def test_create_list_and_update_topic(self) -> None:
        create_response = self.client.post(
            reverse("exams:topic_list"),
            {"subject_id": self.subject.id, "code": "ORBIT", "name": "Orbital Mechanics"},
            format="json",
        )
        self.assertEqual(create_response.status_code, 201)
        self.assertEqual(create_response.data["subjectCode"], "SCI")
        self.assertTrue(create_response.data["isActive"])

        list_response = self.client.get(reverse("exams:topic_list"))
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.data), 1)
        self.assertEqual(list_response.data[0]["subjectName"], "Science")

        topic_id = create_response.data["id"]
        update_response = self.client.patch(
            reverse("exams:topic_detail", kwargs={"topic_id": topic_id}),
            {"is_active": False},
            format="json",
        )
        self.assertEqual(update_response.status_code, 200)
        self.assertFalse(update_response.data["isActive"])

    def test_rejects_unknown_subject(self) -> None:
        response = self.client.post(
            reverse("exams:topic_list"),
            {"subject_id": 999999, "code": "ORBIT", "name": "Orbital Mechanics"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"]["code"], "VALIDATION_FAILED")
        self.assertIn("subject_id", response.data["error"]["fields"])

    def test_rejects_duplicate_topic_name_within_subject(self) -> None:
        Topic.objects.create(subject=self.subject, name="Orbital Mechanics")
        response = self.client.post(
            reverse("exams:topic_list"),
            {"subject_id": self.subject.id, "name": "Orbital Mechanics"},
            format="json",
        )
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data["error"]["code"], "CONFLICT")

    def test_denies_unauthenticated_and_unapproved_roles(self) -> None:
        self.client.force_authenticate(user=None)
        self.assertEqual(self.client.get(reverse("exams:topic_list")).status_code, 401)

        User = get_user_model()
        university_user = User.objects.create_user(
            username="topic_denied_user",
            email="topic.denied@example.test",
            password="Password1!",
        )
        AccountProfile.objects.create(user=university_user, role=PortalRole.UNIVERSITY_ADMIN.value)
        self.client.force_authenticate(university_user)
        self.assertEqual(self.client.get(reverse("exams:topic_list")).status_code, 403)

    def test_creates_topic_for_a_genuinely_bearer_authenticated_user(self) -> None:
        real_client = APIClient()

        identifier_response = real_client.post(
            "/api/v1/auth/login/identifier/",
            {"identifier": self.user.email},
            format="json",
        )
        self.assertEqual(identifier_response.status_code, 202)

        password_response = real_client.post(
            "/api/v1/auth/login/password/",
            {"pendingAuthToken": identifier_response.data["pendingAuthToken"], "password": "Password1!"},
            format="json",
        )
        self.assertEqual(password_response.status_code, 202)

        code_match = re.search(r"\b(\d{6})\b", mail.outbox[-1].body)
        self.assertIsNotNone(code_match)

        otp_response = real_client.post(
            "/api/v1/auth/login/otp/",
            {"otpPendingAuthToken": password_response.data["otpPendingAuthToken"], "code": code_match.group(1)},
            format="json",
        )
        self.assertEqual(otp_response.status_code, 202)

        selfie_response = real_client.post(
            "/api/v1/auth/login/selfie/",
            {
                "selfiePendingAuthToken": otp_response.data["selfiePendingAuthToken"],
                "file": SimpleUploadedFile("selfie.jpg", b"selfie-image", content_type="image/jpeg"),
            },
        )
        self.assertEqual(selfie_response.status_code, 200)
        access_token = selfie_response.data["accessToken"]

        create_response = real_client.post(
            reverse("exams:topic_list"),
            {"subject_id": self.subject.id, "name": "Thermodynamics"},
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {access_token}",
        )
        self.assertEqual(create_response.status_code, 201)
