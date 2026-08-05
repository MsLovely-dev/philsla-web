import React, { useEffect, useState } from 'react';
import { Globe, RefreshCw } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend
} from 'recharts';
import {
  NATIONAL_STATS, RECENT_INCIDENTS
} from '../../../services/analyticsMockData';
import {
  SectionHeader, KPICard, MetricWidget, IncidentTable
} from '../../../components/analytics/AnalyticsComponents';
import { analyticsService } from '../../../services/analyticsService';
import type { NationalOverview } from '../../../services/contracts';

// Metrics with a real backend source (apps.analytics `national_overview()`); the
// rest (sessions/incidents/testing centers) have no backing data model yet and
// stay on static mock data -- see docs/api/API-ENDPOINTS.md.
const BACKED_STAT_LABELS: Record<string, keyof NationalOverview> = {
  'Total Registered Examinees': 'totalRegisteredExaminees',
  'Total Verified Examinees': 'totalVerifiedExaminees',
  'Total Participating Schools': 'totalParticipatingSchools',
  'Total Participating Universities': 'totalParticipatingUniversities',
};

export default function NationalDashboard() {
  const [overview, setOverview] = useState<NationalOverview | null>(null);
  const [isLoadingOverview, setIsLoadingOverview] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void analyticsService.getNationalOverview().then((result) => {
      if (cancelled) return;
      setIsLoadingOverview(false);
      if (result.ok) {
        setOverview(result.data);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const stats = NATIONAL_STATS.map((stat) => {
    const overviewKey = BACKED_STAT_LABELS[stat.label];
    if (!overviewKey) return stat;
    if (isLoadingOverview) return { ...stat, value: '…', trend: undefined };
    if (!overview) return stat;
    return { ...stat, value: Number(overview[overviewKey]).toLocaleString(), trend: undefined };
  });

  return (
    <div className="space-y-12 pb-20 max-w-[1750px] mx-auto">
      <SectionHeader
        title="National Overview"
        subtitle="Unified National System Monitoring Hub"
        icon={Globe}
        agency="NATIONAL"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-6">
        {stats.map(stat => (
          <KPICard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-10">
        <MetricWidget title="National Distribution" className="lg:col-span-2" action="Download Data">
           <ResponsiveContainer width="100%" height={380}>
              <BarChart data={[
                { region: 'NCR', ched: 520, deped: 840, tesda: 310 },
                { region: 'CALABARZON', ched: 480, deped: 720, tesda: 285 },
                { region: 'Central Visayas', ched: 320, deped: 450, tesda: 195 },
                { region: 'Davao Region', ched: 285, deped: 390, tesda: 150 },
                { region: 'Central Luzon', ched: 410, deped: 580, tesda: 240 }
              ]} margin={{ top: 20, bottom: 20 }}>
                 <XAxis dataKey="region" stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} dy={15} />
                 <YAxis stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                 <Tooltip 
                   cursor={{ fill: 'rgba(15, 23, 42, 0.02)' }}
                   contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)' }}
                 />
                 <Legend verticalAlign="top" align="right" height={40} iconType="circle" />
                 <Bar dataKey="ched" name="CHED" fill="#0F172A" radius={[8, 8, 0, 0]} barSize={14} />
                 <Bar dataKey="deped" name="DEPED" fill="#8B0D11" radius={[8, 8, 0, 0]} barSize={14} />
                 <Bar dataKey="tesda" name="TESDA" fill="#3B82F6" radius={[8, 8, 0, 0]} barSize={14} />
              </BarChart>
           </ResponsiveContainer>
        </MetricWidget>

        <div className="flex flex-col gap-8">
           <div className="card-philsa !p-10 bg-white text-philsa-navy border border-philsa-border shadow-xl shadow-philsa-navy/5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/black-linen.png')] opacity-5 pointer-events-none" />
              <div className="relative z-10 flex flex-col justify-between h-full min-h-[300px]">
                 <div>
                    <div className="flex items-center gap-3 mb-10">
                       <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                       <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-philsa-gray leading-none">System Stability</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-y-12 gap-x-8">
                       <div className="group/stat">
                          <p className="text-3xl font-black mb-1 leading-none tracking-tighter flex items-baseline gap-1 group-hover/stat:text-philsa-red transition-all text-philsa-navy">42 <span className="text-[10px] text-philsa-gray uppercase">CPU</span></p>
                          <p className="text-[9px] font-bold text-philsa-gray/60 uppercase tracking-[0.2em]">Load</p>
                       </div>
                       <div className="group/stat">
                          <p className="text-3xl font-black mb-1 leading-none tracking-tighter flex items-baseline gap-1 group-hover/stat:text-emerald-500 transition-all text-philsa-navy">1.2 <span className="text-[10px] text-philsa-gray uppercase">ms</span></p>
                          <p className="text-[9px] font-bold text-philsa-gray/60 uppercase tracking-[0.2em]">Latency</p>
                       </div>
                       <div className="group/stat">
                          <p className="text-3xl font-black mb-1 leading-none tracking-tighter flex items-baseline gap-1 group-hover/stat:text-amber-500 transition-all text-philsa-navy">8.5 <span className="text-[10px] text-philsa-gray uppercase">k/s</span></p>
                          <p className="text-[9px] font-bold text-philsa-gray/60 uppercase tracking-[0.2em]">Activity Rate</p>
                       </div>
                       <div className="group/stat">
                          <p className="text-3xl font-black mb-1 leading-none tracking-tighter flex items-baseline gap-1 group-hover/stat:text-purple-500 transition-all text-philsa-navy">99 <span className="text-[10px] text-philsa-gray uppercase">%</span></p>
                          <p className="text-[9px] font-bold text-philsa-gray/60 uppercase tracking-[0.2em]">System Health</p>
                       </div>
                    </div>
                 </div>
                 <div className="pt-10 border-t border-philsa-border">
                    <button className="w-full py-4 px-6 bg-philsa-bg hover:bg-slate-100 rounded-2xl text-[9px] font-black uppercase tracking-[0.3em] border border-philsa-border transition-all text-philsa-navy">
                       Instance Control
                    </button>
                 </div>
              </div>
           </div>
        </div>
      </div>

      <MetricWidget title="Applications by Region" action="Download Data">
         {overview && overview.regionalBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
               <BarChart data={overview.regionalBreakdown} margin={{ top: 20, bottom: 20 }}>
                  <XAxis dataKey="region" stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} dy={15} />
                  <YAxis stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: 'rgba(15, 23, 42, 0.02)' }}
                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)' }}
                  />
                  <Bar dataKey="applicationCount" name="Applications" fill="#0F172A" radius={[8, 8, 0, 0]} barSize={14} />
               </BarChart>
            </ResponsiveContainer>
         ) : (
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center py-16">
               {isLoadingOverview ? 'Loading regional data…' : 'No regional application data available yet.'}
            </p>
         )}
      </MetricWidget>

      <MetricWidget title="National Monitoring Log" className="!p-0 border-none shadow-2xl">
         <IncidentTable incidents={RECENT_INCIDENTS} />
      </MetricWidget>
    </div>
  );
}
