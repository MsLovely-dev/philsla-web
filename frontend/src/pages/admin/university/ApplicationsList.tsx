import React, { useState } from 'react';
import { 
  Search, Filter, Eye, Download, CheckCircle, XCircle, MoreVertical, Check, Edit3,
  MapPin, Shield, Clock, AlertCircle, X, ChevronDown, ChevronRight, AlertTriangle, User, ShieldAlert
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { usePhilSA } from '../../../PhilSAContext';
import { useMockData } from '../../../services/mockService';
import { cn } from '../../../lib/utils';

const MOCK_APPLICATIONS = [
  { id: 'APP-001', name: 'Juan P. Pangilinan', university: 'University of the Philippines', course: 'BS Computer Science', score: 94.5, status: 'PENDING', submittedAt: '2026-05-01', photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80' },
  { id: 'APP-002', name: 'Maria Elena Soriano', university: 'University of the Philippines', course: 'BS Biology', score: 88.2, status: 'APPROVED', submittedAt: '2026-05-02', photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80' },
  { id: 'APP-003', name: 'Ricardo M. Silva', university: 'University of the Philippines', course: 'BS Civil Engineering', score: 91.0, status: 'REJECTED', submittedAt: '2026-05-03', photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80' },
  { id: 'APP-004', name: 'Liza Monica Bautista', university: 'University of the Philippines', course: 'BA Psychology', score: 95.8, status: 'PENDING', submittedAt: '2026-05-04', photoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80' },
];

export default function ApplicationsList() {
  const { user } = usePhilSA();
  const { schedules } = useMockData();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [apps, setApps] = useState(() => MOCK_APPLICATIONS);
  const [activeModal, setActiveModal] = useState<'APPROVE' | 'REASSIGN' | 'CORRECTION' | 'FRAUD' | null>(null);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('Unverifiable or fraudulent documents');
  const [customRejectionDetail, setCustomRejectionDetail] = useState('');

  const handleOpenAction = (app: any, type: typeof activeModal) => {
     setSelectedApp(app);
     setActiveModal(type);
  };

  const closeModal = () => {
     setActiveModal(null);
     setSelectedApp(null);
  };

  const filtered = apps.filter(app => {
    const matchesSearch = app.name.toLowerCase().includes(searchTerm.toLowerCase()) || app.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-philsa-navy mb-2 tracking-tight">University Applications</h1>
          <p className="text-philsa-gray text-sm font-medium">Verify and manage student applications for {user?.university || 'PhilSA Entrance Hub'}.</p>
        </div>
        <div className="flex items-center gap-3">
           <button className="btn-secondary flex items-center gap-2">
              <Download className="w-4 h-4" /> Export to Excel
           </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Pending', value: '1,284', change: '+12%', color: 'amber' },
          { label: 'Verified Scores', value: '8,432', change: '+5%', color: 'blue' },
          { label: 'Avg. Percentile', value: '84.2%', change: '+0.4%', color: 'philsa-red' },
          { label: 'Batch Capacity', value: '92%', change: 'Steady', color: 'green' }
        ].map((stat, i) => (
          <div key={i} className="card-philsa !p-6 flex items-center gap-5">
            <div className={`w-2 h-10 rounded-full bg-${stat.color === 'philsa-red' ? 'philsa-red' : stat.color + '-500'}`} />
            <div>
              <p className="text-[10px] font-black text-philsa-gray uppercase tracking-widest mb-1">{stat.label}</p>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-black text-philsa-navy leading-none">{stat.value}</span>
                <span className="text-[10px] font-bold text-green-600 mb-0.5">{stat.change}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card-philsa !p-0 overflow-hidden">
        <div className="p-6 border-b border-philsa-border flex flex-wrap gap-4 items-center justify-between">
           <div className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-philsa-gray" />
              <input 
                type="text" 
                placeholder="Search by student name or ID..." 
                className="w-full bg-philsa-bg border-none rounded-xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-philsa-red/10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
           </div>
           <div className="flex items-center gap-3">
             <div className="flex bg-philsa-bg p-1 rounded-xl">
               {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((status) => (
                 <button
                   key={status}
                   onClick={() => setStatusFilter(status)}
                   className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wider transition-all ${
                     statusFilter === status 
                       ? 'bg-white text-philsa-navy shadow-sm' 
                       : 'text-philsa-gray hover:text-philsa-navy'
                   }`}
                 >
                   {status}
                 </button>
               ))}
             </div>
             <button className="btn-secondary py-2.5 px-4 text-sm flex items-center gap-2">
               <Filter className="w-4 h-4" /> More Filters
             </button>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-philsa-bg text-[10px] text-philsa-gray font-black uppercase tracking-[0.2em]">
              <tr>
                <th className="px-8 py-5">Student Information</th>
                <th className="px-8 py-5">Selected Course</th>
                <th className="px-8 py-5">Exam Score</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-philsa-border">
              {filtered.map((app) => (
                <tr key={app.id} className="hover:bg-philsa-bg/40 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      {app.photoUrl ? (
                         <div className="w-10 h-10 rounded-xl overflow-hidden border border-philsa-border shadow-sm shrink-0 bg-philsa-bg">
                            <img referrerPolicy="no-referrer" src={app.photoUrl} alt="" className="w-full h-full object-cover" />
                         </div>
                      ) : (
                        <div className="w-10 h-10 bg-philsa-navy/5 rounded-full flex items-center justify-center text-philsa-navy font-bold text-sm">
                          {app.name.split(' ').map(n => n[0]).join('')}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-bold text-philsa-navy mb-0.5">{app.name}</p>
                        <p className="text-[10px] text-philsa-gray font-bold tracking-wider uppercase">{app.id} • {app.submittedAt}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-sm font-medium text-philsa-navy">{app.course}</p>
                    <p className="text-[10px] text-philsa-gray font-medium italic">{app.university}</p>
                  </td>
                  <td className="px-8 py-5">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                      app.score >= 90 ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'
                    }`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {app.score}%
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`text-[10px] font-black px-3 py-1 rounded-full tracking-widest ${
                      app.status === 'APPROVED' || app.status === 'ACCEPTED' ? 'bg-green-100 text-green-700' :
                      app.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {app.status}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => navigate(`/admin/university/applications/${app.id}`)}
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
          {filtered.length === 0 && (
            <div className="py-20 text-center">
              <div className="w-16 h-16 bg-philsa-bg rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-philsa-gray/40" />
              </div>
              <p className="text-philsa-navy font-bold">No applications found</p>
              <p className="text-philsa-gray text-sm">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
        
        <div className="px-8 py-4 bg-philsa-bg/50 border-t border-philsa-border flex items-center justify-between">
           <p className="text-[10px] text-philsa-gray font-bold uppercase tracking-widest">Showing {filtered.length} of {apps.length} applicants</p>
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
             <div className="space-y-6 text-philsa-navy font-sans">
                <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-100 rounded-xl">
                   <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 shadow-sm shrink-0 bg-slate-200">
                      <img referrerPolicy="no-referrer" src={selectedApp.photoUrl} alt="" className="w-full h-full object-cover" />
                   </div>
                   <div>
                       <h3 className="text-sm font-bold text-philsa-navy leading-none mb-1">{selectedApp.name}</h3>
                       <p className="text-[10px] font-semibold text-slate-400 font-mono leading-none">{selectedApp.id}</p>
                   </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                   Are you sure you want to approve this application? Approving confirms that the applicant has passed all admission verification requirements.
                </p>

                <div className="flex gap-3 justify-end border-t border-slate-100 pt-4">
                   <button onClick={closeModal} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-slate-100 transition-all cursor-pointer">
                      Cancel
                   </button>
                   <button onClick={() => {
                       setApps(prev => prev.map(a => a.id === selectedApp.id ? { ...a, status: 'APPROVED' } : a));
                       closeModal();
                   }} className="px-5 py-2 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-600/10 hover:bg-emerald-700 transition-all cursor-pointer">
                      Confirm
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
                      <p className="text-xs font-black uppercase tracking-tight">{selectedApp.center || 'Not Assigned'}</p>
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
                      <select className="w-full bg-white border border-philsa-border rounded-xl pl-12 pr-10 py-5 text-sm font-black uppercase tracking-tight outline-none focus:ring-2 focus:ring-philsa-navy/5 appearance-none group-hover:border-philsa-navy transition-all">
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
                   <button onClick={closeModal} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-slate-100 transition-all cursor-pointer">
                      Cancel
                   </button>
                   <button onClick={() => {
                       setApps(prev => prev.map(a => a.id === selectedApp.id ? { ...a, status: 'PENDING' } : a));
                       closeModal();
                   }} className="px-5 py-2 bg-amber-600 text-white text-[10px] font-black uppercase tracking-wider rounded-xl shadow-lg shadow-amber-600/10 hover:bg-amber-700 transition-all cursor-pointer">
                      For Correction Request
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
                   <button onClick={closeModal} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-slate-100 transition-all cursor-pointer">
                      Cancel
                   </button>
                   <button onClick={() => {
                       setApps(prev => prev.map(a => a.id === selectedApp.id ? { ...a, status: 'REJECTED' } : a));
                       closeModal();
                   }} className="px-5 py-2 bg-philsa-red text-white text-[10px] font-black uppercase tracking-wider rounded-xl shadow-lg shadow-philsa-red/10 hover:bg-philsa-red/90 transition-all cursor-pointer">
                      Confirm
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
             className="absolute bg-white border border-philsa-border rounded-3xl shadow-[0_32px_64px_-16px_rgba(30,41,59,0.25)] p-3 w-72 space-y-1.5 z-50 text-left"
             style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
             onClick={e => e.stopPropagation()}
           >
              <ActionItem icon={Eye} label="View Full Application" onClick={() => navigate(`/admin/university/applications/${selectedApp.id}`)} />
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

function ModalWrapper({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-philsa-navy/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white text-left">
           <h2 className="text-sm font-bold text-philsa-navy">{title}</h2>
           <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-all cursor-pointer">
              <X className="w-5 h-5" />
           </button>
        </div>
        <div className="p-6 text-left">
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
        "w-full flex items-center gap-3 px-4 py-3 select-none rounded-xl hover:bg-slate-50 text-slate-700 transition-all active:scale-[0.98] cursor-pointer text-left",
        color
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-40" />
    </button>
  );
}
