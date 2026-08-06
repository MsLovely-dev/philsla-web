import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import MaintenancePageTemplate, {
  type MaintenanceColumn,
  type MaintenanceField,
} from '../../../components/maintenance/MaintenancePageTemplate';
import {
  examBlueprintMaintenanceService,
  type CatalogPayload,
  type CatalogRecord,
  type TopicPayload,
  type TopicRecord,
} from '../../../services/backendExamBlueprintMaintenanceService';
import type { ServiceError } from '../../../services/serviceResult';

const CATEGORIES = ['Subject Areas', 'Question Type', 'Topics'] as const;
type Category = (typeof CATEGORIES)[number];

type BlueprintRow = CatalogRecord | TopicRecord;

function StatusPill({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
        isActive
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
          : 'bg-slate-100 text-slate-600 border border-slate-200'
      }`}
    >
      {isActive ? 'Yes' : 'No'}
    </span>
  );
}

function getColumnsForCategory(category: Category): MaintenanceColumn<BlueprintRow>[] {
  const statusColumn: MaintenanceColumn<BlueprintRow> = {
    key: 'isActive',
    label: 'Active',
    render: (row) => <StatusPill isActive={Boolean(row.isActive)} />,
  };

  switch (category) {
    case 'Subject Areas':
      return [
        { key: 'code', label: 'Code' },
        { key: 'name', label: 'Subject' },
        statusColumn,
      ];

    case 'Question Type':
      return [
        { key: 'code', label: 'Code' },
        { key: 'name', label: 'Question Type' },
        statusColumn,
      ];

    case 'Topics':
    default:
      return [
        { key: 'code', label: 'Topic Code' },
        { key: 'subjectName', label: 'Subject' },
        { key: 'name', label: 'Topic' },
        statusColumn,
      ];
  }
}

function getFieldsForCategory(category: Category, subjects: CatalogRecord[]): MaintenanceField[] {
  const tailFields: MaintenanceField[] = [
    { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Optional description' },
    { name: 'isActive', label: 'Active Status', type: 'toggle', defaultValue: true },
  ];

  switch (category) {
    case 'Subject Areas':
      return [
        { name: 'code', label: 'Code', type: 'text', required: true, placeholder: 'Enter code (e.g. SCI)' },
        { name: 'name', label: 'Subject Name', type: 'text', required: true, placeholder: 'Enter subject name (e.g. Science)' },
        ...tailFields,
      ];

    case 'Question Type':
      return [
        { name: 'code', label: 'Code', type: 'text', required: true, placeholder: 'Enter code (e.g. MCQ)' },
        { name: 'name', label: 'Question Type Name', type: 'text', required: true, placeholder: 'e.g. Multiple Choice' },
        ...tailFields,
      ];

    case 'Topics':
    default:
      return [
        { name: 'code', label: 'Code', type: 'text', required: true, placeholder: 'Enter code (e.g. TOP-001)' },
        {
          name: 'subjectId',
          label: 'Subject',
          type: 'select',
          required: true,
          placeholder: 'Select a subject',
          options: subjects.filter((subject) => subject.isActive).map((subject) => ({ value: subject.id, label: subject.name })),
        },
        { name: 'name', label: 'Topic Name', type: 'text', required: true, placeholder: 'e.g. General Mathematics' },
        ...tailFields,
      ];
  }
}

// MaintenancePageTemplate's handleOpenCreate now seeds formData with defaultValue from each
// field definition (see MaintenanceField.defaultValue). The isActive toggle field in
// getFieldsForCategory now has defaultValue: true, so a new create form displays the toggle
// in its "Active" position and that's what gets submitted if the admin doesn't touch it.
// Per the design spec, Subject/Topic/QuestionType records default to isActive: true (they
// should be immediately usable on creation unless explicitly deactivated). The backend
// tests (e.g., test_create_list_and_update_subject) also assert isActive: true on create.
function toCatalogPayload(record: Record<string, unknown>): CatalogPayload {
  return {
    code: typeof record.code === 'string' ? record.code : undefined,
    name: typeof record.name === 'string' ? record.name : undefined,
    description: typeof record.description === 'string' ? record.description : undefined,
    isActive: typeof record.isActive === 'boolean' ? record.isActive : true,
  };
}

function toTopicPayload(record: Record<string, unknown>): TopicPayload {
  return {
    subjectId: typeof record.subjectId === 'string' ? record.subjectId : undefined,
    code: typeof record.code === 'string' ? record.code : undefined,
    name: typeof record.name === 'string' ? record.name : undefined,
    description: typeof record.description === 'string' ? record.description : undefined,
    isActive: typeof record.isActive === 'boolean' ? record.isActive : true,
  };
}

export default function ExamBlueprintMaintenance() {
  const [subjects, setSubjects] = useState<CatalogRecord[]>([]);
  const [questionTypes, setQuestionTypes] = useState<CatalogRecord[]>([]);
  const [topics, setTopics] = useState<TopicRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<ServiceError | null>(null);
  const [mutationError, setMutationError] = useState<ServiceError | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category>('Subject Areas');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const [subjectsResult, questionTypesResult, topicsResult] = await Promise.all([
      examBlueprintMaintenanceService.listSubjects(),
      examBlueprintMaintenanceService.listQuestionTypes(),
      examBlueprintMaintenanceService.listTopics(),
    ]);
    const failed = [subjectsResult, questionTypesResult, topicsResult].find((result) => result.ok === false);
    if (failed?.ok === false) {
      setLoadError(failed.error);
      setLoading(false);
      return;
    }
    if (subjectsResult.ok) setSubjects(subjectsResult.data);
    if (questionTypesResult.ok) setQuestionTypes(questionTypesResult.data);
    if (topicsResult.ok) setTopics(topicsResult.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div role="status" aria-live="polite" className="flex min-h-64 items-center justify-center gap-3 text-sm font-semibold text-slate-600">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading exam blueprint catalogs…
      </div>
    );
  }

  if (loadError) {
    return (
      <div role="alert" className="m-5 flex min-h-56 flex-col items-center justify-center rounded-3xl border border-red-200 bg-red-50 p-8 text-center sm:m-7">
        <AlertCircle className="h-8 w-8 text-red-600" />
        <h2 className="mt-3 text-lg font-black text-red-900">Exam blueprint catalogs could not be loaded</h2>
        <p className="mt-1 max-w-xl text-sm text-red-700">{loadError.message}</p>
        <button type="button" onClick={() => void load()} className="btn-secondary mt-4 flex items-center gap-2">
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </div>
    );
  }

  const handleAdd = async (row: BlueprintRow) => {
    const record = row as unknown as Record<string, unknown>;

    if (selectedCategory === 'Topics') {
      const result = await examBlueprintMaintenanceService.createTopic(toTopicPayload(record));
      if (result.ok === false) {
        setMutationError(result.error);
        return;
      }
      setMutationError(null);
      await load();
      return;
    }

    const result =
      selectedCategory === 'Subject Areas'
        ? await examBlueprintMaintenanceService.createSubject(toCatalogPayload(record))
        : await examBlueprintMaintenanceService.createQuestionType(toCatalogPayload(record));
    if (result.ok === false) {
      setMutationError(result.error);
      return;
    }
    setMutationError(null);
    await load();
  };

  const handleEdit = async (row: BlueprintRow) => {
    const record = row as unknown as Record<string, unknown>;
    const id = typeof record.id === 'string' ? record.id : '';
    if (!id) return;

    if (selectedCategory === 'Topics') {
      const result = await examBlueprintMaintenanceService.updateTopic(id, toTopicPayload(record));
      if (result.ok === false) {
        setMutationError(result.error);
        return;
      }
      setMutationError(null);
      await load();
      return;
    }

    const result =
      selectedCategory === 'Subject Areas'
        ? await examBlueprintMaintenanceService.updateSubject(id, toCatalogPayload(record))
        : await examBlueprintMaintenanceService.updateQuestionType(id, toCatalogPayload(record));
    if (result.ok === false) {
      setMutationError(result.error);
      return;
    }
    setMutationError(null);
    await load();
  };

  const aboveTableContent = (
    <div className="flex flex-col gap-3 animate-fadeIn">
      {mutationError && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {mutationError.message}
        </div>
      )}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit">
        {CATEGORIES.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedCategory === category
                ? 'bg-white text-philsa-navy shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-philsa-navy hover:bg-white/50'
            }`}
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );

  const data: BlueprintRow[] =
    selectedCategory === 'Subject Areas' ? subjects : selectedCategory === 'Question Type' ? questionTypes : topics;

  return (
    <MaintenancePageTemplate
      title="Exam Blueprint Maintenance"
      subtitle="Lookup tables for examination subject areas, question types, and topic structures."
      breadcrumb={['Maintenance', 'Exam Blueprint']}
      columns={getColumnsForCategory(selectedCategory)}
      data={data}
      fields={getFieldsForCategory(selectedCategory, subjects)}
      onAdd={handleAdd}
      onEdit={handleEdit}
      aboveTableContent={aboveTableContent}
    />
  );
}
