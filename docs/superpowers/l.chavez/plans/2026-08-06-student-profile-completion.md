# Student Profile Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a backend-backed Student Portal Profile module that lets bulk-uploaded students complete pending application requirements before accessing gated student features.

**Architecture:** Reuse `StudentApplication` as the source of truth. Add focused profile-completion service functions and authenticated student endpoints, then add a frontend service adapter, Profile page, and route gating based on the pending-completion endpoint.

**Tech Stack:** Django 5.2, DRF 3.16, Python 3.13, React 19, TypeScript 5.8, Vite 6, Tailwind CSS 4, Vitest, React Testing Library.

## Global Constraints

- Make the smallest change that satisfies the request.
- Backend remains authoritative for validation, authorization, application state transitions, and audit behavior.
- Frontend API calls must stay in service modules; components must not call remote endpoints directly.
- No new dependencies.
- Do not create a separate profile domain model.
- Do not refactor the full student dashboard away from mock data.
- Dynamic profile requirements must be loaded from current enabled `student_registration` configuration.
- Uploaded dynamic documents must use existing private attachment validation and storage behavior.
- Do not log secrets, personal data, LRN values, document contents, or sensitive payloads.
- Leave the plan uncommitted unless the user separately asks for a commit.

---

## File Structure

Backend:

- Modify `backend/apps/applications/services.py`
  - Add profile-completion query, progress, draft-save, attachment-upload, and submit functions.
- Modify `backend/apps/applications/serializers.py`
  - Add profile response and profile attachment serializers.
- Modify `backend/apps/applications/views.py`
  - Add authenticated student profile endpoint classes.
- Modify `backend/apps/applications/urls.py`
  - Register `/profile/`, `/profile/attachments/`, `/profile/selfie/`, and `/profile/submit/` before `<uuid:application_id>/`.
- Modify `backend/apps/applications/tests/test_application_endpoints.py`
  - Add endpoint coverage for profile completion and gating-adjacent reviewer approval.

Frontend:

- Modify `frontend/src/services/backendApplicationService.ts`
  - Add profile completion types and service methods.
- Modify `frontend/src/services/backendApplicationService.test.ts`
  - Add adapter tests for profile endpoints.
- Create `frontend/src/pages/student/StudentProfile.tsx`
  - Add the student-facing form, progress UI, and modal-based biometric selfie capture.
  - Reuse the student registration selfie behavior: start live camera, validate face frames, show countdown, auto-capture, validate the captured photo, then upload it as the profile identity reference.
- Create `frontend/src/pages/student/StudentProfile.test.tsx`
  - Add page behavior tests.
- Modify `frontend/src/routing/routes.tsx`
  - Add `/student/profile`.
- Modify `frontend/src/routing/RouteGuards.tsx`
  - Add pending-profile route gating for Student routes.
- Modify `frontend/src/routing/RouteGuards.test.tsx`
  - Add redirect/unlocked route tests.
- Modify `frontend/src/components/DashboardLayout.tsx`
  - Add Profile nav item for Student Portal.
- Optionally modify `frontend/src/pages/student/StudentDashboard.tsx`
  - Add a completion-required notice on `/dashboard` only if this can be done without broad mock-data refactor.

Docs:

- Modify `docs/api/API-ENDPOINTS.md`
  - Document implemented profile endpoints after code is complete.

---

### Task 1: Backend Profile Domain Services

**Files:**
- Modify: `backend/apps/applications/services.py`
- Test: `backend/apps/applications/tests/test_application_endpoints.py`

**Interfaces:**
- Produces:
  - `get_pending_student_profile_application(*, owner) -> StudentApplication`
  - `build_student_profile_progress(application: StudentApplication) -> dict`
  - `serialize_student_profile_completion(application: StudentApplication, *, request=None) -> dict`
  - `_validate_student_profile_complete(application: StudentApplication) -> None`
  - `save_student_profile_draft(*, owner, expected_version: int, data: dict) -> StudentApplication`
  - `upload_student_profile_attachment(*, owner, field_name: str, uploaded_file) -> StudentApplicationAdditionalAttachment`
  - `submit_student_profile(*, owner, expected_version: int) -> StudentApplication`
- Consumes:
  - Existing `ApplicationCompletionStatus`, `ApplicationSubmissionSource`, `ApplicationStatus`, `StudentApplication`, `StudentApplicationAdditionalAttachment`
  - Existing `_active_step1_registration_fields`, `_payload_location_for_config_field`, `_is_blank_step1_value`, `_is_pwd_dependent_field`, `_truthy_step1_value`, `_registration_attachment_exists`, `_validated_registration_attachment_content_type`, `_check_version`

- [ ] **Step 1: Add failing backend tests for service-visible behavior**

Add tests to `ApplicationEndpointTests` or a new class in `backend/apps/applications/tests/test_application_endpoints.py`:

```python
from apps.applications.models import ApplicationCompletionStatus, ApplicationSubmissionSource
from apps.configuration.models import ConfigurableField


def create_bulk_pending_application(owner, **overrides):
    payload = complete_payload()
    payload["personal"]["email"] = getattr(owner, "email", "bulk.student@example.test")
    return StudentApplication.objects.create(
        owner=owner,
        lrn=payload["school"]["lrn"],
        exam_cycle_id="2026",
        status=ApplicationStatus.SUBMITTED,
        completion_status=ApplicationCompletionStatus.PENDING_STUDENT_COMPLETION,
        submission_source=ApplicationSubmissionSource.ADMISSIONS_BULK_UPLOAD,
        submitted_at=timezone.now(),
        personal=payload["personal"],
        address=payload["address"],
        school=payload["school"],
        course_preferences=payload["coursePreferences"],
        review_step=payload["reviewStep"],
        **overrides,
    )
```

Add test cases:

```python
def test_student_profile_progress_counts_missing_dynamic_required_field(self):
    application = create_bulk_pending_application(self.user)
    ConfigurableField.objects.create(
        module="student_registration",
        section="Step 1 Registration",
        field_type="Student Registration Field",
        field_name="Guardian Contact Number",
        field_section="Personal Information",
        input_type="text",
        priority="High Priority",
        is_enabled=True,
    )

    from apps.applications.services import build_student_profile_progress

    progress = build_student_profile_progress(application)

    self.assertGreater(progress["total"], progress["completed"])
    self.assertIn("Guardian Contact Number", [item["label"] for item in progress["remaining"]])
```

```python
def test_student_profile_submit_marks_bulk_application_complete(self):
    application = create_bulk_pending_application(self.user)

    from apps.applications.services import submit_student_profile

    submitted = submit_student_profile(owner=principal(self.user), expected_version=application.version)

    self.assertEqual(submitted.completion_status, ApplicationCompletionStatus.COMPLETE)
    self.assertEqual(submitted.status, ApplicationStatus.SUBMITTED)
    self.assertEqual(submitted.version, application.version + 1)
```

```python
def test_student_profile_draft_rejects_non_bulk_application(self):
    application = StudentApplication.objects.create(
        owner=self.user,
        status=ApplicationStatus.SUBMITTED,
        completion_status=ApplicationCompletionStatus.COMPLETE,
        submission_source=ApplicationSubmissionSource.STUDENT_REGISTRATION,
        personal=complete_payload()["personal"],
    )

    from apps.applications.services import save_student_profile_draft, ApplicationConflict

    with self.assertRaises(ApplicationConflict):
        save_student_profile_draft(
            owner=principal(self.user),
            expected_version=application.version,
            data={"personal": {"firstName": "Changed"}},
        )
```

- [ ] **Step 2: Run focused tests and confirm they fail**

Run:

```powershell
cd backend
python manage.py test apps.applications.tests.test_application_endpoints --settings=config.settings.test
```

Expected: fail because the profile service functions are not defined.

- [ ] **Step 3: Implement the profile application lookup**

In `backend/apps/applications/services.py`, import `ApplicationSubmissionSource` if it is not already imported. Add:

```python
def get_pending_student_profile_application(*, owner) -> StudentApplication:
    owner_id = getattr(owner, "user_id", getattr(owner, "id", None))
    application = (
        StudentApplication.objects
        .select_related("owner", "personal_info", "address_info", "school_info", "review_info")
        .prefetch_related("course_preference_rows", "additional_fields", "additional_attachments")
        .filter(
            owner_id=owner_id,
            submission_source=ApplicationSubmissionSource.ADMISSIONS_BULK_UPLOAD,
            completion_status=ApplicationCompletionStatus.PENDING_STUDENT_COMPLETION,
        )
        .exclude(status=ApplicationStatus.REJECTED)
        .order_by("-submitted_at", "-created_at")
        .first()
    )
    if application is None:
        raise StudentApplication.DoesNotExist
    return application
```

- [ ] **Step 4: Implement requirement item calculation**

Add helper functions in `services.py`:

```python
PROFILE_STATIC_REQUIREMENTS = (
    ("personal", "firstName", "First Name"),
    ("personal", "lastName", "Last Name"),
    ("personal", "dateOfBirth", "Birth Date"),
    ("personal", "sex", "Sex"),
    ("personal", "email", "Email Address"),
    ("personal", "mobile", "Mobile Number"),
    ("address", "region", "Region"),
    ("address", "province", "Province"),
    ("address", "city", "City"),
    ("address", "barangay", "Barangay"),
    ("address", "street", "Street"),
    ("address", "postalCode", "Postal Code"),
    ("school", "lrn", "LRN"),
    ("school", "schoolId", "School ID"),
    ("school", "name", "School Name"),
    ("school", "academicTrack", "Academic Track"),
    ("school", "gradeLevel", "Grade Level"),
    ("school", "enrollmentStatus", "Enrollment Status"),
    ("school", "schoolYear", "School Year"),
    ("school", "gwa", "GWA"),
)
```

```python
def _profile_requirement(section: str, field_key: str, label: str, requirement_type: str, completed: bool) -> dict:
    return {
        "section": section,
        "fieldKey": field_key,
        "label": label,
        "type": requirement_type,
        "required": True,
        "completed": completed,
    }
```

```python
def _profile_dynamic_value(application: StudentApplication, field: ConfigurableField):
    section, key = _payload_location_for_config_field(field)
    payload = getattr(application, section)
    value = payload.get(key)
    if field.field_name not in STEP1_CONFIG_FIELD_PAYLOAD_KEYS and _is_blank_step1_value(value):
        alternate_section = "school" if section == "personal" else "personal"
        value = getattr(application, alternate_section).get(key)
    return section, key, value
```

- [ ] **Step 5: Implement progress calculation**

Add:

```python
def build_student_profile_progress(application: StudentApplication) -> dict:
    requirements = []
    for section, field_key, label in PROFILE_STATIC_REQUIREMENTS:
        value = getattr(application, section).get(field_key)
        requirements.append(_profile_requirement(section, field_key, label, "field", not _is_blank_step1_value(value)))

    preferences = application.course_preferences
    preferences_complete = bool(preferences) and all(
        item.get("university") and item.get("course")
        for item in preferences
    )
    requirements.append(_profile_requirement("coursePreferences", "coursePreferences", "Course Preferences", "field", preferences_complete))

    review_step = application.review_step
    requirements.append(_profile_requirement("reviewStep", "privacyConsent", "Privacy Consent", "field", review_step.get("privacyConsent") is True))
    requirements.append(_profile_requirement("reviewStep", "declarationAccepted", "Declaration", "field", review_step.get("declarationAccepted") is True))

    for field in _active_step1_registration_fields():
        if field.priority != ConfigurableFieldPriority.HIGH:
            continue
        if field.field_name in OPTIONAL_IDENTITY_FIELD_NAMES:
            continue
        if _is_pwd_dependent_field(field) and not _truthy_step1_value(application.personal.get("isPwd")):
            continue
        section, key, value = _profile_dynamic_value(application, field)
        if field.input_type == "file":
            completed = _registration_attachment_exists(field=field, application=application)
            requirements.append(_profile_requirement(field.field_section, field.field_name, field.field_name, "file", completed))
        else:
            completed = not _is_blank_step1_value(value)
            if completed and field.input_type == "dropdown":
                completed = str(value) in field.option_values
            requirements.append(_profile_requirement(section, key, field.field_name, "field", completed))

    seen = set()
    unique_requirements = []
    for item in requirements:
        key = (item["section"], item["fieldKey"], item["type"])
        if key in seen:
            continue
        seen.add(key)
        unique_requirements.append(item)

    total = len(unique_requirements)
    completed = sum(1 for item in unique_requirements if item["completed"])
    percent = 100 if total == 0 else round((completed / total) * 100)
    remaining = [{key: value for key, value in item.items() if key != "completed"} for item in unique_requirements if not item["completed"]]
    return {"completed": completed, "total": total, "percent": percent, "remaining": remaining}
```

Make sure `ConfigurableFieldPriority` is imported from `apps.configuration.models`.

- [ ] **Step 6: Implement draft save**

Add:

```python
@transaction.atomic
def save_student_profile_draft(*, owner, expected_version: int, data: dict) -> StudentApplication:
    application = StudentApplication.objects.select_for_update().get(
        id=get_pending_student_profile_application(owner=owner).id,
    )
    _check_version(application, expected_version)
    if application.status != ApplicationStatus.SUBMITTED:
        raise ApplicationConflict("Only submitted bulk-uploaded applications can be completed.")
    allowed_fields = {"personal", "address", "school", "course_preferences", "review_step"}
    if "personal" in data:
        _flatten_step1_dynamic_fields(data)
    for field, value in data.items():
        if field in allowed_fields:
            setattr(application, field, value)
    application.version += 1
    application.save()
    return application
```

- [ ] **Step 7: Implement application-owned profile attachment upload**

Refactor existing `upload_registration_attachment` only enough to share validation. Add:

```python
def _configured_registration_file_field(field_name: str) -> ConfigurableField | None:
    return ConfigurableField.objects.filter(
        module=STUDENT_REGISTRATION_MODULE,
        section=STEP_1_REGISTRATION_SECTION,
        field_type=STUDENT_REGISTRATION_FIELD_TYPE,
        field_name=field_name,
        input_type="file",
        is_enabled=True,
    ).first()
```

Update `upload_registration_attachment` to call `_configured_registration_file_field(field_name)`.

Add:

```python
@transaction.atomic
def upload_student_profile_attachment(*, owner, field_name: str, uploaded_file) -> StudentApplicationAdditionalAttachment:
    application = get_pending_student_profile_application(owner=owner)
    field = _configured_registration_file_field(field_name)
    if field is None:
        raise ValidationError({"fieldName": ["This attachment field is not configured or is inactive."]})
    content_type = _validated_registration_attachment_content_type(uploaded_file)
    digest = hashlib.sha256()
    for chunk in uploaded_file.chunks():
        digest.update(chunk)
    uploaded_file.seek(0)
    existing = StudentApplicationAdditionalAttachment.objects.filter(
        application=application,
        section=field.field_section,
        field_key=field.field_name,
    ).first()
    if existing is not None:
        existing.file.delete(save=False)
        existing.delete()
    return StudentApplicationAdditionalAttachment.objects.create(
        application=application,
        section=field.field_section,
        field_key=field.field_name,
        file=uploaded_file,
        original_filename=getattr(uploaded_file, "name", "")[:255] or field.field_name,
        content_type=content_type,
        size=uploaded_file.size,
        sha256=digest.hexdigest(),
    )
```

- [ ] **Step 8: Implement profile-specific completion validation**

Add this wrapper so profile submission enforces every static requirement from the spec, not only the older public registration submit rules:

```python
def _validate_student_profile_complete(application: StudentApplication) -> None:
    errors = {}
    for section, field_key, label in PROFILE_STATIC_REQUIREMENTS:
        if _is_blank_step1_value(getattr(application, section).get(field_key)):
            errors.setdefault(section, []).append(f"Missing required field: {label}.")

    _validate_step1_configured_fields(
        {"personal": application.personal, "school": application.school},
        errors,
        application=application,
    )

    lrn = str(application.school.get("lrn", ""))
    if lrn and (len(lrn) != 12 or not lrn.isdigit()):
        errors.setdefault("school", []).append("LRN must be exactly 12 numeric digits.")

    if not application.course_preferences:
        errors["coursePreferences"] = ["At least one course preference is required."]
    elif any(not item.get("university") or not item.get("course") for item in application.course_preferences):
        errors["coursePreferences"] = ["Every preference requires university and course."]

    if application.review_step.get("privacyConsent") is not True or application.review_step.get("declarationAccepted") is not True:
        errors["reviewStep"] = ["Privacy consent and declaration acceptance are required."]

    if errors:
        raise ValidationError(errors)
```

- [ ] **Step 9: Implement profile submit**

Add:

```python
@transaction.atomic
def submit_student_profile(*, owner, expected_version: int) -> StudentApplication:
    application = StudentApplication.objects.select_for_update().get(
        id=get_pending_student_profile_application(owner=owner).id,
    )
    _check_version(application, expected_version)
    if application.status != ApplicationStatus.SUBMITTED:
        raise ApplicationConflict("Only submitted bulk-uploaded applications can be completed.")
    _validate_student_profile_complete(application)
    application.completion_status = ApplicationCompletionStatus.COMPLETE
    application.version += 1
    application.submitted_at = timezone.now()
    application.save(update_fields=["completion_status", "version", "submitted_at", "updated_at"])
    return application
```

- [ ] **Step 10: Run focused backend service tests**

Run:

```powershell
cd backend
python manage.py test apps.applications.tests.test_application_endpoints --settings=config.settings.test
```

Expected: pass for the new service-level behavior; endpoint tests may still fail until Task 2 adds URLs/views.

- [ ] **Step 11: Commit after Task 1 if implementing**

```powershell
git add backend/apps/applications/services.py backend/apps/applications/tests/test_application_endpoints.py
git commit -m "feat: add student profile completion services"
```

---

### Task 2: Backend Profile API Endpoints

**Files:**
- Modify: `backend/apps/applications/serializers.py`
- Modify: `backend/apps/applications/views.py`
- Modify: `backend/apps/applications/urls.py`
- Modify: `backend/apps/applications/tests/test_application_endpoints.py`

**Interfaces:**
- Consumes from Task 1:
  - `serialize_student_profile_completion(application, request=None) -> dict`
  - `save_student_profile_draft(owner, expected_version, data) -> StudentApplication`
  - `upload_student_profile_attachment(owner, field_name, uploaded_file) -> StudentApplicationAdditionalAttachment`
  - `submit_student_profile(owner, expected_version) -> StudentApplication`
- Produces:
  - URL names `applications:student-profile`, `applications:student-profile-attachment`, `applications:student-profile-submit`

- [ ] **Step 1: Write endpoint tests**

In `test_application_endpoints.py`, add:

```python
def test_student_can_read_pending_bulk_profile(self):
    application = create_bulk_pending_application(self.user)

    response = self.client.get(reverse("applications:student-profile"))

    self.assertEqual(response.status_code, 200)
    self.assertEqual(response.data["application"]["id"], str(application.id))
    self.assertEqual(response.data["application"]["completionStatus"], ApplicationCompletionStatus.PENDING_STUDENT_COMPLETION)
    self.assertIn("progress", response.data)
    self.assertIn("fields", response.data)
```

```python
def test_non_student_cannot_read_student_profile(self):
    create_bulk_pending_application(self.user)
    self.client.force_authenticate(user=principal(self.user, PortalRole.ADMISSIONS_REVIEWER.value))

    response = self.client.get(reverse("applications:student-profile"))

    self.assertEqual(response.status_code, 403)
```

```python
def test_student_profile_draft_endpoint_saves_versioned_changes(self):
    application = create_bulk_pending_application(self.user)

    response = self.client.patch(
        reverse("applications:student-profile"),
        {"version": application.version, "personal": {"firstName": "Updated", "lastName": "Learner"}},
        format="json",
    )

    self.assertEqual(response.status_code, 200)
    self.assertEqual(response.data["application"]["personal"]["firstName"], "Updated")
    self.assertEqual(response.data["application"]["version"], application.version + 1)
```

```python
def test_student_profile_submit_endpoint_completes_application(self):
    application = create_bulk_pending_application(self.user)

    response = self.client.post(reverse("applications:student-profile-submit"), {"version": application.version}, format="json")

    self.assertEqual(response.status_code, 200)
    self.assertEqual(response.data["application"]["completionStatus"], ApplicationCompletionStatus.COMPLETE)
```

```python
def test_student_profile_attachment_endpoint_uploads_configured_file(self):
    create_bulk_pending_application(self.user)
    ConfigurableField.objects.create(
        module="student_registration",
        section="Step 1 Registration",
        field_type="Student Registration Field",
        field_name="PWD ID Attachment",
        field_section="PWD Information",
        input_type="file",
        priority="High Priority",
        is_enabled=True,
    )
    file = SimpleUploadedFile("pwd.pdf", b"%PDF-1.4 profile", content_type="application/pdf")

    response = self.client.post(
        reverse("applications:student-profile-attachment"),
        {"fieldName": "PWD ID Attachment", "file": file},
        format="multipart",
    )

    self.assertEqual(response.status_code, 201)
    self.assertEqual(response.data["fieldKey"], "PWD ID Attachment")
```

- [ ] **Step 2: Run endpoint tests and confirm they fail**

Run:

```powershell
cd backend
python manage.py test apps.applications.tests.test_application_endpoints --settings=config.settings.test
```

Expected: fail because URL names and views are missing.

- [ ] **Step 3: Add serializer types**

In `serializers.py`, add:

```python
class StudentProfileCompletionSerializer(serializers.Serializer):
    application = serializers.DictField(read_only=True)
    fields = serializers.ListField(child=serializers.DictField(), read_only=True)
    progress = serializers.DictField(read_only=True)
```

Reuse `ApplicationUpdateSerializer`, `ApplicationSubmitSerializer`, `RegistrationAttachmentUploadSerializer`, and `RegistrationAttachmentSerializer`.

- [ ] **Step 4: Implement response serializer helper in services**

If not added in Task 1, add to `services.py`:

```python
def serialize_student_profile_completion(application: StudentApplication, *, request=None) -> dict:
    from apps.applications.serializers import ApplicationSerializer
    from apps.configuration.serializers import ConfigurableFieldSerializer

    fields = _active_step1_registration_fields().order_by("display_order", "field_name")
    return {
        "application": ApplicationSerializer(application, context={"request": request}).data,
        "fields": ConfigurableFieldSerializer(fields, many=True).data,
        "progress": build_student_profile_progress(application),
    }
```

- [ ] **Step 5: Add views**

In `views.py`, import:

```python
from rest_framework.exceptions import PermissionDenied
from django.http import Http404
```

Extend service imports:

```python
get_pending_student_profile_application,
save_student_profile_draft,
serialize_student_profile_completion,
submit_student_profile,
upload_student_profile_attachment,
```

Add:

```python
class StudentProfileCompletionView(APIView):
    permission_classes = [RoleRequiredPermission]
    required_roles = require_roles(PortalRole.STUDENT)

    def get(self, request) -> Response:
        try:
            application = get_pending_student_profile_application(owner=request.user)
        except StudentApplication.DoesNotExist as exc:
            raise Http404("Student profile completion is not pending.") from exc
        return Response(serialize_student_profile_completion(application, request=request))

    def patch(self, request) -> Response:
        serializer = ApplicationUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        expected_version = serializer.validated_data.pop("version")
        updated = save_student_profile_draft(
            owner=request.user,
            expected_version=expected_version,
            data=serializer.validated_data,
        )
        record_application_event(event="bulk_upload_profile_draft_saved", outcome="success", request=request, user=request.user, application=updated)
        return Response(serialize_student_profile_completion(updated, request=request))
```

Add:

```python
class StudentProfileAttachmentUploadView(APIView):
    permission_classes = [RoleRequiredPermission]
    required_roles = require_roles(PortalRole.STUDENT)
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request) -> Response:
        serializer = RegistrationAttachmentUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        attachment = upload_student_profile_attachment(
            owner=request.user,
            field_name=serializer.validated_data["fieldName"],
            uploaded_file=serializer.validated_data["file"],
        )
        record_application_event(event="bulk_upload_profile_attachment_uploaded", outcome="success", request=request, user=request.user, application=attachment.application)
        return Response(RegistrationAttachmentSerializer(attachment).data, status=status.HTTP_201_CREATED)
```

Add:

```python
class StudentProfileSubmitView(APIView):
    permission_classes = [RoleRequiredPermission]
    required_roles = require_roles(PortalRole.STUDENT)

    def post(self, request) -> Response:
        serializer = ApplicationSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        submitted = submit_student_profile(
            owner=request.user,
            expected_version=serializer.validated_data["version"],
        )
        record_application_event(event="bulk_upload_profile_completed", outcome="success", request=request, user=request.user, application=submitted)
        return Response(serialize_student_profile_completion(submitted, request=request))
```

- [ ] **Step 6: Add URL patterns before UUID detail route**

In `urls.py`, import the new views and add before `path("<uuid:application_id>/", ...)`:

```python
path("profile/", StudentProfileCompletionView.as_view(), name="student-profile"),
path("profile/attachments/", StudentProfileAttachmentUploadView.as_view(), name="student-profile-attachment"),
path("profile/submit/", StudentProfileSubmitView.as_view(), name="student-profile-submit"),
```

- [ ] **Step 7: Run backend endpoint tests**

Run:

```powershell
cd backend
python manage.py test apps.applications.tests.test_application_endpoints --settings=config.settings.test
python manage.py check --settings=config.settings.local
```

Expected: both pass.

- [ ] **Step 8: Commit after Task 2 if implementing**

```powershell
git add backend/apps/applications/services.py backend/apps/applications/serializers.py backend/apps/applications/views.py backend/apps/applications/urls.py backend/apps/applications/tests/test_application_endpoints.py
git commit -m "feat: expose student profile completion api"
```

---

### Task 3: Frontend Service Contract and Adapter

**Files:**
- Modify: `frontend/src/services/backendApplicationService.ts`
- Modify: `frontend/src/services/backendApplicationService.test.ts`

**Interfaces:**
- Consumes:
  - Backend endpoints from Task 2
- Produces:
  - `StudentProfileProgressItem`
  - `StudentProfileProgress`
  - `StudentProfileCompletion`
  - `StudentProfileDraftInput`
  - `BackendApplicationService.getStudentProfileCompletion()`
  - `BackendApplicationService.saveStudentProfileDraft(input)`
  - `BackendApplicationService.uploadStudentProfileAttachment(fieldName, file)`
  - `BackendApplicationService.submitStudentProfile(version)`

- [ ] **Step 1: Write failing service tests**

In `backendApplicationService.test.ts`, add:

```typescript
it('loads student profile completion from the backend', async () => {
  const fetcher = vi.fn().mockResolvedValue(jsonResponse({
    application: {
      id: 'application-id',
      status: 'SUBMITTED',
      completionStatus: 'PENDING_STUDENT_COMPLETION',
      submissionSource: 'ADMISSIONS_BULK_UPLOAD',
      personal: {},
      address: {},
      school: {},
      coursePreferences: [],
      reviewStep: {},
      examCycleId: '2026',
      version: 1,
      submittedAt: '2026-08-06T00:00:00Z',
      createdAt: '2026-08-06T00:00:00Z',
      updatedAt: '2026-08-06T00:00:00Z',
    },
    fields: [],
    progress: { completed: 0, total: 1, percent: 0, remaining: [] },
  }, { status: 200 }));
  const service = new BackendApplicationService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));

  const result = await service.getStudentProfileCompletion();

  expect(result.ok).toBe(true);
  expect(fetcher).toHaveBeenCalledWith(
    'http://backend.test/api/v1/applications/profile/',
    expect.objectContaining({ credentials: 'include' }),
  );
});
```

```typescript
it('saves a student profile draft with versioned sections', async () => {
  const fetcher = vi.fn().mockResolvedValue(jsonResponse({ application: {}, fields: [], progress: { completed: 1, total: 2, percent: 50, remaining: [] } }, { status: 200 }));
  const service = new BackendApplicationService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));

  const result = await service.saveStudentProfileDraft({
    version: 3,
    personal: { firstName: 'Updated' },
  });

  expect(result.ok).toBe(true);
  expect(fetcher).toHaveBeenCalledWith(
    'http://backend.test/api/v1/applications/profile/',
    expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({ version: 3, personal: { firstName: 'Updated' } }),
    }),
  );
});
```

```typescript
it('uploads a student profile attachment', async () => {
  const fetcher = vi.fn().mockResolvedValue(jsonResponse({ id: 'attachment-id', section: 'PWD Information', fieldKey: 'PWD ID Attachment', filename: 'pwd.pdf', contentType: 'application/pdf', size: 12 }, { status: 201 }));
  const service = new BackendApplicationService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));
  const file = new File(['%PDF-1.4'], 'pwd.pdf', { type: 'application/pdf' });

  const result = await service.uploadStudentProfileAttachment('PWD ID Attachment', file);

  expect(result.ok).toBe(true);
  expect(fetcher).toHaveBeenCalledWith(
    'http://backend.test/api/v1/applications/profile/attachments/',
    expect.objectContaining({ method: 'POST', body: expect.any(FormData) }),
  );
});
```

```typescript
it('submits a completed student profile', async () => {
  const fetcher = vi.fn().mockResolvedValue(jsonResponse({ application: {}, fields: [], progress: { completed: 2, total: 2, percent: 100, remaining: [] } }, { status: 200 }));
  const service = new BackendApplicationService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));

  const result = await service.submitStudentProfile(4);

  expect(result.ok).toBe(true);
  expect(fetcher).toHaveBeenCalledWith(
    'http://backend.test/api/v1/applications/profile/submit/',
    expect.objectContaining({ method: 'POST', body: JSON.stringify({ version: 4 }) }),
  );
});
```

- [ ] **Step 2: Run service tests and confirm they fail**

Run:

```powershell
cd frontend
npm test -- backendApplicationService.test.ts
```

Expected: fail because methods/types do not exist.

- [ ] **Step 3: Add types**

In `backendApplicationService.ts`, add:

```typescript
export interface StudentProfileProgressItem {
  section: string;
  fieldKey: string;
  label: string;
  type: 'field' | 'file' | string;
  required: boolean;
}

export interface StudentProfileProgress {
  completed: number;
  total: number;
  percent: number;
  remaining: StudentProfileProgressItem[];
}

export interface StudentProfileCompletion {
  application: BackendApplication;
  fields: StudentRegistrationFieldConfig[];
  progress: StudentProfileProgress;
}

export interface StudentProfileDraftInput {
  version: number;
  personal?: Record<string, unknown>;
  address?: Record<string, unknown>;
  school?: Record<string, unknown>;
  coursePreferences?: Record<string, unknown>[];
  reviewStep?: Record<string, unknown>;
}
```

- [ ] **Step 4: Add service methods**

Inside `BackendApplicationService`, add:

```typescript
async getStudentProfileCompletion(): Promise<ServiceResult<StudentProfileCompletion>> {
  return this.apiClient.request<StudentProfileCompletion>('/api/v1/applications/profile/');
}

async saveStudentProfileDraft(input: StudentProfileDraftInput): Promise<ServiceResult<StudentProfileCompletion>> {
  return this.apiClient.request<StudentProfileCompletion>('/api/v1/applications/profile/', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

async uploadStudentProfileAttachment(fieldName: string, file: File): Promise<ServiceResult<RegistrationAttachment>> {
  const body = new FormData();
  body.append('fieldName', fieldName);
  body.append('file', file);
  return this.apiClient.request<RegistrationAttachment>('/api/v1/applications/profile/attachments/', {
    method: 'POST',
    body,
  });
}

async submitStudentProfile(version: number): Promise<ServiceResult<StudentProfileCompletion>> {
  return this.apiClient.request<StudentProfileCompletion>('/api/v1/applications/profile/submit/', {
    method: 'POST',
    body: JSON.stringify({ version }),
  });
}
```

- [ ] **Step 5: Run service tests**

Run:

```powershell
cd frontend
npm test -- backendApplicationService.test.ts
```

Expected: pass.

- [ ] **Step 6: Commit after Task 3 if implementing**

```powershell
git add frontend/src/services/backendApplicationService.ts frontend/src/services/backendApplicationService.test.ts
git commit -m "feat: add student profile frontend service"
```

---

### Task 4: Student Profile Page

**Files:**
- Create: `frontend/src/pages/student/StudentProfile.tsx`
- Create: `frontend/src/pages/student/StudentProfile.test.tsx`
- Modify: `frontend/src/routing/routes.tsx`
- Modify: `frontend/src/components/DashboardLayout.tsx`

**Interfaces:**
- Consumes:
  - `backendApplicationService.getStudentProfileCompletion()`
  - `backendApplicationService.saveStudentProfileDraft(input)`
  - `backendApplicationService.uploadStudentProfileAttachment(fieldName, file)`
  - `backendApplicationService.submitStudentProfile(version)`
  - `StudentProfileCompletion`
- Produces:
  - `/student/profile` route component

- [ ] **Step 1: Write failing page tests**

Create `frontend/src/pages/student/StudentProfile.test.tsx`:

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StudentProfile from './StudentProfile';
import { backendApplicationService } from '../../services/backendApplicationService';

vi.mock('../../services/backendApplicationService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/backendApplicationService')>();
  return {
    ...actual,
    backendApplicationService: {
      getStudentProfileCompletion: vi.fn(),
      saveStudentProfileDraft: vi.fn(),
      uploadStudentProfileAttachment: vi.fn(),
      submitStudentProfile: vi.fn(),
    },
  };
});

const mockService = vi.mocked(backendApplicationService);

function profileResponse() {
  return {
    application: {
      id: 'application-id',
      candidateId: 'PHL-2026-ABC123',
      status: 'SUBMITTED' as const,
      completionStatus: 'PENDING_STUDENT_COMPLETION' as const,
      submissionSource: 'ADMISSIONS_BULK_UPLOAD' as const,
      personal: { firstName: 'Bulk', lastName: 'Learner', email: 'bulk@example.test', mobile: '09171234567' },
      address: { region: 'Region IV-A', province: 'Batangas', city: 'Batangas City', barangay: 'Poblacion', street: 'Main', postalCode: '4200' },
      school: { lrn: '123456789012', schoolId: '301234', name: 'Test School', academicTrack: 'STEM', gradeLevel: 'Grade 12', enrollmentStatus: 'Enrolled', schoolYear: '2026-2027', gwa: '92.5' },
      coursePreferences: [{ university: 'UP Diliman', course: 'BS Physics' }],
      reviewStep: { privacyConsent: true, declarationAccepted: true },
      additionalAttachments: [],
      examCycleId: '2026',
      version: 1,
      submittedAt: '2026-08-06T00:00:00Z',
      createdAt: '2026-08-06T00:00:00Z',
      updatedAt: '2026-08-06T00:00:00Z',
    },
    fields: [
      { id: 1, section: 'Step 1 Registration', type: 'Student Registration Field', value: 'Guardian Contact Number', fieldSection: 'Personal Information', inputType: 'text', priority: 'High Priority', status: true },
      { id: 2, section: 'Step 1 Registration', type: 'Student Registration Field', value: 'Scholarship Essay', fieldSection: 'Additional Information', inputType: 'textarea', priority: 'Low Priority', status: true },
    ],
    progress: {
      completed: 23,
      total: 24,
      percent: 96,
      remaining: [{ section: 'personal', fieldKey: 'Guardian Contact Number', label: 'Guardian Contact Number', type: 'field', required: true }],
    },
  };
}

describe('StudentProfile', () => {
  beforeEach(() => {
    mockService.getStudentProfileCompletion.mockResolvedValue({ ok: true, data: profileResponse() });
    mockService.saveStudentProfileDraft.mockResolvedValue({ ok: true, data: profileResponse() });
    mockService.uploadStudentProfileAttachment.mockResolvedValue({ ok: true, data: { id: 'att-1', section: 'PWD Information', fieldKey: 'PWD ID Attachment', filename: 'pwd.pdf', contentType: 'application/pdf', size: 12 } });
    mockService.submitStudentProfile.mockResolvedValue({ ok: true, data: { ...profileResponse(), progress: { completed: 24, total: 24, percent: 100, remaining: [] } } });
  });

  it('renders loaded profile progress and pending dynamic fields', async () => {
    render(<StudentProfile />);

    expect(await screen.findByText('PHL-2026-ABC123')).toBeInTheDocument();
    expect(screen.getByText('96%')).toBeInTheDocument();
    expect(screen.getByLabelText('Guardian Contact Number')).toBeInTheDocument();
  });

  it('saves a draft with edited values and version', async () => {
    const user = userEvent.setup();
    render(<StudentProfile />);

    await user.clear(await screen.findByLabelText('Guardian Contact Number'));
    await user.type(screen.getByLabelText('Guardian Contact Number'), '09170000000');
    await user.click(screen.getByRole('button', { name: /save draft/i }));

    await waitFor(() => {
      expect(mockService.saveStudentProfileDraft).toHaveBeenCalledWith(expect.objectContaining({
        version: 1,
        personal: expect.objectContaining({ 'Guardian Contact Number': '09170000000' }),
      }));
    });
  });
});
```

- [ ] **Step 2: Run page tests and confirm they fail**

Run:

```powershell
cd frontend
npm test -- StudentProfile.test.tsx
```

Expected: fail because `StudentProfile.tsx` does not exist.

- [ ] **Step 3: Create page component state helpers**

In `StudentProfile.tsx`, import:

```typescript
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle, FileText, Loader2, Save, Upload } from 'lucide-react';
import { backendApplicationService, type BackendApplication, type StudentProfileCompletion, type StudentRegistrationFieldConfig } from '../../services/backendApplicationService';
import { cn } from '../../lib/utils';
```

Add helpers:

```typescript
type ProfileFormState = {
  personal: Record<string, unknown>;
  address: Record<string, unknown>;
  school: Record<string, unknown>;
  coursePreferences: Record<string, unknown>[];
  reviewStep: Record<string, unknown>;
};

const STATIC_FIELD_GROUPS = {
  personal: [
    ['firstName', 'First Name'],
    ['middleName', 'Middle Name'],
    ['lastName', 'Last Name'],
    ['suffix', 'Extension Name'],
    ['dateOfBirth', 'Birth Date'],
    ['sex', 'Sex'],
    ['email', 'Email Address'],
    ['mobile', 'Mobile Number'],
  ],
  address: [
    ['region', 'Region'],
    ['province', 'Province'],
    ['city', 'City'],
    ['barangay', 'Barangay'],
    ['street', 'Street'],
    ['postalCode', 'Postal Code'],
  ],
  school: [
    ['lrn', 'LRN'],
    ['schoolId', 'School ID'],
    ['name', 'School Name'],
    ['academicTrack', 'Academic Track'],
    ['gradeLevel', 'Grade Level'],
    ['enrollmentStatus', 'Enrollment Status'],
    ['schoolYear', 'School Year'],
    ['gwa', 'GWA'],
  ],
} as const;

function stateFromApplication(application: BackendApplication): ProfileFormState {
  return {
    personal: { ...application.personal },
    address: { ...application.address },
    school: { ...application.school },
    coursePreferences: application.coursePreferences.length ? application.coursePreferences.map((item) => ({ ...item })) : [{ university: '', course: '' }],
    reviewStep: { ...application.reviewStep },
  };
}

function isFieldActive(field: StudentRegistrationFieldConfig) {
  return field.status === true || field.status === 'Active';
}
```

- [ ] **Step 4: Implement data loading and states**

Add component state:

```typescript
const [profile, setProfile] = useState<StudentProfileCompletion | null>(null);
const [formState, setFormState] = useState<ProfileFormState | null>(null);
const [isLoading, setIsLoading] = useState(true);
const [isSaving, setIsSaving] = useState(false);
const [isSubmitting, setIsSubmitting] = useState(false);
const [message, setMessage] = useState('');
const [error, setError] = useState('');
```

Load on mount:

```typescript
useEffect(() => {
  let isMounted = true;
  const loadProfile = async () => {
    setIsLoading(true);
    const result = await backendApplicationService.getStudentProfileCompletion();
    if (!isMounted) return;
    setIsLoading(false);
    if (result.ok === false) {
      setError(result.error.message || 'Profile completion is not available.');
      return;
    }
    setProfile(result.data);
    setFormState(stateFromApplication(result.data.application));
  };
  void loadProfile();
  return () => { isMounted = false; };
}, []);
```

- [ ] **Step 5: Implement controlled field update functions**

Add:

```typescript
const updateSectionField = (section: 'personal' | 'address' | 'school', fieldKey: string, value: string | boolean) => {
  setFormState((current) => current ? {
    ...current,
    [section]: { ...current[section], [fieldKey]: value },
  } : current);
};

const updatePreference = (index: number, fieldKey: 'university' | 'course', value: string) => {
  setFormState((current) => {
    if (!current) return current;
    const next = current.coursePreferences.map((item, itemIndex) => itemIndex === index ? { ...item, [fieldKey]: value } : item);
    return { ...current, coursePreferences: next };
  });
};
```

- [ ] **Step 6: Render static sections**

Use compact full-width sections, not nested cards. Each input must have a real label:

```tsx
function renderTextInput(section: 'personal' | 'address' | 'school', fieldKey: string, label: string, inputType = 'text') {
  const value = String(formState?.[section][fieldKey] ?? '');
  return (
    <label key={`${section}-${fieldKey}`} className="flex min-w-0 flex-col gap-1 text-xs font-bold text-philsa-navy">
      {label}
      <input
        value={value}
        type={inputType}
        onChange={(event) => updateSectionField(section, fieldKey, event.target.value)}
        className="rounded-lg border border-philsa-border bg-white px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-philsa-navy/10"
      />
    </label>
  );
}
```

Render `Personal Information`, `Address Information`, and `School Information` using `STATIC_FIELD_GROUPS`.

- [ ] **Step 7: Render dynamic fields**

Compute:

```typescript
const dynamicFields = useMemo(() => (profile?.fields ?? []).filter((field) => (
  isFieldActive(field) &&
  field.section === 'Step 1 Registration' &&
  field.type === 'Student Registration Field'
)), [profile]);
```

Skip static known labels already covered by `STATIC_FIELD_GROUPS`. For non-file dynamic fields, store unknown/custom values under `personal[field.value]` by default. For dropdown fields, render a `select` from `field.optionValues`. For textarea fields, render `textarea`. For checkbox fields, render `input type="checkbox"`.

- [ ] **Step 8: Render file upload controls**

For dynamic `inputType === 'file'`, render:

```tsx
<label className="flex flex-col gap-2 rounded-lg border border-dashed border-philsa-border bg-white p-4 text-xs font-bold text-philsa-navy">
  <span>{field.value}</span>
  <input
    type="file"
    accept="application/pdf,image/png,image/jpeg"
    onChange={(event) => handleAttachmentChange(field.value, event)}
  />
</label>
```

Implement:

```typescript
const handleAttachmentChange = async (fieldName: string, event: ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;
  setMessage('');
  setError('');
  const result = await backendApplicationService.uploadStudentProfileAttachment(fieldName, file);
  if (result.ok === false) {
    setError(result.error.message);
    return;
  }
  const refreshed = await backendApplicationService.getStudentProfileCompletion();
  if (refreshed.ok !== false) {
    setProfile(refreshed.data);
    setFormState(stateFromApplication(refreshed.data.application));
  }
  setMessage('Attachment uploaded.');
};
```

- [ ] **Step 9: Implement draft save and submit actions**

Add:

```typescript
const handleSaveDraft = async () => {
  if (!profile || !formState) return;
  setIsSaving(true);
  setMessage('');
  setError('');
  const result = await backendApplicationService.saveStudentProfileDraft({
    version: profile.application.version,
    ...formState,
  });
  setIsSaving(false);
  if (result.ok === false) {
    setError(result.error.message);
    return;
  }
  setProfile(result.data);
  setFormState(stateFromApplication(result.data.application));
  setMessage('Draft saved.');
};

const handleSubmit = async (event: FormEvent) => {
  event.preventDefault();
  if (!profile) return;
  setIsSubmitting(true);
  setMessage('');
  setError('');
  const result = await backendApplicationService.submitStudentProfile(profile.application.version);
  setIsSubmitting(false);
  if (result.ok === false) {
    setError(result.error.message);
    return;
  }
  setProfile(result.data);
  setFormState(stateFromApplication(result.data.application));
  setMessage('Profile submitted for admissions review.');
};
```

When Submit is clicked, first call `saveStudentProfileDraft` with the current form state. If the save succeeds, call `submitStudentProfile` with the returned `application.version`. This keeps the final submit from losing unsaved edits.

- [ ] **Step 10: Add route**

In `routes.tsx`, import:

```typescript
import StudentProfile from '../pages/student/StudentProfile';
```

Add near other student routes:

```tsx
{ path: '/student/profile', element: <StudentProfile />, access: 'protected', allowedRoles: STUDENT },
```

- [ ] **Step 11: Add sidebar nav item**

In `DashboardLayout.tsx`, add `User` icon entry before Application:

```typescript
{ icon: User, label: 'Profile', href: '/student/profile' },
```

- [ ] **Step 12: Run frontend tests**

Run:

```powershell
cd frontend
npm test -- StudentProfile.test.tsx backendApplicationService.test.ts
```

Expected: pass.

- [ ] **Step 13: Commit after Task 4 if implementing**

```powershell
git add frontend/src/pages/student/StudentProfile.tsx frontend/src/pages/student/StudentProfile.test.tsx frontend/src/routing/routes.tsx frontend/src/components/DashboardLayout.tsx
git commit -m "feat: add student profile completion page"
```

---

### Task 5: Frontend Student Feature Gating

**Files:**
- Modify: `frontend/src/routing/RouteGuards.tsx`
- Modify: `frontend/src/routing/RouteGuards.test.tsx`
- Optionally modify: `frontend/src/pages/student/StudentDashboard.tsx`

**Interfaces:**
- Consumes:
  - `backendApplicationService.getStudentProfileCompletion()`
- Produces:
  - Student route redirects to `/student/profile` when profile completion is pending.

- [ ] **Step 1: Write route guard tests**

Update mocks in `RouteGuards.test.tsx`:

```typescript
vi.mock('../services/backendApplicationService', () => ({
  backendApplicationService: {
    getStudentProfileCompletion: vi.fn(),
  },
}));
```

Import:

```typescript
import { backendApplicationService } from '../services/backendApplicationService';
```

Add helper:

```typescript
const mockBackendApplicationService = vi.mocked(backendApplicationService);
```

In `beforeEach`, default:

```typescript
mockBackendApplicationService.getStudentProfileCompletion.mockResolvedValue({
  ok: false,
  error: { code: 'NOT_FOUND', message: 'Not found.' },
});
```

Add tests:

```typescript
it('redirects an incomplete student from a gated student feature to profile', async () => {
  mockBackendApplicationService.getStudentProfileCompletion.mockResolvedValue({
    ok: true,
    data: {
      application: { id: 'app-1', status: 'SUBMITTED', completionStatus: 'PENDING_STUDENT_COMPLETION', personal: {}, address: {}, school: {}, coursePreferences: [], reviewStep: {}, examCycleId: '2026', version: 1, submittedAt: null, createdAt: '', updatedAt: '' },
      fields: [],
      progress: { completed: 0, total: 1, percent: 0, remaining: [] },
    },
  });

  render(
    <MemoryRouter initialEntries={['/student/permit']}>
      <Routes>
        <Route path="/student/permit" element={<ProtectedRoute allowedRoles={['STUDENT']} layout="standalone"><h1>Permit</h1></ProtectedRoute>} />
        <Route path="/student/profile" element={<><h1>Profile page</h1><LocationProbe /></>} />
      </Routes>
    </MemoryRouter>,
  );

  expect(await screen.findByRole('heading', { name: 'Profile page' })).toBeInTheDocument();
  expect(screen.getByText('Location: /student/profile')).toBeInTheDocument();
});
```

```typescript
it('does not redirect an incomplete student already on the profile route', async () => {
  mockBackendApplicationService.getStudentProfileCompletion.mockResolvedValue({
    ok: true,
    data: {
      application: { id: 'app-1', status: 'SUBMITTED', completionStatus: 'PENDING_STUDENT_COMPLETION', personal: {}, address: {}, school: {}, coursePreferences: [], reviewStep: {}, examCycleId: '2026', version: 1, submittedAt: null, createdAt: '', updatedAt: '' },
      fields: [],
      progress: { completed: 0, total: 1, percent: 0, remaining: [] },
    },
  });

  render(
    <MemoryRouter initialEntries={['/student/profile']}>
      <Routes>
        <Route path="/student/profile" element={<ProtectedRoute allowedRoles={['STUDENT']} layout="standalone"><h1>Profile content</h1></ProtectedRoute>} />
      </Routes>
    </MemoryRouter>,
  );

  expect(await screen.findByRole('heading', { name: 'Profile content' })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run route guard tests and confirm they fail**

Run:

```powershell
cd frontend
npm test -- RouteGuards.test.tsx
```

Expected: fail because pending-profile gating is not implemented.

- [ ] **Step 3: Add pending-profile hook**

In `RouteGuards.tsx`, import:

```typescript
import { backendApplicationService } from '../services/backendApplicationService';
```

Add:

```typescript
function usePendingStudentProfile(user: User | null) {
  const [state, setState] = useState<{ loading: boolean; pending: boolean }>({ loading: false, pending: false });

  useEffect(() => {
    let isMounted = true;
    if (!user || user.role !== 'STUDENT') {
      setState({ loading: false, pending: false });
      return;
    }
    setState({ loading: true, pending: false });
    backendApplicationService.getStudentProfileCompletion().then((result) => {
      if (!isMounted) return;
      setState({ loading: false, pending: result.ok !== false });
    });
    return () => { isMounted = false; };
  }, [user?.id, user?.role]);

  return state;
}
```

Add `useState` to the existing React import.

- [ ] **Step 4: Apply gating in ProtectedRoute**

In `ProtectedRoute`, after authorization checks and before rendering content:

```typescript
const pendingProfile = usePendingStudentProfile(user);
const isStudentProfileRoute = location.pathname === '/student/profile';
const isStudentDashboardRoute = location.pathname === '/dashboard';
const studentCompletionExemptRoute = isStudentProfileRoute || isStudentDashboardRoute;

if (pendingProfile.loading) return <LoadingScreen />;
if (pendingProfile.pending && user.role === 'STUDENT' && !studentCompletionExemptRoute) {
  return <Navigate to="/student/profile" state={{ from: location.pathname, profileRequired: true }} replace />;
}
```

- [ ] **Step 5: Apply gating in ExamRoute**

In `ExamRoute`, after checking Student role:

```typescript
const pendingProfile = usePendingStudentProfile(user);
if (pendingProfile.loading) return <LoadingScreen />;
if (pendingProfile.pending) return <Navigate to="/student/profile" state={{ from: location.pathname, profileRequired: true }} replace />;
```

- [ ] **Step 6: Optionally add dashboard notice**

Only if low-risk, add a small notice in `StudentDashboard.tsx` when a pending profile check succeeds. Do not refactor dashboard data sources. If this gets messy, skip it and rely on route gating plus Profile page notification.

- [ ] **Step 7: Run route guard tests**

Run:

```powershell
cd frontend
npm test -- RouteGuards.test.tsx
```

Expected: pass.

- [ ] **Step 8: Commit after Task 5 if implementing**

```powershell
git add frontend/src/routing/RouteGuards.tsx frontend/src/routing/RouteGuards.test.tsx frontend/src/pages/student/StudentDashboard.tsx
git commit -m "feat: gate student features until profile completion"
```

---

### Task 6: API Documentation and Final Verification

**Files:**
- Modify: `docs/api/API-ENDPOINTS.md`
- Test: backend and frontend command outputs

**Interfaces:**
- Consumes:
  - Implemented endpoints and frontend behavior from Tasks 1-5
- Produces:
  - Updated documented endpoint inventory

- [ ] **Step 1: Update API endpoint table**

In `docs/api/API-ENDPOINTS.md`, add implemented rows near the applications endpoints:

```markdown
| `GET`, `PATCH` | `/api/v1/applications/profile/` | Required bearer access token | Owning `STUDENT` with pending bulk-upload completion | Read current profile completion state or save draft profile data | Implemented |
| `POST` | `/api/v1/applications/profile/attachments/` | Required bearer access token | Owning `STUDENT` with pending bulk-upload completion | Upload or replace one configured dynamic profile attachment | Implemented |
| `POST` | `/api/v1/applications/profile/submit/` | Required bearer access token | Owning `STUDENT` with pending bulk-upload completion | Validate pending profile requirements and mark application completion ready for admissions review | Implemented |
```

- [ ] **Step 2: Add narrative contract**

Add a short subsection after the student application draft/submission section:

```markdown
### Student profile completion for bulk-uploaded accounts

Bulk-uploaded applications are created with `submissionSource: "ADMISSIONS_BULK_UPLOAD"` and `completionStatus: "PENDING_STUDENT_COMPLETION"`. After first login and temporary password change, the owning Student uses `/api/v1/applications/profile/` to complete current Student Registration requirements. The response includes the owned application, enabled Student Registration field configuration, and a progress object with completed, total, percent, and remaining blocking requirements. Draft saves require the current integer `version`; stale saves return `409 CONFLICT`. File uploads accept only configured enabled `file` fields and reuse the private PDF/JPEG/PNG validation rules. Successful profile submission keeps the application in `SUBMITTED`, sets `completionStatus: "COMPLETE"`, increments `version`, updates `submittedAt`, and makes the application available to normal admissions review. Reviewer approval remains blocked while completion is pending.
```

- [ ] **Step 3: Run backend verification**

Run:

```powershell
cd backend
python manage.py test apps.applications.tests.test_application_endpoints --settings=config.settings.test
python manage.py check --settings=config.settings.local
```

Expected: pass.

- [ ] **Step 4: Run frontend verification**

Run:

```powershell
cd frontend
npm test -- backendApplicationService.test.ts RouteGuards.test.tsx StudentProfile.test.tsx
npm run lint
npm run build
```

Expected: pass.

- [ ] **Step 5: Inspect diff**

Run:

```powershell
git status -sb
git diff --stat
```

Check that only intended backend, frontend, tests, and docs files changed.

- [ ] **Step 6: Commit after Task 6 if implementing**

```powershell
git add docs/api/API-ENDPOINTS.md
git commit -m "docs: document student profile completion api"
```

---

## Plan Self-Review

Spec coverage:

- Profile module after first login: covered by Tasks 4 and 5.
- Required/optional fields missing from bulk upload: covered by Tasks 1 and 4.
- Dynamic Student Registration configuration: covered by Tasks 1, 2, 4.
- Required document uploads: covered by Tasks 1, 2, 4.
- Required validation and business rules: covered by Tasks 1 and 2.
- Completion progress indicator: covered by Tasks 1, 2, 4.
- Save draft: covered by Tasks 1, 2, 3, 4.
- Submit and update for admissions review: covered by Tasks 1 and 2.
- Restrict incomplete student features: covered by Task 5.
- Documentation: covered by Task 6.

Red-flag scan:

- Checked for unfinished markers and vague-only task steps; none are intentionally left in this plan.

Type consistency:

- Backend names use `StudentProfileCompletion` in serializers/views and `student_profile` URL names.
- Frontend service methods match the endpoint names and page tests.
- `version` is consistently the optimistic-concurrency field for draft save and submit.
