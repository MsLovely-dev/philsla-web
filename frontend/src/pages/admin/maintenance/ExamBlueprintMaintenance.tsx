import React, { useState } from 'react';
import MaintenancePageTemplate, { MaintenanceColumn, MaintenanceField, MaintenanceRecord } from '../../../components/maintenance/MaintenancePageTemplate';

const CATEGORIES = [
  'Subject Areas',
  'Difficulty Level',
  'Question Type',
  'Topics'
];

interface BlueprintConfig extends MaintenanceRecord {
  id?: string;
  category?: string;
  code?: string;
  subject?: string;
  level?: string;
  questionType?: string;
  autoScored?: string | boolean;
  topicCode?: string;
  topic?: string;
  gradeLevel?: string;
  status?: string | boolean;
}

export default function ExamBlueprintMaintenance() {
  const [data, setData] = useState<BlueprintConfig[]>([]);

  const [selectedCategory, setSelectedCategory] = useState<string>('Subject Areas');

  const saveConfigs = (newData: BlueprintConfig[]) => {
    setData(newData);
  };

  const getColumnsForCategory = (category: string): MaintenanceColumn<BlueprintConfig>[] => {
    switch (category) {
      case 'Subject Areas':
        return [
          { key: 'code', label: 'Code' },
          { key: 'subject', label: 'Subject' },
          { 
            key: 'status', 
            label: 'Active',
            render: (row) => (
              <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                row.status === 'Active' || row.status === 'Yes' || row.status === true 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}>
                {row.status === 'Active' || row.status === 'Yes' || row.status === true ? 'Yes' : 'No'}
              </span>
            )
          }
        ];

      case 'Difficulty Level':
        return [
          { key: 'code', label: 'Code' },
          { key: 'level', label: 'Level' },
          { 
            key: 'status', 
            label: 'Active',
            render: (row) => (
              <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                row.status === 'Active' || row.status === 'Yes' || row.status === true 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}>
                {row.status === 'Active' || row.status === 'Yes' || row.status === true ? 'Yes' : 'No'}
              </span>
            )
          }
        ];

      case 'Question Type':
        return [
          { key: 'code', label: 'Code' },
          { key: 'questionType', label: 'Question Type' },
          { 
            key: 'autoScored', 
            label: 'Auto Scored',
            render: (row) => (
              <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                row.autoScored === 'Yes' || row.autoScored === true
                  ? 'bg-blue-50 text-blue-700 border border-blue-100'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}>
                {row.autoScored || 'No'}
              </span>
            )
          },
          { 
            key: 'status', 
            label: 'Active',
            render: (row) => (
              <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                row.status === 'Active' || row.status === 'Yes' || row.status === true 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}>
                {row.status === 'Active' || row.status === 'Yes' || row.status === true ? 'Yes' : 'No'}
              </span>
            )
          }
        ];

      case 'Topics':
      default:
        return [
          { key: 'topicCode', label: 'Topic Code' },
          { key: 'subject', label: 'Subject' },
          { key: 'topic', label: 'Topic' },
          { key: 'gradeLevel', label: 'Grade Level' },
          { 
            key: 'status', 
            label: 'Active',
            render: (row) => (
              <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                row.status === 'Active' || row.status === 'Yes' || row.status === true 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}>
                {row.status === 'Active' || row.status === 'Yes' || row.status === true ? 'Yes' : 'No'}
              </span>
            )
          }
        ];
    }
  };

  const fields: MaintenanceField[] = [
    { 
      name: 'category', 
      label: 'Category', 
      type: 'select', 
      required: true, 
      options: CATEGORIES.map(c => ({ value: c, label: c }))
    },
    { name: 'code', label: 'Code (for Subject, Difficulty, Question Type)', type: 'text', placeholder: 'e.g. SUB-001, DIF-001, QT-001' },
    { name: 'subject', label: 'Subject Name (for Subject Areas & Topics)', type: 'text', placeholder: 'e.g. Mathematics, English, Science' },
    { name: 'level', label: 'Difficulty Level (for Difficulty Level)', type: 'text', placeholder: 'e.g. Easy, Medium, Hard' },
    { name: 'questionType', label: 'Question Type Name (for Question Type)', type: 'text', placeholder: 'e.g. Multiple Choice, Essay' },
    { 
      name: 'autoScored', 
      label: 'Auto Scored (for Question Type)', 
      type: 'select',
      options: [
        { value: 'Yes', label: 'Yes' },
        { value: 'No', label: 'No' },
      ]
    },
    { name: 'topicCode', label: 'Topic Code (for Topics)', type: 'text', placeholder: 'e.g. TOP-001' },
    { name: 'topic', label: 'Topic Name (for Topics)', type: 'text', placeholder: 'e.g. General Mathematics' },
    { name: 'gradeLevel', label: 'Grade Level (for Topics)', type: 'text', placeholder: 'e.g. Grade 11–12' },
    { name: 'status', label: 'Active Status', type: 'toggle' }
  ];

  const handleAdd = (newData: BlueprintConfig) => {
    const item = {
      ...newData,
      category: newData.category || selectedCategory,
      id: Math.random().toString(36).substr(2, 9),
      status: newData.status === true || newData.status === 'Active' || newData.status === 'Yes' ? 'Active' : 'Inactive'
    };
    saveConfigs([item, ...data]);
  };

  const handleEdit = (updatedRow: BlueprintConfig) => {
    const item = {
      ...updatedRow,
      status: updatedRow.status === true || updatedRow.status === 'Active' || updatedRow.status === 'Yes' ? 'Active' : 'Inactive'
    };
    saveConfigs(data.map(row => row.id === item.id ? item : row));
  };

  const handleDelete = (row: BlueprintConfig) => {
    if (window.confirm(`Are you sure you want to delete ${row.subject || row.topic || row.questionType || row.level || row.code || 'this record'}?`)) {
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

  return (
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
      aboveTableContent={aboveTableContent}
      bulkUpload={{
        templateUrl: '#',
        allowedTypes: ['.xlsx', '.csv']
      }}
    />
  );
}
