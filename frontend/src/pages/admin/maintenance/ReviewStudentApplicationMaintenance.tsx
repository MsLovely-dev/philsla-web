import React, { useState } from 'react';
import MaintenancePageTemplate, { MaintenanceColumn, MaintenanceField } from '../../../components/maintenance/MaintenancePageTemplate';

const CATEGORIES = [
  'Application Status',
  'Rejection Reasons'
];

const MOCK_DATA = [
  // Application Status
  { id: 'app_st_1', category: 'Application Status', code: 'APP-002', name: 'Pending', status: 'Active' },
  { id: 'app_st_2', category: 'Application Status', code: 'APP-004', name: 'Approved', status: 'Active' },
  { id: 'app_st_3', category: 'Application Status', code: 'APP-005', name: 'Rejected', status: 'Active' },

  // Rejection Reasons
  { id: 'rr_1', category: 'Rejection Reasons', code: 'RR-001', reason: 'Invalid LRN', reasonCategory: 'Identity', status: 'Active' },
  { id: 'rr_2', category: 'Rejection Reasons', code: 'RR-002', reason: 'Duplicate Registration', reasonCategory: 'Duplicate', status: 'Active' },
  { id: 'rr_3', category: 'Rejection Reasons', code: 'RR-003', reason: 'Incomplete Documents', reasonCategory: 'Documentation', status: 'Active' },
  { id: 'rr_4', category: 'Rejection Reasons', code: 'RR-004', reason: 'Applicant Not Eligible', reasonCategory: 'Eligibility', status: 'Active' },
];

export default function ReviewStudentApplicationMaintenance() {
  const [data, setData] = useState<any[]>(() => {
    const saved = localStorage.getItem('philsa_review_student_app_configs');
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
    localStorage.setItem('philsa_review_student_app_configs', JSON.stringify(MOCK_DATA));
    return MOCK_DATA;
  });

  const [selectedCategory, setSelectedCategory] = useState<string>('Application Status');

  const saveConfigs = (newData: any[]) => {
    setData(newData);
    localStorage.setItem('philsa_review_student_app_configs', JSON.stringify(newData));
  };

  const getColumnsForCategory = (category: string): MaintenanceColumn[] => {
    if (category === 'Application Status') {
      return [
        { key: 'code', label: 'Status Code' },
        { key: 'name', label: 'Status Name' },
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
    } else {
      // Rejection Reasons
      return [
        { key: 'code', label: 'Code' },
        { key: 'reason', label: 'Reason' },
        { key: 'reasonCategory', label: 'Category' },
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
    }
  };

  const fields: MaintenanceField[] = [
    { 
      name: 'category', 
      label: 'Category', 
      type: 'select', 
      required: true, 
      options: CATEGORIES.map(c => ({ value: c, label: c }))
    },
    { name: 'code', label: 'Code', type: 'text', required: true, placeholder: 'e.g. APP-002 or RR-001' },
    { name: 'name', label: 'Status Name (for Application Status)', type: 'text', placeholder: 'e.g. Pending, Approved, Rejected' },
    { name: 'reason', label: 'Reason (for Rejection Reasons)', type: 'text', placeholder: 'e.g. Invalid LRN' },
    { name: 'reasonCategory', label: 'Category (for Rejection Reasons)', type: 'text', placeholder: 'e.g. Identity, Duplicate, Documentation, Eligibility' },
    { name: 'status', label: 'Active Status', type: 'toggle' }
  ];

  const handleAdd = (newData: any) => {
    const item = {
      ...newData,
      category: newData.category || selectedCategory,
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
    if (window.confirm(`Are you sure you want to delete ${row.name || row.reason || row.code}?`)) {
      saveConfigs(data.filter(r => r.id !== row.id));
    }
  };

  // Clean simple tab navigation bar
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
  const columns = getColumnsForCategory(selectedCategory);

  return (
    <MaintenancePageTemplate
      title="Review Student Application Maintenance"
      subtitle="Configure application evaluation statuses and standardized rejection reasons."
      breadcrumb={['Maintenance', 'Review Student Application']}
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


