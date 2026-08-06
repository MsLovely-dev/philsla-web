from rest_framework.pagination import PageNumberPagination


class StandardPageNumberPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "pageSize"
    max_page_size = 10


class RegistryPageNumberPagination(PageNumberPagination):
    """Pagination for the maintenance registries (universities, schools), which
    can grow to thousands of rows. A larger default/ceiling than the shared
    ``StandardPageNumberPagination`` so admin tables show useful pages.
    """

    page_size = 20
    page_size_query_param = "pageSize"
    max_page_size = 100
