import { useState, useEffect } from 'react';
import { usePhilSA } from '../PhilSAContext';
import { useMockData } from '../services/mockService';
import { FileText, Shield, Clock, Bell, ArrowRight, CheckCircle, Clipboard, UserCheck, AlertCircle, Users, BarChart2, Target, Monitor, FileEdit, Search } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { PHILSA_COLORS, cn } from '../lib/utils';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { Logo } from '../components/Logo';
import StudentDashboard from './student/StudentDashboard';
import GovernmentAccess from './GovernmentAccess';

function RankStat({ label, rank, color }: { label: string, rank: string, color: string }) {
  return (
    <div className="flex flex-col items-center p-6 bg-philsa-bg rounded-2xl border border-philsa-border hover:border-philsa-red/30 transition-all">
       <div className={cn("w-3 h-3 rounded-full mb-4 shadow-sm", color)} />
       <p className="text-xs font-black text-philsa-navy mb-1">{label}</p>
       <p className="text-2xl font-black text-philsa-navy tracking-tighter">{rank}</p>
       <p className="text-[10px] text-philsa-gray font-bold uppercase mt-2">National Rank</p>
    </div>
  );
}

export default function Dashboard() {
  const { user, auditLogs } = usePhilSA();
  const { applications, permits } = useMockData();

  if (user?.role === 'TECH_SUPPORT') {
    return <Navigate to="/support/dashboard" replace />;
  }

  const myApp = applications.find(a => a.userId === user?.id);
  const myPermit = permits.find(p => p.userId === user?.id);

  // Stats for University Admin
  const univStats = [
    { label: 'Total Applicants', val: '4,250', sub: user?.university || 'All Universities', icon: UserCheck, color: 'text-philsa-navy', bg: 'bg-philsa-bg' },
    { label: 'Reviews per Hour', val: '142/hr', sub: 'Processing Speed', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Admission Rate', val: '62%', sub: 'Target: 75%', icon: Target, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'ID Verification Issues', val: '12', sub: 'Identity Conflicts', icon: Shield, color: 'text-philsa-red', bg: 'bg-philsa-red/10' },
  ];

  // Stats for Exam Admin dash
  const adminStats = [
    { label: 'Active Question Bank', val: '12,450', sub: 'All Subject Areas', icon: Clipboard, color: 'text-philsa-navy', bg: 'bg-philsa-bg' },
    { label: 'Verified Questions', val: '8,200', sub: 'Ready for Exam', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Questions to Review', val: '28', sub: 'Needs Correction', icon: AlertCircle, color: 'text-philsa-red', bg: 'bg-philsa-red/10' },
    { label: 'Syllabus Coverage', val: '98.4%', sub: 'Topic Match Rate', icon: BarChart2, color: 'text-blue-600', bg: 'bg-blue-50' },
  ];

  const questionProgress = [
    { label: 'MCQ', count: 8400, percent: 68 },
    { label: 'True/False', count: 2100, percent: 17 },
    { label: 'Essay', count: 1200, percent: 10 },
    { label: 'Others', count: 750, percent: 5 },
  ];

  const contributions = [
    { agency: 'CHED', count: 5200, color: 'bg-[#FFB81C]' },
    { agency: 'DepEd', count: 4800, color: 'bg-[#8A1538]' },
    { agency: 'TESDA', count: 2450, color: 'bg-[#00563F]' },
  ];

  const sysAdminStats = [
    { label: 'Total Registrations', val: '28.4M', sub: 'National Total', icon: Users, color: 'text-philsa-navy', bg: 'bg-philsa-bg' },
    { label: 'Pending Devices', val: '12', sub: 'Verification Queue', icon: Monitor, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Fraud Alerts', val: '1.02/k', sub: 'Reported Incidents', icon: AlertCircle, color: 'text-philsa-red', bg: 'bg-philsa-red/10' },
    { label: 'System Reliability', val: '99.98%', sub: 'Network Performance', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
  ];

  const quickActions = [
    ...(user?.role === 'PROCTOR' ? [
      { label: 'Add Device', href: '/proctor/devices', icon: Monitor, color: 'bg-blue-600' },
      { label: 'Edit Device', href: '/proctor/devices', icon: FileEdit, color: 'bg-amber-600' },
      { label: 'Remove Device', href: '/proctor/devices', icon: Shield, color: 'bg-philsa-red' },
    ] : []),
    ...(user?.role === 'SYSTEM_ADMIN' ? [
      { label: 'View Device Request', href: '/admin/maintenance/proctor-device', icon: Search, color: 'bg-blue-600' },
      { label: 'Approve Device', href: '/admin/maintenance/proctor-device', icon: CheckCircle, color: 'bg-green-600' },
      { label: 'Reject Device', href: '/admin/maintenance/proctor-device', icon: AlertCircle, color: 'bg-philsa-red' },
    ] : []),
  ];

  if (user?.role !== 'STUDENT') {
    const isUnivAdmin = user?.role === 'UNIVERSITY_ADMIN';
    const isSysAdmin = user?.role === 'SYSTEM_ADMIN';
    const isGov = user?.role === 'GOVERNMENT';
    
    if (isGov) return <GovernmentAccess />;

    let stats = adminStats;
    if (isUnivAdmin) stats = univStats;
    if (isSysAdmin) stats = sysAdminStats;

    return (
      <div className="space-y-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-extrabold text-philsa-navy mb-2 leading-tight">
              {isUnivAdmin ? `${user?.university} Executive Portal` : isSysAdmin ? 'PhilSA Global Administration' : 'System Overview'}
            </h1>
            <p className="text-philsa-gray text-lg font-medium">
              {isUnivAdmin ? 'National Admissions & Institutional Performance' : isSysAdmin ? 'Enterprise monitoring of candidates, proctors, and system integrity.' : 'Monitoring Exam Management Hub & Resource Contributions.'}
            </p>
          </div>
          {!isSysAdmin && (
            <div className="flex items-center gap-3">
               <div className="px-4 py-2 bg-philsa-navy text-white rounded-xl text-xs font-bold uppercase tracking-widest">Cycle: 2026-A</div>
               <div className="px-4 py-2 bg-white border border-philsa-border rounded-xl text-xs font-bold text-philsa-navy uppercase tracking-widest flex items-center gap-2 shadow-sm">
                  <Clock className="w-4 h-4" /> {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
               </div>
            </div>
          )}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((s, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className="card-philsa !p-8 flex flex-col gap-6"
            >
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform hover:scale-110", s.bg, s.color)}>
                <s.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] text-philsa-gray font-bold uppercase tracking-[0.05em] mb-2">{s.label}</p>
                <h3 className="text-[32px] font-extrabold text-philsa-navy tracking-[-1.5px] leading-none">{s.val}</h3>
                <p className="text-[12px] font-bold mt-2 text-philsa-gray/60">{s.sub}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="card-philsa !p-10">
             <div className="flex justify-between items-center mb-10">
                <h3 className="text-sm font-bold text-philsa-gray uppercase tracking-widest border-l-4 border-philsa-red pl-4">
                  {isUnivAdmin ? 'Admission Trends' : 'Question Type Distribution'}
                </h3>
                <div className="flex gap-2">
                  {isUnivAdmin ? (
                    <span className="badge-status badge-approved">Avg Score: 84.4</span>
                  ) : (
                    <>
                      <span className="badge-status badge-approved">Approved: 8.2k</span>
                      <span className="badge-status badge-rejected">Rejected: 1.2k</span>
                    </>
                  )}
                </div>
             </div>
             {isUnivAdmin ? (
               <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={[
                      { name: 'Mon', apps: 400 },
                      { name: 'Tue', apps: 300 },
                      { name: 'Wed', apps: 500 },
                      { name: 'Thu', apps: 280 },
                      { name: 'Fri', apps: 590 },
                      { name: 'Sat', apps: 320 },
                      { name: 'Sun', apps: 410 },
                    ]}>
                      <XAxis dataKey="name" hide />
                      <YAxis hide />
                      <Tooltip />
                      <Area type="monotone" dataKey="apps" stroke="#8A1538" fill="#8A1538" fillOpacity={0.1} strokeWidth={4} />
                    </AreaChart>
                  </ResponsiveContainer>
                  <p className="text-center text-[10px] font-black text-philsa-gray uppercase tracking-widest mt-4">7-Day Application Throughput Trend</p>
               </div>
             ) : (
               <div className="space-y-8">
                  {questionProgress.map((item) => (
                    <div key={item.label} className="space-y-3">
                      <div className="flex justify-between items-end">
                        <p className="text-sm font-bold text-philsa-navy">{item.label}</p>
                        <p className="text-xs font-bold text-philsa-gray">{item.count} items ({item.percent}%)</p>
                      </div>
                      <div className="h-2 bg-philsa-bg rounded-full overflow-hidden border border-philsa-border">
                        <motion.div 
                          initial={{ width: 0 }} 
                          animate={{ width: `${item.percent}%` }} 
                          className="h-full bg-philsa-red rounded-full" 
                        />
                      </div>
                    </div>
                  ))}
               </div>
             )}
          </div>

          <div className="card-philsa !p-10">
            <h3 className="text-sm font-bold text-philsa-gray uppercase tracking-widest border-l-4 border-philsa-red pl-4 mb-10">
              {isUnivAdmin ? 'National Ranking Comparison' : 'Entity Contributions'}
            </h3>
            <div className="grid md:grid-cols-3 gap-8">
              {isUnivAdmin ? (
                <>
                  <RankStat label="Math" rank="#2" color="bg-[#FFB81C]" />
                  <RankStat label="Science" rank="#1" color="bg-philsa-red" />
                  <RankStat label="Reading" rank="#4" color="bg-[#00563F]" />
                </>
              ) : (
                contributions.map((c) => (
                  <div key={c.agency} className="flex flex-col items-center p-6 bg-philsa-bg rounded-2xl border border-philsa-border hover:border-philsa-red/30 transition-all">
                     <div className={cn("w-3 h-3 rounded-full mb-4 shadow-sm", c.color)} />
                     <p className="text-xs font-black text-philsa-navy mb-1">{c.agency}</p>
                     <p className="text-2xl font-black text-philsa-navy tracking-tighter">{c.count.toLocaleString()}</p>
                     <p className="text-[10px] text-philsa-gray font-bold uppercase mt-2">Questions Shared</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <StudentDashboard />;
}
