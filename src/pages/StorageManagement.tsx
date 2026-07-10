import React, { useState } from 'react';
import { 
  Database, HardDrive, HardDriveDownload, HardDriveUpload,
  Clock, Shield, Lock, Settings, Trash2, 
  Archive, FileCode, CheckCircle2, AlertCircle,
  TrendingUp, Activity, BarChart2, Zap
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, 
  BarChart, Bar, Cell, PieChart, Pie, Legend,
  CartesianGrid
} from 'recharts';
import { cn } from '../lib/utils';
import { usePhilSA } from '../PhilSAContext';

const STORAGE_GROWTH = [
  { month: 'Jan', used: 45 },
  { month: 'Feb', used: 52 },
  { month: 'Mar', used: 61 },
  { month: 'Apr', used: 72 },
  { month: 'May', used: 82.4 },
];

const UNIV_STORAGE = [
  { name: 'UP System', value: 34.5, color: '#002D54' },
  { name: 'UST Manila', value: 18.2, color: '#EE1C25' },
  { name: 'DLSU Manila', value: 15.4, color: '#3b82f6' },
  { name: 'PUP Manila', value: 14.3, color: '#10b981' },
];

export default function StorageManagement() {
  const { user } = usePhilSA();
  const isUnivAdmin = user?.role === 'UNIVERSITY_ADMIN';

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2 text-philsa-navy">
             <Database className="w-5 h-5 flex-shrink-0" />
             <span className="text-xs font-black uppercase tracking-[0.3em]">Infrastructure Division</span>
          </div>
          <h1 className="text-4xl font-black text-philsa-navy tracking-tighter leading-none mb-3">
             Storage <span className="text-slate-500">& Retention</span>
          </h1>
          <p className="text-philsa-gray font-medium max-w-2xl">
             Managing the nationwide secure data lake. Oversight for the PhilSA evidence lifecycle and infrastructure capacity.
          </p>
        </div>
        <div className="flex items-center gap-3">
           <button className="btn-secondary flex items-center gap-2">
              <Archive className="w-4 h-4" /> Purge Cache
           </button>
           <button className="px-6 py-3 bg-philsa-navy text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-philsa-navy/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" /> Optimize Clusters
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         {[
           { label: 'Total Storage', value: '120 TB', sub: 'Enterprise SAN', icon: Database, color: 'bg-philsa-navy' },
           { label: 'Active Utilization', value: '82.4 TB', sub: '68% Capacity', icon: HardDrive, color: 'bg-philsa-red' },
           { label: 'Archived Volumes', value: '41.2K', sub: 'Cold Memory', icon: Archive, color: 'bg-slate-700' },
           { label: 'Daily Ingress', value: '450 GB', sub: 'Peak Load', icon: HardDriveUpload, color: 'bg-emerald-600' },
         ].map((stat, i) => (
           <div key={i} className="card-philsa p-6 group hover:border-philsa-navy/30 transition-all overflow-hidden relative">
              <stat.icon className="absolute -right-4 -bottom-4 w-24 h-24 text-philsa-bg opacity-40 group-hover:scale-110 transition-transform" />
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-6 shadow-lg", stat.color)}>
                 <stat.icon className="w-6 h-6 text-white" />
              </div>
              <p className="text-[10px] font-black text-philsa-gray uppercase tracking-widest mb-1">{stat.label}</p>
              <p className="text-2xl font-black text-philsa-navy tracking-tighter mb-1">{stat.value}</p>
              <p className="text-[10px] font-bold text-philsa-gray uppercase opacity-60">{stat.sub}</p>
           </div>
         ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 card-philsa p-8">
            <h3 className="text-xl font-black text-philsa-navy tracking-tighter mb-1">Infrastructure Load Projection</h3>
            <p className="text-[10px] text-philsa-gray font-black uppercase tracking-widest mb-10">Historical consumption vs predictive modeling</p>
            
            <div className="h-80 w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={STORAGE_GROWTH}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                     <XAxis 
                       dataKey="month" 
                       axisLine={false} 
                       tickLine={false} 
                       tick={{ fontSize: 10, fontWeight: 700, fill: '#64748B' }} 
                     />
                     <YAxis 
                       axisLine={false} 
                       tickLine={false} 
                       tick={{ fontSize: 10, fontWeight: 700, fill: '#64748B' }} 
                     />
                     <RechartsTooltip />
                     <Area type="monotone" dataKey="used" stroke="#002D54" strokeWidth={4} fillOpacity={1} fill="url(#colorUsed)" />
                     <defs>
                        <linearGradient id="colorUsed" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#002D54" stopOpacity={0.1}/>
                           <stop offset="95%" stopColor="#002D54" stopOpacity={0}/>
                        </linearGradient>
                     </defs>
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </div>

         <div className="card-philsa p-8">
            <h3 className="text-xl font-black text-philsa-navy tracking-tighter mb-1">Institution Quota</h3>
            <p className="text-[10px] text-philsa-gray font-black uppercase tracking-widest mb-12">Total storage allocation breakdown</p>
            
            <div className="space-y-6">
               {UNIV_STORAGE.map((u, i) => (
                 <div key={i} className="group">
                    <div className="flex justify-between items-center mb-2">
                       <span className="text-xs font-black text-philsa-navy tracking-tight">{u.name}</span>
                       <span className="text-xs font-black text-philsa-gray">{u.value} TB</span>
                    </div>
                    <div className="h-2 w-full bg-philsa-bg rounded-full overflow-hidden border border-philsa-border">
                       <div 
                         className="h-full rounded-full transition-all duration-1000 group-hover:scale-x-105" 
                         style={{ backgroundColor: u.color, width: `${(u.value / 40) * 100}%` }} 
                       />
                    </div>
                 </div>
               ))}
            </div>
            
            <div className="mt-12 p-6 bg-slate-900 rounded-3xl border border-slate-700 shadow-2xl">
               <div className="flex items-center gap-3 mb-4">
                  <Shield className="w-5 h-5 text-philsa-red" />
                  <h4 className="text-xs font-black text-white uppercase tracking-widest leading-none">Security Policy</h4>
               </div>
               <p className="text-xs text-slate-400 font-medium leading-relaxed mb-6">
                  All recording volumes are AES-256 encrypted at rest and replicated across 3 availability physical geolocations within PH territory.
               </p>
               <button className="w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10 transition-all">
                  View Encryption Keys
               </button>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <div className="card-philsa p-8">
            <div className="flex justify-between items-center mb-10">
              <div>
                 <h3 className="text-xl font-black text-philsa-navy tracking-tighter mb-1">Retention Policies</h3>
                 <p className="text-[10px] text-philsa-gray font-black uppercase tracking-widest">Global Lifecycle Configuration</p>
              </div>
              <button className="p-3 bg-philsa-bg rounded-xl border border-philsa-border text-philsa-navy">
                 <Settings className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
               {[
                 { label: 'Standard Exam Records', policy: 'Keep for 12 months', type: 'ACTIVE', color: 'bg-emerald-100 text-emerald-700' },
                 { label: 'AI Flagged Evidence', policy: 'Indefinite (Manual Purge)', type: 'LOCKED', color: 'bg-philsa-red text-white shadow-lg shadow-philsa-red/20' },
                 { label: 'Log File Metadata', policy: 'Keep for 3 years', type: 'ACTIVE', color: 'bg-emerald-100 text-emerald-700' },
                 { label: 'Incomplete Streams', policy: 'Discard after 30 days', type: 'TRANSIENT', color: 'bg-slate-100 text-slate-500' },
               ].map((p, i) => (
                 <div key={i} className="p-6 rounded-3xl border border-philsa-border flex items-center justify-between group hover:border-philsa-navy/40 transition-all">
                    <div className="flex items-center gap-4">
                       <div className="p-3 bg-philsa-bg rounded-2xl group-hover:bg-philsa-navy group-hover:text-white transition-colors">
                          <Clock className="w-5 h-5" />
                       </div>
                       <div>
                          <p className="text-sm font-black text-philsa-navy tracking-tight">{p.label}</p>
                          <p className="text-[10px] text-philsa-gray font-bold uppercase tracking-widest">{p.policy}</p>
                       </div>
                    </div>
                    <span className={cn("text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full", p.color)}>
                       {p.type}
                    </span>
                 </div>
               ))}
            </div>
         </div>

         <div className="card-philsa p-8 border-l-8 border-l-philsa-red bg-white/50">
            <h3 className="text-xl font-black text-philsa-navy tracking-tighter mb-1 text-philsa-red">Legal Hold Management</h3>
            <p className="text-[10px] text-philsa-gray font-black uppercase tracking-widest mb-10">Preserving evidence for administrative proceedings</p>
            
            <div className="bg-white p-8 rounded-3xl border border-philsa-border shadow-sm mb-6">
               <div className="flex items-center gap-4 mb-6 pb-6 border-b border-philsa-border dashed">
                  <div className="w-14 h-14 bg-philsa-red text-white rounded-2xl flex items-center justify-center shadow-lg shadow-philsa-red/20">
                     <Lock className="w-7 h-7" />
                  </div>
                  <div>
                     <p className="text-xs font-black text-philsa-navy uppercase tracking-widest mb-1">Active Holds</p>
                     <p className="text-2xl font-black text-philsa-red tracking-tighter leading-none">14 Active Cases</p>
                  </div>
               </div>
               
               <div className="space-y-6">
                  <div className="flex items-start gap-4">
                     <div className="p-2 bg-slate-100 rounded-lg shrink-0 mt-1">
                        <Archive className="w-4 h-4 text-slate-500" />
                     </div>
                     <div>
                        <p className="text-sm font-bold text-philsa-navy">Case #PH-2026-LA-902</p>
                        <p className="text-[10px] text-philsa-gray font-medium leading-relaxed">System-assigned hold for multi-device suspicious patterns identified in UP Manila Law Entrance.</p>
                     </div>
                  </div>
                  <div className="flex items-start gap-4">
                     <div className="p-2 bg-slate-100 rounded-lg shrink-0 mt-1">
                        <Archive className="w-4 h-4 text-slate-500" />
                     </div>
                     <div>
                        <p className="text-sm font-bold text-philsa-navy">Case #PH-2026-GA-041</p>
                        <p className="text-[10px] text-philsa-gray font-medium leading-relaxed">Manual hold enacted by Ombudsman office regarding proctor collusion inquiry.</p>
                     </div>
                  </div>
               </div>
            </div>
            
            <button className="w-full py-5 bg-philsa-navy text-white rounded-3xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-2xl shadow-philsa-navy/20 active:scale-95 transition-all">
               <HardDriveDownload className="w-5 h-5" /> Export Legal Evidence Bundle
            </button>
         </div>
      </div>
    </div>
  );
}
