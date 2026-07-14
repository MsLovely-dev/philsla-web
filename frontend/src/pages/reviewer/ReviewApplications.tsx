import React, { useEffect, useState } from 'react';
import { 
  Search, Filter, Eye, CheckCircle, XCircle, 
  AlertTriangle, RefreshCw, Edit3, MoreVertical,
  User, Shield, ClipboardList, MapPin, 
  ExternalLink, ShieldAlert,
  Check, X, AlertCircle, ChevronDown, 
  Download, Clock, MessageSquare, History,
  Phone, Mail, BookOpen, ImageIcon, ChevronRight,
  FileText, ShieldCheck, Activity, LayoutDashboard, CheckCircle2,
  Upload, Plus, Power
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { usePhilSA } from '../../PhilSAContext';
import { useMockData, DUMMY_APPLICATIONS } from '../../services/mockService';
import { backendApplicationService, mapBackendApplicationsToReviewRows } from '../../services/backendApplicationService';

const STATUS_BADGES = {
  PENDING: 'bg-blue-50 text-blue-600 border-blue-200',
  VERIFIED: 'bg-indigo-50 text-indigo-600 border-indigo-200',
  FOR_CORRECTION: 'bg-amber-50 text-amber-600 border-amber-200',
  REASSIGNED: 'bg-purple-50 text-purple-600 border-purple-200',
  FRAUDULENT: 'bg-red-600 text-white border-philsa-red shadow-lg shadow-red-200',
  ACCEPTED: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  REJECTED: 'bg-slate-100 text-slate-500 border-slate-300'
};

export default function ReviewApplications() {
  const { user, inputModules } = usePhilSA();
  const isManualRegActive = inputModules?.find(m => m.id === 'admin_manual_reg')?.isActive !== false;
  const { schedules } = useMockData();
  const navigate = useNavigate();
  const [apps, setApps] = useState(DUMMY_APPLICATIONS.map(a => {
    const score = Math.floor(Math.random() * 100);
    let duplicateStatus = 'No Match';
    if (score > 85) duplicateStatus = 'High Risk Duplicate';
    else if (score > 60) duplicateStatus = 'Possible Duplicate';

    const storedSeat = localStorage.getItem(`philsa_applicant_seat_${a.id}`);
    const isApproved = a.status === 'ACCEPTED';

    return {
      ...a,
      risk: score > 85 ? 'HIGH' : score > 60 ? 'MEDIUM' : 'LOW',
      duplicateScore: score,
      duplicateStatus,
      center: schedules.find(s => s.id === a.examScheduleId)?.testCenter || 'Not Assigned',
      seat: storedSeat || (isApproved ? `Seat ${a.id.split('-')[1] || 'UP'}-110` : undefined),
      history: [
        { status: 'SUBMITTED', date: '2026-04-15 10:15', actor: 'System' },
        { status: 'VERIFIED_IDS', date: '2026-04-16 09:30', actor: 'PhilSys API' },
      ]
    };
  }));
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);
  const [queueError, setQueueError] = useState('');
  const [decisionError, setDecisionError] = useState('');
  const [isSavingDecision, setIsSavingDecision] = useState(false);

  const [activeModal, setActiveModal] = useState<'APPROVE' | 'REASSIGN' | 'CORRECTION' | 'FRAUD' | null>(null);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [rejectionReason, setRejectionReason] = useState('Unverifiable or fraudulent documents');
  const [customRejectionDetail, setCustomRejectionDetail] = useState('');

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [uploadTemplate, setUploadTemplate] = useState<'CSV' | 'XLSX' | 'JSON'>('CSV');
  const [dragActive, setDragActive] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const [newStudent, setNewStudent] = useState({
    fullName: '',
    dob: '',
    schoolName: '',
    lrn: '',
    idFileName: '',
    idFileDataUrl: '',
    email: '',
    mobile: '09171234567'
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleOpenAction = (app: any, type: typeof activeModal) => {
     setSelectedApp(app);
     setActiveModal(type);
  };

  const handleOpenView = (app: any) => {
    navigate(`/admin/reviewer/applications/${app.id}`);
  };

  useEffect(() => {
    if (import.meta.env.VITE_AUTH_SERVICE_MODE !== 'backend') return;

    let cancelled = false;
    setIsLoadingQueue(true);
    setQueueError('');

    void backendApplicationService.listReviewQueue().then((result) => {
      if (cancelled) return;
      setIsLoadingQueue(false);

      if (result.ok === false) {
        setQueueError(result.error.message);
        return;
      }

      setApps(mapBackendApplicationsToReviewRows(result.data));
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const closeModal = () => {
     setActiveModal(null);
     setSelectedApp(null);
     setDecisionError('');
  };

  const handleReviewerDecision = async (
    decision: 'APPROVE' | 'REQUEST_CORRECTION' | 'REJECT',
    options: { reason?: string; requiredCorrections?: string[]; seat?: string } = {},
  ) => {
    if (!selectedApp) return;

    if (import.meta.env.VITE_AUTH_SERVICE_MODE !== 'backend') {
      const nextStatus = decision === 'APPROVE' ? 'ACCEPTED' : decision === 'REQUEST_CORRECTION' ? 'FOR_CORRECTION' : 'REJECTED';
      setApps(prev => prev.map(a => a.id === selectedApp.id ? { ...a, status: nextStatus, seat: options.seat ?? a.seat } : a));
      if (options.seat) localStorage.setItem(`philsa_applicant_seat_${selectedApp.id}`, options.seat);
      closeModal();
      return;
    }

    setIsSavingDecision(true);
    setDecisionError('');
    const result = await backendApplicationService.decideApplication(selectedApp.id, decision, {
      reason: options.reason,
      requiredCorrections: options.requiredCorrections,
    });
    setIsSavingDecision(false);

    if (result.ok === false) {
      setDecisionError(result.error.message);
      return;
    }

    const [updated] = mapBackendApplicationsToReviewRows([result.data]);
    setApps(prev => prev.map(a => a.id === selectedApp.id ? { ...a, ...updated, seat: options.seat ?? a.seat } : a));
    if (options.seat) localStorage.setItem(`philsa_applicant_seat_${selectedApp.id}`, options.seat);
    closeModal();
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-philsa-navy mb-2 tracking-tight">Application Review Ledger</h1>
          <p className="text-philsa-gray text-xs font-black uppercase tracking-[0.2em] opacity-60">PhilSLA Admission Intelligence Unit</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
           <button 
             onClick={() => {
               setUploadSuccess(null);
               setIsUploadOpen(true);
             }}
             className="btn-secondary !bg-philsa-navy !text-white hover:opacity-90 flex items-center gap-2"
           >
              <Upload className="w-4 h-4" /> Upload Student List
           </button>
           <button 
             onClick={() => {
               setFormErrors({});
               setIsAddOpen(true);
             }}
             className="btn-primary flex items-center gap-2"
           >
              <Plus className="w-4 h-4" /> Add Student
           </button>
           <button className="btn-secondary flex items-center gap-2">
              <Download className="w-4 h-4" /> Export Batch
           </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Pending Review', value: '842', color: 'amber', icon: Clock, change: '+12%' },
          { label: 'Verified Today', value: '156', color: 'emerald', icon: CheckCircle2, change: '+5%' },
          { label: 'Reassigned', value: '28', color: 'blue', icon: RefreshCw, change: 'Steady' }
        ].map((stat, i) => (
          <div key={i} className="card-philsa !p-6 flex items-center gap-5 bg-white border border-philsa-border">
            <div className={`w-2 h-10 rounded-full ${
              stat.color === 'philsa-red' ? 'bg-philsa-red' : 
              stat.color === 'emerald' ? 'bg-emerald-500' :
              stat.color === 'amber' ? 'bg-amber-500' : 'bg-philsa-navy'
            }`} />
            <div>
              <p className="text-[10px] font-black text-philsa-gray uppercase tracking-widest mb-1 leading-none">{stat.label}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl font-black text-philsa-navy tracking-tighter leading-none">{stat.value}</span>
                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${stat.color === 'philsa-red' ? 'bg-red-50 text-philsa-red' : 'bg-emerald-50 text-emerald-600'}`}>
                  {stat.change}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card-philsa !p-0 overflow-hidden">
        {queueError && (
          <div className="mx-6 mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-700">
            {queueError}
          </div>
        )}
        <div className="p-6 border-b border-philsa-border flex flex-wrap gap-4 items-center justify-between">
           <div className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-philsa-gray" />
              <input 
                type="text" 
                placeholder="Search Applicant ID, Name, or University..." 
                className="w-full bg-philsa-bg border-none rounded-xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-philsa-red/10 transition-all font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
           </div>
           <div className="flex items-center gap-3">
              <div className="flex bg-philsa-bg p-1 rounded-xl">
                {['ALL', 'PENDING', 'ASSIGNED', 'REJECTED'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={cn(
                      "px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                      statusFilter === status 
                        ? 'bg-white text-philsa-navy shadow-sm' 
                        : 'text-philsa-gray hover:text-philsa-navy'
                    )}
                  >
                    {status}
                  </button>
                ))}
              </div>
              <button className="btn-secondary py-2.5 px-4 text-sm flex items-center gap-2">
                <Filter className="w-4 h-4" /> Filters
              </button>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-philsa-bg text-[10px] text-philsa-gray font-black uppercase tracking-[0.2em]">
              <tr>
                <th className="px-8 py-5">Applicant Information</th>
                <th className="px-8 py-5">Target Center</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-philsa-border">
              {isLoadingQueue && (
                <tr>
                  <td colSpan={4} className="px-8 py-10 text-center text-xs font-black uppercase tracking-widest text-philsa-gray">
                    Loading backend review queue...
                  </td>
                </tr>
              )}
              {!isLoadingQueue && apps.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-8 py-10 text-center text-xs font-black uppercase tracking-widest text-philsa-gray">
                    No submitted applications found.
                  </td>
                </tr>
              )}
              {!isLoadingQueue && apps.filter(app => {
                const matchesSearch = `${app.firstName} ${app.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) || app.id.toLowerCase().includes(searchTerm.toLowerCase());
                const matchesStatus = statusFilter === 'ALL' || app.status === statusFilter;
                return matchesSearch && matchesStatus;
              }).map((app) => (
                <tr key={app.id} className="hover:bg-philsa-bg/40 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl overflow-hidden border border-philsa-border shadow-sm shrink-0 bg-philsa-bg relative">
                        <img referrerPolicy="no-referrer" src={app.photoUrl} alt="" className="w-full h-full object-cover" />
                        {app.duplicateScore > 70 && (
                          <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-philsa-red rounded-full border-2 border-white flex items-center justify-center">
                            <AlertCircle className="w-2 h-2 text-white" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-philsa-navy mb-0.5">{app.firstName} {app.lastName}</p>
                        <p className="text-[10px] text-philsa-gray font-bold tracking-wider uppercase">{app.id} • {app.mobile}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-sm font-medium text-philsa-navy">{app.center}</p>
                    {app.seat ? (
                      <span className="text-[10px] text-emerald-600 font-extrabold bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100 flex items-center gap-1 w-fit mt-1 animate-fade-in">
                        <Check className="w-3.5 h-3.5 text-emerald-500" /> {app.seat}
                      </span>
                    ) : (
                      <p className="text-[10px] text-philsa-gray font-medium italic">{app.universities[0]}</p>
                    )}
                  </td>
                  <td className="px-8 py-5">
                    <span className={cn(
                      "text-[10px] font-black px-3 py-1 rounded-full tracking-widest border shadow-sm",
                      STATUS_BADGES[app.status as keyof typeof STATUS_BADGES] || 'bg-slate-100 text-slate-700'
                    )}>
                      {app.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handleOpenView(app)}
                        className="p-2 text-philsa-navy hover:bg-philsa-bg rounded-lg transition-colors border border-philsa-border shadow-sm cursor-pointer"
                        title="View Application"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                         onClick={() => handleOpenAction(app, 'APPROVE')}
                         className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-emerald-100 shadow-sm cursor-pointer"
                         title="Approve Application"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setSelectedApp(app)}
                        className="p-2 text-philsa-gray hover:bg-philsa-bg rounded-lg transition-colors border border-philsa-border shadow-sm cursor-pointer"
                        title="More Actions"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="px-8 py-4 bg-philsa-bg/50 border-t border-philsa-border flex items-center justify-between">
           <p className="text-[10px] text-philsa-gray font-bold uppercase tracking-widest">System Registry Active • Showing {apps.length} applicants</p>
           <div className="flex gap-2">
             <button className="px-3 py-1 bg-white border border-philsa-border rounded text-xs font-bold text-philsa-gray disabled:opacity-50">Previous</button>
             <button className="px-3 py-1 bg-white border border-philsa-border rounded text-xs font-bold text-philsa-navy">1</button>
             <button className="px-3 py-1 bg-white border border-philsa-border rounded text-xs font-bold text-philsa-gray disabled:opacity-50">Next</button>
           </div>
        </div>
      </div>


      {/* --- MODALS & DRAWERS --- */}
      <AnimatePresence>
        {/* APPROVAL MODAL */}
        {activeModal === 'APPROVE' && selectedApp && (
          <ModalWrapper title="Confirm Application" onClose={closeModal}>
             <div className="space-y-6 text-philsa-navy">
                <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-100 rounded-xl">
                   <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 shadow-sm shrink-0 bg-slate-200">
                      <img referrerPolicy="no-referrer" src={selectedApp.photoUrl} alt="" className="w-full h-full object-cover" />
                   </div>
                   <div>
                       <h3 className="text-sm font-bold text-philsa-navy leading-none mb-1">{selectedApp.firstName || selectedApp.name} {selectedApp.lastName || ''}</h3>
                       <p className="text-[10px] font-semibold text-slate-400 font-mono leading-none">{selectedApp.id}</p>
                   </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                   Are you sure you want to approve this application? Approving confirms that the applicant has passed all admission verification requirements.
                </p>

                <div className="flex gap-3 justify-end border-t border-slate-100 pt-4">
                   {decisionError && <p className="mr-auto text-[10px] font-bold text-philsa-red">{decisionError}</p>}
                   <button onClick={closeModal} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-slate-100 transition-all cursor-pointer">
                      Cancel
                   </button>
                   <button disabled={isSavingDecision} onClick={() => {
                       const seatVal = `Seat ${selectedApp.center ? selectedApp.center.split(" ").map((w) => w[0]).join("").toUpperCase() : "UPD"}-${100 + Math.floor(Math.random() * 900)}`;
                       void handleReviewerDecision('APPROVE', { reason: 'Verified by admissions reviewer.', seat: seatVal });
                   }} className="px-5 py-2 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-600/10 hover:bg-emerald-700 transition-all cursor-pointer disabled:opacity-60">
                      {isSavingDecision ? 'Saving...' : 'Confirm'}
                   </button>
                </div>
             </div>
          </ModalWrapper>
        )}

        {/* REASSIGN MODAL */}
        {activeModal === 'REASSIGN' && selectedApp && (
          <ModalWrapper title="Relocation Protocol — Reassign Center" onClose={closeModal}>
             <div className="space-y-8 text-philsa-navy">
                <div className="grid grid-cols-2 gap-4">
                   <div className="p-5 bg-philsa-bg rounded-3xl border border-philsa-border">
                      <p className="text-[9px] font-black text-philsa-gray uppercase tracking-widest mb-1">Assigned Facility</p>
                      <p className="text-xs font-black uppercase tracking-tight">{selectedApp.center}</p>
                   </div>
                   <div className="p-5 bg-philsa-bg rounded-3xl border border-philsa-border">
                      <p className="text-[9px] font-black text-philsa-gray uppercase tracking-widest mb-1">Roster Allocation</p>
                      <p className="text-xs font-black uppercase tracking-tight">82% (High Capacity)</p>
                   </div>
                </div>

                <div className="space-y-4">
                   <label className="text-[10px] font-black uppercase tracking-widest opacity-60">System-Targeted Centers</label>
                   <div className="relative group">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-philsa-gray" />
                      <select className="w-full bg-white border border-philsa-border rounded-2xl pl-12 pr-10 py-5 text-sm font-black uppercase tracking-tight outline-none focus:ring-2 focus:ring-philsa-navy/5 appearance-none group-hover:border-philsa-navy transition-all">
                         <option>PUP ICT Center — 142 Seats Avail (Operational)</option>
                         <option>UP Manila CMS — 12 Seats Avail (Near Full)</option>
                         <option disabled>UST Bldg A — 0 Seats (Under Maintenance)</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-philsa-gray pointer-events-none" />
                   </div>
                   <div className="grid grid-cols-2 gap-4 mt-2">
                       <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-600">
                          <CheckCircle className="w-3.5 h-3.5" /> PC Availability: 100%
                       </div>
                       <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-600">
                          <User className="w-3.5 h-3.5" /> Proctor Assignment: ACTIVE
                       </div>
                   </div>
                </div>

                <div className="p-6 bg-amber-50 border border-amber-100 rounded-3xl flex items-start gap-4">
                   <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                   <div>
                      <p className="text-[11px] font-black uppercase tracking-tight text-amber-900 mb-1">Institutional Redistribution Triggered</p>
                      <p className="text-xs font-medium text-amber-800 leading-relaxed">
                         Reassigning this applicant will automatically invalidate their current physical permit and trigger an immediate notification dispatch.
                      </p>
                   </div>
                </div>

                <div className="flex gap-4">
                   <button onClick={closeModal} className="flex-1 py-4 bg-philsa-bg border border-philsa-border rounded-2xl text-philsa-navy font-black uppercase tracking-widest text-[10px]">Cancel</button>
                   <button onClick={closeModal} className="flex-1 py-4 bg-philsa-navy text-white shadow-xl shadow-philsa-navy/20 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-[1.02] active:scale-95 transition-all">Finalize Relocation</button>
                </div>
             </div>
          </ModalWrapper>
        )}

        {/* CORRECTION MODAL */}
        {activeModal === 'CORRECTION' && selectedApp && (
          <ModalWrapper title="For Correction Request" onClose={closeModal}>
             <div className="space-y-6 text-philsa-navy">
                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Identity Compliance Categories</label>
                   <div className="grid grid-cols-2 gap-2">
                      {['Incorrect Philsys Number', 'Blurry Document Upload', 'Missing LRN Trace', 'Profile Image Mismatch', 'Duplicate ID Detection'].map(cat => (
                        <label key={cat} className="flex items-center gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-150 transition-all group">
                           <input type="checkbox" className="w-4 h-4 rounded text-philsa-navy focus:ring-philsa-red cursor-pointer" />
                           <span className="text-[10px] font-black text-slate-700 uppercase tracking-tight">{cat}</span>
                        </label>
                      ))}
                   </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Reviewer Directives</label>
                   <textarea 
                     className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs font-semibold focus:bg-white focus:border-philsa-navy focus:ring-1 focus:ring-philsa-navy/10 outline-none h-24 resize-none"
                     placeholder="Provide precise instructions for documentation remediation..."
                   />
                </div>

                <div className="flex gap-3 justify-end border-t border-slate-100 pt-4">
                   {decisionError && <p className="mr-auto text-[10px] font-bold text-philsa-red">{decisionError}</p>}
                   <button onClick={closeModal} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-slate-100 transition-all cursor-pointer">
                      Cancel
                   </button>
                   <button disabled={isSavingDecision} onClick={() => {
                       void handleReviewerDecision('REQUEST_CORRECTION', {
                         reason: 'Applicant must correct the selected identity compliance items.',
                         requiredCorrections: ['identityDocumentation'],
                       });
                   }} className="px-5 py-2 bg-amber-600 text-white text-[10px] font-black uppercase tracking-wider rounded-xl shadow-lg shadow-amber-600/10 hover:bg-amber-700 transition-all cursor-pointer disabled:opacity-60">
                      {isSavingDecision ? 'Saving...' : 'For Correction Request'}
                   </button>
                </div>
             </div>
          </ModalWrapper>
        )}

        {/* FRAUD MODAL (Rejection) */}
        {activeModal === 'FRAUD' && selectedApp && (
          <ModalWrapper title="For Rejection" onClose={closeModal}>
             <div className="space-y-6 text-philsa-navy">
                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Reason for Rejection *</label>
                   <div className="space-y-2">
                      {[
                        "Unverifiable or fraudulent documents",
                        "Falsified personal information",
                        "Photo identification mismatch",
                        "Duplicate registration attempt",
                        "Ineligible academic criteria"
                      ].map((reason) => (
                        <label key={reason} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100/50 transition-all block">
                           <input 
                             type="radio" 
                             name="rejection-reason"
                             value={reason}
                             checked={rejectionReason === reason}
                             onChange={(e) => setRejectionReason(e.target.value)}
                             className="w-4 h-4 accent-philsa-red cursor-pointer" 
                           />
                           <span className="text-[10px] font-bold text-slate-700 uppercase tracking-tight">{reason}</span>
                        </label>
                      ))}
                   </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Additional Details (Optional)</label>
                   <textarea 
                     value={customRejectionDetail}
                     onChange={(e) => setCustomRejectionDetail(e.target.value)}
                     className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs font-semibold focus:bg-white focus:border-philsa-navy focus:ring-1 focus:ring-philsa-navy/10 outline-none h-20 resize-none"
                     placeholder="Add any specific comments about the rejection decision..."
                   />
                </div>

                <div className="flex gap-3 justify-end border-t border-slate-100 pt-4">
                   {decisionError && <p className="mr-auto text-[10px] font-bold text-philsa-red">{decisionError}</p>}
                   <button onClick={closeModal} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-slate-100 transition-all cursor-pointer">
                      Cancel
                   </button>
                   <button disabled={isSavingDecision} onClick={() => {
                       void handleReviewerDecision('REJECT', {
                         reason: customRejectionDetail ? `${rejectionReason}: ${customRejectionDetail}` : rejectionReason,
                       });
                   }} className="px-5 py-2 bg-philsa-red text-white text-[10px] font-black uppercase tracking-wider rounded-xl shadow-lg shadow-philsa-red/10 hover:bg-philsa-red/90 transition-all cursor-pointer disabled:opacity-60">
                      {isSavingDecision ? 'Saving...' : 'Confirm'}
                   </button>
                </div>
             </div>
          </ModalWrapper>
        )}

        {isUploadOpen && (
          <ModalWrapper title="Upload Student List" onClose={() => setIsUploadOpen(false)}>
            <div className="space-y-6">
              <div>
                <p className="text-xs text-philsa-gray font-bold mb-3 uppercase tracking-wider">Select and Download List Template:</p>
                <div className="grid grid-cols-3 gap-3">
                  <button 
                    type="button"
                    onClick={() => setUploadTemplate('CSV')}
                    className={cn(
                      "p-4 rounded-xl border flex flex-col items-center justify-center text-center gap-1.5 transition-all outline-none",
                      uploadTemplate === 'CSV' 
                        ? 'border-philsa-red bg-philsa-red/5 ring-2 ring-philsa-red/10' 
                        : 'border-philsa-border hover:border-philsa-navy hover:bg-slate-50'
                    )}
                  >
                    <Download className="w-5 h-5 text-philsa-red" />
                    <span className="font-extrabold text-[10px] text-philsa-navy uppercase tracking-wider">CSV Format</span>
                    <span className="text-[9px] text-philsa-gray font-medium">Plain Text</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setUploadTemplate('XLSX')}
                    className={cn(
                      "p-4 rounded-xl border flex flex-col items-center justify-center text-center gap-1.5 transition-all outline-none",
                      uploadTemplate === 'XLSX' 
                        ? 'border-emerald-600 bg-emerald-500/5 ring-2 ring-emerald-500/10' 
                        : 'border-philsa-border hover:border-philsa-navy hover:bg-slate-50'
                    )}
                  >
                    <Download className="w-5 h-5 text-emerald-600" />
                    <span className="font-extrabold text-[10px] text-philsa-navy uppercase tracking-wider">Excel Format</span>
                    <span className="text-[9px] text-philsa-gray font-medium">Spreadsheet</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setUploadTemplate('JSON')}
                    className={cn(
                      "p-4 rounded-xl border flex flex-col items-center justify-center text-center gap-1.5 transition-all outline-none",
                      uploadTemplate === 'JSON' 
                        ? 'border-indigo-600 bg-indigo-500/5 ring-2 ring-indigo-500/10' 
                        : 'border-philsa-border hover:border-philsa-navy hover:bg-slate-50'
                    )}
                  >
                    <Download className="w-5 h-5 text-indigo-600" />
                    <span className="font-extrabold text-[10px] text-philsa-navy uppercase tracking-wider">JSON Schema</span>
                    <span className="text-[9px] text-philsa-gray font-medium">Structured</span>
                  </button>
                </div>
              </div>

              <div 
                className={cn(
                  "border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer",
                  dragActive ? "border-philsa-red bg-philsa-red/5" : "border-philsa-border hover:border-philsa-red/30 bg-philsa-bg/30"
                )}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  setUploadSuccess(`Successfully ingested 3 student records from the dropped ${uploadTemplate} student ledger!`);
                  const importTime = new Date().toISOString();
                  const imported = [
                    {
                      id: `CAND-CSV-1004`,
                      userId: 'import1',
                      status: 'PENDING',
                      submittedAt: importTime,
                      firstName: 'Mateo',
                      middleName: 'Dela Cruz',
                      noMiddleName: false,
                      lastName: 'Santos',
                      dob: '2008-03-12',
                      photoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
                      birthPlace: 'Quezon City',
                      nationality: 'Filipino',
                      gender: 'Male',
                      email: 'mateo@gmail.com',
                      mobile: '09151234455',
                      lrn: '102345678901',
                      schoolName: 'Quezon City High School',
                      academicTrack: 'STEM',
                      gradeLevel: 'Grade 12',
                      gwa: 92.4,
                      universities: ['UP Diliman'],
                      courses: ['BS Civil Engineering'],
                      risk: 'LOW',
                      duplicateScore: 10,
                      center: 'UP Diliman',
                      history: [{ status: 'SUBMITTED', date: '2026-06-18 10:00', actor: 'Bulk Import' }]
                    },
                    {
                      id: `CAND-CSV-1005`,
                      userId: 'import2',
                      status: 'PENDING',
                      submittedAt: importTime,
                      firstName: 'Samantha',
                      middleName: 'Reyes',
                      noMiddleName: false,
                      lastName: 'Garcia',
                      dob: '2007-09-24',
                      photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
                      birthPlace: 'Pasig City',
                      nationality: 'Filipino',
                      gender: 'Female',
                      email: 'sam.garcia@outlook.com',
                      mobile: '09183457190',
                      lrn: '109876543210',
                      schoolName: 'Pasig National High School',
                      academicTrack: 'HUMSS',
                      gradeLevel: 'Grade 12',
                      gwa: 95.1,
                      universities: ['UP Los Baños'],
                      courses: ['BA Communication Arts'],
                      risk: 'LOW',
                      duplicateScore: 4,
                      center: 'UP Diliman',
                      history: [{ status: 'SUBMITTED', date: '2026-06-18 10:00', actor: 'Bulk Import' }]
                    }
                  ];
                  setApps(prev => [...imported, ...prev]);
                }}
                onClick={() => {
                  setUploadSuccess(`Successfully simulated parsing and ingestion of student records from matching ${uploadTemplate} template scheme file!`);
                  const importTime = new Date().toISOString();
                  const imported = [
                    {
                      id: `CAND-CSV-${Math.floor(1000 + Math.random() * 9000)}`,
                      userId: 'import3',
                      status: 'PENDING',
                      submittedAt: importTime,
                      firstName: 'Danilo',
                      middleName: 'Bautista',
                      noMiddleName: false,
                      lastName: 'Tolentino',
                      dob: '2008-11-04',
                      photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
                      birthPlace: 'Cebu',
                      nationality: 'Filipino',
                      gender: 'Male',
                      email: 'danilo@gmail.com',
                      mobile: '09228876611',
                      lrn: '105555444333',
                      schoolName: 'Cebu City Science High School',
                      academicTrack: 'STEM',
                      gradeLevel: 'Grade 12',
                      gwa: 96.0,
                      universities: ['UP Diliman'],
                      courses: ['BS Mechanical Engineering'],
                      risk: 'LOW',
                      duplicateScore: 15,
                      center: 'UP Diliman',
                      history: [{ status: 'SUBMITTED', date: '2026-06-18 10:00', actor: 'Bulk Import' }]
                    }
                  ];
                  setApps(prev => [...imported, ...prev]);
                }}
              >
                <div className="p-4 bg-slate-100 rounded-full text-slate-500 hover:text-philsa-navy hover:scale-105 transition-all">
                  <Upload className="w-8 h-8" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-philsa-navy">Drag & Drop file here, or click to browse</p>
                  <p className="text-xs text-philsa-gray mt-1 font-medium">Supports .{uploadTemplate.toLowerCase()} templates mapping</p>
                </div>
              </div>

              {uploadSuccess && (
                <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl flex items-center gap-3 text-xs font-bold leading-relaxed animate-fade-in">
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                  <p>{uploadSuccess}</p>
                </div>
              )}

              <div className="flex gap-3 justify-end pt-4 border-t border-philsa-border">
                <button 
                  onClick={() => setIsUploadOpen(false)} 
                  className="px-6 py-3 bg-white border border-philsa-border text-philsa-navy text-xs font-black uppercase tracking-wider rounded-2xl hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </ModalWrapper>
        )}

        {isAddOpen && (
          <ModalWrapper title="Add Student (Manual Registration)" onClose={() => setIsAddOpen(false)}>
            <div className="max-h-[60vh] overflow-y-auto px-2 py-4 space-y-4">
              {!isManualRegActive && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3">
                  <Power className="w-5 h-5 text-amber-500 animate-pulse shrink-0" />
                  <p className="text-xs text-amber-800 font-bold leading-normal">
                    Manual candidate intake has been temporarily deactivated in compliance settings. New registrations cannot be submitted.
                  </p>
                </div>
              )}
              <div className={cn("space-y-4", !isManualRegActive && "pointer-events-none select-none opacity-50")}>
                {/* Full name input */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-philsa-navy uppercase tracking-widest leading-none">Full Name *</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Juan dela Cruz"
                    className="w-full bg-philsa-bg border border-philsa-border rounded-xl px-4 py-2.5 text-sm font-semibold text-philsa-navy focus:outline-none focus:border-philsa-red"
                    value={newStudent.fullName}
                    onChange={e => setNewStudent({...newStudent, fullName: e.target.value})}
                  />
                  {formErrors.fullName && <p className="text-xs text-philsa-red font-bold">{formErrors.fullName}</p>}
                </div>

                {/* Date of birth input */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-philsa-navy uppercase tracking-widest leading-none">Birthdate *</label>
                  <input 
                    type="date" 
                    className="w-full bg-philsa-bg border border-philsa-border rounded-xl px-4 py-2.5 text-sm font-semibold text-philsa-navy focus:outline-none focus:border-philsa-red"
                    value={newStudent.dob}
                    onChange={e => setNewStudent({...newStudent, dob: e.target.value})}
                  />
                  {formErrors.dob && <p className="text-xs text-philsa-red font-bold">{formErrors.dob}</p>}
                </div>

                {/* School dropdown */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-philsa-navy uppercase tracking-widest leading-none">School *</label>
                  <select 
                    className="w-full bg-philsa-bg border border-philsa-border rounded-xl px-4 py-2.5 text-sm font-semibold text-philsa-navy focus:outline-none focus:border-philsa-red"
                    value={newStudent.schoolName}
                    onChange={e => setNewStudent({...newStudent, schoolName: e.target.value})}
                  >
                    <option value="">Select Philippine High School</option>
                    <option value="Philippine Science High School (Main Campus)">Philippine Science High School (Main Campus)</option>
                    <option value="Ateneo de Manila High School">Ateneo de Manila High School</option>
                    <option value="De La Salle University Integrated School">De La Salle University Integrated School</option>
                    <option value="University of Santo Tomas High School">University of Santo Tomas High School</option>
                    <option value="Manila Science High School">Manila Science High School</option>
                    <option value="Quezon City Science High School">Quezon City Science High School</option>
                    <option value="Makati Science High School">Makati Science High School</option>
                    <option value="Xavier School (San Juan)">Xavier School (San Juan)</option>
                    <option value="Miriam College High School">Miriam College High School</option>
                    <option value="Chiang Kai Shek College">Chiang Kai Shek College</option>
                    <option value="University of the Philippines High School in Iloilo">University of the Philippines High School in Iloilo</option>
                  </select>
                  {formErrors.schoolName && <p className="text-xs text-philsa-red font-bold">{formErrors.schoolName}</p>}
                </div>

                {/* LRN input */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-philsa-navy uppercase tracking-widest leading-none">Learner Reference Number (LRN) *</label>
                  <input 
                    type="text" 
                    placeholder="12-digit LRN"
                    className="w-full bg-philsa-bg border border-philsa-border rounded-xl px-4 py-2.5 text-sm font-semibold text-philsa-navy focus:outline-none focus:border-philsa-red"
                    value={newStudent.lrn}
                    onChange={e => setNewStudent({...newStudent, lrn: e.target.value})}
                  />
                  {formErrors.lrn && <p className="text-xs text-philsa-red font-bold">{formErrors.lrn}</p>}
                </div>

                {/* Student ID Upload */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-philsa-navy uppercase tracking-widest leading-none">Student ID *</label>
                  <div className={`mt-2 border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                    newStudent.idFileName ? 'border-emerald-400 bg-emerald-50/30' : 'border-slate-200 hover:border-philsa-red bg-slate-50/50'
                  }`}>
                    <input 
                      type="file" 
                      id="id-file-upload" 
                      className="hidden" 
                      accept="image/*,application/pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setNewStudent({
                            ...newStudent,
                            idFileName: file.name
                          });
                        }
                      }}
                    />
                    {newStudent.idFileName ? (
                      <div className="flex flex-col items-center gap-2">
                        <FileText className="w-10 h-10 text-emerald-500" />
                        <p className="text-xs font-bold text-slate-700">{newStudent.idFileName}</p>
                        <button 
                          type="button" 
                          onClick={(e) => {
                            e.stopPropagation();
                            setNewStudent({ ...newStudent, idFileName: '' });
                          }}
                          className="text-[10px] font-black uppercase text-rose-500 hover:text-rose-600 mt-1 cursor-pointer"
                        >
                          Remove File
                        </button>
                      </div>
                    ) : (
                      <label htmlFor="id-file-upload" className="flex flex-col items-center gap-2 cursor-pointer">
                        <Upload className="w-8 h-8 text-slate-400" />
                        <span className="text-xs font-bold text-slate-500">Drag & drop Student ID or <span className="text-philsa-red underline">browse</span></span>
                        <span className="text-[10px] text-slate-400">Supports JPG, PNG, PDF up to 5MB</span>
                      </label>
                    )}
                  </div>
                  {formErrors.idFileName && <p className="text-xs text-philsa-red font-bold">{formErrors.idFileName}</p>}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-philsa-border mt-6">
                <button 
                  type="button" 
                  onClick={() => setIsAddOpen(false)} 
                  className="px-6 py-3 bg-white border border-philsa-border text-philsa-navy text-xs font-black uppercase tracking-wider rounded-2xl hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    const errors: Record<string, string> = {};
                    if (!newStudent.fullName) {
                      errors.fullName = 'Full Name is required';
                    } else if (newStudent.fullName.trim().split(/\s+/).length < 2) {
                      errors.fullName = 'Please enter at least a first name and a last name';
                    }
                    if (!newStudent.dob) {
                      errors.dob = 'Birthdate is required';
                    }
                    if (!newStudent.schoolName) {
                      errors.schoolName = 'School selection is required';
                    }
                    if (!newStudent.lrn) {
                      errors.lrn = 'LRN is required';
                    } else if (!/^\d{12}$/.test(newStudent.lrn.trim())) {
                      errors.lrn = 'LRN must be a 12-digit number';
                    }
                    if (!newStudent.idFileName) {
                      errors.idFileName = 'Student ID upload is required';
                    }

                    if (Object.keys(errors).length > 0) {
                      setFormErrors(errors);
                      return;
                    }

                    // Parse full name to first & last names
                    const nameParts = newStudent.fullName.trim().split(/\s+/);
                    const firstName = nameParts[0];
                    const lastName = nameParts.slice(1).join(' ');

                    const newId = `CAND-2026-${Math.floor(1000 + Math.random() * 9000)}`;
                    const record = {
                      id: newId,
                      userId: `user-${Date.now()}`,
                      status: 'PENDING',
                      submittedAt: new Date().toISOString(),
                      firstName: firstName,
                      middleName: '',
                      noMiddleName: true,
                      lastName: lastName,
                      dob: newStudent.dob,
                      photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
                      birthPlace: 'Metro Manila',
                      nationality: 'Filipino',
                      gender: 'Male',
                      email: `${firstName.toLowerCase().replace(/[^a-z]/g, '')}.${lastName.toLowerCase().replace(/[^a-z]/g, '') || 'std'}@example.com`,
                      mobile: '0917' + Math.floor(1000000 + Math.random() * 9000000),
                      nationalId: 'ID-PHILSLA-' + Math.floor(10000 + Math.random() * 90000),
                      region: 'NCR',
                      province: 'Metro Manila',
                      city: 'Manila',
                      barangay: 'Brgy 1',
                      street: 'Sta Mesa St.',
                      zipCode: '1000',
                      lrn: newStudent.lrn,
                      schoolName: newStudent.schoolName,
                      schoolAddress: 'Manila',
                      academicTrack: 'STEM',
                      gradeLevel: 'Grade 12',
                      gwa: 92.5,
                      universities: ['UP Diliman'],
                      courses: ['BS Computer Science'],
                      risk: 'LOW',
                      duplicateScore: 5,
                      duplicateStatus: 'No Match',
                      center: 'UP Diliman',
                      seat: undefined,
                      history: [{ status: 'SUBMITTED', date: 'Just now', actor: 'Admin/Reviewer' }]
                    };

                    setApps(prev => [record, ...prev]);
                    setIsAddOpen(false);
                    setNewStudent({
                      fullName: '',
                      dob: '',
                      schoolName: '',
                      lrn: '',
                      idFileName: '',
                      idFileDataUrl: '',
                      email: '',
                      mobile: '09171234567'
                    });
                  }} 
                  disabled={!isManualRegActive}
                  className={cn(
                    "px-6 py-3 bg-philsa-red text-white text-xs font-black uppercase tracking-wider rounded-2xl hover:bg-philsa-red/90 transition-all shadow-lg shadow-philsa-red/10",
                    !isManualRegActive ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                  )}
                >
                  Create Application
                </button>
              </div>
            </div>
          </ModalWrapper>
        )}
      </AnimatePresence>

      {/* Row Actions Menu */}
      {selectedApp && !activeModal && (
        <div className="fixed inset-0 z-40 bg-black/5" onClick={() => setSelectedApp(null)}>
           <motion.div 
             initial={{ opacity: 0, scale: 0.95 }}
             animate={{ opacity: 1, scale: 1 }}
             className="absolute bg-white border border-philsa-border rounded-3xl shadow-[0_32px_64px_-16px_rgba(30,41,59,0.25)] p-3 w-72 space-y-1.5 z-50"
             style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
             onClick={e => e.stopPropagation()}
           >
              <ActionItem icon={Eye} label="View Full Application" onClick={() => handleOpenView(selectedApp)} />
              <div className="h-px bg-philsa-bg mx-2" />
              <ActionItem icon={CheckCircle} label="Approve Application" onClick={() => handleOpenAction(selectedApp, 'APPROVE')} color="text-emerald-600" />
              <ActionItem icon={MapPin} label="Reassign Center" onClick={() => handleOpenAction(selectedApp, 'REASSIGN')} color="text-purple-600" />
              <ActionItem icon={Edit3} label="For Correction Request" onClick={() => handleOpenAction(selectedApp, 'CORRECTION')} color="text-amber-600" />
              <ActionItem icon={ShieldAlert} label="For Rejection" onClick={() => handleOpenAction(selectedApp, 'FRAUD')} color="text-philsa-red" />
           </motion.div>
        </div>
      )}
    </div>
  );
}

function DataRow({ label, value }: { label: string, value: string }) {
  return (
    <div>
      <p className="text-[10px] font-black text-philsa-gray uppercase tracking-widest mb-1">{label}</p>
      <p className="text-sm font-bold text-philsa-navy leading-snug">{value}</p>
    </div>
  );
}

function DocCard({ title, status, timestamp }: any) {
  return (
    <div className="card-philsa p-6 flex flex-col justify-between group hover:border-philsa-red/30 transition-all cursor-pointer bg-philsa-bg/40">
       <div className="mb-4">
          <div className="p-3 bg-white rounded-xl border border-philsa-border transition-colors group-hover:bg-philsa-navy/5 group-hover:border-philsa-navy/20 shadow-sm w-fit mb-4">
             <FileText className="w-5 h-5 text-philsa-navy" />
          </div>
          <h5 className="text-sm font-bold text-philsa-navy group-hover:text-philsa-red transition-all">{title}</h5>
          <p className="text-[9px] text-philsa-gray font-bold uppercase tracking-widest mt-1">Verified: {timestamp}</p>
       </div>
       <div className="flex items-center justify-between pt-4 border-t border-philsa-border/50">
          <span className={`text-[8px] font-black px-2 py-0.5 rounded tracking-widest uppercase ${
            status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
          }`}>
            {status}
          </span>
          <Download className="w-3.5 h-3.5 text-philsa-gray hover:text-philsa-navy transition-all" />
       </div>
    </div>
  );
}

function Field({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <p className="text-[9px] font-black text-philsa-gray uppercase tracking-widest mb-1.5 opacity-70 leading-none">{label}</p>
      <p className="text-sm font-bold text-philsa-navy uppercase tracking-tight truncate">{value || 'UNSPECIFIED'}</p>
    </div>
  );
}

function ArtifactItem({ label, status, isWarn }: { label: string; status: string; isWarn?: boolean }) {
  return (
    <div className="flex flex-col gap-3 p-5 bg-philsa-bg rounded-3xl border border-philsa-border group hover:bg-white hover:border-philsa-navy/20 transition-all">
       <div className="flex items-center justify-between">
          <p className="text-[9px] font-black text-philsa-navy uppercase tracking-widest">{label}</p>
          <ExternalLink className="w-3 h-3 text-philsa-gray group-hover:text-philsa-navy" />
       </div>
       <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
             <div className={cn("w-1.5 h-1.5 rounded-full", isWarn ? "bg-amber-500" : "bg-emerald-500")} />
             <span className={cn("text-[8px] font-black uppercase tracking-widest", isWarn ? "text-amber-600" : "text-emerald-600")}>{status}</span>
          </div>
       </div>
    </div>
  );
}

function ModalWrapper({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-philsa-navy/60 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.95 }}
        className="w-full max-w-2xl bg-white rounded-[3rem] shadow-[0_50px_100px_-20px_rgba(30,41,59,0.3)] overflow-hidden"
      >
        <div className="px-10 py-8 border-b border-philsa-border flex justify-between items-center bg-philsa-bg/30">
           <h2 className="text-lg font-black text-philsa-navy uppercase tracking-tighter">{title}</h2>
           <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-philsa-bg flex items-center justify-center transition-colors">
              <X className="w-5 h-5 text-philsa-gray" />
           </button>
        </div>
        <div className="p-10">
           {children}
        </div>
      </motion.div>
    </div>
  );
}

function ActionItem({ icon: Icon, label, onClick, color }: { icon: any; label: string; onClick: () => void; color?: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl hover:bg-philsa-bg text-philsa-navy transition-all active:scale-95",
        color
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="text-[11px] font-black uppercase tracking-widest">{label}</span>
      <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-20" />
    </button>
  );
}
