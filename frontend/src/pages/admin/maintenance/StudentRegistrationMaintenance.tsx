import React, { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import MaintenancePageTemplate, { MaintenanceColumn, MaintenanceField } from '../../../components/maintenance/MaintenancePageTemplate';
import {
  backendApplicationService,
  type StudentRegistrationFieldConfig,
  type StudentRegistrationFieldInput,
} from '../../../services/backendApplicationService';

const PWD_TYPES = [
  'Psychosocial disability',
  'Disability due to chronic illness',
  'Learning disability',
  'Intellectual disability',
  'Mental disability',
  'Visual disability',
  'Physical/orthopedic disability',
  'Speech impairment',
  'Deaf / hard-of-hearing',
  'Cancer and rare diseases',
];

const PWD_CONDITIONS = [
  'Bipolar disorder',
  'Depression',
  'Schizophrenia',
  'ADHD',
  'Epilepsy',
  'Other long-term mental/behavioral condition',
  'Orthopedic disability from cancer',
  'Blindness from diabetes',
  'Dialysis',
  'Heart disorder',
  'Severe cancer',
  'Other disability arising from a chronic disease',
  'Dyslexia',
  'Dysgraphia',
  'Similar learning disability',
  'Cognitive impairment affecting adaptive functioning',
  'Broader mental impairment classification used in the NCDA list',
  'Blindness',
  'Low vision',
  'Functional visual limitation certified by an ophthalmologist',
  'Mobility impairment',
  'Missing limb',
  'Other physical/orthopedic disability',
  'Communication disorder',
  'Deaf',
  'Hard-of-hearing',
  'Other hearing impairment',
  'Cancer',
  'Rare disease',
];

const MOCK_DATA = [
  { id: 'hp-lrn', section: 'Step 1 Registration', type: 'Student Registration Field', value: 'LRN', priority: 'High Priority', remarks: 'Primary identifier', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-07-15 09:00' },
  { id: 'hp-dob', section: 'Step 1 Registration', type: 'Student Registration Field', value: 'Birth Date', priority: 'High Priority', remarks: 'Verify against DepEd', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-07-15 09:00' },
  { id: 'hp-first-name', section: 'Step 1 Registration', type: 'Student Registration Field', value: 'First Name', priority: 'High Priority', remarks: 'Read-only from DepEd or PhilSys when verified', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-07-15 09:00' },
  { id: 'hp-middle-name', section: 'Step 1 Registration', type: 'Student Registration Field', value: 'Middle Name', priority: 'High Priority', remarks: 'Read-only from DepEd or PhilSys when verified', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-07-15 09:00' },
  { id: 'hp-last-name', section: 'Step 1 Registration', type: 'Student Registration Field', value: 'Last Name', priority: 'High Priority', remarks: 'Read-only from DepEd or PhilSys when verified', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-07-15 09:00' },
  { id: 'mp-extension-name', section: 'Step 1 Registration', type: 'Student Registration Field', value: 'Extension Name', priority: 'Medium Priority', remarks: 'Only if applicable', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-07-15 09:00' },
  { id: 'hp-sex', section: 'Step 1 Registration', type: 'Student Registration Field', value: 'Sex', priority: 'High Priority', remarks: 'Read-only from verified registry', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-07-15 09:00' },
  { id: 'hp-school-id', section: 'Step 1 Registration', type: 'Student Registration Field', value: 'School ID', priority: 'High Priority', remarks: '', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-07-15 09:00' },
  { id: 'hp-school-name', section: 'Step 1 Registration', type: 'Student Registration Field', value: 'School Name', priority: 'High Priority', remarks: '', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-07-15 09:00' },
  { id: 'hp-grade-level', section: 'Step 1 Registration', type: 'Student Registration Field', value: 'Grade Level', priority: 'High Priority', remarks: '', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-07-15 09:00' },
  { id: 'hp-enrollment-status', section: 'Step 1 Registration', type: 'Student Registration Field', value: 'Enrollment Status', priority: 'High Priority', remarks: '', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-07-15 09:00' },
  { id: 'hp-school-year', section: 'Step 1 Registration', type: 'Student Registration Field', value: 'School Year', priority: 'High Priority', remarks: '', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-07-15 09:00' },
  { id: 'pwd-toggle', section: 'Step 1 Registration', type: 'Student Registration Field', value: 'PWD', fieldSection: 'PWD Information', inputType: 'checkbox', priority: 'Low Priority', remarks: 'Shows the PWD declaration section before selfie capture', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-07-21 09:00', display_order: 130 },
  { id: 'pwd-type', section: 'Step 1 Registration', type: 'Student Registration Field', value: 'PWD Type', fieldSection: 'PWD Information', inputType: 'dropdown', optionValues: PWD_TYPES, priority: 'High Priority', remarks: 'Required when PWD is checked', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-07-21 09:00', display_order: 131 },
  { id: 'pwd-condition', section: 'Step 1 Registration', type: 'Student Registration Field', value: 'Condition', fieldSection: 'PWD Information', inputType: 'dropdown', optionValues: PWD_CONDITIONS, priority: 'High Priority', remarks: 'Required when PWD is checked', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-07-21 09:00', display_order: 132 },
  { id: 'pwd-id-number', section: 'Step 1 Registration', type: 'Student Registration Field', value: 'PWD ID Number', fieldSection: 'PWD Information', inputType: 'text', priority: 'High Priority', remarks: 'Required when PWD is checked', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-07-21 09:00', display_order: 133 },
  { id: 'pwd-id-attachment', section: 'Step 1 Registration', type: 'Student Registration Field', value: 'PWD ID Attachment', fieldSection: 'PWD Information', inputType: 'file', priority: 'High Priority', remarks: 'Required when PWD is checked', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-07-21 09:00', display_order: 134 },
  { id: 'pwd-accommodation', section: 'Step 1 Registration', type: 'Student Registration Field', value: 'Accommodation Needed', fieldSection: 'PWD Information', inputType: 'textarea', priority: 'High Priority', remarks: 'Required when PWD is checked', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-07-21 09:00', display_order: 135 },
  // Registration Methods
  { id: 'v1', section: 'Step 1 Registration', type: 'Verification Method', value: 'Learner Reference Number (LRN)', status: 'Active', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-05-01 08:00' },
  { id: 'v2', section: 'Step 1 Registration', type: 'Verification Method', value: 'PhilSys National ID', status: 'Inactive', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-05-01 08:00' },
  { id: 'v3', section: 'Step 1 Registration', type: 'Verification Method', value: 'Manual Entry', status: 'Inactive', approvalStatus: 'Approved', updatedBy: 'system', updatedAt: '2026-05-01 08:00' },
];

const REGISTRATION_SECTIONS = ['Step 1 Registration'];
const PAGE_SIZE = 10;
type RegistrationSectionFilter = 'All' | 'Step 1 Registration' | 'Registration Methods';
type RegistrationStatusFilter = 'All' | 'Active' | 'Inactive';

const DEFAULT_FIELD_SECTIONS: Record<string, string> = {
  'LRN': 'Personal Information',
  'Birth Date': 'Personal Information',
  'First Name': 'Personal Information',
  'Middle Name': 'Personal Information',
  'Last Name': 'Personal Information',
  'Extension Name': 'Personal Information',
  'Sex': 'Personal Information',
  'School ID': 'School Information',
  'School Name': 'School Information',
  'Grade Level': 'School Information',
  'Enrollment Status': 'School Information',
  'School Year': 'School Information',
  'PWD': 'PWD Information',
  'PWD Type': 'PWD Information',
  'Condition': 'PWD Information',
  'PWD ID Number': 'PWD Information',
  'PWD ID Attachment': 'PWD Information',
  'Accommodation Needed': 'PWD Information',
};
const sanitizeRegistrationConfigRows = (rows: any[]) => rows
  .filter(row => REGISTRATION_SECTIONS.includes(row.section))
  .map(row => ({
    ...row,
    fieldSection: row.fieldSection || DEFAULT_FIELD_SECTIONS[row.value] || (row.type === 'Verification Method' ? 'Learner Archive Registry Verification' : 'Personal Information'),
    optionValuesText: Array.isArray(row.optionValues) ? row.optionValues.join('\n') : row.optionValuesText || '',
  }));

const formatOptionValues = (options: string[]) => options.join(', ');

const getFieldTypeFilter = (section: RegistrationSectionFilter) => {
  if (section === 'Step 1 Registration') return 'Student Registration Field';
  if (section === 'Registration Methods') return 'Verification Method';
  return undefined;
};

const getStatusFilter = (status: RegistrationStatusFilter) => {
  if (status === 'Active') return true;
  if (status === 'Inactive') return false;
  return undefined;
};

export default function StudentRegistrationMaintenance() {
  const [data, setData] = useState<StudentRegistrationFieldConfig[]>(() => {
    const saved = localStorage.getItem('philsa_registration_configs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const sanitized = sanitizeRegistrationConfigRows(parsed);
        const missingDefaults = MOCK_DATA.filter(defaultItem => !sanitized.some((item: any) => item.id === defaultItem.id));
        const merged = [...missingDefaults, ...sanitized];
        localStorage.setItem('philsa_registration_configs', JSON.stringify(merged));
        return merged;
      } catch (e) {
        console.error(e);
      }
    }
    localStorage.setItem('philsa_registration_configs', JSON.stringify(MOCK_DATA));
    return MOCK_DATA;
  });

  const [selectedSection, setSelectedSection] = useState<RegistrationSectionFilter>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<RegistrationStatusFilter>('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [inputTypeFilter, setInputTypeFilter] = useState('All');
  const [totalRecords, setTotalRecords] = useState(data.length);
  const [tabCounts, setTabCounts] = useState({
    all: data.length,
    fields: data.filter(d => d.type === 'Student Registration Field').length,
    methods: data.filter(d => d.type === 'Verification Method').length,
  });
  const [isLoadingRegistrationFields, setIsLoadingRegistrationFields] = useState(false);
  const [registrationFieldMessage, setRegistrationFieldMessage] = useState('');
  const [registrationFieldError, setRegistrationFieldError] = useState('');

  const loadTabCounts = async () => {
    const [allResult, fieldsResult, methodsResult] = await Promise.all([
      backendApplicationService.listStudentRegistrationFieldsPage({ page: 1, pageSize: 1 }),
      backendApplicationService.listStudentRegistrationFieldsPage({ page: 1, pageSize: 1, type: 'Student Registration Field' }),
      backendApplicationService.listStudentRegistrationFieldsPage({ page: 1, pageSize: 1, type: 'Verification Method' }),
    ]);

    setTabCounts(previousCounts => ({
      all: allResult.ok === false ? previousCounts.all : allResult.data.count,
      fields: fieldsResult.ok === false ? previousCounts.fields : fieldsResult.data.count,
      methods: methodsResult.ok === false ? previousCounts.methods : methodsResult.data.count,
    }));
  };

  const loadRegistrationFields = async (page = currentPage) => {
    setIsLoadingRegistrationFields(true);
    const result = await backendApplicationService.listStudentRegistrationFieldsPage({
      page,
      pageSize: PAGE_SIZE,
      type: getFieldTypeFilter(selectedSection),
      search: searchTerm.trim() || undefined,
      status: getStatusFilter(statusFilter),
      priority: selectedSection === 'Registration Methods' || priorityFilter === 'All' ? undefined : priorityFilter,
      inputType: selectedSection === 'Registration Methods' || inputTypeFilter === 'All' ? undefined : inputTypeFilter,
    });
    setIsLoadingRegistrationFields(false);
    if (result.ok === false) {
      setRegistrationFieldError(result.error.message);
      return;
    }
    const rows = sanitizeRegistrationConfigRows(result.data.results);
    setData(rows);
    setTotalRecords(result.data.count);
    setRegistrationFieldError('');
    void loadTabCounts();
  };

  useEffect(() => {
    void loadRegistrationFields();
  }, [selectedSection, currentPage, searchTerm, statusFilter, priorityFilter, inputTypeFilter]);

  const handleSectionChange = (section: RegistrationSectionFilter) => {
    setSelectedSection(section);
    setCurrentPage(1);
  };

  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (status: RegistrationStatusFilter) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handlePriorityFilterChange = (priority: string) => {
    setPriorityFilter(priority);
    setCurrentPage(1);
  };

  const handleInputTypeFilterChange = (inputType: string) => {
    setInputTypeFilter(inputType);
    setCurrentPage(1);
  };

  const clearAdvancedFilters = () => {
    setStatusFilter('All');
    setPriorityFilter('All');
    setInputTypeFilter('All');
    setCurrentPage(1);
  };

  const toRegistrationFieldInput = (row: any): StudentRegistrationFieldInput => ({
    module: row.module || 'student_registration',
    section: row.section || 'Step 1 Registration',
    type: row.type,
    value: row.value,
    fieldSection: row.fieldSection || DEFAULT_FIELD_SECTIONS[row.value] || 'Personal Information',
    inputType: row.inputType || 'text',
    optionValues: String(row.optionValuesText || '')
      .split(/\r?\n/)
      .map(option => option.trim())
      .filter(Boolean),
    priority: row.priority || 'High Priority',
    remarks: row.remarks || '',
    status: row.status === 'Active' || row.status === true,
    display_order: Number(row.display_order ?? row.displayOrder ?? 100),
  });

  const columns: MaintenanceColumn[] = [
    { 
      key: 'section', 
      label: 'Portal Section',
      render: (row) => (
        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
          row.section === 'Step 1 Registration'
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
            : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
        }`}>
          Step 1
        </span>
      )
    },
    { key: 'type', label: 'Category / Field Type' },
    { key: 'value', label: 'Field Name / Configuration Value' },
    { key: 'fieldSection', label: 'Form Display Section' },
    {
      key: 'inputType',
      label: 'Input Type',
      render: (row) => <span className="text-xs font-black uppercase tracking-wider text-slate-600">{row.inputType || 'text'}</span>,
    },
    {
      key: 'optionValues',
      label: 'Options',
      render: (row) => {
        if (!Array.isArray(row.optionValues) || row.optionValues.length === 0) {
          return <span className="text-slate-400">-</span>;
        }

        const optionSummary = formatOptionValues(row.optionValues);

        return (
          <span
            className="inline-block w-fit max-w-64 truncate rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-600"
            title={optionSummary}
            aria-label={optionSummary}
          >
            {optionSummary}
          </span>
        );
      },
    },
    {
      key: 'priority',
      label: 'Priority',
      render: (row) => row.priority ? (
        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
          row.priority === 'High Priority'
            ? 'bg-red-50 text-red-700 border border-red-100'
            : row.priority === 'Low Priority'
              ? 'bg-slate-100 text-slate-600 border border-slate-200'
              : 'bg-amber-50 text-amber-700 border border-amber-100'
        }`}>
          {row.priority}
        </span>
      ) : <span className="text-slate-400">-</span>
    },
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

  const verificationMethodColumns: MaintenanceColumn[] = [
    {
      key: 'section',
      label: 'Portal Section',
      render: () => (
        <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100">
          Step 1
        </span>
      ),
    },
    { key: 'type', label: 'Category / Field Type', render: () => 'Registration Method' },
    { key: 'value', label: 'Registration Method' },
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
      ),
    },
  ];

  const fields: MaintenanceField[] = [
    { 
      name: 'section', 
      label: 'Registration Form Section', 
      type: 'select', 
      required: true, 
      options: [
        { value: 'Step 1 Registration', label: 'Step 1 Registration Fields' },
      ] 
    },
    {
      name: 'type',
      label: 'Category / Config Type',
      type: 'select',
      required: true,
      options: [
        { value: 'Student Registration Field', label: 'Student Registration Field' },
      ]
    },
    { name: 'value', label: 'Value / Label', type: 'text', required: true, placeholder: 'e.g. Regular Senior High, First Name Input Field' },
    {
      name: 'fieldSection',
      label: 'Step 1 Display Section',
      type: 'select',
      required: true,
      options: [
        { value: 'Personal Information', label: 'Personal Information' },
        { value: 'School Information', label: 'School Information' },
        { value: 'Additional Information', label: 'Additional Information' },
        { value: 'PWD Information', label: 'PWD Information' },
      ],
    },
    {
      name: 'inputType',
      label: 'Field Input Type',
      type: 'select',
      required: true,
      options: [
        { value: 'text', label: 'Text Input' },
        { value: 'date', label: 'Date Picker' },
        { value: 'dropdown', label: 'Dropdown' },
        { value: 'file', label: 'File Upload' },
        { value: 'textarea', label: 'Long Text' },
      ],
    },
    {
      name: 'optionValuesText',
      label: 'Dropdown Options',
      type: 'textarea',
      placeholder: 'Grade 11\nGrade 12',
      dependsOn: 'inputType',
      dependsOnValue: 'dropdown',
    },
    {
      name: 'priority',
      label: 'Priority',
      type: 'select',
      options: [
        { value: 'High Priority', label: 'High Priority' },
        { value: 'Medium Priority', label: 'Medium Priority' },
        { value: 'Low Priority', label: 'Low Priority' },
      ],
    },
    { name: 'remarks', label: 'Remarks / Notes', type: 'textarea', placeholder: 'Justification or description of usage...' },
    { name: 'status', label: 'Enable Immediately', type: 'toggle' }
  ];

  const handleAdd = async (newData: any) => {
    setRegistrationFieldError('');
    setRegistrationFieldMessage('');
    const result = await backendApplicationService.createStudentRegistrationField(toRegistrationFieldInput(newData));
    if (result.ok === false) {
      setRegistrationFieldError(result.error.message);
      return;
    }
    setRegistrationFieldMessage('Registration field saved.');
    await loadRegistrationFields(currentPage);
  };

  const handleEdit = async (updatedRow: any) => {
    setRegistrationFieldError('');
    setRegistrationFieldMessage('');
    const result = await backendApplicationService.updateStudentRegistrationField(updatedRow.id, toRegistrationFieldInput(updatedRow));
    if (result.ok === false) {
      setRegistrationFieldError(result.error.message);
      return;
    }
    setRegistrationFieldMessage(
      updatedRow.type === 'Verification Method' && (updatedRow.status === true || updatedRow.status === 'Active')
        ? 'Registration method enabled. Other Step 1 registration methods were disabled automatically.'
        : 'Registration field updated.'
    );
    await loadRegistrationFields(currentPage);
  };

  const handleDelete = async (row: any) => {
    if (window.confirm(`Are you sure you want to delete ${row.value}?`)) {
      setRegistrationFieldError('');
      setRegistrationFieldMessage('');
      const result = await backendApplicationService.deleteStudentRegistrationField(row.id);
      if (result.ok === false) {
        setRegistrationFieldError(result.error.message);
        return;
      }
      setRegistrationFieldMessage('Registration field deleted.');
      if (data.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      } else {
        await loadRegistrationFields(currentPage);
      }
    }
  };

  const handleVerificationMethodToggle = async (row: any) => {
    const isActive = row.status === 'Active' || row.status === true;
    await handleEdit({ ...row, status: !isActive });
  };

  const renderVerificationMethodAction = (row: any) => {
    const isActive = row.status === 'Active' || row.status === true;
    const isLocked = row.value === 'PhilSys National ID';
    if (isLocked) {
      return (
        <div className="flex items-center justify-end gap-2 text-slate-500">
          <Lock className="h-4 w-4" aria-hidden="true" />
          <span className="text-[10px] font-black uppercase tracking-wider">Locked</span>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-end gap-3">
        <span className={`text-[10px] font-black uppercase tracking-wider ${isActive ? 'text-emerald-700' : 'text-slate-500'}`}>
          {isActive ? 'Enabled' : 'Disabled'}
        </span>
        <button
          type="button"
          onClick={() => void handleVerificationMethodToggle(row)}
          aria-label={`${isActive ? 'Disable' : 'Enable'} ${row.value}`}
          className={`relative h-6 w-11 rounded-full transition-all ${isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}
        >
          <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${isActive ? 'right-1' : 'left-1'}`} />
        </button>
      </div>
    );
  };

  const advancedFilters = (
    <div className="flex flex-wrap items-end gap-3">
      <label className="flex min-w-40 flex-col gap-1 text-[10px] font-black uppercase tracking-widest text-philsa-gray">
        Status
        <select
          value={statusFilter}
          onChange={(event) => handleStatusFilterChange(event.target.value as RegistrationStatusFilter)}
          className="rounded-xl border border-philsa-border bg-white px-4 py-3 text-xs font-bold normal-case tracking-normal text-philsa-navy outline-none focus:ring-2 focus:ring-philsa-navy/10"
        >
          <option value="All">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </label>
      {selectedSection !== 'Registration Methods' && (
        <label className="flex min-w-44 flex-col gap-1 text-[10px] font-black uppercase tracking-widest text-philsa-gray">
          Priority
          <select
            value={priorityFilter}
            onChange={(event) => handlePriorityFilterChange(event.target.value)}
            className="rounded-xl border border-philsa-border bg-white px-4 py-3 text-xs font-bold normal-case tracking-normal text-philsa-navy outline-none focus:ring-2 focus:ring-philsa-navy/10"
          >
            <option value="All">All Priorities</option>
            <option value="High Priority">High Priority</option>
            <option value="Medium Priority">Medium Priority</option>
            <option value="Low Priority">Low Priority</option>
          </select>
        </label>
      )}
      {selectedSection !== 'Registration Methods' && (
        <label className="flex min-w-40 flex-col gap-1 text-[10px] font-black uppercase tracking-widest text-philsa-gray">
          Input Type
          <select
            value={inputTypeFilter}
            onChange={(event) => handleInputTypeFilterChange(event.target.value)}
            className="rounded-xl border border-philsa-border bg-white px-4 py-3 text-xs font-bold normal-case tracking-normal text-philsa-navy outline-none focus:ring-2 focus:ring-philsa-navy/10"
          >
            <option value="All">All Types</option>
            <option value="text">Text</option>
            <option value="date">Date</option>
            <option value="dropdown">Dropdown</option>
            <option value="textarea">Textarea</option>
            <option value="checkbox">Checkbox</option>
            <option value="file">File</option>
          </select>
        </label>
      )}
      <button
        type="button"
        onClick={clearAdvancedFilters}
        className="rounded-xl border border-philsa-border bg-white px-5 py-3 text-xs font-black uppercase tracking-wider text-philsa-gray transition-all hover:border-philsa-navy hover:text-philsa-navy"
      >
        Clear Filters
      </button>
    </div>
  );

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
          onClick={() => handleSectionChange('All')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
            selectedSection === 'All'
              ? 'bg-white text-philsa-navy shadow-md'
              : 'text-slate-500 hover:text-philsa-navy'
          }`}
        >
          All Configs ({tabCounts.all})
        </button>
        <button
          type="button"
          onClick={() => handleSectionChange('Step 1 Registration')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
            selectedSection === 'Step 1 Registration'
              ? 'bg-white text-philsa-navy shadow-md'
              : 'text-slate-500 hover:text-philsa-navy'
          }`}
        >
          Step 1 Fields ({tabCounts.fields})
        </button>
        <button
          type="button"
          onClick={() => handleSectionChange('Registration Methods')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
            selectedSection === 'Registration Methods'
              ? 'bg-white text-philsa-navy shadow-md'
              : 'text-slate-500 hover:text-philsa-navy'
          }`}
        >
          Registration Methods ({tabCounts.methods})
        </button>
      </div>
      {registrationFieldError && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">{registrationFieldError}</p>
      )}
      {registrationFieldMessage && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-700">{registrationFieldMessage}</p>
      )}
      {selectedSection === 'Registration Methods' && (
        <p className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs font-bold text-blue-700">
          Registration methods are predefined. Enable LRN or Manual Entry from the action switch; enabling one disables the other automatically. PhilSys is locked for future feature development.
        </p>
      )}
    </div>
  );

  // Filter the actual data array being rendered by the table
  const filteredDataBySection = selectedSection === 'Registration Methods'
      ? data.filter(item => item.type === 'Verification Method')
    : selectedSection === 'Step 1 Registration'
      ? data.filter(item => item.type === 'Student Registration Field')
    : selectedSection === 'All' ? data : data.filter(item => item.section === selectedSection);

  return (
    <MaintenancePageTemplate
      title="Student Registration Maintenance"
      subtitle="Lookup tables and validation rules for the National standardized registration portal."
      breadcrumb={['Maintenance', 'Student Registration']}
      columns={selectedSection === 'Registration Methods' ? verificationMethodColumns : columns}
      data={isLoadingRegistrationFields ? [] : filteredDataBySection}
      fields={fields}
      onAdd={selectedSection === 'Registration Methods' ? undefined : handleAdd}
      onEdit={handleEdit}
      onDelete={handleDelete}
      showCreateAction={selectedSection !== 'Registration Methods'}
      showRowActions
      showApprovalColumn={selectedSection !== 'Registration Methods'}
      renderRowActions={selectedSection === 'Registration Methods' ? renderVerificationMethodAction : undefined}
      aboveTableContent={aboveTableContent}
      searchTerm={searchTerm}
      onSearchTermChange={handleSearchChange}
      advancedFilters={advancedFilters}
      isBackendFiltered
      bulkUpload={selectedSection === 'Registration Methods' ? undefined : {
        templateUrl: '#',
        allowedTypes: ['.xlsx', '.csv']
      }}
      pagination={{
        page: currentPage,
        pageSize: PAGE_SIZE,
        totalCount: totalRecords,
        onPageChange: setCurrentPage,
      }}
    />
  );
}
