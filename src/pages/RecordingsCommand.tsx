import React, { useState } from 'react';
import { 
  Video, Search, Filter, PlayCircle, 
  ChevronRight, Calendar, User, Building,
  Clock, MoreVertical, FileText, Download
} from 'lucide-react';
import { usePhilSA } from '../PhilSAContext';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';

const SESSIONS_MOCK = [
  { id: 'SES-2026-901', univ: 'UP Diliman', exam: 'National Aptitude Test', date: '2026-05-15', duration: '03:15:00', examinees: 120, status: 'COMPLETED' },
  { id: 'SES-2026-902', univ: 'UST Manila', exam: 'Entrance Examination', date: '2026-05-15', duration: '03:00:00', examinees: 450, status: 'COMPLETED' },
  { id: 'SES-2026-903', univ: 'DLSU Manila', exam: 'Scholarship Grant', date: '2026-05-14', duration: '02:45:00', examinees: 85, status: 'ARCHIVED' },
  { id: 'SES-2026-904', univ: 'PUP Manila', exam: 'Departmental Quiz', date: '2026-05-14', duration: '01:30:00', examinees: 1200, status: 'COMPLETED' },
  { id: 'SES-2026-905', univ: 'UP Los Baños', exam: 'Forestry Entrance', date: '2026-05-13', duration: '03:00:00', examinees: 64, status: 'COMPLETED' },
];

export default function RecordingsCommand() {
  const { user } = usePhilSA();
  const isUnivAdmin = user?.role === 'UNIVERSITY_ADMIN';
  
  const filteredSessions = isUnivAdmin 
    ? SESSIONS_MOCK.filter(s => s.univ.includes(user?.university?.split(' ')[0] || ''))
    : SESSIONS_MOCK;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-philsa-navy tracking-tight leading-none mb-3">
             Recording Archive
          </h1>
          <p className="text-philsa-gray font-medium max-w-2xl">
             Access historical and completed examination session recordings for manual review and audit.
          </p>
        </div>
        <div className="flex items-center gap-3">
           <button className="px-6 py-3 bg-philsa-navy text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-philsa-navy/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
              <Download className="w-4 h-4" /> Batch Export
           </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
         <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-philsa-gray" />
            <input 
              type="text" 
              placeholder="Search by Session ID, University, or Examination..." 
              className="w-full bg-white border border-philsa-border rounded-2xl pl-12 pr-4 py-4 text-sm font-medium focus:ring-2 focus:ring-philsa-navy/20 outline-none shadow-sm transition-all"
            />
         </div>
         <div className="flex gap-3 shrink-0">
            <button className="h-14 px-6 bg-philsa-bg border border-philsa-border rounded-2xl text-philsa-navy font-bold text-xs flex items-center gap-2">
               <Filter className="w-4 h-4" /> Filter By Date
            </button>
            <button className="h-14 px-6 bg-philsa-bg border border-philsa-border rounded-2xl text-philsa-navy font-bold text-xs flex items-center gap-2">
               <Building className="w-4 h-4" /> All Institutions
            </button>
         </div>
      </div>

      {/* Manual Content Table */}
      <div className="card-philsa !p-0 overflow-hidden shadow-2xl shadow-philsa-navy/5">
         <table className="w-full text-left">
            <thead className="bg-philsa-bg/50 text-[10px] text-philsa-gray font-black uppercase tracking-widest border-b border-philsa-border">
               <tr>
                  <th className="px-8 py-6">Session Detail</th>
                  <th className="px-8 py-6">Institution</th>
                  <th className="px-8 py-6">Examinees</th>
                  <th className="px-8 py-6">Duration</th>
                  <th className="px-8 py-6">Data Status</th>
                  <th className="px-10 py-6 text-right">Review</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-philsa-border">
               {filteredSessions.map((session) => (
                 <tr key={session.id} className="hover:bg-philsa-bg/30 transition-colors group">
                    <td className="px-8 py-7">
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-philsa-navy/5 rounded-xl flex items-center justify-center text-philsa-navy shadow-inner group-hover:bg-philsa-navy group-hover:text-white transition-all">
                             <Video className="w-5 h-5" />
                          </div>
                          <div>
                             <p className="text-sm font-black text-philsa-navy tracking-tight">{session.exam}</p>
                             <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] font-black text-philsa-gray uppercase tracking-widest leading-none">{session.id}</span>
                                <span className="w-1 h-1 bg-philsa-border rounded-full" />
                                <span className="text-[9px] font-black text-philsa-gray uppercase tracking-widest leading-none bg-philsa-bg px-1.5 py-0.5 rounded">{session.date}</span>
                             </div>
                          </div>
                       </div>
                    </td>
                    <td className="px-8 py-7">
                       <p className="text-xs font-bold text-philsa-navy tracking-tight uppercase">{session.univ}</p>
                    </td>
                    <td className="px-8 py-7">
                       <p className="text-xs font-black text-philsa-navy">{session.examinees.toLocaleString()}</p>
                       <p className="text-[10px] text-philsa-gray font-bold uppercase tracking-widest">Profiles</p>
                    </td>
                    <td className="px-8 py-7">
                       <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-philsa-gray" />
                          <span className="text-xs font-black text-philsa-navy tracking-tight">{session.duration}</span>
                       </div>
                    </td>
                    <td className="px-8 py-7">
                       <span className={cn(
                          "px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
                          session.status === 'COMPLETED' ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-slate-50 text-slate-500 border-slate-200"
                       )}>
                          {session.status}
                       </span>
                    </td>
                    <td className="px-10 py-7 text-right">
                       <div className="flex items-center justify-end gap-2">
                          <Link 
                            to={`/admin/recordings/playback/${session.id}`}
                            className="p-3 bg-philsa-bg hover:bg-philsa-navy hover:text-white text-philsa-navy rounded-xl transition-all border border-philsa-border shadow-sm"
                          >
                             <PlayCircle className="w-5 h-5" />
                          </Link>
                          <button className="p-3 bg-white hover:bg-philsa-bg text-philsa-navy rounded-xl transition-colors border border-philsa-border shadow-sm">
                             <MoreVertical className="w-5 h-5" />
                          </button>
                       </div>
                    </td>
                 </tr>
               ))}
            </tbody>
         </table>
      </div>
      
      {/* Simple Information Footer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {[
           { label: 'Storage Usage', value: '42.1 TB / 100 TB', desc: 'Secure data lake utilization' },
           { label: 'Review Queue', value: '14 Sessions', desc: 'Pending manual institutional audit' },
           { label: 'Retention Status', value: 'Compliant', desc: 'All data within legal hold period' },
         ].map((info, i) => (
           <div key={i} className="p-6 rounded-2xl border border-philsa-border bg-white flex items-start gap-4">
              <div className="p-3 bg-philsa-bg rounded-xl">
                 <FileText className="w-5 h-5 text-philsa-gray" />
              </div>
              <div>
                 <p className="text-[11px] font-black text-philsa-navy uppercase tracking-widest mb-1">{info.label}</p>
                 <p className="text-lg font-black text-philsa-navy tracking-tight leading-none mb-1">{info.value}</p>
                 <p className="text-[10px] text-philsa-gray font-medium uppercase tracking-wider">{info.desc}</p>
              </div>
           </div>
         ))}
      </div>
    </div>
  );
}
