import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Layers, 
  Edit, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Archive, 
  RotateCcw,
  Download,
  MoreVertical,
  Type,
  Image as ImageIcon,
  Calculator,
  FileText,
  AlertCircle,
  Clock,
  Send,
  MessageSquare,
  ChevronDown,
  Eye,
  X,
  BookOpen,
  Sparkles,
  Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePhilSA } from '../../../PhilSAContext';
import { cn } from '../../../lib/utils';
import StimulusManagement from './StimulusManagement';
import BulkUpload from './BulkUpload';
import { MOCK_CENTRAL_ITEM_BANK } from './blueprintMockData';

type QuestionStatus = 'PENDING REVIEW' | 'APPROVED' | 'FOR CORRECTION' | 'PUBLISHED' | 'REJECTED';
type PersonaKey = 'EXAM_ADMIN' | 'SYSTEM_ADMIN' | 'REVIEWER';

interface Question {
  id: string;
  subject: string;
  type: string;
  points: number;
  status: QuestionStatus;
  author: string;
  content: string;
  options?: string[];
  idealAnswer?: string;
  topic?: string;
  difficulty?: string;
  competency?: string;
  typeCode?: string;
  score?: number;
  history?: { status: QuestionStatus; date: string; user: string; remark?: string }[];
  mediaUrl?: string;
}

const MOCK_QUESTIONS: Question[] = [
  { 
    id: 'Q-4421', 
    subject: 'Math', 
    type: 'Multiple Choice', 
    points: 5, 
    status: 'APPROVED', 
    author: 'R. Macaraeg', 
    content: 'What is the derivative of sin(x)?',
    options: ['cos(x)', '-cos(x)', 'tan(x)', 'sec(x)'],
    idealAnswer: 'cos(x)',
    topic: 'Calculus',
    difficulty: 'MED',
    competency: 'Evaluate asymptotic bounds and limit proofs',
    mediaUrl: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&auto=format&fit=crop',
    history: [
      { status: 'PENDING REVIEW', date: '2026-05-10', user: 'System' },
      { status: 'APPROVED', date: '2026-05-11', user: 'Admin' }
    ]
  },
  { 
    id: 'Q-4422', 
    subject: 'Science', 
    type: 'Multiple Choice', 
    points: 5, 
    status: 'PENDING REVIEW', 
    author: 'A. Dimayuga', 
    content: 'Which planet is known as the Red Planet?',
    options: ['Mars', 'Jupiter', 'Saturn', 'Venus'],
    idealAnswer: 'Mars',
    topic: 'Space Science',
    difficulty: 'LOW',
    competency: 'Recall national administrative structures',
    mediaUrl: 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=600&auto=format&fit=crop'
  },
  { 
    id: 'Q-4426', 
    subject: 'Science', 
    type: 'Multiple Choice', 
    points: 5, 
    status: 'PENDING REVIEW', 
    author: 'G. Balingit', 
    content: 'What is the approximate speed of light in a vacuum?',
    options: ['300,000 km/s', '150,000 km/s', '1,000,000 km/s', '3,000 km/s'],
    idealAnswer: '300,000 km/s',
    topic: 'Space Science',
    difficulty: 'LOW',
    competency: 'Recall national administrative structures'
  },
  { 
    id: 'Q-4427', 
    subject: 'Math', 
    type: 'Multiple Choice', 
    points: 5, 
    status: 'PENDING REVIEW', 
    author: 'F. de Guia', 
    content: 'What is the sum of angles in a flat triangle?',
    options: ['180 degrees', '90 degrees', '360 degrees', '270 degrees'],
    idealAnswer: '180 degrees',
    topic: 'Geometry',
    difficulty: 'LOW',
    competency: 'General Competency'
  },
  { 
    id: 'Q-4428', 
    subject: 'Reading Comp (English, Filipino)', 
    type: 'Multiple Choice', 
    points: 5, 
    status: 'PENDING REVIEW', 
    author: 'D. Alcantara', 
    content: 'Who was the first president of the Commonwealth of the Philippines?',
    options: ['Manuel L. Quezon', 'Emilio Aguinaldo', 'Jose P. Laurel', 'Sergio Osmeña'],
    idealAnswer: 'Manuel L. Quezon',
    topic: 'History',
    difficulty: 'LOW',
    competency: 'General Competency'
  },
  { 
    id: 'Q-4429', 
    subject: 'Lang Proficiency (English, Filipino)', 
    type: 'Multiple Choice', 
    points: 5, 
    status: 'PENDING REVIEW', 
    author: 'V. Catacutan', 
    content: 'What figure of speech is used in "The wind whispered through the trees"?',
    options: ['Personification', 'Metaphor', 'Simile', 'Hyperbole'],
    idealAnswer: 'Personification',
    topic: 'Figures of Speech',
    difficulty: 'LOW',
    competency: 'General Competency'
  },
  { 
    id: 'Q-4423', 
    subject: 'Reading Comp (English, Filipino)', 
    type: 'Reading Comprehension', 
    points: 10, 
    status: 'FOR CORRECTION', 
    author: 'E. Dimatulac', 
    content: 'Identify the main theme of the provided text.',
    options: ['Survival', 'Love', 'War', 'Peace'],
    idealAnswer: 'Survival',
    topic: 'Comprehension',
    difficulty: 'MED',
    competency: 'General Competency',
    history: [
      { status: 'FOR CORRECTION', date: '2026-05-12', user: 'Reviewer', remark: 'Check the grammar in option C' }
    ]
  },
  { id: 'Q-4424', subject: 'Math', type: 'Identification', points: 5, status: 'PUBLISHED', author: 'J. Panganiban', content: 'Solve for x: 2x + 4 = 10', idealAnswer: '3', topic: 'Algebra', difficulty: 'LOW', competency: 'General Competency' },
  { id: 'Q-4425', subject: 'Lang Proficiency (English, Filipino)', type: 'Essay', points: 20, status: 'REJECTED', author: 'B. Mangahas', content: 'Discuss the impact of the 1896 Revolution.', idealAnswer: 'The 1896 Revolution marked the beginning of organized resistance against Spanish colonial rule, leading to the birth of the first Philippine Republic...', topic: 'History', difficulty: 'HIGH', competency: 'General Competency' },
];

const STATUS_COLORS: Record<QuestionStatus, { bg: string; text: string; border: string; icon: any }> = {
  'PENDING REVIEW': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100', icon: Clock },
  'APPROVED': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-100', icon: CheckCircle },
  'FOR CORRECTION': { bg: 'bg-philsa-red/5', text: 'text-philsa-red', border: 'border-philsa-red/10', icon: AlertCircle },
  'PUBLISHED': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100', icon: Send },
  'REJECTED': { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', icon: XCircle },
};

const PERSONA_OPTIONS: Array<{ key: PersonaKey; label: string }> = [
  { key: 'EXAM_ADMIN', label: 'Exam Admin' },
  { key: 'SYSTEM_ADMIN', label: 'System Admin' },
  { key: 'REVIEWER', label: 'Reviewer' },
];

function personaFromRole(role?: string | null): PersonaKey {
  if (role === 'SYSTEM_ADMIN') return 'SYSTEM_ADMIN';
  if (role === 'ACADEMIC_REVIEWER' || role === 'ADMISSIONS_REVIEWER') return 'REVIEWER';
  return 'EXAM_ADMIN';
}

export default function QuestionBank() {
  const { user } = usePhilSA();
  const [activeBankTab, setActiveBankTab] = useState<'QUESTIONS' | 'STIMULI' | 'UPLOAD'>('QUESTIONS');
  const [searchTerm, setSearchTerm] = useState('');
  const [activePersona, setActivePersona] = useState<PersonaKey>(() => personaFromRole(user?.role));

  useEffect(() => {
    setActivePersona(personaFromRole(user?.role));
  }, [user?.role]);
  
  const [questions, setQuestions] = useState<Question[]>(() => {
    // Generate standard initial merged list
    const initialPool: Question[] = [...MOCK_QUESTIONS];
    MOCK_CENTRAL_ITEM_BANK.forEach(q => {
      if (!initialPool.some(item => item.id === q.id)) {
        initialPool.push({
          id: q.id,
          subject: q.subject,
          type: q.type === 'MCQ' ? 'Multiple Choice' : q.type === 'TF' ? 'True/False' : q.type === 'FIB' ? 'Identification' : 'Essay',
          typeCode: q.type,
          points: q.score,
          score: q.score,
          status: q.status === 'ACTIVE' ? 'APPROVED' : 'PENDING REVIEW',
          author: 'PhilSA Central',
          content: q.text,
          options: q.type === 'MCQ' ? ['Option A', 'Option B', 'Option C', 'Option D'] : [],
          idealAnswer: q.type === 'MCQ' ? 'Option A' : '',
          topic: q.topic,
          difficulty: q.difficulty === 'EASY' ? 'LOW' : q.difficulty === 'DIFFICULT' ? 'HIGH' : 'MED',
          competency: q.competency,
          history: []
        });
      }
    });

    const saved = localStorage.getItem('philsa_hub_questions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Question[];
        const parsedIds = new Set(parsed.map(q => q.id));
        const missing = initialPool.filter(q => !parsedIds.has(q.id));
        if (missing.length > 0) {
          return [...parsed, ...missing];
        }
        return parsed;
      } catch (e) {
        return initialPool;
      }
    }
    return initialPool;
  });

  useEffect(() => {
    localStorage.setItem('philsa_hub_questions', JSON.stringify(questions));
  }, [questions]);

  // Form state for adding new questions
  const [newType, setNewType] = useState('Multiple Choice');
  const [newSubject, setNewSubject] = useState('Science');
  const [newDifficulty, setNewDifficulty] = useState('MED');
  const [newPoints, setNewPoints] = useState(5);
  const [newContent, setNewContent] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [newCompetency, setNewCompetency] = useState('');
  const [newOptionA, setNewOptionA] = useState('');
  const [newOptionB, setNewOptionB] = useState('');
  const [newOptionC, setNewOptionC] = useState('');
  const [newOptionD, setNewOptionD] = useState('');
  const [newCorrectOption, setNewCorrectOption] = useState('A');

  const [examSets, setExamSets] = useState<any[]>(() => {
    const saved = localStorage.getItem('philsa_exam_sets_admin');
    const initialSets = [
      { id: 'SET-UP-2026-A', title: 'UP Entrance Exam - STEM Set A', questions: 120, totalPoints: 150, duration: 240, status: 'PUBLISHED', center: 'UP Diliman', questionIds: [] },
      { id: 'SET-UP-2026-B', title: 'UP Entrance Exam - HUMANITIES Set B', questions: 100, totalPoints: 120, duration: 180, status: 'DRAFT', center: 'UP Manila', questionIds: [] },
      { id: 'SET-UST-2026-1', title: 'USTET - General Batch 1', questions: 150, totalPoints: 200, duration: 300, status: 'PUBLISHED', center: 'UST Campus', questionIds: [] },
      { id: 'SET-ADMU-2026', title: 'ACET - Regular Set', questions: 120, totalPoints: 180, duration: 210, status: 'PUBLISHED', center: 'ADMU Loyola', questionIds: [] },
    ];
    return saved ? JSON.parse(saved) : initialSets;
  });

  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedSetId, setSelectedSetId] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('PENDING REVIEW');
  
  const [changingStatusItem, setChangingStatusItem] = useState<Question | null>(null);
  const [newStatus, setNewStatus] = useState<QuestionStatus | ''>('');
  const [correctionReason, setCorrectionReason] = useState('');
  const [viewingDetails, setViewingDetails] = useState<Question | null>(null);
  const [toastMessage, setToastMessage] = useState<string>('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [newMediaUrl, setNewMediaUrl] = useState('');
  const [dragOver, setDragOver] = useState(false);

  // Helper to check if current user can approve/change status
  const canApprove = true;

  const handleOpenAddModal = () => {
    setEditingId(null);
    setNewType('Multiple Choice');
    setNewSubject('Science');
    setNewDifficulty('MED');
    setNewPoints(5);
    setNewContent('');
    setNewTopic('');
    setNewCompetency('');
    setNewOptionA('');
    setNewOptionB('');
    setNewOptionC('');
    setNewOptionD('');
    setNewCorrectOption('A');
    setNewMediaUrl('');
    setIsAdding(true);
  };

  const handleEditClick = (q: Question) => {
    setEditingId(q.id);
    setNewType(q.type || 'Multiple Choice');
    setNewSubject(q.subject || 'Science');
    setNewDifficulty(q.difficulty === 'LOW' ? 'LOW' : q.difficulty === 'HIGH' ? 'HIGH' : 'MED');
    setNewPoints(q.points || 5);
    setNewContent(q.content || '');
    setNewTopic(q.topic || '');
    setNewCompetency(q.competency || '');
    setNewOptionA(q.options?.[0] || q.idealAnswer || '');
    setNewOptionB(q.options?.[1] || '');
    setNewOptionC(q.options?.[2] || '');
    setNewOptionD(q.options?.[3] || '');
    
    if (q.type === 'Multiple Choice') {
      const correctIdx = q.options?.indexOf(q.idealAnswer || '');
      if (correctIdx === 0) setNewCorrectOption('A');
      else if (correctIdx === 1) setNewCorrectOption('B');
      else if (correctIdx === 2) setNewCorrectOption('C');
      else if (correctIdx === 3) setNewCorrectOption('D');
      else setNewCorrectOption('A');
    } else if (q.type === 'True/False') {
      setNewCorrectOption(q.idealAnswer === 'True' ? 'A' : 'B');
    } else {
      setNewCorrectOption('A');
    }
    
    setNewMediaUrl(q.mediaUrl || '');
    setIsAdding(true);
  };

  const handleDeleteQuestion = (id: string) => {
    if (confirm(`Are you sure you want to delete question ${id}?`)) {
      setQuestions(prev => prev.filter(q => q.id !== id));
      setToastMessage(`Deleted question ${id} from Question Bank`);
      setTimeout(() => setToastMessage(''), 4000);
    }
  };

  const handleCancelAdd = () => {
    setIsAdding(false);
    setEditingId(null);
    setNewContent('');
    setNewTopic('');
    setNewCompetency('');
    setNewOptionA('');
    setNewOptionB('');
    setNewOptionC('');
    setNewOptionD('');
    setNewCorrectOption('A');
    setNewMediaUrl('');
  };

  const handleSaveNewQuestion = () => {
    if (!newContent.trim()) {
      alert('Please enter a question prompt.');
      return;
    }

    const options = newType === 'Multiple Choice' ? [newOptionA || 'Option A', newOptionB || 'Option B', newOptionC || 'Option C', newOptionD || 'Option D'] : [];
    let idealAnswer = '';
    if (newType === 'Multiple Choice') {
      if (newCorrectOption === 'A') idealAnswer = options[0];
      else if (newCorrectOption === 'B') idealAnswer = options[1];
      else if (newCorrectOption === 'C') idealAnswer = options[2];
      else idealAnswer = options[3];
    } else if (newType === 'True/False') {
      idealAnswer = newCorrectOption === 'A' ? 'True' : 'False';
    } else {
      idealAnswer = newOptionA;
    }

    // Determine type code for compatibility
    let typeCode = 'MCQ';
    if (newType === 'Multiple Choice') typeCode = 'MCQ';
    else if (newType === 'True/False') typeCode = 'TF';
    else if (newType === 'Identification') typeCode = 'FIB';
    else if (newType === 'Essay') typeCode = 'ESSAY';

    if (editingId) {
      // Edit mode
      setQuestions(prev => prev.map(q => {
        if (q.id === editingId) {
          return {
            ...q,
            subject: newSubject,
            type: newType,
            typeCode: typeCode,
            points: Number(newPoints) || 5,
            score: Number(newPoints) || 5,
            content: newContent,
            options,
            idealAnswer,
            topic: newTopic || 'General Topic',
            difficulty: newDifficulty === 'LOW' ? 'LOW' : newDifficulty === 'HIGH' ? 'HIGH' : 'MED',
            competency: newCompetency || 'General Competency',
            mediaUrl: newMediaUrl
          };
        }
        return q;
      }));
      setToastMessage(`Updated question ${editingId} in Question Bank!`);
      setEditingId(null);
    } else {
      // Add mode
      const newId = `Q-${Math.floor(4000 + Math.random() * 5999)}`;
      const newQuestionObj: Question = {
        id: newId,
        subject: newSubject,
        type: newType,
        typeCode: typeCode,
        points: Number(newPoints) || 5,
        score: Number(newPoints) || 5,
        status: 'APPROVED',
        author: user?.name || 'PhilSA Author',
        content: newContent,
        options,
        idealAnswer,
        topic: newTopic || 'General Topic',
        difficulty: newDifficulty === 'LOW' ? 'LOW' : newDifficulty === 'HIGH' ? 'HIGH' : 'MED',
        competency: newCompetency || 'General Competency',
        mediaUrl: newMediaUrl,
        history: [
          { status: 'PENDING REVIEW', date: new Date().toISOString().split('T')[0], user: user?.name || 'System' },
          { status: 'APPROVED', date: new Date().toISOString().split('T')[0], user: 'Admin' }
        ]
      };
      setQuestions(prev => [newQuestionObj, ...prev]);
      setToastMessage(`Created new question ${newId} in Question Bank!`);
    }

    setIsAdding(false);
    setTimeout(() => setToastMessage(''), 4000);

    // Reset Form
    setNewContent('');
    setNewTopic('');
    setNewCompetency('');
    setNewOptionA('');
    setNewOptionB('');
    setNewOptionC('');
    setNewOptionD('');
    setNewCorrectOption('A');
    setNewMediaUrl('');
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredQuestions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredQuestions.map(q => q.id));
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleStatusChangeSubmit = () => {
    if (!newStatus || !changingStatusItem) return;
    
    setQuestions(prev => prev.map(q => {
      if (q.id === changingStatusItem.id) {
        const updatedHistory = q.history ? [...q.history] : [];
        updatedHistory.push({
          status: newStatus,
          date: new Date().toISOString().split('T')[0],
          user: user?.name || 'Administrator',
          remark: correctionReason || undefined
        });
        return {
          ...q,
          status: newStatus,
          history: updatedHistory
        };
      }
      return q;
    }));

    setToastMessage(`Question ${changingStatusItem.id} status updated to ${newStatus}`);
    setTimeout(() => setToastMessage(''), 4000);

    setChangingStatusItem(null);
    setNewStatus('');
    setCorrectionReason('');
  };

  const handleQuickStatusUpdate = (q: Question, status: QuestionStatus) => {
    setChangingStatusItem(q);
    setNewStatus(status);
  };

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         q.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         q.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || q.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="card-philsa bg-white border border-philsa-border/70 p-5 sm:p-6 space-y-5 shadow-sm">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-philsa-red/10 text-philsa-red flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-4xl font-extrabold text-philsa-navy tracking-tight leading-none">
                  Question Bank
                </h1>
                <p className="text-xs font-medium text-philsa-gray uppercase tracking-widest opacity-70 mt-1">
                  Centralized repository for secure entrance examination items
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 justify-end">
            <div className="flex items-center gap-2 bg-philsa-bg p-1.5 rounded-2xl border border-philsa-border/40">
              <span className="text-[10px] font-black uppercase tracking-wider text-philsa-gray px-3">Active Persona:</span>
              {PERSONA_OPTIONS.map((persona) => (
                <button
                  key={persona.key}
                  onClick={() => setActivePersona(persona.key)}
                  className={`px-3 py-2 text-[10px] font-bold rounded-xl transition-all cursor-pointer ${
                    activePersona === persona.key
                      ? 'bg-philsa-navy text-white shadow-sm font-black'
                      : 'text-philsa-gray hover:text-philsa-navy hover:bg-philsa-border/20'
                  }`}
                >
                  {persona.label}
                </button>
              ))}
            </div>

            {activeBankTab === 'QUESTIONS' && (
              <>
                {questions.some(q => q.status === 'PENDING REVIEW') && (
                  <button
                    onClick={() => {
                      setQuestions(prev => prev.map(q => q.status === 'PENDING REVIEW' ? { ...q, status: 'APPROVED' } : q));
                      setToastMessage('Approved all pending questions in Question Bank!');
                      setTimeout(() => setToastMessage(''), 4000);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-md transition-all flex items-center gap-2 cursor-pointer"
                  >
                     <CheckCircle className="w-4 h-4" /> Approve All Pending Questions
                  </button>
                )}
                <button
                  onClick={handleOpenAddModal}
                  className="bg-philsa-red text-white px-8 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-philsa-red/20 hover:bg-philsa-red/90 transition-all flex items-center gap-2 cursor-pointer"
                >
                   <Plus className="w-5 h-5" /> Add New Item
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modern High-contrast Tabs */}
      <div className="flex border-b border-philsa-border gap-2">
        <button
          onClick={() => setActiveBankTab('QUESTIONS')}
          className={cn(
            "py-3.5 px-6 text-sm font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 relative cursor-pointer",
            activeBankTab === 'QUESTIONS'
              ? "border-philsa-red text-philsa-red font-black"
              : "border-transparent text-philsa-gray hover:text-philsa-navy"
          )}
        >
          <BookOpen className="w-4 h-4" /> Assessment Items
          {activeBankTab === 'QUESTIONS' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-philsa-red" />
          )}
        </button>
        <button
          onClick={() => setActiveBankTab('STIMULI')}
          className={cn(
            "py-3.5 px-6 text-sm font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 relative cursor-pointer",
            activeBankTab === 'STIMULI'
              ? "border-philsa-red text-philsa-red font-black"
              : "border-transparent text-philsa-gray hover:text-philsa-navy"
          )}
        >
          <Layers className="w-4 h-4" /> Shared Stimuli
          {activeBankTab === 'STIMULI' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-philsa-red" />
          )}
        </button>
        <button
          onClick={() => setActiveBankTab('UPLOAD')}
          className={cn(
            "py-3.5 px-6 text-sm font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 relative cursor-pointer",
            activeBankTab === 'UPLOAD'
              ? "border-philsa-red text-philsa-red font-black"
              : "border-transparent text-philsa-gray hover:text-philsa-navy"
          )}
        >
          <Shield className="w-4 h-4" /> Bulk Upload Center
          {activeBankTab === 'UPLOAD' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-philsa-red" />
          )}
        </button>
      </div>

      {activeBankTab === 'STIMULI' ? (
        <div className="animate-in fade-in duration-300">
          <StimulusManagement />
        </div>
      ) : activeBankTab === 'UPLOAD' ? (
        <div className="animate-in fade-in duration-300">
          <BulkUpload />
        </div>
      ) : (
        <>
          <div className="card-philsa !p-0 overflow-hidden shadow-xl shadow-philsa-navy/5">
        <div className="p-6 border-b border-philsa-border flex flex-wrap gap-4 items-center justify-between bg-white">
           <div className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-philsa-gray" />
              <input 
                type="text" 
                placeholder="Search by ID, subject, or content keyword..." 
                className="w-full bg-philsa-bg border-none rounded-xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-philsa-red/10 transition-all font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
           </div>
           <div className="flex gap-2">
             <select 
                className="bg-philsa-bg border border-philsa-border rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-philsa-navy hover:bg-white transition-all outline-none"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
             >
                <option value="ALL">All Statuses</option>
                <option value="PENDING REVIEW">Pending Review</option>
                <option value="APPROVED">Approved</option>
                <option value="FOR CORRECTION">For Correction</option>
                <option value="PUBLISHED">Published</option>
                <option value="REJECTED">Rejected</option>
             </select>
             <button className="btn-secondary py-2.5 px-4 text-xs font-black uppercase tracking-widest flex items-center gap-2">
               <Filter className="w-3 h-3" /> Advanced
             </button>
           </div>
        </div>

        {/* Dynamic Contextual Multi-Select Toolbar */}
        {selectedIds.length > 0 && (
          <div className="bg-white text-philsa-navy px-8 py-4.5 flex flex-wrap items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-300 border border-philsa-border rounded-2xl shadow-sm mb-6">
            <div className="flex items-center gap-3">
              <span className="bg-philsa-red/10 text-philsa-red px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider font-mono">
                {selectedIds.length} Selected
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button 
                onClick={() => setIsAssigning(true)}
                className="bg-philsa-navy hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                 <Layers className="w-3.5 h-3.5" /> Assign To Set
              </button>
              
              {statusFilter === 'PENDING REVIEW' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setQuestions(prev => prev.map(q => selectedIds.includes(q.id) ? { ...q, status: 'APPROVED' } : q));
                      setToastMessage(`Bulk Approved ${selectedIds.length} question(s) successfully!`);
                      setSelectedIds([]);
                      setTimeout(() => setToastMessage(''), 4000);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Approve Selected
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setQuestions(prev => prev.map(q => selectedIds.includes(q.id) ? { ...q, status: 'FOR CORRECTION' } : q));
                      setToastMessage(`Marked ${selectedIds.length} question(s) For Correction!`);
                      setSelectedIds([]);
                      setTimeout(() => setToastMessage(''), 4000);
                    }}
                    className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <AlertCircle className="w-3.5 h-3.5" /> For Correction
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setQuestions(prev => prev.map(q => selectedIds.includes(q.id) ? { ...q, status: 'REJECTED' } : q));
                      setToastMessage(`Bulk Rejected ${selectedIds.length} question(s) successfully!`);
                      setSelectedIds([]);
                      setTimeout(() => setToastMessage(''), 4000);
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Reject Selected
                  </button>
                </>
              )}
              
              <button 
                onClick={() => setSelectedIds([])}
                className="text-xs font-black text-slate-500 hover:text-philsa-navy uppercase tracking-wider ml-4 cursor-pointer transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-philsa-bg/50 text-[10px] text-philsa-gray font-black uppercase tracking-[0.2em] border-b border-philsa-border">
              <tr>
                <th className="px-8 py-5 w-10">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-philsa-border text-philsa-red focus:ring-philsa-red"
                    checked={filteredQuestions.length > 0 && selectedIds.length === filteredQuestions.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="px-5 py-5">Item</th>
                <th className="px-8 py-5">Type</th>
                <th className="px-8 py-5 text-center">Points</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5">Item Writer</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-philsa-border bg-white">
              {filteredQuestions.map((q) => {
                const statusInfo = STATUS_COLORS[q.status];
                const StatusIcon = statusInfo.icon;
                
                return (
                  <tr key={q.id} className={cn("hover:bg-philsa-bg/30 transition-colors group", selectedIds.includes(q.id) && "bg-philsa-red/5")}>
                    <td className="px-8 py-6">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-philsa-border text-philsa-red focus:ring-philsa-red"
                        checked={selectedIds.includes(q.id)}
                        onChange={() => toggleSelect(q.id)}
                      />
                    </td>
                    <td className="px-5 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-philsa-bg border border-philsa-border flex items-center justify-center font-black text-[10px] text-philsa-navy">
                          {q.id.split('-')[1]}
                        </div>
                        <div>
                          <p className="text-sm font-black text-philsa-navy mb-0.5 tracking-tight">{q.subject}</p>
                          <p className="text-[10px] text-philsa-gray font-black tracking-widest uppercase">{q.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex items-center gap-2">
                          {q.type === 'Multiple Choice' && <Type className="w-3.5 h-3.5 text-philsa-red" />}
                          {q.type === 'Essay' && <FileText className="w-3.5 h-3.5 text-blue-600" />}
                          {q.type === 'Mathematics' && <Calculator className="w-3.5 h-3.5 text-amber-600" />}
                          <span className="text-[10px] font-black text-philsa-navy uppercase tracking-widest">{q.type}</span>
                       </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                       <p className="text-sm font-black text-philsa-navy">{q.points}</p>
                    </td>
                    <td className="px-8 py-6">
                      <div className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full border shadow-sm transition-all",
                        statusInfo.bg, statusInfo.text, statusInfo.border
                      )}>
                        <StatusIcon className="w-3 h-3" />
                        <span className="text-[9px] font-black tracking-widest">{q.status}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                       <p className="text-xs font-black text-philsa-navy leading-none mb-1 tracking-tight">{q.author}</p>
                       <p className="text-[9px] text-philsa-gray font-black uppercase tracking-widest">Verified Writer</p>
                    </td>
                    <td className="px-8 py-6 text-right">
                       <div className="flex justify-end items-center gap-2">
                          {canApprove && (
                            <select 
                              value={q.status}
                              onChange={(e) => handleQuickStatusUpdate(q, e.target.value as QuestionStatus)}
                              className="bg-philsa-bg border border-philsa-border rounded-lg px-2 py-1 text-[9px] font-black uppercase tracking-tighter text-philsa-navy focus:ring-1 focus:ring-philsa-red outline-none cursor-pointer"
                            >
                              <option value="PENDING REVIEW">Pending</option>
                              <option value="APPROVED">Approve</option>
                              <option value="FOR CORRECTION">Correction</option>
                              <option value="PUBLISHED">Publish</option>
                              <option value="REJECTED">Reject</option>
                            </select>
                          )}
                          <button 
                             onClick={() => setViewingDetails(q)}
                             className="p-2 bg-white hover:bg-philsa-bg rounded-lg transition-all border border-philsa-border shadow-sm text-philsa-navy" title="View Details">
                             <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button 
                             onClick={() => handleEditClick(q)}
                             className="p-2 bg-white hover:bg-philsa-navy hover:text-white rounded-lg transition-all border border-philsa-border shadow-sm text-philsa-navy" title="Edit Question">
                             <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button 
                             onClick={() => handleDeleteQuestion(q.id)}
                             className="p-2 bg-white hover:bg-philsa-red hover:text-white rounded-lg transition-all border border-philsa-border shadow-sm text-philsa-red" title="Delete Question">
                             <Trash2 className="w-3.5 h-3.5" />
                          </button>
                       </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      </>
    )}

      <AnimatePresence>
        {/* Change Status / Confirmation Modal */}
        {changingStatusItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-philsa-navy/40 backdrop-blur-sm">
            <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.95 }}
               className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100"
            >
               <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-philsa-red/10 flex items-center justify-center shrink-0">
                     <AlertCircle className="w-4 h-4 text-philsa-red" />
                  </div>
                  <div>
                     <h3 className="text-sm font-bold text-philsa-navy">Confirm Question</h3>
                     <p className="text-[10px] text-slate-400 font-semibold font-mono">{changingStatusItem.id}</p>
                  </div>
               </div>
               
               <div className="p-6 space-y-4">
                  <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                     Are you sure you want to change the status of this question to <span className="text-philsa-red font-black">"{newStatus}"</span>?
                  </p>

                  {newStatus === 'FOR CORRECTION' && (
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Correction Notes *</label>
                        <textarea 
                           rows={3}
                           autoFocus
                           value={correctionReason}
                           onChange={(e) => setCorrectionReason(e.target.value)}
                           placeholder="Please specify what needs to be revised..."
                           className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-philsa-navy focus:bg-white focus:border-philsa-red/30 focus:ring-2 focus:ring-philsa-red/10 outline-none shadow-sm placeholder:text-slate-400 transition-all"
                        />
                     </div>
                  )}
                  
                  {newStatus === 'REJECTED' && (
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Rejection Reason *</label>
                        <textarea 
                           rows={3}
                           value={correctionReason}
                           onChange={(e) => setCorrectionReason(e.target.value)}
                           placeholder="Please specify the reason for rejection..."
                           className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-philsa-navy focus:bg-white focus:border-philsa-red/30 focus:ring-2 focus:ring-philsa-red/10 outline-none shadow-sm placeholder:text-slate-400 transition-all"
                        />
                     </div>
                  )}
               </div>

               <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-3 justify-end">
                  <button 
                     onClick={() => {
                        setChangingStatusItem(null);
                        setNewStatus('');
                        setCorrectionReason('');
                      }} 
                      className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
                  >
                     Cancel
                  </button>
                  <button 
                    onClick={handleStatusChangeSubmit}
                    disabled={!newStatus || ((newStatus === 'FOR CORRECTION' || newStatus === 'REJECTED') && !correctionReason.trim())}
                    className="px-5 py-2 bg-philsa-red text-white text-[10px] font-black uppercase tracking-wider rounded-xl shadow-lg shadow-philsa-red/10 hover:bg-philsa-red/90 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Apply Changes
                  </button>
               </div>
            </motion.div>
          </div>
        )}

        {/* Details View Modal */}
        {viewingDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-philsa-navy/80 backdrop-blur-lg">
            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: 20 }}
               className="bg-white rounded-[3rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            >
               <div className="p-10 border-b border-philsa-border flex justify-between items-center bg-philsa-red text-white">
                  <div>
                     <p className="text-[10px] font-black text-white/60 uppercase tracking-[0.3em] mb-1">Item Engineering Vault</p>
                     <h2 className="text-3xl font-black tracking-tight">{viewingDetails.id} <span className="text-white/40">/ {viewingDetails.subject}</span></h2>
                  </div>
                  <button onClick={() => setViewingDetails(null)} className="w-12 h-12 flex items-center justify-center hover:bg-white/10 rounded-full transition-all">
                     <XCircle className="w-6 h-6" />
                  </button>
               </div>

               <div className="flex-1 overflow-y-auto p-10 space-y-12">
                  <div className="space-y-8">
                     <div className="space-y-8">
                        <div className="space-y-4">
                           <h4 className="text-[11px] font-black text-philsa-navy uppercase tracking-widest border-b border-philsa-border pb-2 flex items-center gap-2">
                              <MessageSquare className="w-3.5 h-3.5" /> Item Content
                           </h4>
                           <div className="p-8 bg-philsa-bg rounded-[2.5rem] border border-philsa-border shadow-inner">
                              <p className="text-lg font-bold text-philsa-navy leading-relaxed italic">"{viewingDetails.content}"</p>
                           </div>
                        </div>

                        {viewingDetails.options && viewingDetails.options.length > 0 && (
                          <div className="space-y-4">
                             <h4 className="text-[11px] font-black text-philsa-navy uppercase tracking-widest border-b border-philsa-border pb-2 flex items-center gap-2">
                                <Layers className="w-3.5 h-3.5" /> Answer Options
                             </h4>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {viewingDetails.options.map((opt, i) => (
                                   <div key={i} className={cn(
                                     "p-5 rounded-2xl border flex items-center justify-between",
                                     opt === viewingDetails.idealAnswer 
                                       ? "bg-emerald-50 border-emerald-200 text-emerald-900" 
                                       : "bg-white border-philsa-border text-philsa-navy"
                                   )}>
                                      <div className="flex items-center gap-3">
                                         <span className="w-6 h-6 rounded-lg bg-white border border-philsa-border flex items-center justify-center text-[10px] font-black">
                                            {String.fromCharCode(65 + i)}
                                         </span>
                                         <span className="text-sm font-bold">{opt}</span>
                                      </div>
                                      {opt === viewingDetails.idealAnswer && <CheckCircle className="w-4 h-4 text-emerald-600" />}
                                   </div>
                                ))}
                             </div>
                          </div>
                        )}

                        {viewingDetails.idealAnswer && viewingDetails.type === 'Essay' && (
                          <div className="space-y-4">
                             <h4 className="text-[11px] font-black text-philsa-navy uppercase tracking-widest border-b border-philsa-border pb-2 flex items-center gap-2">
                                <CheckCircle className="w-3.5 h-3.5" /> Ideal Response
                             </h4>
                             <div className="p-8 bg-emerald-50/50 rounded-[2.5rem] border border-emerald-100 shadow-sm">
                                <p className="text-sm font-medium text-emerald-900 leading-relaxed">{viewingDetails.idealAnswer}</p>
                             </div>
                          </div>
                        )}
                        
                        {viewingDetails.mediaUrl && (
                           <div className="space-y-4">
                              <h4 className="text-[11px] font-black text-philsa-navy uppercase tracking-widest border-b border-philsa-border pb-2 flex items-center gap-2">
                                 <ImageIcon className="w-3.5 h-3.5 text-philsa-red" /> Attached Media / Diagram
                              </h4>
                              <div className="p-6 bg-slate-50 rounded-[2.5rem] border border-philsa-border flex justify-center items-center overflow-hidden">
                                 <img 
                                   src={viewingDetails.mediaUrl} 
                                   alt="Question Media" 
                                   className="max-h-72 rounded-2xl object-contain border border-slate-200 shadow-md"
                                   referrerPolicy="no-referrer"
                                 />
                              </div>
                           </div>
                         )}

                        <div className="grid grid-cols-2 gap-4">
                           <div className="p-6 rounded-[2rem] border border-philsa-border bg-slate-50">
                              <p className="text-[9px] font-black text-philsa-gray uppercase tracking-widest mb-1">Author</p>
                              <p className="text-sm font-black text-philsa-navy">{viewingDetails.author}</p>
                           </div>
                           <div className="p-6 rounded-[2rem] border border-philsa-border bg-slate-50">
                              <p className="text-[9px] font-black text-philsa-gray uppercase tracking-widest mb-1">Points Allocated</p>
                              <p className="text-sm font-black text-philsa-navy">{viewingDetails.points} PTS</p>
                           </div>
                        </div>
                     </div>

                     <div className="space-y-6 hidden">
                        <h4 className="text-[11px] font-black text-philsa-navy uppercase tracking-widest border-b border-philsa-border pb-2 flex items-center gap-2">
                           <Clock className="w-3.5 h-3.5" /> Workflow Audit
                        </h4>
                        <div className="space-y-4">
                           {viewingDetails.history ? viewingDetails.history.map((h, i) => (
                             <div key={i} className="relative pl-6 border-l-2 border-philsa-border pb-4 last:pb-0">
                                <div className={cn("absolute -left-[5px] top-0 w-2 h-2 rounded-full", STATUS_COLORS[h.status].text.replace('text-', 'bg-'))} />
                                <p className="text-[10px] font-black text-philsa-navy uppercase tracking-wider">{h.status}</p>
                                <p className="text-[9px] text-philsa-gray font-bold">{h.date} by {h.user}</p>
                                {h.remark && (
                                  <div className="mt-2 p-3 bg-philsa-bg border border-philsa-border rounded-xl">
                                     <p className="text-[10px] font-medium text-philsa-navy italic">"{h.remark}"</p>
                                  </div>
                                )}
                             </div>
                           )) : (
                             <div className="text-center py-6">
                                <p className="text-[10px] font-bold text-philsa-gray uppercase">No history available</p>
                             </div>
                           )}
                        </div>
                     </div>
                  </div>
               </div>

               <div className="p-8 bg-philsa-bg/30 border-t border-philsa-border flex justify-end">
                  <button onClick={() => setViewingDetails(null)} className="btn-primary px-12 rounded-2xl text-[10px] font-black shadow-xl shadow-philsa-red/20 uppercase tracking-widest">Close Record</button>
               </div>
            </motion.div>
          </div>
        )}

        {/* Add Modal */}
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-philsa-navy/40 backdrop-blur-sm">
            <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 15 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 15 }}
               className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col border border-slate-100"
            >
               <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
                  <div>
                     <h2 className="text-sm font-bold text-philsa-navy">New Assessment Item</h2>
                     <p className="text-slate-400 text-[10px] font-semibold">Add a new question to the assessment bank.</p>
                  </div>
                  <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600 transition-all">
                     <XCircle className="w-5 h-5" />
                  </button>
               </div>

               <div className="flex-1 overflow-y-auto p-6 space-y-6 max-h-[75vh]">
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Type</label>
                        <select 
                          value={newType}
                          onChange={(e) => setNewType(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:bg-white focus:border-philsa-navy focus:ring-1 focus:ring-philsa-navy/10 outline-none cursor-pointer"
                        >
                           <option>Multiple Choice</option>
                           <option>Essay</option>
                           <option>True/False</option>
                           <option>Identification</option>
                        </select>
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Subject</label>
                        <select 
                          value={newSubject}
                          onChange={(e) => setNewSubject(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:bg-white focus:border-philsa-navy focus:ring-1 focus:ring-philsa-navy/10 outline-none cursor-pointer"
                        >
                           <option>Reading Comp (English, Filipino)</option>
                           <option>Lang Proficiency (English, Filipino)</option>
                           <option>Math</option>
                           <option>Science</option>
                        </select>
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Difficulty</label>
                        <select 
                          value={newDifficulty}
                          onChange={(e) => setNewDifficulty(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:bg-white focus:border-philsa-navy focus:ring-1 focus:ring-philsa-navy/10 outline-none cursor-pointer"
                        >
                           <option value="LOW">EASY</option>
                           <option value="MED">MODERATE</option>
                           <option value="HIGH">DIFFICULT</option>
                        </select>
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Points</label>
                        <input 
                          type="number" 
                          value={newPoints}
                          onChange={(e) => setNewPoints(Number(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:bg-white focus:border-philsa-navy focus:ring-1 focus:ring-philsa-navy/15 outline-none" 
                        />
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Topic / Domain</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Orbits, Laws, Calculus"
                          value={newTopic}
                          onChange={(e) => setNewTopic(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:bg-white focus:border-philsa-navy focus:ring-1 focus:ring-philsa-navy/15 outline-none" 
                        />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Core Competency</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Analyze satellite data"
                          value={newCompetency}
                          onChange={(e) => setNewCompetency(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:bg-white focus:border-philsa-navy focus:ring-1 focus:ring-philsa-navy/15 outline-none" 
                        />
                     </div>
                  </div>

                  <div className="space-y-1">
                     <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Question Prompt</label>
                     <textarea 
                        rows={3}
                        placeholder="Type the question prompt..."
                        value={newContent}
                        onChange={(e) => setNewContent(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:bg-white focus:border-philsa-navy focus:ring-1 focus:ring-philsa-navy/10 outline-none resize-none placeholder:text-slate-400"
                     />
                  </div>

                  {/* Media Upload and Drag-and-Drop Zone */}
                  <div className="space-y-2">
                     <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-slate-400" /> Attached Media / Diagram <span className="text-[9px] text-slate-400 font-normal lowercase">(Optional)</span>
                     </label>
                     
                     {newMediaUrl ? (
                        <div className="relative p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center gap-3">
                           <img 
                              src={newMediaUrl} 
                              alt="Media Preview" 
                              className="max-h-40 rounded-lg object-contain border border-slate-200 shadow-sm" 
                              referrerPolicy="no-referrer"
                           />
                           <div className="flex gap-2">
                              <button 
                                 type="button" 
                                 onClick={() => setNewMediaUrl('')}
                                 className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-150 hover:bg-red-100 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                              >
                                 Remove Media
                              </button>
                           </div>
                        </div>
                     ) : (
                        <div 
                           onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                           onDragLeave={() => setDragOver(false)}
                           onDrop={(e) => {
                              e.preventDefault();
                              setDragOver(false);
                              const file = e.dataTransfer.files?.[0];
                              if (file) {
                                 const reader = new FileReader();
                                 reader.onloadend = () => {
                                    setNewMediaUrl(reader.result as string);
                                 };
                                 reader.readAsDataURL(file);
                              }
                           }}
                           className={cn(
                              "border-2 border-dashed rounded-2xl p-6 text-center transition-all flex flex-col items-center justify-center gap-2 cursor-pointer",
                              dragOver 
                                 ? "border-philsa-red bg-philsa-red/5" 
                                 : "border-slate-200 bg-slate-50 hover:bg-slate-100/70"
                           )}
                           onClick={() => document.getElementById('media-file-input')?.click()}
                        >
                           <input 
                              id="media-file-input"
                              type="file" 
                              accept="image/*"
                              className="hidden" 
                              onChange={(e) => {
                                 const file = e.target.files?.[0];
                                 if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                       setNewMediaUrl(reader.result as string);
                                    };
                                    reader.readAsDataURL(file);
                                 }
                              }}
                           />
                           <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                              <Plus className="w-4 h-4" />
                           </div>
                           <p className="text-[11px] font-bold text-slate-700">Drag & drop your diagram, or <span className="text-philsa-red hover:underline">browse file</span></p>
                           <p className="text-[9px] font-semibold text-slate-400">Supports PNG, JPG, GIF (Max 5MB)</p>
                        </div>
                     )}

                     <div className="pt-1">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Or select a high-quality space preset:</p>
                        <div className="flex flex-wrap gap-2">
                           {[
                              { label: 'Orbit Trajectory', url: 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=600&auto=format&fit=crop' },
                              { label: 'Satellite Blueprint', url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop' },
                              { label: 'Mathematical Grid', url: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&auto=format&fit=crop' }
                           ].map((preset, pIdx) => (
                              <button 
                                 key={pIdx}
                                 type="button"
                                 onClick={() => setNewMediaUrl(preset.url)}
                                 className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 rounded-lg text-[10px] font-semibold transition-all cursor-pointer"
                              >
                                 + {preset.label}
                              </button>
                           ))}
                        </div>
                     </div>
                  </div>

                  {newType === 'Multiple Choice' && (
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Options configuration (Select correct answer)</label>
                       <div className="space-y-2">
                          {[
                            { label: 'A', value: newOptionA, setter: setNewOptionA },
                            { label: 'B', value: newOptionB, setter: setNewOptionB },
                            { label: 'C', value: newOptionC, setter: setNewOptionC },
                            { label: 'D', value: newOptionD, setter: setNewOptionD },
                          ].map((item, idx) => (
                             <div key={idx} className="flex gap-3 items-center bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-150">
                                <input 
                                  type="radio" 
                                  name="correct" 
                                  checked={newCorrectOption === item.label}
                                  onChange={() => setNewCorrectOption(item.label)}
                                  className="w-4 h-4 accent-philsa-red cursor-pointer" 
                                />
                                <input 
                                   type="text" 
                                   value={item.value}
                                   onChange={(e) => item.setter(e.target.value)}
                                   placeholder={`Option ${item.label}`} 
                                   className="flex-1 bg-transparent border-none p-0 text-xs font-semibold text-slate-800 focus:ring-0" 
                                />
                             </div>
                          ))}
                       </div>
                    </div>
                  )}

                  {newType === 'True/False' && (
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Correct Answer</label>
                       <div className="flex gap-4">
                          <button 
                            type="button"
                            onClick={() => setNewCorrectOption('A')}
                            className={`flex-1 py-3 px-4 rounded-xl border font-bold text-xs transition-all ${newCorrectOption === 'A' ? 'bg-philsa-navy text-white border-philsa-navy' : 'bg-slate-50 text-philsa-navy border-slate-250'}`}
                          >
                            True
                          </button>
                          <button 
                            type="button"
                            onClick={() => setNewCorrectOption('B')}
                            className={`flex-1 py-3 px-4 rounded-xl border font-bold text-xs transition-all ${newCorrectOption === 'B' ? 'bg-philsa-navy text-white border-philsa-navy' : 'bg-slate-50 text-philsa-navy border-slate-250'}`}
                          >
                            False
                          </button>
                       </div>
                    </div>
                  )}

                  {newType === 'Identification' && (
                    <div className="space-y-1">
                       <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Ideal Short Answer Key</label>
                       <input 
                         type="text" 
                         placeholder="Type the exact expected answer..."
                         value={newOptionA}
                         onChange={(e) => setNewOptionA(e.target.value)}
                         className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:bg-white focus:border-philsa-navy focus:ring-1 focus:ring-philsa-navy/15 outline-none" 
                       />
                    </div>
                  )}

                  {newType === 'Essay' && (
                    <div className="space-y-1">
                       <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Ideal/Rubric Response Key</label>
                       <textarea 
                          rows={3}
                          placeholder="Type expected guidelines, keywords, or rubric..."
                          value={newOptionA}
                          onChange={(e) => setNewOptionA(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:bg-white focus:border-philsa-navy focus:ring-1 focus:ring-philsa-navy/10 outline-none resize-none placeholder:text-slate-400"
                       />
                    </div>
                  )}
               </div>

               <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                  <button onClick={handleCancelAdd} className="px-5 py-2 bg-white border border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-600 rounded-xl hover:bg-slate-100 transition-all cursor-pointer">Discard</button>
                  <button onClick={handleSaveNewQuestion} className="bg-philsa-navy text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-800 transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-philsa-navy/10">
                     <CheckCircle className="w-4 h-4" /> {editingId ? 'Save Changes' : 'Save Question'}
                  </button>
               </div>
            </motion.div>
          </div>
        )}
        {/* Assign To Set Modal */}
        {isAssigning && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-philsa-navy/80 backdrop-blur-md">
            <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.95 }}
               className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-philsa-border"
            >
               <div className="p-8 border-b border-philsa-border bg-philsa-navy text-white flex justify-between items-center">
                  <div>
                     <p className="text-[10px] font-black text-philsa-red uppercase tracking-[0.2em] mb-1">Superadmin Console</p>
                     <h3 className="text-xl font-black">Assign to Exam Set</h3>
                  </div>
                  <button onClick={() => setIsAssigning(false)} className="text-white/60 hover:text-white transition-all text-sm font-bold uppercase outline-none">
                     Close
                  </button>
               </div>
               <div className="p-8 space-y-6">
                  <div className="p-5 bg-philsa-bg rounded-2xl border border-philsa-border">
                     <p className="text-xs font-bold text-philsa-gray uppercase tracking-wider mb-1">Selected Questions</p>
                     <p className="text-2xl font-black text-philsa-navy">{selectedIds.length} exam items</p>
                  </div>

                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-philsa-navy uppercase tracking-widest ml-1">Target Exam Set</label>
                     <select 
                        value={selectedSetId}
                        onChange={(e) => setSelectedSetId(e.target.value)}
                        className="w-full bg-philsa-bg border-none rounded-xl px-4 py-3.5 text-xs font-bold text-philsa-navy focus:ring-2 focus:ring-philsa-red/10 outline-none shadow-inner cursor-pointer"
                     >
                        <option value="">-- Choose an Exam Set --</option>
                        {examSets.map(set => (
                           <option key={set.id} value={set.id}>
                              {set.title} ({set.id})
                           </option>
                        ))}
                     </select>
                  </div>
               </div>

               <div className="p-8 border-t border-philsa-border bg-philsa-bg/30 flex justify-end gap-3">
                  <button 
                     onClick={() => setIsAssigning(false)} 
                     className="px-6 py-3 bg-white border border-philsa-border text-[10px] font-black uppercase tracking-widest text-philsa-gray rounded-xl hover:bg-slate-50 transition-all font-sans outline-none"
                  >
                     Cancel
                  </button>
                  <button 
                     disabled={!selectedSetId}
                     onClick={() => {
                        const targetSet = examSets.find(s => s.id === selectedSetId);
                        if (!targetSet) return;
                        
                        // Compute combined questions and sum points
                        const currentQuestionIds = targetSet.questionIds || [];
                        const nextQuestionIds = Array.from(new Set([...currentQuestionIds, ...selectedIds]));
                        const totalSetPoints = nextQuestionIds.reduce((sum, qId) => {
                           const qObj = questions.find(item => item.id === qId);
                           return sum + (qObj?.points || 5);
                        }, 0);

                        const updatedSets = examSets.map(set => {
                           if (set.id === selectedSetId) {
                              return {
                                 ...set,
                                 questionIds: nextQuestionIds,
                                 questions: nextQuestionIds.length,
                                 totalPoints: totalSetPoints
                              };
                           }
                           return set;
                        });

                        localStorage.setItem('philsa_exam_sets_admin', JSON.stringify(updatedSets));
                        setExamSets(updatedSets);
                        
                        alert(`Successfully assigned ${selectedIds.length} questions to ${targetSet.title}! Changes reflecting in Exam Sets module.`);
                        setSelectedIds([]);
                        setIsAssigning(false);
                        setSelectedSetId('');
                     }}
                     className="bg-philsa-navy text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-philsa-navy/10 hover:bg-philsa-red transition-all cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed outline-none"
                  >
                     Save & Sync
                  </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[200] bg-philsa-navy border-l-4 border-philsa-red text-white py-4 px-6 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-300">
           <CheckCircle className="w-5 h-5 text-green-400 animate-pulse" />
           <p className="text-xs font-bold tracking-wide uppercase">{toastMessage}</p>
        </div>
      )}
    </div>
  );
}
