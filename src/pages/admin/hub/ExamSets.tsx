import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Layers, 
  Clock, 
  Shuffle, 
  MapPin, 
  CheckCircle, 
  ChevronRight,
  ChevronDown,
  ClipboardList,
  Activity,
  X,
  Save,
  Trash2,
  Edit,
  ExternalLink,
  Shield,
  FileText,
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  Check,
  AlertCircle,
  FileJson,
  FileSpreadsheet,
  Lock,
  HelpCircle,
  Users,
  Settings,
  Database,
  ArrowRight,
  Eye,
  Info,
  Copy,
  FolderMinus,
  Archive,
  Power,
  CloudLightning,
  Loader2
} from 'lucide-react';
import { motion } from 'motion/react';
import { MOCK_CENTRAL_ITEM_BANK, INITIAL_BLUEPRINTS, Blueprint, BankQuestion, BlueprintSection } from './blueprintMockData';

// Security and role persona states
type UserRole = 'EXAM_ADMINISTRATOR' | 'ACADEMIC_REVIEWER' | 'SYSTEM_ADMIN';

interface ExamAssemblyForm {
  id: string;
  code: string;
  name: string;
  blueprintId: string;
  blueprintVersion: string;
  examVersion: string;
  examPeriod: string; // e.g., "AY 2026 Q3 Midterms"
  examType: string;   // e.g., "Scholarship", "Admission"
  academicYear: string;
  status: 'DRAFT' | 'VALIDATING' | 'ACADEMIC_REVIEW' | 'REVISION_REQUIRED' | 'APPROVED' | 'PUBLISHED' | 'RETIRED';
  questions: BankQuestion[];
  instructions: string;
  timeLimit: number; // in minutes
  totalMarks: number;
  hash?: string; // Digital security hash
  auditLog: AuditEntry[];
}

interface AuditEntry {
  id: string;
  timestamp: string;
  user: string;
  action: 'CREATE' | 'EDIT' | 'DELETE' | 'ASSEMBLE' | 'REPLACE_QUESTION' | 'REMOVE_QUESTION' | 'ADD_QUESTION' | 'VALIDATE' | 'SUBMIT' | 'REVIEW' | 'APPROVE' | 'PUBLISH' | 'ARCHIVE' | 'RETIRE' | 'DUPLICATE';
  previousValue: string;
  newValue: string;
  ipAddress: string;
  device: string;
  comments: string;
}

// Pre-populated Assembly drafts to give the app immediate lifelike functionality
const INITIAL_ASSEMBLIES: ExamAssemblyForm[] = [
  {
    id: 'ASM-2026-SPACE-A',
    code: 'EXAM-2026-SPACE-01A',
    name: 'National Space Science Fellowship - Form A',
    blueprintId: 'BP-001',
    blueprintVersion: '1.0',
    examVersion: '1.0-Draft',
    examPeriod: 'AY 2026-2027 Nationwide Admissions',
    examType: 'Scholarship',
    academicYear: '2026-2027',
    status: 'ACADEMIC_REVIEW',
    instructions: 'This form is administered online under strict proctor supervision. Candidates must utilize the standard scientific calculator plug-in. Show all calculations where prompted.',
    timeLimit: 75,
    totalMarks: 50,
    questions: [
      MOCK_CENTRAL_ITEM_BANK[0], // Space Science - Orbital Mechanics - EASY
      MOCK_CENTRAL_ITEM_BANK[1], // Space Science - Orbital Mechanics - DIFFICULT
      MOCK_CENTRAL_ITEM_BANK[2], // Space Science - Orbital Mechanics - EASY
      MOCK_CENTRAL_ITEM_BANK[4], // Space Science - Propulsion - MODERATE
      MOCK_CENTRAL_ITEM_BANK[5], // Space Science - Propulsion - MODERATE
      MOCK_CENTRAL_ITEM_BANK[6], // Remote Sensing - NDVI - EASY
      MOCK_CENTRAL_ITEM_BANK[7], // Remote Sensing - Spatial Res - DIFFICULT
      MOCK_CENTRAL_ITEM_BANK[8], // Remote Sensing - SAR - MODERATE
      MOCK_CENTRAL_ITEM_BANK[10], // Remote Sensing - NDVI - EASY
    ],
    auditLog: [
      {
        id: 'LOG-001',
        timestamp: '2026-06-25T10:15:30Z',
        user: 'Atty. Mark Alampay (Exam Admin)',
        action: 'CREATE',
        previousValue: 'None',
        newValue: 'Form A Initialized with Blueprint BP-001',
        ipAddress: '192.168.10.45',
        device: 'macOS / Chrome v125',
        comments: 'Created base draft for high school fellowship stream.'
      },
      {
        id: 'LOG-002',
        timestamp: '2026-06-25T10:20:45Z',
        user: 'Atty. Mark Alampay (Exam Admin)',
        action: 'ASSEMBLE',
        previousValue: '0 Questions Bound',
        newValue: '9 Questions Auto-Selected via Blueprint Algorithms',
        ipAddress: '192.168.10.45',
        device: 'macOS / Chrome v125',
        comments: 'Triggered auto-selection process to populate sections.'
      },
      {
        id: 'LOG-003',
        timestamp: '2026-06-25T11:02:12Z',
        user: 'Atty. Mark Alampay (Exam Admin)',
        action: 'SUBMIT',
        previousValue: 'DRAFT',
        newValue: 'ACADEMIC_REVIEW',
        ipAddress: '192.168.10.45',
        device: 'macOS / Chrome v125',
        comments: 'Form complies with 94% of blueprint rules. Submitting to Board for review.'
      }
    ]
  },
  {
    id: 'ASM-2026-CALC-R',
    code: 'EXAM-2026-CALC-02',
    name: 'Advanced Aerospace Mathematical Calculus - Regular Set',
    blueprintId: 'BP-002',
    blueprintVersion: '1.0',
    examVersion: '1.0',
    examPeriod: 'AY 2026-2027 Engineering Placement',
    examType: 'Technical',
    academicYear: '2026-2027',
    status: 'PUBLISHED',
    instructions: 'Calculators are strictly prohibited. Answers must contain absolute step proofs written directly into the spatial entry fields.',
    timeLimit: 60,
    totalMarks: 30,
    hash: '0x9E7F8C43D1A5E9B2F87A6C30214D98EF',
    questions: [
      MOCK_CENTRAL_ITEM_BANK[11], // Calculus - EASY
      MOCK_CENTRAL_ITEM_BANK[12], // Calculus - DIFFICULT
      MOCK_CENTRAL_ITEM_BANK[13], // Calculus - DIFFICULT
      MOCK_CENTRAL_ITEM_BANK[14], // Linear Algebra - EASY
      MOCK_CENTRAL_ITEM_BANK[16], // Linear Algebra - MODERATE
    ],
    auditLog: [
      {
        id: 'LOG-101',
        timestamp: '2026-06-24T09:00:00Z',
        user: 'Atty. Mark Alampay (Exam Admin)',
        action: 'CREATE',
        previousValue: 'None',
        newValue: 'Calculus Regular Set Initialized',
        ipAddress: '192.168.10.45',
        device: 'macOS / Chrome v125',
        comments: 'Created calculus technical stream template.'
      },
      {
        id: 'LOG-102',
        timestamp: '2026-06-24T09:15:30Z',
        user: 'Atty. Mark Alampay (Exam Admin)',
        action: 'ASSEMBLE',
        previousValue: '0 Questions',
        newValue: '5 Questions Bound',
        ipAddress: '192.168.10.45',
        device: 'macOS / Chrome v125',
        comments: 'Auto assembled.'
      },
      {
        id: 'LOG-103',
        timestamp: '2026-06-24T14:30:00Z',
        user: 'Dr. Maria Elena Santos (Reviewer)',
        action: 'APPROVE',
        previousValue: 'ACADEMIC_REVIEW',
        newValue: 'APPROVED',
        ipAddress: '192.168.20.101',
        device: 'Windows 11 / Edge v124',
        comments: 'Perfect coverage of limit bounds and coordinate vectors.'
      },
      {
        id: 'LOG-104',
        timestamp: '2026-06-24T16:45:10Z',
        user: 'Atty. Mark Alampay (Exam Admin)',
        action: 'PUBLISH',
        previousValue: 'APPROVED',
        newValue: 'PUBLISHED',
        ipAddress: '192.168.10.45',
        device: 'macOS / Chrome v125',
        comments: 'Published official immutable pack. Hash signed and written to national registries.'
      }
    ]
  }
];

export default function ExamSets() {
  // Global States
  const [activeTab, setActiveTab] = useState<'dashboard' | 'assembly' | 'packages' | 'audit'>('dashboard');
  const [currentRole, setCurrentRole] = useState<UserRole>('EXAM_ADMINISTRATOR');

  // Upload to Testing Centers States
  const [uploadTargetPackage, setUploadTargetPackage] = useState<any | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedCenters, setSelectedCenters] = useState<string[]>(['manila', 'cebu', 'davao', 'quezon']);
  const [syncingCenters, setSyncingCenters] = useState<Record<string, 'IDLE' | 'SYNCING' | 'SUCCESS' | 'ERROR'>>({});
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [centerSyncRegistry, setCenterSyncRegistry] = useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem('philsa_exam_sync_registry');
    return saved ? JSON.parse(saved) : {};
  });

  const saveSyncStatus = (packageId: string, centers: string[]) => {
    setCenterSyncRegistry(prev => {
      const updated = {
        ...prev,
        [packageId]: Array.from(new Set([...(prev[packageId] || []), ...centers]))
      };
      localStorage.setItem('philsa_exam_sync_registry', JSON.stringify(updated));
      return updated;
    });
  };

  // Load and map questions dynamically from the shared Question Bank (philsa_hub_questions)
  const itemBank: BankQuestion[] = React.useMemo(() => {
    const saved = localStorage.getItem('philsa_hub_questions');
    let loadedQs: any[] = [];
    if (saved) {
      try {
        loadedQs = JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    
    // Convert/Map loadedQs to BankQuestion format
    const mapped: BankQuestion[] = loadedQs.map((q: any) => {
      // Determine type code
      let typeCode: 'MCQ' | 'TF' | 'ESSAY' | 'FIB' = 'MCQ';
      const t = (q.typeCode || q.type || 'MCQ').toString().toUpperCase();
      if (t.includes('MCQ') || t.includes('MULTIPLE CHOICE')) typeCode = 'MCQ';
      else if (t.includes('TF') || t.includes('TRUE/FALSE') || t.includes('TRUE')) typeCode = 'TF';
      else if (t.includes('ESSAY') || t.includes('READING')) typeCode = 'ESSAY';
      else if (t.includes('FIB') || t.includes('IDENTIFICATION')) typeCode = 'FIB';

      // Determine difficulty
      let diff: 'EASY' | 'MODERATE' | 'DIFFICULT' = 'MODERATE';
      const d = (q.difficulty || 'MODERATE').toString().toUpperCase();
      if (d === 'EASY' || d === 'LOW') diff = 'EASY';
      else if (d === 'DIFFICULT' || d === 'HARD' || d === 'HIGH') diff = 'DIFFICULT';

      return {
        id: q.id,
        text: q.content || q.text || '',
        type: typeCode,
        subject: q.subject || 'Science',
        topic: q.topic || 'General Topic',
        difficulty: diff,
        competency: q.competency || 'General Competency',
        score: q.points || q.score || 5,
        status: (q.status === 'PUBLISHED' || q.status === 'APPROVED' || q.status === 'ACTIVE') ? 'ACTIVE' : 'DRAFT'
      };
    });

    if (mapped.length === 0) {
      return MOCK_CENTRAL_ITEM_BANK;
    }
    return mapped;
  }, []);

  const [assemblies, setAssemblies] = useState<ExamAssemblyForm[]>(() => {
    const saved = localStorage.getItem('philsa_exam_assemblies');
    return saved ? JSON.parse(saved) : INITIAL_ASSEMBLIES;
  });

  // Synchronize assemblies' questions with the Question Bank items dynamically
  useEffect(() => {
    const qBankSaved = localStorage.getItem('philsa_hub_questions');
    if (!qBankSaved) return;
    try {
      const qList = JSON.parse(qBankSaved) as any[];
      let updatedAny = false;

      const nextAssemblies = assemblies.map(asm => {
        const nextQuestions = asm.questions.map(q => {
          const found = qList.find(item => item.id === q.id);
          if (found) {
            // Check if contents are different
            const contentText = found.content || found.text || '';
            const pointsVal = found.points || found.score || 5;
            if (q.text !== contentText || q.score !== pointsVal) {
              updatedAny = true;
              return {
                ...q,
                text: contentText,
                score: pointsVal
              };
            }
          }
          return q;
        });

        if (JSON.stringify(nextQuestions) !== JSON.stringify(asm.questions)) {
          updatedAny = true;
          return {
            ...asm,
            questions: nextQuestions,
            totalMarks: nextQuestions.reduce((sum, item) => sum + item.score, 0)
          };
        }
        return asm;
      });

      if (updatedAny) {
        setAssemblies(nextAssemblies);
      }
    } catch (e) {
      // ignore
    }
  }, [itemBank]);

  // Save to local storage
  useEffect(() => {
    localStorage.setItem('philsa_exam_assemblies', JSON.stringify(assemblies));
  }, [assemblies]);

  // Assembly State management
  const [selectedAssembly, setSelectedAssembly] = useState<ExamAssemblyForm | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Assembly Creation Wizard Form state
  const [wizardMeta, setWizardMeta] = useState({
    name: '',
    code: '',
    blueprintId: INITIAL_BLUEPRINTS[0]?.id || '',
    examPeriod: 'AY 2026-2027 Nationwide Admissions',
    examType: 'Scholarship',
    academicYear: '2026-2027',
    instructions: 'Answer all questions according to rules.',
    timeLimit: 75,
  });

  // Question replacement drawer
  const [isReplaceDrawerOpen, setIsReplaceDrawerOpen] = useState(false);
  const [questionToReplaceIdx, setQuestionToReplaceIdx] = useState<number | null>(null);
  const [replaceSearchQuery, setReplaceSearchQuery] = useState('');

  // Toast System
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  // Collapsible questions in assembly question review
  const [expandedQuestions, setExpandedQuestions] = useState<Record<string, boolean>>({});

  // Collapsible pre-validation rules details state
  const [showPreValidationDetails, setShowPreValidationDetails] = useState(false);

  // Auto-expand the first question when an assembly is selected
  useEffect(() => {
    if (selectedAssembly && selectedAssembly.questions && selectedAssembly.questions.length > 0) {
      setExpandedQuestions({ [`${selectedAssembly.id}-${selectedAssembly.questions[0].id}-0`]: true });
    } else {
      setExpandedQuestions({});
    }
  }, [selectedAssembly?.id]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Log an audit entry helper
  const logAudit = (
    assemblyId: string, 
    action: AuditEntry['action'], 
    prevVal: string, 
    newVal: string, 
    comments: string
  ) => {
    const newEntry: AuditEntry = {
      id: `LOG-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toISOString(),
      user: currentRole === 'EXAM_ADMINISTRATOR' ? 'Atty. Mark Alampay (Exam Admin)' : 
            currentRole === 'ACADEMIC_REVIEWER' ? 'Dr. Emil Javier (Reviewer)' : 'System Admin Root',
      action,
      previousValue: prevVal,
      newValue: newVal,
      ipAddress: '192.168.10.45',
      device: 'macOS Sonoma / Safari 17.4',
      comments
    };

    setAssemblies(prev => prev.map(asm => {
      if (asm.id === assemblyId) {
        return {
          ...asm,
          auditLog: [newEntry, ...asm.auditLog]
        };
      }
      return asm;
    }));
  };

  // Blueprint pre-validation helper
  const validateBlueprint = (blueprintId: string): { valid: boolean; errors: string[]; warnings: string[] } => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const bp = INITIAL_BLUEPRINTS.find(b => b.id === blueprintId);
    
    if (!bp) {
      errors.push("Referenced Exam Blueprint could not be found in the system registry.");
      return { valid: false, errors, warnings };
    }

    if (bp.status !== 'PUBLISHED' && bp.status !== 'APPROVED') {
      errors.push(`Blueprint is in '${bp.status}' status. Only APPROVED or PUBLISHED blueprints may be assembled.`);
    }

    // Check item bank capacity
    bp.sections.forEach(sec => {
      const availableItems = itemBank.filter(q => q.subject === sec.subject);
      if (availableItems.length < sec.itemCount) {
        errors.push(`Insufficient approved items in Item Bank for ${sec.name}. Required: ${sec.itemCount}, Available in Bank: ${availableItems.length}`);
      }

      // Check difficulty distribution coverage
      const easyItems = availableItems.filter(q => q.difficulty === 'EASY');
      const moderateItems = availableItems.filter(q => q.difficulty === 'MODERATE');
      const difficultItems = availableItems.filter(q => q.difficulty === 'DIFFICULT');

      if (easyItems.length < sec.difficultyDistribution.easy) {
        warnings.push(`Low pool depth for EASY questions in ${sec.subject}. Needed: ${sec.difficultyDistribution.easy}, Available: ${easyItems.length}`);
      }
      if (moderateItems.length < sec.difficultyDistribution.moderate) {
        warnings.push(`Low pool depth for MODERATE questions in ${sec.subject}. Needed: ${sec.difficultyDistribution.moderate}, Available: ${moderateItems.length}`);
      }
      if (difficultItems.length < sec.difficultyDistribution.difficult) {
        warnings.push(`Low pool depth for DIFFICULT questions in ${sec.subject}. Needed: ${sec.difficultyDistribution.difficult}, Available: ${difficultItems.length}`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  };

  // Auto-assembly algorithm
  const handleAutoAssemble = (assemblyId: string, blueprintId: string) => {
    const bp = INITIAL_BLUEPRINTS.find(b => b.id === blueprintId);
    if (!bp) return;

    const validation = validateBlueprint(blueprintId);
    if (!validation.valid) {
      showToast(`Blueprint validation failed. Check warning logs.`, 'error');
      return;
    }

    let assembledQuestions: BankQuestion[] = [];
    let alreadySelectedIds = new Set<string>();

    bp.sections.forEach(sec => {
      // 1. Filter bank questions for this subject
      let sectionPool = itemBank.filter(q => q.subject === sec.subject && !alreadySelectedIds.has(q.id));

      // 2. Select by difficulty criteria
      const difficulties: ('EASY' | 'MODERATE' | 'DIFFICULT')[] = ['EASY', 'MODERATE', 'DIFFICULT'];
      difficulties.forEach(diff => {
        const requiredCount = diff === 'EASY' ? sec.difficultyDistribution.easy :
                              diff === 'MODERATE' ? sec.difficultyDistribution.moderate :
                              sec.difficultyDistribution.difficult;
        
        let diffPool = sectionPool.filter(q => q.difficulty === diff);
        
        // Take up to required count
        const selected = diffPool.slice(0, requiredCount);
        selected.forEach(q => {
          assembledQuestions.push(q);
          alreadySelectedIds.add(q.id);
        });
      });

      // 3. Fallback: If section count is still short, fill with any subject matches
      const currentSectionSelectedCount = assembledQuestions.filter(q => q.subject === sec.subject).length;
      if (currentSectionSelectedCount < sec.itemCount) {
        const needed = sec.itemCount - currentSectionSelectedCount;
        const fallbackPool = itemBank.filter(q => q.subject === sec.subject && !alreadySelectedIds.has(q.id));
        const selectedFallback = fallbackPool.slice(0, needed);
        selectedFallback.forEach(q => {
          assembledQuestions.push(q);
          alreadySelectedIds.add(q.id);
        });
      }
    });

    // Update state
    setAssemblies(prev => prev.map(asm => {
      if (asm.id === assemblyId) {
        const totalMarks = assembledQuestions.reduce((sum, q) => sum + q.score, 0);
        return {
          ...asm,
          questions: assembledQuestions,
          totalMarks,
          status: 'VALIDATING'
        };
      }
      return asm;
    }));

    showToast(`Successfully auto-assembled ${assembledQuestions.length} compliant items from Item Bank!`, 'success');
    logAudit(
      assemblyId, 
      'ASSEMBLE', 
      '0 Questions Bound', 
      `${assembledQuestions.length} Questions Bound`, 
      'Triggered auto-selection process satisfying topic and cognitive levels.'
    );
  };

  // Save new assembly meta
  const handleCreateAssembly = (e: React.FormEvent) => {
    e.preventDefault();
    
    const duplicateCode = assemblies.some(a => a.code.toLowerCase() === wizardMeta.code.toLowerCase());
    if (duplicateCode) {
      showToast("Examination Code already exists in registry.", "error");
      return;
    }

    const bp = INITIAL_BLUEPRINTS.find(b => b.id === wizardMeta.blueprintId);
    if (!bp) return;

    const newAssembly: ExamAssemblyForm = {
      id: `ASM-2026-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
      code: wizardMeta.code,
      name: wizardMeta.name,
      blueprintId: wizardMeta.blueprintId,
      blueprintVersion: bp.version,
      examVersion: '1.0-Draft',
      examPeriod: wizardMeta.examPeriod,
      examType: wizardMeta.examType,
      academicYear: wizardMeta.academicYear,
      status: 'DRAFT',
      questions: [],
      instructions: wizardMeta.instructions,
      timeLimit: wizardMeta.timeLimit,
      totalMarks: 0,
      auditLog: []
    };

    setAssemblies(prev => [newAssembly, ...prev]);
    setIsFormOpen(false);
    setSelectedAssembly(newAssembly);
    setActiveTab('assembly');

    showToast("Examination form initialized as Draft.", "success");
    // Trigger initial log
    setTimeout(() => {
      logAudit(
        newAssembly.id, 
        'CREATE', 
        'None', 
        `Form Created binded to blueprint ${bp.code}`, 
        `Form meta set: Type ${newAssembly.examType} / Period ${newAssembly.examPeriod}`
      );
    }, 100);
  };

  // Replace a question manually
  const triggerReplaceQuestion = (index: number) => {
    setQuestionToReplaceIdx(index);
    setIsReplaceDrawerOpen(true);
  };

  const handleExecuteReplace = (newQuestion: BankQuestion) => {
    if (selectedAssembly === null || questionToReplaceIdx === null) return;

    const oldQ = selectedAssembly.questions[questionToReplaceIdx];
    const updatedQuestions = [...selectedAssembly.questions];
    updatedQuestions[questionToReplaceIdx] = newQuestion;
    const totalMarks = updatedQuestions.reduce((sum, q) => sum + q.score, 0);

    const updatedAssembly = {
      ...selectedAssembly,
      questions: updatedQuestions,
      totalMarks
    };

    setSelectedAssembly(updatedAssembly);
    setAssemblies(prev => prev.map(asm => asm.id === selectedAssembly.id ? updatedAssembly : asm));
    setIsReplaceDrawerOpen(false);
    
    showToast(`Replaced Question ${oldQ.id} with ${newQuestion.id}`, 'info');
    logAudit(
      selectedAssembly.id,
      'REPLACE_QUESTION',
      `ID: ${oldQ.id} (${oldQ.difficulty})`,
      `ID: ${newQuestion.id} (${newQuestion.difficulty})`,
      `Manual question swap in form sections. Swapped by admin instruction.`
    );
  };

  // Remove a question
  const handleRemoveQuestion = (idx: number) => {
    if (!selectedAssembly) return;
    const removedQ = selectedAssembly.questions[idx];
    const updatedQuestions = selectedAssembly.questions.filter((_, i) => i !== idx);
    const totalMarks = updatedQuestions.reduce((sum, q) => sum + q.score, 0);

    const updatedAssembly = {
      ...selectedAssembly,
      questions: updatedQuestions,
      totalMarks
    };

    setSelectedAssembly(updatedAssembly);
    setAssemblies(prev => prev.map(asm => asm.id === selectedAssembly.id ? updatedAssembly : asm));

    showToast(`Removed Question ${removedQ.id} from form layout.`, 'info');
    logAudit(
      selectedAssembly.id,
      'REMOVE_QUESTION',
      `ID: ${removedQ.id}`,
      'Removed',
      'Manually purged item from list.'
    );
  };

  // Add question index
  const handleAddQuestionToAssembly = (newQ: BankQuestion) => {
    if (!selectedAssembly) return;
    
    // Check if duplicate
    if (selectedAssembly.questions.some(q => q.id === newQ.id)) {
      showToast("Question is already in this examination form.", "error");
      return;
    }

    const updatedQuestions = [...selectedAssembly.questions, newQ];
    const totalMarks = updatedQuestions.reduce((sum, q) => sum + q.score, 0);

    const updatedAssembly = {
      ...selectedAssembly,
      questions: updatedQuestions,
      totalMarks
    };

    setSelectedAssembly(updatedAssembly);
    setAssemblies(prev => prev.map(asm => asm.id === selectedAssembly.id ? updatedAssembly : asm));

    showToast(`Added Question ${newQ.id} to form layout.`, 'success');
    logAudit(
      selectedAssembly.id,
      'ADD_QUESTION',
      'None',
      `ID: ${newQ.id}`,
      'Manually appended question to assembly.'
    );
  };

  // Re-arrange question sequence
  const moveQuestion = (idx: number, direction: 'UP' | 'DOWN') => {
    if (!selectedAssembly) return;
    const items = [...selectedAssembly.questions];
    if (direction === 'UP' && idx === 0) return;
    if (direction === 'DOWN' && idx === items.length - 1) return;

    const swapIdx = direction === 'UP' ? idx - 1 : idx + 1;
    const temp = items[idx];
    items[idx] = items[swapIdx];
    items[swapIdx] = temp;

    const updatedAssembly = {
      ...selectedAssembly,
      questions: items
    };

    setSelectedAssembly(updatedAssembly);
    setAssemblies(prev => prev.map(asm => asm.id === selectedAssembly.id ? updatedAssembly : asm));

    showToast(`Rearranged sequence. Swapped position ${idx + 1} and ${swapIdx + 1}`, 'info');
  };

  // Duplicate an assembly form
  const handleDuplicateAssembly = (asm: ExamAssemblyForm) => {
    const duplicated: ExamAssemblyForm = {
      ...asm,
      id: `ASM-2026-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
      code: `${asm.code}-DUP`,
      name: `${asm.name} (Copy)`,
      examVersion: `${asm.examVersion}-Copied`,
      status: 'DRAFT',
      hash: undefined,
      auditLog: [
        {
          id: `LOG-${Math.floor(1000 + Math.random() * 9000)}`,
          timestamp: new Date().toISOString(),
          user: 'Atty. Mark Alampay (Exam Admin)',
          action: 'DUPLICATE',
          previousValue: asm.id,
          newValue: 'Duplicated Draft Form',
          ipAddress: '192.168.10.45',
          device: 'macOS Sonoma / Chrome',
          comments: `Duplicated from form ${asm.code} with its entire questions subset.`
        }
      ]
    };

    setAssemblies(prev => [duplicated, ...prev]);
    showToast(`Duplicated Form ${asm.code} successfully.`, 'success');
  };

  // Archive or Retire an assembly
  const handleUpdateStatus = (asmId: string, newStatus: ExamAssemblyForm['status'], actionType: AuditEntry['action'], comment: string) => {
    setAssemblies(prev => prev.map(asm => {
      if (asm.id === asmId) {
        const updated = { ...asm, status: newStatus };
        if (selectedAssembly && selectedAssembly.id === asmId) {
          setSelectedAssembly(updated);
        }
        return updated;
      }
      return asm;
    }));

    showToast(`Assembly status transitioned to ${newStatus}`, 'success');
    logAudit(asmId, actionType, 'Previous Status', newStatus, comment);
  };

  // Publish Form (Generates immutable cryptographic signature & payload)
  const handlePublishAssembly = (asmId: string) => {
    const asm = assemblies.find(a => a.id === asmId);
    if (!asm) return;

    if (asm.questions.length === 0) {
      showToast("Cannot publish empty examination package.", "error");
      return;
    }

    // Hash calculation mock representing state cryptographic payload sealing
    const payloadStr = JSON.stringify({
      code: asm.code,
      name: asm.name,
      questionsCount: asm.questions.length,
      blueprintRef: asm.blueprintId,
      timeLimit: asm.timeLimit,
      totalMarks: asm.totalMarks
    });
    
    // Simple mock signature generator
    const hash = '0x' + Array.from({length: 32}, () => Math.floor(Math.random()*16).toString(16)).join('').toUpperCase();

    setAssemblies(prev => prev.map(a => {
      if (a.id === asmId) {
        const updated: ExamAssemblyForm = {
          ...a,
          status: 'PUBLISHED',
          hash,
          examVersion: '1.0-Official'
        };
        if (selectedAssembly && selectedAssembly.id === asmId) {
          setSelectedAssembly(updated);
        }
        return updated;
      }
      return a;
    }));

    showToast("Examination package compiled, hashed & published successfully!", "success");
    logAudit(
      asmId, 
      'PUBLISH', 
      'APPROVED', 
      'PUBLISHED', 
      `Cryptographic Seal Applied: ${hash}. Package transitioned to immutable read-only state.`
    );
  };

  // Validation rules evaluator for current state
  const evaluateValidationRules = (asm: ExamAssemblyForm) => {
    const bp = INITIAL_BLUEPRINTS.find(b => b.id === asm.blueprintId);
    const checks: { ruleName: string; status: 'PASS' | 'FAIL' | 'WARN'; detail: string }[] = [];

    if (!bp) {
      checks.push({ ruleName: 'Blueprint Bound', status: 'FAIL', detail: 'No associated Exam Blueprint found.' });
      return checks;
    }

    // Rule 1: Duplicate Questions
    const seenIds = new Set<string>();
    const dupes: string[] = [];
    asm.questions.forEach(q => {
      if (seenIds.has(q.id)) dupes.push(q.id);
      seenIds.add(q.id);
    });
    if (dupes.length > 0) {
      checks.push({ ruleName: 'Question Duplication', status: 'FAIL', detail: `Duplicate questions detected in assembly: ${dupes.join(', ')}` });
    } else {
      checks.push({ ruleName: 'Question Duplication', status: 'PASS', detail: 'No duplicate question items detected.' });
    }

    // Rule 2: Sections count
    if (asm.questions.length === 0) {
      checks.push({ ruleName: 'Form Capacity', status: 'FAIL', detail: 'Assembly holds 0 questions. Satisfies 0% of blueprint criteria.' });
      return checks;
    }

    // Rule 3: Exact Item count match
    const targetCount = bp.sections.reduce((sum, s) => sum + s.itemCount, 0);
    if (asm.questions.length !== targetCount) {
      checks.push({ ruleName: 'Item Count Match', status: 'FAIL', detail: `Total questions (${asm.questions.length}) does not match Blueprint required sum (${targetCount}).` });
    } else {
      checks.push({ ruleName: 'Item Count Match', status: 'PASS', detail: `Question count (${asm.questions.length}) satisfies Blueprint specifications perfectly.` });
    }

    // Rule 4: Difficulty Distribution Check
    bp.sections.forEach(sec => {
      const secAsmQuestions = asm.questions.filter(q => q.subject === sec.subject);
      
      const easyCount = secAsmQuestions.filter(q => q.difficulty === 'EASY').length;
      const modCount = secAsmQuestions.filter(q => q.difficulty === 'MODERATE').length;
      const diffCount = secAsmQuestions.filter(q => q.difficulty === 'DIFFICULT').length;

      const easyTarget = sec.difficultyDistribution.easy;
      const modTarget = sec.difficultyDistribution.moderate;
      const diffTarget = sec.difficultyDistribution.difficult;

      if (easyCount < easyTarget || modCount < modTarget || diffCount < diffTarget) {
        checks.push({
          ruleName: `Difficulty Distribution (${sec.subject})`,
          status: 'WARN',
          detail: `Mismatch in ${sec.subject} difficulty ratios. Easy: ${easyCount}/${easyTarget}, Mod: ${modCount}/${modTarget}, Hard: ${diffCount}/${diffTarget}`
        });
      } else {
        checks.push({
          ruleName: `Difficulty Distribution (${sec.subject})`,
          status: 'PASS',
          detail: `Difficulty metrics for ${sec.subject} are fully met.`
        });
      }
    });

    // Rule 5: Mark sum match
    const blueprintMarks = bp.sections.reduce((sum, s) => sum + s.totalMarks, 0);
    const assemblyMarks = asm.questions.reduce((sum, q) => sum + q.score, 0);
    if (blueprintMarks !== assemblyMarks) {
      checks.push({ ruleName: 'Marks Compliance', status: 'WARN', detail: `Assembled marks (${assemblyMarks} pts) deviate from Blueprint goals (${blueprintMarks} pts).` });
    } else {
      checks.push({ ruleName: 'Marks Compliance', status: 'PASS', detail: `Assembled total weight matches ${blueprintMarks} points target.` });
    }

    return checks;
  };

  // Active blueprint detail bound to selector
  const activeBlueprintData = INITIAL_BLUEPRINTS.find(b => b.id === (selectedAssembly?.blueprintId || wizardMeta.blueprintId));

  // Count active stats
  const stats = {
    draftsCount: assemblies.filter(a => a.status === 'DRAFT' || a.status === 'VALIDATING' || a.status === 'REVISION_REQUIRED').length,
    pendingReview: assemblies.filter(a => a.status === 'ACADEMIC_REVIEW').length,
    publishedPackages: assemblies.filter(a => a.status === 'PUBLISHED').length,
    validationErrors: assemblies.reduce((count, asm) => {
      const rules = evaluateValidationRules(asm);
      return count + rules.filter(r => r.status === 'FAIL').length;
    }, 0),
  };

  return (
    <div className="space-y-6 text-philsa-navy max-w-7xl mx-auto px-4 md:px-0">
      
      {/* Toast Alert Banner */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[100] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce border ${
          toast.type === 'success' ? 'bg-green-900/90 border-green-700 text-green-100' :
          toast.type === 'error' ? 'bg-red-900/90 border-red-700 text-red-100' :
          'bg-slate-900/90 border-slate-700 text-slate-100'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-5 h-5 text-green-400" /> :
           toast.type === 'error' ? <AlertTriangle className="w-5 h-5 text-red-400" /> :
           <Info className="w-5 h-5 text-sky-400" />}
          <p className="text-xs font-bold uppercase tracking-wider">{toast.message}</p>
        </div>
      )}

      {/* Control Control Bar with Security Personas */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-white border border-philsa-border rounded-3xl shadow-sm">
        <div className="space-y-1">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-philsa-navy/5 text-philsa-navy">
            <Lock className="w-2.5 h-2.5 text-philsa-red" /> PHILSA SECURE EXAMINATION FRAMEWORK
          </span>
          <h2 className="text-2xl font-black tracking-tight text-philsa-navy">Examination Assembly & Control</h2>
          <p className="text-xs font-medium text-philsa-gray">Auto-generation and manual calibration of blueprint-compliant national assessment packages.</p>
        </div>

        {/* Security Role Switcher */}
        <div className="flex items-center gap-2 bg-philsa-bg p-1.5 rounded-2xl border border-philsa-border/40 shrink-0">
          <span className="text-[10px] font-black uppercase tracking-wider text-philsa-gray px-3">Role:</span>
          {(['EXAM_ADMINISTRATOR', 'ACADEMIC_REVIEWER', 'SYSTEM_ADMIN'] as UserRole[]).map((r) => (
            <button
              key={r}
              onClick={() => {
                setCurrentRole(r);
                showToast(`Switched persona to ${r.replace('_', ' ')}`, 'info');
              }}
              className={`px-3 py-2 text-[10px] font-bold rounded-xl transition-all cursor-pointer ${
                currentRole === r 
                  ? 'bg-philsa-navy text-white shadow-sm font-black' 
                  : 'text-philsa-gray hover:text-philsa-navy hover:bg-philsa-border/20'
              }`}
            >
              {r === 'EXAM_ADMINISTRATOR' ? 'Exam Admin' : 
               r === 'ACADEMIC_REVIEWER' ? 'Reviewer' : 'SysAdmin'}
            </button>
          ))}
        </div>
      </div>

      {/* Global Tab Navigation */}
      <div className="flex flex-wrap gap-1 border-b border-philsa-border pb-1 select-none">
        {[
          { id: 'dashboard', label: 'Overview', icon: ClipboardList },
          { id: 'assembly', label: 'Exam Builder', icon: Layers },
          { id: 'packages', label: 'Published Exams', icon: Shield },
          { id: 'audit', label: 'Audit Logs', icon: FileText },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                if (tab.id === 'assembly' && !selectedAssembly && assemblies.length > 0) {
                  setSelectedAssembly(assemblies[0]);
                }
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                isActive 
                  ? 'bg-slate-100 text-philsa-navy font-bold' 
                  : 'text-philsa-gray hover:text-philsa-navy hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4 text-slate-500" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* TAB CONTENT: DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          
          {/* Dashboard Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card-philsa bg-white p-5 space-y-2 border-l-4 border-l-amber-500">
              <p className="text-[10px] font-black text-philsa-gray uppercase tracking-widest">Exam Sets In Progress</p>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-extrabold tracking-tight text-philsa-navy">{stats.draftsCount}</span>
                <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full">In Preparation</span>
              </div>
            </div>

            <div className="card-philsa bg-white p-5 space-y-2 border-l-4 border-l-sky-500">
              <p className="text-[10px] font-black text-philsa-gray uppercase tracking-widest">Exam Sets in Waiting Approval</p>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-extrabold tracking-tight text-philsa-navy">{stats.pendingReview}</span>
                <span className="text-[10px] font-semibold text-sky-600 bg-sky-50 px-2.5 py-0.5 rounded-full">Awaiting Board</span>
              </div>
            </div>

            <div className="card-philsa bg-white p-5 space-y-2 border-l-4 border-l-green-600">
              <p className="text-[10px] font-black text-philsa-gray uppercase tracking-widest">Published Exam Sets</p>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-extrabold tracking-tight text-philsa-navy">{stats.publishedPackages}</span>
                <span className="text-[10px] font-semibold text-green-600 bg-green-50 px-2.5 py-0.5 rounded-full">Signed & Secure</span>
              </div>
            </div>

            <div className="card-philsa bg-white p-5 space-y-2 border-l-4 border-l-red-500">
              <p className="text-[10px] font-black text-philsa-gray uppercase tracking-widest">Revisions Exams Sets</p>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-extrabold tracking-tight text-philsa-navy">{stats.validationErrors}</span>
                <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-2.5 py-0.5 rounded-full">Requires Calibration</span>
              </div>
            </div>
          </div>

          {/* Quick Start Assembly CTA & Draft Forms List */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left: Active Assembly Workflows */}
            <div className="lg:col-span-2 card-philsa bg-white space-y-4">
              <div className="flex justify-between items-center border-b border-philsa-border pb-3">
                <div>
                  <h3 className="font-extrabold text-lg text-philsa-navy">Examination Assemblies</h3>
                  <p className="text-xs text-philsa-gray">Select, design, duplicate, or archive national examination configurations.</p>
                </div>
                
                <button
                  onClick={() => setIsFormOpen(true)}
                  className="bg-philsa-red hover:bg-philsa-red/90 text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-philsa-red/10"
                >
                  <Plus className="w-4 h-4" /> Create Exam Set Assembly
                </button>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-philsa-gray" />
                  <input
                    type="text"
                    placeholder="Search by name, code, academic year..."
                    className="w-full bg-philsa-bg border border-philsa-border/60 rounded-xl py-2 pl-9 pr-4 text-xs font-medium focus:ring-1 focus:ring-philsa-navy outline-none"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <select
                  className="bg-white border border-philsa-border rounded-xl px-3 py-2 text-xs font-bold text-philsa-navy outline-none cursor-pointer"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="VALIDATING">Validating</option>
                  <option value="ACADEMIC_REVIEW">Academic Review</option>
                  <option value="REVISION_REQUIRED">Revision Required</option>
                  <option value="APPROVED">Approved</option>
                  <option value="PUBLISHED">Published</option>
                </select>
              </div>

              {/* Assemblies List Table */}
              <div className="overflow-x-auto border border-philsa-border rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-philsa-bg font-black uppercase tracking-widest text-[9px] text-philsa-gray border-b border-philsa-border">
                    <tr>
                      <th className="p-4">Exam Code & Title</th>
                      <th className="p-4">Blueprint Ref</th>
                      <th className="p-4">Bound Items</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-philsa-border">
                    {assemblies
                      .filter(asm => {
                        const matchesSearch = asm.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                              asm.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                              asm.academicYear.toLowerCase().includes(searchQuery.toLowerCase());
                        const matchesFilter = statusFilter === 'ALL' || asm.status === statusFilter;
                        return matchesSearch && matchesFilter;
                      })
                      .map((asm) => {
                        const complianceChecks = evaluateValidationRules(asm);
                        const hasErrors = complianceChecks.some(c => c.status === 'FAIL');
                        
                        return (
                          <tr key={asm.id} className="hover:bg-philsa-bg/45 transition-colors">
                            <td className="p-4 space-y-1">
                              <div className="flex items-center gap-1.5 font-bold text-philsa-navy">
                                <span>{asm.name}</span>
                              </div>
                              <div className="flex gap-2 text-[9px] font-mono text-philsa-gray">
                                <span>{asm.code}</span>
                                <span>•</span>
                                <span>{asm.examPeriod}</span>
                              </div>
                            </td>
                            <td className="p-4 font-mono text-[10px] text-philsa-navy">
                              {asm.blueprintId} (v{asm.blueprintVersion})
                            </td>
                            <td className="p-4 space-y-1">
                              <p className="font-bold">{asm.questions.length} questions</p>
                              <div className="flex items-center gap-1">
                                {hasErrors ? (
                                  <span className="text-[9px] text-red-600 bg-red-50 px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5">
                                    <AlertTriangle className="w-2.5 h-2.5" /> Fail
                                  </span>
                                ) : (
                                  <span className="text-[9px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5">
                                    <Check className="w-2.5 h-2.5" /> Compliant
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-4">
                              <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                asm.status === 'PUBLISHED' ? 'bg-green-100 text-green-700 border border-green-200' :
                                asm.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                                asm.status === 'ACADEMIC_REVIEW' ? 'bg-sky-100 text-sky-700 border border-sky-200' :
                                asm.status === 'REVISION_REQUIRED' ? 'bg-red-100 text-red-700 border border-red-200' :
                                asm.status === 'VALIDATING' ? 'bg-violet-100 text-violet-700 border border-violet-200' :
                                'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}>
                                {asm.status.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="p-4 text-right space-x-1.5 shrink-0 whitespace-nowrap">
                              <button
                                onClick={() => {
                                  setSelectedAssembly(asm);
                                  setActiveTab('assembly');
                                }}
                                className="bg-philsa-bg hover:bg-philsa-navy hover:text-white border border-philsa-border px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer"
                              >
                                View
                              </button>

                              <button
                                onClick={() => handleDuplicateAssembly(asm)}
                                title="Duplicate Form"
                                className="bg-white border border-philsa-border p-1.5 rounded-xl text-philsa-navy hover:bg-philsa-bg transition-all cursor-pointer inline-flex items-center"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>

                              {asm.status !== 'PUBLISHED' && (
                                <button
                                  onClick={() => {
                                    if (confirm("Confirm archiving this exam set assembly?")) {
                                      handleUpdateStatus(asm.id, 'RETIRED', 'RETIRE', 'Archived examination form.');
                                    }
                                  }}
                                  title="Archive/Retire Form"
                                  className="bg-white border border-red-100 p-1.5 rounded-xl text-red-500 hover:bg-red-50 transition-all cursor-pointer inline-flex items-center"
                                >
                                  <Archive className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Side: Quick Statistics & Analytics */}
            <div className="space-y-6">
              
              {/* Central Item Bank Coverage Summary */}
              <div className="card-philsa bg-white p-5 space-y-4">
                <div>
                  <h3 className="font-extrabold text-sm text-philsa-navy">Central Item Bank Inventory</h3>
                  <p className="text-[10px] text-philsa-gray font-semibold uppercase tracking-widest">Active Pool Depth metrics</p>
                </div>

                <div className="space-y-3">
                  {[
                    { subject: 'Reading Comp (English, Filipino)', count: itemBank.filter(q => q.subject === 'Reading Comp (English, Filipino)').length, color: 'bg-indigo-600' },
                    { subject: 'Lang Proficiency (English, Filipino)', count: itemBank.filter(q => q.subject === 'Lang Proficiency (English, Filipino)').length, color: 'bg-green-600' },
                    { subject: 'Math', count: itemBank.filter(q => q.subject === 'Math').length, color: 'bg-amber-500' },
                    { subject: 'Science', count: itemBank.filter(q => q.subject === 'Science').length, color: 'bg-philsa-red' }
                  ].map((inv) => (
                    <div key={inv.subject} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold">
                        <span>{inv.subject}</span>
                        <span>{inv.count} items</span>
                      </div>
                      <div className="h-2 w-full bg-philsa-bg rounded-full overflow-hidden">
                        <div className={`h-full ${inv.color}`} style={{ width: `${(inv.count / itemBank.length) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="pt-3 border-t border-philsa-border/60 text-center">
                  <span className="text-[10px] font-black text-philsa-navy uppercase tracking-widest bg-philsa-bg py-2 px-3 rounded-xl inline-block">
                    Total Bank Size: {itemBank.length} Approved Items
                  </span>
                </div>
              </div>

              {/* Core Quality Compliance Alerts */}
              <div className="card-philsa bg-white p-5 space-y-3">
                <h3 className="font-extrabold text-sm text-philsa-navy">National Security Checkpoints</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2.5 p-3 bg-green-50 border border-green-100 rounded-xl">
                    <CheckCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-green-950">Approved Sources Sealing</p>
                      <p className="text-[11px] text-green-800">Only Item Writers with certified security keys can authorize question insertion.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                    <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-amber-950">Linked Shared Stimulus Rules</p>
                      <p className="text-[11px] text-amber-800">Linked questions must always be assembled into a sequential single subset.</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: ASSEMBLY WORKSPACE LAB */}
      {activeTab === 'assembly' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Form & Blueprint Controller */}
            <div className="card-philsa bg-white p-6 space-y-6 h-fit">
              <div className="border-b border-philsa-border pb-3">
                <h3 className="font-black text-base text-philsa-navy">Assembly Configuration</h3>
                <p className="text-xs text-philsa-gray">Select blueprint and run validation parameters.</p>
              </div>

              {/* Selector for current assembly to calibrate */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-philsa-navy">Selected Exam Draft</label>
                <select
                  className="w-full bg-philsa-bg border border-philsa-border rounded-xl p-3 text-xs font-bold text-philsa-navy outline-none cursor-pointer"
                  value={selectedAssembly?.id || ''}
                  onChange={(e) => {
                    const found = assemblies.find(a => a.id === e.target.value);
                    if (found) setSelectedAssembly(found);
                  }}
                >
                  <option value="" disabled>Select an assembly...</option>
                  {assemblies.map(a => (
                    <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                  ))}
                </select>
              </div>

              {selectedAssembly ? (
                <div className="space-y-4">
                  
                  {/* Unified Assembly Information Card */}
                  <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 space-y-4 text-xs">
                    <div>
                      <span className="text-[9px] font-black uppercase text-philsa-gray tracking-wider">Exam Settings</span>
                      <p className="font-bold text-sm text-philsa-navy mt-1">{activeBlueprintData ? activeBlueprintData.name : 'No Blueprint Spec Loaded'}</p>
                      {activeBlueprintData && <p className="text-[11px] text-philsa-gray mt-1 leading-snug">{activeBlueprintData.description}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200/60 text-[11px]">
                      <div>
                        <span className="text-philsa-gray block">Assembly Code</span>
                        <span className="font-mono font-bold text-philsa-navy">{selectedAssembly.code}</span>
                      </div>
                      <div>
                        <span className="text-philsa-gray block">Workflow Stage</span>
                        <span className="font-bold text-philsa-red">{selectedAssembly.status.replace('_', ' ')}</span>
                      </div>
                      <div>
                        <span className="text-philsa-gray block">Total Marks</span>
                        <span className="font-bold text-philsa-navy">{selectedAssembly.totalMarks} Points</span>
                      </div>
                      {activeBlueprintData && (
                        <div>
                          <span className="text-philsa-gray block">Target Items / Marks</span>
                          <span className="font-bold text-philsa-navy">{activeBlueprintData.rules.totalItems} Items / {activeBlueprintData.rules.totalMarks} Pts</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Collapsible Pre-Assembly Live Blueprint Checks */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                    <button
                      type="button"
                      onClick={() => setShowPreValidationDetails(!showPreValidationDetails)}
                      className="w-full flex justify-between items-center p-3 bg-slate-50/50 hover:bg-slate-50 text-left focus:outline-none border-b border-slate-100 cursor-pointer select-none"
                    >
                      <span className="text-xs font-bold text-philsa-navy uppercase tracking-wider flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-philsa-red" /> 
                        Checklist / Readiness Check ({evaluateValidationRules(selectedAssembly).filter(r => r.status === 'PASS').length}/{evaluateValidationRules(selectedAssembly).length} Passed)
                      </span>
                      {showPreValidationDetails ? (
                        <ChevronDown className="w-4 h-4 text-philsa-gray" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-philsa-gray" />
                      )}
                    </button>
                    
                    {showPreValidationDetails && (
                      <div className="p-3 bg-white space-y-2 max-h-[180px] overflow-y-auto animate-in fade-in duration-100">
                        {evaluateValidationRules(selectedAssembly).map((rule, idx) => (
                          <div key={idx} className={`p-2.5 rounded-xl border flex items-start gap-2 text-[11px] ${
                            rule.status === 'PASS' ? 'bg-green-50/60 border-green-100 text-green-900' :
                            rule.status === 'FAIL' ? 'bg-red-50/60 border-red-100 text-red-900' :
                            'bg-amber-50/60 border-amber-100 text-amber-900'
                          }`}>
                            {rule.status === 'PASS' ? (
                              <CheckCircle className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
                            ) : rule.status === 'FAIL' ? (
                              <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                            ) : (
                              <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                            )}
                            <div>
                              <p className="font-bold">{rule.ruleName}</p>
                              <p className="text-[10px] text-philsa-gray leading-tight mt-0.5">{rule.detail}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Workflow Stage Controller Actions */}
                  <div className="space-y-2 pt-4 border-t border-philsa-border">
                    <p className="text-[10px] font-black text-philsa-gray uppercase tracking-widest">Publish Controls</p>
                    
                    {/* Admin Actions */}
                    {currentRole === 'EXAM_ADMINISTRATOR' && (
                      <div className="space-y-2">
                        {selectedAssembly.status === 'DRAFT' && (
                          <button
                            onClick={() => handleAutoAssemble(selectedAssembly.id, selectedAssembly.blueprintId)}
                            className="w-full bg-philsa-navy hover:bg-philsa-navy/90 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all"
                          >
                            <RefreshCw className="w-4 h-4 animate-spin" /> Run Auto-Selection
                          </button>
                        )}

                        {selectedAssembly.status === 'VALIDATING' && (
                          <button
                            onClick={() => handleUpdateStatus(selectedAssembly.id, 'ACADEMIC_REVIEW', 'SUBMIT', 'Submitted for board review.')}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all"
                          >
                            Submit for Academic Review
                          </button>
                        )}

                        {selectedAssembly.status === 'APPROVED' && (
                          <button
                            onClick={() => handlePublishAssembly(selectedAssembly.id)}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all"
                          >
                            Publish Immutable Package
                          </button>
                        )}

                        <p className="text-[10px] text-philsa-gray text-center italic mt-1">To access approval actions, switch to the Reviewer persona above.</p>
                      </div>
                    )}

                    {/* Reviewer Actions */}
                    {currentRole === 'ACADEMIC_REVIEWER' && (
                      <div className="space-y-2">
                        {selectedAssembly.status === 'ACADEMIC_REVIEW' ? (
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => handleUpdateStatus(selectedAssembly.id, 'APPROVED', 'APPROVE', 'Examination structure complies with academic rigor.')}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-2 rounded-xl text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-all"
                            >
                              Approve Form
                            </button>
                            <button
                              onClick={() => {
                                const reason = prompt("Enter revision requirement comments:");
                                if (reason) {
                                  handleUpdateStatus(selectedAssembly.id, 'REVISION_REQUIRED', 'REVIEW', `Revision Requested: ${reason}`);
                                }
                              }}
                              className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-2 rounded-xl text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-all"
                            >
                              Require Revision
                            </button>
                          </div>
                        ) : (
                          <p className="text-xs text-philsa-gray text-center bg-philsa-bg p-3 rounded-xl border border-philsa-border/40 font-semibold">Form is currently in '{selectedAssembly.status}' status. No reviewer actions needed.</p>
                        )}
                      </div>
                    )}

                    {/* System Admin Configurations */}
                    {currentRole === 'SYSTEM_ADMIN' && (
                      <div className="space-y-1 bg-philsa-bg p-3 rounded-2xl border border-philsa-border/60">
                        <p className="font-bold text-xs">Superuser Operations</p>
                        <p className="text-[11px] text-philsa-gray">Force state recovery:</p>
                        <div className="flex gap-1.5 mt-2">
                          <button
                            onClick={() => handleUpdateStatus(selectedAssembly.id, 'DRAFT', 'EDIT', 'Superuser forced state reset to draft.')}
                            className="flex-1 bg-slate-700 hover:bg-slate-800 text-white font-black text-[9px] py-2 rounded-lg uppercase tracking-widest cursor-pointer"
                          >
                            Discard Changes
                          </button>
                          <button
                            onClick={() => handlePublishAssembly(selectedAssembly.id)}
                            className="flex-1 bg-green-700 hover:bg-green-800 text-white font-black text-[9px] py-2 rounded-lg uppercase tracking-widest cursor-pointer"
                          >
                            Publish Anyway
                          </button>
                        </div>
                      </div>
                    )}

                  </div>

                </div>
              ) : (
                <div className="p-6 text-center text-xs text-philsa-gray bg-philsa-bg border border-dashed border-philsa-border rounded-2xl">
                  No examination assemblies selected. Initialize or choose one to begin calibrating.
                </div>
              )}
            </div>

            {/* Middle & Right: Active Form Items Editor */}
            <div className="lg:col-span-2 card-philsa bg-white p-6 space-y-6">
              
              {selectedAssembly ? (
                <div className="space-y-6">
                  
                  {/* Form Title & Top Metadata Edit */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-philsa-border pb-4 gap-4">
                    <div className="space-y-1 flex-1">
                      <p className="text-[10px] font-black text-philsa-red uppercase tracking-widest font-mono">QUESTION REVIEW</p>
                      <h3 className="font-extrabold text-lg text-philsa-navy">{selectedAssembly.name}</h3>
                      <p className="text-xs text-philsa-gray">Add, swap, reorder, and audit questions bound to this examination form.</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-philsa-navy bg-philsa-bg border border-philsa-border px-3 py-1.5 rounded-xl">
                        Form total: <b className="font-black text-philsa-red">{selectedAssembly.totalMarks} Points</b>
                      </span>
                    </div>
                  </div>

                  {/* Assembled Questions List (Interactive & Live-updating) */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-xs text-philsa-navy uppercase tracking-wider flex items-center gap-1.5">
                        <Database className="w-4 h-4 text-philsa-red" /> Exam Questions
                      </h4>
                      
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1.5 text-[10px] font-bold">
                          <button
                            onClick={() => {
                              const expanded: Record<string, boolean> = {};
                              selectedAssembly.questions.forEach((q, idx) => {
                                expanded[`${selectedAssembly.id}-${q.id}-${idx}`] = true;
                              });
                              setExpandedQuestions(expanded);
                            }}
                            className="text-philsa-red hover:underline uppercase tracking-wider text-[9px] cursor-pointer"
                          >
                            Expand All
                          </button>
                          <span className="text-philsa-border">|</span>
                          <button
                            onClick={() => setExpandedQuestions({})}
                            className="text-philsa-gray hover:underline uppercase tracking-wider text-[9px] cursor-pointer"
                          >
                            Collapse All
                          </button>
                        </div>

                        {selectedAssembly.status !== 'PUBLISHED' && (
                          <button
                            onClick={() => {
                              setQuestionToReplaceIdx(null); // Adding new
                              setIsReplaceDrawerOpen(true);
                            }}
                            className="bg-philsa-navy text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-philsa-navy/90 transition-all cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add Question Item
                          </button>
                        )}
                      </div>
                    </div>

                    {selectedAssembly.questions.length === 0 ? (
                      <div className="p-12 text-center text-xs text-philsa-gray border border-dashed border-philsa-border/85 rounded-3xl bg-philsa-bg/30 space-y-3">
                        <p className="font-bold">No Questions Configured in Layout.</p>
                        <p className="max-w-md mx-auto text-[11px]">Use the automatic question selection algorithm or click "Add Question Item" to construct the examination sections manually.</p>
                        
                        {currentRole === 'EXAM_ADMINISTRATOR' && (
                          <button
                            onClick={() => handleAutoAssemble(selectedAssembly.id, selectedAssembly.blueprintId)}
                            className="bg-philsa-red text-white font-bold py-2 px-5 rounded-xl uppercase tracking-wider text-[10px] inline-flex items-center gap-1 cursor-pointer"
                          >
                            Run Auto-Selection
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
                        {selectedAssembly.questions.map((q, idx) => {
                          const key = `${selectedAssembly.id}-${q.id}-${idx}`;
                          const isExpanded = !!expandedQuestions[key];
                          const previewText = q.text.length > 90 ? q.text.slice(0, 90) + '...' : q.text;

                          return (
                            <div 
                              key={`${q.id}-${idx}`}
                              className="border border-philsa-border hover:border-philsa-navy/30 rounded-2xl overflow-hidden bg-white shadow-2xs transition-all"
                            >
                              {/* Trigger Header */}
                              <div
                                onClick={() => setExpandedQuestions(prev => ({ ...prev, [key]: !isExpanded }))}
                                className="p-3 bg-white hover:bg-slate-50/50 flex items-center justify-between gap-4 cursor-pointer select-none transition-colors"
                              >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <span className="w-6 h-6 bg-philsa-bg border border-philsa-border rounded-lg flex items-center justify-center font-mono font-black text-xs text-philsa-navy shrink-0">
                                    {idx + 1}
                                  </span>

                                  <div className="flex-1 min-w-0 space-y-0.5">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className="text-[8px] font-mono font-black uppercase text-philsa-navy bg-philsa-bg px-1.5 py-0.5 rounded border border-philsa-border/40">
                                        {q.id}
                                      </span>
                                      <span className="text-[8px] font-bold uppercase text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                                        {q.subject}
                                      </span>
                                      <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                        q.difficulty === 'EASY' ? 'text-green-700 bg-green-50' :
                                        q.difficulty === 'MODERATE' ? 'text-amber-700 bg-amber-50' :
                                        'text-red-700 bg-red-50'
                                      }`}>
                                        {q.difficulty}
                                      </span>
                                      <span className="text-[8px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                        {q.score} PTS
                                      </span>
                                    </div>
                                    {!isExpanded && (
                                      <p className="text-[11px] font-bold text-philsa-navy/80 leading-snug truncate">
                                        {previewText}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="shrink-0">
                                  {isExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-philsa-gray" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-philsa-gray" />
                                  )}
                                </div>
                              </div>

                              {/* Collapsible Panel Body */}
                              {isExpanded && (
                                <div className="p-4 bg-slate-50/20 border-t border-philsa-border/50 space-y-3 animate-in fade-in duration-100">
                                  <div className="space-y-1">
                                    <p className="text-xs font-bold text-philsa-navy leading-relaxed">{q.text}</p>
                                    <p className="text-[10px] text-philsa-gray italic font-medium">
                                      Topic: <b className="text-slate-700">{q.topic}</b> • Competency: <b className="text-slate-700">{q.competency}</b>
                                    </p>
                                  </div>

                                  {/* Question Actions */}
                                  {selectedAssembly.status !== 'PUBLISHED' && (
                                    <div className="flex items-center gap-1.5 pt-2 border-t border-philsa-border/40 justify-end">
                                      <div className="flex gap-1 border-r border-philsa-border/60 pr-1.5 mr-0.5">
                                        {/* Up button */}
                                        <button
                                          onClick={() => moveQuestion(idx, 'UP')}
                                          disabled={idx === 0}
                                          className="p-1.5 rounded-lg border border-philsa-border text-philsa-gray hover:text-philsa-navy hover:bg-white disabled:opacity-40 cursor-pointer"
                                          title="Move Up"
                                        >
                                          ▲
                                        </button>
                                        {/* Down button */}
                                        <button
                                          onClick={() => moveQuestion(idx, 'DOWN')}
                                          disabled={idx === selectedAssembly.questions.length - 1}
                                          className="p-1.5 rounded-lg border border-philsa-border text-philsa-gray hover:text-philsa-navy hover:bg-white disabled:opacity-40 cursor-pointer"
                                          title="Move Down"
                                        >
                                          ▼
                                        </button>
                                      </div>

                                      {/* Swap/Replace */}
                                      <button
                                        onClick={() => triggerReplaceQuestion(idx)}
                                        className="bg-white hover:bg-philsa-bg border border-philsa-border text-philsa-navy px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-1 cursor-pointer"
                                      >
                                        <RefreshCw className="w-3 h-3" /> Replace
                                      </button>
                                      
                                      {/* Delete */}
                                      <button
                                        onClick={() => handleRemoveQuestion(idx)}
                                        className="bg-white border border-red-200 text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-1 cursor-pointer"
                                        title="Remove Item"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" /> Remove
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                  <div className="w-16 h-16 bg-philsa-bg rounded-3xl flex items-center justify-center text-philsa-navy border border-philsa-border">
                    <Layers className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base">Select or Initialize an Assembly</h3>
                    <p className="text-xs text-philsa-gray max-w-sm mt-1">Please select an existing drafting exam form from the left controller or initialize a new assembly using the button on the main dashboard.</p>
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>
      )}

      {/* TAB CONTENT: PUBLISHED MUTABLE PACKAGES */}
      {activeTab === 'packages' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          
          <div className="card-philsa bg-white p-6 space-y-4">
            <div className="border-b border-philsa-border pb-3">
              <h3 className="font-black text-lg text-philsa-navy flex items-center gap-1.5">
                <Shield className="w-5 h-5 text-green-600" /> Immutable Examination Packages
              </h3>
              <p className="text-xs text-philsa-gray">Official examination packages ready for deployment to regional national proctor terminals. All packages are locked and read-only.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {assemblies.filter(a => a.status === 'PUBLISHED').length === 0 ? (
                <div className="col-span-2 p-12 text-center text-xs text-philsa-gray bg-philsa-bg border border-dashed border-philsa-border rounded-3xl">
                  No published packages exist in the repository registry.
                </div>
              ) : (
                assemblies
                  .filter(a => a.status === 'PUBLISHED')
                  .map((pack) => (
                    <div key={pack.id} className="border border-philsa-border rounded-3xl p-6 bg-white hover:shadow-lg transition-all space-y-4 relative overflow-hidden">
                      {/* Secure digital watermark badge */}
                      <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full flex items-center justify-center translate-x-4 -translate-y-4">
                        <Lock className="w-12 h-12 text-green-500/10" />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black uppercase bg-green-100 text-green-800 border border-green-200 px-2 py-0.5 rounded-full">
                            SIGNED & VALIDATED
                          </span>
                          <span className="text-[10px] font-mono text-philsa-gray">v{pack.examVersion}</span>
                        </div>
                        <h4 className="font-black text-base text-philsa-navy">{pack.name}</h4>
                        <p className="text-xs text-philsa-gray">Code Ref: <b className="font-mono">{pack.code}</b></p>
                      </div>

                      <div className="p-4 bg-philsa-bg rounded-2xl text-xs space-y-2.5 border border-philsa-border/40 font-mono">
                        <div className="flex justify-between">
                          <span className="text-philsa-gray">Secured Hash</span>
                          <span className="font-bold text-[10px] text-green-700 select-all truncate max-w-[200px]">{pack.hash || '0xAB9E...'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-philsa-gray">Total Items</span>
                          <span className="font-bold text-philsa-navy">{pack.questions.length} Items</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-philsa-gray">Duration</span>
                          <span className="font-bold text-philsa-navy">{pack.timeLimit} Minutes</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-philsa-gray">Weight Scope</span>
                          <span className="font-bold text-philsa-navy">{pack.totalMarks} Points</span>
                        </div>
                      </div>

                      {/* Centers Sync Status */}
                      <div className="border-t border-dashed border-philsa-border/60 pt-3 space-y-1">
                        <span className="text-[10px] font-black uppercase text-philsa-gray tracking-wider">Sync Status</span>
                        <div className="flex flex-wrap gap-1.5">
                          {['Manila', 'Cebu', 'Davao', 'Quezon'].map(centerName => {
                            const centerKey = centerName.toLowerCase();
                            const isSynced = (centerSyncRegistry[pack.id] || []).includes(centerKey);
                            return (
                              <span 
                                key={centerName}
                                className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                  isSynced 
                                    ? 'bg-green-50 text-green-700 border border-green-200/50' 
                                    : 'bg-slate-50 text-slate-400 border border-slate-200/50'
                                }`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${isSynced ? 'bg-green-500' : 'bg-slate-300'}`} />
                                {centerName}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      {/* Package inspector buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <button
                          onClick={() => {
                            // Render details
                            setSelectedAssembly(pack);
                            setActiveTab('assembly');
                          }}
                          className="bg-philsa-bg border border-philsa-border hover:bg-philsa-navy hover:text-white text-philsa-navy py-2 rounded-xl text-[11px] font-bold uppercase transition-all cursor-pointer flex items-center justify-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> View Details
                        </button>
                        
                        <button
                          onClick={() => {
                            // Show JSON structure payload
                            const cleanPayload = {
                              packageHeader: {
                                packageId: pack.id,
                                assemblyCode: pack.code,
                                examName: pack.name,
                                blueprintVersion: pack.blueprintVersion,
                                publishTimestamp: new Date().toISOString()
                              },
                              securitySignature: {
                                hashSignature: pack.hash,
                                encryptionAlgorithm: 'SHA-256 / RSA-2048'
                              },
                              items: pack.questions.map(q => ({
                                id: q.id,
                                topic: q.topic,
                                difficulty: q.difficulty,
                                competency: q.competency,
                                text: q.text,
                                marks: q.score
                              }))
                            };
                            alert(`CRYPTO PACKAGE JSON SCHEMATICS:\n\n${JSON.stringify(cleanPayload, null, 2)}`);
                          }}
                          className="bg-philsa-bg border border-philsa-border hover:bg-philsa-navy hover:text-white text-philsa-navy py-2 rounded-xl text-[11px] font-bold uppercase transition-all cursor-pointer flex items-center justify-center gap-1"
                          title="Inspect JSON Package Schema"
                        >
                          <FileJson className="w-3.5 h-3.5" /> Schema
                        </button>

                        {currentRole === 'SYSTEM_ADMIN' ? (
                          <button
                            onClick={() => {
                              setUploadTargetPackage(pack);
                              setSelectedCenters(['manila', 'cebu', 'davao', 'quezon']);
                              setIsUploadModalOpen(true);
                              setSyncingCenters({});
                              setSyncLogs([]);
                            }}
                            className="col-span-2 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-green-600/15"
                          >
                            <CloudLightning className="w-4 h-4" /> Upload to Testing Centers
                          </button>
                        ) : (
                          <div className="col-span-2 text-center p-2 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                            <span className="text-[10px] font-semibold text-slate-400">
                              System Admin Role Required to Broadcast
                            </span>
                          </div>
                        )}
                      </div>

                    </div>
                  ))
              )}
            </div>
          </div>

        </div>
      )}

      {/* TAB CONTENT: AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          
          <div className="card-philsa bg-white p-6 space-y-4">
            <div className="border-b border-philsa-border pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="font-black text-lg text-philsa-navy flex items-center gap-1.5">
                  <Shield className="w-5 h-5 text-philsa-red animate-pulse" /> Security Audit Log & History
                </h3>
                <p className="text-xs text-philsa-gray">Cryptographically tracked modifications to national test assemblies. Complies with RA 11363 audit mandates.</p>
              </div>

              <span className="text-[10px] font-black text-philsa-navy bg-philsa-bg border border-philsa-border px-3 py-1.5 rounded-xl uppercase tracking-wider">
                System Time: {new Date().toLocaleDateString()}
              </span>
            </div>

            {/* List of actions captured dynamically */}
            <div className="overflow-x-auto border border-philsa-border rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-philsa-bg font-black uppercase tracking-widest text-[9px] text-philsa-gray border-b border-philsa-border">
                  <tr>
                    <th className="p-4 w-40">Timestamp</th>
                    <th className="p-4 w-48">Operator / User</th>
                    <th className="p-4 w-32">Action Triggered</th>
                    <th className="p-4">Context Modifications</th>
                    <th className="p-4">Comments</th>
                    <th className="p-4 text-right">Security Meta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-philsa-border">
                  {assemblies
                    .flatMap(asm => asm.auditLog.map(log => ({ ...log, asmName: asm.name, asmCode: asm.code })))
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .map((log) => (
                      <tr key={log.id} className="hover:bg-philsa-bg/40 transition-colors">
                        <td className="p-4 font-mono text-[10px] text-philsa-navy">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="p-4 font-bold text-philsa-navy">
                          {log.user}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                            log.action === 'CREATE' ? 'bg-green-100 text-green-700' :
                            log.action === 'ASSEMBLE' ? 'bg-sky-100 text-sky-700' :
                            log.action === 'REPLACE_QUESTION' ? 'bg-amber-100 text-amber-700' :
                            log.action === 'PUBLISH' ? 'bg-purple-100 text-purple-700 font-bold border border-purple-200' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="p-4 space-y-1">
                          <p className="font-bold text-[11px]">{log.asmName} ({log.asmCode})</p>
                          <div className="grid grid-cols-1 gap-0.5 text-[10px] text-philsa-gray font-mono">
                            <div>Prev: <span className="font-semibold">{log.previousValue}</span></div>
                            <div>New: <span className="font-semibold text-philsa-navy">{log.newValue}</span></div>
                          </div>
                        </td>
                        <td className="p-4 text-xs italic text-slate-600">
                          "{log.comments}"
                        </td>
                        <td className="p-4 text-right text-[10px] text-philsa-gray font-mono">
                          <p>{log.ipAddress}</p>
                          <p className="text-[9px] truncate max-w-[120px] ml-auto" title={log.device}>{log.device}</p>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

          </div>

        </div>
      )}



      {/* UPLOAD TO TESTING CENTERS MODAL */}
      {isUploadModalOpen && uploadTargetPackage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => {
              if (!isSyncingAll) setIsUploadModalOpen(false);
            }}
          />
          
          <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-philsa-border flex justify-between items-center bg-philsa-bg/40">
              <div>
                <h4 className="font-extrabold text-sm text-philsa-navy uppercase flex items-center gap-2">
                  <CloudLightning className="w-5 h-5 text-green-600 animate-pulse" />
                  Upload Exam to Testing Centers
                </h4>
                <p className="text-[11px] text-philsa-gray">
                  Secure broadcast of <span className="font-bold text-philsa-navy">{uploadTargetPackage.name}</span> to regional hubs.
                </p>
              </div>
              {!isSyncingAll && (
                <button 
                  onClick={() => setIsUploadModalOpen(false)}
                  className="p-1.5 rounded-full hover:bg-philsa-bg border border-philsa-border text-philsa-gray hover:text-philsa-navy transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              
              {/* Target Package Summary */}
              <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-[10px] text-philsa-gray">Package ID: {uploadTargetPackage.id.substring(0, 8)}...</span>
                  <span className="text-[9px] font-mono bg-green-100 text-green-800 border border-green-200 px-2 py-0.5 rounded font-black">
                    SHA-256 SECURED
                  </span>
                </div>
                <h5 className="font-black text-philsa-navy text-sm">{uploadTargetPackage.name}</h5>
                <p className="text-[11px] text-philsa-gray leading-relaxed">
                  Contains <span className="font-bold text-philsa-navy">{uploadTargetPackage.questions.length} questions</span>, 
                  configured for <span className="font-bold text-philsa-navy">{uploadTargetPackage.timeLimit} minutes</span>, 
                  and signed with hash <span className="font-mono bg-slate-200/60 px-1 py-0.5 rounded text-[10px] text-slate-700">{uploadTargetPackage.hash || '0xAB9E...'}</span>.
                </p>
              </div>

              {/* Testing Centers Selector */}
              <div className="space-y-3">
                <span className="text-[10px] font-black uppercase text-philsa-gray tracking-wider">Select Regional Target Hubs</span>
                
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'manila', name: 'Luzon Central Terminal', loc: 'Manila' },
                    { key: 'cebu', name: 'Visayas Regional Hub', loc: 'Cebu' },
                    { key: 'davao', name: 'Mindanao Southern Base', loc: 'Davao' },
                    { key: 'quezon', name: 'PhilSA Core HQ', loc: 'Quezon City' },
                  ].map(center => {
                    const isSelected = selectedCenters.includes(center.key);
                    const syncState = syncingCenters[center.key] || 'IDLE';
                    const alreadySynced = (centerSyncRegistry[uploadTargetPackage.id] || []).includes(center.key);

                    return (
                      <div 
                        key={center.key}
                        onClick={() => {
                          if (isSyncingAll) return;
                          if (isSelected) {
                            setSelectedCenters(selectedCenters.filter(c => c !== center.key));
                          } else {
                            setSelectedCenters([...selectedCenters, center.key]);
                          }
                        }}
                        className={`p-3.5 border rounded-2xl cursor-pointer select-none transition-all space-y-2 ${
                          isSyncingAll ? 'opacity-70 pointer-events-none' : ''
                        } ${
                          isSelected 
                            ? 'bg-green-50/40 border-green-500 shadow-xs shadow-green-500/5' 
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-black text-xs text-philsa-navy">{center.loc}</span>
                          {syncState === 'SYNCING' && <Loader2 className="w-3.5 h-3.5 text-green-600 animate-spin" />}
                          {syncState === 'SUCCESS' && <Check className="w-4 h-4 text-green-600" />}
                          {syncState === 'ERROR' && <AlertCircle className="w-4 h-4 text-red-600" />}
                          {syncState === 'IDLE' && (
                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                              isSelected ? 'border-green-500 bg-green-500 text-white' : 'border-slate-300 bg-white'
                            }`}>
                              {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </div>
                          )}
                        </div>

                        <div className="space-y-0.5">
                          <p className="text-[10px] font-bold text-slate-700 leading-tight">{center.name}</p>
                          <p className="text-[9px] text-philsa-gray">
                            {alreadySynced ? '✓ Synced previously' : 'Pending upload'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Progress and Logs Section */}
              {(isSyncingAll || syncLogs.length > 0) && (
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase text-philsa-gray tracking-wider">
                    <span>Upload & Connection Log</span>
                    {isSyncingAll && <span className="text-green-600 animate-pulse">Broadcasting packet...</span>}
                  </div>
                  
                  <div className="bg-slate-900 rounded-2xl p-4 font-mono text-[10px] text-slate-200 space-y-1.5 h-40 overflow-y-auto scrollbar-thin">
                    {syncLogs.map((log, i) => (
                      <div key={i} className="leading-snug">
                        <span className="text-green-500">➜</span> {log}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-philsa-bg/30 border-t border-philsa-border flex justify-end gap-3">
              <button
                disabled={isSyncingAll}
                onClick={() => setIsUploadModalOpen(false)}
                className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold uppercase px-4 py-2.5 rounded-xl cursor-pointer disabled:opacity-50 transition-all"
              >
                Close
              </button>
              
              <button
                disabled={isSyncingAll || selectedCenters.length === 0}
                onClick={async () => {
                  setIsSyncingAll(true);
                  const logs: string[] = [];
                  const addLog = (msg: string) => {
                    const timestamp = new Date().toLocaleTimeString();
                    logs.push(`[${timestamp}] ${msg}`);
                    setSyncLogs([...logs]);
                  };

                  addLog(`Initializing exam broadcast protocol for package: ${uploadTargetPackage.code}`);
                  addLog(`Selected hubs: ${selectedCenters.map(c => c.toUpperCase()).join(', ')}`);

                  // Loop through selected centers and sync them sequentially or concurrently with delay
                  for (const centerKey of selectedCenters) {
                    setSyncingCenters(prev => ({ ...prev, [centerKey]: 'SYNCING' }));
                    addLog(`Connecting to secure endpoint for center [${centerKey.toUpperCase()}]...`);
                    
                    await new Promise(r => setTimeout(r, 800));
                    addLog(`Connected. Performing RSA-2048 handshakes and signature integrity check...`);
                    
                    await new Promise(r => setTimeout(r, 600));
                    addLog(`Broadcasting encrypted form payload with package hash ${uploadTargetPackage.hash || '0xAB9E...'}`);
                    
                    await new Promise(r => setTimeout(r, 1000));
                    addLog(`Upload completed. Verifying storage seals at ${centerKey.toUpperCase()} database...`);
                    
                    await new Promise(r => setTimeout(r, 500));
                    setSyncingCenters(prev => ({ ...prev, [centerKey]: 'SUCCESS' }));
                    addLog(`SUCCESS: ${centerKey.toUpperCase()} synchronized and active.`);
                    saveSyncStatus(uploadTargetPackage.id, [centerKey]);
                  }

                  addLog(`Secure multi-cast upload broadcast complete. All target terminals locked and verified.`);
                  setIsSyncingAll(false);
                }}
                className="col-span-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold uppercase px-6 py-2.5 rounded-xl cursor-pointer disabled:opacity-50 flex items-center gap-1.5 transition-all shadow-md shadow-green-600/15"
              >
                {isSyncingAll ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
                  </>
                ) : (
                  <>
                    <CloudLightning className="w-4 h-4" /> Start Secure Upload
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}



      {/* QUESTION SELECTION / REPLACEMENT DRAWER (MODAL EXPERIENCES) */}
      {isReplaceDrawerOpen && selectedAssembly && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setIsReplaceDrawerOpen(false)}
          />
          
          <div className="relative bg-white w-full max-w-xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-philsa-border flex justify-between items-center bg-philsa-bg/40">
              <div>
                <h4 className="font-extrabold text-sm text-philsa-navy uppercase">
                  {questionToReplaceIdx !== null ? 'Replace Question Item' : 'Add Question Item'}
                </h4>
                <p className="text-[10px] text-philsa-gray mt-0.5">
                  {questionToReplaceIdx !== null 
                    ? `Replacing item at position ${questionToReplaceIdx + 1}` 
                    : 'Appends new approved question to the examination bank'}
                </p>
              </div>
              <button 
                onClick={() => setIsReplaceDrawerOpen(false)}
                className="p-1.5 hover:bg-philsa-bg rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-philsa-gray" />
              </button>
            </div>

            {/* Filter Drawer questions */}
            <div className="p-5 space-y-4 flex-1 overflow-y-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-philsa-gray" />
                <input
                  type="text"
                  placeholder="Search item contents, subjects, topics, or difficulty..."
                  className="w-full bg-philsa-bg border border-philsa-border rounded-xl py-2 pl-9 pr-4 text-xs font-medium focus:ring-1 focus:ring-philsa-navy outline-none"
                  value={replaceSearchQuery}
                  onChange={(e) => setReplaceSearchQuery(e.target.value)}
                />
              </div>

              {/* Central Pool List inside modal */}
              <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
                {itemBank
                  .filter(q => {
                    // Prevent displaying questions already active in the layout, unless it is the one being replaced
                    const isAlreadySelected = selectedAssembly.questions.some(aq => aq.id === q.id);
                    const isTheCurrentOne = questionToReplaceIdx !== null && selectedAssembly.questions[questionToReplaceIdx]?.id === q.id;
                    if (isAlreadySelected && !isTheCurrentOne) return false;

                    const query = replaceSearchQuery.toLowerCase();
                    return q.text.toLowerCase().includes(query) || 
                           q.subject.toLowerCase().includes(query) || 
                           q.topic.toLowerCase().includes(query) ||
                           q.id.toLowerCase().includes(query);
                  })
                  .map((q) => (
                    <div
                      key={q.id}
                      onClick={() => {
                        if (questionToReplaceIdx !== null) {
                          handleExecuteReplace(q);
                        } else {
                          handleAddQuestionToAssembly(q);
                          setIsReplaceDrawerOpen(false);
                        }
                      }}
                      className="p-3 bg-philsa-bg/50 hover:bg-philsa-bg hover:border-philsa-navy/40 border border-philsa-border/70 rounded-2xl cursor-pointer transition-all space-y-1"
                    >
                      <div className="flex items-center gap-1.5 text-[9px] font-bold">
                        <span className="text-philsa-navy bg-white border px-1.5 py-0.5 rounded font-mono">{q.id}</span>
                        <span className="text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">{q.subject}</span>
                        <span className={`px-1.5 py-0.5 rounded ${
                          q.difficulty === 'EASY' ? 'text-green-700 bg-green-50' :
                          q.difficulty === 'MODERATE' ? 'text-amber-700 bg-amber-50' :
                          'text-red-700 bg-red-50'
                        }`}>{q.difficulty}</span>
                        <span className="text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded ml-auto">{q.score} PTS</span>
                      </div>
                      <p className="text-xs font-bold text-philsa-navy leading-normal line-clamp-2">{q.text}</p>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ASSEMBLY CREATION BLANK FORM MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setIsFormOpen(false)}
          />

          <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-philsa-border flex justify-between items-center bg-philsa-bg/40">
              <div>
                <h4 className="font-extrabold text-sm text-philsa-navy uppercase flex items-center gap-1.5">
                  <ClipboardList className="w-4 h-4 text-philsa-red" /> Create Examination Assembly
                </h4>
                <p className="text-[10px] text-philsa-gray mt-0.5">Initialize a blank college entrance examination form based on a blueprint.</p>
              </div>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 hover:bg-philsa-bg rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-philsa-gray" />
              </button>
            </div>

            <form onSubmit={handleCreateAssembly} className="p-6 space-y-4 text-xs">
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-philsa-navy">Examination Title Name</label>
                <input
                  type="text"
                  placeholder="e.g., National Space Science Fellowship - Form A"
                  className="w-full bg-philsa-bg border border-philsa-border rounded-xl p-3 text-xs font-bold text-philsa-navy outline-none focus:ring-1 focus:ring-philsa-red"
                  value={wizardMeta.name}
                  onChange={(e) => setWizardMeta({ ...wizardMeta, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-philsa-navy">Examination Code</label>
                  <input
                    type="text"
                    placeholder="e.g., EXAM-2026-SPACE-01A"
                    className="w-full bg-philsa-bg border border-philsa-border rounded-xl p-3 text-xs font-bold text-philsa-navy outline-none focus:ring-1 focus:ring-philsa-red font-mono"
                    value={wizardMeta.code}
                    onChange={(e) => setWizardMeta({ ...wizardMeta, code: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-philsa-navy">Select Approved Blueprint</label>
                  <select
                    className="w-full bg-philsa-bg border border-philsa-border rounded-xl p-3 text-xs font-bold text-philsa-navy outline-none cursor-pointer"
                    value={wizardMeta.blueprintId}
                    onChange={(e) => setWizardMeta({ ...wizardMeta, blueprintId: e.target.value })}
                  >
                    {INITIAL_BLUEPRINTS.map(bp => (
                      <option key={bp.id} value={bp.id}>{bp.code} - {bp.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-philsa-navy">Examination Period</label>
                  <input
                    type="text"
                    className="w-full bg-philsa-bg border border-philsa-border rounded-xl p-3 text-xs font-bold text-philsa-navy outline-none focus:ring-1 focus:ring-philsa-red"
                    value={wizardMeta.examPeriod}
                    onChange={(e) => setWizardMeta({ ...wizardMeta, examPeriod: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-philsa-navy">Examination Type</label>
                  <select
                    className="w-full bg-philsa-bg border border-philsa-border rounded-xl p-3 text-xs font-bold text-philsa-navy outline-none cursor-pointer"
                    value={wizardMeta.examType}
                    onChange={(e) => setWizardMeta({ ...wizardMeta, examType: e.target.value })}
                  >
                    <option value="Scholarship">Scholarship</option>
                    <option value="Admission">Admission</option>
                    <option value="Technical">Technical</option>
                    <option value="Specialization">Specialization</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-philsa-navy">Time Limit (Minutes)</label>
                  <input
                    type="number"
                    className="w-full bg-philsa-bg border border-philsa-border rounded-xl p-3 text-xs font-bold text-philsa-navy outline-none focus:ring-1 focus:ring-philsa-red"
                    value={wizardMeta.timeLimit}
                    onChange={(e) => setWizardMeta({ ...wizardMeta, timeLimit: parseInt(e.target.value) || 0 })}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-philsa-navy">Academic Year</label>
                  <input
                    type="text"
                    className="w-full bg-philsa-bg border border-philsa-border rounded-xl p-3 text-xs font-bold text-philsa-navy outline-none focus:ring-1 focus:ring-philsa-red"
                    value={wizardMeta.academicYear}
                    onChange={(e) => setWizardMeta({ ...wizardMeta, academicYear: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-philsa-navy">Form Instructions</label>
                <textarea
                  className="w-full bg-philsa-bg border border-philsa-border rounded-xl p-3 text-xs font-bold text-philsa-navy outline-none focus:ring-1 focus:ring-philsa-red h-20 resize-none"
                  value={wizardMeta.instructions}
                  onChange={(e) => setWizardMeta({ ...wizardMeta, instructions: e.target.value })}
                  required
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 bg-philsa-bg hover:bg-philsa-border/55 text-philsa-navy py-3 rounded-xl font-bold uppercase tracking-wider cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-philsa-red hover:bg-philsa-red/90 text-white py-3 rounded-xl font-bold uppercase tracking-wider cursor-pointer transition-all shadow-md shadow-philsa-red/10"
                >
                  Initialize Layout
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
