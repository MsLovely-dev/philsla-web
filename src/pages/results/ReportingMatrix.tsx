import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, ComposedChart, PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  Download, 
  BarChart2, 
  Filter, 
  ChevronDown, 
  Target, 
  TrendingUp,
  LayoutGrid,
  Users,
  GraduationCap,
  MapPin,
  Layers,
  Award,
  Sparkles
} from 'lucide-react';
import { motion } from 'motion/react';
import { usePhilSA } from '../../PhilSAContext';
import { cn } from '../../lib/utils';

// National level mock data
const SUBJECT_PERFORMANCE = [
  { subject: 'Reading Comp.', score: 85, nationalAvg: 72, deviation: 13 },
  { subject: 'Mathematical Logic', score: 92, nationalAvg: 68, deviation: 24 },
  { subject: 'Linguistic Analysis', score: 88, nationalAvg: 78, deviation: 10 },
  { subject: 'Statistical Literacy', score: 84, nationalAvg: 70, deviation: 14 },
  { subject: 'Science & Nature', score: 90, nationalAvg: 75, deviation: 15 },
  { subject: 'Current Affairs', score: 78, nationalAvg: 65, deviation: 13 },
];

const REGIONAL_DISTRIBUTION = [
  { region: 'NCR', passing: 84, total: 12000 },
  { region: 'CAR', passing: 72, total: 4500 },
  { region: 'Region III', passing: 68, total: 9800 },
  { region: 'Region IV-A', stroke: '#8B0D11', passing: 78, total: 15000 },
  { region: 'Region VI', passing: 65, total: 7200 },
  { region: 'Region VII', passing: 74, total: 8500 },
  { region: 'Region XI', passing: 71, total: 6800 },
];

const BATCH_COMPARISON = [
  { batch: 'Batch 1', average: 75, top10: 94 },
  { batch: 'Batch 2', average: 78, top10: 96 },
  { batch: 'Batch 3', average: 72, top10: 92 },
  { batch: 'Batch 4', average: 81, top10: 98 },
];

// University level mock data
const MOCK_UNIVERSITIES = [
  { id: 'UP', name: 'University of the Philippines', logo: 'UP', color: 'bg-philsa-red' },
  { id: 'UST', name: 'University of Santo Tomas', logo: 'UST', color: 'bg-amber-500' },
  { id: 'DLSU', name: 'De La Salle University', logo: 'DLSU', color: 'bg-emerald-600' },
  { id: 'ADMU', name: 'Ateneo de Manila University', logo: 'ADMU', color: 'bg-blue-600' },
  { id: 'PUP', name: 'Polytechnic University of the Philippines', logo: 'PUP', color: 'bg-red-800' },
];

const MOCK_ANALYTICS_DATA: Record<string, {
  stats: { label: string; value: string; sub: string; icon: any; trend: string }[];
  courseDistribution: { name: string; applicants: number; quota: number }[];
  demographics: { name: string; value: number }[];
  scoreDistribution: { range: string; count: number }[];
  monthlyTrends: { month: string; applications: number; qualifications: number }[];
}> = {
  UP: {
    stats: [
      { label: 'Total Applicants', value: '7,482', sub: '+14% vs last year', icon: Users, trend: 'up' },
      { label: 'Qualified Candidates', value: '1,498', sub: '20% overall pass rate', icon: GraduationCap, trend: 'up' },
      { label: 'Average score', value: '92.4%', sub: 'Ranked #1 National', icon: Award, trend: 'up' },
      { label: 'Enrolled Quota', value: '92.4%', sub: '370 of 400 slots booked', icon: Layers, trend: 'stable' },
    ],
    courseDistribution: [
      { name: 'BS Computer Science', applicants: 1240, quota: 80 },
      { name: 'BS Statistics', applicants: 850, quota: 60 },
      { name: 'BS Civil Engineering', applicants: 2100, quota: 120 },
      { name: 'BA Psychology', applicants: 1560, quota: 100 },
      { name: 'BS Mathematics', applicants: 420, quota: 40 },
    ],
    demographics: [
      { name: 'NCR', value: 3400 },
      { name: 'Region IV-A', value: 1800 },
      { name: 'Region III', value: 1200 },
      { name: 'Region VII', value: 682 },
      { name: 'Others', value: 400 },
    ],
    scoreDistribution: [
      { range: '95-100', count: 480 },
      { range: '90-94', count: 1210 },
      { range: '85-89', count: 2240 },
      { range: '80-84', count: 1850 },
      { range: '75-79', count: 1100 },
      { range: '<75', count: 602 },
    ],
    monthlyTrends: [
      { month: 'Jan', applications: 400, qualifications: 80 },
      { month: 'Feb', applications: 920, qualifications: 190 },
      { month: 'Mar', applications: 1850, qualifications: 380 },
      { month: 'Apr', applications: 2900, qualifications: 600 },
      { month: 'May', applications: 1412, qualifications: 248 },
    ]
  },
  UST: {
    stats: [
      { label: 'Total Applicants', value: '5,820', sub: '+8% vs last year', icon: Users, trend: 'up' },
      { label: 'Qualified Candidates', value: '1,320', sub: '22.6% pass rate', icon: GraduationCap, trend: 'up' },
      { label: 'Average score', value: '86.1%', sub: 'Ranked #3 National', icon: Award, trend: 'up' },
      { label: 'Enrolled Quota', value: '85.2%', sub: '256 of 300 slots booked', icon: Layers, trend: 'stable' },
    ],
    courseDistribution: [
      { name: 'BS Computer Science', applicants: 910, quota: 70 },
      { name: 'BS Statistics', applicants: 520, quota: 50 },
      { name: 'BS Civil Engineering', applicants: 1650, quota: 110 },
      { name: 'BA Psychology', applicants: 1120, quota: 90 },
      { name: 'BS Mathematics', applicants: 310, quota: 35 },
    ],
    demographics: [
      { name: 'NCR', value: 2900 },
      { name: 'Region IV-A', value: 1400 },
      { name: 'Region III', value: 900 },
      { name: 'Region V', value: 420 },
      { name: 'Others', value: 200 },
    ],
    scoreDistribution: [
      { range: '95-100', count: 280 },
      { range: '90-94', count: 850 },
      { range: '85-89', count: 1620 },
      { range: '80-84', count: 1390 },
      { range: '75-79', count: 910 },
      { range: '<75', count: 770 },
    ],
    monthlyTrends: [
      { month: 'Jan', applications: 310, qualifications: 65 },
      { month: 'Feb', applications: 720, qualifications: 155 },
      { month: 'Mar', applications: 1430, qualifications: 310 },
      { month: 'Apr', applications: 2150, qualifications: 480 },
      { month: 'May', applications: 1210, qualifications: 310 },
    ]
  },
  DLSU: {
    stats: [
      { label: 'Total Applicants', value: '6,102', sub: '+11% vs last year', icon: Users, trend: 'up' },
      { label: 'Qualified Candidates', value: '1,280', sub: '20.9% pass rate', icon: GraduationCap, trend: 'up' },
      { label: 'Average score', value: '88.5%', sub: 'Ranked #2 National', icon: Award, trend: 'up' },
      { label: 'Enrolled Quota', value: '88.1%', sub: '282 of 320 slots booked', icon: Layers, trend: 'stable' },
    ],
    courseDistribution: [
      { name: 'BS Computer Science', applicants: 1040, quota: 60 },
      { name: 'BS Statistics', applicants: 580, quota: 40 },
      { name: 'BS Civil Engineering', applicants: 1820, quota: 100 },
      { name: 'BA Psychology', applicants: 1210, quota: 80 },
      { name: 'BS Mathematics', applicants: 350, quota: 30 },
    ],
    demographics: [
      { name: 'NCR', value: 3100 },
      { name: 'Region IV-A', value: 1200 },
      { name: 'Region III', value: 850 },
      { name: 'Region VII', value: 500 },
      { name: 'Others', value: 452 },
    ],
    scoreDistribution: [
      { range: '95-100', count: 320 },
      { range: '90-94', count: 920 },
      { range: '85-89', count: 1780 },
      { range: '80-84', count: 1510 },
      { range: '75-79', count: 870 },
      { range: '<75', count: 702 },
    ],
    monthlyTrends: [
      { month: 'Jan', applications: 350, qualifications: 75 },
      { month: 'Feb', applications: 800, qualifications: 168 },
      { month: 'Mar', applications: 1620, qualifications: 340 },
      { month: 'Apr', applications: 2182, qualifications: 462 },
      { month: 'May', applications: 1150, qualifications: 235 },
    ]
  },
  ADMU: {
    stats: [
      { label: 'Total Applicants', value: '4,982', sub: '+5% vs last year', icon: Users, trend: 'up' },
      { label: 'Qualified Candidates', value: '996', sub: '20% pass rate', icon: GraduationCap, trend: 'up' },
      { label: 'Average score', value: '90.2%', sub: 'Ranked #1.5 National', icon: Award, trend: 'up' },
      { label: 'Enrolled Quota', value: '86.4%', sub: '216 of 250 slots booked', icon: Layers, trend: 'stable' },
    ],
    courseDistribution: [
      { name: 'BS Computer Science', applicants: 850, quota: 50 },
      { name: 'BS Statistics', applicants: 410, quota: 30 },
      { name: 'BS Civil Engineering', applicants: 1420, quota: 80 },
      { name: 'BA Psychology', applicants: 980, quota: 60 },
      { name: 'BS Mathematics', applicants: 280, quota: 30 },
    ],
    demographics: [
      { name: 'NCR', value: 2500 },
      { name: 'Region IV-A', value: 1100 },
      { name: 'Region III', value: 700 },
      { name: 'Region VII', value: 400 },
      { name: 'Others', value: 282 },
    ],
    scoreDistribution: [
      { range: '95-100', count: 240 },
      { range: '90-94', count: 780 },
      { range: '85-89', count: 1410 },
      { range: '80-84', count: 1200 },
      { range: '75-79', count: 770 },
      { range: '<75', count: 582 },
    ],
    monthlyTrends: [
      { month: 'Jan', applications: 280, qualifications: 56 },
      { month: 'Feb', applications: 610, qualifications: 122 },
      { month: 'Mar', applications: 1240, qualifications: 248 },
      { month: 'Apr', applications: 1850, qualifications: 370 },
      { month: 'May', applications: 1002, qualifications: 200 },
    ]
  },
  PUP: {
    stats: [
      { label: 'Total Applicants', value: '18,482', sub: '+22% vs last year', icon: Users, trend: 'up' },
      { label: 'Qualified Candidates', value: '2,957', sub: '16% overall pass rate', icon: GraduationCap, trend: 'up' },
      { label: 'Average score', value: '81.5%', sub: 'High Volume Leader', icon: Award, trend: 'up' },
      { label: 'Enrolled Quota', value: '98.5%', sub: '591 of 600 slots booked', icon: Layers, trend: 'up' },
    ],
    courseDistribution: [
      { name: 'BS Computer Science', applicants: 3200, quota: 120 },
      { name: 'BS Statistics', applicants: 1850, quota: 100 },
      { name: 'BS Civil Engineering', applicants: 4800, quota: 180 },
      { name: 'BA Psychology', applicants: 3850, quota: 140 },
      { name: 'BS Mathematics', applicants: 980, quota: 60 },
    ],
    demographics: [
      { name: 'NCR', value: 11200 },
      { name: 'Region IV-A', value: 3405 },
      { name: 'Region III', value: 2200 },
      { name: 'Region V', value: 982 },
      { name: 'Others', value: 700 },
    ],
    scoreDistribution: [
      { range: '95-100', count: 310 },
      { range: '90-94', count: 1420 },
      { range: '85-89', count: 4210 },
      { range: '80-84', count: 5100 },
      { range: '75-79', count: 4300 },
      { range: '<75', count: 3142 },
    ],
    monthlyTrends: [
      { month: 'Jan', applications: 1100, qualifications: 176 },
      { month: 'Feb', applications: 2400, qualifications: 384 },
      { month: 'Mar', applications: 4800, qualifications: 768 },
      { month: 'Apr', applications: 6200, qualifications: 992 },
      { month: 'May', applications: 3982, qualifications: 637 },
    ]
  }
};

const UNIV_COLORS = ['#8A1538', '#00563F', '#1B365D', '#D97706', '#6B7280'];

export default function ReportingMatrix() {
  const { user } = usePhilSA();
  const [selectedBatch, setSelectedBatch] = useState('All Batches');
  const [activeTab, setActiveTab] = useState<'NATIONAL' | 'UNIVERSITY'>('NATIONAL');

  // Determine active university
  const getUnivIdFromUser = () => {
    if (user?.role === 'UNIVERSITY_ADMIN' && user?.university) {
      const matched = MOCK_UNIVERSITIES.find(u => 
        u.name.toLowerCase().includes(user.university!.toLowerCase()) || 
        user.university!.toLowerCase().includes(u.name.toLowerCase()) ||
        user.university!.toLowerCase().includes(u.id.toLowerCase())
      );
      return matched ? matched.id : 'UP';
    }
    return 'UP';
  };

  const [selectedUniv, setSelectedUniv] = useState<string>(getUnivIdFromUser());

  useEffect(() => {
    setSelectedUniv(getUnivIdFromUser());
    if (user?.role === 'UNIVERSITY_ADMIN') {
      setActiveTab('UNIVERSITY');
    }
  }, [user]);

  const activeUnivData = MOCK_ANALYTICS_DATA[selectedUniv] || MOCK_ANALYTICS_DATA.UP;
  const activeUnivDetails = MOCK_UNIVERSITIES.find(u => u.id === selectedUniv) || MOCK_UNIVERSITIES[0];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 text-left">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-philsa-navy mb-2 tracking-tight">National Reporting Matrix</h1>
          <p className="text-philsa-gray text-sm font-medium">Aggregated performance intelligence and multi-dimensional analytical modeling.</p>
        </div>
        <div className="flex gap-3">
           <div className="relative group">
              <button className="bg-white border border-philsa-border px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-4 hover:border-philsa-red/30 transition-all shadow-sm">
                 <Filter className="w-4 h-4 text-philsa-red" /> {selectedBatch}
                 <ChevronDown className="w-4 h-4 text-philsa-gray" />
              </button>
           </div>
           <button className="bg-philsa-navy text-white px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-philsa-navy/20 hover:scale-105 transition-all flex items-center gap-2">
              <Download className="w-4 h-4" /> Global Export (.XLSX)
           </button>
        </div>
      </div>

      {/* Tab Switcher (Show only if System/Executive/Univ admins) */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/60 max-w-md">
        <button
          onClick={() => setActiveTab('NATIONAL')}
          disabled={user?.role === 'UNIVERSITY_ADMIN'}
          className={cn(
            "flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer",
            activeTab === 'NATIONAL' 
              ? "bg-white text-philsa-navy shadow" 
              : "text-slate-500 hover:text-slate-800 disabled:opacity-40"
          )}
        >
          National Overview
        </button>
        <button
          onClick={() => setActiveTab('UNIVERSITY')}
          className={cn(
            "flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer",
            activeTab === 'UNIVERSITY' 
              ? "bg-white text-philsa-navy shadow" 
              : "text-slate-500 hover:text-slate-800"
          )}
        >
          University Analytics
        </button>
      </div>

      {activeTab === 'NATIONAL' ? (
        <div className="space-y-8">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <KPICard label="Total Examinees" value="152,402" icon={LayoutGrid} color="philsa-navy" />
            <KPICard label="National Avg" value="74.2" icon={Target} color="philsa-red" />
            <KPICard label="Pass Rate" value="68.4%" icon={TrendingUp} color="green-600" />
            <KPICard label="English" value="78.2" icon={BarChart2} color="blue-600" />
            <KPICard label="Math" value="68.8" icon={BarChart2} color="amber-600" />
            <KPICard label="Science" value="72.4" icon={BarChart2} color="emerald-600" />
            <KPICard label="Reading" value="81.2" icon={BarChart2} color="purple-600" />
          </div>

          {/* Grid Layout */}
          <div className="space-y-8">
             {/* Section 1: Subject Score Variance Matrix */}
             <div className="card-philsa p-8">
                <div className="flex justify-between items-center mb-10">
                   <div>
                      <h3 className="text-xl font-black text-philsa-navy tracking-tight underline decoration-philsa-red decoration-4 underline-offset-8">Subject Score Variance Matrix</h3>
                      <p className="text-[10px] text-philsa-gray font-bold uppercase tracking-widest mt-3 opacity-60">National Institutional Benchmarking</p>
                   </div>
                </div>
                <div className="h-[400px]">
                   <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={SUBJECT_PERFORMANCE}>
                         <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                         <XAxis dataKey="subject" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10, fontWeight: 800 }} />
                         <YAxis axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10, fontWeight: 800 }} />
                         <Tooltip 
                          contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '20px' }}
                          cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                         />
                         <Bar dataKey="score" fill="#8B0D11" radius={[12, 12, 0, 0]} barSize={45} />
                         <Line type="monotone" dataKey="nationalAvg" stroke="#0F172A" strokeWidth={4} dot={{ r: 6, fill: '#0F172A', strokeWidth: 2, stroke: '#fff' }} />
                      </ComposedChart>
                   </ResponsiveContainer>
                </div>
             </div>

             {/* Section 2: Regional Passing Competency */}
             <div className="card-philsa p-8">
                <div className="flex justify-between items-center mb-10">
                   <div>
                      <h3 className="text-xl font-black text-philsa-navy tracking-tight underline decoration-philsa-red decoration-4 underline-offset-8">Regional Passing Competency</h3>
                      <p className="text-[10px] text-philsa-gray font-bold uppercase tracking-widest mt-3 opacity-60">Geodemographic Achievement Profiles</p>
                   </div>
                </div>
                <div className="h-[350px]">
                   <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={REGIONAL_DISTRIBUTION}>
                         <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                         <XAxis dataKey="region" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10, fontWeight: 800 }} />
                         <YAxis axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10, fontWeight: 800 }} />
                         <Tooltip 
                          contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '20px' }}
                         />
                         <Area type="monotone" dataKey="passing" stroke="#8B0D11" fill="#8B0D11" fillOpacity={0.1} strokeWidth={3} />
                      </AreaChart>
                   </ResponsiveContainer>
                </div>
             </div>

             {/* Section 3: Batch Quality Index */}
             <div className="card-philsa p-8">
                <div className="flex justify-between items-center mb-10">
                   <div>
                      <h3 className="text-xl font-black text-philsa-navy tracking-tight underline decoration-philsa-red decoration-4 underline-offset-8">Batch Quality Index</h3>
                      <p className="text-[10px] text-philsa-gray font-bold uppercase tracking-widest mt-3 opacity-60">Inter-cohort percentile tracking</p>
                   </div>
                </div>
                <div className="h-[350px]">
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={BATCH_COMPARISON}>
                         <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                         <XAxis dataKey="batch" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10, fontWeight: 800 }} />
                         <YAxis axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10, fontWeight: 800 }} />
                         <Tooltip 
                          contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '20px' }}
                         />
                         <Bar dataKey="average" fill="#0F172A" radius={[8, 8, 0, 0]} />
                         <Bar dataKey="top10" fill="#8B0D11" radius={[8, 8, 0, 0]} />
                      </BarChart>
                   </ResponsiveContainer>
                </div>
             </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Picker for Admins who are not locked to a specific university */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-6 rounded-3xl border border-philsa-border shadow-sm">
            <div>
              <div className="flex items-center gap-3">
                <div className={cn("w-3 h-8 rounded-full", activeUnivDetails.color)} />
                <h2 className="text-xl font-extrabold text-philsa-navy tracking-tight">{activeUnivDetails.name}</h2>
              </div>
              <p className="text-philsa-gray text-xs font-semibold mt-1">
                Strategic applicant metrics, capacity quota, and entry score demographics.
              </p>
            </div>

            {user?.role === 'SYSTEM_ADMIN' && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-philsa-gray">University Scope:</span>
                <div className="relative">
                  <select 
                    value={selectedUniv} 
                    onChange={(e) => setSelectedUniv(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 text-xs font-bold text-philsa-navy appearance-none outline-none focus:ring-2 focus:ring-philsa-red/10 cursor-pointer"
                  >
                    {MOCK_UNIVERSITIES.map((univ) => (
                      <option key={univ.id} value={univ.id}>{univ.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-philsa-gray pointer-events-none" />
                </div>
              </div>
            )}
          </div>

          {/* Numerical Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {activeUnivData.stats.map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div key={idx} className="card-philsa !p-6 flex flex-col justify-between hover:-translate-y-1 transition-transform cursor-default">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] font-black text-philsa-gray uppercase tracking-widest leading-normal">{stat.label}</span>
                    <div className="w-10 h-10 bg-philsa-bg rounded-xl flex items-center justify-center text-philsa-gray/50">
                      <Icon className="w-5 h-5 text-philsa-navy" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-philsa-navy tracking-tight mb-1">{stat.value}</h3>
                    <p className="text-[11px] text-green-600 font-bold flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 shrink-0" />
                      {stat.sub}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Main Grid Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Course Allocation vs Quota Chart */}
            <div className="card-philsa lg:col-span-2 flex flex-col p-6">
              <div className="mb-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <p className="text-[10px] font-black text-philsa-gray uppercase tracking-wider mb-1">Subject / Quota Analysis</p>
                  <h3 className="text-lg font-extrabold text-philsa-navy">Course Applications vs Allocation Quotas</h3>
                </div>
              </div>
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activeUnivData.courseDistribution} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="name" stroke="#64748B" fontSize={11} fontStyle="bold" axisLine={false} tickLine={false} />
                    <YAxis stroke="#64748B" fontSize={11} fontStyle="bold" axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: '#F8FAFC' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 'bold' }} />
                    <Bar dataKey="applicants" name="Active Applicants" fill="#8A1538" radius={[4, 4, 0, 0]} barSize={28} />
                    <Bar dataKey="quota" name="Admission Quota" fill="#D97706" radius={[4, 4, 0, 0]} barSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Demographics Area (Pie Chart) */}
            <div className="card-philsa flex flex-col p-6">
              <div className="mb-6">
                <p className="text-[10px] font-black text-philsa-gray uppercase tracking-wider mb-1">Geographical Pool</p>
                <h3 className="text-lg font-extrabold text-philsa-navy">Regional Demographics</h3>
              </div>
              <div className="h-[200px] w-full flex items-center justify-center relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={activeUnivData.demographics}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {activeUnivData.demographics.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={UNIV_COLORS[index % UNIV_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute flex flex-col items-center">
                  <span className="text-[10px] font-black text-philsa-gray uppercase tracking-widest leading-none">Primary</span>
                  <span className="text-lg font-black text-philsa-navy mt-1">NCR</span>
                </div>
              </div>
              <div className="space-y-1.5 mt-4">
                {activeUnivData.demographics.map((entry, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: UNIV_COLORS[idx % UNIV_COLORS.length] }} />
                      <span className="text-xs font-semibold text-philsa-navy">{entry.name}</span>
                    </div>
                    <span className="text-xs font-black text-philsa-gray">{entry.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Score Distribution Histogram */}
            <div className="card-philsa flex flex-col p-6">
              <div className="mb-6">
                <p className="text-[10px] font-black text-philsa-gray uppercase tracking-wider mb-1">Aptitude Spectrum</p>
                <h3 className="text-lg font-extrabold text-philsa-navy">Score Ranges Distribution</h3>
              </div>
              <div className="h-[210px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activeUnivData.scoreDistribution} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                    <XAxis type="number" stroke="#64748B" fontSize={10} axisLine={false} tickLine={false} />
                    <YAxis dataKey="range" type="category" stroke="#64748B" fontSize={10} fontStyle="bold" axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="count" name="Examinees Count" fill="#00563F" radius={[0, 4, 4, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-3">
                <p className="text-[11px] font-medium text-emerald-800 leading-relaxed">
                  Highly concentrated in the <span className="font-bold">85-89 percentile</span> group, indicating extremely competitive admissions standard.
                </p>
              </div>
            </div>

            {/* Applications Monthly growth trend */}
            <div className="card-philsa lg:col-span-2 flex flex-col p-6">
              <div className="mb-6">
                <p className="text-[10px] font-black text-philsa-gray uppercase tracking-wider mb-1">Registration Log</p>
                <h3 className="text-lg font-extrabold text-philsa-navy">Enrollment Growth & Qualification Rate</h3>
              </div>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={activeUnivData.monthlyTrends} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                    <defs>
                      <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8A1538" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#8A1538" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorPassed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00563F" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#00563F" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="month" stroke="#64748B" fontSize={11} fontStyle="bold" axisLine={false} tickLine={false} />
                    <YAxis stroke="#64748B" fontSize={11} fontStyle="bold" axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 'bold' }} />
                    <Area type="monotone" dataKey="applications" name="Submitted Portals" stroke="#8A1538" strokeWidth={2.5} fillOpacity={1} fill="url(#colorApps)" />
                    <Area type="monotone" dataKey="qualifications" name="Passed Credentials" stroke="#00563F" strokeWidth={2.5} fillOpacity={1} fill="url(#colorPassed)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KPICard({ label, value, icon: Icon, color }: any) {
  return (
    <div className="card-philsa p-4 flex flex-col items-center justify-center text-center group hover:scale-105 transition-all border-b-2" style={{ borderBottomColor: `var(--${color})` }}>
       <Icon className="w-4 h-4 mb-3 text-philsa-gray group-hover:text-philsa-red transition-colors" />
       <p className="text-[8px] font-black text-philsa-gray uppercase tracking-widest mb-1 truncate w-full">{label}</p>
       <p className="text-lg font-black text-philsa-navy tracking-tight">{value}</p>
    </div>
  );
}
