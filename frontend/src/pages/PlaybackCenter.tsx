import React, { useState } from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, Maximize, 
  Settings, Shield, AlertTriangle, Clock,
  MoreVertical, ChevronRight, Bookmark,
  Monitor, Camera, MousePointer2, Layout,
  Activity, CheckCircle2, FileText, Info
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePhilSA } from '../PhilSAContext';
import { cn } from '../lib/utils';

const VIOLATIONS = [
  { time: '02:14', type: 'Manual Review Flag', severity: 'MEDIUM', desc: 'Proctor noted suspicious head movement at this timestamp.' },
  { time: '14:02', type: 'Communication', severity: 'HIGH', desc: 'Possible interaction with external person.' },
  { time: '28:45', type: 'Materials Check', severity: 'CRITICAL', desc: 'Unidentified physical materials visible in frame.' },
];

export default function PlaybackCenter() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = usePhilSA();
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeCamera, setActiveCamera] = useState<'front' | 'screen' | 'split'>('split');
  
  return (
    <div className="h-[calc(100vh-140px)] flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-700">
      {/* Top Info Bar */}
      <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-philsa-border shadow-xl shadow-philsa-navy/5">
         <div className="flex items-center gap-6">
            <button 
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-xl bg-philsa-bg flex items-center justify-center hover:bg-philsa-navy hover:text-white transition-all border border-philsa-border"
            >
               <SkipBack className="w-5 h-5" />
            </button>
            <div className="flex flex-col">
               <div className="flex items-center gap-3">
                  <h1 className="text-xl font-black tracking-tighter text-philsa-navy uppercase leading-none">Session Archive #<span className="text-philsa-red">{id}</span></h1>
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest rounded-full border border-emerald-100">Live Grid</span>
               </div>
               <p className="text-[10px] text-philsa-gray font-bold uppercase tracking-widest mt-1.5 flex items-center gap-2">
                  Examination: GAT-Alpha-2026 <span className="w-1 h-1 bg-philsa-border rounded-full" /> 12 Active Streams
               </p>
            </div>
         </div>
         <div className="flex items-center gap-3">
            <button className="px-6 py-2.5 bg-philsa-red text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-philsa-red/20 hover:scale-[1.02] active:scale-95 transition-all">
               Escalate Violation
            </button>
         </div>
      </div>

      <div className="flex-1 flex gap-8 min-h-0 overflow-hidden">
         {/* ZOOM GRID AREA */}
         <div className="flex-1 overflow-y-auto no-scrollbar pb-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-fr">
            {[
              { name: 'Juan P. Pangilinan', active: true, image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=facearea&facepad=2&w=400&h=400&q=80' },
              { name: 'Maria Elena Soriano', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=facearea&facepad=2&w=400&h=400&q=80' },
              { name: 'Ricardo M. Silva', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=facearea&facepad=2&w=400&h=400&q=80' },
              { name: 'Liza Monica Bautista', image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=facearea&facepad=2&w=400&h=400&q=80' },
              { name: 'Federico T. Guzman', image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=400&h=400&q=80' },
              { name: 'Yasmin O. Reyes', image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=facearea&facepad=2&w=400&h=400&q=80' },
              { name: 'Venus P. Santos', image: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=facearea&facepad=2&w=400&h=400&q=80' },
              { name: 'Catherine S. Cruz', image: 'https://images.unsplash.com/photo-1554151228-14d9def656e4?auto=format&fit=facearea&facepad=2&w=400&h=400&q=80' },
              { name: 'Hermogenes A. Alcasid', image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=facearea&facepad=2&w=400&h=400&q=80' },
              { name: 'Regina M. Velasquez', image: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=facearea&facepad=2&w=400&h=400&q=80' },
              { name: 'Pascual B. Piolo', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=facearea&facepad=2&w=400&h=400&q=80' },
              { name: 'Andrea C. Smith', image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=facearea&facepad=2&w=400&h=400&q=80' },
            ].map((student, i) => (
              <div 
                key={i} 
                className={cn(
                  "relative aspect-video bg-slate-900 rounded-2xl overflow-hidden border-2 transition-all group cursor-pointer",
                  student.active ? "border-emerald-500 shadow-lg shadow-emerald-500/10" : "border-philsa-border hover:border-white/30"
                )}
              >
                 <img referrerPolicy="no-referrer" src={student.image} className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" />
                 <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10">
                    <div className={cn("w-2 h-2 rounded-full", student.active ? "bg-emerald-500 animate-pulse" : "bg-philsa-gray")} />
                    <span className="text-[8px] font-black text-white uppercase tracking-widest">{student.name}</span>
                 </div>
              </div>
            ))}
         </div>

         {/* SIDE PANEL */}
         <div className="w-96 shrink-0 flex flex-col gap-6">
            <div className="card-philsa p-6 bg-white shrink-0 overflow-hidden flex flex-col border border-philsa-border shadow-2xl shadow-philsa-navy/5">
               <h3 className="text-[10px] font-black text-philsa-navy uppercase tracking-widest mb-6 border-b border-philsa-border pb-3">Security Alerts</h3>
               <div className="space-y-3 overflow-y-auto max-h-80 no-scrollbar">
                  {VIOLATIONS.map((v, i) => (
                    <div 
                      key={i}
                      className="w-full p-4 rounded-2xl bg-philsa-bg border border-philsa-border hover:border-philsa-red/40 transition-all text-left"
                    >
                       <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] font-black text-philsa-navy bg-white px-2 py-0.5 rounded border border-philsa-border shadow-sm">{v.time}</span>
                          <span className={cn(
                            "text-[8px] font-black uppercase tracking-wider",
                            v.severity === 'CRITICAL' ? 'text-philsa-red' : 
                            v.severity === 'HIGH' ? 'text-amber-600' : 'text-philsa-navy'
                          )}>{v.severity}</span>
                       </div>
                       <p className="text-xs font-black text-philsa-navy tracking-tight">{v.type}</p>
                    </div>
                  ))}
               </div>
            </div>

            <div className="card-philsa p-8 bg-philsa-bg border border-philsa-border relative overflow-hidden flex flex-col flex-1 min-h-0">
               <h3 className="text-xs font-black text-philsa-navy uppercase tracking-widest mb-6">Proctor Notes</h3>
               <textarea 
                 placeholder="Log observations..."
                 className="flex-1 w-full bg-white border border-philsa-border rounded-2xl p-6 text-sm font-medium text-philsa-navy outline-none focus:ring-4 focus:ring-philsa-navy/5 shadow-inner resize-none"
               />
               <button className="w-full mt-6 py-4 bg-philsa-navy text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Save Audit Evidence
               </button>
            </div>
         </div>
      </div>
    </div>
  );
}
