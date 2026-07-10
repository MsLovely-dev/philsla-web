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
  History,
  FileSignature,
  FileSpreadsheet,
  Map,
  Tag,
  Paperclip,
  Check,
  Calendar,
  AlertTriangle,
  ExternalLink,
  ShieldAlert,
  User,
  PlusCircle,
  Link as LinkIcon,
  CornerDownRight,
  BookOpen,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Scissors,
  Copy,
  Highlighter,
  Heading1,
  Heading2,
  Table as TableIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePhilSA } from '../../../PhilSAContext';
import { cn } from '../../../lib/utils';
import { SharedStimulus, StimulusType, StimulusStatus, StimulusAttachment, StimulusVersion, StimulusAuditLog, Question } from '../../../types';
import WordRibbonEditor from './WordRibbonEditor';

// Let's seed detailed space-themed mock stimuli matching PhilSA context!
const SEED_STIMULI: SharedStimulus[] = [
  {
    id: 'STM-2026-001',
    title: 'The Diwata-2 Microsatellite Command and Orbit Parameters',
    type: 'CASE_STUDY',
    content: `<h3><strong>1. Overview of the Diwata-2 Microsatellite Mission</strong></h3>
<p>Diwata-2 is a 50-kilogram Philippine Earth-observation microsatellite launched into a 613-kilometer Sun-Synchronous Orbit (SSO) on October 29, 2018. Developed under the PHL-Microsat Program (and continued by PhilSA), it carries an Enhanced Resolution Tourist Camera (ERTC), a Spaceborne Multispectral Imager (SMI) with liquid crystal tunable filters, and an Amateur Radio Payload. Unlike its predecessor Diwata-1, Diwata-2 features a deployable solar array panel and operates in a circular SSO, which ensures a constant local time of descending node (LTDN) at approximately 10:30 AM.</p>

<h3><strong>2. Orbital Telemetry and Keplerian Data</strong></h3>
<p>To determine the spacecraft position and schedule ground-station passes at the Quezon City Ground Receiving Station (GRS), operators utilize standard Two-Line Element (TLE) sets. The simplified Keplerian elements are governed by orbital physics where the period (<em>T</em>) is related to the semi-major axis (<em>a</em>) by Kepler's Third Law:</p>
<pre>T² = (4π² / GM) * a³</pre>
<p>Where <strong>G</strong> is the gravitational constant, and <strong>M</strong> is the mass of the Earth (GM ≈ 3.986004418 × 10¹⁴ m³/s²). The altitude of 613 km implies a semi-major axis <em>a</em> ≈ 6991 km, resulting in an orbital period of approximately 97 minutes, completing roughly 14.8 orbits per day.</p>

<h3><strong>3. Imaging payload and agricultural applications</strong></h3>
<p>The SMI payload captures reflectance data across several discrete bands: Blue (450 nm), Green (550 nm), Red (660 nm), and Near-Infrared (850 nm). By analyzing the ratio of red and near-infrared reflectance, agricultural researchers monitor vegetation health throughout the Central Luzon agricultural plain via the Normalized Difference Vegetation Index (NDVI):</p>
<pre>NDVI = (NIR - RED) / (NIR + RED)</pre>
<p>Healthy crops reflect highly in NIR and absorb in RED, yielding NDVI values between 0.4 and 0.8, whereas water bodies absorb NIR strongly, yielding negative NDVI values.</p>`,
    subject: 'Science',
    topic: 'Space Technology & Remote Sensing',
    difficulty: 'HARD',
    curriculum: 'Specialized Space Tech Curriculum',
    academicYear: '2026-2027',
    owner: 'Dr. Jaime C. Santos',
    ownerId: 'u1',
    status: 'PUBLISHED',
    version: 1,
    createdAt: '2026-05-15T08:30:00Z',
    updatedAt: '2026-05-15T08:30:00Z',
    tags: ['Diwata-2', 'SMI', 'Orbits', 'NDVI', 'Remote Sensing'],
    attachments: [
      { id: 'att-1', name: 'diwata2_schematics.pdf', url: '#', size: '2.4 MB', type: 'application/pdf' },
      { id: 'att-2', name: 'orbit_graph.png', url: '#', size: '840 KB', type: 'image/png' }
    ],
    versions: [
      {
        version: 1,
        content: `<h3><strong>1. Overview of the Diwata-2 Microsatellite Mission</strong></h3>...`,
        title: 'The Diwata-2 Microsatellite Command and Orbit Parameters',
        updatedAt: '2026-05-15T08:30:00Z',
        updatedBy: 'Dr. Jaime C. Santos',
        changeLog: 'Initial publication of Diwata-2 telemetry and remote sensing case study.',
        status: 'PUBLISHED'
      }
    ]
  },
  {
    id: 'STM-2026-002',
    title: 'Philippine Space Act (Republic Act No. 11363) Governance Framework',
    type: 'READING_PASSAGE',
    content: `<p><strong>Republic Act No. 11363</strong>, officially known as the <em>"Philippine Space Act,"</em> was signed into law on August 8, 2019. This landmark legislation established the Philippine Space Agency (PhilSA) as the central government body addressing all national issues and activities related to space science & technology applications (SSTA).</p>
<blockquote>"Section 4. Declaration of Policy. — It is the policy of the State to safeguard national sovereignty, territorial integrity, and national interest, and support and commit to the development and promotion of a national space program..."</blockquote>
<p>The law outlines six Key Development Areas (KDAs) of the Philippine Space Policy:</p>
<ol>
  <li><strong>National Security and Development:</strong> Utilizing space assets to guard boundaries, monitor maritime territories, and support defense.</li>
  <li><strong>Hazard Management and Climate Studies:</strong> Improving disaster risk reduction, warning systems, and climate change mitigation using remote-sensing imagery.</li>
  <li><strong>Space Research and Development:</strong> Building local capacity in space science, engineering, and astrophysics.</li>
  <li><strong>Space Industry Capacity Building:</strong> Prompting domestic commercialization, technology transfer, and startup incubation.</li>
  <li><strong>Space Education and Awareness:</strong> Enhancing space science in school curricula to build the next generation of space scientists.</li>
  <li><strong>International Cooperation:</strong> Participating in global space treaties, bilateral missions, and sharing regional satellite data.</li>
</ol>
<p>PhilSA operates as an agency attached to the Office of the President, ensuring direct high-level coordination for national spatial planning, security, and satellite communications.</p>`,
    subject: 'Social Science',
    topic: 'Philippine Space Policy & Law',
    difficulty: 'MEDIUM',
    curriculum: 'K-12 Basic Education (Grades 11-12)',
    academicYear: '2026-2027',
    owner: 'Atty. Maria Elena Ramos',
    ownerId: 'u2',
    status: 'PUBLISHED',
    version: 2,
    createdAt: '2026-04-10T10:00:00Z',
    updatedAt: '2026-05-20T14:15:00Z',
    tags: ['RA 11363', 'Space Law', 'PhilSA', 'Governance', 'KDAs'],
    attachments: [
      { id: 'att-3', name: 'ra_11363_full.pdf', url: '#', size: '1.2 MB', type: 'application/pdf' }
    ],
    versions: [
      {
        version: 1,
        content: `<p>Initial rough draft of Republic Act No. 11363 notes.</p>`,
        title: 'Philippine Space Act (RA 11363) Summary',
        updatedAt: '2026-04-10T10:00:00Z',
        updatedBy: 'Atty. Maria Elena Ramos',
        changeLog: 'Initial working draft.',
        status: 'DRAFT'
      },
      {
        version: 2,
        content: `<p><strong>Republic Act No. 11363</strong>, officially known as the <em>"Philippine Space Act,"</em>...`,
        title: 'Philippine Space Act (Republic Act No. 11363) Governance Framework',
        updatedAt: '2026-05-20T14:15:00Z',
        updatedBy: 'Atty. Maria Elena Ramos',
        changeLog: 'Expanded legal quotes, structured the six Key Development Areas (KDAs), and added PhilSA attachment details.',
        status: 'PUBLISHED'
      }
    ]
  },
  {
    id: 'STM-2026-003',
    title: 'Spectral Signature Curves of Common Earth Features',
    type: 'GRAPH',
    content: `<p>In Remote Sensing, features on the Earth's surface reflect, absorb, and transmit electromagnetic radiation uniquely based on their physical and chemical properties. A feature's reflectance across different wavelengths is mapped as its <strong>spectral signature</strong>.</p>
<p>The graph below outlines the percentage reflectance (y-axis, 0% to 100%) as a function of wavelength (x-axis, 0.4 µm to 2.5 µm, spanning Visible Blue, Green, Red, Near-Infrared, and Shortwave Infrared):</p>
<ul>
  <li><strong>Clear Deep Water:</strong> High reflectance in visible blue (approx. 8-10%), declining rapidly to nearly 0% in NIR and completely 0% in SWIR.</li>
  <li><strong>Healthy Green Vegetation:</strong> Small peak in visible green (approx. 15%), high absorption in blue & red (approx. 3-5% reflectance), steep rise at 0.7 µm ("Red Edge") up to high plateaus in NIR (approx. 50-60%), with absorption valleys in SWIR due to water content.</li>
  <li><strong>Dry Sand/Clay Soil:</strong> Reflectance rises monotonically with wavelength, from approx. 10% in visible blue to over 40% in shortwave infrared.</li>
</ul>
<p>Remote sensing software classifies land cover by mathematically comparing multi-spectral pixel bands against these baseline spectral curves.</p>`,
    subject: 'Science',
    topic: 'Remote Sensing Electro-Magnetism',
    difficulty: 'MEDIUM',
    curriculum: 'Specialized Space Tech Curriculum',
    academicYear: '2026-2027',
    owner: 'Prof. Danilo G. Cruz',
    ownerId: 'u3',
    status: 'IN_REVIEW',
    version: 1,
    createdAt: '2026-06-01T09:00:00Z',
    updatedAt: '2026-06-01T09:00:00Z',
    tags: ['Spectral Signature', 'Reflectance', 'Wavelengths', 'NIR', 'SWIR'],
    attachments: [
      { id: 'att-4', name: 'spectral_curves_dataset.xlsx', url: '#', size: '4.1 MB', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
    ],
    versions: [
      {
        version: 1,
        content: `<p>In Remote Sensing, features on the Earth's surface reflect...</p>`,
        title: 'Spectral Signature Curves of Common Earth Features',
        updatedAt: '2026-06-01T09:00:00Z',
        updatedBy: 'Prof. Danilo G. Cruz',
        changeLog: 'First draft submitted for academic review.',
        status: 'IN_REVIEW'
      }
    ]
  },
  {
    id: 'STM-2026-004',
    title: 'Keplerian Orbit Speed & Escape Velocity Formula Matrix',
    type: 'FORMULA',
    content: `<p>In astronautics, the motion of satellites around the Earth is modeled using classical mechanics under Newtonian gravity. The gravitational force between a satellite of mass <em>m</em> and the Earth of mass <em>M</em> at distance <em>r</em> from the Earth's center is:</p>
<p><strong>F_g = G * M * m / r²</strong></p>
<p>Equating this to the centripetal force required for a stable circular orbit (<strong>F_c = m * v² / r</strong>) yields the <strong>Circular Orbital Velocity (v_c)</strong>:</p>
<p style="text-align: center; font-size: 1.1rem; font-weight: bold;">v_c = √ (G * M / r)</p>
<p>Furthermore, to escape the gravitational field entirely from distance <em>r</em>, the satellite must possess kinetic energy equal to its potential energy barrier. This defines the <strong>Escape Velocity (v_e)</strong>:</p>
<p style="text-align: center; font-size: 1.1rem; font-weight: bold;">v_e = √ (2 * G * M / r) = √2 * v_c</p>
<p>These relationships dictate that escape velocity is always exactly square root of 2 (~1.414) times the circular orbital velocity at any given radius.</p>`,
    subject: 'Mathematics',
    topic: 'Astronautical Physics & Algebra',
    difficulty: 'HARD',
    curriculum: 'Advanced Placement / College Level Math',
    academicYear: '2026-2027',
    owner: 'Dr. Jaime C. Santos',
    ownerId: 'u1',
    status: 'DRAFT',
    version: 1,
    createdAt: '2026-06-12T11:20:00Z',
    updatedAt: '2026-06-12T11:20:00Z',
    tags: ['Kepler', 'Orbit Speed', 'Escape Velocity', 'Gravity', 'Equations'],
    attachments: [],
    versions: [
      {
        version: 1,
        content: `<p>In astronautics, the motion of satellites...</p>`,
        title: 'Keplerian Orbit Speed & Escape Velocity Formula Matrix',
        updatedAt: '2026-06-12T11:20:00Z',
        updatedBy: 'Dr. Jaime C. Santos',
        changeLog: 'Drafted circular orbit mechanics equations.',
        status: 'DRAFT'
      }
    ]
  }
];

// Seed Audit Logs
const SEED_AUDIT_LOGS: StimulusAuditLog[] = [
  {
    id: 'SL-1',
    stimulusId: 'STM-2026-001',
    action: 'CREATE',
    userId: 'u1',
    userName: 'Dr. Jaime C. Santos',
    userRole: 'ITEM_WRITER',
    timestamp: '2026-05-15T08:00:00Z',
    details: 'Created first draft of Diwata-2 orbital parameters and remote sensing case study.'
  },
  {
    id: 'SL-2',
    stimulusId: 'STM-2026-001',
    action: 'SUBMIT_FOR_REVIEW',
    userId: 'u1',
    userName: 'Dr. Jaime C. Santos',
    userRole: 'ITEM_WRITER',
    timestamp: '2026-05-15T08:15:00Z',
    details: 'Submitted Diwata-2 stimulus for review by Academic Review committee.'
  },
  {
    id: 'SL-3',
    stimulusId: 'STM-2026-001',
    action: 'PUBLISH',
    userId: 'adm1',
    userName: 'Super Administrator',
    userRole: 'SYSTEM_ADMIN',
    timestamp: '2026-05-15T08:30:00Z',
    details: 'Approved and published Diwata-2 stimulus to the live Question Bank pool.'
  },
  {
    id: 'SL-4',
    stimulusId: 'STM-2026-002',
    action: 'CREATE',
    userId: 'u2',
    userName: 'Atty. Maria Elena Ramos',
    userRole: 'ITEM_WRITER',
    timestamp: '2026-04-10T10:00:00Z',
    details: 'Created Philippine Space Act overview.'
  },
  {
    id: 'SL-5',
    stimulusId: 'STM-2026-002',
    action: 'MODIFY',
    userId: 'u2',
    userName: 'Atty. Maria Elena Ramos',
    userRole: 'ITEM_WRITER',
    timestamp: '2026-05-20T14:00:00Z',
    details: 'Modified stimulus content to structure the 6 KDAs, raising version to 2.'
  },
  {
    id: 'SL-6',
    stimulusId: 'STM-2026-002',
    action: 'PUBLISH',
    userId: 'adm1',
    userName: 'Super Administrator',
    userRole: 'SYSTEM_ADMIN',
    timestamp: '2026-05-20T14:15:00Z',
    details: 'Published Version 2 of RA 11363 stimulus.'
  }
];

const STIMULUS_TYPE_LABELS: Record<StimulusType, { label: string; bg: string; text: string; icon: any }> = {
  READING_PASSAGE: { label: 'Reading Passage', bg: 'bg-emerald-50', text: 'text-emerald-700', icon: FileText },
  CASE_STUDY: { label: 'Case Study', bg: 'bg-blue-50', text: 'text-blue-700', icon: BookOpen },
  GRAPH: { label: 'Graph', bg: 'bg-indigo-50', text: 'text-indigo-700', icon: History },
  CHART: { label: 'Chart', bg: 'bg-purple-50', text: 'text-purple-700', icon: History },
  TABLE: { label: 'Table', bg: 'bg-pink-50', text: 'text-pink-700', icon: FileSpreadsheet },
  IMAGE: { label: 'Image', bg: 'bg-orange-50', text: 'text-orange-700', icon: ImageIcon },
  DIAGRAM: { label: 'Diagram', bg: 'bg-sky-50', text: 'text-sky-700', icon: Layers },
  MAP: { label: 'Map', bg: 'bg-amber-50', text: 'text-amber-700', icon: Map },
  FORMULA: { label: 'Formula Matrix', bg: 'bg-teal-50', text: 'text-teal-700', icon: Calculator },
  MULTIMEDIA: { label: 'Multimedia Ref', bg: 'bg-rose-50', text: 'text-rose-700', icon: Type }
};

const STATUS_CONFIGS: Record<StimulusStatus, { label: string; bg: string; text: string; border: string; icon: any }> = {
  DRAFT: { label: 'Draft', bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', icon: FileSignature },
  IN_REVIEW: { label: 'In Review', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: Clock },
  APPROVED: { label: 'Approved', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: CheckCircle },
  PUBLISHED: { label: 'Published', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: Send },
  RETIRED: { label: 'Retired', bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300', icon: Archive },
  ARCHIVED: { label: 'Archived', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-300', icon: Archive }
};

export default function StimulusManagement() {
  const { user, addAuditLog } = usePhilSA();
  
  // States
  const [stimuli, setStimuli] = useState<SharedStimulus[]>([]);
  const [auditLogs, setAuditLogs] = useState<StimulusAuditLog[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  
  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | 'RETIRED' | 'ARCHIVED'>('ALL');
  const [showFilters, setShowFilters] = useState(false);
  
  // Modal & Focus States
  const [selectedStimulus, setSelectedStimulus] = useState<SharedStimulus | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [isLinkQuestionModalOpen, setIsLinkQuestionModalOpen] = useState(false);
  const [isCreateQuestionModalOpen, setIsCreateQuestionModalOpen] = useState(false);

  // Form Fields for Stimulus Create/Edit
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formType, setFormType] = useState<StimulusType>('READING_PASSAGE');
  const [formSubject, setFormSubject] = useState('Science');
  const [formTopic, setFormTopic] = useState('');
  const [formDifficulty, setFormDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const [formCurriculum, setFormCurriculum] = useState('K-12 Basic Education (Grades 11-12)');
  const [formAcademicYear, setFormAcademicYear] = useState('2026-2027');
  const [formTags, setFormTags] = useState('');
  const [formChangeLog, setFormChangeLog] = useState('');
  const [formAttachments, setFormAttachments] = useState<StimulusAttachment[]>([]);
  
  // Question Linking Selection
  const [questionsToLink, setQuestionsToLink] = useState<string[]>([]);
  
  // New Question Form
  const [qText, setQText] = useState('');
  const [qType, setQType] = useState<'MCQ' | 'TF' | 'FIB' | 'ESSAY'>('MCQ');
  const [qPoints, setQPoints] = useState(5);
  const [qOptions, setQOptions] = useState<string[]>(['', '', '', '']);
  const [qCorrect, setQCorrect] = useState('');

  // Loaded from LocalStorage on mount
  useEffect(() => {
    // 1. Load stimuli
    const savedStimuli = localStorage.getItem('philsa_stimuli');
    if (savedStimuli) {
      try {
        setStimuli(JSON.parse(savedStimuli));
      } catch (e) {
        setStimuli(SEED_STIMULI);
      }
    } else {
      setStimuli(SEED_STIMULI);
      localStorage.setItem('philsa_stimuli', JSON.stringify(SEED_STIMULI));
    }

    // 2. Load audit logs
    const savedLogs = localStorage.getItem('philsa_stimuli_audit');
    if (savedLogs) {
      try {
        setAuditLogs(JSON.parse(savedLogs));
      } catch (e) {
        setAuditLogs(SEED_AUDIT_LOGS);
      }
    } else {
      setAuditLogs(SEED_AUDIT_LOGS);
      localStorage.setItem('philsa_stimuli_audit', JSON.stringify(SEED_AUDIT_LOGS));
    }

    // 3. Load standard Questions to handle linkages
    const savedQuestions = localStorage.getItem('philsa_hub_questions');
    if (savedQuestions) {
      try {
        const parsed = JSON.parse(savedQuestions) as Question[];
        // Let's seed a few initial links to mock stimuli if not present!
        let altered = false;
        const mapped = parsed.map(q => {
          if (!q.stimulusId) {
            if (q.id === 'Q-4423') { q.stimulusId = 'STM-2026-002'; altered = true; }
            if (q.id === 'Q-4422' || q.id === 'Q-4426') { q.stimulusId = 'STM-2026-001'; altered = true; }
          }
          return q;
        });
        setQuestions(mapped);
        if (altered) {
          localStorage.setItem('philsa_hub_questions', JSON.stringify(mapped));
        }
      } catch (e) {
        setQuestions([]);
      }
    } else {
      // Create some default questions mapped to stimuli
      const defaultQs: Question[] = [
        {
          id: 'Q-4421',
          text: 'What is the derivative of sin(x)?',
          type: 'MCQ',
          subject: 'Mathematics',
          topic: 'Calculus',
          difficulty: 'MEDIUM',
          score: 5,
          options: ['cos(x)', '-cos(x)', 'tan(x)', 'sec(x)'],
          correctAnswer: 'cos(x)',
          status: 'APPROVED',
          authorId: 'u1'
        },
        {
          id: 'Q-4422',
          text: 'Using the provided Diwata-2 parameters, which orbital type guarantees that the microsatellite passes over any Earth point at the exact same local solar time?',
          type: 'MCQ',
          subject: 'Science',
          topic: 'Space Technology & Remote Sensing',
          difficulty: 'MEDIUM',
          score: 5,
          options: ['Sun-Synchronous Orbit (SSO)', 'Geostationary Equatorial Orbit (GEO)', 'Molniya Orbit', 'Low Earth Equatorial Orbit'],
          correctAnswer: 'Sun-Synchronous Orbit (SSO)',
          status: 'PUBLISHED',
          authorId: 'u1',
          stimulusId: 'STM-2026-001'
        },
        {
          id: 'Q-4423',
          text: 'Based on Republic Act No. 11363 (Philippine Space Act), which Key Development Area focuses primarily on crop mapping and meteorological tracking?',
          type: 'MCQ',
          subject: 'Social Science',
          topic: 'Philippine Space Policy & Law',
          difficulty: 'MEDIUM',
          score: 5,
          options: ['Hazard Management and Climate Studies', 'National Security and Development', 'Space Research and Development', 'Space Industry Capacity Building'],
          correctAnswer: 'Hazard Management and Climate Studies',
          status: 'PUBLISHED',
          authorId: 'u2',
          stimulusId: 'STM-2026-002'
        },
        {
          id: 'Q-4426',
          text: 'If Diwata-2 flies at an altitude of approximately 613 km resulting in a semi-major axis of 6991 km, what is its approximate daily orbit completion frequency?',
          type: 'MCQ',
          subject: 'Science',
          topic: 'Space Technology & Remote Sensing',
          difficulty: 'HARD',
          score: 10,
          options: ['14.8 orbits per day', '10.2 orbits per day', '24 orbits per day', '8.5 orbits per day'],
          correctAnswer: '14.8 orbits per day',
          status: 'PUBLISHED',
          authorId: 'u1',
          stimulusId: 'STM-2026-001'
        }
      ];
      setQuestions(defaultQs);
      localStorage.setItem('philsa_hub_questions', JSON.stringify(defaultQs));
    }
  }, []);

  // Save updates helper
  const saveStimuli = (newStimuli: SharedStimulus[]) => {
    setStimuli(newStimuli);
    localStorage.setItem('philsa_stimuli', JSON.stringify(newStimuli));
  };

  const saveQuestionsState = (newQs: Question[]) => {
    setQuestions(newQs);
    localStorage.setItem('philsa_hub_questions', JSON.stringify(newQs));
  };

  const pushAuditLog = (stimulusId: string, action: StimulusAuditLog['action'], details: string) => {
    const newLog: StimulusAuditLog = {
      id: `SL-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      stimulusId,
      action,
      userId: user?.id || 'adm1',
      userName: `${user?.firstName || 'System'} ${user?.lastName || 'Administrator'}`,
      userRole: user?.role || 'SYSTEM_ADMIN',
      timestamp: new Date().toISOString(),
      details
    };
    const updated = [newLog, ...auditLogs];
    setAuditLogs(updated);
    localStorage.setItem('philsa_stimuli_audit', JSON.stringify(updated));
    
    // Also dispatch to main global system audit log
    addAuditLog('SHARED_STIMULUS', `${action} on Stimulus ${stimulusId}: ${details}`);
  };

  // Lifecycle handlers
  const handleCreateStimulus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const newId = `STM-2026-${String(stimuli.length + 1).padStart(3, '0')}`;
    const tagsArray = formTags.split(',').map(t => t.trim()).filter(Boolean);
    
    const newStim: SharedStimulus = {
      id: newId,
      title: formTitle,
      content: formContent,
      type: formType,
      subject: formSubject,
      topic: formTopic || `${formSubject} Core`,
      difficulty: formDifficulty,
      curriculum: formCurriculum,
      academicYear: formAcademicYear,
      owner: `${user?.firstName || 'System'} ${user?.lastName || 'Admin'}`,
      ownerId: user?.id || 'adm1',
      status: 'DRAFT',
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: tagsArray,
      attachments: formAttachments,
      versions: [
        {
          version: 1,
          content: formContent,
          title: formTitle,
          updatedAt: new Date().toISOString(),
          updatedBy: `${user?.firstName || 'System'} ${user?.lastName || 'Admin'}`,
          changeLog: 'Initial Draft creation.',
          status: 'DRAFT'
        }
      ]
    };

    const updatedList = [newStim, ...stimuli];
    saveStimuli(updatedList);
    pushAuditLog(newId, 'CREATE', `Created shared stimulus "${formTitle}" of type ${formType}.`);
    
    // Reset Form & Close
    resetForm();
    setIsCreateModalOpen(false);
  };

  const handleEditStimulus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStimulus) return;

    const tagsArray = formTags.split(',').map(t => t.trim()).filter(Boolean);
    const isPublished = selectedStimulus.status === 'PUBLISHED';
    let updatedStimulus = { ...selectedStimulus };

    if (isPublished) {
      // Edit of published versions creates a NEW version
      const nextVer = selectedStimulus.version + 1;
      const newVerObj: StimulusVersion = {
        version: nextVer,
        content: formContent,
        title: formTitle,
        updatedAt: new Date().toISOString(),
        updatedBy: `${user?.firstName || 'System'} ${user?.lastName || 'Admin'}`,
        changeLog: formChangeLog || `Auto-created version ${nextVer} due to edits.`,
        status: 'PUBLISHED' // Edits to published keep it published but raise version
      };

      updatedStimulus = {
        ...selectedStimulus,
        title: formTitle,
        content: formContent,
        type: formType,
        subject: formSubject,
        topic: formTopic || `${formSubject} Core`,
        difficulty: formDifficulty,
        curriculum: formCurriculum,
        academicYear: formAcademicYear,
        version: nextVer,
        updatedAt: new Date().toISOString(),
        tags: tagsArray,
        attachments: [...selectedStimulus.attachments, ...formAttachments],
        versions: [...selectedStimulus.versions, newVerObj]
      };

      pushAuditLog(
        selectedStimulus.id, 
        'MODIFY', 
        `Edited published stimulus. Created Version ${nextVer}. ChangeLog: ${formChangeLog || 'None specified'}`
      );
    } else {
      // Editing drafts/reviews modifies current version directly
      const curVer = selectedStimulus.version;
      const updatedVersions = [...selectedStimulus.versions];
      const verIdx = updatedVersions.findIndex(v => v.version === curVer);
      
      const updatedVerObj: StimulusVersion = {
        version: curVer,
        content: formContent,
        title: formTitle,
        updatedAt: new Date().toISOString(),
        updatedBy: `${user?.firstName || 'System'} ${user?.lastName || 'Admin'}`,
        changeLog: formChangeLog || 'Modified working draft content.',
        status: selectedStimulus.status
      };

      if (verIdx > -1) {
        updatedVersions[verIdx] = updatedVerObj;
      } else {
        updatedVersions.push(updatedVerObj);
      }

      updatedStimulus = {
        ...selectedStimulus,
        title: formTitle,
        content: formContent,
        type: formType,
        subject: formSubject,
        topic: formTopic,
        difficulty: formDifficulty,
        curriculum: formCurriculum,
        academicYear: formAcademicYear,
        updatedAt: new Date().toISOString(),
        tags: tagsArray,
        attachments: formAttachments,
        versions: updatedVersions
      };

      pushAuditLog(selectedStimulus.id, 'MODIFY', `Updated draft stimulus details.`);
    }

    const updatedList = stimuli.map(s => s.id === selectedStimulus.id ? updatedStimulus : s);
    saveStimuli(updatedList);
    setSelectedStimulus(updatedStimulus);
    setIsEditModalOpen(false);
    resetForm();
  };

  const handleUpdateStatus = (id: string, newStatus: StimulusStatus, remarks: string = '') => {
    const original = stimuli.find(s => s.id === id);
    if (!original) return;

    const actionMap: Record<StimulusStatus, StimulusAuditLog['action']> = {
      DRAFT: 'RESTORE',
      IN_REVIEW: 'SUBMIT_FOR_REVIEW',
      APPROVED: 'APPROVE',
      PUBLISHED: 'PUBLISH',
      RETIRED: 'RETIRE',
      ARCHIVED: 'ARCHIVE'
    };

    const action = actionMap[newStatus];

    const updated = stimuli.map(s => {
      if (s.id === id) {
        // Also update status of latest version in history
        const latestVer = s.versions.map(v => {
          if (v.version === s.version) {
            return { ...v, status: newStatus };
          }
          return v;
        });

        return {
          ...s,
          status: newStatus,
          updatedAt: new Date().toISOString(),
          versions: latestVer
        };
      }
      return s;
    });

    saveStimuli(updated);
    pushAuditLog(id, action, `Updated status to ${newStatus}. ${remarks ? 'Remarks: ' + remarks : ''}`);
    
    // Update local state if viewing details
    if (selectedStimulus?.id === id) {
      setSelectedStimulus({
        ...selectedStimulus,
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
    }
  };

  const handleDeleteStimulus = (id: string) => {
    // 1. Check if stimulus is used by active exam forms (we mock that checking active questions)
    const linkedQs = questions.filter(q => q.stimulusId === id && q.status === 'PUBLISHED');
    if (linkedQs.length > 0) {
      alert(`Cannot delete shared stimulus. It is currently linked to ${linkedQs.length} active questions in the published Question Bank. Please unlink or archive the questions first.`);
      return;
    }

    if (window.confirm('Are you sure you want to permanently delete this Shared Stimulus? This action is irreversible and will break any draft items linked to it.')) {
      const filtered = stimuli.filter(s => s.id !== id);
      saveStimuli(filtered);
      
      // Also clear stimulus link from questions
      const unlinkedQs = questions.map(q => {
        if (q.stimulusId === id) {
          return { ...q, stimulusId: undefined };
        }
        return q;
      });
      saveQuestionsState(unlinkedQs);

      pushAuditLog(id, 'DELETE', `Permanently deleted stimulus from database. Cleaned up question back-references.`);
      setSelectedStimulus(null);
      setIsPreviewMode(false);
    }
  };

  // Question Linkage Handlers
  const handleLinkQuestionsSubmit = () => {
    if (!selectedStimulus) return;

    const updatedQs = questions.map(q => {
      if (questionsToLink.includes(q.id)) {
        return { ...q, stimulusId: selectedStimulus.id };
      } else if (q.stimulusId === selectedStimulus.id) {
        // If it was linked but not selected now, unlink it
        return { ...q, stimulusId: undefined };
      }
      return q;
    });

    saveQuestionsState(updatedQs);
    pushAuditLog(
      selectedStimulus.id, 
      'LINK_QUESTION', 
      `Synchronized linked questions. Selected count: ${questionsToLink.length}`
    );
    setIsLinkQuestionModalOpen(false);
  };

  const handleCreateChildQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStimulus || !qText.trim()) return;

    const newQId = `Q-${Date.now().toString().substring(8)}`;
    const newQ: Question = {
      id: newQId,
      text: qText,
      type: qType,
      subject: selectedStimulus.subject,
      topic: selectedStimulus.topic,
      difficulty: selectedStimulus.difficulty,
      score: qPoints,
      options: qType === 'MCQ' ? qOptions.filter(Boolean) : undefined,
      correctAnswer: qType === 'TF' ? (qCorrect === 'True' ? true : false) : qCorrect,
      status: 'DRAFT',
      authorId: user?.id || 'adm1',
      stimulusId: selectedStimulus.id
    };

    const updated = [...questions, newQ];
    saveQuestionsState(updated);
    pushAuditLog(selectedStimulus.id, 'LINK_QUESTION', `Created and linked new child question: ${newQId} - "${qText.substring(0, 40)}..."`);
    
    // Reset Form
    setQText('');
    setQPoints(5);
    setQOptions(['', '', '', '']);
    setQCorrect('');
    setIsCreateQuestionModalOpen(false);
  };

  const unlinkSingleQuestion = (qId: string) => {
    const updated = questions.map(q => {
      if (q.id === qId) {
        return { ...q, stimulusId: undefined };
      }
      return q;
    });
    saveQuestionsState(updated);
    if (selectedStimulus) {
      pushAuditLog(selectedStimulus.id, 'UNLINK_QUESTION', `Unlinked question ${qId}.`);
    }
  };

  const addMockAttachment = () => {
    const mockAtt: StimulusAttachment = {
      id: `att-${Date.now()}`,
      name: `attachment_${Math.random().toString(36).substring(4, 8)}.pdf`,
      url: '#',
      size: `${(Math.random() * 3 + 0.5).toFixed(1)} MB`,
      type: 'application/pdf'
    };
    setFormAttachments([...formAttachments, mockAtt]);
  };

  const removeAttachment = (attId: string) => {
    setFormAttachments(formAttachments.filter(a => a.id !== attId));
  };

  const resetForm = () => {
    setFormTitle('');
    setFormContent('');
    setFormType('READING_PASSAGE');
    setFormSubject('Science');
    setFormTopic('');
    setFormDifficulty('MEDIUM');
    setFormCurriculum('K-12 Basic Education (Grades 11-12)');
    setFormAcademicYear('2026-2027');
    setFormTags('');
    setFormChangeLog('');
    setFormAttachments([]);
  };

  const openEditModal = (stim: SharedStimulus) => {
    setSelectedStimulus(stim);
    setFormTitle(stim.title);
    setFormContent(stim.content);
    setFormType(stim.type);
    setFormSubject(stim.subject);
    setFormTopic(stim.topic);
    setFormDifficulty(stim.difficulty);
    setFormCurriculum(stim.curriculum);
    setFormAcademicYear(stim.academicYear);
    setFormTags(stim.tags.join(', '));
    setFormChangeLog('');
    setFormAttachments(stim.attachments || []);
    setIsEditModalOpen(true);
  };

  const openLinkQuestionsModal = (stim: SharedStimulus) => {
    setSelectedStimulus(stim);
    const currentlyLinked = questions.filter(q => q.stimulusId === stim.id).map(q => q.id);
    setQuestionsToLink(currentlyLinked);
    setIsLinkQuestionModalOpen(true);
  };

  // Filter computations
  const filteredStimuli = stimuli.filter(stim => {
    // Search Term match
    const matchesSearch = 
      stim.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stim.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stim.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stim.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));

    // Sidebar Category Tab filter
    const matchesTab = 
      activeTab === 'ALL' || 
      stim.status === activeTab;

    // Advanced drop-down filters
    const matchesSubject = !subjectFilter || stim.subject === subjectFilter;
    const matchesType = !typeFilter || stim.type === typeFilter;
    const matchesDifficulty = !difficultyFilter || stim.difficulty === difficultyFilter;
    const matchesStatus = !statusFilter || stim.status === statusFilter;
    const matchesTag = !selectedTag || stim.tags.includes(selectedTag);

    return matchesSearch && matchesTab && matchesSubject && matchesType && matchesDifficulty && matchesStatus && matchesTag;
  });

  // Extract all unique tags for filter option
  const allUniqueTags = Array.from(new Set(stimuli.flatMap(s => s.tags)));

  // Count helper
  const getTabCount = (status: 'ALL' | StimulusStatus) => {
    if (status === 'ALL') return stimuli.length;
    return stimuli.filter(s => s.status === status).length;
  };

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* Top Banner/Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-philsa-border shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-5 h-5 text-philsa-red" />
            <p className="text-[10px] font-black text-philsa-gray uppercase tracking-widest">Assessment & Item Bank Management</p>
          </div>
          <h1 className="text-2xl font-extrabold text-philsa-navy tracking-tight">Shared Stimulus Management</h1>
          <p className="text-xs text-philsa-gray mt-1 max-w-2xl leading-normal">
            Create, version-control, and link reusable academic content blocks (passages, diagrams, equations) to multiple assessment child questions without duplication.
          </p>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={() => setIsLogsModalOpen(true)}
            className="btn-secondary flex items-center gap-2"
          >
            <History className="w-4 h-4 text-philsa-gray" /> Audit Log
          </button>
          
          <button 
            onClick={() => { resetForm(); setIsCreateModalOpen(true); }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Stimulus
          </button>
        </div>
      </div>

      {/* Statistics Mini Panels */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-philsa-border flex items-center gap-4">
          <div className="p-3 rounded-lg bg-red-50 text-philsa-red">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-philsa-gray tracking-wider">Total Stimuli</p>
            <p className="text-xl font-extrabold text-philsa-navy">{stimuli.length}</p>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-philsa-border flex items-center gap-4">
          <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-philsa-gray tracking-wider">Published</p>
            <p className="text-xl font-extrabold text-philsa-navy">{getTabCount('PUBLISHED')}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-philsa-border flex items-center gap-4">
          <div className="p-3 rounded-lg bg-amber-50 text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-philsa-gray tracking-wider">In Review</p>
            <p className="text-xl font-extrabold text-philsa-navy">{getTabCount('IN_REVIEW')}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-philsa-border flex items-center gap-4">
          <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600">
            <LinkIcon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-philsa-gray tracking-wider">Total Linkages</p>
            <p className="text-xl font-extrabold text-philsa-navy">
              {questions.filter(q => q.stimulusId).length} Questions
            </p>
          </div>
        </div>
      </div>

      {/* Main Panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Filters and Stimuli List */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-philsa-border shadow-xs p-6 space-y-4">
          {/* Tabs */}
          <div className="flex border-b border-philsa-border overflow-x-auto gap-2">
            {(['ALL', 'DRAFT', 'IN_REVIEW', 'PUBLISHED', 'RETIRED', 'ARCHIVED'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "py-2 px-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all shrink-0 whitespace-nowrap",
                  activeTab === tab
                    ? "border-philsa-red text-philsa-red font-extrabold"
                    : "border-transparent text-philsa-gray hover:text-philsa-navy hover:border-philsa-gray/20"
                )}
              >
                {tab === 'IN_REVIEW' ? 'In Review' : tab} 
                <span className="ml-1.5 px-1.5 py-0.5 bg-slate-100 text-philsa-navy rounded-full text-[10px]">
                  {getTabCount(tab === 'ALL' ? 'ALL' : tab as StimulusStatus)}
                </span>
              </button>
            ))}
          </div>

          {/* Search bar & Advanced button */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3.5 w-4 h-4 text-philsa-gray/40" />
              <input 
                type="text" 
                placeholder="Search by ID, title, text, tags..."
                className="input-philsa pl-9 pr-4 py-2.5"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "btn-secondary flex items-center gap-2",
                showFilters && "bg-slate-50 border-philsa-gray/40"
              )}
            >
              <Filter className="w-4 h-4" /> {showFilters ? 'Hide' : 'Filter'}
            </button>
          </div>

          {/* Advanced filters dropdown */}
          <AnimatePresence>
            {showFilters && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-50 border border-philsa-border rounded-xl">
                  <div>
                    <label className="label-philsa mb-1">Subject</label>
                    <select 
                      className="input-philsa py-2 text-xs"
                      value={subjectFilter}
                      onChange={e => setSubjectFilter(e.target.value)}
                    >
                      <option value="">All Subjects</option>
                      <option value="Science">Science</option>
                      <option value="Mathematics">Mathematics</option>
                      <option value="Social Science">Social Science</option>
                      <option value="English">English</option>
                    </select>
                  </div>

                  <div>
                    <label className="label-philsa mb-1">Stimulus Type</label>
                    <select 
                      className="input-philsa py-2 text-xs"
                      value={typeFilter}
                      onChange={e => setTypeFilter(e.target.value)}
                    >
                      <option value="">All Types</option>
                      {Object.keys(STIMULUS_TYPE_LABELS).map(t => (
                        <option key={t} value={t}>{STIMULUS_TYPE_LABELS[t as StimulusType].label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label-philsa mb-1">Difficulty</label>
                    <select 
                      className="input-philsa py-2 text-xs"
                      value={difficultyFilter}
                      onChange={e => setDifficultyFilter(e.target.value)}
                    >
                      <option value="">All Difficulties</option>
                      <option value="EASY">Easy</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HARD">Hard</option>
                    </select>
                  </div>

                  <div>
                    <label className="label-philsa mb-1">Specific Tag</label>
                    <select 
                      className="input-philsa py-2 text-xs"
                      value={selectedTag}
                      onChange={e => setSelectedTag(e.target.value)}
                    >
                      <option value="">All Tags</option>
                      {allUniqueTags.map(tg => (
                        <option key={tg} value={tg}>{tg}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2 sm:col-span-2 flex items-end justify-end pt-2">
                    <button
                      onClick={() => {
                        setSubjectFilter('');
                        setTypeFilter('');
                        setDifficultyFilter('');
                        setSelectedTag('');
                        setStatusFilter('');
                      }}
                      className="text-xs font-black uppercase text-philsa-red hover:underline tracking-widest"
                    >
                      Reset All Filters
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stimuli List Grid */}
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {filteredStimuli.length === 0 ? (
              <div className="p-12 text-center border-2 border-dashed border-slate-100 rounded-xl space-y-2">
                <AlertCircle className="w-8 h-8 text-philsa-gray/30 mx-auto" />
                <h4 className="text-sm font-bold text-philsa-navy">No shared stimuli found</h4>
                <p className="text-xs text-philsa-gray">Try adjusting your filters or search keywords.</p>
              </div>
            ) : (
              filteredStimuli.map(stim => {
                const typeConfig = STIMULUS_TYPE_LABELS[stim.type];
                const statusConfig = STATUS_CONFIGS[stim.status];
                const linkedCount = questions.filter(q => q.stimulusId === stim.id).length;
                const isSelected = selectedStimulus?.id === stim.id;

                return (
                  <div 
                    key={stim.id}
                    onClick={() => { setSelectedStimulus(stim); setIsPreviewMode(true); }}
                    className={cn(
                      "p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden group hover:shadow-xs",
                      isSelected 
                        ? "bg-slate-50/80 border-philsa-red ring-2 ring-philsa-red/5" 
                        : "bg-white border-philsa-border hover:border-philsa-gray/30"
                    )}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap gap-1.5 items-center">
                          <span className="text-[10px] font-mono font-black text-philsa-gray">{stim.id}</span>
                          <span className="text-slate-300">•</span>
                          <span className={cn("px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider", typeConfig.bg, typeConfig.text)}>
                            {typeConfig.label}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-[10px] font-black uppercase tracking-wider text-philsa-navy">{stim.subject}</span>
                          <span className="text-slate-300">•</span>
                          <span className={cn("px-1.5 py-0.5 rounded-full border text-[9px] font-bold", statusConfig.bg, statusConfig.text, statusConfig.border)}>
                            {statusConfig.label} (v{stim.version})
                          </span>
                        </div>

                        <h3 className="text-[14px] font-black text-philsa-navy leading-snug tracking-tight group-hover:text-philsa-red transition-colors">
                          {stim.title}
                        </h3>

                        <p className="text-xs text-philsa-gray line-clamp-2 leading-relaxed">
                          {stim.content.replace(/<[^>]*>/g, '')}
                        </p>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-2 text-[10px] font-bold text-philsa-gray/80">
                          <div className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5 opacity-50" />
                            <span>{stim.owner}</span>
                          </div>
                          <span>•</span>
                          <div className="flex items-center gap-1">
                            <LinkIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="text-emerald-700 font-extrabold">{linkedCount} linked items</span>
                          </div>
                          <span>•</span>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 opacity-50" />
                            <span>AY {stim.academicYear}</span>
                          </div>
                        </div>
                      </div>

                      {/* Dropdown / quick action bar */}
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className={cn(
                          "px-1.5 py-0.5 rounded text-[9px] font-black border uppercase tracking-wider",
                          stim.difficulty === 'EASY' ? 'bg-green-50 text-green-700 border-green-200' :
                          stim.difficulty === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-red-50 text-red-700 border-red-200'
                        )}>
                          {stim.difficulty}
                        </span>
                        
                        <div className="flex gap-1 pt-4 opacity-70 group-hover:opacity-100 transition-opacity">
                          <button 
                            title="Preview Stimulus"
                            className="p-1 hover:bg-slate-100 rounded text-philsa-navy"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStimulus(stim);
                              setIsPreviewMode(true);
                            }}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            title="Edit"
                            className="p-1 hover:bg-slate-100 rounded text-blue-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(stim);
                            }}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            title="Delete"
                            className="p-1 hover:bg-red-50 rounded text-philsa-red"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteStimulus(stim.id);
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Preview Panel & Linked Questions */}
        <div className="lg:col-span-5 space-y-6">
          {selectedStimulus ? (
            <div className="bg-white rounded-2xl border border-philsa-border shadow-xs p-6 space-y-6 flex flex-col h-full">
              {/* Preview Header */}
              <div className="flex justify-between items-start border-b border-philsa-border pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 rounded font-black text-philsa-navy">{selectedStimulus.id}</span>
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider",
                      STIMULUS_TYPE_LABELS[selectedStimulus.type].bg,
                      STIMULUS_TYPE_LABELS[selectedStimulus.type].text
                    )}>
                      {STIMULUS_TYPE_LABELS[selectedStimulus.type].label}
                    </span>
                  </div>
                  <h2 className="text-lg font-extrabold text-philsa-navy tracking-tight">{selectedStimulus.title}</h2>
                  <p className="text-[10px] font-black uppercase text-philsa-gray/70 tracking-widest pt-1">
                    Version {selectedStimulus.version} • Created {new Date(selectedStimulus.createdAt).toLocaleDateString()}
                  </p>
                </div>
                
                <button 
                  onClick={() => {
                    setIsHistoryModalOpen(true);
                  }}
                  className="p-2 hover:bg-slate-100 rounded-lg text-philsa-navy flex items-center gap-1 text-xs font-black uppercase tracking-wider"
                  title="View Version History"
                >
                  <History className="w-4 h-4 text-philsa-red" />
                  <span>v{selectedStimulus.version}</span>
                </button>
              </div>

              {/* Status Action Workflow strip */}
              <div className="p-4 bg-slate-50 border border-philsa-border rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-philsa-gray tracking-widest">Workflow State</span>
                  <span className={cn(
                    "badge-status px-2.5 py-0.5",
                    selectedStimulus.status === 'PUBLISHED' ? 'badge-approved' :
                    selectedStimulus.status === 'DRAFT' ? 'badge-draft' :
                    selectedStimulus.status === 'IN_REVIEW' ? 'badge-pending' :
                    'badge-rejected'
                  )}>
                    {selectedStimulus.status}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {selectedStimulus.status === 'DRAFT' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedStimulus.id, 'IN_REVIEW', 'Submitting for expert review.')}
                      className="flex-1 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded text-[9px] uppercase tracking-wider transition-colors"
                    >
                      Submit for Review
                    </button>
                  )}
                  {selectedStimulus.status === 'IN_REVIEW' && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(selectedStimulus.id, 'APPROVED', 'Academics approved content structures.')}
                        className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[9px] uppercase tracking-wider transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(selectedStimulus.id, 'DRAFT', 'Sent back to writer for adjustments.')}
                        className="flex-1 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded text-[9px] uppercase tracking-wider transition-colors"
                      >
                        Reject/Revise
                      </button>
                    </>
                  )}
                  {(selectedStimulus.status === 'APPROVED' || selectedStimulus.status === 'DRAFT') && (
                    <button
                      onClick={() => handleUpdateStatus(selectedStimulus.id, 'PUBLISHED', 'Published to live active bank pool.')}
                      className="flex-1 py-1.5 bg-philsa-red hover:bg-philsa-red-hover text-white font-bold rounded text-[9px] uppercase tracking-wider transition-colors"
                    >
                      Publish
                    </button>
                  )}
                  {selectedStimulus.status === 'PUBLISHED' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedStimulus.id, 'RETIRED', 'Retired from rotation; records preserved.')}
                      className="flex-1 py-1.5 bg-slate-600 hover:bg-slate-700 text-white font-bold rounded text-[9px] uppercase tracking-wider transition-colors"
                    >
                      Retire Stimulus
                    </button>
                  )}
                  {selectedStimulus.status === 'RETIRED' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedStimulus.id, 'PUBLISHED', 'Re-published to active rotation.')}
                      className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-[9px] uppercase tracking-wider transition-colors"
                    >
                      Restore to Published
                    </button>
                  )}
                </div>
              </div>

              {/* Rich formatted preview area wrapped in styled Word document reader sheet */}
              <div className="flex-1 max-h-[400px] overflow-y-auto border border-slate-300 rounded-xl bg-slate-50 flex flex-col shadow-sm">
                <div className="bg-[#107c41] text-white px-3 py-1.5 flex justify-between items-center text-[10px] font-black uppercase tracking-wider rounded-t-xl select-none shrink-0">
                  <span className="flex items-center gap-1"><i>W</i> Word Document Viewer ({selectedStimulus.id}.docx)</span>
                  <span className="text-[8px] bg-[#0d6435] px-1.5 py-0.5 rounded text-emerald-100">READ-ONLY</span>
                </div>
                
                <div className="p-4 bg-slate-100 flex-1 overflow-auto">
                  <div className="bg-white shadow-md rounded-xs border border-slate-200 p-8 min-h-[300px] prose prose-sm max-w-none prose-slate text-xs leading-relaxed text-slate-800">
                    <div 
                      dangerouslySetInnerHTML={{ __html: selectedStimulus.content }} 
                      className="space-y-4 text-xs text-slate-800 leading-relaxed"
                    />
                  </div>
                </div>
              </div>

              {/* Attachments Section */}
              {selectedStimulus.attachments && selectedStimulus.attachments.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black uppercase text-philsa-gray tracking-wider">Attachments & Files ({selectedStimulus.attachments.length})</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedStimulus.attachments.map(att => (
                      <div key={att.id} className="p-2 border border-philsa-border rounded-lg bg-slate-50/50 flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1.5 truncate">
                          <Paperclip className="w-3.5 h-3.5 text-philsa-red shrink-0" />
                          <span className="font-semibold text-philsa-navy truncate" title={att.name}>{att.name}</span>
                          <span className="text-[9px] text-philsa-gray font-bold shrink-0">({att.size})</span>
                        </div>
                        <a href={att.url} className="text-blue-600 hover:text-blue-800 shrink-0">
                          <Download className="w-3 h-3" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata strip */}
              <div className="grid grid-cols-2 gap-3 p-4 border border-philsa-border rounded-xl bg-slate-50/20 text-[11px] font-bold">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-philsa-gray block">Curriculum Standards</span>
                  <span className="text-philsa-navy block mt-0.5">{selectedStimulus.curriculum}</span>
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-philsa-gray block">Academic Assessment Cycle</span>
                  <span className="text-philsa-navy block mt-0.5">AY {selectedStimulus.academicYear}</span>
                </div>
                <div className="col-span-2 border-t border-dashed border-philsa-border pt-2 mt-1">
                  <span className="text-[9px] font-black uppercase tracking-wider text-philsa-gray block mb-1">Tags</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedStimulus.tags.map(t => (
                      <span key={t} className="px-2 py-0.5 bg-slate-100 text-slate-800 text-[10px] rounded-md font-mono font-bold">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Linked child questions panel */}
              <div className="border-t border-philsa-border pt-6 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-extrabold text-philsa-navy">Linked Assessment Items</h3>
                    <p className="text-[10px] text-philsa-gray">Child questions using this shared stimulus</p>
                  </div>
                  
                  <div className="flex gap-1.5">
                    <button 
                      onClick={() => openLinkQuestionsModal(selectedStimulus)}
                      className="btn-secondary !py-1 px-3 flex items-center gap-1.5"
                    >
                      <LinkIcon className="w-3.5 h-3.5" /> Sync Links
                    </button>
                    
                    <button 
                      onClick={() => setIsCreateQuestionModalOpen(true)}
                      className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1"
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> New Question
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {questions.filter(q => q.stimulusId === selectedStimulus.id).length === 0 ? (
                    <div className="p-6 text-center border border-dashed border-slate-100 bg-slate-50/40 rounded-xl">
                      <p className="text-xs text-philsa-gray">No questions are currently linked to this stimulus.</p>
                      <p className="text-[10px] text-philsa-gray/60 mt-1">Link existing questions or create a new child question above.</p>
                    </div>
                  ) : (
                    questions.filter(q => q.stimulusId === selectedStimulus.id).map((q, idx) => (
                      <div key={q.id} className="p-3.5 border border-philsa-border rounded-xl bg-white space-y-2 group relative">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-1.5">
                            <CornerDownRight className="w-3.5 h-3.5 text-philsa-red shrink-0" />
                            <span className="text-[10px] font-mono font-black bg-slate-50 text-philsa-navy px-1.5 py-0.5 rounded">
                              Item {idx + 1}: {q.id}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-black uppercase tracking-wider">
                              {q.type}
                            </span>
                          </div>
                          
                          <button
                            onClick={() => unlinkSingleQuestion(q.id)}
                            className="p-1 text-philsa-gray hover:text-philsa-red hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100 absolute right-2 top-2"
                            title="Unlink Question"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <p className="text-xs font-semibold text-philsa-navy pl-5 leading-relaxed">
                          {q.text}
                        </p>

                        {q.options && q.options.length > 0 && (
                          <div className="grid grid-cols-2 gap-1.5 pl-5 pt-1">
                            {q.options.map((opt, oIdx) => (
                              <div 
                                key={oIdx} 
                                className={cn(
                                  "p-1.5 border rounded text-[10px] truncate",
                                  opt === q.correctAnswer 
                                    ? "bg-green-50/50 border-green-200 text-green-800 font-extrabold" 
                                    : "border-slate-100 bg-slate-50 text-philsa-gray"
                                )}
                              >
                                {String.fromCharCode(65 + oIdx)}. {opt}
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div className="flex justify-between items-center pl-5 pt-2 text-[9px] font-black uppercase text-philsa-gray tracking-wider">
                          <span>Value: {q.score} Points</span>
                          <span className={cn(
                            q.status === 'PUBLISHED' ? 'text-blue-600' : 'text-amber-600'
                          )}>
                            Status: {q.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-philsa-border shadow-xs p-12 text-center flex flex-col items-center justify-center h-full min-h-[400px] space-y-4">
              <div className="w-16 h-16 rounded-full bg-slate-50 text-philsa-gray/40 flex items-center justify-center">
                <Layers className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-extrabold text-philsa-navy">No Stimulus Selected</h3>
                <p className="text-xs text-philsa-gray max-w-xs mx-auto">
                  Select a Shared Stimulus from the list to preview details, workflow actions, version history, and linked child questions.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Audit Trail logs */}
      {isLogsModalOpen && (
        <div className="fixed inset-0 bg-philsa-navy/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-philsa-border shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-philsa-border flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-lg font-extrabold text-philsa-navy">Shared Stimulus Audit Trail</h3>
                <p className="text-xs text-philsa-gray">Complete logs for creation, modifications, approvals, linkages, and status dispatches.</p>
              </div>
              <button onClick={() => setIsLogsModalOpen(false)} className="p-1.5 hover:bg-slate-200 rounded-full text-philsa-gray">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="border border-philsa-border rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-black uppercase text-philsa-gray tracking-wider border-b border-philsa-border">
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">Stimulus ID</th>
                      <th className="p-3">Action</th>
                      <th className="p-3">Actor / Role</th>
                      <th className="p-3">Log Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-medium whitespace-nowrap text-philsa-gray">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="p-3 font-mono font-black text-philsa-navy">
                          {log.stimulusId}
                        </td>
                        <td className="p-3">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider",
                            log.action === 'CREATE' ? 'bg-green-50 text-green-700' :
                            log.action === 'PUBLISH' ? 'bg-blue-50 text-blue-700' :
                            log.action === 'MODIFY' ? 'bg-amber-50 text-amber-700' :
                            log.action === 'DELETE' ? 'bg-red-50 text-red-700' :
                            'bg-slate-100 text-slate-800'
                          )}>
                            {log.action}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-philsa-navy">{log.userName}</div>
                          <div className="text-[9px] font-bold text-philsa-gray uppercase tracking-wider">{log.userRole}</div>
                        </td>
                        <td className="p-3 font-medium text-slate-600 leading-relaxed max-w-sm">
                          {log.details}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Version History */}
      {isHistoryModalOpen && selectedStimulus && (
        <div className="fixed inset-0 bg-philsa-navy/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-philsa-border shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-philsa-border flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-lg font-extrabold text-philsa-navy">Version History: {selectedStimulus.id}</h3>
                <p className="text-xs text-philsa-gray">Audit-compliant archive preserving previous stimulus states and changelogs.</p>
              </div>
              <button onClick={() => setIsHistoryModalOpen(false)} className="p-1.5 hover:bg-slate-200 rounded-full text-philsa-gray">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="relative border-l border-philsa-border pl-6 space-y-6 ml-3">
                {selectedStimulus.versions.map((ver, idx) => (
                  <div key={idx} className="relative">
                    <span className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-philsa-red border-2 border-white" />
                    
                    <div className="p-4 border border-philsa-border rounded-xl bg-slate-50/40 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="px-2 py-0.5 bg-philsa-red/10 text-philsa-red font-black rounded text-[9px] uppercase tracking-wider">
                            Version {ver.version}
                          </span>
                          <h4 className="text-xs font-black text-philsa-navy mt-1.5">{ver.title}</h4>
                        </div>
                        <span className="text-[10px] text-philsa-gray font-bold">
                          {new Date(ver.updatedAt).toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="p-3 bg-white border border-philsa-border rounded-lg text-xs">
                        <p className="text-[9px] text-philsa-red uppercase font-black tracking-widest mb-1">Changelog Notes</p>
                        <p className="font-semibold text-slate-700 italic">"{ver.changeLog || 'No remarks specified'}"</p>
                      </div>

                      <div className="p-3 border border-dashed border-philsa-border rounded-lg max-h-36 overflow-y-auto bg-philsa-bg">
                        <p className="text-[9px] text-philsa-gray uppercase font-black tracking-widest mb-1.5">Archived Content Snippet</p>
                        <div 
                          dangerouslySetInnerHTML={{ __html: ver.content }} 
                          className="text-[11px] text-philsa-gray leading-normal space-y-1.5"
                        />
                      </div>

                      <div className="flex justify-between items-center text-[10px] font-bold text-philsa-gray">
                        <span>Editor: {ver.updatedBy}</span>
                        <span className="uppercase text-philsa-navy font-black">Status: {ver.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Link existing questions */}
      {isLinkQuestionModalOpen && selectedStimulus && (
        <div className="fixed inset-0 bg-philsa-navy/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-philsa-border shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-philsa-border flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-lg font-extrabold text-philsa-navy">Sync Linked Questions</h3>
                <p className="text-xs text-philsa-gray">Associate existing assessment questions from the Question Bank with this shared stimulus.</p>
              </div>
              <button onClick={() => setIsLinkQuestionModalOpen(false)} className="p-1.5 hover:bg-slate-200 rounded-full text-philsa-gray">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-900 leading-normal font-medium">
                  <strong>Notice:</strong> Only questions with the matching subject (<strong>{selectedStimulus.subject}</strong>) are shown here to preserve curriculum matching.
                </div>
              </div>

              <div className="space-y-2">
                {questions.filter(q => q.subject === selectedStimulus.subject).length === 0 ? (
                  <p className="text-xs text-philsa-gray text-center p-6">No matching questions exist in the Question Bank.</p>
                ) : (
                  questions.filter(q => q.subject === selectedStimulus.subject).map(q => {
                    const isLinked = questionsToLink.includes(q.id);
                    const linkedToOther = q.stimulusId && q.stimulusId !== selectedStimulus.id;

                    return (
                      <div 
                        key={q.id}
                        onClick={() => {
                          if (linkedToOther) return;
                          if (isLinked) {
                            setQuestionsToLink(questionsToLink.filter(id => id !== q.id));
                          } else {
                            setQuestionsToLink([...questionsToLink, q.id]);
                          }
                        }}
                        className={cn(
                          "p-3 border rounded-xl flex items-center justify-between transition-colors",
                          isLinked ? "border-emerald-500 bg-emerald-50/20" : "border-philsa-border hover:bg-slate-50",
                          linkedToOther ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
                        )}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold">
                            <span className="font-mono bg-slate-100 text-philsa-navy px-1.5 py-0.5 rounded font-black">{q.id}</span>
                            <span className="text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded uppercase font-black">{q.type}</span>
                            {q.stimulusId && (
                              <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-black">
                                {q.stimulusId === selectedStimulus.id ? 'Currently Linked Here' : `Linked to other (${q.stimulusId})`}
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-philsa-navy leading-snug">{q.text}</p>
                          <p className="text-[10px] text-philsa-gray">Topic: {q.topic} • Score: {q.score} Points</p>
                        </div>

                        {!linkedToOther && (
                          <div className={cn(
                            "w-5 h-5 rounded-md border flex items-center justify-center shrink-0",
                            isLinked ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300 bg-white"
                          )}>
                            {isLinked && <Check className="w-3.5 h-3.5" />}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="p-6 border-t border-philsa-border bg-slate-50 flex justify-end gap-2 shrink-0">
              <button onClick={() => setIsLinkQuestionModalOpen(false)} className="btn-secondary">
                Cancel
              </button>
              <button onClick={handleLinkQuestionsSubmit} className="btn-primary">
                Save Linkages
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: New Child Question Form */}
      {isCreateQuestionModalOpen && selectedStimulus && (
        <div className="fixed inset-0 bg-philsa-navy/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-philsa-border shadow-2xl w-full max-w-xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-philsa-border flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-lg font-extrabold text-philsa-navy">Create & Link Child Question</h3>
                <p className="text-xs text-philsa-gray">Adds a new question directly linked to stimulus <strong>{selectedStimulus.id}</strong>.</p>
              </div>
              <button onClick={() => setIsCreateQuestionModalOpen(false)} className="p-1.5 hover:bg-slate-200 rounded-full text-philsa-gray">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateChildQuestion} className="overflow-y-auto flex-1 p-6 space-y-4">
              <div>
                <label className="label-philsa mb-1 block">Question Text</label>
                <textarea 
                  required
                  rows={3}
                  className="input-philsa"
                  placeholder="Enter the question query referencing the stimulus..."
                  value={qText}
                  onChange={e => setQText(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-philsa mb-1 block">Item Type</label>
                  <select 
                    className="input-philsa text-xs py-2"
                    value={qType}
                    onChange={e => setQType(e.target.value as any)}
                  >
                    <option value="MCQ">Multiple Choice</option>
                    <option value="TF">True / False</option>
                    <option value="FIB">Fill in the Blanks</option>
                    <option value="ESSAY">Essay / Free Text</option>
                  </select>
                </div>

                <div>
                  <label className="label-philsa mb-1 block">Points / Score Weight</label>
                  <input 
                    type="number" 
                    min={1}
                    max={50}
                    className="input-philsa text-xs"
                    value={qPoints}
                    onChange={e => setQPoints(parseInt(e.target.value) || 5)}
                  />
                </div>
              </div>

              {qType === 'MCQ' && (
                <div className="space-y-2">
                  <label className="label-philsa block">Multiple Choice Options</label>
                  {qOptions.map((opt, oIdx) => (
                    <div key={oIdx} className="flex gap-2 items-center">
                      <span className="font-bold text-xs text-philsa-gray">{String.fromCharCode(65 + oIdx)}.</span>
                      <input 
                        type="text" 
                        required
                        className="input-philsa text-xs py-2"
                        placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                        value={opt}
                        onChange={e => {
                          const updated = [...qOptions];
                          updated[oIdx] = e.target.value;
                          setQOptions(updated);
                        }}
                      />
                      <input 
                        type="radio" 
                        name="correct-mcq"
                        checked={qCorrect === opt && opt !== ''}
                        onChange={() => setQCorrect(opt)}
                        className="w-4 h-4 text-philsa-red accent-philsa-red"
                        title="Set as correct option"
                      />
                    </div>
                  ))}
                  <p className="text-[10px] text-philsa-gray">Click the radio button to the right of the correct choice.</p>
                </div>
              )}

              {qType === 'TF' && (
                <div>
                  <label className="label-philsa mb-1 block">Correct Response</label>
                  <div className="flex gap-4">
                    {['True', 'False'].map(opt => (
                      <label key={opt} className="flex items-center gap-2 text-xs font-bold text-philsa-navy cursor-pointer">
                        <input 
                          type="radio" 
                          name="correct-tf"
                          checked={qCorrect === opt}
                          onChange={() => setQCorrect(opt)}
                          className="w-4 h-4 text-philsa-red accent-philsa-red"
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {qType !== 'MCQ' && qType !== 'TF' && (
                <div>
                  <label className="label-philsa mb-1 block">Ideal Response / Answer Guideline</label>
                  <textarea 
                    rows={2}
                    className="input-philsa text-xs"
                    placeholder="Enter keywords or answer guidelines..."
                    value={qCorrect}
                    onChange={e => setQCorrect(e.target.value)}
                  />
                </div>
              )}
              
              <div className="p-6 border-t border-philsa-border bg-slate-50 flex justify-end gap-2 -mx-6 -mb-6">
                <button type="button" onClick={() => setIsCreateQuestionModalOpen(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary bg-emerald-600 hover:bg-emerald-700">
                  Save & Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Create shared stimulus */}
      {(isCreateModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-philsa-navy/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-philsa-border shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col my-8">
            <div className="p-6 border-b border-philsa-border flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-lg font-extrabold text-philsa-navy">
                  {isCreateModalOpen ? 'Create New Shared Stimulus' : `Edit Shared Stimulus: ${selectedStimulus?.id}`}
                </h3>
                <p className="text-xs text-philsa-gray">
                  {isCreateModalOpen 
                    ? 'Define a reusable academic content block that can be tied to one or many assessment items.' 
                    : 'Modifying a published stimulus will automatically elevate the version number and create an audit log.'}
                </p>
              </div>
              <button 
                onClick={() => { isCreateModalOpen ? setIsCreateModalOpen(false) : setIsEditModalOpen(false); resetForm(); }} 
                className="p-1.5 hover:bg-slate-200 rounded-full text-philsa-gray"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={isCreateModalOpen ? handleCreateStimulus : handleEditStimulus} className="overflow-y-auto flex-1 p-6 space-y-5">
              {isEditModalOpen && selectedStimulus?.status === 'PUBLISHED' && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3 text-amber-900 text-xs font-semibold leading-relaxed">
                  <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <strong>Standardization Protocol Warning:</strong> This stimulus is currently <strong>PUBLISHED</strong>. 
                    Edits will be stored under a new version (Version {selectedStimulus.version + 1}) to preserve academic logs and historical scores of finished examinees.
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-8">
                  <label className="label-philsa mb-1 block">Stimulus Title</label>
                  <input 
                    type="text" 
                    required
                    className="input-philsa"
                    placeholder="e.g., Agricultural Drought Mapping in Cagayan Valley"
                    value={formTitle}
                    onChange={e => setFormTitle(e.target.value)}
                  />
                </div>

                <div className="md:col-span-4">
                  <label className="label-philsa mb-1 block">Stimulus Type</label>
                  <select 
                    className="input-philsa text-xs py-3"
                    value={formType}
                    onChange={e => setFormType(e.target.value as StimulusType)}
                  >
                    {Object.keys(STIMULUS_TYPE_LABELS).map(t => (
                      <option key={t} value={t}>{STIMULUS_TYPE_LABELS[t as StimulusType].label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Microsoft Word Style Ribbon Editor Container */}
              <div className="space-y-2">
                <label className="label-philsa block">Stimulus Body Content (Microsoft Word Ribbon Layout)</label>
                <WordRibbonEditor 
                  key={isEditModalOpen ? `edit-${selectedStimulus?.id || 'new'}` : 'create-new'}
                  initialValue={formContent}
                  onChange={setFormContent}
                  title={formTitle || 'Stimulus_Document'}
                />
              </div>

              {/* Advanced Classification Metadata */}
              <div className="p-4 border border-philsa-border rounded-xl bg-slate-50/50 space-y-4">
                <p className="text-[10px] font-black uppercase text-philsa-gray tracking-wider">Categorization & Curriculum Metadata</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="label-philsa mb-1 block">Core Subject</label>
                    <select 
                      className="input-philsa text-xs py-2"
                      value={formSubject}
                      onChange={e => setFormSubject(e.target.value)}
                    >
                      <option value="Science">Science</option>
                      <option value="Mathematics">Mathematics</option>
                      <option value="Social Science">Social Science</option>
                      <option value="English">English</option>
                    </select>
                  </div>

                  <div>
                    <label className="label-philsa mb-1 block">Topic / Field</label>
                    <input 
                      type="text" 
                      className="input-philsa text-xs py-2"
                      placeholder="e.g. Remote Sensing, Algebra"
                      value={formTopic}
                      onChange={e => setFormTopic(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="label-philsa mb-1 block">Difficulty Level</label>
                    <select 
                      className="input-philsa text-xs py-2"
                      value={formDifficulty}
                      onChange={e => setFormDifficulty(e.target.value as any)}
                    >
                      <option value="EASY">Easy</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HARD">Hard</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label-philsa mb-1 block">Curriculum Alignment</label>
                    <input 
                      type="text" 
                      className="input-philsa text-xs py-2"
                      value={formCurriculum}
                      onChange={e => setFormCurriculum(e.target.value)}
                      placeholder="e.g., Specialized Space Tech Curriculum"
                    />
                  </div>

                  <div>
                    <label className="label-philsa mb-1 block">Academic Year Cycle</label>
                    <input 
                      type="text" 
                      className="input-philsa text-xs py-2"
                      value={formAcademicYear}
                      onChange={e => setFormAcademicYear(e.target.value)}
                      placeholder="e.g., 2026-2027"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="label-philsa mb-1 block">Tags (comma separated)</label>
                    <input 
                      type="text" 
                      className="input-philsa text-xs py-2"
                      value={formTags}
                      placeholder="e.g., satellite, telemetry, mechanics"
                      onChange={e => setFormTags(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Attachments & Files */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="label-philsa block">Image & Document Attachments ({formAttachments.length})</label>
                  <button 
                    type="button"
                    onClick={addMockAttachment}
                    className="text-xs text-philsa-red font-black uppercase tracking-wider hover:underline flex items-center gap-1"
                  >
                    <Paperclip className="w-3.5 h-3.5" /> Simulate Attachment
                  </button>
                </div>

                {formAttachments.length === 0 ? (
                  <p className="text-xs text-philsa-gray italic">No attachments added. Upload schematic diagrams or supplemental tables if needed.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {formAttachments.map(att => (
                      <div key={att.id} className="p-2 border border-philsa-border rounded-xl bg-slate-50 flex items-center justify-between text-xs">
                        <span className="font-semibold text-philsa-navy truncate max-w-[120px]">{att.name}</span>
                        <button 
                          type="button" 
                          onClick={() => removeAttachment(att.id)}
                          className="text-philsa-red hover:bg-red-100 p-1 rounded-full"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Changelog entry (MANDATORY for edits on published versions) */}
              {isEditModalOpen && (
                <div>
                  <label className="label-philsa mb-1 block">
                    Change Log / Revision Remarks <span className="text-philsa-red">*</span>
                  </label>
                  <input 
                    type="text" 
                    required
                    className="input-philsa"
                    placeholder="Provide details about what you updated (e.g. fixed typo in formula 3, expanded overview)"
                    value={formChangeLog}
                    onChange={e => setFormChangeLog(e.target.value)}
                  />
                </div>
              )}

              <div className="p-6 border-t border-philsa-border bg-slate-50 flex justify-end gap-2 -mx-6 -mb-6 shrink-0">
                <button 
                  type="button" 
                  onClick={() => { isCreateModalOpen ? setIsCreateModalOpen(false) : setIsEditModalOpen(false); resetForm(); }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {isCreateModalOpen ? 'Create Stimulus' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
