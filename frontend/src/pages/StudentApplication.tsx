import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { usePhilSA } from '../PhilSAContext';
import { useMockData } from '../services/mockService';
import { FileUp, CheckCircle, AlertCircle, Save, ChevronRight, ChevronLeft, Shield, User, School, BookOpen, Plus, Trash2, MapPin, Activity, ShieldCheck, Power, Clock, LifeBuoy, RefreshCw, Lock, Check, AlertTriangle, Mail, Phone, Upload, Smartphone, Camera, Scan, Eye, Video } from 'lucide-react';
import { cn } from '../lib/utils';

const SECTIONS = [
  'LRN & Profile Setup',
  'Biometric & ID Upload',
  'Contact & Security Setup',
  'Review & Submit'
];

const COUNTRIES = [
  "Philippines", "United States", "Canada", "United Kingdom", "Australia", "Japan", 
  "Singapore", "South Korea", "Germany", "Saudi Arabia", "United Arab Emirates", 
  "Malaysia", "Indonesia", "Thailand", "Vietnam", "Taiwan", "Hong Kong", "China", "India"
];

const GEOGRAPHY_DATA = [
  {
    region: 'NCR',
    provinces: [
      {
        name: 'Metro Manila',
        cities: [
          {
            name: 'Mandaluyong',
            barangays: ['Brgy. Addition Hills', 'Brgy. Highway Hills', 'Brgy. Wack-Wack Greenhills', 'Brgy. Plainview']
          },
          {
            name: 'Quezon City',
            barangays: ['Diliman', 'Brgy. Commonwealth', 'Brgy. Katipunan', 'Brgy. Batasan Hills']
          },
          {
            name: 'Manila',
            barangays: ['Intramuros', 'Sampaloc', 'Malate', 'Ermita']
          }
        ]
      }
    ]
  },
  {
    region: 'Region III',
    provinces: [
      {
        name: 'Pampanga',
        cities: [
          {
            name: 'San Fernando',
            barangays: ['Brgy. Dolores', 'Brgy. San Jose', 'Brgy. Del Pilar']
          },
          {
            name: 'Angeles City',
            barangays: ['Brgy. Balibago', 'Brgy. Pulung Maragul', 'Brgy. Sto. Rosario']
          }
        ]
      },
      {
        name: 'Bulacan',
        cities: [
          {
            name: 'Malolos',
            barangays: ['Brgy. Catmon', 'Brgy. San Gabriel', 'Brgy. Guinhawa']
          }
        ]
      }
    ]
  },
  {
    region: 'Region IV-A',
    provinces: [
      {
        name: 'Laguna',
        cities: [
          {
            name: 'Los Baños',
            barangays: ['Brgy. Batong Malake', 'Brgy. Lalakay', 'Brgy. Maahas']
          },
          {
            name: 'Calamba',
            barangays: ['Brgy. Halang', 'Brgy. Real', 'Brgy. Bucal']
          }
        ]
      },
      {
        name: 'Cavite',
        cities: [
          {
            name: 'Dasmariñas',
            barangays: ['Brgy. Sampaloc I', 'Brgy. Burol', 'Brgy. Salitran II']
          }
        ]
      }
    ]
  }
];

const UNIVERSITY_DATA = [
  { 
    name: 'UP Diliman', 
    courses: ['BS Computer Science', 'BS Physics', 'BS Mathematics', 'BS Geodetic Engineering', 'BS Mechanical Engineering', 'BS Electronics Engineering', 'BS Chemical Engineering', 'BS Biology'] 
  },
  { 
    name: 'UP Los Baños', 
    courses: ['BS Computer Science', 'BS Physics', 'BS Mathematics', 'BS Chemical Engineering', 'BS Biology', 'BS Electrical Engineering', 'BS Civil Engineering'] 
  },
  { 
    name: 'UP Manila', 
    courses: ['BS Biochemistry', 'BS Biology', 'BS Computer Science', 'BS Nursing', 'BS Pharmacy', 'BS Public Health'] 
  },
  { 
    name: 'UP Visayas', 
    courses: ['BS Fisheries', 'BS Biology', 'BS Computer Science', 'BS Chemistry', 'BS Mathematics'] 
  },
  { 
    name: 'UP Open University', 
    courses: ['Bachelor of Arts in Multimedia Studies', 'Associate in Arts', 'BS Education'] 
  },
  { 
    name: 'UP Mindanao', 
    courses: ['BS Computer Science', 'BS Applied Mathematics', 'BS Biology', 'BS Food Technology'] 
  },
  { 
    name: 'UP Baguio', 
    courses: ['BS Computer Science', 'BS Biology', 'BS Mathematics', 'BS Physics'] 
  },
  { 
    name: 'UP Cebu', 
    courses: ['BS Computer Science', 'BS Mathematics', 'BS Biology', 'BA Product Design'] 
  },
  { 
    name: 'UP Tacloban', 
    courses: ['BS Computer Science', 'BS Biology', 'BS Mathematics'] 
  },
  { 
    name: 'PUP Manila', 
    courses: ['BS Computer Science', 'BS Information Technology', 'BS Mechanical Engineering', 'BS Accountancy', 'BS Civil Engineering'] 
  },
  { 
    name: 'PUP Quezon City', 
    courses: ['BS Information Technology', 'BS Business Administration', 'BS Office Administration'] 
  },
  { 
    name: 'PUP Taguig', 
    courses: ['BS Information Technology', 'BS Mechanical Engineering', 'BS Civil Engineering'] 
  },
  { 
    name: 'PUP Bataan', 
    courses: ['BS Industrial Engineering', 'BS Information Technology', 'BS Accountancy'] 
  },
  { 
    name: 'UST Manila', 
    courses: ['BS Nursing', 'BS Accountancy', 'BS Architecture', 'BS Biology', 'BS Civil Engineering', 'BS Medical Technology'] 
  },
  { 
    name: 'UST General Santos', 
    courses: ['BS Medical Technology', 'BS Accountancy', 'BS Business Administration'] 
  },
  { 
    name: 'Ateneo de Manila University', 
    courses: ['AB Political Science', 'BS Management Engineering', 'BS Psychology', 'BS Computer Science', 'BS Physics'] 
  },
  { 
    name: 'De La Salle University Manila', 
    courses: ['BS Computer Science', 'BS Accountancy', 'BS Mechanical Engineering', 'BS Psychology', 'BS Biology'] 
  },
  { 
    name: 'De La Salle University Laguna', 
    courses: ['BS Interactive Mobile Technologies', 'BS Computer Science', 'BS Information Technology'] 
  },
  { 
    name: 'Mapua University Manila', 
    courses: ['BS Mechanical Engineering', 'BS Civil Engineering', 'BS Architecture', 'BS Computer Science', 'BS Information Technology'] 
  },
  { 
    name: 'Mapua Malayan Colleges Laguna', 
    courses: ['BS Computer Science', 'BS Mechanical Engineering', 'BS Electronics Engineering'] 
  },
  { 
    name: 'TUP Manila', 
    courses: ['BS Mechanical Engineering', 'BS Civil Engineering', 'BS Electrical Engineering', 'BS Architecture'] 
  },
  { 
    name: 'TUP Visayas', 
    courses: ['BS Mechanical Engineering', 'BS Electronics Engineering', 'BS Power Technology'] 
  },
  { 
    name: 'PLM (Pamantasan ng Lungsod ng Maynila)', 
    courses: ['BS Nursing', 'BS Computer Science', 'BS Accountancy', 'BS Biology', 'BS Psychology'] 
  }
];

const HIGH_SCHOOLS = [
  "Philippine Science High School - Main Campus",
  "Philippine Science High School - Ilocos Region Campus",
  "Philippine Science High School - Cordillera Administrative Region Campus",
  "Philippine Science High School - Cagayan Valley Campus",
  "Philippine Science High School - Central Luzon Campus",
  "Philippine Science High School - CALABARZON Campus",
  "Philippine Science High School - MIMAROPA Campus",
  "Philippine Science High School - Bicol Region Campus",
  "Philippine Science High School - Western Visayas Campus",
  "Philippine Science High School - Central Visayas Campus",
  "Philippine Science High School - Eastern Visayas Campus",
  "Philippine Science High School - Zamboanga Peninsula Campus",
  "Philippine Science High School - Central Mindanao Campus",
  "Philippine Science High School - Southern Mindanao Campus",
  "Philippine Science High School - SOCCSKSARGEN Campus",
  "Philippine Science High School - Caraga Region Campus",
  "Manila Science High School",
  "Quezon City Science High School",
  "Makati Science High School",
  "Pasig City Science High School",
  "Ateneo de Manila High School",
  "De La Salle University Integrated School",
  "University of Santo Tomas High School",
  "University of the Philippines High School In Diliman",
  "University of the Philippines High School In Cebu",
  "Chiang Kai Shek College",
  "Xavier School",
  "San Beda University Senior High School",
  "Miriam College High School",
  "Philippine Christian University High School",
  "Far Eastern University High School",
  "Adamson University High School",
  "Mapua University Senior High School",
  "National University Senior High School"
];

export default function StudentApplication() {
  const isPwaMode = new URLSearchParams(window.location.search).get('pwa') === 'true';
  const { user, addAuditLog, inputModules, addTicket } = usePhilSA();
  const isRegActive = inputModules?.find(m => m.id === 'student_reg')?.isActive !== false;
  const isGenderActive = inputModules?.find(m => m.id === 'student_reg_gender')?.isActive !== false;
  const isNationalIdActive = inputModules?.find(m => m.id === 'student_reg_national_id')?.isActive !== false;
  const isMiddleNameActive = inputModules?.find(m => m.id === 'student_reg_middle_name')?.isActive !== false;
  const isBirthPlaceActive = inputModules?.find(m => m.id === 'student_reg_birth_place')?.isActive !== false;
  const isSuffixActive = inputModules?.find(m => m.id === 'student_reg_suffix')?.isActive !== false;

  // Load verification methods configuration dynamically
  const [regConfigs, setRegConfigs] = useState<any[]>(() => {
    const saved = localStorage.getItem('philsa_registration_configs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [
      { id: 'v1', section: 'Personal Information', type: 'Verification Method', value: 'Learner Reference Number (LRN)', status: 'Active' },
      { id: 'v2', section: 'Personal Information', type: 'Verification Method', value: 'PhilSys National ID', status: 'Active' },
      { id: 'v3', section: 'Personal Information', type: 'Verification Method', value: 'Manual Entry', status: 'Active' },
    ];
  });

  useEffect(() => {
    const saved = localStorage.getItem('philsa_registration_configs');
    if (saved) {
      try {
        setRegConfigs(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const lrnActive = regConfigs.find(c => c.type === 'Verification Method' && c.value?.includes('LRN'))?.status === 'Active';
  const philsysActive = regConfigs.find(c => c.type === 'Verification Method' && c.value?.includes('PhilSys'))?.status === 'Active';
  const manualActive = regConfigs.find(c => c.type === 'Verification Method' && c.value?.includes('Manual'))?.status === 'Active';

  const { applications, setApplications, schedules } = useMockData();
  const [currentSection, setCurrentSection] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isIdVerified, setIsIdVerified] = useState(false);
  const [candidateId, setCandidateId] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [visitedSections, setVisitedSections] = useState<number[]>([0]);
  const [isEditingCorrection, setIsEditingCorrection] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<'goodMoral' | 'form137' | 'form138' | 'enrollmentCert'>('form137');
  const [focusedUniIndex, setFocusedUniIndex] = useState<number | null>(null);
  const [uniQuery, setUniQuery] = useState<string[]>(['', '', '']);

  // Gap Features (Inactivity Timeout & Helpdesk Routing)
  const [timeLeft, setTimeLeft] = useState(1800); // 30 minutes = 1800 seconds
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const [showHelpdeskTicket, setShowHelpdeskTicket] = useState(false);
  const [supportReferenceNumber, setSupportReferenceNumber] = useState('');
  const [showPrivacyConsent, setShowPrivacyConsent] = useState(true);
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);

  // New Verification Path States
  const [verificationPath, setVerificationPath] = useState<'philsys' | 'lrn' | 'manual' | null>(null);
  const [lrnAttemptsLeft, setLrnAttemptsLeft] = useState(5);
  const [showLrnCooldownModal, setShowLrnCooldownModal] = useState(false);
  const [cooldownSecondsLeft, setCooldownSecondsLeft] = useState(900); // 15 minutes = 900 seconds

  useEffect(() => {
    let interval: any = null;
    if (showLrnCooldownModal && cooldownSecondsLeft > 0) {
      interval = setInterval(() => {
        setCooldownSecondsLeft(prev => {
          if (prev <= 1) {
            setShowLrnCooldownModal(false);
            setLrnAttemptsLeft(5);
            setErrors({});
            setFormData(p => ({ ...p, lrn: '' }));
            return 900;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showLrnCooldownModal, cooldownSecondsLeft]);

  // Auto-redirect if only one active verification method exists
  useEffect(() => {
    if (!showPrivacyConsent && verificationPath === null) {
      const activeCount = (lrnActive ? 1 : 0) + (philsysActive ? 1 : 0) + (manualActive ? 1 : 0);
      if (activeCount === 1) {
        if (lrnActive) setVerificationPath('lrn');
        else if (philsysActive) setVerificationPath('philsys');
        else if (manualActive) setVerificationPath('manual');
      }
    }
  }, [showPrivacyConsent, verificationPath, lrnActive, philsysActive, manualActive]);
  const [philsysInputMode, setPhilsysInputMode] = useState<'qr' | 'manual'>('manual');
  const [qrScanning, setQrScanning] = useState(false);
  const [qrScanningMessage, setQrScanningMessage] = useState('');
  const [failedVerificationMethod, setFailedVerificationMethod] = useState('');
  const [simulateFaceFailure, setSimulateFaceFailure] = useState(false);
  const [faceCheckStatus, setFaceCheckStatus] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle');
  const [faceCheckLog, setFaceCheckLog] = useState('');
  const [selfieStatus, setSelfieStatus] = useState<'idle' | 'opening' | 'live' | 'capturing' | 'analyzing' | 'success' | 'failed'>('idle');
  const [selfieLog, setSelfieLog] = useState('');
  const [shutterFlash, setShutterFlash] = useState(false);
  const [step2SubStage, setStep2SubStage] = useState<'upload_photo' | 'selfie'>('upload_photo');

  // New multi-angle Face Verification states
  const [faceVerificationStage, setFaceVerificationStage] = useState<'not_started' | 'camera_ready' | 'countdown' | 'verifying' | 'success' | 'failed' | 'failed_unrecognized' | 'failed_mismatch' | 'selfie_verification' | 'selfie_checking' | 'selfie_recorded' | 'selfie_failed_unrecognized' | 'selfie_failed_mismatch'>('not_started');
  const [faceCountdown, setFaceCountdown] = useState(5);
  const [faceOrientation, setFaceOrientation] = useState<'front' | 'left' | 'right' | 'done'>('front');

  // Custom interactive simulation scenarios for Face Verification Setup
  const [simulationScenario, setSimulationScenario] = useState<'none' | 'unrecognized' | 'mismatch'>('none');
  const [faceAttemptsLeft, setFaceAttemptsLeft] = useState(5);
  const [showFaceAttemptsModal, setShowFaceAttemptsModal] = useState(false);
  const [faceAttemptsModalMessage, setFaceAttemptsModalMessage] = useState('');

  // Selfie Verification specific states for retry limit & cooldown
  const [selfieAttemptsLeft, setSelfieAttemptsLeft] = useState(5);
  const [showSelfieCooldownModal, setShowSelfieCooldownModal] = useState(false);
  const [selfieCooldownSecondsLeft, setSelfieCooldownSecondsLeft] = useState(900); // 15 mins

  useEffect(() => {
    let interval: any = null;
    if (showSelfieCooldownModal && selfieCooldownSecondsLeft > 0) {
      interval = setInterval(() => {
        setSelfieCooldownSecondsLeft(prev => {
          if (prev <= 1) {
            setShowSelfieCooldownModal(false);
            setSelfieAttemptsLeft(5);
            setFaceVerificationStage('selfie_verification');
            setSelfieStatus('live');
            return 900;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showSelfieCooldownModal, selfieCooldownSecondsLeft]);

  useEffect(() => {
    let interval: any = null;
    if (faceVerificationStage === 'countdown') {
      setFaceCountdown(5);
      setFaceOrientation('front');
      interval = setInterval(() => {
        setFaceCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            setFaceVerificationStage('verifying');
            setFaceOrientation('done');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [faceVerificationStage]);

  useEffect(() => {
    if (faceVerificationStage === 'verifying') {
      const timer = setTimeout(() => {
        if (simulationScenario === 'unrecognized') {
          setFaceAttemptsLeft(prev => {
            const nextAttempts = prev - 1;
            if (nextAttempts <= 0) {
              setFaceAttemptsModalMessage("You reached 5 attempts. Will proceed to Selfie Verification.");
              setShowFaceAttemptsModal(true);
            }
            setFaceVerificationStage('failed_unrecognized');
            setSelfieStatus('failed');
            return nextAttempts;
          });
          addAuditLog('SELFIE_VERIFICATION_FAILED', 'Biometric face match failed: Student not recognized (unrecognized face or random object).');
        } else if (simulationScenario === 'mismatch') {
          setFaceAttemptsLeft(prev => {
            const nextAttempts = prev - 1;
            if (nextAttempts <= 0) {
              setFaceAttemptsModalMessage("You reached 5 attempts. Will proceed to Selfie Verification.");
              setShowFaceAttemptsModal(true);
            }
            setFaceVerificationStage('failed_mismatch');
            setSelfieStatus('failed');
            return nextAttempts;
          });
          addAuditLog('SELFIE_VERIFICATION_FAILED', 'Biometric face match failed: Student face does not match LRN records.');
        } else if (simulateFaceFailure) {
          setFaceVerificationStage('failed');
          setSelfieStatus('failed');
          addAuditLog('SELFIE_VERIFICATION_FAILED', 'Biometric face match failed during automated multi-angle scan.');
        } else {
          setFaceVerificationStage('success');
          setSelfieStatus('success');
          setFormData(prev => ({
            ...prev,
            selfieUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
            selfieFilename: 'captured_biometric_selfie.png'
          }));
          addAuditLog('SELFIE_VERIFICATION_SUCCESS', 'Biometric liveness camera multi-angle verification succeeded.');
          
          // Auto-advance to Step 03 Security after 2 seconds
          const advanceTimer = setTimeout(() => {
            const nextSection = 2;
            setVisitedSections(prev => [...new Set([...prev, nextSection, 1])]);
            setCurrentSection(nextSection);
          }, 2000);
          
          return () => clearTimeout(advanceTimer);
        }
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [faceVerificationStage, simulateFaceFailure, simulationScenario]);

  const isSelfieVerificationActive = currentSection === 1 && [
    'selfie_verification',
    'selfie_checking',
    'selfie_recorded',
    'selfie_failed_unrecognized',
    'selfie_failed_mismatch'
  ].includes(faceVerificationStage);

  // Helpdesk Ticket Form States
  const [ticketContactEmail, setTicketContactEmail] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');
  const [ticketAttachment, setTicketAttachment] = useState('');
  const [ticketFormErrors, setTicketFormErrors] = useState<Record<string, string>>({});
  const [isTicketSubmitted, setIsTicketSubmitted] = useState(false);

  // Password strength checker helper
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, text: 'None', color: 'bg-slate-200', textColor: 'text-slate-400', hasLength: false, hasUpper: false, hasNumber: false, hasSpecial: false };
    let score = 0;
    const hasLength = pwd.length >= 8;
    const hasUpper = /[A-Z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pwd);

    if (hasLength) score++;
    if (hasUpper) score++;
    if (hasNumber) score++;
    if (hasSpecial) score++;

    switch (score) {
      case 1:
        return { score, text: 'Weak', color: 'bg-red-500', textColor: 'text-red-500', hasLength, hasUpper, hasNumber, hasSpecial };
      case 2:
        return { score, text: 'Fair', color: 'bg-amber-500', textColor: 'text-amber-500', hasLength, hasUpper, hasNumber, hasSpecial };
      case 3:
        return { score, text: 'Good', color: 'bg-blue-500', textColor: 'text-blue-500', hasLength, hasUpper, hasNumber, hasSpecial };
      case 4:
        return { score, text: 'Strong', color: 'bg-emerald-500', textColor: 'text-emerald-500', hasLength, hasUpper, hasNumber, hasSpecial };
      default:
        return { score: 0, text: 'None', color: 'bg-slate-200', textColor: 'text-slate-400', hasLength, hasUpper, hasNumber, hasSpecial };
    }
  };

  // Session Timeout timer
  useEffect(() => {
    if (isSubmitted || showHelpdeskTicket || isSessionExpired || showPrivacyConsent) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsSessionExpired(true);
          addAuditLog('SESSION_TIMEOUT', `Student registration session expired due to 30-minute inactivity.`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isSubmitted, showHelpdeskTicket, isSessionExpired, showPrivacyConsent]);

  // Reset timer on user activity
  const resetTimer = () => {
    if (!isSessionExpired && !showHelpdeskTicket && !isSubmitted && !showPrivacyConsent) {
      setTimeLeft(1800);
    }
  };

  // Setup activity listeners
  useEffect(() => {
    const handleUserActivity = () => {
      resetTimer();
    };

    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keypress', handleUserActivity);
    window.addEventListener('click', handleUserActivity);
    window.addEventListener('scroll', handleUserActivity);

    return () => {
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keypress', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('scroll', handleUserActivity);
    };
  }, [isSessionExpired, showHelpdeskTicket, isSubmitted]);

  // Format time (MM:SS)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRestartSession = () => {
    // Reset all form inputs and states
    setFormData({
      firstName: user?.firstName || '',
      middleName: '',
      noMiddleName: false,
      lastName: user?.lastName || '',
      suffix: '',
      dob: '',
      birthPlace: '',
      nationality: 'Filipino',
      gender: '',
      email: user?.email || '',
      confirmEmail: '',
      mobile: '',
      nationalId: '',
      password: '',
      confirmPassword: '',
      fatherName: '',
      fatherOccupation: '',
      fatherMobile: '',
      motherName: '',
      motherOccupation: '',
      motherMobile: '',
      guardianName: '',
      guardianOccupation: '',
      guardianMobile: '',
      siblingsCount: 0,
      fatherMonthlyIncome: '',
      motherMonthlyIncome: '',
      region: '',
      province: '',
      city: '',
      barangay: '',
      street: '',
      zipCode: '',
      currentRegion: '',
      currentProvince: '',
      currentCity: '',
      currentBarangay: '',
      currentStreet: '',
      currentZipCode: '',
      sameAsPermanent: false,
      lrn: '',
      schoolName: '',
      schoolAddress: '',
      academicTrack: '',
      gradeLevel: 'Grade 12',
      gwa: '',
      birthCertificateFilename: '',
      goodMoralFilename: '',
      form137Filename: '',
      form138Filename: '',
      enrollmentCertFilename: '',
      nationalIdFilename: '',
      universities: [],
      courses: [],
      examScheduleId: '',
      photoUrl: '',
      selfieUrl: '',
      selfieFilename: ''
    });
    setIsIdVerified(false);
    const activeCount = (lrnActive ? 1 : 0) + (philsysActive ? 1 : 0) + (manualActive ? 1 : 0);
    if (activeCount === 1) {
      if (lrnActive) setVerificationPath('lrn');
      else if (philsysActive) setVerificationPath('philsys');
      else if (manualActive) setVerificationPath('manual');
    } else {
      setVerificationPath(null);
    }
    setPhilsysInputMode('manual');
    setQrScanning(false);
    setFailedVerificationMethod('');
    setFaceCheckStatus('idle');
    setFaceCheckLog('');
    setFaceVerificationStage('not_started');
    setFaceCountdown(5);
    setFaceOrientation('front');
    setSelfieStatus('idle');
    setCurrentSection(0);
    setVisitedSections([0]);
    setIsSessionExpired(false);
    setShowHelpdeskTicket(false);
    setTimeLeft(1800);
    setErrors({});
    setTicketContactEmail('');
    setTicketDescription('');
    setTicketAttachment('');
    setTicketFormErrors({});
    setIsTicketSubmitted(false);
    addAuditLog('SESSION_RESTARTED', `Student registration session manually restarted.`);
  };

  // Find user's existing application (if any)
  const myApp = applications.find(a => a.userId === user?.id);

  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    middleName: '',
    noMiddleName: false,
    lastName: user?.lastName || '',
    suffix: '',
    dob: '',
    birthPlace: '',
    nationality: 'Filipino',
    gender: '',
    email: user?.email || '',
    confirmEmail: '',
    mobile: '',
    nationalId: '',
    
    // Security
    password: '',
    confirmPassword: '',
    
    // Socio-Economic
    fatherName: '',
    fatherOccupation: '',
    fatherMobile: '',
    motherName: '',
    motherOccupation: '',
    motherMobile: '',
    guardianName: '',
    guardianOccupation: '',
    guardianMobile: '',
    siblingsCount: 0,
    fatherMonthlyIncome: '',
    motherMonthlyIncome: '',

    // Address - Permanent
    region: '',
    province: '',
    city: '',
    barangay: '',
    street: '',
    zipCode: '',

    // Address - Current
    currentRegion: '',
    currentProvince: '',
    currentCity: '',
    currentBarangay: '',
    currentStreet: '',
    currentZipCode: '',
    sameAsPermanent: false,

    // Education
    lrn: '',
    schoolName: '',
    schoolAddress: '',
    academicTrack: '',
    gradeLevel: 'Grade 12',
    gwa: '',

    // Uploads
    birthCertificateFilename: '',
    goodMoralFilename: '',
    form137Filename: '',
    form138Filename: '',
    enrollmentCertFilename: '',
    nationalIdFilename: '',

    // Preferences
    universities: [] as string[],
    courses: [] as string[],
    examScheduleId: '',
    photoUrl: '',
    selfieUrl: '',
    selfieFilename: ''
  });

  const handleBack = () => setCurrentSection(s => Math.max(s - 1, 0));

  const jumpToSection = (index: number) => {
    if (visitedSections.includes(index) || index < currentSection) {
      setCurrentSection(index);
    }
  };

  const autoFillWithPhilSys = (currentFormData: typeof formData) => {
    return {
      ...currentFormData,
      firstName: 'AURELIO',
      middleName: 'MILAN',
      noMiddleName: false,
      lastName: 'DELA CRUZ',
      suffix: '',
      dob: '2008-05-15',
      birthPlace: 'Metro Manila',
      nationality: 'Filipino',
      gender: 'Male',
      email: currentFormData.email || 'aurelio.delacruz@philsys.gov.ph',
      confirmEmail: currentFormData.confirmEmail || currentFormData.email || 'aurelio.delacruz@philsys.gov.ph',
      mobile: '09171234567',
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
      region: 'NCR',
      province: 'Metro Manila',
      city: 'Mandaluyong',
      barangay: 'Brgy. Addition Hills',
      street: '12 Laurel Street, Area 1',
      zipCode: '1550',
      currentRegion: 'NCR',
      currentProvince: 'Metro Manila',
      currentCity: 'Mandaluyong',
      currentBarangay: 'Brgy. Addition Hills',
      currentStreet: '12 Laurel Street, Area 1',
      currentZipCode: '1550',
      sameAsPermanent: true,
      photoUrl: '',
      selfieUrl: '',
      selfieFilename: ''
    };
  };

  const handleVerifyPhilSysQR = (simulateSuccess: boolean) => {
    setIsSubmitting(true);
    setQrScanning(true);
    setQrScanningMessage('Initializing live camera feed...');
    
    setTimeout(() => {
      setQrScanningMessage('Locating ePhilID secure QR border...');
      
      setTimeout(() => {
        setQrScanningMessage('Reading digital signature blocks...');
        
        setTimeout(() => {
          setQrScanning(false);
          setIsSubmitting(false);
          
          if (simulateSuccess) {
            setIsIdVerified(true);
            setFaceCheckStatus('success');
            setSelfieStatus('success');
            setFormData(prev => ({
              ...autoFillWithPhilSys(prev),
              nationalId: prev.nationalId || '1234-5678-9012',
              // School is manual for PhilSys, let's reset it to empty or keep current
              schoolName: prev.schoolName || ''
            }));
            addAuditLog('PHILSYS_QR_VERIFIED', 'Authenticated successfully via PhilSys QR code scan.');
            alert('Identity Authenticated Successfully with PhilSys Registry. Official registry credentials loaded.');
          } else {
            const randomTicket = 'SRN-2026-' + Math.floor(10000 + Math.random() * 90000);
            setSupportReferenceNumber(randomTicket);
            setFailedVerificationMethod('PhilSys QR Code Scan');
            setTicketContactEmail(formData.email || user?.email || '');
            setTicketDescription('QR Scan mismatch during secure token handshake.');
            setTicketAttachment('');
            setIsTicketSubmitted(false);
            setTicketFormErrors({});
            setShowHelpdeskTicket(true);
            addAuditLog('PHILSYS_QR_VERIFICATION_FAILED', `Verification failed during QR scan mismatch. Generated Support Reference Number: ${randomTicket}`);
          }
        }, 1200);
      }, 1000);
    }, 1000);
  };

  const handleVerifyPhilSysManual = () => {
    if (!formData.nationalId) {
      alert('Please enter your PhilSys Card Number (PCN) first.');
      return;
    }
    
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      
      const cleanPcn = formData.nationalId.replace(/-/g, '').trim();
      if (cleanPcn.startsWith('9') || cleanPcn.endsWith('9')) {
        const randomTicket = 'SRN-2026-' + Math.floor(10000 + Math.random() * 90000);
        setSupportReferenceNumber(randomTicket);
        setFailedVerificationMethod('PhilSys PCN Verification');
        setTicketContactEmail(formData.email || user?.email || '');
        setTicketDescription(`Registry query failed for PCN: ${formData.nationalId}`);
        setTicketAttachment('');
        setIsTicketSubmitted(false);
        setTicketFormErrors({});
        setShowHelpdeskTicket(true);
        addAuditLog('PHILSYS_MANUAL_VERIFICATION_FAILED', `Verification failed for PhilSys PCN: ${formData.nationalId}. Generated Support Reference Number: ${randomTicket}`);
      } else {
        setIsIdVerified(true);
        setFaceCheckStatus('success');
        setSelfieStatus('success');
        setFormData(prev => ({
          ...autoFillWithPhilSys(prev),
          nationalId: prev.nationalId,
          schoolName: prev.schoolName || ''
        }));
        addAuditLog('PHILSYS_MANUAL_VERIFIED', `Authenticated successfully via PhilSys PCN: ${formData.nationalId}.`);
        alert('Identity Authenticated Successfully with PhilSys Registry. Official registry credentials loaded.');
      }
    }, 1200);
  };

  const handleVerifyLrnPath = (forcedLrn?: string) => {
    if (lrnAttemptsLeft <= 0) {
      setShowLrnCooldownModal(true);
      return;
    }

    const currentLrn = forcedLrn !== undefined ? forcedLrn : formData.lrn;

    if (!currentLrn) {
      alert('Please enter your 12-digit Learner Reference Number (LRN) first.');
      return;
    }
    
    if (!/^\d{12}$/.test(currentLrn)) {
      setErrors(prev => ({ ...prev, lrn: 'LRN must be exactly 12 numeric digits.' }));
      return;
    }

    if (!formData.dob) {
      setErrors(prev => ({ ...prev, dob: 'Date of Birth is required' }));
      alert('Please enter your Date of Birth.');
      return;
    }
    
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      
      const isAlreadyRegistered = (applications.some(app => app.lrn === currentLrn && app.userId !== user?.id) || currentLrn === '123456789012' || currentLrn === '987654321098') && currentLrn !== '101234567890';
      const isIncorrect = currentLrn.startsWith('9') || currentLrn.endsWith('9') || currentLrn === '901234567899';

      if (isAlreadyRegistered) {
        const nextAttempts = Math.max(0, lrnAttemptsLeft - 1);
        setLrnAttemptsLeft(nextAttempts);
        setErrors(prev => ({ 
          ...prev, 
          lrn: `Input LRN is already registered. Please try again. Number of Attempts left: ${nextAttempts}` 
        }));
        addAuditLog('DEPED_LRN_VERIFICATION_ALREADY_REGISTERED', `LRN already registered: ${currentLrn}. Attempts left: ${nextAttempts}`);
        if (nextAttempts <= 0) {
          setShowLrnCooldownModal(true);
        }
      } else if (isIncorrect) {
        const nextAttempts = Math.max(0, lrnAttemptsLeft - 1);
        setLrnAttemptsLeft(nextAttempts);
        setErrors(prev => ({ 
          ...prev, 
          lrn: `Input LRN is incorrect. Please try again. Number of Attempts left: ${nextAttempts}` 
        }));
        addAuditLog('DEPED_LRN_VERIFICATION_FAILED', `Verification failed for DepEd LRN: ${currentLrn}. Attempts left: ${nextAttempts}`);
        if (nextAttempts <= 0) {
          setShowLrnCooldownModal(true);
        }
      } else {
        setIsIdVerified(true);
        setFaceCheckStatus('success');
        setSelfieStatus('success');
        setFormData(prev => ({
          ...autoFillWithPhilSys(prev),
          lrn: currentLrn,
          dob: prev.dob, // Preserve entered DOB
          schoolName: 'Philippine Science High School - Main Campus',
          schoolAddress: 'Agham Road, Diliman, Quezon City'
        }));
        addAuditLog('DEPED_LRN_VERIFIED', `Authenticated successfully via DepEd LRN: ${currentLrn}.`);
        alert('Identity Authenticated Successfully with DepEd Registry. Official registry credentials and school details loaded.');
        setVisitedSections(prev => [...new Set([...prev, 1])]);
        setCurrentSection(1);
      }
    }, 1200);
  };

  const handleSimulateFaceCheck = (file: File) => {
    setFaceCheckStatus('scanning');
    setFaceCheckLog('Reading binary signature...');
    
    setTimeout(() => {
      setFaceCheckLog('Verifying MIME magic headers (JPEG/PNG magic bytes)...');
      
      setTimeout(() => {
        setFaceCheckLog('Initializing automated local face-detection model (FaceAPI)...');
        
        setTimeout(() => {
          setFaceCheckLog('Analyzing contours and facial coordinates...');
          
          setTimeout(() => {
            if (simulateFaceFailure) {
              setFaceCheckStatus('failed');
              setFaceCheckLog('');
              setFormData(prev => ({ ...prev, photoUrl: '', photoFilename: '' }));
              setErrors(prev => ({ ...prev, photoUrl: "We couldn't detect a face in this photo. Please upload a clear photo of yourself." }));
              addAuditLog('FACE_DETECTION_FAILED', 'Automated face detection scan rejected the uploaded 2x2 photo: no facial coordinates located.');
            } else {
              setFaceCheckStatus('success');
              setFaceCheckLog('Contour validation complete. Single human face identified.');
              setFormData(prev => ({
                ...prev,
                photoUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
                photoFilename: file.name
              }));
              setErrors(prev => {
                const next = { ...prev };
                delete next.photoUrl;
                return next;
              });
              addAuditLog('FACE_DETECTION_SUCCESS', `Automated face detection validated physical photo structures for file: ${file.name}`);
            }
          }, 1000);
        }, 1000);
      }, 1000);
    }, 1000);
  };

  const handleStartCamera = () => {
    setSelfieStatus('opening');
    setSelfieLog('Initializing hardware video device stream...');
    setTimeout(() => {
      setSelfieStatus('live');
      setSelfieLog('');
    }, 1200);
  };

  const handleCaptureSelfie = () => {
    setShutterFlash(true);
    setSelfieStatus('capturing');
    setTimeout(() => {
      setShutterFlash(false);
      setSelfieStatus('analyzing');
      setSelfieLog('Detecting active bounding boxes and matching coordinates...');
      
      setTimeout(() => {
        setSelfieLog('Verifying biological liveness indicators (anti-spoofing)...');
        
        setTimeout(() => {
          if (simulateFaceFailure) {
            setSelfieStatus('failed');
            setSelfieLog('');
            setFormData(prev => ({ ...prev, selfieUrl: '', selfieFilename: '' }));
            setErrors(prev => ({ ...prev, selfieUrl: "Biometric match failed: Face recognition detected low lighting or unexpected rotation." }));
            addAuditLog('SELFIE_VERIFICATION_FAILED', 'Biometric liveness camera selfie verify failed: face match confidence below threshold.');
          } else {
            setSelfieStatus('success');
            setSelfieLog('Facial liveness cross-verification succeeded.');
            setFormData(prev => ({
              ...prev,
              selfieUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
              selfieFilename: 'captured_biometric_selfie.png'
            }));
            setErrors(prev => {
              const next = { ...prev };
              delete next.selfieUrl;
              return next;
            });
            addAuditLog('SELFIE_VERIFICATION_SUCCESS', 'Biometric liveness camera selfie verify succeeded. Match confirmed with uploaded profile.');
          }
        }, 1000);
      }, 1000);
    }, 400);
  };

  const handleCaptureFallbackSelfie = () => {
    setShutterFlash(true);
    setFaceVerificationStage('selfie_checking');
    setSelfieStatus('capturing');
    
    setTimeout(() => {
      setShutterFlash(false);
      setSelfieStatus('analyzing');
      setSelfieLog('Detecting face coordinates and computing confidence metric...');
      
      setTimeout(() => {
        setSelfieLog('Verifying manual biometric liveness parameters...');
        
        setTimeout(() => {
          if (simulationScenario === 'unrecognized') {
            setSelfieAttemptsLeft(prev => {
              const nextAttempts = Math.max(0, prev - 1);
              if (nextAttempts <= 0) {
                setShowSelfieCooldownModal(true);
              }
              setFaceVerificationStage('selfie_failed_unrecognized');
              setSelfieStatus('failed');
              return nextAttempts;
            });
            addAuditLog('SELFIE_VERIFICATION_FALLBACK_FAILED_UNRECOGNIZED', 'Manual selfie backup failed: Student face not recognized.');
          } else if (simulationScenario === 'mismatch' || simulateFaceFailure) {
            setSelfieAttemptsLeft(prev => {
              const nextAttempts = Math.max(0, prev - 1);
              if (nextAttempts <= 0) {
                setShowSelfieCooldownModal(true);
              }
              setFaceVerificationStage('selfie_failed_mismatch');
              setSelfieStatus('failed');
              return nextAttempts;
            });
            addAuditLog('SELFIE_VERIFICATION_FALLBACK_FAILED_MISMATCH', 'Manual selfie backup failed: Identity mismatch with registration records.');
          } else {
            setFaceVerificationStage('selfie_recorded');
            setSelfieStatus('success');
            setFormData(prev => ({
              ...prev,
              selfieUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
              selfieFilename: 'captured_biometric_selfie.png'
            }));
            setErrors(prev => {
              const next = { ...prev };
              delete next.selfieUrl;
              return next;
            });
            addAuditLog('SELFIE_VERIFICATION_FALLBACK_SUCCESS', 'Manual selfie backup captured and verified. Matches LRN biometric signature.');
            
            // Proceed to Step 03 Security after 2 seconds
            setTimeout(() => {
              const nextSection = 2;
              setVisitedSections(prev => [...new Set([...prev, nextSection, 1])]);
              setCurrentSection(nextSection);
            }, 2000);
          }
        }, 1200);
      }, 1200);
    }, 400);
  };

  const validateCurrentSection = () => {
    const newErrors: Record<string, string> = {};
    
    if (currentSection === 0) {
      if (!formData.lrn) {
        newErrors.lrn = 'Learner Reference Number (LRN) is required';
      } else if (!/^\d{12}$/.test(formData.lrn)) {
        newErrors.lrn = 'LRN must be exactly 12 numeric digits.';
      }
      if (!formData.dob) {
        newErrors.dob = 'Date of birth is required';
      }
      if (!isIdVerified) {
        newErrors.general = 'You must verify your LRN records before continuing.';
      }
    }

    if (currentSection === 1) {
      if (!formData.photoUrl) {
        newErrors.photoUrl = 'Student 2x2 Photo ID is required';
        setStep2SubStage('upload_photo');
      } else if (!formData.selfieUrl) {
        newErrors.selfieUrl = 'Live Biometric Selfie Scan is required';
        setStep2SubStage('selfie');
      }
    }

    if (currentSection === 2) {
      if (!formData.email) {
        newErrors.email = 'Email address is required';
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'Invalid email address format';
      }

      if (!formData.mobile) {
        newErrors.mobile = 'Mobile number is required';
      } else if (!/^(09|\+639)\d{9}$/.test(formData.mobile)) {
        newErrors.mobile = 'Mobile number must be a valid 11-digit Philippine mobile number (starting with 09)';
      }

      const password = formData.password;
      const hasLength = password.length >= 8;
      const hasUpper = /[A-Z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

      if (!password) {
        newErrors.password = 'Password is required';
      } else if (!hasLength) {
        newErrors.password = 'Password must be at least 8 characters long';
      } else if (!hasUpper) {
        newErrors.password = 'Password must contain at least one uppercase letter';
      } else if (!hasNumber) {
        newErrors.password = 'Password must contain at least one number';
      } else if (!hasSpecial) {
        newErrors.password = 'Password must contain at least one special character (e.g. !@#$%^&*)';
      }
      
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateCurrentSection()) {
      const nextSection = currentSection + 1;
      setVisitedSections(prev => [...new Set([...prev, nextSection])]);
      setCurrentSection(nextSection);
    }
  };

  const handleSubmit = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      if (isEditingCorrection && myApp) {
        const updatedApp: any = {
          ...myApp,
          ...formData,
          status: 'PENDING',
          submittedAt: new Date().toISOString(),
          gwa: parseFloat(formData.gwa) || 0
        };
        
        setApplications(prev => prev.map(a => a.id === myApp.id ? updatedApp : a));
        addAuditLog('APPLICATION_RESUBMITTED', `Candidate ${myApp.id} resubmitted their application after correction.`);
        setCandidateId(myApp.id);
        setIsSubmitting(false);
        setIsSubmitted(true);
        return;
      }

      const newId = 'CAND-2026-' + Math.floor(1000 + Math.random() * 9000);
      setCandidateId(newId);
      
      const newApp: any = {
        ...formData,
        id: newId,
        userId: user?.id || '',
        status: 'PENDING',
        submittedAt: new Date().toISOString(),
        gwa: parseFloat(formData.gwa) || 0
      };
      
      setApplications(prev => [...prev, newApp]);
      addAuditLog('APPLICATION_SUBMITTED', `Candidate ${newId} submitted their application.`);
      setIsSubmitting(false);
      setIsSubmitted(true);
    }, 2000);
  };

  if (isSubmitted) {
    return (
      <div className="max-w-3xl mx-auto py-12">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="card-philsa text-center py-16 bg-white overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-2 bg-philsa-success" />
          <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
            <CheckCircle className="w-12 h-12" />
          </div>
          <h2 className="text-4xl font-black text-philsa-navy mb-4 tracking-tighter transition-all">Application Submitted</h2>
          <p className="text-philsa-gray mb-10 max-w-sm mx-auto font-medium">
            We have received your application. It is now being reviewed. Please save your Candidate ID.
          </p>
          
          <div className="bg-philsa-bg rounded-3xl p-10 border border-philsa-border mb-10 shadow-sm relative group">
            <p className="text-[10px] font-black text-philsa-gray uppercase tracking-[0.2em] mb-3">Permanent Candidate ID</p>
            <p className="text-4xl font-black text-philsa-red tracking-tight font-mono">{candidateId}</p>
          </div>

          <button 
            onClick={() => window.location.href = '/login'}
            className="btn-primary px-12 py-4 rounded-2xl text-base shadow-xl shadow-philsa-red/20 active:scale-95 transition-all"
          >
            Go to Student Portal Login
          </button>
        </motion.div>
      </div>
    );
  }

  if (myApp && !isEditingCorrection) {
     return (
        <div className="max-w-3xl mx-auto py-12">
          <div className="card-philsa text-center py-16 relative overflow-hidden bg-white shadow-2xl">
            <div className="absolute top-0 left-0 w-full h-1 bg-philsa-navy opacity-20" />
            
            {myApp.status === 'FOR_CORRECTION' && (
              <div className="absolute top-0 right-0 p-4">
                 <span className="px-3 py-1 bg-philsa-red text-white text-[10px] font-black uppercase tracking-widest rounded-full animate-pulse shadow-lg shadow-philsa-red/30">Needs Correction</span>
              </div>
            )}

            <div className={cn(
               "w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner",
               myApp.status === 'FOR_CORRECTION' ? 'bg-philsa-red/10 text-philsa-red' : 
               myApp.status === 'ACCEPTED' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
            )}>
              {myApp.status === 'FOR_CORRECTION' ? <AlertCircle className="w-12 h-12" /> : 
               myApp.status === 'ACCEPTED' ? <CheckCircle className="w-12 h-12" /> : <Save className="w-12 h-12" />}
            </div>

            <h2 className="text-4xl font-black text-philsa-navy mb-4 tracking-tighter capitalize">
              {myApp.status === 'FOR_CORRECTION' ? 'Action Required' : 'Application Tracking'}
            </h2>
            
            <p className="text-philsa-gray mb-10 max-w-sm mx-auto font-medium">
              Reference Candidate ID: <span className="font-mono font-black text-philsa-red tracking-wider">{myApp.id}</span>
            </p>

            <div className="bg-philsa-bg rounded-3xl border border-philsa-border p-8 mb-8 text-left max-w-md mx-auto shadow-sm">
               <div className="flex justify-between items-start mb-8 pb-6 border-b border-philsa-border/50">
                  <div>
                    <p className="text-[10px] font-black text-philsa-gray uppercase tracking-widest mb-1 opacity-60">Application Status</p>
                    <p className={cn("text-2xl font-black tracking-tight", 
                      myApp.status === 'ACCEPTED' ? 'text-green-600' : 
                      myApp.status === 'FOR_CORRECTION' ? 'text-philsa-red' : 
                      'text-philsa-navy'
                    )}>
                      {myApp.status.replace('_', ' ')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-philsa-gray uppercase tracking-widest mb-1 opacity-60">Submitted</p>
                    <p className="text-sm font-bold text-philsa-navy">{new Date(myApp.submittedAt || '').toLocaleDateString()}</p>
                  </div>
               </div>

               {myApp.status === 'FOR_CORRECTION' && (
                 <div className="bg-white p-6 rounded-2xl border-l-4 border-philsa-red shadow-sm mb-8">
                    <p className="text-[10px] font-black text-philsa-red uppercase tracking-widest mb-3 flex items-center gap-2">
                       <Shield className="w-3.5 h-3.5" /> Registry Review Remarks
                    </p>
                    <p className="text-sm text-philsa-navy font-bold leading-relaxed mb-4">
                       "{myApp.adminRemarks || 'Some fields or documents require your immediate attention for processing to continue.'}"
                    </p>
                    {myApp.requiredCorrections && myApp.requiredCorrections.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {myApp.requiredCorrections.map(c => (
                          <span key={c} className="px-2.5 py-1 bg-philsa-red/5 text-philsa-red text-[9px] font-black uppercase rounded-lg border border-philsa-red/20 tracking-wider">
                            {c.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                        ))}
                      </div>
                    )}
                 </div>
               )}

               <div className="space-y-4">
                  {myApp.status === 'FOR_CORRECTION' ? (
                    <button 
                      onClick={() => {
                        setFormData({
                          ...formData,
                          firstName: myApp.firstName,
                          lastName: myApp.lastName,
                          middleName: myApp.middleName || '',
                          noMiddleName: myApp.noMiddleName,
                          dob: myApp.dob,
                          email: myApp.email,
                          confirmEmail: myApp.email,
                          mobile: myApp.mobile,
                          nationalId: myApp.nationalId,
                          birthPlace: myApp.birthPlace,
                          nationality: myApp.nationality,
                          gender: myApp.gender,
                          region: myApp.region,
                          province: myApp.province,
                          city: myApp.city,
                          barangay: myApp.barangay,
                          street: myApp.street,
                          zipCode: myApp.zipCode,
                          lrn: myApp.lrn,
                          schoolName: myApp.schoolName,
                          schoolAddress: myApp.schoolAddress,
                          academicTrack: myApp.academicTrack,
                          gradeLevel: myApp.gradeLevel,
                          gwa: myApp.gwa.toString(),
                          universities: myApp.universities,
                          courses: myApp.courses,
                          examScheduleId: myApp.examScheduleId,
                          password: '', // Password not stored in plain text usually
                          confirmPassword: '',
                          fatherName: myApp.fatherName || '',
                          fatherOccupation: myApp.fatherOccupation || '',
                          fatherMobile: myApp.fatherMobile || '',
                          motherName: myApp.motherName || '',
                          motherOccupation: myApp.motherOccupation || '',
                          motherMobile: myApp.motherMobile || '',
                          guardianName: myApp.guardianName || '',
                          guardianOccupation: myApp.guardianOccupation || '',
                          guardianMobile: myApp.guardianMobile || '',
                          siblingsCount: myApp.siblingsCount || 0,
                          fatherMonthlyIncome: myApp.fatherMonthlyIncome || '',
                          motherMonthlyIncome: myApp.motherMonthlyIncome || '',
                        });
                        setIsIdVerified(true);
                        setIsEditingCorrection(true);
                      }}
                      className="w-full btn-primary py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-xl shadow-philsa-red/20 active:scale-95 transition-all"
                    >
                      <Save className="w-5 h-5" /> Open Form for Correction
                    </button>
                  ) : (
                    <div className="w-full py-4 px-6 bg-philsa-bg rounded-2xl border border-philsa-border flex flex-col items-center justify-center opacity-70">
                       <p className="text-[10px] font-black text-philsa-gray uppercase tracking-widest">Enrollment Status locked</p>
                       <p className="text-xs font-bold text-philsa-navy mt-1 uppercase">Pending Review</p>
                    </div>
                  )}
               </div>
            </div>
            
            <p className="text-[10px] text-philsa-gray font-bold uppercase tracking-widest mt-4">
              Academic Support: <span className="text-philsa-navy font-black">admissions@philsa.ph</span>
            </p>
          </div>
        </div>
     );
  }



  if (isSessionExpired) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }} 
          className="max-w-md w-full bg-white rounded-[2.5rem] border border-slate-200 p-8 text-center shadow-2xl relative overflow-hidden"
        >
          {/* Decorative Background */}
          <div className="absolute top-0 left-0 w-full h-2 bg-philsa-red" />
          
          <div className="w-20 h-20 bg-red-50 text-philsa-red rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-md border border-red-100">
            <Clock className="w-10 h-10 animate-pulse" />
          </div>

          <h2 className="text-2xl font-black text-philsa-navy mb-3 tracking-tight">Registration Session Expired</h2>
          
          <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-6">Security & Integrity Timeout (FR-16)</p>
          
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 text-left mb-8 space-y-3">
            <p className="text-xs text-slate-600 font-bold leading-relaxed">
              For security and data integrity protection, student registration sessions are strictly limited to <span className="text-philsa-navy font-black">30 minutes of inactivity</span>.
            </p>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Because no form input activity was detected on your browser, your secure session has been terminated and cached draft inputs cleared.
            </p>
          </div>

          <button 
            type="button"
            onClick={handleRestartSession}
            className="w-full btn-primary py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg shadow-philsa-red/20 active:scale-95 transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" /> Restart New Registration
          </button>
        </motion.div>
      </div>
    );
  }

  if (showHelpdeskTicket) {
    const handleTicketSubmit = (e: any) => {
      e.preventDefault();
      const errs: Record<string, string> = {};
      if (!ticketContactEmail) {
        errs.email = 'Contact email is required.';
      } else if (!/\S+@\S+\.\S+/.test(ticketContactEmail)) {
        errs.email = 'Invalid email address format.';
      }
      
      if (Object.keys(errs).length > 0) {
        setTicketFormErrors(errs);
        return;
      }
      
      setTicketFormErrors({});
      setIsTicketSubmitted(true);
      alert(`Support Ticket Submitted Successfully!\nYour Support Reference Number (SRN) is: ${supportReferenceNumber}\nPlease keep this reference number for tracking.`);
      addAuditLog('HELPDESK_TICKET_SUBMITTED', `In-app helpdesk ticket created. Reference: ${supportReferenceNumber}, Email: ${ticketContactEmail}, Issue: PhilSys/LRN, ID Entered: PCN: ${formData.nationalId || 'N/A'} / LRN: ${formData.lrn || 'N/A'}`);
      
      addTicket({
        candidateId: user?.candidateId || 'CAND-PENDING',
        candidateName: `${formData.firstName || ''} ${formData.lastName || ''}`.trim() || user?.firstName || 'Pending Student User',
        contactEmail: ticketContactEmail,
        phase: 'REGISTRATION',
        subject: `Registry verification failure (${verificationPath === 'philsys' ? 'PhilSys ID' : verificationPath === 'lrn' ? 'DepEd LRN' : 'Manual Validation'})`,
        description: ticketDescription || 'Registry matching discrepancy encountered.',
        status: 'OPEN',
        priority: 'HIGH',
        attachment: ticketAttachment || undefined,
        deviceDetails: navigator.userAgent,
      });
    };

    const handleAttachScreenshot = () => {
      if (ticketAttachment) {
        setTicketAttachment('');
      } else {
        setTicketAttachment('screenshot_philsys_mismatch_' + Math.floor(1000 + Math.random() * 9000) + '.png');
      }
    };

    return (
      <div className="max-w-4xl mx-auto pb-10 px-4">
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xl relative overflow-hidden"
        >
          {/* Red/Navy Accent Bars */}
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-philsa-navy via-philsa-red to-philsa-navy" />
          
          <div className="flex items-center gap-4 mb-6 border-b border-slate-100 pb-4">
            <div className="w-12 h-12 bg-red-50 text-philsa-red rounded-xl flex items-center justify-center shadow-inner shrink-0">
              <LifeBuoy className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="text-[9px] font-black text-philsa-red uppercase tracking-[0.25em] block mb-0.5">PhilSLA Helpdesk Escalation</span>
              <h2 className="text-xl font-black text-philsa-navy tracking-tight leading-tight animate-fade-in">Registration Issue</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            {/* Left Column: General Info & Reassurance */}
            <div className="md:col-span-5 space-y-5">
              <div className="space-y-3">
                <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                  We were unable to automatically verify your identity details with the Philippine National Identification System (PhilSys Registry) or Department of Education Learner Archive. 
                </p>
              </div>

              {/* Generated Unique Ticket ID card */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col items-center justify-center text-center shadow-xs">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Support Reference Number (SRN)</span>
                <span className="text-2xl font-mono font-black text-philsa-red select-all tracking-wider mb-1">{supportReferenceNumber}</span>
                <p className="text-[9px] text-slate-400 font-bold leading-normal">
                  Auto-generated and tied to your verification failure attempt.
                </p>
              </div>

              {/* General Notice */}
              <div className="p-4 bg-amber-50/70 border border-amber-200/60 rounded-xl">
                <h5 className="text-[9px] font-black text-amber-800 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> General notice
                </h5>
                <p className="text-[11px] text-amber-800 font-semibold leading-relaxed">
                  To help us verify your identity, please have a valid government-issued ID or school-issued document ready when you contact support or proceed with manual registration.
                </p>
              </div>

              {/* Reassurance line */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                  <span className="font-bold text-philsa-navy">Reassurance:</span> Your exam eligibility is not permanently affected; manual review will follow to resolve any registry mismatches.
                </p>
              </div>

              {/* Channels (Email & Phone) */}
              <div className="space-y-3">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Immediate Support Channels</p>
                <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1 hover:border-philsa-navy transition-colors flex items-start gap-3">
                  <div className="p-1.5 bg-red-50 text-philsa-red rounded-lg mt-0.5">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Email Support</span>
                    <span className="text-xs font-black text-philsa-navy block">helpdesk@philsa.gov.ph</span>
                    <span className="text-[9px] text-emerald-700 font-bold uppercase block">Resolution within 24 hours</span>
                  </div>
                </div>
                
                <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1 hover:border-philsa-navy transition-colors flex items-start gap-3">
                  <div className="p-1.5 bg-slate-100 text-philsa-navy rounded-lg mt-0.5">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Hotline Assistance</span>
                    <span className="text-xs font-black text-philsa-navy block">(02) 8123-4567</span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Mon-Fri 8:00 AM - 5:00 PM</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: In-App Ticket Form */}
            <div className="md:col-span-7">
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 sm:p-6">
                <h3 className="text-sm font-black text-philsa-navy uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">
                  Submit In-App Support Ticket
                </h3>
                
                {isTicketSubmitted ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-8 px-4 space-y-4"
                  >
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                      <CheckCircle className="w-8 h-8" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-base font-black text-philsa-navy">Ticket Submitted Successfully</h4>
                      <p className="text-[11px] text-slate-500 font-medium max-w-sm mx-auto leading-relaxed">
                        We have logged your issue under Reference ID <span className="font-bold text-philsa-red">{supportReferenceNumber}</span>. Our validation specialists will contact you at <span className="font-bold text-philsa-navy">{ticketContactEmail}</span>.
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-emerald-100 text-left text-[10px] text-emerald-800 font-bold">
                      ● Status: PENDING MANUAL VERIFICATION (Queue SLA: 4 Hours)
                    </div>
                  </motion.div>
                ) : (
                  <form onSubmit={handleTicketSubmit} className="space-y-4">
                    {/* SRN Field */}
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Support Reference Number</label>
                      <input 
                        type="text" 
                        readOnly 
                        value={supportReferenceNumber} 
                        className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-black text-philsa-red cursor-not-allowed select-all"
                      />
                    </div>

                    {/* Issue Type Field */}
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Issue Type</label>
                      <input 
                        type="text" 
                        readOnly 
                        value="PhilSys/LRN" 
                        className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-600 cursor-not-allowed"
                      />
                    </div>

                    {/* ID Entered Field */}
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">ID Number Entered</label>
                      <input 
                        type="text" 
                        readOnly 
                        value={`PCN: ${formData.nationalId || 'N/A'}  /  LRN: ${formData.lrn || 'N/A'}`} 
                        className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-600 cursor-not-allowed"
                      />
                    </div>

                    {/* Student Email Field */}
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                        Student Contact Email *
                      </label>
                      <input 
                        type="email" 
                        value={ticketContactEmail} 
                        onChange={(e) => {
                          setTicketContactEmail(e.target.value);
                          if (ticketFormErrors.email) {
                            setTicketFormErrors(prev => {
                              const next = { ...prev };
                              delete next.email;
                              return next;
                            });
                          }
                        }} 
                        className={cn(
                          "w-full bg-white border rounded-lg px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-philsa-red/10 focus:border-philsa-red outline-none transition-all",
                          ticketFormErrors.email ? "border-philsa-red bg-red-50 font-bold" : "border-slate-200"
                        )}
                        placeholder="e.g. email@example.com"
                      />
                      {ticketFormErrors.email && (
                        <p className="text-[10px] text-philsa-red font-bold mt-1 pl-1">
                          {ticketFormErrors.email}
                        </p>
                      )}
                    </div>

                    {/* Description (Optional) */}
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Additional details (Optional)</label>
                      <textarea 
                        value={ticketDescription} 
                        onChange={(e) => setTicketDescription(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-philsa-red/10 focus:border-philsa-red outline-none transition-all h-20 resize-none"
                        placeholder="Please describe any error codes or helpful details..."
                      />
                    </div>

                    {/* Screenshot Attachment (Optional) */}
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Optional Screenshot Attachment</label>
                      <div 
                        onClick={handleAttachScreenshot}
                        className={cn(
                          "border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-white",
                          ticketAttachment ? "border-emerald-300 bg-emerald-50/20" : "border-slate-200 bg-white"
                        )}
                      >
                        {ticketAttachment ? (
                          <div className="flex flex-col items-center text-center space-y-1">
                            <CheckCircle className="w-5 h-5 text-emerald-600 animate-bounce" />
                            <span className="text-[10px] font-bold text-emerald-700 uppercase truncate max-w-xs">{ticketAttachment}</span>
                            <span className="text-[8px] font-black text-slate-400 uppercase hover:text-philsa-red transition-colors">Click to remove attachment</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center text-center space-y-1 text-slate-400 group hover:text-slate-600">
                            <Upload className="w-5 h-5" />
                            <span className="text-[10px] font-bold uppercase">Simulate screenshot upload</span>
                            <span className="text-[8px] font-medium text-slate-400">Loads a diagnostic screenshot of the mismatch</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button 
                      type="submit" 
                      className="w-full bg-philsa-red text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-philsa-red-hover active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-philsa-red/10"
                    >
                      <LifeBuoy className="w-3.5 h-3.5" /> Submit Support Ticket
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="mt-8 pt-5 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
            <button 
              type="button" 
              onClick={() => setShowHelpdeskTicket(false)}
              className="px-5 py-3 border border-slate-200 text-slate-500 hover:text-philsa-navy hover:bg-slate-50 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer text-center"
            >
              Back to Form
            </button>
            <button 
              type="button" 
              onClick={handleRestartSession}
              className="flex-1 px-5 py-3 bg-philsa-navy text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md hover:bg-opacity-95 transition-all cursor-pointer text-center flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Restart Registration Session
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (showPrivacyConsent) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-6 sm:py-12 max-w-3xl mx-auto w-full gap-4">
        {isPwaMode && (
          <div className="w-full bg-gradient-to-r from-emerald-600 to-teal-800 text-white rounded-2xl p-4 shadow-md border border-emerald-500/20 text-left animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white shrink-0">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[8px] font-black uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded-full inline-block">PWA Simulator Active</span>
                <p className="text-xs font-bold leading-tight mt-0.5">Mock Standalone Sandbox Enabled</p>
              </div>
            </div>
            <p className="text-[10px] text-emerald-100/90 mt-2 leading-relaxed">
              Accept the data privacy policy below to proceed with your offline-first simulated registration!
            </p>
          </div>
        )}

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }} 
          className="w-full bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xl relative overflow-hidden"
        >
          {/* Decorative Background Accent */}
          <div className="absolute top-0 left-0 w-full h-1.5 bg-[#00563F]" />
          
          <div className="w-12 h-12 bg-emerald-50 text-[#00563F] rounded-xl flex items-center justify-center mb-4 shadow-inner border border-emerald-100/80">
            <Shield className="w-6 h-6" />
          </div>

          <span className="text-[9px] font-black text-[#00563F] uppercase tracking-[0.25em] block mb-0.5">Philippine Secondary Leavers' Assessment (PhilSLA)</span>
          <h2 className="text-xl font-black text-philsa-navy mb-1 tracking-tight">Data Privacy Notice and Consent Form</h2>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-4">Pursuant to the Data Privacy Act of 2012 (Republic Act No. 10173)</p>

          <div className="space-y-4 text-left bg-slate-50 p-5 rounded-2xl border border-slate-100 text-[11px] text-slate-600 font-medium leading-relaxed max-h-[30rem] overflow-y-auto mb-5 scrollbar-thin">
            <div>
              <p className="font-extrabold text-philsa-navy text-xs uppercase mb-1">1. Who is collecting your data</p>
              <p>The [PhilSLA Program Office / implementing agency], as Personal Information Controller, collects and processes your personal information in connection with your application to the Philippine Secondary Leavers' Assessment (PhilSLA).</p>
            </div>

            <div>
              <p className="font-extrabold text-philsa-navy text-xs uppercase mb-1">2. What we collect</p>
              <ul className="list-disc pl-5 space-y-1 mt-1 font-semibold text-slate-700">
                <li>Full name, date of birth, and photo/biometric identification</li>
                <li>Learner Reference Number (LRN) and educational enrollment records</li>
                <li>Account credentials (email address; passwords are stored using industry-standard hashing and are never stored or viewable in plain text)</li>
              </ul>
            </div>

            <div>
              <p className="font-extrabold text-philsa-navy text-xs uppercase mb-1">3. Why we collect it</p>
              <p>Your data is used to: (a) verify your academic identity against the Department of Education Learner Information System and, where applicable, the PhilSys National ID registry; (b) assign testing centers, rooms, and seats; (c) process your admission and eligibility for the assessment; and (d) generate your official results.</p>
            </div>

            <div>
              <p className="font-extrabold text-philsa-navy text-xs uppercase mb-1">4. Legal basis</p>
              <p>Processing is based on your consent and, where applicable, is necessary for the performance of a public function mandated under [cite relevant DepEd/PhilSLA implementing order or law].</p>
            </div>

            <div>
              <p className="font-extrabold text-philsa-navy text-xs uppercase mb-1">5. Who we share it with</p>
              <p>Your data may be disclosed to: the Department of Education (LRN verification), the Philippine Statistics Authority / PhilSys (identity verification), and authorized testing center personnel (for seat assignment and on-site identity check). We do not sell or share your data with any other third party without your separate, explicit consent.</p>
            </div>

            <div>
              <p className="font-extrabold text-philsa-navy text-xs uppercase mb-1">6. How long we keep it</p>
              <p>Your data will be retained for [X years / per DepEd records retention schedule] from the date of your application, after which it will be securely disposed of, unless retention is required by law.</p>
            </div>

            <div>
              <p className="font-extrabold text-philsa-navy text-xs uppercase mb-1">7. How we protect it</p>
              <p>Your data is encrypted in transit (TLS) and at rest (AES-256), access is restricted by role-based permissions, and all access is logged and audited.</p>
            </div>

            <div>
              <p className="font-extrabold text-philsa-navy text-xs uppercase mb-1">8. Your rights</p>
              <p>Under RA 10173, you have the right to be informed, to access, to correct, to object, to erasure or blocking, to data portability, and to file a complaint with the National Privacy Commission. To exercise these rights, contact our Data Protection Officer at [dpo@philsla.gov.ph / contact channel].</p>
            </div>

            <div>
              <p className="font-extrabold text-philsa-navy text-xs uppercase mb-1">9. Consequences of withholding consent</p>
              <p>Consent to this processing is required to proceed with your PhilSLA registration. If you do not consent, you will not be able to complete your application.</p>
            </div>
          </div>

          {/* Interactive Consent Checkbox */}
          <div className="mb-5">
            <label className="flex items-start gap-3 p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 hover:border-emerald-300 transition-colors cursor-pointer text-left group">
              <input 
                type="checkbox" 
                checked={privacyChecked}
                onChange={(e) => setPrivacyChecked(e.target.checked)}
                className="w-5 h-5 mt-0.5 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 shrink-0 cursor-pointer"
              />
              <span className="text-[11px] text-emerald-950 font-semibold leading-relaxed font-sans select-none group-hover:text-emerald-900">
                I have read and understood this Notice, and I consent to the collection and processing of my personal data as described above.
              </span>
            </label>
          </div>

          <div className="flex gap-3">
            <button 
              type="button"
              onClick={() => {
                alert('You must accept the Privacy Notice & Consent Form to register for the PhilSLA General Admission Exam.');
              }}
              className="px-4 py-3 border border-slate-200 text-slate-500 hover:bg-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
            >
              Decline
            </button>
            <button 
              type="button"
              disabled={!privacyChecked}
              onClick={() => {
                setShowPrivacyConsent(false);
                addAuditLog('PRIVACY_POLICY_ACCEPTED', 'Student accepted the Data Privacy Consent Notice at entry.');
                const activeCount = (lrnActive ? 1 : 0) + (philsysActive ? 1 : 0) + (manualActive ? 1 : 0);
                if (activeCount === 1) {
                  if (lrnActive) setVerificationPath('lrn');
                  else if (philsysActive) setVerificationPath('philsys');
                  else if (manualActive) setVerificationPath('manual');
                } else {
                  setVerificationPath(null);
                }
              }}
              className="flex-1 px-5 py-3 bg-[#00563F] hover:bg-[#00402E] disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md active:scale-95 transition-all cursor-pointer text-center"
            >
              I Agree & Accept
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
      {isPwaMode && (
        <div className="mb-6 mt-4 bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 text-white rounded-3xl p-5 shadow-xl shadow-emerald-950/10 border border-emerald-500/20 relative overflow-hidden animate-fade-in">
          {/* Ambient overlay glow */}
          <div className="absolute top-[-50%] right-[-10%] w-[40%] h-[150%] bg-white/5 rounded-full blur-2xl transform rotate-12 pointer-events-none" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white shrink-0 shadow-inner border border-white/10">
                <Smartphone className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[9px] font-black uppercase tracking-widest bg-white/20 px-2.5 py-0.5 rounded-full">Standalone Sandbox</span>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Offline Cached Sync: Active
                  </div>
                </div>
                <h2 className="text-base sm:text-lg font-extrabold tracking-tight mt-1">PhilSA PWA Mode Activated</h2>
                <p className="text-[11px] sm:text-xs text-emerald-100/90 mt-0.5 max-w-2xl leading-normal font-medium">
                  This page mimics a high-performance standalone app session. Caching is fully simulated, storing registration milestones in a secure device SQLite vault for 100% loss prevention.
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
              <a 
                href="/register" 
                className="px-4 py-2 bg-white hover:bg-slate-50 text-emerald-900 text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95 text-center block"
              >
                Exit Simulation
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-philsa-navy mb-2 tracking-tighter leading-none">PhilSA General Admission</h1>
          <p className="text-philsa-gray text-base font-medium">Academic Year 2026-2027 Roster Enrollment</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Real-time Session Timer (FR-16, US-06) */}
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-slate-600 text-xs font-bold shadow-xs">
            <Clock className={cn("w-4 h-4", timeLeft < 180 ? "text-philsa-red animate-pulse" : "text-philsa-navy")} />
            <span>Session Expires in: <span className={cn("font-mono font-black", timeLeft < 180 ? "text-philsa-red animate-pulse" : "text-philsa-navy")}>{formatTime(timeLeft)}</span></span>
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setTimeLeft(0);
                setIsSessionExpired(true);
                addAuditLog('SESSION_TIMEOUT', `Student registration session expired due to simulated inactivity.`);
              }} 
              title="Test/Simulate 30-Minute Timeout"
              className="ml-2 text-[9px] bg-red-50 text-philsa-red hover:bg-philsa-red/10 px-1.5 py-0.5 rounded font-black uppercase transition-all border border-philsa-red/20 cursor-pointer"
            >
              Simulate Timeout
            </button>
          </div>

          {isEditingCorrection ? (
            <div className="flex items-center gap-3">
               <button 
                 onClick={() => setIsEditingCorrection(false)}
                 className="px-6 py-2 bg-philsa-bg border border-philsa-border text-philsa-navy rounded-full text-xs font-black uppercase tracking-widest hover:bg-white transition-all shadow-sm"
               >
                 Discard Changes
               </button>
               <div className="px-6 py-2 bg-philsa-red text-white rounded-full text-xs font-black uppercase tracking-widest shadow-lg shadow-philsa-red/20 animate-pulse">
                 Correction Mode
               </div>
            </div>
          ) : (
            <div className="px-6 py-2 bg-philsa-navy text-white rounded-full text-xs font-black uppercase tracking-widest shadow-lg shadow-philsa-navy/20">
              Admission Cycle: Alpha-2026
            </div>
          )}
        </div>
      </div>

      {/* Advisory Warning Banner if Deactivated */}
      {!isRegActive && (
        <div className="mb-8 p-6 bg-amber-50 border border-amber-200 rounded-[2rem] flex flex-col sm:flex-row sm:items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <Power className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <p className="text-xs font-black text-amber-800 uppercase tracking-widest">Enrollment Forms Suspended</p>
            <p className="text-xs text-amber-600 font-bold mt-1 leading-relaxed">
              The online data entry system is currently undergoing routine calibration. All input fields are locked and temporarily read-only.
            </p>
          </div>
        </div>
      )}

      <div className="mb-8 sticky top-0 bg-philsa-bg/95 backdrop-blur-md z-30 py-3 border-b border-philsa-border/30 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-4 w-full">
           {SECTIONS.map((section, i) => (
             <div key={section} className="flex-1 sm:flex-initial flex items-center gap-2 sm:gap-4">
                <button 
                  type="button"
                  onClick={() => jumpToSection(i)}
                  disabled={!visitedSections.includes(i) && i > currentSection}
                  className={cn(
                    "flex items-center gap-2 sm:gap-3 px-2 py-2 sm:px-5 sm:py-3 rounded-xl sm:rounded-2xl transition-all border-2 text-left disabled:cursor-not-allowed w-full sm:w-auto justify-center sm:justify-start",
                    i === currentSection ? "bg-philsa-red text-white border-philsa-red shadow-lg shadow-philsa-red/10 scale-102 z-10" : 
                    i < currentSection ? "bg-green-50 text-green-700 border-green-100 hover:bg-green-100" : 
                    visitedSections.includes(i) ? "bg-white text-philsa-navy border-philsa-navy/30 hover:border-philsa-red" : "bg-white text-philsa-gray border-philsa-border opacity-50"
                  )}
                >
                   <div className={cn(
                     "w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-black shrink-0",
                     i === currentSection ? "bg-white text-philsa-red" : 
                     i < currentSection ? "bg-green-600 text-white" : "bg-philsa-bg text-philsa-gray"
                   )}>
                      {i < currentSection ? <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : i + 1}
                   </div>
                   <div className="hidden sm:block">
                      <span className="text-[10px] font-black uppercase tracking-widest block leading-none opacity-70">Step 0{i + 1}</span>
                      <span className="text-xs font-black uppercase tracking-widest">
                         {section}
                      </span>
                   </div>
                   {/* Compact Mobile Title */}
                   <span className="text-[10px] font-black uppercase tracking-wider block sm:hidden">
                      {i === 0 ? "Profile" : i === 1 ? "Biometric" : i === 2 ? "Security" : "Review"}
                   </span>
                </button>
                {i < SECTIONS.length - 1 && <div className="flex-1 sm:flex-initial sm:w-8 h-[2px] bg-philsa-border" />}
             </div>
           ))}
        </div>
      </div>

      <div className={cn(
        "card-philsa !p-0 bg-white shadow-xl", 
        (currentSection === 4 || currentSection === 5) ? "overflow-visible" : "overflow-hidden",
        !isRegActive && "pointer-events-none select-none opacity-60"
      )}>
        <div className="p-4 sm:p-6 border-b border-philsa-border bg-philsa-bg/30">
           <h3 className="text-lg sm:text-xl font-extrabold text-philsa-navy tracking-tight">
              {SECTIONS[currentSection]}
           </h3>
           <p className="text-xs sm:text-sm text-philsa-gray font-medium mt-1">Please ensure all required fields (*) are filled out accurately.</p>
        </div>

        <div className="p-4 sm:p-8">
          {currentSection === 0 && (
             <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                <div className="max-w-md mx-auto bg-white rounded-3xl border border-philsa-border p-8 shadow-md space-y-6">
                   <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                      <div className="w-10 h-10 bg-blue-50 text-blue-700 rounded-xl flex items-center justify-center">
                         <School className="w-5 h-5" />
                      </div>
                      <div>
                         <h4 className="text-sm font-black text-philsa-navy uppercase tracking-widest">LRN & Profile Setup</h4>
                         <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">DepEd Learner Verification</p>
                      </div>
                   </div>

                   <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                      Enter your official 12-digit **Learner Reference Number (LRN)** and **Date of Birth** to fetch verified enrollment and identity records from DepEd.
                   </p>

                   <div className="space-y-4">
                      {/* LRN Input */}
                      <div className="space-y-2">
                         <label className="label-philsa text-philsa-gray">Learner Reference Number (LRN) *</label>
                         <input 
                            type="text" 
                            placeholder="e.g. 101234567890" 
                            className="input-philsa font-mono tracking-wider bg-white w-full"
                            value={formData.lrn} 
                            onChange={(e) => {
                               setFormData({...formData, lrn: e.target.value});
                               if (errors.lrn) setErrors(prev => ({...prev, lrn: ''}));
                            }} 
                         />
                         {errors.lrn && <p className="text-xs text-philsa-red font-bold pl-1">{errors.lrn}</p>}
                      </div>

                      {/* DOB Input */}
                      <div className="space-y-2">
                         <label className="label-philsa text-philsa-gray">Date of Birth *</label>
                         <input 
                            type="date" 
                            className="input-philsa w-full font-sans font-bold" 
                            value={formData.dob} 
                            onChange={(e) => {
                               setFormData({...formData, dob: e.target.value});
                               if (errors.dob) setErrors(prev => ({...prev, dob: ''}));
                            }} 
                         />
                         {errors.dob && <p className="text-xs text-philsa-red font-bold pl-1">{errors.dob}</p>}
                      </div>

                      {errors.general && (
                         <p className="text-xs text-philsa-red font-bold pl-1 border-l-2 border-philsa-red py-0.5 mt-1">{errors.general}</p>
                      )}

                      {/* Verify Button */}
                      <button
                         type="button"
                         onClick={() => handleVerifyLrnPath()}
                         className="w-full btn-primary py-3 font-black uppercase text-xs tracking-widest cursor-pointer flex items-center justify-center gap-2 mt-2"
                      >
                         <School className="w-4 h-4" /> Verify & Continue
                      </button>
                   </div>

                   {/* Simulation Controls for ease of testing */}
                   <div className="pt-4 border-t border-slate-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 text-center">Simulation Controls</p>
                      <div className="flex flex-col gap-2">
                         <button 
                            type="button" 
                            onClick={() => {
                               setFormData(prev => ({ ...prev, lrn: '101234567890', dob: '2008-05-15' }));
                               setTimeout(() => handleVerifyLrnPath('101234567890'), 100);
                            }}
                            className="w-full text-[9px] font-black text-emerald-700 hover:bg-emerald-50 border border-emerald-200 rounded-xl py-2 uppercase tracking-widest cursor-pointer text-center"
                         >
                            Simulate Valid Lrn & Dob Match
                         </button>
                         <button 
                            type="button" 
                            onClick={() => {
                               setFormData(prev => ({ ...prev, lrn: '901234567899', dob: '2008-05-15' }));
                               setTimeout(() => handleVerifyLrnPath('901234567899'), 100);
                            }}
                            className="w-full text-[9px] font-black text-red-600 hover:bg-red-50 border border-red-200 rounded-xl py-2 uppercase tracking-widest cursor-pointer text-center"
                         >
                            Simulate Lrn Failure
                         </button>
                      </div>
                   </div>
                </div>
             </motion.div>
          )}

          {currentSection === 1 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
               <div className="max-w-2xl mx-auto space-y-8">
                  <div className="bg-philsa-bg/50 p-8 rounded-3xl border border-philsa-border space-y-6">
                     <div className="flex items-center gap-4 mb-2">
                        <div className="w-12 h-12 rounded-2xl bg-[#8B0D11] flex items-center justify-center text-white shadow-lg">
                           <Camera className="w-6 h-6" />
                        </div>
                        <div>
                           <h4 className="text-lg font-black text-philsa-navy leading-tight">
                             Selfie Verification
                           </h4>
                           <p className="text-xs text-philsa-gray font-medium uppercase tracking-wider">
                             {step2SubStage === 'upload_photo' ? "Upload 2x2 Student Photo" : "Biometric Liveness Selfie Verification"}
                           </p>
                        </div>
                     </div>

                     {/* Sub-steps Segmented Control */}
                     <div className="flex flex-col sm:flex-row items-center justify-center gap-3 border-b border-philsa-border/20 pb-6">
                       <button
                         type="button"
                         onClick={() => setStep2SubStage('upload_photo')}
                         className={cn(
                           "w-full sm:flex-1 py-3 px-4 rounded-2xl border text-center transition-all cursor-pointer",
                           step2SubStage === 'upload_photo'
                             ? "bg-[#8B0D11] text-white border-[#8B0D11] font-black shadow-md"
                             : "bg-white text-slate-500 border-slate-200 font-bold hover:bg-slate-50"
                         )}
                       >
                         <span className="text-[9px] uppercase tracking-wider block opacity-75 mb-0.5">Sub-Step 1</span>
                         <span className="text-xs uppercase tracking-widest font-black">1. Upload 2x2 Photo</span>
                       </button>

                       <button
                         type="button"
                         onClick={() => {
                           if (!formData.photoUrl) {
                             alert('Please upload your 2x2 Student Photo first.');
                             return;
                           }
                           setStep2SubStage('selfie');
                         }}
                         disabled={!formData.photoUrl}
                         className={cn(
                           "w-full sm:flex-1 py-3 px-4 rounded-2xl border text-center transition-all cursor-pointer",
                           step2SubStage === 'selfie'
                             ? "bg-[#8B0D11] text-white border-[#8B0D11] font-black shadow-md"
                             : "bg-white text-slate-500 border-slate-200 font-bold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                         )}
                       >
                         <span className="text-[9px] uppercase tracking-wider block opacity-75 mb-0.5">Sub-Step 2</span>
                         <span className="text-xs uppercase tracking-widest font-black">2. Selfie Verification</span>
                       </button>
                     </div>

                     {step2SubStage === 'upload_photo' && (
                       <div className="space-y-6">
                         <div className="bg-amber-500/5 p-4 rounded-2xl border border-amber-500/10 text-left">
                           <h5 className="text-[10px] font-black text-amber-800 uppercase tracking-widest flex items-center gap-2 mb-1">
                             <AlertTriangle className="w-4 h-4 text-amber-600" /> Upload Requirements
                           </h5>
                           <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wider leading-relaxed">
                             Please upload a recent 2x2 portrait photo with a plain white background. Ensure your face is fully visible and clearly centered.
                           </p>
                         </div>

                         <div className="border-2 border-dashed border-slate-300 hover:border-[#8B0D11]/50 rounded-3xl p-8 text-center transition-all bg-slate-50/50 relative">
                           {formData.photoUrl ? (
                             <div className="space-y-4">
                               <div className="w-40 h-40 mx-auto rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-md relative group">
                                 <img referrerPolicy="no-referrer" src={formData.photoUrl} alt="Uploaded 2x2" className="w-full h-full object-cover" />
                                 <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                                   <button
                                     type="button"
                                     onClick={() => setFormData({ ...formData, photoUrl: '' })}
                                     className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-all cursor-pointer"
                                   >
                                     <Trash2 className="w-5 h-5" />
                                   </button>
                                 </div>
                               </div>
                               <div>
                                 <p className="text-xs font-black text-emerald-600 uppercase tracking-widest flex items-center justify-center gap-1">
                                   <CheckCircle className="w-4 h-4" /> 2x2 Photo Uploaded successfully
                                  </p>
                                 <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Ready for Selfie Verification</p>
                               </div>
                               
                               <button
                                 type="button"
                                 onClick={() => setStep2SubStage('selfie')}
                                 className="px-6 py-2.5 bg-[#8B0D11] hover:bg-[#8B0D11]/90 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md flex items-center gap-2 mx-auto mt-4 cursor-pointer"
                               >
                                 Proceed to Selfie Verification <ChevronRight className="w-3.5 h-3.5" />
                               </button>
                             </div>
                           ) : (
                             <div className="space-y-4">
                               <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto border border-slate-200">
                                 <Upload className="w-8 h-8 text-[#8B0D11]" />
                               </div>
                               <div>
                                 <p className="text-xs font-black text-slate-700 uppercase tracking-wider">Drag and drop your 2x2 Photo here</p>
                                 <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">or click to browse local files (JPG, PNG, max 5MB)</p>
                               </div>
                               <input
                                 type="file"
                                 accept="image/*"
                                 id="student-photo-upload"
                                 className="hidden"
                                 onChange={(e) => {
                                   const file = e.target.files?.[0];
                                   if (file) {
                                     // Simulate file upload setting an Unsplash portrait URL
                                     setFormData({
                                       ...formData,
                                       photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'
                                     });
                                     addAuditLog('PHOTO_UPLOADED', `User uploaded 2x2 Student Photo: ${file.name}`);
                                   }
                                 }}
                               />
                               <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                                 <button
                                   type="button"
                                   onClick={() => document.getElementById('student-photo-upload')?.click()}
                                   className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm cursor-pointer"
                                 >
                                   Select Photo File
                                 </button>
                                 <button
                                   type="button"
                                   onClick={() => {
                                     setFormData({
                                       ...formData,
                                       photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'
                                     });
                                     addAuditLog('PHOTO_UPLOADED_SIMULATED', 'Simulated 2x2 student photo upload.');
                                   }}
                                   className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm flex items-center justify-center gap-1 cursor-pointer"
                                 >
                                   <Activity className="w-3.5 h-3.5" /> Simulate Photo Upload
                                 </button>
                               </div>
                             </div>
                           )}
                         </div>
                         
                         {errors.photoUrl && (
                           <p className="text-xs text-philsa-red font-bold pl-1 mt-1 leading-relaxed border-l-2 border-philsa-red py-0.5 text-center">
                             {errors.photoUrl}
                           </p>
                         )}
                       </div>
                     )}

                     {step2SubStage === 'selfie' && (
                       <div className="space-y-6">
                         {/* Interactive Biometric Simulation Control Panel */}
                         <div className="p-3 bg-slate-50 text-slate-800 rounded-2xl border border-slate-200 space-y-2">
                            <div className="flex items-center justify-between">
                               <h5 className="text-[10px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  Simulation Control
                               </h5>
                               <span className="text-[8px] font-black text-slate-400 px-2 py-0.5 rounded uppercase tracking-wider">
                                  Interactive Testing
                               </span>
                            </div>
                             <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                               {/* Normal Scenario */}
                               <button
                                  type="button"
                                  onClick={() => {
                                     setSimulationScenario('none');
                                     setFaceAttemptsLeft(5);
                                     setErrors(prev => ({ ...prev, selfieUrl: '' }));
                                  }}
                                  className={cn(
                                     "p-2 rounded-xl border text-center transition-all cursor-pointer font-bold text-[9px] uppercase tracking-wider",
                                     simulationScenario === 'none' 
                                        ? "bg-emerald-50 border-emerald-300 text-emerald-800" 
                                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                  )}
                                >
                                  Scenario: Normal Match
                               </button>

                               {/* Scenario 1 */}
                               <button
                                  type="button"
                                  onClick={() => {
                                     setSimulationScenario('unrecognized');
                                     setFaceAttemptsLeft(5);
                                     setErrors(prev => ({ ...prev, selfieUrl: '' }));
                                  }}
                                  className={cn(
                                     "p-2 rounded-xl border text-center transition-all cursor-pointer font-bold text-[9px] uppercase tracking-wider",
                                     simulationScenario === 'unrecognized' 
                                        ? "bg-red-50 border-red-300 text-red-800" 
                                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                  )}
                               >
                                  Scenario 1: No Face
                               </button>

                               {/* Scenario 2 */}
                               <button
                                  type="button"
                                  onClick={() => {
                                     setSimulationScenario('mismatch');
                                     setFaceAttemptsLeft(5);
                                     setErrors(prev => ({ ...prev, selfieUrl: '' }));
                                  }}
                                  className={cn(
                                     "p-2 rounded-xl border text-center transition-all cursor-pointer font-bold text-[9px] uppercase tracking-wider",
                                     simulationScenario === 'mismatch' 
                                        ? "bg-amber-50 border-amber-300 text-amber-800" 
                                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                  )}
                               >
                                  Scenario 2: Mismatch
                               </button>
                            </div>
                         </div>

                         {/* Custom Instructions for Selfie Scan */}
                         <div className="p-5 bg-amber-500/5 rounded-2xl border border-amber-500/10 space-y-3">
                            <h5 className="text-[10px] font-black text-amber-800 uppercase tracking-widest flex items-center gap-2">
                               <AlertTriangle className="w-3.5 h-3.5 text-amber-600 animate-pulse" /> Important Instructions for Selfie Scan
                            </h5>
                            <ul className="space-y-2 text-[10px] text-slate-600 font-bold uppercase tracking-wide leading-relaxed list-none pl-0">
                               <li className="flex items-start gap-2">
                                 <span className="text-amber-600 mt-0.5">•</span>
                                 <span><strong>Bright Lighting is Required:</strong> You must be in a well-lit, bright room. Avoid dark environments or strong backlighting.</span>
                               </li>
                               <li className="flex items-start gap-2">
                                 <span className="text-amber-600 mt-0.5">•</span>
                                 <span><strong>Clear Face Visibility:</strong> Remove hats, sunglasses, caps, face masks, or heavy eyeglasses before capturing.</span>
                               </li>
                               <li className="flex items-start gap-2">
                                 <span className="text-amber-600 mt-0.5">•</span>
                                 <span><strong>Hold Steady & Align:</strong> Center your face inside the camera overlay guide box and hold your device completely still.</span>
                               </li>
                               <li className="flex items-start gap-2">
                                 <span className="text-amber-600 mt-0.5">•</span>
                                 <span><strong>Liveness Detection:</strong> The scanner simulates active bounding box mapping and biological indicators to confirm authentic verification.</span>
                               </li>
                            </ul>
                         </div>

                         {/* Live Biometric Camera Selfie Card */}
                         <div className="pt-2 space-y-3">
                           <label className="label-philsa flex items-center justify-between">
                             <span>Biometric Selfie Verification *</span>
                             <span className="text-[8px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded uppercase tracking-widest flex items-center gap-1">
                               <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping" /> Live Scan
                             </span>
                           </label>

                       {/* NOT STARTED STEP */}
                       {faceVerificationStage === 'not_started' && (
                         <div className="flex flex-col items-center text-center p-8 bg-slate-50 border border-slate-200/60 rounded-3xl shadow-sm">
                           <div className="w-16 h-16 rounded-2xl bg-[#8B0D11]/5 border border-[#8B0D11]/10 shadow-sm flex items-center justify-center mb-4">
                             <Camera className="w-8 h-8 text-[#8B0D11]" />
                           </div>
                           <h4 className="text-sm font-extrabold text-philsa-navy uppercase tracking-wider mb-2">Biometric Verification Required</h4>
                           <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide max-w-sm mb-6 leading-relaxed">
                             To secure your registry identity and ensure academic integrity, please complete the biometric liveness verification scan. Start selfie verification now?
                           </p>
                           <button
                             type="button"
                             onClick={() => {
                               setFaceVerificationStage('camera_ready');
                               setSelfieStatus('opening');
                               setSelfieLog('Initializing camera hardware...');
                               setTimeout(() => {
                                 setSelfieStatus('live');
                                 setSelfieLog('');
                               }, 1200);
                             }}
                             className="px-6 py-3 bg-[#8B0D11] hover:bg-[#8B0D11]/90 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 cursor-pointer animate-pulse"
                           >
                             <Scan className="w-4 h-4" /> Start Selfie Verification
                           </button>
                         </div>
                       )}

                       {/* CAMERA READY STEP */}
                       {faceVerificationStage === 'camera_ready' && (
                         <div className="aspect-square max-w-sm mx-auto w-full border border-[#8B0D11]/30 bg-slate-950 rounded-3xl flex flex-col items-center justify-center transition-all overflow-hidden relative shadow-inner">
                           {selfieStatus === 'opening' ? (
                             <div className="flex flex-col items-center text-center p-4 text-slate-300">
                               <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mb-3" />
                               <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest animate-pulse mb-1">Starting Camera Feed</p>
                               <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">{selfieLog}</p>
                             </div>
                           ) : (
                             <div className="w-full h-full relative flex flex-col items-center justify-center p-4">
                               {/* Video simulation background */}
                               <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(15,23,42,0.4)_0%,rgba(15,23,42,0.9)_100%)] flex items-center justify-center">
                                 {/* Corner marks */}
                                 <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-[#8B0D11] rounded-tl-md" />
                                 <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-[#8B0D11] rounded-tr-md" />
                                 <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-[#8B0D11] rounded-bl-md" />
                                 <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-[#8B0D11] rounded-br-md" />
                                 
                                 {/* Guide box */}
                                 <div className="w-28 h-36 rounded-[50%] border-2 border-dashed border-slate-500/30 flex items-center justify-center animate-pulse" />
                               </div>
                               
                               {/* Telemetry overlays */}
                               <div className="absolute top-3 left-3 flex flex-col font-mono text-[7px] text-emerald-400 gap-0.5">
                                 <span>REC [●] READY</span>
                                 <span>LIGHTING: OPTIMAL</span>
                                </div>
                               
                               {/* Start Facial Recognition Button */}
                               <div className="relative z-10 flex flex-col items-center gap-3 bg-slate-900/95 p-5 rounded-2xl border border-white/10 backdrop-blur-md max-w-[260px] text-center shadow-2xl">
                                 <Camera className="w-6 h-6 text-[#8B0D11] animate-bounce" />
                                 <p className="text-[10px] font-black text-white uppercase tracking-widest">Camera Stream Live</p>
                                 <p className="text-[8px] text-slate-400 font-bold uppercase">Click below to begin the biometric selfie verification scan.</p>
                                 <button
                                   type="button"
                                   onClick={() => setFaceVerificationStage('countdown')}
                                   className="w-full py-2.5 bg-gradient-to-r from-[#8B0D11] to-[#60080B] hover:opacity-95 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-95 cursor-pointer border border-[#8B0D11]/30"
                                 >
                                   Start Selfie Verification?
                                 </button>
                               </div>
                             </div>
                           )}
                         </div>
                       )}

                       {/* COUNTDOWN STEP */}
                        {faceVerificationStage === 'countdown' && (
                          <div className="aspect-square max-w-sm mx-auto w-full border border-amber-500/30 bg-slate-950 rounded-3xl flex flex-col items-center justify-center transition-all overflow-hidden relative shadow-inner">
                            {/* Camera overlay stream background */}
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(15,23,42,0.4)_0%,rgba(15,23,42,0.9)_100%)] flex items-center justify-center">
                              {/* Glowing scan laser line */}
                              <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-amber-500 to-transparent shadow-md shadow-amber-500/50 animate-bounce top-[30%] z-10" style={{ animationDuration: '1.8s' }} />

                              {/* Corner marks */}
                              <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-amber-500 rounded-tl-md" />
                              <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-amber-500 rounded-tr-md" />
                              <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-amber-500 rounded-bl-md" />
                              <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-amber-500 rounded-br-md" />

                              {/* Target Head Guideline */}
                              <div className="w-28 h-36 rounded-[50%] border-2 border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.2)] flex flex-col items-center justify-center relative">
                                <Scan className="w-6 h-6 opacity-30" />
                                <span className="absolute bottom-2 text-[7px] font-mono uppercase tracking-widest bg-slate-950/80 px-1 py-0.5 rounded text-white">
                                  Center Align
                                </span>
                              </div>
                            </div>

                            {/* Center HUD Telemetry with Circular Countdown */}
                            <div className="absolute top-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 z-10">
                              <div className="w-12 h-12 rounded-full border-2 border-amber-500/30 bg-slate-900/90 backdrop-blur-md flex items-center justify-center shadow-lg animate-pulse">
                                <span className="text-lg font-black text-amber-500 font-mono">{faceCountdown}s</span>
                              </div>
                            </div>

                            {/* Bottom instruction prompt */}
                            <div className="absolute bottom-6 inset-x-4 flex justify-center z-10">
                              <div className="bg-slate-900/90 border border-white/10 backdrop-blur-md py-2.5 px-4 rounded-xl text-center shadow-md max-w-[280px]">
                                <p className="text-[10px] font-black uppercase tracking-wider text-white">
                                  Please face front and look directly at the camera
                                </p>
                                <p className="text-[7px] font-bold text-amber-500 uppercase tracking-widest mt-0.5">
                                  Keep your device steady
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* VERIFYING STEP */}
                       {faceVerificationStage === 'verifying' && (
                         <div className="aspect-square max-w-sm mx-auto w-full border border-emerald-500/30 bg-slate-950 rounded-3xl flex flex-col items-center justify-center transition-all overflow-hidden relative shadow-inner">
                           <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.05)_0%,transparent_70%)]" />
                           <div className="relative w-16 h-16 rounded-full border border-slate-800 flex items-center justify-center mb-4 z-10">
                             <div className="absolute inset-0 rounded-full border-t-2 border-emerald-500 animate-spin" />
                             <Scan className="w-6 h-6 text-emerald-500 animate-pulse" />
                           </div>
                           <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest animate-pulse mb-1.5 z-10">Verifying Biometric Scan</p>
                           <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest max-w-[200px] leading-relaxed z-10 text-center">
                             Comparing selfie biometric vectors with DepEd LRN record database...
                           </p>
                         </div>
                       )}

                       {/* SUCCESS STEP */}
                       {faceVerificationStage === 'success' && formData.selfieUrl && (
                         <div className="aspect-square max-w-sm mx-auto w-full border-2 border-green-500 bg-slate-950 rounded-3xl flex flex-col items-center justify-center transition-all overflow-hidden relative shadow-md">
                           <img referrerPolicy="no-referrer" src={formData.selfieUrl} alt="Verified Selfie" className="w-full h-full object-cover opacity-80" />
                           
                           {/* Success badge */}
                           <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-slate-950/60 p-4 flex flex-col justify-between">
                             <div className="flex items-center justify-between">
                               <span className="text-[8px] font-black text-white uppercase tracking-widest bg-emerald-600 border border-emerald-400/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                                 <Check className="w-2.5 h-2.5" /> Biometrics Match
                               </span>
                               <span className="text-[8px] font-black text-white uppercase tracking-widest bg-black/40 backdrop-blur-md px-2 py-0.5 rounded">
                                 Match: 99.8%
                               </span>
                             </div>
                             
                             {/* Big Success Banner "Selfie Recorded" */}
                             <div className="bg-emerald-900/95 border border-emerald-500/30 backdrop-blur-md p-4 rounded-2xl text-center shadow-lg mb-2">
                               <p className="text-xs font-black text-white uppercase tracking-widest flex items-center justify-center gap-1.5">
                                 <ShieldCheck className="w-5 h-5 text-emerald-400 animate-bounce" /> Selfie Recorded
                               </p>
                               <p className="text-[8px] text-emerald-300 font-bold uppercase tracking-wider mt-1">
                                 Proceeding to step 03 security...
                               </p>
                             </div>
                           </div>
                         </div>
                       )}

                       {/* FAILED STEP */}
                       {faceVerificationStage === 'failed' && (
                         <div className="aspect-square max-w-sm mx-auto w-full border-2 border-red-500 bg-red-50/10 rounded-3xl flex flex-col items-center justify-center transition-all overflow-hidden relative p-6">
                           <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 shadow-sm flex items-center justify-center mb-3">
                             <AlertCircle className="w-6 h-6 text-red-600 animate-bounce" />
                           </div>
                           <h4 className="text-xs font-black text-red-700 uppercase tracking-widest mb-1">Selfie Verification Mismatch</h4>
                           <p className="text-[8px] text-slate-500 font-bold max-w-[200px] leading-normal uppercase mb-4 text-center">
                             Automated selfie verification was unable to match biometric indicators with LRN records.
                           </p>
                           <button
                             type="button"
                             onClick={() => {
                               setFaceVerificationStage('camera_ready');
                               setSelfieStatus('live');
                               setFaceCountdown(5);
                               setFaceOrientation('front');
                             }}
                             className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                           >
                             Try Again
                           </button>
                         </div>
                       )}

                       {/* FAILED UNRECOGNIZED STEP */}
                       {faceVerificationStage === 'failed_unrecognized' && (
                         <div className="aspect-square max-w-sm mx-auto w-full border-2 border-red-500 bg-red-50/10 rounded-3xl flex flex-col items-center justify-center transition-all overflow-hidden relative p-6 text-center">
                           <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 shadow-sm flex items-center justify-center mb-3">
                             <AlertCircle className="w-6 h-6 text-red-600 animate-bounce" />
                           </div>
                           <h4 className="text-xs font-black text-red-700 uppercase tracking-widest mb-1">Student Not Recognized</h4>
                           <p className="text-[10px] text-slate-600 font-bold max-w-[240px] leading-normal uppercase mb-4 text-center">
                             Student not recognized. Please try again. Number of Attempts left: <span className="text-[#8B0D11] font-black text-xs font-mono">{faceAttemptsLeft}</span>
                           </p>
                           {faceAttemptsLeft > 0 ? (
                             <button
                               type="button"
                               onClick={() => {
                                 setFaceVerificationStage('countdown');
                                 setSelfieStatus('live');
                                 setFaceCountdown(5);
                                 setFaceOrientation('front');
                               }}
                               className="px-5 py-2.5 bg-[#8B0D11] hover:bg-[#8B0D11]/90 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5 mx-auto"
                             >
                               <RefreshCw className="w-3.5 h-3.5" /> Retry
                             </button>
                           ) : (
                             <div className="text-center space-y-2">
                               <p className="text-[9px] text-red-600 font-black uppercase tracking-widest animate-pulse">
                                 Attempts Exhausted
                                </p>
                               <button
                                 type="button"
                                 onClick={() => setShowFaceAttemptsModal(true)}
                                 className="px-4 py-2 bg-slate-900 text-white text-[8px] font-black uppercase tracking-wider rounded-lg"
                               >
                                 View Action Modal
                               </button>
                             </div>
                           )}
                         </div>
                       )}

                       {/* FAILED MISMATCH STEP */}
                       {faceVerificationStage === 'failed_mismatch' && (
                         <div className="aspect-square max-w-sm mx-auto w-full border-2 border-red-500 bg-red-50/10 rounded-3xl flex flex-col items-center justify-center transition-all overflow-hidden relative p-6 text-center">
                           <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 shadow-sm flex items-center justify-center mb-3">
                             <AlertCircle className="w-6 h-6 text-red-600 animate-bounce" />
                           </div>
                           <h4 className="text-xs font-black text-red-700 uppercase tracking-widest mb-1">Identity Mismatch</h4>
                           <p className="text-[10px] text-slate-600 font-bold max-w-[240px] leading-normal uppercase mb-4 text-center font-sans">
                             Student does not match. Please try again. Number of Attempts left: <span className="text-[#8B0D11] font-black text-xs font-mono">{faceAttemptsLeft}</span>
                           </p>
                           {faceAttemptsLeft > 0 ? (
                             <button
                               type="button"
                               onClick={() => {
                                 setFaceVerificationStage('countdown');
                                 setSelfieStatus('live');
                                 setFaceCountdown(5);
                                 setFaceOrientation('front');
                               }}
                               className="px-5 py-2.5 bg-[#8B0D11] hover:bg-[#8B0D11]/90 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5 mx-auto"
                             >
                               <RefreshCw className="w-3.5 h-3.5" /> Retry
                             </button>
                           ) : (
                             <div className="text-center space-y-2">
                               <p className="text-[9px] text-red-600 font-black uppercase tracking-widest animate-pulse">
                                 Attempts Exhausted
                               </p>
                               <button
                                 type="button"
                                 onClick={() => setShowFaceAttemptsModal(true)}
                                 className="px-4 py-2 bg-slate-900 text-white text-[8px] font-black uppercase tracking-wider rounded-lg"
                               >
                                 View Action Modal
                               </button>
                             </div>
                           )}
                         </div>
                       )}

                       {/* SELFIE FAILED UNRECOGNIZED STEP */}
                       {faceVerificationStage === 'selfie_failed_unrecognized' && (
                         <div className="aspect-square max-w-sm mx-auto w-full border-2 border-red-500 bg-red-50/10 rounded-3xl flex flex-col items-center justify-center transition-all overflow-hidden relative p-6 text-center">
                           <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 shadow-sm flex items-center justify-center mb-3">
                             <AlertCircle className="w-6 h-6 text-red-600 animate-bounce" />
                           </div>
                           <h4 className="text-xs font-black text-red-700 uppercase tracking-widest mb-1">Student Not Recognized</h4>
                           <p className="text-[10px] text-slate-600 font-bold max-w-[240px] leading-normal uppercase mb-4 text-center">
                             Student not recognized. Please try again. Number of Attempts left: <span className="text-[#8B0D11] font-black text-xs font-mono">{selfieAttemptsLeft}</span>
                           </p>
                           {selfieAttemptsLeft > 0 ? (
                             <button
                               type="button"
                               onClick={() => {
                                 setFaceVerificationStage('selfie_verification');
                                 setSelfieStatus('live');
                               }}
                               className="px-5 py-2.5 bg-[#8B0D11] hover:bg-[#8B0D11]/90 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5 mx-auto"
                             >
                               <RefreshCw className="w-3.5 h-3.5" /> Retry
                             </button>
                           ) : (
                             <div className="text-center space-y-2">
                               <p className="text-[9px] text-red-600 font-black uppercase tracking-widest animate-pulse">
                                 Attempts Exhausted
                               </p>
                               <button
                                 type="button"
                                 onClick={() => setShowSelfieCooldownModal(true)}
                                 className="px-4 py-2 bg-slate-900 text-white text-[8px] font-black uppercase tracking-wider rounded-lg"
                               >
                                 View Action Modal
                               </button>
                             </div>
                           )}
                         </div>
                       )}

                       {/* SELFIE FAILED MISMATCH STEP */}
                       {faceVerificationStage === 'selfie_failed_mismatch' && (
                         <div className="aspect-square max-w-sm mx-auto w-full border-2 border-red-500 bg-red-50/10 rounded-3xl flex flex-col items-center justify-center transition-all overflow-hidden relative p-6 text-center">
                           <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 shadow-sm flex items-center justify-center mb-3">
                             <AlertCircle className="w-6 h-6 text-red-600 animate-bounce" />
                           </div>
                           <h4 className="text-xs font-black text-red-700 uppercase tracking-widest mb-1">Identity Mismatch</h4>
                           <p className="text-[10px] text-slate-600 font-bold max-w-[240px] leading-normal uppercase mb-4 text-center font-sans">
                             Student does not match. Please try again. Number of Attempts left: <span className="text-[#8B0D11] font-black text-xs font-mono">{selfieAttemptsLeft}</span>
                           </p>
                           {selfieAttemptsLeft > 0 ? (
                             <button
                               type="button"
                               onClick={() => {
                                 setFaceVerificationStage('selfie_verification');
                                 setSelfieStatus('live');
                               }}
                               className="px-5 py-2.5 bg-[#8B0D11] hover:bg-[#8B0D11]/90 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5 mx-auto"
                             >
                               <RefreshCw className="w-3.5 h-3.5" /> Retry
                             </button>
                           ) : (
                             <div className="text-center space-y-2">
                               <p className="text-[9px] text-red-600 font-black uppercase tracking-widest animate-pulse">
                                 Attempts Exhausted
                                </p>
                               <button
                                 type="button"
                                 onClick={() => setShowSelfieCooldownModal(true)}
                                 className="px-4 py-2 bg-slate-900 text-white text-[8px] font-black uppercase tracking-wider rounded-lg"
                               >
                                 View Action Modal
                               </button>
                             </div>
                           )}
                         </div>
                       )}

                       {/* SELFIE VERIFICATION STEP (FALLBACK CAPTURE) */}
                       {faceVerificationStage === 'selfie_verification' && (
                         <div className="aspect-square max-w-sm mx-auto w-full border border-slate-700 bg-slate-950 rounded-3xl flex flex-col items-center justify-center transition-all overflow-hidden relative shadow-inner">
                           {/* Live video background simulation */}
                           <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(30,41,59,0.3)_0%,rgba(15,23,42,0.95)_100%)] flex items-center justify-center">
                             {/* Glowing scan overlay */}
                             <div className="absolute inset-0 bg-slate-900/10 pointer-events-none" />
                             
                             {/* Corner marks */}
                             <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-amber-500 rounded-tl-md" />
                             <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-amber-500 rounded-tr-md" />
                             <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-amber-500 rounded-bl-md" />
                             <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-amber-500 rounded-br-md" />
                             
                             {/* Guideline Oval (Manual Selfie guide) */}
                             <div className="w-40 h-48 rounded-[50%] border-2 border-dashed border-amber-500/40 flex flex-col items-center justify-center relative animate-pulse">
                               <Scan className="w-8 h-8 opacity-25 text-amber-500" />
                               <span className="absolute bottom-4 text-[8px] font-black uppercase tracking-widest bg-slate-950/80 px-2 py-0.5 rounded text-amber-400 border border-amber-500/20">
                                 Position Face Here
                               </span>
                             </div>
                           </div>

                           {/* Telemetry HUD */}
                           <div className="absolute top-3 left-3 flex flex-col font-mono text-[7px] text-amber-400 gap-0.5 z-10 bg-slate-950/60 p-1.5 rounded border border-white/5 backdrop-blur-xs">
                             <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" /> MANUAL SELFIE STREAM</span>
                             <span>RESOL: 1080P ACTIVE</span>
                             <span>SPOOF SHIELD: ENABLED</span>
                           </div>

                           {/* Shutter Flash effect */}
                           {shutterFlash && (
                             <div className="absolute inset-0 bg-white z-50 animate-fade-out" style={{ animationDuration: '0.4s' }} />
                           )}

                           {/* Capture Control Button Overlay */}
                           <div className="absolute bottom-6 inset-x-4 flex flex-col items-center gap-2 z-10">
                             <p className="text-[8px] font-black uppercase tracking-wider text-white bg-slate-900/90 py-1 px-3 rounded-full border border-white/10 backdrop-blur-md animate-pulse">
                               Keep eyes open and look directly at camera
                             </p>
                             <button
                               type="button"
                               onClick={handleCaptureFallbackSelfie}
                               className="w-full max-w-[220px] py-3 bg-[#8B0D11] hover:bg-[#8B0D11]/90 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl active:scale-95 cursor-pointer border border-[#8B0D11]/30 flex items-center justify-center gap-2"
                             >
                               <Camera className="w-4 h-4" /> Capture Selfie & Verify
                             </button>
                           </div>
                         </div>
                       )}

                       {/* SELFIE VERIFYING/CHECKING STEP */}
                       {faceVerificationStage === 'selfie_checking' && (
                         <div className="aspect-square max-w-sm mx-auto w-full border border-amber-500/30 bg-slate-950 rounded-3xl flex flex-col items-center justify-center transition-all overflow-hidden relative shadow-inner text-center p-6">
                           <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.05)_0%,transparent_70%)]" />
                           <div className="relative w-16 h-16 rounded-full border border-slate-800 flex items-center justify-center mb-4 z-10">
                             <div className="absolute inset-0 rounded-full border-t-2 border-amber-500 animate-spin" />
                             <Scan className="w-6 h-6 text-amber-500 animate-pulse" />
                           </div>
                           <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest animate-pulse mb-1.5 z-10">Checking Student Match...</p>
                           <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest max-w-[220px] leading-relaxed z-10">
                             {selfieLog || "Verifying biological signature against registration records..."}
                           </p>
                         </div>
                       )}

                       {/* SELFIE RECORDED SUCCESS STEP */}
                       {faceVerificationStage === 'selfie_recorded' && formData.selfieUrl && (
                         <div className="aspect-square max-w-sm mx-auto w-full border-2 border-emerald-500 bg-slate-950 rounded-3xl flex flex-col items-center justify-center transition-all overflow-hidden relative shadow-md">
                           <img referrerPolicy="no-referrer" src={formData.selfieUrl} alt="Recorded Selfie" className="w-full h-full object-cover opacity-80" />
                           
                           {/* Success overlay */}
                           <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-slate-950/60 p-4 flex flex-col justify-between">
                             <div className="flex items-center justify-between">
                               <span className="text-[8px] font-black text-white uppercase tracking-widest bg-emerald-600 border border-emerald-400/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                                 <Check className="w-2.5 h-2.5" /> Selfie Match Approved
                               </span>
                               <span className="text-[8px] font-black text-white uppercase tracking-widest bg-black/40 backdrop-blur-md px-2 py-0.5 rounded">
                                 Confidence: 98.4%
                               </span>
                             </div>
                             
                             {/* Big Success Banner "Selfie Recorded" */}
                             <div className="bg-emerald-900/95 border border-emerald-500/30 backdrop-blur-md p-4 rounded-2xl text-center shadow-lg mb-2">
                               <p className="text-xs font-black text-white uppercase tracking-widest flex items-center justify-center gap-1.5">
                                 <ShieldCheck className="w-5 h-5 text-emerald-400 animate-bounce" /> Selfie Recorded
                               </p>
                               <p className="text-[8px] text-emerald-300 font-bold uppercase tracking-wider mt-1 font-sans">
                                 Selfie Verified. Proceeding to step 03 security...
                               </p>
                             </div>
                           </div>
                         </div>
                       )}

                       {/* Verification info message */}
                       {formData.selfieUrl && (
                         <p className="text-[9px] text-emerald-700 font-black uppercase tracking-wider pl-1 mt-1.5 flex items-center gap-1 justify-center">
                           <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Selfie Verification Passed
                         </p>
                       )}

                       {errors.selfieUrl && (
                         <p className="text-xs text-philsa-red font-bold pl-1 mt-1 leading-relaxed border-l-2 border-philsa-red py-0.5 text-center">
                           {errors.selfieUrl}
                         </p>
                       )}
                     </div>
                    </div>
                  )}

                  </div>
               </div>
            </motion.div>
          )}

          {currentSection === 2 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
               <div className="max-w-2xl mx-auto space-y-8">
                  <div className="bg-philsa-bg/50 p-8 rounded-3xl border border-philsa-border space-y-6">
                     <div className="flex items-center gap-4 mb-2">
                        <div className="w-12 h-12 rounded-2xl bg-philsa-navy flex items-center justify-center text-white shadow-lg">
                           <Save className="w-6 h-6" />
                        </div>
                        <div>
                           <h4 className="text-lg font-black text-philsa-navy leading-tight">Security Credentials</h4>
                           <p className="text-xs text-philsa-gray font-medium uppercase tracking-wider">Account Password Establishment</p>
                        </div>
                     </div>

                     <div className="space-y-6">
                        <div className="space-y-2">
                           <label className={cn("label-philsa", errors.email ? "text-philsa-red" : "text-philsa-gray")}>Email Address *</label>
                           <input 
                              type="email" 
                              placeholder="student@email.ph" 
                              className={cn("input-philsa", errors.email && "border-philsa-red bg-philsa-red/5")} 
                              value={formData.email} 
                              onChange={(e) => {
                                 setFormData({...formData, email: e.target.value});
                                 if (errors.email) setErrors(prev => ({...prev, email: ''}));
                              }} 
                           />
                           {errors.email && <p className="text-xs text-philsa-red font-bold pl-1">{errors.email}</p>}
                        </div>

                        <div className="space-y-2">
                           <label className={cn("label-philsa", errors.mobile ? "text-philsa-red" : "text-philsa-gray")}>Mobile Number *</label>
                           <input 
                              type="tel" 
                              placeholder="e.g. 09171234567" 
                              className={cn("input-philsa", errors.mobile && "border-philsa-red bg-philsa-red/5")} 
                              value={formData.mobile} 
                              onChange={(e) => {
                                 setFormData({...formData, mobile: e.target.value});
                                 if (errors.mobile) setErrors(prev => ({...prev, mobile: ''}));
                              }} 
                           />
                           {errors.mobile && <p className="text-xs text-philsa-red font-bold pl-1">{errors.mobile}</p>}
                        </div>


                        <div className="space-y-2">
                           <label className={cn("label-philsa", errors.password ? "text-philsa-red" : "text-philsa-gray")}>Create Password *</label>
                           <input 
                              type="password" 
                              className={cn("input-philsa", errors.password && "border-philsa-red bg-philsa-red/5")} 
                              value={formData.password} 
                              onChange={(e) => {
                                 setFormData({...formData, password: e.target.value});
                                 if (errors.password) setErrors(prev => ({...prev, password: ''}));
                              }} 
                              placeholder="Minimum 8 characters"
                           />
                           {errors.password && <p className="text-xs text-philsa-red font-bold pl-1">{errors.password}</p>}
                        </div>

                        <div className="space-y-2">
                           <label className={cn("label-philsa", errors.confirmPassword ? "text-philsa-red" : "text-philsa-gray")}>Confirm Password *</label>
                           <input 
                              type="password" 
                              className={cn("input-philsa", errors.confirmPassword && "border-philsa-red bg-philsa-red/5")} 
                              value={formData.confirmPassword} 
                              onChange={(e) => {
                                 setFormData({...formData, confirmPassword: e.target.value});
                                 if (errors.confirmPassword) setErrors(prev => ({...prev, confirmPassword: ''}));
                              }} 
                              placeholder="Re-enter to confirm"
                           />
                           {errors.confirmPassword && <p className="text-xs text-philsa-red font-bold pl-1">{errors.confirmPassword}</p>}

                           {/* Password Strength Indicator (FR-15, US-04) moved below confirm password */}
                           {formData.password && (
                             <div className="space-y-2 mt-4 px-1">
                               <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-philsa-gray">
                                 <span>Password Strength:</span>
                                 <span className={cn("font-black uppercase tracking-wider text-xs", getPasswordStrength(formData.password).textColor)}>{getPasswordStrength(formData.password).text}</span>
                               </div>
                               <div className="grid grid-cols-4 gap-1.5 h-1.5">
                                 <div className={cn("h-full rounded-full transition-all duration-300", getPasswordStrength(formData.password).score >= 1 ? getPasswordStrength(formData.password).color : "bg-slate-200")} />
                                 <div className={cn("h-full rounded-full transition-all duration-300", getPasswordStrength(formData.password).score >= 2 ? getPasswordStrength(formData.password).color : "bg-slate-200")} />
                                 <div className={cn("h-full rounded-full transition-all duration-300", getPasswordStrength(formData.password).score >= 3 ? getPasswordStrength(formData.password).color : "bg-slate-200")} />
                                 <div className={cn("h-full rounded-full transition-all duration-300", getPasswordStrength(formData.password).score >= 4 ? getPasswordStrength(formData.password).color : "bg-slate-200")} />
                               </div>
                             </div>
                           )}
                        </div>
                     </div>

                     <div className="p-5 bg-philsa-navy/5 rounded-2xl border border-philsa-navy/10">
                        <h5 className="text-[10px] font-black text-philsa-navy uppercase tracking-widest mb-3 flex items-center gap-2">
                           <Shield className="w-3 h-3" /> Real-time Security Checklist
                        </h5>
                        <ul className="space-y-2.5">
                           {[
                              { label: 'At least 8 characters long', met: getPasswordStrength(formData.password).hasLength },
                              { label: 'Contains at least one uppercase letter (A-Z)', met: getPasswordStrength(formData.password).hasUpper },
                              { label: 'Contains at least one number (0-9)', met: getPasswordStrength(formData.password).hasNumber },
                              { label: 'Contains at least one special character (e.g. !@#$%^&*)', met: getPasswordStrength(formData.password).hasSpecial }
                           ].map(item => (
                              <li key={item.label} className={cn("flex items-center gap-2 text-[11px] font-bold uppercase transition-all duration-300", item.met ? "text-green-600" : "text-philsa-gray/70")}>
                                 <div className={cn("w-4 h-4 rounded-full flex items-center justify-center text-[9px] shrink-0 border transition-all duration-300", item.met ? "bg-green-600 border-green-600 text-white" : "bg-slate-100 border-slate-300 text-transparent")}>
                                    ✓
                                 </div>
                                 {item.label}
                              </li>
                           ))}
                        </ul>
                     </div>
                  </div>
               </div>
            </motion.div>
          )}

          {currentSection === 99 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
               <div className="grid md:grid-cols-3 gap-6">
                  {/* Father Info */}
                  <div className="space-y-4">
                     <div className="flex justify-between items-center pr-1 mb-4 border-l-4 border-philsa-navy pl-4">
                         <h4 className="text-sm font-black text-philsa-navy uppercase tracking-[0.2em]">Father</h4>
                         <label className="flex items-center gap-1.5 cursor-pointer">
                            <input type="checkbox" onChange={(e) => {
                               if(e.target.checked) setFormData({...formData, fatherName: 'N/A', fatherOccupation: 'N/A', fatherMonthlyIncome: 'N/A', fatherMobile: 'N/A'});
                            }} className="rounded border-philsa-border text-philsa-red focus:ring-philsa-red scale-75" />
                            <span className="text-xs font-bold text-philsa-gray uppercase">N/A</span>
                         </label>
                      </div>
                     <div className="space-y-2">
                        <label className="label-philsa">Full Name</label>
                        <input type="text" className="input-philsa" value={formData.fatherName} onChange={(e) => setFormData({...formData, fatherName: e.target.value})} />
                     </div>
                     <div className="space-y-2">
                        <label className="label-philsa">Occupation</label>
                        <input type="text" className="input-philsa" value={formData.fatherOccupation} onChange={(e) => setFormData({...formData, fatherOccupation: e.target.value})} />
                     </div>
                     <div className="space-y-2">
                        <label className="label-philsa">Contact Number</label>
                        <input type="tel" className="input-philsa" value={formData.fatherMobile} onChange={(e) => setFormData({...formData, fatherMobile: e.target.value})} />
                     </div>
                  </div>

                  {/* Mother Info */}
                  <div className="space-y-4">
                     <div className="flex justify-between items-center pr-1 mb-4 border-l-4 border-philsa-red pl-4">
                         <h4 className="text-sm font-black text-philsa-navy uppercase tracking-[0.2em]">Mother</h4>
                         <label className="flex items-center gap-1.5 cursor-pointer">
                            <input type="checkbox" onChange={(e) => {
                               if(e.target.checked) setFormData({...formData, motherName: 'N/A', motherOccupation: 'N/A', motherMonthlyIncome: 'N/A', motherMobile: 'N/A'});
                            }} className="rounded border-philsa-border text-philsa-red focus:ring-philsa-red scale-75" />
                            <span className="text-xs font-bold text-philsa-gray uppercase">N/A</span>
                         </label>
                      </div>
                     <div className="space-y-2">
                        <label className="label-philsa">Full Name</label>
                        <input type="text" className="input-philsa" value={formData.motherName} onChange={(e) => setFormData({...formData, motherName: e.target.value})} />
                     </div>
                     <div className="space-y-2">
                        <label className="label-philsa">Occupation</label>
                        <input type="text" className="input-philsa" value={formData.motherOccupation} onChange={(e) => setFormData({...formData, motherOccupation: e.target.value})} />
                     </div>
                     <div className="space-y-2">
                        <label className="label-philsa">Contact Number</label>
                        <input type="tel" className="input-philsa" value={formData.motherMobile} onChange={(e) => setFormData({...formData, motherMobile: e.target.value})} />
                     </div>
                  </div>

                  {/* Guardian Info */}
                  <div className="space-y-4">
                     <h4 className="text-sm font-black text-philsa-navy uppercase tracking-[0.2em] mb-4 border-l-4 border-philsa-border pl-4">Guardian (Optional)</h4>
                     <div className="space-y-2">
                        <label className="label-philsa">Full Name</label>
                        <input type="text" className="input-philsa" value={formData.guardianName} onChange={(e) => setFormData({...formData, guardianName: e.target.value})} />
                     </div>
                     <div className="space-y-2">
                        <label className="label-philsa">Occupation</label>
                        <input type="text" className="input-philsa" value={formData.guardianOccupation} onChange={(e) => setFormData({...formData, guardianOccupation: e.target.value})} />
                     </div>
                     <div className="space-y-2">
                        <label className="label-philsa">Contact Number</label>
                        <input type="tel" className="input-philsa" value={formData.guardianMobile} onChange={(e) => setFormData({...formData, guardianMobile: e.target.value})} />
                     </div>
                  </div>
               </div>

               <div className="grid md:grid-cols-3 gap-6 pt-8 border-t border-philsa-border">
                  <div className="space-y-2">
                    <label className="label-philsa">Number of Siblings</label>
                    <input type="number" className="input-philsa" value={formData.siblingsCount} onChange={(e) => setFormData({...formData, siblingsCount: parseInt(e.target.value)})} />
                  </div>
                  <div className="space-y-2">
                    <label className="label-philsa">Father Monthly Income *</label>
                    <select className="input-philsa" value={formData.fatherMonthlyIncome} onChange={(e) => setFormData({...formData, fatherMonthlyIncome: e.target.value})}>
                       <option value="">Select Range</option>
                       <option value="P10,000 below">P10,000 below</option>
                       <option value="P10,000 - P20,000">P10,000 - P20,000</option>
                       <option value="P20,000 - P40,000">P20,000 - P40,000</option>
                       <option value="P40,000 - P50,000">P40,000 - P50,000</option>
                       <option value="P50,000+">P50,000+</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="label-philsa">Mother Monthly Income *</label>
                    <select className="input-philsa" value={formData.motherMonthlyIncome} onChange={(e) => setFormData({...formData, motherMonthlyIncome: e.target.value})}>
                       <option value="">Select Range</option>
                       <option value="P10,000 below">P10,000 below</option>
                       <option value="P10,000 - P20,000">P10,000 - P20,000</option>
                       <option value="P20,000 - P40,000">P20,000 - P40,000</option>
                       <option value="P40,000 - P50,000">P40,000 - P50,000</option>
                       <option value="P50,000+">P50,000+</option>
                    </select>
                  </div>
               </div>
            </motion.div>
          )}

          {currentSection === 99 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
               {/* Permanent Address */}
               <div className="space-y-6">
                  <div className="flex items-center gap-3 border-l-4 border-philsa-navy pl-4">
                     <h4 className="text-sm font-black text-philsa-navy uppercase tracking-[0.2em]">Permanent Address</h4>
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                     <div className="space-y-2">
                        <label className="label-philsa">Region *</label>
                        <select 
                           className="input-philsa" 
                           value={formData.region} 
                           onChange={(e) => {
                              const val = e.target.value;
                              setFormData(prev => ({
                                 ...prev,
                                 region: val,
                                 province: '',
                                 city: '',
                                 barangay: ''
                              }));
                           }}
                        >
                           <option value="">Select Region</option>
                           <option value="NCR">NCR</option>
                           <option value="Region III">Region III</option>
                           <option value="Region IV-A">Region IV-A</option>
                        </select>
                     </div>
                     <div className="space-y-2">
                        <label className="label-philsa">Province *</label>
                        <select 
                           className="input-philsa" 
                           value={formData.province} 
                           disabled={!formData.region}
                           onChange={(e) => {
                              const val = e.target.value;
                              setFormData(prev => ({
                                 ...prev,
                                 province: val,
                                 city: '',
                                 barangay: ''
                              }));
                           }}
                        >
                           <option value="">Select Province</option>
                           {GEOGRAPHY_DATA.find(r => r.region === formData.region)?.provinces.map(p => (
                              <option key={p.name} value={p.name}>{p.name}</option>
                           ))}
                        </select>
                     </div>
                     <div className="space-y-2">
                        <label className="label-philsa">City/Municipality *</label>
                        <select 
                           className="input-philsa" 
                           value={formData.city} 
                           disabled={!formData.province}
                           onChange={(e) => {
                              const val = e.target.value;
                              setFormData(prev => ({
                                 ...prev,
                                 city: val,
                                 barangay: '',
                                 zipCode: val === 'Mandaluyong' ? '1550' : prev.zipCode
                              }));
                           }}
                        >
                           <option value="">Select City/Municipality</option>
                           {GEOGRAPHY_DATA.find(r => r.region === formData.region)
                              ?.provinces.find(p => p.name === formData.province)
                              ?.cities.map(c => (
                                 <option key={c.name} value={c.name}>{c.name}</option>
                              ))}
                        </select>
                     </div>
                     <div className="space-y-2">
                        <label className="label-philsa">Barangay *</label>
                        <select 
                           className="input-philsa" 
                           value={formData.barangay} 
                           disabled={!formData.city}
                           onChange={(e) => setFormData({...formData, barangay: e.target.value})}
                        >
                           <option value="">Select Barangay</option>
                           {GEOGRAPHY_DATA.find(r => r.region === formData.region)
                              ?.provinces.find(p => p.name === formData.province)
                              ?.cities.find(c => c.name === formData.city)
                              ?.barangays.map(b => (
                                 <option key={b} value={b}>{b}</option>
                              ))}
                        </select>
                     </div>
                     <div className="md:col-span-2 space-y-2">
                        <label className="label-philsa">Street Address *</label>
                        <input type="text" className="input-philsa" value={formData.street} onChange={(e) => setFormData({...formData, street: e.target.value})} />
                     </div>
                     <div className="space-y-2">
                        <label className="label-philsa">ZIP Code *</label>
                        <input type="text" className="input-philsa" value={formData.zipCode} onChange={(e) => setFormData({...formData, zipCode: e.target.value})} />
                     </div>
                  </div>
               </div>

               {/* Current Address */}
               <div className="space-y-6 pt-10 border-t border-philsa-border">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-4 border-philsa-red pl-4">
                     <h4 className="text-sm font-black text-philsa-navy uppercase tracking-[0.2em]">Current Address</h4>
                     <label className="flex items-center gap-3 p-3 bg-white border border-philsa-border rounded-xl cursor-pointer hover:border-philsa-red transition-all shadow-sm">
                        <input 
                           type="checkbox" 
                           className="w-5 h-5 rounded border-philsa-border text-philsa-red focus:ring-philsa-red"
                           checked={formData.sameAsPermanent}
                           onChange={(e) => {
                              const checked = e.target.checked;
                              if (checked) {
                                 setFormData({
                                    ...formData,
                                    sameAsPermanent: true,
                                    currentRegion: formData.region,
                                    currentProvince: formData.province,
                                    currentCity: formData.city,
                                    currentBarangay: formData.barangay,
                                    currentStreet: formData.street,
                                    currentZipCode: formData.zipCode
                                 });
                              } else {
                                 setFormData({...formData, sameAsPermanent: false});
                              }
                           }}
                        />
                        <span className="text-[10px] font-black text-philsa-navy uppercase tracking-widest">Same as Permanent Address</span>
                     </label>
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                     <div className="space-y-2">
                        <label className={cn("label-philsa", errors.currentRegion && "text-philsa-red")}>Region *</label>
                        <select 
                           className="input-philsa" 
                           value={formData.currentRegion} 
                           onChange={(e) => {
                              const val = e.target.value;
                              setFormData(prev => ({
                                 ...prev,
                                 currentRegion: val,
                                 currentProvince: '',
                                 currentCity: '',
                                 currentBarangay: '',
                                 sameAsPermanent: false
                              }));
                           }}
                        >
                           <option value="">Select Region</option>
                           <option value="NCR">NCR</option>
                           <option value="Region III">Region III</option>
                           <option value="Region IV-A">Region IV-A</option>
                        </select>
                     </div>
                     <div className="space-y-2">
                        <label className="label-philsa">Province *</label>
                        <select 
                           className="input-philsa" 
                           value={formData.currentProvince} 
                           disabled={!formData.currentRegion}
                           onChange={(e) => {
                              const val = e.target.value;
                              setFormData(prev => ({
                                 ...prev,
                                 currentProvince: val,
                                 currentCity: '',
                                 currentBarangay: '',
                                 sameAsPermanent: false
                              }));
                           }}
                        >
                           <option value="">Select Province</option>
                           {GEOGRAPHY_DATA.find(r => r.region === formData.currentRegion)?.provinces.map(p => (
                              <option key={p.name} value={p.name}>{p.name}</option>
                           ))}
                        </select>
                     </div>
                     <div className="space-y-2">
                        <label className={cn("label-philsa", errors.currentCity && "text-philsa-red")}>City/Municipality *</label>
                        <select 
                           className="input-philsa" 
                           value={formData.currentCity} 
                           disabled={!formData.currentProvince}
                           onChange={(e) => {
                              const val = e.target.value;
                              setFormData(prev => ({
                                 ...prev,
                                 currentCity: val,
                                 currentBarangay: '',
                                 currentZipCode: val === 'Mandaluyong' ? '1550' : prev.currentZipCode,
                                 sameAsPermanent: false
                              }));
                           }}
                        >
                           <option value="">Select City/Municipality</option>
                           {GEOGRAPHY_DATA.find(r => r.region === formData.currentRegion)
                              ?.provinces.find(p => p.name === formData.currentProvince)
                              ?.cities.map(c => (
                                 <option key={c.name} value={c.name}>{c.name}</option>
                              ))}
                        </select>
                     </div>
                     <div className="space-y-2">
                        <label className="label-philsa">Barangay *</label>
                        <select 
                           className="input-philsa" 
                           value={formData.currentBarangay} 
                           disabled={!formData.currentCity}
                           onChange={(e) => setFormData({...formData, currentBarangay: e.target.value, sameAsPermanent: false})}
                        >
                           <option value="">Select Barangay</option>
                           {GEOGRAPHY_DATA.find(r => r.region === formData.currentRegion)
                              ?.provinces.find(p => p.name === formData.currentProvince)
                              ?.cities.find(c => c.name === formData.currentCity)
                              ?.barangays.map(b => (
                                 <option key={b} value={b}>{b}</option>
                              ))}
                        </select>
                     </div>
                     <div className="md:col-span-2 space-y-2">
                        <label className="label-philsa">Street Address *</label>
                        <input type="text" className="input-philsa" value={formData.currentStreet} onChange={(e) => setFormData({...formData, currentStreet: e.target.value, sameAsPermanent: false})} />
                     </div>
                     <div className="space-y-2">
                        <label className="label-philsa">ZIP Code *</label>
                        <input type="text" className="input-philsa" value={formData.currentZipCode} onChange={(e) => setFormData({...formData, currentZipCode: e.target.value, sameAsPermanent: false})} />
                     </div>
                  </div>
               </div>
            </motion.div>
          )}

          {currentSection === 99 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
               <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="label-philsa">Learner Reference Number (LRN) *</label>
                    <input type="text" className="input-philsa" value={formData.lrn} onChange={(e) => setFormData({...formData, lrn: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="label-philsa">General Weighted Average (GWA) *</label>
                    <input type="text" placeholder="e.g. 92.5" className="input-philsa" value={formData.gwa} onChange={(e) => setFormData({...formData, gwa: e.target.value})} />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="label-philsa">School Name *</label>
                    <input type="text" className="input-philsa" value={formData.schoolName} onChange={(e) => setFormData({...formData, schoolName: e.target.value})} />
                  </div>

                  <div className="space-y-2">
                    <label className="label-philsa">Academic Track *</label>
                    <select className="input-philsa" value={formData.academicTrack} onChange={(e) => setFormData({...formData, academicTrack: e.target.value})}>
                       <option value="">Select Track</option>
                       <option value="STEM">STEM</option>
                       <option value="ABM">ABM</option>
                       <option value="HUMSS">HUMSS</option>
                       <option value="GAS">GAS</option>
                       <option value="TVL">TVL</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="label-philsa">Grade Level *</label>
                    <select className="input-philsa" value={formData.gradeLevel} onChange={(e) => setFormData({...formData, gradeLevel: e.target.value})}>
                       <option value="Grade 12">Grade 12</option>
                       <option value="Grade 11">Grade 11 (Accelerated)</option>
                    </select>
                  </div>
               </div>
               <div className="pt-8 border-t border-philsa-border">
                  <h4 className="text-sm font-black text-philsa-navy uppercase tracking-widest mb-4 font-sans text-center">Required Documentation *</h4>
                  <p className="text-xs text-philsa-gray mb-6 font-medium text-center max-w-md mx-auto">Please select a document type below and upload the corresponding file. Only at least one verified document is required for submission.</p>
                  
                  <div className="max-w-xl mx-auto space-y-6">
                     <div className="space-y-4">
                        <div className="space-y-2">
                           <label className="label-philsa">Select Document Type to Upload *</label>
                           <select 
                              className="input-philsa font-sans font-bold text-sm" 
                              value={selectedDocType} 
                              onChange={(e) => setSelectedDocType(e.target.value as any)}
                           >
                              <option value="form137">Form 137 (Permanent Academic Record)</option>
                              <option value="form138">Form 138 (Report Card)</option>
                              <option value="goodMoral">Certificate of Good Moral Character</option>
                              <option value="enrollmentCert">Certificate of Enrollment</option>
                           </select>
                        </div>

                        {/* Single Premium File Upload Area */}
                        <div className="space-y-3">
                           <div className="flex items-center justify-between">
                              <label className="text-[10px] font-black uppercase tracking-widest text-philsa-gray">
                                 {selectedDocType === 'form137' && "Form 137 File *"}
                                 {selectedDocType === 'form138' && "Form 138 File *"}
                                 {selectedDocType === 'goodMoral' && "Good Moral Character Cert *"}
                                 {selectedDocType === 'enrollmentCert' && "Certificate of Enrollment *"}
                              </label>
                              {((selectedDocType === 'form137' && formData.form137Filename) ||
                                (selectedDocType === 'form138' && formData.form138Filename) ||
                                (selectedDocType === 'goodMoral' && formData.goodMoralFilename) ||
                                (selectedDocType === 'enrollmentCert' && formData.enrollmentCertFilename)) && (
                                 <button 
                                    onClick={() => {
                                       if (selectedDocType === 'form137') setFormData({...formData, form137Filename: ''});
                                       if (selectedDocType === 'form138') setFormData({...formData, form138Filename: ''});
                                       if (selectedDocType === 'goodMoral') setFormData({...formData, goodMoralFilename: ''});
                                       if (selectedDocType === 'enrollmentCert') setFormData({...formData, enrollmentCertFilename: ''});
                                    }} 
                                    className="text-[9px] font-black text-philsa-red uppercase hover:underline"
                                 >
                                    Remove
                                 </button>
                              )}
                           </div>
                           <div 
                              onClick={() => {
                                 if (selectedDocType === 'form137') setFormData({...formData, form137Filename: 'F137_DelaCruz.pdf'});
                                 if (selectedDocType === 'form138') setFormData({...formData, form138Filename: 'F138_DelaCruz.pdf'});
                                 if (selectedDocType === 'goodMoral') setFormData({...formData, goodMoralFilename: 'GOODMORAL_DelaCruz.pdf'});
                                 if (selectedDocType === 'enrollmentCert') setFormData({...formData, enrollmentCertFilename: 'ENROLL_DelaCruz.pdf'});
                              }}
                              className={cn(
                                 "p-8 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center transition-all cursor-pointer group bg-philsa-bg",
                                 ((selectedDocType === 'form137' && formData.form137Filename) ||
                                  (selectedDocType === 'form138' && formData.form138Filename) ||
                                  (selectedDocType === 'goodMoral' && formData.goodMoralFilename) ||
                                  (selectedDocType === 'enrollmentCert' && formData.enrollmentCertFilename)) 
                                  ? "border-green-400 bg-green-50/50" 
                                  : "border-philsa-border hover:border-philsa-navy/30"
                              )}
                           >
                              <FileUp className={cn(
                                 "w-8 h-8 mb-3", 
                                 ((selectedDocType === 'form137' && formData.form137Filename) ||
                                  (selectedDocType === 'form138' && formData.form138Filename) ||
                                  (selectedDocType === 'goodMoral' && formData.goodMoralFilename) ||
                                  (selectedDocType === 'enrollmentCert' && formData.enrollmentCertFilename)) 
                                  ? "text-green-600" 
                                  : "text-philsa-gray group-hover:text-philsa-red"
                              )} />
                              <span className="text-[10px] font-black text-philsa-navy uppercase tracking-widest text-center">
                                 {selectedDocType === 'form137' && (formData.form137Filename || 'Select Form 137')}
                                 {selectedDocType === 'form138' && (formData.form138Filename || 'Select Form 138')}
                                 {selectedDocType === 'goodMoral' && (formData.goodMoralFilename || 'Select Good Moral Cert')}
                                 {selectedDocType === 'enrollmentCert' && (formData.enrollmentCertFilename || 'Select Certificate')}
                               </span>
                               <p className="text-[9px] text-philsa-gray font-bold mt-1 uppercase">Official Digitized Document (PDF/JPG)</p>
                           </div>
                        </div>


                     </div>
                  </div>
                  {errors.documentation && (
                     <p className="text-xs text-philsa-red font-bold mt-6 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" /> {errors.documentation}
                     </p>
                  )}
                  {/* Overwritten standard uploaders */}
                  <div className="hidden">
                     {/* Good Moral */}
                     <div className="space-y-3">
                        <div className="flex items-center justify-between">
                           <label className={cn("text-[10px] font-black uppercase tracking-widest", errors.goodMoral ? "text-philsa-red" : "text-philsa-gray")}>Good Moral Conduct</label>
                           {formData.goodMoralFilename && (
                              <button onClick={() => setFormData({...formData, goodMoralFilename: ''})} className="text-[9px] font-black text-philsa-red uppercase">Remove</button>
                           )}
                        </div>
                        <div 
                           onClick={() => setFormData({...formData, goodMoralFilename: 'MORAL_CERT.pdf'})}
                           className={cn(
                              "p-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer group",
                              formData.goodMoralFilename ? "border-green-400 bg-green-50" : "border-philsa-border bg-philsa-bg hover:border-philsa-red/30"
                           )}
                        >
                           <FileUp className={cn("w-6 h-6 mb-2", formData.goodMoralFilename ? "text-green-600" : "text-philsa-gray group-hover:text-philsa-red")} />
                           <p className="text-[10px] font-black text-philsa-navy uppercase">{formData.goodMoralFilename || 'Upload Document'}</p>
                        </div>
                     </div>

                     {/* Form 137 */}
                     <div className="space-y-3">
                        <div className="flex items-center justify-between">
                           <label className={cn("text-[10px] font-black uppercase tracking-widest", errors.form137 ? "text-philsa-red" : "text-philsa-gray")}>Form 137</label>
                           {formData.form137Filename && (
                              <button onClick={() => setFormData({...formData, form137Filename: ''})} className="text-[9px] font-black text-philsa-red uppercase">Remove</button>
                           )}
                        </div>
                        <div 
                           onClick={() => setFormData({...formData, form137Filename: 'FORM_137.pdf'})}
                           className={cn(
                              "p-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer group",
                              formData.form137Filename ? "border-green-400 bg-green-50" : "border-philsa-border bg-philsa-bg hover:border-philsa-red/30"
                           )}
                        >
                           <FileUp className={cn("w-6 h-6 mb-2", formData.form137Filename ? "text-green-600" : "text-philsa-gray group-hover:text-philsa-red")} />
                           <p className="text-[10px] font-black text-philsa-navy uppercase">{formData.form137Filename || 'Upload Document'}</p>
                        </div>
                     </div>

                     {/* Form 138 */}
                     <div className="space-y-3">
                        <div className="flex items-center justify-between">
                           <label className={cn("text-[10px] font-black uppercase tracking-widest", errors.form138 ? "text-philsa-red" : "text-philsa-gray")}>Form 138</label>
                           {formData.form138Filename && (
                              <button onClick={() => setFormData({...formData, form138Filename: ''})} className="text-[9px] font-black text-philsa-red uppercase">Remove</button>
                           )}
                        </div>
                        <div 
                           onClick={() => setFormData({...formData, form138Filename: 'FORM_138.pdf'})}
                           className={cn(
                              "p-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer group",
                              formData.form138Filename ? "border-green-400 bg-green-50" : "border-philsa-border bg-philsa-bg hover:border-philsa-red/30"
                           )}
                        >
                           <FileUp className={cn("w-6 h-6 mb-2", formData.form138Filename ? "text-green-600" : "text-philsa-gray group-hover:text-philsa-red")} />
                           <p className="text-[10px] font-black text-philsa-navy uppercase">{formData.form138Filename || 'Upload Document'}</p>
                        </div>
                     </div>

                     {/* Enrollment Cert */}
                     <div className="space-y-3">
                        <div className="flex items-center justify-between">
                           <label className={cn("text-[10px] font-black uppercase tracking-widest", errors.enrollmentCert ? "text-philsa-red" : "text-philsa-gray")}>Cert. of Enrollment</label>
                           {formData.enrollmentCertFilename && (
                              <button onClick={() => setFormData({...formData, enrollmentCertFilename: ''})} className="text-[9px] font-black text-philsa-red uppercase">Remove</button>
                           )}
                        </div>
                        <div 
                           onClick={() => setFormData({...formData, enrollmentCertFilename: 'ENROLLMENT_CERT.pdf'})}
                           className={cn(
                              "p-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer group",
                              formData.enrollmentCertFilename ? "border-green-400 bg-green-50" : "border-philsa-border bg-philsa-bg hover:border-philsa-red/30"
                           )}
                        >
                           <FileUp className={cn("w-6 h-6 mb-2", formData.enrollmentCertFilename ? "text-green-600" : "text-philsa-gray group-hover:text-philsa-red")} />
                           <p className="text-[10px] font-black text-philsa-navy uppercase">{formData.enrollmentCertFilename || 'Upload Document'}</p>
                        </div>
                     </div>
                  </div>
                  {(errors.goodMoral || errors.form137 || errors.form138 || errors.enrollmentCert) && (
                     <p className="text-xs text-philsa-red font-bold mt-6 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" /> Please upload all required educational documents before proceeding.
                     </p>
                  )}
               </div>
            </motion.div>
          )}

          {currentSection === 99 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
               <div className="space-y-10">
                  <div>
                    <h4 className="text-sm font-black text-philsa-navy uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                       <School className="w-5 h-5 text-philsa-red" /> Institutional Preferences
                    </h4>
                    <p className="text-xs text-philsa-gray font-medium mb-8">Please establish your Priority Admissions track. You may select up to 3 university-program pairings.</p>
                    
                    <div className="space-y-4">
                       {[0, 1, 2].map((index) => (
                          <div key={index} className={cn(
                             "p-6 rounded-[2rem] border-2 transition-all relative overflow-visible",
                             formData.universities[index] ? "border-philsa-navy/20 bg-white shadow-sm" : "border-philsa-border bg-philsa-bg/50"
                          )}>
                             <div className="flex flex-col md:flex-row gap-6 items-start">
                                <div className="shrink-0 pt-2">
                                   <div className={cn(
                                      "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black",
                                      formData.universities[index] ? "bg-philsa-navy text-white" : "bg-philsa-border text-philsa-gray"
                                   )}>
                                      {index + 1}
                                   </div>
                                </div>
                                
                                <div className="flex-1 grid md:grid-cols-2 gap-6 w-full">
                                   {/* University Selection */}
                                   <div className="space-y-2">
                                      <label className="text-[10px] font-black text-philsa-gray uppercase tracking-widest flex items-center gap-1.5">
                                         <School className="w-3 h-3 text-philsa-navy" /> Preferred University {index + 1}
                                      </label>
                                      <div className="relative">
                                         <input 
                                            type="text"
                                            placeholder="Type university name..."
                                            className={cn(
                                               "input-philsa !py-4 font-bold font-sans",
                                               errors.universities && index === 0 && !formData.universities[0] && "border-philsa-red"
                                            )}
                                            value={focusedUniIndex === index ? (uniQuery[index] || '') : (formData.universities[index] || '')}
                                            onFocus={() => {
                                               setFocusedUniIndex(index);
                                               const updatedQuery = [...uniQuery];
                                               updatedQuery[index] = formData.universities[index] || '';
                                               setUniQuery(updatedQuery);
                                            }}
                                            onBlur={() => {
                                               setTimeout(() => {
                                                  setFocusedUniIndex(null);
                                               }, 250);
                                            }}
                                            onChange={(e) => {
                                               const updatedQuery = [...uniQuery];
                                               updatedQuery[index] = e.target.value;
                                               setUniQuery(updatedQuery);
                                            }}
                                         />
                                         {focusedUniIndex === index && (
                                            <div className="absolute z-50 left-0 right-0 mt-2 bg-white border border-philsa-border rounded-2xl shadow-xl max-h-56 overflow-y-auto divide-y divide-gray-100">
                                               {UNIVERSITY_DATA.filter(uni => 
                                                  uni.name.toLowerCase().includes((uniQuery[index] || '').toLowerCase()) &&
                                                  (!formData.universities.includes(uni.name) || formData.universities[index] === uni.name)
                                               ).length === 0 ? (
                                                  <div className="p-4 text-xs text-philsa-gray italic font-bold">No universities matched</div>
                                               ) : (
                                                  UNIVERSITY_DATA.filter(uni => 
                                                     uni.name.toLowerCase().includes((uniQuery[index] || '').toLowerCase()) &&
                                                     (!formData.universities.includes(uni.name) || formData.universities[index] === uni.name)
                                                  ).map(uni => (
                                                     <button
                                                        key={uni.name}
                                                        type="button"
                                                        onClick={() => {
                                                           const newUniversities = [...formData.universities];
                                                           const newCourses = [...formData.courses];
                                                           newUniversities[index] = uni.name;
                                                           newCourses[index] = ''; // Reset course on change
                                                           setFormData({...formData, universities: newUniversities, courses: newCourses});
                                                           
                                                           const updatedQuery = [...uniQuery];
                                                           updatedQuery[index] = uni.name;
                                                           setUniQuery(updatedQuery);
                                                           
                                                           setFocusedUniIndex(null);
                                                           if (errors.universities) setErrors(prev => ({...prev, universities: ''}));
                                                        }}
                                                        className="w-full text-left p-3 hover:bg-philsa-navy hover:text-white text-xs font-bold transition-colors font-sans flex items-center justify-between"
                                                     >
                                                        <span>{uni.name}</span>
                                                        <span className="text-[9px] uppercase font-black text-philsa-gray/60 shrink-0">Select</span>
                                                     </button>
                                                  ))
                                               )}
                                            </div>
                                         )}
                                      </div>
                                   </div>

                                   {/* Course Selection - Cascading */}
                                   <div className={cn(
                                      "space-y-2 transition-all duration-300",
                                      formData.universities[index] ? "opacity-100 translate-y-0" : "opacity-30 pointer-events-none translate-y-2"
                                   )}>
                                      <label className="text-[10px] font-black text-philsa-gray uppercase tracking-widest flex items-center gap-1.5">
                                         <BookOpen className="w-3 h-3" /> Degree Programs
                                      </label>
                                      <select 
                                         className={cn(
                                            "input-philsa !py-4",
                                            errors.courses && index === 0 && !formData.courses[0] && "border-philsa-red"
                                         )}
                                         value={formData.courses[index] || ''}
                                         onChange={(e) => {
                                            const newCourses = [...formData.courses];
                                            newCourses[index] = e.target.value;
                                            setFormData({...formData, courses: newCourses});
                                            if (errors.courses) setErrors(prev => ({...prev, courses: ''}));
                                         }}
                                      >
                                         <option value="">Select Degree Program</option>
                                         {UNIVERSITY_DATA.find(u => u.name === formData.universities[index])?.courses.map(course => (
                                            <option key={course} value={course}>{course}</option>
                                         ))}
                                      </select>
                                   </div>
                                </div>

                                {formData.universities[index] && (
                                   <button 
                                      onClick={() => {
                                         const newUniversities = [...formData.universities];
                                         const newCourses = [...formData.courses];
                                         newUniversities[index] = '';
                                         newCourses[index] = '';
                                         setFormData({...formData, universities: newUniversities, courses: newCourses});
                                      }}
                                      className="shrink-0 p-3 text-philsa-gray hover:text-philsa-red transition-colors"
                                   >
                                      <Trash2 className="w-5 h-5" />
                                   </button>
                                )}
                             </div>

                             {index === 0 && (errors.universities || errors.courses) && !formData.universities[0] && (
                                <div className="mt-4 flex items-center gap-2 text-philsa-red text-[10px] font-black uppercase tracking-widest animate-pulse">
                                   <AlertCircle className="w-4 h-4" /> Primary Preference Required
                                </div>
                             )}
                          </div>
                       ))}
                    </div>
                  </div>

                  <div className="bg-philsa-navy/5 p-8 rounded-3xl border border-philsa-navy/10 flex items-start gap-4">
                     <AlertCircle className="w-6 h-6 text-philsa-navy shrink-0 mt-1" />
                     <div className="space-y-1">
                        <p className="text-xs font-black text-philsa-navy uppercase tracking-widest">Enrollment Advisory</p>
                        <p className="text-[11px] text-philsa-navy/70 font-medium leading-relaxed">
                           PhilSA strictly enforces a 1-to-1 mapping during the initial roster verification. Please ensure that your Primary Choice is your absolute priority as it will be the primary target for scholarship allocation.
                        </p>
                     </div>
                  </div>
               </div>
            </motion.div>
          )}

          {currentSection === 99 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
               <div className="space-y-6">
                  <label className="label-philsa">Available Examination Slots *</label>
                  {errors.examScheduleId && <p className="text-xs text-philsa-red font-black uppercase tracking-widest mt-2">{errors.examScheduleId}</p>}
                  <div className="grid gap-4">
                     {schedules.map(slot => (
                       <label key={slot.id} className={cn(
                         "flex flex-col md:flex-row md:items-center justify-between p-6 rounded-3xl border-2 transition-all cursor-pointer group",
                         formData.examScheduleId === slot.id ? "border-philsa-red bg-philsa-red/5" : "border-philsa-border hover:bg-philsa-bg"
                       )}>
                          <div className="flex items-center gap-4">
                             <input 
                                type="radio" 
                                name="schedule"
                                className="w-5 h-5 border-philsa-border text-philsa-red focus:ring-philsa-red"
                                checked={formData.examScheduleId === slot.id}
                                onChange={() => setFormData({...formData, examScheduleId: slot.id})}
                             />
                             <div>
                                <p className="text-sm font-black text-philsa-navy group-hover:text-philsa-red transition-colors">{slot.testCenter}</p>
                                <p className="text-xs text-philsa-gray font-bold uppercase tracking-widest mt-0.5">{slot.room}</p>
                             </div>
                          </div>
                          <div className="mt-4 md:mt-0 flex gap-8">
                             <div className="text-right">
                                <p className="text-[10px] text-philsa-gray font-bold uppercase tracking-[0.1em]">Date</p>
                                <p className="text-sm font-black text-philsa-navy tracking-tight">{slot.date}</p>
                             </div>
                             <div className="text-right">
                                <p className="text-[10px] text-philsa-gray font-bold uppercase tracking-[0.1em]">Time</p>
                                <p className="text-sm font-black text-philsa-navy tracking-tight">{slot.time}</p>
                             </div>
                             <div className="text-right">
                                <p className="text-[10px] text-philsa-gray font-bold uppercase tracking-[0.1em]">Availability</p>
                                <p className="text-sm font-black text-philsa-navy tracking-tight">{slot.remainingSlots} / {slot.totalSlots}</p>
                             </div>
                          </div>
                       </label>
                     ))}
                  </div>
               </div>
            </motion.div>
          )}

          {currentSection === 3 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
               <div className="card-philsa !p-0 bg-white border border-slate-200 overflow-hidden shadow-xl rounded-[2rem]">
                  {/* Simplified Header */}
                  <div className="p-6 sm:p-10 border-b border-philsa-border bg-gradient-to-br from-slate-50 to-philsa-bg/40 relative">
                     <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-3">
                           <div className="px-2.5 py-0.5 sm:px-3 sm:py-1 bg-philsa-navy text-white text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] rounded-md">Step 04</div>
                           <span className="text-[9px] sm:text-[10px] font-black text-philsa-gray uppercase tracking-[0.2em]">Review & Submit</span>
                        </div>
                        <h4 className="text-xl sm:text-2xl font-black text-philsa-navy tracking-tight uppercase">Student Registration <span className="text-philsa-red">Details</span></h4>
                        <p className="text-philsa-gray text-[10px] sm:text-xs font-bold mt-1.5 uppercase tracking-widest opacity-70">Review all registered details before finalizing your submission</p>
                     </div>
                  </div>

                  <div className="p-4 sm:p-10 space-y-8 sm:space-y-12">
                     {/* Row 1: Profile Photo & Core Info */}
                     <div className="flex flex-col lg:flex-row gap-6 sm:gap-12">
                        {/* Profile Photo & Selfie */}
                        <div className="shrink-0 flex flex-col sm:flex-row lg:flex-col gap-6 items-center">
                           {/* 2x2 Portrait Card */}
                           <div className="flex flex-col items-center">
                              <div className="w-32 sm:w-36 aspect-square rounded-2xl overflow-hidden bg-philsa-bg border-4 border-white shadow-xl ring-1 ring-philsa-border relative group">
                                 {formData.photoUrl ? (
                                    <img referrerPolicy="no-referrer" src={formData.photoUrl} alt="Identity Portrait" className="w-full h-full object-cover" />
                                 ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-philsa-gray opacity-30">
                                       <User className="w-10 h-10 mb-1" />
                                       <span className="text-[9px] font-black uppercase">Missing Photo</span>
                                    </div>
                                 )}
                                 <div className="absolute top-2 right-2 px-2 py-0.5 bg-philsa-red text-white text-[7px] font-black uppercase tracking-widest rounded shadow">
                                    2x2 PORTRAIT
                                 </div>
                              </div>
                              <div className="mt-2 text-center">
                                 <p className="text-[8px] sm:text-[9px] font-black text-philsa-red uppercase tracking-widest leading-none">Biometric Portrait</p>
                                 <p className="text-[7px] sm:text-[8px] text-philsa-gray font-bold mt-1 uppercase tracking-tight">Verified Profile Photo</p>
                              </div>
                           </div>

                           {/* Selfie Verification Card */}
                           <div className="flex flex-col items-center">
                              <div className="w-32 sm:w-36 aspect-square rounded-2xl overflow-hidden bg-philsa-bg border-4 border-white shadow-xl ring-1 ring-philsa-border relative group">
                                 {formData.selfieUrl ? (
                                    <img referrerPolicy="no-referrer" src={formData.selfieUrl} alt="Captured Selfie" className="w-full h-full object-cover" />
                                 ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-philsa-gray opacity-30">
                                       <Camera className="w-10 h-10 mb-1" />
                                       <span className="text-[9px] font-black uppercase">Missing Selfie</span>
                                    </div>
                                 )}
                                 <div className="absolute top-2 right-2 px-2 py-0.5 bg-emerald-600 text-white text-[7px] font-black uppercase tracking-widest rounded shadow">
                                    LIVE SELFIE
                                 </div>
                              </div>
                              <div className="mt-2 text-center">
                                 <p className="text-[8px] sm:text-[9px] font-black text-emerald-700 uppercase tracking-widest leading-none">Verification Selfie</p>
                                 <p className="text-[7px] sm:text-[8px] text-philsa-gray font-bold mt-1 uppercase tracking-tight">Matched: 99.8% Liveness</p>
                              </div>
                           </div>
                        </div>

                        {/* Core Personal Details */}
                        <div className="flex-1 space-y-4">
                           <h5 className="text-xs font-bold text-philsa-navy uppercase tracking-wider pb-1.5 border-b border-philsa-border/50 flex items-center gap-2">
                              <User className="w-4 h-4 text-philsa-red" /> Personal & Academic Information
                           </h5>
                           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                              <ReviewItem label="Mobile Number" value={formData.mobile} />
                              <ReviewItem label="Learner Reference Number (LRN)" value={formData.lrn} />
                              <ReviewItem label="First Name" value={formData.firstName} />
                              <ReviewItem label="Middle Name" value={formData.noMiddleName ? 'NONE' : (formData.middleName || '—')} />
                              <ReviewItem label="Last Name" value={formData.lastName} />
                              {isSuffixActive && formData.suffix && <ReviewItem label="Suffix" value={formData.suffix} />}
                              <ReviewItem label="Date of Birth" value={formData.dob} />
                              <ReviewItem label="Official Gender" value={formData.gender || '—'} />
                              <ReviewItem label="High School Name" value={formData.schoolName} />
                              <ReviewItem label="High School Address" value={formData.schoolAddress || '—'} />
                              <ReviewItem label="Account Email" value={formData.email} />
                           </div>
                        </div>
                     </div>

                     {/* Legal Certifications */}
                     <div className="pt-8 sm:pt-12 border-t border-slate-200">
                        <div className="bg-slate-50/50 p-5 sm:p-10 rounded-2xl sm:rounded-[2.5rem] border border-slate-200 relative overflow-hidden">
                           <Shield className="absolute -bottom-10 -right-10 w-32 sm:w-48 h-32 sm:h-48 text-philsa-navy opacity-5" />
                           <div className="relative z-10 space-y-6">
                              <h5 className="text-[10px] sm:text-[11px] font-black text-emerald-600 uppercase tracking-[0.3em] mb-3 sm:mb-4 flex items-center gap-2">
                                 <Shield className="w-4 h-4 text-[#00563F]" /> Declaration and Undertaking
                              </h5>
                              <div className="text-xs text-philsa-navy/80 leading-relaxed space-y-4 max-w-4xl font-medium">
                                 <p className="font-bold">By submitting this application, I declare and undertake that:</p>
                                 <ul className="list-disc pl-5 space-y-3">
                                    <li>All information provided in this registration — including my personal details, educational background, and identification information — is true, accurate, and complete to the best of my knowledge;</li>
                                    <li>I have not misrepresented, falsified, or omitted any material fact required for this application;</li>
                                    <li>I authorize PhilSLA and its authorized government partners to verify my identity and records, including cross-checking against my Learner Reference Number (LRN), PSA civil registry records, and other relevant government databases;</li>
                                    <li>I understand that any false statement, fraudulent claim, or deliberate omission — whether discovered before, during, or after the assessment — may result in the rejection of this application, disqualification from the assessment, invalidation of results, and referral to the appropriate government authorities for further action; and</li>
                                    <li>I acknowledge that I have already read and agreed to the PhilSLA Data Privacy Notice at the start of this registration, and this Declaration does not modify or withdraw that consent.</li>
                                 </ul>
                              </div>
                              <div className="pt-4">
                                 <label className="flex items-start gap-3 sm:gap-4 p-4 sm:p-5 bg-white border border-philsa-border rounded-2xl cursor-pointer hover:border-philsa-red transition-all group shadow-sm">
                                    <input type="checkbox" className="w-5 h-5 mt-0.5 rounded border-philsa-border text-philsa-red focus:ring-philsa-red shrink-0" />
                                    <span className="text-[10px] sm:text-xs font-black text-philsa-navy group-hover:text-philsa-red transition-all uppercase tracking-widest leading-relaxed">
                                       I have read, understood, and agree to this Declaration and Undertaking.
                                    </span>
                                 </label>
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </motion.div>
          )}

        </div>

        <div className="p-4 sm:p-8 border-t border-philsa-border bg-philsa-bg/30 flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
           <button 
             onClick={handleBack} 
             disabled={currentSection === 0 || isSubmitting}
             className="btn-secondary px-6 sm:px-8 py-3.5 flex items-center justify-center gap-2 group disabled:opacity-30 w-full sm:w-auto"
           >
              <ChevronLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" /> Back
           </button>

           {currentSection === SECTIONS.length - 1 ? (
             <button 
               onClick={handleSubmit} 
               disabled={isSubmitting}
               className="btn-primary px-6 sm:px-16 flex items-center justify-center gap-3 py-3.5 sm:py-4 text-sm sm:text-base font-black tracking-tight shadow-2xl shadow-philsa-red/30 active:scale-95 transition-all w-full sm:w-auto"
             >
                {isSubmitting ? 'Processing Roster...' : 'Submit Final Registration'}
                <Save className="w-5 h-5" />
             </button>
           ) : (
             <button 
               onClick={handleNext} 
               className="btn-primary px-6 sm:px-12 flex items-center justify-center gap-2 py-3.5 sm:py-4 group w-full sm:w-auto"
             >
                Continue <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </button>
            )}
         </div>
       </div>

      {showLrnCooldownModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-slate-900/60 transition-all">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            className="max-w-md w-full bg-white rounded-[2.5rem] border border-slate-200 p-8 text-center shadow-2xl relative overflow-hidden"
          >
            {/* Decorative Background */}
            <div className="absolute top-0 left-0 w-full h-2 bg-philsa-red" />
            
            <div className="w-20 h-20 bg-red-50 text-philsa-red rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-md border border-red-100">
              <Lock className="w-10 h-10 animate-pulse" />
            </div>

            <h2 className="text-2xl font-black text-philsa-navy mb-1 tracking-tight">Security Cooldown Active</h2>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Maximum Attempts Exceeded</p>
            
            {/* Timer countdown display */}
            <div className="mb-6 p-4 bg-red-50/50 rounded-2xl border border-red-100/50 inline-block px-8">
              <p className="text-[10px] font-black text-philsa-red uppercase tracking-widest mb-1">Time Remaining</p>
              <p className="text-4xl font-mono font-black text-philsa-red">
                {Math.floor(cooldownSecondsLeft / 60).toString().padStart(2, '0')}:
                {(cooldownSecondsLeft % 60).toString().padStart(2, '0')}
              </p>
            </div>

            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 text-left mb-6 space-y-2">
              <p className="text-xs text-slate-600 font-bold leading-relaxed">
                You reached 5 attempts. Please Wait or Exit Registration. Cooldown 15 mins
              </p>
              <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                For security and registry protection, LRN verification has been locked.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                type="button"
                onClick={() => {
                  setShowLrnCooldownModal(false);
                  setLrnAttemptsLeft(5);
                  setCooldownSecondsLeft(900); // reset timer
                  setErrors({});
                  setFormData(prev => ({ ...prev, lrn: '' }));
                  addAuditLog('LRN_COOLDOWN_SIMULATED', 'Student simulated 15-minute cooldown expiry and retried.');
                }}
                className="w-full btn-primary py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg shadow-philsa-red/20 active:scale-95 transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" /> Simulate 15 mins to retry
              </button>

              <button 
                type="button"
                onClick={() => {
                  setShowLrnCooldownModal(false);
                  setLrnAttemptsLeft(5);
                  setCooldownSecondsLeft(900); // reset timer
                  setErrors({});
                  setFormData(prev => ({ ...prev, lrn: '' }));
                  window.location.href = '/login';
                }}
                className="w-full px-5 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer border border-slate-200"
              >
                Exit Registration
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {showFaceAttemptsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-slate-900/60 transition-all">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            className="max-w-md w-full bg-white rounded-[2.5rem] border border-slate-200 p-8 text-center shadow-2xl relative overflow-hidden font-sans"
          >
            {/* Decorative Top Border */}
            <div className="absolute top-0 left-0 w-full h-2 bg-[#8B0D11]" />
            
            <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-md border border-amber-100">
              <Camera className="w-10 h-10 animate-pulse" />
            </div>

            <h2 className="text-2xl font-black text-philsa-navy mb-1 tracking-tight">Biometric Limit Reached</h2>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-5 font-sans">Exception Handled Successfully</p>
            
            <div className="p-6 bg-amber-50/50 rounded-2xl border border-amber-100 text-left mb-6 space-y-3">
              <p className="text-xs text-[#8B0D11] font-black uppercase tracking-wider leading-relaxed font-sans">
                Verification Limit Exceeded
              </p>
              <p className="text-xs text-slate-600 font-bold leading-relaxed font-sans">
                You reached 5 attempts. Will proceed to Selfie Verification.
              </p>
              <p className="text-[11px] text-slate-500 font-semibold leading-relaxed font-sans">
                A manual backup check will be scheduled to review your uploaded high-resolution 2x2 portrait photo against DepEd records.
              </p>
            </div>

            <button 
              type="button"
              onClick={() => {
                setShowFaceAttemptsModal(false);
                setFaceVerificationStage('selfie_verification');
                setSelfieStatus('live');
                setSelfieLog('Initializing hardware video device stream...');
                addAuditLog('SELFIE_VERIFICATION_FALLBACK_TRIGGERED', 'Biometric attempts limit reached; student initiated manual Selfie Verification fallback.');
              }}
              className="w-full bg-[#8B0D11] hover:bg-[#8B0D11]/90 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#8B0D11]/20 active:scale-95 transition-all cursor-pointer border border-[#8B0D11]/30"
            >
              <Check className="w-4 h-4" /> Proceed to Selfie Verification
            </button>
          </motion.div>
        </div>
      )}

      {showSelfieCooldownModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-slate-900/60 transition-all">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            className="max-w-md w-full bg-white rounded-[2.5rem] border border-slate-200 p-8 text-center shadow-2xl relative overflow-hidden"
          >
            {/* Decorative Background */}
            <div className="absolute top-0 left-0 w-full h-2 bg-philsa-red" />
            
            <div className="w-20 h-20 bg-red-50 text-philsa-red rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-md border border-red-100">
              <Lock className="w-10 h-10 animate-pulse" />
            </div>

            <h2 className="text-2xl font-black text-philsa-navy mb-1 tracking-tight">Security Cooldown Active</h2>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Maximum Attempts Exceeded</p>
            
            {/* Timer countdown display */}
            <div className="mb-6 p-4 bg-red-50/50 rounded-2xl border border-red-100/50 inline-block px-8">
              <p className="text-[10px] font-black text-philsa-red uppercase tracking-widest mb-1">Time Remaining</p>
              <p className="text-4xl font-mono font-black text-philsa-red">
                {Math.floor(selfieCooldownSecondsLeft / 60).toString().padStart(2, '0')}:
                {(selfieCooldownSecondsLeft % 60).toString().padStart(2, '0')}
              </p>
            </div>

            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 text-left mb-6 space-y-2">
              <p className="text-xs text-slate-600 font-bold leading-relaxed">
                You reached 5 attempts. Please Wait or Exit. Cooldown 15 mins
              </p>
              <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                For security and registry protection, selfie biometric verification has been temporarily locked.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                type="button"
                onClick={() => {
                  setShowSelfieCooldownModal(false);
                  setSelfieAttemptsLeft(5);
                  setSelfieCooldownSecondsLeft(900); // reset timer
                  setFaceVerificationStage('selfie_verification');
                  setSelfieStatus('live');
                  addAuditLog('SELFIE_COOLDOWN_SIMULATED', 'Student simulated 15-minute cooldown expiry and retried selfie verification.');
                }}
                className="w-full btn-primary py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg shadow-philsa-red/20 active:scale-95 transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" /> Simulate 15 mins to retry
              </button>

              <button 
                type="button"
                onClick={() => {
                  setShowSelfieCooldownModal(false);
                  setSelfieAttemptsLeft(5);
                  setSelfieCooldownSecondsLeft(900); // reset timer
                  window.location.href = '/login';
                }}
                className="w-full px-5 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer border border-slate-200"
              >
                Exit Registration
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function ReviewItem({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <p className="text-[9px] font-bold text-philsa-gray uppercase tracking-widest leading-none mb-1 opacity-60 font-sans">{label}</p>
      <p className="text-sm font-medium text-philsa-navy tracking-normal break-words whitespace-normal font-sans leading-relaxed">{value || '—'}</p>
    </div>
  );
}

function DocReviewCard({ label, filename }: { label: string; filename: string }) {
   return (
      <div className={cn(
         "p-4 rounded-2xl border flex flex-col items-center justify-center text-center transition-all",
         filename ? "bg-philsa-bg border-philsa-border" : "bg-slate-50 border-philsa-border opacity-40 border-dashed"
      )}>
         <FileUp className={cn("w-5 h-5 mb-2", filename ? "text-philsa-navy" : "text-philsa-gray")} />
         <p className="text-[9px] font-black text-philsa-navy uppercase tracking-widest leading-tight">{label}</p>
         <p className="text-[8px] font-bold text-philsa-gray uppercase mt-1 truncate w-full">{filename || 'Not Uploaded'}</p>
      </div>
   );
}
