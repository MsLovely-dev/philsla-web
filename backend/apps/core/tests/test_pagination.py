from django.conf import settings
from django.test import SimpleTestCase

from apps.core.pagination import StandardPageNumberPagination


class PaginationConfigurationTests(SimpleTestCase):
    def test_drf_uses_standard_pagination_class(self) -> None:
        self.assertEqual(
            settings.REST_FRAMEWORK["DEFAULT_PAGINATION_CLASS"],
            "apps.core.pagination.StandardPageNumberPagination",
        )
        self.assertEqual(settings.REST_FRAMEWORK["PAGE_SIZE"], 10)

    def test_standard_pagination_contract(self) -> None:
        paginator = StandardPageNumberPagination()

        self.assertEqual(paginator.page_size, 10)
        self.assertEqual(paginator.page_query_param, "page")
        self.assertEqual(paginator.page_size_query_param, "pageSize")
        self.assertEqual(paginator.max_page_size, 10)
