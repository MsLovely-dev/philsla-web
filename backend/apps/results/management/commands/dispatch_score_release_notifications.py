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

    def handle(self, *args, **options):
        limit = options["limit"]
        try:
            result = dispatch_score_release_notifications(limit=limit)
        except ValueError as exc:
            raise CommandError(str(exc)) from exc

        self.stdout.write(
            self.style.SUCCESS(
                f"Dispatched score release notifications: sent={result.sent_count} failed={result.failed_count}."
            )
        )
