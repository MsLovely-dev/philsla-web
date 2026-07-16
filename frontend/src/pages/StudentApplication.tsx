import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { usePhilSA } from '../PhilSAContext';
import { useMockData } from '../services/mockService';
import {
  backendApplicationService,
  createBackendApplicationDraftInput,
  mapBackendApplicationToFrontend,
  type StudentRegistrationFieldConfig,
} from '../services/backendApplicationService';
import { CheckCircle, AlertCircle, Save, ChevronRight, ChevronLeft, Shield, User, School, ShieldCheck, Power, Clock, LifeBuoy, RefreshCw, Lock, AlertTriangle, Mail, Phone, Upload, Smartphone } from 'lucide-react';
import { cn } from '../lib/utils';

const SECTIONS = [
  'LRN & Profile Setup',
  'Contact & Security Setup',
  'Review & Submit'
];
const STEP_TRACKER_LABELS = ['Student Profile Setup', 'Account Set Up', 'Review & Submit'];

const COUNTRIES = [
  "Philippines", "United States", "Canada", "United Kingdom", "Australia", "Japan", 
  "Singapore", "South Korea", "Germany", "Saudi Arabia", "United Arab Emirates", 
  "Malaysia", "Indonesia", "Thailand", "Vietnam", "Taiwan", "Hong Kong", "China", "India"
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
  const [regConfigs, setRegConfigs] = useState<StudentRegistrationFieldConfig[]>(() => {
    const saved = localStorage.getItem('philsa_registration_configs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [
      { id: 'v1', section: 'Step 1 Registration', type: 'Verification Method', value: 'Learner Reference Number (LRN)', status: 'Active' },
      { id: 'v2', section: 'Step 1 Registration', type: 'Verification Method', value: 'PhilSys National ID', status: 'Inactive' },
      { id: 'v3', section: 'Step 1 Registration', type: 'Verification Method', value: 'Manual Entry', status: 'Inactive' },
    ];
  });

  useEffect(() => {
    let isMounted = true;
    const loadRegistrationFields = async () => {
      const result = await backendApplicationService.listPublicStudentRegistrationFields();
      if (!isMounted) return;
      if (result.ok !== false && result.data.length > 0) {
        setRegConfigs(result.data);
        localStorage.setItem('philsa_registration_configs', JSON.stringify(result.data));
        return;
      }
      const saved = localStorage.getItem('philsa_registration_configs');
      if (saved) {
        try {
          setRegConfigs(JSON.parse(saved));
        } catch (e) {
          console.error(e);
        }
      }
    };
    void loadRegistrationFields();
    return () => { isMounted = false; };
  }, []);

  const isActiveConfig = (config: { status?: boolean | string }) => config.status === 'Active' || config.status === true;
  const verificationMethodConfigs = regConfigs.filter(c => c.section === 'Step 1 Registration' && c.type === 'Verification Method');
  const activeVerificationMethod = verificationMethodConfigs.find(c => isActiveConfig(c) && c.value !== 'PhilSys National ID');
  const lrnActive = Boolean(activeVerificationMethod?.value?.includes('LRN'));
  const philsysActive = Boolean(activeVerificationMethod?.value?.includes('PhilSys'));
  const manualActive = Boolean(activeVerificationMethod?.value?.includes('Manual'));
  const step1FieldConfigs = regConfigs.filter(c => c.section === 'Step 1 Registration' && c.type === 'Student Registration Field');
  const hasStep1FieldMaintenance = step1FieldConfigs.length > 0;
  const knownStep1FieldNames = new Set([
    'LRN', 'Birth Date', 'First Name', 'Middle Name', 'Last Name', 'Extension Name',
    'Sex', 'School ID', 'School Name', 'Grade Level', 'Enrollment Status', 'School Year',
  ]);
  const isStep1FieldEnabled = (fieldName: string) => !hasStep1FieldMaintenance || step1FieldConfigs.some(c => c.value === fieldName && isActiveConfig(c));
  const getStep1FieldConfig = (fieldName: string) => step1FieldConfigs.find(c => c.value === fieldName);
  const defaultStep1FieldSections: Record<string, string> = {
    'Birth Date': 'Personal Information',
    'First Name': 'Personal Information',
    'Middle Name': 'Personal Information',
    'Last Name': 'Personal Information',
    'Extension Name': 'Personal Information',
    'Sex': 'Personal Information',
    'School ID': 'School Information',
    'School Name': 'School Information',
    'Grade Level': 'School Information',
    'Enrollment Status': 'School Information',
    'School Year': 'School Information',
  };
  const getStep1FieldSection = (fieldName: string) => getStep1FieldConfig(fieldName)?.fieldSection || defaultStep1FieldSections[fieldName] || 'Additional Information';
  const getStep1FieldOptions = (fieldName: string, fallback: string[]) => {
    const configured = getStep1FieldConfig(fieldName)?.optionValues;
    return Array.isArray(configured) && configured.length > 0 ? configured : fallback;
  };
  const additionalHighPriorityFields = step1FieldConfigs.filter(c =>
    isActiveConfig(c) &&
    c.priority === 'High Priority' &&
    !knownStep1FieldNames.has(c.value)
  );
  const additionalHighPriorityFieldsBySection = (section: string) => additionalHighPriorityFields.filter(field => (field.fieldSection || 'Additional Information') === section);
  const [registryLockedFields, setRegistryLockedFields] = useState<string[]>([]);
  const isRegistryLocked = (fieldName: string) => isIdVerified && registryLockedFields.includes(fieldName);
  const activeVerificationPath: 'lrn' | 'philsys' | 'manual' | null = lrnActive ? 'lrn' : philsysActive ? 'philsys' : manualActive ? 'manual' : null;

  const { applications, setApplications } = useMockData();
  const [currentSection, setCurrentSection] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isIdVerified, setIsIdVerified] = useState(false);
  const [candidateId, setCandidateId] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lrnVerificationToken, setLrnVerificationToken] = useState('');
  const [visitedSections, setVisitedSections] = useState<number[]>([0]);
  const [isEditingCorrection, setIsEditingCorrection] = useState(false);

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
  const visibleVerificationPath = verificationPath ?? activeVerificationPath;
  const step1ModeTitle = visibleVerificationPath === 'philsys' ? 'PhilSys ID Setup' : visibleVerificationPath === 'manual' ? 'Manual Profile Setup' : 'LRN & Profile Setup';
  const step1ModeSubtitle = visibleVerificationPath === 'philsys' ? 'PhilSys Identity Verification' : visibleVerificationPath === 'manual' ? 'Manual High Priority Entry' : 'DepEd Learner Verification';
  const step1ModeDescription = visibleVerificationPath === 'philsys'
    ? 'Enter your PhilSys ID to retrieve verified identity records. Complete any remaining high-priority school information before account creation.'
    : visibleVerificationPath === 'manual'
      ? 'Enter the required high-priority identity and school information manually. You can provide your LRN later after account creation.'
      : 'Enter your official 12-digit Learner Reference Number (LRN) to fetch verified enrollment and identity records from DepEd.';
  const showStep1ModeDescription = !(activeVerificationPath === 'lrn' && verificationPath === 'manual');
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
            setRegistryLockedFields([]);
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

  // Maintenance controls which single registration mode is visible.
  useEffect(() => {
    if (!showPrivacyConsent) {
      setVerificationPath(activeVerificationPath);
      if (activeVerificationPath !== 'lrn') setLrnVerificationToken('');
      if (activeVerificationPath === 'manual') {
        setIsIdVerified(false);
        setRegistryLockedFields([]);
      }
    }
  }, [showPrivacyConsent, activeVerificationPath]);
  const [philsysInputMode, setPhilsysInputMode] = useState<'qr' | 'manual'>('manual');
  const [qrScanning, setQrScanning] = useState(false);
  const [qrScanningMessage, setQrScanningMessage] = useState('');
  const [failedVerificationMethod, setFailedVerificationMethod] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [generatedEmailOtp, setGeneratedEmailOtp] = useState('');
  const [emailOtpSentTo, setEmailOtpSentTo] = useState('');
  const [isEmailVerified, setIsEmailVerified] = useState(false);

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
      schoolId: '',
      schoolName: '',
      schoolAddress: '',
      academicTrack: '',
      gradeLevel: 'Grade 12',
      enrollmentStatus: '',
      schoolYear: '2026-2027',
      customStep1Fields: {},
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
    });
    setIsIdVerified(false);
    setRegistryLockedFields([]);
    setVerificationPath(activeVerificationPath);
    setPhilsysInputMode('manual');
    setQrScanning(false);
    setFailedVerificationMethod('');
    setLrnVerificationToken('');
    setEmailOtp('');
    setGeneratedEmailOtp('');
    setEmailOtpSentTo('');
    setIsEmailVerified(false);
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
    schoolId: '',
    schoolName: '',
    schoolAddress: '',
    academicTrack: '',
    gradeLevel: 'Grade 12',
    enrollmentStatus: '',
    schoolYear: '2026-2027',
    customStep1Fields: {} as Record<string, string>,
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
  });

  const renderAdditionalStep1Field = (field: StudentRegistrationFieldConfig) => {
    const errorKey = `customStep1:${field.value}`;
    return (
      <div key={field.id || field.value} className="space-y-2">
        <label className="label-philsa">{field.value} *</label>
        {field.inputType === 'dropdown' && Array.isArray(field.optionValues) && field.optionValues.length > 0 ? (
          <select
            className="input-philsa"
            value={formData.customStep1Fields[field.value] || ''}
            onChange={(e) => {
              const value = e.target.value;
              setFormData(prev => ({
                ...prev,
                customStep1Fields: {
                  ...prev.customStep1Fields,
                  [field.value]: value,
                },
              }));
              if (errors[errorKey]) {
                setErrors(prev => {
                  const next = { ...prev };
                  delete next[errorKey];
                  return next;
                });
              }
            }}
          >
            <option value="">Select {field.value}</option>
            {field.optionValues.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        ) : (
          <input
            type={field.inputType === 'date' ? 'date' : 'text'}
            className="input-philsa"
            value={formData.customStep1Fields[field.value] || ''}
            onChange={(e) => {
              const value = e.target.value;
              setFormData(prev => ({
                ...prev,
                customStep1Fields: {
                  ...prev.customStep1Fields,
                  [field.value]: value,
                },
              }));
              if (errors[errorKey]) {
                setErrors(prev => {
                  const next = { ...prev };
                  delete next[errorKey];
                  return next;
                });
              }
            }}
            placeholder={field.remarks || `Enter ${field.value}`}
          />
        )}
        {errors[errorKey] && <p className="text-xs text-philsa-red font-bold">{errors[errorKey]}</p>}
      </div>
    );
  };

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
      schoolId: currentFormData.schoolId || '301234',
      schoolName: currentFormData.schoolName || 'Philippine Science High School - Main Campus',
      gradeLevel: currentFormData.gradeLevel || 'Grade 12',
      enrollmentStatus: currentFormData.enrollmentStatus || 'Enrolled',
      schoolYear: currentFormData.schoolYear || '2026-2027',
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
            setFormData(prev => ({
              ...autoFillWithPhilSys(prev),
              nationalId: prev.nationalId || '1234-5678-9012',
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
        setFormData(prev => ({
          ...autoFillWithPhilSys(prev),
          nationalId: prev.nationalId,
        }));
        addAuditLog('PHILSYS_MANUAL_VERIFIED', `Authenticated successfully via PhilSys PCN: ${formData.nationalId}.`);
        alert('Identity Authenticated Successfully with PhilSys Registry. Official registry credentials loaded.');
      }
    }, 1200);
  };

  const resetEmailVerification = () => {
    setEmailOtp('');
    setGeneratedEmailOtp('');
    setEmailOtpSentTo('');
    setIsEmailVerified(false);
  };

  const handleSendEmailOtp = () => {
    const email = formData.email.trim();
    if (!email) {
      setErrors(prev => ({ ...prev, email: 'Email address is required before sending OTP' }));
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setErrors(prev => ({ ...prev, email: 'Invalid email address format' }));
      return;
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedEmailOtp(otp);
    setEmailOtpSentTo(email);
    setEmailOtp('');
    setIsEmailVerified(false);
    setErrors(prev => {
      const next = { ...prev };
      delete next.email;
      delete next.emailOtp;
      return next;
    });
  };

  const handleVerifyEmailOtp = () => {
    if (!generatedEmailOtp || emailOtpSentTo !== formData.email.trim()) {
      setErrors(prev => ({ ...prev, emailOtp: 'Please send an OTP to this email address first.' }));
      return;
    }
    if (emailOtp.trim() !== generatedEmailOtp) {
      setErrors(prev => ({ ...prev, emailOtp: 'Invalid OTP. Please check the temporary code shown above.' }));
      return;
    }
    setIsEmailVerified(true);
    setErrors(prev => {
      const next = { ...prev };
      delete next.email;
      delete next.emailOtp;
      return next;
    });
  };

  const continueWithManualStep1 = () => {
    setShowLrnCooldownModal(false);
    setVerificationPath('manual');
    setLrnVerificationToken('');
    setIsIdVerified(false);
    setRegistryLockedFields([]);
    setErrors({});
    setCooldownSecondsLeft(900);
    setFormData(prev => ({ ...prev, lrn: '' }));
    addAuditLog('LRN_MANUAL_FALLBACK_SELECTED', 'Student selected manual Step 1 input after LRN verification attempts were exhausted.');
  };

  const handleVerifyLrnPath = async (forcedLrn?: string) => {
    if (lrnAttemptsLeft <= 0) {
      setShowLrnCooldownModal(true);
      return;
    }

    const currentLrn = forcedLrn !== undefined ? forcedLrn : formData.lrn;

    if (!currentLrn) {
      setErrors(prev => ({ ...prev, lrn: 'Please enter your LRN.' }));
      return;
    }
    
    if (!/^\d{12}$/.test(currentLrn)) {
      setErrors(prev => ({ ...prev, lrn: 'LRN must be exactly 12 numeric digits.' }));
      return;
    }

    setIsSubmitting(true);
    const result = await backendApplicationService.verifyLrn(currentLrn);
    setIsSubmitting(false);

    if (result.ok === false) {
      const nextAttempts = result.error.code === 'LRN_COOLDOWN' ? 0 : Math.max(0, lrnAttemptsLeft - 1);
      setLrnAttemptsLeft(nextAttempts);
      setErrors(prev => ({
        ...prev,
        general: result.error.message,
      }));
      addAuditLog('DEPED_LRN_VERIFICATION_FAILED', `Verification failed for DepEd LRN. Code: ${result.error.code ?? 'UNKNOWN'}.`);
      if (result.error.code === 'LRN_COOLDOWN' || nextAttempts <= 0) {
        setShowLrnCooldownModal(true);
      }
      return;
    }

    const { profile, verificationToken } = result.data;
    setLrnVerificationToken(verificationToken);
    setLrnAttemptsLeft(5);
    setIsIdVerified(true);
    setRegistryLockedFields([
      ['lrn', profile.lrn],
      ['firstName', profile.firstName],
      ['middleName', profile.middleName],
      ['lastName', profile.lastName],
      ['suffix', profile.extensionName],
      ['dob', profile.dateOfBirth],
      ['schoolName', profile.schoolName],
      ['schoolId', profile.schoolId],
      ['gradeLevel', profile.gradeLevel],
      ['enrollmentStatus', profile.enrollmentStatus],
      ['schoolYear', profile.schoolYear],
      ['gender', profile.sex],
    ].filter(([, value]) => String(value ?? '').trim() !== '').map(([fieldName]) => fieldName));
    setErrors({});
    setFormData(prev => ({
      ...autoFillWithPhilSys(prev),
      lrn: profile.lrn,
      firstName: profile.firstName,
      middleName: profile.middleName,
      noMiddleName: !profile.middleName,
      lastName: profile.lastName,
      suffix: profile.extensionName || '',
      dob: profile.dateOfBirth,
      email: profile.lrn === '123456789012' ? 'lovely@yopmail.com' : (prev.email || 'aurelio.delacruz@philsys.gov.ph'),
      schoolName: profile.schoolName,
      schoolId: profile.schoolId,
      schoolAddress: prev.schoolAddress || 'Verified from LRN registry',
      academicTrack: prev.academicTrack || 'STEM',
      gradeLevel: profile.gradeLevel,
      enrollmentStatus: profile.enrollmentStatus,
      schoolYear: profile.schoolYear,
      gender: profile.sex,
      gwa: prev.gwa || '0',
      universities: prev.universities.length ? prev.universities : ['UP Diliman'],
      courses: prev.courses.length ? prev.courses : ['BS Computer Science'],
    }));
    addAuditLog('DEPED_LRN_VERIFIED', 'Authenticated successfully via DepEd LRN registry.');
  };

  const validateCurrentSection = () => {
    const newErrors: Record<string, string> = {};
    
    if (currentSection === 0) {
      if (formData.lrn && !/^\d{12}$/.test(formData.lrn)) {
        newErrors.lrn = 'LRN must be exactly 12 numeric digits.';
      }
      if (isStep1FieldEnabled('Birth Date') && !formData.dob) {
        newErrors.dob = 'Date of birth is required';
      }
      if (isStep1FieldEnabled('First Name') && !formData.firstName) newErrors.firstName = 'First name is required';
      if (isStep1FieldEnabled('Last Name') && !formData.lastName) newErrors.lastName = 'Last name is required';
      if (isStep1FieldEnabled('Sex') && !formData.gender) newErrors.gender = 'Sex is required';
      if (isStep1FieldEnabled('School ID') && !formData.schoolId) newErrors.schoolId = 'School ID is required';
      if (isStep1FieldEnabled('School Name') && !formData.schoolName) newErrors.schoolName = 'School name is required';
      if (isStep1FieldEnabled('Grade Level') && !formData.gradeLevel) newErrors.gradeLevel = 'Grade level is required';
      if (isStep1FieldEnabled('Enrollment Status') && !formData.enrollmentStatus) newErrors.enrollmentStatus = 'Enrollment status is required';
      if (isStep1FieldEnabled('School Year') && !formData.schoolYear) newErrors.schoolYear = 'School year is required';
      additionalHighPriorityFields.forEach(field => {
        if (!formData.customStep1Fields[field.value]?.trim()) {
          newErrors[`customStep1:${field.value}`] = `${field.value} is required`;
        }
      });
      if (!isIdVerified && verificationPath !== 'manual') {
        newErrors.general = 'Verify your LRN or PhilSys ID, or choose manual entry if verification is unavailable.';
      }
    }

    if (currentSection === 1) {
      if (!formData.email) {
        newErrors.email = 'Email address is required';
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'Invalid email address format';
      } else if (!isEmailVerified || emailOtpSentTo !== formData.email.trim()) {
        newErrors.emailOtp = 'Please verify your email address using the OTP before continuing.';
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

  const handleSubmit = async () => {
    if (import.meta.env.VITE_AUTH_SERVICE_MODE === 'backend') {
      setIsSubmitting(true);
      const result = await backendApplicationService.createAndSubmit(
        createBackendApplicationDraftInput(lrnVerificationToken, formData),
      );
      setIsSubmitting(false);

      if (result.ok === false) {
        setErrors({ general: result.error.message });
        addAuditLog('APPLICATION_SUBMISSION_FAILED', `Backend application submission failed. Code: ${result.error.code ?? 'UNKNOWN'}.`);
        return;
      }

      const submittedApplication = mapBackendApplicationToFrontend(result.data, user?.id ?? result.data.id);
      setApplications(prev => {
        const withoutDuplicate = prev.filter(app => app.id !== submittedApplication.id);
        return [...withoutDuplicate, submittedApplication];
      });
      addAuditLog('APPLICATION_SUBMITTED', `Candidate ${submittedApplication.id} submitted their application through the backend API.`);
      setCandidateId(submittedApplication.id);
      setLrnVerificationToken('');
      setIsSubmitted(true);
      return;
    }

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
          <h2 className="text-4xl font-black text-philsa-navy mb-4 tracking-tighter transition-all">Registration Submitted</h2>
          <p className="text-philsa-gray mb-10 max-w-sm mx-auto font-medium">
            Your student account is now active. You can log in using the email and password you provided, then complete the remaining profile information.
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
                setVerificationPath(activeVerificationPath);
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
        <div className="flex items-start justify-center gap-3 sm:gap-5 w-full">
           {SECTIONS.map((section, i) => (
             <div key={section} className="flex items-start gap-3 sm:gap-5">
                <div className="flex w-20 sm:w-28 flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={() => jumpToSection(i)}
                    disabled={!visitedSections.includes(i) && i > currentSection}
                    className={cn(
                      "w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 flex items-center justify-center text-sm sm:text-base font-black transition-all disabled:cursor-not-allowed",
                      i === currentSection ? "bg-philsa-red text-white border-philsa-red shadow-lg shadow-philsa-red/20 scale-105" :
                      i < currentSection ? "bg-green-600 text-white border-green-600 hover:bg-green-700" :
                      visitedSections.includes(i) ? "bg-white text-philsa-navy border-philsa-navy/30 hover:border-philsa-red" : "bg-white text-philsa-gray border-philsa-border opacity-50"
                    )}
                    aria-label={`Step ${i + 1}: ${STEP_TRACKER_LABELS[i]}`}
                  >
                    {i + 1}
                  </button>
                  <span className={cn(
                    "text-center text-[9px] sm:text-[10px] font-black uppercase leading-tight tracking-wider",
                    i === currentSection ? "text-philsa-red" : i < currentSection ? "text-green-700" : "text-philsa-gray"
                  )}>
                    {STEP_TRACKER_LABELS[i]}
                  </span>
                </div>
                {i < SECTIONS.length - 1 && <div className="mt-5 sm:mt-6 w-8 sm:w-16 h-[2px] bg-philsa-border" />}
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
                <div className="w-full max-w-5xl mx-auto bg-white rounded-3xl border border-philsa-border p-6 sm:p-8 shadow-md space-y-6">
                   <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                      <div className="w-10 h-10 bg-blue-50 text-blue-700 rounded-xl flex items-center justify-center">
                         <School className="w-5 h-5" />
                      </div>
                      <div>
                         <h4 className="text-sm font-black text-philsa-navy uppercase tracking-widest">{step1ModeTitle}</h4>
                         <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{step1ModeSubtitle}</p>
                      </div>
                   </div>

                   {showStep1ModeDescription && (
                     <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                        {step1ModeDescription}
                     </p>
                   )}

                   <div className="space-y-6">
                      {!verificationPath && (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-bold text-amber-800">
                          No registration verification method is enabled. Please contact an administrator.
                        </div>
                      )}

                      {verificationPath === 'philsys' && (
                        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_auto] md:items-end">
                          <div className="space-y-2">
                          <label className="label-philsa text-philsa-gray">PhilSys ID / PCN *</label>
                          <input type="text" className="input-philsa font-mono tracking-wider bg-white w-full" placeholder="e.g. 1234-5678-9012" value={formData.nationalId} onChange={(e) => setFormData({...formData, nationalId: e.target.value})} />
                          </div>
                          <button type="button" onClick={handleVerifyPhilSysManual} className="w-full md:w-auto btn-primary py-3 px-8 font-black uppercase text-xs tracking-widest cursor-pointer flex items-center justify-center gap-2">
                            <ShieldCheck className="w-4 h-4" /> Verify PhilSys ID
                          </button>
                        </div>
                      )}

                      {/* LRN Input */}
                      {verificationPath === 'lrn' && (
                        <div className="space-y-3">
                          <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_auto] md:items-end">
                            <div className="space-y-2">
                            <label className="label-philsa text-philsa-gray">Learner Reference Number (LRN) *</label>
                            <input 
                              type="text" 
                              placeholder="e.g. 101234567890" 
                              className="input-philsa font-mono tracking-wider bg-white w-full"
                              value={formData.lrn} 
                              onChange={(e) => {
                                setFormData({...formData, lrn: e.target.value});
                               setLrnVerificationToken('');
                               setIsIdVerified(false);
                               setRegistryLockedFields([]);
                               if (errors.lrn) setErrors(prev => ({...prev, lrn: ''}));
                              }} 
                            />
                            {errors.lrn && <p className="text-xs text-philsa-red font-bold pl-1">{errors.lrn}</p>}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleVerifyLrnPath()}
                              className="w-full md:w-auto btn-primary py-3 px-8 font-black uppercase text-xs tracking-widest cursor-pointer flex items-center justify-center gap-2"
                            >
                              <School className="w-4 h-4" /> Verify
                            </button>
                          </div>
                        </div>
                      )}

                      {errors.general && (
                         <p className="text-xs text-philsa-red font-bold pl-1 border-l-2 border-philsa-red py-0.5 mt-1">{errors.general}</p>
                      )}

                      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 space-y-5">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-black text-philsa-navy uppercase tracking-widest">Personal Information</p>
                            <p className="text-[10px] text-slate-500 font-bold">Demographics required for account creation. Verified records are locked.</p>
                          </div>
                          {isIdVerified && <span className="rounded-full bg-emerald-50 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-700 border border-emerald-100">Verified</span>}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                          {isStep1FieldEnabled('First Name') && getStep1FieldSection('First Name') === 'Personal Information' && <div className="space-y-2">
                            <label className="label-philsa">First Name *</label>
                            <input className="input-philsa" value={formData.firstName} readOnly={isRegistryLocked('firstName')} onChange={(e) => setFormData({...formData, firstName: e.target.value})} />
                            {errors.firstName && <p className="text-xs text-philsa-red font-bold">{errors.firstName}</p>}
                          </div>}
                          {isStep1FieldEnabled('Middle Name') && getStep1FieldSection('Middle Name') === 'Personal Information' && <div className="space-y-2">
                            <label className="label-philsa">Middle Name</label>
                            <input className="input-philsa" value={formData.middleName} readOnly={isRegistryLocked('middleName')} onChange={(e) => setFormData({...formData, middleName: e.target.value})} />
                          </div>}
                          {isStep1FieldEnabled('Last Name') && getStep1FieldSection('Last Name') === 'Personal Information' && <div className="space-y-2">
                            <label className="label-philsa">Last Name *</label>
                            <input className="input-philsa" value={formData.lastName} readOnly={isRegistryLocked('lastName')} onChange={(e) => setFormData({...formData, lastName: e.target.value})} />
                            {errors.lastName && <p className="text-xs text-philsa-red font-bold">{errors.lastName}</p>}
                          </div>}
                          {isStep1FieldEnabled('Extension Name') && getStep1FieldSection('Extension Name') === 'Personal Information' && <div className="space-y-2">
                            <label className="label-philsa">Extension Name</label>
                            <input className="input-philsa" value={formData.suffix} readOnly={isRegistryLocked('suffix')} onChange={(e) => setFormData({...formData, suffix: e.target.value})} placeholder="Jr., Sr., III" />
                          </div>}
                          {isStep1FieldEnabled('Sex') && getStep1FieldSection('Sex') === 'Personal Information' && <div className="space-y-2">
                            <label className="label-philsa">Sex *</label>
                            <select className="input-philsa" value={formData.gender} disabled={isRegistryLocked('gender')} onChange={(e) => setFormData({...formData, gender: e.target.value})}>
                              <option value="">Select Sex</option>
                              {getStep1FieldOptions('Sex', ['Female', 'Male']).map(option => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                            </select>
                            {errors.gender && <p className="text-xs text-philsa-red font-bold">{errors.gender}</p>}
                          </div>}
                          {isStep1FieldEnabled('Birth Date') && getStep1FieldSection('Birth Date') === 'Personal Information' && <div className="space-y-2">
                            <label className="label-philsa">Birth Date *</label>
                            <input
                              type="date"
                              className="input-philsa"
                              value={formData.dob}
                              readOnly={isRegistryLocked('dob')}
                              onChange={(e) => {
                                setFormData({...formData, dob: e.target.value});
                                if (errors.dob) setErrors(prev => ({...prev, dob: ''}));
                              }}
                            />
                            {errors.dob && <p className="text-xs text-philsa-red font-bold">{errors.dob}</p>}
                          </div>}
                          {additionalHighPriorityFieldsBySection('Personal Information').map(renderAdditionalStep1Field)}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 space-y-5">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-black text-philsa-navy uppercase tracking-widest">School Information</p>
                            <p className="text-[10px] text-slate-500 font-bold">Academic record required for Step 1 registration.</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                          {isStep1FieldEnabled('School ID') && getStep1FieldSection('School ID') === 'School Information' && <div className="space-y-2">
                            <label className="label-philsa">School ID *</label>
                            <input className="input-philsa" value={formData.schoolId} readOnly={isRegistryLocked('schoolId')} onChange={(e) => setFormData({...formData, schoolId: e.target.value})} />
                            {errors.schoolId && <p className="text-xs text-philsa-red font-bold">{errors.schoolId}</p>}
                          </div>}
                          {isStep1FieldEnabled('School Name') && getStep1FieldSection('School Name') === 'School Information' && <div className="sm:col-span-2 xl:col-span-2 space-y-2">
                            <label className="label-philsa">School Name *</label>
                            <input className="input-philsa" value={formData.schoolName} readOnly={isRegistryLocked('schoolName')} onChange={(e) => setFormData({...formData, schoolName: e.target.value})} />
                            {errors.schoolName && <p className="text-xs text-philsa-red font-bold">{errors.schoolName}</p>}
                          </div>}
                          {isStep1FieldEnabled('Grade Level') && getStep1FieldSection('Grade Level') === 'School Information' && <div className="space-y-2">
                            <label className="label-philsa">Grade Level *</label>
                            <select className="input-philsa" value={formData.gradeLevel} disabled={isRegistryLocked('gradeLevel')} onChange={(e) => setFormData({...formData, gradeLevel: e.target.value})}>
                              <option value="">Select Grade Level</option>
                              {getStep1FieldOptions('Grade Level', ['Grade 12', 'Grade 11']).map(option => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                            </select>
                            {errors.gradeLevel && <p className="text-xs text-philsa-red font-bold">{errors.gradeLevel}</p>}
                          </div>}
                          {isStep1FieldEnabled('Enrollment Status') && getStep1FieldSection('Enrollment Status') === 'School Information' && <div className="space-y-2">
                            <label className="label-philsa">Enrollment Status *</label>
                            <select className="input-philsa" value={formData.enrollmentStatus} disabled={isRegistryLocked('enrollmentStatus')} onChange={(e) => setFormData({...formData, enrollmentStatus: e.target.value})}>
                              <option value="">Select Status</option>
                              {getStep1FieldOptions('Enrollment Status', ['Enrolled', 'Graduating', 'Pending Enrollment']).map(option => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                            </select>
                            {errors.enrollmentStatus && <p className="text-xs text-philsa-red font-bold">{errors.enrollmentStatus}</p>}
                          </div>}
                          {isStep1FieldEnabled('School Year') && getStep1FieldSection('School Year') === 'School Information' && <div className="space-y-2">
                            <label className="label-philsa">School Year *</label>
                            <input className="input-philsa" value={formData.schoolYear} readOnly={isRegistryLocked('schoolYear')} onChange={(e) => setFormData({...formData, schoolYear: e.target.value})} />
                            {errors.schoolYear && <p className="text-xs text-philsa-red font-bold">{errors.schoolYear}</p>}
                          </div>}
                          {additionalHighPriorityFieldsBySection('School Information').map(renderAdditionalStep1Field)}
                        </div>
                      </div>

                      {additionalHighPriorityFieldsBySection('Additional Information').length > 0 && (
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 space-y-5">
                          <div>
                            <p className="text-[10px] font-black text-philsa-navy uppercase tracking-widest">Additional Information</p>
                            <p className="text-[10px] text-slate-500 font-bold">Additional high-priority fields configured by maintenance.</p>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                            {additionalHighPriorityFieldsBySection('Additional Information').map(renderAdditionalStep1Field)}
                          </div>
                        </div>
                      )}
                   </div>

                   {/* Simulation Controls for ease of testing */}
                   <div className="pt-4 border-t border-slate-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 text-center">Simulation Controls</p>
                      <div className="flex flex-col gap-2">
                         <button 
                            type="button" 
                            onClick={() => {
                               setFormData(prev => ({ ...prev, lrn: '123456789012' }));
                               void handleVerifyLrnPath('123456789012');
                            }}
                            className="w-full text-[9px] font-black text-emerald-700 hover:bg-emerald-50 border border-emerald-200 rounded-xl py-2 uppercase tracking-widest cursor-pointer text-center"
                         >
                            Use Mock Valid LRN
                         </button>
                         <button 
                            type="button" 
                            onClick={() => {
                               setFormData(prev => ({ ...prev, lrn: '901234567899' }));
                               void handleVerifyLrnPath('901234567899');
                            }}
                            className="w-full text-[9px] font-black text-red-600 hover:bg-red-50 border border-red-200 rounded-xl py-2 uppercase tracking-widest cursor-pointer text-center"
                         >
                            Use Mock Ineligible LRN
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
                        <div className="w-12 h-12 rounded-2xl bg-philsa-navy flex items-center justify-center text-white shadow-lg">
                           <Save className="w-6 h-6" />
                        </div>
                        <div>
                           <h4 className="text-lg font-black text-philsa-navy leading-tight">Email Verification & Security Credentials</h4>
                           <p className="text-xs text-philsa-gray font-medium uppercase tracking-wider">Verify email with OTP before account setup</p>
                        </div>
                     </div>

                     <div className="space-y-6">
                        <div className="space-y-2">
                           <label className={cn("label-philsa", errors.email ? "text-philsa-red" : "text-philsa-gray")}>Email Address *</label>
                           <div className="flex flex-col sm:flex-row gap-3">
                              <div className="relative flex-1">
                                 <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-philsa-gray" />
                                 <input
                                    type="email"
                                    placeholder="student@email.ph"
                                    className={cn("input-philsa pl-11", errors.email && "border-philsa-red bg-philsa-red/5", isEmailVerified && "border-green-500 bg-green-50/60")}
                                    value={formData.email}
                                    onChange={(e) => {
                                       setFormData({...formData, email: e.target.value});
                                       resetEmailVerification();
                                       if (errors.email || errors.emailOtp) {
                                          setErrors(prev => {
                                             const next = {...prev};
                                             delete next.email;
                                             delete next.emailOtp;
                                             return next;
                                          });
                                       }
                                    }}
                                 />
                              </div>
                              <button
                                 type="button"
                                 onClick={handleSendEmailOtp}
                                 disabled={isEmailVerified}
                                 className={cn(
                                    "px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest border transition-all duration-200",
                                    isEmailVerified
                                      ? "bg-green-50 text-green-700 border-green-200 cursor-not-allowed"
                                      : "bg-philsa-navy text-white border-philsa-navy hover:bg-philsa-navy/90"
                                 )}
                              >
                                 {generatedEmailOtp ? 'Resend OTP' : 'Send OTP'}
                              </button>
                           </div>
                           {errors.email && <p className="text-xs text-philsa-red font-bold pl-1">{errors.email}</p>}
                           {isEmailVerified && (
                              <p className="text-xs text-green-700 font-black uppercase tracking-wider flex items-center gap-1.5 pl-1">
                                 <CheckCircle className="w-3.5 h-3.5" /> Email verified
                              </p>
                           )}
                        </div>

                        {generatedEmailOtp && !isEmailVerified && (
                           <div className="space-y-3 p-5 rounded-2xl border border-amber-200 bg-amber-50">
                              <div className="flex items-start gap-3">
                                 <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                                    <Mail className="w-5 h-5" />
                                 </div>
                                 <div>
                                    <h5 className="text-xs font-black text-amber-900 uppercase tracking-widest">Temporary Email OTP Simulation</h5>
                                    <p className="text-xs text-amber-800 font-medium mt-1">
                                       Email delivery is not connected yet. Use this temporary OTP for local testing:
                                       <span className="ml-2 font-black tracking-[0.35em] text-philsa-navy">{generatedEmailOtp}</span>
                                    </p>
                                    <p className="text-[11px] text-amber-700 mt-1">Target email: {emailOtpSentTo}</p>
                                 </div>
                              </div>
                              <div className="flex flex-col sm:flex-row gap-3">
                                 <input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={6}
                                    placeholder="Enter 6-digit OTP"
                                    className={cn("input-philsa tracking-[0.35em] font-black", errors.emailOtp && "border-philsa-red bg-philsa-red/5")}
                                    value={emailOtp}
                                    onChange={(e) => {
                                       setEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                                       if (errors.emailOtp) setErrors(prev => ({...prev, emailOtp: ''}));
                                    }}
                                 />
                                 <button
                                    type="button"
                                    onClick={handleVerifyEmailOtp}
                                    className="px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest border border-green-600 bg-green-600 text-white hover:bg-green-700 transition-all duration-200"
                                 >
                                    Verify OTP
                                 </button>
                              </div>
                              {errors.emailOtp && <p className="text-xs text-philsa-red font-bold pl-1">{errors.emailOtp}</p>}
                           </div>
                        )}

                        {!generatedEmailOtp && !isEmailVerified && errors.emailOtp && (
                           <p className="text-xs text-philsa-red font-bold pl-1">{errors.emailOtp}</p>
                        )}

                        <div className={cn("p-4 rounded-2xl border flex items-start gap-3", isEmailVerified ? "bg-green-50 border-green-200" : "bg-blue-50 border-blue-200")}>
                           <ShieldCheck className={cn("w-5 h-5 mt-0.5 shrink-0", isEmailVerified ? "text-green-700" : "text-blue-700")} />
                           <p className={cn("text-xs font-bold leading-relaxed", isEmailVerified ? "text-green-800" : "text-blue-800")}>
                              Email must be verified using OTP before setting password and mobile number. This OTP is currently displayed on-screen until email delivery is configured.
                           </p>
                        </div>

                        <div className="space-y-2">
                           <label className={cn("label-philsa", errors.mobile ? "text-philsa-red" : "text-philsa-gray")}>Mobile Number *</label>
                           <input 
                              type="tel" 
                              placeholder="e.g. 09171234567" 
                              disabled={!isEmailVerified}
                              className={cn("input-philsa", errors.mobile && "border-philsa-red bg-philsa-red/5", !isEmailVerified && "bg-slate-100 text-slate-400 cursor-not-allowed")}
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
                              disabled={!isEmailVerified}
                              className={cn("input-philsa", errors.password && "border-philsa-red bg-philsa-red/5", !isEmailVerified && "bg-slate-100 text-slate-400 cursor-not-allowed")}
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
                              disabled={!isEmailVerified}
                              className={cn("input-philsa", errors.confirmPassword && "border-philsa-red bg-philsa-red/5", !isEmailVerified && "bg-slate-100 text-slate-400 cursor-not-allowed")}
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






          {currentSection === 2 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
               <div className="card-philsa !p-0 bg-white border border-slate-200 overflow-hidden shadow-xl rounded-[2rem]">
                  {/* Simplified Header */}
                  <div className="p-6 sm:p-10 border-b border-philsa-border bg-gradient-to-br from-slate-50 to-philsa-bg/40 relative">
                     <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-3">
                           <div className="px-2.5 py-0.5 sm:px-3 sm:py-1 bg-philsa-navy text-white text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] rounded-md">Step 03</div>
                           <span className="text-[9px] sm:text-[10px] font-black text-philsa-gray uppercase tracking-[0.2em]">Review & Submit</span>
                        </div>
                        <h4 className="text-xl sm:text-2xl font-black text-philsa-navy tracking-tight uppercase">Student Registration <span className="text-philsa-red">Details</span></h4>
                        <p className="text-philsa-gray text-[10px] sm:text-xs font-bold mt-1.5 uppercase tracking-widest opacity-70">Review all registered details before finalizing your submission</p>
                     </div>
                  </div>

                  <div className="p-4 sm:p-10 space-y-8 sm:space-y-12">
                     <div className="space-y-4">
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

        <div className="p-4 sm:p-8 border-t border-philsa-border bg-philsa-bg/30 space-y-4">
          {errors.general && currentSection !== 0 && (
            <div className="rounded-2xl border border-philsa-red/20 bg-philsa-red/5 px-4 py-3 text-xs font-bold text-philsa-red">
              {errors.general}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
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
                Your LRN could not be verified after 5 attempts. You can wait 15 minutes and try again, or continue by manually entering the required high-priority information.
              </p>
              <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                Manual registration will create your account without verified LRN details for now. You may provide your LRN later to complete identity verification.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                type="button"
                onClick={() => {
                  if (cooldownSecondsLeft <= 0) {
                    setShowLrnCooldownModal(false);
                    setLrnAttemptsLeft(5);
                    setCooldownSecondsLeft(900);
                    setErrors({});
                    setFormData(prev => ({ ...prev, lrn: '' }));
                  }
                }}
                disabled={cooldownSecondsLeft > 0}
                className="w-full btn-primary py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg shadow-philsa-red/20 active:scale-95 transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw className="w-4 h-4" /> Wait for timer to retry
              </button>

              <button
                type="button"
                onClick={continueWithManualStep1}
                className="w-full px-5 py-4 bg-philsa-navy hover:bg-[#00162B] text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                <User className="w-4 h-4" /> Continue with manual input
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

