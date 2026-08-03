import React, { useState } from 'react';
import { Eye } from 'lucide-react';
import MaintenancePageTemplate, { MaintenanceColumn, MaintenanceField } from '../../../components/maintenance/MaintenancePageTemplate';
import RegistrationPreview from '../../../components/maintenance/RegistrationPreview';

const CATEGORIES = [
  'Registration requirements',
  'PWD Types',
  'Verification',
  'Supported IDs'
];

const MOCK_DATA = [
  // Registration requirements
  { id: 'reg_1', category: 'Registration requirements', code: 'REG-001', name: 'School ID', applicantType: 'All', required: 'Yes', status: 'Active', description: 'Official high school or TVET ID' },
  { id: 'reg_2', category: 'Registration requirements', code: 'REG-002', name: 'PWD ID', applicantType: 'PWD', required: 'Yes', status: 'Active', description: 'Government issued Persons with Disability ID' },
  { id: 'reg_3', category: 'Registration requirements', code: 'REG-003', name: 'Medical Certificate', applicantType: 'PWD', required: 'Yes', status: 'Active', description: 'Certified medical certificate for accommodation' },

  // PWD Types
  { id: 'pwd_1', category: 'PWD Types', code: 'PWD-001', name: 'Visual Impairment', description: 'Blind / Low Vision', status: 'Active' },
  { id: 'pwd_2', category: 'PWD Types', code: 'PWD-002', name: 'Hearing Impairment', description: 'Deaf / Hard of Hearing', status: 'Active' },
  { id: 'pwd_3', category: 'PWD Types', code: 'PWD-003', name: 'Physical Disability', description: 'Mobility Impairment', status: 'Active' },
  { id: 'pwd_4', category: 'PWD Types', code: 'PWD-004', name: 'Autism Spectrum Disorder', description: 'ASD', status: 'Active' },

  // Verification
  { id: 'ap_1', category: 'Verification', code: 'AP-001', name: 'Grade 12 Student', description: 'Regular SHS', status: 'Active' },
  { id: 'ap_2', category: 'Verification', code: 'AP-002', name: 'ALS Graduate', description: 'Alternative Learning System', status: 'Active' },

  // Supported IDs
  { id: 'id_1', category: 'Supported IDs', code: 'ID-001', name: 'PWD ID', status: 'Active', description: 'Official PWD Identification Card' },
  { id: 'id_2', category: 'Supported IDs', code: 'ID-002', name: 'School ID', status: 'Active', description: 'Valid School ID Card' }
];

export default function StudentRegistrationMaintenance() {
  const [data, setData] = useState<any[]>(() => {
    const saved = localStorage.getItem('philsa_registration_configs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const hasCleanCategories = parsed.some((item: any) => CATEGORIES.includes(item.category));
        if (hasCleanCategories) {
          return parsed.filter((item: any) => item.category !== 'Application Status');
        }
      } catch (e) {
        console.error(e);
      }
    }
    localStorage.setItem('philsa_registration_configs', JSON.stringify(MOCK_DATA));
    return MOCK_DATA;
  });

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('Registration requirements');

  const saveConfigs = (newData: any[]) => {
    setData(newData);
    localStorage.setItem('philsa_registration_configs', JSON.stringify(newData));
  };

  const getColumnsForCategory = (category: string): MaintenanceColumn[] => {
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
    if (window.confirm(`Are you sure you want to delete ${row.name || row.code}?`)) {
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


