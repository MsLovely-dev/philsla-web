# Exam Blueprint Maintenance Table Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `ExamBlueprintMaintenance.tsx` from a UI-only prototype into a real, backend-integrated maintenance table for Subject, Topic, and QuestionType catalog records.

**Architecture:** Additive-only backend admin endpoints in `apps/exams` (no new models/migrations — `Subject`, `Topic`, `QuestionType` already exist and already have `is_active`/`code`/`name`/`description`/`created_at`/`updated_at`), following that app's own flat, unpaginated, no-version-token view/serializer conventions rather than `apps/configuration`'s. Frontend gets a new typed service and a rewired component, following `UniversitiesListMaintenance.tsx`'s loading/empty/error pattern.

**Tech Stack:** Django REST Framework (backend), React + TypeScript + Vitest (frontend).

## Global Constraints

- No new models, fields, or migrations. `Subject`, `Topic`, `QuestionType` in `backend/apps/exams/models.py` are used as-is.
- No DELETE endpoint anywhere. Deactivation is `PATCH {"is_active": false}` only.
- No client-submitted version/concurrency token (no `expected_version`). Race safety comes from `select_for_update()` inside each service function, matching `apps/exams/services.py`'s existing pattern for `ExamSet`.
- Permissions: `require_roles(PortalRole.ITEM_WRITER, PortalRole.ACADEMIC_REVIEWER, PortalRole.EXAM_ADMINISTRATOR, PortalRole.SYSTEM_ADMIN)` on every endpoint, matching `BLUEPRINT_MANAGEMENT_ROLES`/`QUESTION_MANAGEMENT_ROLES` already in `apps/exams/views.py`.
- Every resource's test coverage must include at least one test that drives a real login to a real bearer token (not `force_authenticate()`), per `ExamSetApiTests.test_creates_exam_set_for_a_genuinely_bearer_authenticated_user` in the same file — `force_authenticate()` alone would have hidden the `_actor_profile()` P0 found during the Exam Sets rehearsal, and these new views also call `_actor_profile()`-adjacent authorization.
- No sensitive or real exam content anywhere in code, tests, or fixtures — Subject/Topic/QuestionType are catalog labels only.
- Topics is a flat resource. `subject_id` is a payload field, not a URL segment.

---

## Task 1: Subject admin API

**Files:**
- Create: `backend/apps/exams/audit.py`
- Modify: `backend/apps/exams/services.py` (add `subject_queryset`, `create_subject`, `update_subject`, `ExamBlueprintMaintenanceConflict`)
- Modify: `backend/apps/exams/serializers.py` (add `SubjectSerializer`, `SubjectInputSerializer`)
- Modify: `backend/apps/exams/views.py` (add `EXAM_BLUEPRINT_MAINTENANCE_ROLES`, `SubjectAdminListCreateView`, `SubjectAdminDetailView`)
- Modify: `backend/apps/exams/urls.py` (add subject routes)
- Modify: `backend/apps/exams/tests.py` (add `SubjectAdminApiTests`)

**Interfaces:**
- Produces: `apps.exams.audit.record_exam_blueprint_maintenance_event(*, event: str, outcome: str, request=None, user=None) -> None`
- Produces: `apps.exams.services.subject_queryset() -> QuerySet[Subject]`
- Produces: `apps.exams.services.create_subject(*, data: dict) -> Subject`
- Produces: `apps.exams.services.update_subject(*, subject_id: int, data: dict) -> Subject`
- Produces: `apps.exams.services.ExamBlueprintMaintenanceConflict` (APIException, status 409)
- Produces: `apps.exams.views.EXAM_BLUEPRINT_MAINTENANCE_ROLES` (role tuple, reused by Tasks 2 and 3)
- Produces: URL names `exams:subject_list`, `exams:subject_detail`

- [ ] **Step 1: Write the failing tests**

Add to `backend/apps/exams/tests.py` (near the other `APITestCase` classes, after imports already present at the top of the file):

```python
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
```

Note: `Subject`, `re`, `mail`, and `SimpleUploadedFile` are already imported at the top of `tests.py` from the earlier `ExamSetApiTests` real-bearer-auth test — no new imports needed for this file (verify this in Step 2; if `Subject` isn't already imported from `.models`, add it to the existing `from .models import (...)` line).

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && .venv/Scripts/python.exe manage.py test apps.exams.tests.SubjectAdminApiTests --settings=config.settings.test -v 2`
Expected: FAIL — `NoReverseMatch: Reverse for 'subject_list' not found` (the URL doesn't exist yet).

- [ ] **Step 3: Create the audit helper**

Create `backend/apps/exams/audit.py`:

```python
import logging


logger = logging.getLogger("philsa.audit")


def record_exam_blueprint_maintenance_event(*, event: str, outcome: str, request=None, user=None) -> None:
    logger.info(
        "exam_blueprint_maintenance_event",
        extra={
            "event": event,
            "outcome": outcome,
            "correlation_id": getattr(request, "correlation_id", None),
            "user_id": str(getattr(user, "id", "")),
        },
    )
```

- [ ] **Step 4: Add the service functions**

In `backend/apps/exams/services.py`, add near the top (after the existing imports, before `blueprint_queryset`):

```python
from django.db import IntegrityError


class ExamBlueprintMaintenanceConflict(APIException):
    status_code = 409
    default_code = "conflict"
    default_detail = "This record conflicts with an existing catalog entry."
```

Note: `APIException` is already imported in this file (`from rest_framework.exceptions import APIException, PermissionDenied, ValidationError`); only the `IntegrityError` import and the exception class are new.

Then add, near the bottom of the file (after the last existing function):

```python
def subject_queryset():
    return Subject.objects.all()


def create_subject(*, data: dict) -> Subject:
    subject = Subject(**data)
    try:
        with transaction.atomic():
            subject.full_clean()
            subject.save()
    except IntegrityError as exc:
        raise ExamBlueprintMaintenanceConflict("A subject with this code or name already exists.") from exc
    return subject


@transaction.atomic
def update_subject(*, subject_id: int, data: dict) -> Subject:
    subject = Subject.objects.select_for_update().get(pk=subject_id)
    for field_name, value in data.items():
        setattr(subject, field_name, value)
    try:
        subject.full_clean()
        subject.save()
    except IntegrityError as exc:
        raise ExamBlueprintMaintenanceConflict("A subject with this code or name already exists.") from exc
    return subject
```

`Subject` is already in this file's `from .models import (...)` block (along with `Topic` and `QuestionType`) — no import change needed in `services.py` for any of the three tasks in this plan.

- [ ] **Step 5: Add the serializers**

In `backend/apps/exams/serializers.py`, add `Subject` to the existing `from .models import (...)` block, and add `create_subject`, `update_subject` to the existing `from .services import (...)` block. Then add, after the last existing serializer class in the file:

```python
class SubjectSerializer(serializers.ModelSerializer):
    isActive = serializers.BooleanField(source="is_active", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = Subject
        fields = ("id", "code", "name", "description", "isActive", "createdAt", "updatedAt")


class SubjectInputSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=30, required=False)
    name = serializers.CharField(max_length=150, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    is_active = serializers.BooleanField(required=False)

    def validate_code(self, value: str) -> str:
        return value.strip().upper()

    def validate_name(self, value: str) -> str:
        return value.strip()

    def create(self, validated_data: dict) -> Subject:
        return create_subject(data=validated_data)

    def update(self, instance: Subject, validated_data: dict) -> Subject:
        return update_subject(subject_id=instance.pk, data=validated_data)
```

`SubjectInputSerializer` is a plain `Serializer`, not `ModelSerializer`, because create and update take different required fields (code/name required on create, all fields optional on update since `PATCH` is partial by default here — there's no separate `partial=True` flag needed because every field is already `required=False`, and `create()`'s caller is responsible for supplying `code`/`name`). This keeps one serializer working for both POST and PATCH/PUT, matching how `ExamBlueprintSerializer`'s `create`/`update` share one class.

- [ ] **Step 6: Add the views**

In `backend/apps/exams/views.py`, add near the top (with the other role constants, after `EXAM_SET_MANAGEMENT_ROLES`):

```python
EXAM_BLUEPRINT_MAINTENANCE_ROLES = require_roles(
    "ITEM_WRITER",
    "ACADEMIC_REVIEWER",
    "EXAM_ADMINISTRATOR",
    "SYSTEM_ADMIN",
)
```

Add `Subject` to the `from .models import (...)` block, `subject_queryset` to the `from .services import (...)` block, and `SubjectSerializer, SubjectInputSerializer` to the `from .serializers import (...)` block. Add `from .audit import record_exam_blueprint_maintenance_event` as a new import line. Then add, after the last existing view class:

```python
class SubjectAdminListCreateView(APIView):
    permission_classes = [RoleRequiredPermission]
    required_roles = EXAM_BLUEPRINT_MAINTENANCE_ROLES

    def get(self, request) -> Response:
        return Response(SubjectSerializer(subject_queryset(), many=True).data)

    def post(self, request) -> Response:
        serializer = SubjectInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        subject = serializer.save()
        record_exam_blueprint_maintenance_event(event="subject_created", outcome="success", request=request, user=request.user)
        return Response(SubjectSerializer(subject).data, status=201)


class SubjectAdminDetailView(APIView):
    permission_classes = [RoleRequiredPermission]
    required_roles = EXAM_BLUEPRINT_MAINTENANCE_ROLES

    def get_object(self, subject_id: int) -> Subject:
        return get_object_or_404(subject_queryset(), pk=subject_id)

    def get(self, request, subject_id: int) -> Response:
        return Response(SubjectSerializer(self.get_object(subject_id)).data)

    def put(self, request, subject_id: int) -> Response:
        subject = self.get_object(subject_id)
        serializer = SubjectInputSerializer(subject, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_subject = serializer.save()
        record_exam_blueprint_maintenance_event(event="subject_updated", outcome="success", request=request, user=request.user)
        return Response(SubjectSerializer(updated_subject).data)

    def patch(self, request, subject_id: int) -> Response:
        return self.put(request, subject_id)
```

- [ ] **Step 7: Add the URLs**

In `backend/apps/exams/urls.py`, add `SubjectAdminDetailView, SubjectAdminListCreateView` to the `from .views import (...)` block (alphabetical), and add to `urlpatterns` (after the `questions/` entries):

```python
    path("admin/subjects/", SubjectAdminListCreateView.as_view(), name="subject_list"),
    path("admin/subjects/<int:subject_id>/", SubjectAdminDetailView.as_view(), name="subject_detail"),
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `cd backend && .venv/Scripts/python.exe manage.py test apps.exams.tests.SubjectAdminApiTests --settings=config.settings.test -v 2`
Expected: PASS — 4 tests.

- [ ] **Step 9: Run the full exams suite to check for regressions**

Run: `cd backend && .venv/Scripts/python.exe manage.py test apps.exams.tests --settings=config.settings.test`
Expected: PASS — all prior tests plus the 4 new ones.

- [ ] **Step 10: Commit**

```bash
cd backend
git add apps/exams/audit.py apps/exams/services.py apps/exams/serializers.py apps/exams/views.py apps/exams/urls.py apps/exams/tests.py
git commit -m "feat(exam-blueprint-maintenance): add Subject admin API"
```

---

## Task 2: QuestionType admin API

**Files:**
- Modify: `backend/apps/exams/services.py` (add `question_type_queryset`, `create_question_type`, `update_question_type`)
- Modify: `backend/apps/exams/serializers.py` (add `QuestionTypeSerializer`, `QuestionTypeInputSerializer`)
- Modify: `backend/apps/exams/views.py` (add `QuestionTypeAdminListCreateView`, `QuestionTypeAdminDetailView`)
- Modify: `backend/apps/exams/urls.py` (add question-type routes)
- Modify: `backend/apps/exams/tests.py` (add `QuestionTypeAdminApiTests`)

**Interfaces:**
- Consumes: `EXAM_BLUEPRINT_MAINTENANCE_ROLES`, `ExamBlueprintMaintenanceConflict`, `record_exam_blueprint_maintenance_event` from Task 1
- Produces: `apps.exams.services.question_type_queryset() -> QuerySet[QuestionType]`
- Produces: `apps.exams.services.create_question_type(*, data: dict) -> QuestionType`
- Produces: `apps.exams.services.update_question_type(*, question_type_id: int, data: dict) -> QuestionType`
- Produces: URL names `exams:question_type_list`, `exams:question_type_detail`

This task is structurally identical to Task 1 with `QuestionType` substituted for `Subject` (same fields: `code`, `name`, `description`, `is_active`; same uniqueness constraints on `code` and `name`).

- [ ] **Step 1: Write the failing tests**

Add to `backend/apps/exams/tests.py`, mirroring `SubjectAdminApiTests` exactly but for `QuestionType`:

```python
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
```

`QuestionType` is already imported in `tests.py` (used by `ExamSetApiTests.setUp`) — no new import needed.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && .venv/Scripts/python.exe manage.py test apps.exams.tests.QuestionTypeAdminApiTests --settings=config.settings.test -v 2`
Expected: FAIL — `NoReverseMatch: Reverse for 'question_type_list' not found`.

- [ ] **Step 3: Add the service functions**

`QuestionType` is already imported in `services.py` (see Task 1, Step 4's note). In `backend/apps/exams/services.py`, add after `update_subject`:

```python
def question_type_queryset():
    return QuestionType.objects.all()


def create_question_type(*, data: dict) -> QuestionType:
    question_type = QuestionType(**data)
    try:
        with transaction.atomic():
            question_type.full_clean()
            question_type.save()
    except IntegrityError as exc:
        raise ExamBlueprintMaintenanceConflict("A question type with this code or name already exists.") from exc
    return question_type


@transaction.atomic
def update_question_type(*, question_type_id: int, data: dict) -> QuestionType:
    question_type = QuestionType.objects.select_for_update().get(pk=question_type_id)
    for field_name, value in data.items():
        setattr(question_type, field_name, value)
    try:
        question_type.full_clean()
        question_type.save()
    except IntegrityError as exc:
        raise ExamBlueprintMaintenanceConflict("A question type with this code or name already exists.") from exc
    return question_type
```

- [ ] **Step 4: Add the serializers**

`QuestionType` is not currently imported in `serializers.py` (verified while writing this plan — only `Question` is, not `QuestionType`). In `backend/apps/exams/serializers.py`, add `QuestionType` to the `from .models import (...)` block and `create_question_type, update_question_type` to the `from .services import (...)` block. Add, after `SubjectInputSerializer`:

```python
class QuestionTypeSerializer(serializers.ModelSerializer):
    isActive = serializers.BooleanField(source="is_active", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = QuestionType
        fields = ("id", "code", "name", "description", "isActive", "createdAt", "updatedAt")


class QuestionTypeInputSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=30, required=False)
    name = serializers.CharField(max_length=100, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    is_active = serializers.BooleanField(required=False)

    def validate_code(self, value: str) -> str:
        return value.strip().upper()

    def validate_name(self, value: str) -> str:
        return value.strip()

    def create(self, validated_data: dict) -> QuestionType:
        return create_question_type(data=validated_data)

    def update(self, instance: QuestionType, validated_data: dict) -> QuestionType:
        return update_question_type(question_type_id=instance.pk, data=validated_data)
```

- [ ] **Step 5: Add the views**

`QuestionType` is not currently imported in `views.py` (verified while writing this plan — only `BlueprintStatus, ExamBlueprint, ExamSet, ExamSetStatus, QuestionStatus` are). In `backend/apps/exams/views.py`, add `QuestionType` to the `from .models import (...)` block, `question_type_queryset` to the services import, and `QuestionTypeSerializer, QuestionTypeInputSerializer` to the serializers import. Add, after `SubjectAdminDetailView`:

```python
class QuestionTypeAdminListCreateView(APIView):
    permission_classes = [RoleRequiredPermission]
    required_roles = EXAM_BLUEPRINT_MAINTENANCE_ROLES

    def get(self, request) -> Response:
        return Response(QuestionTypeSerializer(question_type_queryset(), many=True).data)

    def post(self, request) -> Response:
        serializer = QuestionTypeInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        question_type = serializer.save()
        record_exam_blueprint_maintenance_event(event="question_type_created", outcome="success", request=request, user=request.user)
        return Response(QuestionTypeSerializer(question_type).data, status=201)


class QuestionTypeAdminDetailView(APIView):
    permission_classes = [RoleRequiredPermission]
    required_roles = EXAM_BLUEPRINT_MAINTENANCE_ROLES

    def get_object(self, question_type_id: int) -> QuestionType:
        return get_object_or_404(question_type_queryset(), pk=question_type_id)

    def get(self, request, question_type_id: int) -> Response:
        return Response(QuestionTypeSerializer(self.get_object(question_type_id)).data)

    def put(self, request, question_type_id: int) -> Response:
        question_type = self.get_object(question_type_id)
        serializer = QuestionTypeInputSerializer(question_type, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_question_type = serializer.save()
        record_exam_blueprint_maintenance_event(event="question_type_updated", outcome="success", request=request, user=request.user)
        return Response(QuestionTypeSerializer(updated_question_type).data)

    def patch(self, request, question_type_id: int) -> Response:
        return self.put(request, question_type_id)
```

- [ ] **Step 6: Add the URLs**

In `backend/apps/exams/urls.py`, add `QuestionTypeAdminDetailView, QuestionTypeAdminListCreateView` to the views import, and to `urlpatterns`:

```python
    path("admin/question-types/", QuestionTypeAdminListCreateView.as_view(), name="question_type_list"),
    path("admin/question-types/<int:question_type_id>/", QuestionTypeAdminDetailView.as_view(), name="question_type_detail"),
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd backend && .venv/Scripts/python.exe manage.py test apps.exams.tests.QuestionTypeAdminApiTests --settings=config.settings.test -v 2`
Expected: PASS — 4 tests.

- [ ] **Step 8: Run the full exams suite to check for regressions**

Run: `cd backend && .venv/Scripts/python.exe manage.py test apps.exams.tests --settings=config.settings.test`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
cd backend
git add apps/exams/services.py apps/exams/serializers.py apps/exams/views.py apps/exams/urls.py apps/exams/tests.py
git commit -m "feat(exam-blueprint-maintenance): add QuestionType admin API"
```

---

## Task 3: Topic admin API

**Files:**
- Modify: `backend/apps/exams/services.py` (add `topic_queryset`, `create_topic`, `update_topic`)
- Modify: `backend/apps/exams/serializers.py` (add `TopicSerializer`, `TopicInputSerializer`)
- Modify: `backend/apps/exams/views.py` (add `TopicAdminListCreateView`, `TopicAdminDetailView`)
- Modify: `backend/apps/exams/urls.py` (add topic routes)
- Modify: `backend/apps/exams/tests.py` (add `TopicAdminApiTests`)

**Interfaces:**
- Consumes: `EXAM_BLUEPRINT_MAINTENANCE_ROLES`, `ExamBlueprintMaintenanceConflict`, `record_exam_blueprint_maintenance_event` from Task 1
- Produces: `apps.exams.services.topic_queryset() -> QuerySet[Topic]`
- Produces: `apps.exams.services.create_topic(*, data: dict) -> Topic`
- Produces: `apps.exams.services.update_topic(*, topic_id: int, data: dict) -> Topic`
- Produces: URL names `exams:topic_list`, `exams:topic_detail`

Topic differs from Subject/QuestionType in two ways: it has a `subject` FK (validated against `subject_queryset()` from Task 1) instead of a unique `code`, and its uniqueness constraint is `(subject, name)` rather than a standalone unique code/name.

- [ ] **Step 1: Write the failing tests**

Add to `backend/apps/exams/tests.py`:

```python
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
```

`Topic` is already imported in `tests.py`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && .venv/Scripts/python.exe manage.py test apps.exams.tests.TopicAdminApiTests --settings=config.settings.test -v 2`
Expected: FAIL — `NoReverseMatch: Reverse for 'topic_list' not found`.

- [ ] **Step 3: Add the service functions**

`Topic` is already imported in `services.py` (see Task 1, Step 4's note). In `backend/apps/exams/services.py`, add after `update_question_type`:

```python
def topic_queryset():
    return Topic.objects.select_related("subject")


def create_topic(*, data: dict) -> Topic:
    subject_id = data.pop("subject_id")
    try:
        subject = Subject.objects.get(pk=subject_id)
    except Subject.DoesNotExist as exc:
        raise ValidationError({"subject_id": ["Unknown subject."]}) from exc

    topic = Topic(subject=subject, **data)
    try:
        with transaction.atomic():
            topic.full_clean()
            topic.save()
    except IntegrityError as exc:
        raise ExamBlueprintMaintenanceConflict("A topic with this name already exists for this subject.") from exc
    return topic


@transaction.atomic
def update_topic(*, topic_id: int, data: dict) -> Topic:
    topic = Topic.objects.select_for_update().select_related("subject").get(pk=topic_id)
    subject_id = data.pop("subject_id", None)
    if subject_id is not None:
        try:
            topic.subject = Subject.objects.get(pk=subject_id)
        except Subject.DoesNotExist as exc:
            raise ValidationError({"subject_id": ["Unknown subject."]}) from exc
    for field_name, value in data.items():
        setattr(topic, field_name, value)
    try:
        topic.full_clean()
        topic.save()
    except IntegrityError as exc:
        raise ExamBlueprintMaintenanceConflict("A topic with this name already exists for this subject.") from exc
    return topic
```

- [ ] **Step 4: Add the serializers**

In `backend/apps/exams/serializers.py`, add `Topic` to the models import and `create_topic, update_topic` to the services import. Add, after `QuestionTypeInputSerializer`:

```python
class TopicSerializer(serializers.ModelSerializer):
    subjectId = serializers.IntegerField(source="subject_id", read_only=True)
    subjectCode = serializers.CharField(source="subject.code", read_only=True)
    subjectName = serializers.CharField(source="subject.name", read_only=True)
    isActive = serializers.BooleanField(source="is_active", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = Topic
        fields = ("id", "subjectId", "subjectCode", "subjectName", "code", "name", "description", "isActive", "createdAt", "updatedAt")


class TopicInputSerializer(serializers.Serializer):
    subject_id = serializers.IntegerField(required=False)
    code = serializers.CharField(max_length=50, required=False, allow_blank=True)
    name = serializers.CharField(max_length=200, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    is_active = serializers.BooleanField(required=False)

    def validate_name(self, value: str) -> str:
        return value.strip()

    def create(self, validated_data: dict) -> Topic:
        return create_topic(data=validated_data)

    def update(self, instance: Topic, validated_data: dict) -> Topic:
        return update_topic(topic_id=instance.pk, data=validated_data)
```

- [ ] **Step 5: Add the views**

`Topic` is not currently imported in `views.py` either. In `backend/apps/exams/views.py`, add `Topic` to the `from .models import (...)` block, `topic_queryset` to the services import, and `TopicSerializer, TopicInputSerializer` to the serializers import. Add, after `QuestionTypeAdminDetailView`:

```python
class TopicAdminListCreateView(APIView):
    permission_classes = [RoleRequiredPermission]
    required_roles = EXAM_BLUEPRINT_MAINTENANCE_ROLES

    def get(self, request) -> Response:
        return Response(TopicSerializer(topic_queryset(), many=True).data)

    def post(self, request) -> Response:
        serializer = TopicInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        topic = serializer.save()
        record_exam_blueprint_maintenance_event(event="topic_created", outcome="success", request=request, user=request.user)
        return Response(TopicSerializer(topic).data, status=201)


class TopicAdminDetailView(APIView):
    permission_classes = [RoleRequiredPermission]
    required_roles = EXAM_BLUEPRINT_MAINTENANCE_ROLES

    def get_object(self, topic_id: int) -> Topic:
        return get_object_or_404(topic_queryset(), pk=topic_id)

    def get(self, request, topic_id: int) -> Response:
        return Response(TopicSerializer(self.get_object(topic_id)).data)

    def put(self, request, topic_id: int) -> Response:
        topic = self.get_object(topic_id)
        serializer = TopicInputSerializer(topic, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_topic = serializer.save()
        record_exam_blueprint_maintenance_event(event="topic_updated", outcome="success", request=request, user=request.user)
        return Response(TopicSerializer(updated_topic).data)

    def patch(self, request, topic_id: int) -> Response:
        return self.put(request, topic_id)
```

- [ ] **Step 6: Add the URLs**

In `backend/apps/exams/urls.py`, add `TopicAdminDetailView, TopicAdminListCreateView` to the views import, and to `urlpatterns`:

```python
    path("admin/topics/", TopicAdminListCreateView.as_view(), name="topic_list"),
    path("admin/topics/<int:topic_id>/", TopicAdminDetailView.as_view(), name="topic_detail"),
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd backend && .venv/Scripts/python.exe manage.py test apps.exams.tests.TopicAdminApiTests --settings=config.settings.test -v 2`
Expected: PASS — 6 tests.

- [ ] **Step 8: Run the full backend suite to check for regressions**

Run: `cd backend && .venv/Scripts/python.exe manage.py test --settings=config.settings.test`
Expected: PASS except the pre-existing, out-of-scope `apps.universities.tests.SeedUniversitiesCommandTests.test_seed_command_is_idempotent_and_generates_sequential_codes` failure.

- [ ] **Step 9: Commit**

```bash
cd backend
git add apps/exams/services.py apps/exams/serializers.py apps/exams/views.py apps/exams/urls.py apps/exams/tests.py
git commit -m "feat(exam-blueprint-maintenance): add Topic admin API"
```

---

## Task 4: Frontend service layer

**Files:**
- Create: `frontend/src/services/backendExamBlueprintMaintenanceService.ts`
- Create: `frontend/src/services/backendExamBlueprintMaintenanceService.test.ts`

**Interfaces:**
- Consumes: `sharedApiClient`/`ApiClient` from `./apiClient`, `serviceSuccess`/`ServiceResult` from `./serviceResult` (both existing)
- Produces: `examBlueprintMaintenanceService: ExamBlueprintMaintenanceService` with methods `listSubjects()`, `createSubject(payload)`, `updateSubject(id, payload)`, `listQuestionTypes()`, `createQuestionType(payload)`, `updateQuestionType(id, payload)`, `listTopics()`, `createTopic(payload)`, `updateTopic(id, payload)` — all returning `Promise<ServiceResult<...>>`. Consumed by Task 5.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/services/backendExamBlueprintMaintenanceService.test.ts`:

```typescript
import { describe, expect, it, vi } from 'vitest';
import { ApiClient } from './apiClient';
import { BackendExamBlueprintMaintenanceService } from './backendExamBlueprintMaintenanceService';

function buildClient() {
  const fetcher = vi.fn();
  const client = new ApiClient({ baseUrl: 'http://backend.test', fetcher });
  return { client, fetcher };
}

function jsonResponse(body: unknown, init: ResponseInit = { status: 200 }) {
  return new Response(JSON.stringify(body), { ...init, headers: { 'Content-Type': 'application/json' } });
}

describe('BackendExamBlueprintMaintenanceService', () => {
  it('lists subjects and maps camelCase fields', async () => {
    const { client, fetcher } = buildClient();
    fetcher.mockResolvedValueOnce(
      jsonResponse([{ id: 1, code: 'SCI', name: 'Science', description: '', isActive: true, createdAt: '2026-08-06T00:00:00Z', updatedAt: '2026-08-06T00:00:00Z' }]),
    );
    const service = new BackendExamBlueprintMaintenanceService(client);

    const result = await service.listSubjects();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual([
        { id: '1', code: 'SCI', name: 'Science', description: '', isActive: true, createdAt: '2026-08-06T00:00:00Z', updatedAt: '2026-08-06T00:00:00Z' },
      ]);
    }
  });

  it('creates a topic with the subjectId mapped to subject_id', async () => {
    const { client, fetcher } = buildClient();
    fetcher.mockResolvedValueOnce(
      jsonResponse(
        { id: 1, subjectId: 1, subjectCode: 'SCI', subjectName: 'Science', code: 'ORBIT', name: 'Orbital Mechanics', description: '', isActive: true, createdAt: '2026-08-06T00:00:00Z', updatedAt: '2026-08-06T00:00:00Z' },
        { status: 201 },
      ),
    );
    const service = new BackendExamBlueprintMaintenanceService(client);

    const result = await service.createTopic({ subjectId: '1', code: 'ORBIT', name: 'Orbital Mechanics', description: '' });

    expect(result.ok).toBe(true);
    const [, requestInit] = fetcher.mock.calls[0];
    expect(JSON.parse(requestInit.body as string)).toEqual({ subject_id: '1', code: 'ORBIT', name: 'Orbital Mechanics', description: '' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- backendExamBlueprintMaintenanceService.test.ts`
Expected: FAIL — `Cannot find module './backendExamBlueprintMaintenanceService'`.

- [ ] **Step 3: Write the service**

Create `frontend/src/services/backendExamBlueprintMaintenanceService.ts`:

```typescript
import { sharedApiClient, type ApiClient } from './apiClient';
import { serviceSuccess, type ServiceResult } from './serviceResult';

export interface CatalogRecord {
  id: string;
  code: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogPayload {
  code?: string;
  name?: string;
  description?: string;
  isActive?: boolean;
}

export interface TopicRecord {
  id: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  code: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TopicPayload {
  subjectId?: string;
  code?: string;
  name?: string;
  description?: string;
  isActive?: boolean;
}

interface ApiCatalogRecord {
  id: number | string;
  code: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ApiTopicRecord {
  id: number | string;
  subjectId: number | string;
  subjectCode: string;
  subjectName: string;
  code: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const SUBJECTS_ENDPOINT = '/api/v1/exams/admin/subjects/';
const QUESTION_TYPES_ENDPOINT = '/api/v1/exams/admin/question-types/';
const TOPICS_ENDPOINT = '/api/v1/exams/admin/topics/';

function fromApiCatalogRecord(item: ApiCatalogRecord): CatalogRecord {
  return {
    id: String(item.id),
    code: item.code,
    name: item.name,
    description: item.description,
    isActive: item.isActive,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function toApiCatalogPayload(payload: CatalogPayload): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (payload.code !== undefined) body.code = payload.code;
  if (payload.name !== undefined) body.name = payload.name;
  if (payload.description !== undefined) body.description = payload.description;
  if (payload.isActive !== undefined) body.is_active = payload.isActive;
  return body;
}

function fromApiTopicRecord(item: ApiTopicRecord): TopicRecord {
  return {
    id: String(item.id),
    subjectId: String(item.subjectId),
    subjectCode: item.subjectCode,
    subjectName: item.subjectName,
    code: item.code,
    name: item.name,
    description: item.description,
    isActive: item.isActive,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function toApiTopicPayload(payload: TopicPayload): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (payload.subjectId !== undefined) body.subject_id = payload.subjectId;
  if (payload.code !== undefined) body.code = payload.code;
  if (payload.name !== undefined) body.name = payload.name;
  if (payload.description !== undefined) body.description = payload.description;
  if (payload.isActive !== undefined) body.is_active = payload.isActive;
  return body;
}

export interface ExamBlueprintMaintenanceService {
  listSubjects(): Promise<ServiceResult<CatalogRecord[]>>;
  createSubject(payload: CatalogPayload): Promise<ServiceResult<CatalogRecord>>;
  updateSubject(id: string, payload: CatalogPayload): Promise<ServiceResult<CatalogRecord>>;
  listQuestionTypes(): Promise<ServiceResult<CatalogRecord[]>>;
  createQuestionType(payload: CatalogPayload): Promise<ServiceResult<CatalogRecord>>;
  updateQuestionType(id: string, payload: CatalogPayload): Promise<ServiceResult<CatalogRecord>>;
  listTopics(): Promise<ServiceResult<TopicRecord[]>>;
  createTopic(payload: TopicPayload): Promise<ServiceResult<TopicRecord>>;
  updateTopic(id: string, payload: TopicPayload): Promise<ServiceResult<TopicRecord>>;
}

export class BackendExamBlueprintMaintenanceService implements ExamBlueprintMaintenanceService {
  constructor(private readonly apiClient: ApiClient = sharedApiClient) {}

  async listSubjects(): Promise<ServiceResult<CatalogRecord[]>> {
    const result = await this.apiClient.request<ApiCatalogRecord[]>(SUBJECTS_ENDPOINT);
    if (!result.ok) return result as ServiceResult<CatalogRecord[]>;
    return serviceSuccess(result.data.map(fromApiCatalogRecord));
  }

  async createSubject(payload: CatalogPayload): Promise<ServiceResult<CatalogRecord>> {
    const result = await this.apiClient.request<ApiCatalogRecord>(SUBJECTS_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify(toApiCatalogPayload(payload)),
    });
    if (!result.ok) return result as ServiceResult<CatalogRecord>;
    return serviceSuccess(fromApiCatalogRecord(result.data));
  }

  async updateSubject(id: string, payload: CatalogPayload): Promise<ServiceResult<CatalogRecord>> {
    const result = await this.apiClient.request<ApiCatalogRecord>(`${SUBJECTS_ENDPOINT}${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(toApiCatalogPayload(payload)),
    });
    if (!result.ok) return result as ServiceResult<CatalogRecord>;
    return serviceSuccess(fromApiCatalogRecord(result.data));
  }

  async listQuestionTypes(): Promise<ServiceResult<CatalogRecord[]>> {
    const result = await this.apiClient.request<ApiCatalogRecord[]>(QUESTION_TYPES_ENDPOINT);
    if (!result.ok) return result as ServiceResult<CatalogRecord[]>;
    return serviceSuccess(result.data.map(fromApiCatalogRecord));
  }

  async createQuestionType(payload: CatalogPayload): Promise<ServiceResult<CatalogRecord>> {
    const result = await this.apiClient.request<ApiCatalogRecord>(QUESTION_TYPES_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify(toApiCatalogPayload(payload)),
    });
    if (!result.ok) return result as ServiceResult<CatalogRecord>;
    return serviceSuccess(fromApiCatalogRecord(result.data));
  }

  async updateQuestionType(id: string, payload: CatalogPayload): Promise<ServiceResult<CatalogRecord>> {
    const result = await this.apiClient.request<ApiCatalogRecord>(`${QUESTION_TYPES_ENDPOINT}${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(toApiCatalogPayload(payload)),
    });
    if (!result.ok) return result as ServiceResult<CatalogRecord>;
    return serviceSuccess(fromApiCatalogRecord(result.data));
  }

  async listTopics(): Promise<ServiceResult<TopicRecord[]>> {
    const result = await this.apiClient.request<ApiTopicRecord[]>(TOPICS_ENDPOINT);
    if (!result.ok) return result as ServiceResult<TopicRecord[]>;
    return serviceSuccess(result.data.map(fromApiTopicRecord));
  }

  async createTopic(payload: TopicPayload): Promise<ServiceResult<TopicRecord>> {
    const result = await this.apiClient.request<ApiTopicRecord>(TOPICS_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify(toApiTopicPayload(payload)),
    });
    if (!result.ok) return result as ServiceResult<TopicRecord>;
    return serviceSuccess(fromApiTopicRecord(result.data));
  }

  async updateTopic(id: string, payload: TopicPayload): Promise<ServiceResult<TopicRecord>> {
    const result = await this.apiClient.request<ApiTopicRecord>(`${TOPICS_ENDPOINT}${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(toApiTopicPayload(payload)),
    });
    if (!result.ok) return result as ServiceResult<TopicRecord>;
    return serviceSuccess(fromApiTopicRecord(result.data));
  }
}

export const examBlueprintMaintenanceService = new BackendExamBlueprintMaintenanceService();
```

Note on the create-topic test in Step 1: the payload it sends is `{ subjectId: '1', ... }` and the assertion checks the request body has `subject_id: '1'` — `toApiTopicPayload` passes `payload.subjectId` straight through without parsing it to a number, matching how `createTopic`'s test expects the string `'1'` to survive untouched (the backend's `subject_id` field accepts a numeric string same as any other JSON number-or-string, since DRF's `IntegerField` coerces on `to_internal_value`).

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npm test -- backendExamBlueprintMaintenanceService.test.ts`
Expected: PASS — 2 tests.

- [ ] **Step 5: Commit**

```bash
cd frontend
git add src/services/backendExamBlueprintMaintenanceService.ts src/services/backendExamBlueprintMaintenanceService.test.ts
git commit -m "feat(exam-blueprint-maintenance): add frontend service layer"
```

---

## Task 5: Rewire the maintenance component

**Files:**
- Modify: `frontend/src/pages/admin/maintenance/ExamBlueprintMaintenance.tsx`
- Create: `frontend/src/pages/admin/maintenance/ExamBlueprintMaintenance.test.tsx`

**Interfaces:**
- Consumes: `examBlueprintMaintenanceService` and its types from Task 4

**Before writing code:** note that `MaintenancePageTemplate` (`frontend/src/components/maintenance/MaintenancePageTemplate.tsx`) has no `loading`/`error` prop at all (checked its full prop interface while writing this plan), and `UniversitiesListMaintenance.tsx` — the only other real-backend-integrated maintenance page — doesn't use `MaintenancePageTemplate` either; it's a fully bespoke page. There is no existing precedent for "real backend data + `MaintenancePageTemplate`" to copy verbatim. Instead, borrow the `role="status"`/`role="alert"`/"Retry" button markup verified in `frontend/src/pages/admin/hub/ExamSets.tsx:326-345` (from the Exam Sets integration) for the loading/error states, rendered as early returns *before* reaching `<MaintenancePageTemplate>` — see Step 3 for the exact shape.

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/pages/admin/maintenance/ExamBlueprintMaintenance.test.tsx`:

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ExamBlueprintMaintenance from './ExamBlueprintMaintenance';
import { examBlueprintMaintenanceService } from '../../../services/backendExamBlueprintMaintenanceService';

function catalogRecord(overrides: Partial<{ id: string; code: string; name: string }> = {}) {
  return {
    id: '1',
    code: 'SCI',
    name: 'Science',
    description: '',
    isActive: true,
    createdAt: '2026-08-06T00:00:00Z',
    updatedAt: '2026-08-06T00:00:00Z',
    ...overrides,
  };
}

describe('ExamBlueprintMaintenance', () => {
  beforeEach(() => {
    vi.spyOn(examBlueprintMaintenanceService, 'listSubjects').mockResolvedValue({ ok: true, data: [] });
    vi.spyOn(examBlueprintMaintenanceService, 'listQuestionTypes').mockResolvedValue({ ok: true, data: [] });
    vi.spyOn(examBlueprintMaintenanceService, 'listTopics').mockResolvedValue({ ok: true, data: [] });
  });

  it('shows a loading state while subjects are being fetched', () => {
    vi.mocked(examBlueprintMaintenanceService.listSubjects).mockReturnValue(new Promise(() => {}));
    render(<MemoryRouter><ExamBlueprintMaintenance /></MemoryRouter>);
    expect(screen.getByRole('status')).toHaveTextContent(/loading/i);
  });

  it('shows backend subject data once loaded', async () => {
    vi.mocked(examBlueprintMaintenanceService.listSubjects).mockResolvedValue({
      ok: true,
      data: [catalogRecord()],
    });
    render(<MemoryRouter><ExamBlueprintMaintenance /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('Science')).toBeInTheDocument());
  });

  it('shows a retryable error state on an initial load failure', async () => {
    vi.mocked(examBlueprintMaintenanceService.listSubjects).mockResolvedValue({
      ok: false,
      error: { status: 500, code: 'SERVER_ERROR', message: 'Synthetic failure.' },
    });
    render(<MemoryRouter><ExamBlueprintMaintenance /></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Synthetic failure.'));
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('creates a subject through the service and renders the persisted response', async () => {
    vi.mocked(examBlueprintMaintenanceService.createSubject).mockResolvedValue({
      ok: true,
      data: catalogRecord({ id: '2', code: 'MATH', name: 'Mathematics' }),
    });
    const user = userEvent.setup();
    render(<MemoryRouter><ExamBlueprintMaintenance /></MemoryRouter>);
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /add/i }));
    await user.type(screen.getByLabelText(/code/i), 'MATH');
    await user.type(screen.getByLabelText(/subject name/i), 'Mathematics');
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(screen.getByText('Mathematics')).toBeInTheDocument());
    expect(examBlueprintMaintenanceService.createSubject).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'MATH', name: 'Mathematics' }),
    );
  });

  it('shows a Subject dropdown populated from loaded subjects when switching to the Topics tab', async () => {
    vi.mocked(examBlueprintMaintenanceService.listSubjects).mockResolvedValue({
      ok: true,
      data: [catalogRecord()],
    });
    const user = userEvent.setup();
    render(<MemoryRouter><ExamBlueprintMaintenance /></MemoryRouter>);
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Topics' }));
    await user.click(screen.getByRole('button', { name: /add/i }));

    expect(screen.getByRole('option', { name: 'Science' })).toBeInTheDocument();
  });
});
```

These selectors (`role: 'status'`, `role: 'alert'`, "Retry") are not guesses — they match the `role="status"`/`role="alert"` markup Step 3 below specifies, copied from the verified `ExamSets.tsx:326-345` pattern. `MaintenancePageTemplate` itself is never in a loading or error state; the loading/error early-returns happen before it's reached, so its internal markup is irrelevant to these three tests. The `getByRole('button', { name: /add/i })`, `getByLabelText(/code/i)`, and `getByRole('option', ...)` selectors in the create/dropdown tests *do* depend on `MaintenancePageTemplate`'s and the `fields`/`columns` config's real rendering — if they don't match after Step 3's rewrite, fix the test file's selectors to match the real rendered markup (not the component), the same latitude given for `ExamSets.test.tsx` during the original Exam Sets integration.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npm test -- ExamBlueprintMaintenance.test.tsx`
Expected: FAIL — the component still uses local `useState` with no data, so none of the assertions about loading/service calls will be satisfied.

- [ ] **Step 3: Rewrite the component**

Modify `frontend/src/pages/admin/maintenance/ExamBlueprintMaintenance.tsx`. Structure:

1. Remove `const [data, setData] = useState<BlueprintConfig[]>([]);` and the `CATEGORIES` difficulty-level entry.
2. Add state: `subjects: CatalogRecord[]`, `questionTypes: CatalogRecord[]`, `topics: TopicRecord[]` (all from Task 4's service types), `loading: boolean` (default `true`), `loadError: ServiceFailure['error'] | null`, `mutationError: ServiceFailure['error'] | null`.
3. Add a `load()` function and call it from a mount `useEffect`, matching `useExamSets`'s concurrent-load shape (`frontend/src/hooks/useExamSets.ts`) rather than `UniversitiesListMaintenance.tsx`'s single-resource load, since this page needs three lists loaded together before rendering anything:

```typescript
const load = useCallback(async () => {
  setLoading(true);
  setLoadError(null);
  const [subjectsResult, questionTypesResult, topicsResult] = await Promise.all([
    examBlueprintMaintenanceService.listSubjects(),
    examBlueprintMaintenanceService.listQuestionTypes(),
    examBlueprintMaintenanceService.listTopics(),
  ]);
  const failed = [subjectsResult, questionTypesResult, topicsResult].find((result) => !result.ok);
  if (failed && !failed.ok) {
    setLoadError(failed.error);
    setLoading(false);
    return;
  }
  if (subjectsResult.ok) setSubjects(subjectsResult.data);
  if (questionTypesResult.ok) setQuestionTypes(questionTypesResult.data);
  if (topicsResult.ok) setTopics(topicsResult.data);
  setLoading(false);
}, []);

useEffect(() => {
  void load();
}, [load]);
```

4. Add the loading/error early returns *before* the existing `return <MaintenancePageTemplate ...>` statement, matching the verified `ExamSets.tsx:326-345` markup:

```tsx
if (loading) {
  return (
    <div role="status" aria-live="polite" className="flex min-h-64 items-center justify-center gap-3 text-sm font-semibold text-slate-600">
      <Loader2 className="h-5 w-5 animate-spin" /> Loading exam blueprint catalogs…
    </div>
  );
}

if (loadError) {
  return (
    <div role="alert" className="m-5 flex min-h-56 flex-col items-center justify-center rounded-3xl border border-red-200 bg-red-50 p-8 text-center sm:m-7">
      <AlertCircle className="h-8 w-8 text-red-600" />
      <h2 className="mt-3 text-lg font-black text-red-900">Exam blueprint catalogs could not be loaded</h2>
      <p className="mt-1 max-w-xl text-sm text-red-700">{loadError.message}</p>
      <button type="button" onClick={() => void load()} className="btn-secondary mt-4 flex items-center gap-2">
        <RefreshCw className="h-4 w-4" /> Retry
      </button>
    </div>
  );
}
```

Add `Loader2, AlertCircle, RefreshCw` to the existing `lucide-react` import (or add a new import line if none exists yet) and `useCallback` to the `react` import.

5. Update `CATEGORIES` to `['Subject Areas', 'Question Type', 'Topics']` (Difficulty Level removed).
6. Update `getColumnsForCategory('Topics')`: change the `subject` column's `key` to `'subjectName'`, and drop the `gradeLevel` column entirely — it has no backend equivalent and was never part of the approved scope (`topicCode`/`status` columns stay, mapped to `code`/`isActive`).
7. Update the `fields` array: the Topics category's "Subject" field changes from `{ name: 'subject', type: 'text', ... }` to `{ name: 'subjectId', label: 'Subject', type: 'select', required: true, options: subjects.filter((s) => s.isActive).map((s) => ({ value: s.id, label: s.name })) }` — this needs to be computed inside the component body (not the module-level `CATEGORIES` array) since it depends on loaded `subjects` state.
8. Replace `handleAdd`/`handleEdit` to call `examBlueprintMaintenanceService.create*`/`update*` (picking the right one based on `selectedCategory`) instead of local `setData`. On failure, set `mutationError` and re-throw or return without closing the form (check how `MaintenancePageTemplate`'s `onAdd`/`onEdit` props expect failure to be signaled — synchronous void return vs. a thrown error — before deciding; match whatever it expects). On success, call `load()` again to refresh from the server rather than optimistically patching local state, keeping the backend as the single source of truth.
9. Remove `handleDelete` and the `onDelete` prop from `<MaintenancePageTemplate>` entirely — there is no delete endpoint. Add a deactivate action instead: reuse `handleEdit`'s update call with `{ isActive: false }`, exposed as an edit toggling the "Active Status" field (already in `fields`) rather than a separate button, matching the "soft-deactivate only" design.
10. Remove the `bulkUpload` prop from the `<MaintenancePageTemplate>` call.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npm test -- ExamBlueprintMaintenance.test.tsx`
Expected: PASS — 5 tests. If selectors from Step 1 didn't match the real rendered markup, fix the test file's selectors now (not the component) unless the component's markup itself is the actual bug.

- [ ] **Step 5: Run the full frontend suite to check for regressions**

Run: `cd frontend && npm test`
Expected: PASS except the pre-existing, out-of-scope `QrScanModal.test.tsx` and `UniversitiesListMaintenance.test.tsx`/`MaintenanceCenterTables.test.tsx` failures recorded in the Exam Sets implementation log.

- [ ] **Step 6: Commit**

```bash
cd frontend
git add src/pages/admin/maintenance/ExamBlueprintMaintenance.tsx src/pages/admin/maintenance/ExamBlueprintMaintenance.test.tsx
git commit -m "feat(exam-blueprint-maintenance): wire maintenance table to real backend"
```

---

## Task 6: Fix route permissions and do a final live verification

**Files:**
- Modify: `frontend/src/routing/routes.tsx:160`

**Interfaces:**
- None — this is a data-only change to a route config array.

- [ ] **Step 1: Fix the allowedRoles**

In `frontend/src/routing/routes.tsx`, change:

```typescript
  { path: '/admin/maintenance/exam-blueprint', element: <ExamBlueprintMaintenance />, access: 'protected', allowedRoles: withSystemAdmin('UNIVERSITY_ADMIN', 'ADMISSIONS_REVIEWER') },
```

to:

```typescript
  { path: '/admin/maintenance/exam-blueprint', element: <ExamBlueprintMaintenance />, access: 'protected', allowedRoles: withSystemAdmin('ITEM_WRITER', 'ACADEMIC_REVIEWER', 'EXAM_ADMINISTRATOR') },
```

- [ ] **Step 2: Run the full backend and frontend suites one more time**

Run: `cd backend && .venv/Scripts/python.exe manage.py test --settings=config.settings.test`
Run: `cd frontend && npm run build && npm test`
Expected: same pass/fail shape as Tasks 3 and 5's final runs — no new failures.

- [ ] **Step 3: Commit**

```bash
cd frontend
git add src/routing/routes.tsx
git commit -m "fix(exam-blueprint-maintenance): correct allowed roles for the maintenance route"
```

- [ ] **Step 4: Record the implementation in the implementation log**

Add an entry to `docs/superpowers/i.sandoval/implement/i.sandoval.implement.md` under a new `## Exam Blueprint Maintenance Table` heading: what was built (list the six commits), the verification evidence (exact test run commands and pass counts from each task), and explicitly note the `routes.tsx` role-list bug found and fixed in this task. Follow the same evidence-recording style already used in this file's "Exam Sets API integration" and "Release-gate follow-up" sections — exact commands, exact results, no unverified claims.

- [ ] **Step 5: Commit the log update**

```bash
git add docs/superpowers/i.sandoval/implement/i.sandoval.implement.md
git commit -m "docs(exam-blueprint-maintenance): record implementation and verification evidence"
```
