import React from 'react';
import { 
  CheckCircle, 
  Clock, 
  XCircle, 
  Archive, 
  Layers, 
  Users, 
  FileText,
  History,
  Info
} from 'lucide-react';
import { motion } from 'motion/react';

export default function Overview() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-philsa-navy mb-2 tracking-tight">Exam Management Control Center</h1>
          <p className="text-philsa-gray text-sm font-medium">Global oversight of question bank health, agency contributions, and activity integrity.</p>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MiniCard label="Total Items" value="12,402" icon={Layers} color="philsa-navy" />
        <MiniCard label="Published" value="8,102" icon={CheckCircle} color="green-600" />
        <MiniCard label="In Review" value="1,240" icon={Clock} color="amber-600" />
        <MiniCard label="Rejected" value="412" icon={XCircle} color="red-600" />
        <MiniCard label="Approved" value="2,148" icon={CheckCircle} color="blue-600" />
        <MiniCard label="Exam Sets" value="48" icon={FileText} color="philsa-red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Progress */}
        <div className="lg:col-span-2">
          <div className="card-philsa p-8 h-full">
            <h3 className="text-philsa-navy font-bold mb-8 flex items-center gap-2">
              <span className="w-1 h-6 bg-philsa-red rounded-full" />
              Question Type Distribution & Progress
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
               <TypeProgress label="Multiple Choice" count={5200} total={6000} percent={86} />
               <TypeProgress label="Essay" count={840} total={1000} percent={84} />
               <TypeProgress label="Identification" count={1200} total={1500} percent={80} />
               <TypeProgress label="Enumeration" count={450} total={500} percent={90} />
               <TypeProgress label="Matching Type" count={300} total={400} percent={75} />
               <TypeProgress label="True/False" count={2100} total={2500} percent={84} />
            </div>
          </div>
        </div>

        {/* Right Column - Inter-Agency Contributions */}
        <div className="lg:col-span-1">
          <div className="card-philsa p-8 h-full flex flex-col justify-between">
             <div>
                <h3 className="text-philsa-navy font-bold mb-8 flex items-center gap-2">
                   <span className="w-1 h-6 bg-blue-600 rounded-full" />
                   Agency Contributions
                </h3>
                <div className="space-y-4">
                   <AgencyStat name="CHED" items={4500} color="#2563EB" />
                   <AgencyStat name="DepEd" items={5800} color="#8B0D11" />
                   <AgencyStat name="TESDA" items={2102} color="#D97706" />
                </div>
             </div>
             
             <div className="mt-8 pt-6 border-t border-philsa-border text-center">
                <p className="text-xs text-philsa-gray font-medium leading-relaxed">Standardized inter-agency exam item synchronizations are conducted on a scheduled daily cycle.</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniCard({ label, value, icon: Icon, color }: any) {
  return (
    <div className="card-philsa p-5 hover:scale-105 transition-all text-center group">
       <div className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-3 transition-colors`} style={{ backgroundColor: `${color}15`, color: color }}>
          <Icon className="w-4 h-4" />
       </div>
       <p className="text-[9px] font-black text-philsa-gray uppercase tracking-widest mb-1">{label}</p>
       <p className="text-xl font-black text-philsa-navy tracking-tight">{value}</p>
    </div>
  );
}

function TypeProgress({ label, count, total, percent }: any) {
  return (
    <div className="space-y-3">
       <div className="flex justify-between items-end">
          <div>
             <p className="text-sm font-extrabold text-philsa-navy tracking-tight">{label}</p>
             <p className="text-[10px] text-philsa-gray font-bold uppercase tracking-widest">{count} / {total} Items</p>
          </div>
          <span className="text-philsa-red font-black text-xs">{percent}%</span>
       </div>
       <div className="h-2 bg-philsa-bg rounded-full overflow-hidden border border-philsa-border">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="h-full bg-philsa-navy rounded-full shadow-inner"
          />
       </div>
    </div>
  );
}

function AgencyStat({ name, items, color }: any) {
  return (
    <div className="flex justify-between items-center bg-philsa-bg p-4 rounded-2xl border border-philsa-border/40">
       <div>
          <p className="text-xs font-black text-philsa-gray uppercase tracking-widest mb-1">{name}</p>
          <p className="text-2xl font-black" style={{ color }}>{items.toLocaleString()}</p>
       </div>
    </div>
  );
}

function ActivityItem({ user, action, target, time, avatar }: any) {
  return (
    <div className="p-4 hover:bg-philsa-bg/40 transition-colors flex items-center gap-4">
       <div className="w-10 h-10 bg-philsa-bg border border-philsa-border rounded-xl flex items-center justify-center text-philsa-navy font-black text-xs shrink-0">
          {avatar}
       </div>
       <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-philsa-navy truncate">
             <span className="text-philsa-red">{user}</span> {action.toLowerCase().replace('_', ' ')}
          </p>
          <p className="text-[10px] text-philsa-gray mt-0.5 truncate uppercase font-bold tracking-wider">{target}</p>
       </div>
       <span className="text-[9px] font-bold text-philsa-gray whitespace-nowrap">{time}</span>
    </div>
  );
}
