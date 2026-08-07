import { fireEvent, render, screen } from '@testing-library/react';
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
});
