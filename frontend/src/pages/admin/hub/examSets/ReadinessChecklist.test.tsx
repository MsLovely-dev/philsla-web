import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ExamSetValidationResult } from '../../../../services/backendExamSetService';
import { ReadinessChecklist } from './ReadinessChecklist';

function result(overrides: Partial<ExamSetValidationResult>): ExamSetValidationResult {
  return {
    id: '1',
    validationCode: 'item_count',
    validationName: 'Item count',
    result: 'PASSED',
    expectedValue: '1',
    actualValue: '1',
    message: 'Exam set contains items.',
    validatedAt: '2026-08-07T00:00:00Z',
    ...overrides,
  };
}

describe('ReadinessChecklist', () => {
  it('shows a pass-count header and renders each row with its message', () => {
    render(<ReadinessChecklist results={[
      result({ id: '1', result: 'PASSED' }),
      result({ id: '2', result: 'WARNING', validationName: 'Marks compliance', message: 'Total marks are 5; blueprint target is 10.' }),
      result({ id: '3', result: 'FAILED', validationName: 'Item count', message: 'Exam set has no items.' }),
    ]} />);

    expect(screen.getByText('1 of 3 checks passed')).toBeInTheDocument();
    expect(screen.getByText('Total marks are 5; blueprint target is 10.')).toBeInTheDocument();
    expect(screen.getByText('Exam set has no items.')).toBeInTheDocument();
  });

  it('renders an empty state when there are no results yet', () => {
    render(<ReadinessChecklist results={[]} />);
    expect(screen.getByText(/no validation results/i)).toBeInTheDocument();
  });
});
