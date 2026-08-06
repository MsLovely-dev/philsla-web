from rest_framework import serializers


class ScanAttendanceSerializer(serializers.Serializer):
    qrToken = serializers.CharField(
        trim_whitespace=True,
        error_messages={
            "blank": "No QR data was captured. Please rescan.",
            "required": "No QR data was captured. Please rescan.",
        },
    )
