import React, { useState } from 'react';
import { Eye } from 'lucide-react';
import MaintenancePageTemplate, { MaintenanceColumn, MaintenanceField, MaintenanceRecord } from '../../../components/maintenance/MaintenancePageTemplate';
import RegistrationPreview from '../../../components/maintenance/RegistrationPreview';

const CATEGORIES = [
  'Registration requirements',
  'PWD Types',
  'Verification',
  'Supported IDs'
];

interface RegistrationConfig extends MaintenanceRecord {
  id?: string;
  category?: string;
  code?: string;
  name?: string;
  description?: string;
  applicantType?: string;
  required?: string;
  visibleToStudent?: string;
  status?: string | boolean;
}

export default function StudentRegistrationMaintenance() {
  const [data, setData] = useState<RegistrationConfig[]>([]);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('Registration requirements');

  const saveConfigs = (newData: RegistrationConfig[]) => {
    setData(newData);
  };

  const getColumnsForCategory = (category: string): MaintenanceColumn<RegistrationConfig>[] => {
    switch (category) {
      case 'Registration requirements':
        return [
          { key: 'code', label: 'Requirement Code' },
          { key: 'name', label: 'Requirement Name' },
          { key: 'applicantType', label: 'Applicant Type' },
          { 
            key: 'required', 
            label: 'Required',
            render: (row) => (
              <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                row.required === 'Yes' 
                  ? 'bg-amber-50 text-amber-700 border border-amber-100' 
                  : 'bg-slate-100 text-slate-500 border border-slate-200'
              }`}>
                {row.required || 'No'}
              </span>
            )
          },
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

      case 'PWD Types':
        return [
          { key: 'code', label: 'PWD Code' },
          { key: 'name', label: 'PWD Type' },
          { key: 'description', label: 'Description' },
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

      case 'Verification':
        return [
          { key: 'code', label: 'Code' },
          { key: 'name', label: 'Applicant Type' },
          { key: 'description', label: 'Description' },
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

      case 'Supported IDs':
      default:
        return [
          { key: 'code', label: 'Code' },
          { key: 'name', label: 'ID Type' },
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
    { name: 'code', label: 'Code', type: 'text', required: true, placeholder: 'e.g. APP-001, REG-001, PWD-001, AP-001, ID-001' },
    { name: 'name', label: 'Name / Type', type: 'text', required: true, placeholder: 'e.g. Draft, School ID, Visual Impairment' },
    { name: 'description', label: 'Description', type: 'text', placeholder: 'Description or details...' },
    { 
      name: 'applicantType', 
      label: 'Applicant Type (for Requirements)', 
      type: 'select', 
      options: [
        { value: 'All', label: 'All' },
        { value: 'PWD', label: 'PWD' },
      ] 
    },
    { name: 'displayOrder', label: 'Display Order (for Application Status)', type: 'number', placeholder: '1' },
    { 
      name: 'visibleToStudent', 
      label: 'Visible to Student (for Application Status)', 
      type: 'select',
      options: [
        { value: 'Yes', label: 'Yes' },
        { value: 'No', label: 'No' },
      ]
    },
    { 
      name: 'required', 
      label: 'Required (for Requirements)', 
      type: 'select',
      options: [
        { value: 'Yes', label: 'Yes' },
        { value: 'No', label: 'No' },
      ]
    },
    { name: 'status', label: 'Active Status', type: 'toggle' }
  ];

  const handleAdd = (newData: RegistrationConfig) => {
    const item = {
      ...newData,
      category: newData.category || selectedCategory,
      id: Math.random().toString(36).substr(2, 9),
      status: newData.status === true || newData.status === 'Active' || newData.status === 'Yes' ? 'Active' : 'Inactive'
    };
    saveConfigs([item, ...data]);
  };

  const handleEdit = (updatedRow: RegistrationConfig) => {
    const item = {
      ...updatedRow,
      status: updatedRow.status === true || updatedRow.status === 'Active' || updatedRow.status === 'Yes' ? 'Active' : 'Inactive'
    };
    saveConfigs(data.map(row => row.id === item.id ? item : row));
  };

  const handleDelete = (row: RegistrationConfig) => {
    if (window.confirm(`Are you sure you want to delete ${row.name || row.code || 'this record'}?`)) {
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
      title="Student Registration Maintenance"
      subtitle="Administrative lookup tables for application statuses, registration requirements, PWD types, verification, and supported IDs."
      breadcrumb={['Maintenance', 'Student Registration']}
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
      extraHeaderActions={
        <button 
          onClick={() => setIsPreviewOpen(!isPreviewOpen)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm cursor-pointer border ${
            isPreviewOpen 
              ? 'bg-[#8A1538] text-white border-[#8A1538] hover:bg-[#6D102C]' 
              : 'bg-white text-[#8A1538] border-[#8A1538] hover:bg-red-50'
          }`}
        >
          <Eye className="w-4 h-4" />
          {isPreviewOpen ? 'Close Preview' : 'Preview Portal'}
        </button>
      }
      sidePanel={
        <RegistrationPreview 
          data={data} 
          onClose={() => setIsPreviewOpen(false)} 
        />
      }
      isSidePanelOpen={isPreviewOpen}
    />
  );
}
