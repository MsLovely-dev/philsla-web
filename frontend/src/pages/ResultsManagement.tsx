import { usePhilSA } from '../PhilSAContext';
import { useMockData } from '../services/mockService';
import { ShieldCheck, BarChart2, CheckCircle, Download, FileSpreadsheet, Lock, Search, Eye, XCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export default function ResultsManagement() {
  const { addAuditLog } = usePhilSA();
  const { publishResults } = useMockData();

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-philsa-navy mb-2">Results & Qualification Governance</h1>
          <p className="text-philsa-gray">Review aggregate performance data and authorize official result releases.</p>
        </div>
        <div className="flex gap-3">
          <button className="btn-secondary flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4" /> Export Raw Scores
          </button>
          <button 
            onClick={publishResults}
            className="btn-primary bg-philsa-success hover:bg-green-700 flex items-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" /> Publish Results
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        {[
          { label: 'Total Examinees', val: '450,230', status: 'Optimal', color: 'text-philsa-navy' },
          { label: 'National Average', val: '74.2%', status: '+1.2% YoY', color: 'text-philsa-red' },
          { label: 'Overall Pass Rate', val: '62.5%', status: 'Stable', color: 'text-green-600' },
          { label: 'Batch Quota', val: '85%', status: 'Targeting', color: 'text-blue-600' },
        ].map((s, i) => (
          <div key={i} className="card-philsa !p-6 border-b-4 bg-white" style={{ borderBottomColor: i === 1 ? 'var(--color-philsa-red)' : i === 2 ? 'var(--color-philsa-success)' : 'var(--color-philsa-border)' }}>
            <p className="text-[10px] text-philsa-gray font-bold uppercase tracking-widest mb-3 leading-none">{s.label}</p>
            <h3 className={cn("text-3xl font-black tracking-tighter", s.color)}>{s.val}</h3>
            <p className="text-[10px] font-bold mt-2 uppercase tracking-wide opacity-60">{s.status}</p>
          </div>
        ))}
      </div>

      <div className="card-philsa !p-10">
        <h3 className="text-sm font-bold text-philsa-navy uppercase tracking-widest mb-10 border-l-4 border-philsa-red pl-4">Subject Area Performance Matrix</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          {[
            { label: 'English Proficiency', score: 78, color: 'bg-blue-600' },
            { label: 'Quantitative Math', score: 64, color: 'bg-philsa-red' },
            { label: 'Integrated Science', score: 72, color: 'bg-green-600' },
            { label: 'Reading Comp.', score: 81, color: 'bg-yellow-500' },
          ].map((subj) => (
            <div key={subj.label} className="text-center space-y-4">
              <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                 <svg className="w-full h-full -rotate-90">
                    <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-philsa-bg" />
                    <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" 
                      strokeDasharray={2 * Math.PI * 40}
                      strokeDashoffset={2 * Math.PI * 40 * (1 - subj.score / 100)}
                      className={cn(subj.color.replace('bg-', 'text-'))} 
                    />
                 </svg>
                 <span className="absolute inset-0 flex items-center justify-center text-xl font-black text-philsa-navy">{subj.score}%</span>
              </div>
              <p className="text-[10px] font-black text-philsa-navy uppercase tracking-widest leading-tight">{subj.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-philsa-border overflow-hidden shadow-sm">
        <div className="p-8 border-b border-philsa-border flex flex-col md:flex-row md:items-center justify-between gap-6 bg-philsa-bg/30">
           <div className="flex items-center gap-4 flex-1">
              <div className="relative w-full max-w-md">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-philsa-gray" />
                 <input type="text" placeholder="Search by Student ID or Legal Name..." className="w-full bg-white border border-philsa-border rounded-xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-philsa-red/10" />
              </div>
              <select className="bg-white border border-philsa-border rounded-xl px-4 py-3 text-xs font-black text-philsa-navy uppercase">
                 <option>All Batch 2026-A</option>
                 <option>By Region: NCR</option>
              </select>
           </div>
           <div className="flex gap-2">
             <button className="btn-secondary text-[10px] uppercase font-black px-6">Filter Results</button>
           </div>
        </div>
        <table className="w-full text-left">
          <thead className="bg-philsa-bg/50 text-[10px] text-philsa-gray font-bold uppercase tracking-widest">
            <tr>
              <th className="px-8 py-5">Student Identity</th>
              <th className="px-8 py-5">Assessment Cycle</th>
              <th className="px-8 py-5">Result Score</th>
              <th className="px-8 py-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-philsa-border">
             {[
               { id: '2026-F1-0042', name: 'Althea Reyes', exam: 'PhilSA GA-2026', score: 88.5, date: '2026-06-15' },
               { id: '2026-F1-0812', name: 'Benjamin Cruz', exam: 'PhilSA GA-2026', score: 72.4, date: '2026-06-15' },
               { id: '2026-F1-1204', name: 'Catherine Dionisio', exam: 'PhilSA GA-2026', score: 91.2, date: '2026-06-16' },
             ].map(student => (
               <tr key={student.id} className="hover:bg-philsa-bg/30 transition-colors">
                 <td className="px-8 py-5">
                    <p className="text-sm font-black text-philsa-navy">{student.name}</p>
                    <p className="text-[10px] text-philsa-gray font-bold uppercase tracking-widest">ID: {student.id}</p>
                 </td>
                 <td className="px-8 py-5">
                   <p className="text-xs font-bold text-philsa-navy">{student.exam}</p>
                   <p className="text-[10px] text-philsa-gray font-bold uppercase">{student.date}</p>
                 </td>
                 <td className="px-8 py-5">
                   <div className="flex items-center gap-2">
                      <span className={cn("text-lg font-black", student.score >= 75 ? "text-green-600" : "text-philsa-red")}>{student.score}</span>
                      <span className="text-[10px] font-bold text-philsa-gray/40">/ 100</span>
                   </div>
                 </td>
                 <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-2">
                       <button title="Send Score" className="p-2.5 text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-all border border-blue-100">
                          <Eye className="w-4 h-4" />
                       </button>
                       <button title="Hide Score" className="p-2.5 text-philsa-gray bg-philsa-bg rounded-xl hover:bg-white transition-all border border-philsa-border">
                          <Lock className="w-4 h-4" />
                       </button>
                       <button title="Delete Record" className="p-2.5 text-philsa-red bg-red-50 rounded-xl hover:bg-red-100 transition-all border border-red-100">
                          <XCircle className="w-4 h-4" />
                       </button>
                    </div>
                 </td>
               </tr>
             ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
