# Pull Request Template

## Title

Prevent creating expenses with future dates

## Description

This PR prevents users from creating expenses with dates in the future by adding validation on both the backend and frontend.

## Background

Previously, the expense form allowed any date to be submitted, and the backend did not check whether the selected date was in the future. This meant users could create expenses for dates that hadn’t happened yet.

## Changes

- Added a backend model validation to reject expense dates later than today
- Added model and request specs covering valid past/today dates and invalid future dates
- Updated the expense form date input to restrict future selection using the `max` attribute
- Added frontend validation to catch future dates before submission
- Ensured backend validation errors are returned through the API and displayed clearly in the form

## Implementation Note

Validation is enforced in both layers. The frontend prevents invalid input during normal usage, while the backend rejects any manually forced future dates.

## Validation

- Backend expense specs pass
- Frontend production build completes successfully

## Result

Users can no longer select or submit future expense dates. If a future date is manually entered or forced, the backend rejects it.
