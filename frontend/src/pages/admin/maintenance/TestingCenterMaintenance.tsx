import React, { useState } from 'react';
import MaintenancePageTemplate, { MaintenanceColumn, MaintenanceField } from '../../../components/maintenance/MaintenancePageTemplate';

const MOCK_DATA = [
  { id: 'TC-01', name: 'UP Diliman - Melchor Hall', region: 'NCR', city: 'Quezon City', capacity: 500, type: 'University', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-05-01 08:00' },
  { id: 'TC-02', name: 'DLSU - Andrew Gonzalez Hall', region: 'NCR', city: 'Manila', capacity: 350, type: 'Private Partner', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-05-01 08:00' },
  { id: 'TC-03', name: 'UST - Main Building', region: 'NCR', city: 'Manila', capacity: 400, type: 'University', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-05-01 08:00' },
  { id: 'TC-04', name: 'BulSU - Malolos Campus', region: 'Region III', city: 'Malolos', capacity: 250, type: 'State College', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-05-01 08:00' },
];

export default function TestingCenterMaintenance() {
  const [data, setData] = useState(MOCK_DATA);

  const columns: MaintenanceColumn[] = [
    { key: 'name', label: 'Testing Center' },
    { key: 'region', label: 'Region' },
    { key: 'capacity', label: 'Peak Capacity', render: (row) => <span className="font-mono text-xs font-black">{row.capacity} Seats</span> },
    { key: 'type', label: 'Tier Type' },
    { 
      key: 'status', 
      label: 'Center Readiness',
      render: (row) => (
        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${row.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-rose-100 text-rose-700'}`}>
          {row.status === 'Active' ? 'Operational' : 'Closed'}
        </span>
      )
    }
  ];

  const fields: MaintenanceField[] = [
    { name: 'name', label: 'Center Name', type: 'text', required: true },
    { 
      name: 'region', 
      label: 'Region', 
      type: 'select', 
      options: [
        { value: 'NCR', label: 'NCR' },
        { value: 'Region I', label: 'Region I (Ilocos)' },
        { value: 'Region III', label: 'Region III (Central Luzon)' },
        { value: 'Region IV-A', label: 'Region IV-A (CALABARZON)' },
        { value: 'Region VII', label: 'Region VII (Central Visayas)' }
      ],
      required: true 
    },
    { name: 'capacity', label: 'Seat Capacity', type: 'number', required: true },
    { 
      name: 'type', 
      label: 'Center Tier', 
      type: 'select', 
      options: [
        { value: 'University', label: 'State University' },
        { value: 'State College', label: 'State College' },
        { value: 'Private Partner', label: 'Private Partner' }
      ],
      required: true 
    },
    { name: 'address', label: 'Physical Address', type: 'textarea', required: true },
    { name: 'status', label: 'Active', type: 'toggle' }
  ];

  return (
    <MaintenancePageTemplate
      title="Testing Center Logistics"
      subtitle="Coordinate physical examination venues and institutional partnerships."
      breadcrumb={['Maintenance', 'Facility Management']}
      columns={columns}
      data={data}
      fields={fields}
      onAdd={(d) => setData([{ ...d, id: `TC-${data.length + 1}`, approvalStatus: 'Pending Approval', status: d.status ? 'Active' : 'Inactive' }, ...data])}
      onEdit={(d) => setData(data.map(r => r.id === d.id ? d : r))}
      onDelete={(r) => setData(data.filter(i => i.id !== r.id))}
      bulkUpload={{
        templateUrl: '#',
        allowedTypes: ['.xlsx']
      }}
    />
  );
}
