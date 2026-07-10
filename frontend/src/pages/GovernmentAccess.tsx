import React, { useState, useEffect } from 'react';
import { 
  Globe, ChevronDown, 
  GraduationCap, Briefcase, Command, 
  LayoutDashboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePhilSA } from '../PhilSAContext';
import { cn } from '../lib/utils';
import ChedDashboard from './admin/analytics/ChedDashboard';
import DepedDashboard from './admin/analytics/DepedDashboard';
import TesdaDashboard from './admin/analytics/TesdaDashboard';
import NationalDashboard from './admin/analytics/NationalDashboard';

// --- MAIN WRAPPER ---

export default function GovernmentAccess() {
  const { user } = usePhilSA();
  const [view, setView] = useState<'CHED' | 'DEPED' | 'TESDA' | 'NATIONAL' | 'NONE'>('NONE');
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);

  useEffect(() => {
    if (user?.email?.includes('ched')) setView('CHED');
    else if (user?.email?.includes('deped')) setView('DEPED');
    else if (user?.email?.includes('tesda')) setView('TESDA');
    else if (user?.email?.includes('executive') || user?.role === 'SYSTEM_ADMIN') setView('NATIONAL');
    else setView('CHED'); // Default fallback
  }, [user]);

  if (view === 'NONE') return (
    <div className="h-[70vh] flex flex-col items-center justify-center space-y-6">
       <div className="w-20 h-20 border-4 border-philsa-bg border-t-philsa-red rounded-full animate-spin" />
       <p className="font-black text-philsa-navy uppercase tracking-widest animate-pulse font-mono">Securing Agency Link...</p>
    </div>
  );

  const agencies = [
    { id: 'NATIONAL', name: 'National Overview', icon: Globe, color: 'text-philsa-red' },
    { id: 'CHED', name: 'Higher Education (CHED)', icon: GraduationCap, color: 'text-blue-600' },
    { id: 'DEPED', name: 'Basic Education (DEPED)', icon: Command, color: 'text-philsa-red' },
    { id: 'TESDA', name: 'Skills & Technical (TESDA)', icon: Briefcase, color: 'text-blue-600' },
  ];

  const currentAgency = agencies.find(a => a.id === view);

  return (
    <div className="min-h-screen space-y-6">
      {/* Global Agency Selector */}
      {(user?.role === 'SYSTEM_ADMIN' || user?.email?.includes('executive')) && (
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="relative">
            <button 
              onClick={() => setIsSelectorOpen(!isSelectorOpen)}
              className="flex items-center gap-4 px-8 py-4 bg-white border border-philsa-border rounded-[2rem] shadow-xl hover:shadow-2xl transition-all group transition-all"
            >
              <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center bg-philsa-bg transition-colors group-hover:bg-philsa-red group-hover:text-white", currentAgency?.color)}>
                {currentAgency ? <currentAgency.icon className="w-5 h-5" /> : <Globe className="w-5 h-5" />}
              </div>
              <div className="text-left">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">System Monitoring</p>
                <h4 className="text-base font-black text-philsa-navy tracking-tight leading-none flex items-center gap-3">
                  {currentAgency?.name || 'Select Agency'}
                  <ChevronDown className={cn("w-4 h-4 transition-transform text-slate-300", isSelectorOpen ? "rotate-180" : "")} />
                </h4>
              </div>
            </button>

            <AnimatePresence>
              {isSelectorOpen && (
                <motion.div 
                   initial={{ opacity: 0, y: 10, scale: 0.95 }}
                   animate={{ opacity: 1, y: 0, scale: 1 }}
                   exit={{ opacity: 0, y: 10, scale: 0.95 }}
                   className="absolute top-full left-0 mt-4 w-80 bg-white border border-philsa-border rounded-[2.5rem] shadow-[0_50px_100px_-20px_rgba(15,23,42,0.25)] z-[100] overflow-hidden p-4"
                >
                   <div className="p-4 mb-2">
                       <p className="text-[10px] font-black text-philsa-red uppercase tracking-[0.2em]">Select Coverage</p>
                   </div>
                  <div className="space-y-1">
                    {agencies.map((agency) => (
                      <button
                        key={agency.id}
                        onClick={() => {
                          setView(agency.id as any);
                          setIsSelectorOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center gap-4 p-5 rounded-3xl transition-all text-left group",
                          view === agency.id ? "bg-philsa-red text-white shadow-xl shadow-philsa-red/20" : "hover:bg-philsa-bg text-philsa-navy"
                        )}
                      >
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                          view === agency.id ? "bg-white/10" : "bg-philsa-bg group-hover:bg-white",
                          agency.color
                        )}>
                          <agency.icon className="w-6 h-6" />
                        </div>
                        <div>
                          <p className={cn("text-xs font-black uppercase tracking-tight", view === agency.id ? "text-white" : "text-philsa-navy")}>{agency.id}</p>
                          <p className={cn("text-[10px] font-medium leading-none mt-1", view === agency.id ? "text-white/50" : "text-slate-400")}>{agency.name}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-4">
             <div className="hidden md:flex items-center gap-3 px-6 py-3 bg-white border border-philsa-border rounded-2xl">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse ring-4 ring-emerald-50" />
                <span className="text-[10px] font-black uppercase tracking-widest text-philsa-navy">Sync State: Good</span>
             </div>
             <button className="p-4 bg-philsa-navy text-white rounded-2xl hover:bg-philsa-navy/90 transition-all shadow-xl shadow-philsa-navy/20">
                <LayoutDashboard className="w-5 h-5" />
             </button>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {view === 'CHED' && (
          <motion.div key="ched" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <ChedDashboard />
          </motion.div>
        )}
        {view === 'DEPED' && (
          <motion.div key="deped" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <DepedDashboard />
          </motion.div>
        )}
        {view === 'TESDA' && (
          <motion.div key="tesda" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <TesdaDashboard />
          </motion.div>
        )}
        {view === 'NATIONAL' && (
          <motion.div key="nat" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
             <NationalDashboard />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
