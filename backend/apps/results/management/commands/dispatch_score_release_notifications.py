from django.core.management.base import BaseCommand, CommandError

from apps.results.services import dispatch_score_release_notifications


class Command(BaseCommand):
    help = "Dispatch queued Score Management release notification emails."

    def add_arguments(self, parser):
        parser.add_argument(
            "--limit",
            type=int,
            default=100,
            help="Maximum number of pending notifications to dispatch.",
        )
        parser.add_argument(
            "--retry-failed",
            action="store_true",
            help="Retry failed notifications whose attempt count is still below the maximum.",
        )
        parser.add_argument(
            "--max-attempts",
            type=int,
            default=None,
            help="Maximum attempts allowed when retrying failed notifications.",
        )

    def handle(self, *args, **options):
        limit = options["limit"]
        try:
            result = dispatch_score_release_notifications(
                limit=limit,
                include_failed=options["retry_failed"],
                max_attempts=options["max_attempts"],
            )
        except ValueError as exc:
            raise CommandError(str(exc)) from exc

        self.stdout.write(
            self.style.SUCCESS(
                f"Dispatched score release notifications: sent={result.sent_count} failed={result.failed_count}."
            )
        )
