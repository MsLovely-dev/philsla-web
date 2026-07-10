import React, { useState, useMemo } from 'react';
import { usePhilSA } from '../../PhilSAContext';
import { useMockData } from '../../services/mockService';
import { SupportTicket } from '../../types';
import { 
  Search, Filter, LifeBuoy, AlertCircle, Clock, CheckCircle, 
  User, Mail, Laptop, ChevronRight, CheckCircle2, RotateCw, 
  UserPlus, FileText, Send, Plus, X, ArrowLeft, Eye, MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

export default function SupportDashboard() {
  const { tickets, updateTicket, addTicket, auditLogs, addAuditLog, user } = usePhilSA();
  const { applications } = useMockData();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [phaseFilter, setPhaseFilter] = useState<'ALL' | 'REGISTRATION' | 'PRE_EXAM' | 'LIVE_EXAM'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | 'LOW' | 'MEDIUM' | 'HIGH'>('ALL');
  
  // Active/selected ticket details
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  
  // Note creation state
  const [newNote, setNewNote] = useState('');
  
  // Manual Ticket Creation modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createEmail, setCreateEmail] = useState('');
  const [createName, setCreateName] = useState('');
  const [createCandidateId, setCreateCandidateId] = useState('');
  const [createPhase, setCreatePhase] = useState<'REGISTRATION' | 'PRE_EXAM' | 'LIVE_EXAM'>('PRE_EXAM');
  const [createSubject, setCreateSubject] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createPriority, setCreatePriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [createRoom, setCreateRoom] = useState('');

  // Selected ticket computed
  const selectedTicket = useMemo(() => {
    return tickets.find(t => t.id === selectedTicketId) || null;
  }, [tickets, selectedTicketId]);

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      const matchesSearch = 
        t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.candidateName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.candidateId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.contactEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesPhase = phaseFilter === 'ALL' || t.phase === phaseFilter;
      const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
      const matchesPriority = priorityFilter === 'ALL' || t.priority === priorityFilter;

      return matchesSearch && matchesPhase && matchesStatus && matchesPriority;
    });
  }, [tickets, searchQuery, phaseFilter, statusFilter, priorityFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = tickets.length;
    const open = tickets.filter(t => t.status === 'OPEN').length;
    const progress = tickets.filter(t => t.status === 'IN_PROGRESS').length;
    const resolved = tickets.filter(t => t.status === 'RESOLVED').length;
    return { total, open, progress, resolved };
  }, [tickets]);

  // Tech support logs (filtered from audit logs)
  const supportLogs = useMemo(() => {
    return auditLogs.filter(log => 
      log.action.includes('TICKET') || 
      log.action.includes('HELPDESK') || 
      log.action.includes('PROCTOR') ||
      log.action.includes('SECURITY')
    ).slice(0, 8);
  }, [auditLogs]);

  // Update Status Handler
  const handleStatusChange = (status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED') => {
    if (!selectedTicket) return;
    const updated: SupportTicket = {
      ...selectedTicket,
      status,
      notes: [
        ...(selectedTicket.notes || []),
        `Status updated to [${status}] by tech support agent ${user?.firstName || 'System'}`
      ]
    };
    updateTicket(updated);
  };

  // Assign Handlers
  const handleAssignToSelf = () => {
    if (!selectedTicket) return;
    const updated: SupportTicket = {
      ...selectedTicket,
      assignedTo: `${user?.firstName || 'Alexander'} Tech`,
      notes: [
        ...(selectedTicket.notes || []),
        `Ticket assigned to agent ${user?.firstName || 'Alexander'}`
      ]
    };
    updateTicket(updated);
  };

  // Add Internal Note Handler
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !newNote.trim()) return;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const updated: SupportTicket = {
      ...selectedTicket,
      notes: [
        ...(selectedTicket.notes || []),
        `[${timestamp}] ${user?.firstName || 'Agent'}: ${newNote.trim()}`
      ]
    };
    updateTicket(updated);
    setNewNote('');
  };

  // Handle Manual Ticket Submit
  const handleCreateTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addTicket({
      candidateId: createCandidateId || undefined,
      candidateName: createName || undefined,
      contactEmail: createEmail,
      phase: createPhase,
      subject: createSubject,
      description: createDesc,
      status: 'OPEN',
      priority: createPriority,
      examRoom: createRoom || undefined,
      deviceDetails: 'Walk-in / Voice Helpdesk session logged by Agent',
      notes: [`Ticket created manually by Technical Support Agent on behalf of applicant.`]
    });
    
    // Clear state & close modal
    setCreateEmail('');
    setCreateName('');
    setCreateCandidateId('');
    setCreatePhase('PRE_EXAM');
    setCreateSubject('');
    setCreateDesc('');
    setCreatePriority('MEDIUM');
    setCreateRoom('');
    setShowCreateModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-philsa-navy pb-12">
      {/* Top Banner */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="p-2 bg-red-50 text-philsa-red rounded-xl">
                <LifeBuoy className="w-6 h-6 animate-pulse" />
              </span>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-philsa-navy uppercase">Technical Support Desk</h1>
                <p className="text-xs text-philsa-gray">Unified Helpdesk Command and Application Telemetry Dashboard</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button 
              onClick={() => setShowCreateModal(true)}
              className="btn-primary !bg-philsa-red hover:!bg-red-700 !rounded-xl !py-3 !px-5 text-xs font-black uppercase tracking-wider flex items-center gap-2 w-full sm:w-auto justify-center cursor-pointer shadow-md shadow-red-200"
            >
              <Plus className="w-4 h-4" /> Create Manual Ticket
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 mt-8 space-y-8">
        {/* KPI Grid */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Tickets</p>
              <p className="text-3xl font-black text-philsa-navy mt-1">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-500">
              <FileText className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-philsa-red uppercase tracking-widest">Open Queue</p>
              <p className="text-3xl font-black text-philsa-red mt-1">{stats.open}</p>
            </div>
            <div className="w-12 h-12 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-center text-philsa-red">
              <AlertCircle className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">In Progress</p>
              <p className="text-3xl font-black text-amber-500 mt-1">{stats.progress}</p>
            </div>
            <div className="w-12 h-12 bg-amber-50 border border-amber-100 rounded-2xl flex items-center justify-center text-amber-500">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Resolved</p>
              <p className="text-3xl font-black text-emerald-500 mt-1">{stats.resolved}</p>
            </div>
            <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center text-emerald-500">
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>
        </section>

        {/* Workspace Panels */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Ticket Console Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-[2.5rem] border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
              {/* Toolbar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
                <div>
                  <h2 className="text-lg font-black uppercase tracking-tight text-philsa-navy">Support Queue</h2>
                  <p className="text-xs text-philsa-gray">Select any ticket to view active logs & dispatch resolution protocols</p>
                </div>

                <div className="relative w-full md:w-72 shrink-0">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="Search by ID, candidate, email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all text-philsa-navy"
                  />
                </div>
              </div>

              {/* Advanced Filter Pills */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-[10px] font-black uppercase text-slate-500">
                  <Filter className="w-3.5 h-3.5" /> Filter Block
                </div>
                
                {/* Phase filters */}
                <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl">
                  {(['ALL', 'REGISTRATION', 'PRE_EXAM', 'LIVE_EXAM'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setPhaseFilter(p)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all cursor-pointer",
                        phaseFilter === p 
                          ? "bg-philsa-navy text-white shadow-xs" 
                          : "text-slate-500 hover:text-philsa-navy"
                      )}
                    >
                      {p === 'ALL' ? 'All Phases' : p.replace('_', ' ')}
                    </button>
                  ))}
                </div>

                {/* Status Filters */}
                <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl">
                  {(['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all cursor-pointer",
                        statusFilter === s 
                          ? "bg-philsa-navy text-white shadow-xs" 
                          : "text-slate-500 hover:text-philsa-navy"
                      )}
                    >
                      {s === 'ALL' ? 'All Status' : s.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tickets List */}
              <div className="space-y-4 max-h-[550px] overflow-y-auto pr-2">
                {filteredTickets.length === 0 ? (
                  <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-[2rem] space-y-4">
                    <LifeBuoy className="w-12 h-12 text-slate-300 mx-auto animate-spin" />
                    <div>
                      <p className="font-bold text-slate-500">No matching tickets found</p>
                      <p className="text-xs text-slate-400">Try loosening your active filters or clear search query</p>
                    </div>
                  </div>
                ) : (
                  filteredTickets.map(t => {
                    const isSelected = selectedTicketId === t.id;
                    return (
                      <div 
                        key={t.id}
                        onClick={() => setSelectedTicketId(t.id)}
                        className={cn(
                          "p-5 rounded-2xl border transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group relative overflow-hidden",
                          isSelected 
                            ? "bg-[#fafbff] border-blue-200 ring-2 ring-blue-100" 
                            : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                        )}
                      >
                        {/* Priority marker border line */}
                        <div className={cn(
                          "absolute left-0 top-0 bottom-0 w-1",
                          t.priority === 'HIGH' ? "bg-philsa-red" :
                          t.priority === 'MEDIUM' ? "bg-amber-500" : "bg-slate-300"
                        )} />

                        <div className="space-y-2 md:max-w-[70%] pl-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-[10px] font-extrabold text-philsa-navy bg-slate-100 px-2 py-0.5 rounded-md">
                              {t.id}
                            </span>
                            <span className={cn(
                              "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md",
                              t.phase === 'REGISTRATION' ? "bg-purple-50 text-purple-600 border border-purple-100" :
                              t.phase === 'PRE_EXAM' ? "bg-blue-50 text-blue-600 border border-blue-100" :
                              "bg-red-50 text-philsa-red border border-red-100"
                            )}>
                              {t.phase.replace('_', ' ')}
                            </span>
                            
                            {t.assignedTo && (
                              <span className="text-[8px] font-bold bg-slate-100 border border-slate-200 text-slate-500 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <User className="w-2.5 h-2.5" /> {t.assignedTo}
                              </span>
                            )}
                          </div>

                          <div>
                            <h4 className="text-sm font-bold text-philsa-navy group-hover:text-philsa-red transition-colors">
                              {t.subject}
                            </h4>
                            <p className="text-xs text-philsa-gray line-clamp-1 mt-0.5">
                              {t.description}
                            </p>
                          </div>

                          <div className="flex items-center gap-4 text-[10px] text-slate-400 font-medium">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-400" /> {t.candidateName || 'Pending user'} 
                              {t.candidateId && <span className="font-mono opacity-70">({t.candidateId})</span>}
                            </span>
                            <span>•</span>
                            <span>{new Date(t.createdAt).toLocaleDateString()} at {new Date(t.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          </div>
                        </div>

                        {/* Status + CTA block */}
                        <div className="flex items-center justify-between md:justify-end gap-3 md:text-right">
                          <span className={cn(
                            "text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full flex items-center gap-1.5 shadow-inner",
                            t.status === 'OPEN' ? "bg-red-50 text-philsa-red" :
                            t.status === 'IN_PROGRESS' ? "bg-amber-50 text-amber-600" :
                            "bg-emerald-50 text-emerald-600"
                          )}>
                            <span className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              t.status === 'OPEN' ? "bg-philsa-red animate-pulse" :
                              t.status === 'IN_PROGRESS' ? "bg-amber-500 animate-pulse" :
                              "bg-emerald-500"
                            )} />
                            {t.status.replace('_', ' ')}
                          </span>

                          <ChevronRight className={cn(
                            "w-5 h-5 text-slate-300 transition-transform hidden md:block",
                            isSelected && "text-blue-500 translate-x-1"
                          )} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Sidebar Ticket Inspection & Active Audit Logs */}
          <div className="space-y-6">
            {/* Ticket Detail Panel */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 p-6 sm:p-8 shadow-xs">
              <AnimatePresence mode="wait">
                {selectedTicket ? (
                  <motion.div 
                    key={selectedTicket.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    {/* ID & Category */}
                    <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                      <div>
                        <span className="text-[10px] font-extrabold font-mono text-slate-400 uppercase tracking-widest">Selected Record</span>
                        <h3 className="text-xl font-black text-philsa-navy mt-0.5">{selectedTicket.id}</h3>
                      </div>
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full",
                        selectedTicket.priority === 'HIGH' ? "bg-red-50 text-philsa-red border border-red-100" :
                        selectedTicket.priority === 'MEDIUM' ? "bg-amber-50 text-amber-600 border border-amber-100" :
                        "bg-slate-50 text-slate-500 border border-slate-100"
                      )}>
                        {selectedTicket.priority} Priority
                      </span>
                    </div>

                    {/* Candidate Identity */}
                    <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-philsa-navy text-white rounded-xl flex items-center justify-center font-black text-sm">
                          {selectedTicket.candidateName?.[0] || 'P'}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-philsa-navy leading-tight">{selectedTicket.candidateName || 'Unknown User'}</p>
                          <p className="text-[10px] text-philsa-gray">Registered Email: {selectedTicket.contactEmail}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-[10px] border-t border-slate-200/50 pt-2.5 mt-2">
                        <div>
                          <span className="text-slate-400 block font-bold uppercase tracking-wider">Candidate ID</span>
                          <span className="font-mono text-philsa-navy font-bold">{selectedTicket.candidateId || 'NOT_REGISTERED'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-bold uppercase tracking-wider">Exam Room</span>
                          <span className="font-bold text-philsa-navy">{selectedTicket.examRoom || 'N/A (Remote)'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Issue Description */}
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Issue Reported</h4>
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                        <p className="text-xs font-black text-philsa-navy leading-relaxed">
                          {selectedTicket.subject}
                        </p>
                        <p className="text-xs text-slate-500 leading-relaxed whitespace-pre-line">
                          {selectedTicket.description}
                        </p>
                      </div>
                    </div>

                    {/* Telemetry metadata */}
                    {selectedTicket.deviceDetails && (
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                          <Laptop className="w-3.5 h-3.5" /> Client Sandbox Telemetry
                        </h4>
                        <div className="bg-slate-900 text-[#00ffcc] p-3 rounded-xl border border-slate-800 font-mono text-[9px] leading-relaxed break-all">
                          {selectedTicket.deviceDetails}
                        </div>
                      </div>
                    )}

                    {/* Quick Resolution Actions */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dispatch Resolution Panel</h4>
                      
                      <div className="flex flex-col gap-2">
                        {!selectedTicket.assignedTo ? (
                          <button 
                            onClick={handleAssignToSelf}
                            className="w-full bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-600 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <UserPlus className="w-4 h-4" /> Claim Ticket (Assign To Me)
                          </button>
                        ) : selectedTicket.assignedTo !== `${user?.firstName || 'Alexander'} Tech` ? (
                          <div className="text-center py-2.5 bg-slate-100 border border-slate-200 text-slate-500 rounded-xl text-[10px] font-bold">
                            Assigned to: <strong>{selectedTicket.assignedTo}</strong>
                          </div>
                        ) : (
                          <div className="text-center py-2.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl text-[10px] font-black uppercase tracking-wider">
                            ✓ Claimed by You
                          </div>
                        )}

                        <div className="grid grid-cols-3 gap-2">
                          <button 
                            onClick={() => handleStatusChange('OPEN')}
                            className={cn(
                              "py-2.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all cursor-pointer",
                              selectedTicket.status === 'OPEN' 
                                ? "bg-red-500 border-red-500 text-white shadow-xs" 
                                : "bg-white border-slate-200 hover:border-slate-300 text-slate-600"
                            )}
                          >
                            OPEN
                          </button>
                          <button 
                            onClick={() => handleStatusChange('IN_PROGRESS')}
                            className={cn(
                              "py-2.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all cursor-pointer",
                              selectedTicket.status === 'IN_PROGRESS' 
                                ? "bg-amber-500 border-amber-500 text-white shadow-xs" 
                                : "bg-white border-slate-200 hover:border-slate-300 text-slate-600"
                            )}
                          >
                            IN PROGRESS
                          </button>
                          <button 
                            onClick={() => handleStatusChange('RESOLVED')}
                            className={cn(
                              "py-2.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all cursor-pointer",
                              selectedTicket.status === 'RESOLVED' 
                                ? "bg-emerald-500 border-emerald-500 text-white shadow-xs" 
                                : "bg-white border-slate-200 hover:border-slate-300 text-slate-600"
                            )}
                          >
                            RESOLVED
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Chat log / resolution log */}
                    <div className="space-y-3 pt-4 border-t border-slate-100">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                        <span>Resolution Logs / Notes</span>
                        <span className="font-mono">{selectedTicket.notes?.length || 0} items</span>
                      </h4>

                      <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                        {(!selectedTicket.notes || selectedTicket.notes.length === 0) ? (
                          <p className="text-[10px] text-slate-400 italic">No notes logged yet. Log desk activity below.</p>
                        ) : (
                          selectedTicket.notes.map((note, idx) => (
                            <div key={idx} className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-[10px] leading-relaxed text-slate-600">
                              {note}
                            </div>
                          ))
                        )}
                      </div>

                      <form onSubmit={handleAddNote} className="flex gap-2">
                        <input 
                          type="text"
                          placeholder="Log desk action or notes..."
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                          className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-slate-300"
                        />
                        <button 
                          type="submit"
                          className="p-2 bg-slate-100 border border-slate-200 hover:bg-slate-200 text-philsa-navy rounded-xl transition-all cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    </div>

                  </motion.div>
                ) : (
                  <div className="text-center py-20 text-slate-300 space-y-4">
                    <LifeBuoy className="w-16 h-16 mx-auto stroke-1" />
                    <div>
                      <p className="font-bold text-slate-500 text-sm">No Ticket Selected</p>
                      <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                        Select a support case from the queue to inspect applicant credentials, view hardware telemetry, and execute resolving actions.
                      </p>
                    </div>
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* Support Logs Auditing */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-philsa-navy">Audited Support Actions</h3>
                <p className="text-[10px] text-philsa-gray">Automated audit ledger tracks all helpdesk submissions & modifications</p>
              </div>

              <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-1">
                {supportLogs.map((log) => (
                  <div key={log.id} className="text-[10px] leading-relaxed border-b border-slate-100 pb-2.5 last:border-0 last:pb-0">
                    <div className="flex justify-between text-slate-400 font-medium">
                      <span className="font-mono text-philsa-red font-black uppercase tracking-widest">{log.action}</span>
                      <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-slate-600 mt-1">{log.details}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* MANUAL TICKET CREATION MODAL */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-philsa-navy/80 backdrop-blur-md flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] p-8 max-w-lg w-full relative overflow-hidden shadow-2xl"
            >
              <button 
                onClick={() => setShowCreateModal(false)}
                className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center font-bold cursor-pointer"
              >
                ✕
              </button>

              <div className="flex items-center gap-4 mb-6 border-b border-slate-100 pb-4">
                <div className="w-12 h-12 bg-red-50 text-philsa-red rounded-2xl flex items-center justify-center">
                  <LifeBuoy className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-philsa-navy uppercase tracking-tight">Manual Incident Dispatch</h3>
                  <p className="text-xs text-philsa-gray">Create an incident ticket for telephone or walk-in helpdesk queries</p>
                </div>
              </div>

              <form onSubmit={handleCreateTicketSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Candidate Name</label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. John Doe"
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-philsa-navy focus:outline-none focus:ring-1 focus:ring-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Contact Email</label>
                    <input 
                      type="email"
                      required
                      placeholder="doe@philsa.edu.ph"
                      value={createEmail}
                      onChange={(e) => setCreateEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-philsa-navy focus:outline-none focus:ring-1 focus:ring-slate-300"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Candidate ID (Optional)</label>
                    <input 
                      type="text"
                      placeholder="CAND-2026-9901"
                      value={createCandidateId}
                      onChange={(e) => setCreateCandidateId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-philsa-navy focus:outline-none focus:ring-1 focus:ring-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Exam Room (Optional)</label>
                    <input 
                      type="text"
                      placeholder="Benitez Room 102"
                      value={createRoom}
                      onChange={(e) => setCreateRoom(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-philsa-navy focus:outline-none focus:ring-1 focus:ring-slate-300"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Workflow Phase</label>
                    <select 
                      value={createPhase}
                      onChange={(e: any) => setCreatePhase(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-philsa-navy focus:outline-none focus:ring-1 focus:ring-slate-300"
                    >
                      <option value="REGISTRATION">Student Registration Form</option>
                      <option value="PRE_EXAM">Pre-Exam (Device Readiness)</option>
                      <option value="LIVE_EXAM">Active Examination Block</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Severity / Priority</label>
                    <select 
                      value={createPriority}
                      onChange={(e: any) => setCreatePriority(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-philsa-navy focus:outline-none focus:ring-1 focus:ring-slate-300"
                    >
                      <option value="LOW">Low priority</option>
                      <option value="MEDIUM">Medium priority</option>
                      <option value="HIGH">High priority / Critical</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Incident Subject</label>
                  <input 
                    type="text"
                    required
                    placeholder="Brief summary of issue (e.g. Lost LRN, biometric loop)"
                    value={createSubject}
                    onChange={(e) => setCreateSubject(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-philsa-navy focus:outline-none focus:ring-1 focus:ring-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Full Description</label>
                  <textarea 
                    required
                    rows={3}
                    placeholder="Please log all details received from telephone caller or candidate walk-in..."
                    value={createDesc}
                    onChange={(e) => setCreateDesc(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-philsa-navy focus:outline-none focus:ring-1 focus:ring-slate-300 resize-none"
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 btn-primary !bg-philsa-navy hover:!bg-slate-800 py-3 !rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg active:scale-95"
                  >
                    Create Ticket
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
