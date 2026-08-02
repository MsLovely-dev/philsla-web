# PhilSA Web Project Context

This file is a local-only reference for development work inside `local/`.
It is meant to help keep implementation decisions aligned with the project
structure, the current tech stack, and the assigned exam-management modules.

## What this project is

PhilSA Web is a role-based web platform for exam management and related
administrative workflows.

It supports the operational flow around:

- applicant and account handling
- exam blueprint design
- question bank management
- exam set assembly and publication
- review and audit workflows
- admin and oversight features

The repository is split so frontend and backend can evolve independently.

## What it does

The app provides a structured workflow for building and managing exams:

- item writers create and maintain questions
- reviewers validate content and structure
- exam administrators assemble exam sets from approved blueprints and items
- audit/history features track important changes
- role guards limit who can access each area

The current assigned work is centered on the exam-management domain:

1. Question Bank
2. Exam Blueprint
3. Exam Sets

The intended order is important because the question bank is the source data,
blueprints define selection rules, and exam sets consume both.

## Current architecture

The repo is organized around these major areas:

- `frontend/` — React + TypeScript + Vite UI
- `backend/` — Django + Django REST Framework API
- `docs/` — project and API documentation
- `local/` — local-only notes, plans, and developer workspace files

Frontend and backend are meant to stay independently buildable and
deployable, with the API serving as the contract between them.

## Tech stack

### Backend

- Django
- Django REST Framework
- PostgreSQL target for shared/local runtime
- Python
- Docker for local development

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- Lucide React icons
- Motion

### Local development

- Docker Compose
- local-only configuration files inside `local/`
- role-based authenticated flows

## Tech spec and development rules

The project currently follows these working rules:

- backend is authoritative for validation, authorization, and workflow state
- frontend validation is only for usability
- remote calls must live in frontend service modules
- business logic should stay out of React components
- backend logic should stay out of route handlers as much as practical
- keep changes small and aligned to the current architecture
- prefer API contracts that use snake_case on the backend
- keep frontend code using camelCase internally, with mapping at the service layer

## Naming conventions

From the current development practice:

### Backend

- functions and variables: `snake_case`
- Python files/modules: `snake_case.py`
- classes: `PascalCase`
- Django models: singular `PascalCase`
- model fields: `snake_case`
- serializer classes: `PascalCase` ending in `Serializer`
- view classes: `PascalCase` ending in `View`, `APIView`, or `ViewSet`
- constants: `UPPER_SNAKE_CASE`
- URL names: `snake_case`
- URL paths: `kebab-case`

### Frontend

- components: `PascalCase`
- component files: `PascalCase.tsx`
- hooks: `useSomething`
- functions: `camelCase`
- variables: `camelCase`
- types and interfaces: `PascalCase`
- constants: `UPPER_SNAKE_CASE`
- utility/service files: `camelCase.ts`
- route paths: `kebab-case`

## Exam-management module direction

The exam-related work should stay layered like this:

- Question Bank = source item data
- Exam Blueprint = selection rules and structure
- Exam Sets = assembled exam output

That means:

- question items should be reusable by blueprints and exam sets
- blueprints should describe what is needed, not store everything themselves
- exam sets should be assembled from approved data and rules
- workflow/status changes should be enforced by the backend

## Code review support

The project also has a ChatGPT code review skill available for checking assigned
work before it is pushed. Use that skill as a reviewer pass for:

- naming convention alignment
- architecture alignment
- service-layer separation
- backend validation and authorization
- basic cleanliness and maintainability

## Local-only reminders

- Keep personal notes, draft plans, and temporary files in `local/`
- Do not commit secrets or machine-specific values
- Do not treat local notes as source of truth over backend or docs
- If something is still uncertain, mark it `TBD` instead of guessing

