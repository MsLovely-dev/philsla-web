import React, { useState } from 'react';
import MaintenancePageTemplate, { MaintenanceColumn, MaintenanceField } from '../../../components/maintenance/MaintenancePageTemplate';

const MOCK_DATA = [
  { id: '1', role: 'Head Proctor', status: 'Active', authLevel: 'Full Access', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-05-01 08:00' },
  { id: '2', role: 'Room Proctor', status: 'Active', authLevel: 'Room Only', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-05-01 08:00' },
  { id: '3', role: 'Technical Assistant', status: 'Active', authLevel: 'Technical Only', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-05-01 08:00' },
  { id: '4', role: 'Emergency Floor Lead', status: 'Inactive', authLevel: 'Tier 2 Support', approvalStatus: 'Approved', updatedBy: 'admin_security', updatedAt: '2026-05-13 10:15' },
];

export default function ProctorMaintenance() {
  const [data, setData] = useState(MOCK_DATA);

  const columns: MaintenanceColumn[] = [
    { key: 'role', label: 'Proctor Designation' },
    { key: 'authLevel', label: 'Ecosystem Authority Level' },
    { 
      key: 'status', 
      label: 'Role Status',
      render: (row) => (
        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${row.status === 'Active' ? 'bg-philsa-navy text-white' : 'bg-slate-100 text-slate-600'}`}>
          {row.status}
        </span>
      )
    }
  ];

  const fields: MaintenanceField[] = [
    { name: 'role', label: 'Role Name', type: 'text', required: true, placeholder: 'e.g. Area Coordinator' },
    { 
      name: 'authLevel', 
      label: 'Access Level', 
      type: 'select', 
      options: [
        { value: 'Full Access', label: 'Full Access (Tier 1)' },
        { value: 'Room Only', label: 'Room Only (Tier 2)' },
        { value: 'Technical Only', label: 'Tech Support (Tier 3)' },
        { value: 'Viewer', label: 'Observer (Tier 4)' }
      ],
      required: true 
    },
    { name: 'description', label: 'Role Description', type: 'textarea', placeholder: 'Responsibility matrix for this role...' },
    { name: 'status', label: 'Active', type: 'toggle' }
  ];

  return (
    <MaintenancePageTemplate
      title="Proctor Role Configuration"
      subtitle="Standardize proctoring designations, operational status, and platform authorization levels."
      breadcrumb={['Maintenance', 'Proctor Hierarchy']}
      columns={columns}
      data={data}
      fields={fields}
      onAdd={(d) => setData([{ ...d, id: Date.now().toString(), approvalStatus: 'Pending Approval', status: d.status ? 'Active' : 'Inactive' }, ...data])}
      onEdit={(d) => setData(data.map(r => r.id === d.id ? d : r))}
      onDelete={(r) => setData(data.filter(i => i.id !== r.id))}
    />
  );
}
