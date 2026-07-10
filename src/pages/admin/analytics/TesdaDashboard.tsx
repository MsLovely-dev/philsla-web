import React from 'react';
import { Briefcase, Shield, Zap, Wrench, ClipboardCheck, Users, CheckCircle, AlertTriangle, Monitor } from 'lucide-react';
import { 
  ResponsiveContainer, XAxis, YAxis, Tooltip, Legend,
  ComposedChart, Bar, Line 
} from 'recharts';
import { 
  TESDA_STATS, TESDA_QUALIFICATIONS, RECENT_INCIDENTS 
} from '../../../services/analyticsMockData';
import { 
  SectionHeader, KPICard, MetricWidget, IncidentTable 
} from '../../../components/analytics/AnalyticsComponents';
import { cn } from '../../../lib/utils';

export default function TesdaDashboard() {
  const tesdaIncidents = RECENT_INCIDENTS.filter(i => i.agency === 'TESDA');

  return (
    <div className="space-y-12 max-w-[1700px] mx-auto pb-20">
      <SectionHeader 
        title="Vocational Readiness" 
        subtitle="TESDA — Technical and Vocational Competency Monitoring"
        icon={Briefcase}
        agency="TESDA"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {TESDA_STATS.map(stat => (
          <KPICard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-10">
         <MetricWidget title="Qualification & Job Demand" className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={350}>
               <ComposedChart data={TESDA_QUALIFICATIONS} margin={{ bottom: 20 }}>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} dy={10} />
                  <YAxis stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(15, 23, 42, 0.05)' }} 
                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)' }}
                  />
                  <Legend verticalAlign="top" align="right" height={40} iconType="circle" />
                  <Bar dataKey="certified" name="TVL Examinees Assessed" fill="#0F172A" radius={[12, 12, 0, 0]} barSize={45} />
                  <Line type="monotone" dataKey="trend" name="Market Demand (%)" stroke="#8B0D11" strokeWidth={3} dot={{ r: 4, fill: '#8B0D11' }} />
               </ComposedChart>
            </ResponsiveContainer>
         </MetricWidget>

         <MetricWidget title="Assessment Performance Summary" className="lg:col-span-1">
            <div className="space-y-4">
              {[
                { label: 'Practical Exam Participation', value: '94.8%', icon: Users },
                { label: 'Skills Assessment Completion', value: '88.2%', icon: CheckCircle },
                { label: 'Assessment Center Utilization', value: '72.5%', icon: Monitor },
                { label: 'TVL Regional Performance', value: 'Stable', icon: Shield }
              ].map((item) => (
                <div key={item.label} className="p-5 rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-between group hover:border-philsa-red transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-400 group-hover:text-philsa-red transition-all">
                      <item.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
                      <p className="text-lg font-black text-philsa-navy">{item.value}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
         </MetricWidget>
      </div>

      <div className="grid lg:grid-cols-2 gap-10">
         <MetricWidget title="Practical Assessment Monitoring">
            <div className="grid grid-cols-2 gap-6">
                {[
                  { label: 'Practical Exam Interruptions', value: 8, status: 'HIGH', icon: AlertTriangle },
                  { label: 'Incomplete Skills Assessments', value: 145, status: 'MID', icon: ClipboardCheck },
                  { label: 'Equipment Availability Issues', value: '2.4%', status: 'LOW', icon: Zap },
                  { label: 'Assessor Validation Flags', value: 14, status: 'MID', icon: Shield }
                ].map((stat) => (
                  <div key={stat.label} className="p-6 rounded-[2.5rem] border border-philsa-border bg-white hover:border-philsa-navy transition-all">
                     <div className="flex items-center justify-between mb-6">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center",
                          stat.status === 'HIGH' ? "bg-red-50 text-red-500" :
                          stat.status === 'MID' ? "bg-amber-50 text-amber-500" : "bg-emerald-50 text-emerald-500"
                        )}>
                           <stat.icon className="w-5 h-5" />
                        </div>
                        <span className={cn(
                          "text-[8px] font-black uppercase tracking-tighter",
                           stat.status === 'HIGH' ? "text-red-500" :
                           stat.status === 'MID' ? "text-amber-500" : "text-emerald-500"
                        )}>{stat.status}</span>
                     </div>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">{stat.label}</p>
                     <p className="text-2xl font-black text-philsa-navy tracking-tighter">{stat.value}</p>
                  </div>
                ))}
            </div>
         </MetricWidget>

         <MetricWidget title="TESDA Incident Monitoring" className="!p-0 border-none shadow-2xl">
            <IncidentTable incidents={tesdaIncidents} />
         </MetricWidget>
      </div>
    </div>
  );
}
