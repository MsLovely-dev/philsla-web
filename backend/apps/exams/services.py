from __future__ import annotations

from collections import defaultdict
from decimal import Decimal, InvalidOperation
from typing import Any

from django.db import transaction
from django.db.models import Prefetch
from django.utils.dateparse import parse_date
from django.utils import timezone
from django.utils.text import slugify
from rest_framework.exceptions import APIException, PermissionDenied, ValidationError

from apps.accounts.models import AccountProfile

from .models import (
    AcademicYear,
    Agency,
    BlueprintCategory,
    BlueprintDifficultyDistribution,
    BlueprintQuestionTypeDistribution,
    BlueprintSection,
    BlueprintSectionTopic,
    BlueprintStatus,
    BlueprintVersion,
    BlueprintWorkflowHistory,
    DifficultyLevel,
    ExamBlueprint,
    ExamType,
    QuestionType,
    Competency,
    DifficultyLevel,
    ExamBlueprint,
    ExamType,
    EssayRubric,
    Question,
    QuestionAnswer,
    QuestionAttachment,
    QuestionChoice,
    QuestionStatus,
    QuestionTag,
    QuestionWorkflowHistory,
    ExamSet,
    ExamSetAssemblyRun,
    ExamSetAssemblyRunItem,
    ExamSetQuestion,
    ExamSetQuestionReplacement,
    ExamSetStatus,
    ExamSetValidationResult,
    ExamSetWorkflowHistory,
    SelectionMethod,
    ValidationResult,
    QuestionType,
    Tag,
    Subject,
    Topic,
)


QUESTION_TYPE_KEY_MAP = {
    "MCQ": "mcq",
    "TRUE_FALSE": "tf",
    "IDENTIFICATION": "fib",
    "ESSAY": "essay",
}

QUESTION_TYPE_CODE_MAP = {
    "mcq": "MCQ",
    "tf": "TRUE_FALSE",
    "fib": "IDENTIFICATION",
    "essay": "ESSAY",
}


class ExamSetLifecycleConflict(APIException):
    status_code = 409
    default_code = "exam_set_lifecycle_conflict"
    default_detail = "The requested Exam Set lifecycle action is not allowed."


class ExamSetValidationConflict(APIException):
    status_code = 409
    default_code = "exam_set_validation_conflict"
    default_detail = "The Exam Set must satisfy its validation requirements before this transition."


EXAM_SET_ALLOWED_TRANSITIONS = {
    ExamSetStatus.DRAFT: {ExamSetStatus.ACADEMIC_REVIEW},
    ExamSetStatus.ACADEMIC_REVIEW: {ExamSetStatus.REVISION_REQUIRED, ExamSetStatus.APPROVED},
    ExamSetStatus.REVISION_REQUIRED: {ExamSetStatus.ACADEMIC_REVIEW},
    ExamSetStatus.APPROVED: {ExamSetStatus.PUBLISHED},
    ExamSetStatus.PUBLISHED: {ExamSetStatus.ARCHIVED},
    ExamSetStatus.ARCHIVED: set(),
}

EXAM_SET_EDITABLE_STATUSES = {ExamSetStatus.DRAFT, ExamSetStatus.REVISION_REQUIRED}


class BlueprintTransitionConflict(APIException):
    status_code = 409
    default_code = "invalid_status_transition"
    default_detail = "The requested blueprint transition conflicts with the current workflow state."

    def __init__(self, *, current_status: str, requested_status: str, detail: str) -> None:
        super().__init__(
            {
                "code": self.default_code,
                "detail": detail,
                "current_status": current_status,
                "requested_status": requested_status,
            }
        )


def _payload_value(
    payload: dict[str, Any],
    snake_key: str,
    camel_key: str | None = None,
    default: Any = None,
) -> Any:
    if snake_key in payload:
        return payload[snake_key]
    if camel_key and camel_key in payload:
        return payload[camel_key]
    return default


def blueprint_queryset():
    return (
        ExamBlueprint.objects.select_related(
            "agency",
            "category",
            "created_by__user",
            "archived_by__user",
        )
        .prefetch_related(
            Prefetch(
                "versions",
                queryset=BlueprintVersion.objects.select_related(
                    "academic_year",
                    "created_by__user",
                    "approved_by__user",
                    "published_by__user",
                    "retired_by__user",
                ).prefetch_related(
                    Prefetch(
                        "sections",
                        queryset=BlueprintSection.objects.select_related("subject").prefetch_related(
                            "topic_requirements__topic",
                            "difficulty_requirements",
                            "question_type_requirements__question_type",
                        ),
                    ),
                    "workflow_history__initiated_by__user",
                ),
            )
        )
    )


def _profile_display_name(profile: AccountProfile | None) -> str:
    if profile is None:
        return ""
    user = profile.user
    full_name = getattr(user, "get_full_name", lambda: "")() or ""
    if full_name.strip():
        return full_name.strip()
    if getattr(user, "email", ""):
        return user.email
    return getattr(user, "username", "")


def _slug_code(value: str, fallback: str) -> str:
    cleaned = slugify(value).replace("-", "_").upper()
    return cleaned or fallback


def _ensure_unique_code(model, base_code: str, code_field: str = "code") -> str:
    candidate = base_code
    suffix = 1
    while model.objects.filter(**{code_field: candidate}).exists():
        suffix += 1
        candidate = f"{base_code}_{suffix}"
    return candidate


def get_or_create_agency(name: str) -> Agency:
    base_code = _slug_code(name, "AGENCY")
    code = _ensure_unique_code(Agency, base_code)
    agency, _ = Agency.objects.get_or_create(
        name=name.strip(),
        defaults={"code": code},
    )
    if agency.code != code and not agency.code:
        agency.code = code
        agency.save(update_fields=["code"])
    return agency


def get_or_create_category(name: str) -> BlueprintCategory:
    category, _ = BlueprintCategory.objects.get_or_create(name=name.strip())
    return category


def get_or_create_academic_year(name: str) -> AcademicYear:
    academic_year, _ = AcademicYear.objects.get_or_create(name=name.strip())
    return academic_year


def get_or_create_subject(name: str) -> Subject:
    base_code = _slug_code(name, "SUBJECT")
    code = _ensure_unique_code(Subject, base_code)
    subject, created = Subject.objects.get_or_create(
        name=name.strip(),
        defaults={"code": code},
    )
    if created:
        return subject
    if not subject.code:
        subject.code = code
        subject.save(update_fields=["code"])
    return subject


def get_or_create_topic(subject: Subject, name: str) -> Topic:
    base_code = _slug_code(name, "TOPIC")
    code = _ensure_unique_code(Topic, base_code)
    topic, created = Topic.objects.get_or_create(
        subject=subject,
        name=name.strip(),
        defaults={"code": code},
    )
    if created:
        return topic
    if not topic.code:
        topic.code = code
        topic.save(update_fields=["code"])
    return topic


def get_or_create_question_type(code_or_label: str) -> QuestionType:
    normalized = code_or_label.strip().upper().replace(" ", "_")
    label_lookup = {
        "MULTIPLE_CHOICE": "MCQ",
        "MULTIPLE CHOICE": "MCQ",
        "TRUE_FALSE": "TRUE_FALSE",
        "TRUE/FALSE": "TRUE_FALSE",
        "IDENTIFICATION": "IDENTIFICATION",
        "ESSAY": "ESSAY",
    }
    mapped_code = label_lookup.get(normalized, normalized if normalized in QUESTION_TYPE_CODE_MAP.values() else normalized)
    defaults = {
        "name": mapped_code.replace("_", " ").title(),
        "description": "",
    }
    question_type, _ = QuestionType.objects.get_or_create(code=mapped_code, defaults=defaults)
    return question_type


def _parse_decimal(value: Any, default: str = "0") -> Decimal:
    raw_value = value if value not in (None, "") else default
    try:
        return Decimal(str(raw_value))
    except (InvalidOperation, ValueError):
        return Decimal(default)


def _parse_date(value: Any) -> Any:
    if value in (None, ""):
        return None
    if hasattr(value, "isoformat"):
        return value
    parsed = parse_date(str(value))
    return parsed if parsed is not None else None


def _normalize_exam_type(value: Any) -> str:
    if not value:
        return ExamType.ADMISSION
    normalized = str(value).strip().lower().replace(" ", "_")
    return normalized if normalized in ExamType.values else ExamType.OTHER


def _normalize_blueprint_status(value: Any) -> str:
    if not value:
        return BlueprintStatus.DRAFT
    normalized = str(value).strip().lower().replace(" ", "_")
    return normalized if normalized in BlueprintStatus.values else BlueprintStatus.DRAFT


BLUEPRINT_TRANSITION_MAP = {
    BlueprintStatus.DRAFT: {BlueprintStatus.SUBMITTED},
    BlueprintStatus.SUBMITTED: {BlueprintStatus.ACADEMIC_REVIEW, BlueprintStatus.REVISION_REQUIRED},
    BlueprintStatus.ACADEMIC_REVIEW: {BlueprintStatus.APPROVED, BlueprintStatus.REVISION_REQUIRED},
    BlueprintStatus.REVISION_REQUIRED: {BlueprintStatus.DRAFT},
    BlueprintStatus.APPROVED: {BlueprintStatus.PUBLISHED},
    BlueprintStatus.PUBLISHED: {BlueprintStatus.RETIRED},
    BlueprintStatus.RETIRED: {BlueprintStatus.ARCHIVED},
    BlueprintStatus.ARCHIVED: set(),
}


def _validate_blueprint_transition(
    *,
    current_status: str,
    requested_status: str,
    actor_profile: AccountProfile,
    version: BlueprintVersion,
) -> None:
    if current_status == requested_status:
        raise BlueprintTransitionConflict(
            current_status=current_status,
            requested_status=requested_status,
            detail=f"The blueprint is already {current_status.replace('_', ' ')}.",
        )

    allowed_targets = BLUEPRINT_TRANSITION_MAP.get(current_status)
    if allowed_targets is None or requested_status not in allowed_targets:
        if current_status == BlueprintStatus.PUBLISHED and requested_status == BlueprintStatus.DRAFT:
            raise BlueprintTransitionConflict(
                current_status=current_status,
                requested_status=requested_status,
                detail="A published blueprint cannot be returned to draft.",
            )
        raise BlueprintTransitionConflict(
            current_status=current_status,
            requested_status=requested_status,
            detail=(
                f"A blueprint in {current_status.replace('_', ' ')} cannot transition to "
                f"{requested_status.replace('_', ' ')}."
            ),
        )

    if requested_status == BlueprintStatus.APPROVED and version.created_by_id == actor_profile.id:
        raise PermissionDenied("Blueprint creators cannot approve their own blueprints.")


def _normalize_question_type_key(value: str) -> str:
    return str(value).strip().lower().replace(" ", "_")


def _section_topic_counts(section_payload: dict[str, Any]) -> dict[str, int]:
    topics = section_payload.get("topics") or []
    if not topics:
        return {}
    topic_count = len(topics)
    item_count = int(_payload_value(section_payload, "item_count", "itemCount", 0) or 0)
    base = item_count // topic_count if topic_count else 0
    remainder = item_count % topic_count if topic_count else 0
    counts: dict[str, int] = {}
    for index, topic_name in enumerate(topics):
        counts[str(topic_name)] = base + (1 if index < remainder else 0)
    return counts


@transaction.atomic
def create_exam_blueprint(*, payload: dict[str, Any], actor_profile: AccountProfile) -> ExamBlueprint:
    agency = get_or_create_agency(str(_payload_value(payload, "institution", default="Unspecified Agency")))
    category = get_or_create_category(str(_payload_value(payload, "exam_category", "examCategory", "General")))
    blueprint = ExamBlueprint.objects.create(
        spec_code=str(_payload_value(payload, "code", default=f"BP-{timezone.now():%Y%m%d%H%M%S}")),
        exam_type=_normalize_exam_type(_payload_value(payload, "exam_type", "examType")),
        agency=agency,
        category=category,
        created_by=actor_profile,
    )

    version = _create_or_update_version(blueprint=blueprint, payload=payload, actor_profile=actor_profile, is_create=True)
    blueprint.current_version_number = version.version_number
    blueprint.save(update_fields=["current_version_number", "updated_at"])
    return blueprint


@transaction.atomic
def update_exam_blueprint(*, blueprint: ExamBlueprint, payload: dict[str, Any], actor_profile: AccountProfile) -> ExamBlueprint:
    blueprint.spec_code = str(_payload_value(payload, "code", default=blueprint.spec_code)).strip() or blueprint.spec_code
    blueprint.exam_type = _normalize_exam_type(_payload_value(payload, "exam_type", "examType", blueprint.exam_type))
    if _payload_value(payload, "institution") is not None:
        blueprint.agency = get_or_create_agency(str(_payload_value(payload, "institution")))
    if _payload_value(payload, "exam_category", "examCategory") is not None:
        blueprint.category = get_or_create_category(str(_payload_value(payload, "exam_category", "examCategory")))
    blueprint.save()

    version = _create_or_update_version(blueprint=blueprint, payload=payload, actor_profile=actor_profile, is_create=False)
    blueprint.current_version_number = version.version_number
    blueprint.save(update_fields=["current_version_number", "updated_at"])
    return blueprint


@transaction.atomic
def clone_exam_blueprint(*, blueprint: ExamBlueprint, actor_profile: AccountProfile) -> ExamBlueprint:
    source_version = latest_blueprint_version(blueprint)
    clone_code = _ensure_unique_code(ExamBlueprint, f"{blueprint.spec_code}_CLONE", code_field="spec_code")
    cloned_version_number = (source_version.version_number + Decimal("0.10")) if source_version is not None else blueprint.current_version_number
    cloned = ExamBlueprint.objects.create(
        spec_code=clone_code,
        exam_type=blueprint.exam_type,
        agency=blueprint.agency,
        category=blueprint.category,
        cloned_from_blueprint=blueprint,
        current_version_number=cloned_version_number,
        created_by=actor_profile,
    )

    if source_version is not None:
        version = BlueprintVersion.objects.create(
            blueprint=cloned,
            version_number=cloned_version_number,
            name=source_version.name,
            description=source_version.description,
            academic_year=source_version.academic_year,
            effective_date=source_version.effective_date,
            expiration_date=source_version.expiration_date,
            status=BlueprintStatus.DRAFT,
            shuffle_questions=source_version.shuffle_questions,
            shuffle_choices=source_version.shuffle_choices,
            active_items_only=source_version.active_items_only,
            shared_stimulus_required=source_version.shared_stimulus_required,
            shared_stimulus_min_count=source_version.shared_stimulus_min_count,
            shared_stimulus_questions_per_stimulus=source_version.shared_stimulus_questions_per_stimulus,
            max_item_reuse_count=source_version.max_item_reuse_count,
            version_compatibility=source_version.version_compatibility,
            created_by=actor_profile,
        )
        _clone_sections(source_version, version)
        BlueprintWorkflowHistory.objects.create(
            blueprint_version=version,
            previous_status=None,
            new_status=BlueprintStatus.DRAFT,
            action="Created (Cloned)",
            remarks=f"Cloned from {blueprint.spec_code} v{source_version.version_number}.",
            initiated_by=actor_profile,
        )
    return cloned


@transaction.atomic
def transition_blueprint_version(
    *,
    version: BlueprintVersion,
    target_status: str,
    actor_profile: AccountProfile,
    remarks: str = "",
) -> BlueprintVersion:
    normalized_status = _normalize_blueprint_status(target_status)
    previous_status = version.status
    _validate_blueprint_transition(
        current_status=previous_status,
        requested_status=normalized_status,
        actor_profile=actor_profile,
        version=version,
    )
    version.status = normalized_status
    timestamp = timezone.now()

    if normalized_status == BlueprintStatus.SUBMITTED:
        version.submitted_at = timestamp
    elif normalized_status == BlueprintStatus.APPROVED:
        version.approved_at = timestamp
        version.approved_by = actor_profile
    elif normalized_status == BlueprintStatus.PUBLISHED:
        version.published_at = timestamp
        version.published_by = actor_profile
    elif normalized_status == BlueprintStatus.RETIRED:
        version.retired_at = timestamp
        version.retired_by = actor_profile
    version.save()

    BlueprintWorkflowHistory.objects.create(
        blueprint_version=version,
        previous_status=previous_status,
        new_status=normalized_status,
        action=f"Transitioned to {normalized_status.replace('_', ' ').title()}",
        remarks=remarks,
        initiated_by=actor_profile,
    )
    version.blueprint.current_version_number = version.version_number
    version.blueprint.save(update_fields=["current_version_number", "updated_at"])
    return version


def latest_blueprint_version(blueprint: ExamBlueprint) -> BlueprintVersion | None:
    return blueprint.versions.order_by("-version_number", "-created_at").first()


def serialize_blueprint(blueprint: ExamBlueprint) -> dict[str, Any]:
    version = latest_blueprint_version(blueprint)
    if version is None:
        return {
            "id": str(blueprint.pk),
            "current_version_id": None,
            "code": blueprint.spec_code,
            "name": "",
            "description": "",
            "exam_type": blueprint.get_exam_type_display(),
            "academic_year": "",
            "institution": blueprint.agency.name,
            "exam_category": blueprint.category.name,
            "status": BlueprintStatus.DRAFT.upper(),
            "version": str(blueprint.current_version_number),
            "owner": _profile_display_name(blueprint.created_by),
            "created_at": blueprint.created_at.isoformat(),
            "effective_date": None,
            "expiration_date": None,
            "sections": [],
            "rules": {
                "total_items": 0,
                "total_marks": 0,
                "total_time_limit": 0,
                "shared_stimulus_requirement": {"required": False, "min_count": 0, "questions_per_stimulus": 0},
                "randomization_rules": {"shuffle_questions": True, "shuffle_choices": True, "fixed_sequence": False},
                "max_reuse_limit": 0,
                "version_compatibility": ">= 1.0",
                "active_item_only": True,
            },
            "history": [],
        }

    return {
        "id": str(blueprint.pk),
        "current_version_id": str(version.pk),
        "code": blueprint.spec_code,
        "name": version.name,
        "description": version.description,
        "exam_type": blueprint.get_exam_type_display(),
        "academic_year": version.academic_year.name,
        "institution": blueprint.agency.name,
        "exam_category": blueprint.category.name,
        "status": version.status.upper(),
        "version": str(version.version_number),
        "owner": _profile_display_name(blueprint.created_by),
        "created_at": blueprint.created_at.isoformat(),
        "effective_date": version.effective_date.isoformat() if version.effective_date else "",
        "expiration_date": version.expiration_date.isoformat() if version.expiration_date else "",
        "sections": [serialize_section(section) for section in version.sections.all().order_by("display_order", "section_number")],
        "rules": serialize_rules(version),
        "history": [serialize_history(history) for history in version.workflow_history.all().order_by("created_at")],
    }


def serialize_section(section: BlueprintSection) -> dict[str, Any]:
    topic_names = [item.topic.name for item in section.topic_requirements.all().select_related("topic").order_by("created_at")]
    difficulty_distribution = {
        item.difficulty: item.required_item_count for item in section.difficulty_requirements.all()
    }
    item_type_distribution = _question_type_distribution(section)
    marks_per_item = float(section.total_marks) / section.item_count if section.item_count else 0

    return {
        "id": str(section.pk),
        "name": section.section_name,
        "subject": section.subject.name,
        "topics": topic_names,
        "competencies": section.competencies or [],
        "cognitive_levels": section.cognitive_levels or {},
        "item_count": section.item_count,
        "marks_per_item": marks_per_item,
        "total_marks": float(section.total_marks),
        "passing_score": float(section.passing_score),
        "time_allocation": section.time_limit_minutes,
        "instructions": section.instructions,
        "difficulty_distribution": {
            "easy": difficulty_distribution.get(DifficultyLevel.EASY, 0),
            "moderate": difficulty_distribution.get(DifficultyLevel.MODERATE, 0),
            "difficult": difficulty_distribution.get(DifficultyLevel.DIFFICULT, 0),
        },
        "item_type_distribution": item_type_distribution,
    }


def serialize_rules(version: BlueprintVersion) -> dict[str, Any]:
    sections = list(version.sections.all())
    return {
        "total_items": sum(section.item_count for section in sections),
        "total_marks": float(sum(section.total_marks for section in sections)),
        "total_time_limit": sum(section.time_limit_minutes for section in sections),
        "shared_stimulus_requirement": {
            "required": version.shared_stimulus_required,
            "min_count": version.shared_stimulus_min_count,
            "questions_per_stimulus": version.shared_stimulus_questions_per_stimulus,
        },
        "randomization_rules": {
            "shuffle_questions": version.shuffle_questions,
            "shuffle_choices": version.shuffle_choices,
            "fixed_sequence": not version.shuffle_questions,
        },
        "max_reuse_limit": version.max_item_reuse_count,
        "version_compatibility": version.version_compatibility,
        "active_item_only": version.active_items_only,
    }


def serialize_history(entry: BlueprintWorkflowHistory) -> dict[str, Any]:
    return {
        "id": str(entry.pk),
        "version": str(entry.blueprint_version.version_number),
        "action": entry.action,
        "updated_by": _profile_display_name(entry.initiated_by),
        "updated_at": entry.created_at.isoformat(),
        "comments": entry.remarks,
    }


def _question_type_distribution(section: BlueprintSection) -> dict[str, int]:
    result = {"mcq": 0, "tf": 0, "essay": 0, "fib": 0}
    for requirement in section.question_type_requirements.select_related("question_type").all():
        key = QUESTION_TYPE_KEY_MAP.get(requirement.question_type.code, requirement.question_type.code.lower())
        if key in result:
            result[key] = requirement.required_item_count
    return result


def _create_or_update_version(*, blueprint: ExamBlueprint, payload: dict[str, Any], actor_profile: AccountProfile, is_create: bool) -> BlueprintVersion:
    rules = payload.get("rules") or {}
    existing_version = latest_blueprint_version(blueprint)
    academic_year = get_or_create_academic_year(
        str(
            _payload_value(
                payload,
                "academic_year",
                "academicYear",
                existing_version.academic_year.name if existing_version else "TBD",
            )
        ),
    )
    version_number = _parse_decimal(_payload_value(payload, "version", default=str(existing_version.version_number) if existing_version else "1.0"), "1.0")
    version_defaults = {
        "name": str(_payload_value(payload, "name", default=existing_version.name if existing_version else blueprint.spec_code)),
        "description": str(_payload_value(payload, "description", default=existing_version.description if existing_version else "")),
        "academic_year": academic_year,
        "effective_date": _parse_date(_payload_value(payload, "effective_date", "effectiveDate")) if ("effective_date" in payload or "effectiveDate" in payload) else getattr(existing_version, "effective_date", None),
        "expiration_date": _parse_date(_payload_value(payload, "expiration_date", "expirationDate")) if ("expiration_date" in payload or "expirationDate" in payload) else getattr(existing_version, "expiration_date", None),
        "status": _normalize_blueprint_status(_payload_value(payload, "status", default=existing_version.status if existing_version else BlueprintStatus.DRAFT)),
        "shuffle_questions": bool(_payload_value(rules.get("randomization_rules", {}), "shuffle_questions", "shuffleQuestions", existing_version.shuffle_questions if existing_version else True)),
        "shuffle_choices": bool(_payload_value(rules.get("randomization_rules", {}), "shuffle_choices", "shuffleChoices", existing_version.shuffle_choices if existing_version else True)),
        "active_items_only": bool(_payload_value(rules, "active_item_only", "activeItemOnly", existing_version.active_items_only if existing_version else True)),
        "shared_stimulus_required": bool(_payload_value(rules.get("shared_stimulus_requirement", {}), "required", default=existing_version.shared_stimulus_required if existing_version else False)),
        "shared_stimulus_min_count": int(_payload_value(rules.get("shared_stimulus_requirement", {}), "min_count", "minCount", existing_version.shared_stimulus_min_count if existing_version else 0) or 0),
        "shared_stimulus_questions_per_stimulus": int(_payload_value(rules.get("shared_stimulus_requirement", {}), "questions_per_stimulus", "questionsPerStimulus", existing_version.shared_stimulus_questions_per_stimulus if existing_version else 0) or 0),
        "max_item_reuse_count": int(_payload_value(rules, "max_reuse_limit", "maxReuseLimit", existing_version.max_item_reuse_count if existing_version else 0) or 0),
        "version_compatibility": str(_payload_value(rules, "version_compatibility", "versionCompatibility", existing_version.version_compatibility if existing_version else ">= 1.0")),
        "created_by": actor_profile,
    }

    version = None
    if not is_create:
        version = latest_blueprint_version(blueprint)

    if version is None:
        version = BlueprintVersion.objects.create(
            blueprint=blueprint,
            version_number=version_number,
            **version_defaults,
        )
        BlueprintWorkflowHistory.objects.create(
            blueprint_version=version,
            previous_status=None,
            new_status=version.status,
            action="Created",
            remarks="Initial blueprint draft created.",
            initiated_by=actor_profile,
        )
    else:
        previous_status = version.status
        version.version_number = version_number
        for key, value in version_defaults.items():
            setattr(version, key, value)
        version.save()
        BlueprintWorkflowHistory.objects.create(
            blueprint_version=version,
            previous_status=previous_status,
            new_status=version.status,
            action="Updated",
            remarks="Blueprint draft updated.",
            initiated_by=actor_profile,
        )

    _sync_sections(version, payload.get("sections") or [])
    return version


def _sync_sections(version: BlueprintVersion, sections_payload: list[dict[str, Any]]) -> None:
    version.sections.all().delete()

    for index, section_payload in enumerate(sections_payload, start=1):
        subject = get_or_create_subject(str(section_payload.get("subject", "General")))
        section = BlueprintSection.objects.create(
            blueprint_version=version,
            section_number=index,
            section_name=str(section_payload.get("name", f"Section {index}")),
            subject=subject,
            item_count=int(_payload_value(section_payload, "item_count", "itemCount", 0) or 0),
            total_marks=Decimal(str(_payload_value(section_payload, "total_marks", "totalMarks", 0) or 0)),
            passing_score=Decimal(str(_payload_value(section_payload, "passing_score", "passingScore", 0) or 0)),
            time_limit_minutes=int(_payload_value(section_payload, "time_allocation", "timeAllocation", 0) or 0),
            instructions=str(section_payload.get("instructions", "")),
            display_order=index,
            cognitive_levels=_payload_value(section_payload, "cognitive_levels", "cognitiveLevels", {}) or {},
            competencies=section_payload.get("competencies") or [],
        )

        for topic_name, required_count in _section_topic_counts(section_payload).items():
            topic = get_or_create_topic(subject, topic_name)
            BlueprintSectionTopic.objects.create(
                blueprint_section=section,
                topic=topic,
                required_item_count=required_count,
            )

        for difficulty_key, required_count in (_payload_value(section_payload, "difficulty_distribution", "difficultyDistribution", {}) or {}).items():
            difficulty = {
                "easy": DifficultyLevel.EASY,
                "moderate": DifficultyLevel.MODERATE,
                "difficult": DifficultyLevel.DIFFICULT,
            }.get(str(difficulty_key).strip().lower(), DifficultyLevel.EASY)
            BlueprintDifficultyDistribution.objects.create(
                blueprint_section=section,
                difficulty=difficulty,
                required_item_count=int(required_count or 0),
            )

        for type_key, required_count in (_payload_value(section_payload, "item_type_distribution", "itemTypeDistribution", {}) or {}).items():
            question_type = get_or_create_question_type(QUESTION_TYPE_CODE_MAP.get(_normalize_question_type_key(type_key), str(type_key)))
            BlueprintQuestionTypeDistribution.objects.create(
                blueprint_section=section,
                question_type=question_type,
                required_item_count=int(required_count or 0),
            )


def _clone_sections(source_version: BlueprintVersion, target_version: BlueprintVersion) -> None:
    for section in source_version.sections.all().order_by("display_order", "section_number"):
        cloned_section = BlueprintSection.objects.create(
            blueprint_version=target_version,
            section_number=section.section_number,
            section_name=section.section_name,
            subject=section.subject,
            item_count=section.item_count,
            total_marks=section.total_marks,
            passing_score=section.passing_score,
            time_limit_minutes=section.time_limit_minutes,
            instructions=section.instructions,
            display_order=section.display_order,
            cognitive_levels=section.cognitive_levels,
            competencies=section.competencies,
        )

        for requirement in section.topic_requirements.select_related("topic").all():
            BlueprintSectionTopic.objects.create(
                blueprint_section=cloned_section,
                topic=requirement.topic,
                required_item_count=requirement.required_item_count,
            )

        for requirement in section.difficulty_requirements.all():
            BlueprintDifficultyDistribution.objects.create(
                blueprint_section=cloned_section,
                difficulty=requirement.difficulty,
                required_item_count=requirement.required_item_count,
            )

        for requirement in section.question_type_requirements.select_related("question_type").all():
            BlueprintQuestionTypeDistribution.objects.create(
                blueprint_section=cloned_section,
                question_type=requirement.question_type,
                required_item_count=requirement.required_item_count,
            )


QUESTION_TYPE_NORMALIZED_CODE_MAP = {
    "MCQ": "MCQ",
    "MULTIPLE_CHOICE": "MCQ",
    "MULTIPLE CHOICE": "MCQ",
    "TF": "TRUE_FALSE",
    "TRUE_FALSE": "TRUE_FALSE",
    "TRUE/FALSE": "TRUE_FALSE",
    "IDENTIFICATION": "IDENTIFICATION",
    "FIB": "IDENTIFICATION",
    "ESSAY": "ESSAY",
}

QUESTION_DIFFICULTY_MAP = {
    "EASY": DifficultyLevel.EASY,
    "LOW": DifficultyLevel.EASY,
    "MED": DifficultyLevel.MODERATE,
    "MEDIUM": DifficultyLevel.MODERATE,
    "MODERATE": DifficultyLevel.MODERATE,
    "HIGH": DifficultyLevel.DIFFICULT,
    "DIFFICULT": DifficultyLevel.DIFFICULT,
}

QUESTION_STATUS_MAP = {
    "DRAFT": QuestionStatus.DRAFT,
    "PENDING_REVIEW": QuestionStatus.PENDING_REVIEW,
    "PENDING REVIEW": QuestionStatus.PENDING_REVIEW,
    "APPROVED": QuestionStatus.APPROVED,
    "REJECTED": QuestionStatus.REJECTED,
    "RETIRED": QuestionStatus.RETIRED,
    "ARCHIVED": QuestionStatus.ARCHIVED,
}


def get_or_create_competency(topic: Topic, name: str) -> Competency:
    base_code = _slug_code(name, "COMPETENCY")
    code = _ensure_unique_code(Competency, base_code)
    competency, created = Competency.objects.get_or_create(
        topic=topic,
        name=name.strip(),
        defaults={"code": code},
    )
    if created:
        return competency
    if not competency.code:
        competency.code = code
        competency.save(update_fields=["code"])
    return competency


def get_or_create_tag(name: str) -> Tag:
    tag, _ = Tag.objects.get_or_create(name=name.strip())
    return tag


def _normalize_question_type(value: Any) -> QuestionType:
    raw_value = str(value or "MCQ").strip().upper().replace(" ", "_").replace("-", "_")
    mapped_code = QUESTION_TYPE_NORMALIZED_CODE_MAP.get(raw_value, raw_value)
    return get_or_create_question_type(mapped_code)


def _normalize_question_difficulty(value: Any) -> str:
    raw_value = str(value or "MEDIUM").strip().upper().replace("-", "_").replace(" ", "_")
    return QUESTION_DIFFICULTY_MAP.get(raw_value, DifficultyLevel.MODERATE)


def _normalize_question_status(value: Any) -> str:
    raw_value = str(value or "draft").strip().upper().replace("-", "_")
    return QUESTION_STATUS_MAP.get(raw_value, QuestionStatus.DRAFT)


def _generate_question_code(subject_name: str, question_type_code: str) -> str:
    base_code = f"Q_{_slug_code(subject_name, 'SUBJECT')}_{question_type_code}"
    return _ensure_unique_code(Question, base_code, code_field="question_code")


def question_queryset():
    return (
        Question.objects.select_related(
            "question_type",
            "subject",
            "topic",
            "competency",
            "created_by__user",
            "reviewed_by__user",
            "approved_by__user",
        )
        .prefetch_related(
            Prefetch("choices", queryset=QuestionChoice.objects.all()),
            Prefetch("answers", queryset=QuestionAnswer.objects.all()),
            Prefetch("rubrics", queryset=EssayRubric.objects.all()),
            Prefetch("attachments", queryset=QuestionAttachment.objects.select_related("uploaded_by__user")),
            Prefetch("workflow_history", queryset=QuestionWorkflowHistory.objects.select_related("initiated_by__user")),
            "tags",
        )
    )


def _question_display_name(profile: AccountProfile | None) -> str:
    return _profile_display_name(profile)


def serialize_question_choice(choice: QuestionChoice) -> dict[str, Any]:
    return {
        "id": str(choice.pk),
        "option_label": choice.option_label,
        "option_text": choice.option_text,
        "is_correct": choice.is_correct,
        "display_order": choice.display_order,
    }


def serialize_question_answer(answer: QuestionAnswer) -> dict[str, Any]:
    return {
        "id": str(answer.pk),
        "answer_text": answer.answer_text,
        "is_case_sensitive": answer.is_case_sensitive,
        "is_primary_answer": answer.is_primary_answer,
    }


def serialize_question_rubric(rubric: EssayRubric) -> dict[str, Any]:
    return {
        "id": str(rubric.pk),
        "criterion": rubric.criterion,
        "description": rubric.description,
        "maximum_points": float(rubric.maximum_points),
        "display_order": rubric.display_order,
    }


def serialize_question_attachment(attachment: QuestionAttachment) -> dict[str, Any]:
    return {
        "id": str(attachment.pk),
        "original_filename": attachment.original_filename,
        "stored_filename": attachment.stored_filename,
        "file_path": attachment.file_path,
        "mime_type": attachment.mime_type,
        "file_size_bytes": attachment.file_size_bytes,
        "uploaded_by": _question_display_name(attachment.uploaded_by),
        "created_at": attachment.created_at.isoformat(),
    }


def serialize_question_history(entry: QuestionWorkflowHistory) -> dict[str, Any]:
    return {
        "id": str(entry.pk),
        "previous_status": entry.previous_status.upper() if entry.previous_status else None,
        "new_status": entry.new_status.upper(),
        "action": entry.action,
        "remarks": entry.remarks,
        "initiated_by": _question_display_name(entry.initiated_by),
        "created_at": entry.created_at.isoformat(),
    }


def serialize_question(question: Question) -> dict[str, Any]:
    return {
        "id": str(question.pk),
        "question_code": question.question_code,
        "question_type": question.question_type.name,
        "question_type_code": question.question_type.code,
        "subject": question.subject.name,
        "subject_code": question.subject.code,
        "topic": question.topic.name if question.topic else "",
        "topic_code": question.topic.code if question.topic else "",
        "competency": question.competency.name if question.competency else "",
        "competency_code": question.competency.code if question.competency else "",
        "difficulty": question.difficulty.upper(),
        "question_text": question.question_text,
        "explanation": question.explanation,
        "points": float(question.points),
        "status": question.status.upper(),
        "created_by": _question_display_name(question.created_by),
        "reviewed_by": _question_display_name(question.reviewed_by),
        "approved_by": _question_display_name(question.approved_by),
        "reviewed_at": question.reviewed_at.isoformat() if question.reviewed_at else None,
        "approved_at": question.approved_at.isoformat() if question.approved_at else None,
        "retired_at": question.retired_at.isoformat() if question.retired_at else None,
        "archived_at": question.archived_at.isoformat() if question.archived_at else None,
        "choices": [serialize_question_choice(choice) for choice in question.choices.all().order_by("display_order", "created_at")],
        "answers": [serialize_question_answer(answer) for answer in question.answers.all().order_by("-is_primary_answer", "created_at")],
        "rubrics": [serialize_question_rubric(rubric) for rubric in question.rubrics.all().order_by("display_order", "created_at")],
        "tags": [tag.name for tag in question.tags.all().order_by("name")],
        "attachments": [serialize_question_attachment(attachment) for attachment in question.attachments.all().order_by("created_at")],
        "workflow_history": [serialize_question_history(entry) for entry in question.workflow_history.all().order_by("created_at")],
        "created_at": question.created_at.isoformat(),
        "updated_at": question.updated_at.isoformat(),
    }


def _replace_question_choices(question: Question, choices: list[dict[str, Any]]) -> None:
    question.choices.all().delete()
    for index, choice_payload in enumerate(choices, start=1):
        QuestionChoice.objects.create(
            question=question,
            option_label=str(_payload_value(choice_payload, "option_label", default="") or ""),
            option_text=str(_payload_value(choice_payload, "option_text", default="") or ""),
            is_correct=bool(_payload_value(choice_payload, "is_correct", default=False)),
            display_order=int(_payload_value(choice_payload, "display_order", default=index) or index),
        )


def _replace_question_answers(question: Question, answers: list[dict[str, Any]]) -> None:
    question.answers.all().delete()
    for answer_payload in answers:
        QuestionAnswer.objects.create(
            question=question,
            answer_text=str(_payload_value(answer_payload, "answer_text", default="") or ""),
            is_case_sensitive=bool(_payload_value(answer_payload, "is_case_sensitive", default=False)),
            is_primary_answer=bool(_payload_value(answer_payload, "is_primary_answer", default=True)),
        )


def _replace_question_rubrics(question: Question, rubrics: list[dict[str, Any]]) -> None:
    question.rubrics.all().delete()
    for index, rubric_payload in enumerate(rubrics, start=1):
        EssayRubric.objects.create(
            question=question,
            criterion=str(_payload_value(rubric_payload, "criterion", default="") or ""),
            description=str(_payload_value(rubric_payload, "description", default="") or ""),
            maximum_points=_parse_decimal(_payload_value(rubric_payload, "maximum_points", default="0"), "0"),
            display_order=int(_payload_value(rubric_payload, "display_order", default=index) or index),
        )


def _replace_question_tags(question: Question, tags: list[str]) -> None:
    question.tags.clear()
    for tag_name in tags:
        tag_name = str(tag_name).strip()
        if not tag_name:
            continue
        question.tags.add(get_or_create_tag(tag_name))


@transaction.atomic
def create_or_update_question(
    *,
    payload: dict[str, Any],
    actor_profile: AccountProfile,
    question: Question | None = None,
) -> Question:
    question_type = _normalize_question_type(
        _payload_value(payload, "question_type", default=question.question_type.code if question else "MCQ"),
    )
    subject = get_or_create_subject(
        str(_payload_value(payload, "subject", default=question.subject.name if question else "General") or "General"),
    )
    topic_name = str(_payload_value(payload, "topic", default=question.topic.name if question and question.topic else "") or "").strip()
    topic = get_or_create_topic(subject, topic_name) if topic_name else None

    competency_name = str(_payload_value(payload, "competency", default=question.competency.name if question and question.competency else "") or "").strip()
    competency_topic = topic or (get_or_create_topic(subject, topic_name or "General") if competency_name else None)
    if topic is None and competency_topic is not None and competency_name:
        topic = competency_topic
    competency = get_or_create_competency(competency_topic, competency_name) if competency_name and competency_topic is not None else None

    question_code = str(_payload_value(payload, "question_code", default=question.question_code if question else "") or "").strip()
    if not question_code:
        question_code = _generate_question_code(subject.name, question_type.code)

    question_defaults = {
        "question_type": question_type,
        "subject": subject,
        "topic": topic,
        "competency": competency,
        "difficulty": _normalize_question_difficulty(_payload_value(payload, "difficulty", default=question.difficulty if question else "MEDIUM")),
        "question_text": str(_payload_value(payload, "question_text", "content", default=question.question_text if question else "") or ""),
        "explanation": str(_payload_value(payload, "explanation", "ideal_answer", default=question.explanation if question else "") or ""),
        "points": _parse_decimal(_payload_value(payload, "points", "score", default=str(question.points) if question else "1"), "1"),
        "status": _normalize_question_status(_payload_value(payload, "status", default=question.status if question else "draft")),
        "created_by": question.created_by if question else actor_profile,
        "reviewed_by": question.reviewed_by if question else None,
        "approved_by": question.approved_by if question else None,
        "reviewed_at": question.reviewed_at if question else None,
        "approved_at": question.approved_at if question else None,
        "retired_at": question.retired_at if question else None,
        "archived_at": question.archived_at if question else None,
    }

    if question is None:
        question = Question.objects.create(question_code=question_code, **question_defaults)
        action = "Created question"
        previous_status = None
    else:
        previous_status = question.status
        for field_name, field_value in question_defaults.items():
            setattr(question, field_name, field_value)
        question.question_code = question_code
        question.save()
        action = "Updated question"

    if "choices" in payload:
        _replace_question_choices(question, list(_payload_value(payload, "choices", default=[]) or []))
    if "answers" in payload:
        _replace_question_answers(question, list(_payload_value(payload, "answers", default=[]) or []))
    if "rubrics" in payload:
        _replace_question_rubrics(question, list(_payload_value(payload, "rubrics", default=[]) or []))
    if "tags" in payload:
        _replace_question_tags(question, list(_payload_value(payload, "tags", default=[]) or []))

    QuestionWorkflowHistory.objects.create(
        question=question,
        previous_status=previous_status,
        new_status=question.status,
        action=action,
        remarks=str(_payload_value(payload, "remarks", default="") or ""),
        initiated_by=actor_profile,
    )
    return question


@transaction.atomic
def transition_question(
    *,
    question: Question,
    target_status: str,
    actor_profile: AccountProfile,
    remarks: str = "",
) -> Question:
    normalized_status = _normalize_question_status(target_status)
    previous_status = question.status
    question.status = normalized_status
    now = timezone.now()
    if normalized_status == QuestionStatus.PENDING_REVIEW:
        question.reviewed_at = now
        question.reviewed_by = actor_profile
    elif normalized_status == QuestionStatus.APPROVED:
        question.approved_at = now
        question.approved_by = actor_profile
    elif normalized_status == QuestionStatus.RETIRED:
        question.retired_at = now
    elif normalized_status == QuestionStatus.ARCHIVED:
        question.archived_at = now
    question.save(update_fields=["status", "reviewed_at", "reviewed_by", "approved_at", "approved_by", "retired_at", "archived_at", "updated_at"])
    QuestionWorkflowHistory.objects.create(
        question=question,
        previous_status=previous_status,
        new_status=normalized_status,
        action=f"Transitioned to {normalized_status.replace('_', ' ').title()}",
        remarks=remarks,
        initiated_by=actor_profile,
    )
    return question


def exam_set_queryset():
    return (
        ExamSet.objects.select_related(
            "blueprint_version__blueprint",
            "blueprint_version__academic_year",
            "academic_year",
            "created_by__user",
            "approved_by__user",
            "published_by__user",
            "archived_by__user",
            "cloned_from_exam_set",
        )
        .prefetch_related(
            Prefetch(
                "items",
                queryset=ExamSetQuestion.objects.select_related(
                    "question__question_type",
                    "question__subject",
                    "question__topic",
                    "question__competency",
                    "blueprint_section",
                    "selected_by__user",
                ),
            ),
            Prefetch("validation_results", queryset=ExamSetValidationResult.objects.all()),
            Prefetch(
                "workflow_history",
                queryset=ExamSetWorkflowHistory.objects.select_related("initiated_by__user"),
            ),
            Prefetch(
                "assembly_runs",
                queryset=ExamSetAssemblyRun.objects.select_related("initiated_by__user").prefetch_related(
                    Prefetch("items", queryset=ExamSetAssemblyRunItem.objects.select_related("question"))
                ),
            ),
        )
    )


def _normalize_exam_set_status(value: Any) -> str:
    if not value:
        return ExamSetStatus.DRAFT
    normalized = str(value).strip().lower().replace(" ", "_")
    return normalized if normalized in ExamSetStatus.values else ExamSetStatus.DRAFT


def _normalize_selection_method(value: Any) -> str:
    if not value:
        return SelectionMethod.MANUAL
    normalized = str(value).strip().lower().replace(" ", "_")
    return normalized if normalized in SelectionMethod.values else SelectionMethod.MANUAL


def _normalize_validation_result(value: Any) -> str:
    if not value:
        return ValidationResult.PASSED
    normalized = str(value).strip().lower().replace(" ", "_")
    return normalized if normalized in ValidationResult.values else ValidationResult.PASSED


def _generate_exam_set_code(blueprint_version: BlueprintVersion, academic_year: AcademicYear, title: str) -> str:
    year_fragment = str(academic_year.name).strip()[:4] or "0000"
    base = f"EXAM-{blueprint_version.blueprint.spec_code}-{year_fragment}"
    return _ensure_unique_code(ExamSet, base[:60], code_field="exam_code")


def _display_exam_set_user(profile: AccountProfile | None) -> str:
    return _profile_display_name(profile)


def serialize_exam_set_question(item: ExamSetQuestion) -> dict[str, Any]:
    question = item.question
    return {
        "id": str(item.pk),
        "display_order": item.display_order,
        "points": float(item.points),
        "selection_method": item.selection_method,
        "selected_by": _display_exam_set_user(item.selected_by),
        "selected_at": item.selected_at.isoformat(),
        "blueprint_section": str(item.blueprint_section.pk) if item.blueprint_section else None,
        "question": {
            "id": str(question.pk),
            "question_code": question.question_code,
            "question_type": question.question_type.name,
            "question_type_code": question.question_type.code,
            "subject": question.subject.name,
            "topic": question.topic.name if question.topic else "",
            "difficulty": question.difficulty,
            "status": question.status,
            "points": float(question.points),
        },
    }


def serialize_exam_set_validation_result(result: ExamSetValidationResult) -> dict[str, Any]:
    return {
        "id": str(result.pk),
        "validation_code": result.validation_code,
        "validation_name": result.validation_name,
        "result": result.result,
        "expected_value": result.expected_value,
        "actual_value": result.actual_value,
        "message": result.message,
        "validated_at": result.validated_at.isoformat(),
    }


def serialize_exam_set_history(entry: ExamSetWorkflowHistory) -> dict[str, Any]:
    return {
        "id": str(entry.pk),
        "previous_status": entry.previous_status.upper() if entry.previous_status else None,
        "new_status": entry.new_status.upper(),
        "action": entry.action,
        "remarks": entry.remarks,
        "initiated_by": _display_exam_set_user(entry.initiated_by),
        "created_at": entry.created_at.isoformat(),
    }


def serialize_exam_set_assembly_run_item(item: ExamSetAssemblyRunItem) -> dict[str, Any]:
    return {
        "id": str(item.pk),
        "question": {
            "id": str(item.question.pk),
            "question_code": item.question.question_code,
            "question_text": item.question.question_text,
        },
        "was_selected": item.was_selected,
        "rejection_reason": item.rejection_reason,
        "created_at": item.created_at.isoformat(),
    }


def serialize_exam_set_assembly_run(run: ExamSetAssemblyRun) -> dict[str, Any]:
    return {
        "id": str(run.pk),
        "algorithm_version": run.algorithm_version,
        "status": run.status,
        "selected_item_count": run.selected_item_count,
        "rejected_item_count": run.rejected_item_count,
        "initiated_by": _display_exam_set_user(run.initiated_by),
        "started_at": run.started_at.isoformat(),
        "completed_at": run.completed_at.isoformat() if run.completed_at else None,
        "notes": run.notes,
        "items": [serialize_exam_set_assembly_run_item(item) for item in run.items.all().order_by("created_at")],
    }


def serialize_exam_set(exam_set: ExamSet) -> dict[str, Any]:
    return {
        "id": str(exam_set.pk),
        "exam_code": exam_set.exam_code,
        "title": exam_set.title,
        "examination_period": exam_set.examination_period,
        "exam_type": exam_set.exam_type,
        "instructions": exam_set.instructions,
        "duration_minutes": exam_set.duration_minutes,
        "status": exam_set.status.upper(),
        "blueprint_version": {
            "id": str(exam_set.blueprint_version.pk),
            "spec_code": exam_set.blueprint_version.blueprint.spec_code,
            "name": exam_set.blueprint_version.name,
            "version_number": str(exam_set.blueprint_version.version_number),
            "status": exam_set.blueprint_version.status.upper(),
        },
        "academic_year": exam_set.academic_year.name,
        "cloned_from_exam_set": str(exam_set.cloned_from_exam_set.pk) if exam_set.cloned_from_exam_set else None,
        "created_by": _display_exam_set_user(exam_set.created_by),
        "approved_by": _display_exam_set_user(exam_set.approved_by),
        "published_by": _display_exam_set_user(exam_set.published_by),
        "archived_by": _display_exam_set_user(exam_set.archived_by),
        "approved_at": exam_set.approved_at.isoformat() if exam_set.approved_at else None,
        "published_at": exam_set.published_at.isoformat() if exam_set.published_at else None,
        "archived_at": exam_set.archived_at.isoformat() if exam_set.archived_at else None,
        "items": [serialize_exam_set_question(item) for item in exam_set.items.all().order_by("display_order", "selected_at")],
        "validation_results": [
            serialize_exam_set_validation_result(result)
            for result in exam_set.validation_results.all().order_by("-validated_at")
        ],
        "assembly_runs": [serialize_exam_set_assembly_run(run) for run in exam_set.assembly_runs.all().order_by("-started_at")],
        "workflow_history": [serialize_exam_set_history(entry) for entry in exam_set.workflow_history.all().order_by("-created_at")],
        "created_at": exam_set.created_at.isoformat(),
        "updated_at": exam_set.updated_at.isoformat(),
    }


def _replace_exam_set_items(exam_set: ExamSet, items: list[dict[str, Any]], actor_profile: AccountProfile) -> None:
    resolved_items: list[tuple[Question, BlueprintSection | None, int, Decimal, str]] = []
    seen_question_ids: set[int] = set()
    for index, item_payload in enumerate(items, start=1):
        question_id = _payload_value(item_payload, "question_id", "questionId")
        question_code = _payload_value(item_payload, "question_code", "questionCode")
        question = None
        if question_id not in (None, ""):
            question = Question.objects.filter(pk=question_id).first()
            if question is None:
                raise ValidationError({"items": [f"Item {index} references an unknown question."]})
            if question_code not in (None, "") and question.question_code != str(question_code).strip():
                raise ValidationError({"items": [f"Item {index} contains conflicting question references."]})
        elif question_code not in (None, ""):
            question = Question.objects.filter(question_code=str(question_code)).first()
        if question is None:
            raise ValidationError({"items": [f"Item {index} must reference a valid question."]})
        if question.pk in seen_question_ids:
            raise ValidationError({"items": [f"Item {index} duplicates a question already in the Exam Set."]})
        seen_question_ids.add(question.pk)

        blueprint_section = None
        blueprint_section_id = _payload_value(item_payload, "blueprint_section_id", "blueprintSectionId")
        if blueprint_section_id not in (None, ""):
            blueprint_section = BlueprintSection.objects.filter(
                pk=blueprint_section_id,
                blueprint_version_id=exam_set.blueprint_version_id,
            ).first()
            if blueprint_section is None:
                raise ValidationError({"items": [f"Item {index} references a section outside the selected Blueprint Version."]})
        resolved_items.append((
            question,
            blueprint_section,
            int(_payload_value(item_payload, "display_order", "displayOrder", index) or index),
            _parse_decimal(_payload_value(item_payload, "points", default=str(question.points)), str(question.points)),
            _normalize_selection_method(_payload_value(item_payload, "selection_method", "selectionMethod", SelectionMethod.MANUAL)),
        ))

    exam_set.items.all().delete()
    for question, blueprint_section, display_order, points, selection_method in resolved_items:
        ExamSetQuestion.objects.create(
            exam_set=exam_set,
            question=question,
            blueprint_section=blueprint_section,
            display_order=display_order,
            points=points,
            selection_method=selection_method,
            selected_by=actor_profile,
        )


def _record_exam_set_validation_results(exam_set: ExamSet) -> None:
    exam_set.validation_results.all().delete()
    items = list(exam_set.items.all().select_related("question"))
    blueprint_status = exam_set.blueprint_version.status
    blueprint_ready = blueprint_status in {BlueprintStatus.APPROVED, BlueprintStatus.PUBLISHED}
    ExamSetValidationResult.objects.create(
        exam_set=exam_set,
        validation_code="blueprint_status",
        validation_name="Blueprint readiness",
        result=ValidationResult.PASSED if blueprint_ready else ValidationResult.WARNING,
        expected_value="APPROVED/PUBLISHED",
        actual_value=blueprint_status.upper(),
        message="Blueprint version is ready for assembly." if blueprint_ready else "Blueprint version is not yet approved or published.",
    )
    ExamSetValidationResult.objects.create(
        exam_set=exam_set,
        validation_code="item_count",
        validation_name="Item count",
        result=ValidationResult.PASSED if items else ValidationResult.FAILED,
        expected_value="At least 1 item",
        actual_value=str(len(items)),
        message="Exam set contains items." if items else "Exam set has no items.",
    )
    non_approved_count = sum(1 for item in items if item.question.status != QuestionStatus.APPROVED)
    ExamSetValidationResult.objects.create(
        exam_set=exam_set,
        validation_code="approved_items",
        validation_name="Approved question pool",
        result=ValidationResult.PASSED if non_approved_count == 0 else ValidationResult.WARNING,
        expected_value="All questions approved",
        actual_value=str(non_approved_count),
        message="All questions are approved." if non_approved_count == 0 else "One or more questions are not yet approved.",
    )


@transaction.atomic
def create_or_update_exam_set(
    *,
    payload: dict[str, Any],
    actor_profile: AccountProfile,
    exam_set: ExamSet | None = None,
) -> ExamSet:
    if exam_set is not None:
        exam_set = ExamSet.objects.select_for_update().get(pk=exam_set.pk)
        if exam_set.status not in EXAM_SET_EDITABLE_STATUSES:
            raise ExamSetLifecycleConflict("Only draft or revision-required Exam Sets can be edited.")

    blueprint_version_id = _payload_value(
        payload,
        "blueprint_version_id",
        "blueprintVersionId",
        default=exam_set.blueprint_version_id if exam_set else None,
    )
    blueprint_version = BlueprintVersion.objects.filter(pk=blueprint_version_id).select_related("blueprint").first() if blueprint_version_id not in (None, "") else None
    if blueprint_version is None:
        raise ValidationError({"blueprint_version_id": ["Select a valid Blueprint Version."]})

    academic_year_value = _payload_value(payload, "academic_year_id", "academicYearId")
    academic_year_name = _payload_value(payload, "academic_year", "academicYear")
    academic_year = None
    if academic_year_value not in (None, ""):
        academic_year = AcademicYear.objects.filter(pk=academic_year_value).first()
        if academic_year is None:
            raise ValidationError({"academic_year_id": ["Select a valid academic year."]})
        if academic_year_name not in (None, "") and academic_year.name != str(academic_year_name).strip():
            raise ValidationError({"academic_year": ["Academic year references must identify the same record."]})
    elif academic_year_name not in (None, ""):
        academic_year = AcademicYear.objects.filter(name=str(academic_year_name).strip()).first()
    elif exam_set is not None:
        academic_year = exam_set.academic_year
    if academic_year is None:
        raise ValidationError({"academic_year_id": ["Select a valid academic year."]})

    title = str(_payload_value(payload, "title", default=exam_set.title if exam_set else "") or "").strip()
    if not title:
        title = blueprint_version.name

    exam_code = str(_payload_value(payload, "exam_code", "examCode", default=exam_set.exam_code if exam_set else "") or "").strip()
    if not exam_code:
        exam_code = _generate_exam_set_code(blueprint_version, academic_year, title)

    defaults = {
        "blueprint_version": blueprint_version,
        "academic_year": academic_year,
        "exam_code": exam_code,
        "title": title,
        "examination_period": str(_payload_value(payload, "examination_period", "examinationPeriod", default=exam_set.examination_period if exam_set else "") or ""),
        "exam_type": _normalize_exam_type(_payload_value(payload, "exam_type", "examType", default=exam_set.exam_type if exam_set else ExamType.ADMISSION)),
        "instructions": str(_payload_value(payload, "instructions", default=exam_set.instructions if exam_set else "") or ""),
        "duration_minutes": int(_payload_value(payload, "duration_minutes", "durationMinutes", default=exam_set.duration_minutes if exam_set else 0) or 0),
        "status": exam_set.status if exam_set else ExamSetStatus.DRAFT,
        "cloned_from_exam_set": exam_set.cloned_from_exam_set if exam_set and exam_set.cloned_from_exam_set else None,
        "created_by": exam_set.created_by if exam_set else actor_profile,
        "approved_by": exam_set.approved_by if exam_set else None,
        "published_by": exam_set.published_by if exam_set else None,
        "archived_by": exam_set.archived_by if exam_set else None,
        "approved_at": exam_set.approved_at if exam_set else None,
        "published_at": exam_set.published_at if exam_set else None,
        "archived_at": exam_set.archived_at if exam_set else None,
    }

    if exam_set is None:
        exam_set = ExamSet.objects.create(**defaults)
        action = "Created exam set"
        previous_status = None
    else:
        previous_status = exam_set.status
        for field_name, field_value in defaults.items():
            setattr(exam_set, field_name, field_value)
        exam_set.save()
        action = "Updated exam set"

    if "items" in payload or "questions" in payload:
        items_payload = list(_payload_value(payload, "items", default=_payload_value(payload, "questions", default=[])) or [])
        _replace_exam_set_items(exam_set, items_payload, actor_profile)

    _record_exam_set_validation_results(exam_set)
    ExamSetWorkflowHistory.objects.create(
        exam_set=exam_set,
        previous_status=previous_status,
        new_status=exam_set.status,
        action=action,
        remarks=str(_payload_value(payload, "remarks", default="") or ""),
        initiated_by=actor_profile,
    )
    return exam_set


@transaction.atomic
def transition_exam_set(
    *,
    exam_set: ExamSet,
    target_status: str,
    actor_profile: AccountProfile,
    remarks: str = "",
) -> ExamSet:
    exam_set = ExamSet.objects.select_for_update().get(pk=exam_set.pk)
    normalized_status = _normalize_exam_set_status(target_status)
    previous_status = exam_set.status
    if normalized_status not in EXAM_SET_ALLOWED_TRANSITIONS.get(previous_status, set()):
        raise ExamSetLifecycleConflict(
            f"Exam Sets cannot transition from {previous_status.upper()} to {normalized_status.upper()}.",
        )

    if normalized_status in {
        ExamSetStatus.ACADEMIC_REVIEW,
        ExamSetStatus.APPROVED,
        ExamSetStatus.PUBLISHED,
    }:
        _record_exam_set_validation_results(exam_set)
        validation_results = list(exam_set.validation_results.values_list("result", flat=True))
        if ValidationResult.FAILED in validation_results:
            raise ExamSetValidationConflict("Resolve failed Exam Set validations before continuing.")
        if normalized_status in {ExamSetStatus.APPROVED, ExamSetStatus.PUBLISHED} and any(
            result != ValidationResult.PASSED for result in validation_results
        ):
            raise ExamSetValidationConflict("Resolve Exam Set validation warnings before approval or publication.")

    exam_set.status = normalized_status
    now = timezone.now()
    if normalized_status == ExamSetStatus.APPROVED:
        exam_set.approved_at = now
        exam_set.approved_by = actor_profile
    elif normalized_status == ExamSetStatus.PUBLISHED:
        exam_set.published_at = now
        exam_set.published_by = actor_profile
    elif normalized_status == ExamSetStatus.ARCHIVED:
        exam_set.archived_at = now
        exam_set.archived_by = actor_profile
    exam_set.save(update_fields=["status", "approved_at", "approved_by", "published_at", "published_by", "archived_at", "archived_by", "updated_at"])
    ExamSetWorkflowHistory.objects.create(
        exam_set=exam_set,
        previous_status=previous_status,
        new_status=normalized_status,
        action=f"Transitioned to {normalized_status.replace('_', ' ').title()}",
        remarks=remarks,
        initiated_by=actor_profile,
    )
    _record_exam_set_validation_results(exam_set)
    return exam_set


@transaction.atomic
def clone_exam_set(*, exam_set: ExamSet, actor_profile: AccountProfile) -> ExamSet:
    cloned = ExamSet.objects.create(
        blueprint_version=exam_set.blueprint_version,
        academic_year=exam_set.academic_year,
        exam_code=_ensure_unique_code(ExamSet, f"{exam_set.exam_code}_CLONE", code_field="exam_code"),
        title=f"{exam_set.title} (Clone)",
        examination_period=exam_set.examination_period,
        exam_type=exam_set.exam_type,
        instructions=exam_set.instructions,
        duration_minutes=exam_set.duration_minutes,
        status=ExamSetStatus.DRAFT,
        cloned_from_exam_set=exam_set,
        created_by=actor_profile,
    )
    for item in exam_set.items.all().order_by("display_order", "selected_at"):
        ExamSetQuestion.objects.create(
            exam_set=cloned,
            question=item.question,
            blueprint_section=item.blueprint_section,
            display_order=item.display_order,
            points=item.points,
            selection_method=item.selection_method,
            selected_by=actor_profile,
        )
    _record_exam_set_validation_results(cloned)
    ExamSetWorkflowHistory.objects.create(
        exam_set=cloned,
        previous_status=None,
        new_status=cloned.status,
        action="Cloned exam set",
        remarks="",
        initiated_by=actor_profile,
    )
    return cloned
