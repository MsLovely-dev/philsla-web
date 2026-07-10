import React, { useState, useEffect } from 'react';
import { Search, Sparkles, Bell, Mail, Smartphone, Eye, X, Check, FileText } from 'lucide-react';
import { useMockData } from '../../../services/mockService';
import { motion, AnimatePresence } from 'motion/react';

export default function ResultsRelease() {
  const { examAttempts, applications } = useMockData();
  const [searchTerm, setSearchTerm] = useState('');
  const [attemptsList, setAttemptsList] = useState<any[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('philsa_exam_attempts_scores');
    if (saved) {
      try {
        setAttemptsList(JSON.parse(saved));
      } catch (e) {
        console.error("Error reading scores", e);
        setAttemptsList(examAttempts);
      }
    } else {
      setAttemptsList(examAttempts);
    }
  }, [examAttempts]);

  // Identify candidates who are RELEASED from Score Management
  const releasedCandidates = attemptsList.filter(att => {
    return att.status === 'RELEASED';
  }).map(att => {
    const student = applications.find(a => a.id === att.candidateId);
    const pct = student?.examPercentile || Math.min(100, Math.round((att.totalScore / att.maxScore) * 100));
    
    // Assign a purpose dynamically or fallback
    let purpose = 'AY 2026-2027 Space Science Scholarship Qualification & Academic Evaluation';
    if (pct >= 90) {
      purpose = 'PhilSA Fast-Track Research Fellowship and Space Academy Admission';
    } else if (pct >= 75) {
      purpose = 'AY 2026-2027 College Admission Exam Results and Course Allocations';
    } else {
      purpose = 'General Academic Evaluation and Secondary Track Recommendations';
    }

    return {
      attemptId: att.id,
      candidateId: att.candidateId,
      fullName: student ? `${student.firstName} ${student.lastName}` : 'Unknown Candidate',
      email: student?.email || 'student@domain.ph',
      mobile: student?.mobile || '+63 917 123 4567',
      score: `${att.totalScore}/${att.maxScore}`,
      percentile: pct,
      examSetId: att.examSetId,
      releaseStatus: att.status,
      purpose,
    };
  });

  const filteredCandidates = releasedCandidates.filter(c => {
    const matchesSearch = c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.candidateId.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="px-3 py-1 bg-philsa-red/10 text-philsa-red rounded-full text-[10px] font-black uppercase tracking-widest border border-philsa-red/10 flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Exam Hub Operations
          </span>
        </div>
        <h1 className="text-3xl font-extrabold text-philsa-navy mb-1 tracking-tight">Results Release</h1>
        <p className="text-philsa-gray text-sm font-medium">View official candidate score sheets that have been verified and finalized for enrollment release along with their dispatched notifications.</p>
      </div>

      {/* Candidates List Table */}
      <div className="card-philsa !p-0 overflow-hidden">
        <div className="p-6 border-b border-philsa-border bg-philsa-bg/30 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-philsa-gray" />
            <input 
              type="text" 
              placeholder="Search released candidates by name or ID..." 
              className="w-full bg-white border border-philsa-border rounded-xl pl-11 pr-4 py-2.5 text-xs font-bold text-philsa-navy shadow-sm outline-none placeholder:text-philsa-gray/40 focus:border-philsa-red"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <span className="text-[11px] font-black text-emerald-700 uppercase tracking-wider bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-150">
            {releasedCandidates.length} Candidates Synced
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-philsa-bg text-[10px] text-philsa-gray font-black uppercase tracking-[0.2em] border-b border-philsa-border">
              <tr>
                <th className="px-6 py-4">Candidate Details</th>
                <th className="px-6 py-4">Final Score / Percentile</th>
                <th className="px-6 py-4">Notification Purpose</th>
                <th className="px-6 py-4 text-center">Notification Dispatch</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-philsa-border">
              {filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400 italic font-semibold text-xs bg-slate-50/50">
                    No released candidates found. Complete score audits in Score Management to release candidate scores first.
                  </td>
                </tr>
              ) : (
                filteredCandidates.map(c => (
                  <tr key={c.candidateId} className="hover:bg-slate-50/55 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-xs font-black text-philsa-navy">{c.fullName}</p>
                      <p className="text-[10px] text-philsa-gray font-bold uppercase tracking-wider mt-0.5">{c.candidateId}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-0.5">
                        <span className="text-xs font-extrabold text-philsa-navy">{c.score}</span>
                        <div className="text-[9px] text-[#00563F] font-bold uppercase tracking-wider flex items-center gap-1">
                          <span>{c.percentile}th Percentile</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs">
                        <span className="text-xs font-semibold text-slate-600 line-clamp-2" title={c.purpose}>
                          {c.purpose}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => setSelectedCandidate(c)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-philsa-navy text-white hover:bg-slate-800 transition-all rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Notification
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-150">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                        Released
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Notification Preview Overlay Modal */}
      <AnimatePresence>
        {selectedCandidate && (
          <div className="fixed inset-0 z-[120] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2rem] border border-philsa-border p-8 max-w-2xl w-full shadow-2xl space-y-6"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-philsa-border">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-philsa-red/10 text-philsa-red rounded-xl">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-philsa-navy uppercase tracking-tight">Official Candidate Notification</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Dispatched via SMS & Email Gateway</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedCandidate(null)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-philsa-navy transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Meta details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4.5 rounded-2xl border border-slate-200/80">
                <div>
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Candidate Name</span>
                  <p className="text-xs font-black text-philsa-navy mt-0.5">{selectedCandidate.fullName}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{selectedCandidate.candidateId}</p>
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Scores / Assessment</span>
                  <p className="text-xs font-black text-philsa-navy mt-0.5">Final Score: {selectedCandidate.score}</p>
                  <p className="text-[9px] font-extrabold text-[#00563F] uppercase mt-0.5">{selectedCandidate.percentile}th Percentile Rank</p>
                </div>
                <div className="md:col-span-2 pt-2 border-t border-slate-200">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Notification Purpose</span>
                  <p className="text-xs font-bold text-philsa-red mt-0.5">{selectedCandidate.purpose}</p>
                </div>
              </div>

              {/* Simulated notification card */}
              <div className="space-y-4">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Notification Body Preview</span>
                
                <div className="border border-slate-200/85 rounded-2xl overflow-hidden shadow-sm">
                  <div className="bg-philsa-navy text-white px-5 py-3 text-[10px] font-bold uppercase tracking-wider flex items-center justify-between">
                    <span>Subject: {selectedCandidate.purpose}</span>
                    <Mail className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="p-5 text-xs text-slate-700 font-bold leading-relaxed space-y-3.5 bg-slate-50/20">
                    <p>Dear {selectedCandidate.fullName},</p>
                    <p>
                      This is to notify you that your official scorecard for the **PhilSA National Admission Test** has been certified and released. 
                      You have achieved a final score of **{selectedCandidate.score}**, placing you in the **{selectedCandidate.percentile}th percentile** nationally.
                    </p>
                    <p>
                      Your qualifications have been matched with your chosen university programs. You can now download your official **Certificate of Results** and secondary endorsement credentials from your student portal.
                    </p>
                    <p className="text-[10px] text-slate-400 pt-4 border-t border-slate-100">
                      This is an automated educational transmission dispatched via the Philippine Space Agency National Admissions Office.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setSelectedCandidate(null)}
                  className="flex-1 py-3 bg-philsa-navy hover:bg-slate-800 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer text-center"
                >
                  Close Preview
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
