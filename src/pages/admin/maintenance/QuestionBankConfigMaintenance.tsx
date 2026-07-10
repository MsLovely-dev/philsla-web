import React, { useState } from 'react';
import MaintenancePageTemplate, { MaintenanceColumn, MaintenanceField } from '../../../components/maintenance/MaintenancePageTemplate';

const MOCK_DATA = [
  { id: '1', subject: 'Mathematics', type: 'Multiple Choice', points: 2, status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-05-01 08:00' },
  { id: '2', subject: 'Science', type: 'Multiple Choice', points: 2, status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-05-01 08:00' },
  { id: '3', subject: 'Language Proficiency', type: 'Essay', points: 30, status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-05-01 08:00' },
  { id: '4', subject: 'Abstract Reasoning', type: 'Multiple Choice', points: 1, status: 'Active', approvalStatus: 'Approved', updatedBy: 'admin_academic', updatedAt: '2026-05-10 09:30' },
];

export default function QuestionBankConfigMaintenance() {
  const [data, setData] = useState(MOCK_DATA);

  const columns: MaintenanceColumn[] = [
    { key: 'subject', label: 'Subject Vertical' },
    { key: 'type', label: 'Question Interaction Type' },
    { key: 'points', label: 'Base Points', render: (row) => <span className="font-mono font-bold">{row.points} pts</span> },
    { 
      key: 'status', 
      label: 'Availability',
      render: (row) => (
        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${row.status === 'Active' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
          {row.status}
        </span>
      )
    }
  ];

  const fields: MaintenanceField[] = [
    { name: 'subject', label: 'Subject', type: 'text', required: true, placeholder: 'e.g. Creative Writing' },
    { 
      name: 'type', 
      label: 'Question Type', 
      type: 'select', 
      options: [
        { value: 'Multiple Choice', label: 'Multiple Choice' },
        { value: 'Multi-Select', label: 'Multi-Select' },
        { value: 'True/False', label: 'True/False' },
        { value: 'Essay', label: 'Essay' },
        { value: 'Fill-in-the-Blanks', label: 'Fill in Blanks' }
      ],
      required: true 
    },
    { name: 'points', label: 'Weight (Points)', type: 'number', required: true },
    { name: 'essayRules', label: 'Validation Rules', type: 'textarea', placeholder: 'Validation instructions...' },
    { name: 'status', label: 'Active', type: 'toggle' }
  ];

  return (
    <MaintenancePageTemplate
      title="Question Bank Configuration"
      subtitle="Define academic subjects, question taxonomies, and cross-Ecosystem scoring schemas."
      breadcrumb={['Maintenance', 'Content Catalog']}
      columns={columns}
      data={data}
      fields={fields}
      onAdd={(d) => setData([{ ...d, id: Date.now().toString(), approvalStatus: 'Pending Approval', status: d.status ? 'Active' : 'Inactive' }, ...data])}
      onEdit={(d) => setData(data.map(r => r.id === d.id ? d : r))}
      onDelete={(r) => setData(data.filter(i => i.id !== r.id))}
      bulkUpload={{
        templateUrl: '#',
        allowedTypes: ['.json', '.csv']
      }}
    />
  );
}
