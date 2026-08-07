import type { ExamSetDraft, ExamSetRecord, ExamSetStatus } from '../../../../services/backendExamSetService';

export const STATUSES: ExamSetStatus[] = ['DRAFT', 'ACADEMIC_REVIEW', 'REVISION_REQUIRED', 'APPROVED', 'PUBLISHED', 'ARCHIVED'];

export const ACTION_BUTTON = 'inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';
export const FIELD_LABEL = 'flex flex-col gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-600';
export const FIELD_INPUT = 'min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium normal-case tracking-normal text-slate-900 outline-none transition focus:border-slate-500 focus:bg-white';

export function statusLabel(status: ExamSetStatus): string {
  return status.replaceAll('_', ' ');
}

export function statusClasses(status: ExamSetStatus): string {
  if (status === 'PUBLISHED') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'APPROVED') return 'border-teal-200 bg-teal-50 text-teal-700';
  if (status === 'ACADEMIC_REVIEW') return 'border-sky-200 bg-sky-50 text-sky-700';
  if (status === 'REVISION_REQUIRED') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (status === 'ARCHIVED') return 'border-slate-300 bg-slate-100 text-slate-600';
  return 'border-violet-200 bg-violet-50 text-violet-700';
}

export function nextTransitions(status: ExamSetStatus): Array<{ label: string; status: ExamSetStatus; remarks: string }> {
  if (status === 'DRAFT' || status === 'REVISION_REQUIRED') {
    return [{ label: 'Submit for Review', status: 'ACADEMIC_REVIEW', remarks: 'Submitted for academic review.' }];
  }
  if (status === 'ACADEMIC_REVIEW') {
    return [
      { label: 'Approve', status: 'APPROVED', remarks: 'Approved after academic review.' },
      { label: 'Request Revision', status: 'REVISION_REQUIRED', remarks: 'Revision requested during academic review.' },
    ];
  }
  if (status === 'APPROVED') {
    return [{ label: 'Publish', status: 'PUBLISHED', remarks: 'Published for authorized use.' }];
  }
  if (status === 'PUBLISHED') {
    return [{ label: 'Archive', status: 'ARCHIVED', remarks: 'Archived after publication.' }];
  }
  return [];
}

export function recordToDraft(record: ExamSetRecord): ExamSetDraft {
  return {
    title: record.title,
    blueprintVersionId: record.blueprintVersion.id,
    academicYear: record.academicYear,
    durationMinutes: record.durationMinutes,
    examinationPeriod: record.examinationPeriod,
    examType: record.examType,
    instructions: record.instructions,
    items: record.items
      .slice()
      .sort((left, right) => left.displayOrder - right.displayOrder)
      .map((item, index) => ({
        questionId: item.question.id,
        displayOrder: index + 1,
        points: item.points,
        ...(item.blueprintSectionId ? { blueprintSectionId: item.blueprintSectionId } : {}),
        ...(item.selectionMethod ? { selectionMethod: item.selectionMethod } : {}),
      })),
  };
}
