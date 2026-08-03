import React, { useState } from 'react';
import MaintenancePageTemplate, { MaintenanceColumn, MaintenanceField } from '../../../components/maintenance/MaintenancePageTemplate';

const CATEGORIES = [
  'Question Status'
];

export default function QuestionBankManagementMaintenance() {
  const [data, setData] = useState<any[]>([]);

  const [selectedCategory, setSelectedCategory] = useState<string>('Question Status');

  const saveConfigs = (newData: any[]) => {
    setData(newData);
  };

  const columns: MaintenanceColumn[] = [
    { key: 'code', label: 'Code' },
    { key: 'statusName', label: 'Status' },
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
    { name: 'code', label: 'Code', type: 'text', required: true, placeholder: 'e.g. QS-001' },
    { name: 'statusName', label: 'Status Name', type: 'text', required: true, placeholder: 'e.g. Draft, Under Review, Approved' },
    { name: 'status', label: 'Active Status', type: 'toggle' }
  ];

  const handleAdd = (newData: any) => {
    const item = {
      ...newData,
      category: selectedCategory,
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
    if (window.confirm(`Are you sure you want to delete ${row.statusName || row.code}?`)) {
      saveConfigs(data.filter(r => r.id !== row.id));
    }
  };

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

  return (
    <MaintenancePageTemplate
      title="Question Bank Management Maintenance"
      subtitle="Lookup tables for question creation and approval workflow statuses."
      breadcrumb={['Maintenance', 'Question Bank Management']}
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
