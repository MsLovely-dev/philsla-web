from django.db import IntegrityError, transaction
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import APIException

from .models import CollegeCourse, University


class UniversityRegistryConflict(APIException):
    status_code = 409
    default_code = "conflict"
    default_detail = "The university registry record conflicts with an existing record."


def _check_version(instance: University | CollegeCourse, expected_version: int) -> None:
    if instance.version != expected_version:
        raise UniversityRegistryConflict("This record was changed by another request. Reload and try again.")


def _save_new(instance: University | CollegeCourse) -> University | CollegeCourse:
    try:
        with transaction.atomic():
            instance.full_clean()
            instance.save()
    except IntegrityError as exc:
        raise UniversityRegistryConflict("A registry record with this code already exists.") from exc
    return instance


def _save_updated(instance: University | CollegeCourse) -> University | CollegeCourse:
    try:
        with transaction.atomic():
            instance.full_clean()
            instance.save()
    except IntegrityError as exc:
        raise UniversityRegistryConflict("A registry record with this code already exists.") from exc
    return instance


def create_university(*, actor_id, data: dict) -> University:
    return _save_new(University(created_by_id=actor_id, **data))


@transaction.atomic
def update_university(*, university_id, expected_version: int, data: dict) -> University:
    university = get_object_or_404(University.objects.select_for_update(), id=university_id)
    _check_version(university, expected_version)
    for field_name, value in data.items():
        setattr(university, field_name, value)
    university.version += 1
    return _save_updated(university)


@transaction.atomic
def delete_university(*, university_id, expected_version: int) -> None:
    university = get_object_or_404(University.objects.select_for_update(), id=university_id)
    _check_version(university, expected_version)
    university.delete()


def create_college_course(*, university: University, actor_id, data: dict) -> CollegeCourse:
    return _save_new(CollegeCourse(university=university, created_by_id=actor_id, **data))


@transaction.atomic
def update_college_course(*, university_id, course_id, expected_version: int, data: dict) -> CollegeCourse:
    course = get_object_or_404(
        CollegeCourse.objects.select_for_update().select_related("university"),
        id=course_id,
        university_id=university_id,
    )
    _check_version(course, expected_version)
    for field_name, value in data.items():
        setattr(course, field_name, value)
    course.version += 1
    return _save_updated(course)


@transaction.atomic
def delete_college_course(*, university_id, course_id, expected_version: int) -> None:
    course = get_object_or_404(
        CollegeCourse.objects.select_for_update(),
        id=course_id,
        university_id=university_id,
    )
    _check_version(course, expected_version)
    course.delete()
