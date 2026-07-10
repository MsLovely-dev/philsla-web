import React, { useState } from 'react';
import { Eye } from 'lucide-react';
import MaintenancePageTemplate, { MaintenanceColumn, MaintenanceField } from '../../../components/maintenance/MaintenancePageTemplate';
import RegistrationPreview from '../../../components/maintenance/RegistrationPreview';

const MOCK_DATA = [
  // Verification Methods
  { id: 'v1', section: 'Personal Information', type: 'Verification Method', value: 'Learner Reference Number (LRN)', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-05-01 08:00' },
  { id: 'v2', section: 'Personal Information', type: 'Verification Method', value: 'PhilSys National ID', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-05-01 08:00' },
  { id: 'v3', section: 'Personal Information', type: 'Verification Method', value: 'Manual Entry', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-05-01 08:00' },

  // 1. Personal Information Section Settings
  { id: '1', section: 'Personal Information', type: 'Candidate Type', value: 'Regular Senior High', status: 'Active', approvalStatus: 'Approved', updatedBy: 'admin_01', updatedAt: '2026-05-10 14:20' },
  { id: '2', section: 'Personal Information', type: 'Candidate Type', value: 'ALS Graduate', status: 'Active', approvalStatus: 'Approved', updatedBy: 'admin_02', updatedAt: '2026-05-11 09:15' },
  { id: '3', section: 'Personal Information', type: 'ID Type', value: 'Philippine Identification Card', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-05-01 08:00' },
  { id: '3b', section: 'Personal Information', type: 'ID Type', value: 'Student ID', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-05-01 08:00' },
  { id: '3c', section: 'Personal Information', type: 'ID Type', value: 'Passport', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-05-01 08:00' },
  { id: '7', section: 'Personal Information', type: 'Nationality', value: 'Filipino', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-05-01 08:00' },
  { id: '8', section: 'Personal Information', type: 'Suffix', value: 'Jr.', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-05-01 08:00' },
  { id: '9', section: 'Personal Information', type: 'Suffix', value: 'Sr.', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-05-01 08:00' },
  
  // Field toggles in Personal Information Section
  { id: 'f1', section: 'Personal Information', type: 'Field Toggle', value: 'First Name Input Field', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-05-01 08:00' },
  { id: 'f2', section: 'Personal Information', type: 'Field Toggle', value: 'Last Name Input Field', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-05-01 08:00' },
  { id: 'f3', section: 'Personal Information', type: 'Field Toggle', value: 'PhilSys Secure Verification', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-05-01 08:00' },

  // 2. Academic Section Settings
  { id: '4', section: 'Academic', type: 'SHS Track', value: 'STEM', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-05-01 08:00' },
  { id: '5', section: 'Academic', type: 'SHS Track', value: 'ABM', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-05-01 08:00' },
  { id: '5b', section: 'Academic', type: 'SHS Track', value: 'HUMSS', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-05-01 08:00' },
  { id: '5c', section: 'Academic', type: 'SHS Track', value: 'GAS', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-05-01 08:00' },
  { id: '6', section: 'Academic', type: 'Grade Level', value: 'Grade 12', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-05-01 08:00' },
  { id: '6b', section: 'Academic', type: 'Grade Level', value: 'Grade 11', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-05-01 08:00' },
  
  // Field toggles in Academic Section
  { id: 'f4', section: 'Academic', type: 'Field Toggle', value: 'School Name Input Field', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-05-01 08:00' },
  { id: 'f5', section: 'Academic', type: 'Field Toggle', value: 'School Address Input Field', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-05-01 08:00' },
  { id: 'f6', section: 'Academic', type: 'Field Toggle', value: 'Grade Level Selector', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-05-01 08:00' },
];

export default function StudentRegistrationMaintenance() {
  const [data, setData] = useState<any[]>(() => {
    const saved = localStorage.getItem('philsa_registration_configs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure verification method items exist in parsed list
        const hasV1 = parsed.some((item: any) => item.id === 'v1');
        const hasV2 = parsed.some((item: any) => item.id === 'v2');
        const hasV3 = parsed.some((item: any) => item.id === 'v3');
        if (hasV1 && hasV2 && hasV3) {
          return parsed;
        } else {
          const merged = [...parsed];
          if (!hasV1) merged.unshift({ id: 'v1', section: 'Personal Information', type: 'Verification Method', value: 'Learner Reference Number (LRN)', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-05-01 08:00' });
          if (!hasV2) merged.unshift({ id: 'v2', section: 'Personal Information', type: 'Verification Method', value: 'PhilSys National ID', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-05-01 08:00' });
          if (!hasV3) merged.unshift({ id: 'v3', section: 'Personal Information', type: 'Verification Method', value: 'Manual Entry', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-05-01 08:00' });
          localStorage.setItem('philsa_registration_configs', JSON.stringify(merged));
          return merged;
        }
      } catch (e) {
        console.error(e);
      }
    }
    localStorage.setItem('philsa_registration_configs', JSON.stringify(MOCK_DATA));
    return MOCK_DATA;
  });

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState<'All' | 'Personal Information' | 'Academic'>('All');

  const saveConfigs = (newData: any[]) => {
    setData(newData);
    localStorage.setItem('philsa_registration_configs', JSON.stringify(newData));
  };

  const columns: MaintenanceColumn[] = [
    { 
      key: 'section', 
      label: 'Portal Section',
      render: (row) => (
        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
          row.section === 'Personal Information' 
            ? 'bg-blue-50 text-blue-700 border border-blue-100' 
            : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
        }`}>
          {row.section === 'Personal Information' ? '1. Personal' : '2. Academic'}
        </span>
      )
    },
    { key: 'type', label: 'Category / Field Type' },
    { key: 'value', label: 'Configuration Value' },
    { 
      key: 'status', 
      label: 'Operational Status',
      render: (row) => (
        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
          row.status === 'Active' || row.status === true 
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
            : 'bg-slate-100 text-slate-600 border border-slate-200'
        }`}>
          {row.status === 'Active' || row.status === true ? 'Active' : 'Inactive'}
        </span>
      )
    }
  ];

  const fields: MaintenanceField[] = [
    { 
      name: 'section', 
      label: 'Registration Form Section', 
      type: 'select', 
      required: true, 
      options: [
        { value: 'Personal Information', label: '1. Personal Information' },
        { value: 'Academic', label: '2. Academic Track' },
      ] 
    },
    { 
      name: 'type', 
      label: 'Category / Config Type', 
      type: 'select', 
      required: true, 
      options: [
        { value: 'Candidate Type', label: 'Candidate Type Option' },
        { value: 'ID Type', label: 'Valid ID Option' },
        { value: 'SHS Track', label: 'SHS Track Option' },
        { value: 'Grade Level', label: 'Grade Level Option' },
        { value: 'Nationality', label: 'Nationality Option' },
        { value: 'Suffix', label: 'Suffix Option' },
        { value: 'Field Toggle', label: 'Input Field Enable Switch (Field Toggle)' },
        { value: 'Verification Method', label: 'Verification Method Enable Switch' },
      ] 
    },
    { name: 'value', label: 'Value / Label', type: 'text', required: true, placeholder: 'e.g. Regular Senior High, First Name Input Field' },
    { name: 'remarks', label: 'Remarks / Notes', type: 'textarea', placeholder: 'Justification or description of usage...' },
    { name: 'status', label: 'Enable Immediately', type: 'toggle' }
  ];

  const handleAdd = (newData: any) => {
    const item = {
      ...newData,
      id: Math.random().toString(36).substr(2, 9),
      approvalStatus: 'Approved',
      updatedBy: 'admin_01',
      updatedAt: new Date().toISOString().split('T')[0] + ' ' + new Date().toLocaleTimeString().substr(0, 5),
      status: newData.status === true || newData.status === 'Active' ? 'Active' : 'Inactive'
    };
    saveConfigs([item, ...data]);
  };

  const handleEdit = (updatedRow: any) => {
    const item = {
      ...updatedRow,
      status: updatedRow.status === true || updatedRow.status === 'Active' ? 'Active' : 'Inactive'
    };
    saveConfigs(data.map(row => row.id === item.id ? item : row));
  };

  const handleDelete = (row: any) => {
    if (window.confirm(`Are you sure you want to delete ${row.value}?`)) {
      saveConfigs(data.filter(r => r.id !== row.id));
    }
  };

  // Section Filter Tab Bar rendered above the table
  const aboveTableContent = (
    <div className="flex flex-col gap-3 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black text-philsa-navy uppercase tracking-widest">Select Form Category</h3>
        <span className="text-[10px] font-black uppercase text-philsa-gray tracking-wide">
          Filter Config Database
        </span>
      </div>
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 rounded-3xl w-fit">
        <button
          type="button"
          onClick={() => setSelectedSection('All')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
            selectedSection === 'All'
              ? 'bg-white text-philsa-navy shadow-md'
              : 'text-slate-500 hover:text-philsa-navy'
          }`}
        >
          All Configs ({data.length})
        </button>
        <button
          type="button"
          onClick={() => setSelectedSection('Personal Information')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
            selectedSection === 'Personal Information'
              ? 'bg-white text-philsa-navy shadow-md'
              : 'text-slate-500 hover:text-philsa-navy'
          }`}
        >
          1. Personal Information ({data.filter(d => d.section === 'Personal Information').length})
        </button>
        <button
          type="button"
          onClick={() => setSelectedSection('Academic')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
            selectedSection === 'Academic'
              ? 'bg-white text-philsa-navy shadow-md'
              : 'text-slate-500 hover:text-philsa-navy'
          }`}
        >
          2. Academic Settings ({data.filter(d => d.section === 'Academic').length})
        </button>
      </div>
    </div>
  );

  // Filter the actual data array being rendered by the table
  const filteredDataBySection = selectedSection === 'All' 
    ? data 
    : data.filter(item => item.section === selectedSection);

  return (
    <MaintenancePageTemplate
      title="Student Registration Maintenance"
      subtitle="Lookup tables and validation rules for the National standardized registration portal."
      breadcrumb={['Maintenance', 'Student Registration']}
      columns={columns}
      data={filteredDataBySection}
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
          {isPreviewOpen ? 'Close Preview' : 'Preview Full Page'}
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
