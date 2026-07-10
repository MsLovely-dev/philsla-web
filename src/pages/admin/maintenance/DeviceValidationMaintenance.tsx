import React, { useState } from 'react';
import MaintenancePageTemplate, { MaintenanceColumn, MaintenanceField } from '../../../components/maintenance/MaintenancePageTemplate';

const MOCK_DATA = [
  { id: '1', category: 'Operating System', rule: 'Windows 10/11 or macOS 12+', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-05-01 08:00' },
  { id: '2', category: 'Browser', rule: 'Chrome 110+ / Safari 16+', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-05-01 08:00' },
  { id: '3', category: 'Memory', rule: 'Minimum 8GB RAM', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-05-01 08:00' },
  { id: '4', category: 'Internet', rule: 'Minimum 5 Mbps Stable Uplink', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-05-01 08:00' },
  { id: '5', category: 'Hardware', rule: '720p Webcam + Integrated Mic', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-05-01 08:00' },
  { id: '6', category: 'Restricted', rule: 'Virtual Machines / Remote Desk', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-05-01 08:00' },
];

export default function DeviceValidationMaintenance() {
  const [data, setData] = useState(MOCK_DATA);

  const columns: MaintenanceColumn[] = [
    { key: 'category', label: 'Requirement Domain' },
    { key: 'rule', label: 'Technical Specification' },
    { 
      key: 'status', 
      label: 'Operational',
      render: (row) => (
        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${row.status === 'Active' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
          {row.status}
        </span>
      )
    }
  ];

  const fields: MaintenanceField[] = [
    { 
      name: 'category', 
      label: 'Category', 
      type: 'select', 
      options: [
        { value: 'Operating System', label: 'Operating System' },
        { value: 'Browser', label: 'Minimum Browser' },
        { value: 'Memory', label: 'RAM / Memory' },
        { value: 'Storage', label: 'Disk Space' },
        { value: 'Internet', label: 'Internet Connection' },
        { value: 'Hardware', label: 'Webcam & Mic' },
        { value: 'Resolution', label: 'Screen Resolution' },
        { value: 'Restricted', label: 'Restricted App' }
      ],
      required: true 
    },
    { name: 'rule', label: 'Specification', type: 'text', required: true, placeholder: 'e.g. Chrome 110+' },
    { name: 'errorMessage', label: 'Error Message', type: 'textarea', placeholder: 'Message shown to student on validation failure...' },
    { name: 'status', label: 'Enforce Rule', type: 'toggle' }
  ];

  return (
    <MaintenancePageTemplate
      title="Device Validation Rules"
      subtitle="Configure minimum technical requirements and restricted software protocols for exam environments."
      breadcrumb={['Maintenance', 'Technical Standards']}
      columns={columns}
      data={data}
      fields={fields}
      onAdd={(d) => setData([{ ...d, id: Date.now().toString(), approvalStatus: 'Pending Approval', status: d.status ? 'Active' : 'Inactive' }, ...data])}
      onEdit={(d) => setData(data.map(r => r.id === d.id ? d : r))}
      onDelete={(r) => setData(data.filter(i => i.id !== r.id))}
    />
  );
}
