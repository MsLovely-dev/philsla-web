import React, { useState } from 'react';
import MaintenancePageTemplate, { MaintenanceColumn, MaintenanceField } from '../../../components/maintenance/MaintenancePageTemplate';

const MOCK_DATA = [
  { id: 'B1', name: 'Batch 2026-A', season: 'First Half', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-05-01 08:00' },
  { id: 'B2', name: 'Batch 2026-B', season: 'Second Half', status: 'Inactive', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-05-01 08:00' },
  { id: 'B3', name: 'Special Graduate Batch', season: 'Mid-Year', status: 'Active', approvalStatus: 'Approved', updatedBy: 'admin_01', updatedAt: '2026-05-05 10:30' },
];

export default function BatchConfigurationMaintenance() {
  const [data, setData] = useState(MOCK_DATA);

  const columns: MaintenanceColumn[] = [
    { key: 'name', label: 'Batch Descriptor' },
    { key: 'season', label: 'Academic Season' },
    { 
      key: 'status', 
      label: 'Batch State',
      render: (row) => (
        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${row.status === 'Active' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
          {row.status}
        </span>
      )
    }
  ];

  const fields: MaintenanceField[] = [
    { name: 'name', label: 'Batch Name', type: 'text', required: true, placeholder: 'e.g. Batch 2027-Primary' },
    { 
      name: 'season', 
      label: 'Season', 
      type: 'select', 
      options: [
        { value: 'First Half', label: 'Jan - Jun' },
        { value: 'Second Half', label: 'Jul - Dec' },
        { value: 'Mid-Year', label: 'Mid-Year' }
      ],
      required: true 
    },
    { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Batch scope/purpose...' },
    { name: 'batchCount', label: 'Batch Count', type: 'number', required: true, placeholder: 'e.g. 5' },
    { name: 'status', label: 'Active', type: 'toggle' }
  ];

  return (
    <MaintenancePageTemplate
      title="Batch Configuration"
      subtitle="Define examination intake cycles and seasonal scheduling status."
      breadcrumb={['Maintenance', 'Batch Control']}
      columns={columns}
      data={data}
      fields={fields}
      onAdd={(d) => setData([{ ...d, id: `B-${Date.now()}`, approvalStatus: 'Pending Approval', status: d.status ? 'Active' : 'Inactive' }, ...data])}
      onEdit={(d) => setData(data.map(r => r.id === d.id ? d : r))}
      onDelete={(r) => setData(data.filter(i => i.id !== r.id))}
    />
  );
}
