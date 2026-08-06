from django.core.management.base import BaseCommand

from apps.results.services import seed_score_management_data


class Command(BaseCommand):
    help = "Seed deterministic synthetic score-management data for development and visualization."

    def add_arguments(self, parser):
        parser.add_argument("--count", type=int, default=200_000, help="Number of candidate score records to create.")
        parser.add_argument("--seed", type=int, default=2027, help="Deterministic random seed.")
        parser.add_argument("--reset", action="store_true", help="Delete and recreate the seeded score-management session.")

    def handle(self, *args, **options):
        seed_data = seed_score_management_data(
            candidate_count=options["count"],
            seed=options["seed"],
            reset=options["reset"],
        )
        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded {len(seed_data.score_records)} score records across {len(seed_data.exam_sessions)} score batches.",
            ),
        )
