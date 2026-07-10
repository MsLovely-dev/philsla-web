import React, { useState } from 'react';
import MaintenancePageTemplate, { MaintenanceColumn, MaintenanceField } from '../../../components/maintenance/MaintenancePageTemplate';

const MOCK_DATA = [
  { id: '1', type: 'Violation', label: 'Face Not Detected', severity: 'High', penalty: 'Warning + Auto-Pause', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-05-01 08:00' },
  { id: '2', type: 'Violation', label: 'Unauthorized Device Detected', severity: 'Critical', penalty: 'Immediate Disqualification', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-05-01 08:00' },
  { id: '3', type: 'Warning', label: 'Multiple Faces Detected', severity: 'Medium', penalty: 'Screen Warning', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-05-01 08:00' },
  { id: '4', type: 'Penalty', label: 'Score Deduction (5 pts)', severity: 'Low', penalty: 'Final Grade Adjustment', status: 'Active', approvalStatus: 'Approved', updatedBy: 'admin_01', updatedAt: '2026-05-13 16:20' },
];

export default function ExamIntegrityMaintenance() {
  const [data, setData] = useState(MOCK_DATA);

  const columns: MaintenanceColumn[] = [
    { key: 'label', label: 'Security Breach Protocol' },
    { key: 'type', label: 'Entry Type' },
    { 
      key: 'severity', 
      label: 'Severity Level',
      render: (row) => (
        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${
          row.severity === 'Critical' ? 'bg-red-100 text-red-700' : 
          row.severity === 'High' ? 'bg-orange-100 text-orange-700' : 
          'bg-slate-100 text-slate-700'
        }`}>
          {row.severity}
        </span>
      )
    },
    { key: 'penalty', label: 'Penalty Action Mapping' }
  ];

  const fields: MaintenanceField[] = [
    { name: 'label', label: 'Protocol Title', type: 'text', required: true, placeholder: 'e.g. Browser Tab Switching' },
    { 
      name: 'type', 
      label: 'Type', 
      type: 'select', 
      options: [
        { value: 'Violation', label: 'Violation' },
        { value: 'Warning', label: 'Warning' },
        { value: 'Penalty', label: 'Penalty' }
      ],
      required: true 
    },
    { 
      name: 'severity', 
      label: 'Severity Level', 
      type: 'select', 
      options: [
        { value: 'Critical', label: 'Critical' },
        { value: 'High', label: 'High' },
        { value: 'Medium', label: 'Medium' },
        { value: 'Low', label: 'Low' }
      ],
      required: true 
    },
    { name: 'penalty', label: 'Assigned Penalty', type: 'textarea', required: true, placeholder: 'Penalty consequences...' },
    { name: 'status', label: 'Enforced', type: 'toggle' }
  ];

  return (
    <MaintenancePageTemplate
      title="Exam Integrity & Security Protocols"
      subtitle="Define violation categories, severity thresholds, and automated penalty behaviors."
      breadcrumb={['Maintenance', 'Integrity Protocols']}
      columns={columns}
      data={data}
      fields={fields}
      onAdd={(d) => setData([{ ...d, id: Date.now().toString(), approvalStatus: 'Pending Approval', status: d.status ? 'Active' : 'Inactive' }, ...data])}
      onEdit={(d) => setData(data.map(r => r.id === d.id ? d : r))}
      onDelete={(r) => setData(data.filter(i => i.id !== r.id))}
    />
  );
}
