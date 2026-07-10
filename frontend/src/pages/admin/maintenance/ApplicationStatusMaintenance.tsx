import React, { useState } from 'react';
import MaintenancePageTemplate, { MaintenanceColumn, MaintenanceField } from '../../../components/maintenance/MaintenancePageTemplate';

const MOCK_DATA = [
  { id: '1', name: 'Draft', sequence: 1, type: 'Registration', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-05-01 08:00' },
  { id: '2', name: 'Submitted', sequence: 2, type: 'Registration', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-05-01 08:00' },
  { id: '3', name: 'Under Review', sequence: 3, type: 'Review', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-05-01 08:00' },
  { id: '4', name: 'Approved', sequence: 4, type: 'Final', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-05-01 08:00' },
  { id: '5', name: 'Rejected', sequence: 4, type: 'Final', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-05-01 08:00' },
];

export default function ApplicationStatusMaintenance() {
  const [data, setData] = useState(MOCK_DATA);

  const columns: MaintenanceColumn[] = [
    { key: 'name', label: 'Status Identity' },
    { key: 'type', label: 'Workflow Phase' },
    { key: 'sequence', label: 'Display Order', render: (row) => <span className="font-mono text-xs">{row.sequence}</span> },
    { 
      key: 'status', 
      label: 'Operation',
      render: (row) => (
        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${row.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
          {row.status}
        </span>
      )
    }
  ];

  const fields: MaintenanceField[] = [
    { name: 'name', label: 'Status Name', type: 'text', required: true, placeholder: 'e.g. For Compliance' },
    { 
      name: 'type', 
      label: 'Phase', 
      type: 'select', 
      options: [
        { value: 'Registration', label: 'Registration' },
        { value: 'Review', label: 'Document Review' },
        { value: 'Examination', label: 'Examination' },
        { value: 'Final', label: 'Final Result' }
      ],
      required: true 
    },
    { name: 'sequence', label: 'Sort Order', type: 'number', required: true },
    { name: 'description', label: 'Description', type: 'textarea', placeholder: 'What the student sees in their portal...' },
    { name: 'status', label: 'Enable', type: 'toggle' }
  ];

  return (
    <MaintenancePageTemplate
      title="Application Status Maintenance"
      subtitle="Define and sequence the lifecycle statuses of student applications."
      breadcrumb={['Maintenance', 'Status Workflow']}
      columns={columns}
      data={data}
      fields={fields}
      onAdd={(d) => setData([{ ...d, id: Date.now().toString(), approvalStatus: 'Pending Approval', status: d.status ? 'Active' : 'Inactive' }, ...data])}
      onEdit={(d) => setData(data.map(r => r.id === d.id ? d : r))}
      onDelete={(r) => setData(data.filter(i => i.id !== r.id))}
    />
  );
}
