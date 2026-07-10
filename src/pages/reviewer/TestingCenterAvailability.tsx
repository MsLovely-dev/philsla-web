import React, { useState } from 'react';
import { useMockData } from '../../services/mockService';
import { 
  Building2, Monitor, Users, Zap, 
  Search, Download, Info, Globe, 
  Server, ShieldCheck, Activity,
  Network, Wifi, Clock, AlertCircle,
  X, XCircle, CloudOff, WifiOff, Plus
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { TestingCenterStatus, TestingCenter } from '../../types';

const STATUS_CONFIG: Record<TestingCenterStatus, { color: string; icon: any; label: string }> = {
  'AVAILABLE': { color: 'bg-emerald-50 text-emerald-600 border-emerald-200', icon: Zap, label: 'Available' },
  'FULL_CAPACITY': { color: 'bg-amber-50 text-amber-600 border-amber-200', icon: Users, label: 'Full Capacity' },
  'UNDER_MAINTENANCE': { color: 'bg-slate-100 text-slate-500 border-slate-300', icon: Server, label: 'Maintenance' },
  'OFFLINE': { color: 'bg-red-50 text-red-600 border-red-200', icon: CloudOff, label: 'Offline' },
  'NETWORK_ISSUE': { color: 'bg-amber-500 text-white border-amber-500', icon: WifiOff, label: 'Network Alert' },
  'UNAVAILABLE': { color: 'bg-slate-800 text-white border-slate-900', icon: XCircle, label: 'Unavailable' }
};

const ALL_PROCTORS = [
  "Dr. Emmanuel L. Ramos",
  "Prof. Clara Dela Cruz",
  "Engr. Roberto Valenzuela",
  "Ms. Beatrice Aquino",
  "Dr. Maria Elena Santos",
  "Prof. Sergio Aguinaldo",
  "Dr. Clara B. Gonzaga",
  "Engr. Jonalyn M. Victoria",
  "Ms. Patricia Mendoza",
  "Mr. Michael V. de Leon",
  "Prof. Antonio K. Solis",
  "Dr. Elizabeth G. Ramos",
  "Mr. Gabriel P. Reyes",
  "Ms. Nicole S. Mendoza"
];

function getProctorNames(centerId: string, count: number): string[] {
  const names: string[] = [];
  let seed = 0;
  for (let i = 0; i < centerId.length; i++) {
    seed += centerId.charCodeAt(i);
  }
  for (let i = 0; i < count; i++) {
    const index = (seed + i * 11) % ALL_PROCTORS.length;
    names.push(ALL_PROCTORS[index]);
  }
  return names;
}

export default function TestingCenterAvailability() {
  const { testingCenters, createTestingCenter, proctors, setTestingCenters } = useMockData();
  const [selectedCenter, setSelectedCenter] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCenterData, setEditingCenterData] = useState<any | null>(null);

  // Add Testing Center form states
  const [isAddingCenter, setIsAddingCenter] = useState(false);
  const [newCenterName, setNewCenterName] = useState('');
  const [newCenterRegion, setNewCenterRegion] = useState('');
  const [newCenterProvince, setNewCenterProvince] = useState('');
  const [newCenterCapacity, setNewCenterCapacity] = useState(150);
  const [newCenterAssignedProctors, setNewCenterAssignedProctors] = useState<string[]>([]);
  const [newCenterStatus, setNewCenterStatus] = useState<TestingCenterStatus>('AVAILABLE');
  const [newCenterNetwork, setNewCenterNetwork] = useState(98);

  const getOccupiedProctors = () => {
    const occupied = new Set<string>();
    testingCenters.forEach(tc => {
      const proctorsForTc = tc.assignedProctors && tc.assignedProctors.length > 0
        ? tc.assignedProctors
        : getProctorNames(tc.id, tc.proctors || 0);
      proctorsForTc.forEach(p => occupied.add(p));
    });
    return occupied;
  };

  const occupiedProctorsSet = getOccupiedProctors();
  const dynamicProctorNames = proctors.map(p => p.name);
  const combinedProctors = Array.from(new Set([...ALL_PROCTORS, ...dynamicProctorNames]));
  const availableProctors = combinedProctors.filter(p => !occupiedProctorsSet.has(p));

  const activeCenter = selectedCenter ? (testingCenters.find(c => c.id === selectedCenter.id) || selectedCenter) : null;

  const activeCenterProctorsList = activeCenter 
    ? (activeCenter.assignedProctors && activeCenter.assignedProctors.length > 0
        ? activeCenter.assignedProctors
        : getProctorNames(activeCenter.id, activeCenter.proctors || 0))
    : [];

  const unassignedProctorsForActiveCenter = combinedProctors.filter(
    proctor => !activeCenterProctorsList.includes(proctor)
  );

  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const requestAddProctor = (proctorName: string) => {
    setConfirmModal({
      title: "Confirm Proctor Assignment",
      message: `Are you sure you want to assign ${proctorName} to ${activeCenter?.name || "this testing center"}?`,
      onConfirm: () => {
        handleAddProctorToActiveCenter(proctorName);
        setConfirmModal(null);
      }
    });
  };

  const requestRemoveProctor = (proctorName: string) => {
    setConfirmModal({
      title: "Confirm Proctor Removal",
      message: `Are you sure you want to remove ${proctorName} from ${activeCenter?.name || "this testing center"}?`,
      onConfirm: () => {
        handleRemoveProctorFromActiveCenter(proctorName);
        setConfirmModal(null);
      }
    });
  };

  const requestAddCenter = (e: React.FormEvent) => {
    e.preventDefault();
    setConfirmModal({
      title: "Confirm Testing Center Registration",
      message: `Are you sure you want to register "${newCenterName}" under ${newCenterRegion} with a capacity of ${newCenterCapacity} workstations?`,
      onConfirm: () => {
        createTestingCenter({
          name: newCenterName,
          region: newCenterRegion,
          province: newCenterProvince,
          capacity: newCenterCapacity,
          availableSeats: newCenterCapacity,
          assignedProctors: newCenterAssignedProctors,
          proctors: newCenterAssignedProctors.length,
          status: newCenterStatus,
          network: newCenterNetwork
        });
        // Reset form
        setNewCenterName('');
        setNewCenterRegion('');
        setNewCenterProvince('');
        setNewCenterCapacity(150);
        setNewCenterAssignedProctors([]);
        setNewCenterStatus('AVAILABLE');
        setNewCenterNetwork(98);
        setIsAddingCenter(false);
        setConfirmModal(null);
      }
    });
  };

  const handleAddProctorToActiveCenter = (proctorName: string) => {
    if (!activeCenter) return;
    setTestingCenters(prev => prev.map(tc => {
      if (tc.id === activeCenter.id) {
        const currentList = tc.assignedProctors && tc.assignedProctors.length > 0
          ? tc.assignedProctors
          : getProctorNames(tc.id, tc.proctors || 0);
        
        if (!currentList.includes(proctorName)) {
          const updatedList = [...currentList, proctorName];
          return {
            ...tc,
            assignedProctors: updatedList,
            proctors: updatedList.length
          };
        }
      }
      return tc;
    }));
  };

  const handleRemoveProctorFromActiveCenter = (proctorName: string) => {
    if (!activeCenter) return;
    setTestingCenters(prev => prev.map(tc => {
      if (tc.id === activeCenter.id) {
        const currentList = tc.assignedProctors && tc.assignedProctors.length > 0
          ? tc.assignedProctors
          : getProctorNames(tc.id, tc.proctors || 0);

        const updatedList = currentList.filter(name => name !== proctorName);
        return {
          ...tc,
          assignedProctors: updatedList,
          proctors: updatedList.length
        };
      }
      return tc;
    }));
  };

  const handleAddCenterSubmit = (e: React.FormEvent) => {
    requestAddCenter(e);
  };

  const handleSaveCenterEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCenterData) return;
    setConfirmModal({
      title: "Confirm Center Modifications",
      message: `Are you sure you want to update the configuration for "${editingCenterData.name}"? This will save all edits immediately.`,
      onConfirm: () => {
        setTestingCenters(prev => prev.map(tc => tc.id === editingCenterData.id ? editingCenterData : tc));
        setEditingCenterData(null);
        setConfirmModal(null);
      }
    });
  };

  const handleRemoveCenter = (centerId: string, centerName: string) => {
    setConfirmModal({
      title: "Confirm Center Deregistration",
      message: `Are you sure you want to permanently remove "${centerName}" from the roster of terrestrial examination nodes? This action is irreversible.`,
      onConfirm: () => {
        setTestingCenters(prev => prev.filter(tc => tc.id !== centerId));
        setConfirmModal(null);
      }
    });
  };

  const filteredCenters = testingCenters.filter(tc => 
    tc.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    tc.region.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-philsa-navy tracking-tight leading-none mb-3">
             Center Availability
          </h1>
          <p className="text-philsa-gray text-sm font-medium max-w-2xl">
              Real-time monitoring of nationwide examination nodes and capacity metrics.
          </p>
        </div>
        <div className="flex items-center gap-3">
           <button 
              onClick={() => setIsAddingCenter(true)}
              className="px-6 py-3 bg-philsa-navy text-white hover:bg-slate-800 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-sm transition-all flex items-center gap-2 cursor-pointer"
           >
              <Plus className="w-4 h-4" /> Add Testing Center
           </button>
           <button className="px-6 py-3 bg-white border border-philsa-border text-philsa-navy rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-sm hover:bg-philsa-bg transition-all flex items-center gap-2">
              <Download className="w-4 h-4" /> Export
           </button>
        </div>
      </div>

      {/* Grid Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-xl bg-philsa-bg text-philsa-navy">
               <Building2 className="w-6 h-6" />
            </div>
            <div>
               <p className="text-[10px] font-black text-philsa-gray uppercase tracking-wider mb-0.5">Active Nodes</p>
               <h3 className="text-2xl font-black text-philsa-navy leading-none">{testingCenters.length}</h3>
            </div>
         </div>
         <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-xl bg-[#e8f7f0] text-emerald-600">
               <Zap className="w-6 h-6" />
            </div>
            <div>
               <p className="text-[10px] font-black text-philsa-gray uppercase tracking-wider mb-0.5">Online Status</p>
               <h3 className="text-2xl font-black text-[#00563F] leading-none">
                 {testingCenters.filter(c => c.status === 'AVAILABLE').length} / {testingCenters.length}
               </h3>
            </div>
         </div>
         <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-xl bg-slate-50 text-slate-600">
               <Users className="w-6 h-6" />
            </div>
            <div>
               <p className="text-[10px] font-black text-philsa-gray uppercase tracking-wider mb-0.5">Proctor Force</p>
               <h3 className="text-2xl font-black text-slate-800 leading-none">
                 {testingCenters.reduce((acc, c) => {
                   const count = c.assignedProctors && c.assignedProctors.length > 0 ? c.assignedProctors.length : (c.proctors || 0);
                   return acc + count;
                 }, 0)}
               </h3>
            </div>
         </div>
         <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-xl bg-orange-50 text-orange-600">
               <Monitor className="w-6 h-6" />
            </div>
            <div>
               <p className="text-[10px] font-black text-philsa-gray uppercase tracking-wider mb-0.5">Total Capacity</p>
               <h3 className="text-2xl font-black text-slate-800 leading-none">
                  {testingCenters.reduce((sum, tc) => sum + (tc.capacity || 0), 0)}
               </h3>
            </div>
         </div>
      </div>

      {/* Main Table view */}
      <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden">
         <div className="p-6 border-b border-slate-150 bg-slate-50/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:w-80">
               <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
               <input 
                  type="text"
                  placeholder="Search by name or region..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-700 outline-none focus:border-philsa-navy focus:ring-1 focus:ring-philsa-navy/10 placeholder:text-slate-400"
               />
            </div>
            <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{filteredCenters.length} results found</span>
            </div>
         </div>

         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="border-b border-slate-150 bg-slate-50 text-slate-400">
                     <th className="px-10 py-5 text-[10px] font-bold uppercase tracking-widest">Testing Center</th>
                     <th className="px-10 py-5 text-[10px] font-bold uppercase tracking-widest text-center">Status</th>
                     <th className="px-10 py-5 text-[10px] font-bold uppercase tracking-widest text-center">Assigned Proctor Staff</th>
                     <th className="px-10 py-5 text-[10px] font-bold uppercase tracking-widest">Capacity Used</th>
                     <th className="px-10 py-5 text-[10px] font-bold uppercase tracking-widest text-right">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {filteredCenters.map(center => {
                     const config = STATUS_CONFIG[center.status as TestingCenterStatus] || STATUS_CONFIG['AVAILABLE'];
                     const StatusIcon = config.icon;
                     
                     // Generate deterministic allocated student metric
                     let seed = 0;
                     for (let i = 0; i < center.id.length; i++) {
                       seed += center.id.charCodeAt(i);
                     }
                     const students = (seed * 7) % center.capacity;

                     return (
                       <tr key={center.id} className="hover:bg-slate-50/50 transition-all group">
                          <td className="px-10 py-8">
                             <p className="text-sm font-black text-philsa-navy tracking-tight">{center.name}</p>
                             <div className="flex items-center gap-2 mt-1.5 ">
                                <span className="text-[10px] font-black text-philsa-red uppercase tracking-widest leading-none">{center.province}</span>
                                <span className="w-1.5 h-1.5 bg-philsa-border rounded-full" />
                                <span className="text-[9px] font-black text-philsa-gray uppercase tracking-widest leading-none">NODE {center.id}</span>
                             </div>
                          </td>
                          <td className="px-10 py-8">
                             <div className="flex justify-center">
                               <span className={cn(
                                  "px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest border flex items-center gap-2 w-fit whitespace-nowrap shadow-sm",
                                  config.color
                                )}>
                                  <StatusIcon className="w-4 h-4" /> {config.label}
                               </span>
                             </div>
                          </td>
                          <td className="px-10 py-8 text-center">
                            {(() => {
                              const centerProctorsList = center.assignedProctors && center.assignedProctors.length > 0 
                                ? center.assignedProctors 
                                : getProctorNames(center.id, center.proctors || 0);
                              const displayProctors = centerProctorsList.slice(0, 3);
                              return (
                                <>
                                  <div className="flex -space-x-3 justify-center mb-1">
                                    {displayProctors.map((proctor, i) => {
                                      const initials = proctor
                                        .split(' ')
                                        .filter(w => !w.includes('.'))
                                        .map(w => w[0])
                                        .slice(0, 2)
                                        .join('');
                                      return (
                                        <div key={i} title={proctor} className="w-8 h-8 rounded-full border-2 border-white bg-philsa-bg flex items-center justify-center text-[8px] font-black text-philsa-navy">
                                          {initials || 'P'}
                                        </div>
                                      );
                                    })}
                                    {centerProctorsList.length > 3 && (
                                      <div className="w-8 h-8 rounded-full border-2 border-white bg-philsa-navy flex items-center justify-center text-[8px] font-black text-white">
                                        +{centerProctorsList.length - 3}
                                      </div>
                                    )}
                                  </div>
                                  <p className="text-[9px] text-philsa-gray font-black uppercase tracking-widest">{centerProctorsList.length} Active Staff</p>
                                </>
                              );
                            })()}
                          </td>
                          <td className="px-10 py-8">
                             <div className="space-y-2 min-w-[160px]">
                                <div className="flex justify-between items-center text-[10px] font-black text-philsa-navy uppercase tracking-widest">
                                   <span>{students} / {center.capacity}</span>
                                   <span className={cn(students / center.capacity > 0.9 ? 'text-philsa-red' : 'text-emerald-600')}>
                                     {Math.round((students / center.capacity) * 100)}%
                                   </span>
                                </div>
                                <div className="w-full h-2.5 bg-philsa-bg rounded-full overflow-hidden border border-philsa-border shadow-inner">
                                   <div 
                                     className={cn("h-full transition-all duration-1000", students / center.capacity > 0.9 ? 'bg-philsa-red' : 'bg-philsa-navy')} 
                                     style={{ width: `${(students / center.capacity) * 100}%` }} 
                                   />
                                </div>
                             </div>
                          </td>
                          <td className="px-10 py-8 text-right">
                             <div className="flex items-center justify-end gap-2 text-right">
                                <button 
                                   onClick={() => setSelectedCenter(center)}
                                   className="px-4 py-2 bg-[#f4f7f6] hover:bg-philsa-navy hover:text-white text-philsa-navy rounded-xl text-[9px] font-black uppercase tracking-widest border border-transparent shadow-sm cursor-pointer transition-all shrink-0"
                                >
                                   View
                                </button>
                                <button 
                                   onClick={() => setEditingCenterData(center)}
                                   className="px-4 py-2 bg-[#fef8f0] hover:bg-[#d97706] hover:text-white text-[#d97706] rounded-xl text-[9px] font-black uppercase tracking-widest border border-transparent shadow-sm cursor-pointer transition-all shrink-0"
                                >
                                   Edit
                                </button>
                                <button 
                                   onClick={() => handleRemoveCenter(center.id, center.name)}
                                   className="px-4 py-2 bg-[#fff5f5] hover:bg-philsa-red hover:text-white text-philsa-red rounded-xl text-[9px] font-black uppercase tracking-widest border border-transparent shadow-sm cursor-pointer transition-all shrink-0"
                                >
                                   Remove
                                </button>
                             </div>
                          </td>
                       </tr>
                     );
                  })}
               </tbody>
            </table>
         </div>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {activeCenter && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-philsa-navy/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col border border-slate-100"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white text-left">
                 <div>
                    <h2 className="text-sm font-bold text-philsa-navy leading-none mb-1">{activeCenter.name}</h2>
                    <p className="text-slate-400 text-[10px] font-semibold uppercase font-mono leading-none">{activeCenter.province} • {activeCenter.id}</p>
                 </div>
                 <button onClick={() => setSelectedCenter(null)} className="text-slate-400 hover:text-slate-600 transition-all cursor-pointer">
                    <X className="w-5 h-5" />
                 </button>
              </div>

               <div className="p-6 space-y-6 text-left overflow-y-auto max-h-[75vh]">
                  <div className="grid grid-cols-3 gap-3">
                     <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-150">
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Capacity</p>
                        <p className="text-xs font-bold text-slate-800">{activeCenter.capacity - (activeCenter.availableSeats || 0)} / {activeCenter.capacity}</p>
                     </div>
                     <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-150">
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Network</p>
                        <p className="text-xs font-bold text-emerald-600">{activeCenter.network || 0}% Uptime</p>
                     </div>
                     <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-150">
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Status</p>
                        <p className="text-[9px] font-black uppercase text-philsa-navy leading-tight">{STATUS_CONFIG[activeCenter.status as TestingCenterStatus]?.label || activeCenter.status}</p>
                     </div>
                  </div>

                  <div className="space-y-3">
                     <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest block font-black mb-1">Assigned Proctor Staff ({activeCenterProctorsList.length})</h3>
                     {activeCenterProctorsList.length > 0 ? (
                        <div className="grid grid-cols-1 gap-1.5 max-h-60 overflow-y-auto">
                           {activeCenterProctorsList.map((proctor: string, idx: number) => {
                              const initials = proctor.split(' ')
                                .filter(w => !w.includes('.'))
                                .map(w => w[0])
                                .slice(0, 2)
                                .join('');
                              return (
                                 <div key={idx} className="flex items-center gap-3 p-2 bg-slate-50 rounded-xl border border-slate-100 text-slate-700 text-xs font-semibold font-sans">
                                    <div className="w-8 h-8 rounded-lg bg-philsa-navy/10 text-philsa-navy flex items-center justify-center text-[10px] font-black uppercase shrink-0">
                                       {initials || 'P'}
                                    </div>
                                    <div>
                                       <p className="text-xs font-bold text-slate-800">{proctor}</p>
                                       <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Assigned Proctor</p>
                                    </div>
                                    <div className="flex items-center gap-2 ml-auto">
                                       <span className="text-[8px] font-black text-emerald-600 uppercase tracking-wider bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md">Active</span>
                                       <button 
                                         type="button"
                                         onClick={() => requestRemoveProctor(proctor)}
                                         className="text-slate-400 hover:text-philsa-red hover:bg-rose-50 p-1.5 rounded-lg transition-all cursor-pointer"
                                         title="Remove Proctor From Center"
                                       >
                                         <X className="w-3.5 h-3.5" />
                                       </button>
                                    </div>
                                 </div>
                              );
                           })}
                        </div>
                     ) : (
                        <p className="text-xs text-slate-400 italic">No staff assigned to this node.</p>
                     )}

                     {unassignedProctorsForActiveCenter.length > 0 ? (
                        <div className="pt-3 border-t border-slate-100 flex items-center gap-2 mt-4">
                          <select 
                             id="add-proctor-select"
                             className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-philsa-navy focus:outline-none focus:ring-1 focus:ring-philsa-navy/10 cursor-pointer shadow-sm"
                             defaultValue=""
                             onChange={(e) => {
                               const val = e.target.value;
                               if (val) {
                                 requestAddProctor(val);
                                 e.target.value = ""; // Reset
                               }
                             }}
                          >
                             <option value="" disabled>+ Assign New Proctor...</option>
                             {unassignedProctorsForActiveCenter.map(p => (
                               <option key={p} value={p}>{p}</option>
                             ))}
                          </select>
                        </div>
                     ) : (
                        <p className="text-[10px] text-slate-400 italic mt-2">All potential proctors have been allocated.</p>
                     )}
                  </div>

                  <div className="space-y-2">
                     <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Operational Summary</h3>
                     <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <p className="text-xs font-medium text-slate-600 leading-relaxed">
                           This testing center is currently in an active <strong>{STATUS_CONFIG[activeCenter.status as TestingCenterStatus]?.label}</strong> state. Workstations have been validated.
                        </p>
                     </div>
                  </div>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Testing Center Modal */}
      <AnimatePresence>
        {isAddingCenter && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-philsa-navy/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col border border-slate-100"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white text-left">
                 <div>
                    <h2 className="text-sm font-bold text-philsa-navy leading-none mb-1">Add Testing Center</h2>
                    <p className="text-slate-400 text-[10px] font-semibold leading-none">Register a new physical examination center.</p>
                 </div>
                 <button onClick={() => setIsAddingCenter(false)} className="text-slate-400 hover:text-slate-600 transition-all cursor-pointer">
                    <X className="w-5 h-5" />
                 </button>
              </div>

               <form onSubmit={handleAddCenterSubmit} className="p-6 space-y-4 text-left overflow-y-auto max-h-[75vh]">
                  <div className="space-y-1">
                     <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Center Name *</label>
                     <input 
                        required
                        type="text" 
                        value={newCenterName}
                        onChange={(e) => setNewCenterName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:bg-white focus:border-philsa-navy focus:ring-1 focus:ring-philsa-navy/10 outline-none" 
                        placeholder="e.g. Mindanao State University"
                     />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Region *</label>
                        <input 
                           required
                           type="text" 
                           value={newCenterRegion}
                           onChange={(e) => setNewCenterRegion(e.target.value)}
                           className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:bg-white focus:border-philsa-navy focus:ring-1 focus:ring-philsa-navy/10 outline-none" 
                           placeholder="e.g. Region X"
                        />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Province *</label>
                        <input 
                           required
                           type="text" 
                           value={newCenterProvince}
                           onChange={(e) => setNewCenterProvince(e.target.value)}
                           className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:bg-white focus:border-philsa-navy focus:ring-1 focus:ring-philsa-navy/10 outline-none" 
                           placeholder="e.g. Lanao del Sur"
                        />
                     </div>
                  </div>

                  <div className="space-y-1">
                     <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Seating Capacity *</label>
                     <input 
                        required
                        type="number" 
                        min={10}
                        value={newCenterCapacity}
                        onChange={(e) => setNewCenterCapacity(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:bg-white focus:border-philsa-navy focus:ring-1 focus:ring-philsa-navy/10 outline-none" 
                     />
                  </div>

                  <div className="space-y-2">
                     <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-black">Assigned Proctors</label>
                        <span className="text-[9px] font-black text-white uppercase bg-philsa-navy px-2 py-0.5 rounded-full">
                           {newCenterAssignedProctors.length} Selected
                        </span>
                     </div>
                     <p className="text-[10px] text-slate-400 font-medium -mt-1">Select available proctors to allocate. Assessed for unassigned status.</p>
                     
                     {availableProctors.length > 0 ? (
                        <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50/50 space-y-1 divide-y divide-slate-100">
                           {availableProctors.map((proctor) => {
                              const isSelected = newCenterAssignedProctors.includes(proctor);
                              return (
                                 <label 
                                    key={proctor} 
                                    className={cn(
                                       "flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all hover:bg-slate-100 select-none",
                                       isSelected ? "bg-philsa-navy/10 text-philsa-navy font-bold" : "text-slate-700"
                                    )}
                                 >
                                    <input 
                                       type="checkbox"
                                       checked={isSelected}
                                       onChange={(e) => {
                                          if (e.target.checked) {
                                             setNewCenterAssignedProctors(prev => [...prev, proctor]);
                                          } else {
                                             setNewCenterAssignedProctors(prev => prev.filter(p => p !== proctor));
                                          }
                                       }}
                                       className="rounded border-slate-300 text-philsa-navy focus:ring-philsa-navy cursor-pointer w-4 h-4"
                                    />
                                    <span>{proctor}</span>
                                 </label>
                              );
                           })}
                        </div>
                     ) : (
                        <p className="text-xs text-amber-600 font-semibold bg-amber-50 p-2.5 rounded-xl border border-amber-100">
                           No available proctors. All proctors are currently active in other nodes.
                        </p>
                     )}

                     {newCenterAssignedProctors.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                           {newCenterAssignedProctors.map(p => (
                              <span key={p} className="inline-flex items-center gap-1.5 bg-philsa-navy text-white text-[9px] font-bold px-2.5 py-1 rounded-lg shadow-sm">
                                 {p}
                                 <button
                                    type="button"
                                    className="hover:text-philsa-red transition-all ml-1"
                                    onClick={() => setNewCenterAssignedProctors(prev => prev.filter(x => x !== p))}
                                 >
                                    <X className="w-3 h-3" />
                                 </button>
                              </span>
                           ))}
                        </div>
                     )}
                  </div>

                  <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 -mx-6 -mb-6 mt-6">
                     <button type="button" onClick={() => setIsAddingCenter(false)} className="px-5 py-2 bg-white border border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-600 rounded-xl hover:bg-slate-100 transition-all cursor-pointer">Discard</button>
                     <button type="submit" className="bg-philsa-navy text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-800 transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-philsa-navy/10">
                        Create Center
                     </button>
                  </div>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Testing Center Modal */}
      <AnimatePresence>
        {editingCenterData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-philsa-navy/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col border border-slate-100 animate-in fade-in zoom-in-95 duration-200"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white text-left">
                 <div>
                    <h2 className="text-sm font-bold text-philsa-navy leading-none mb-1">Edit Testing Center</h2>
                    <p className="text-slate-400 text-[10px] font-semibold leading-none">Modify physical examination center configuration.</p>
                 </div>
                 <button onClick={() => setEditingCenterData(null)} className="text-slate-400 hover:text-slate-600 transition-all cursor-pointer">
                    <X className="w-5 h-5" />
                 </button>
              </div>

               <form onSubmit={handleSaveCenterEdit} className="p-6 space-y-4 text-left overflow-y-auto max-h-[75vh]">
                  <div className="space-y-1">
                     <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Center Name *</label>
                     <input 
                        required
                        type="text" 
                        value={editingCenterData.name}
                        onChange={(e) => setEditingCenterData({...editingCenterData, name: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:bg-white focus:border-philsa-navy focus:ring-1 focus:ring-philsa-navy/10 outline-none" 
                     />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Region *</label>
                        <input 
                           required
                           type="text" 
                           value={editingCenterData.region}
                           onChange={(e) => setEditingCenterData({...editingCenterData, region: e.target.value})}
                           className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:bg-white focus:border-philsa-navy focus:ring-1 focus:ring-philsa-navy/10 outline-none" 
                        />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Province *</label>
                        <input 
                           required
                           type="text" 
                           value={editingCenterData.province}
                           onChange={(e) => setEditingCenterData({...editingCenterData, province: e.target.value})}
                           className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:bg-white focus:border-philsa-navy focus:ring-1 focus:ring-philsa-navy/10 outline-none" 
                        />
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Seating Capacity *</label>
                        <input 
                           required
                           type="number" 
                           min={1}
                           value={editingCenterData.capacity}
                           onChange={(e) => setEditingCenterData({...editingCenterData, capacity: Number(e.target.value)})}
                           className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:bg-white focus:border-philsa-navy focus:ring-1 focus:ring-philsa-navy/10 outline-none" 
                        />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Network Uptime % *</label>
                        <input 
                           required
                           type="number" 
                           min={0}
                           max={100}
                           value={editingCenterData.network}
                           onChange={(e) => setEditingCenterData({...editingCenterData, network: Number(e.target.value)})}
                           className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:bg-white focus:border-philsa-navy focus:ring-1 focus:ring-philsa-navy/10 outline-none" 
                        />
                     </div>
                  </div>

                  <div className="space-y-1">
                     <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Operational Status *</label>
                     <select 
                        value={editingCenterData.status}
                        onChange={(e) => setEditingCenterData({...editingCenterData, status: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:bg-white focus:border-philsa-navy focus:ring-1 focus:ring-philsa-navy/10 outline-none cursor-pointer"
                     >
                        <option value="AVAILABLE">Available</option>
                        <option value="FULL_CAPACITY">Full Capacity</option>
                        <option value="UNDER_MAINTENANCE">Maintenance</option>
                        <option value="OFFLINE">Offline</option>
                        <option value="NETWORK_ISSUE">Network Alert</option>
                        <option value="UNAVAILABLE">Unavailable</option>
                     </select>
                  </div>

                  <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 -mx-6 -mb-6 mt-6">
                     <button type="button" onClick={() => setEditingCenterData(null)} className="px-5 py-2 bg-white border border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-600 rounded-xl hover:bg-slate-100 transition-all cursor-pointer">Discard</button>
                     <button type="submit" className="bg-philsa-navy text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-800 transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-philsa-navy/10">
                        Save Modifications
                     </button>
                  </div>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dynamic Confirmation Modal */}
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
    </div>
  );
}
