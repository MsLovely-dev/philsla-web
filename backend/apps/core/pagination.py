from rest_framework.pagination import PageNumberPagination


class StandardPageNumberPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "pageSize"
    max_page_size = 10


class RegistryPageNumberPagination(PageNumberPagination):
    """Pagination for the maintenance registries (universities, schools), which
    can grow to thousands of rows. A higher ceiling than the shared
    ``StandardPageNumberPagination`` so callers can request larger pages (e.g.
    CSV-style pulls), while the default page stays small for the admin tables.
    """

    page_size = 10
    page_size_query_param = "pageSize"
    max_page_size = 100
