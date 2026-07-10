import { useState } from 'react';
import { usePhilSA } from '../PhilSAContext';
import { useMockData, DUMMY_QUESTIONS } from '../services/mockService';
import { Plus, Search, Filter, Box, Trash2, Edit, Check, AlertTriangle, UploadCloud, CheckCircle, XCircle, Archive, Send, RotateCcw } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { Question } from '../types';

export default function QuestionBank() {
  const { user, addAuditLog } = usePhilSA();
  const { questions, setQuestions } = useMockData();
  const [isAdding, setIsAdding] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  // Filter and Selection States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('PENDING_REVIEW');
  const [selectedAgency, setSelectedAgency] = useState('ALL');
  const [selectedQIds, setSelectedQIds] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const isSuperAdmin = user?.role === 'SYSTEM_ADMIN';

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const handleStatusUpdate = (qId: string, newStatus: Question['status']) => {
    setQuestions(prev => prev.map(q => q.id === qId ? { ...q, status: newStatus } : q));
    const question = questions.find(q => q.id === qId);
    if (question) {
      addAuditLog('QUESTION_BANK_UPDATE', `Updated status of question ${qId} to ${newStatus}`);
    }
  };

  const handleBulkStatusChange = (newStatus: 'APPROVED' | 'FOR_CORRECTION' | 'REJECTED') => {
    if (selectedQIds.length === 0) return;
    setQuestions(prev => prev.map(q => selectedQIds.includes(q.id) ? { ...q, status: newStatus } : q));
    addAuditLog('QUESTION_BANK_BULK_UPDATE', `Bulk updated ${selectedQIds.length} questions to status ${newStatus}`);
    showToast(`Successfully changed ${selectedQIds.length} items to ${newStatus}`);
    setSelectedQIds([]);
  };

  // Derived filtered questions
  const filteredQuestions = questions.filter(q => {
    // 1. Search Query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const textMatch = q.text?.toLowerCase().includes(query);
      const idMatch = q.id?.toLowerCase().includes(query);
      const subjectMatch = q.subject?.toLowerCase().includes(query);
      if (!textMatch && !idMatch && !subjectMatch) return false;
    }

    // 2. Selected Agency (CHED vs DepEd vs TESDA)
    if (selectedAgency !== 'ALL') {
      const agencyOfQ = (q.subject === 'Social Science' || q.subject === 'Space Policy' || q.subject === 'Education') ? 'DEPED' : 'CHED';
      if (selectedAgency === 'CHED' && agencyOfQ !== 'CHED') return false;
      if (selectedAgency === 'DEPED' && agencyOfQ !== 'DEPED') return false;
    }

    // 3. Status Filter
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'PENDING_REVIEW') {
        return q.status === 'IN_REVIEW' || q.status === 'PENDING';
      }
      return q.status === statusFilter;
    }

    return true;
  });

  const [newQ, setNewQ] = useState<Partial<Question>>({
    text: '',
    type: 'MCQ',
    subject: '',
    topic: '',
    difficulty: 'MEDIUM',
    score: 5,
    options: ['', '', '', ''],
    correctAnswer: ''
  });

  const handleSave = () => {
    const q: Question = {
      id: 'q_' + Date.now(),
      text: newQ.text || '',
      type: newQ.type as any,
      subject: newQ.subject || '',
      topic: newQ.topic || '',
      difficulty: newQ.difficulty as any,
      score: newQ.score || 5,
      options: newQ.options,
      correctAnswer: newQ.correctAnswer,
      status: 'APPROVED',
      authorId: user?.id || 'admin'
    };
    setQuestions(prev => [q, ...prev]);
    addAuditLog('QUESTION_BANK_UPDATE', `Added new ${q.type} question to ${q.subject}`);
    setIsAdding(false);
  };

  const updateOption = (val: string, idx: number) => {
    const opts = [...(newQ.options || [])];
    opts[idx] = val;
    setNewQ({ ...newQ, options: opts });
  };

  return (
    <div className="space-y-8">
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-philsa-navy text-white px-6 py-3.5 rounded-2xl shadow-2xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 border border-white/10 animate-fade-in animate-bounce">
          <CheckCircle className="w-4 h-4 text-green-450" />
          {toast}
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-philsa-navy mb-2">Question Bank Management</h1>
          <p className="text-philsa-gray">Curate and manage assessment items for official PhilSA exams.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button 
            onClick={() => setShowBulkUpload(true)}
            className="btn-secondary py-3.5 px-6 flex items-center gap-2 cursor-pointer"
          >
            <UploadCloud className="w-5 h-5" /> Bulk Upload
          </button>
          
          <button 
            onClick={() => setIsAdding(true)}
            className="btn-primary py-3.5 px-6 flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-5 h-5" /> Create Item
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-philsa-border overflow-hidden">
        <div className="p-6 border-b border-philsa-border flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-wrap gap-4 items-center">
             <div className="relative w-64 lg:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-philsa-gray" />
              <input 
                type="text" 
                placeholder="Search by question text or ID..." 
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setSelectedQIds([]);
                }}
                className="w-full bg-philsa-bg border-none rounded-xl pl-11 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-philsa-red/10 outline-none" 
              />
            </div>
            <select 
              value={selectedAgency}
              onChange={e => {
                setSelectedAgency(e.target.value);
                setSelectedQIds([]);
              }}
              className="bg-philsa-bg border border-philsa-border rounded-xl px-4 py-2.5 text-xs font-bold text-philsa-navy hover:bg-white transition-all outline-none"
            >
              <option value="ALL">All Agencies (CHED, DepEd)</option>
              <option value="CHED">CHED Contributions</option>
              <option value="DEPED">DepEd Contributions</option>
            </select>
            <select 
              value={statusFilter}
              onChange={e => {
                setStatusFilter(e.target.value);
                setSelectedQIds([]);
              }}
              className="bg-philsa-bg border border-philsa-border rounded-xl px-4 py-2.5 text-xs font-bold text-philsa-navy hover:bg-white transition-all outline-none"
            >
              <option value="ALL">Status: All</option>
              <option value="DRAFT">Status: Draft</option>
              <option value="PENDING_REVIEW">Status: Pending Review</option>
              <option value="APPROVED">Status: Approved</option>
              <option value="PUBLISHED">Status: Published</option>
              <option value="REJECTED">Status: Rejected</option>
              <option value="FOR_CORRECTION">Status: For Correction</option>
              <option value="ARCHIVED">Status: Archived</option>
            </select>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-[10px] text-philsa-gray font-bold uppercase tracking-widest leading-none mb-1">Items Approved</p>
              <p className="text-xl font-black text-philsa-navy leading-none">{questions.filter(q => q.status === 'APPROVED' || q.status === 'PUBLISHED').length.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Dynamic Contextual Multi-Select Toolbar */}
        {isSuperAdmin && statusFilter === 'PENDING_REVIEW' && selectedQIds.length > 0 && (
          <div className="bg-white text-philsa-navy px-8 py-4.5 flex flex-wrap items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-300 border border-philsa-border rounded-2xl shadow-sm mb-6">
            <div className="flex items-center gap-3">
              <span className="bg-philsa-red/10 text-philsa-red px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider font-mono">
                {selectedQIds.length} Selected
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleBulkStatusChange('APPROVED')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <CheckCircle className="w-3.5 h-3.5" /> Approve Selected
              </button>
              <button
                type="button"
                onClick={() => handleBulkStatusChange('FOR_CORRECTION')}
                className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5" /> For Correction
              </button>
              <button
                type="button"
                onClick={() => handleBulkStatusChange('REJECTED')}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" /> Reject Selected
              </button>
              
              <button 
                onClick={() => setSelectedQIds([])}
                className="text-xs font-black text-slate-500 hover:text-philsa-navy uppercase tracking-wider ml-4 cursor-pointer transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-philsa-bg text-[10px] text-philsa-gray font-bold uppercase tracking-widest">
                {isSuperAdmin && (
                  <th className="px-8 py-5 w-12 text-center select-none">
                    <input 
                      type="checkbox"
                      checked={filteredQuestions.length > 0 && filteredQuestions.every(q => selectedQIds.includes(q.id))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedQIds(filteredQuestions.map(q => q.id));
                        } else {
                          setSelectedQIds([]);
                        }
                      }}
                      className="rounded border-philsa-border text-philsa-red focus:ring-philsa-red w-4 h-4 cursor-pointer"
                      title="Select All Visited Questions"
                    />
                  </th>
                )}
                <th className="px-8 py-5">Assessment Item</th>
                <th className="px-8 py-5">Agency / Subject</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-philsa-border">
              {filteredQuestions.map((q) => (
                <tr key={q.id} className={cn("hover:bg-philsa-bg/30 transition-colors", selectedQIds.includes(q.id) && "bg-philsa-red/5 hover:bg-philsa-red/10")}>
                  {isSuperAdmin && (
                    <td className="px-8 py-6 w-12 text-center select-none">
                      <input 
                        type="checkbox"
                        checked={selectedQIds.includes(q.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedQIds([...selectedQIds, q.id]);
                          } else {
                            setSelectedQIds(selectedQIds.filter(id => id !== q.id));
                          }
                        }}
                        className="rounded border-philsa-border text-philsa-red focus:ring-philsa-red w-4 h-4 cursor-pointer"
                      />
                    </td>
                  )}
                  <td className="px-8 py-6">
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                        q.difficulty === 'HARD' ? 'bg-red-50 text-red-600' : 
                        q.difficulty === 'MEDIUM' ? 'bg-yellow-50 text-yellow-700' : 'bg-green-50 text-green-700'
                      )}>
                        <Box className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-philsa-navy line-clamp-1 leading-snug">{q.text}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-[9px] font-black text-philsa-red bg-philsa-red/5 px-2 py-0.5 rounded uppercase tracking-widest">{q.type}</span>
                          <span className="w-1 h-1 bg-philsa-border rounded-full" />
                          <span className="text-[10px] font-bold text-philsa-gray uppercase tracking-widest">Points: {q.score}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 mb-1">
                       <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", 
                         (q.subject === 'Social Science' || q.subject === 'Space Policy' || q.subject === 'Education') ? 'bg-philsa-red' : 'bg-blue-600'
                       )} />
                       <p className="text-xs font-black text-philsa-navy leading-none uppercase tracking-tighter">
                          {(q.subject === 'Social Science' || q.subject === 'Space Policy' || q.subject === 'Education') ? 'DepEd' : 'CHED'}
                       </p>
                    </div>
                    <p className="text-[10px] text-philsa-gray font-bold uppercase tracking-widest">{q.subject}</p>
                  </td>
                  <td className="px-8 py-6">
                    <span className={cn(
                      "badge-status",
                      q.status === 'PUBLISHED' && 'badge-published',
                      q.status === 'APPROVED' && 'badge-approved',
                      (q.status === 'PENDING' || q.status === 'IN_REVIEW') && 'badge-pending',
                      q.status === 'REJECTED' && 'badge-rejected',
                      q.status === 'ARCHIVED' && 'badge-archived',
                      q.status === 'DRAFT' && 'badge-draft',
                      q.status === 'FOR_CORRECTION' && 'badge-status bg-[#FEF3C7] text-[#92400E]'
                    )}>
                      {q.status === 'IN_REVIEW' ? 'PENDING REVIEW' : q.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button 
                        onClick={() => handleStatusUpdate(q.id, 'APPROVED')}
                        className={cn(
                          "p-2 rounded-lg transition-all",
                          q.status === 'APPROVED' ? "bg-green-100 text-green-700" : "text-philsa-gray hover:bg-green-50 hover:text-green-600"
                        )}
                        title="Approve Question"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleStatusUpdate(q.id, 'PUBLISHED')}
                        className={cn(
                          "p-2 rounded-lg transition-all",
                          q.status === 'PUBLISHED' ? "bg-blue-100 text-blue-700" : "text-philsa-gray hover:bg-blue-50 hover:text-blue-600"
                        )}
                        title="Publish Question"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleStatusUpdate(q.id, 'REJECTED')}
                        className={cn(
                          "p-2 rounded-lg transition-all",
                          q.status === 'REJECTED' ? "bg-red-100 text-red-700" : "text-philsa-gray hover:bg-red-50 hover:text-red-600"
                        )}
                        title="Reject Question"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleStatusUpdate(q.id, 'FOR_CORRECTION')}
                        className={cn(
                          "p-2 rounded-lg transition-all",
                          q.status === 'FOR_CORRECTION' ? "bg-amber-100 text-amber-700" : "text-philsa-gray hover:bg-amber-50 hover:text-amber-600"
                        )}
                        title="Mark for Correction"
                      >
                        <AlertTriangle className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleStatusUpdate(q.id, 'ARCHIVED')}
                        className={cn(
                          "p-2 rounded-lg transition-all",
                          q.status === 'ARCHIVED' ? "bg-slate-100 text-slate-700" : "text-philsa-gray hover:bg-slate-50 hover:text-slate-600"
                        )}
                        title="Archive Question"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                      <div className="w-px h-4 bg-philsa-border mx-1" />
                      <button className="p-2 text-philsa-navy hover:bg-white rounded-lg border border-transparent hover:border-philsa-border hover:shadow-xs transition-all" title="Edit">
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredQuestions.length === 0 && (
                <tr>
                  <td colSpan={isSuperAdmin ? 5 : 4} className="px-8 py-16 text-center text-philsa-gray/70">
                    <p className="font-bold text-sm">No assessment items found matching the selected filters.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-philsa-navy/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
          >
            <div className="p-10 border-b border-philsa-border flex justify-between items-center bg-philsa-bg/50">
              <div>
                <h2 className="text-2xl font-extrabold text-philsa-navy">Create Assessment Item</h2>
                <p className="text-philsa-gray text-sm">Define a new question for the exam pool.</p>
              </div>
              <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-white rounded-full transition-colors"><XCircle className="w-8 h-8 text-philsa-gray" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 space-y-8">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-philsa-gray uppercase tracking-widest">Question Type</label>
                  <select className="input-philsa" value={newQ.type} onChange={e => setNewQ({...newQ, type: e.target.value as any})}>
                    <option value="MCQ">Multiple Choice (Single Answer)</option>
                    <option value="TF">True or False</option>
                    <option value="ESSAY">Essay / Free Response</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-philsa-gray uppercase tracking-widest">Difficulty</label>
                  <select className="input-philsa" value={newQ.difficulty} onChange={e => setNewQ({...newQ, difficulty: e.target.value as any})}>
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-philsa-gray uppercase tracking-widest">Question Text</label>
                <textarea 
                  className="input-philsa min-h-[120px]" 
                  placeholder="Enter the actual question content here..."
                  value={newQ.text}
                  onChange={e => setNewQ({...newQ, text: e.target.value})}
                />
              </div>

              {newQ.type === 'MCQ' && (
                <div className="space-y-4">
                  <label className="text-xs font-bold text-philsa-gray uppercase tracking-widest">Options</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {newQ.options?.map((opt, i) => (
                      <div key={i} className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-philsa-red">{String.fromCharCode(65 + i)}</span>
                        <input 
                          type="text" 
                          className="input-philsa pl-10" 
                          placeholder={`Option ${i+1}`}
                          value={opt}
                          onChange={e => updateOption(e.target.value, i)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-philsa-gray uppercase tracking-widest">Subject</label>
                  <input type="text" className="input-philsa" value={newQ.subject} onChange={e => setNewQ({...newQ, subject: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-philsa-gray uppercase tracking-widest">Correct Answer</label>
                  <input type="text" className="input-philsa border-green-200 bg-green-50/20" value={newQ.correctAnswer} onChange={e => setNewQ({...newQ, correctAnswer: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-philsa-gray uppercase tracking-widest">Score Value</label>
                  <input type="number" className="input-philsa" value={newQ.score} onChange={e => setNewQ({...newQ, score: parseInt(e.target.value)})} />
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-philsa-border bg-philsa-bg/50 flex justify-end gap-4">
              <button onClick={() => setIsAdding(false)} className="btn-secondary px-8">Cancel</button>
              <button 
                onClick={handleSave}
                className="btn-primary px-12 flex items-center gap-3"
              >
                <Check className="w-5 h-5" /> Save Question
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Bulk Upload Simulation */}
      {showBulkUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-philsa-navy/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2rem] shadow-2xl w-full max-w-xl p-10"
          >
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <UploadCloud className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-extrabold text-philsa-navy">Bulk Question Upload</h2>
              <p className="text-philsa-gray mt-2 text-sm leading-relaxed px-10">Upload a CSV or JSON file formatted according to the PhilSA item scheme to ingest multiple questions at once.</p>
            </div>

            <div className="border-2 border-dashed border-philsa-border bg-philsa-bg rounded-3xl p-12 flex flex-col items-center justify-center cursor-pointer hover:border-philsa-red/30 transition-all mb-8">
              <p className="text-philsa-navy font-bold">Drag files here or click to browse</p>
              <p className="text-[10px] text-philsa-gray font-bold uppercase mt-2 tracking-widest">Maximum file size 10MB</p>
            </div>

            <div className="flex justify-between items-center">
              <button className="text-philsa-red font-bold text-sm hover:underline">Download Template</button>
              <div className="flex gap-3">
                <button onClick={() => setShowBulkUpload(false)} className="btn-secondary py-2 px-6 text-sm">Cancel</button>
                <button onClick={() => {
                   addAuditLog('BULK_UPLOAD', 'Admin initiated bulk upload of 50 new items.');
                   setShowBulkUpload(false);
                }} className="btn-primary py-2 px-8 text-sm">Continue</button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
