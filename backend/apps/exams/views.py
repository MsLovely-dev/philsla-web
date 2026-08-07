from django.shortcuts import get_object_or_404
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import AccountProfile
from apps.accounts.permissions import RoleRequiredPermission, require_roles

from .audit import record_exam_blueprint_maintenance_event
from .assembly import auto_assemble_exam_set
from .models import BlueprintStatus, ExamBlueprint, ExamSet, ExamSetStatus, QuestionStatus, QuestionType, Subject, Topic
from .serializers import (
    BlueprintCloneSerializer,
    BlueprintTransitionSerializer,
    ExamBlueprintSerializer,
    ExamSetSerializer,
    ExamSetTransitionSerializer,
    QuestionSerializer,
    QuestionTransitionSerializer,
    QuestionTypeInputSerializer,
    QuestionTypeSerializer,
    SubjectInputSerializer,
    SubjectSerializer,
    TopicInputSerializer,
    TopicSerializer,
)
from .services import blueprint_queryset, exam_set_queryset, latest_blueprint_version, question_queryset, question_type_queryset, subject_queryset, topic_queryset
from .services import clone_exam_set


BLUEPRINT_MANAGEMENT_ROLES = require_roles(
    "ITEM_WRITER",
    "ACADEMIC_REVIEWER",
    "EXAM_ADMINISTRATOR",
    "SYSTEM_ADMIN",
)

QUESTION_MANAGEMENT_ROLES = require_roles(
    "ITEM_WRITER",
    "ACADEMIC_REVIEWER",
    "EXAM_ADMINISTRATOR",
    "SYSTEM_ADMIN",
)

EXAM_SET_MANAGEMENT_ROLES = require_roles(
    "EXAM_ADMINISTRATOR",
    "SYSTEM_ADMIN",
)

EXAM_BLUEPRINT_MAINTENANCE_ROLES = require_roles(
    "ITEM_WRITER",
    "ACADEMIC_REVIEWER",
    "EXAM_ADMINISTRATOR",
    "SYSTEM_ADMIN",
)


def _actor_profile(request):
    profile = getattr(request.user, "account_profile", None)
    if isinstance(profile, AccountProfile):
        return profile

    user_id = getattr(request.user, "id", None)
    if user_id is not None:
        profile = AccountProfile.objects.filter(user_id=user_id).first()
        if profile is not None:
            return profile

    raise PermissionDenied("Authenticated account profile is required.")


class ExamBlueprintListCreateView(APIView):
    permission_classes = [RoleRequiredPermission]
    required_roles = BLUEPRINT_MANAGEMENT_ROLES

    def get(self, request) -> Response:
        serializer = ExamBlueprintSerializer(blueprint_queryset(), many=True)
        return Response(serializer.data)

    def post(self, request) -> Response:
        serializer = ExamBlueprintSerializer(data=request.data, context={"actor_profile": _actor_profile(request)})
        serializer.is_valid(raise_exception=True)
        blueprint = serializer.save()
        return Response(ExamBlueprintSerializer(blueprint).data, status=201)


class ExamBlueprintDetailView(APIView):
    permission_classes = [RoleRequiredPermission]
    required_roles = BLUEPRINT_MANAGEMENT_ROLES

    def get_object(self, blueprint_id: int) -> ExamBlueprint:
        return get_object_or_404(blueprint_queryset(), pk=blueprint_id)

    def get(self, request, blueprint_id: int) -> Response:
        blueprint = self.get_object(blueprint_id)
        return Response(ExamBlueprintSerializer(blueprint).data)

    def put(self, request, blueprint_id: int) -> Response:
        blueprint = self.get_object(blueprint_id)
        serializer = ExamBlueprintSerializer(
            blueprint,
            data=request.data,
            context={"actor_profile": _actor_profile(request)},
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        updated_blueprint = serializer.save()
        return Response(ExamBlueprintSerializer(updated_blueprint).data)

    def patch(self, request, blueprint_id: int) -> Response:
        return self.put(request, blueprint_id)

    def delete(self, request, blueprint_id: int) -> Response:
        blueprint = self.get_object(blueprint_id)
        version = latest_blueprint_version(blueprint)
        if version is None or version.status not in {BlueprintStatus.DRAFT, BlueprintStatus.REVISION_REQUIRED}:
            return Response({"detail": "Only draft or revision-required blueprints can be deleted."}, status=409)
        blueprint.delete()
        return Response(status=204)


class ExamBlueprintCloneView(APIView):
    permission_classes = [RoleRequiredPermission]
    required_roles = BLUEPRINT_MANAGEMENT_ROLES

    def post(self, request, blueprint_id: int) -> Response:
        blueprint = get_object_or_404(blueprint_queryset(), pk=blueprint_id)
        serializer = BlueprintCloneSerializer(context={"actor_profile": _actor_profile(request), "blueprint": blueprint})
        cloned = serializer.save()
        cloned_blueprint = get_object_or_404(blueprint_queryset(), pk=cloned["clonedBlueprintId"])
        return Response(ExamBlueprintSerializer(cloned_blueprint).data, status=201)


class ExamBlueprintTransitionView(APIView):
    permission_classes = [RoleRequiredPermission]
    required_roles = BLUEPRINT_MANAGEMENT_ROLES

    def post(self, request, blueprint_id: int) -> Response:
        blueprint = get_object_or_404(blueprint_queryset(), pk=blueprint_id)
        version = latest_blueprint_version(blueprint)
        if version is None:
            return Response({"detail": "Blueprint version not found."}, status=404)
        serializer = BlueprintTransitionSerializer(data=request.data, context={"actor_profile": _actor_profile(request), "version": version})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(ExamBlueprintSerializer(blueprint_queryset().get(pk=blueprint.pk)).data)


class QuestionListCreateView(APIView):
    permission_classes = [RoleRequiredPermission]
    required_roles = QUESTION_MANAGEMENT_ROLES

    def get(self, request) -> Response:
        serializer = QuestionSerializer(question_queryset(), many=True)
        return Response(serializer.data)

    def post(self, request) -> Response:
        serializer = QuestionSerializer(data=request.data, context={"actor_profile": _actor_profile(request)})
        serializer.is_valid(raise_exception=True)
        question = serializer.save()
        return Response(QuestionSerializer(question).data, status=201)


class QuestionDetailView(APIView):
    permission_classes = [RoleRequiredPermission]
    required_roles = QUESTION_MANAGEMENT_ROLES

    def get_object(self, question_id: int):
        return get_object_or_404(question_queryset(), pk=question_id)

    def get(self, request, question_id: int) -> Response:
        question = self.get_object(question_id)
        return Response(QuestionSerializer(question).data)

    def put(self, request, question_id: int) -> Response:
        question = self.get_object(question_id)
        serializer = QuestionSerializer(
            question,
            data=request.data,
            context={"actor_profile": _actor_profile(request)},
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        updated_question = serializer.save()
        return Response(QuestionSerializer(updated_question).data)

    def patch(self, request, question_id: int) -> Response:
        return self.put(request, question_id)

    def delete(self, request, question_id: int) -> Response:
        question = self.get_object(question_id)
        if question.status not in {QuestionStatus.DRAFT, QuestionStatus.REJECTED, QuestionStatus.ARCHIVED}:
            return Response({"detail": "Only draft, rejected, or archived questions can be deleted."}, status=409)
        question.delete()
        return Response(status=204)


class QuestionTransitionView(APIView):
    permission_classes = [RoleRequiredPermission]
    required_roles = QUESTION_MANAGEMENT_ROLES

    def post(self, request, question_id: int) -> Response:
        question = get_object_or_404(question_queryset(), pk=question_id)
        serializer = QuestionTransitionSerializer(data=request.data, context={"actor_profile": _actor_profile(request), "question": question})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(QuestionSerializer(question_queryset().get(pk=question.pk)).data)


class ExamSetListCreateView(APIView):
    permission_classes = [RoleRequiredPermission]
    required_roles = EXAM_SET_MANAGEMENT_ROLES

    def get(self, request) -> Response:
        serializer = ExamSetSerializer(exam_set_queryset(), many=True)
        return Response(serializer.data)

    def post(self, request) -> Response:
        serializer = ExamSetSerializer(data=request.data, context={"actor_profile": _actor_profile(request)})
        serializer.is_valid(raise_exception=True)
        exam_set = serializer.save()
        return Response(ExamSetSerializer(exam_set).data, status=201)


class ExamSetDetailView(APIView):
    permission_classes = [RoleRequiredPermission]
    required_roles = EXAM_SET_MANAGEMENT_ROLES

    def get_object(self, exam_set_id: int) -> ExamSet:
        return get_object_or_404(exam_set_queryset(), pk=exam_set_id)

    def get(self, request, exam_set_id: int) -> Response:
        exam_set = self.get_object(exam_set_id)
        return Response(ExamSetSerializer(exam_set).data)

    def put(self, request, exam_set_id: int) -> Response:
        exam_set = self.get_object(exam_set_id)
        serializer = ExamSetSerializer(
            exam_set,
            data=request.data,
            context={"actor_profile": _actor_profile(request)},
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        updated_exam_set = serializer.save()
        return Response(ExamSetSerializer(updated_exam_set).data)

    def patch(self, request, exam_set_id: int) -> Response:
        return self.put(request, exam_set_id)

    def delete(self, request, exam_set_id: int) -> Response:
        exam_set = self.get_object(exam_set_id)
        if exam_set.status not in {ExamSetStatus.DRAFT, ExamSetStatus.REVISION_REQUIRED, ExamSetStatus.ARCHIVED}:
            return Response({"detail": "Only draft, revision-required, or archived exam sets can be deleted."}, status=409)
        exam_set.delete()
        return Response(status=204)


class ExamSetCloneView(APIView):
    permission_classes = [RoleRequiredPermission]
    required_roles = EXAM_SET_MANAGEMENT_ROLES

    def post(self, request, exam_set_id: int) -> Response:
        exam_set = get_object_or_404(exam_set_queryset(), pk=exam_set_id)
        cloned = clone_exam_set(exam_set=exam_set, actor_profile=_actor_profile(request))
        return Response(ExamSetSerializer(cloned).data, status=201)


class ExamSetTransitionView(APIView):
    permission_classes = [RoleRequiredPermission]
    required_roles = EXAM_SET_MANAGEMENT_ROLES

    def post(self, request, exam_set_id: int) -> Response:
        exam_set = get_object_or_404(exam_set_queryset(), pk=exam_set_id)
        serializer = ExamSetTransitionSerializer(data=request.data, context={"actor_profile": _actor_profile(request), "exam_set": exam_set})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(ExamSetSerializer(exam_set_queryset().get(pk=exam_set.pk)).data)


class ExamSetAutoAssembleView(APIView):
    permission_classes = [RoleRequiredPermission]
    required_roles = EXAM_SET_MANAGEMENT_ROLES

    def post(self, request, exam_set_id: int) -> Response:
        exam_set = get_object_or_404(exam_set_queryset(), pk=exam_set_id)
        auto_assemble_exam_set(exam_set=exam_set, actor_profile=_actor_profile(request))
        return Response(ExamSetSerializer(exam_set_queryset().get(pk=exam_set.pk)).data)


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
