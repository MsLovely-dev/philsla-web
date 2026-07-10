import React, { useState } from 'react';
import { 
  Zap, Shield, Activity, Users, BookOpen, CheckCircle2, 
  WifiOff, AlertTriangle, Monitor, Clock, Siren, Search, Filter, 
  Check, UserCheck, PlayCircle, PauseCircle, ArrowRight, ShieldAlert, Cpu
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, PieChart, Pie, Cell
} from 'recharts';
import { cn } from '../../lib/utils';
import { 
  CenterMonitor, StudentMonitor, ProctorMonitor, LiveIncident, LiveAlert, SecurityAuditLog 
} from '../../pages/admin/CommandCenter';

// --- HELPERS ---
const regionDataMap: Record<string, { uptime: string; credibility: string; latency: number; multiplier: number }> = {
  ALL: { uptime: '99.98%', credibility: '99.76%', latency: 42, multiplier: 1.0 },
  NCR: { uptime: '99.99%', credibility: '99.82%', latency: 24, multiplier: 0.45 },
  LUZON: { uptime: '99.96%', credibility: '99.78%', latency: 38, multiplier: 0.28 },
  VISAYAS: { uptime: '99.95%', credibility: '99.68%', latency: 49, multiplier: 0.17 },
  MINDANAO: { uptime: '99.92%', credibility: '99.64%', latency: 58, multiplier: 0.10 }
};

// ============================================
// SECTION 1: National KPI Overview
// ============================================
interface NationalKpiProps {
  selectedRegion: string;
  setSelectedRegion: (r: string) => void;
  selectedTimePeriod: string;
  setSelectedTimePeriod: (t: string) => void;
  students: StudentMonitor[];
  proctors: ProctorMonitor[];
  centers: CenterMonitor[];
  alerts: LiveAlert[];
  incidents: LiveIncident[];
}

export function NationalKpiView({
  selectedRegion, setSelectedRegion,
  selectedTimePeriod, setSelectedTimePeriod,
  students, proctors, centers, alerts, incidents
}: NationalKpiProps) {
  
  const activeReg = regionDataMap[selectedRegion] || regionDataMap.ALL;
  const mult = activeReg.multiplier;

  // Calculators
  const totalExaminees = Math.round(200000 * mult);
  const activeExaminees = Math.round(142850 * mult);
  const uptime = activeReg.uptime;
  const credibilityRate = activeReg.credibility;
  const systemRiskScore = incidents.filter(i => i.status !== 'RESOLVED' && i.status !== 'CLOSED').length > 0 ? Math.round(18 * mult + 12) : Math.round(8 * mult);
  const proctorUtilization = Math.round(85.4 * mult + 5 * (1 - mult)) + '%';
  const deviceAvailability = Math.round(98.9 * mult + 1 * (1 - mult)) + '%';
  const streamHealth = Math.round(99.2 * mult + 0.5 * (1 - mult)) + '%';
  const avgResponseTime = (11.4 * mult + 2).toFixed(1) + 's';
  const completionRate = '96.8%';
  const overallSystemHealth = systemRiskScore > 30 ? 'DEGRADED' : 'OPTIMAL';

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="text-[11px] font-black uppercase text-slate-600 tracking-wider">Filters:</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Region Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Region:</span>
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-philsa-navy focus:outline-none focus:ring-1 focus:ring-philsa-red/30 focus:border-philsa-red/30 transition-all uppercase tracking-wider"
            >
              <option value="ALL">All Regions</option>
              <option value="NCR">NCR</option>
              <option value="LUZON">Luzon</option>
              <option value="VISAYAS">Visayas</option>
              <option value="MINDANAO">Mindanao</option>
            </select>
          </div>

          {/* Time Period Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Period:</span>
            <select
              value={selectedTimePeriod}
              onChange={(e) => setSelectedTimePeriod(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-philsa-navy focus:outline-none focus:ring-1 focus:ring-philsa-red/30 focus:border-philsa-red/30 transition-all uppercase tracking-wider"
            >
              <option value="TODAY">Today</option>
              <option value="WEEK">Last 7 Days</option>
              <option value="MONTH">Current Month</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-white p-4 rounded-xl border border-philsa-border hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <Users className="w-4 h-4 text-philsa-navy" />
            <span className="text-[8px] font-black uppercase text-slate-400">Total Registered</span>
          </div>
          <div className="mt-2.5">
            <p className="text-xl md:text-2xl font-black text-slate-900">{totalExaminees.toLocaleString()}</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Total Candidates</p>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white p-4 rounded-xl border border-philsa-border hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <BookOpen className="w-4 h-4 text-[#00563F]" />
            <span className="text-[8px] bg-green-50 text-green-700 border border-green-200 px-1 py-0.2 rounded font-black uppercase animate-pulse">Live</span>
          </div>
          <div className="mt-2.5">
            <p className="text-xl md:text-2xl font-black text-slate-900">{activeExaminees.toLocaleString()}</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Active Candidates</p>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white p-4 rounded-xl border border-philsa-border hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <Zap className="w-4 h-4 text-amber-500" />
            <span className="text-[8px] font-black uppercase text-amber-600">Uptime</span>
          </div>
          <div className="mt-2.5">
            <p className="text-xl md:text-2xl font-black text-slate-900">{uptime}</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">System Uptime</p>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white p-4 rounded-xl border border-philsa-border hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <Shield className="w-4 h-4 text-[#8A1538]" />
            <span className="text-[8px] font-black uppercase text-[#8A1538]">Compliance</span>
          </div>
          <div className="mt-2.5">
            <p className="text-xl md:text-2xl font-black text-slate-900">{credibilityRate}</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Exam Integrity Rate</p>
          </div>
        </div>

        {/* KPI 5 */}
        <div className="bg-white p-4 rounded-xl border border-philsa-border hover:shadow-md transition-all flex flex-col justify-between bg-red-50/10">
          <div className="flex items-center justify-between">
            <AlertTriangle className={cn("w-4 h-4", systemRiskScore > 25 ? "text-[#8A1538]" : "text-amber-600")} />
            <span className="text-[8px] font-black uppercase text-slate-400">Security Risk</span>
          </div>
          <div className="mt-2.5">
            <p className={cn("text-xl md:text-2xl font-black", systemRiskScore > 25 ? "text-[#8A1538]" : "text-slate-900")}>
              {systemRiskScore}/100
            </p>
            <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Risk Level</p>
          </div>
        </div>

        {/* KPI 6 */}
        <div className="bg-white p-4 rounded-xl border border-philsa-border hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <Users className="w-4 h-4 text-blue-600" />
            <span className="text-[8px] font-black uppercase text-slate-400">Capacity</span>
          </div>
          <div className="mt-2.5">
            <p className="text-xl md:text-2xl font-black text-slate-900">{proctorUtilization}</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Active Proctors</p>
          </div>
        </div>

        {/* KPI 7 */}
        <div className="bg-white p-4 rounded-xl border border-philsa-border hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <Monitor className="w-4 h-4 text-sky-600" />
            <span className="text-[8px] font-black uppercase text-slate-400">Hardware Link</span>
          </div>
          <div className="mt-2.5">
            <p className="text-xl md:text-2xl font-black text-slate-900">{deviceAvailability}</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Device Readiness</p>
          </div>
        </div>

        {/* KPI 8 */}
        <div className="bg-white p-4 rounded-xl border border-philsa-border hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <Activity className="w-4 h-4 text-emerald-600" />
            <span className="text-[8px] font-black uppercase text-slate-400">RTP Sync</span>
          </div>
          <div className="mt-2.5">
            <p className="text-xl md:text-2xl font-black text-slate-900">{streamHealth}</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Stream Quality</p>
          </div>
        </div>

        {/* KPI 9 */}
        <div className="bg-white p-4 rounded-xl border border-philsa-border hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <Clock className="w-4 h-4 text-slate-700" />
            <span className="text-[8px] font-black uppercase text-slate-400">Response</span>
          </div>
          <div className="mt-2.5">
            <p className="text-xl md:text-2xl font-black text-slate-900">{avgResponseTime}</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Response Time</p>
          </div>
        </div>

        {/* KPI 10 */}
        <div className="bg-white p-4 rounded-xl border border-philsa-border hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span className="text-[8px] font-black uppercase text-slate-400">Completion</span>
          </div>
          <div className="mt-2.5">
            <p className="text-xl md:text-2xl font-black text-slate-900">{completionRate}</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Completion Rate</p>
          </div>
        </div>

        {/* KPI 11 */}
        <div className="bg-white p-4 rounded-xl border border-philsa-border hover:shadow-md transition-all flex flex-col justify-between md:col-span-2 bg-[#e5f1ec]">
          <div className="flex items-center justify-between">
            <Cpu className="w-4 h-4 text-[#00563F]" />
            <span className="text-[8px] tracking-widest font-black uppercase text-[#00563F] bg-white border border-[#00563F]/20 px-2 py-0.5 rounded">System Status</span>
          </div>
          <div className="mt-2.5">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-650"></span>
              </span>
              <p className="text-xl md:text-2xl font-extrabold text-[#00563F] tracking-tight">{overallSystemHealth}</p>
            </div>
            <p className="text-[9px] font-bold text-slate-500 uppercase mt-1">Overall System Status</p>
          </div>
        </div>
      </div>

      {/* Historical Telemetry Chart */}
      <div className="bg-white p-5 rounded-xl border border-philsa-border space-y-4">
        <div>
          <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Streaming History</h4>
          <p className="text-[10px] text-slate-500 font-semibold uppercase">Connection latency over time</p>
        </div>
        <div className="h-56 text-[10px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={[
                { time: '08:00', load: 12, latency: 15, risk: 2 },
                { time: '09:00', load: 35, latency: 18, risk: 4 },
                { time: '10:00', load: 88, latency: 32, risk: 9 },
                { time: '11:00', load: 145, latency: 45, risk: 15 },
                { time: '12:00', load: 120, latency: 40, risk: 12 },
                { time: '13:00', load: 160, latency: 48, risk: 18 },
                { time: '14:00', load: 210, latency: 52, risk: 11 },
                { time: '15:00', load: 185, latency: 42, risk: 14 },
              ]}
              margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00563F" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#00563F" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8A1538" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#8A1538" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ECEFF1" />
              <XAxis dataKey="time" stroke="#94A3B8" />
              <YAxis stroke="#94A3B8" />
              <Tooltip contentStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
              <Legend wrapperStyle={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 'bold' }} />
              <Area type="monotone" dataKey="load" stroke="#00563F" strokeWidth={2} fillOpacity={1} fill="url(#colorLoad)" name="Active Candidates" />
              <Area type="monotone" dataKey="risk" stroke="#8A1538" strokeWidth={1.5} fillOpacity={1} fill="url(#colorRisk)" name="Security Flags Count" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Mass-Scale Infrastructure Overview */}
      <div className="bg-white p-5 rounded-xl border border-philsa-border space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div>
            <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Distributed Cloud Infrastructure (200K concurrent scale)</h4>
            <p className="text-[10px] text-slate-500 font-semibold uppercase">Cluster orchestration, active socket links, and CDN statistics</p>
          </div>
          <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-black tracking-widest px-2.5 py-1 rounded">
            SYS REPLICATION ACTIVE (SLAs 99.98%)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-slate-100 rounded-xl p-3.5 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-[#8A1538] uppercase">NCR & LUZON CLUSTER</span>
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-medium text-slate-600">
                <span>Active Sockets</span>
                <span className="font-mono font-bold text-slate-900">81,424 / 90,000</span>
              </div>
              <div className="w-full bg-slate-105 h-1.5 rounded-full overflow-hidden">
                <div className="bg-[#8A1538] h-full rounded-full" style={{ width: '90%' }} />
              </div>
              <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold">Node Health: 99.99% • CPU Load: 42%</p>
            </div>
          </div>

          <div className="border border-slate-100 rounded-xl p-3.5 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-700 uppercase">VISAYAS CLUSTER</span>
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-medium text-slate-600">
                <span>Active Sockets</span>
                <span className="font-mono font-bold text-slate-900">24,284 / 34,000</span>
              </div>
              <div className="w-full bg-slate-105 h-1.5 rounded-full overflow-hidden">
                <div className="bg-[#00563F] h-full rounded-full" style={{ width: '71%' }} />
              </div>
              <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold">Node Health: 99.95% • CPU Load: 28%</p>
            </div>
          </div>

          <div className="border border-slate-100 rounded-xl p-3.5 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-700 uppercase">MINDANAO CLUSTER</span>
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-medium text-slate-600">
                <span>Active Sockets</span>
                <span className="font-mono font-bold text-slate-900">14,142 / 20,000</span>
              </div>
              <div className="w-full bg-slate-105 h-1.5 rounded-full overflow-hidden">
                <div className="bg-sky-605 h-full rounded-full" style={{ width: '70%' }} />
              </div>
              <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold">Node Health: 99.92% • CPU Load: 19%</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-slate-50 border border-slate-150 rounded-xl text-[10.5px]">
          <div className="space-y-0.5">
            <p className="text-slate-400 font-extrabold uppercase text-[8.5px]">CDN Aggregated Outflow</p>
            <p className="font-black text-slate-800">14.8 Gbps Peak</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-slate-400 font-extrabold uppercase text-[8.5px]">DB Writes / Second</p>
            <p className="font-black text-slate-800">42,500 operations</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-slate-400 font-extrabold uppercase text-[8.5px]">RTC Latency Rating</p>
            <p className="font-bold text-[#00563F] uppercase flex items-center gap-1">Excellent (&lt;30ms)</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-slate-400 font-extrabold uppercase text-[8.5px]">Sync Redundancy</p>
            <p className="font-black text-slate-800">Triple Replication</p>
          </div>
        </div>
      </div>
    </div>
  );
}


// ============================================
// SECTION 2: Exam Execution Monitoring
// ============================================
interface ExamExecutionProps {
  students: StudentMonitor[];
  setSelectedStudent: (s: StudentMonitor) => void;
}

export function ExamExecutionView({ students, setSelectedStudent }: ExamExecutionProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Calculations
  const totalSessions = 200000;
  const activeSessions = 142850 + (students.filter(s => s.status === 'TAKING_EXAM' || s.status === 'FLAGGED').length * 15);
  const onTimeStartRate = '99.54%';
  const completedExams = 53200 + (students.filter(s => s.status === 'SUBMITTED').length * 45);

  const avgProgress = students.length > 0 
    ? Math.round(students.reduce((acc, st) => acc + (st.currentQuestion / st.totalQuestions) * 100, 0) / students.length)
    : 72;

  // Recharts Status Chart
  const statusSummary = [
    { name: 'Taking Exam', value: 142850, color: '#00563F' },
    { name: 'Security Warnings', value: 245 + students.filter(s => s.status === 'FLAGGED').length * 35, color: '#8A1538' },
    { name: 'Disconnected', value: 120 + students.filter(s => s.status === 'DISCONNECTED').length * 45, color: '#F59E0B' },
    { name: 'Submitted', value: 53200 + students.filter(s => s.status === 'SUBMITTED').length * 45, color: '#3B82F6' },
  ];

  const studentsFiltered = students.filter(s => {
    return s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
           s.exam.toLowerCase().includes(searchTerm.toLowerCase()) || 
           s.id.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Mini metrics cards banner */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
          <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Total Sessions</p>
          <p className="text-base font-black text-slate-800">{totalSessions.toLocaleString()}</p>
        </div>
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
          <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Active Candidates</p>
          <p className="text-base font-black text-[#00563F]">{activeSessions.toLocaleString()}</p>
        </div>
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
          <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">On-Time Start</p>
          <p className="text-base font-black text-slate-800">{onTimeStartRate}</p>
        </div>
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
          <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Avg progress</p>
          <p className="text-base font-black text-blue-600">{avgProgress}%</p>
        </div>
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
          <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Submitted Exams</p>
          <p className="text-base font-black text-slate-800">{completedExams.toLocaleString()}</p>
        </div>
      </div>

      {/* Grid of Status Distribution and Trends */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-3">Status Distribution</p>
          <div className="h-44 flex items-center justify-between gap-4 text-[10px]">
            <div className="w-1/2 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusSummary}
                    innerRadius={30}
                    outerRadius={55}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusSummary.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-1/2 font-bold text-slate-600 space-y-1.5 font-sans">
              {statusSummary.map((item, idx) => (
                <div key={idx} className="flex items-center gap-1.5 truncate">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span>{item.name}: {item.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Live Session Progress Trace */}
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-3">Active Trends</p>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={[
                  { hr: '08:00', Active: 15420 },
                  { hr: '09:00', Active: 45850 },
                  { hr: '10:00', Active: 110900 },
                  { hr: '11:00', Active: 140200 },
                  { hr: '12:00', Active: 130800 },
                  { hr: '13:00', Active: 142850 },
                  { hr: '14:00', Active: 142100 },
                  { hr: '15:00', Active: 142850 },
                ]}
                margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ECEFF1" />
                <XAxis dataKey="hr" stroke="#94A3B8" style={{ fontSize: '8px' }} />
                <YAxis stroke="#94A3B8" style={{ fontSize: '8px' }} />
                <Tooltip contentStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="Active" stroke="#3B82F6" strokeWidth={2} name="Active Students" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Per-Exam Performance Breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden font-sans">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200">
          <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">Exam Summary</h4>
        </div>
        <div className="overflow-x-auto text-[11px]">
          <table className="w-full text-left">
            <thead className="bg-[#FAFAFA] text-[9.5px] text-slate-500 font-extrabold uppercase tracking-widest border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Exam Name</th>
                <th className="px-5 py-3 text-center">Enrolled</th>
                <th className="px-5 py-3 text-center">Taking Exam</th>
                <th className="px-5 py-3 text-center">Completed</th>
                <th className="px-5 py-3 text-center">Security Flags</th>
                <th className="px-5 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-bold text-slate-800">
              <tr>
                <td className="px-5 py-3 text-xs">PhilSA National Qualifying Exam (NQE)</td>
                <td className="px-5 py-3 text-center">125,000</td>
                <td className="px-5 py-3 text-center text-[#00563F]">88,400</td>
                <td className="px-5 py-3 text-center">32,500</td>
                <td className="px-5 py-3 text-center text-[#8A1538]">120</td>
                <td className="px-5 py-3 text-right text-emerald-750 font-black">Active</td>
              </tr>
              <tr>
                <td className="px-5 py-3 text-xs">PhilSA Aerospace Eng. Aptitude Test</td>
                <td className="px-5 py-3 text-center">45,000</td>
                <td className="px-5 py-3 text-center text-[#00563F]">32,800</td>
                <td className="px-5 py-3 text-center">11,200</td>
                <td className="px-5 py-3 text-center text-[#8A1538]">72</td>
                <td className="px-5 py-3 text-right text-emerald-750 font-black">Active</td>
              </tr>
              <tr>
                <td className="px-5 py-3 text-xs">Space Scholarship Capability Screening</td>
                <td className="px-5 py-3 text-center">20,000</td>
                <td className="px-5 py-3 text-center text-[#00563F]">14,250</td>
                <td className="px-5 py-3 text-center">5,200</td>
                <td className="px-5 py-3 text-center text-[#8A1538]">38</td>
                <td className="px-5 py-3 text-right text-emerald-750 font-black">Active</td>
              </tr>
              <tr>
                <td className="px-5 py-3 text-xs">Space Mechanics Internship Screening</td>
                <td className="px-5 py-3 text-center">10,000</td>
                <td className="px-5 py-3 text-center text-[#00563F]">7,400</td>
                <td className="px-5 py-3 text-center">4,300</td>
                <td className="px-5 py-3 text-center text-[#8A1538]">15</td>
                <td className="px-5 py-3 text-right text-emerald-750 font-black">Active</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Candidate Live Progress Roster */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div>
            <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">Student Live Search</h4>
            <p className="text-[9px] text-slate-500 uppercase mt-0.5">Search for students sitting the exam.</p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by registered name / id..."
              className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-philsa-red/30 text-slate-700"
            />
          </div>
        </div>

        <div className="overflow-x-auto text-[11px] font-sans">
          <table className="w-full text-left">
            <thead className="bg-[#FAFAFA] text-[9.5px] text-slate-500 font-extrabold uppercase tracking-widest border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Student Name</th>
                <th className="px-4 py-3">Exam</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-center">Progress</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {studentsFiltered.map(student => (
                <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-bold">
                    <p className="text-xs font-bold leading-tight">{student.name}</p>
                    <p className="text-[9px] text-[#8A1538] font-bold tracking-wider uppercase mt-0.5">{student.id}</p>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-600">
                    <p className="leading-tight truncate max-w-[150px]">{student.exam}</p>
                    <p className="text-[9px] text-slate-400 font-mono font-medium">REMAINING: {student.timeRemaining}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "px-2 py-0.5 text-[8.5px] font-black uppercase tracking-wider rounded border",
                      student.status === 'TAKING_EXAM' && "bg-green-50 text-green-700 border-green-200",
                      student.status === 'FLAGGED' && "bg-rose-100 text-red-700 border-red-300 animate-pulse",
                      student.status === 'DISCONNECTED' && "bg-red-50 text-slate-700 border-red-200",
                      student.status === 'SUBMITTED' && "bg-blue-50 text-blue-800 border-blue-200"
                    )}>
                      {student.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-center">
                      <span className="font-bold text-[10px]">Q {student.currentQuestion}/{student.totalQuestions}</span>
                      <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden mt-1">
                        <div className="h-full bg-[#00563F]" style={{ width: `${student.currentQuestion / student.totalQuestions * 100}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelectedStudent(student)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-[#8A1538] hover:text-white rounded border border-slate-200 text-[9px] font-bold uppercase transition-all tracking-wide"
                    >
                      Audit Controls
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


// ============================================
// SECTION 3: Security & Integrity Monitoring
// ============================================
interface SecurityIntegrityProps {
  students: StudentMonitor[];
  incidents: LiveIncident[];
  securityLogs: SecurityAuditLog[];
  setSelectedIncident: (inc: LiveIncident) => void;
}

export function SecurityIntegrityView({
  students, incidents, securityLogs, setSelectedIncident
}: SecurityIntegrityProps) {
  const [secFilter, setSecFilter] = useState('ALL');

  // Counts
  const critAlertCount = incidents.filter(i => i.severity === 'CRITICAL' && i.status !== 'RESOLVED').length * 8 + 58;
  const totalEvents = 245 + incidents.length * 35;
  const resolutionRate = '92.8%';

  // Violations specific counters
  const violationSummary = {
    tabSwitch: 112,
    multiFace: incidents.filter(i => i.type === 'Multiple Faces Detected').length * 4 + 48,
    gazeDiversion: 52,
    audioAnom: 22,
    screenShare: 11
  };

  const threatTrendsData = [
    { hour: '08:00', alerts: 12, threats: 2 },
    { hour: '09:00', alerts: 45, threats: 8 },
    { hour: '10:00', alerts: 120, threats: 24 },
    { hour: '11:00', alerts: 180, threats: 38 },
    { hour: '12:00', alerts: 145, threats: 31 },
    { hour: '13:00', alerts: 195, threats: 42 },
    { hour: '14:00', alerts: 232, threats: 51 },
    { hour: '15:00', alerts: totalEvents, threats: critAlertCount },
  ];

  const filteredIncidents = incidents.filter(inc => {
    if (secFilter === 'ALL') return true;
    return inc.severity === secFilter;
  });

  return (
    <div className="space-y-6">
      {/* Metrics Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-philsa-border shadow-xs">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Logged Warnings</p>
          <p className="text-xl md:text-2xl font-black text-slate-900 mt-2">{totalEvents.toLocaleString()}</p>
          <p className="text-[9px] font-bold text-slate-400 mt-0.5">Total warnings today</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-philsa-border shadow-xs bg-red-50/10">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none text-[#8A1538]">Critical Warnings</p>
          <p className="text-xl md:text-2xl font-black text-[#8A1538] mt-2">{critAlertCount.toLocaleString()}</p>
          <p className="text-[9px] font-bold text-[#8A1538] mt-0.5">Needs quick review</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-philsa-border shadow-xs">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Warning Clear Rate</p>
          <p className="text-xl md:text-2xl font-black text-[#00563F] mt-2">{resolutionRate}</p>
          <p className="text-[9px] font-bold text-slate-400 mt-0.5">Meets safety goals</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-philsa-border shadow-xs">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Auto Security Guards</p>
          <p className="text-xl md:text-2xl font-black text-slate-900 mt-2">ACTIVE</p>
          <p className="text-[9px] font-bold text-green-700 uppercase mt-0.5">● Online and secure</p>
        </div>
      </div>

      {/* Violation Metrics Card Widgets (Specific layout) */}
      <div className="bg-white p-5 rounded-xl border border-philsa-border space-y-4">
        <div>
          <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Security Violations Breakdown</h4>
          <p className="text-[10px] text-slate-500 font-semibold uppercase">Count of current student warnings</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-sans">
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-center">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tab Switching</span>
            <p className="text-xl font-bold mt-1 text-[#8A1538]">{violationSummary.tabSwitch}</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-center">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Multiple Faces</span>
            <p className="text-xl font-bold mt-1 text-[#8A1538]">{violationSummary.multiFace}</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-center">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Gaze Diversion</span>
            <p className="text-xl font-bold mt-1 text-[#8A1538]">{violationSummary.gazeDiversion}</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-center">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Audio Anomaly</span>
            <p className="text-xl font-bold mt-1 text-slate-800">{violationSummary.audioAnom}</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-center col-span-2 sm:col-span-1">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Screen Share</span>
            <p className="text-xl font-bold mt-1 text-[#8A1538]">{violationSummary.screenShare}</p>
          </div>
        </div>
      </div>

      {/* Security Trends Charts */}
      <div className="bg-white p-5 rounded-xl border border-philsa-border">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-4">Hourly Warnings Graph</p>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={threatTrendsData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ECEFF1" />
              <XAxis dataKey="hour" stroke="#94A3B8" style={{ fontSize: '8px' }} />
              <YAxis stroke="#94A3B8" style={{ fontSize: '8px' }} />
              <Tooltip contentStyle={{ fontSize: '11px' }} />
              <Bar dataKey="alerts" fill="#F59E0B" name="Flags" radius={[3, 3, 0, 0]} />
              <Bar dataKey="threats" fill="#8A1538" name="Critical Alert Flags" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Flagged Candidates Feed */}
      <div className="bg-white rounded-xl border border-philsa-border overflow-hidden font-sans">
        <div className="px-6 py-4 border-b border-philsa-border justify-between flex items-center bg-slate-50/50">
          <div>
            <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Security Review List</h4>
            <p className="text-[9px] text-slate-500 uppercase">Alerts needing manual review</p>
          </div>
          <select
            value={secFilter}
            onChange={(e) => setSecFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded px-2 py-1 text-[10px] font-bold text-slate-700 uppercase"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical Alert Only</option>
            <option value="HIGH">High Severity Only</option>
          </select>
        </div>

        <div className="overflow-x-auto text-[11px]">
          <table className="w-full text-left">
            <thead className="bg-[#FAFAFA] text-[9px] text-[#8A1538] font-black uppercase tracking-widest border-b border-philsa-border">
              <tr>
                <th className="px-5 py-3">Triggered Time</th>
                <th className="px-5 py-3">Student Details</th>
                <th className="px-5 py-3">Violation Type</th>
                <th className="px-5 py-3">Severity</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-bold text-slate-800">
              {filteredIncidents.map((inc) => (
                <tr key={inc.id} className={cn("hover:bg-slate-50/50 transition-colors", inc.status !== 'RESOLVED' && "bg-red-50/10")}>
                  <td className="px-5 py-3 font-mono text-[10px] text-slate-500">
                    {inc.timestamp} <span className="block text-[8px] font-black">{inc.id}</span>
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-slate-900 leading-tight">{inc.studentName}</p>
                    <p className="text-[8.5px] text-slate-400 font-bold mt-0.5">{inc.studentId}</p>
                  </td>
                  <td className="px-5 py-3 text-[#8A1538] uppercase text-[10px]">
                    {inc.type}
                  </td>
                  <td className="px-5 py-3">
                    <span className={cn(
                      "px-1.5 py-0.5 text-[8px] font-black rounded uppercase",
                      inc.severity === 'CRITICAL' && "bg-red-100 text-red-900 border border-red-200",
                      inc.severity === 'HIGH' && "bg-amber-100 text-amber-900",
                      inc.severity === 'MEDIUM' && "bg-blue-100 text-blue-900"
                    )}>
                      {inc.severity}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={cn(
                      "px-1.5 py-0.5 text-[8.5px] uppercase tracking-wider rounded font-black",
                      inc.status === 'RESOLVED' && "bg-[#00563F]/10 text-[#00563F]",
                      inc.status !== 'RESOLVED' && "bg-red-50 text-[#8A1538]"
                    )}>
                      {inc.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    {inc.status !== 'RESOLVED' ? (
                      <button
                        onClick={() => setSelectedIncident(inc)}
                        className="px-2.5 py-1 text-[9px] bg-[#8A1538] hover:bg-slate-900 text-white rounded font-black uppercase tracking-wider transition-colors"
                      >
                        Investigate
                      </button>
                    ) : (
                      <span className="text-[#00563F] text-[9.5px] uppercase tracking-widest inline-flex items-center gap-1">
                        <Check className="w-3 h-3" /> Cleared
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


// ============================================
// SECTION 4: Proctoring Operations
// ============================================
interface ProctoringOpsProps {
  proctors: ProctorMonitor[];
}

export function ProctoringOpsView({ proctors }: ProctoringOpsProps) {
  const activeCount = 7420 + (proctors.filter(p => p.status === 'ONLINE').length * 5);
  const totalProctors = 7500;
  const coverageRate = '98.9%';

  const proctorsWithScaledData = proctors.map(proc => ({
    ...proc,
    studentsHandled: proc.status === 'ONLINE' ? Math.round(proc.studentsHandled * 0.9 + 5) : 0
  }));

  return (
    <div className="space-y-6 font-sans">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-philsa-border text-slate-800">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">Total Assigned</p>
          <p className="text-xl font-black mt-2">{totalProctors.toLocaleString()} Supervisors</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-philsa-border bg-[#e5f1ec] text-[#00563F]">
          <p className="text-[9px] font-black uppercase tracking-widest leading-none text-[#00563F]">Active On-Duty</p>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="w-2 h-2 rounded-full bg-[#00563F] animate-pulse" />
            <p className="text-xl font-black">{activeCount.toLocaleString()} Logged In</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-philsa-border">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">Proctor Coverage</p>
          <p className="text-xl font-black mt-2 text-slate-800">{coverageRate}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-philsa-border">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">SLA Alert Limits</p>
          <p className="text-xl font-bold mt-2 text-[#8A1538] uppercase">30s limit</p>
        </div>
      </div>

      {/* Workload Distribution Chart */}
      <div className="bg-white p-5 rounded-xl border border-slate-200">
        <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider mb-4">Active Students per Proctor</h4>
        <div className="h-44 text-[10px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={proctorsWithScaledData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" stroke="#94A3B8" />
              <YAxis stroke="#94A3B8" />
              <Tooltip contentStyle={{ fontSize: '11px' }} />
              <Bar dataKey="studentsHandled" fill="#00563F" name="Registered Candidates" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Proctor Operational logs */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden text-[11px]">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-safe-border">
          <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">Proctor Activity Log</h4>
        </div>
        <div className="overflow-x-auto text-slate-800">
          <table className="w-full text-left">
            <thead className="bg-[#FAFAFA] text-[9.5px] text-slate-500 font-extrabold uppercase tracking-widest border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Proctor Name</th>
                <th className="px-5 py-3">Testing Center</th>
                <th className="px-5 py-3">Students Handled</th>
                <th className="px-5 py-3 text-center">Duration</th>
                <th className="px-5 py-3 text-center">Response Time</th>
                <th className="px-5 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-bold">
              {proctorsWithScaledData.map((proc) => (
                <tr key={proc.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3 text-xs flex items-center gap-2">
                    <span className={cn(
                      "w-2 h-2 rounded-full",
                      proc.status === 'ONLINE' ? "bg-green-500 animate-pulse" : proc.status === 'AWAY' ? "bg-amber-500" : "bg-slate-300"
                    )} />
                    <div>
                      <p className="leading-tight text-slate-900">{proc.name}</p>
                      <p className="text-[8.5px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{proc.id}</p>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <p className="leading-none text-slate-900">{proc.testingCenter.split(' - ')[0]}</p>
                    <p className="text-[8.5px] text-slate-400 mt-1 uppercase font-semibold">{proc.assignedRoom}</p>
                  </td>
                  <td className="px-5 py-3 text-[#00563F]">
                    {proc.studentsHandled > 0 ? `${proc.studentsHandled} Candidates` : '0 - Rest Mode'}
                  </td>
                  <td className="px-5 py-3 text-center font-mono">
                    {proc.sessionDuration}
                  </td>
                  <td className="px-5 py-3 text-center text-blue-650 font-mono">
                    {proc.responseTimeSec > 0 ? `${proc.responseTimeSec} seconds` : 'N/A'}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className={cn(
                      "px-2 py-0.5 text-[8.5px] uppercase font-black tracking-wide rounded",
                      proc.status === 'ONLINE' && "bg-green-100 text-green-700",
                      proc.status === 'AWAY' && "bg-amber-100 text-amber-900",
                      proc.status === 'OFFLINE' && "bg-slate-100 text-slate-700"
                    )}>
                      {proc.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


// ============================================
// SECTION 5: Regional Operations
// ============================================
export function RegionalOpsView() {
  const regionsList = [
    { name: 'NCR - National Capital Region', sessions: 90000, active: 64284, flagged: 110, alerts: 35, progress: 84, status: 'OPTIMAL' },
    { name: 'Region IV-A (CALABARZON)', sessions: 55000, active: 39266, flagged: 58, alerts: 28, progress: 78, status: 'OPTIMAL' },
    { name: 'Region VI (Western Visayas)', sessions: 21000, active: 14842, flagged: 28, alerts: 14, progress: 91, status: 'OPTIMAL' },
    { name: 'Region VII (Central Visayas)', sessions: 15000, active: 10820, flagged: 31, alerts: 21, progress: 65, status: 'DEGRADED LINK' },
    { name: 'Region XI (Davao Region)', sessions: 13000, active: 9438, flagged: 18, alerts: 12, progress: 72, status: 'OPTIMAL' },
    { name: 'Region X (Northern Mindanao)', sessions: 6000, active: 4200, flagged: 0, alerts: 10, progress: 100, status: 'COMPLETED' },
  ];

  return (
    <div className="space-y-6 font-sans">
      <div className="bg-[#FAF3F5] border border-[#8A1538]/20 p-4 rounded-xl flex items-center justify-between gap-4">
        <div>
          <h4 className="text-xs font-black uppercase text-[#8A1538] tracking-widest mb-0.5">Regional Exam Status</h4>
          <p className="text-[10px] text-slate-650 font-medium leading-tight">Overview of connection delay and security flags by region.</p>
        </div>
        <span className="text-[9px] font-black uppercase tracking-wider bg-white border border-[#8A1538]/20 text-[#8A1538] px-2.5 py-1 rounded">
          Timezone: UTC+8
        </span>
      </div>

      {/* Regional Table (Government Specific) */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden text-[11px]">
        <div className="overflow-x-auto text-slate-800">
          <table className="w-full text-left">
            <thead className="bg-[#FAFAFA] text-[9.5px] text-slate-500 font-extrabold uppercase tracking-widest border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Region</th>
                <th className="px-5 py-3.5 text-center">Total Sessions</th>
                <th className="px-5 py-3.5 text-center">Active Students</th>
                <th className="px-5 py-3.5 text-center">Security Flags</th>
                <th className="px-5 py-3.5 text-center">Connection Warnings</th>
                <th className="px-5 py-3.5 text-center">Average Progress</th>
                <th className="px-5 py-3.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold">
              {regionsList.map((reg, idx) => (
                <tr key={idx} className={cn("hover:bg-slate-50/50 transition-colors", reg.status !== 'OPTIMAL' && reg.status !== 'COMPLETED' ? "bg-red-50/5" : "")}>
                  <td className="px-5 py-3.5 font-bold text-slate-900 text-xs">
                    {reg.name}
                  </td>
                  <td className="px-5 py-3.5 text-center font-mono">
                    {reg.sessions.toLocaleString()}
                  </td>
                  <td className="px-5 py-3.5 text-center text-[#00563F] font-bold">
                    {reg.active.toLocaleString()}
                  </td>
                  <td className="px-5 py-3.5 text-center text-[#8A1538] font-bold">
                    {reg.flagged.toLocaleString()}
                  </td>
                  <td className="px-5 py-3.5 text-center text-red-500 font-bold">
                    {reg.alerts.toLocaleString()}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-col items-center">
                      <span className="font-bold text-[10px]">{reg.progress}%</span>
                      <div className="w-20 h-1 bg-slate-100 rounded-full overflow-hidden mt-1">
                        <div className={cn("h-full", reg.progress === 100 ? "bg-blue-500" : "bg-[#00563F]")} style={{ width: `${reg.progress}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className={cn(
                      "px-2 py-0.5 text-[8.5px] uppercase tracking-wider rounded font-black",
                      reg.status === 'OPTIMAL' && "bg-green-50 text-green-700 border border-green-200",
                      reg.status === 'COMPLETED' && "bg-blue-50 text-blue-800 border-blue-200",
                      reg.status === 'DEGRADED LINK' && "bg-amber-100 text-amber-900 border border-amber-250 animate-pulse"
                    )}>
                      {reg.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


// ============================================
// SECTION 6: Audit Operations
// ============================================
interface AuditOpsProps {
  securityLogs: SecurityAuditLog[];
}

export function AuditOpsView({ securityLogs }: AuditOpsProps) {
  const totalAudits = securityLogs.length * 24 + 1950;
  const resolvedAudits = securityLogs.filter(s => s.severity !== 'CRITICAL').length * 20 + 1880;
  const slaCompliance = '98.9%';

  // Pie chart of audit levels
  const auditLevels = [
    { name: 'Critical Warnings', value: securityLogs.filter(s => s.severity === 'CRITICAL').length * 4 + 58, color: '#8A1538' },
    { name: 'Security Alerts', value: securityLogs.filter(s => s.severity === 'ALERT' || s.severity === 'WARNING').length * 15 + 1380, color: '#F59E0B' },
    { name: 'Information Logs', value: securityLogs.filter(s => s.severity === 'INFO').length * 30 + 512, color: '#3B82F6' }
  ];

  return (
    <div className="space-y-6 font-sans">
      {/* KPI banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-philsa-border shadow-xs">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Total Audited Logs</p>
          <p className="text-xl md:text-2xl font-black text-slate-900 mt-2">{totalAudits.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-philsa-border shadow-xs">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Cleared Warnings</p>
          <p className="text-xl md:text-2xl font-black text-slate-900 mt-2">{resolvedAudits.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-philsa-border shadow-xs">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Average Response Time</p>
          <p className="text-xl md:text-2xl font-black text-slate-900 mt-2">8.2m</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-philsa-border shadow-xs bg-[#e5f1ec] text-[#00563F]">
          <p className="text-[10px] font-black uppercase tracking-widest leading-none">SLA Compliance</p>
          <p className="text-xl md:text-2xl font-black text-[#00563F] mt-2">{slaCompliance}</p>
        </div>
      </div>

      {/* Row of chart and queue */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Severity Chart */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 md:col-span-4 shadow-xs">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-3">Severity Levels</p>
          <div className="h-44 text-[10px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={auditLevels} innerRadius={25} outerRadius={50} paddingAngle={4} dataKey="value">
                  {auditLevels.map((ent, idx) => (
                    <Cell key={`cell-${idx}`} fill={ent.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 text-[9.5px] font-bold text-slate-650 space-y-1">
            {auditLevels.map((ent, idx) => (
              <div key={idx} className="flex items-center gap-1.5 justify-between">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: ent.color }} /> {ent.name}</span>
                <span>{ent.value.toLocaleString()} units</span>
              </div>
            ))}
          </div>
        </div>

        {/* Audit Queue log */}
        <div className="bg-white rounded-xl border border-slate-200 md:col-span-8 overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-safe-border flex items-center justify-between">
            <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">Activity and Audited Logs</h4>
            <span className="text-[9px] font-black uppercase text-green-700 bg-white border px-2 py-0.5 rounded leading-none">Live events</span>
          </div>

          <div className="overflow-x-auto text-[10.5px]">
            <table className="w-full text-left">
              <thead className="bg-[#FAFAFA] text-[9px] text-slate-500 font-extrabold uppercase tracking-widest border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3 font-mono">User / IP Address</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {securityLogs.slice(0, 5).map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-bold font-mono text-[9.5px]">
                      {log.timestamp}
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {log.user} ({log.ipAddress})
                    </td>
                    <td className="px-4 py-3 text-slate-900 font-bold max-w-[200px] truncate">
                      {log.action.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn(
                        "px-1.5 py-0.2 rounded text-[8px] font-black uppercase",
                        log.severity === 'CRITICAL' && "bg-red-100 text-red-[#8A1538]",
                        log.severity === 'WARNING' && "bg-amber-100 text-amber-900",
                        log.severity === 'INFO' && "bg-slate-100 text-slate-700"
                      )}>
                        {log.severity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}


// ============================================
// SECTION 7: Device & Stream Reliability
// ============================================
interface DeviceStreamProps {
  centers: CenterMonitor[];
}

export function DeviceStreamView({ centers }: DeviceStreamProps) {
  // Stats
  const connectedDevices = 194520;
  const activeStreams = 142850;
  const medNetworkLatency = '38ms';
  const meanBitrate = '1,450 kbps';
  const streamQualityIndex = '99.2% HD sync';

  return (
    <div className="space-y-6 font-sans">
      {/* 5-Column metrics cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
          <p className="text-[8.5px] font-black text-slate-500 uppercase tracking-wider leading-none mb-1.5">Connected Devices</p>
          <p className="text-base font-black text-slate-900">{connectedDevices.toLocaleString()} Units</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
          <p className="text-[8.5px] font-black text-slate-500 uppercase tracking-wider leading-none mb-1.5">Active Video Streams</p>
          <p className="text-base font-black text-[#00563F]">{activeStreams.toLocaleString()} Active</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
          <p className="text-[8.5px] font-black text-slate-500 uppercase tracking-wider leading-none mb-1.5">Network Delay</p>
          <p className="text-base font-black text-slate-900">{medNetworkLatency}</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
          <p className="text-[8.5px] font-black text-slate-500 uppercase tracking-wider leading-none mb-1.5">Data Bitrate</p>
          <p className="text-base font-black text-slate-800">{meanBitrate}</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
          <p className="text-[8.5px] font-black text-slate-500 uppercase tracking-wider leading-none mb-1.5">Video Quality</p>
          <p className="text-base font-black text-blue-600">{streamQualityIndex}</p>
        </div>
      </div>

      {/* Latency Plot */}
      <div className="bg-white p-5 rounded-xl border border-slate-200">
        <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider mb-4">Connection Speed and Delay History</h4>
        <div className="h-44 text-[10px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={[
                { s: 'Sec 10', Latency: 40, Bitrate: 1200 },
                { s: 'Sec 20', Latency: 45, Bitrate: 1150 },
                { s: 'Sec 30', Latency: 85, Bitrate: 980 },
                { s: 'Sec 40', Latency: 38, Bitrate: 1280 },
                { s: 'Sec 50', Latency: 42, Bitrate: 1250 },
                { s: 'Sec 60', Latency: 50, Bitrate: 1220 },
              ]}
              margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="s" stroke="#94A3B8" />
              <YAxis stroke="#94A3B8" />
              <Tooltip contentStyle={{ fontSize: '11px' }} />
              <Area type="monotone" dataKey="Latency" stroke="#8A1538" strokeWidth={1.5} name="Response Delay (ms)" fill="#FEE2E2" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Device & Stream Events registry */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden text-[10.5px]">
        <div className="px-5 py-3 bg-slate-50 border-b border-safe-border">
          <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">Device Connection Events</h4>
        </div>
        <div className="overflow-x-auto text-slate-800 font-sans">
          <table className="w-full text-left">
            <thead className="bg-[#FAFAFA] text-[9px] text-slate-500 font-extrabold uppercase tracking-widest border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5">Time</th>
                <th className="px-4 py-2.5">Computer ID / Location</th>
                <th className="px-4 py-2.5">Event Log</th>
                <th className="px-4 py-2.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold font-mono">
              <tr>
                <td className="px-4 py-2.5 text-slate-500">15:26:02</td>
                <td className="px-4 py-2.5 font-sans">MSU Iligan Node Terminal 12</td>
                <td className="px-4 py-2.5 text-[#8A1538]">STREAM_LATENCY_SPIKE (450ms delay)</td>
                <td className="px-4 py-2.5 text-right"><span className="bg-amber-100 text-amber-800 px-1.5 py-0.1 rounded text-[8px] font-black">BUFFERING</span></td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 text-slate-500">15:24:12</td>
                <td className="px-4 py-2.5 font-sans">UST Manila Node Terminal 08</td>
                <td className="px-4 py-2.5 text-[#8A1538]">HARDWARE_ACCESS_WEBCAM_DETACHED</td>
                <td className="px-4 py-2.5 text-right"><span className="bg-red-100 text-red-[#8A1538] px-1.5 py-0.1 rounded text-[8px] font-black">DISCONNECTED</span></td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 text-slate-500">15:20:05</td>
                <td className="px-4 py-2.5 font-sans">UP Cebu Node Terminal 03</td>
                <td className="px-4 py-2.5 text-amber-700">FRAME_PACKET_LOSS (exceeded benchmark SLA 5%)</td>
                <td className="px-4 py-2.5 text-right"><span className="bg-red-100 text-red-[#8A1538] px-1.5 py-0.1 rounded text-[8px] font-black">DEGRADED</span></td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 text-slate-500">15:15:55</td>
                <td className="px-4 py-2.5 font-sans">UP Diliman Node Terminal 22</td>
                <td className="px-4 py-2.5 text-[#00563F]">OFFLINE_RECOVERY_STORAGE_CACHE_SYNCED (120 frames block)</td>
                <td className="px-4 py-2.5 text-right"><span className="bg-[#e5f1ec] text-[#00563F] px-1.5 py-0.1 rounded text-[8px] font-black">SYNCED</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


// ============================================
// SECTION 8: Alert & Incident Management
// ============================================
interface AlertIncidentProps {
  alerts: LiveAlert[];
  incidents: LiveIncident[];
  setAlerts: React.Dispatch<React.SetStateAction<LiveAlert[]>>;
  setIncidents: React.Dispatch<React.SetStateAction<LiveIncident[]>>;
  setSelectedIncident: (inc: LiveIncident) => void;
}

export function AlertIncidentView({
  alerts, incidents, setAlerts, setIncidents, setSelectedIncident
}: AlertIncidentProps) {
  const totalAlerts = alerts.length * 15 + 245;
  const activeAlerts = alerts.filter(a => !a.isRead).length * 8 + 58;
  const acknowledgedAlerts = alerts.filter(a => a.isRead).length * 7 + 115;
  const resolvedAlerts = 72;

  const handleStatusChange = (id: string, newStatus: LiveIncident['status']) => {
    setIncidents(prev => prev.map(inc => inc.id === id ? { ...inc, status: newStatus } : inc));
  };

  const handlePriorityChange = (id: string, newPriority: 'P1' | 'P2' | 'P3' | 'P4') => {
    setIncidents(prev => prev.map(inc => inc.id === id ? { ...inc, priority: newPriority } : inc));
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Metrics breakdown board */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
          <p className="text-[8.5px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1.5">Total Warnings</p>
          <p className="text-xl font-black text-slate-900">{totalAlerts.toLocaleString()}</p>
        </div>
        <div className="bg-[#FAF3F5] border border-[#8A1538]/20 p-4 rounded-xl text-[#8A1538]">
          <p className="text-[8.5px] font-black uppercase tracking-widest leading-none text-[#8A1538] mb-1.5">Unresolved Warnings</p>
          <p className="text-xl font-black text-[#8A1538]">{activeAlerts.toLocaleString()} Alerts</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
          <p className="text-[8.5px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1.5">Reviewed Warnings</p>
          <p className="text-xl font-black text-slate-800">{acknowledgedAlerts.toLocaleString()}</p>
        </div>
        <div className="bg-[#e5f1ec] border border-[#00563F]/20 p-4 rounded-xl text-[#00563F]">
          <p className="text-[8.5px] font-black uppercase tracking-widest leading-none text-[#00563F] mb-1.5">Cleared Warnings</p>
          <p className="text-xl font-black text-[#00563F]">{resolvedAlerts.toLocaleString()}</p>
        </div>
      </div>

      {/* Escalation Queue Feed */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden font-sans">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
          <div>
            <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Active Security Incidents</h4>
            <p className="text-[10px] text-slate-500 font-semibold uppercase">Manage and assign reviewers</p>
          </div>
          <span className="text-[8px] bg-red-150 text-red-[#8A1538] border border-red-250 font-black tracking-widest px-2 py-0.5 rounded leading-none uppercase">
            Review Goal: 15m Limit
          </span>
        </div>

        <div className="overflow-x-auto text-[11px] font-sans">
          <table className="w-full text-left">
            <thead className="bg-[#FAFAFA] text-[9.5px] text-[#8A1538] font-black uppercase tracking-widest border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Time / ID</th>
                <th className="px-5 py-3.5">Student Info</th>
                <th className="px-5 py-3.5">Security Incident</th>
                <th className="px-5 py-3.5">Priority</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Override / Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-bold text-slate-800">
              {incidents.map((inc) => (
                <tr key={inc.id} className="hover:bg-slate-50/40 transition-colors">
                  <td className="px-5 py-3.5 font-mono text-[9.5px]">
                    {inc.timestamp} <span className="block text-[8px] text-slate-400 font-bold tracking-wider mt-0.5">{inc.id}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="text-slate-900 leading-tight">{inc.studentName}</p>
                    <p className="text-[8.5px] text-slate-400 font-bold tracking-wider mt-0.5">{inc.studentId}</p>
                  </td>
                  <td className="px-5 py-3.5 text-slate-700 font-semibold">
                    <p className="leading-tight truncate max-w-[150px] text-slate-900 font-bold">{inc.type}</p>
                    <p className="text-[8.5px] text-slate-400 font-bold mt-0.5 uppercase">NODE: {inc.testingCenter.split(' - ')[0]}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <select
                      value={inc.priority || 'P2'}
                      onChange={(e) => handlePriorityChange(inc.id, e.target.value as 'P1' | 'P2' | 'P3' | 'P4')}
                      className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-[9.5px] text-slate-800 tracking-wider font-extrabold focus:outline-none"
                    >
                      <option value="P1">P1 - HIGH ALERT</option>
                      <option value="P2">P2 - IMPORTANT</option>
                      <option value="P3">P3 - MEDIUM</option>
                      <option value="P4">P4 - LOW</option>
                    </select>
                  </td>
                  <td className="px-5 py-3.5">
                    <select
                      value={inc.status}
                      onChange={(e) => handleStatusChange(inc.id, e.target.value as LiveIncident['status'])}
                      className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-[9.5px] text-[#8A1538] font-black focus:outline-none tracking-wider uppercase"
                    >
                      <option value="OPEN">NEW / UNREVIEWED</option>
                      <option value="INVESTIGATING">UNDER REVIEW</option>
                      <option value="ESCALATED">ESCALATED</option>
                      <option value="RESOLVED">RESOLVED</option>
                      <option value="CLOSED">CLOSED</option>
                    </select>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => setSelectedIncident(inc)}
                      className="px-2.5 py-1 text-[9px] bg-slate-100 hover:bg-[#8A1538] hover:text-white border border-slate-200 rounded font-black uppercase transition-all tracking-wider"
                    >
                      REVIEW
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
