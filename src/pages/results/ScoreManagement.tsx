import React, { useState } from 'react';
import { 
  Search, 
  Send, 
  FileText,
  Filter,
  Download,
  Mail,
  X,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  RotateCcw,
  Edit3,
  Check
} from 'lucide-react';
import { useMockData } from '../../services/mockService';
import { motion, AnimatePresence } from 'motion/react';

export default function ScoreManagement() {
  const { examAttempts, applications, questions } = useMockData();
  const [searchTerm, setSearchTerm] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  const [selectedSubject, setSelectedSubject] = useState('All');
  const [sendTargets, setSendTargets] = useState({
    student: true,
    school: true,
    govt: false
  });

  const [transmittedHistory, setTransmittedHistory] = useState<Record<string, { student: boolean; school: boolean; govt: boolean }>>(() => {
    // Scaffold default histories matching active states
    const initialTransmissions: Record<string, { student: boolean; school: boolean; govt: boolean }> = {};
    examAttempts.forEach(att => {
      initialTransmissions[att.id] = {
        student: att.status === 'RELEASED',
        school: att.status === 'RELEASED',
        govt: false
      };
    });
    return initialTransmissions;
  });

  // Dynamic local state to support rechecking and live edits
  const [attemptsList, setAttemptsList] = useState(() => {
    const saved = localStorage.getItem('philsa_exam_attempts_scores');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return examAttempts;
  });

  // Rechecking modal states
  const [selectedAttempt, setSelectedAttempt] = useState<any>(null);
  const [isRecheckOpen, setIsRecheckOpen] = useState(false);
  const [overrideScore, setOverrideScore] = useState<number>(0);
  const [recheckNotes, setRecheckNotes] = useState('');

  const handleOpenRecheck = (attempt: any) => {
    setSelectedAttempt(attempt);
    setOverrideScore(attempt.totalScore);
    setRecheckNotes('');
    setIsRecheckOpen(true);
  };

  const handleSaveRecheck = (newStatus: 'UNDER_RECHECKING' | 'RELEASED' | 'FINALIZED') => {
    const updated = attemptsList.map(att => {
      if (att.id === selectedAttempt.id) {
        return {
          ...att,
          totalScore: Number(overrideScore),
          status: newStatus,
          recheckNotes: recheckNotes
        };
      }
      return att;
    });
    setAttemptsList(updated);
    localStorage.setItem('philsa_exam_attempts_scores', JSON.stringify(updated));
    setIsRecheckOpen(false);
    setSelectedAttempt(null);
  };

  const handleMassSend = () => {
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      setShowConfirmModal(false);
      setSendSuccess(true);
      
      // Update all STAGED scores to RELEASED on mass send
      const updated = attemptsList.map(att => {
        if (att.status === 'FINALIZED') {
          return { ...att, status: 'RELEASED' as const };
        }
        return att;
      });
      setAttemptsList(updated);
      localStorage.setItem('philsa_exam_attempts_scores', JSON.stringify(updated));

      // Append selected send channels to the historical logs
      setTransmittedHistory(prev => {
        const next = { ...prev };
        scoresToShow.forEach(item => {
          next[item.id] = {
            student: prev[item.id]?.student || sendTargets.student,
            school: prev[item.id]?.school || sendTargets.school,
            govt: prev[item.id]?.govt || sendTargets.govt,
          };
        });
        return next;
      });

      setTimeout(() => {
        setSendSuccess(false);
      }, 3000);
    }, 2000);
  };

  // Filter for attempts that are ready for score management
  const scoresToShow = attemptsList.filter(att => {
    const student = applications.find(a => a.id === att.candidateId);
    if (!student) return false;
    
    // We show anything that is GRADED, FINALIZED (STAGED), UNDER_RECHECKING, or RELEASED
    if (att.status === 'IN_PROGRESS' || att.status === 'SUBMITTED') return false;

    // Check if the selected subject matches any of the response objects
    if (selectedSubject !== 'All') {
      const hasSubject = att.attempts.some(aa => {
        const q = questions.find(question => question.id === aa.questionId);
        return q?.subject === selectedSubject;
      });
      if (!hasSubject) return false;
    }

    const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || att.candidateId.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-philsa-navy mb-2 tracking-tight">Examination Score Management</h1>
          <p className="text-philsa-gray text-sm font-medium">Coordinate final result audits, score release protocols, and candidate inquiries.</p>
        </div>
        <div className="flex gap-3">
            <button className="btn-secondary py-2.5 px-6 text-sm flex items-center gap-2">
               <Download className="w-4 h-4" /> Export All Scores
            </button>
            <button 
              onClick={() => setShowConfirmModal(true)}
              className="bg-philsa-navy text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-philsa-navy/10 hover:bg-philsa-navy/90 transition-all flex items-center gap-2 active:scale-[0.98]"
            >
               <Mail className="w-4 h-4" /> Mass Send Scores
            </button>
        </div>
      </div>

      {/* Dynamic Channels Transmission Checklist */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-6 rounded-[2rem] border border-philsa-border">
         <div className="space-y-2">
            <div className="flex items-center justify-between">
               <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Channel 01 : Candidate Portals</span>
               <span className="text-xs font-black text-emerald-600">
                 {Math.round(((Object.values(transmittedHistory) as any[]).filter(h => h.student).length / (Object.keys(transmittedHistory).length || 1)) * 100)}% Sync
               </span>
            </div>
            <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
               <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                  (Object.values(transmittedHistory) as any[]).some(h => h.student) ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
               }`}>
                  <Check className="w-3.5 h-3.5 animate-pulse" />
               </div>
               <div>
                  <p className="text-xs font-black text-philsa-navy">Student SMS/Email Delivery</p>
                  <p className="text-[10px] font-bold text-slate-400">Scorecard delivery & auth portals</p>
               </div>
            </div>
         </div>

         <div className="space-y-2">
            <div className="flex items-center justify-between">
               <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Channel 02 : Institutions</span>
               <span className="text-xs font-black text-indigo-600">
                 {Math.round(((Object.values(transmittedHistory) as any[]).filter(h => h.school).length / (Object.keys(transmittedHistory).length || 1)) * 100)}% Sent
               </span>
            </div>
            <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
               <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                  (Object.values(transmittedHistory) as any[]).some(h => h.school) ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'
               }`}>
                  <Check className="w-3.5 h-3.5" />
               </div>
               <div>
                  <p className="text-xs font-black text-philsa-navy">High School & Adm. Portals</p>
                  <p className="text-[10px] font-bold text-slate-400">Certified institutional CSV spreadsheets</p>
               </div>
            </div>
         </div>

         <div className="space-y-2">
            <div className="flex items-center justify-between">
               <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Channel 03 : DEPED Database</span>
               <span className="text-xs font-black text-amber-600">
                 {Math.round(((Object.values(transmittedHistory) as any[]).filter(h => h.govt).length / (Object.keys(transmittedHistory).length || 1)) * 100)}% Uploaded
               </span>
            </div>
            <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
               <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                  (Object.values(transmittedHistory) as any[]).some(h => h.govt) ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-400'
                }`}>
                  <Check className="w-3.5 h-3.5" />
               </div>
               <div>
                  <p className="text-xs font-black text-philsa-navy">Government Archives Sync</p>
                  <p className="text-[10px] font-bold text-slate-400">National secondary leavers database</p>
               </div>
            </div>
         </div>
      </div>

      <div className="card-philsa !p-0 overflow-hidden">
        <div className="p-6 border-b border-philsa-border flex flex-wrap gap-4 items-center justify-between bg-philsa-bg/30">
           <div className="relative flex-1 min-w-[300px] flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-philsa-gray" />
                 <input 
                   type="text" 
                   placeholder="Search candidate name or ID..." 
                   className="w-full bg-white border border-philsa-border rounded-2xl pl-14 pr-6 py-3.5 text-sm font-bold text-philsa-navy shadow-sm outline-none"
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                 />
              </div>

              <select 
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="bg-white border border-philsa-border rounded-2xl px-5 py-3.5 text-xs font-black uppercase tracking-wider text-philsa-navy focus:outline-none focus:ring-2 focus:ring-philsa-red/10 shadow-sm min-w-[180px] cursor-pointer"
              >
                <option value="All">All Subjects</option>
                <option value="Reading Comp (English, Filipino)">Reading Comp (English, Filipino)</option>
                <option value="Lang Proficiency (English, Filipino)">Lang Proficiency (English, Filipino)</option>
                <option value="Math">Math</option>
                <option value="Science">Science</option>
              </select>
           </div>
           <button className="btn-secondary py-3.5 px-6 text-sm flex items-center gap-2">
             <Filter className="w-4 h-4" /> Advanced Search
           </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-philsa-bg text-[10px] text-philsa-gray font-black uppercase tracking-[0.2em]">
              <tr>
                <th className="px-8 py-5">Candidate Bio</th>
                <th className="px-8 py-5">Exam Details</th>
                <th className="px-8 py-5">Result Score</th>
                <th className="px-8 py-5">Release Status</th>
                <th className="px-8 py-5">Dispatched Targets Checklist</th>
                <th className="px-8 py-5 text-right">Administrative Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-philsa-border">
              {scoresToShow.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-10 text-center text-slate-400 italic">
                    No examination records found.
                  </td>
                </tr>
              ) : (
                scoresToShow.map((att) => {
                  const student = applications.find(a => a.id === att.candidateId);
                  if (!student) return null;

                  return (
                    <tr key={att.id} className="hover:bg-philsa-bg/40 transition-colors group">
                      <td className="px-8 py-6">
                         <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-white border border-philsa-border rounded-xl flex items-center justify-center font-black text-xs text-philsa-navy shadow-sm group-hover:bg-philsa-navy group-hover:text-white transition-all">
                               {student.firstName[0]}{student.lastName[0]}
                            </div>
                            <div>
                               <p className="text-sm font-bold text-philsa-navy mb-0.5">{student.firstName} {student.lastName}</p>
                               <p className="text-[10px] text-philsa-gray font-bold tracking-wider uppercase">{student.id}</p>
                            </div>
                         </div>
                      </td>
                      <td className="px-8 py-6">
                         <p className="text-xs font-bold text-philsa-navy">PhilSA NAT - {att.examSetId}</p>
                         <p className="text-[10px] text-philsa-gray font-medium uppercase tracking-widest">
                           {new Date(att.startTime).toLocaleDateString()}
                         </p>
                      </td>
                      <td className="px-8 py-6">
                         <div className="flex items-end gap-1">
                            <span className={`text-xl font-black ${att.totalScore >= 80 ? 'text-green-600' : 'text-philsa-navy'}`}>{att.totalScore}</span>
                            <span className="text-[10px] font-bold text-philsa-gray mb-1 opacity-50 uppercase tracking-tighter">/ {att.maxScore}</span>
                         </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`text-[9px] font-black px-3 py-1 rounded-full tracking-widest border shadow-sm ${
                          att.status === 'FINALIZED' ? 'bg-amber-50 text-amber-700 border-amber-100' : 
                          att.status === 'RELEASED' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                          att.status === 'UNDER_RECHECKING' ? 'bg-rose-50 text-rose-700 border-rose-155 text-rose-600 animate-pulse border-rose-200' :
                          'bg-slate-50 text-slate-700 border-slate-100'
                        }`}>
                          {att.status === 'FINALIZED' ? 'STAGED' : att.status === 'UNDER_RECHECKING' ? 'RECHECKING' : att.status}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-wrap gap-x-2 gap-y-1 items-center">
                          <label className="flex items-center gap-1.5 cursor-pointer bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 select-none" title="Toggle Candidate Portal delivery">
                            <input 
                              type="checkbox" 
                              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3 h-3 cursor-pointer"
                              checked={transmittedHistory[att.id]?.student || false}
                              onChange={(e) => {
                                setTransmittedHistory(prev => ({
                                  ...prev,
                                  [att.id]: {
                                    ...prev[att.id],
                                    student: e.target.checked
                                  }
                                }));
                              }}
                            />
                            <span className="text-[9px] font-black text-slate-600 uppercase tracking-wider">👩‍🎓 Student</span>
                          </label>

                          <label className="flex items-center gap-1.5 cursor-pointer bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 select-none" title="Toggle School Administrations delivery">
                            <input 
                              type="checkbox" 
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3 h-3 cursor-pointer"
                              checked={transmittedHistory[att.id]?.school || false}
                              onChange={(e) => {
                                setTransmittedHistory(prev => ({
                                  ...prev,
                                  [att.id]: {
                                    ...prev[att.id],
                                    school: e.target.checked
                                  }
                                }));
                              }}
                            />
                            <span className="text-[9px] font-black text-slate-600 uppercase tracking-wider">🏫 School</span>
                          </label>

                          <label className="flex items-center gap-1.5 cursor-pointer bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 select-none" title="Toggle Government DEPED ledger delivery">
                            <input 
                              type="checkbox" 
                              className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-3 h-3 cursor-pointer"
                              checked={transmittedHistory[att.id]?.govt || false}
                              onChange={(e) => {
                                setTransmittedHistory(prev => ({
                                  ...prev,
                                  [att.id]: {
                                    ...prev[att.id],
                                    govt: e.target.checked
                                  }
                                }));
                              }}
                            />
                            <span className="text-[9px] font-black text-slate-600 uppercase tracking-wider">🏛️ Govt</span>
                          </label>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                         {/* Action buttons ALWAYS APPEAR - removal of hover-only opacity classes */}
                         <div className="flex justify-end gap-2 transition-all">
                            <button 
                              onClick={() => handleOpenRecheck(att)}
                              className="p-2.5 bg-slate-50 border border-slate-200 text-amber-600 hover:bg-amber-50 rounded-xl transition-all shadow-sm cursor-pointer" 
                              title="Audit Score & Bring Back for Rechecking"
                            >
                               <RotateCcw className="w-4 h-4" />
                            </button>
                            <button className="p-2.5 bg-slate-50 border border-slate-200 text-slate-500 hover:text-philsa-navy rounded-xl transition-all shadow-sm cursor-pointer" title="View Details">
                               <FileText className="w-4 h-4" />
                            </button>
                            <button className="p-2.5 bg-slate-50 border border-slate-200 text-slate-500 hover:text-emerald-600 rounded-xl transition-all shadow-sm cursor-pointer" title="Send Result">
                               <Send className="w-4 h-4" />
                            </button>
                         </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECHECK MODAL */}
      <AnimatePresence>
        {isRecheckOpen && selectedAttempt && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-philsa-navy/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-[2rem] p-8 max-w-lg w-full border border-philsa-border shadow-2xl space-y-6 relative font-sans"
            >
              <button 
                onClick={() => setIsRecheckOpen(false)}
                className="absolute top-6 right-6 p-1.5 hover:bg-philsa-bg hover:text-philsa-red text-philsa-gray rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex gap-4">
                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100 shrink-0">
                  <RotateCcw className="w-8 h-8 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-philsa-navy uppercase tracking-tight">Evaluate & Review Score</h3>
                  <p className="text-xs text-philsa-gray font-bold tracking-wider uppercase mt-1">Candidate : {applications.find(a => a.id === selectedAttempt.candidateId)?.firstName} {applications.find(a => a.id === selectedAttempt.candidateId)?.lastName}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Current Score</span>
                    <p className="text-xl font-black text-philsa-navy mt-1">{selectedAttempt.totalScore} / {selectedAttempt.maxScore}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Current Status</span>
                    <p className="text-xs font-extrabold text-[#8A1538] uppercase tracking-wider mt-2">{selectedAttempt.status === 'FINALIZED' ? 'STAGED' : selectedAttempt.status}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Adjust/Override Final Score</label>
                  <input 
                    type="number"
                    min={0}
                    max={selectedAttempt.maxScore}
                    value={overrideScore}
                    onChange={(e) => setOverrideScore(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-philsa-navy focus:ring-2 focus:ring-philsa-red/10 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Recheck & Audit Feedback Remarks</label>
                  <textarea 
                    value={recheckNotes}
                    onChange={(e) => setRecheckNotes(e.target.value)}
                    placeholder="Provide specific feedback or context for returning to grading queue (e.g. essay regrade)..."
                    rows={3}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-philsa-navy focus:ring-2 focus:ring-philsa-red/10 outline-none resize-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <div className="flex gap-3">
                  <button 
                    onClick={() => handleSaveRecheck('UNDER_RECHECKING')}
                    className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md shadow-rose-600/10 cursor-pointer"
                  >
                    Send to Rechecking
                  </button>
                  <button 
                    onClick={() => handleSaveRecheck('RELEASED')}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md shadow-emerald-600/10 cursor-pointer"
                  >
                    Audit & Release
                  </button>
                </div>
                <button 
                  onClick={() => handleSaveRecheck('FINALIZED')}
                  className="w-full py-3 bg-white border border-slate-250 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Stage score (Save changes)
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showConfirmModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-philsa-navy/60 backdrop-blur-md font-sans"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-8 max-w-lg w-full border border-philsa-border shadow-2xl space-y-6 relative"
            >
              <button 
                onClick={() => !isSending && setShowConfirmModal(false)}
                className="absolute top-6 right-6 p-1.5 hover:bg-philsa-bg hover:text-philsa-red text-philsa-gray rounded-xl transition-all"
                disabled={isSending}
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex gap-4">
                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100 shrink-0">
                  <ShieldAlert className="w-8 h-8 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-philsa-navy uppercase tracking-tight">Confirm Score Transmission?</h3>
                  <p className="text-xs text-philsa-gray font-bold tracking-wider uppercase mt-1">Ready for mass notification</p>
                </div>
              </div>

              <div className="bg-philsa-bg/50 p-5 rounded-2xl border border-philsa-border">
                <p className="text-xs text-philsa-gray leading-relaxed font-semibold uppercase tracking-wide">
                  You are about to transmit official score sheets to <span className="text-philsa-red font-black">{scoresToShow.length}</span> staged student candidates.
                </p>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Configure Dispatch Targets</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/55 transition-colors cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-philsa-red focus:ring-philsa-red/10 w-4 h-4 cursor-pointer"
                      checked={sendTargets.student}
                      onChange={(e) => setSendTargets(prev => ({ ...prev, student: e.target.checked }))}
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-800">Student & Candidates (Inboxes)</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-normal mt-0.5">Instant Email notifications, Student portal unlock</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/55 transition-colors cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-philsa-red focus:ring-philsa-red/10 w-4 h-4 cursor-pointer"
                      checked={sendTargets.school}
                      onChange={(e) => setSendTargets(prev => ({ ...prev, school: e.target.checked }))}
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-800">High Schools (Institutions)</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-normal mt-0.5">Direct institutional download, UP Admission records</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/55 transition-colors cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-philsa-red focus:ring-philsa-red/10 w-4 h-4 cursor-pointer"
                      checked={sendTargets.govt}
                      onChange={(e) => setSendTargets(prev => ({ ...prev, govt: e.target.checked }))}
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-800">Government Agencies (DEPED Portal)</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-normal mt-0.5">Official database upload, Educational Analytics</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowConfirmModal(false)}
                  disabled={isSending}
                  className="flex-1 py-3.5 bg-white border border-philsa-border hover:bg-philsa-bg text-philsa-navy text-xs font-black uppercase tracking-widest rounded-xl transition-all disabled:opacity-50"
                >
                  Go Back
                </button>
                <button 
                  onClick={handleMassSend}
                  disabled={isSending}
                  className="flex-1 py-3.5 bg-philsa-red hover:bg-philsa-red-hover text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Confirm & Send'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sendSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 right-6 z-50 bg-[#00563F] text-white text-xs font-bold px-6 py-4 rounded-xl shadow-2xl border border-[#00563F]/10 flex items-center gap-3 font-sans"
          >
            <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
            <span>Scores have been successfully transmitted to all {scoresToShow.length} students!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
