from rest_framework.exceptions import APIException, ValidationError
from rest_framework.response import Response
from rest_framework.views import exception_handler


def api_exception_handler(exc: Exception, context: dict[str, object]) -> Response | None:
    response = exception_handler(exc, context)
    if response is None:
        return None

    code = "API_ERROR"
    message = "The request could not be processed."
    fields: dict[str, object] = {}

    if isinstance(exc, APIException):
        code = str(exc.default_code).upper()
        if isinstance(exc, ValidationError):
            code = "VALIDATION_FAILED"
        if isinstance(response.data, dict) and "detail" in response.data:
            message = str(response.data["detail"])
        else:
            message = str(exc.default_detail)
    if isinstance(response.data, dict):
        fields = {key: value for key, value in response.data.items() if key != "detail"}

    response.data = {
        "error": {
            "code": code,
            "message": message,
            "fields": fields,
            "meta": getattr(exc, "error_meta", {}),
            "correlationId": getattr(context.get("request"), "correlation_id", None),
        }
    }
    return response
