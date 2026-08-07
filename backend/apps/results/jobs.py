from django.conf import settings

import django_rq

from apps.results.services import ScoreReleaseDispatchResult, dispatch_score_release_notifications


def dispatch_score_release_notification_batch(*, limit: int | None = None):
    batch_limit = limit or settings.SCORE_RELEASE_EMAIL_DISPATCH_BATCH_SIZE
    total_sent = 0
    total_failed = 0

    for _ in range(settings.SCORE_RELEASE_EMAIL_DISPATCH_MAX_BATCHES):
        result = dispatch_score_release_notifications(limit=batch_limit)
        total_sent += result.sent_count
        total_failed += result.failed_count
        if result.sent_count + result.failed_count < batch_limit:
            break

    return ScoreReleaseDispatchResult(sent_count=total_sent, failed_count=total_failed)


def enqueue_score_release_notification_dispatch(*, limit: int | None = None):
    queue = django_rq.get_queue("default")
    return queue.enqueue(
        dispatch_score_release_notification_batch,
        limit=limit or settings.SCORE_RELEASE_EMAIL_DISPATCH_BATCH_SIZE,
    )
