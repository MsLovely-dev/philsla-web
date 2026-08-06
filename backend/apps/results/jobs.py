from django.conf import settings

import django_rq

from apps.results.services import dispatch_score_release_notifications


def dispatch_score_release_notification_batch(*, limit: int | None = None):
    return dispatch_score_release_notifications(
        limit=limit or settings.SCORE_RELEASE_EMAIL_DISPATCH_BATCH_SIZE,
    )


def enqueue_score_release_notification_dispatch(*, limit: int | None = None):
    queue = django_rq.get_queue("default")
    return queue.enqueue(
        dispatch_score_release_notification_batch,
        limit=limit or settings.SCORE_RELEASE_EMAIL_DISPATCH_BATCH_SIZE,
    )
