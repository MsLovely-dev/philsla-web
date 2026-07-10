import { usePhilSA } from '../PhilSAContext';
import { useMockData } from '../services/mockService';
import { Target, Trophy, FileText, Search, BarChart, Download, CheckCircle, Clock } from 'lucide-react';
import { ResponsiveContainer, BarChart as ReBarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { cn } from '../lib/utils';

export default function ResultsPage() {
  const { user } = usePhilSA();

  // Mock Result Data
  const RESULTS = [
    { subject: 'Verbal Logic', score: 88, average: 75 },
    { subject: 'Quantitative', score: 92, average: 68 },
    { subject: 'Abstract', score: 84, average: 72 },
    { subject: 'Soc. Sci', score: 95, average: 70 },
  ];

  const totalScore = RESULTS.reduce((acc, curr) => acc + curr.score, 0) / 4;
  const isQualified = totalScore >= 85;

  return (
    <div className="max-w-6xl mx-auto space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-philsa-navy mb-2">Performance & Assessment Report</h1>
          <p className="text-philsa-gray font-medium">Candidate ID: <span className="font-bold text-philsa-navy">{user?.candidateId}</span> • 2026 Admissions</p>
        </div>
        <button className="btn-secondary flex items-center gap-2">
          <Download className="w-5 h-5" /> Export Official Transcript
        </button>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        <div className="col-span-1 md:col-span-3 card-philsa !p-10 flex flex-col md:flex-row items-center gap-12">
          <div className="shrink-0 relative">
             <div className="w-40 h-40 rounded-full border-8 border-philsa-bg flex flex-col items-center justify-center text-center">
                <p className="text-[10px] text-philsa-gray font-bold uppercase tracking-widest mt-2">Final Rating</p>
                <p className="text-5xl font-black text-philsa-navy">{totalScore.toFixed(1)}</p>
             </div>
             <div className="absolute inset-0 border-8 border-philsa-red rounded-full border-t-transparent border-r-transparent animate-pulse" />
          </div>
          <div className="flex-1 space-y-6">
            <div className="flex items-center gap-4">
               <div className={cn(
                 "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-[0.2em]",
                 isQualified ? "bg-philsa-success text-white" : "bg-red-500 text-white"
               )}>
                 {isQualified ? 'Admission Qualified' : 'Below Cutoff'}
               </div>
               <span className="text-philsa-gray font-bold text-xs uppercase tracking-widest">Released: May 02, 2026</span>
            </div>
            <h2 className="text-2xl font-extrabold text-philsa-navy">Congratulations, {user?.firstName}!</h2>
            <p className="text-philsa-gray leading-relaxed font-medium">
              Based on your cumulative score of <span className="font-bold text-philsa-navy">{totalScore.toFixed(1)}%</span>, you have exceeded the minimum admission percentile of 85.0. You are now eligible to proceed with the university enrollment process.
            </p>
          </div>
        </div>

        <div className="card-philsa !p-8 bg-philsa-navy text-white space-y-8">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">National Percentile</p>
          <div className="space-y-2">
            <h3 className="text-5xl font-black">98.2</h3>
            <p className="text-sm font-medium text-gray-400">Top 1.8% of all 2026 examinees</p>
          </div>
          <div className="pt-8 border-t border-white/10 space-y-4">
             <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">Ranking</span>
                <span className="font-bold">#1,420 of 120,450</span>
             </div>
             <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">Tier</span>
                <span className="font-bold text-philsa-red brightness-150">Summit Scholar</span>
             </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-10">
        <div className="card-philsa p-10 h-[400px] flex flex-col">
          <h3 className="text-sm font-bold text-philsa-gray uppercase tracking-widest mb-8 flex items-center gap-2">
            <BarChart className="w-4 h-4 text-philsa-red" /> Subject Analysis
          </h3>
          <div className="flex-1 w-full text-[10px]">
            <ResponsiveContainer width="100%" height="100%">
              <ReBarChart data={RESULTS} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="subject" axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} />
                <Tooltip 
                   cursor={{ fill: 'rgba(235, 235, 235, 0.4)' }}
                   contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '12px' }}
                />
                <Bar dataKey="score" fill="#8B0D11" radius={[8, 8, 0, 0]} name="Your Score" />
                <Bar dataKey="average" fill="#cbd5e1" radius={[8, 8, 0, 0]} name="National Avg" />
              </ReBarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-sm font-bold text-philsa-gray uppercase tracking-widest ml-2 flex items-center gap-2">
             <Target className="w-4 h-4 text-philsa-red" /> Subject Mastery Breakdown
          </h3>
          <div className="grid grid-cols-1 gap-4">
            {RESULTS.map((res) => (
              <div key={res.subject} className="bg-white rounded-2xl border border-philsa-border p-6 flex items-center justify-between">
                <div>
                  <p className="font-bold text-philsa-navy">{res.subject}</p>
                  <p className="text-xs text-philsa-gray mt-1">Difficulty: High Participation</p>
                </div>
                <div className="text-right">
                   <p className={cn("text-xl font-black", res.score >= 90 ? "text-green-600" : "text-philsa-navy")}>{res.score}</p>
                   <p className="text-[10px] font-bold text-philsa-gray uppercase">Points</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
