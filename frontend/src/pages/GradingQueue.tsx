import { useState } from 'react';
import { usePhilSA } from '../PhilSAContext';
import { useMockData } from '../services/mockService';
import { Edit3, CheckCircle, Clock, AlertTriangle, FileText, Search, Filter } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export default function GradingQueue() {
  const { addAuditLog } = usePhilSA();
  const [selectedEssayId, setSelectedEssayId] = useState<string | null>(null);
  const [score, setScore] = useState('');

  // Mock Essay Submissions
  const [essays, setEssays] = useState([
    { id: 'sub1', candidate: 'PH-2026-0001', subject: 'Social Science', prompt: 'Discuss the impact of digital transformation on governance.', response: 'Digital transformation has significantly altered how governments interact with citizens. In the Philippines, the transparency provided by digital tools has increased accountability...', status: 'PENDING' },
    { id: 'sub2', candidate: 'PH-2026-0412', subject: 'English', prompt: 'Write an argumentative essay on sustainable energy.', response: 'Sustainable energy is not just an environmental necessity but an economic one. As non-renewable resources dwindle, the shift to solar and wind power becomes...', status: 'PENDING' },
  ]);

  const handleGrade = () => {
    setEssays(prev => prev.map(e => e.id === selectedEssayId ? { ...e, status: 'GRADED' } : e));
    addAuditLog('GRADING_SUBMITTED', `Grader scored essay ${selectedEssayId} with ${score} points.`);
    setSelectedEssayId(null);
    setScore('');
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-philsa-navy mb-2">Manual Grading Queue</h1>
        <p className="text-philsa-gray">Review and score subjective responses based on provided rubrics.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="card-philsa !p-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-yellow-50 text-yellow-600 rounded-xl flex items-center justify-center border border-yellow-100">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-philsa-gray font-bold uppercase tracking-widest">Pending Review</p>
            <p className="text-xl font-black text-philsa-navy">12 Items</p>
          </div>
        </div>
        <div className="card-philsa !p-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center border border-green-100">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-philsa-gray font-bold uppercase tracking-widest">Completed Today</p>
            <p className="text-xl font-black text-philsa-navy">48 Items</p>
          </div>
        </div>
        <div className="card-philsa !p-6 flex items-center gap-4 text-philsa-red">
          <div className="w-12 h-12 bg-philsa-red/10 text-philsa-red rounded-xl flex items-center justify-center border border-philsa-red/20">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-philsa-gray font-bold uppercase tracking-widest">Priority Escalations</p>
            <p className="text-xl font-black">2 Items</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-philsa-border overflow-hidden">
        <div className="p-6 border-b border-philsa-border flex justify-between items-center bg-philsa-bg/30">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-philsa-gray" />
              <input type="text" placeholder="Filter queue..." className="bg-white border border-philsa-border rounded-xl pl-11 pr-4 py-2 text-sm" />
            </div>
          </div>
          <button className="btn-secondary py-2 px-4 text-xs font-bold flex items-center gap-2"><Filter className="w-4 h-4" /> Filter By Subject</button>
        </div>

        <div className="divide-y divide-philsa-border">
          {essays.map((essay) => (
            <div key={essay.id} className="p-8 hover:bg-philsa-bg/30 transition-colors flex flex-col md:flex-row justify-between items-start gap-8">
              <div className="space-y-4 max-w-2xl">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-philsa-red bg-philsa-red/10 px-2 py-0.5 rounded uppercase">{essay.subject}</span>
                  <span className="text-xs font-bold text-philsa-navy uppercase">ID: {essay.candidate}</span>
                </div>
                <h3 className="text-lg font-extrabold text-philsa-navy line-clamp-1">{essay.prompt}</h3>
                <p className="text-sm font-medium text-philsa-gray line-clamp-2 leading-relaxed italic border-l-4 border-philsa-border pl-6">{essay.response}</p>
              </div>
              <div className="shrink-0 pt-2">
                {essay.status === 'GRADED' ? (
                  <div className="flex items-center gap-2 text-green-600 font-bold text-sm">
                    <CheckCircle className="w-5 h-5" /> Graded
                  </div>
                ) : (
                  <button 
                    onClick={() => setSelectedEssayId(essay.id)}
                    className="btn-primary !py-2.5 !px-8 text-sm flex items-center gap-2"
                  >
                    <Edit3 className="w-4 h-4" /> Start Grading
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Grading Modal */}
      {selectedEssayId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-philsa-navy/60 backdrop-blur-md">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-philsa-bg rounded-[3rem] shadow-2xl w-full max-w-5xl h-[90vh] flex overflow-hidden">
            <div className="flex-1 p-12 overflow-y-auto space-y-10 bg-white">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <span className="text-xs font-bold text-philsa-red uppercase tracking-widest">Essay Evaluation</span>
                  <h2 className="text-3xl font-extrabold text-philsa-navy leading-tight">
                    {essays.find(e => e.id === selectedEssayId)?.prompt}
                  </h2>
                </div>
                <button onClick={() => setSelectedEssayId(null)} className="p-2 hover:bg-philsa-bg rounded-full"><Clock className="w-6 h-6 text-philsa-gray" /></button>
              </div>

              <div className="p-10 bg-philsa-bg rounded-[2rem] border border-philsa-border min-h-[400px]">
                <p className="text-lg font-medium text-philsa-navy leading-relaxed whitespace-pre-wrap">
                  {essays.find(e => e.id === selectedEssayId)?.response}
                </p>
              </div>
            </div>

            <div className="w-[400px] border-l border-philsa-border p-10 flex flex-col justify-between bg-philsa-bg/50">
              <div className="space-y-8">
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-philsa-gray uppercase tracking-widest border-b border-philsa-border pb-2">Grading Rubric</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs"><span>Content Clarity</span><span className="font-bold">40%</span></div>
                    <div className="flex justify-between text-xs"><span>Logical Structure</span><span className="font-bold">30%</span></div>
                    <div className="flex justify-between text-xs"><span>Evidence/Examples</span><span className="font-bold">30%</span></div>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-bold text-philsa-navy uppercase tracking-widest">Award Score (0 - 100)</label>
                  <input 
                    type="number" 
                    className="w-full bg-white border-2 border-philsa-border rounded-2xl p-6 text-4xl font-black text-center focus:border-philsa-red outline-hidden transition-all"
                    placeholder="00"
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-philsa-navy uppercase tracking-widest">Feedback to Candidate</label>
                  <textarea className="input-philsa border-philsa-border min-h-[120px] text-sm" placeholder="Provide constructive feedback..."></textarea>
                </div>
              </div>

              <div className="space-y-3">
                <button 
                  onClick={handleGrade}
                  className="btn-primary w-full !py-4 font-extrabold uppercase tracking-widest flex items-center justify-center gap-3"
                >
                  <CheckCircle className="w-5 h-5" /> Submit Grade
                </button>
                <button onClick={() => setSelectedEssayId(null)} className="w-full font-bold text-philsa-gray text-sm py-2">Save as Draft</button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
