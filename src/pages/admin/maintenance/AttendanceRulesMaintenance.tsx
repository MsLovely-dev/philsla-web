import React, { useState } from 'react';
import MaintenancePageTemplate, { MaintenanceColumn, MaintenanceField } from '../../../components/maintenance/MaintenancePageTemplate';

const MOCK_DATA = [
  { id: '1', code: 'PR', label: 'Present', type: 'Normal', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-05-01 08:00' },
  { id: '2', code: 'AB', label: 'Absent', type: 'Normal', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-05-01 08:00' },
  { id: '3', code: 'LT', label: 'Late (Within Grace Period)', type: 'Exemption', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-05-01 08:00' },
  { id: '4', code: 'DQ', label: 'Disqualified / Integrity Breach', type: 'Disciplinary', status: 'Active', approvalStatus: 'Approved', updatedBy: 'admin_02', updatedAt: '2026-05-12 11:45' },
];

export default function AttendanceRulesMaintenance() {
  const [data, setData] = useState(MOCK_DATA);

  const columns: MaintenanceColumn[] = [
    { key: 'code', label: 'Status Code', render: (row) => <span className="font-mono font-black text-philsa-red">{row.code}</span> },
    { key: 'label', label: 'Formal Label' },
    { key: 'type', label: 'Category Group' },
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
    { name: 'code', label: 'Status Code', type: 'text', required: true, placeholder: 'e.g. EX' },
    { name: 'label', label: 'Label', type: 'text', required: true, placeholder: 'e.g. Excused Absence' },
    { 
      name: 'type', 
      label: 'Category', 
      type: 'select', 
      options: [
        { value: 'Normal', label: 'Standard' },
        { value: 'Exemption', label: 'Exemption' },
        { value: 'Disciplinary', label: 'Disciplinary' }
      ],
      required: true 
    },
    { name: 'remarks', label: 'Policy Description', type: 'textarea', placeholder: 'Institutional policy details...' },
    { name: 'status', label: 'Available to Proctors', type: 'toggle' }
  ];

  return (
    <MaintenancePageTemplate
      title="Attendance & Reporting Rules"
      subtitle="Standardize attendance coding and incident status mapping across testing centers."
      breadcrumb={['Maintenance', 'Attendance Codes']}
      columns={columns}
      data={data}
      fields={fields}
      onAdd={(d) => setData([{ ...d, id: Date.now().toString(), approvalStatus: 'Pending Approval', status: d.status ? 'Active' : 'Inactive' }, ...data])}
      onEdit={(d) => setData(data.map(r => r.id === d.id ? d : r))}
      onDelete={(r) => setData(data.filter(i => i.id !== r.id))}
    />
  );
}
