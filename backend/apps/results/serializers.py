from rest_framework import serializers


class ScoreProcessRequestSerializer(serializers.Serializer):
    allowReprocessing = serializers.BooleanField(default=False, required=False)


class ScoreResultsQuerySerializer(serializers.Serializer):
    page = serializers.IntegerField(default=1, min_value=1, required=False)
    pageSize = serializers.IntegerField(default=25, min_value=1, max_value=100, required=False)
    sortKey = serializers.ChoiceField(
        choices=("candidateId", "candidateName", "examName", "finalScore", "percentile", "rank", "releaseStatus"),
        default="rank",
        required=False,
    )
    sortDirection = serializers.ChoiceField(choices=("asc", "desc"), default="asc", required=False)
    search = serializers.CharField(default="", allow_blank=True, trim_whitespace=True, required=False)
    releaseStatus = serializers.ChoiceField(choices=("NOT_RELEASED", "RELEASED"), required=False)
