from __future__ import annotations

from collections import defaultdict
from decimal import Decimal, InvalidOperation
from typing import Any

from django.db import transaction
from django.db.models import Prefetch
from django.utils.dateparse import parse_date
from django.utils import timezone
from django.utils.text import slugify

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
    QuestionType,
    ReferenceYear,
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
                    "reference_year",
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


def _reference_year_value_from_academic_year(academic_year: AcademicYear) -> int:
    if academic_year.start_date is not None:
        return academic_year.start_date.year
    digits = "".join(ch for ch in academic_year.name if ch.isdigit())
    if len(digits) >= 4:
        return int(digits[:4])
    return timezone.now().year


def get_or_create_reference_year(academic_year: AcademicYear, year: int | None = None) -> ReferenceYear:
    resolved_year = year if year is not None else _reference_year_value_from_academic_year(academic_year)
    reference_year, _ = ReferenceYear.objects.get_or_create(
        academic_year=academic_year,
        defaults={"year": resolved_year},
    )
    if reference_year.year != resolved_year:
        reference_year.year = resolved_year
        reference_year.save(update_fields=["year", "updated_at"])
    return reference_year


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
            "code": blueprint.spec_code,
        "name": "",
        "description": "",
        "exam_type": blueprint.get_exam_type_display(),
        "academic_year": "",
        "reference_year": "",
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
        "code": blueprint.spec_code,
        "name": version.name,
        "description": version.description,
        "exam_type": blueprint.get_exam_type_display(),
        "academic_year": version.academic_year.name,
        "reference_year": str(version.reference_year.year if version.reference_year else _reference_year_value_from_academic_year(version.academic_year)),
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
    reference_year_value = _payload_value(payload, "reference_year", "referenceYear")
    reference_year_number = int(reference_year_value) if reference_year_value not in (None, "") else None
    reference_year = get_or_create_reference_year(academic_year, reference_year_number)
    version_number = _parse_decimal(_payload_value(payload, "version", default=str(existing_version.version_number) if existing_version else "1.0"), "1.0")
    version_defaults = {
        "name": str(_payload_value(payload, "name", default=existing_version.name if existing_version else blueprint.spec_code)),
        "description": str(_payload_value(payload, "description", default=existing_version.description if existing_version else "")),
        "academic_year": academic_year,
        "reference_year": reference_year,
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
