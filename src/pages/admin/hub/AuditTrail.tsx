import React, { useState } from 'react';
import { usePhilSA } from '../../../PhilSAContext';
import { 
  Shield, 
  Search, 
  Filter, 
  Download, 
  CheckCircle2, 
  Clock, 
  User, 
  Database,
  Activity,
  ArrowUpRight,
  FolderLock
} from 'lucide-react';

const MOCK_ACTIVE_LOGS = [
  { id: 'LOG-001', user: 'Santiago ItemWriter', action: 'QUESTION_CREATE', target: 'PHYS-440', module: 'Question Bank', timestamp: '2026-05-07 09:12:01', ip: '124.104.1.42', details: 'Created physics final item PHYS-440' },
  { id: 'LOG-002', user: 'Maria UnivAdmin', action: 'APPLICATION_APPROVE', target: 'APP-0012', module: 'Admissions', timestamp: '2026-05-07 08:45:12', ip: '202.45.1.2', details: 'Authorized admission application APP-0012' },
  { id: 'LOG-003', user: 'Admin System', action: 'BULK_UPLOAD', target: 'NATIONAL_POOL', module: 'Upload Center center', timestamp: '2026-05-07 07:30:45', ip: '110.54.21.1', details: 'Uploaded 450 items to National Pool' },
  { id: 'LOG-004', user: 'Liza Reviewer', action: 'EXAM_SET_PUBLISH', target: 'SET-UP-A', module: 'Exam Sets', timestamp: '2026-05-07 07:15:42', ip: '124.104.1.42', details: 'Released public exams for UP exam cycle' },
  { id: 'LOG-005', user: 'Santiago ItemWriter', action: 'QUESTION_EDIT', target: 'MATH-101', module: 'Question Bank', timestamp: '2026-05-07 06:45:12', ip: '124.104.1.42', details: 'Modified entry values for Math algebra section' },
];

const MOCK_ARCHIVED_LOGS = [
  { id: 'ARC-001', user: 'admin@philsa.ph', action: 'USER_PROVISION', target: 'user_842', module: 'User Accounts', timestamp: '2026-05-06 07:32:01', ip: '124.104.1.42', details: 'Assigned role SYSTEM_ADMIN to user_842' },
  { id: 'ARC-002', user: 'univ_admin@up.edu', action: 'BLUEPRINT_PUB', target: 'GA-2026-A', module: 'Exam Blueprints', timestamp: '2026-05-06 07:15:42', ip: '202.45.1.2', details: 'Published set GA-2026-A' },
  { id: 'ARC-003', user: 'exec@philsa.ph', action: 'RESULT_REL', target: 'GLOBAL_RELEASE', module: 'Results Center', timestamp: '2026-05-06 06:45:12', ip: '110.54.21.1', details: 'Global results release authorized' },
];

const MOCK_STUDENT_SPEEDS = [
  { id: 'SPD-001', student: 'Juan Dela Cruz', studentId: 'CAND-2026-0014', questionCode: 'MATH-102', subject: 'Mathematics', seconds: 12, pace: '⚡ Fast Pace', status: 'Correct', timestamp: '2026-05-07 09:15:22' },
  { id: 'SPD-002', student: 'Juan Dela Cruz', studentId: 'CAND-2026-0014', questionCode: 'PHYS-440', subject: 'Physics', seconds: 124, pace: '🐢 Deliberate Pace', status: 'Correct', timestamp: '2026-05-07 09:17:45' },
  { id: 'SPD-003', student: 'Aiko Tanaka', studentId: 'CAND-2026-0089', questionCode: 'MATH-101', subject: 'Mathematics', seconds: 2, pace: '⚠️ Anomaly (Extremely Rapid)', status: 'Incorrect', timestamp: '2026-05-07 09:10:05' },
  { id: 'SPD-004', student: 'Aiko Tanaka', studentId: 'CAND-2026-0089', questionCode: 'LIT-201', subject: 'Language & Literature', seconds: 45, pace: '✔ Expected Average', status: 'Correct', timestamp: '2026-05-07 09:14:12' },
  { id: 'SPD-005', student: 'Carlos Yulo', studentId: 'CAND-2026-0155', questionCode: 'SCI-302', subject: 'Science', seconds: 88, pace: '🐢 Deliberate Pace', status: 'Correct', timestamp: '2026-05-07 09:20:55' },
  { id: 'SPD-006', student: 'Carlos Yulo', studentId: 'CAND-2026-0155', questionCode: 'MATH-102', subject: 'Mathematics', seconds: 5, pace: '⚡ Fast Pace', status: 'Correct', timestamp: '2026-05-07 09:22:15' },
  { id: 'SPD-007', student: 'Isabella Ong', studentId: 'CAND-2026-0034', questionCode: 'PHYS-440', subject: 'Physics', seconds: 195, pace: '🐢 Detailed Review', status: 'Correct', timestamp: '2026-05-07 09:19:30' },
];

export default function AuditTrail() {
  const { auditLogs } = usePhilSA();
  
  // Tabs state
  const [activeTab, setActiveTab] = useState<'active' | 'archived' | 'speeds'>('speeds');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState('All');
  const [selectedAction, setSelectedAction] = useState('All');

  // Format live logs to match our structured mock logs
  const formattedLiveLogs = auditLogs.map(log => ({
    id: log.id,
    user: log.userId,
    action: log.action,
    target: log.details.split(' ').slice(-1)[0] || 'SYSTEM',
    module: log.details.includes('maintenance') || log.details.includes('Maintenance') ? 'Service Control' : 'User Session',
    timestamp: new Date(log.timestamp).toISOString().replace('T', ' ').substring(0, 19),
    ip: '127.0.0.1',
    details: log.details
  }));

  const allActiveLogs = [...formattedLiveLogs, ...MOCK_ACTIVE_LOGS];
  const logsToFilter = activeTab === 'active' ? allActiveLogs : MOCK_ARCHIVED_LOGS;

  // Filter logs based on filters
  const filteredLogs = logsToFilter.filter(log => {
    // Search query match
    const matchesSearch = searchQuery === '' || 
      log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.target.toLowerCase().includes(searchQuery.toLowerCase());

    // Module select match
    const matchesModule = selectedModule === 'All' || log.module === selectedModule;

    // Action select match
    const matchesAction = selectedAction === 'All' || log.action === selectedAction;

    return matchesSearch && matchesModule && matchesAction;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-philsa-navy mb-2 tracking-tight">User Action Audit Trail</h1>
          <p className="text-philsa-gray text-sm font-medium">Monitor and review actions taken by registered users, administrators, and proctors across the platform.</p>
        </div>
        <div className="flex items-center gap-3">
           <button className="btn-secondary py-2.5 px-6 text-sm flex items-center gap-2">
              <Download className="w-4 h-4" /> Export Action Logs
           </button>
        </div>
      </div>

      <div className="w-full space-y-4">
            
            {/* Visual Tabs for Active vs Archived logs */}
            <div className="flex border-b border-philsa-border/80 flex-wrap">
              <button 
                onClick={() => { setActiveTab('speeds'); setSelectedModule('All'); setSelectedAction('All'); }}
                className={`py-3 px-6 text-xs font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${
                  activeTab === 'speeds' 
                    ? 'border-philsa-red text-philsa-red bg-philsa-red/5 font-extrabold' 
                    : 'border-transparent text-philsa-gray hover:text-philsa-navy hover:bg-black/5'
                }`}
              >
                <Clock className="w-4 h-4 text-inherit text-philsa-red" />
                Student Answering Speeds
              </button>
              <button 
                onClick={() => { setActiveTab('active'); setSelectedModule('All'); setSelectedAction('All'); }}
                className={`py-3 px-6 text-xs font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${
                  activeTab === 'active' 
                    ? 'border-philsa-red text-philsa-red bg-philsa-red/5 font-extrabold' 
                    : 'border-transparent text-philsa-gray hover:text-philsa-navy hover:bg-black/5'
                }`}
              >
                <Activity className="w-4 h-4 text-inherit" />
                Active Integrity Logs
              </button>
              <button 
                onClick={() => { setActiveTab('archived'); setSelectedModule('All'); setSelectedAction('All'); }}
                className={`py-3 px-6 text-xs font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${
                  activeTab === 'archived' 
                    ? 'border-philsa-red text-philsa-red bg-philsa-red/5 font-extrabold' 
                    : 'border-transparent text-philsa-gray hover:text-philsa-navy hover:bg-black/5'
                }`}
              >
                <FolderLock className="w-4 h-4 text-inherit" />
                Archived Audit Ledger
              </button>
            </div>

            <div className="card-philsa !p-0 overflow-hidden">
               <div className="p-6 border-b border-philsa-border flex flex-wrap gap-4 items-center justify-between">
                  <div className="relative flex-1 min-w-[300px]">
                     <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-philsa-gray" />
                     <input 
                       type="text" 
                       value={searchQuery}
                       onChange={(e) => setSearchQuery(e.target.value)}
                       placeholder="Search inside transaction signatures..." 
                       className="w-full bg-philsa-bg border-none rounded-xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-philsa-red/10 shadow-inner"
                     />
                  </div>
                  <button 
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className={`btn-secondary py-2.5 px-4 text-sm flex items-center gap-2 transition-colors ${showAdvanced ? 'bg-philsa-navy text-white hover:bg-slate-800' : ''}`}
                  >
                    <Filter className="w-4 h-4" /> {showAdvanced ? "Hide Advanced Filter" : "Advanced Filter"}
                  </button>
               </div>

               {/* Collapsible Advanced Filters Section */}
               {showAdvanced && (
                 <div className="p-6 bg-philsa-bg border-b border-philsa-border grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn">
                   {/* Module Filter Dropdown */}
                   <div className="space-y-2">
                      <label className="label-philsa">Filter by Module Component</label>
                      <select 
                        value={selectedModule} 
                        onChange={(e) => setSelectedModule(e.target.value)}
                        className="w-full bg-white border border-philsa-border rounded-xl px-4 py-2.5 text-xs font-bold text-philsa-gray focus:outline-none focus:ring-2 focus:ring-philsa-red/20 shadow-sm"
                      >
                        <option value="All">All Modules</option>
                        <option value="Question Bank">Question Bank</option>
                        <option value="Admissions">Admissions Hub</option>
                        <option value="Exam Sets">Exam Sets</option>
                        <option value="Upload Center">Upload Center center</option>
                        <option value="User Accounts">User Accounts</option>
                        <option value="Exam Blueprints">Exam Blueprints</option>
                        <option value="Results Center">Results Center</option>
                        <option value="Service Control">Service Control (Maintenance)</option>
                        <option value="User Session">User Sessions</option>
                     </select>
                   </div>

                   {/* Action Type Dropdown */}
                   <div className="space-y-2">
                      <label className="label-philsa">Action Signature</label>
                      <select 
                        value={selectedAction} 
                        onChange={(e) => setSelectedAction(e.target.value)}
                        className="w-full bg-white border border-philsa-border rounded-xl px-4 py-2.5 text-xs font-bold text-philsa-gray focus:outline-none focus:ring-2 focus:ring-philsa-red/20 shadow-sm"
                      >
                        <option value="All">All Actions Signature</option>
                        <option value="QUESTION_CREATE">QUESTION_CREATE</option>
                        <option value="QUESTION_EDIT">QUESTION_EDIT</option>
                        <option value="APPLICATION_APPROVE">APPLICATION_APPROVE</option>
                        <option value="BULK_UPLOAD">BULK_UPLOAD</option>
                        <option value="EXAM_SET_PUBLISH">EXAM_SET_PUBLISH</option>
                        <option value="USER_PROVISION">USER_PROVISION</option>
                        <option value="BLUEPRINT_PUB">BLUEPRINT_PUB</option>
                        <option value="RESULT_REL">RESULT_REL</option>
                        <option value="MAINTENANCE_TOGGLE_ON">MAINTENANCE_TOGGLE_ON</option>
                        <option value="MAINTENANCE_TOGGLE_OFF">MAINTENANCE_TOGGLE_OFF</option>
                        <option value="EMAIL_NOTIFICATION_TRIGGERED">EMAIL_TRIGGERED</option>
                        <option value="LOGIN">LOGIN</option>
                        <option value="LOGOUT">LOGOUT</option>
                     </select>
                   </div>

                   <div className="flex items-end justify-end">
                      <button 
                        onClick={() => { setSelectedModule('All'); setSelectedAction('All'); setSearchQuery(''); }}
                        className="btn-secondary w-full md:w-auto py-2.5 px-5 font-black uppercase tracking-wider text-[10px]"
                      >
                        Clear Filters
                      </button>
                   </div>
                 </div>
               )}

               {activeTab === 'speeds' ? (
                 <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-philsa-bg text-[10px] text-philsa-gray font-black uppercase tracking-[0.2em]">
                        <tr>
                          <th className="px-8 py-5">Student / Candidate</th>
                          <th className="px-8 py-5">Question Ref & Subject</th>
                          <th className="px-8 py-5 text-center">Seconds Elapsed</th>
                          <th className="px-8 py-5">Pacing Score Category</th>
                          <th className="px-8 py-5">Grading status</th>
                          <th className="px-8 py-5 text-right">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-philsa-border">
                        {MOCK_STUDENT_SPEEDS.filter(s => {
                          const matchesQuery = searchQuery === '' ||
                            s.student.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            s.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            s.questionCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            s.subject.toLowerCase().includes(searchQuery.toLowerCase());
                          return matchesQuery;
                        }).map((spd) => (
                          <tr key={spd.id} className="hover:bg-philsa-bg/40 transition-colors group">
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-white border border-philsa-border flex items-center justify-center text-[10px] font-black text-philsa-navy shadow-sm group-hover:bg-philsa-red group-hover:text-white transition-all">
                                  {spd.student.substring(0,2).toUpperCase()}
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-slate-800 leading-none">{spd.student}</p>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mt-1">{spd.studentId}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <div>
                                <p className="text-xs font-bold text-slate-800">{spd.questionCode}</p>
                                <p className="text-[10px] text-slate-400 font-bold">{spd.subject}</p>
                              </div>
                            </td>
                            <td className="px-8 py-6 text-center">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold text-slate-800 bg-slate-100/90 tracking-tight">
                                <Clock className="w-3.5 h-3.5 text-slate-500" /> {spd.seconds}s
                              </span>
                            </td>
                            <td className="px-8 py-6">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                spd.pace.includes('Anomaly') ? 'bg-amber-100 text-amber-800' :
                                spd.pace.includes('Fast') ? 'bg-indigo-100 text-slate-800' :
                                'bg-slate-100 text-slate-600'
                              }`}>
                                {spd.pace}
                              </span>
                            </td>
                            <td className="px-8 py-6">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                                spd.status === 'Correct' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
                              }`}>
                                {spd.status}
                              </span>
                            </td>
                            <td className="px-8 py-6 text-right text-xs font-mono font-bold text-slate-500">
                              {spd.timestamp}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
               ) : (
                 <div className="overflow-x-auto">
                   <table className="w-full text-left">
                     <thead className="bg-philsa-bg text-[10px] text-philsa-gray font-black uppercase tracking-[0.2em]">
                       <tr>
                         <th className="px-8 py-5">Date & Connection</th>
                         <th className="px-8 py-5">User / Admin</th>
                         <th className="px-8 py-5">System Module</th>
                         <th className="px-8 py-5">Action Performed</th>
                         <th className="px-8 py-5 text-right">View Log</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-philsa-border">
                       {filteredLogs.length === 0 ? (
                         <tr>
                           <td colSpan={5} className="px-8 py-12 text-center text-sm font-semibold text-philsa-gray">
                             No actions or activities match the current filter criteria.
                           </td>
                         </tr>
                       ) : (
                         filteredLogs.map((log) => (
                           <tr key={log.id} className="hover:bg-philsa-bg/40 transition-colors group">
                             <td className="px-8 py-6">
                                <div className="flex flex-col gap-1">
                                   <p className="text-xs font-black text-philsa-navy">{log.timestamp}</p>
                                   <p className="text-[10px] text-philsa-gray font-bold tracking-widest w-fit uppercase">{log.ip}</p>
                                </div>
                             </td>
                             <td className="px-8 py-6">
                                <div className="flex items-center gap-3">
                                   <div className="w-8 h-8 rounded-lg bg-white border border-philsa-border flex items-center justify-center text-[10px] font-black text-philsa-navy shadow-sm group-hover:bg-philsa-red group-hover:text-white transition-all">
                                      {log.user.substring(0, 2).toUpperCase()}
                                   </div>
                                   <p className="text-xs font-bold text-philsa-navy tracking-tight">{log.user}</p>
                                </div>
                             </td>
                             <td className="px-8 py-6 text-xs font-bold text-philsa-navy">{log.module}</td>
                             <td className="px-8 py-6">
                                <span className="text-[9px] font-black bg-philsa-navy text-white px-2 py-1 rounded tracking-widest transition-all group-hover:bg-philsa-red">
                                   {log.action}
                                </span>
                                <p className="text-[11px] text-philsa-navy font-bold mt-1.5 leading-relaxed">{log.details}</p>
                                <p className="text-[9px] text-philsa-gray font-bold mt-1 tracking-widest uppercase">Target Reference: {log.target}</p>
                             </td>
                             <td className="px-8 py-6 text-right">
                                <button className="p-2 hover:bg-white rounded-xl border border-transparent hover:border-philsa-border transition-all shadow-sm">
                                   <ArrowUpRight className="w-4 h-4 text-philsa-gray hover:text-philsa-navy" />
                                </button>
                             </td>
                           </tr>
                         ))
                       )}
                     </tbody>
                   </table>
                 </div>
               )}
            </div>
             </div>
          </div>
       );
}