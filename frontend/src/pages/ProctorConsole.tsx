import { useState, useEffect } from 'react';
import { usePhilSA } from '../PhilSAContext';
import { useMockData } from '../services/mockService';
import { 
  Users, Monitor, Shield, AlertTriangle, CheckCircle, RefreshCcw, 
  Pause, StopCircle, Search, MoreVertical, Clock, Download, 
  Wifi, ShieldCheck, Cpu, Smartphone, LayoutDashboard, Database,
  ArrowRight, Radio, Bell
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

type ConsoleTab = 'SESSIONS' | 'VERIFICATION' | 'ATTENDANCE' | 'MONITOR';

export default function ProctorConsole() {
  const { addAuditLog } = usePhilSA();
  const { schedules, examSets } = useMockData();
  const [activeTab, setActiveTab] = useState<ConsoleTab>('SESSIONS');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Console States
  const [examStatus, setExamStatus] = useState<'NOT_READY' | 'DOWNLOADING' | 'READY' | 'STARTED'>('NOT_READY');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [networkStatus, setNetworkStatus] = useState<'IDLE' | 'TESTING' | 'PASS' | 'FAIL'>('IDLE');
  const [networkSpeed, setNetworkSpeed] = useState<number | null>(null);
  
  // Find the current active schedule (mocking for UP Diliman)
  const currentSchedule = schedules.find(s => s.testCenter.includes('University of the Philippines') || s.testCenter.includes('UP Diliman')) || schedules[0];
  const assignedExam = examSets.find(e => e.id === currentSchedule?.examSetId);

  // Mock candidates for proctoring
  const [roster, setRoster] = useState([
    { id: 'PH-2026-0001', name: 'Juan P. Pangilinan', status: 'CHECKED_IN', progress: 45, incents: 0, seat: '12A', deviceOk: true, battery: 85 },
    { id: 'PH-2026-0002', name: 'Maria Elena Soriano', status: 'CHECKED_IN', progress: 12, incents: 1, seat: '12B', deviceOk: true, battery: 92 },
    { id: 'PH-2026-0003', name: 'Ricardo M. Silva', status: 'CHECKED_IN', progress: 0, incents: 0, seat: '13A', deviceOk: false, battery: 15 },
    { id: 'PH-2026-0004', name: 'Liza Monica Bautista', status: 'CHECKED_IN', progress: 0, incents: 0, seat: '13B', deviceOk: true, battery: 100 },
    { id: 'PH-2026-0005', name: 'Enrique S. Gatus', status: 'ABSENT', progress: 0, incents: 0, seat: '14A', deviceOk: false, battery: 0 },
  ]);

  const handleAction = (id: string, action: string) => {
    addAuditLog('PROCTOR_ACTION', `Proctor performed ${action} on candidate ${id}`);
    alert(`Action ${action} initiated for ${id}`);
  };

  const simulateDownload = () => {
    if (networkStatus !== 'PASS') {
      alert("Network readiness check required before package download.");
      setActiveTab('VERIFICATION');
      return;
    }
    setExamStatus('DOWNLOADING');
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 10) + 5;
      if (progress >= 100) {
        setDownloadProgress(100);
        setExamStatus('READY');
        clearInterval(interval);
        addAuditLog('EXAM_DOWNLOAD', `Successfully downloaded exam package for ${currentSchedule.testCenter}`);
      } else {
        setDownloadProgress(progress);
      }
    }, 200);
  };

  const simulateNetworkTest = () => {
    setNetworkStatus('TESTING');
    setTimeout(() => {
      const speed = Math.floor(Math.random() * 80) + 20;
      setNetworkSpeed(speed);
      setNetworkStatus(speed > 25 ? 'PASS' : 'FAIL');
      addAuditLog('NETWORK_TEST', `Performed network test: ${speed} Mbps. Result: ${speed > 25 ? 'PASS' : 'FAIL'}`);
    }, 1500);
  };

  const startExam = () => {
    if (examStatus !== 'READY') return;
    setExamStatus('STARTED');
    setRoster(prev => prev.map(s => s.status === 'CHECKED_IN' ? { ...s, status: 'IN_PROGRESS' } : s));
    addAuditLog('EXAM_LAUNCH', `Proctor launched exam session ${currentSchedule.id} for ${currentSchedule.testCenter}`);
  };

  const filteredRoster = roster.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.seat.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Dynamic Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-8 rounded-[2rem] border border-philsa-border shadow-sm">
        <div className="flex items-center gap-5">
           <div className="w-14 h-14 bg-philsa-red text-white rounded-2xl flex items-center justify-center shadow-lg shadow-philsa-red/20">
              <ShieldCheck className="w-8 h-8" />
           </div>
           <div>
              <h1 className="text-2xl font-black text-philsa-navy tracking-tight leading-none mb-2">Proctor Control Center</h1>
              <div className="flex items-center gap-3 text-philsa-gray text-xs font-bold uppercase tracking-wider">
                 <span className="flex items-center gap-1.5"><Database className="w-3.5 h-3.5" /> {currentSchedule.testCenter}</span>
                 <span className="w-1 h-1 bg-philsa-border rounded-full" />
                 <span className="flex items-center gap-1.5 font-black text-philsa-navy">{currentSchedule.room}</span>
              </div>
           </div>
        </div>

        <div className="flex items-center gap-4">
           <div className="text-right hidden md:block px-6 border-r border-philsa-border">
              <p className="text-[10px] text-philsa-gray font-bold uppercase tracking-widest mb-1">Session Protocol</p>
              <p className="text-sm font-black text-philsa-navy">ABS-2026-X1</p>
           </div>
           
           {examStatus === 'STARTED' ? (
              <button className="bg-philsa-red text-white py-4 px-10 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-philsa-red-hover transition-all shadow-xl shadow-philsa-red/20 active:scale-95">
                 <StopCircle className="w-5 h-5" /> End Secure Session
              </button>
           ) : (
              <button 
                onClick={startExam}
                disabled={examStatus !== 'READY'}
                className={cn(
                  "py-4 px-10 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all shadow-xl active:scale-95",
                  examStatus === 'READY' 
                    ? "bg-emerald-600 text-white shadow-emerald-600/20 hover:bg-emerald-700" 
                    : "bg-philsa-bg text-philsa-gray border border-philsa-border cursor-not-allowed"
                )}
              >
                 <ArrowRight className="w-5 h-5" /> Launch Examination
              </button>
           )}
        </div>
      </div>

      {/* Persistent Status Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-philsa-border flex items-center justify-between">
             <div className="flex items-center gap-3">
                <div className={cn("w-2 h-2 rounded-full", networkStatus === 'PASS' ? "bg-emerald-500 animate-pulse" : "bg-philsa-gray")} />
                <span className="text-[10px] font-bold text-philsa-gray uppercase tracking-widest">Network</span>
             </div>
             <span className="text-xs font-black text-philsa-navy">{networkSpeed ? `${networkSpeed} Mbps` : 'Offline'}</span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-philsa-border flex items-center justify-between">
             <div className="flex items-center gap-3">
                <Download className="w-3.5 h-3.5 text-philsa-gray" />
                <span className="text-[10px] font-bold text-philsa-gray uppercase tracking-widest">Package</span>
             </div>
             <span className="text-xs font-black text-philsa-navy">{examStatus === 'READY' || examStatus === 'STARTED' ? 'Verified' : 'Pending'}</span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-philsa-border flex items-center justify-between">
             <div className="flex items-center gap-3">
                <Users className="w-3.5 h-3.5 text-philsa-gray" />
                <span className="text-[10px] font-bold text-philsa-gray uppercase tracking-widest">Attendance</span>
             </div>
             <span className="text-xs font-black text-philsa-navy">{roster.filter(s => s.status !== 'ABSENT').length} / {roster.length}</span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-philsa-border flex items-center justify-between">
             <div className="flex items-center gap-3">
                <Clock className="w-3.5 h-3.5 text-philsa-gray" />
                <span className="text-[10px] font-bold text-philsa-gray uppercase tracking-widest">Clock</span>
             </div>
             <span className="text-xs font-black text-philsa-navy">09:12 AM</span>
          </div>
      </div>

      {/* Main Tabs */}
      <div className="flex gap-1 bg-philsa-bg p-1.5 rounded-2xl border border-philsa-border w-fit max-w-full overflow-x-auto">
          {[
            { id: 'SESSIONS', label: 'Schedule Dashboard', icon: LayoutDashboard },
            { id: 'VERIFICATION', label: 'Network Readiness', icon: Wifi },
            { id: 'ATTENDANCE', label: 'Attendance & Device', icon: Users },
            { id: 'MONITOR', label: 'Live Monitoring', icon: Radio },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ConsoleTab)}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                activeTab === tab.id 
                  ? "bg-white text-philsa-navy border border-philsa-border shadow-xs" 
                  : "text-philsa-gray hover:text-philsa-navy"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
           key={activeTab}
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           exit={{ opacity: 0, y: -10 }}
           className="space-y-6"
        >
          {activeTab === 'SESSIONS' && (
            <div className="grid md:grid-cols-2 gap-8">
               <div className="card-philsa space-y-8">
                  <div className="flex justify-between items-start">
                     <div>
                        <h3 className="text-lg font-black text-philsa-navy">Assigned Session</h3>
                        <p className="text-xs text-philsa-gray font-medium mt-1">Review and synchronize exam packages for deployment.</p>
                     </div>
                     <span className="px-3 py-1 bg-philsa-navy text-white text-[9px] font-bold rounded-full uppercase tracking-tighter">Priority: High</span>
                  </div>

                  <div className="p-6 bg-philsa-bg rounded-2xl border border-philsa-border space-y-6">
                     <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 bg-white border border-philsa-border rounded-xl flex items-center justify-center font-bold text-philsa-navy">A</div>
                           <div>
                              <p className="text-[10px] text-philsa-gray font-black uppercase tracking-widest">Exam Code</p>
                              <p className="text-sm font-black text-philsa-navy">{assignedExam?.title || 'None Selected'}</p>
                           </div>
                        </div>
                        <div className="text-right">
                           <p className="text-[10px] text-philsa-gray font-black uppercase tracking-widest">Duration</p>
                           <p className="text-sm font-black text-philsa-navy">120 Minutes</p>
                        </div>
                     </div>

                     <div className="space-y-3">
                        <div className="flex justify-between text-[10px] font-bold text-philsa-gray uppercase">
                           <span>Package Sync Status</span>
                           <span>{examStatus === 'READY' || examStatus === 'STARTED' ? '100%' : `${downloadProgress}%`}</span>
                        </div>
                        <div className="w-full h-2 bg-white rounded-full overflow-hidden border border-philsa-border">
                           <div 
                             className={cn(
                               "h-full transition-all duration-500",
                               examStatus === 'DOWNLOADING' ? "bg-philsa-red" : "bg-emerald-500"
                             )} 
                             style={{ width: examStatus === 'READY' || examStatus === 'STARTED' ? '100%' : `${downloadProgress}%` }} 
                           />
                        </div>
                     </div>
                  </div>

                  <div className="space-y-4">
                     <button 
                       onClick={simulateDownload}
                       disabled={(examStatus !== 'NOT_READY' && examStatus !== 'DOWNLOADING') || networkStatus !== 'PASS'}
                       className="w-full btn-primary py-4 flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.98] transition-transform"
                     >
                        {examStatus === 'DOWNLOADING' ? (
                           <>
                             <RefreshCcw className="w-5 h-5 animate-spin" /> 
                             Downloading Security Package...
                           </>
                        ) : examStatus === 'READY' || examStatus === 'STARTED' ? (
                           <>
                             <CheckCircle className="w-5 h-5" /> 
                             Exam Package Synchronized
                           </>
                        ) : (
                           <>
                             <Download className="w-5 h-5" /> 
                             Download Exam Package
                           </>
                        )}
                     </button>
                     {networkStatus !== 'PASS' && (
                       <p className="text-center text-[10px] text-philsa-red font-black uppercase tracking-widest">Network Readiness Check Required</p>
                     )}
                  </div>
               </div>

               <div className="space-y-6">
                  <div className="bg-philsa-navy text-white p-8 rounded-[2rem] shadow-xl relative overflow-hidden">
                     <div className="relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Network Intelligence</p>
                        <h3 className="text-xl font-bold mt-2">Ready for synchronization.</h3>
                        <p className="text-blue-200 text-xs mt-3 leading-relaxed">The system will perform a silent integrity check on every student terminal upon package distribution.</p>
                     </div>
                     <Radio className="absolute -right-8 -bottom-8 w-48 h-48 text-white/5" />
                  </div>
                  
                  <div className="card-philsa p-6 border-l-4 border-philsa-navy">
                     <div className="flex items-center gap-4">
                        <Bell className="w-5 h-5 text-philsa-navy" />
                        <div className="flex-1">
                           <p className="text-[10px] text-philsa-gray font-black uppercase tracking-widest">Protocol Reminder</p>
                           <p className="text-xs font-bold text-philsa-navy mt-1">Ensure all student terminals are powered on and connected to 'PhilSA-Secure-WiFi' before starting download.</p>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'VERIFICATION' && (
            <div className="card-philsa p-8">
               <div className="max-w-2xl mx-auto py-10 text-center space-y-10">
                  <div className="space-y-4">
                     <div className={cn(
                       "w-24 h-24 mx-auto rounded-[2rem] flex items-center justify-center border-2 transition-all duration-700",
                       networkStatus === 'PASS' ? "bg-emerald-50 border-emerald-500 text-emerald-600" : 
                       networkStatus === 'FAIL' ? "bg-red-50 border-red-500 text-red-600" :
                       networkStatus === 'TESTING' ? "bg-blue-50 border-blue-500 text-blue-600 border-dashed animate-spin" :
                       "bg-philsa-bg border-philsa-border text-philsa-gray"
                     )}>
                        <Wifi className="w-12 h-12" />
                     </div>
                     <h2 className="text-2xl font-black text-philsa-navy tracking-tight">Scheduled Network Verification</h2>
                     <p className="text-sm text-philsa-gray max-w-sm mx-auto">Perform a network speed test before exam upload/download to ensure stability during the testing session.</p>
                  </div>

                  {networkStatus === 'IDLE' ? (
                     <button onClick={simulateNetworkTest} className="btn-primary py-4 px-12 uppercase text-xs tracking-widest font-black active:scale-[0.98]">
                        Run Diagnostics Test
                     </button>
                  ) : networkStatus === 'TESTING' ? (
                     <div className="space-y-4">
                        <p className="text-sm font-black text-blue-600 animate-pulse">EVALUATING PACKET STABILITY...</p>
                        <div className="w-64 h-1.5 bg-philsa-bg mx-auto rounded-full overflow-hidden">
                           <div className="w-full h-full bg-blue-500 animate-[pulse_1.5s_infinite]" />
                        </div>
                     </div>
                  ) : (
                     <div className="space-y-8">
                        <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                           <div className="p-6 bg-philsa-bg rounded-2xl border border-philsa-border">
                              <p className="text-[10px] text-philsa-gray font-bold uppercase tracking-widest mb-1">Speed</p>
                              <p className="text-2xl font-black text-philsa-navy">{networkSpeed} <small className="text-xs font-bold">Mbps</small></p>
                           </div>
                           <div className="p-6 bg-philsa-bg rounded-2xl border border-philsa-border">
                              <p className="text-[10px] text-philsa-gray font-bold uppercase tracking-widest mb-1">Latency</p>
                              <p className="text-2xl font-black text-philsa-navy">12 <small className="text-xs font-bold">ms</small></p>
                           </div>
                        </div>
                        <div className={cn(
                          "py-3 px-6 rounded-xl inline-block font-black text-xs uppercase tracking-[0.2em]",
                          networkStatus === 'PASS' ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                        )}>
                           {networkStatus === 'PASS' ? 'Reliability Verified' : 'Unstable Connection'}
                        </div>
                        <div>
                           <button onClick={simulateNetworkTest} className="text-philsa-gray hover:text-philsa-navy text-xs font-bold flex items-center gap-2 mx-auto transition-all">
                              <RefreshCcw className="w-4 h-4" /> Retest Network Readiness
                           </button>
                        </div>
                     </div>
                  )}
                  
                  <div className="grid md:grid-cols-2 gap-6 pt-10 text-left border-t border-philsa-border">
                     <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Verification Schedule</p>
                        <p className="text-xs text-philsa-gray mt-2">Required diagnostic windows:</p>
                        <ul className="mt-3 space-y-2">
                           <li className="text-[11px] font-bold flex items-center gap-2 text-philsa-navy">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> 1 Day Before Exam
                           </li>
                           <li className="text-[11px] font-bold flex items-center gap-2 text-philsa-navy">
                              <div className="w-3.5 h-3.5 rounded-full border-2 border-philsa-border" /> 1 Hour Before Exam
                           </li>
                        </ul>
                     </div>
                     <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Protocol Enforcement</p>
                        <p className="text-xs text-philsa-gray mt-2 leading-relaxed">System automatically blocks exam package distribution if bandwidth falls below 25 Mbps consistent speed.</p>
                     </div>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'ATTENDANCE' && (
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                   <div className="relative flex-1 max-w-md w-full">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-philsa-gray" />
                      <input 
                        type="text" 
                        placeholder="Search by name or Candidate ID..." 
                        className="input-philsa pl-12"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                   </div>
                   <div className="flex items-center gap-3">
                      <button className="btn-secondary py-2.5 px-6 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 active:scale-95 transition-transform">
                         <ShieldCheck className="w-4 h-4" /> Batch Compatibility Check
                      </button>
                   </div>
                </div>

                <div className="bg-white rounded-3xl border border-philsa-border overflow-hidden shadow-sm">
                   <div className="overflow-x-auto">
                     <table className="w-full text-left">
                       <thead>
                         <tr className="bg-philsa-bg text-[10px] text-philsa-gray font-bold uppercase tracking-widest border-b border-philsa-border">
                           <th className="px-8 py-4">Seat</th>
                           <th className="px-8 py-4">Identity Verification</th>
                           <th className="px-8 py-4">Attendance Status</th>
                           <th className="px-8 py-4">Device Audit</th>
                           <th className="px-8 py-4 text-right">Actions</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-philsa-border">
                         {filteredRoster.map((student) => (
                           <tr key={student.id} className="hover:bg-philsa-bg/30 group transition-colors">
                             <td className="px-8 py-6">
                                <div className="w-10 h-10 bg-philsa-bg rounded-xl flex items-center justify-center font-mono font-black text-xs text-philsa-navy border border-philsa-border group-hover:bg-white group-hover:border-philsa-red transition-all">
                                   {student.seat}
                                </div>
                             </td>
                             <td className="px-8 py-6">
                                <p className="text-sm font-black text-philsa-navy">{student.name}</p>
                                <p className="text-[10px] text-philsa-gray font-black tracking-widest uppercase">{student.id}</p>
                             </td>
                             <td className="px-8 py-6">
                                {student.status === 'ABSENT' ? (
                                  <button onClick={() => setRoster(prev => prev.map(s => s.id === student.id ? { ...s, status: 'CHECKED_IN' } : s))} className="flex items-center gap-2 text-[10px] font-black text-philsa-red uppercase tracking-wider bg-red-50 px-3 py-1.5 rounded-full border border-red-100 hover:bg-red-100 transition-colors">
                                     <StopCircle className="w-3.5 h-3.5" /> Mark Present
                                  </button>
                                ) : (
                                  <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs">
                                     <CheckCircle className="w-4 h-4" /> Verified Presence
                                  </div>
                                )}
                             </td>
                             <td className="px-8 py-6">
                                <div className="flex items-center gap-6">
                                   <div className={cn(
                                     "flex items-center gap-2 text-[10px] font-extrabold uppercase",
                                     student.deviceOk ? "text-emerald-600" : "text-philsa-red"
                                   )}>
                                      <Monitor className="w-3.5 h-3.5" /> 
                                      {student.deviceOk ? 'Compatible' : 'Hardware Conflict'}
                                   </div>
                                   <div className="flex items-center gap-2 text-[10px] font-extrabold text-philsa-gray">
                                      <Smartphone className="w-3.5 h-3.5" /> 
                                      {student.battery > 0 ? `${student.battery}% PWR` : 'NO PWR'}
                                   </div>
                                </div>
                             </td>
                             <td className="px-8 py-6 text-right">
                                {student.deviceOk ? (
                                  <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100 uppercase tracking-widest">LOCKED & READY</span>
                                ) : student.status !== 'ABSENT' ? (
                                  <button onClick={() => setRoster(prev => prev.map(s => s.id === student.id ? { ...s, deviceOk: true } : s))} className="text-[10px] font-black text-white bg-philsa-red px-4 py-2 rounded-xl uppercase hover:scale-105 active:scale-95 transition-all shadow-lg shadow-philsa-red/20">RESOLVE CONFLICT</button>
                                ) : null}
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                </div>
            </div>
          )}

          {activeTab === 'MONITOR' && (
            <div className="space-y-6">
               <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <StatCard label="Total Candidates" value={roster.length} icon={Users} />
                  <StatCard label="Live Sessions" value={roster.filter(s => s.status === 'IN_PROGRESS').length} icon={Monitor} color="text-blue-600" />
                  <StatCard label="Flagged Context" value={roster.filter(s => s.incents > 0).length} icon={AlertTriangle} color="text-philsa-red" />
                  <StatCard label="System Compliant" value={roster.filter(s => s.deviceOk).length} icon={ShieldCheck} color="text-emerald-600" />
                  <StatCard label="Final Submissions" value={roster.filter(s => s.status === 'SUBMITTED').length} icon={CheckCircle} color="text-philsa-navy" />
               </div>

               <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-philsa-border">
                  <div className="relative flex-1">
                     <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-philsa-gray" />
                     <input 
                       type="text" 
                       placeholder="Live filter by Candidate ID or Seat..." 
                       className="w-full bg-philsa-bg border-none rounded-xl pl-11 pr-4 py-2.5 text-sm"
                       value={searchTerm}
                       onChange={(e) => setSearchTerm(e.target.value)}
                     />
                  </div>
                  <div className="flex gap-2">
                     <button className="bg-philsa-bg text-philsa-navy px-4 py-2.5 rounded-xl text-xs font-bold border border-philsa-border hover:bg-white transition-all">All Positions</button>
                     <button className="bg-philsa-bg text-philsa-navy px-4 py-2.5 rounded-xl text-xs font-bold border border-philsa-border hover:bg-white transition-all text-philsa-red">High Incident</button>
                  </div>
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  {filteredRoster.map((student) => (
                    <motion.div 
                       layout
                       key={student.id} 
                       className={cn(
                        "bg-white rounded-3xl border-2 p-5 transition-all relative overflow-hidden",
                        student.status === 'ABSENT' ? "opacity-40 grayscale" : "shadow-sm",
                        student.incents > 0 ? "border-philsa-red shadow-lg shadow-philsa-red/5" : "border-philsa-border hover:border-philsa-navy"
                       )}
                    >
                       <div className="flex justify-between items-start mb-4">
                          <div className="w-8 h-8 bg-philsa-bg rounded-lg flex items-center justify-center font-mono font-black text-[10px] text-philsa-navy">
                             {student.seat}
                          </div>
                          {student.incents > 0 && (
                            <div className="flex items-center gap-1 text-[9px] font-black text-philsa-red bg-red-50 px-2 py-0.5 rounded-full animate-bounce">
                               <AlertTriangle className="w-3 h-3" /> {student.incents} EVENTS
                            </div>
                          )}
                       </div>

                       <div className="space-y-1 mb-5">
                          <p className="text-sm font-black text-philsa-navy truncate">{student.name}</p>
                          <p className="text-[10px] text-philsa-gray font-black tracking-widest uppercase">{student.id}</p>
                       </div>

                       <div className="space-y-3">
                          <div className="flex justify-between items-center text-[10px] font-bold">
                             <span className="text-philsa-gray">Progress</span>
                             <span className="text-philsa-navy">{student.progress}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-philsa-bg rounded-full overflow-hidden">
                             <div 
                               className={cn(
                                 "h-full transition-all duration-1000",
                                 student.incents > 0 ? "bg-philsa-red" : "bg-blue-600"
                               )} 
                               style={{ width: `${student.progress}%` }} 
                             />
                          </div>
                       </div>

                       <div className="mt-5 flex items-center justify-between gap-1 pt-4 border-t border-philsa-bg">
                          <button onClick={() => handleAction(student.id, 'MONITOR')} className="p-2.5 text-philsa-gray hover:text-philsa-navy hover:bg-philsa-bg rounded-xl transition-all" title="View Screen">
                             <Monitor className="w-4.5 h-4.5" />
                          </button>
                          <div className="flex gap-1">
                            <button onClick={() => handleAction(student.id, 'PAUSE')} className="p-2.5 text-yellow-600 hover:bg-yellow-50 rounded-xl transition-all" title="Pause Session">
                               <Pause className="w-4.5 h-4.5" />
                            </button>
                            <button onClick={() => handleAction(student.id, 'REPRIMAND')} className="p-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-all" title="Flag Integrity Incident">
                               <Shield className="w-4.5 h-4.5" />
                            </button>
                          </div>
                       </div>

                       {student.status === 'IN_PROGRESS' && (
                         <div className="absolute top-3 right-3">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-sm shadow-emerald-500/50" />
                         </div>
                       )}
                    </motion.div>
                  ))}
               </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color = "text-philsa-navy" }: any) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-philsa-border shadow-xs">
       <div className="flex items-center gap-3 mb-3">
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center bg-philsa-bg", color)}>
             <Icon className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-bold text-philsa-gray uppercase tracking-widest">{label}</span>
       </div>
       <p className={cn("text-2xl font-black tracking-tight", color)}>{value}</p>
    </div>
  );
}
