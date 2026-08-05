# University Registry Server-Driven Pagination Design

## Purpose

Make university and college-course maintenance lists server-paginated at the project-standard page size of 10. Preserve global university summary cards, enforce university scope consistently for University Admin reads, and return conflict responses for duplicate update races.

## API behavior

- `StandardPageNumberPagination` defaults to and caps requests at 10 records.
- The university list returns the existing DRF page shape (`count`, `next`, `previous`, and `results`) plus a `summary` object with global, authorization-scoped totals:
  - `totalUniversities`
  - `publicUniversities`
  - `privateUniversities`
  - `totalDegreeCourses`
- The university and course list endpoints return only the requested page. The frontend requests `page=<n>&pageSize=10` and never merges subsequent pages.
- University and course list/detail reads for `UNIVERSITY_ADMIN` are restricted to the UUIDs in the account's server-owned `scopes.universityIds`. `SYSTEM_ADMIN` and other allowed non-University-Admin roles retain their documented access.
- Updates convert uniqueness `IntegrityError` exceptions into the existing `409 CONFLICT` API response, matching creates.

## Frontend behavior

- The university service exposes paginated result data, including the requested current page and backend navigation metadata.
- The maintenance page keeps separate pagination state for universities and the selected university's courses. Its Previous and Next controls are enabled only when the corresponding backend URL is present.
- Changing page triggers a single fresh request for that page. Returning from a course drill-down preserves the university list page.
- University summary cards read the server-provided aggregate metadata, while rows and course tables display only their current 10-record pages.

## Error handling

- Existing loading and retry states remain in use for page-load failures.
- Stale course responses remain ignored using the existing request ID guard.
- Existing notification behavior displays backend conflict errors for duplicate updates.

## Tests and documentation

- Frontend service and page tests prove `pageSize=10`, one-page loading, and page navigation requests.
- Backend endpoint tests prove a 10-record pagination cap/default, read scope filtering for lists/details/courses, and duplicate-update conflicts.
- API documentation describes the 10-record standard and the university list `summary` object.

## Non-goals

- This does not add server-side filter wiring for the existing client-side filters.
- This does not introduce a separate summary endpoint or alter unrelated paginated endpoints beyond the shared 10-record pagination standard.
