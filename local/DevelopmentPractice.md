# PhilSLA Development Practice

This file captures the naming conventions and development style to keep the project consistent and reduce future refactoring.

## Backend (Django + Django REST Framework + PostgreSQL)

- Functions and variables: `snake_case`
- Modules and Python files: `snake_case.py`
- Classes: `PascalCase`
- Django models: singular `PascalCase`
- Django model fields: `snake_case`
- Serializer classes: `PascalCase` ending in `Serializer`
- View classes: `PascalCase` ending in `View`, `APIView`, or `ViewSet`
- Service functions: `snake_case`
- Constants: `UPPER_SNAKE_CASE`
- URL names: `snake_case`
- URL paths: `kebab-case`
- Django app names: short, lowercase, and preferably `snake_case`

## Frontend (React + TypeScript + Tailwind)

- Components: `PascalCase`
- Component files: `PascalCase.tsx`
- Hooks: `camelCase`, prefixed with `use`
- Functions: `camelCase`
- Variables: `camelCase`
- Props: `camelCase`
- Interfaces and types: `PascalCase`
- Enums: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Utility files: `camelCase.ts`
- Route paths: `kebab-case`
- CSS classes: `kebab-case`

## Working Principle

- Keep database naming clean and consistent from the start.
- Use backend-first business logic and validation.
- Keep frontend components focused on presentation and user interaction.
- Prefer small, reusable service functions over repeated inline logic.
- Follow the repo architecture instead of introducing parallel patterns.

## Team Reminder

If a naming choice might affect future modules, decide it early and keep it consistent across:

- database schema
- Python backend code
- API routes
- frontend components
- types and interfaces
- tests
