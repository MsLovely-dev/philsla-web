import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMockData } from '../../services/mockService';
import { 
  ArrowLeft, 
  FileText, 
  History, 
  Check, 
  X, 
  AlertCircle, 
  ChevronDown, 
  XCircle,
  Eye,
  CheckCircle,
  Download,
  BookOpen,
  User,
  Activity,
  ShieldCheck,
  MessageSquare,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Fingerprint,
  Camera,
  ShieldAlert,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePhilSA } from '../../PhilSAContext';
import SuccessModal from '../../components/SuccessModal';
import { cn } from '../../lib/utils';

// Mock data based on ReviewApplications.tsx
const MOCK_APP = {
  id: 'REG-2026-8421',
  firstName: 'MARCUS',
  lastName: 'VALERIUS',
  middleName: 'ANTONIUS',
  suffix: 'JR',
  dob: '2008-04-12',
  birthPlace: 'Quezon City, Metro Manila',
  nationality: 'Filipino',
  gender: 'MALE',
  email: 'm.valerius@cloud.edu.ph',
  mobile: '+63 917 842 1002',
  nationalId: '1004-9842-4128',
  fatherName: 'AURELIUS VALERIUS',
  fatherOccupation: 'PhilSA Engineer',
  fatherMobile: '+63 917 121 2111',
  fatherMonthlyIncome: '₱85,000',
  motherName: 'SERENA ANTONIA-VALERIUS',
  motherOccupation: 'Public School Teacher',
  motherMobile: '+63 918 242 4323',
  motherMonthlyIncome: '₱45,000',
  guardianName: 'AURELIUS VALERIUS',
  guardianOccupation: 'PhilSA Engineer',
  guardianMobile: '+63 917 121 2111',
  siblingsCount: 2,
  region: 'National Capital Region (NCR)',
  province: 'Metro Manila',
  city: 'Quezon City',
  barangay: 'Diliman',
  street: '12 Laurel Street, Area 1',
  zipCode: '1101',
  currentRegion: 'National Capital Region (NCR)',
  currentProvince: 'Metro Manila',
  currentCity: 'Quezon City',
  currentBarangay: 'Diliman',
  currentStreet: '12 Laurel Street, Area 1',
  currentZipCode: '1101',
  lrn: '101234567890',
  schoolName: 'Philippine Science High School - Main',
  schoolAddress: 'Agham Road, Diliman, Quezon City',
  academicTrack: 'STEM',
  gradeLevel: 'Grade 12',
  gwa: '96.5',
  universities: ['University of the Philippines Diliman', 'De La Salle University'],
  courses: ['BS Computer Science', 'BS Mechanical Engineering'],
  examScheduleId: 'NCR-APP26-AM',
  center: 'National Capital Region Hub - Quezon City',
  risk: 'LOW',
  status: 'PENDING',
  photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
  history: [
    { date: '2026-05-01 14:32', status: 'SUBMITTED', actor: 'Marcus Valerius (Applicant)', notes: 'Initial registration payload received.' },
    { date: '2026-05-02 09:15', status: 'VERIFIED', actor: 'System Core Audit', notes: 'PhilID confirmed against registry.' }
  ],
  duplicateScore: 12,
  duplicateStatus: 'NO_RECORDS_FOUND'
};

const STATUS_BADGES = {
  'PENDING': 'bg-amber-100 text-amber-700 border-amber-200',
  'ASSIGNED': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'REJECTED': 'bg-philsa-red/10 text-philsa-red border-philsa-red/20',
};

// School schedules database mapping each testing center to its schedules
const SCHOOL_SCHEDULES: Record<string, Array<{ id: string, time: string, proctor: string, totalSeats: number, initialSeatsLeft: number }>> = {
  'University of the Philippines Diliman': [
    { id: 'up-1', time: 'July 20 8:00 AM', proctor: 'Juan Dela Cruz', totalSeats: 30, initialSeatsLeft: 18 },
    { id: 'up-2', time: 'July 20 1:00 PM', proctor: 'Maria Santos', totalSeats: 30, initialSeatsLeft: 5 },
    { id: 'up-3', time: 'July 21 8:00 AM', proctor: 'Pedro Reyes', totalSeats: 30, initialSeatsLeft: 26 },
  ],
  'De La Salle University - Manila': [
    { id: 'dlsu-1', time: 'July 22 8:00 AM', proctor: 'Robert Gomez', totalSeats: 30, initialSeatsLeft: 12 },
    { id: 'dlsu-2', time: 'July 22 1:00 PM', proctor: 'Alicia Torres', totalSeats: 30, initialSeatsLeft: 8 },
    { id: 'dlsu-3', time: 'July 23 8:00 AM', proctor: 'Fernando Diaz', totalSeats: 30, initialSeatsLeft: 20 },
  ],
  'PUP Main Campus': [
    { id: 'pup-1', time: 'July 24 8:00 AM', proctor: 'Jaime Sin', totalSeats: 30, initialSeatsLeft: 15 },
    { id: 'pup-2', time: 'July 24 1:00 PM', proctor: 'Corazon Cojuangco', totalSeats: 30, initialSeatsLeft: 7 },
    { id: 'pup-3', time: 'July 25 8:00 AM', proctor: 'Fidel Ramos', totalSeats: 30, initialSeatsLeft: 22 },
  ],
  'University of Santo Tomas': [
    { id: 'ust-1', time: 'July 26 8:00 AM', proctor: 'Benigno Aquino', totalSeats: 30, initialSeatsLeft: 14 },
    { id: 'ust-2', time: 'July 26 1:00 PM', proctor: 'Gloria Arroyo', totalSeats: 30, initialSeatsLeft: 3 },
    { id: 'ust-3', time: 'July 27 8:00 AM', proctor: 'Joseph Estrada', totalSeats: 30, initialSeatsLeft: 25 },
  ],
};

export default function ReviewerApplicationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, addAuditLog } = usePhilSA();
  const { studentDevices } = useMockData();

  // Dynamic testing center school and schedule selection states
  const [selectedSchool, setSelectedSchool] = useState<string>('University of the Philippines Diliman');
  const [tempSelectedSchool, setTempSelectedSchool] = useState<string>('University of the Philippines Diliman');
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('');

  // Load and store seat assignment reactively for each specific school + schedule combination
  const seatStorageKey = `philsa_applicant_seat_${id}_${selectedSchool.replace(/\s+/g, '_')}_${selectedScheduleId}`;
  const [assignedSeat, setAssignedSeat] = useState<string>('');

  React.useEffect(() => {
    if (!selectedScheduleId) {
      setAssignedSeat('');
      return;
    }
    const saved = localStorage.getItem(seatStorageKey);
    setAssignedSeat(saved || '');
  }, [seatStorageKey, selectedScheduleId]);

  const [activeTab, setActiveTab] = useState<'DETAILS' | 'DOCUMENTS'>('DETAILS');
  const [status, setStatus] = useState<string>(MOCK_APP.status);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [isReassigning, setIsReassigning] = useState(false);
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [correctionReason, setCorrectionReason] = useState('');
  const [remarks, setRemarks] = useState('');

  // Failed biometric/identity verification logs
  const [verificationLogs, setVerificationLogs] = useState<Array<{
    id: string;
    type: 'LRN_VERIFICATION' | 'FACIAL_RECOGNITION' | 'SELFIE_VERIFICATION';
    status: 'FAILED';
    timestamp: string;
    code: string;
    details: string;
    ip: string;
    device: string;
    attemptsLeft: number;
  }>>(() => {
    const saved = localStorage.getItem(`philsa_failed_verification_logs_${id || MOCK_APP.id}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [
      {
        id: 'LOG-V1',
        type: 'LRN_VERIFICATION',
        status: 'FAILED',
        timestamp: '2026-05-01 10:14 AM',
        code: 'DEPED_NAME_MISMATCH',
        details: "LRN '901234567899' verification request rejected by DepEd registry API. Reason: Middle name mismatch. Expected: 'ANTONIUS', Received: 'ANTONIA'.",
        ip: '192.168.1.102',
        device: 'MacBook Air - Chrome v124',
        attemptsLeft: 4
      },
      {
        id: 'LOG-V2',
        type: 'LRN_VERIFICATION',
        status: 'FAILED',
        timestamp: '2026-05-01 10:20 AM',
        code: 'DEPED_RECORD_NOT_FOUND',
        details: "LRN '123456789012' verification request rejected. Reason: Database response 404 - Record Not Found. LRN is unassigned or inactive in DepEd Learner Information System.",
        ip: '192.168.1.102',
        device: 'MacBook Air - Chrome v124',
        attemptsLeft: 3
      },
      {
        id: 'LOG-V3',
        type: 'FACIAL_RECOGNITION',
        status: 'FAILED',
        timestamp: '2026-05-01 11:05 AM',
        code: 'BIOMETRIC_LOW_LIGHT',
        details: "Automated biometric multi-angle mapping failed. Low-light condition detected (Confidence score: 24%). Biometric landmarks did not align with LRN photo record.",
        ip: '192.168.1.102',
        device: 'FaceCam Ultra HD, SafeExamBrowser Hub',
        attemptsLeft: 4
      },
      {
        id: 'LOG-V4',
        type: 'FACIAL_RECOGNITION',
        status: 'FAILED',
        timestamp: '2026-05-01 11:08 AM',
        code: 'BIOMETRIC_LOW_CONFIDENCE',
        details: "Biometric validation match rejected (Confidence score: 41%). Match threshold requires >= 85%. Possible occlusion detected (Glasses/Cap).",
        ip: '192.168.1.102',
        device: 'FaceCam Ultra HD, SafeExamBrowser Hub',
        attemptsLeft: 3
      },
      {
        id: 'LOG-V5',
        type: 'SELFIE_VERIFICATION',
        status: 'FAILED',
        timestamp: '2026-05-01 11:32 AM',
        code: 'SELFIE_UNRECOGNIZED',
        details: "Manual Selfie verification match rejected by system logic. Face detected does not correspond to student profile picture or registered DepEd metadata image.",
        ip: '192.168.1.102',
        device: 'Integrated Webcam, Chrome Mobile v124',
        attemptsLeft: 4
      },
      {
        id: 'LOG-V6',
        type: 'SELFIE_VERIFICATION',
        status: 'FAILED',
        timestamp: '2026-05-01 11:34 AM',
        code: 'SELFIE_QUALITY_REJECT',
        details: "Manual Selfie submission failed quality scan. High motion blur or camera shake detected. Unable to perform facial land-marking.",
        ip: '192.168.1.102',
        device: 'Integrated Webcam, Chrome Mobile v124',
        attemptsLeft: 3
      }
    ];
  });

  const [logSearch, setLogSearch] = useState('');
  const [logFilterType, setLogFilterType] = useState<'ALL' | 'LRN_VERIFICATION' | 'FACIAL_RECOGNITION' | 'SELFIE_VERIFICATION'>('ALL');

  const saveLogs = (newLogs: typeof verificationLogs) => {
    setVerificationLogs(newLogs);
    localStorage.setItem(`philsa_failed_verification_logs_${id || MOCK_APP.id}`, JSON.stringify(newLogs));
  };

  const simulateNewFailure = (type: 'LRN_VERIFICATION' | 'FACIAL_RECOGNITION' | 'SELFIE_VERIFICATION') => {
    const codes = {
      LRN_VERIFICATION: ['DEPED_TIMEOUT_ERR', 'DEPED_SERVICE_UNAVAILABLE', 'DEPED_AUTH_FAIL'],
      FACIAL_RECOGNITION: ['BIOMETRIC_SPOOFING_DETECTED', 'BIOMETRIC_MULTIPLE_FACES_DETECTED', 'BIOMETRIC_NO_FACE'],
      SELFIE_VERIFICATION: ['SELFIE_EXPIRED_SESSION', 'SELFIE_COOLDOWN_ACTIVE', 'SELFIE_TAMPER_DETECTED']
    };
    const details = {
      LRN_VERIFICATION: "Registry sync timed out after 15 seconds. DepEd learner gateway did not respond within safety limits.",
      FACIAL_RECOGNITION: "Anti-spoofing algorithm flagged attempt. Biometric liveness check failed (Static picture pattern detected).",
      SELFIE_VERIFICATION: "Manual Selfie registration cancelled by timeout. Secure biometric integrity check was not finalized."
    };
    const selectedCode = codes[type][Math.floor(Math.random() * codes[type].length)];
    const selectedDetails = details[type];
    const newLog = {
      id: `LOG-V${Date.now()}`,
      type,
      status: 'FAILED' as const,
      timestamp: new Date().toLocaleString(),
      code: selectedCode,
      details: selectedDetails,
      ip: '192.168.1.102',
      device: 'Web Client Diagnostic Engine',
      attemptsLeft: Math.max(1, Math.floor(Math.random() * 5))
    };
    const updated = [newLog, ...verificationLogs];
    saveLogs(updated);
    addAuditLog('SECURITY_LOG_SIMULATED', `Simulated new ${type} failure log: ${selectedCode}`);
  };
  const [successConfig, setSuccessConfig] = useState<{
    isOpen: boolean;
    type: 'ACCEPTED' | 'REJECTED' | 'FOR_CORRECTION';
    title: string;
    message: string;
    actionLabel?: string;
  }>({
    isOpen: false,
    type: 'ACCEPTED',
    title: '',
    message: ''
  });

  const filteredLogs = React.useMemo(() => {
    return verificationLogs.filter(log => {
      const matchesType = logFilterType === 'ALL' || log.type === logFilterType;
      const matchesSearch = logSearch === '' || 
        log.code.toLowerCase().includes(logSearch.toLowerCase()) ||
        log.details.toLowerCase().includes(logSearch.toLowerCase()) ||
        log.device.toLowerCase().includes(logSearch.toLowerCase()) ||
        log.ip.toLowerCase().includes(logSearch.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [verificationLogs, logFilterType, logSearch]);

  const currentSchedule = React.useMemo(() => {
    const schedules = SCHOOL_SCHEDULES[selectedSchool] || [];
    return schedules.find(s => s.id === selectedScheduleId) || null;
  }, [selectedSchool, selectedScheduleId]);

  const handleSchoolChange = (school: string) => {
    setSelectedSchool(school);
    setSelectedScheduleId('');
  };

  const handleAction = (action: string) => {
    if (action === 'REASSIGN') {
      setTempSelectedSchool(selectedSchool);
      setIsReassigning(true);
      return;
    }
    
    if (action === 'CORRECTION') {
      setIsCorrectionModalOpen(true);
      return;
    }

    const newStatus = action === 'APPROVE' ? 'ACCEPTED' : 'REJECTED';
    setStatus(newStatus);
    const statusLabel = action === 'APPROVE' ? 'Approved' : 'Rejected';

    if (action === 'APPROVE' && !assignedSeat) {
      const targetCenter = selectedSchool;
      const centerCode = targetCenter.split(' ').map(w => w[0]).join('').toUpperCase().replace(/[^A-Z]/g, '');
      const autoSeat = `Seat ${centerCode}-101`;
      localStorage.setItem(seatStorageKey, autoSeat);
      setAssignedSeat(autoSeat);
      addAuditLog('ADMISSION_SEAT_ASSIGNED', `Assigned student candidate ${MOCK_APP.firstName} ${MOCK_APP.lastName} to seat ${autoSeat} automatically upon approval`);
    }
    
    addAuditLog('REVIEWER_APPLICATION_REVIEW', JSON.stringify({
      reviewer: user?.name || user?.email,
      reviewerId: user?.id,
      applicationId: id,
      status: newStatus,
      statusLabel: statusLabel,
      remarks: remarks,
      timestamp: new Date().toISOString(),
      action: `Reviewer Account Application ${id} marked as ${statusLabel}`
    }));

    setSuccessConfig({
      isOpen: true,
      type: newStatus as any,
      title: `Application ${statusLabel}`,
      message: `The application for ${MOCK_APP.firstName} ${MOCK_APP.lastName} has been successfully updated to ${statusLabel.toUpperCase()} status and logged in the audit trail.`,
      actionLabel: "Okay"
    });
  };

  const submitCorrection = () => {
    setIsCorrectionModalOpen(false);
    setSuccessConfig({
      isOpen: true,
      type: 'FOR_CORRECTION',
      title: 'Sent for Correction',
      message: 'The student has been notified to revise their application based on your feedback.',
      actionLabel: 'Okay'
    });
    setCorrectionReason('');
  };

  const seatOptions = React.useMemo(() => {
    const dummyProctors = [
      'Dr. Emil Javier', 
      'Prof. Maria Elena Escueta', 
      'Engr. Reynaldo Velasco', 
      'Ms. Isabel G. Soriano'
    ];

    const finalSeats: any[] = [];
    const targetCenter = selectedSchool;
    const centerCode = targetCenter.split(' ').map(w => w[0]).join('').toUpperCase().replace(/[^A-Z]/g, '');

    const seatsLeft = currentSchedule?.initialSeatsLeft ?? 18;
    const occupiedCount = 30 - seatsLeft;

    // Generate deterministic occupied indices
    const occupiedIndices = new Set<number>();
    let scatter = 3;
    let count = 0;
    while (count < occupiedCount && count < 30) {
      const seatIndex = (scatter % 30) + 1;
      if (!occupiedIndices.has(seatIndex)) {
        const seatNum = `Seat ${centerCode}-${100 + seatIndex}`;
        if (assignedSeat !== seatNum) {
          occupiedIndices.add(seatIndex);
          count++;
        }
      }
      scatter += 7;
    }

    for (let i = 1; i <= 30; i++) {
      const seatNum = `Seat ${centerCode}-${100 + i}`;
      const isThisCandidate = assignedSeat === seatNum;
      const isOccupied = isThisCandidate || occupiedIndices.has(i);
      
      const firstNames = ['Manuel', 'Guillermo', 'Maria', 'Jose', 'Clara', 'Bernardo', 'Leticia', 'Rodolfo', 'Elena', 'Francisco', 'Arturo', 'Corazon'];
      const lastNames = ['Santos', 'Dela Cruz', 'Rizal', 'Romulo', 'Aquino', 'Garcia', 'Villa', 'Arcilla', 'Reyes', 'Pascual', 'Laurel', 'Salvador'];
      const mockName = `${firstNames[i % firstNames.length]} ${lastNames[(i * 3) % lastNames.length]}`;
      const occupantName = isThisCandidate 
        ? `${MOCK_APP.firstName} ${MOCK_APP.lastName}`
        : isOccupied ? mockName : '';

      const roomNum = Math.floor((i - 1) / 10) + 1; // 1-10 -> Room 1, 11-20 -> Room 2, 21-30 -> Room 3
      const roomName = `Lab Room ${roomNum}`;
      const proctorName = currentSchedule?.proctor || dummyProctors[(roomNum - 1) % dummyProctors.length];

      finalSeats.push({
        deviceId: `SDEV-MOCK-${centerCode}-${i}`,
        pcName: `${centerCode}-LAB${roomNum}-PC${i.toString().padStart(2, '0')}`,
        seatNumber: seatNum,
        isOccupied,
        occupantName,
        isThisCandidate,
        center: targetCenter,
        specs: i % 2 === 0 ? 'Intel Core i5-11400, 16GB RAM, Windows 11' : 'AMD Ryzen 5, 16GB RAM, Windows 10',
        ipAddress: `192.168.10.${100 + i}`,
        roomName,
        proctorName
      });
    }

    return finalSeats.sort((a, b) => a.seatNumber.localeCompare(b.seatNumber));
  }, [selectedSchool, selectedScheduleId, assignedSeat, currentSchedule]);

  const [seatSearch, setSeatSearch] = useState('');
  const filteredSeats = seatOptions.filter(seat => 
    seat.seatNumber.toLowerCase().includes(seatSearch.toLowerCase()) ||
    seat.pcName.toLowerCase().includes(seatSearch.toLowerCase()) ||
    seat.occupantName.toLowerCase().includes(seatSearch.toLowerCase()) ||
    seat.roomName.toLowerCase().includes(seatSearch.toLowerCase()) ||
    seat.proctorName.toLowerCase().includes(seatSearch.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Top Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-philsa-bg rounded-lg transition-colors border border-philsa-border shadow-sm text-philsa-red"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-philsa-navy tracking-tight uppercase">Student Applicant: {id || MOCK_APP.id}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Action buttons moved to bottom to prevent redundancy */}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Stats/Brief */}
        <div className="lg:col-span-1 space-y-6">
          <div className="card-philsa p-8 bg-white border-2 border-philsa-red/10">
            <div className="w-full aspect-square rounded-2xl overflow-hidden bg-philsa-bg border-4 border-white mb-6 shadow-xl relative group ring-1 ring-philsa-border">
               <img 
                 referrerPolicy="no-referrer" 
                 src={MOCK_APP.photoUrl} 
                 alt="Student" 
                 className="w-full h-full object-cover"
               />
               {/* Removed Bio-ID and Biometric tags as requested */}
            </div>
            <h2 className="text-xl font-black text-philsa-navy tracking-tight leading-tight">{MOCK_APP.firstName} {MOCK_APP.lastName}</h2>
            <p className="text-philsa-red text-[10px] font-black uppercase tracking-widest mt-1 mb-4 flex items-center gap-1.5">
               Digital Identity {id || MOCK_APP.id}
            </p>
            <div className={cn(
               "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black tracking-widest uppercase border shadow-sm",
               STATUS_BADGES[status as keyof typeof STATUS_BADGES] || 'bg-blue-50 text-blue-700'
            )}>
              {status.replace('_', ' ')}
            </div>

            <div className="pt-2 mt-4 space-y-4">
              {/* Risk Level and Biometrics section removed */}
            </div>
          </div>
        </div>

        {/* Right Details/Tabs */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex bg-philsa-bg p-1 rounded-2xl w-fit">
            {[
              { id: 'DETAILS', label: 'Student Bio', icon: User },
              { id: 'DOCUMENTS', label: 'Verification Files', icon: FileText },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold tracking-tight transition-all ${
                  activeTab === tab.id 
                    ? 'bg-white text-philsa-navy shadow-lg shadow-black/5 scale-105 z-10' 
                    : 'text-philsa-gray hover:text-philsa-navy'
                }`}
              >
                <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-philsa-red' : ''}`} />
                {tab.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'DETAILS' && (
              <motion.div 
                key="details"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="card-philsa p-10 bg-white border border-philsa-border relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-8 opacity-5">
                   <User className="w-32 h-32 text-philsa-navy" />
                </div>
                <div className="space-y-10 relative z-10 text-philsa-navy">
                  {/* SECTION 1: Personal Information */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-[#8A1538] uppercase tracking-wider pb-1.5 border-b border-[#8A1538]/20 flex items-center gap-2">
                      <User className="w-4 h-4 text-[#00563F]" /> Personal Information
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 bg-gray-50/50 p-6 rounded-xl border border-gray-100">
                      <DataRow label="First Name" value={MOCK_APP.firstName} />
                      <DataRow label="Middle Name" value={MOCK_APP.middleName} />
                      <DataRow label="Last Name" value={MOCK_APP.lastName} />
                      <DataRow label="Suffix" value={MOCK_APP.suffix || "None"} />
                      <DataRow label="Date of Birth" value={MOCK_APP.dob} />
                      <DataRow label="Gender" value={MOCK_APP.gender} />
                      <DataRow label="Place of Birth" value={MOCK_APP.birthPlace} />
                      <DataRow label="Nationality" value={MOCK_APP.nationality} />
                      <DataRow label="Email Address" value={MOCK_APP.email} />
                      <DataRow label="Mobile Number" value={MOCK_APP.mobile} />
                    </div>
                  </div>

                  {/* SECTION 2: Registry & Educational Background */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-[#8A1538] uppercase tracking-wider pb-1.5 border-b border-[#8A1538]/20 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-[#00563F]" /> Registry & Educational Background
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 bg-gray-50/50 p-6 rounded-xl border border-gray-100 font-sans">
                      <DataRow label="Learner Reference Number (LRN)" value={MOCK_APP.lrn} />
                      <DataRow label="High School Name" value={MOCK_APP.schoolName} />
                      <DataRow label="High School Address" value={MOCK_APP.schoolAddress} />
                    </div>
                  </div>

                  {/* SECTION 3: Biometric & Identity Verification Logs */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-[#8A1538] uppercase tracking-wider pb-1.5 border-b border-[#8A1538]/20 flex items-center gap-2">
                      <Fingerprint className="w-4 h-4 text-[#00563F]" /> Biometric & Identity Verification Logs
                    </h3>
                    <div className="bg-slate-50/50 p-6 rounded-xl border border-slate-200/60 font-sans space-y-6">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div>
                          <p className="text-[11px] text-slate-500 font-semibold">
                            Registry and hardware level failure trace logs recorded during biometric, LRN validation, and facial matches.
                          </p>
                        </div>
                      </div>

                      {/* Filter controls */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-200/60">
                        <div className="flex flex-wrap gap-1.5">
                          {(['ALL', 'LRN_VERIFICATION', 'FACIAL_RECOGNITION', 'SELFIE_VERIFICATION'] as const).map((t) => {
                            const count = t === 'ALL' 
                              ? verificationLogs.length 
                              : verificationLogs.filter(l => l.type === t).length;
                            const label = t === 'ALL' ? 'All Failures' : t.replace('_', ' ');
                            const isSelected = logFilterType === t;
                            return (
                              <button
                                key={t}
                                type="button"
                                onClick={() => setLogFilterType(t)}
                                className={cn(
                                  "px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer",
                                  isSelected 
                                    ? "bg-slate-800 text-white shadow-xs" 
                                    : "bg-white hover:bg-slate-100 text-slate-600 border border-slate-200"
                                )}
                              >
                                {label}
                                <span className={cn(
                                  "px-1.5 py-0.2 rounded-full text-[8px] font-mono",
                                  isSelected ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-500"
                                )}>
                                  {count}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Search input */}
                        <div className="relative max-w-xs w-full sm:w-64">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
                          <input
                            type="text"
                            placeholder="Filter details or log code..."
                            value={logSearch}
                            onChange={(e) => setLogSearch(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-philsa-blue text-slate-800 bg-white"
                          />
                        </div>
                      </div>

                      {/* Log Trace List Table */}
                      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white">
                        <div className="max-h-72 overflow-y-auto">
                          <table className="w-full border-collapse text-left text-xs">
                            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider sticky top-0 z-10">
                              <tr>
                                <th className="px-4 py-3 bg-slate-50">Timestamp & ID</th>
                                <th className="px-4 py-3 bg-slate-50">Trace Type</th>
                                <th className="px-4 py-3 bg-slate-50">Error Code & Details</th>
                                <th className="px-4 py-3 bg-slate-50">Device & Client IP</th>
                                <th className="px-4 py-3 text-right bg-slate-50">Attempts Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-sans">
                              {filteredLogs.length === 0 ? (
                                <tr>
                                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic font-medium">
                                    No matched verification failures found for this filter.
                                  </td>
                                </tr>
                              ) : (
                                filteredLogs.map((log) => (
                                  <tr 
                                    key={log.id} 
                                    className="hover:bg-red-50/5 transition-colors"
                                  >
                                    <td className="px-4 py-3 font-mono text-[10px] text-slate-500">
                                      <div className="font-bold text-slate-700">{log.timestamp}</div>
                                      <div className="text-[9px] text-slate-400 mt-0.5">{log.id}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                      {log.type === 'LRN_VERIFICATION' && (
                                        <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md">
                                          <BookOpen className="w-2.5 h-2.5" /> LRN Sync
                                        </span>
                                      )}
                                      {log.type === 'FACIAL_RECOGNITION' && (
                                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md">
                                          <Fingerprint className="w-2.5 h-2.5" /> Facial Bio
                                        </span>
                                      )}
                                      {log.type === 'SELFIE_VERIFICATION' && (
                                        <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-200 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md">
                                          <Camera className="w-2.5 h-2.5" /> Selfie Match
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-4 py-3 max-w-xs md:max-w-md">
                                      <div className="font-mono font-black text-philsa-navy text-[10px] flex items-center gap-1">
                                        <ShieldAlert className="w-3 h-3 text-philsa-red" />
                                        {log.code}
                                      </div>
                                      <p className="text-[10px] text-slate-600 mt-1 font-medium leading-relaxed break-words">
                                        {log.details}
                                      </p>
                                    </td>
                                    <td className="px-4 py-3 font-mono text-[10px] text-slate-500">
                                      <div className="font-bold text-slate-700 truncate max-w-[140px]" title={log.device}>{log.device}</div>
                                      <div className="text-[9px] text-slate-400 mt-0.5">IP: {log.ip}</div>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                      <div className="flex flex-col items-end gap-1">
                                        <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">
                                          <XCircle className="w-2.5 h-2.5" /> FAILED
                                        </span>
                                        <span className="text-[9px] text-slate-500 font-bold">
                                          Attempts left: <span className="font-mono font-extrabold text-philsa-red">{log.attemptsLeft}</span>
                                        </span>
                                      </div>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 4: Admission Information */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-[#8A1538] uppercase tracking-wider pb-1.5 border-b border-[#8A1538]/20 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#00563F]" /> Admission Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-50/50 p-6 rounded-xl border border-gray-100 font-sans">
                      {/* Testing Center Selection */}
                      <div className="md:col-span-1 space-y-2">
                        <label className="text-[10px] font-black text-philsa-gray uppercase tracking-widest block">
                          Testing Center
                        </label>
                        <div className="relative">
                          <select
                            value={selectedSchool}
                            onChange={(e) => handleSchoolChange(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-philsa-red appearance-none pr-10 cursor-pointer shadow-sm"
                          >
                            {Object.keys(SCHOOL_SCHEDULES).map((school) => (
                              <option key={school} value={school}>
                                {school}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                        <p className="text-[9px] text-slate-400 font-medium uppercase mt-1">Select a designated test center location</p>
                      </div>

                      {/* Exam Schedule (displays the schedule for selected school as a table) */}
                      <div className="md:col-span-2 space-y-3">
                        <label className="text-[10px] font-black text-philsa-gray uppercase tracking-widest block">
                          Available Schedules
                        </label>
                        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white">
                          <table className="w-full border-collapse text-left text-xs">
                            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              <tr>
                                <th className="px-4 py-3 bg-slate-50">Schedule Date & Time</th>
                                <th className="px-4 py-3 bg-slate-50">Proctor</th>
                                <th className="px-4 py-3 bg-slate-50">Available Seats</th>
                                <th className="px-4 py-3 bg-slate-50">Status</th>
                                <th className="px-4 py-3 text-right bg-slate-50">Selection</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-sans">
                              {(SCHOOL_SCHEDULES[selectedSchool] || []).map((sched) => {
                                const isSelected = selectedScheduleId === sched.id;
                                return (
                                  <tr 
                                    key={sched.id}
                                    className={`hover:bg-slate-50 transition-colors ${
                                      isSelected ? 'bg-red-50/20 font-semibold' : ''
                                    }`}
                                  >
                                    <td className="px-4 py-3 text-slate-800 font-extrabold text-[11px] uppercase tracking-wider">
                                      <div className="flex items-center gap-2">
                                        <span className={cn(
                                          "inline-block w-2.5 h-2.5 rounded-full border-2 flex-shrink-0",
                                          isSelected ? "bg-philsa-red border-philsa-red" : "bg-white border-slate-300"
                                        )} />
                                        {sched.time}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-700 font-bold text-xs">
                                      {sched.proctor}
                                    </td>
                                    <td className="px-4 py-3">
                                      <span className={cn(
                                        "font-black font-mono px-2 py-0.5 rounded-md text-[10px]",
                                        sched.initialSeatsLeft <= 5 
                                          ? "bg-red-100 text-red-700" 
                                          : "bg-emerald-100 text-emerald-700"
                                      )}>
                                        {sched.initialSeatsLeft} Left
                                      </span>
                                    </td>
                                    <td className="px-4 py-3">
                                      <span className={cn(
                                        "inline-block text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border",
                                        isSelected 
                                          ? "bg-red-50 text-philsa-red border-philsa-red/20"
                                          : "bg-slate-50 text-slate-500 border-slate-200"
                                      )}>
                                        {isSelected ? "Active" : "Available"}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                      {isSelected ? (
                                        <button
                                          type="button"
                                          onClick={() => setSelectedScheduleId('')}
                                          className="bg-red-50 text-philsa-red hover:bg-red-100 font-extrabold px-3 py-1.5 rounded-lg tracking-wider cursor-pointer text-[10px] transition-all"
                                        >
                                          Deselect
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => setSelectedScheduleId(sched.id)}
                                          className="bg-philsa-red text-white hover:bg-philsa-red/90 font-extrabold px-3 py-1.5 rounded-lg tracking-wider cursor-pointer text-[10px] transition-all shadow-sm shadow-philsa-red/10"
                                        >
                                          Select
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
                      
                      {/* Active Workstation Seat Assignment Section */}
                      <div className="sm:col-span-2 md:col-span-3 pt-4 border-t border-slate-100 space-y-4">
                        <div>
                          <label className="text-[10px] font-black text-philsa-gray uppercase tracking-widest block mb-1">
                             Assign Seat
                          </label>
                          <p className="text-xs text-slate-500 font-medium mb-4">
                             Map this student to an active, proctor-registered PC node at {selectedSchool}. This links their examination profile with the physical lab terminal. Supports quick filter for multiple laboratory rows.
                          </p>

                          {!selectedScheduleId ? (
                            <div className="border border-slate-200 border-dashed rounded-2xl p-8 bg-slate-50/50 text-center text-slate-500 font-sans space-y-2">
                              <AlertCircle className="w-8 h-8 text-slate-400 mx-auto animate-pulse" />
                              <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">No Schedule Selected</h4>
                              <p className="text-[11px] text-slate-500 max-w-md mx-auto leading-relaxed">
                                Please select one of the available examination schedules from the list above to view and assign workstation seats for this student.
                              </p>
                            </div>
                          ) : (
                            <>
                              {/* Quick Filter Inner Input */}
                              <div className="relative mb-3.5 max-w-sm">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
                                <input
                                  type="text"
                                  placeholder="Search seat, PC hostname..."
                                  value={seatSearch}
                                  onChange={(e) => setSeatSearch(e.target.value)}
                                  className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-philsa-blue text-slate-800"
                                />
                              </div>
                              
                              {/* Rich Interactive Table View with scrollbars */}
                              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white">
                                <div className="max-h-96 overflow-y-auto">
                                  <table className="w-full border-collapse text-left text-xs">
                                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider sticky top-0 z-10">
                                      <tr>
                                        <th className="px-4 py-3 bg-slate-50">Seat Coordinate</th>
                                        <th className="px-4 py-3 bg-slate-50">Room & Proctor</th>
                                        <th className="px-4 py-3 bg-slate-50">PC Name</th>
                                        <th className="px-4 py-3 bg-slate-50">Specifications & IP</th>
                                        <th className="px-4 py-3 bg-slate-50">Status / Current Occupant</th>
                                        <th className="px-4 py-3 text-right bg-slate-50">Actions</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-sans">
                                      {filteredSeats.length === 0 ? (
                                        <tr>
                                          <td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic">
                                            No matched workstations found in this center.
                                          </td>
                                        </tr>
                                      ) : (
                                        filteredSeats.map((seat, idx) => (
                                          <tr 
                                            key={idx} 
                                            className={`hover:bg-slate-50 transition-colors ${
                                              seat.isThisCandidate ? 'bg-emerald-50/70 font-semibold' : ''
                                            }`}
                                          >
                                            <td className="px-4 py-3 font-mono font-bold text-philsa-navy">
                                              {seat.seatNumber}
                                            </td>
                                            <td className="px-4 py-3">
                                              <div className="font-bold text-slate-700 text-xs">{seat.roomName}</div>
                                              <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                                                <span className="text-[#8A1538] font-bold">👤 Proctor:</span> {seat.proctorName}
                                              </div>
                                            </td>
                                            <td className="px-4 py-3 text-slate-800 font-medium">
                                              {seat.pcName}
                                            </td>
                                            <td className="px-4 py-3">
                                              <div className="text-[10px] text-slate-500 font-mono">{seat.ipAddress}</div>
                                              <div className="text-[9px] text-slate-400 truncate max-w-[200px]" title={seat.specs}>{seat.specs}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                              <div className="flex items-center gap-1.5">
                                                <span className={`inline-block w-2.5 h-2.5 rounded-full ${
                                                  seat.isThisCandidate
                                                    ? 'bg-emerald-500 animate-pulse'
                                                    : seat.isOccupied
                                                      ? 'bg-red-400'
                                                      : 'bg-emerald-400'
                                                }`} />
                                                <span className="text-slate-700 font-medium">
                                                  {seat.isThisCandidate
                                                    ? `Assigned to ${MOCK_APP.firstName}`
                                                    : seat.isOccupied
                                                      ? `Occupied: ${seat.occupantName}`
                                                      : 'Available'}
                                                </span>
                                              </div>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                              {seat.isThisCandidate ? (
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    localStorage.removeItem(seatStorageKey);
                                                    setAssignedSeat('');
                                                    addAuditLog('ADMISSION_SEAT_RELEASED', `Released candidate ${MOCK_APP.firstName} ${MOCK_APP.lastName} from seat ${seat.seatNumber}`);
                                                  }}
                                                  className="bg-red-50 text-philsa-red hover:bg-red-100 font-extrabold px-3 py-1 rounded-md tracking-wider cursor-pointer text-[10px] transition-all"
                                                >
                                                  Release
                                                </button>
                                              ) : seat.isOccupied ? (
                                                <span className="text-[10px] font-medium text-slate-400 italic px-3 py-1">
                                                  In Use
                                                </span>
                                              ) : (
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    localStorage.setItem(seatStorageKey, seat.seatNumber);
                                                    setAssignedSeat(seat.seatNumber);
                                                    addAuditLog('ADMISSION_SEAT_ASSIGNED', `Assigned recruit candidate ${MOCK_APP.firstName} ${MOCK_APP.lastName} to seat ${seat.seatNumber}`);
                                                  }}
                                                  className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-extrabold px-3 py-1 rounded-md tracking-wider cursor-pointer text-[10px] transition-all"
                                                >
                                                  Assign
                                                </button>
                                              )}
                                            </td>
                                          </tr>
                                        ))
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </>
                          )}
                          
                        </div>
                      </div>

                    </div>
                  </div>
                </div>

                <div className="pt-10 border-t border-philsa-border mt-10">
                  <h3 className="text-[10px] font-black text-philsa-navy uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-philsa-red" /> Official Reviewer Directives
                  </h3>
                  <textarea 
                    className="w-full bg-philsa-bg border-none rounded-2xl p-6 text-sm font-medium focus:ring-2 focus:ring-philsa-red/10 outline-none min-h-[160px] resize-none shadow-inner"
                    placeholder="Provide detailed compliance notes or remediation instructions..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                  />
                  <div className="mt-10 flex flex-col md:flex-row justify-end gap-4 p-8 bg-philsa-bg/30 rounded-3xl border border-philsa-border border-dashed">
                      <div className="flex-1 text-xs font-bold text-philsa-gray italic flex items-center gap-2">
                         <ShieldCheck className="w-4 h-4 text-emerald-600" /> All personal data cross-referenced with PhilSys registry.
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <button 
                          onClick={() => handleAction('REASSIGN')}
                          className="bg-white border border-philsa-border text-philsa-navy font-black py-3 px-5 rounded-xl text-[10px] uppercase tracking-widest hover:bg-philsa-bg active:scale-[0.98] shadow-sm transition-all flex items-center gap-2"
                        >
                          <MapPin className="w-3.5 h-3.5" /> Reassign Center
                        </button>
                        <button 
                          onClick={() => handleAction('CORRECTION')}
                          className="bg-amber-50 border border-amber-200 text-amber-700 font-black py-3 px-5 rounded-xl text-[10px] uppercase tracking-widest hover:bg-amber-100 active:scale-[0.98] shadow-sm transition-all flex items-center gap-2"
                        >
                          <AlertCircle className="w-3.5 h-3.5" /> Correction
                        </button>
                        <button 
                          onClick={() => handleAction('REJECT')}
                          className="bg-white border border-philsa-red/20 text-philsa-red font-black py-3 px-5 rounded-xl text-[10px] uppercase tracking-widest hover:bg-philsa-red hover:text-white active:scale-[0.98] shadow-sm transition-all flex items-center gap-2"
                        >
                          <X className="w-3.5 h-3.5" /> Reject
                        </button>
                        <button 
                          onClick={() => handleAction('APPROVE')}
                          className="bg-philsa-red text-white font-black py-3 px-7 rounded-xl text-[10px] uppercase tracking-widest hover:bg-philsa-red/90 active:scale-[0.98] shadow-lg shadow-philsa-red/20 transition-all flex items-center gap-2"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Approve
                        </button>
                      </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'DOCUMENTS' && (
              <motion.div 
                key="docs"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                <div className="col-span-1 lg:col-span-3 mb-4">
                   <h3 className="text-[10px] font-black text-philsa-red uppercase tracking-[0.3em] mb-4 pb-2 border-b-2 border-philsa-red w-fit">Digital Artifact Ledger</h3>
                </div>
                {[
                  { title: "PhilSys Identification Card", status: "VERIFIED", timestamp: MOCK_APP.history[0]?.date, preview: "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=1200&q=80" },
                  { title: "Certified Academic Transcript", status: "VERIFIED", timestamp: MOCK_APP.history[0]?.date, preview: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=1200&q=80" },
                  { title: "Legal Birth Certificate", status: "VERIFIED", timestamp: MOCK_APP.history[0]?.date, preview: "https://images.unsplash.com/photo-1544377193-33dcf4d68fb5?w=1200&q=80" },
                  { title: "Certificate of Good Moral", status: "VERIFIED", timestamp: MOCK_APP.history[0]?.date, preview: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=1200&q=80" }
                ].map((doc, i) => (
                  <DocCard 
                    key={i} 
                    {...doc} 
                    onView={() => setSelectedDoc(doc)}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Reassign Testing Center Modal */}
      <AnimatePresence>
        {isReassigning && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-philsa-navy/60 backdrop-blur-md">
            <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.95 }}
               className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden"
            >
               <div className="p-8 border-b border-philsa-border bg-philsa-bg/30">
                  <h3 className="text-xl font-black text-philsa-navy uppercase tracking-tight">Reassign <span className="text-philsa-red">Testing Center</span></h3>
                  <p className="text-[10px] text-philsa-gray font-black mt-1 uppercase tracking-widest">Adjusting location for {MOCK_APP.firstName} {MOCK_APP.lastName}</p>
               </div>
               
               <div className="p-8 space-y-6">
                  <div className="p-6 bg-philsa-bg rounded-3xl border border-philsa-border border-dashed mb-6">
                     <p className="text-[10px] font-black text-philsa-gray uppercase tracking-widest mb-1">Current Assignment</p>
                     <p className="text-sm font-black text-philsa-navy uppercase tracking-widest">{selectedSchool}</p>
                  </div>

                  <div className="space-y-4">
                     <label className="text-[10px] font-black text-philsa-gray uppercase tracking-widest px-1">Select New Location</label>
                     <div className="grid grid-cols-1 gap-2">
                        {['University of the Philippines Diliman', 'De La Salle University - Manila', 'PUP Main Campus', 'University of Santo Tomas'].map(center => {
                          const isTempSelected = center === tempSelectedSchool;
                          return (
                            <button 
                              key={center} 
                              onClick={() => setTempSelectedSchool(center)}
                              className={cn(
                                "flex items-center justify-between p-5 rounded-2xl border transition-all text-left",
                                isTempSelected 
                                  ? "border-philsa-red bg-red-50/10 shadow-sm" 
                                  : "border-philsa-border hover:border-slate-300 hover:bg-slate-50"
                              )}
                            >
                               <div className="flex items-center gap-3">
                                  <div className={cn(
                                    "w-8 h-8 rounded-xl flex items-center justify-center shadow-xs",
                                    isTempSelected ? "bg-philsa-red text-white" : "bg-white text-philsa-navy border border-slate-100"
                                  )}>
                                     <MapPin className="w-4 h-4" />
                                  </div>
                                  <div>
                                     <p className={cn("text-[10px] font-black uppercase tracking-widest", isTempSelected ? "text-philsa-red" : "text-philsa-navy")}>{center}</p>
                                     <p className="text-[8px] font-bold text-philsa-gray uppercase mt-0.5">85% Capacity Available</p>
                                  </div>
                               </div>
                               {isTempSelected ? (
                                 <Check className="w-4 h-4 text-philsa-red" />
                               ) : (
                                 <ChevronRight className="w-4 h-4 text-philsa-gray" />
                               )}
                            </button>
                          );
                        })}
                     </div>
                  </div>
               </div>

               <div className="p-8 bg-philsa-bg/30 border-t border-philsa-border flex gap-3">
                  <button onClick={() => setIsReassigning(false)} className="flex-1 py-4 bg-white border border-philsa-border text-philsa-navy text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-philsa-bg transition-all">Cancel</button>
                  <button 
                    onClick={() => {
                       handleSchoolChange(tempSelectedSchool);
                       setIsReassigning(false);
                       setSuccessConfig({ isOpen: true, title: 'Center Reassigned', message: `The testing center assignment has been successfully updated to ${tempSelectedSchool}.` });
                    }} 
                    className="flex-[2] py-4 bg-philsa-red text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-philsa-red/20 hover:bg-philsa-red/90 transition-all"
                  >
                    Confirm Reassignment
                  </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Return for Correction Modal */}
      <AnimatePresence>
        {isCorrectionModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-philsa-navy/60 backdrop-blur-md">
            <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.95 }}
               className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden"
            >
               <div className="p-8 border-b border-philsa-border bg-philsa-bg/30">
                  <h3 className="text-xl font-black text-philsa-navy uppercase tracking-tight">Return for <span className="text-philsa-red">Correction</span></h3>
                  <p className="text-[10px] text-philsa-gray font-black mt-1 uppercase tracking-widest">Flagging application for student revisions</p>
               </div>
               
               <div className="p-8 space-y-6">
                  <div className="space-y-3">
                     <label className="text-[10px] font-black text-philsa-red uppercase tracking-widest px-1">Specific Correction Directives *</label>
                     <textarea 
                       rows={6}
                       value={correctionReason}
                       onChange={(e) => setCorrectionReason(e.target.value)}
                       placeholder="Please specify exactly what the student needs to update (e.g., Blurred Birth Certificate, Invalid LRN, Missing Transcripts)..."
                       className="w-full bg-philsa-bg border border-philsa-border rounded-3xl p-6 text-xs font-bold text-philsa-navy focus:ring-4 focus:ring-philsa-red/5 outline-none shadow-inner"
                     />
                     <p className="text-[9px] text-philsa-gray font-medium italic">* This message will be sent directly to the student via email and portal dashboard.</p>
                  </div>
               </div>

               <div className="p-8 bg-philsa-bg/30 border-t border-philsa-border flex gap-3">
                  <button onClick={() => setIsCorrectionModalOpen(false)} className="flex-1 py-4 bg-white border border-philsa-border text-philsa-navy text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-philsa-bg transition-all">Cancel</button>
                  <button 
                    onClick={submitCorrection}
                    disabled={!correctionReason.trim()}
                    className="flex-[2] py-4 bg-philsa-red text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-philsa-red/20 hover:bg-philsa-red/90 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Send Resolution Request
                  </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Document Viewer Modal */}
      <AnimatePresence>
        {selectedDoc && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10"
          >
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDoc(null)}
              className="absolute inset-0 bg-philsa-navy/95 backdrop-blur-xl cursor-zoom-out"
            />
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-6xl max-h-full bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row"
            >
              {/* Document Viewing Area */}
              <div className="flex-1 bg-neutral-900 overflow-auto p-6 md:p-12 flex justify-center min-h-[500px] scrollbar-hide">
                 <div className="relative bg-white shadow-[0_20px_50px_rgba(0,0,0,0.3)] min-h-[141.4%] w-full max-w-[800px] flex flex-col origin-top transition-transform duration-500">
                    {/* Document Paper Texture/Overlay */}
                    <div className="absolute inset-0 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')] opacity-[0.03]" />
                    
                    {/* Simulated Document Header (Word Style) */}
                    <div className="p-10 pb-0 flex justify-between items-start border-b border-gray-100/50 mb-8">
                       <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-philsa-navy flex items-center justify-center rounded-lg">
                             <img src="/logo.svg" alt="PhilSA" className="w-8 h-8 brightness-0 invert" onError={(e) => e.currentTarget.style.display = 'none'} />
                             <FileText className="w-6 h-6 text-white" />
                          </div>
                          <div className="space-y-0.5">
                             <p className="text-[10px] font-black text-philsa-navy uppercase tracking-[0.2em]">Philippine Space Agency</p>
                             <p className="text-[8px] font-bold text-philsa-gray uppercase tracking-widest">Document Registry & Verification</p>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className="text-[9px] font-black text-philsa-navy uppercase tracking-widest">Official Record</p>
                          <p className="text-[8px] font-bold text-philsa-gray uppercase tracking-widest mt-1">{MOCK_APP.id}</p>
                       </div>
                    </div>

                    <div className="p-8 md:p-12 pt-0 flex-1 flex flex-col">
                       <div className="relative group/img flex-1">
                          <img 
                            src={selectedDoc.preview} 
                            alt={selectedDoc.title}
                            className="w-full h-auto rounded-sm border border-gray-200 ring-1 ring-black/5"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm rounded-sm">
                             <div className="px-6 py-3 bg-white text-philsa-navy text-[10px] font-black uppercase tracking-widest rounded-xl shadow-2xl flex items-center gap-2">
                                <Eye className="w-4 h-4" /> Original Aspect Ratio
                             </div>
                          </div>
                       </div>
                    </div>

                    {/* Simulated Document Footer */}
                    <div className="p-10 pt-6 border-t border-gray-100 flex justify-between items-center opacity-40 grayscale mt-auto">
                       <p className="text-[8px] font-bold text-philsa-gray uppercase tracking-[0.2em]">Security Protocol Ver: 2.0.4</p>
                       <div className="flex gap-4">
                          <div className="w-8 h-8 rounded bg-gray-200" />
                          <div className="w-8 h-8 rounded bg-gray-200" />
                       </div>
                    </div>
                 </div>
              </div>

              {/* Document Info Sidebar */}
              <div className="w-full md:w-80 border-l border-philsa-border p-8 flex flex-col justify-between bg-white">
                <div>
                   <button 
                     onClick={() => setSelectedDoc(null)}
                     className="w-10 h-10 rounded-full bg-philsa-bg border border-philsa-border flex items-center justify-center text-philsa-gray hover:text-philsa-red transition-colors mb-8"
                   >
                     <X className="w-5 h-5" />
                   </button>
                   
                   <h2 className="text-xl font-black text-philsa-navy uppercase tracking-tight leading-tight mb-4">{selectedDoc.title}</h2>
                   
                   <div className="space-y-6">
                      <div>
                        <p className="text-[10px] font-black text-philsa-gray uppercase tracking-widest mb-1">Status Verification</p>
                        <div className="flex items-center gap-2">
                           <span className="w-2 h-2 rounded-full bg-emerald-500" />
                           <span className="text-xs font-black text-emerald-600 uppercase tracking-widest">{selectedDoc.status}</span>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-[10px] font-black text-philsa-gray uppercase tracking-widest mb-1">Archived Ingest Date</p>
                        <p className="text-xs font-bold text-philsa-navy">{selectedDoc.timestamp}</p>
                      </div>

                      <div className="p-4 bg-philsa-bg/50 rounded-2xl border border-philsa-border border-dashed">
                        <p className="text-[10px] font-bold text-philsa-gray uppercase tracking-widest leading-relaxed mb-3">Compliance Metadata</p>
                        <div className="space-y-2">
                           <div className="flex items-center justify-between text-[9px] font-black text-philsa-gray uppercase">
                              <span>Resolution</span>
                              <span>300 DPI</span>
                           </div>
                           <div className="flex items-center justify-between text-[9px] font-black text-philsa-gray uppercase">
                              <span>Encoding</span>
                              <span>AES-256</span>
                           </div>
                        </div>
                      </div>
                   </div>
                </div>

                <div className="space-y-3 pt-8 mt-8 border-t border-philsa-border">
                   <button className="w-full py-4 bg-philsa-navy text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-philsa-navy/20 hover:bg-philsa-navy/90 transition-all flex items-center justify-center gap-2">
                      <Download className="w-4 h-4" /> Download Original
                   </button>
                   <button 
                     onClick={() => setSelectedDoc(null)}
                     className="w-full py-4 bg-white border border-philsa-border text-philsa-navy text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-philsa-bg transition-all"
                   >
                     Close Viewer
                   </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Success Feedback Modal */}
      <SuccessModal 
        isOpen={successConfig.isOpen}
        onClose={() => {
          setSuccessConfig(prev => ({ ...prev, isOpen: false }));
          navigate('/admin/reviewer/applications');
        }}
        type={successConfig.type}
        title={successConfig.title}
        message={successConfig.message}
        actionLabel={successConfig.actionLabel}
      />
    </div>
  );
}

function DataRow({ label, value }: { label: string, value: string }) {
  return (
    <div>
      <p className="text-[10px] font-black text-philsa-gray uppercase tracking-widest mb-1">{label}</p>
      <p className="text-sm font-bold text-philsa-navy leading-snug">{value}</p>
    </div>
  );
}

function DocCard({ title, status, timestamp, preview, onView }: any) {
  return (
    <div 
      onClick={onView}
      className="card-philsa p-0 flex flex-col justify-between group hover:border-philsa-red transition-all cursor-pointer bg-white overflow-hidden shadow-lg shadow-black/5"
    >
       <div className="aspect-video w-full bg-philsa-bg overflow-hidden relative border-b border-philsa-border">
          {preview ? (
            <img src={preview} alt={title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-80" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-philsa-bg">
               <FileText className="w-12 h-12 text-philsa-border" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-4">
             <h5 className="text-sm font-black text-white leading-tight uppercase tracking-tight">{title}</h5>
          </div>
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
             <div className="bg-philsa-red p-2 rounded-lg text-white shadow-lg">
                <Eye className="w-4 h-4" />
             </div>
          </div>
       </div>
       <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
             <p className="text-[10px] text-philsa-gray font-black uppercase tracking-widest italic">{timestamp}</p>
             <span className={`text-[8px] font-black px-2 py-0.5 rounded tracking-widest uppercase ${
               status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
             }`}>
               {status}
             </span>
          </div>
          <button className="w-full py-3 bg-philsa-bg border border-philsa-border rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest group-hover:bg-philsa-red group-hover:text-white group-hover:border-philsa-red transition-all">
             <Eye className="w-3.5 h-3.5" /> Full Resolution
          </button>
       </div>
    </div>
  );
}
