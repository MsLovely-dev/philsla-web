import React, { useState } from 'react';
import MaintenancePageTemplate, { MaintenanceColumn, MaintenanceField } from '../../../components/maintenance/MaintenancePageTemplate';

const MOCK_DATA = [
  { id: 'rc_1', code: 'RC-001', classification: 'Passed', status: 'Active' },
  { id: 'rc_2', code: 'RC-002', classification: 'Failed', status: 'Active' },
];

export default function ExamResultsMaintenance() {
  const [data, setData] = useState<any[]>(() => {
    const saved = localStorage.getItem('philsa_exam_results_configs');
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
    localStorage.setItem('philsa_exam_results_configs', JSON.stringify(MOCK_DATA));
    return MOCK_DATA;
  });

  const saveConfigs = (newData: any[]) => {
    setData(newData);
    localStorage.setItem('philsa_exam_results_configs', JSON.stringify(newData));
  };

  const columns: MaintenanceColumn[] = [
    { key: 'code', label: 'Code' },
    { key: 'classification', label: 'Classification' },
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

  const fields: MaintenanceField[] = [
    { name: 'code', label: 'Code', type: 'text', required: true, placeholder: 'e.g. RC-001' },
    { name: 'classification', label: 'Classification', type: 'text', required: true, placeholder: 'e.g. Passed, Failed' },
    { name: 'status', label: 'Active Status', type: 'toggle' }
  ];

  const handleAdd = (newData: any) => {
    const item = {
      ...newData,
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
    if (window.confirm(`Are you sure you want to delete ${row.classification || row.code}?`)) {
      saveConfigs(data.filter(r => r.id !== row.id));
    }
  };

  return (
    <MaintenancePageTemplate
      title="Exam Results Maintenance"
      subtitle="Configure examination result classification lookup codes."
      breadcrumb={['Maintenance', 'Exam Results']}
      columns={columns}
      data={data}
      fields={fields}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDelete={handleDelete}
      bulkUpload={{
        templateUrl: '#',
        allowedTypes: ['.xlsx', '.csv']
      }}
    />
  );
}


