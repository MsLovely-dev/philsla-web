import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search,
  Filter,
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
import { ExamHubTabs, type ExamHubTabKey } from '../../../components/ExamHubTabs';
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

interface PublishedTestingCenter {
  id: string;
  name: string;
  code: string;
  classification: 'PUBLIC' | 'PRIVATE';
  region: string;
  city: string;
  administrator: string;
  email: string;
  phone: string;
  capacity: string;
}

const PUBLISHED_TESTING_CENTERS: PublishedTestingCenter[] = [
  {
    id: 'upd-ncr',
    name: 'University of the Philippines Diliman',
    code: 'UPD-NCR',
    classification: 'PUBLIC',
    region: 'NCR - National Capital Region',
    city: 'Quezon City',
    administrator: 'Dr. Ramon Santos',
    email: 'r.santos@up.edu.ph',
    phone: '0917-111-2233',
    capacity: '2,500 Seats'
  },
  {
    id: 'pup-ncr',
    name: 'Polytechnic University of the Philippines',
    code: 'PUP-NCR',
    classification: 'PUBLIC',
    region: 'NCR - National Capital Region',
    city: 'Manila',
    administrator: 'Prof. Maria Theresa Reyes',
    email: 'mt.reyes@pup.edu.ph',
    phone: '0918-222-3344',
    capacity: '3,000 Seats'
  },
  {
    id: 'admu-ncr',
    name: 'Ateneo de Manila University',
    code: 'ADMU-NCR',
    classification: 'PRIVATE',
    region: 'NCR - National Capital Region',
    city: 'Quezon City',
    administrator: 'Fr. Roberto Yap, SJ',
    email: 'ryap@ateneo.edu',
    phone: '0919-333-4455',
    capacity: '1,800 Seats'
  },
  {
    id: 'dlsu-ncr',
    name: 'De La Salle University',
    code: 'DLSU-NCR',
    classification: 'PRIVATE',
    region: 'NCR - National Capital Region',
    city: 'Manila',
    administrator: 'Dr. Jose Maria Cruz',
    email: 'jm.cruz@dlsu.edu.ph',
    phone: '0920-444-5566',
    capacity: '2,000 Seats'
  },
  {
    id: 'ust-ncr',
    name: 'University of Santo Tomas',
    code: 'UST-NCR',
    classification: 'PRIVATE',
    region: 'NCR - National Capital Region',
    city: 'Manila',
    administrator: 'Prof. Clarita Dela Cruz',
    email: 'c.delacruz@ust.edu.ph',
    phone: '0921-555-6677',
    capacity: '2,800 Seats'
  },
  {
    id: 'plm-ncr',
    name: 'Pamantasan ng Lungsod ng Maynila',
    code: 'PLM-NCR',
    classification: 'PUBLIC',
    region: 'NCR - National Capital Region',
    city: 'Manila',
    administrator: 'Atty. Fernando Garcia',
    email: 'f.garcia@plm.edu.ph',
    phone: '0922-666-7788',
    capacity: '1,500 Seats'
  },
  {
    id: 'qcu-ncr',
    name: 'Quezon City University',
    code: 'QCU-NCR',
    classification: 'PUBLIC',
    region: 'NCR - National Capital Region',
    city: 'Quezon City',
    administrator: 'Dr. Belen Mercado',
    email: 'b.mercado@qcu.edu.ph',
    phone: '0923-777-8899',
    capacity: '1,200 Seats'
  },
  {
    id: 'feu-ncr',
    name: 'Far Eastern University',
    code: 'FEU-NCR',
    classification: 'PRIVATE',
    region: 'NCR - National Capital Region',
    city: 'Manila',
    administrator: 'Prof. Alejandro Santos',
    email: 'a.santos@feu.edu.ph',
    phone: '0924-888-9900',
    capacity: '1,600 Seats'
  }
];

export default function ExamSets() {
  // Global States
  const [activeTab, setActiveTab] = useState<'dashboard' | 'assembly' | 'packages' | 'audit'>('dashboard');
  const [currentRole, setCurrentRole] = useState<UserRole>('EXAM_ADMINISTRATOR');
  const navigate = useNavigate();

  // Upload to Testing Centers States
  const [uploadTargetPackage, setUploadTargetPackage] = useState<any | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedCenters, setSelectedCenters] = useState<string[]>(['manila', 'cebu', 'davao', 'quezon']);
  const [syncingCenters, setSyncingCenters] = useState<Record<string, 'IDLE' | 'SYNCING' | 'SUCCESS' | 'ERROR'>>({});
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [centerSearchQuery, setCenterSearchQuery] = useState('');
  const [centerClassificationFilter, setCenterClassificationFilter] = useState<'ALL' | 'PUBLIC' | 'PRIVATE'>('ALL');
  const [centerRegionFilter, setCenterRegionFilter] = useState('ALL');
  const [centerCityFilter, setCenterCityFilter] = useState('ALL');
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
    batch: 'Batch 1 - AY 2026-2027',
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

  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash === 'assembly') {
      setActiveTab('assembly');
    } else if (hash === 'packages') {
      setActiveTab('packages');
    } else if (hash === 'audit') {
      setActiveTab('audit');
    } else {
      setActiveTab('dashboard');
    }
  }, []);

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

  const hubActiveTab: ExamHubTabKey =
    activeTab === 'dashboard' ? 'setAssembly' :
    activeTab === 'assembly' ? 'setAssembly' :
    activeTab === 'packages' ? 'published' :
    'audit';

  const handleHubTabChange = (tab: ExamHubTabKey) => {
    if (tab === 'blueprints') {
      navigate('/admin/blueprints');
      return;
    }

    if (tab === 'setAssembly') {
      setActiveTab('dashboard');
      navigate('/admin/hub/exam-sets/content#dashboard');
      return;
    }

    if (tab === 'published') {
      setActiveTab('packages');
      navigate('/admin/hub/exam-sets/content#packages');
      return;
    }

    setActiveTab('audit');
    navigate('/admin/hub/exam-sets/content#audit');
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

  const filteredPublishedTestingCenters = PUBLISHED_TESTING_CENTERS.filter((center) => {
    const matchesQuery =
      center.name.toLowerCase().includes(centerSearchQuery.toLowerCase()) ||
      center.code.toLowerCase().includes(centerSearchQuery.toLowerCase()) ||
      center.administrator.toLowerCase().includes(centerSearchQuery.toLowerCase()) ||
      center.city.toLowerCase().includes(centerSearchQuery.toLowerCase()) ||
      center.region.toLowerCase().includes(centerSearchQuery.toLowerCase());
    const matchesClassification =
      centerClassificationFilter === 'ALL' || center.classification === centerClassificationFilter;
    const matchesRegion = centerRegionFilter === 'ALL' || center.region === centerRegionFilter;
    const matchesCity = centerCityFilter === 'ALL' || center.city === centerCityFilter;
    return matchesQuery && matchesClassification && matchesRegion && matchesCity;
  });

  const auditTrailEntries = assemblies
    .flatMap((asm) =>
      asm.auditLog.map((entry) => ({
        ...entry,
        examName: asm.name,
        examCode: asm.code,
        examPeriod: asm.examPeriod,
      })),
    )
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

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
        name: bp.name,
        blueprintId: wizardMeta.blueprintId,
        blueprintVersion: bp.version,
        examVersion: '1.0-Draft',
        examPeriod: wizardMeta.batch,
        examType: wizardMeta.examType,
        academicYear: wizardMeta.academicYear,
        status: 'DRAFT',
        questions: [],
        instructions: wizardMeta.instructions,
        timeLimit: bp.rules.totalTimeLimit,
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

  const handleDeleteAssembly = (asm: ExamAssemblyForm) => {
    if (!confirm(`Delete ${asm.name}? This cannot be undone.`)) return;

    setAssemblies((prev) => prev.filter((item) => item.id !== asm.id));

    if (selectedAssembly?.id === asm.id) {
      setSelectedAssembly(null);
      setActiveTab('dashboard');
    }

    logAudit(
      asm.id,
      'DELETE',
      asm.name,
      'Deleted',
      'Removed the exam set assembly from local workspace.',
    );
    showToast(`Deleted ${asm.name}.`, 'info');
  };

  const openAssemblyBuilder = (asm: ExamAssemblyForm) => {
    setSelectedAssembly(asm);
    setActiveTab('assembly');

    window.requestAnimationFrame(() => {
      document.getElementById('exam-builder-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const openPublishedUploadWorkspace = (pack: ExamAssemblyForm) => {
    setUploadTargetPackage(pack);
    setSelectedCenters(PUBLISHED_TESTING_CENTERS.map((center) => center.id));
    setIsUploadModalOpen(true);
    setSyncingCenters({});
    setSyncLogs([]);
    setCenterSearchQuery('');
    setCenterClassificationFilter('ALL');
    setCenterRegionFilter('ALL');
    setCenterCityFilter('ALL');
  };

  const closePublishedUploadWorkspace = () => {
    setIsUploadModalOpen(false);
    setUploadTargetPackage(null);
    setSyncingCenters({});
    setSyncLogs([]);
    setIsSyncingAll(false);
  };

  const handleStartSecureUpload = async () => {
    if (!uploadTargetPackage || selectedCenters.length === 0) return;

    setIsSyncingAll(true);
    const logs: string[] = [];
    const addLog = (msg: string) => {
      const timestamp = new Date().toLocaleTimeString();
      logs.push(`[${timestamp}] ${msg}`);
      setSyncLogs([...logs]);
    };

    addLog(`Initializing exam broadcast protocol for package: ${uploadTargetPackage.code}`);
    addLog(`Selected hubs: ${selectedCenters.map(c => c.toUpperCase()).join(', ')}`);

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
    <div className="mx-auto flex w-full max-w-[1420px] flex-col gap-5 text-philsa-navy">
      
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
      <ExamHubTabs activeTab={hubActiveTab} onTabChange={handleHubTabChange} />

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
          <div className="grid grid-cols-1 gap-6">
            
            {/* Left: Active Assembly Workflows */}
            <div className="card-philsa bg-white space-y-4">
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
      <th className="px-5 py-4">Exam Set Name</th>
      <th className="px-5 py-4">Subjects Covered</th>
      <th className="px-5 py-4">Bound Items</th>
      <th className="px-5 py-4">Status</th>
      <th className="px-5 py-4 text-right">Actions</th>
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
        const subjectsCovered = Array.from(new Set(asm.questions.map((q) => q.subject)));

        return (
          <tr key={asm.id} className="border-b border-philsa-border/60 hover:bg-philsa-bg/45 transition-colors">
            <td className="px-5 py-5 align-top">
              <p className="text-[15px] font-semibold text-philsa-navy">{asm.name}</p>
              <p className="mt-1 text-[10px] font-mono text-philsa-gray">
                {asm.code} - {asm.examPeriod}
              </p>
            </td>
            <td className="px-5 py-5 align-top">
              <div className="flex flex-wrap gap-2">
                {subjectsCovered.map((subject) => (
                  <span
                    key={subject}
                    className="inline-flex rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-700"
                  >
                    {subject}
                  </span>
                ))}
              </div>
            </td>
            <td className="px-5 py-5 align-top">
              <p className="text-[16px] font-semibold text-slate-900">{asm.questions.length} questions</p>
              <div className="mt-1 flex items-center gap-1">
                {hasErrors ? (
                  <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-bold text-red-600 bg-red-50">
                    <AlertTriangle className="h-2.5 w-2.5" /> Fail
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-bold text-green-600 bg-green-50">
                    <Check className="h-2.5 w-2.5" /> Compliant
                  </span>
                )}
              </div>
            </td>
            <td className="px-5 py-5 align-top">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${
                  asm.status === 'PUBLISHED'
                    ? 'border border-green-200 bg-green-100 text-green-700'
                    : asm.status === 'APPROVED'
                      ? 'border border-emerald-200 bg-emerald-100 text-emerald-700'
                      : asm.status === 'ACADEMIC_REVIEW'
                        ? 'border border-sky-200 bg-sky-100 text-sky-700'
                        : asm.status === 'REVISION_REQUIRED'
                          ? 'border border-red-200 bg-red-100 text-red-700'
                          : asm.status === 'VALIDATING'
                            ? 'border border-violet-200 bg-violet-100 text-violet-700'
                            : 'border border-slate-200 bg-slate-100 text-slate-700'
                }`}
              >
                {asm.status.replace('_', ' ')}
              </span>
            </td>
            <td className="px-5 py-5 align-top">
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => openAssemblyBuilder(asm)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-[10px] font-black uppercase text-white transition hover:bg-slate-800"
                >
                  <Edit className="h-3.5 w-3.5" />
                  Edit
                </button>

                <button
                  onClick={() => handleDeleteAssembly(asm)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3.5 py-2 text-[10px] font-black uppercase text-red-600 transition hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
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
          </div>
        </div>
      )}

      {/* TAB CONTENT: ASSEMBLY WORKSPACE LAB */}
      {activeTab === 'assembly' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          {selectedAssembly && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('dashboard');
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Exam Sets
                  </button>

                  <div className="h-8 w-px bg-slate-200" />

                  <p className="text-[14px] font-semibold text-slate-900">
                    Exam Builder - {selectedAssembly.code} ({selectedAssembly.name})
                  </p>
                </div>
              </div>
            </div>
          )}
          
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
            <div id="exam-builder-panel" className="lg:col-span-2 card-philsa bg-white p-6 space-y-6">
              
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
                                      Topic: <b className="text-slate-700">{q.topic}</b> - Competency: <b className="text-slate-700">{q.competency}</b>
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
                                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-philsa-border text-philsa-gray hover:text-philsa-navy hover:bg-white disabled:opacity-40 cursor-pointer"
                                          title="Move Up"
                                        >
                                          <span
                                            className="block h-0 w-0 border-l-[6px] border-r-[6px] border-b-[10px] border-l-transparent border-r-transparent border-b-current"
                                            aria-hidden="true"
                                          />
                                        </button>
                                        {/* Down button */}
                                        <button
                                          onClick={() => moveQuestion(idx, 'DOWN')}
                                          disabled={idx === selectedAssembly.questions.length - 1}
                                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-philsa-border text-philsa-gray hover:text-philsa-navy hover:bg-white disabled:opacity-40 cursor-pointer"
                                          title="Move Down"
                                        >
                                          <span
                                            className="block h-0 w-0 border-l-[6px] border-r-[6px] border-t-[10px] border-l-transparent border-r-transparent border-t-current"
                                            aria-hidden="true"
                                          />
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
        isUploadModalOpen && uploadTargetPackage ? (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="card-philsa bg-white p-6 space-y-5">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-philsa-border pb-4">
                <div className="space-y-1">
                  <button
                    onClick={closePublishedUploadWorkspace}
                    className="inline-flex items-center gap-2 rounded-xl border border-philsa-border bg-white px-3 py-2 text-[12px] font-bold text-philsa-navy transition hover:bg-philsa-bg cursor-pointer"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Published Exams
                  </button>
                  <h3 className="text-2xl font-black text-philsa-navy flex items-center gap-2">
                    <CloudLightning className="h-6 w-6 text-green-600" />
                    Upload Examination Set to School Testing Centers
                  </h3>
                  <p className="text-xs text-philsa-gray max-w-3xl">
                    Multi-select accredited schools nationwide, filter by classification, region, and city, and broadcast encrypted exam set payloads.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={closePublishedUploadWorkspace}
                    className="rounded-2xl border border-philsa-border bg-white px-5 py-3 text-sm font-semibold text-philsa-navy transition hover:bg-philsa-bg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleStartSecureUpload}
                    disabled={isSyncingAll || selectedCenters.length === 0}
                    className="inline-flex items-center gap-2 rounded-2xl bg-green-600 px-5 py-3 text-sm font-bold uppercase tracking-wider text-white shadow-lg shadow-green-600/15 transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                  >
                    <CloudLightning className="h-4 w-4" />
                    Upload to {selectedCenters.length} Selected Schools
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 rounded-2xl border border-philsa-border bg-slate-50/60 p-4 lg:grid-cols-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Exam Set Name</p>
                  <p className="mt-1 text-[16px] font-black text-philsa-navy truncate">{uploadTargetPackage.name}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Exam Code</p>
                  <p className="mt-1 font-mono text-[14px] font-bold text-philsa-navy">{uploadTargetPackage.code} (v{uploadTargetPackage.examVersion})</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Questions & Duration</p>
                  <p className="mt-1 font-mono text-[14px] font-bold text-philsa-navy">{uploadTargetPackage.questions.length} Items • {uploadTargetPackage.timeLimit} Mins</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Sealed Crypto Hash</p>
                  <p className="mt-1 break-all font-mono text-[12px] font-bold text-green-700">{uploadTargetPackage.hash || '0xAB9E...'}</p>
                </div>
              </div>
            </div>

            <div className="card-philsa bg-white p-6 space-y-4">
              <div className="flex flex-col gap-4 border-b border-philsa-border pb-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-1">
                  <h4 className="text-lg font-black text-philsa-navy flex items-center gap-2">
                    <Filter className="h-5 w-5 text-philsa-red" />
                    Filter School Testing Centers
                  </h4>
                  <p className="text-xs text-philsa-gray">
                    Search and narrow the list by classification, region, and city before broadcasting.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-philsa-gray">Showing <b>{filteredPublishedTestingCenters.length}</b> of <b>{PUBLISHED_TESTING_CENTERS.length}</b> Schools</span>
                  <span className="rounded-full bg-green-50 px-3 py-1 font-bold text-green-700 border border-green-200">{selectedCenters.length} Selected</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Search School / Administrator</label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-philsa-gray" />
                    <input
                      value={centerSearchQuery}
                      onChange={(e) => setCenterSearchQuery(e.target.value)}
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-9 pr-4 text-[14px] outline-none focus:border-philsa-red focus:ring-2 focus:ring-philsa-red/10"
                      placeholder="Search name, city, admin..."
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">School Classification</label>
                  <select
                    value={centerClassificationFilter}
                    onChange={(e) => setCenterClassificationFilter(e.target.value as 'ALL' | 'PUBLIC' | 'PRIVATE')}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-[14px] outline-none focus:border-philsa-red focus:ring-2 focus:ring-philsa-red/10"
                  >
                    <option value="ALL">All Classifications (Public & Private)</option>
                    <option value="PUBLIC">Public</option>
                    <option value="PRIVATE">Private</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Region</label>
                  <select
                    value={centerRegionFilter}
                    onChange={(e) => setCenterRegionFilter(e.target.value)}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-[14px] outline-none focus:border-philsa-red focus:ring-2 focus:ring-philsa-red/10"
                  >
                    <option value="ALL">All Regions of the Philippines</option>
                    {Array.from(new Set(PUBLISHED_TESTING_CENTERS.map((center) => center.region))).map((region) => (
                      <option key={region} value={region}>{region}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">City / Municipality</label>
                  <select
                    value={centerCityFilter}
                    onChange={(e) => setCenterCityFilter(e.target.value)}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-[14px] outline-none focus:border-philsa-red focus:ring-2 focus:ring-philsa-red/10"
                  >
                    <option value="ALL">All Cities ({PUBLISHED_TESTING_CENTERS.length} Available)</option>
                    {Array.from(new Set(PUBLISHED_TESTING_CENTERS.map((center) => center.city))).map((city) => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 border-t border-dashed border-philsa-border/70 pt-4 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedCenters(filteredPublishedTestingCenters.map((center) => center.id))}
                  className="rounded-xl bg-slate-100 px-4 py-2 font-bold text-slate-700 transition hover:bg-slate-200 cursor-pointer"
                >
                  Deselect All Filtered Schools
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCenters([])}
                  className="font-medium text-philsa-navy transition hover:underline cursor-pointer"
                >
                  Clear Selection
                </button>
                <span className="ml-auto text-[10px] text-philsa-gray">Tip: Click any school checkbox or row to toggle selection</span>
              </div>
            </div>

            <div className="card-philsa bg-white p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-left">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
                      <th className="px-5 py-4 w-12">
                        <input
                          type="checkbox"
                          checked={filteredPublishedTestingCenters.length > 0 && filteredPublishedTestingCenters.every((center) => selectedCenters.includes(center.id))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCenters(filteredPublishedTestingCenters.map((center) => center.id));
                            } else {
                              setSelectedCenters([]);
                            }
                          }}
                          className="h-4 w-4 rounded border-slate-300 text-philsa-red focus:ring-philsa-red"
                        />
                      </th>
                      <th className="px-5 py-4">School ID & Name</th>
                      <th className="px-5 py-4">Classification</th>
                      <th className="px-5 py-4">Region & City</th>
                      <th className="px-5 py-4">Assigned Testing Center Administrator</th>
                      <th className="px-5 py-4">Upload Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPublishedTestingCenters.map((center) => {
                      const checked = selectedCenters.includes(center.id);
                      const syncState = syncingCenters[center.id] || 'IDLE';
                      const alreadySynced = (centerSyncRegistry[uploadTargetPackage.id] || []).includes(center.id);
                      return (
                        <tr
                          key={center.id}
                          onClick={() => setSelectedCenters((prev) => prev.includes(center.id) ? prev.filter((item) => item !== center.id) : [...prev, center.id])}
                          className={`cursor-pointer border-b border-slate-100 transition hover:bg-slate-50 ${checked ? 'bg-green-50/30' : 'bg-white'}`}
                        >
                          <td className="px-5 py-4">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => setSelectedCenters((prev) => prev.includes(center.id) ? prev.filter((item) => item !== center.id) : [...prev, center.id])}
                              className="h-4 w-4 rounded border-slate-300 text-philsa-red focus:ring-philsa-red"
                            />
                          </td>
                          <td className="px-5 py-4">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <p className="font-black text-slate-900">{center.name}</p>
                                <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-mono text-slate-500">{center.code}</span>
                              </div>
                              <p className="text-[10px] text-slate-400">Examinee Capacity: {center.capacity}</p>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${center.classification === 'PUBLIC' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-violet-200 bg-violet-50 text-violet-700'}`}>
                              {center.classification}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="space-y-0.5">
                              <p className="font-semibold text-slate-900">{center.city}</p>
                              <p className="text-[10px] text-slate-400">{center.region}</p>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="space-y-0.5">
                              <p className="font-semibold text-slate-900">{center.administrator}</p>
                              <p className="text-[10px] text-slate-400">{center.email} | {center.phone}</p>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            {syncState === 'SYNCING' ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-[10px] font-bold text-amber-700 border border-amber-200">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Syncing
                              </span>
                            ) : alreadySynced ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-[10px] font-bold text-green-700 border border-green-200">
                                <CheckCircle className="h-3.5 w-3.5" /> Synced
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-500 border border-slate-200">
                                Pending
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {filteredPublishedTestingCenters.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-10 text-center text-xs text-philsa-gray">
                          No testing centers match your search criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {syncLogs.length > 0 && (
              <div className="card-philsa bg-white p-6 space-y-3">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-philsa-gray">
                  <span>Upload & Connection Log</span>
                  {isSyncingAll && <span className="text-green-600 animate-pulse">Broadcasting packet...</span>}
                </div>
                <div className="h-40 space-y-1 overflow-y-auto rounded-2xl bg-slate-900 p-4 font-mono text-[10px] text-slate-200">
                  {syncLogs.map((log, i) => (
                    <div key={i} className="leading-snug">
                      <span className="text-green-500">{'->'}</span> {log}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
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

                      <div className="border-t border-dashed border-philsa-border/60 pt-3 space-y-1">
                        <span className="text-[10px] font-black uppercase text-philsa-gray tracking-wider">Sync Status</span>
                        <div className="flex flex-wrap gap-1.5">
                          {['Manila', 'Cebu', 'Davao', 'Quezon'].map(centerName => {
                            const centerKey = centerName.toLowerCase();
                            const isSynced = (centerSyncRegistry[pack.id] || []).includes(centerKey);
                            return (
                              <span
                                key={centerName}
                                className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${isSynced ? 'bg-green-50 text-green-700 border border-green-200/50' : 'bg-slate-50 text-slate-400 border border-slate-200/50'}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${isSynced ? 'bg-green-500' : 'bg-slate-300'}`} />
                                {centerName}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <button
                          onClick={() => {
                            setSelectedAssembly(pack);
                            setActiveTab('assembly');
                          }}
                          className="bg-philsa-bg border border-philsa-border hover:bg-philsa-navy hover:text-white text-philsa-navy py-2 rounded-xl text-[11px] font-bold uppercase transition-all cursor-pointer flex items-center justify-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> View Details
                        </button>

                        <button
                          onClick={() => {
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

                        <button
                          onClick={() => openPublishedUploadWorkspace(pack)}
                          className="col-span-2 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-green-600/15"
                        >
                          <CloudLightning className="w-4 h-4" /> Upload to Testing Centers
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        )
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

            {/* Audit log table */}
            <div className="overflow-x-auto rounded-2xl border border-philsa-border bg-white">
              <table className="w-full min-w-[1200px] text-left">
                <thead className="border-b border-philsa-border bg-white">
                  <tr className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
                    <th className="px-5 py-4">Timestamp</th>
                    <th className="px-5 py-4">Operator / User</th>
                    <th className="px-5 py-4">Action Triggered</th>
                    <th className="px-5 py-4">Context Modifications</th>
                    <th className="px-5 py-4">Comments</th>
                    <th className="px-5 py-4 text-right">Security Meta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-philsa-border">
                  {auditTrailEntries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-14 text-center text-xs text-philsa-gray">
                        No audit entries captured yet.
                      </td>
                    </tr>
                  ) : (
                    auditTrailEntries.map((entry) => {
                      const actionTone =
                        entry.action === 'PUBLISH' ? 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200' :
                        entry.action === 'APPROVE' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                        entry.action === 'ASSEMBLE' ? 'bg-sky-100 text-sky-700 border-sky-200' :
                        entry.action === 'CREATE' ? 'bg-green-100 text-green-700 border-green-200' :
                        entry.action === 'DELETE' ? 'bg-red-100 text-red-700 border-red-200' :
                        'bg-slate-100 text-slate-700 border-slate-200';

                      return (
                        <tr key={entry.id} className="border-b border-philsa-border/60 hover:bg-slate-50/80 transition-colors">
                          <td className="px-5 py-5 align-top">
                            <div className="space-y-0.5">
                              <p className="text-[10px] font-mono font-bold text-slate-900">
                                {new Date(entry.timestamp).toLocaleString()}
                              </p>
                              <p className="text-[9px] text-slate-400">
                                {entry.examPeriod}
                              </p>
                            </div>
                          </td>

                          <td className="px-5 py-5 align-top">
                            <p className="max-w-[200px] break-words text-[13px] font-bold text-slate-900">
                              {entry.user}
                            </p>
                          </td>

                          <td className="px-5 py-5 align-top">
                            <span className={`inline-flex rounded-md border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] ${actionTone}`}>
                              {entry.action}
                            </span>
                          </td>

                          <td className="px-5 py-5 align-top">
                            <div className="space-y-1">
                              <p className="max-w-[320px] break-words text-[13px] font-bold text-slate-900">
                                {entry.examName} ({entry.examCode})
                              </p>
                              <p className="text-[10px] text-slate-500">
                                Prev: <span className="font-mono font-bold text-slate-700">{entry.previousValue}</span>
                              </p>
                              <p className="text-[10px] text-slate-500">
                                New: <span className="font-mono font-bold text-slate-700">{entry.newValue}</span>
                              </p>
                            </div>
                          </td>

                          <td className="px-5 py-5 align-top">
                            <p className="max-w-[260px] italic leading-relaxed text-[12px] text-slate-700">
                              "{entry.comments}"
                            </p>
                          </td>

                          <td className="px-5 py-5 align-top text-right">
                            <div className="space-y-1">
                              <p className="text-[10px] font-mono text-slate-700">{entry.ipAddress}</p>
                              <p className="text-[9px] text-slate-500">{entry.device}</p>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
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
          
          <div className="relative bg-white w-full max-w-[680px] rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
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

          <div className="relative w-full max-w-[680px] overflow-hidden rounded-[28px] bg-white shadow-2xl shadow-slate-950/20 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between border-b border-slate-200 px-8 py-7">
              <div>
                <h4 className="flex items-center gap-2 text-[18px] font-extrabold uppercase tracking-[0.02em] text-slate-900">
                  <ClipboardList className="w-5 h-5 text-philsa-red" />
                  Create Exam Set
                </h4>
                <p className="mt-1 text-[13px] text-slate-500">
                  Initialize a blank examination form based on an approved blueprint.
                </p>
              </div>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateAssembly} className="px-8 py-7">
              <div className="grid grid-cols-1 gap-5">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Examination Code</label>
                    <input
                      type="text"
                      placeholder="ES-004-2027A"
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[14px] text-slate-800 outline-none transition focus:border-philsa-red focus:ring-2 focus:ring-philsa-red/10"
                      value={wizardMeta.code}
                      onChange={(e) => setWizardMeta({ ...wizardMeta, code: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Select Approved Blueprint</label>
                    <select
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[14px] text-slate-800 outline-none transition focus:border-philsa-red focus:ring-2 focus:ring-philsa-red/10"
                      value={wizardMeta.blueprintId}
                      onChange={(e) => setWizardMeta({ ...wizardMeta, blueprintId: e.target.value })}
                    >
                      {INITIAL_BLUEPRINTS.map(bp => (
                        <option key={bp.id} value={bp.id}>
                          {bp.status === 'PUBLISHED' ? '[PUBLISHED] ' : bp.status === 'APPROVED' ? '[APPROVED] ' : ''}
                          {bp.code} - {bp.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Select Batch</label>
                    <input
                      type="text"
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[14px] text-slate-800 outline-none transition focus:border-philsa-red focus:ring-2 focus:ring-philsa-red/10"
                      value={wizardMeta.batch}
                      onChange={(e) => setWizardMeta({ ...wizardMeta, batch: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Examination Type</label>
                    <select
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[14px] text-slate-800 outline-none transition focus:border-philsa-red focus:ring-2 focus:ring-philsa-red/10"
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

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Academic Year</label>
                  <input
                    type="text"
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[14px] text-slate-800 outline-none transition focus:border-philsa-red focus:ring-2 focus:ring-philsa-red/10"
                    value={wizardMeta.academicYear}
                    onChange={(e) => setWizardMeta({ ...wizardMeta, academicYear: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Form Instructions (Optional)</label>
                  <textarea
                    className="min-h-28 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[14px] text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-philsa-red focus:ring-2 focus:ring-philsa-red/10"
                    value={wizardMeta.instructions}
                    onChange={(e) => setWizardMeta({ ...wizardMeta, instructions: e.target.value })}
                    placeholder="Answer all questions according to rules."
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="flex-1 rounded-2xl bg-slate-50 px-5 py-4 text-[14px] font-extrabold uppercase tracking-[0.18em] text-slate-700 transition hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-2xl bg-philsa-red px-5 py-4 text-[14px] font-extrabold uppercase tracking-[0.18em] text-white shadow-lg shadow-philsa-red/15 transition hover:bg-philsa-red/90 cursor-pointer"
                  >
                    Setup Exam Set
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
