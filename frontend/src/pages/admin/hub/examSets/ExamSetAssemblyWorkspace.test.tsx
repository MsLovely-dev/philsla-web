import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ExamSetRecord } from '../../../../services/backendExamSetService';
import type { QuestionBankItem } from '../../../../services/backendQuestionBankService';
import { ExamSetAssemblyWorkspace } from './ExamSetAssemblyWorkspace';

function record(overrides: Partial<ExamSetRecord> = {}): ExamSetRecord {
  return {
    id: '7', examCode: 'EXAM-SYNTHETIC', title: 'Synthetic Set', examinationPeriod: '', examType: 'Admission',
    instructions: '', durationMinutes: 60, status: 'DRAFT',
    blueprintVersion: { id: '42', specCode: 'BP-SYNTHETIC', name: 'Synthetic Blueprint', versionNumber: '1.0', status: 'APPROVED' },
    academicYear: '2026-2027', clonedFromExamSetId: null, createdBy: '', approvedBy: '', publishedBy: '', archivedBy: '',
    approvedAt: null, publishedAt: null, archivedAt: null, publishedHash: null,
    items: [{
      id: '70', displayOrder: 1, points: 5, selectionMethod: 'MANUAL', selectedBy: '', selectedAt: '',
      blueprintSectionId: null,
      question: { id: '101', questionCode: 'Q-SCI-001', questionType: 'MCQ', questionTypeCode: 'MCQ', subject: 'Science', topic: 'Orbits', difficulty: 'EASY', status: 'APPROVED', points: 5 },
    }],
    validationResults: [], assemblyRuns: [], workflowHistory: [], createdAt: '', updatedAt: '',
    ...overrides,
  };
}

describe('ExamSetAssemblyWorkspace', () => {
  it('removes an item and reports the remaining items', () => {
    const onUpdateItems = vi.fn();
    render(
      <ExamSetAssemblyWorkspace
        record={record()}
        questions={[]}
        pending={false}
        onUpdateItems={onUpdateItems}
        onAutoAssemble={() => {}}
        onTransition={() => {}}
        onDelete={() => {}}
        onBack={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /remove/i }));
    expect(onUpdateItems).toHaveBeenCalledWith([]);
  });

  it('hides mutation controls when the record is not editable', () => {
    render(
      <ExamSetAssemblyWorkspace
        record={record({ status: 'PUBLISHED' })}
        questions={[]}
        pending={false}
        onUpdateItems={() => {}}
        onAutoAssemble={() => {}}
        onTransition={() => {}}
        onDelete={() => {}}
        onBack={() => {}}
      />,
    );

    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /run auto-selection/i })).not.toBeInTheDocument();
  });

  it('calls onAutoAssemble from the auto-selection button when editable', () => {
    const onAutoAssemble = vi.fn();
    render(
      <ExamSetAssemblyWorkspace
        record={record()}
        questions={[]}
        pending={false}
        onUpdateItems={() => {}}
        onAutoAssemble={onAutoAssemble}
        onTransition={() => {}}
        onDelete={() => {}}
        onBack={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /run auto-selection/i }));
    expect(onAutoAssemble).toHaveBeenCalled();
  });

  it('replaces the exact slot clicked, not another slot, when picking a question from the drawer', () => {
    const onUpdateItems = vi.fn();
    const twoItemRecord = record({
      items: [
        {
          id: '70', displayOrder: 1, points: 5, selectionMethod: 'MANUAL', selectedBy: '', selectedAt: '',
          blueprintSectionId: null,
          question: { id: '101', questionCode: 'Q-SCI-001', questionType: 'MCQ', questionTypeCode: 'MCQ', subject: 'Science', topic: 'Orbits', difficulty: 'EASY', status: 'APPROVED', points: 5 },
        },
        {
          id: '71', displayOrder: 2, points: 3, selectionMethod: 'MANUAL', selectedBy: '', selectedAt: '',
          blueprintSectionId: null,
          question: { id: '102', questionCode: 'Q-SCI-002', questionType: 'MCQ', questionTypeCode: 'MCQ', subject: 'Science', topic: 'Orbits', difficulty: 'EASY', status: 'APPROVED', points: 3 },
        },
      ],
    });
    const firstBankQuestion = { id: '101', questionCode: 'Q-SCI-001', questionText: 'First question text.', questionTypeCode: 'MCQ', subject: 'Science', difficulty: 'EASY', points: 5, status: 'APPROVED' } as QuestionBankItem;
    const secondBankQuestion = { id: '102', questionCode: 'Q-SCI-002', questionText: 'Second question text.', questionTypeCode: 'MCQ', subject: 'Science', difficulty: 'EASY', points: 3, status: 'APPROVED' } as QuestionBankItem;
    const replacement = { id: '103', questionCode: 'Q-SCI-003', questionText: 'Third question text.', questionTypeCode: 'MCQ', subject: 'Science', difficulty: 'EASY', points: 7, status: 'APPROVED' } as QuestionBankItem;

    render(
      <ExamSetAssemblyWorkspace
        record={twoItemRecord}
        questions={[firstBankQuestion, secondBankQuestion, replacement]}
        pending={false}
        onUpdateItems={onUpdateItems}
        onAutoAssemble={() => {}}
        onTransition={() => {}}
        onDelete={() => {}}
        onBack={() => {}}
      />,
    );

    const secondItemRow = screen.getByText('Q-SCI-002').closest('li');
    if (!secondItemRow) throw new Error('expected the second item row to render as a <li>');
    fireEvent.click(within(secondItemRow).getByRole('button', { name: /replace/i }));
    fireEvent.click(screen.getByRole('button', { name: /Q-SCI-003/i }));

    expect(onUpdateItems).toHaveBeenCalledWith([
      { questionId: '101', displayOrder: 1, points: 5, selectionMethod: 'MANUAL' },
      { questionId: '103', displayOrder: 2, points: 7, selectionMethod: 'MANUAL' },
    ]);
  });

  it('appends a newly picked question when adding via the drawer', () => {
    const onUpdateItems = vi.fn();
    const addable = { id: '103', questionCode: 'Q-SCI-003', questionText: 'Third question text.', questionTypeCode: 'MCQ', subject: 'Science', difficulty: 'EASY', points: 7, status: 'APPROVED' } as QuestionBankItem;

    render(
      <ExamSetAssemblyWorkspace
        record={record()}
        questions={[addable]}
        pending={false}
        onUpdateItems={onUpdateItems}
        onAutoAssemble={() => {}}
        onTransition={() => {}}
        onDelete={() => {}}
        onBack={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /add question item/i }));
    fireEvent.click(screen.getByRole('button', { name: /Q-SCI-003/i }));

    expect(onUpdateItems).toHaveBeenCalledWith([
      { questionId: '101', displayOrder: 1, points: 5, selectionMethod: 'MANUAL' },
      { questionId: '103', displayOrder: 2, points: 7 },
    ]);
  });

  it('disables item-row mutation controls and add-question button while pending', () => {
    render(
      <ExamSetAssemblyWorkspace
        record={record()}
        questions={[]}
        pending={true}
        onUpdateItems={() => {}}
        onAutoAssemble={() => {}}
        onTransition={() => {}}
        onDelete={() => {}}
        onBack={() => {}}
      />,
    );

    expect(screen.getByRole('button', { name: /add question item/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /move q-sci-001 up/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /move q-sci-001 down/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /replace/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /remove/i })).toBeDisabled();
  });
});
