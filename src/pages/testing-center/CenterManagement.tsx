import React, { useState } from 'react';
import { usePhilSA } from '../../PhilSAContext';
import { useMockData } from '../../services/mockService';
import { ShieldCheck, MapPin, Users, Activity, AlertTriangle, RefreshCw, CheckCircle2, CloudOff, WifiOff } from 'lucide-react';
import { cn } from '../../lib/utils';
import { TestingCenterStatus } from '../../types';

export default function CenterManagement() {
  const { user } = usePhilSA();
  const { testingCenters, updateTestingCenterStatus } = useMockData();
  
  // For this mock, we'll assume the admin manages one or more centers
  // In a real app, this would be filtered by the admin's assigned center
  const myCenter = testingCenters[0]; // Just use the first one for demonstration
  
  const [isUpdating, setIsUpdating] = useState(false);

  const statusOptions: { label: string; value: TestingCenterStatus; icon: any; color: string; bgColor: string }[] = [
    { label: 'Available', value: 'AVAILABLE', icon: CheckCircle2, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
    { label: 'Full Capacity', value: 'FULL_CAPACITY', icon: Users, color: 'text-amber-600', bgColor: 'bg-amber-50' },
    { label: 'Under Maintenance', value: 'UNDER_MAINTENANCE', icon: ShieldCheck, color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { label: 'Offline', value: 'OFFLINE', icon: CloudOff, color: 'text-slate-600', bgColor: 'bg-slate-50' },
    { label: 'Network Issue', value: 'NETWORK_ISSUE', icon: WifiOff, color: 'text-rose-600', bgColor: 'bg-rose-50' },
  ];

  const handleStatusChange = async (status: TestingCenterStatus) => {
    setIsUpdating(true);
    await new Promise(r => setTimeout(r, 800));
    updateTestingCenterStatus(myCenter.id, status, user?.id || 'admin');
    setIsUpdating(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 mb-2">Testing Center Control</h1>
          <p className="text-slate-500 font-medium tracking-tight">Real-time status reporting for centralized monitoring and awareness.</p>
        </div>
        <div className="flex items-center gap-3">
           <div className="px-4 py-2 bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
              <Activity className="w-4 h-4 animate-pulse text-emerald-400" /> Live Feed
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Status Display Card */}
        <div className="md:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm p-8 space-y-6">
          <div className="flex items-start justify-between">
            <div className="space-y-4">
               <div>
                  <h2 className="text-2xl font-bold text-slate-800">{myCenter.name}</h2>
                  <div className="flex items-center gap-2 text-slate-400 mt-1">
                    <MapPin className="w-3 h-3" />
                    <span className="text-xs font-bold uppercase tracking-wider">{myCenter.region} • {myCenter.province}</span>
                  </div>
               </div>
               
               <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Total Capacity</p>
                    <p className="text-2xl font-black text-slate-800">{myCenter.capacity}</p>
                  </div>
                  <div className="w-px h-10 bg-slate-100"></div>
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Available Seats</p>
                    <p className="text-2xl font-black text-slate-800">{myCenter.availableSeats}</p>
                  </div>
               </div>
            </div>

            <div className={cn(
              "px-4 py-6 rounded-2xl border text-center flex flex-col items-center justify-center gap-2 min-w-32",
              statusOptions.find(o => o.value === myCenter.status)?.bgColor || 'bg-slate-50',
              statusOptions.find(o => o.value === myCenter.status)?.color || 'text-slate-600'
            )}>
               {React.createElement(statusOptions.find(o => o.value === myCenter.status)?.icon || CheckCircle2, { className: "w-8 h-8" })}
               <span className="text-[10px] font-black uppercase tracking-widest">{myCenter.status.replace('_', ' ')}</span>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between">
             <div className="flex items-center gap-3">
                <RefreshCw className={cn("w-4 h-4 text-slate-400", isUpdating && "animate-spin")} />
                <p className="text-xs font-bold text-slate-500">Last updated: {new Date(myCenter.lastUpdated || '').toLocaleString()}</p>
             </div>
             <p className="text-[10px] font-bold text-slate-400 uppercase">Updated by Admin ID: {myCenter.updatedBy || 'SYSTEM'}</p>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-8 text-slate-800 space-y-6">
          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
             <AlertTriangle className="w-6 h-6 text-amber-500 mb-3" />
             <h4 className="font-bold text-sm mb-1 uppercase tracking-wider text-slate-800">Critical Notice</h4>
             <p className="text-xs text-slate-500 leading-relaxed">Changes to your status will instantly notify the National Hub and all relevant university reviewers.</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center gap-3">
           <div className="w-1.5 h-6 bg-slate-800 rounded-full"></div>
           <h3 className="text-lg font-bold text-slate-800 uppercase tracking-wide">Update Current Status</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              disabled={isUpdating || myCenter.status === option.value}
              onClick={() => handleStatusChange(option.value)}
              className={cn(
                "p-6 rounded-[28px] border-2 transition-all flex flex-col items-center gap-4 text-center relative overflow-hidden group",
                myCenter.status === option.value 
                  ? `${option.bgColor} ${option.color} border-current` 
                  : "bg-white border-slate-100 text-slate-400 hover:border-slate-300 hover:text-slate-600"
              )}
            >
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                myCenter.status === option.value ? "bg-white/50" : "bg-slate-50 group-hover:bg-slate-100"
              )}>
                <option.icon className="w-6 h-6" />
              </div>
              <span className="text-xs font-black uppercase tracking-widest">{option.label}</span>
              {myCenter.status === option.value && (
                <div className="absolute top-2 right-2">
                   <div className="w-2 h-2 rounded-full bg-current animate-ping"></div>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
