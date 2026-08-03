import React, { useState } from 'react';
import MaintenancePageTemplate, { MaintenanceColumn, MaintenanceField } from '../../../components/maintenance/MaintenancePageTemplate';

const CATEGORIES = [
  'Subject Areas',
  'Difficulty Level',
  'Question Type',
  'Topics'
];

const MOCK_DATA = [
  // Subject Areas
  { id: 'sub_1', category: 'Subject Areas', code: 'SUB-001', subject: 'Mathematics', status: 'Active' },
  { id: 'sub_2', category: 'Subject Areas', code: 'SUB-002', subject: 'English', status: 'Active' },
  { id: 'sub_3', category: 'Subject Areas', code: 'SUB-003', subject: 'Science', status: 'Active' },
  { id: 'sub_4', category: 'Subject Areas', code: 'SUB-004', subject: 'Filipino', status: 'Active' },

  // Difficulty Level
  { id: 'dif_1', category: 'Difficulty Level', code: 'DIF-001', level: 'Easy', status: 'Active' },
  { id: 'dif_2', category: 'Difficulty Level', code: 'DIF-002', level: 'Medium', status: 'Active' },
  { id: 'dif_3', category: 'Difficulty Level', code: 'DIF-003', level: 'Hard', status: 'Active' },

  // Question Type
  { id: 'qt_1', category: 'Question Type', code: 'QT-001', questionType: 'Multiple Choice', autoScored: 'Yes', status: 'Active' },
  { id: 'qt_2', category: 'Question Type', code: 'QT-002', questionType: 'True/False', autoScored: 'Yes', status: 'Active' },
  { id: 'qt_3', category: 'Question Type', code: 'QT-003', questionType: 'Essay', autoScored: 'No', status: 'Active' },

  // Topics
  { id: 'top_1', category: 'Topics', topicCode: 'TOP-001', subject: 'Mathematics', topic: 'General Mathematics', gradeLevel: 'Grade 11–12', status: 'Active' },
  { id: 'top_2', category: 'Topics', topicCode: 'TOP-002', subject: 'Mathematics', topic: 'Statistics and Probability', gradeLevel: 'Grade 11–12', status: 'Active' },
  { id: 'top_3', category: 'Topics', topicCode: 'TOP-003', subject: 'Mathematics', topic: 'Pre-Calculus', gradeLevel: 'Grade 11', status: 'Active' },
  { id: 'top_4', category: 'Topics', topicCode: 'TOP-004', subject: 'Mathematics', topic: 'Basic Calculus', gradeLevel: 'Grade 12 (STEM)', status: 'Active' },
  { id: 'top_5', category: 'Topics', topicCode: 'TOP-005', subject: 'English', topic: 'Reading and Writing Skills', gradeLevel: 'Grade 11', status: 'Active' },
  { id: 'top_6', category: 'Topics', topicCode: 'TOP-006', subject: 'English', topic: 'Oral Communication', gradeLevel: 'Grade 11', status: 'Active' },
  { id: 'top_7', category: 'Topics', topicCode: 'TOP-007', subject: 'English', topic: '21st Century Literature', gradeLevel: 'Grade 11', status: 'Active' },
  { id: 'top_8', category: 'Topics', topicCode: 'TOP-008', subject: 'Science', topic: 'Earth and Life Science', gradeLevel: 'Grade 11', status: 'Active' },
  { id: 'top_9', category: 'Topics', topicCode: 'TOP-009', subject: 'Science', topic: 'Physical Science', gradeLevel: 'Grade 11', status: 'Active' },
  { id: 'top_10', category: 'Topics', topicCode: 'TOP-010', subject: 'Science', topic: 'General Biology 1 & 2', gradeLevel: 'Grade 11–12 (STEM)', status: 'Active' },
  { id: 'top_11', category: 'Topics', topicCode: 'TOP-011', subject: 'Science', topic: 'General Chemistry 1 & 2', gradeLevel: 'Grade 11–12 (STEM)', status: 'Active' },
  { id: 'top_12', category: 'Topics', topicCode: 'TOP-012', subject: 'Science', topic: 'General Physics 1 & 2', gradeLevel: 'Grade 12 (STEM)', status: 'Active' },
  { id: 'top_13', category: 'Topics', topicCode: 'TOP-013', subject: 'Abstract Reasoning', topic: 'Pattern Recognition', gradeLevel: 'CET Standard', status: 'Active' },
  { id: 'top_14', category: 'Topics', topicCode: 'TOP-014', subject: 'Abstract Reasoning', topic: 'Logical Reasoning', gradeLevel: 'CET Standard', status: 'Active' },
  { id: 'top_15', category: 'Topics', topicCode: 'TOP-015', subject: 'Abstract Reasoning', topic: 'Spatial Reasoning', gradeLevel: 'CET Standard', status: 'Active' },
];

export default function ExamBlueprintMaintenance() {
  const [data, setData] = useState<any[]>(() => {
    const saved = localStorage.getItem('philsa_exam_blueprint_configs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error(e);
      }
    }
    localStorage.setItem('philsa_exam_blueprint_configs', JSON.stringify(MOCK_DATA));
    return MOCK_DATA;
  });

  const [selectedCategory, setSelectedCategory] = useState<string>('Subject Areas');

  const saveConfigs = (newData: any[]) => {
    setData(newData);
    localStorage.setItem('philsa_exam_blueprint_configs', JSON.stringify(newData));
  };

  const getColumnsForCategory = (category: string): MaintenanceColumn[] => {
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

  const handleAdd = (newData: any) => {
    const item = {
      ...newData,
      category: newData.category || selectedCategory,
      id: Math.random().toString(36).substr(2, 9),
      status: newData.status === true || newData.status === 'Active' || newData.status === 'Yes' ? 'Active' : 'Inactive'
    };
    saveConfigs([item, ...data]);
  };

  const handleEdit = (updatedRow: any) => {
    const item = {
      ...updatedRow,
      status: updatedRow.status === true || updatedRow.status === 'Active' || updatedRow.status === 'Yes' ? 'Active' : 'Inactive'
    };
    saveConfigs(data.map(row => row.id === item.id ? item : row));
  };

  const handleDelete = (row: any) => {
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


