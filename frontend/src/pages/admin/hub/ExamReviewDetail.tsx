import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMockData } from '../../../services/mockService';
import { 
  ChevronLeft, 
  CheckCircle2, 
  XCircle, 
  Save, 
  Info, 
  ArrowRight, 
  Upload, 
  Clock,
  Calculator,
  BookOpen,
  MessageSquare,
  Atom,
  Award,
  Percent
} from 'lucide-react';
import { usePhilSA } from '../../../PhilSAContext';
import { cn } from '../../../lib/utils';

interface MockQuestionAttempt {
  id: string;
  text: string;
  type: 'MCQ' | 'TF' | 'ESSAY';
  subject: string;
  topic: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  score: number;
  options?: string[];
  correctAnswer: string | boolean;
  studentAnswer: string | boolean;
  isCorrect: boolean;
  scoreEarned: number;
  rubric?: string;
  timeSpentSeconds: number;
}

// Top level static mock sheets generator
const getSubjectSheets = (studentName: string, studentId: string): Record<string, MockQuestionAttempt[]> => {
  const hash = studentId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  // Custom deterministic scoring offsets per subject to make them completely different
  const mathOffset = hash % 3; // 0, 1, 2
  const engOffset = (hash >> 1) % 4; // 0, 1, 2, 3
  const filOffset = (hash >> 2) % 3; // 0, 1, 2
  const sciOffset = (hash >> 3) % 2; // 0, 1

  return {
    Math: [
      {
        id: 'math_q1',
        text: "Solve for x in the equation: 3x + 7 = 22.",
        type: 'MCQ',
        subject: 'Math',
        topic: 'Algebra',
        difficulty: 'EASY',
        score: 5,
        options: ['x = 3', 'x = 4', 'x = 5', 'x = 6'],
        correctAnswer: 'x = 5',
        studentAnswer: 'x = 5',
        isCorrect: true,
        scoreEarned: 5,
        timeSpentSeconds: 45
      },
      {
        id: 'math_q2',
        text: "What is the derivative of f(x) = 3x² + 5x?",
        type: 'MCQ',
        subject: 'Math',
        topic: 'Calculus',
        difficulty: 'MEDIUM',
        score: 5,
        options: ['6x + 5', '3x + 5', '6x', '5x'],
        correctAnswer: '6x + 5',
        studentAnswer: '6x + 5',
        isCorrect: true,
        scoreEarned: 5,
        timeSpentSeconds: 120
      },
      {
        id: 'math_q3',
        text: "In a right triangle, if the adjacent side is 3 and the opposite side is 4, what is the hypotenuse?",
        type: 'MCQ',
        subject: 'Math',
        topic: 'Geometry',
        difficulty: 'EASY',
        score: 5,
        options: ['5', '6', '7', '8'],
        correctAnswer: '5',
        studentAnswer: '5',
        isCorrect: true,
        scoreEarned: 5,
        timeSpentSeconds: 30
      },
      {
        id: 'math_q4',
        text: "Calculate the value of log₂(64).",
        type: 'MCQ',
        subject: 'Math',
        topic: 'Logarithms',
        difficulty: 'MEDIUM',
        score: 5,
        options: ['4', '5', '6', '8'],
        correctAnswer: '6',
        studentAnswer: mathOffset === 0 ? '6' : '5',
        isCorrect: mathOffset === 0,
        scoreEarned: mathOffset === 0 ? 5 : 0,
        timeSpentSeconds: 95
      },
      {
        id: 'math_essay',
        text: "Show the step-by-step solution to find the area bounded by the curve y = x² and the x-axis from x = 0 to x = 3.",
        type: 'ESSAY',
        subject: 'Math',
        topic: 'Integration',
        difficulty: 'HARD',
        score: 10,
        correctAnswer: "Integration of x² from 0 to 3 is [x³/3] evaluated from 0 to 3, which equals 9.",
        studentAnswer: `To find the area bounded by y = x² from x = 0 to x = 3, we perform definite integration of the function with respect to x:\n\nArea = ∫(x²) dx evaluated from 0 to 3\nArea = [x³ / 3] evaluated from 0 to 3\nArea = (3³ / 3) - (0³ / 3)\nArea = 27 / 3 - 0\nArea = 9 square units.\n\nHence, the total area bounded under the curve is exactly 9 square units. My step-by-step evaluation matches the physical limit definitions.`,
        isCorrect: true,
        scoreEarned: Math.max(5, 10 - mathOffset),
        rubric: 'Mathematical formulation (4pts), algebraic accuracy (4pts), final integration (2pts)',
        timeSpentSeconds: 240
      }
    ],
    English: [
      {
        id: 'eng_q1',
        text: "Identify the correct preposition: She has been living in Manila _____ 2015.",
        type: 'MCQ',
        subject: 'English',
        topic: 'Prepositions',
        difficulty: 'EASY',
        score: 5,
        options: ['since', 'for', 'during', 'in'],
        correctAnswer: 'since',
        studentAnswer: 'since',
        isCorrect: true,
        scoreEarned: 5,
        timeSpentSeconds: 15
      },
      {
        id: 'eng_q2',
        text: "Which of the following sentences exhibits perfect subject-verb agreement?",
        type: 'MCQ',
        subject: 'English',
        topic: 'Subject-Verb Agreement',
        difficulty: 'MEDIUM',
        score: 5,
        options: ['Neither the teacher nor the students were present.', 'The group of scientists are conducting an experiment.', 'Every one of the apples are ripe.', 'The news about the space launch are thrilling.'],
        correctAnswer: 'Neither the teacher nor the students were present.',
        studentAnswer: engOffset === 0 ? 'Neither the teacher nor the students were present.' : 'The group of scientists are conducting an experiment.',
        isCorrect: engOffset === 0,
        scoreEarned: engOffset === 0 ? 5 : 0,
        timeSpentSeconds: 70
      },
      {
        id: 'eng_q3',
        text: "What is the synonym of 'garrulous'?",
        type: 'MCQ',
        subject: 'English',
        topic: 'Vocabulary',
        difficulty: 'MEDIUM',
        score: 5,
        options: ['Talkative', 'Silent', 'Intelligent', 'Quiet'],
        correctAnswer: 'Talkative',
        studentAnswer: 'Talkative',
        isCorrect: true,
        scoreEarned: 5,
        timeSpentSeconds: 25
      },
      {
        id: 'eng_q4',
        text: "Identify the figure of speech: 'The stars danced playfully in the moonlit sky.'",
        type: 'MCQ',
        subject: 'English',
        topic: 'Figures of Speech',
        difficulty: 'EASY',
        score: 5,
        options: ['Personification', 'Metaphor', 'Simile', 'Hyperbole'],
        correctAnswer: 'Personification',
        studentAnswer: engOffset === 1 ? 'Metaphor' : 'Personification',
        isCorrect: engOffset !== 1,
        scoreEarned: engOffset !== 1 ? 5 : 0,
        timeSpentSeconds: 35
      },
      {
        id: 'eng_essay',
        text: "Write a short essay (100-200 words) on the role of space exploration in fostering national pride and scientific curiosity among Filipino youth.",
        type: 'ESSAY',
        subject: 'English',
        topic: 'Creative Writing',
        difficulty: 'HARD',
        score: 20,
        correctAnswer: 'Graded based on rubric: clarity, coherence, and structural organization.',
        studentAnswer: `Space exploration serves as a vital catalyst for scientific curiosity among the Filipino youth. When we see projects from the Philippine Space Agency (PhilSA) launch, such as our localized CubeSats, it inspires school children across the archipelago. It turns highly abstract physical science and mathematics into real-world achievements. Seeing Filipino scientists working with advanced orbital payloads expands our mental horizon. This makes space exploration not just an academic topic, but a profound beacon of national capability and pride.`,
        isCorrect: true,
        scoreEarned: Math.max(10, 18 - engOffset),
        rubric: 'Vocabulary & Coherence (5pts), Critical Argumentation (10pts), Style & Formatting (5pts)',
        timeSpentSeconds: 310
      }
    ],
    Filipino: [
      {
        id: 'fil_q1',
        text: "Alin sa mga sumusunod ang tamang baybay sa Wikang Filipino?",
        type: 'MCQ',
        subject: 'Filipino',
        topic: 'Ortograpiya',
        difficulty: 'EASY',
        score: 5,
        options: ['Kompormasyon', 'Konpirmasyon', 'Kumpirmasyon', 'Kompermasyon'],
        correctAnswer: 'Kumpirmasyon',
        studentAnswer: 'Kumpirmasyon',
        isCorrect: true,
        scoreEarned: 5,
        timeSpentSeconds: 20
      },
      {
        id: 'fil_q2',
        text: "Sino ang kinikilalang 'Ama ng Wikang Pambansa'?",
        type: 'MCQ',
        subject: 'Filipino',
        topic: 'Kasaysayan',
        difficulty: 'EASY',
        score: 5,
        options: ['Manuel L. Quezon', 'Francisco Balagtas', 'Jose Rizal', 'Andres Bonifacio'],
        correctAnswer: 'Manuel L. Quezon',
        studentAnswer: 'Manuel L. Quezon',
        isCorrect: true,
        scoreEarned: 5,
        timeSpentSeconds: 12
      },
      {
        id: 'fil_q3',
        text: "Ano ang kahulugan ng sawikain na 'nagpupuyos sa galit'?",
        type: 'MCQ',
        subject: 'Filipino',
        topic: 'Sawikain',
        difficulty: 'MEDIUM',
        score: 5,
        options: ['Galit na galit', 'Nalulungkot', 'Natutuwa', 'Natatakot'],
        correctAnswer: 'Galit na galit',
        studentAnswer: 'Galit na galit',
        isCorrect: true,
        scoreEarned: 5,
        timeSpentSeconds: 18
      },
      {
        id: 'fil_q4',
        text: "Tukuyin ang uri ng pangungusap: 'Maglinis ka ng iyong silid bago umalis.'",
        type: 'MCQ',
        subject: 'Filipino',
        topic: 'Sintaks',
        difficulty: 'EASY',
        score: 5,
        options: ['Pautos', 'Patanong', 'Padamdam', 'Pasalaysay'],
        correctAnswer: 'Pautos',
        studentAnswer: filOffset === 1 ? 'Pasalaysay' : 'Pautos',
        isCorrect: filOffset !== 1,
        scoreEarned: filOffset !== 1 ? 5 : 0,
        timeSpentSeconds: 15
      },
      {
        id: 'fil_essay',
        text: "Talakayin ang kahalagahan ng paggamit ng katutubong wika sa pagtuturo ng mga konseptong siyentipiko sa mga paaralan.",
        type: 'ESSAY',
        subject: 'Filipino',
        topic: 'Sanaysay',
        difficulty: 'HARD',
        score: 20,
        correctAnswer: 'Naaayon sa rubrik: balarila, lalim ng pananaliksik, at lohika.',
        studentAnswer: `Ang wikang katutubo ay susi sa mas malalim na pagkatuto ng mga estudyanteng Pilipino sa larangan ng siyensya at teknolohiya. Kapag itinuro ang mga komplikadong konsepto tulad ng gravity o orbital mechanics gamit ang wikang malapit sa kanilang puso, mas mabilis nilang naiuugnay ang teorya sa kanilang kapaligiran. Gayunpaman, isang malaking hamon ang kawalan ng opisyal na diksyunaryo para sa mga terminong siyentipiko. Ang hakbang na ginagawa ngayon ng ating akademya na hiramin ang mga salita habang binabaybay sa Filipino ay isang mahusay na pansamantalang solusyon upang mapalaganap ang siyentipikong literasya.`,
        isCorrect: true,
        scoreEarned: Math.max(10, 17 - filOffset),
        rubric: 'Estruktura at Balarila (5pts), Lalim ng Pagsusuri (10pts), Pagkamalikhain sa Wika (5pts)',
        timeSpentSeconds: 280
      }
    ],
    Science: [
      {
        id: 'sci_q1',
        text: "What is the primary engine of cellular respiration responsible for producing adenosine triphosphate (ATP)?",
        type: 'MCQ',
        subject: 'Science',
        topic: 'Biology',
        difficulty: 'EASY',
        score: 5,
        options: ['Mitochondria', 'Chloroplast', 'Ribosome', 'Golgi Apparatus'],
        correctAnswer: 'Mitochondria',
        studentAnswer: 'Mitochondria',
        isCorrect: true,
        scoreEarned: 5,
        timeSpentSeconds: 20
      },
      {
        id: 'sci_q2',
        text: "Which of Newton's laws states that for every action, there is an equal and opposite reaction?",
        type: 'MCQ',
        subject: 'Science',
        topic: 'Physics',
        difficulty: 'MEDIUM',
        score: 5,
        options: ['Third Law', 'First Law', 'Second Law', 'Law of Gravitation'],
        correctAnswer: 'Third Law',
        studentAnswer: 'Third Law',
        isCorrect: true,
        scoreEarned: 5,
        timeSpentSeconds: 30
      },
      {
        id: 'sci_q3',
        text: "What is the most abundant gas in the Earth's atmosphere?",
        type: 'MCQ',
        subject: 'Science',
        topic: 'Chemistry',
        difficulty: 'EASY',
        score: 5,
        options: ['Nitrogen', 'Oxygen', 'Carbon Dioxide', 'Argon'],
        correctAnswer: 'Nitrogen',
        studentAnswer: 'Nitrogen',
        isCorrect: true,
        scoreEarned: 5,
        timeSpentSeconds: 15
      },
      {
        id: 'sci_q4',
        text: "Identify the process by which liquid water changes directly into a gas.",
        type: 'MCQ',
        subject: 'Science',
        topic: 'Earth Science',
        difficulty: 'EASY',
        score: 5,
        options: ['Evaporation', 'Condensation', 'Sublimation', 'Freezing'],
        correctAnswer: 'Evaporation',
        studentAnswer: sciOffset === 1 ? 'Sublimation' : 'Evaporation',
        isCorrect: sciOffset !== 1,
        scoreEarned: sciOffset !== 1 ? 5 : 0,
        timeSpentSeconds: 18
      },
      {
        id: 'sci_essay',
        text: "Explain the greenhouse effect and analyze how human activities contribute to the acceleration of global warming.",
        type: 'ESSAY',
        subject: 'Science',
        topic: 'Climate Science',
        difficulty: 'HARD',
        score: 20,
        correctAnswer: 'Graded based on rubric: greenhouse mechanisms, anthropogenic factors, climate consequences.',
        studentAnswer: `The greenhouse effect is a critical, natural process that regulates Earth's temperature. Greenhouse gases (GHGs) such as CO2, water vapor, and methane trap solar radiation in the troposphere, keeping our planet hospitable. However, anthropogenic activities like combustion of fossil fuels for industrial production and massive deforestation have released unprecedented volumes of greenhouse gases. This excessive retention of infrared radiation has accelerated global warming. The resulting climate shifts are clear—rising ocean surface temperatures, accelerated glacial melt, and severe super-typhoons which continuously challenge regional stability.`,
        isCorrect: true,
        scoreEarned: Math.max(10, 19 - sciOffset),
        rubric: 'Physical Principles Description (5pts), Anthropogenic Identification (10pts), Academic Style (5pts)',
        timeSpentSeconds: 350
      }
    ]
  };
};

export default function ExamReviewDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, inputModules, addAuditLog } = usePhilSA();
  const isUploadActive = inputModules?.find(m => m.id === 'answer_sheet_upload')?.isActive !== false;
  const { examAttempts, applications, questions, updateEssayScore, finalizeExamAttempt, setExamAttempts } = useMockData();
  
  const attempt = examAttempts.find(a => a.id === id);
  const student = applications.find(a => a.id === attempt?.candidateId);
  
  const [activeSubject, setActiveSubject] = useState<'Math' | 'English' | 'Filipino' | 'Science'>('Math');
  const [essayScores, setEssayScores] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [finalizeError, setFinalizeError] = useState<string | null>(null);

  const [isUploadAnswerSheetOpen, setIsUploadAnswerSheetOpen] = useState(false);
  const [isProcessingOMR, setIsProcessingOMR] = useState(false);
  const [omrSuccess, setOmrSuccess] = useState<string | null>(null);

  // Generate distinct sheets for Math, English, Filipino, and Science
  const loadedSheets = useMemo(() => {
    if (!student) return {} as Record<string, MockQuestionAttempt[]>;
    return getSubjectSheets(student.firstName + ' ' + student.lastName, student.id);
  }, [student]);

  const [sheets, setSheets] = useState<Record<string, MockQuestionAttempt[]>>({});

  useEffect(() => {
    if (student && Object.keys(loadedSheets).length > 0) {
      setSheets(loadedSheets);
    }
  }, [student, loadedSheets]);

  const activeSheets: Record<string, MockQuestionAttempt[]> = Object.keys(sheets).length > 0 ? sheets : loadedSheets;

  // Initialize essay scores from all subjects' essay questions
  useEffect(() => {
    if (Object.keys(activeSheets).length > 0) {
      const scores: Record<string, number> = {};
      Object.values(activeSheets).forEach((qList) => {
        qList.forEach((q) => {
          if (q.type === 'ESSAY') {
            scores[q.id] = q.scoreEarned;
          }
        });
      });
      // Merge with existing state if any, avoiding resets
      setEssayScores(prev => ({ ...scores, ...prev }));
    }
  }, [activeSheets]);

  // Aggregate calculators across the 4 subjects using simple typed forEach loops to guarantee TS safety
  const previewTotalScore = useMemo(() => {
    if (Object.keys(activeSheets).length === 0) return 0;
    let sum = 0;
    Object.values(activeSheets).forEach((qList) => {
      qList.forEach((q) => {
        if (q.type === 'ESSAY') {
          sum += (essayScores[q.id] !== undefined ? essayScores[q.id] : q.scoreEarned);
        } else {
          sum += q.scoreEarned;
        }
      });
    });
    return sum;
  }, [activeSheets, essayScores]);

  const previewMaxScore = useMemo(() => {
    if (Object.keys(activeSheets).length === 0) return 0;
    let sum = 0;
    Object.values(activeSheets).forEach((qList) => {
      qList.forEach((q) => {
        sum += q.score;
      });
    });
    return sum;
  }, [activeSheets]);

  const autoGradedScore = useMemo(() => {
    if (Object.keys(activeSheets).length === 0) return 0;
    let sum = 0;
    Object.values(activeSheets).forEach((qList) => {
      qList.forEach((q) => {
        if (q.type !== 'ESSAY') {
          sum += q.scoreEarned;
        }
      });
    });
    return sum;
  }, [activeSheets]);

  const manualGradedScore = useMemo(() => {
    if (Object.keys(activeSheets).length === 0) return 0;
    let sum = 0;
    Object.values(activeSheets).forEach((qList) => {
      qList.forEach((q) => {
        if (q.type === 'ESSAY') {
          sum += (essayScores[q.id] !== undefined ? essayScores[q.id] : q.scoreEarned);
        }
      });
    });
    return sum;
  }, [activeSheets, essayScores]);

  const getSubjectScore = (subjectName: string): number => {
    const qList = activeSheets[subjectName];
    if (!qList) return 0;
    let sum = 0;
    qList.forEach((q) => {
      if (q.type === 'ESSAY') {
        sum += (essayScores[q.id] !== undefined ? essayScores[q.id] : q.scoreEarned);
      } else {
        sum += q.scoreEarned;
      }
    });
    return sum;
  };

  const getSubjectMaxScore = (subjectName: string): number => {
    const qList = activeSheets[subjectName];
    if (!qList) return 0;
    let sum = 0;
    qList.forEach((q) => {
      sum += q.score;
    });
    return sum;
  };

  if (!attempt || !student) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 max-w-xl mx-auto mt-10">
        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <Info className="w-6 h-6 text-slate-400" />
        </div>
        <h2 className="text-lg font-bold text-slate-800 mb-1">Attempt data unavailable</h2>
        <p className="text-slate-500 text-center px-8 mb-6 text-sm">
          The requested exam session <span className="font-mono bg-slate-100 px-1 rounded">{id}</span> could not be loaded. This might be due to a local data mismatch.
        </p>
        <div className="flex gap-3">
          <button 
            onClick={() => {
               localStorage.clear();
               window.location.reload();
            }} 
            className="px-5 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold"
          >
            Reset System Data
          </button>
          <button 
            onClick={() => navigate('/admin/hub/review')} 
            className="px-5 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold"
          >
            Back to Queue
          </button>
        </div>
      </div>
    );
  }

  const isGrader = user?.role === 'SYSTEM_ADMIN' || user?.role === 'EXAM_ADMINISTRATOR' || user?.role === 'UNIVERSITY_ADMIN' || user?.role === 'GRADER' || user?.role === 'ADMISSIONS_REVIEWER';

  const handleScoreChange = (qId: string, val: string) => {
    if (!isGrader) return;
    setFinalizeError(null);
    
    // Find the max score limit of this specific essay question
    let max = 100;
    Object.values(activeSheets).forEach((qList) => {
      const found = qList.find(q => q.id === qId);
      if (found) {
        max = found.score;
      }
    });

    const num = Math.min(parseInt(val) || 0, max);
    setEssayScores(prev => ({ ...prev, [qId]: num }));
  };

  const handleSave = async (qId: string) => {
    setIsSaving(true);
    setFinalizeError(null);
    // Simulate API call
    await new Promise(r => setTimeout(r, 400));
    
    // Attempt saving to the mock service if there is a matching database essay
    const matchingAttemptItem = attempt.attempts.find(a => a.questionId === qId);
    if (matchingAttemptItem) {
      updateEssayScore(attempt.id, qId, essayScores[qId], user?.id || 'admin');
    }

    if (addAuditLog) {
      addAuditLog('EXAM_GRADE_UPDATE', `Manual score update for Candidate ${student.id} (${qId}) set to ${essayScores[qId]} pts.`);
    }

    setIsSaving(false);
  };

  const handleFinalize = async () => {
    if (!isGrader) return;
    setFinalizeError(null);
    
    // Check if grading is actually finished (all essays have valid scores)
    const pendingEssays = Object.values(activeSheets).flatMap(qList => qList.filter(q => q.type === 'ESSAY')).filter(q => {
      return essayScores[q.id] === undefined;
    });

    if (pendingEssays.length > 0) {
      setFinalizeError(`Incomplete: ${pendingEssays.length} essay(s) still require manual grading before release.`);
      return;
    }

    setIsFinalizing(true);
    await new Promise(r => setTimeout(r, 600));

    // Update ALL essay manual scores and finalize in a single safe, atomic state transition
    setExamAttempts(prev => prev.map(att => {
      if (att.id === attempt.id) {
        return { 
          ...att, 
          totalScore: previewTotalScore, 
          maxScore: previewMaxScore,
          reviewedBy: user?.id || 'admin', 
          reviewedAt: new Date().toISOString(), 
          status: 'FINALIZED' 
        };
      }
      return att;
    }));

    if (addAuditLog) {
      addAuditLog('EXAM_FINALIZED', `Officially released exam results for Candidate ${student.id} (${student.firstName} ${student.lastName}). Aggregate Score: ${previewTotalScore}/${previewMaxScore}.`);
    }

    setIsFinalizing(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors text-sm font-semibold"
        >
          <ChevronLeft className="w-5 h-5" /> Back to List
        </button>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-4">
             {attempt.status === 'FINALIZED' ? (
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black border border-emerald-200 uppercase tracking-widest flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3" /> Released to Score Management
                </span>
             ) : (
                isGrader && attempt.status !== 'FINALIZED' && (
                   <button 
                     onClick={handleFinalize}
                     disabled={isFinalizing}
                     className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-slate-900/10 flex items-center gap-2 hover:bg-slate-800 transition-all disabled:opacity-50 cursor-pointer"
                   >
                     <ArrowRight className="w-3 h-3 text-red-500" /> 
                     {isFinalizing ? 'Releasing...' : 'Release to Score Management'}
                   </button>
                )
             )}
             {attempt.status === 'GRADED' && attempt.status !== 'FINALIZED' && (
               <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold border border-emerald-100 uppercase tracking-widest flex items-center gap-2">
                 <CheckCircle2 className="w-3 h-3" /> Fully Graded
               </span>
             )}
             <div className="px-4 py-2 bg-slate-100 rounded-xl text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
               Session ID: {attempt.id}
             </div>
          </div>
          {finalizeError && (
             <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wide bg-rose-50 px-3 py-1 rounded-lg border border-rose-100 flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                <Info className="w-3 h-3" /> {finalizeError}
             </p>
          )}
        </div>
      </div>

      {/* Student Profile Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row">
        <div className="p-8 border-b md:border-b-0 md:border-r border-slate-100 flex-1 flex gap-6">
          <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 text-2xl font-bold">
             {student.firstName[0]}{student.lastName[0]}
          </div>
          <div className="space-y-1">
             <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{student.firstName} {student.lastName}</h2>
             <p className="text-slate-500 text-sm font-medium">{student.email}</p>
             <div className="flex items-center gap-3 mt-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                  {student.id}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                  Batch 2026-A
                </span>
             </div>
          </div>
        </div>
        <div className="p-8 md:w-96 bg-slate-50/30 flex flex-col justify-center gap-6 border-t md:border-t-0 md:border-l border-slate-100">
          <div className="space-y-1">
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aggregate Examination Score</p>
             <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black text-slate-800 tracking-tighter">{previewTotalScore}</span>
                <span className="text-xl font-bold text-slate-300">/ {previewMaxScore}</span>
             </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Auto-Graded</p>
                <p className="text-sm font-bold text-slate-600">{autoGradedScore} pts</p>
             </div>
             <div className="space-y-1">
                <p className="text-[8px] font-black text-rose-500 uppercase tracking-widest">Manual Gradings</p>
                <p className="text-sm font-bold text-slate-800">{manualGradedScore} pts</p>
             </div>
          </div>
        </div>
      </div>

      {/* Subject Performance Breakdown Overview */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <Percent className="w-4 h-4 text-red-500" /> Subject Performance Breakdown
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {['Math', 'English', 'Filipino', 'Science'].map((sub) => {
            const score = getSubjectScore(sub);
            const max = getSubjectMaxScore(sub);
            const percentage = max > 0 ? Math.round((score / max) * 100) : 0;
            
            return (
              <div key={sub} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col justify-between space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700">{sub}</span>
                  <span className="text-xs font-black text-slate-800">{score} / {max} pts</span>
                </div>
                <div className="space-y-1">
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        percentage >= 85 ? "bg-emerald-500" :
                        percentage >= 70 ? "bg-amber-500" : "bg-rose-500"
                      )}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-400 font-bold">
                    <span>Accuracy</span>
                    <span>{percentage}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Answer Sheet View Header */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
             <div className="w-1.5 h-6 bg-slate-800 rounded-full"></div>
             <div>
                <h3 className="text-base font-bold text-slate-800">Final Answer Sheet Mappings</h3>
                <p className="text-[10px] text-slate-500 font-medium">Scanned paper OMR mappings & active digital answers across subjects</p>
             </div>
          </div>
          <button 
            disabled={!isUploadActive}
            onClick={() => {
              setOmrSuccess(null);
              setIsUploadAnswerSheetOpen(true);
            }}
            className={cn(
              "px-4 py-2.5 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md",
              isUploadActive ? "bg-slate-800 hover:bg-slate-900 cursor-pointer" : "bg-slate-300 cursor-not-allowed opacity-50"
            )}
          >
             <Upload className="w-3.5 h-3.5 text-red-500" /> {isUploadActive ? "Upload Student Answer Sheet" : "Upload Disabled (Deactivated)"}
          </button>
        </div>

        {/* Interactive Subject Tabs Switcher */}
        <div className="flex flex-col md:flex-row gap-4 border-b border-slate-100 pb-2">
          {['Math', 'English', 'Filipino', 'Science'].map((sub) => {
            const isSelected = activeSubject === sub;
            const score = getSubjectScore(sub);
            const max = getSubjectMaxScore(sub);
            const percentage = max > 0 ? Math.round((score / max) * 100) : 0;
            
            let IconComp = Calculator;
            if (sub === 'English') IconComp = BookOpen;
            if (sub === 'Filipino') IconComp = MessageSquare;
            if (sub === 'Science') IconComp = Atom;

            return (
              <button
                key={sub}
                onClick={() => setActiveSubject(sub as any)}
                className={cn(
                  "flex-1 p-4 rounded-2xl border text-left transition-all duration-200 flex items-center justify-between cursor-pointer focus:outline-none",
                  isSelected 
                    ? "bg-slate-950 border-slate-950 text-white shadow-md shadow-slate-950/10 scale-[1.02]" 
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-xl transition-colors",
                    isSelected ? "bg-white/10 text-red-400" : "bg-slate-100 text-slate-500"
                  )}>
                    <IconComp className="w-5 h-5" />
                  </div>
                  <div>
                    <p className={cn(
                      "text-xs font-black uppercase tracking-wider leading-none",
                      isSelected ? "text-white" : "text-slate-800"
                    )}>{sub}</p>
                    <p className={cn(
                      "text-[10px] font-medium mt-1 leading-none",
                      isSelected ? "text-slate-300" : "text-slate-400"
                    )}>Core Competency</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={cn(
                    "text-xs font-black px-2.5 py-1 rounded-lg tracking-tight whitespace-nowrap",
                    isSelected 
                      ? "bg-white/15 text-white" 
                      : (percentage >= 85 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")
                  )}>
                    {score} / {max}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Subject's Questions List */}
        <div className="space-y-4">
          {activeSheets[activeSubject]?.map((qAttempt, index) => {
            const isEssay = qAttempt.type === 'ESSAY';

            return (
              <div 
                key={qAttempt.id}
                className={cn(
                  "bg-white rounded-2xl border transition-all duration-300",
                  isEssay ? "border-slate-300 shadow-md animate-in fade-in duration-300" : "border-slate-100 shadow-sm"
                )}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start gap-6 mb-4">
                     <div className="flex-1">
                        <span className="text-[10px] font-black text-slate-400 mb-1 flex flex-wrap items-center gap-2">
                          <span>QUESTION {index + 1} • {qAttempt.subject.toUpperCase()}</span>
                          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono text-[9px] font-bold">
                            <Clock className="w-2.5 h-2.5 text-slate-400 animate-pulse" />
                            {qAttempt.timeSpentSeconds}s taken to answer
                          </span>
                        </span>
                        <p className="text-slate-800 font-semibold leading-relaxed">{qAttempt.text}</p>
                     </div>
                    <div className="text-right">
                        {isEssay ? (
                          <span className={cn(
                            "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest",
                            essayScores[qAttempt.id] !== undefined ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-amber-50 text-amber-600 border border-amber-100"
                          )}>
                            {essayScores[qAttempt.id] !== undefined ? 'Graded' : 'Pending Review'}
                          </span>
                        ) : (
                          <span className={cn(
                            "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest",
                            qAttempt.isCorrect ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-red-50 text-red-600 border border-red-100"
                          )}>
                            {qAttempt.isCorrect ? 'Correct' : 'Incorrect'}
                          </span>
                        )}
                     </div>
                  </div>

                  {/* MCQ/TF UI */}
                  {!isEssay && (
                    <div className="space-y-2 mb-4">
                      {qAttempt.options ? (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
                           {qAttempt.options.map((opt, i) => {
                             const isStudentPick = qAttempt.studentAnswer === opt;
                             const isCorrect = qAttempt.correctAnswer === opt;
                             
                             return (
                               <div 
                                 key={i}
                                 className={cn(
                                   "p-3 rounded-xl text-xs font-semibold flex justify-between items-center",
                                   isCorrect ? "bg-emerald-50 text-emerald-800 border border-emerald-100" : 
                                   isStudentPick ? "bg-red-50 text-red-800 border border-red-100" : 
                                   "bg-slate-50 text-slate-500 border border-slate-100"
                                 )}
                               >
                                 {opt}
                                 {isCorrect && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                                 {!isCorrect && isStudentPick && <XCircle className="w-3.5 h-3.5 text-red-500" />}
                               </div>
                             );
                           })}
                         </div>
                      ) : (
                        <div className="flex gap-4 mt-2">
                           <div className="flex-1 p-4 bg-slate-50 rounded-xl">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Student Answer</p>
                              <p className={cn("font-bold", qAttempt.studentAnswer === qAttempt.correctAnswer ? "text-emerald-600" : "text-red-600")}>
                                {String(qAttempt.studentAnswer)}
                              </p>
                           </div>
                           <div className="flex-1 p-4 bg-slate-50 rounded-xl">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Correct Answer</p>
                              <p className="text-slate-800 font-bold">{String(qAttempt.correctAnswer)}</p>
                           </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Essay UI */}
                  {isEssay && (
                    <div className="mt-6 space-y-6">
                      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-10 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-800 opacity-20"></div>
                        <div className="absolute top-4 right-6 text-[8px] font-black text-slate-300 uppercase tracking-widest">Candidate Signature: _________________</div>
                        
                        <div className="prose prose-slate max-w-none">
                           <div className="text-sm leading-relaxed text-slate-700 font-serif whitespace-pre-wrap">
                              {qAttempt.studentAnswer}
                           </div>
                        </div>
                        
                        <div className="mt-12 flex justify-between items-end border-t border-slate-100 pt-6">
                           <div className="text-[9px] font-bold text-slate-400 uppercase">
                              Word Count: {String(qAttempt.studentAnswer).split(/\s+/).length} words
                           </div>
                           <div className="text-[9px] font-bold text-slate-400 uppercase italic">
                              Submission Timestamp: {new Date(attempt.endTime || attempt.startTime).toLocaleString()}
                           </div>
                        </div>
                      </div>

                      <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 border-dashed">
                        <div className="flex items-center gap-2 mb-4 text-slate-600">
                          <Info className="w-4 h-4" />
                          <p className="text-xs font-bold uppercase tracking-widest text-slate-800">Grading Rubric & Automated Recommendation</p>
                        </div>
                        <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm mb-4">
                           <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-tighter">Official Rubric</p>
                           <p className="text-sm text-slate-700 leading-relaxed font-medium">{qAttempt.rubric}</p>
                        </div>
                        <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                                <CheckCircle2 className="w-4 h-4" />
                             </div>
                             <span className="text-xs font-bold text-emerald-800 uppercase tracking-tight">AI System Proposed Score</span>
                          </div>
                          <span className="text-lg font-black text-emerald-700">{Math.round(qAttempt.score * 0.85)} pts</span>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-6 border border-slate-200 rounded-xl space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                          <div className="space-y-1">
                            <h4 className="text-sm font-bold text-slate-900 tracking-tight">Manual Evaluation Terminal</h4>
                            <p className="text-xs text-slate-500 font-medium">
                              {isGrader ? "Official score override. This value will determine the final result." : "View-only access for University Administration."}
                            </p>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Points</span>
                              <input 
                                type="number" 
                                max={qAttempt.score}
                                readOnly={!isGrader}
                                value={essayScores[qAttempt.id] || 0}
                                onChange={(e) => handleScoreChange(qAttempt.id, e.target.value)}
                                className={cn(
                                  "w-24 border rounded-lg px-3 py-2 text-center text-base font-bold transition-all",
                                  isGrader 
                                    ? "bg-white border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400/25" 
                                    : "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                                )}
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Maximum</span>
                              <div className="text-base font-bold text-slate-800 py-2">
                                / {qAttempt.score} <span className="text-xs text-slate-400 font-medium ml-1">pts</span>
                              </div>
                            </div>
                            
                            {isGrader && (
                              <button 
                                onClick={() => handleSave(qAttempt.id)}
                                disabled={isSaving}
                                className="ml-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                              >
                                <Save className="w-4 h-4" />
                                {isSaving ? 'Saving...' : 'Save Grade'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div 
                  className={cn(
                    "px-6 py-3 border-t text-[10px] font-bold uppercase tracking-[0.2em] flex justify-between items-center",
                    isEssay 
                      ? (essayScores[qAttempt.id] !== undefined ? "bg-emerald-50/30 border-emerald-50 text-emerald-600/60" : "bg-amber-50/30 border-amber-50 text-amber-600/60")
                      : (qAttempt.isCorrect ? "bg-emerald-50/30 border-emerald-50 text-emerald-600/60" : "bg-red-50/30 border-red-50 text-red-600/60")
                  )}
                >
                   <span>{isEssay ? 'Essay Response' : 'Objective Response'}</span>
                   <span className="flex items-center gap-4">
                     <span className="text-slate-500 lowercase tracking-normal font-semibold bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
                       <Clock className="w-3.5 h-3.5 text-slate-400" /> took {qAttempt.timeSpentSeconds} seconds
                     </span>
                     <span>Points: {isEssay ? (essayScores[qAttempt.id] || 0) : qAttempt.scoreEarned} / {qAttempt.score}</span>
                   </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isUploadAnswerSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-fade-in animate-in">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center gap-2 font-sans">
                <Upload className="w-4 h-4 text-red-500" /> Upload Student Answer Sheet
              </h2>
              <button 
                onClick={() => setIsUploadAnswerSheetOpen(false)} 
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="text-xs text-slate-500 leading-relaxed font-semibold uppercase tracking-wider font-sans">
                Select template and target paper scanner formats:
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => {
                    setIsProcessingOMR(true);
                    setOmrSuccess(null);
                    setTimeout(() => {
                      setIsProcessingOMR(false);
                      
                      // Auto correct and map all 4 subjects to 100% correct status
                      const updatedSheets: Record<string, MockQuestionAttempt[]> = { ...activeSheets };
                      Object.keys(updatedSheets).forEach(subject => {
                        updatedSheets[subject] = updatedSheets[subject].map(q => {
                          if (q.type !== 'ESSAY') {
                            return {
                              ...q,
                              studentAnswer: q.correctAnswer,
                              isCorrect: true,
                              scoreEarned: q.score,
                              timeSpentSeconds: Math.floor(20 + Math.random() * 40)
                            };
                          }
                          return q;
                        });
                      });

                      setSheets(updatedSheets);

                      // Also update overall total score in mock context
                      let newTotal = 0;
                      Object.values(updatedSheets).forEach((qList) => {
                        qList.forEach((q) => {
                          if (q.type === 'ESSAY') {
                            newTotal += (essayScores[q.id] || q.scoreEarned);
                          } else {
                            newTotal += q.scoreEarned;
                          }
                        });
                      });

                      setExamAttempts(prev => prev.map(att => {
                        if (att.id === attempt.id) {
                          return {
                            ...att,
                            totalScore: newTotal,
                            systemInitialScore: Math.max(0, newTotal - 10)
                          };
                        }
                        return att;
                      }));

                      setOmrSuccess(`Detected Candidate ID: ${student.id} (${student.firstName} ${student.lastName}). Matching OMR template aligned at 100% across Math, English, Filipino, and Science. Synchronized MCQ grids into Final Answer Sheet! Total Score updated to ${newTotal} points.`);
                    }, 1200);
                  }}
                  className="p-4 rounded-xl border border-slate-200 hover:border-red-500 hover:bg-slate-50 transition-all text-left space-y-1 outline-none group text-slate-600 cursor-pointer"
                >
                  <div className="p-2 bg-rose-50 rounded-lg w-fit text-red-500 group-hover:scale-105 transition-all">
                    <Upload className="w-4 h-4" />
                  </div>
                  <p className="font-extrabold text-xs text-slate-800 uppercase tracking-tight">Standard OMR .CSV Grid</p>
                  <p className="text-[10px] text-slate-400 font-semibold font-sans leading-none">Automatic Bubble Sheet export formats</p>
                </button>

                <button 
                  onClick={() => {
                    setIsProcessingOMR(true);
                    setOmrSuccess(null);
                    setTimeout(() => {
                      setIsProcessingOMR(false);

                      // Auto correct and map all 4 subjects to 100% correct status
                      const updatedSheets: Record<string, MockQuestionAttempt[]> = { ...activeSheets };
                      Object.keys(updatedSheets).forEach(subject => {
                        updatedSheets[subject] = updatedSheets[subject].map(q => {
                          if (q.type !== 'ESSAY') {
                            return {
                              ...q,
                              studentAnswer: q.correctAnswer,
                              isCorrect: true,
                              scoreEarned: q.score,
                              timeSpentSeconds: Math.floor(30 + Math.random() * 30)
                            };
                          }
                          return q;
                        });
                      });

                      setSheets(updatedSheets);

                      // Also update overall total score in mock context
                      let newTotal = 0;
                      Object.values(updatedSheets).forEach((qList) => {
                        qList.forEach((q) => {
                          if (q.type === 'ESSAY') {
                            newTotal += (essayScores[q.id] || q.scoreEarned);
                          } else {
                            newTotal += q.scoreEarned;
                          }
                        });
                      });

                      setExamAttempts(prev => prev.map(att => {
                        if (att.id === attempt.id) {
                          return {
                            ...att,
                            totalScore: newTotal,
                            systemInitialScore: Math.max(0, newTotal - 10)
                          };
                        }
                        return att;
                      }));

                      setOmrSuccess(`Handwriting OCR parsed for Candidate: ${student.firstName} ${student.lastName} (${student.id}). Converted scanned physical sheets for the four subjects into digital keys. Finalized score to ${newTotal} points.`);
                    }, 1400);
                  }}
                  className="p-4 rounded-xl border border-slate-200 hover:border-red-500 hover:bg-slate-50 transition-all text-left space-y-1 outline-none group text-slate-600 cursor-pointer"
                >
                  <div className="p-2 bg-emerald-50 rounded-lg w-fit text-emerald-600 group-hover:scale-105 transition-all">
                    <Upload className="w-4 h-4" />
                  </div>
                  <p className="font-extrabold text-xs text-slate-800 uppercase tracking-tight">Scanned Handwriting Paper</p>
                  <p className="text-[10px] text-slate-400 margin-medium font-sans">PNG / JPEG / PDF OCR Handwriting scanner</p>
                </button>
              </div>

              <div 
                onClick={() => {
                  setIsProcessingOMR(true);
                  setOmrSuccess(null);
                  setTimeout(() => {
                    setIsProcessingOMR(false);

                    // Auto correct and map all 4 subjects to 100% correct status
                    const updatedSheets: Record<string, MockQuestionAttempt[]> = { ...activeSheets };
                    Object.keys(updatedSheets).forEach(subject => {
                      updatedSheets[subject] = updatedSheets[subject].map(q => {
                        if (q.type !== 'ESSAY') {
                          return {
                            ...q,
                            studentAnswer: q.correctAnswer,
                            isCorrect: true,
                            scoreEarned: q.score,
                            timeSpentSeconds: Math.floor(40 + Math.random() * 50)
                          };
                        }
                        return q;
                      });
                    });

                    setSheets(updatedSheets);

                    // Also update overall total score in mock context
                    let newTotal = 0;
                    Object.values(updatedSheets).forEach((qList) => {
                      qList.forEach((q) => {
                        if (q.type === 'ESSAY') {
                          newTotal += (essayScores[q.id] || q.scoreEarned);
                        } else {
                          newTotal += q.scoreEarned;
                        }
                      });
                    });

                    setExamAttempts(prev => prev.map(att => {
                      if (att.id === attempt.id) {
                        return {
                          ...att,
                          totalScore: newTotal,
                          systemInitialScore: Math.max(0, newTotal - 10)
                        };
                      }
                      return att;
                    }));

                    setOmrSuccess(`Drag & drop printed answer sheets successfully digitized for Candidate: ${student.firstName}. Mapped active selections in real-time. Score finalized to ${newTotal} points.`);
                  }, 1500);
                }}
                className={cn(
                  "border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer",
                  isProcessingOMR ? "border-amber-400 bg-amber-50/10" : "border-slate-200 hover:border-red-500/30 bg-slate-50/20"
                )}
              >
                {isProcessingOMR ? (
                  <div className="flex flex-col items-center gap-3 font-sans">
                    <div className="w-6 h-6 border-2 border-slate-800 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-xs font-bold text-slate-600 animate-pulse">Running advanced OCR handwriting scanner model...</p>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-slate-400 animate-bounce" />
                    <div className="text-center">
                      <p className="text-xs font-bold text-slate-800">Drag & Drop printed/bubble exam papers, or click to search</p>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5 font-sans">Scans are compiled into verified interactive states below</p>
                    </div>
                  </>
                )}
              </div>

              {omrSuccess && (
                <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl flex items-start gap-3 text-xs leading-relaxed animate-in fade-in zoom-in-95 duration-200 font-sans">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Paper Successfully Compiled</p>
                    <p className="opacity-95 text-[11px] mt-0.5 font-sans font-medium">{omrSuccess}</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  onClick={() => setIsUploadAnswerSheetOpen(false)} 
                  className="px-5 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
