import React, { useState } from 'react';
import { useMockData } from '../../../services/mockService';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Filter, Eye, CheckCircle2, 
  AlertCircle, Clock, FileText, ClipboardCheck,
  UserCheck, Download, History, Upload, Power, XCircle, Check
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { usePhilSA } from '../../../PhilSAContext';

export default function ExamReviewList() {
  const { examAttempts, applications, questions, setExamAttempts } = useMockData();
  const { inputModules } = usePhilSA();
  const isUploadActive = inputModules?.find(m => m.id === 'answer_sheet_upload')?.isActive !== false;
  
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'GRADED'>('ALL');

  // Answer Sheet Upload state next to Audit Logs and Export Batch
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [targetAttemptId, setTargetAttemptId] = useState('');
  const [isProcessingOMR, setIsProcessingOMR] = useState(false);
  const [omrSuccess, setOmrSuccess] = useState<string | null>(null);
  const [uploadFeedback, setUploadFeedback] = useState('');


  const filteredAttempts = examAttempts.filter(att => {
    const student = applications.find(a => a.id === att.candidateId);
    if (!student) return false;
    
    const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || att.candidateId.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (statusFilter === 'ALL') return matchesSearch;
    return matchesSearch && att.status === statusFilter;
  });

  const stats = {
    total: examAttempts.length,
    pending: examAttempts.filter(a => a.status !== 'GRADED').length,
    graded: examAttempts.filter(a => a.status === 'GRADED').length
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-philsa-navy tracking-tight mb-2">Exam Review Queue</h1>
          <p className="text-philsa-gray text-xs font-black uppercase tracking-[0.2em] opacity-60">PhilSLA Evaluation Control Unit</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
           <button 
             onClick={() => alert('Audit log retrieval requested. Tracing all calibration & grading history logs...')}
             className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all cursor-pointer"
           >
              Audit Logs
           </button>
           <button 
             onClick={() => alert('Initiating bulk Excel/PDF bundle export for current filtered review queue.')}
             className="px-4 py-2 bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-sm transition-all cursor-pointer mr-1"
           >
              Export Batch
           </button>

           <button 
             disabled={!isUploadActive}
             onClick={() => {
               setOmrSuccess(null);
               setTargetAttemptId(examAttempts[0]?.id || '');
               setIsUploadModalOpen(true);
             }}
             className={cn(
               "px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2 transition-all shadow-md border",
               isUploadActive 
                 ? "bg-slate-800 hover:bg-slate-900 text-white border-transparent cursor-pointer" 
                 : "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60"
             )}
           >
              <Upload className="w-3.5 h-3.5 text-philsa-red animate-pulse shrink-0" />
              <span>{isUploadActive ? "Upload Student Answer Sheet" : "Upload Disabled (Deactivated)"}</span>
           </button>
        </div>
      </div>

      {/* Main Table Interface */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
         <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
               <input 
                 type="text" 
                 placeholder="Search student or ID..." 
                 className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-slate-400/10 outline-none transition-all"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
               />
            </div>
            <div className="flex bg-slate-100 p-1 rounded-xl">
               {(['ALL', 'PENDING', 'GRADED'] as const).map((status) => (
                 <button
                   key={status}
                   onClick={() => setStatusFilter(status)}
                   className={cn(
                     "px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                     statusFilter === status 
                       ? "bg-white text-slate-800 shadow-sm" 
                       : "text-slate-400 hover:text-slate-600"
                   )}
                 >
                   {status}
                 </button>
               ))}
            </div>
         </div>

         <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead className="bg-slate-50/50 text-[10px] text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                  <tr>
                     <th className="px-6 py-4">Examinee</th>
                     <th className="px-6 py-4">Submission</th>
                     <th className="px-6 py-4 text-center">Score</th>
                     <th className="px-6 py-4 text-center">Status</th>
                     <th className="px-6 py-4 text-right">Action</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {filteredAttempts.map((attempt) => {
                    const student = applications.find(a => a.id === attempt.candidateId);
                    const isGraded = attempt.status === 'GRADED';
                    const hasEssay = attempt.attempts.some(a => a.questionId === 'q_essay_1');
                    
                    return (
                      <tr key={attempt.id} className="hover:bg-slate-50/50 transition-colors">
                         <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                               <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs border border-slate-200">
                                  {student?.firstName[0]}{student?.lastName[0]}
                               </div>
                               <div>
                                  <p className="text-sm font-bold text-slate-800">{student?.firstName} {student?.lastName}</p>
                                  <p className="text-[10px] text-slate-400 font-mono tracking-tighter">{attempt.candidateId}</p>
                               </div>
                            </div>
                         </td>
                         <td className="px-6 py-4">
                            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                               {new Date(attempt.startTime).toLocaleDateString()}
                            </p>
                            <p className="text-[10px] text-slate-400">
                               {new Date(attempt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                         </td>
                         <td className="px-6 py-4">
                            <div className="flex flex-col items-center">
                               <div className="flex items-center gap-1.5 mb-1">
                                  <span className="text-sm font-bold text-slate-800">{attempt.totalScore}</span>
                                  <span className="text-[10px] text-slate-400">/ {attempt.maxScore}</span>
                               </div>
                               <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-slate-400 rounded-full transition-all duration-700" 
                                    style={{ width: `${(attempt.totalScore / attempt.maxScore) * 100}%` }}
                                  />
                               </div>
                            </div>
                         </td>
                         <td className="px-6 py-4 text-center">
                            <div className="flex flex-col items-center gap-1">
                               {attempt.status === 'FINALIZED' ? (
                                 <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[9px] font-black uppercase border border-emerald-200 flex items-center gap-1.5 shadow-sm">
                                   <UserCheck className="w-3 h-3" /> Released
                                 </span>
                               ) : isGraded ? (
                                 <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-bold uppercase border border-emerald-100 flex items-center gap-1.5">
                                   <CheckCircle2 className="w-3 h-3" /> Graded
                                 </span>
                               ) : (
                                 <span className="px-2.5 py-1 bg-amber-50 text-amber-600 rounded-full text-[9px] font-bold uppercase border border-amber-100 flex items-center gap-1.5">
                                   <Clock className="w-3 h-3" /> Pending
                                 </span>
                               )}
                               {attempt.status === 'SUBMITTED' && hasEssay && (
                                  <span className="text-[8px] font-bold text-rose-500 uppercase flex items-center gap-1">
                                     <AlertCircle className="w-2.5 h-2.5" /> essay manual review
                                  </span>
                               )}
                            </div>
                         </td>
                         <td className="px-6 py-4 text-right">
                            <button 
                               onClick={() => navigate(`/admin/hub/review/${attempt.id}`)}
                               className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-800 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-slate-200 shadow-sm transition-all"
                            >
                               Open
                            </button>
                         </td>
                      </tr>
                    );
                  })}
               </tbody>
            </table>
         </div>
      </div>

       {/* Top-Tier OMR Scanning & Digitization Modal */}
       <AnimatePresence>
         {isUploadModalOpen && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-fade-in animate-in">
             <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
               {/* Modal Header */}
               <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                 <h2 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center gap-2 font-sans font-extrabold">
                   <Upload className="w-5 h-5 text-philsa-red animate-pulse" /> Digitizing Student Answer Sheet
                 </h2>
                 <button 
                   onClick={() => {
                     setIsUploadModalOpen(false);
                     setOmrSuccess(null);
                     setIsProcessingOMR(false);
                   }} 
                   className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                 >
                   <XCircle className="w-5 h-5" />
                 </button>
               </div>

               {/* Modal Body */}
               <div className="p-8 overflow-y-auto space-y-6 flex-1 font-sans">
                 {/* Step 1: Candidate Selector */}
                 <div className="space-y-4">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-sans">1. Select Candidate for OMR Digitization</label>
                   <select 
                     value={targetAttemptId} 
                     onChange={(e) => {
                       setTargetAttemptId(e.target.value);
                       setOmrSuccess(null);
                     }}
                     className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-slate-400/10 outline-none transition-all font-semibold font-sans text-slate-700"
                   >
                     <option value="" disabled>-- Select Candidate --</option>
                     {examAttempts.map(att => {
                       const student = applications.find(a => a.id === att.candidateId);
                       return (
                         <option key={att.id} value={att.id}>
                           {student ? `${student.firstName} ${student.lastName}` : att.candidateId} ({att.candidateId}) — Score: {att.totalScore}/{att.maxScore} [{att.status}]
                         </option>
                       );
                     })}
                   </select>
                 </div>

                 {targetAttemptId && (
                   <div className="space-y-6 animate-in fade-in duration-300">
                     {/* Step 2: Choose Scanning Target Template */}
                     <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-sans">2. Select Template Source & Paper Layout</label>
                       
                       <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                         <button 
                           onClick={() => {
                             const attempt = examAttempts.find(a => a.id === targetAttemptId);
                             const student = applications.find(a => a.id === attempt?.candidateId);
                             if (!attempt || !student) return;

                             setIsProcessingOMR(true);
                             setOmrSuccess(null);
                             setTimeout(() => {
                               setIsProcessingOMR(false);
                               // Update actual attempt attempts list
                               const updatedAttempts = attempt.attempts.map((attItem) => {
                                 const questionObj = questions.find(qu => qu.id === attItem.questionId);
                                 let randAnswer = attItem.studentAnswer;
                                 let isCorrect = attItem.isCorrect;
                                 let scoreEarned = attItem.scoreEarned;
                                 
                                 if (questionObj?.options && questionObj.type !== 'ESSAY') {
                                   randAnswer = questionObj.correctAnswer;
                                   isCorrect = true;
                                   scoreEarned = questionObj.score || 5;
                                 }

                                 return {
                                   ...attItem,
                                   studentAnswer: randAnswer,
                                   isCorrect: isCorrect,
                                   scoreEarned: scoreEarned,
                                   timeSpentSeconds: Math.floor(25 + Math.random() * 110)
                                 };
                               });

                               const newTotal = updatedAttempts.reduce((sum, q) => sum + (q.scoreEarned || 0), 0);
                               
                               setExamAttempts(prev => prev.map(att => {
                                 if (att.id === attempt.id) {
                                   return {
                                     ...att,
                                     attempts: updatedAttempts,
                                     totalScore: newTotal,
                                     systemInitialScore: Math.max(0, newTotal - 5)
                                   };
                                 }
                                 return att;
                               }));

                               setOmrSuccess(`Standard CSV Grid aligned at 100%! Digits & grids compiled for Candidate ${student.firstName} ${student.lastName}. Total objective score synced to ${newTotal} points.`);
                             }, 1200);
                           }}
                           className="p-4 rounded-xl border border-slate-200 hover:border-philsa-red hover:bg-slate-50 transition-all text-left space-y-1 outline-none group text-slate-600 flex flex-col justify-between cursor-pointer"
                         >
                           <div className="p-2 bg-rose-50 rounded-lg w-fit text-philsa-red group-hover:scale-105 transition-all">
                             <Upload className="w-4 h-4" />
                           </div>
                           <div>
                             <p className="font-extrabold text-xs text-slate-800 uppercase tracking-tight">Standard CSV</p>
                             <p className="text-[9px] text-slate-400 font-semibold font-sans leading-relaxed">Regular digital csv templates</p>
                           </div>
                         </button>

                         <button 
                           onClick={() => {
                             const attempt = examAttempts.find(a => a.id === targetAttemptId);
                             const student = applications.find(a => a.id === attempt?.candidateId);
                             if (!attempt || !student) return;

                             setIsProcessingOMR(true);
                             setOmrSuccess(null);
                             setTimeout(() => {
                               setIsProcessingOMR(false);
                               // Update actual attempt attempts list
                               const updatedAttempts = attempt.attempts.map((attItem) => {
                                 const questionObj = questions.find(qu => qu.id === attItem.questionId);
                                 let randAnswer = attItem.studentAnswer;
                                 let isCorrect = attItem.isCorrect;
                                 let scoreEarned = attItem.scoreEarned;
                                 
                                 if (questionObj?.options && questionObj.type !== 'ESSAY') {
                                   randAnswer = questionObj.correctAnswer;
                                   isCorrect = true;
                                   scoreEarned = questionObj.score || 5;
                                 }

                                 return {
                                   ...attItem,
                                   studentAnswer: randAnswer,
                                   isCorrect: isCorrect,
                                   scoreEarned: scoreEarned,
                                   timeSpentSeconds: Math.floor(40 + Math.random() * 95)
                                 };
                               });

                               const newTotal = updatedAttempts.reduce((sum, q) => sum + (q.scoreEarned || 0), 0);
                               
                               setExamAttempts(prev => prev.map(att => {
                                 if (att.id === attempt.id) {
                                   return {
                                     ...att,
                                     attempts: updatedAttempts,
                                     totalScore: newTotal,
                                     systemInitialScore: Math.max(0, newTotal - 5)
                                   };
                                 }
                                 return att;
                               }));

                               setOmrSuccess(`Handwriting OCR conversion succeeded for Candidate ${student.firstName} ${student.lastName}! Scanned active answer keys mapped directly to sheet, totaling ${newTotal} points.`);
                             }, 1400);
                           }}
                           className="p-4 rounded-xl border border-slate-200 hover:border-philsa-red hover:bg-slate-50 transition-all text-left space-y-1 outline-none group text-slate-600 flex flex-col justify-between cursor-pointer"
                         >
                           <div className="p-2 bg-blue-50 rounded-lg w-fit text-blue-500 group-hover:scale-105 transition-all">
                             <FileText className="w-4 h-4" />
                           </div>
                           <div>
                             <p className="font-extrabold text-xs text-slate-800 uppercase tracking-tight">Handwritten OCR</p>
                             <p className="text-[9px] text-slate-400 font-semibold font-sans leading-relaxed">PDF scanned handwriting bubble papers</p>
                           </div>
                         </button>

                         <button 
                           onClick={() => {
                             const attempt = examAttempts.find(a => a.id === targetAttemptId);
                             const student = applications.find(a => a.id === attempt?.candidateId);
                             if (!attempt || !student) return;

                             setIsProcessingOMR(true);
                             setOmrSuccess(null);
                             setTimeout(() => {
                               setIsProcessingOMR(false);
                               // Update actual attempt attempts list
                               const updatedAttempts = attempt.attempts.map((attItem) => {
                                 const questionObj = questions.find(qu => qu.id === attItem.questionId);
                                 let randAnswer = attItem.studentAnswer;
                                 let isCorrect = attItem.isCorrect;
                                 let scoreEarned = attItem.scoreEarned;
                                 
                                 if (questionObj?.options && questionObj.type !== 'ESSAY') {
                                   randAnswer = questionObj.correctAnswer;
                                   isCorrect = true;
                                   scoreEarned = questionObj.score || 5;
                                 }

                                 return {
                                   ...attItem,
                                   studentAnswer: randAnswer,
                                   isCorrect: isCorrect,
                                   scoreEarned: scoreEarned,
                                   timeSpentSeconds: Math.floor(55 + Math.random() * 125)
                                 };
                               });

                               const newTotal = updatedAttempts.reduce((sum, q) => sum + (q.scoreEarned || 0), 0);
                               
                               setExamAttempts(prev => prev.map(att => {
                                 if (att.id === attempt.id) {
                                   return {
                                     ...att,
                                     attempts: updatedAttempts,
                                     totalScore: newTotal,
                                     systemInitialScore: Math.max(0, newTotal - 5)
                                   };
                                 }
                                 return att;
                               }));

                               setOmrSuccess(`OMR Scanner layout digitized for Candidate ${student.firstName} ${student.lastName}! Bubble recognition synced with 100% calibration, finalizing score to ${newTotal} points.`);
                             }, 1500);
                           }}
                           className="p-4 rounded-xl border border-slate-200 hover:border-philsa-red hover:bg-slate-50 transition-all text-left space-y-1 outline-none group text-slate-600 flex flex-col justify-between cursor-pointer"
                         >
                           <div className="p-2 bg-emerald-50 rounded-lg w-fit text-emerald-500 group-hover:scale-105 transition-all">
                             <CheckCircle2 className="w-4 h-4" />
                           </div>
                           <div>
                             <p className="font-extrabold text-xs text-slate-800 uppercase tracking-tight">OMR Template Paper</p>
                             <p className="text-[9px] text-slate-400 font-semibold font-sans leading-relaxed">Direct hardware sheet recognition outputs</p>
                           </div>
                         </button>
                       </div>
                     </div>
                   </div>
                 )}

                 {/* Simulated Analyzer Status Loop */}
                 {isProcessingOMR && (
                   <div className="p-6 bg-slate-50 rounded-2xl flex flex-col items-center justify-center space-y-4 animate-pulse">
                     <span className="relative flex h-4 w-4">
                       <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-philsa-red opacity-75"></span>
                       <span className="relative inline-flex rounded-full h-4 w-4 bg-philsa-red"></span>
                     </span>
                     <p className="text-xs font-black uppercase tracking-widest text-slate-500 font-mono text-center">Calibrating scanner focal points & syncing candidate record...</p>
                   </div>
                 )}

                 {/* Success state overview output feedback */}
                 {omrSuccess && (
                   <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-4 animate-in slide-in-from-bottom-2">
                     <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white shrink-0 font-sans">
                         <Check className="w-5 h-5" />
                       </div>
                       <div>
                         <p className="text-xs font-black text-emerald-800 uppercase tracking-widest font-sans">Sync Processing Completed</p>
                         <p className="text-xs text-emerald-600 font-semibold leading-relaxed mt-0.5">{omrSuccess}</p>
                       </div>
                     </div>

                     <div className="flex justify-end gap-3 pt-2">
                       <button 
                         onClick={() => {
                           setIsUploadModalOpen(false);
                           navigate(`/admin/hub/review/${targetAttemptId}`);
                         }} 
                         className="px-4 py-2 bg-slate-800 hover:bg-slate-900 border border-transparent text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition-colors shadow-sm animate-bounce"
                       >
                         View Answer Sheet Detail
                       </button>
                     </div>
                   </div>
                 )}
               </div>

               {/* Modal Footer */}
               <div className="px-8 py-4 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-widest font-mono">
                 <span>Exam Scan Center • PhilSA Base v2.6</span>
                 <button 
                   onClick={() => {
                     setIsUploadModalOpen(false);
                     setOmrSuccess(null);
                     setIsProcessingOMR(false);
                   }} 
                   className="px-5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition-colors"
                 >
                   Close
                 </button>
               </div>
             </div>
           </div>
         )}
       </AnimatePresence>
    </div>
  );
}

