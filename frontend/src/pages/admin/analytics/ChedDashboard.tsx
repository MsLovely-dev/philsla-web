import React from 'react';
import { LayoutGrid, BarChart3, Globe, School, CheckCircle, Target, Brain, FileCheck, AlertTriangle } from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, RadarChart, PolarGrid, PolarAngleAxis, Radar
} from 'recharts';
import { cn } from '../../../lib/utils';
import { 
  CHED_STATS, NATIONAL_STATS, CHED_INCIDENTS, RECENT_INCIDENTS, CHED_PERFORMANCE 
} from '../../../services/analyticsMockData';
import { 
  SectionHeader, KPICard, MetricWidget, IncidentTable 
} from '../../../components/analytics/AnalyticsComponents';

export default function ChedDashboard() {
  const chedIncidents = RECENT_INCIDENTS.filter(i => i.agency === 'CHED');

  return (
    <div className="space-y-12 max-w-[1700px] mx-auto pb-20">
      <SectionHeader 
        title="Higher Ed Readiness" 
        subtitle="Commission on Higher Education — PhilSA Examination Performance & Admission Insights"
        icon={BarChart3}
        agency="CHED"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {CHED_STATS.map(stat => (
          <KPICard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-10">
         <MetricWidget title="Admission Qualification Analytics" className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={350}>
               <BarChart data={CHED_PERFORMANCE} margin={{ bottom: 20 }}>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} dy={10} />
                  <YAxis stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(15, 23, 42, 0.05)' }} 
                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)' }}
                  />
                  <Bar dataKey="value" name="Score (%)" fill="#0F172A" radius={[12, 12, 0, 0]} barSize={50} />
               </BarChart>
            </ResponsiveContainer>
         </MetricWidget>

         <MetricWidget title="Academic Indicators Radar" className="lg:col-span-1">
            <ResponsiveContainer width="100%" height={300}>
               <RadarChart cx="50%" cy="50%" outerRadius="80%" data={[
                 { subject: 'STEM', A: 88 },
                 { subject: 'Literacy', A: 92 },
                 { subject: 'Numeracy', A: 84 },
                 { subject: 'Critical Thinking', A: 78 },
                 { subject: 'Preparedness', A: 86 }
               ]}>
                 <PolarGrid stroke="#e2e8f0" />
                 <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} />
                 <Radar name="Performance" dataKey="A" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.4} />
               </RadarChart>
            </ResponsiveContainer>
            <div className="mt-8 grid grid-cols-2 gap-4">
               {[
                 { label: 'Regional Ranking', value: '#1 NCR' },
                 { label: 'Qualified Applicants', value: '45.2k' }
               ].map(m => (
                 <div key={m.label} className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{m.label}</p>
                    <p className="text-sm font-black text-philsa-navy">{m.value}</p>
                 </div>
               ))}
            </div>
         </MetricWidget>
      </div>

      <div className="grid lg:grid-cols-2 gap-10">
         <MetricWidget title="Institutional Monitoring">
            <div className="space-y-4">
               {[
                 { name: 'University of the Philippines System', type: 'Public SUC', qualified: 24500, capacity: '92%' },
                 { name: 'University of Santo Tomas', type: 'Private Sectarian', qualified: 8800, capacity: '88%' },
                 { name: 'De La Salle University - Manila', type: 'Private Non-Sectarian', qualified: 7200, capacity: '85%' },
                 { name: 'Polytechnic University of the Philippines', type: 'State University', qualified: 32000, capacity: '95%' }
               ].map((uni) => (
                 <div key={uni.name} className="flex items-center justify-between p-5 rounded-[2rem] bg-white border border-philsa-border hover:shadow-xl hover:-translate-y-1 transition-all group">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-philsa-navy group-hover:bg-philsa-navy group-hover:text-white transition-all">
                          <School className="w-5 h-5" />
                       </div>
                       <div>
                          <p className="text-[10px] font-black text-philsa-navy tracking-tight leading-none mb-1">{uni.name}</p>
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{uni.type}</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-8">
                       <div className="text-right">
                          <p className="text-sm font-black text-philsa-navy">{(uni.qualified/1000).toFixed(1)}k</p>
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Qualified</p>
                       </div>
                       <div className="text-right">
                          <p className="text-sm font-black text-emerald-600">{uni.capacity}</p>
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Cap. Usage</p>
                       </div>
                    </div>
                 </div>
               ))}
            </div>
         </MetricWidget>

         <MetricWidget title="Security & Integrity Log">
            <div className="space-y-4">
               {[
                 { label: 'Flagged Exam Attempts', value: 342, icon: AlertTriangle, status: 'HIGH' },
                 { label: 'Invalidated Sessions', value: 89, icon: AlertTriangle, status: 'HIGH' },
                 { label: 'Integrity Reports', value: 12, icon: AlertTriangle, status: 'MID' },
                 { label: 'Verification Escalations', value: 1420, icon: Target, status: 'LOW' }
               ].map((item) => (
                 <div key={item.label} className="p-4 rounded-2xl bg-white border border-slate-100 flex items-center justify-between group hover:border-philsa-navy transition-all">
                    <div className="flex items-center gap-4">
                       <div className={cn(
                         "w-10 h-10 rounded-xl flex items-center justify-center",
                         item.status === 'HIGH' ? "bg-red-50 text-red-500" :
                         item.status === 'MID' ? "bg-amber-50 text-amber-500" : "bg-blue-50 text-blue-500"
                       )}>
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
      </div>

      <MetricWidget title="CHED Analytics Feed" className="!p-0 border-none shadow-2xl">
         <IncidentTable incidents={chedIncidents} />
      </MetricWidget>
    </div>
  );
}
