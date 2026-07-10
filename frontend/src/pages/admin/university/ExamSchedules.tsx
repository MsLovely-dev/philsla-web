import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin,
  ChevronRight,
  ChevronDown,
  Filter,
  Plus,
  X,
  CheckCircle2,
  Users,
  Building2,
  ExternalLink,
  MoreVertical,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Info,
  Search,
  Archive,
  Edit2,
  XCircle,
  Activity,
  Server,
  Zap,
  TrendingUp,
  Settings2,
  Lock,
  Unlock,
  Eye,
  FileText
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---

type BatchStatus = 'Draft' | 'Open Registration' | 'Full' | 'Closed' | 'Ongoing' | 'Completed' | 'Archived';

interface CenterLogistics {
  occupancy: number;
  deviceReadiness: 'READY' | 'MAINTENANCE' | 'OFFLINE';
  proctorStatus: 'ASSIGNED' | 'PENDING' | 'INCOMPLETE';
  operationalStatus: 'OPERATIONAL' | 'STANDBY' | 'ISSUES';
}

interface TestingCenter {
  id: string;
  name: string;
  location: string;
  capacity: number;
  logistics: CenterLogistics;
}

interface Batch {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: string;
  registrants: number;
  assignedCenters: TestingCenter[];
  status: BatchStatus;
  centerLimit?: number;
}

// --- Mock Data ---

const MOCK_CENTERS: TestingCenter[] = [
  { 
    id: 'TC-01', 
    name: 'UP Diliman - Melchor Hall', 
    location: 'Quezon City', 
    capacity: 500,
    logistics: { occupancy: 420, deviceReadiness: 'READY', proctorStatus: 'ASSIGNED', operationalStatus: 'OPERATIONAL' }
  },
  { 
    id: 'TC-02', 
    name: 'UST - Main Building', 
    location: 'Manila', 
    capacity: 1000,
    logistics: { occupancy: 970, deviceReadiness: 'READY', proctorStatus: 'ASSIGNED', operationalStatus: 'OPERATIONAL' }
  },
  { 
    id: 'TC-03', 
    name: 'DLSU - Br. Andrew Gonzales Hall', 
    location: 'Manila', 
    capacity: 800,
    logistics: { occupancy: 780, deviceReadiness: 'READY', proctorStatus: 'ASSIGNED', operationalStatus: 'OPERATIONAL' }
  },
  { 
    id: 'TC-04', 
    name: 'Ateneo de Manila - MVP Social Center', 
    location: 'Quezon City', 
    capacity: 600,
    logistics: { occupancy: 550, deviceReadiness: 'READY', proctorStatus: 'ASSIGNED', operationalStatus: 'OPERATIONAL' }
  },
];

const INITIAL_BATCHES: Batch[] = [
  { 
    id: 'BATCH-01', 
    date: '2026-06-15', 
    startTime: '08:00',
    endTime: '12:00',
    duration: '4 Hours',
    registrants: 4500, 
    assignedCenters: [...MOCK_CENTERS], 
    status: 'Open Registration',
    centerLimit: 5
  },
  { 
    id: 'BATCH-02', 
    date: '2026-06-16', 
    startTime: '08:00',
    endTime: '12:00',
    duration: '4 Hours',
    registrants: 4200, 
    assignedCenters: [...MOCK_CENTERS].slice(0, 3), 
    status: 'Open Registration',
    centerLimit: 3
  },
  { 
    id: 'BATCH-03', 
    date: '2026-06-17', 
    startTime: '13:00',
    endTime: '17:00',
    duration: '4 Hours',
    registrants: 3100, 
    assignedCenters: [...MOCK_CENTERS].slice(1, 4), 
    status: 'Full',
    centerLimit: 3
  },
  { 
    id: 'BATCH-04', 
    date: '2026-05-20', 
    startTime: '08:00',
    endTime: '12:00',
    duration: '4 Hours',
    registrants: 5000, 
    assignedCenters: [...MOCK_CENTERS], 
    status: 'Completed',
    centerLimit: 10
  },
];

// --- Status Styles ---

const getStatusStyles = (status: BatchStatus) => {
  switch (status) {
    case 'Open Registration': return 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-[0_2px_10px_-3px_rgba(16,185,129,0.2)]';
    case 'Full': return 'bg-amber-50 text-amber-700 border-amber-100';
    case 'Closed': return 'bg-slate-100 text-slate-600 border-slate-200';
    case 'Ongoing': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Completed': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case 'Draft': return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'Archived': return 'bg-gray-100 text-gray-500 border-gray-200 grayscale';
    default: return 'bg-gray-50 text-gray-700 border-gray-100';
  }
};

// --- Sub-components ---

const TableSkeleton = () => (
  <div className="animate-pulse space-y-4 p-8">
    {[1, 2, 3, 4, 5].map(i => (
      <div key={i} className="h-20 bg-philsa-bg rounded-2xl w-full" />
    ))}
  </div>
);

const Notification = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => (
  <motion.div 
    initial={{ opacity: 0, y: 50, x: 20 }}
    animate={{ opacity: 1, y: 0, x: 0 }}
    exit={{ opacity: 0, scale: 0.9, y: 20 }}
    className={cn(
      "fixed bottom-8 right-8 z-[100] px-6 py-4 rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.2)] flex items-center gap-4 border-2",
      type === 'success' ? "bg-white border-emerald-500/20 text-philsa-navy" : "bg-white border-philsa-red/20 text-philsa-red"
    )}
  >
    {type === 'success' ? <CheckCircle2 className="w-6 h-6 text-emerald-500" /> : <AlertCircle className="w-6 h-6 text-philsa-red" />}
    <span className="text-xs font-black uppercase tracking-widest">{message}</span>
    <button onClick={onClose} className="ml-4 p-2 hover:bg-philsa-bg rounded-xl transition-colors">
      <X className="w-4 h-4 text-philsa-gray" />
    </button>
  </motion.div>
);

export default function ExamSchedules() {
  const [batches, setBatches] = useState<Batch[]>(INITIAL_BATCHES);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<BatchStatus | 'All'>('All');
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [centerSearchQuery, setCenterSearchQuery] = useState('');
  
  // Modal States
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isRegConfirmModalOpen, setIsRegConfirmModalOpen] = useState(false);
  const [isEditCenterModalOpen, setIsEditCenterModalOpen] = useState(false);
  const [isEditBatchModalOpen, setIsEditBatchModalOpen] = useState(false);
  const [editingBatchData, setEditingBatchData] = useState<{
    id: string;
    originalId: string;
    date: string;
    startTime: string;
    endTime: string;
    centerLimit: number;
    registrants: number;
    assignedCenters: TestingCenter[];
    status: BatchStatus;
    duration: string;
  } | null>(null);
  const [editingCenter, setEditingCenter] = useState<{
    batchId: string;
    centerId: string;
    name: string;
    occupancy: number;
    capacity: number;
    deviceReadiness: 'READY' | 'MAINTENANCE' | 'OFFLINE';
    proctorStatus: 'ASSIGNED' | 'PENDING' | 'INCOMPLETE';
    operationalStatus: 'OPERATIONAL' | 'STANDBY' | 'ISSUES';
  } | null>(null);
  const [targetBatchId, setTargetBatchId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const requestCreateBatch = (e: React.FormEvent) => {
    e.preventDefault();
    setConfirmModal({
      title: "Initialize Examination Batch",
      message: `Are you sure you want to orchestrate a new examination batch on ${newBatchData.date} from ${newBatchData.startTime} to ${newBatchData.endTime}? This will establish the coordinated provincial schedule bounds.`,
      onConfirm: () => {
        setIsLoading(true);
        setTimeout(() => {
          const batch: Batch = {
            id: newBatchData.id || `BATCH-${String(batches.length + 1).padStart(2, '0')}`,
            date: newBatchData.date,
            startTime: newBatchData.startTime,
            endTime: newBatchData.endTime,
            duration,
            registrants: 0,
            assignedCenters: [],
            status: 'Draft',
            centerLimit: newBatchData.centerLimit
          };
          setBatches([batch, ...batches]);
          setIsProvisionModalOpen(false);
          setIsLoading(false);
          showToast('National examination batch created successfully.');
          setNewBatchData({ id: '', date: '', startTime: '08:00', endTime: '12:00', centerLimit: 5 });
        }, 1000);
        setConfirmModal(null);
      }
    });
  };

  const requestArchiveBatch = (batchId: string) => {
    setConfirmModal({
      title: "Archive Examination Batch",
      message: `Are you sure you want to archive National Exam Batch "${batchId}"? This will freeze registrations and put all associated testing center workstations on standby status.`,
      onConfirm: () => {
        setBatches(batches.map(b => b.id === batchId ? { ...b, status: 'Archived' } : b));
        setConfirmModal(null);
        showToast(`Batch ${batchId} has been archived successfully.`);
      }
    });
  };

  const requestEditBatch = (batchId: string) => {
    const batch = batches.find(b => b.id === batchId);
    if (batch) {
      setEditingBatchData({
        id: batch.id,
        originalId: batch.id,
        date: batch.date,
        startTime: batch.startTime,
        endTime: batch.endTime,
        centerLimit: batch.centerLimit || 5,
        registrants: batch.registrants,
        assignedCenters: batch.assignedCenters,
        status: batch.status,
        duration: batch.duration
      });
      setIsEditBatchModalOpen(true);
    }
  };

  const handleSaveBatchEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBatchData) return;

    // Calculate duration
    let durationStr = "4 Hours";
    try {
      const startHour = parseInt(editingBatchData.startTime.split(':')[0]);
      const endHour = parseInt(editingBatchData.endTime.split(':')[0]);
      const diff = endHour - startHour;
      if (diff > 0) {
        durationStr = `${diff} Hour${diff !== 1 ? 's' : ''}`;
      }
    } catch (err) {}

    setConfirmModal({
      title: "Save Batch Changes",
      message: `Are you sure you want to save operational modifications for Batch "${editingBatchData.originalId}"? This will update schedule parameters and center limits.`,
      onConfirm: () => {
        setBatches(batches.map(b => b.id === editingBatchData.originalId ? {
          ...b,
          date: editingBatchData.date,
          startTime: editingBatchData.startTime,
          endTime: editingBatchData.endTime,
          duration: durationStr,
          centerLimit: editingBatchData.centerLimit
        } : b));
        setIsEditBatchModalOpen(false);
        setConfirmModal(null);
        showToast("Batch details updated successfully.");
      }
    });
  };

  const requestSaveCenterEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCenter) return;
    setConfirmModal({
      title: "Confirm Logistics Changes",
      message: `Are you sure you want to lock in and update testing center logistics for "${editingCenter.name}"? This updates occupancy status and workstation compliance statistics.`,
      onConfirm: () => {
        setBatches(batches.map(b => {
          if (b.id === editingCenter.batchId) {
            return {
              ...b,
              assignedCenters: b.assignedCenters.map(c => {
                if (c.id === editingCenter.centerId) {
                  return {
                    ...c,
                    logistics: {
                      ...c.logistics,
                      occupancy: editingCenter.occupancy,
                      deviceReadiness: editingCenter.deviceReadiness,
                      proctorStatus: editingCenter.proctorStatus,
                      operationalStatus: editingCenter.operationalStatus
                    }
                  };
                }
                return c;
              })
            };
          }
          return b;
        }));
        setIsEditCenterModalOpen(false);
        setConfirmModal(null);
        showToast("Testing Node logistics updated successfully.");
      }
    });
  };

  const requestRemoveCenter = (batchId: string, centerId: string, centerName: string) => {
    setConfirmModal({
      title: "Confirm Node Removal",
      message: `Are you sure you want to disassociate testing center "${centerName}" from examination batch ${batchId}?`,
      onConfirm: () => {
        handleRemoveCenter(batchId, centerId);
        setConfirmModal(null);
      }
    });
  };
  
  const [newBatchData, setNewBatchData] = useState({
    id: '',
    date: '',
    startTime: '08:00',
    endTime: '12:00',
    centerLimit: 5
  });

  const duration = useMemo(() => {
    if (!newBatchData.startTime || !newBatchData.endTime) return '0 Hours';
    const start = parseInt(newBatchData.startTime.split(':')[0]);
    const end = parseInt(newBatchData.endTime.split(':')[0]);
    const diff = end - start;
    return `${diff} Hour${diff !== 1 ? 's' : ''}`;
  }, [newBatchData.startTime, newBatchData.endTime]);

  const filteredBatches = useMemo(() => {
    return batches.filter(b => {
      const matchesSearch = b.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'All' || b.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [batches, searchTerm, statusFilter]);

  const filteredCentersForAssign = useMemo(() => {
    return MOCK_CENTERS.filter(c => 
      c.name.toLowerCase().includes(centerSearchQuery.toLowerCase()) || 
      c.location.toLowerCase().includes(centerSearchQuery.toLowerCase()) ||
      c.capacity.toString().includes(centerSearchQuery)
    );
  }, [centerSearchQuery]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleCreateBatch = (e: React.FormEvent) => {
    requestCreateBatch(e);
  };

  const confirmRegToggle = (batchId: string) => {
    setTargetBatchId(batchId);
    setIsRegConfirmModalOpen(true);
  };

  const handleRegToggleExec = () => {
    if (!targetBatchId) return;
    setBatches(batches.map(b => {
      if (b.id === targetBatchId) {
        const newStatus: BatchStatus = b.status === 'Open Registration' ? 'Closed' : 'Open Registration';
        return { ...b, status: newStatus };
      }
      return b;
    }));
    setIsRegConfirmModalOpen(false);
    showToast(`Registration window successfully ${batches.find(b => b.id === targetBatchId)?.status === 'Open Registration' ? 'CLOSED' : 'OPENED'}.`);
  };

  const handleCenterAssign = (centerId: string) => {
    if (!targetBatchId) return;
    const center = MOCK_CENTERS.find(c => c.id === centerId);
    if (!center) return;

    setBatches(batches.map(b => {
      if (b.id === targetBatchId) {
        const alreadyExists = b.assignedCenters.find(c => c.id === centerId);
        if (alreadyExists) {
           return { ...b, assignedCenters: b.assignedCenters.filter(c => c.id !== centerId) };
        }
        
        // Enforce limit
        if (b.centerLimit && b.assignedCenters.length >= b.centerLimit) {
           showToast(`Center limit reached (${b.centerLimit}). Cannot add more testing centers.`, 'error');
           return b;
        }

        return { ...b, assignedCenters: [...b.assignedCenters, center] };
      }
      return b;
    }));
  };

  const handleRemoveCenter = (batchId: string, centerId: string) => {
    setBatches(batches.map(b => {
      if (b.id === batchId) {
        return { ...b, assignedCenters: b.assignedCenters.filter(c => c.id !== centerId) };
      }
      return b;
    }));
    showToast("Testing Node removed from batch successfully.");
  };

  const handleSaveCenterEdit = (e: React.FormEvent) => {
    requestSaveCenterEdit(e);
  };

  return (
    <div className="relative space-y-8 pb-10">
      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmModal && (
          <div className="fixed inset-0 z-[11000] flex items-center justify-center p-6 bg-philsa-navy/60 backdrop-blur-sm">
            <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 15 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 15 }}
               className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 flex flex-col p-8 text-center"
            >
               <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
                 <AlertCircle className="w-8 h-8" />
               </div>
               <h3 className="text-xl font-black text-philsa-navy uppercase tracking-tight mb-2">{confirmModal.title}</h3>
               <p className="text-sm text-slate-500 leading-relaxed mb-8">{confirmModal.message}</p>
               <div className="flex gap-4">
                 <button 
                   onClick={() => setConfirmModal(null)}
                   className="flex-1 py-4 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                 >
                   Cancel
                 </button>
                 <button 
                   onClick={confirmModal.onConfirm}
                   className="flex-1 py-4 bg-philsa-navy hover:bg-philsa-red text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg transition-all"
                 >
                   Confirm
                 </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {notification && (
          <Notification 
            message={notification.message} 
            type={notification.type} 
            onClose={() => setNotification(null)} 
          />
        )}
      </AnimatePresence>

      {/* --- Page Header --- */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-1">
        <div>
           <h1 className="text-4xl font-black text-philsa-navy mb-2 tracking-tight">Batch Management</h1>
           <p className="text-philsa-gray text-sm mt-1 max-w-2xl font-medium leading-relaxed">
             Coordinate nationwide examination batches, testing node availability, and centralized registration synchronization for PhilSA candidates.
           </p>
        </div>
        <div className="flex gap-3">
           <button 
             onClick={() => setIsProvisionModalOpen(true)}
             className="px-8 py-3 bg-philsa-navy text-white rounded-[18px] text-[10px] font-black uppercase tracking-widest shadow-[0_10px_30px_rgba(15,23,42,0.3)] hover:bg-philsa-red transition-all flex items-center gap-2"
           >
              <Plus className="w-5 h-5" /> Add New Batch
           </button>
        </div>
      </div>

      {/* --- Dashboard Stats Bar --- */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         {[
           { label: 'Active Batches', value: '04', icon: CalendarIcon, color: 'text-philsa-red' },
           { label: 'Open Registration', value: '02', icon: Unlock, color: 'text-emerald-500' },
           { label: 'Total Capacity', value: '5,000+', icon: Users, color: 'text-philsa-navy' },
           { label: 'Total of Testing Centers', value: '14', icon: Building2, color: 'text-blue-500' },
         ].map((stat, i) => (
           <div key={i} className="card-philsa !p-6 flex items-center gap-4 bg-white/50 backdrop-blur-sm border-white/40">
              <div className={cn("w-12 h-12 rounded-2xl bg-philsa-bg flex items-center justify-center border border-philsa-border/50 shadow-inner", stat.color)}>
                 <stat.icon className="w-6 h-6" />
              </div>
              <div>
                 <p className="text-[10px] font-black text-philsa-gray uppercase tracking-widest">{stat.label}</p>
                 <h4 className="text-xl font-black text-philsa-navy tracking-tight">{stat.value}</h4>
              </div>
           </div>
         ))}
      </div>

      {/* --- Main Registry Table --- */}
      <div className="card-philsa !p-0 overflow-hidden shadow-2xl border-philsa-border/60">
        <div className="p-8 border-b border-philsa-border flex flex-wrap gap-6 items-center justify-between bg-white">
           <div className="flex-1 flex gap-4 min-w-[300px]">
              <div className="relative flex-1">
                 <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-philsa-gray/40" />
                 <input 
                   type="text" 
                   placeholder="Search batch registry by identifier..." 
                   className="input-philsa !pl-14 !py-4 text-sm"
                   value={searchTerm}
                   onChange={e => setSearchTerm(e.target.value)}
                 />
              </div>
              <div className="flex gap-2 p-1 bg-philsa-bg rounded-2xl border border-philsa-border">
                {['All', 'Open Registration', 'Closed'].map((s) => (
                  <button 
                    key={s}
                    onClick={() => setStatusFilter(s as any)}
                    className={cn(
                      "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                      statusFilter === s ? "bg-philsa-navy text-white shadow-lg" : "text-philsa-gray hover:text-philsa-navy"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
           </div>
           <button className="px-6 py-3 border border-philsa-border rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-philsa-gray hover:bg-philsa-bg transition-all">
              <Filter className="w-4 h-4" /> Advanced Filter
           </button>
        </div>

        {isLoading ? <TableSkeleton /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-philsa-bg text-[10px] text-philsa-gray font-black uppercase tracking-[0.2em] border-b border-philsa-border">
                <tr>
                  <th className="px-8 py-5">Batch ID</th>
                  <th className="px-8 py-5">Schedule</th>
                  <th className="px-8 py-5">Duration</th>
                  <th className="px-8 py-5 text-center">Registrants</th>
                  <th className="px-8 py-5 text-center">Assigned Centers</th>
                  <th className="px-8 py-5">Status</th>
                  <th className="px-8 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-philsa-border">
                {filteredBatches.length > 0 ? filteredBatches.map(batch => (
                  <React.Fragment key={batch.id}>
                    <tr 
                      className={cn(
                        "hover:bg-philsa-bg/40 transition-all cursor-pointer group border-l-4",
                        expandedBatchId === batch.id ? "bg-philsa-bg/60 border-philsa-red" : "border-transparent"
                      )}
                      onClick={() => setExpandedBatchId(expandedBatchId === batch.id ? null : batch.id)}
                    >
                      <td className="px-8 py-7">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-philsa-bg rounded-2xl flex items-center justify-center text-philsa-red border border-transparent group-hover:border-philsa-red/30 transition-all">
                             <ShieldCheck className="w-6 h-6" />
                          </div>
                          <div>
                             <h3 className="text-sm font-black text-philsa-navy tracking-tight">{batch.id}</h3>
                             <p className="text-[10px] font-bold text-philsa-gray uppercase tracking-widest mt-0.5">Centralized</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-7">
                        <div className="flex items-center gap-3">
                           <div className="p-2 bg-philsa-red/5 rounded-xl border border-philsa-red/10">
                              <CalendarIcon className="w-4 h-4 text-philsa-red" />
                           </div>
                           <div>
                              <p className="text-xs font-black text-philsa-navy uppercase tracking-tight">
                                {new Date(batch.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                              </p>
                              <p className="text-[10px] font-bold text-philsa-gray uppercase tracking-widest">
                                {batch.startTime} - {batch.endTime}
                              </p>
                           </div>
                        </div>
                      </td>
                      <td className="px-8 py-7">
                        <div className="flex items-center gap-2 text-xs font-black text-philsa-navy uppercase pl-2">
                           <Zap className="w-4 h-4 text-amber-500" />
                           {batch.duration}
                        </div>
                      </td>
                      <td className="px-8 py-7 text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-[14px] border border-philsa-border text-xs font-black shadow-sm">
                           <Users className="w-4 h-4 text-philsa-red" />
                           {batch.registrants.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-8 py-7 text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-philsa-bg rounded-[14px] border border-philsa-border/60 text-xs font-black text-philsa-navy">
                           <Building2 className="w-4 h-4" />
                           {batch.assignedCenters.length} / {batch.centerLimit || '∞'} Centers
                        </div>
                      </td>
                      <td className="px-8 py-7">
                        <span className={cn(
                          "px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.15em] border transition-all",
                          getStatusStyles(batch.status)
                        )}>
                          {batch.status}
                        </span>
                      </td>
                      <td className="px-8 py-7 text-right">
                         <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                            <button 
                              onClick={() => confirmRegToggle(batch.id)}
                              className={cn(
                                "p-2.5 rounded-xl border-2 transition-all hover:shadow-lg",
                                batch.status === 'Open Registration' 
                                  ? "bg-amber-50 border-amber-500/20 text-amber-600 hover:border-amber-500" 
                                  : "bg-emerald-50 border-emerald-500/20 text-emerald-600 hover:border-emerald-500"
                              )}
                              title={batch.status === 'Open Registration' ? "Close Registration" : "Open Registration"}
                            >
                               {batch.status === 'Open Registration' ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                            </button>
                            
                            <div className="relative group/actions">
                               <button className="p-2.5 bg-white border-2 border-philsa-border rounded-xl text-philsa-gray hover:text-philsa-navy hover:border-philsa-navy hover:shadow-md transition-all">
                                  <Settings2 className="w-5 h-5" />
                               </button>
                               {/* Standard Action Dropdown */}
                               <div className="absolute right-0 top-full mt-3 w-56 bg-white rounded-[24px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-philsa-border p-3 hidden group-hover/actions:block z-[30] animate-in fade-in zoom-in duration-200 before:absolute before:-top-4 before:left-0 before:right-0 before:h-4 before:content-['']">
                                  {[
                                    { icon: Eye, label: 'View Details', color: 'text-blue-500', action: () => setExpandedBatchId(expandedBatchId === batch.id ? null : batch.id) },
                                    { icon: Plus, label: 'Assign Centers', color: 'text-emerald-500', action: () => { setTargetBatchId(batch.id); setIsAssignModalOpen(true); } },
                                    { icon: Edit2, label: 'Edit Batch', color: 'text-philsa-red', action: () => requestEditBatch(batch.id) },
                                    { icon: Archive, label: 'Archive Batch', color: 'text-philsa-gray', action: () => requestArchiveBatch(batch.id) },
                                  ].map((act, i) => (
                                    <button 
                                      key={i}
                                      onClick={act.action}
                                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-philsa-bg rounded-xl text-[10px] font-black text-philsa-navy uppercase tracking-widest transition-colors text-left"
                                    >
                                      <act.icon className={cn("w-4 h-4", act.color)} />
                                      {act.label}
                                    </button>
                                  ))}
                               </div>
                            </div>
                            
                            <div className={cn(
                              "p-2.5 rounded-xl transition-all",
                              expandedBatchId === batch.id ? "bg-philsa-navy text-white" : "bg-philsa-bg text-philsa-gray x"
                            )}>
                               <ChevronDown className={cn("w-5 h-5 transition-transform", expandedBatchId === batch.id && "rotate-180")} />
                            </div>
                         </div>
                      </td>
                    </tr>

                    {/* --- Expandable Operational Grid --- */}
                    <AnimatePresence>
                      {expandedBatchId === batch.id && (
                        <tr>
                          <td colSpan={7} className="p-0 border-b border-philsa-border bg-[#FBFBFC]/50">
                             <motion.div
                               initial={{ height: 0, opacity: 0 }}
                               animate={{ height: 'auto', opacity: 1 }}
                               exit={{ height: 0, opacity: 0 }}
                               className="overflow-hidden"
                             >
                               <div className="p-10 space-y-8">
                                  <div className="flex items-center justify-between">
                                     <div>
                                        <h4 className="text-lg font-black text-philsa-navy tracking-tight uppercase">Operational Logistics</h4>
                                     </div>
                                     <div className="flex gap-4">
                                        <button 
                                          onClick={() => { setTargetBatchId(batch.id); setIsAssignModalOpen(true); }}
                                          className="flex items-center gap-2 px-6 py-2.5 bg-philsa-navy text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-philsa-red transition-all shadow-lg"
                                        >
                                           <Plus className="w-4 h-4" /> Assign More Centers
                                        </button>
                                     </div>
                                  </div>

                                  <div className="space-y-3">
                                     {batch.assignedCenters.length > 0 ? (
                                       <div className="bg-white rounded-[32px] border border-philsa-border/60 overflow-hidden shadow-sm">
                                          <div className="overflow-x-auto">
                                             <table className="w-full text-left">
                                                <thead className="bg-philsa-bg text-[9px] text-philsa-gray font-black uppercase tracking-widest border-b border-philsa-border">
                                                   <tr>
                                                      <th className="px-6 py-4">Testing Node</th>
                                                      <th className="px-6 py-4 text-center">Occupancy</th>
                                                      <th className="px-6 py-4 text-center">Capacity Utilization</th>
                                                      <th className="px-6 py-4 text-center">Device Readiness</th>
                                                      <th className="px-6 py-4 text-center">Proctors</th>
                                                      <th className="px-6 py-4 text-right">Status</th>
                                                   </tr>
                                                </thead>
                                                <tbody className="divide-y divide-philsa-border">
                                                   {batch.assignedCenters.map(center => (
                                                      <tr key={center.id} className="hover:bg-philsa-bg/30 transition-colors group">
                                                         <td className="px-6 py-5">
                                                            <div className="flex items-center gap-3">
                                                               <div className="w-10 h-10 bg-philsa-bg rounded-xl flex items-center justify-center text-philsa-red border border-philsa-border group-hover:bg-white transition-colors">
                                                                  <MapPin className="w-5 h-5" />
                                                               </div>
                                                               <div>
                                                                  <p className="text-xs font-black text-philsa-navy uppercase tracking-tight">{center.name}</p>
                                                                  <p className="text-[9px] font-bold text-philsa-gray uppercase tracking-widest">{center.location}</p>
                                                               </div>
                                                            </div>
                                                         </td>
                                                         <td className="px-6 py-5 text-center">
                                                            <p className="text-xs font-black text-philsa-navy">
                                                               {center.logistics.occupancy.toLocaleString()} <span className="text-philsa-gray">/ {center.capacity.toLocaleString()}</span>
                                                            </p>
                                                         </td>
                                                         <td className="px-6 py-5">
                                                            <div className="flex items-center justify-center gap-3">
                                                               <div className="flex-1 max-w-[120px] h-1.5 bg-philsa-bg rounded-full overflow-hidden border border-philsa-border/30">
                                                                  <div 
                                                                    className={cn(
                                                                      "h-full transition-all duration-1000",
                                                                      (center.logistics.occupancy / center.capacity) > 0.9 ? "bg-philsa-red" : "bg-emerald-500"
                                                                    )} 
                                                                    style={{ width: `${(center.logistics.occupancy / center.capacity) * 100}%` }}
                                                                  />
                                                               </div>
                                                               <span className={cn(
                                                                  "text-[10px] font-black",
                                                                  (center.logistics.occupancy / center.capacity) > 0.9 ? "text-philsa-red" : "text-emerald-600"
                                                               )}>
                                                                  {((center.logistics.occupancy / center.capacity) * 100).toFixed(0)}%
                                                               </span>
                                                            </div>
                                                         </td>
                                                         <td className="px-6 py-5 text-center">
                                                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-[9px] font-black uppercase tracking-widest">
                                                               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                               {center.logistics.deviceReadiness}
                                                            </div>
                                                         </td>
                                                         <td className="px-6 py-5 text-center">
                                                            <span className="text-[10px] font-black text-philsa-navy uppercase">{center.logistics.proctorStatus}</span>
                                                         </td>
                                                         <td className="px-6 py-5 text-right">
                                                            <span className="px-3 py-1 bg-philsa-bg text-philsa-gray text-[9px] font-black border border-philsa-border rounded-lg uppercase tracking-widest">
                                                               {center.logistics.operationalStatus}
                                                            </span>
                                                         </td>
                                                         <td className="px-6 py-5 text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                               <button 
                                                                 type="button"
                                                                 onClick={() => {
                                                                   setEditingCenter({
                                                                     batchId: batch.id,
                                                                     centerId: center.id,
                                                                     name: center.name,
                                                                     occupancy: center.logistics.occupancy,
                                                                     capacity: center.capacity,
                                                                     deviceReadiness: center.logistics.deviceReadiness,
                                                                     proctorStatus: center.logistics.proctorStatus,
                                                                     operationalStatus: center.logistics.operationalStatus
                                                                   });
                                                                   setIsEditCenterModalOpen(true);
                                                                 }}
                                                                 className="p-2 bg-philsa-bg hover:bg-philsa-navy hover:text-white rounded-xl text-philsa-navy transition-all"
                                                                 title="Edit Node Logistics"
                                                               >
                                                                  <Edit2 className="w-3.5 h-3.5" />
                                                               </button>
                                                               <button 
                                                                 type="button"
                                                                 onClick={() => requestRemoveCenter(batch.id, center.id, center.name)}
                                                                 className="p-2 bg-philsa-bg hover:bg-philsa-red hover:text-white rounded-xl text-philsa-navy transition-all"
                                                                 title="Remove Node"
                                                               >
                                                                  <XCircle className="w-3.5 h-3.5 text-philsa-red hover:text-white" />
                                                               </button>
                                                            </div>
                                                         </td>
                                                      </tr>
                                                   ))}
                                                </tbody>
                                             </table>
                                          </div>
                                       </div>
                                     ) : (
                                       <div className="py-20 bg-white rounded-[40px] border-4 border-dashed border-philsa-bg flex flex-col items-center justify-center text-center px-10">
                                          <div className="w-24 h-24 bg-philsa-bg rounded-full flex items-center justify-center mb-6">
                                             <Building2 className="w-10 h-10 text-philsa-gray/20" />
                                          </div>
                                          <h5 className="text-xl font-black text-philsa-navy uppercase">No Operational Nodes</h5>
                                          <p className="text-sm font-medium text-philsa-gray mt-2 max-w-sm">Assigned testing centers will appear here once the batch logistics are finalized.</p>
                                          <button 
                                            onClick={() => { setTargetBatchId(batch.id); setIsAssignModalOpen(true); }}
                                            className="mt-8 px-10 py-4 bg-philsa-navy text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-philsa-red transition-all"
                                          >
                                            Assign Centers
                                          </button>
                                       </div>
                                     )}
                                  </div>

                                  <div className="flex justify-center pt-6">
                                     <button className="flex items-center gap-3 px-10 py-4 bg-white border-2 border-philsa-navy text-philsa-navy rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-philsa-navy hover:text-white transition-all shadow-[0_15px_40px_rgba(15,23,42,0.1)]">
                                        <FileText className="w-4 h-4" /> Full Operational Logistics Report
                                     </button>
                                  </div>
                               </div>
                             </motion.div>
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </React.Fragment>
                )) : (
                  <tr>
                    <td colSpan={7} className="py-40 text-center bg-white space-y-6">
                       <div className="w-32 h-32 bg-philsa-bg rounded-full flex items-center justify-center mx-auto mb-8 relative">
                          <Activity className="w-12 h-12 text-philsa-gray/20 animate-pulse" />
                          <div className="absolute inset-0 bg-white/20 blur-2xl rounded-full" />
                       </div>
                       <h3 className="text-2xl font-black text-philsa-navy uppercase tracking-tight">No Matching Records Found</h3>
                       <p className="text-philsa-gray text-sm max-w-sm mx-auto font-medium">The existing batch criteria filter returned zero operational windows. Adjust your search or provision a new window.</p>
                       <button 
                         onClick={() => { setSearchTerm(''); setStatusFilter('All'); }}
                         className="px-10 py-4 bg-philsa-navy text-white rounded-2xl text-[10px] font-black uppercase tracking-widest"
                       >
                         Clear System Filters
                       </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* --- Table Footer / Pagination --- */}
        <div className="p-10 border-t border-philsa-border flex items-center justify-between bg-philsa-bg/30">
           <p className="text-[10px] font-black text-philsa-gray uppercase tracking-[0.2em] flex items-center gap-3">
              <Activity className="w-4 h-4 text-emerald-500" /> Security Log: Showing {filteredBatches.length} Active System Nodes
           </p>
           <div className="flex gap-3">
              <button className="w-12 h-12 rounded-[16px] bg-white border border-philsa-border flex items-center justify-center text-philsa-navy hover:bg-philsa-navy hover:text-white transition-all shadow-sm">
                 <ChevronRight className="w-5 h-5 rotate-180" />
              </button>
              <button className="w-12 h-12 rounded-[16px] bg-philsa-navy text-white flex items-center justify-center text-xs font-black shadow-xl">01</button>
              <button className="w-12 h-12 rounded-[16px] bg-white border border-philsa-border flex items-center justify-center text-philsa-navy hover:bg-philsa-navy hover:text-white transition-all shadow-sm">
                 <ChevronRight className="w-5 h-5" />
              </button>
           </div>
        </div>
      </div>

      {/* --- Provision New Batch Modal --- */}
      <AnimatePresence>
        {isProvisionModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-philsa-navy/60 backdrop-blur-md">
            <motion.div 
               initial={{ scale: 0.9, opacity: 0, y: 20 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               exit={{ scale: 0.9, opacity: 0, y: 20 }}
               className="bg-white w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden border border-white/20 flex flex-col max-h-[90vh]"
            >
               <div className="px-8 py-6 border-b border-philsa-border bg-philsa-bg/40 flex justify-between items-center">
                  <div>
                     <h2 className="text-2xl font-black text-philsa-navy uppercase tracking-tight leading-none animate-in fade-in slide-in-from-top-4 duration-300">Create Batch</h2>
                     <p className="text-[10px] font-black text-philsa-gray uppercase tracking-[0.22em] mt-2">Set up a new examination batch</p>
                  </div>
                  <button onClick={() => setIsProvisionModalOpen(false)} className="p-2.5 bg-white hover:bg-philsa-red hover:text-white rounded-[16px] transition-all border border-philsa-border hover:border-philsa-red shadow-sm group">
                     <X className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  </button>
               </div>

               <form onSubmit={handleCreateBatch} className="p-8 space-y-5 overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                     <div className="space-y-2">
                        <label className="text-[9px] font-black text-philsa-gray uppercase tracking-widest ml-1">Batch Identifier</label>
                        <div className="relative">
                           <ShieldCheck className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-philsa-red/70" />
                           <input 
                             type="text" 
                             required
                             placeholder="e.g. BATCH-2026-X"
                             className="input-philsa !pl-12 !bg-philsa-bg !border-philsa-border focus:!bg-white focus:!ring-4 focus:!ring-philsa-red/5 !py-3.5 text-sm"
                             value={newBatchData.id}
                             onChange={e => setNewBatchData({...newBatchData, id: e.target.value})}
                          />
                        </div>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[9px] font-black text-philsa-gray uppercase tracking-widest ml-1">Fixed National Date</label>
                        <div className="relative">
                           <CalendarIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-philsa-red/70" />
                           <input 
                             type="date" 
                             required
                             className="input-philsa !pl-12 !bg-philsa-bg !border-philsa-border focus:!bg-white focus:!ring-4 focus:!ring-philsa-red/5 !py-3 text-sm"
                             value={newBatchData.date}
                             onChange={e => setNewBatchData({...newBatchData, date: e.target.value})}
                           />
                        </div>
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                     <div className="space-y-2">
                        <label className="text-[9px] font-black text-philsa-gray uppercase tracking-widest ml-1">Start Time (UTC+8)</label>
                        <div className="relative">
                           <Clock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-philsa-red/70" />
                           <input 
                             type="time" 
                             required
                             className="input-philsa !pl-12 !bg-philsa-bg !border-philsa-border focus:!bg-white focus:!ring-4 focus:!ring-philsa-red/5 !py-3 text-sm"
                             value={newBatchData.startTime}
                             onChange={e => setNewBatchData({...newBatchData, startTime: e.target.value})}
                           />
                        </div>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[9px] font-black text-philsa-gray uppercase tracking-widest ml-1">End Time (UTC+8)</label>
                        <div className="relative">
                           <Clock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-philsa-red/70" />
                           <input 
                             type="time" 
                             required
                             className="input-philsa !pl-12 !bg-philsa-bg !border-philsa-border focus:!bg-white focus:!ring-4 focus:!ring-philsa-red/5 !py-3 text-sm"
                             value={newBatchData.endTime}
                             onChange={e => setNewBatchData({...newBatchData, endTime: e.target.value})}
                           />
                        </div>
                     </div>
                  </div>

                  <div className="space-y-2">
                     <label className="text-[9px] font-black text-philsa-gray uppercase tracking-widest ml-1">Testing Center Limit</label>
                     <div className="relative">
                        <Building2 className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-philsa-red/70" />
                        <input 
                          type="number" 
                          min={1}
                          required
                          placeholder="e.g. 5"
                          className="input-philsa !pl-12 !bg-philsa-bg !border-philsa-border focus:!bg-white focus:!ring-4 focus:!ring-philsa-red/5 !py-3.5 text-sm"
                          value={newBatchData.centerLimit}
                          onChange={e => setNewBatchData({...newBatchData, centerLimit: parseInt(e.target.value) || 5})}
                        />
                     </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                     <button 
                       type="button"
                       onClick={() => setIsProvisionModalOpen(false)}
                       className="flex-1 py-4 bg-philsa-bg text-philsa-navy rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-philsa-border transition-all border border-transparent"
                     >
                       Cancel
                     </button>
                     <button 
                       type="submit"
                       disabled={isLoading}
                       className="flex-1 py-4 bg-philsa-navy text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-philsa-red transition-all flex items-center justify-center gap-2"
                     >
                        {isLoading ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}><Activity className="w-4 h-4" /></motion.div> : <CheckCircle2 className="w-5 h-5" />}
                        Create Batch
                     </button>
                  </div>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- Assign Testing Centers Modal --- */}
      <AnimatePresence>
        {isAssignModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-philsa-navy/70 backdrop-blur-lg">
             <motion.div
               initial={{ scale: 0.95, opacity: 0, y: 20 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               exit={{ scale: 0.95, opacity: 0, y: 20 }}
               className="bg-white w-full max-w-4xl rounded-[48px] shadow-2xl overflow-hidden border border-white/20 flex flex-col max-h-[85vh]"
             >
                <div className="px-10 py-12 border-b border-philsa-border bg-philsa-bg/30 flex justify-between items-center">
                   <div>
                      <h2 className="text-3xl font-black text-philsa-navy uppercase tracking-tight">Center Assignment</h2>
                      <p className="text-[11px] font-black text-philsa-gray uppercase tracking-[0.2em] mt-3">Assigning Operational Nodes for <span className="text-philsa-red">{targetBatchId}</span></p>
                   </div>
                   <button onClick={() => setIsAssignModalOpen(false)} className="p-4 bg-white border border-philsa-border rounded-[20px] transition-all hover:bg-philsa-bg">
                      <X className="w-7 h-7 text-philsa-navy" />
                   </button>
                </div>

                <div className="p-10 space-y-10 overflow-y-auto">
                   <div className="relative">
                      <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-6 h-6 text-philsa-gray/30" />
                      <input 
                         type="text" 
                         placeholder="Search testing centers by name, region, or capacity threshold..." 
                         className="input-philsa !pl-16 !bg-philsa-bg/50 !py-6" 
                         value={centerSearchQuery}
                         onChange={e => setCenterSearchQuery(e.target.value)}
                      />
                   </div>

                   <div className="overflow-x-auto border border-philsa-border rounded-[24px] bg-white shadow-sm max-h-[40vh]">
                      <table className="w-full text-left border-collapse">
                         <thead>
                            <tr className="bg-philsa-bg border-b border-philsa-border text-[9px] uppercase tracking-widest text-[#5E6673] font-black font-sans">
                               <th className="px-6 py-4 text-center w-24">Select</th>
                               <th className="px-6 py-4">Testing Node Name</th>
                               <th className="px-6 py-4">Location</th>
                               <th className="px-6 py-4">Planned Capacity</th>
                               <th className="px-6 py-4 text-right">Operational Status</th>
                            </tr>
                         </thead>
                         <tbody>
                            {filteredCentersForAssign.length > 0 ? (
                               filteredCentersForAssign.map(center => {
                                  const batch = batches.find(b => b.id === targetBatchId);
                                  const isAssigned = batch?.assignedCenters.some(c => c.id === center.id);
                                  return (
                                     <tr 
                                        key={center.id}
                                        onClick={() => handleCenterAssign(center.id)}
                                        className={cn(
                                           "border-b border-philsa-border/40 hover:bg-slate-50 transition-all cursor-pointer text-xs font-bold",
                                           isAssigned && "bg-slate-50/75"
                                        )}
                                     >
                                        <td className="px-6 py-4 text-center">
                                           <input 
                                              type="checkbox" 
                                              checked={!!isAssigned}
                                              onChange={() => {}} // toggled on row click
                                              className="w-4 h-4 rounded border-slate-300 text-philsa-navy focus:ring-philsa-navy"
                                           />
                                        </td>
                                        <td className="px-6 py-4 font-black uppercase text-philsa-navy">{center.name}</td>
                                        <td className="px-6 py-4 text-philsa-gray uppercase tracking-wider">{center.location}</td>
                                        <td className="px-6 py-4 font-extrabold font-mono text-philsa-navy">{center.capacity.toLocaleString()} PAX</td>
                                        <td className="px-6 py-4 text-right">
                                           <span className={cn(
                                              "inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border",
                                              isAssigned ? "bg-philsa-navy text-white border-philsa-navy" : "bg-slate-50 text-slate-500 border-slate-200"
                                           )}>
                                              {isAssigned ? 'Assigned' : 'Available'}
                                           </span>
                                        </td>
                                     </tr>
                                  );
                               })
                            ) : (
                               <tr>
                                  <td colSpan={5} className="px-6 py-12 text-center text-xs text-slate-400 italic font-bold">
                                     No testing centers match your search criteria.
                                  </td>
                               </tr>
                            )}
                         </tbody>
                      </table>
                   </div>
                </div>

                <div className="p-10 border-t border-philsa-border bg-philsa-bg/30 flex justify-between items-center">
                   <div className="flex items-center gap-3">
                      <div className="px-4 h-10 bg-philsa-navy rounded-xl flex items-center justify-center text-white font-black text-xs">
                         {batches.find(b => b.id === targetBatchId)?.assignedCenters.length} / {batches.find(b => b.id === targetBatchId)?.centerLimit || '∞'}
                      </div>
                      <p className="text-[10px] font-black text-philsa-navy uppercase tracking-widest">Centers assigned to current batch (Limit: {batches.find(b => b.id === targetBatchId)?.centerLimit || '∞'})</p>
                   </div>
                   <button                        onClick={() => {
                          setConfirmModal({
                             title: "Confirm Center Assignments",
                             message: `Are you sure you want to save this selected configuration of operational centers for ${targetBatchId}? This will associate these nodes with the current batch schedule.`,
                             onConfirm: () => {
                                setIsAssignModalOpen(false);
                                setConfirmModal(null);
                                showToast("Center assignments updated successfully.");
                             }
                          });
                       }} className="px-12 py-4 bg-philsa-navy text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-philsa-red transition-all">
                      Confirm Assignments
                   </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- Registration Confirmation Modal --- */}
      <AnimatePresence>
         {isRegConfirmModalOpen && (
           <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-philsa-navy/80 backdrop-blur-md">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white w-full max-w-md rounded-[40px] shadow-2xl p-10 text-center border-t-8 border-philsa-navy"
              >
                 <div className="w-20 h-20 bg-philsa-bg rounded-full flex items-center justify-center mx-auto mb-8 border-4 border-white shadow-xl">
                    <Activity className="w-10 h-10 text-philsa-red animate-pulse" />
                 </div>
                 <h3 className="text-2xl font-black text-philsa-navy uppercase tracking-tight mb-4">Confirm Operation</h3>
                 <p className="text-sm font-medium text-philsa-gray leading-relaxed mb-10">
                   You are about to modify the <strong>National Registration State</strong> for {targetBatchId}. 
                   This action will synchronize the registration portal availability across all terrestrial testing nodes immediately.
                 </p>
                 <div className="flex flex-col gap-3">
                    <button 
                      onClick={handleRegToggleExec}
                      className="w-full py-5 bg-philsa-navy text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-philsa-red transition-all"
                    >
                       Acknowledge & Execute
                    </button>
                    <button 
                      onClick={() => setIsRegConfirmModalOpen(false)}
                      className="w-full py-5 bg-philsa-bg text-philsa-navy rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-philsa-border transition-all"
                    >
                       Cancel Directive
                    </button>
                 </div>
              </motion.div>
           </div>
         )}
      </AnimatePresence>

      {/* --- Edit Batch Details Modal --- */}
      <AnimatePresence>
         {isEditBatchModalOpen && editingBatchData && (
           <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-philsa-navy/80 backdrop-blur-md">
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden border border-white/20 flex flex-col animate-in fade-in zoom-in-95 duration-200"
              >
                <div className="px-8 py-6 border-b border-philsa-border bg-philsa-bg/40 flex justify-between items-center">
                   <div>
                      <h2 className="text-2xl font-black text-philsa-navy uppercase tracking-tight leading-none animate-in fade-in slide-in-from-top-4 duration-300">Edit Batch Details</h2>
                      <p className="text-[10px] font-black text-philsa-gray uppercase tracking-[0.22em] mt-2">Target Batch: {editingBatchData.originalId}</p>
                   </div>
                   <button onClick={() => setIsEditBatchModalOpen(false)} className="p-2.5 bg-white hover:bg-philsa-red hover:text-white rounded-[16px] transition-all border border-philsa-border hover:border-philsa-red shadow-sm group">
                      <X className="w-5 h-5 group-hover:scale-110 transition-transform" />
                   </button>
                </div>

                <form onSubmit={handleSaveBatchEdit} className="p-8 space-y-5 overflow-y-auto">
                   <div className="space-y-2">
                      <label className="text-[9px] font-black text-philsa-gray uppercase tracking-widest ml-1">Fixed National Date</label>
                      <div className="relative">
                         <CalendarIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-philsa-red/70" />
                         <input 
                           type="date" 
                           required
                           className="input-philsa !pl-12 !bg-philsa-bg !border-philsa-border focus:!bg-white focus:!ring-4 focus:!ring-philsa-red/5 !py-3 text-sm"
                           value={editingBatchData.date}
                           onChange={e => setEditingBatchData({...editingBatchData, date: e.target.value})}
                         />
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-5">
                      <div className="space-y-2">
                         <label className="text-[9px] font-black text-philsa-gray uppercase tracking-widest ml-1">Start Time (UTC+8)</label>
                         <div className="relative">
                            <Clock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-philsa-red/70" />
                            <input 
                              type="time" 
                              required
                              className="input-philsa !pl-12 !bg-philsa-bg !border-philsa-border focus:!bg-white focus:!ring-4 focus:!ring-philsa-red/5 !py-3 text-sm"
                              value={editingBatchData.startTime}
                              onChange={e => setEditingBatchData({...editingBatchData, startTime: e.target.value})}
                            />
                         </div>
                      </div>
                      <div className="space-y-2">
                         <label className="text-[9px] font-black text-philsa-gray uppercase tracking-widest ml-1">End Time (UTC+8)</label>
                         <div className="relative">
                            <Clock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-philsa-red/70" />
                            <input 
                              type="time" 
                              required
                              className="input-philsa !pl-12 !bg-philsa-bg !border-philsa-border focus:!bg-white focus:!ring-4 focus:!ring-philsa-red/5 !py-3 text-sm"
                              value={editingBatchData.endTime}
                              onChange={e => setEditingBatchData({...editingBatchData, endTime: e.target.value})}
                            />
                         </div>
                      </div>
                   </div>

                   <div className="space-y-2">
                      <label className="text-[9px] font-black text-philsa-gray uppercase tracking-widest ml-1">Testing Center Limit</label>
                      <div className="relative">
                         <Building2 className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-philsa-red/70" />
                         <input 
                           type="number" 
                           min={1}
                           required
                           className="input-philsa !pl-12 !bg-philsa-bg !border-philsa-border focus:!bg-white focus:!ring-4"
                           value={editingBatchData.centerLimit}
                           onChange={e => setEditingBatchData({...editingBatchData, centerLimit: parseInt(e.target.value) || 5})}
                         />
                      </div>
                   </div>

                   <div className="flex gap-4 pt-4">
                      <button 
                        type="button"
                        onClick={() => setIsEditBatchModalOpen(false)}
                        className="flex-1 py-4 bg-philsa-bg text-philsa-navy rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-philsa-border transition-all border border-transparent"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        className="flex-1 py-4 bg-philsa-navy text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-philsa-red transition-all flex items-center justify-center gap-2"
                      >
                         <CheckCircle2 className="w-5 h-5" />
                         Save Batch Details
                      </button>
                   </div>
                </form>
              </motion.div>
           </div>
         )}
      </AnimatePresence>

      {/* --- Edit Center Logistics Modal --- */}
      <AnimatePresence>
         {isEditCenterModalOpen && editingCenter && (
           <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-philsa-navy/80 backdrop-blur-md">
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white w-full max-w-lg rounded-[48px] shadow-2xl overflow-hidden border border-white/20 flex flex-col"
              >
                <div className="px-10 py-10 border-b border-philsa-border bg-philsa-bg/40 flex justify-between items-center">
                   <div>
                      <h2 className="text-2xl font-black text-philsa-navy uppercase tracking-tight leading-none">Edit Node Logistics</h2>
                      <p className="text-[10px] font-black text-philsa-gray uppercase tracking-[0.2em] mt-3">Target Node: {editingCenter.name}</p>
                   </div>
                   <button onClick={() => setIsEditCenterModalOpen(false)} className="p-3 bg-white hover:bg-philsa-red hover:text-white rounded-[18px] transition-all border border-philsa-border hover:border-philsa-red shadow-sm">
                      <X className="w-5 h-5" />
                   </button>
                </div>

                <form onSubmit={handleSaveCenterEdit} className="p-10 space-y-6">
                   <div className="space-y-2">
                      <label className="text-[9px] font-black text-philsa-gray uppercase tracking-widest block ml-1">Occupancy</label>
                      <input 
                        type="number"
                        required
                        min={0}
                        max={editingCenter.capacity}
                        className="input-philsa !bg-philsa-bg !border-philsa-border focus:!bg-white focus:!ring-4"
                        value={editingCenter.occupancy}
                        onChange={e => setEditingCenter({ ...editingCenter, occupancy: parseInt(e.target.value) || 0 })}
                      />
                      <p className="text-[9px] text-philsa-gray font-bold">Max Capacity: {editingCenter.capacity} PAX</p>
                   </div>

                   <div className="space-y-2">
                      <label className="text-[9px] font-black text-philsa-gray uppercase tracking-widest block ml-1">Device Readiness</label>
                      <select 
                        className="input-philsa !bg-philsa-bg !border-philsa-border focus:!bg-white focus:!ring-2"
                        value={editingCenter.deviceReadiness}
                        onChange={e => setEditingCenter({ ...editingCenter, deviceReadiness: e.target.value as any })}
                      >
                         <option value="READY">READY</option>
                         <option value="MAINTENANCE">MAINTENANCE</option>
                         <option value="OFFLINE">OFFLINE</option>
                      </select>
                   </div>

                   <div className="space-y-2">
                      <label className="text-[9px] font-black text-philsa-gray uppercase tracking-widest block ml-1">Proctor Assignment Status</label>
                      <select 
                        className="input-philsa !bg-philsa-bg !border-philsa-border focus:!bg-white focus:!ring-2"
                        value={editingCenter.proctorStatus}
                        onChange={e => setEditingCenter({ ...editingCenter, proctorStatus: e.target.value as any })}
                      >
                         <option value="ASSIGNED">ASSIGNED</option>
                         <option value="PENDING">PENDING</option>
                         <option value="INCOMPLETE">INCOMPLETE</option>
                      </select>
                   </div>

                   <div className="space-y-2">
                      <label className="text-[9px] font-black text-philsa-gray uppercase tracking-widest block ml-1">Operational Status</label>
                      <select 
                        className="input-philsa !bg-philsa-bg !border-philsa-border focus:!bg-white focus:!ring-2"
                        value={editingCenter.operationalStatus}
                        onChange={e => setEditingCenter({ ...editingCenter, operationalStatus: e.target.value as any })}
                      >
                         <option value="OPERATIONAL">OPERATIONAL</option>
                         <option value="STANDBY">STANDBY</option>
                         <option value="ISSUES">ISSUES</option>
                      </select>
                   </div>

                   <div className="flex gap-4 pt-4">
                      <button 
                        type="button"
                        onClick={() => setIsEditCenterModalOpen(false)}
                        className="flex-1 py-4 bg-philsa-bg text-philsa-navy rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-philsa-border transition-all"
                      >
                         Cancel
                      </button>
                      <button 
                        type="submit"
                        className="flex-1 py-4 bg-philsa-navy text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-philsa-red transition-all"
                      >
                         Save Logistics
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
