import { useState } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import MaintenancePageTemplate, { MaintenanceColumn, MaintenanceField } from '../../../components/maintenance/MaintenancePageTemplate';

type BlueprintCategory = 'Subject Areas' | 'Difficulty Level' | 'Question Type' | 'Topics';

interface BlueprintRecord {
  id: string;
  category: BlueprintCategory;
  createdAt: string;
  status?: boolean;
  code?: string;
  topicCode?: string;
  subject?: string;
  level?: string;
  questionType?: string;
  autoScored?: string;
  topic?: string;
  gradeLevel?: string;
  [key: string]: string | boolean | undefined;
}

type BlueprintFormValues = Partial<Omit<BlueprintRecord, 'id' | 'category' | 'createdAt'>>;

const CATEGORIES: BlueprintCategory[] = [
  'Subject Areas',
  'Difficulty Level',
  'Question Type',
  'Topics'
];

const CODE_PREFIXES: Record<BlueprintCategory, string> = {
  'Subject Areas': 'SUB',
  'Difficulty Level': 'DIF',
  'Question Type': 'QT',
  'Topics': 'TOP'
};

const CODE_KEYS: Record<BlueprintCategory, 'code' | 'topicCode'> = {
  'Subject Areas': 'code',
  'Difficulty Level': 'code',
  'Question Type': 'code',
  'Topics': 'topicCode'
};

const OTHERS_OPTION = 'Others (Specify)';

const SUBJECT_OPTIONS = [
  { value: 'Mathematics', label: 'Mathematics' },
  { value: 'English', label: 'English' },
  { value: 'Science', label: 'Science' },
  { value: 'Filipino', label: 'Filipino' },
  { value: OTHERS_OPTION, label: OTHERS_OPTION }
];

const LEVEL_OPTIONS = [
  { value: 'Easy', label: 'Easy' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Hard', label: 'Hard' },
  { value: OTHERS_OPTION, label: OTHERS_OPTION }
];

const GRADE_LEVEL_OPTIONS = [
  { value: 'Grade 11', label: 'Grade 11' },
  { value: 'Grade 12', label: 'Grade 12' },
  { value: OTHERS_OPTION, label: OTHERS_OPTION }
];

const QUESTION_TYPE_OPTIONS = [
  { value: 'Multiple Choice', label: 'Multiple Choice' },
  { value: 'Essay', label: 'Essay' },
  { value: 'Enumeration', label: 'Enumeration' },
  { value: OTHERS_OPTION, label: OTHERS_OPTION }
];

export default function ExamBlueprintMaintenance() {
  const [data, setData] = useState<BlueprintRecord[]>([]);

  const [selectedCategory, setSelectedCategory] = useState<BlueprintCategory>('Subject Areas');
  const [viewingRow, setViewingRow] = useState<BlueprintRecord | null>(null);
  const [pendingTopicSubject, setPendingTopicSubject] = useState<string | undefined>(undefined);
  const [createTrigger, setCreateTrigger] = useState(0);

  const goCreateTopicForSubject = (subject?: string) => {
    setPendingTopicSubject(subject);
    setSelectedCategory('Topics');
    setCreateTrigger(t => t + 1);
  };

  const saveConfigs = (newData: BlueprintRecord[]) => {
    setData(newData);
  };

  const generateCode = (category: BlueprintCategory) => {
    const prefix = CODE_PREFIXES[category];
    const codeKey = CODE_KEYS[category];
    const usedNumbers = data
      .filter(item => item.category === category)
      .map(item => Number.parseInt(String(item[codeKey] || '').replace(`${prefix}-`, ''), 10))
      .filter(n => !Number.isNaN(n));
    const nextNumber = usedNumbers.length ? Math.max(...usedNumbers) + 1 : 1;
    return `${prefix}-${String(nextNumber).padStart(3, '0')}`;
  };

  const getExistingSubjectOptions = () => {
    const subjects = Array.from(new Set(
      data
        .filter(item => item.category === 'Subject Areas' && item.subject)
        .map(item => item.subject as string)
    ));
    return subjects.map(s => ({ value: s, label: s }));
  };

  const formatDateTime = (iso?: string) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const dateCreatedColumn: MaintenanceColumn<BlueprintRecord> = {
    key: 'createdAt',
    label: 'Date Created',
    render: (row: BlueprintRecord) => (
      <span className="text-sm font-bold text-philsa-navy">{formatDateTime(row.createdAt)}</span>
    )
  };

  const getColumnsForCategory = (category: BlueprintCategory): MaintenanceColumn<BlueprintRecord>[] => {
    switch (category) {
      case 'Subject Areas':
        return [
          { key: 'code', label: 'Code' },
          {
            key: 'subject',
            label: 'Subject',
            render: (row: BlueprintRecord) => (
              <button
                type="button"
                title="Create a topic under this subject"
                onClick={() => goCreateTopicForSubject(row.subject)}
                className="text-sm font-bold text-philsa-navy underline decoration-dotted underline-offset-4 hover:text-philsa-red transition-colors cursor-pointer"
              >
                {row.subject}
              </button>
            )
          },
          dateCreatedColumn
        ];

      case 'Difficulty Level':
        return [
          { key: 'code', label: 'Code' },
          {
            key: 'level',
            label: 'Level',
            render: (row: BlueprintRecord) => {
              const levelColors: Record<string, string> = {
                Easy: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
                Medium: 'bg-amber-50 text-amber-700 border border-amber-100',
                Hard: 'bg-rose-50 text-rose-700 border border-rose-100'
              };
              return (
                <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                  levelColors[row.level as string] || 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}>
                  {row.level}
                </span>
              );
            }
          },
          dateCreatedColumn
        ];

      case 'Question Type':
        return [
          { key: 'code', label: 'Code' },
          { key: 'questionType', label: 'Question Type' },
          {
            key: 'autoScored',
            label: 'Auto Scored',
            render: (row: BlueprintRecord) => (
              <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                row.autoScored === 'Yes'
                  ? 'bg-blue-50 text-blue-700 border border-blue-100'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}>
                {row.autoScored || 'No'}
              </span>
            )
          },
          dateCreatedColumn
        ];

      case 'Topics':
      default:
        return [
          { key: 'topicCode', label: 'Topic Code' },
          { key: 'subject', label: 'Subject' },
          { key: 'topic', label: 'Topic' },
          { key: 'gradeLevel', label: 'Grade Level' },
          dateCreatedColumn
        ];
    }
  };

  const getFieldsForCategory = (category: BlueprintCategory): MaintenanceField[] => {
    const codeField: MaintenanceField = {
      name: CODE_KEYS[category],
      label: category === 'Topics' ? 'Topic Code' : 'Code',
      type: 'text',
      disabled: true,
      defaultValue: () => generateCode(category)
    };

    const statusField: MaintenanceField = {
      name: 'status',
      label: 'Active Status',
      type: 'toggle',
      editOnly: true
    };

    switch (category) {
      case 'Subject Areas':
        return [
          codeField,
          { name: 'subject', label: 'Subject', type: 'combo', required: true, options: SUBJECT_OPTIONS, othersValue: OTHERS_OPTION },
          statusField
        ];

      case 'Difficulty Level':
        return [
          codeField,
          { name: 'level', label: 'Level', type: 'combo', required: true, options: LEVEL_OPTIONS, othersValue: OTHERS_OPTION },
          statusField
        ];

      case 'Question Type':
        return [
          codeField,
          { name: 'questionType', label: 'Question Type', type: 'combo', required: true, options: QUESTION_TYPE_OPTIONS, othersValue: OTHERS_OPTION },
          {
            name: 'autoScored',
            label: 'Auto Scored',
            type: 'select',
            required: true,
            hideEmptyOption: true,
            defaultValue: 'Yes',
            options: [
              { value: 'Yes', label: 'Yes' },
              { value: 'No', label: 'No' },
            ]
          },
          statusField
        ];

      case 'Topics':
      default: {
        const existingSubjects = getExistingSubjectOptions();
        return [
          codeField,
          {
            name: 'subject',
            label: 'Subject',
            type: 'select',
            required: true,
            options: existingSubjects,
            hideEmptyOption: existingSubjects.length > 0,
            defaultValue: pendingTopicSubject || existingSubjects[0]?.value,
            placeholder: existingSubjects.length ? 'Select an option' : 'No subjects created yet — add one in Subject Areas'
          },
          { name: 'topic', label: 'Topic', type: 'text', required: true, placeholder: 'e.g. General Mathematics' },
          {
            name: 'gradeLevel',
            label: 'Grade Level',
            type: 'combo',
            required: true,
            hideEmptyOption: true,
            defaultValue: 'Grade 11',
            options: GRADE_LEVEL_OPTIONS,
            othersValue: OTHERS_OPTION
          },
          statusField
        ];
      }
    }
  };

  const handleAdd = (formValues: BlueprintFormValues) => {
    const item: BlueprintRecord = {
      ...formValues,
      category: selectedCategory,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      status: true
    };
    item[CODE_KEYS[selectedCategory]] = generateCode(selectedCategory);
    saveConfigs([item, ...data]);
  };

  const handleEdit = (updatedRow: BlueprintRecord) => {
    saveConfigs(data.map(row => row.id === updatedRow.id ? updatedRow : row));
  };

  const handleDelete = (row: BlueprintRecord) => {
    if (window.confirm(`Are you sure you want to delete ${row.subject || row.topic || row.questionType || row.level || row.code}?`)) {
      saveConfigs(data.filter(r => r.id !== row.id));
    }
  };

  // Clean simple tab navigation bar
  const aboveTableContent = (
    <div className="flex flex-col gap-3 animate-fadeIn">
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit">
        {CATEGORIES.map(category => (
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

  const filteredData = data.filter(item => item.category === selectedCategory);
  const columns = getColumnsForCategory(selectedCategory);
  const fields = getFieldsForCategory(selectedCategory);

  return (
    <>
      <MaintenancePageTemplate
        title="Exam Blueprint Maintenance"
        subtitle="Lookup tables for examination subject areas, difficulty levels, question types, and topic structures."
        breadcrumb={['Maintenance', 'Exam Blueprint']}
        columns={columns}
        data={filteredData}
        fields={fields}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onView={(row: BlueprintRecord) => setViewingRow(row)}
        aboveTableContent={aboveTableContent}
        showApprovalColumn={false}
        auditDetailsLabel="Last Modified"
        openCreateSignal={createTrigger}
      />

      <AnimatePresence>
        {viewingRow && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingRow(null)}
              className="absolute inset-0 bg-philsa-navy/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="px-6 py-5 border-b border-philsa-border flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-black text-philsa-red uppercase tracking-widest mb-0.5">Maintenance Viewer</div>
                  <h2 className="text-xl font-black text-philsa-navy">Record Details</h2>
                </div>
                <button
                  onClick={() => setViewingRow(null)}
                  className="p-2.5 bg-philsa-bg rounded-xl text-philsa-gray hover:text-philsa-navy transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-5 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  {columns.map(col => (
                    <div key={col.key} className="space-y-1.5">
                      <label className="text-[11px] font-extrabold text-philsa-navy uppercase tracking-wider">
                        {col.label}
                      </label>
                      <div className="text-sm font-bold text-philsa-navy">
                        {col.render ? col.render(viewingRow) : (viewingRow[col.key] || '—')}
                      </div>
                    </div>
                  ))}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold text-philsa-navy uppercase tracking-wider">
                      Active Status
                    </label>
                    <div>
                      <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                        viewingRow.status
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {viewingRow.status ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-philsa-border/60 flex justify-end">
                <button
                  onClick={() => setViewingRow(null)}
                  className="px-5 py-2.5 bg-philsa-navy text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-philsa-navy/10 hover:bg-slate-900 transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
