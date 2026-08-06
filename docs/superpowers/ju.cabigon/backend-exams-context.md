# Backend Exams Context

Date: 2026-08-05

## Purpose
This note captures the current backend exam-related surface area so Jude Cabigon can work faster on blueprint transition tests and related exam workflow coverage.

## Core Files
- `backend/apps/exams/models.py`
- `backend/apps/exams/views.py`
- `backend/apps/exams/urls.py`
- `backend/apps/exams/serializers.py`
- `backend/apps/exams/services.py`
- `backend/apps/exams/tests.py`

## Current Shape
- `ExamBlueprint`, `BlueprintVersion`, and `BlueprintWorkflowHistory` exist for blueprint lifecycle tracking.
- `Question`, `QuestionWorkflowHistory`, and `QuestionStatus` exist for question workflow tracking.
- `ExamSet`, `ExamSetWorkflowHistory`, and `ExamSetStatus` exist for exam set lifecycle tracking.
- The transition views are already wired in `views.py` and routed in `urls.py`.
- The serializers normalize incoming status strings before calling the service layer.

## Important Observation
- The transition service functions currently normalize and persist the requested status.
- I did not see hard validation of allowed workflow edges in the scan I just ran.
- That makes transition tests especially important because the tests may need to define the intended workflow behavior before code enforcement is added or adjusted.

## Blueprint Transition Entry Points
- API route: `POST /api/v1/exams/blueprints/<id>/transition/`
- View: `ExamBlueprintTransitionView`
- Serializer: `BlueprintTransitionSerializer`
- Service: `transition_blueprint_version`

## Exam Set and Question Entry Points
- API route: `POST /api/v1/exams/exam-sets/<id>/transition/`
- API route: `POST /api/v1/exams/questions/<id>/transition/`
- The same pattern is used for question and exam set transitions.

## Practical Notes
- Backend tests should use synthetic records and a minimal set of supporting models.
- For Jude's current task, keep the focus on blueprint transition behavior first.
- If a transition rule is unclear, treat the reviewed plan as the place to make it explicit before implementation.
