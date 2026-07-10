import React, { useState } from 'react';
import { 
  Users, Shield, CheckCircle2, XCircle, 
  Search, Filter, Mail, Phone, MapPin, 
  Calendar, MoreVertical, Plus, ExternalLink,
  Pencil, X, Save, Check, AlertTriangle, Monitor,
  Smartphone, UserX, CheckSquare, Sparkles, BookOpen
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useMockData } from '../../services/mockService';
import { Proctor } from '../../types';
import { usePhilSA } from '../../PhilSAContext';

export default function ProctorManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'DIRECTORY' | 'ATTENDANCE'>('DIRECTORY');
  const { proctors, setProctors } = useMockData();
  const { user } = usePhilSA();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProctor, setEditingProctor] = useState<Proctor | null>(null);
  const [addMode, setAddMode] = useState<'INDIVIDUAL' | 'MULTIPLE'>('INDIVIDUAL');
  const [multipleEmails, setMultipleEmails] = useState('');
  const [attendanceCenterFilter, setAttendanceCenterFilter] = useState('ALL');

  const testingCentersList = React.useMemo(() => {
    const centers = proctors.map(p => p.center).filter(c => c && c !== 'N/A');
    return Array.from(new Set(centers));
  }, [proctors]);

  const [proctorStudents, setProctorStudents] = useState<{ [proctorId: string]: any[] }>(() => {
    const saved = localStorage.getItem('philsa_proctor_students');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }

    const initial: { [proctorId: string]: any[] } = {};
    const candidateNames = [
      'Juan P. Pangilinan', 'Maria Elena Soriano', 'Ricardo M. Silva', 'Liza Monica Bautista',
      'Enrique S. Gatus', 'Kathrine B. Mercado', 'Daniel S. Reyes', 'Josephine M. Ventura',
      'Marcus Aurelius', 'Theresa L. Aquino', 'Julio Bagatsing', 'Christian San Jose',
      'Althea Cruz', 'Gideon dela Vega', 'Bernadette Alcantara', 'Lorenzo de Joya',
      'Carmela Evangelista', 'Patricia Solis', 'Ramon Valdez', 'Sofia Montemayor',
      'Jerome Bautista', 'Clarisse Mendoza', 'Dominic Santos', 'Evelyn Gatus'
    ];

    // Build lists for all dummy proctors
    const dummyProctors = [
      { id: 'PRC-001', name: 'Dr. Emil Javier' },
      { id: 'PRC-002', name: 'Prof. Maria Elena Escueta' },
      { id: 'PRC-003', name: 'Engr. Reynaldo Velasco' },
      { id: 'PRC-004', name: 'Ms. Isabel G. Soriano' },
      { id: 'PRC-005', name: 'Danilo P. Mendoza' }
    ];

    dummyProctors.forEach((p, pIdx) => {
      const studentsList = [];
      const count = 5 + (pIdx % 4); // each proctor has 5 to 8 students
      for (let i = 0; i < count; i++) {
        const studentIdx = (pIdx * 5 + i) % candidateNames.length;
        const seatNum = `Row ${Math.floor(i / 2) + 1} - PC ${String((i % 2) + 1).padStart(2, '0')}`;
        
        let status = 'PENDING';
        let device = 'COMPATIBLE';
        if (i === 0 || i === 2) status = 'PRESENT';
        if (i === 1 && pIdx % 2 === 0) {
          status = 'TECHNICAL_ISSUE';
          device = 'INCOMPATIBLE';
        }
        if (i === 3 && pIdx % 3 === 0) {
          status = 'ABSENT';
        }

        studentsList.push({
          id: `CAND-2026-${3100 + pIdx * 20 + i}`,
          name: candidateNames[studentIdx],
          seat: seatNum,
          status,
          device,
          battery: 65 + (i * 11) % 36
        });
      }
      initial[p.id] = studentsList;
    });

    localStorage.setItem('philsa_proctor_students', JSON.stringify(initial));
    return initial;
  });

  const updateStudentStatus = (proctorId: string, studentId: string, newStatus: string) => {
    setProctorStudents(prev => {
      const proctorList = prev[proctorId] || [];
      const updatedList = proctorList.map(s => {
        if (s.id === studentId) {
          let device = s.device;
          if (newStatus === 'PRESENT') device = 'COMPATIBLE';
          return { ...s, status: newStatus, device };
        }
        return s;
      });
      const nextState = { ...prev, [proctorId]: updatedList };
      localStorage.setItem('philsa_proctor_students', JSON.stringify(nextState));
      return nextState;
    });
  };

  const isTestingCenterAdmin = user?.role === 'TESTING_CENTER_ADMIN';
  const adminCenter = user?.center || ''; // e.g. 'UP Diliman'

  // Filter proctors: if testing center admin, only show proctors for that school.
  const centerProctors = isTestingCenterAdmin
    ? proctors.filter(p => {
        if (!p.center || p.center === 'N/A') return false;
        return p.center.toLowerCase().includes(adminCenter.toLowerCase()) || 
               adminCenter.toLowerCase().includes(p.center.toLowerCase());
      })
    : proctors;
  
  // Form state
  const [formData, setFormData] = useState<Partial<Proctor>>({
    name: '',
    email: '',
    center: '',
    status: 'ACTIVE',
    firstName: '',
    middleName: '',
    lastName: '',
    mobileNumber: '',
    employeeId: '',
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'ON LEAVE': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'SUSPENDED': return 'bg-red-50 text-red-600 border-red-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  const handleOpenAddModal = () => {
    setEditingProctor(null);
    setAddMode('INDIVIDUAL');
    setMultipleEmails('');
    setFormData({
      name: '',
      email: '',
      center: isTestingCenterAdmin ? adminCenter : 'N/A',
      status: 'ACTIVE',
      firstName: '',
      middleName: '',
      lastName: '',
      mobileNumber: '',
      employeeId: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (proctor: Proctor) => {
    setEditingProctor(proctor);
    
    // Parse name for editing if fields are nested or not yet set
    const parts = proctor.name.split(' ');
    let title = '';
    let startIdx = 0;
    if (['Dr.', 'Prof.', 'Engr.', 'Ms.', 'Mr.'].includes(parts[0])) {
      title = parts[0];
      startIdx = 1;
    }
    const realParts = parts.slice(startIdx);
    let firstName = '';
    let middleName = '';
    let lastName = '';
    
    if (realParts.length === 1) {
      firstName = realParts[0];
    } else if (realParts.length === 2) {
      firstName = realParts[0];
      lastName = realParts[1];
    } else if (realParts.length > 2) {
      if (realParts[realParts.length - 2].endsWith('.') || realParts[realParts.length - 2].length === 1) {
        firstName = realParts.slice(0, -2).join(' ');
        middleName = realParts[realParts.length - 2];
        lastName = realParts[realParts.length - 1];
      } else {
        firstName = realParts[0];
        middleName = realParts.slice(1, -1).join(' ');
        lastName = realParts[realParts.length - 1];
      }
    }
    
    if (title) {
      firstName = `${title} ${firstName}`;
    }

    setFormData({
      ...proctor,
      firstName: proctor.firstName || firstName,
      middleName: proctor.middleName || middleName,
      lastName: proctor.lastName || lastName,
      mobileNumber: proctor.mobileNumber || '',
      employeeId: proctor.employeeId || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (addMode === 'MULTIPLE' && !editingProctor) {
      const emailsList = multipleEmails
        .split(/[\n,;]/)
        .map(x => x.trim())
        .filter(x => x.includes('@'));
      
      const newProctors: Proctor[] = emailsList.map((email, index) => {
        const username = email.split('@')[0];
        const firstName = username.charAt(0).toUpperCase() + username.slice(1);
        const lastName = 'Supervisor';
        const fullName = `${firstName} ${lastName}`;
        return {
          id: `PRC-${String(proctors.length + 1 + index).padStart(3, '0')}`,
          name: fullName,
          firstName,
          middleName: '',
          lastName,
          email,
          center: formData.center || (isTestingCenterAdmin ? adminCenter : 'N/A'),
          status: 'ACTIVE',
          rating: 5.0,
          experience: 'Certified Supervisor',
          avatar: `https://images.unsplash.com/photo-${1500000000000 + index * 100}?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80`
        };
      });

      if (newProctors.length > 0) {
        setProctors(prev => [...prev, ...newProctors]);
      }
      setIsModalOpen(false);
      return;
    }

    const fullName = [formData.firstName, formData.middleName, formData.lastName]
      .map(s => s?.trim())
      .filter(Boolean)
      .join(' ');

    const finalData: Proctor = {
      ...formData,
      name: fullName,
      center: formData.center || (isTestingCenterAdmin ? adminCenter : 'N/A'),
      status: formData.status || 'ACTIVE'
    } as Proctor;

    if (editingProctor) {
      setProctors(prev => prev.map(p => p.id === editingProctor.id ? { ...p, ...finalData } : p));
    } else {
      const newProctor: Proctor = {
        ...finalData,
        id: `PRC-${String(proctors.length + 1).padStart(3, '0')}`,
      };
      setProctors(prev => [...prev, newProctor]);
    }
    setIsModalOpen(false);
  };

  const filteredProctors = centerProctors.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.center.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalCount = centerProctors.length;
  const activeCount = centerProctors.filter(p => p.status === 'ACTIVE').length;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-philsa-navy tracking-tight leading-none mb-3">
             {isTestingCenterAdmin ? `Proctor Management` : 'Proctor Management'}
          </h1>
          <p className="text-philsa-gray font-medium max-w-2xl">
             {isTestingCenterAdmin 
               ? `Registry of certified proctors and examination supervisors for ${user?.university || adminCenter}.`
               : 'Registry of certified PhilSA proctors and examination supervisors nationwide.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
           <button 
             onClick={handleOpenAddModal}
             className="px-6 py-3 bg-philsa-navy text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-philsa-navy/20 hover:scale-[1.02] transition-all flex items-center gap-2 cursor-pointer"
           >
              <Plus className="w-4 h-4" /> Add Proctor
           </button>
        </div>
      </div>


      {/* Tab Switcher */}
      <div className="flex border-b border-[#8A1538]/20 gap-8 mb-4">
        <button
          onClick={() => {
            setActiveTab('DIRECTORY');
            setSearchTerm('');
          }}
          className={cn(
            "pb-4 text-[11px] font-black uppercase tracking-widest border-b-2 px-1 transition-all flex items-center gap-2 cursor-pointer duration-200",
            activeTab === 'DIRECTORY'
              ? "border-[#8A1538] text-[#8A1538]"
              : "border-transparent text-slate-400 hover:text-[#8A1538]"
          )}
        >
          <Users className="w-4 h-4" /> Proctor Directory
        </button>
        <button
          onClick={() => {
            setActiveTab('ATTENDANCE');
            setSearchTerm('');
          }}
          className={cn(
            "pb-4 text-[11px] font-black uppercase tracking-widest border-b-2 px-1 transition-all flex items-center gap-2 cursor-pointer duration-200",
            activeTab === 'ATTENDANCE'
              ? "border-[#8A1538] text-[#8A1538]"
              : "border-transparent text-slate-400 hover:text-[#8A1538]"
          )}
        >
          <CheckSquare className="w-4 h-4" /> Proctor Attendance Lists
        </button>
      </div>

      {activeTab === 'DIRECTORY' ? (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
             {[
               { label: 'Certified Proctors', value: String(totalCount), sub: isTestingCenterAdmin ? 'Assigned to your center' : '+12 this month' },
               { label: 'Active Today', value: String(activeCount), sub: isTestingCenterAdmin ? 'Available for sessions' : 'Across 14 centers' },
               { label: 'Average Rating', value: '4.8', sub: 'Post-exam survey' },
               { label: 'Compliance Rate', value: '99.2%', sub: 'Audit verified' },
             ].map((stat, i) => (
               <div key={i} className="card-philsa p-6 bg-white border border-philsa-border shadow-xl shadow-philsa-navy/5">
                  <p className="text-[10px] font-black text-philsa-gray uppercase tracking-widest mb-1">{stat.label}</p>
                  <h3 className="text-2xl font-black text-philsa-navy tracking-tight leading-none mb-1">{stat.value}</h3>
                  <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-wide">{stat.sub}</p>
               </div>
             ))}
          </div>

          {/* Main Table */}
          <div className="card-philsa !p-0 overflow-hidden shadow-2xl shadow-philsa-navy/5 bg-white border border-philsa-border">
             <div className="p-8 border-b border-philsa-border flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="relative flex-1 max-w-lg">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-philsa-gray" />
                   <input 
                     type="text" 
                     placeholder="Search by name, ID, or institution..." 
                     className="w-full bg-philsa-bg/50 border border-philsa-border rounded-xl pl-12 pr-4 py-3.5 text-sm font-medium focus:ring-2 focus:ring-philsa-navy/10 outline-none transition-all shadow-inner"
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                   />
                </div>
                <div className="flex gap-3">
                   <button className="px-4 py-2 bg-white border border-philsa-border rounded-xl text-[10px] font-black uppercase tracking-widest text-philsa-navy shadow-sm flex items-center gap-2">
                      <Filter className="w-3.5 h-3.5" /> All Status
                   </button>
                </div>
             </div>

             <div className="overflow-x-auto">
                <table className="w-full text-left">
                   <thead className="bg-philsa-bg/50 text-[10px] text-philsa-gray font-black uppercase tracking-widest border-b border-philsa-border">
                      <tr>
                         <th className="px-10 py-6">Personnel Information</th>
                         <th className="px-10 py-6">Assigned Hub</th>
                         <th className="px-10 py-6">System Status</th>
                         <th className="px-10 py-6 text-right">Actions</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-philsa-border">
                      {filteredProctors.map((proctor) => (
                        <tr key={proctor.id} className="hover:bg-philsa-bg/30 transition-colors group">
                           <td className="px-10 py-7">
                              <div className="flex items-center gap-4">
                                 <div className="w-12 h-12 bg-philsa-navy/5 rounded-2xl flex items-center justify-center text-philsa-navy font-black text-lg border border-philsa-navy/10 shadow-inner">
                                    {proctor.name[0]}
                                 </div>
                                 <div>
                                    <p className="text-sm font-black text-philsa-navy tracking-tight">{proctor.name}</p>
                                    <div className="flex items-center gap-3 mt-1">
                                       <div className="flex items-center gap-1 text-[10px] font-bold text-philsa-gray">
                                          <Mail className="w-3 h-3" /> {proctor.email}
                                       </div>
                                    </div>
                                 </div>
                              </div>
                           </td>
                           <td className="px-10 py-7">
                              <div className="flex items-center gap-2">
                                 <MapPin className="w-3.5 h-3.5 text-philsa-navy/50" />
                                 <span className="text-xs font-black text-philsa-navy uppercase tracking-tight">{proctor.center}</span>
                              </div>
                           </td>
                           <td className="px-10 py-7">
                              <span className={cn(
                                 "px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
                                 getStatusColor(proctor.status)
                              )}>
                                 {proctor.status}
                              </span>
                           </td>
                           <td className="px-10 py-7 text-right">
                              <button 
                                onClick={() => handleOpenEditModal(proctor)}
                                className="p-3 bg-white hover:bg-philsa-navy hover:text-white text-philsa-navy rounded-xl transition-all border border-philsa-border shadow-sm cursor-pointer"
                                title="Edit Proctor"
                              >
                                 <Pencil className="w-4 h-4" />
                              </button>
                           </td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
             
             <div className="p-8 border-t border-philsa-border bg-slate-50 flex justify-between items-center">
                <p className="text-[10px] text-philsa-gray font-bold uppercase tracking-widest">Showing {filteredProctors.length} certified personnel</p>
                <div className="flex gap-2">
                   <button className="px-4 py-2 bg-white border border-philsa-border rounded-lg text-xs font-bold text-philsa-gray disabled:opacity-50" disabled>Previous</button>
                   <button className="px-4 py-2 bg-white border border-philsa-border rounded-lg text-xs font-bold text-philsa-navy shadow-sm">Next</button>
                </div>
             </div>
          </div>
        </>
      ) : (
        <div className="space-y-6">
          {/* Attendance search filter toolbar */}
          <div className="bg-white p-6 rounded-3xl border border-philsa-border shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 font-sans">
             <div className="relative flex-1 max-w-lg">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search student name, candidate ID, proctor, workstation seat..." 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-[#8A1538]/20 outline-none transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
             
             <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                   <Filter className="w-3.5 h-3.5 text-philsa-gray" />
                   <span className="text-[10px] font-black uppercase text-philsa-gray tracking-wider">Center Venue:</span>
                   <select
                     value={attendanceCenterFilter}
                     onChange={(e) => setAttendanceCenterFilter(e.target.value)}
                     className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#8A1538]/20 cursor-pointer"
                   >
                      <option value="ALL">All Centers</option>
                      {testingCentersList.map((center, idx) => (
                         <option key={idx} value={center}>{center}</option>
                      ))}
                   </select>
                </div>

                <div className="flex items-center gap-2 bg-emerald-50 text-[10px] text-emerald-800 font-extrabold px-4 py-2 rounded-xl border border-emerald-100 uppercase tracking-widest">
                   <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" /> Session: {isTestingCenterAdmin ? adminCenter : "Active Centers"}
                </div>
             </div>
          </div>

          {/* List of proctors with nested tables of their assigned student candidates */}
          <div className="space-y-6">
            {filteredProctors
              .filter(p => attendanceCenterFilter === 'ALL' || p.center === attendanceCenterFilter)
              .map((proctor) => {
              const students = proctorStudents[proctor.id] || [];
              
              // Apply searching to both proctor name and student properties
              const isMatchProctor = proctor.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                     proctor.center.toLowerCase().includes(searchTerm.toLowerCase());
              
              const filteredStudents = students.filter(s => 
                s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.seat.toLowerCase().includes(searchTerm.toLowerCase())
              );

              // Skip this proctor card if search active and no match
              const hasSearchValue = searchTerm.trim() !== '';
              if (hasSearchValue && !isMatchProctor && filteredStudents.length === 0) {
                return null;
              }

              const studentsToRender = hasSearchValue && !isMatchProctor ? filteredStudents : students;

              // Compute statistics
              const totalCount = students.length;
              const presentCount = students.filter(s => s.status === 'PRESENT').length;
              const pendingCount = students.filter(s => s.status === 'PENDING').length;
              const absentCount = students.filter(s => s.status === 'ABSENT').length;
              const technicalIssueCount = students.filter(s => s.status === 'TECHNICAL_ISSUE').length;

              return (
                <div key={proctor.id} className="bg-white rounded-3xl border border-philsa-border shadow-sm overflow-hidden animate-in fade-in duration-300">
                  {/* Proctor Info Banner */}
                  <div className="p-6 bg-slate-50/70 border-b border-philsa-border flex flex-col md:flex-row md:items-center justify-between gap-4 font-sans">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-[#8A1538] text-white rounded-2xl flex items-center justify-center font-black text-sm shadow-md">
                        {proctor.name.split(' ').filter(w => !['Dr.', 'Prof.', 'Engr.'].includes(w))[0]?.charAt(0) || 'P'}
                      </div>
                      <div>
                        <div className="flex items-baseline gap-2">
                          <h3 className="font-extrabold text-sm text-philsa-navy">{proctor.name}</h3>
                          <span className="text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono font-bold">{proctor.id}</span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-philsa-red" /> Testing Center Location : {proctor.center}
                        </p>
                      </div>
                    </div>

                    {/* Counts overview */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-[9px] font-black uppercase tracking-wider text-slate-600">
                        {totalCount} Total Candidates
                      </span>
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-lg text-[9px] font-black uppercase tracking-wider">
                        {presentCount} Present
                      </span>
                      <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-100 rounded-lg text-[9px] font-black uppercase tracking-wider">
                        {absentCount} Absent
                      </span>
                      {technicalIssueCount > 0 && (
                        <span className="px-2.5 py-1 bg-rose-50 text-rose-800 border border-rose-100 rounded-lg text-[9px] font-black uppercase tracking-wider animate-pulse">
                          {technicalIssueCount} Flagged Issues
                        </span>
                      )}
                      {pendingCount > 0 && (
                        <span className="px-2.5 py-1 bg-blue-50 text-blue-800 border border-blue-100 rounded-lg text-[9px] font-black uppercase tracking-wider">
                          {pendingCount} Pending
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Student list grouped table */}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-xs font-sans">
                      <thead>
                        <tr className="bg-slate-50/40 text-[9px] text-slate-400 font-black uppercase tracking-widest border-b border-slate-100">
                          <th className="px-8 py-4">Student Candidate</th>
                          <th className="px-8 py-4">Workstation Seat</th>
                          <th className="px-8 py-4">Hardware Integrity</th>
                          <th className="px-8 py-4">Attendance Verification</th>
                          <th className="px-8 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {studentsToRender.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-8 py-8 text-center text-slate-400 italic">
                              No candidate students found under this proctor room.
                            </td>
                          </tr>
                        ) : (
                          studentsToRender.map((student) => (
                            <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-8 py-4">
                                <div className="font-extrabold text-sm text-slate-700">{student.name}</div>
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">{student.id}</div>
                              </td>
                              <td className="px-8 py-4 font-mono font-bold text-philsa-navy">
                                <span className="bg-slate-100 border border-slate-200 py-1 px-2.5 rounded-lg text-xs text-slate-800">
                                   {student.seat}
                                </span>
                              </td>
                              <td className="px-8 py-4 font-mono">
                                <div className="flex items-center gap-2">
                                  <span className={cn(
                                    "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider",
                                    student.device === 'COMPATIBLE'
                                      ? 'bg-emerald-50 text-emerald-800'
                                      : 'bg-red-50 text-red-800 animate-pulse'
                                  )}>
                                    <Monitor className="w-3.5 h-3.5 inline mr-1" />
                                    {student.device === 'COMPATIBLE' ? 'SECURE_NODE' : 'LOCKOUT_LOCK'}
                                  </span>
                                  {student.status === 'PRESENT' && (
                                    <span className="text-[9px] text-slate-400">
                                      <Smartphone className="w-3 h-3 inline mr-0.5" />
                                      {student.battery}% Pwr
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-8 py-4">
                                <span className={cn(
                                  "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wide",
                                  student.status === 'PRESENT' && 'bg-emerald-100 text-emerald-800',
                                  student.status === 'PENDING' && 'bg-slate-100 text-slate-500',
                                  student.status === 'ABSENT' && 'bg-amber-100 text-amber-800',
                                  student.status === 'TECHNICAL_ISSUE' && 'bg-red-100 text-[#8A1538]'
                                )}>
                                  {student.status === 'PRESENT' && 'Present'}
                                  {student.status === 'PENDING' && 'Pending Check-In'}
                                  {student.status === 'ABSENT' && 'Absent / Expelled'}
                                  {student.status === 'TECHNICAL_ISSUE' && 'Technical Block'}
                                </span>
                              </td>
                              <td className="px-8 py-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {student.status !== 'PRESENT' && (
                                    <button
                                      onClick={() => updateStudentStatus(proctor.id, student.id, 'PRESENT')}
                                      className="py-1 px-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-extrabold text-[9px] rounded-lg tracking-wider transition-all uppercase cursor-pointer"
                                      title="Mark Present"
                                    >
                                      Check In
                                    </button>
                                  )}
                                  {student.status !== 'ABSENT' && (
                                    <button
                                      onClick={() => updateStudentStatus(proctor.id, student.id, 'ABSENT')}
                                      className="py-1 px-2.5 bg-slate-100 text-slate-600 hover:bg-slate-200 font-extrabold text-[9px] rounded-lg tracking-wider transition-all uppercase cursor-pointer"
                                      title="Mark Absent"
                                    >
                                      Absent
                                    </button>
                                  )}
                                  {student.status !== 'TECHNICAL_ISSUE' && (
                                    <button
                                      onClick={() => updateStudentStatus(proctor.id, student.id, 'TECHNICAL_ISSUE')}
                                      className="py-1 px-2.5 bg-red-50 text-red-700 hover:bg-red-100 font-extrabold text-[9px] rounded-lg tracking-wider transition-all uppercase cursor-pointer"
                                      title="Flag Technical Lockout"
                                    >
                                      Flag Lock
                                    </button>
                                  )}
                                  {student.status !== 'PENDING' && (
                                    <button
                                      onClick={() => updateStudentStatus(proctor.id, student.id, 'PENDING')}
                                      className="py-1 px-2.5 bg-white border border-slate-100 hover:bg-slate-50 text-slate-400 font-extrabold text-[9px] rounded-lg tracking-wider transition-all uppercase cursor-pointer"
                                      title="Reset"
                                    >
                                      Reset
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Proctor Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-philsa-navy/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-[32px] border border-philsa-border shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-philsa-border flex items-center justify-between bg-philsa-bg/50">
                <div>
                  <h2 className="text-2xl font-black text-philsa-navy tracking-normal font-sans uppercase">
                    {editingProctor ? 'Edit Proctor Details' : 'Register New Proctor'}
                  </h2>
                  <p className="text-xs font-bold text-philsa-gray uppercase tracking-normal mt-1 font-sans">
                    {editingProctor ? `Updating ${editingProctor.id}` : 'Fill in the certification details'}
                  </p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-philsa-navy/5 rounded-xl transition-colors"
                >
                  <X className="w-6 h-6 text-philsa-gray" />
                </button>
              </div>

               <form onSubmit={handleSave} className="p-8 space-y-6">
                {!editingProctor && (
                  <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setAddMode('INDIVIDUAL')}
                      className={cn(
                        "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all",
                        addMode === 'INDIVIDUAL' 
                          ? "bg-white text-slate-800 shadow-sm" 
                          : "text-slate-500 hover:text-slate-800"
                      )}
                    >
                      Individual Details
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddMode('MULTIPLE')}
                      className={cn(
                        "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all",
                        addMode === 'MULTIPLE' 
                          ? "bg-white text-slate-800 shadow-sm" 
                          : "text-slate-500 hover:text-slate-800"
                      )}
                    >
                      Multiple Proctors
                    </button>
                  </div>
                )}

                {addMode === 'MULTIPLE' && !editingProctor ? (
                  <div className="space-y-2 animate-in fade-in duration-200">
                    <label className="text-[10px] font-black text-philsa-gray uppercase tracking-normal ml-1 font-sans">
                      Proctors' Email Addresses *
                    </label>
                    <textarea
                      required
                      rows={5}
                      placeholder="Enter emails separated by commas, semicolons or newlines..."
                      className="w-full bg-philsa-bg border rounded-xl px-4 py-3 text-sm font-bold focus:ring-4 focus:ring-philsa-navy/5 focus:outline-none transition-all shadow-inner border-philsa-border/50 font-sans"
                      value={multipleEmails}
                      onChange={e => setMultipleEmails(e.target.value)}
                    />
                    <p className="text-[10px] text-slate-400 font-medium ml-1">
                      Quick registration: Each email address will automatically generate a proctor profile within the assigned testing hub.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-200">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-philsa-gray uppercase tracking-normal ml-1 font-sans">First Name *</label>
                      <input 
                        type="text" 
                        required
                        className="w-full bg-philsa-bg border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-4 focus:ring-philsa-navy/5 outline-none transition-all shadow-inner border border-philsa-border/50 font-sans"
                        value={formData.firstName || ''}
                        onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-philsa-gray uppercase tracking-normal ml-1 font-sans">Middle Name</label>
                      <input 
                        type="text" 
                        className="w-full bg-philsa-bg border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-4 focus:ring-philsa-navy/5 outline-none transition-all shadow-inner border border-philsa-border/50 font-sans"
                        value={formData.middleName || ''}
                        onChange={e => setFormData({ ...formData, middleName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-philsa-gray uppercase tracking-normal ml-1 font-sans">Last Name *</label>
                      <input 
                        type="text" 
                        required
                        className="w-full bg-philsa-bg border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-4 focus:ring-philsa-navy/5 outline-none transition-all shadow-inner border border-philsa-border/50 font-sans"
                        value={formData.lastName || ''}
                        onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-philsa-gray uppercase tracking-normal ml-1 font-sans">Email Address *</label>
                      <input 
                        type="email" 
                        required
                        className="w-full bg-philsa-bg border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-4 focus:ring-philsa-navy/5 outline-none transition-all shadow-inner border border-philsa-border/50 font-sans"
                        value={formData.email || ''}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-philsa-gray uppercase tracking-normal ml-1 font-sans">Mobile Number (Optional)</label>
                      <input 
                        type="text" 
                        className="w-full bg-philsa-bg border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-4 focus:ring-philsa-navy/5 outline-none transition-all shadow-inner border border-philsa-border/50 font-sans"
                        value={formData.mobileNumber || ''}
                        onChange={e => setFormData({ ...formData, mobileNumber: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-philsa-gray uppercase tracking-normal ml-1 font-sans">Employee ID (Optional)</label>
                      <input 
                        type="text" 
                        className="w-full bg-philsa-bg border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-4 focus:ring-philsa-navy/5 outline-none transition-all shadow-inner border border-philsa-border/50 font-sans"
                        value={formData.employeeId || ''}
                        onChange={e => setFormData({ ...formData, employeeId: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-4 bg-white border border-philsa-border rounded-2xl text-[10px] font-black uppercase tracking-normal text-philsa-gray hover:bg-slate-50 transition-all font-sans"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-6 py-4 bg-philsa-navy text-white rounded-2xl text-[10px] font-black uppercase tracking-normal shadow-xl shadow-philsa-navy/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 font-sans"
                  >
                    <Save className="w-4 h-4" /> {editingProctor ? 'Update ' : 'Save Registration'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
