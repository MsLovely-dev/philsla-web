from rest_framework import serializers

from .models import ExamPermit


class ScanAttendanceSerializer(serializers.Serializer):
    qrToken = serializers.CharField(
        trim_whitespace=True,
        error_messages={
            "blank": "No QR data was captured. Please rescan.",
            "required": "No QR data was captured. Please rescan.",
        },
    )


class ExamPermitSerializer(serializers.ModelSerializer):
    candidateId = serializers.CharField(source="candidate_id", read_only=True)
    fullName = serializers.CharField(source="full_name", read_only=True)
    testCenter = serializers.CharField(source="test_center", read_only=True)
    examDate = serializers.DateField(source="exam_date", read_only=True)
    startTime = serializers.TimeField(source="exam_start_time", read_only=True)
    endTime = serializers.TimeField(source="exam_end_time", read_only=True)
    qrCode = serializers.CharField(source="qr_token", read_only=True)

    class Meta:
        model = ExamPermit
        fields = ("id", "candidateId", "fullName", "email", "testCenter", "room", "seat", "examDate", "startTime", "endTime", "qrCode", "status")
        read_only_fields = fields
