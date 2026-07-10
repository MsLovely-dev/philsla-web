import React from 'react';
import { 
  TrendingUp, Download, ExternalLink, ChevronDown, 
  MapPin, School, UserCheck, ShieldAlert
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

export const KPI_COLORS = {
  navy: '#0F172A',
  red: '#8B0D11',
  blue: '#3B82F6',
  green: '#10B981',
  amber: '#F59E0B',
  slate: '#64748B',
  purple: '#8B5CF6'
};

export function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    'OPERATIONAL': 'bg-emerald-50 text-emerald-600 border-emerald-100',
    'NEEDS ATTENTION': 'bg-amber-50 text-amber-600 border-amber-100',
    'WATCH': 'bg-blue-50 text-blue-600 border-blue-100',
    'CRITICAL': 'bg-red-50 text-red-600 border-red-100',
    'STABLE': 'bg-slate-50 text-slate-600 border-slate-100',
  };
  const colorClass = colors[status] || 'bg-slate-50 text-slate-600 border-slate-100';

  return (
    <span className={cn("text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-widest leading-none", colorClass)}>
      {status}
    </span>
  );
}

export function KPICard({ label, value, trend, status, icon: Icon, color }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="relative overflow-hidden group"
    >
      <div className="card-philsa !p-6 border-none shadow-sm hover:shadow-xl transition-all duration-500 bg-white relative z-10">
        <div className="flex justify-between items-start mb-6">
          <div 
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform duration-300 group-hover:scale-110"
            style={{ backgroundColor: color }}
          >
            <Icon className="w-6 h-6" />
          </div>
          <div className="flex flex-col items-end gap-1">
            {trend !== undefined && (
              <span className={cn(
                "text-[10px] font-black px-2.5 py-1 rounded-lg flex items-center gap-1",
                trend > 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-100 text-red-700"
              )}>
                {trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingUp className="w-3 h-3 rotate-180" />}
                {trend > 0 ? '+' : ''}{trend}%
              </span>
            )}
            {status && <StatusBadge status={status} />}
          </div>
        </div>
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{label}</p>
          <div className="flex items-baseline gap-1">
            <p className="text-3xl font-black text-philsa-navy tracking-tighter">{value}</p>
            {label.toLowerCase().includes('rate') && <span className="text-sm font-bold text-slate-300">%</span>}
          </div>
        </div>
      </div>
      <div 
        className="absolute bottom-0 right-0 w-32 h-32 opacity-[0.03] -mr-8 -mb-8 transition-transform duration-700 group-hover:scale-125"
        style={{ color: color }}
      >
        <Icon className="w-full h-full" />
      </div>
    </motion.div>
  );
}

export function SectionHeader({ title, subtitle, icon: Icon, agency }: any) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
      <div className="flex items-center gap-6">
         <div className="w-20 h-20 bg-philsa-navy text-white rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-philsa-navy/20 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
            <Icon className="w-10 h-10 relative z-10 transition-transform duration-500 group-hover:scale-110" />
         </div>
         <div>
            <div className="flex items-center gap-3 mb-2">
               <span className="px-3 py-1 bg-philsa-red text-white text-[10px] font-black rounded-full uppercase tracking-widest shadow-lg shadow-philsa-red/20">{agency} Coverage</span>
               <div className="h-4 w-[1px] bg-philsa-border" />
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Monitor</p>
            </div>
            <h2 className="text-4xl font-black text-philsa-navy tracking-tighter leading-none">{title}</h2>
            <p className="text-sm font-medium text-slate-500 mt-2">{subtitle}</p>
         </div>
      </div>
      
      <div className="flex items-center gap-3">
         <button className="bg-white border border-philsa-border text-philsa-navy hover:bg-philsa-bg font-black py-4 px-8 rounded-2xl text-[10px] uppercase tracking-widest shadow-sm transition-all flex items-center gap-3 group">
            <Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" /> 
            Download Report
         </button>
      </div>
    </div>
  );
}

export function MetricWidget({ title, children, className, action }: any) {
  return (
    <div className={cn("card-philsa !p-0 flex flex-col bg-white border border-philsa-border hover:border-slate-300 transition-colors overflow-hidden", className)}>
      <div className="p-6 border-b border-philsa-border flex items-center justify-between bg-slate-50/50">
        <h3 className="text-[11px] font-black text-philsa-navy uppercase tracking-[0.2em] flex items-center gap-3">
          <div className="w-1.5 h-4 bg-philsa-red rounded-full" />
          {title}
        </h3>
        {action && (
          <button className="text-[10px] font-black text-slate-400 hover:text-philsa-navy uppercase tracking-widest transition-colors">
            {action}
          </button>
        )}
      </div>
      <div className="p-8 flex-1 min-h-[300px]">
        {children}
      </div>
    </div>
  );
}

export function IncidentTable({ incidents }: { incidents: any[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-philsa-border text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50">
            <th className="px-8 py-5">Incident ID</th>
            <th className="px-6 py-5">Agency</th>
            <th className="px-6 py-5">Issue Type</th>
            <th className="px-6 py-5">Location</th>
            <th className="px-6 py-5">Risk Level</th>
            <th className="px-6 py-5">Time</th>
            <th className="px-8 py-5"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-philsa-border">
          {incidents.map((incident) => (
            <tr key={incident.id} className="group hover:bg-philsa-bg/30 transition-all cursor-pointer">
              <td className="px-8 py-5 text-[11px] font-black text-philsa-navy tracking-tight">{incident.id}</td>
              <td className="px-6 py-5">
                <span className="px-2.5 py-1 bg-philsa-navy text-white text-[8px] font-black rounded-lg uppercase tracking-widest">
                  {incident.agency}
                </span>
              </td>
              <td className="px-6 py-5 text-[10px] font-bold text-slate-600">{incident.type}</td>
              <td className="px-6 py-5 text-[10px] font-semibold text-slate-400 italic">@{incident.location}</td>
              <td className="px-6 py-5">
                 <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      incident.severity === 'HIGH' ? "bg-red-500" :
                      incident.severity === 'MID' ? "bg-amber-500" : "bg-emerald-500"
                    )} />
                    <span className={cn(
                      "text-[9px] font-black uppercase tracking-widest",
                      incident.severity === 'HIGH' ? "text-red-600" :
                      incident.severity === 'MID' ? "text-amber-600" : "text-emerald-600"
                    )}>
                      {incident.severity}
                    </span>
                 </div>
              </td>
              <td className="px-6 py-5 text-[10px] font-bold text-slate-400">{incident.time}</td>
              <td className="px-8 py-5 text-right">
                 <button className="p-2 text-slate-300 hover:text-philsa-navy transition-colors">
                    <ExternalLink className="w-4 h-4" />
                 </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
