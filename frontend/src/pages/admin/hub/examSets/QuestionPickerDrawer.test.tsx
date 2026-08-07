import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { QuestionBankItem } from '../../../../services/backendQuestionBankService';
import { QuestionPickerDrawer } from './QuestionPickerDrawer';

function question(overrides: Partial<QuestionBankItem>): QuestionBankItem {
  return {
    id: '101', questionCode: 'Q-SCI-001', questionType: 'Multiple Choice', questionTypeCode: 'MCQ',
    subject: 'Science', subjectCode: 'SCI', topic: 'Orbital Mechanics', topicCode: 'ORBIT',
    competency: '', competencyCode: '', difficulty: 'EASY', questionText: 'Which orbit stays fixed overhead?',
    explanation: '', points: 5, status: 'APPROVED', createdBy: '', reviewedBy: '', approvedBy: '',
    reviewedAt: null, approvedAt: null, retiredAt: null, archivedAt: null, choices: [], answers: [],
    rubrics: [], tags: [], attachments: [], workflowHistory: [], createdAt: '', updatedAt: '',
    ...overrides,
  };
}

describe('QuestionPickerDrawer', () => {
  it('filters by search text and reports the picked question', () => {
    const onSelect = vi.fn();
    render(
      <QuestionPickerDrawer
        open
        questions={[question({ id: '101', questionCode: 'Q-SCI-001' }), question({ id: '102', questionCode: 'Q-MATH-001', subject: 'Mathematics' })]}
        excludeQuestionIds={[]}
        onSelect={onSelect}
        onClose={() => {}}
      />,
    );

    expect(screen.getByText('Q-SCI-001')).toBeInTheDocument();
    expect(screen.getByText('Q-MATH-001')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'Math' } });
    expect(screen.queryByText('Q-SCI-001')).not.toBeInTheDocument();
    expect(screen.getByText('Q-MATH-001')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Q-MATH-001'));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: '102' }));
  });

  it('excludes already-included questions', () => {
    render(
      <QuestionPickerDrawer
        open
        questions={[question({ id: '101', questionCode: 'Q-SCI-001' })]}
        excludeQuestionIds={['101']}
        onSelect={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.queryByText('Q-SCI-001')).not.toBeInTheDocument();
  });

  it('renders nothing when closed', () => {
    render(<QuestionPickerDrawer open={false} questions={[]} excludeQuestionIds={[]} onSelect={() => {}} onClose={() => {}} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
