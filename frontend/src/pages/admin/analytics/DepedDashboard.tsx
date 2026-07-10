import React from 'react';
import { Command, AlertTriangle, WifiOff, Monitor, LayoutGrid, ClipboardCheck, Users, CheckCircle } from 'lucide-react';
import { 
  ResponsiveContainer, XAxis, YAxis, Tooltip, 
  RadarChart, PolarGrid, PolarAngleAxis, Radar, PieChart, Pie, Cell
} from 'recharts';
import { motion } from 'motion/react';
import { cn } from '../../../lib/utils';
import { 
  DEPED_STATS, DEPED_REGIONAL, DEPED_ACADEMIC, RECENT_INCIDENTS
} from '../../../services/analyticsMockData';
import { 
  SectionHeader, KPICard, MetricWidget, IncidentTable 
} from '../../../components/analytics/AnalyticsComponents';

const COLORS = ['#0F172A', '#8B0D11', '#3B82F6', '#10B981'];

function RegionalHealthMap() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {DEPED_REGIONAL.map((reg) => (
        <motion.div 
          key={reg.region}
          whileHover={{ y: -5 }}
          className="p-5 rounded-[2rem] bg-white border border-philsa-border hover:border-philsa-navy transition-all group"
        >
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 group-hover:text-philsa-red transition-colors">{reg.region}</p>
          <div className="flex items-end justify-between gap-4 mb-2">
             <div className="flex flex-col">
                <div className="text-2xl font-black text-philsa-navy leading-none tracking-tighter">{reg.readiness}%</div>
                <div className="text-[8px] font-black text-slate-300 uppercase tracking-widest mt-1">Ready</div>
             </div>
             <div className={cn(
               "w-3 h-3 rounded-full shadow-sm mb-1",
               reg.status === 'OPERATIONAL' ? "bg-emerald-500 shadow-emerald-200" :
               reg.status === 'WATCH' ? "bg-amber-500 shadow-amber-200" : "bg-red-500 shadow-red-200"
             )} />
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
             <div className="h-full bg-philsa-navy rounded-full" style={{ width: `${reg.readiness}%` }} />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export default function DepedDashboard() {
  const depedIncidents = RECENT_INCIDENTS.filter(i => i.agency === 'DEPED');

  return (
    <div className="space-y-12 max-w-[1700px] mx-auto pb-20">
      <SectionHeader 
        title="SHS Readiness Hub" 
        subtitle="Department of Education — Senior High School Examination Operations"
        icon={Command}
        agency="DEPED"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {DEPED_STATS.map(stat => (
          <KPICard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-10">
         <MetricWidget title="Academic Readiness Analytics" className="lg:col-span-1">
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={DEPED_ACADEMIC}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {DEPED_ACADEMIC.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-y-3 gap-x-6 w-full mt-2">
                {DEPED_ACADEMIC.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">{entry.name}</span>
                  </div>
                ))}
              </div>
            </div>
         </MetricWidget>

         <MetricWidget title="School Compliance & Preparedness" className="lg:col-span-1">
            <div className="space-y-4">
               {[
                 { label: 'Connectivity-Limited Schools', value: 142, icon: WifiOff, color: 'text-amber-500' },
                 { label: 'Delayed Exam Sessions', value: 12, icon: AlertTriangle, color: 'text-red-500' },
                 { label: 'Device Validation Failures', value: '4.2%', icon: Monitor, color: 'text-philsa-navy' },
                 { label: 'Unverified Examinees', value: 2402, icon: Users, color: 'text-slate-400' }
               ].map((item) => (
                 <div key={item.label} className="p-4 rounded-2xl bg-white border border-slate-100 flex items-center justify-between group hover:border-philsa-navy transition-all">
                    <div className="flex items-center gap-4">
                       <div className={cn("w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center", item.color)}>
                          <item.icon className="w-5 h-5" />
                       </div>
                       <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{item.label}</p>
                          <p className="text-lg font-black text-philsa-navy leading-none tracking-tight">{item.value}</p>
                       </div>
                    </div>
                 </div>
               ))}
            </div>
         </MetricWidget>

         <MetricWidget title="Operational Monitoring" className="lg:col-span-1">
            <div className="flex flex-col gap-6">
              <div className="p-6 rounded-[2rem] bg-white border border-philsa-border shadow-xl shadow-philsa-navy/5 text-philsa-navy relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-philsa-gray mb-6">Readiness Health</h5>
                <ResponsiveContainer width="100%" height={140}>
                   <RadarChart cx="50%" cy="50%" outerRadius="80%" data={[
                     { subject: 'Internet', A: 92 },
                     { subject: 'Power', A: 84 },
                     { subject: 'Devices', A: 98 },
                     { subject: 'Proctors', A: 76 },
                     { subject: 'Rooms', A: 95 }
                   ]}>
                     <PolarGrid stroke="rgba(15,23,42,0.1)" />
                     <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(15,23,42,0.7)', fontSize: 8, fontWeight: 700 }} />
                     <Radar name="Status" dataKey="A" stroke="#8B0D11" fill="#8B0D11" fillOpacity={0.6} />
                   </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="p-6 rounded-[2rem] bg-emerald-50 border border-emerald-100 italic">
                <p className="text-[10px] text-emerald-800 font-medium leading-relaxed">
                   "System is running normally in most regions. Schools with poor connection are being assisted for offline exams."
                </p>
              </div>
            </div>
         </MetricWidget>
      </div>

      <MetricWidget title="Regional Participation Rates" action="View All Regions">
         <RegionalHealthMap />
      </MetricWidget>

      <MetricWidget title="DEPED Incident Monitoring" className="!p-0 border-none shadow-2xl">
         <IncidentTable incidents={depedIncidents} />
      </MetricWidget>
    </div>
  );
}
