import React, { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Eye, 
  Search, 
  Filter, 
  MoreVertical,
  Laptop,
  Smartphone,
  Monitor,
  ShieldCheck,
  Building2,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../../lib/utils';

interface DeviceRequest {
  id: string;
  proctorName: string;
  testingCenter: string;
  deviceName: string;
  type: 'Laptop' | 'Desktop' | 'Tablet';
  submittedAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  details: {
    brand: string;
    osVersion: string;
    processor: string;
    ram: string;
    storage: string;
    macAddress: string;
  }
}

const MOCK_REQUESTS: DeviceRequest[] = [
  {
    id: 'REQ-001',
    proctorName: 'Justin P. Jana',
    testingCenter: 'UP Diliman Hub',
    deviceName: 'MacBook Pro Enterprise',
    type: 'Laptop',
    submittedAt: '2026-05-18 09:15',
    status: 'APPROVED',
    details: {
      brand: 'Apple',
      osVersion: 'macOS Sonoma 14.4',
      processor: 'Apple M3 Pro',
      ram: '18GB',
      storage: '512GB SSD',
      macAddress: '00:1A:2B:3C:4D:5E'
    }
  },
  {
    id: 'REQ-002',
    proctorName: 'Maricel S. Bautista',
    testingCenter: 'De La Salle University',
    deviceName: 'Dell Precision 3581',
    type: 'Laptop',
    submittedAt: '2026-05-18 10:30',
    status: 'PENDING',
    details: {
      brand: 'Dell',
      osVersion: 'Windows 11 Pro',
      processor: 'Intel Core i7-13700H',
      ram: '32GB',
      storage: '1TB NVMe',
      macAddress: '11:22:33:44:55:66'
    }
  },
  {
    id: 'REQ-003',
    proctorName: 'Alexander G. Macaraeg',
    testingCenter: 'Mapua University',
    deviceName: 'HP ZBook Studio',
    type: 'Laptop',
    submittedAt: '2026-05-17 14:20',
    status: 'PENDING',
    details: {
      brand: 'HP',
      osVersion: 'Windows 10 Enterprise',
      processor: 'Intel Xeon W-11855M',
      ram: '64GB',
      storage: '2TB SSD',
      macAddress: 'AA:BB:CC:DD:EE:FF'
    }
  }
];

export default function ProctorDeviceVerification() {
  const [requests, setRequests] = useState<DeviceRequest[]>(MOCK_REQUESTS);
  const [selectedRequest, setSelectedRequest] = useState<DeviceRequest | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');

  const filteredRequests = requests.filter(r => filter === 'ALL' || r.status === filter);

  const handleAction = (id: string, newStatus: 'APPROVED' | 'REJECTED') => {
    setRequests(requests.map(r => r.id === id ? { ...r, status: newStatus } : r));
    setSelectedRequest(null);
  };

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-philsa-navy tracking-tight mb-2">Proctor Device Verification</h1>
          <p className="text-philsa-gray font-medium max-w-2xl">
            Audit and authorize hardware profiles submitted by proctors to ensure security baseline compliance before exam deployment.
          </p>
        </div>
      </div>

      <div className="card-philsa !p-0 overflow-hidden">
        <div className="p-8 border-b border-philsa-border flex flex-col md:flex-row gap-6 justify-between items-center">
           <div className="relative flex-1 w-full">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-philsa-gray" />
              <input 
                type="text" 
                placeholder="Search proctor name, testing center, or MAC address..." 
                className="w-full bg-philsa-bg border-none rounded-2xl pl-14 pr-6 py-3.5 text-sm font-bold text-philsa-navy" 
              />
           </div>
           
           <div className="flex items-center gap-2 p-1.5 bg-philsa-bg rounded-2xl border border-philsa-border/50">
              {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    filter === f ? "bg-philsa-navy text-white shadow-lg" : "text-philsa-gray hover:bg-white hover:text-philsa-navy"
                  )}
                >
                  {f}
                </button>
              ))}
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-philsa-bg text-[10px] text-philsa-gray font-black uppercase tracking-widest">
              <tr>
                <th className="px-10 py-6">Proctor Profile</th>
                <th className="px-10 py-6">Device Specifications</th>
                <th className="px-10 py-6">Submission Data</th>
                <th className="px-10 py-6">Status Trace</th>
                <th className="px-10 py-6 text-right">Administrative Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-philsa-border">
              {filteredRequests.map((req) => (
                <tr key={req.id} className="group hover:bg-philsa-bg/30 transition-colors">
                  <td className="px-10 py-8">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-philsa-navy text-white rounded-2xl flex items-center justify-center font-black text-xs">
                          {req.proctorName.split(' ').map(n => n[0]).join('')}
                       </div>
                       <div>
                          <p className="text-sm font-black text-philsa-navy">{req.proctorName}</p>
                          <div className="flex items-center gap-1 text-[10px] text-philsa-gray font-bold uppercase mt-0.5">
                             <Building2 className="w-3 h-3" /> {req.testingCenter}
                          </div>
                       </div>
                    </div>
                  </td>
                  <td className="px-10 py-8">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-philsa-bg group-hover:bg-white rounded-xl flex items-center justify-center text-philsa-navy transition-colors">
                          {req.type === 'Laptop' ? <Laptop className="w-5 h-5" /> : req.type === 'Tablet' ? <Smartphone className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
                       </div>
                       <div>
                          <p className="text-xs font-bold text-philsa-navy">{req.deviceName}</p>
                          <p className="text-[10px] text-philsa-gray font-medium">{req.details.brand} • {req.details.osVersion}</p>
                       </div>
                    </div>
                  </td>
                  <td className="px-10 py-8">
                     <div className="flex items-center gap-2 text-[10px] text-philsa-gray font-bold uppercase">
                        <Calendar className="w-3 h-3" /> {req.submittedAt}
                     </div>
                  </td>
                  <td className="px-10 py-8">
                     <StatusBadge status={req.status} />
                  </td>
                  <td className="px-10 py-8">
                    <div className="flex items-center justify-end gap-2">
                       <button 
                         onClick={() => setSelectedRequest(req)}
                         className="p-3 bg-philsa-bg hover:bg-philsa-navy hover:text-white rounded-xl text-philsa-navy transition-all"
                       >
                          <Eye className="w-4 h-4" />
                       </button>
                       {req.status === 'PENDING' && (
                         <>
                           <button 
                             onClick={() => handleAction(req.id, 'APPROVED')}
                             className="p-3 bg-emerald-50 hover:bg-emerald-600 hover:text-white rounded-xl text-emerald-600 transition-all"
                           >
                              <CheckCircle2 className="w-4 h-4" />
                           </button>
                           <button 
                             onClick={() => handleAction(req.id, 'REJECTED')}
                             className="p-3 bg-red-50 hover:bg-philsa-red hover:text-white rounded-xl text-philsa-red transition-all"
                           >
                              <XCircle className="w-4 h-4" />
                           </button>
                         </>
                       )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {selectedRequest && (
          <RequestDetailModal 
            request={selectedRequest}
            onClose={() => setSelectedRequest(null)}
            onApprove={() => handleAction(selectedRequest.id, 'APPROVED')}
            onReject={() => handleAction(selectedRequest.id, 'REJECTED')}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function StatusBadge({ status }: { status: DeviceRequest['status'] }) {
  const styles = {
    APPROVED: 'bg-emerald-100 text-emerald-700',
    PENDING: 'bg-amber-100 text-amber-700',
    REJECTED: 'bg-red-100 text-philsa-red'
  };

  return (
    <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest", styles[status])}>
      {status}
    </span>
  );
}

function RequestDetailModal({ request, onClose, onApprove, onReject }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-neutral-900/60 backdrop-blur-xs" 
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative bg-white w-full max-w-lg rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
      >
        {/* Header */}
        <div className="border-b border-philsa-border px-6 py-5 flex items-start justify-between">
           <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[9px] font-black uppercase tracking-widest bg-philsa-red/10 text-philsa-red px-2 py-0.5 rounded">
                  {request.type}
                </span>
                <span className="text-[9px] font-black uppercase tracking-widest bg-gray-100 text-philsa-gray px-2 py-0.5 rounded">
                  {request.id}
                </span>
              </div>
              <h2 className="text-xl font-bold text-philsa-navy tracking-tight">{request.deviceName}</h2>
              <p className="text-[11px] font-bold text-philsa-gray uppercase tracking-wider mt-0.5 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-philsa-red" /> {request.testingCenter}
              </p>
           </div>
           
           <button 
             onClick={onClose}
             className="text-philsa-gray hover:text-philsa-navy p-1.5 hover:bg-philsa-bg rounded-lg transition-colors"
           >
             <XCircle className="w-5 h-5" />
           </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
           {/* Proctor Profile */}
           <div className="bg-philsa-bg p-4 rounded-xl border border-philsa-border flex items-center gap-3">
              <div className="w-10 h-10 bg-philsa-red text-white rounded-lg flex items-center justify-center font-black text-xs">
                 {request.proctorName.split(' ').map((n: string) => n[0]).join('')}
              </div>
              <div>
                 <p className="text-xs font-black uppercase tracking-wider text-philsa-gray">Submitted By</p>
                 <p className="text-sm font-bold text-philsa-navy">{request.proctorName}</p>
              </div>
           </div>

           {/* Specifications Grid */}
           <div>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-philsa-gray/70 mb-3">Device Technical Audit</h3>
              <div className="grid grid-cols-2 gap-4">
                 <SpecItem label="Hardware Brand" value={request.details.brand} />
                 <SpecItem label="OS Version" value={request.details.osVersion} />
                 <SpecItem label="Processor" value={request.details.processor} className="col-span-2" />
                 <SpecItem label="RAM Size" value={request.details.ram} />
                 <SpecItem label="Storage" value={request.details.storage} />
                 <SpecItem label="MAC Address" value={request.details.macAddress} className="col-span-2 font-mono" />
              </div>
           </div>

           {/* Actions / Status */}
           {request.status === 'PENDING' ? (
             <div className="flex items-center gap-3 pt-4 border-t border-philsa-border">
                <button 
                  onClick={onReject}
                  className="flex-1 border border-red-200 text-philsa-red py-3 rounded-xl font-bold uppercase text-xs tracking-wider hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                >
                   Reject Profile
                </button>
                <button 
                  onClick={onApprove}
                  className="flex-1 bg-philsa-red hover:bg-philsa-red-hover text-white py-3 rounded-xl font-bold uppercase text-xs tracking-wider shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                >
                   Authorize Hardware
                </button>
             </div>
           ) : (
             <div className="pt-4 border-t border-philsa-border flex items-center justify-between text-xs">
                <span className="font-bold text-philsa-gray">Audit Status:</span>
                <span className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest",
                  request.status === 'APPROVED' ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-philsa-red border border-red-200"
                )}>
                  Device {request.status}
                </span>
             </div>
           )}
        </div>
      </motion.div>
    </div>
  );
}

function SpecItem({ label, value, className }: any) {
  return (
    <div className={cn("bg-philsa-bg p-3 rounded-lg border border-philsa-border/60", className)}>
       <p className="text-[9px] font-black uppercase text-philsa-gray/70 tracking-widest mb-1">{label}</p>
       <p className="text-xs font-bold text-philsa-navy">{value}</p>
    </div>
  );
}
