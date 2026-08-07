from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from apps.accounts.models import AccountProfile

from .models import (
    ExamSet,
    ExamSetAssemblyRun,
    ExamSetAssemblyRunItem,
    ExamSetWorkflowHistory,
    Question,
    QuestionStatus,
    SelectionMethod,
)
from .services import (
    EXAM_SET_EDITABLE_STATUSES,
    ExamSetLifecycleConflict,
    _record_exam_set_validation_results,
    _replace_exam_set_items,
)

# `_record_exam_set_validation_results` and `_replace_exam_set_items` are private
# helpers in services.py, imported here deliberately: this module exists purely to
# keep the auto-assembly algorithm out of the already-large services.py, not to
# duplicate the item-persistence or validation logic it already provides.


@transaction.atomic
def auto_assemble_exam_set(*, exam_set: ExamSet, actor_profile: AccountProfile) -> ExamSetAssemblyRun:
    exam_set = ExamSet.objects.select_for_update().get(pk=exam_set.pk)
    if exam_set.status not in EXAM_SET_EDITABLE_STATUSES:
        raise ExamSetLifecycleConflict("Only draft or revision-required Exam Sets can be auto-assembled.")

    sections = list(
        exam_set.blueprint_version.sections.select_related("subject")
        .prefetch_related("difficulty_requirements")
        .order_by("display_order")
    )

    selected: list[tuple[Question, object]] = []
    selected_ids: set[int] = set()
    shortfall_count = 0
    shortfalls: list[str] = []

    for section in sections:
        section_selected: list[Question] = []
        for distribution in section.difficulty_requirements.all():
            required = distribution.required_item_count
            if required <= 0:
                continue
            pool = list(
                Question.objects.filter(
                    subject_id=section.subject_id,
                    status=QuestionStatus.APPROVED,
                    difficulty=distribution.difficulty,
                )
                .exclude(pk__in=selected_ids)
                .order_by("question_code")[:required]
            )
            section_selected.extend(pool)
            selected_ids.update(question.pk for question in pool)

        if len(section_selected) < section.item_count:
            needed = section.item_count - len(section_selected)
            backfill = list(
                Question.objects.filter(subject_id=section.subject_id, status=QuestionStatus.APPROVED)
                .exclude(pk__in=selected_ids)
                .order_by("question_code")[:needed]
            )
            section_selected.extend(backfill)
            selected_ids.update(question.pk for question in backfill)

        if len(section_selected) < section.item_count:
            missing = section.item_count - len(section_selected)
            shortfall_count += missing
            shortfalls.append(f"{section.section_name}: needed {section.item_count}, selected {len(section_selected)}.")

        for question in section_selected:
            selected.append((question, section))

    items_payload = [
        {
            "question_id": question.pk,
            "blueprint_section_id": section.pk,
            "display_order": index + 1,
            "points": str(question.points),
            "selection_method": SelectionMethod.AUTOMATIC,
        }
        for index, (question, section) in enumerate(selected)
    ]
    _replace_exam_set_items(exam_set, items_payload, actor_profile)

    run = ExamSetAssemblyRun.objects.create(
        exam_set=exam_set,
        algorithm_version="v1",
        status="completed" if not shortfalls else "completed_with_shortfall",
        selected_item_count=len(selected),
        rejected_item_count=shortfall_count,
        initiated_by=actor_profile,
        completed_at=timezone.now(),
        notes="; ".join(shortfalls) if shortfalls else "All sections filled to specification.",
    )
    ExamSetAssemblyRunItem.objects.bulk_create([
        ExamSetAssemblyRunItem(assembly_run=run, question=question, was_selected=True)
        for question, _section in selected
    ])

    _record_exam_set_validation_results(exam_set)
    ExamSetWorkflowHistory.objects.create(
        exam_set=exam_set,
        previous_status=exam_set.status,
        new_status=exam_set.status,
        action=f"Auto-assembled {len(selected)} items",
        remarks=run.notes,
        initiated_by=actor_profile,
    )
    return run
