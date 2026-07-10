import React, { useState } from 'react';
import MaintenancePageTemplate, { MaintenanceColumn, MaintenanceField } from '../../../components/maintenance/MaintenancePageTemplate';

const MOCK_DEGREE_PROGRAMS = [
  { 
    id: '1', 
    University_ID: 'UP-DIL', 
    University_Name: 'UP Diliman', 
    College_Name: 'College of Engineering', 
    Program_Code: 'BSCS', 
    Program_Name: 'Bachelor of Science in Computer Science', 
    Major_Specialization: 'None', 
    Degree_Type: 'BS', 
    Campus_Location: 'Quezon City', 
    Active_Flag: 'Active', 
    Effective_Year: '2024',
    approvalStatus: 'Approved',
    updatedBy: 'admin_01',
    updatedAt: '2026-06-12 11:30'
  },
  { 
    id: '2', 
    University_ID: 'UP-MAN', 
    University_Name: 'UP Manila', 
    College_Name: 'College of Nursing', 
    Program_Code: 'BSN', 
    Program_Name: 'Bachelor of Science in Nursing', 
    Major_Specialization: 'Clinical Practice', 
    Degree_Type: 'BS', 
    Campus_Location: 'Ermita, Manila', 
    Active_Flag: 'Active', 
    Effective_Year: '2023',
    approvalStatus: 'Approved',
    updatedBy: 'admin_02',
    updatedAt: '2026-06-11 09:15'
  },
  { 
    id: '3', 
    University_ID: 'UP-DIL', 
    University_Name: 'UP Diliman', 
    College_Name: 'Cesar E.A. Virata School of Business', 
    Program_Code: 'BSBAA', 
    Program_Name: 'Bachelor of Science in Business Administration and Accountancy', 
    Major_Specialization: 'Accountancy', 
    Degree_Type: 'BS', 
    Campus_Location: 'Quezon City', 
    Active_Flag: 'Active', 
    Effective_Year: '2025',
    approvalStatus: 'Approved',
    updatedBy: 'system',
    updatedAt: '2026-05-01 08:00'
  },
  { 
    id: '4', 
    University_ID: 'UST-MNL', 
    University_Name: 'UST Manila', 
    College_Name: 'Faculty of Engineering', 
    Program_Code: 'BSCE', 
    Program_Name: 'Bachelor of Science in Civil Engineering', 
    Major_Specialization: 'Structural Engineering', 
    Degree_Type: 'BS', 
    Campus_Location: 'España, Manila', 
    Active_Flag: 'Active', 
    Effective_Year: '2022',
    approvalStatus: 'Approved',
    updatedBy: 'admin_01',
    updatedAt: '2026-06-10 14:20'
  },
  { 
    id: '5', 
    University_ID: 'DLSU-MNL', 
    University_Name: 'De La Salle University Manila', 
    College_Name: 'College of Computer Studies', 
    Program_Code: 'BSCS', 
    Program_Name: 'Bachelor of Science in Computer Science', 
    Major_Specialization: 'Software Technology', 
    Degree_Type: 'BS', 
    Campus_Location: 'Taft Avenue, Manila', 
    Active_Flag: 'Active', 
    Effective_Year: '2024',
    approvalStatus: 'Approved',
    updatedBy: 'system',
    updatedAt: '2026-05-01 08:00'
  },
  { 
    id: '6', 
    University_ID: 'PUP-STA', 
    University_Name: 'PUP Manila', 
    College_Name: 'College of Accountancy and Finance', 
    Program_Code: 'BSA', 
    Program_Name: 'Bachelor of Science in Accountancy', 
    Major_Specialization: 'None', 
    Degree_Type: 'BS', 
    Campus_Location: 'Santa Mesa, Manila', 
    Active_Flag: 'Inactive', 
    Effective_Year: '2023',
    approvalStatus: 'Approved',
    updatedBy: 'system',
    updatedAt: '2026-05-01 08:00'
  }
];

export default function DegreeProgramsMaintenance() {
  const [data, setData] = useState(MOCK_DEGREE_PROGRAMS);

  const columns: MaintenanceColumn[] = [
    { key: 'University_ID', label: 'University ID' },
    { key: 'University_Name', label: 'University Name' },
    { key: 'College_Name', label: 'College Name' },
    { key: 'Program_Code', label: 'Program Code' },
    { key: 'Program_Name', label: 'Program Name' },
    { key: 'Major_Specialization', label: 'Specialization' },
    { key: 'Degree_Type', label: 'Type' },
    { key: 'Campus_Location', label: 'Location' },
    { key: 'Effective_Year', label: 'Effective Year' },
    { 
      key: 'Active_Flag', 
      label: 'Status',
      render: (row) => (
        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${row.Active_Flag === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {row.Active_Flag}
        </span>
      )
    }
  ];

  const fields: MaintenanceField[] = [
    { 
      name: 'University_Name', 
      label: 'University Name', 
      type: 'select', 
      required: true, 
      placeholder: 'Select University',
      options: [
        { value: 'UP Diliman', label: 'UP Diliman (UP-DIL)' },
        { value: 'UP Manila', label: 'UP Manila (UP-MAN)' },
        { value: 'UST Manila', label: 'UST Manila (UST-MNL)' },
        { value: 'De La Salle University Manila', label: 'De La Salle University Manila (DLSU-MNL)' },
        { value: 'PUP Manila', label: 'PUP Manila (PUP-STA)' },
        { value: 'Ateneo de Manila University', label: 'Ateneo de Manila University (ADMU-QC)' },
        { value: 'Mindanao State University', label: 'Mindanao State University (MSU-GEN)' },
        { value: 'University of San Carlos', label: 'University of San Carlos (USC-CEB)' }
      ],
      onChange: (val, currentData) => {
        const universityIds: Record<string, string> = {
          'UP Diliman': 'UP-DIL',
          'UP Manila': 'UP-MAN',
          'UST Manila': 'UST-MNL',
          'De La Salle University Manila': 'DLSU-MNL',
          'PUP Manila': 'PUP-STA',
          'Ateneo de Manila University': 'ADMU-QC',
          'Mindanao State University': 'MSU-GEN',
          'University of San Carlos': 'USC-CEB'
        };
        const universityLocations: Record<string, string> = {
          'UP Diliman': 'Diliman, Quezon City',
          'UP Manila': 'Ermita, Manila',
          'UST Manila': 'España, Manila',
          'De La Salle University Manila': 'Taft Avenue, Manila',
          'PUP Manila': 'Santa Mesa, Manila',
          'Ateneo de Manila University': 'Loyola Heights, Quezon City',
          'Mindanao State University': 'General Santos City',
          'University of San Carlos': 'Cebu City'
        };
        return {
          ...currentData,
          University_ID: universityIds[val] || '',
          Campus_Location: universityLocations[val] || currentData.Campus_Location || ''
        };
      }
    },
    { 
      name: 'University_ID', 
      label: 'University Unique ID', 
      type: 'text', 
      required: true, 
      disabled: true, 
      placeholder: '' 
    },
    { name: 'College_Name', label: 'College Offering Program', type: 'text', required: true, placeholder: 'e.g. College of Science' },
    { name: 'Program_Code', label: 'Program Code', type: 'text', required: true, placeholder: 'e.g. BSCS, BSBAA' },
    { name: 'Program_Name', label: 'Full Program Name', type: 'text', required: true, placeholder: 'e.g. Bachelor of Science in Physics' },
    { name: 'Major_Specialization', label: 'Major / Specialization (Optional)', type: 'text', placeholder: 'e.g. Astrophysics' },
    { 
      name: 'Degree_Type', 
      label: 'Degree Type', 
      type: 'select', 
      required: true,
      options: [
        { value: 'BS', label: 'BS (Bachelor of Science)' },
        { value: 'BA', label: 'BA (Bachelor of Arts)' },
        { value: 'BFA', label: 'BFA (Bachelor of Fine Arts)' },
        { value: 'BM', label: 'BM (Bachelor of Music)' }
      ]
    },
    { name: 'Campus_Location', label: 'Campus Location', type: 'text', required: true, placeholder: 'e.g. Diliman, Quezon City' },
    { name: 'Effective_Year', label: 'Effective Curriculum Year', type: 'text', required: true, placeholder: 'e.g. 2024' },
    { name: 'status', label: 'Set as Active Immediately', type: 'toggle' }
  ];

  const handleAdd = (newData: any) => {
    const item = {
      ...newData,
      id: Math.random().toString(36).substr(2, 9),
      Active_Flag: newData.status ? 'Active' : 'Inactive',
      approvalStatus: 'Pending Approval',
      updatedBy: 'current_admin',
      updatedAt: new Date().toISOString().split('T')[0] + ' ' + new Date().toLocaleTimeString().substr(0, 5)
    };
    setData([item, ...data]);
  };

  const handleEdit = (updatedRow: any) => {
    setData(data.map(row => row.id === updatedRow.id ? {
      ...updatedRow,
      Active_Flag: updatedRow.status !== undefined ? (updatedRow.status ? 'Active' : 'Inactive') : updatedRow.Active_Flag
    } : row));
  };

  const handleDelete = (row: any) => {
    if (window.confirm(`Are you sure you want to delete ${row.Program_Name} (${row.Program_Code})?`)) {
      setData(data.filter(r => r.id !== row.id));
    }
  };

  return (
    <MaintenancePageTemplate
      title="Degree Programs Maintenance"
      subtitle="Configure university degree configurations, college pathways, curriculum periods, and enrollment requirements."
      breadcrumb={['Maintenance', 'Degree Programs']}
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
