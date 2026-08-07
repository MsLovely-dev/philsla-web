import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { FaceDetector as MediaPipeFaceDetector, FilesetResolver } from '@mediapipe/tasks-vision';
import { Link } from 'react-router-dom';
import { usePhilSA } from '../PhilSAContext';
import { useMockData } from '../services/mockService';
import {
  backendApplicationService,
  createBackendApplicationDraftInput,
  mapBackendApplicationToFrontend,
  type StudentRegistrationFieldConfig,
} from '../services/backendApplicationService';
import { buildAdminPreviewApplication } from '../services/adminPreviewApplication';
import type { Application } from '../types';
import blurrySelfieImg from '../assets/images/blurry-selfie.png';
import passSelfieImg from '../assets/images/pass-selfie.png';
import poorLightingSelfieImg from '../assets/images/poorligthing-selfie.png';
import { CheckCircle, AlertCircle, Save, ChevronRight, ChevronLeft, Shield, User, School, ShieldCheck, Power, Clock, LifeBuoy, RefreshCw, Lock, AlertTriangle, Mail, Phone, Upload, Smartphone, Camera, Pencil } from 'lucide-react';
import { cn, formatCandidateId } from '../lib/utils';

const SECTIONS = [
  'Identity & Biometrics',
  'Contact & Security Setup',
  'Review & Submit'
];
const STEP_TRACKER_LABELS = ['Identity & Biometrics', 'Account Set Up', 'Review & Submit'];

const PWD_CATEGORY_OPTIONS = [
  {
    type: 'Psychosocial disability',
    conditions: ['Bipolar disorder', 'Depression', 'Schizophrenia', 'ADHD', 'Epilepsy', 'Other long-term mental/behavioral condition'],
  },
  {
    type: 'Disability due to chronic illness',
    conditions: ['Orthopedic disability from cancer', 'Blindness from diabetes', 'Dialysis', 'Heart disorder', 'Severe cancer', 'Other disability arising from a chronic disease'],
  },
  {
    type: 'Learning disability',
    conditions: ['Dyslexia', 'Dysgraphia', 'Similar learning disability'],
  },
  {
    type: 'Intellectual disability',
    conditions: ['Cognitive impairment affecting adaptive functioning'],
  },
  {
    type: 'Mental disability',
    conditions: ['Broader mental impairment classification used in the NCDA list'],
  },
  {
    type: 'Visual disability',
    conditions: ['Blindness', 'Low vision', 'Functional visual limitation certified by an ophthalmologist'],
  },
  {
    type: 'Physical/orthopedic disability',
    conditions: ['Mobility impairment', 'Missing limb', 'Other physical/orthopedic disability'],
  },
  {
    type: 'Speech impairment',
    conditions: ['Communication disorder'],
  },
  {
    type: 'Deaf / hard-of-hearing',
    conditions: ['Deaf', 'Hard-of-hearing', 'Other hearing impairment'],
  },
  {
    type: 'Cancer and rare diseases',
    conditions: ['Cancer', 'Rare disease'],
  },
];
const PWD_MULTIPLE_CATEGORY = 'Multiple Disability';
const PWD_ID_MAX_BYTES = 5 * 1024 * 1024;
const PWD_ID_ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'application/pdf']);
const SELFIE_CAPTURE_COUNTDOWN_SECONDS = 5;
const SELFIE_FRAME_CHECK_INTERVAL_MS = 1000;
const CAPTURED_SELFIE_RETAKE_MESSAGE = 'Retake photo. Photo must be clear.';
const MEDIAPIPE_TASKS_VERSION = '0.10.35';
const MEDIAPIPE_WASM_BASE_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_TASKS_VERSION}/wasm`;
const MEDIAPIPE_FACE_DETECTOR_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite';

type LrnVerificationCategory = 'email' | 'birthday' | 'student_id' | 'mobile' | 'mother_name';
type SelfieFrameAnalysis = {
  faceDetected: boolean;
  faceCount: number;
  faceCentered: boolean;
  faceTooSmall: boolean;
  facePartlyOutside: boolean;
  usedMediaPipe: boolean;
};
type CapturedSelfieValidationStatus = 'idle' | 'checking' | 'passed' | 'failed';
type CapturedSelfieValidationResult = {
  passed: boolean;
  message: string;
};
type LrnVerificationReview = {
  lrn: string;
  categoryLabel: string;
  inputLabel: string;
  value: string;
};

const LRN_VERIFICATION_CATEGORIES: Array<{
  value: LrnVerificationCategory;
  label: string;
  inputLabel: string;
  placeholder: string;
  helpText: string;
  inputType?: 'text' | 'email' | 'date' | 'tel';
}> = [
  {
    value: 'email',
    label: 'Email Address',
    inputLabel: 'Registered Email Address',
    placeholder: 'Enter the email address linked to your LRN.',
    helpText: 'Provide the registered email address in the LRN database associated with your LRN.',
    inputType: 'email',
  },
  {
    value: 'birthday',
    label: 'Birthday (Format: YYYY-MM-DD)',
    inputLabel: 'Registered Birthday',
    placeholder: 'YYYY-MM-DD',
    helpText: 'Provide the birth date recorded against your LRN.',
    inputType: 'date',
  },
  {
    value: 'student_id',
    label: 'Student ID / School Card Number',
    inputLabel: 'Student ID / School Card Number',
    placeholder: 'Enter your school card or student ID number.',
    helpText: 'Provide the student ID or school card number registered with your learner record.',
  },
  {
    value: 'mobile',
    label: 'Mobile Number (Format: 11-digit)',
    inputLabel: 'Registered Mobile Number',
    placeholder: 'e.g. 09171234567',
    helpText: 'Provide the 11-digit mobile number linked to your LRN.',
    inputType: 'tel',
  },
  {
    value: 'mother_name',
    label: "Mother's Name (Maiden Full Name)",
    inputLabel: "Mother's Maiden Full Name",
    placeholder: "Enter your mother's maiden full name.",
    helpText: 'Provide the registered maiden full name associated with your LRN record.',
  },
];

const LRN_COOLDOWN_SECONDS = 900;
const LRN_COOLDOWN_STORAGE_KEY = 'philsa_lrn_cooldown_expires_at';
const REGISTRATION_DRAFT_STORAGE_KEY = 'philsa_student_registration_session_draft';
const REGISTRATION_SESSION_ID_STORAGE_KEY = 'philsa_student_registration_session_id';
const REGISTRATION_SESSION_DURATION_SECONDS = 1800;

type RegistrationSessionDraft = {
  expiresAt: number;
  formData?: Record<string, unknown>;
  currentSection?: number;
  visitedSections?: number[];
  verificationPath?: 'philsys' | 'lrn' | 'manual' | null;
  isIdVerified?: boolean;
  registryLockedFields?: string[];
  lrnVerificationCategory?: LrnVerificationCategory;
  lrnRegisteredValue?: string;
  lrnVerificationReview?: LrnVerificationReview | null;
  biometricSelfieFileName?: string;
  biometricSelfieStatus?: 'idle' | 'reviewing' | 'uploading' | 'stored' | 'failed';
  biometricSelfieMessage?: string;
  capturedSelfiePreview?: string;
  isEmailVerified?: boolean;
  emailOtpSentTo?: string;
  emailVerificationToken?: string;
  reviewCertified?: boolean;
};

function readRegistrationSessionDraft(): RegistrationSessionDraft | null {
  const saved = sessionStorage.getItem(REGISTRATION_DRAFT_STORAGE_KEY);
  if (!saved) return null;
  try {
    const parsed = JSON.parse(saved) as RegistrationSessionDraft;
    if (!parsed.expiresAt || parsed.expiresAt <= Date.now()) {
      sessionStorage.removeItem(REGISTRATION_DRAFT_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    sessionStorage.removeItem(REGISTRATION_DRAFT_STORAGE_KEY);
    return null;
  }
}

function clearRegistrationSessionDraft() {
  sessionStorage.removeItem(REGISTRATION_DRAFT_STORAGE_KEY);
}

function getOrCreateRegistrationSessionId() {
  const existing = sessionStorage.getItem(REGISTRATION_SESSION_ID_STORAGE_KEY);
  if (existing) return existing;
  const generated = `REG-SESSION-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  sessionStorage.setItem(REGISTRATION_SESSION_ID_STORAGE_KEY, generated);
  return generated;
}

function createNewRegistrationSessionId() {
  sessionStorage.removeItem(REGISTRATION_SESSION_ID_STORAGE_KEY);
  return getOrCreateRegistrationSessionId();
}

function getStoredLrnCooldownSecondsLeft() {
  const storedExpiry = Number(localStorage.getItem(LRN_COOLDOWN_STORAGE_KEY));
  if (!Number.isFinite(storedExpiry) || storedExpiry <= 0) return 0;

  const secondsLeft = Math.ceil((storedExpiry - Date.now()) / 1000);
  if (secondsLeft <= 0) {
    localStorage.removeItem(LRN_COOLDOWN_STORAGE_KEY);
    return 0;
  }
  return secondsLeft;
}

function storeLrnCooldownExpiry(secondsLeft = LRN_COOLDOWN_SECONDS) {
  localStorage.setItem(LRN_COOLDOWN_STORAGE_KEY, String(Date.now() + secondsLeft * 1000));
}

function clearStoredLrnCooldown() {
  localStorage.removeItem(LRN_COOLDOWN_STORAGE_KEY);
}

function getEmptyRegistrationFormData() {
  return {
    firstName: '',
    middleName: '',
    noMiddleName: false,
    lastName: '',
    suffix: '',
    dob: '',
    birthPlace: '',
    nationality: '',
    gender: '',
    email: '',
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
    gradeLevel: '',
    enrollmentStatus: '',
    schoolYear: '',
    customStep1Fields: {} as Record<string, string>,
    isPwd: false,
    pwdType: '',
    pwdCondition: '',
    pwdMultipleCategories: {} as Record<string, string>,
    pwdIdNumber: '',
    pwdIdFilename: '',
    pwdIdPreviewUrl: '',
    pwdAccommodation: '',
    gwa: '',
    birthCertificateFilename: '',
    goodMoralFilename: '',
    form137Filename: '',
    form138Filename: '',
    enrollmentCertFilename: '',
    nationalIdFilename: '',
    universities: [] as string[],
    courses: [] as string[],
    examScheduleId: '',
  };
}

export default function StudentApplication() {
  const isPwaMode = new URLSearchParams(window.location.search).get('pwa') === 'true';
  const { user, addAuditLog, inputModules, addTicket } = usePhilSA();
  const usesBackendServiceMode = import.meta.env.VITE_AUTH_SERVICE_MODE === 'backend';
  const registrationSessionIdRef = useRef(getOrCreateRegistrationSessionId());
  const restoredSessionDraftRef = useRef<RegistrationSessionDraft | null>(readRegistrationSessionDraft());
  const restoredSessionDraft = restoredSessionDraftRef.current;
  const isRegActive = inputModules?.find(m => m.id === 'student_reg')?.isActive !== false;
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
    'LRN', 'Email Address', 'Birth Date', 'First Name', 'Middle Name', 'Last Name', 'Extension Name',
    'Sex', 'School ID', 'School Name', 'Grade Level', 'Enrollment Status', 'School Year',
    'PWD', 'PWD Type', 'Condition', 'PWD ID Number', 'PWD ID Attachment', 'Accommodation Needed',
  ]);
  const isStep1FieldEnabled = (fieldName: string) => !hasStep1FieldMaintenance || step1FieldConfigs.some(c => c.value === fieldName && isActiveConfig(c));
  const getStep1FieldConfig = (fieldName: string) => step1FieldConfigs.find(c => c.value === fieldName);
  const defaultStep1FieldSections: Record<string, string> = {
    'LRN': 'Personal Information',
    'Email Address': 'Personal Information',
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
    'PWD': 'PWD Information',
    'PWD Type': 'PWD Information',
    'Condition': 'PWD Information',
    'PWD ID Number': 'PWD Information',
    'PWD ID Attachment': 'PWD Information',
    'Accommodation Needed': 'PWD Information',
  };
  const getStep1FieldSection = (fieldName: string) => getStep1FieldConfig(fieldName)?.fieldSection || defaultStep1FieldSections[fieldName] || 'Additional Information';
  const isPwdStep1Field = (field: StudentRegistrationFieldConfig) => getStep1FieldSection(field.value) === 'PWD Information';
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
  const [registryLockedFields, setRegistryLockedFields] = useState<string[]>(() => restoredSessionDraft?.registryLockedFields ?? []);
  const isRegistryLocked = (fieldName: string) => isIdVerified && registryLockedFields.includes(fieldName);
  const activeVerificationPath: 'lrn' | 'philsys' | 'manual' | null = lrnActive ? 'lrn' : philsysActive ? 'philsys' : manualActive ? 'manual' : null;

  const { applications, setApplications } = useMockData();
  const [currentSection, setCurrentSection] = useState(() => restoredSessionDraft?.currentSection ?? 0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isIdVerified, setIsIdVerified] = useState(() => restoredSessionDraft?.isIdVerified ?? false);
  const [lrnVerificationCategory, setLrnVerificationCategory] = useState<LrnVerificationCategory>(() => restoredSessionDraft?.lrnVerificationCategory ?? 'email');
  const [lrnRegisteredValue, setLrnRegisteredValue] = useState(() => restoredSessionDraft?.lrnRegisteredValue ?? '');
  const [lrnVerificationReview, setLrnVerificationReview] = useState<LrnVerificationReview | null>(() => restoredSessionDraft?.lrnVerificationReview ?? null);
  const [biometricSelfieFileName, setBiometricSelfieFileName] = useState(() => restoredSessionDraft?.biometricSelfieFileName ?? '');
  const [biometricSelfieStatus, setBiometricSelfieStatus] = useState<'idle' | 'reviewing' | 'uploading' | 'stored' | 'failed'>(() => restoredSessionDraft?.biometricSelfieStatus ?? 'idle');
  const [biometricSelfieMessage, setBiometricSelfieMessage] = useState(() => restoredSessionDraft?.biometricSelfieMessage ?? '');
  const [capturedSelfiePreview, setCapturedSelfiePreview] = useState(() => restoredSessionDraft?.capturedSelfiePreview ?? '');
  const [pendingSelfieFile, setPendingSelfieFile] = useState<File | null>(null);
  const [capturedSelfieValidationStatus, setCapturedSelfieValidationStatus] = useState<CapturedSelfieValidationStatus>('idle');
  const [isSelfieCameraActive, setIsSelfieCameraActive] = useState(false);
  const [showSelfieTutorial, setShowSelfieTutorial] = useState(false);
  const [hasSeenSelfieTutorial, setHasSeenSelfieTutorial] = useState(false);
  const [selfieFaceStatus, setSelfieFaceStatus] = useState<'idle' | 'scanning' | 'detected' | 'counting' | 'captured'>('idle');
  const [selfieFaceValidated, setSelfieFaceValidated] = useState(false);
  const [selfieCountdown, setSelfieCountdown] = useState<number | null>(null);
  const selfieVideoRef = useRef<HTMLVideoElement | null>(null);
  const selfieStreamRef = useRef<MediaStream | null>(null);
  const selfieDetectionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const selfieCountdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const selfieAutoCaptureRef = useRef(false);
  const selfieDetectionRequestInFlightRef = useRef(false);
  const mediaPipeFaceDetectorRef = useRef<MediaPipeFaceDetector | null>(null);
  const mediaPipeFaceDetectorPromiseRef = useRef<Promise<MediaPipeFaceDetector | null> | null>(null);
  const mediaPipeFaceDetectorUnavailableRef = useRef(false);
  const pwdIdPreviewUrlRef = useRef('');
  const [candidateId, setCandidateId] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lrnVerificationToken, setLrnVerificationToken] = useState('');
  const [visitedSections, setVisitedSections] = useState<number[]>(() => restoredSessionDraft?.visitedSections ?? [0]);
  const [isEditingCorrection, setIsEditingCorrection] = useState(false);

  // Gap Features (Inactivity Timeout & Helpdesk Routing)
  const [timeLeft, setTimeLeft] = useState(() => {
    if (!restoredSessionDraft?.expiresAt) return REGISTRATION_SESSION_DURATION_SECONDS;
    return Math.max(1, Math.ceil((restoredSessionDraft.expiresAt - Date.now()) / 1000));
  });
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const [showHelpdeskTicket, setShowHelpdeskTicket] = useState(false);
  const [supportReferenceNumber, setSupportReferenceNumber] = useState('');
  const [showPrivacyConsent, setShowPrivacyConsent] = useState(() => !restoredSessionDraft);
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [reviewCertified, setReviewCertified] = useState(() => restoredSessionDraft?.reviewCertified ?? false);

  // New Verification Path States
  const [verificationPath, setVerificationPath] = useState<'philsys' | 'lrn' | 'manual' | null>(() => restoredSessionDraft?.verificationPath ?? null);
  const visibleVerificationPath = verificationPath ?? activeVerificationPath;
  const step1ModeTitle = visibleVerificationPath === 'philsys'
    ? 'PhilSys ID Setup'
    : visibleVerificationPath === 'manual'
      ? 'Manual Registration'
      : 'Identity & Biometrics';
  const step1ModeSubtitle = visibleVerificationPath === 'philsys'
    ? 'PhilSys Identity Verification'
    : visibleVerificationPath === 'manual'
      ? 'Step 1 Field Entry'
      : 'LRN Registry Verification';
  const step1ModeDescription = visibleVerificationPath === 'philsys'
    ? 'Enter your PhilSys ID to retrieve verified identity records. Complete any remaining high-priority school information before account creation.'
    : visibleVerificationPath === 'manual'
      ? 'Enter the active Step 1 registration fields configured in Student Registration Maintenance.'
      : 'Verify your Learner Reference Number (LRN) against registered information, then capture your live biometric verification selfie.';
  const [initialLrnCooldownSecondsLeft] = useState(() => getStoredLrnCooldownSecondsLeft());
  const [lrnAttemptsLeft, setLrnAttemptsLeft] = useState(initialLrnCooldownSecondsLeft > 0 ? 0 : 5);
  const [showLrnCooldownModal, setShowLrnCooldownModal] = useState(initialLrnCooldownSecondsLeft > 0);
  const [cooldownSecondsLeft, setCooldownSecondsLeft] = useState(initialLrnCooldownSecondsLeft || LRN_COOLDOWN_SECONDS);

  useEffect(() => {
    if (!showLrnCooldownModal) return undefined;

    const syncCooldownFromStorage = () => {
      const secondsLeft = getStoredLrnCooldownSecondsLeft();
      if (secondsLeft <= 0) {
        setShowLrnCooldownModal(false);
        setLrnAttemptsLeft(5);
        setCooldownSecondsLeft(LRN_COOLDOWN_SECONDS);
        setRegistryLockedFields([]);
        setErrors({});
        setFormData(p => ({ ...p, lrn: '' }));
        return;
      }

      setCooldownSecondsLeft(secondsLeft);
      setLrnAttemptsLeft(0);
    };

    syncCooldownFromStorage();
    const interval = setInterval(syncCooldownFromStorage, 1000);
    return () => {
      clearInterval(interval);
    };
  }, [showLrnCooldownModal]);

  // Maintenance controls which single registration mode is visible.
  useEffect(() => {
    if (!showPrivacyConsent) {
      if (restoredSessionDraft?.verificationPath && verificationPath === restoredSessionDraft.verificationPath) {
        return;
      }
      setVerificationPath(activeVerificationPath);
      if (activeVerificationPath !== 'lrn') setLrnVerificationToken('');
      if (activeVerificationPath === 'manual') {
        setIsIdVerified(false);
        setRegistryLockedFields([]);
      }
    }
  }, [showPrivacyConsent, activeVerificationPath, restoredSessionDraft, verificationPath]);
  const [emailOtp, setEmailOtp] = useState('');
  const [emailOtpSentTo, setEmailOtpSentTo] = useState(() => restoredSessionDraft?.emailOtpSentTo ?? '');
  const [isEmailVerified, setIsEmailVerified] = useState(() => restoredSessionDraft?.isEmailVerified ?? false);
  const [emailVerificationToken, setEmailVerificationToken] = useState(() => restoredSessionDraft?.emailVerificationToken ?? '');
  const [isSendingEmailOtp, setIsSendingEmailOtp] = useState(false);
  const [isVerifyingEmailOtp, setIsVerifyingEmailOtp] = useState(false);

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
          clearRegistrationSessionDraft();
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
    clearRegistrationSessionDraft();
    if (pwdIdPreviewUrlRef.current) {
      URL.revokeObjectURL(pwdIdPreviewUrlRef.current);
      pwdIdPreviewUrlRef.current = '';
    }
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
      isPwd: false,
      pwdType: '',
      pwdCondition: '',
      pwdMultipleCategories: {},
      pwdIdNumber: '',
      pwdIdFilename: '',
      pwdIdPreviewUrl: '',
      pwdAccommodation: '',
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
    setLrnVerificationCategory('email');
    setLrnRegisteredValue('');
    setLrnVerificationReview(null);
    setBiometricSelfieFileName('');
    setBiometricSelfieStatus('idle');
    setBiometricSelfieMessage('');
    setCapturedSelfiePreview('');
    setCapturedSelfieValidationStatus('idle');
    stopSelfieCamera();
    setVerificationPath(activeVerificationPath);
    setLrnVerificationToken('');
    setEmailOtp('');
    setEmailOtpSentTo('');
    setIsEmailVerified(false);
    setCurrentSection(0);
    setVisitedSections([0]);
    setIsSessionExpired(false);
    setShowHelpdeskTicket(false);
    setReviewCertified(false);
    setTimeLeft(1800);
    setErrors({});
    setTicketContactEmail('');
    setTicketDescription('');
    setTicketAttachment('');
    setTicketFormErrors({});
    setIsTicketSubmitted(false);
    registrationSessionIdRef.current = createNewRegistrationSessionId();
    addAuditLog('SESSION_RESTARTED', 'Student registration session manually restarted.');
  };

  // Find user's existing application (if any). In backend mode this must come
  // from the real API, not the mock array -- otherwise a real returning
  // student who already submitted would incorrectly fall through to the
  // fresh-registration wizard below instead of their tracking status, since
  // the mock `applications` array never contains their real record.
  const [backendMyApp, setBackendMyApp] = useState<Application | null>(null);
  useEffect(() => {
    if (!usesBackendServiceMode || !user) return;
    let isMounted = true;
    (async () => {
      const result = await backendApplicationService.getMyApplication();
      if (!isMounted) return;
      if (result.ok) {
        setBackendMyApp(result.data ? mapBackendApplicationToFrontend(result.data, user.id) : null);
      }
    })();
    return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usesBackendServiceMode, user?.id]);

  const mockMyApp = applications.find(a => a.userId === user?.id);
  const realApp = usesBackendServiceMode ? backendMyApp : mockMyApp;
  const isAdminPreview = !realApp && user?.role === 'SYSTEM_ADMIN';
  const myApp = realApp ?? (isAdminPreview ? buildAdminPreviewApplication(user!) : realApp);
  const restoredFormData = { ...(restoredSessionDraft?.formData ?? {}) };
  delete restoredFormData.password;
  delete restoredFormData.confirmPassword;

  const [formData, setFormData] = useState(() => ({
    ...getEmptyRegistrationFormData(),
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    nationality: 'Filipino',
    email: user?.email || '',
    gradeLevel: 'Grade 12',
    schoolYear: '2026-2027',
    ...restoredFormData,
  }));

  useEffect(() => {
    if (showPrivacyConsent || isSubmitted || isSessionExpired || showHelpdeskTicket) return;

    const {
      password: _password,
      confirmPassword: _confirmPassword,
      pwdIdPreviewUrl: _pwdIdPreviewUrl,
      ...persistableFormData
    } = formData;
    const draft: RegistrationSessionDraft = {
      expiresAt: Date.now() + timeLeft * 1000,
      formData: {
        ...persistableFormData,
        pwdIdPreviewUrl: '',
      },
      currentSection,
      visitedSections,
      verificationPath,
      isIdVerified,
      registryLockedFields,
      lrnVerificationCategory,
      lrnRegisteredValue,
      lrnVerificationReview,
      biometricSelfieFileName,
      biometricSelfieStatus,
      biometricSelfieMessage,
      capturedSelfiePreview,
      isEmailVerified,
      emailOtpSentTo,
      emailVerificationToken,
      reviewCertified,
    };

    try {
      sessionStorage.setItem(REGISTRATION_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch {
      sessionStorage.setItem(REGISTRATION_DRAFT_STORAGE_KEY, JSON.stringify({
        ...draft,
        capturedSelfiePreview: '',
      }));
    }
  }, [
    biometricSelfieFileName,
    biometricSelfieMessage,
    biometricSelfieStatus,
    capturedSelfiePreview,
    currentSection,
    emailOtpSentTo,
    emailVerificationToken,
    formData,
    isEmailVerified,
    isIdVerified,
    isSessionExpired,
    isSubmitted,
    lrnRegisteredValue,
    lrnVerificationCategory,
    lrnVerificationReview,
    registryLockedFields,
    reviewCertified,
    showHelpdeskTicket,
    showPrivacyConsent,
    timeLeft,
    verificationPath,
    visitedSections,
  ]);

  const step1FormFieldKeys: Record<string, keyof typeof formData> = {
    'LRN': 'lrn',
    'Email Address': 'email',
    'Birth Date': 'dob',
    'First Name': 'firstName',
    'Middle Name': 'middleName',
    'Last Name': 'lastName',
    'Extension Name': 'suffix',
    'Sex': 'gender',
    'School ID': 'schoolId',
    'School Name': 'schoolName',
    'Grade Level': 'gradeLevel',
    'Enrollment Status': 'enrollmentStatus',
    'School Year': 'schoolYear',
  };

  const activeStep1ManualFields = step1FieldConfigs
    .filter(isActiveConfig)
    .filter(field => !isPwdStep1Field(field))
    .sort((a, b) => (a.display_order ?? 100) - (b.display_order ?? 100));

  const manualStep1Sections = ['Personal Information', 'School Information', 'Additional Information'];
  const getPwdFieldConfig = (fieldName: string) => step1FieldConfigs.find(field => field.value === fieldName && getStep1FieldSection(field.value) === 'PWD Information');
  const isPwdFieldActive = (fieldName: string) => {
    const config = getPwdFieldConfig(fieldName);
    return Boolean(config && isActiveConfig(config));
  };
  const isPwdFieldRequired = (fieldName: string) => getPwdFieldConfig(fieldName)?.priority === 'High Priority';
  const getPwdFieldOptions = (fieldName: string, fallback: string[]) => {
    const options = getPwdFieldConfig(fieldName)?.optionValues;
    return Array.isArray(options) && options.length > 0 ? options : fallback;
  };
  const isPwdMaintenanceEnabled = isPwdFieldActive('PWD');

  const getStep1FieldErrorKey = (field: StudentRegistrationFieldConfig) => {
    const formKey = step1FormFieldKeys[field.value];
    return typeof formKey === 'string' ? formKey : `customStep1:${field.value}`;
  };

  const getManualStep1FieldValue = (field: StudentRegistrationFieldConfig) => {
    const formKey = step1FormFieldKeys[field.value];
    return typeof formKey === 'string'
      ? String(formData[formKey] ?? '')
      : formData.customStep1Fields[field.value] || '';
  };

  const uploadRegistrationAttachmentFile = async (fieldName: string, file: File): Promise<string> => {
    if (!PWD_ID_ALLOWED_TYPES.has(file.type)) {
      throw new Error('Attachment must be a JPEG, PNG, or PDF file.');
    }
    if (file.size > PWD_ID_MAX_BYTES) {
      throw new Error('Attachment must not exceed 5 MB.');
    }
    if (!usesBackendServiceMode) {
      return file.name;
    }
    const result = await backendApplicationService.uploadRegistrationAttachment(fieldName, file, {
      registrationSessionId: registrationSessionIdRef.current,
    });
    if (result.ok === false) {
      throw new Error(result.error.message);
    }
    return result.data.filename || file.name;
  };

  const getManualReviewFields = (section: string) =>
    activeStep1ManualFields.filter(field => getStep1FieldSection(field.value) === section);

  const manualReviewFullName = [formData.firstName, formData.middleName, formData.lastName]
    .filter(Boolean)
    .join(' ') || 'Not entered';

  const isCurrentUserApplication = (application: { id?: string; userId?: string }) =>
    Boolean(myApp && (application.id === myApp.id || (application.userId && myApp.userId && application.userId === myApp.userId)));

  const doesLrnAlreadyExist = (value: string) => {
    if (usesBackendServiceMode) return false;
    const normalizedValue = value.trim();
    if (!normalizedValue) return false;
    return applications.some(application =>
      !isCurrentUserApplication(application) && String(application.lrn || '').trim() === normalizedValue
    );
  };

  const doesEmailAlreadyExist = (value: string) => {
    if (usesBackendServiceMode) return false;
    const normalizedValue = value.trim().toLowerCase();
    if (!normalizedValue) return false;
    return applications.some(application =>
      !isCurrentUserApplication(application) && String(application.email || '').trim().toLowerCase() === normalizedValue
    );
  };

  const getExistingValueFieldMessage = (fieldName: string, value: string) => {
    if (fieldName === 'LRN' && doesLrnAlreadyExist(value)) {
      return 'LRN already exists in another registration.';
    }
    if (fieldName === 'Email Address' && doesEmailAlreadyExist(value)) {
      return 'Email address already exists in another registration.';
    }
    return '';
  };

  const existingLrnMessage = getExistingValueFieldMessage('LRN', formData.lrn);
  const existingEmailMessage = getExistingValueFieldMessage('Email Address', formData.email);

  const clearPwdErrors = () => {
    setErrors(prev => {
      const next = { ...prev };
      delete next.pwdType;
      delete next.pwdCondition;
      delete next.pwdMultipleCategories;
      delete next.pwdIdNumber;
      delete next.pwdIdFilename;
      delete next.pwdIdPreviewUrl;
      delete next.pwdAccommodation;
      delete next.general;
      return next;
    });
  };

  const setPwdEnabled = (enabled: boolean) => {
    if (enabled && !isPwdMaintenanceEnabled) return;
    if (!enabled && pwdIdPreviewUrlRef.current) {
      URL.revokeObjectURL(pwdIdPreviewUrlRef.current);
      pwdIdPreviewUrlRef.current = '';
    }
    setFormData(prev => ({
      ...prev,
      isPwd: enabled,
      ...(enabled ? {} : {
        pwdType: '',
        pwdCondition: '',
        pwdMultipleCategories: {},
        pwdIdNumber: '',
        pwdIdFilename: '',
        pwdIdPreviewUrl: '',
        pwdAccommodation: '',
      }),
    }));
    clearPwdErrors();
  };

  const activePwdTypes = getPwdFieldOptions('PWD Type', PWD_CATEGORY_OPTIONS.map(option => option.type));
  const normalizedActivePwdTypes = activePwdTypes.includes(PWD_MULTIPLE_CATEGORY)
    ? activePwdTypes
    : [...activePwdTypes, PWD_MULTIPLE_CATEGORY];
  const configuredPwdConditions = getPwdFieldOptions('Condition', PWD_CATEGORY_OPTIONS.flatMap(option => option.conditions));
  const selectedPwdCategoryConditions = PWD_CATEGORY_OPTIONS.find(option => option.type === formData.pwdType)?.conditions ?? [];
  const filteredPwdConditions = selectedPwdCategoryConditions.filter(condition => configuredPwdConditions.includes(condition));
  const activePwdConditions = selectedPwdCategoryConditions.length > 0
    ? (filteredPwdConditions.length > 0 ? filteredPwdConditions : selectedPwdCategoryConditions)
    : configuredPwdConditions;

  const isStep1FieldRequired = (field: StudentRegistrationFieldConfig) => field.priority === 'High Priority';
  const selectedMultiplePwdEntries = Object.entries(formData.pwdMultipleCategories).filter(([, condition]) => condition.trim());
  const manualStep1NamePlaceholders: Record<string, string> = {
    'First Name': 'Enter First Name',
    'Middle Name': 'Enter Middle Name',
    'Last Name': 'Enter Last Name',
    'LRN': 'Enter Learner Reference Number',
  };

  const renderManualStep1Field = (field: StudentRegistrationFieldConfig) => {
    const formKey = step1FormFieldKeys[field.value];
    const errorKey = getStep1FieldErrorKey(field);
    const value = getManualStep1FieldValue(field);
    const required = isStep1FieldRequired(field);
    const options = Array.isArray(field.optionValues) ? field.optionValues : [];
    const existingValueMessage = getExistingValueFieldMessage(field.value, value);
    const manualInputType = field.value === 'Email Address' ? 'email' : field.inputType === 'date' ? 'date' : 'text';

    const updateValue = (nextValue: string) => {
      if (typeof formKey === 'string') {
        setFormData(prev => ({ ...prev, [formKey]: nextValue }));
      } else {
        setFormData(prev => ({
          ...prev,
          customStep1Fields: {
            ...prev.customStep1Fields,
            [field.value]: nextValue,
          },
        }));
      }
      if (errors[errorKey] || errors.general) {
        setErrors(prev => {
          const next = { ...prev };
          delete next[errorKey];
          delete next.general;
          return next;
        });
      }
    };

    return (
      <div key={field.id || field.value} className="space-y-2">
        <label className={cn("label-philsa", errors[errorKey] ? "text-philsa-red" : "text-philsa-gray")}>
          {field.value}{required ? ' *' : ''}
        </label>
        {field.inputType === 'file' ? (
          <label className={cn(
            "flex min-h-[48px] cursor-pointer items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3 text-sm font-bold text-philsa-navy shadow-sm transition-colors hover:border-philsa-red/40",
            (errors[errorKey] || existingValueMessage) && "border-philsa-red bg-philsa-red/5"
          )}>
            <span className="min-w-0 truncate">{value || 'Choose file'}</span>
            <Upload className="h-4 w-4 shrink-0 text-philsa-red" />
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const filename = await uploadRegistrationAttachmentFile(field.value, file);
                  updateValue(filename);
                } catch (error) {
                  e.target.value = '';
                  updateValue('');
                  setErrors(prev => ({ ...prev, [errorKey]: error instanceof Error ? error.message : 'Attachment upload failed.' }));
                }
              }}
            />
          </label>
        ) : field.inputType === 'dropdown' && options.length > 0 ? (
          <select
            className={cn("input-philsa bg-white", (errors[errorKey] || existingValueMessage) && "border-philsa-red bg-philsa-red/5")}
            value={value}
            onChange={(e) => updateValue(e.target.value)}
          >
            <option value="">Select {field.value}</option>
            {options.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        ) : (
          <input
            type={manualInputType}
            className={cn("input-philsa bg-white", (errors[errorKey] || existingValueMessage) && "border-philsa-red bg-philsa-red/5")}
            value={value}
            onChange={(e) => updateValue(e.target.value)}
            placeholder={manualStep1NamePlaceholders[field.value] || field.remarks || `Enter ${field.value}`}
          />
        )}
        {(errors[errorKey] || existingValueMessage) && (
          <p className="text-xs text-philsa-red font-bold pl-1">{errors[errorKey] || existingValueMessage}</p>
        )}
      </div>
    );
  };

  const renderAdditionalStep1Field = (field: StudentRegistrationFieldConfig) => {
    const errorKey = `customStep1:${field.value}`;
    return (
      <div key={field.id || field.value} className="space-y-2">
        <label className="label-philsa">{field.value} *</label>
        {field.inputType === 'file' ? (
          <label className={cn(
            "flex min-h-[48px] cursor-pointer items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3 text-sm font-bold text-philsa-navy shadow-sm transition-colors hover:border-philsa-red/40",
            errors[errorKey] && "border-philsa-red bg-philsa-red/5"
          )}>
            <span className="min-w-0 truncate">{formData.customStep1Fields[field.value] || 'Choose file'}</span>
            <Upload className="h-4 w-4 shrink-0 text-philsa-red" />
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const filename = await uploadRegistrationAttachmentFile(field.value, file);
                  setFormData(prev => ({
                    ...prev,
                    customStep1Fields: {
                      ...prev.customStep1Fields,
                      [field.value]: filename,
                    },
                  }));
                  setErrors(prev => {
                    const next = { ...prev };
                    delete next[errorKey];
                    return next;
                  });
                } catch (error) {
                  e.target.value = '';
                  setFormData(prev => ({
                    ...prev,
                    customStep1Fields: {
                      ...prev.customStep1Fields,
                      [field.value]: '',
                    },
                  }));
                  setErrors(prev => ({ ...prev, [errorKey]: error instanceof Error ? error.message : 'Attachment upload failed.' }));
                }
              }}
            />
          </label>
        ) : field.inputType === 'dropdown' && Array.isArray(field.optionValues) && field.optionValues.length > 0 ? (
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
    
    setTimeout(() => {
      setTimeout(() => {
        setTimeout(() => {
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
    setEmailOtpSentTo('');
    setIsEmailVerified(false);
    setEmailVerificationToken('');
  };

  const selectedLrnVerificationCategory = LRN_VERIFICATION_CATEGORIES.find(category => category.value === lrnVerificationCategory) ?? LRN_VERIFICATION_CATEGORIES[0];
  const dossierVerificationLabel = (lrnVerificationReview?.inputLabel || selectedLrnVerificationCategory.inputLabel).replace(/^Registered /, 'Verified ');

  function clearSelfieTimers() {
    if (selfieDetectionIntervalRef.current) {
      clearInterval(selfieDetectionIntervalRef.current);
      selfieDetectionIntervalRef.current = null;
    }
    if (selfieCountdownIntervalRef.current) {
      clearInterval(selfieCountdownIntervalRef.current);
      selfieCountdownIntervalRef.current = null;
    }
    selfieAutoCaptureRef.current = false;
    setSelfieCountdown(null);
  }

  function emptySelfieFrameAnalysis(): SelfieFrameAnalysis {
    return {
      faceDetected: false,
      faceCount: 0,
      faceCentered: false,
      faceTooSmall: false,
      facePartlyOutside: false,
      usedMediaPipe: false,
    };
  }

  async function getMediaPipeFaceDetector() {
    if (mediaPipeFaceDetectorRef.current) {
      return mediaPipeFaceDetectorRef.current;
    }
    if (mediaPipeFaceDetectorUnavailableRef.current) {
      return null;
    }
    if (!mediaPipeFaceDetectorPromiseRef.current) {
      mediaPipeFaceDetectorPromiseRef.current = FilesetResolver
        .forVisionTasks(MEDIAPIPE_WASM_BASE_URL)
        .then(wasmFileset => MediaPipeFaceDetector.createFromOptions(wasmFileset, {
          baseOptions: {
            modelAssetPath: MEDIAPIPE_FACE_DETECTOR_MODEL_URL,
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          minDetectionConfidence: 0.55,
          minSuppressionThreshold: 0.3,
        }))
        .then(detector => {
          mediaPipeFaceDetectorRef.current = detector;
          return detector;
        })
        .catch(() => {
          mediaPipeFaceDetectorUnavailableRef.current = true;
          return null;
        });
    }
    return mediaPipeFaceDetectorPromiseRef.current;
  }

  function analyzeFaceBox(box: { originX: number; originY: number; width: number; height: number }, width: number, height: number, usedMediaPipe: boolean): SelfieFrameAnalysis {
    const faceCenterX = box.originX + box.width / 2;
    const faceCenterY = box.originY + box.height / 2;
    const horizontalOffset = Math.abs(faceCenterX - width / 2) / width;
    const verticalOffset = Math.abs(faceCenterY - height / 2) / height;
    const faceWidthRatio = box.width / width;
    const faceHeightRatio = box.height / height;
    const marginX = width * 0.04;
    const marginY = height * 0.04;

    return {
      faceDetected: true,
      faceCount: 1,
      faceCentered: horizontalOffset <= 0.18 && verticalOffset <= 0.2,
      faceTooSmall: Math.max(faceWidthRatio, faceHeightRatio) < 0.2,
      facePartlyOutside: box.originX < marginX || box.originY < marginY || box.originX + box.width > width - marginX || box.originY + box.height > height - marginY,
      usedMediaPipe,
    };
  }

  async function analyzeSelfieFrame(source: CanvasImageSource, width: number, height: number): Promise<SelfieFrameAnalysis> {
    if (width === 0 || height === 0) {
      return emptySelfieFrameAnalysis();
    }

    const mediaPipeDetector = await getMediaPipeFaceDetector();
    if (mediaPipeDetector) {
      const result = mediaPipeDetector.detectForVideo(source, performance.now());
      const faces = result.detections ?? [];
      if (faces.length === 0) {
        return { ...emptySelfieFrameAnalysis(), usedMediaPipe: true };
      }
      if (faces.length > 1) {
        return {
          ...emptySelfieFrameAnalysis(),
          faceDetected: true,
          faceCount: faces.length,
          usedMediaPipe: true,
        };
      }
      const boundingBox = faces[0]?.boundingBox;
      if (boundingBox) {
        return analyzeFaceBox(boundingBox, width, height, true);
      }
    }

    let detectedFaceCount: number | null = null;
    const FaceDetectorConstructor = (window as any).FaceDetector;
    if (FaceDetectorConstructor) {
      try {
        const detector = new FaceDetectorConstructor({ fastMode: true, maxDetectedFaces: 2 });
        const faces = await detector.detect(source);
        detectedFaceCount = Array.isArray(faces) ? faces.length : 0;
        if (detectedFaceCount === 1 && faces[0]?.boundingBox) {
          const box = faces[0].boundingBox;
          return analyzeFaceBox(
            { originX: box.x, originY: box.y, width: box.width, height: box.height },
            width,
            height,
            false,
          );
        }
      } catch {
        // Fall through to the frame heuristic below.
      }
    }

    const sampleSize = 96;
    const canvas = document.createElement('canvas');
    canvas.width = sampleSize;
    canvas.height = sampleSize;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) {
      return { faceDetected: false, faceCount: 0 };
    }

    context.drawImage(
      source,
      width * 0.25,
      height * 0.15,
      width * 0.5,
      height * 0.7,
      0,
      0,
      sampleSize,
      sampleSize,
    );

    const pixels = context.getImageData(0, 0, sampleSize, sampleSize).data;
    let totalLuma = 0;
    let totalLumaSquared = 0;
    let skinLikePixels = 0;
    let edgePixels = 0;

    for (let y = 0; y < sampleSize; y += 2) {
      for (let x = 0; x < sampleSize; x += 2) {
        const index = (y * sampleSize + x) * 4;
        const r = pixels[index];
        const g = pixels[index + 1];
        const b = pixels[index + 2];
        const luma = 0.299 * r + 0.587 * g + 0.114 * b;
        totalLuma += luma;
        totalLumaSquared += luma * luma;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const isSkinLike = r > 45 && g > 30 && b > 18 && max - min > 12 && r >= g * 0.9 && r >= b * 1.05;

        if (isSkinLike) {
          skinLikePixels += 1;
        }

        if (x > 0 && y > 0) {
          const previousIndex = ((y - 2) * sampleSize + (x - 2)) * 4;
          const previousLuma = 0.299 * pixels[previousIndex] + 0.587 * pixels[previousIndex + 1] + 0.114 * pixels[previousIndex + 2];
          if (Math.abs(luma - previousLuma) > 18) {
            edgePixels += 1;
          }
        }
      }
    }

    const sampledPixels = (sampleSize / 2) * (sampleSize / 2);
    const averageLuma = totalLuma / sampledPixels;
    const variance = totalLumaSquared / sampledPixels - averageLuma * averageLuma;
    const skinRatio = skinLikePixels / sampledPixels;
    const edgeRatio = edgePixels / sampledPixels;

    const heuristicFaceDetected = averageLuma > 35 && averageLuma < 235 && variance > 180 && edgeRatio > 0.025 && skinRatio > 0.015 && skinRatio < 0.5;
    const faceDetected = detectedFaceCount === null ? heuristicFaceDetected : detectedFaceCount > 0 && heuristicFaceDetected;
    const faceCount = detectedFaceCount ?? (heuristicFaceDetected ? 1 : 0);

    return {
      ...emptySelfieFrameAnalysis(),
      faceDetected,
      faceCount,
      faceCentered: faceDetected && faceCount === 1,
    };
  }

  async function validateCapturedSelfieFile(file: File): Promise<CapturedSelfieValidationResult> {
    const result = verificationPath === 'lrn' && lrnVerificationToken
      ? await backendApplicationService.validateRegistrationSelfieFace(lrnVerificationToken, file)
      : await backendApplicationService.validateManualRegistrationSelfieFace(file);

    if (result.ok === false) {
      return {
        passed: false,
        message: result.error.message ? `Retake photo. ${result.error.message}` : CAPTURED_SELFIE_RETAKE_MESSAGE,
      };
    }

    return {
      passed: result.data.faceDetected && result.data.faceCount === 1 && !result.data.faceCovered,
      message: result.data.faceDetected && result.data.faceCount === 1 && !result.data.faceCovered
        ? 'Captured selfie passed. You can use this photo.'
        : CAPTURED_SELFIE_RETAKE_MESSAGE,
    };
  }

  async function detectFaceInFrame(source: CanvasImageSource, width: number, height: number) {
    const analysis = await analyzeSelfieFrame(source, width, height);
    return analysis.faceDetected && analysis.faceCount === 1 && analysis.faceCentered && !analysis.faceTooSmall && !analysis.facePartlyOutside;
  }

  async function detectManualSelfieFace() {
    const video = selfieVideoRef.current;
    if (!video) return false;
    return detectFaceInFrame(video, video.videoWidth, video.videoHeight);
  }

  async function validateSelfieFrameForAutoCapture() {
    const video = selfieVideoRef.current;
    const analysis = video ? await analyzeSelfieFrame(video, video.videoWidth, video.videoHeight) : emptySelfieFrameAnalysis();
    return {
      isSingleFaceStable: analysis.faceDetected && analysis.faceCount === 1 && analysis.faceCentered && !analysis.faceTooSmall && !analysis.facePartlyOutside,
      message: analysis.faceCount > 1
        ? 'Multiple faces detected. Keep only your face inside the capture frame.'
        : analysis.faceTooSmall
          ? 'Move closer to the camera so your face is clear.'
          : analysis.facePartlyOutside
            ? 'Keep your whole face inside the capture frame.'
            : analysis.faceDetected && !analysis.faceCentered
              ? 'Center your face in the camera frame.'
        : analysis.faceDetected
          ? ''
          : 'Face lost. Countdown reset. Keep your face centered to start capture again.',
    };
  }

  function stopSelfieCamera() {
    clearSelfieTimers();
    selfieStreamRef.current?.getTracks().forEach(track => track.stop());
    selfieStreamRef.current = null;
    if (selfieVideoRef.current) {
      selfieVideoRef.current.srcObject = null;
    }
    setIsSelfieCameraActive(false);
  }

  async function createSelfieFileFromCamera(options: { updatePreview: boolean }) {
    const video = selfieVideoRef.current;
    if (!video || !selfieStreamRef.current || video.videoWidth === 0 || video.videoHeight === 0) {
      setBiometricSelfieStatus('failed');
      setBiometricSelfieMessage('Start the live camera before taking a selfie.');
      return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      setBiometricSelfieStatus('failed');
      setBiometricSelfieMessage('Unable to capture a selfie from the live camera.');
      return null;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    if (options.updatePreview) {
      setCapturedSelfiePreview(canvas.toDataURL('image/jpeg', 0.92));
    }
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
    if (!blob) {
      setBiometricSelfieStatus('failed');
      setBiometricSelfieMessage('Unable to prepare the captured selfie image.');
      return null;
    }

    return new File([blob], `biometric-selfie-${Date.now()}.jpg`, { type: 'image/jpeg' });
  }

  async function captureSelfieFromCamera() {
    const file = await createSelfieFileFromCamera({ updatePreview: true });
    if (!file) return;
    stopSelfieCamera();
    setPendingSelfieFile(file);
    setBiometricSelfieFileName(file.name);
    setBiometricSelfieStatus('reviewing');
    setSelfieFaceStatus('captured');
    setSelfieFaceValidated(false);
    setCapturedSelfieValidationStatus('checking');
    setBiometricSelfieMessage('Checking captured selfie quality...');

    try {
      const validation = await validateCapturedSelfieFile(file);
      setSelfieFaceValidated(validation.passed);
      setCapturedSelfieValidationStatus(validation.passed ? 'passed' : 'failed');
      setBiometricSelfieMessage(validation.message);
    } catch {
      setSelfieFaceValidated(false);
      setCapturedSelfieValidationStatus('failed');
      setBiometricSelfieMessage(CAPTURED_SELFIE_RETAKE_MESSAGE);
    }
  }

  function startSelfieCountdown() {
    if (selfieCountdownIntervalRef.current || selfieAutoCaptureRef.current) return;
    if (selfieDetectionIntervalRef.current) {
      clearInterval(selfieDetectionIntervalRef.current);
      selfieDetectionIntervalRef.current = null;
    }
    setSelfieFaceStatus('counting');
    let countdownValue = SELFIE_CAPTURE_COUNTDOWN_SECONDS;
    setSelfieCountdown(countdownValue);
    setBiometricSelfieMessage('Single face detected. Hold still for automatic capture.');
    selfieCountdownIntervalRef.current = setInterval(() => {
      if (selfieDetectionRequestInFlightRef.current) return;
      selfieDetectionRequestInFlightRef.current = true;

      void validateSelfieFrameForAutoCapture().then(validation => {
        if (!validation.isSingleFaceStable) {
          if (selfieCountdownIntervalRef.current) {
            clearInterval(selfieCountdownIntervalRef.current);
            selfieCountdownIntervalRef.current = null;
          }
          selfieAutoCaptureRef.current = false;
          setSelfieFaceValidated(false);
          setSelfieCountdown(null);
          setSelfieFaceStatus('scanning');
          setBiometricSelfieMessage(validation.message);
          startSelfieFaceDetection();
          return;
        }

        if (countdownValue <= 1) {
          if (selfieCountdownIntervalRef.current) {
            clearInterval(selfieCountdownIntervalRef.current);
            selfieCountdownIntervalRef.current = null;
          }
          selfieAutoCaptureRef.current = true;
          setSelfieFaceValidated(true);
          setSelfieFaceStatus('captured');
          setSelfieCountdown(null);
          void captureSelfieFromCamera();
          return;
        }

        countdownValue -= 1;
        setSelfieCountdown(countdownValue);
      }).catch(() => {
        if (selfieCountdownIntervalRef.current) {
          clearInterval(selfieCountdownIntervalRef.current);
          selfieCountdownIntervalRef.current = null;
        }
        setSelfieFaceStatus('idle');
        setBiometricSelfieStatus('failed');
        setSelfieCountdown(null);
        setBiometricSelfieMessage('Face detection failed. Please restart the camera and try again.');
        stopSelfieCamera();
      }).finally(() => {
        selfieDetectionRequestInFlightRef.current = false;
      });
    }, SELFIE_FRAME_CHECK_INTERVAL_MS);
  }

  function startSelfieFaceDetection() {
    clearSelfieTimers();
    setSelfieFaceStatus('scanning');
    setBiometricSelfieMessage(
      verificationPath === 'manual'
        ? 'Keep your face centered in the frame. Capture will start once the camera is ready.'
        : 'Scanning for your face with server-side validation. Keep your face centered in the frame.'
    );

    if (verificationPath === 'manual') {
      selfieDetectionIntervalRef.current = setInterval(() => {
        if (selfieDetectionRequestInFlightRef.current || selfieAutoCaptureRef.current) return;
        selfieDetectionRequestInFlightRef.current = true;

        void validateSelfieFrameForAutoCapture().then(validation => {
          if (validation.isSingleFaceStable && !selfieAutoCaptureRef.current) {
            setSelfieFaceStatus('detected');
            startSelfieCountdown();
            return;
          }
          if (!selfieAutoCaptureRef.current) {
            setSelfieFaceStatus('scanning');
            setBiometricSelfieMessage(validation.message);
          }
        }).finally(() => {
          selfieDetectionRequestInFlightRef.current = false;
        });
      }, SELFIE_FRAME_CHECK_INTERVAL_MS);
      return;
    }

    selfieDetectionIntervalRef.current = setInterval(() => {
      if (selfieDetectionRequestInFlightRef.current || selfieAutoCaptureRef.current) return;
      selfieDetectionRequestInFlightRef.current = true;

      void validateSelfieFrameForAutoCapture().then(validation => {
        if (validation.isSingleFaceStable && !selfieAutoCaptureRef.current) {
          setSelfieFaceStatus('detected');
          startSelfieCountdown();
          return;
        }
        if (!selfieAutoCaptureRef.current) {
          setSelfieFaceStatus('scanning');
          setBiometricSelfieMessage(validation.message);
        }
      }).catch(() => {
        setSelfieFaceStatus('idle');
        setBiometricSelfieStatus('failed');
        setBiometricSelfieMessage('Server-side face detection failed. Please restart the camera and try again.');
        stopSelfieCamera();
      }).finally(() => {
        selfieDetectionRequestInFlightRef.current = false;
      });
    }, SELFIE_FRAME_CHECK_INTERVAL_MS);
  }

  const startSelfieCamera = async (options: { skipTutorial?: boolean } = {}) => {
    if (!isIdVerified && verificationPath !== 'manual') {
      setBiometricSelfieStatus('failed');
      setBiometricSelfieMessage('Verify your LRN details before starting live camera capture.');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setBiometricSelfieStatus('failed');
      setBiometricSelfieMessage('Live camera capture is not supported by this browser.');
      return;
    }
    if (!options.skipTutorial && !hasSeenSelfieTutorial) {
      setShowSelfieTutorial(true);
      return;
    }

    try {
      stopSelfieCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });
      selfieStreamRef.current = stream;
      if (selfieVideoRef.current) {
        selfieVideoRef.current.srcObject = stream;
        await selfieVideoRef.current.play();
      }
      setIsSelfieCameraActive(true);
      setBiometricSelfieStatus('idle');
      setBiometricSelfieFileName('');
      setCapturedSelfiePreview('');
      setPendingSelfieFile(null);
      setSelfieFaceValidated(false);
      setCapturedSelfieValidationStatus('idle');
      startSelfieFaceDetection();
    } catch {
      setBiometricSelfieStatus('failed');
      setBiometricSelfieMessage('Camera permission was denied or no camera is available.');
      stopSelfieCamera();
    }
  };

  const resetLrnIdentityVerification = () => {
    setLrnVerificationToken('');
    setLrnVerificationReview(null);
    setIsIdVerified(false);
    setRegistryLockedFields([]);
    setBiometricSelfieFileName('');
    setBiometricSelfieStatus('idle');
    setBiometricSelfieMessage('');
    setCapturedSelfiePreview('');
    setPendingSelfieFile(null);
    setSelfieFaceStatus('idle');
    setSelfieFaceValidated(false);
    setCapturedSelfieValidationStatus('idle');
    stopSelfieCamera();
  };

  const handleConfirmSelfie = async () => {
    const file = pendingSelfieFile;
    if (!file) return;
    if (!selfieFaceValidated || capturedSelfieValidationStatus !== 'passed') {
      setBiometricSelfieStatus('reviewing');
      setCapturedSelfieValidationStatus('failed');
      setBiometricSelfieMessage(CAPTURED_SELFIE_RETAKE_MESSAGE);
      return;
    }
    if (verificationPath === 'manual') {
      setBiometricSelfieStatus('stored');
      setBiometricSelfieFileName(file.name);
      setBiometricSelfieMessage('Selfie captured and stored for manual registration review.');
      setSelfieFaceStatus('captured');
      setPendingSelfieFile(null);
      stopSelfieCamera();
      setErrors(prev => {
        const next = { ...prev };
        delete next.selfie;
        delete next.general;
        return next;
      });
      return;
    }
    if (!lrnVerificationToken) {
      setBiometricSelfieStatus('failed');
      setBiometricSelfieMessage('Verify your LRN details before capturing your biometric selfie.');
      return;
    }

    setBiometricSelfieStatus('uploading');
    setBiometricSelfieFileName(file.name);
    setBiometricSelfieMessage('');
    const result = await backendApplicationService.uploadRegistrationSelfie(lrnVerificationToken, file);

    if (result.ok === false) {
      stopSelfieCamera();
      setSelfieFaceStatus('idle');
      setBiometricSelfieStatus('failed');
      setBiometricSelfieMessage(result.error.message);
      addAuditLog('BIOMETRIC_SELFIE_UPLOAD_FAILED', `Selfie upload failed. Code: ${result.error.code ?? 'UNKNOWN'}.`);
      return;
    }

    if (result.data.status === 'PASSED' || result.data.uploadedMedia.includes('SELFIE')) {
      setBiometricSelfieStatus('stored');
      setBiometricSelfieMessage('Selfie captured and stored as your enrolled biometric reference.');
      setSelfieFaceStatus('captured');
      setPendingSelfieFile(null);
      stopSelfieCamera();
      setErrors(prev => {
        const next = { ...prev };
        delete next.selfie;
        delete next.general;
        return next;
      });
      return;
    }

    setBiometricSelfieStatus('failed');
    stopSelfieCamera();
    setSelfieFaceStatus('idle');
    setBiometricSelfieMessage('Selfie was uploaded but biometric enrollment is still pending review.');
  };

  const handleRetakeSelfie = () => {
    setBiometricSelfieFileName('');
    setBiometricSelfieStatus('idle');
    setBiometricSelfieMessage('');
    setCapturedSelfiePreview('');
    setPendingSelfieFile(null);
    setSelfieFaceStatus('idle');
    setSelfieFaceValidated(false);
    setCapturedSelfieValidationStatus('idle');
    setErrors(prev => {
      const next = { ...prev };
      delete next.selfie;
      return next;
    });
    void startSelfieCamera();
  };

  useEffect(() => {
    return () => {
      clearSelfieTimers();
      selfieStreamRef.current?.getTracks().forEach(track => track.stop());
      selfieStreamRef.current = null;
      if (pwdIdPreviewUrlRef.current) {
        URL.revokeObjectURL(pwdIdPreviewUrlRef.current);
        pwdIdPreviewUrlRef.current = '';
      }
      mediaPipeFaceDetectorRef.current?.close();
      mediaPipeFaceDetectorRef.current = null;
    };
  }, []);

  const handleSendEmailOtp = async () => {
    const email = formData.email.trim();
    if (!email) {
      setErrors(prev => ({ ...prev, email: 'Email address is required before sending OTP' }));
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setErrors(prev => ({ ...prev, email: 'Invalid email address format' }));
      return;
    }
    if (doesEmailAlreadyExist(email)) {
      setErrors(prev => ({ ...prev, email: 'Email address already exists in another registration.' }));
      return;
    }

    setIsSendingEmailOtp(true);
    const result = await backendApplicationService.requestRegistrationEmailOtp(email, {
      registrationSessionId: registrationSessionIdRef.current,
    });
    setIsSendingEmailOtp(false);
    if (result.ok === false) {
      setErrors(prev => ({ ...prev, emailOtp: result.error.message }));
      return;
    }

    setEmailOtpSentTo(email);
    setEmailOtp('');
    setIsEmailVerified(false);
    setEmailVerificationToken('');
    setErrors(prev => {
      const next = { ...prev };
      delete next.email;
      delete next.emailOtp;
      return next;
    });
  };

  const handleVerifyEmailOtp = async () => {
    const email = formData.email.trim();
    if (!emailOtpSentTo || emailOtpSentTo !== email) {
      setErrors(prev => ({ ...prev, emailOtp: 'Please send an OTP to this email address first.' }));
      return;
    }
    if (!/^\d{6}$/.test(emailOtp.trim())) {
      setErrors(prev => ({ ...prev, emailOtp: 'Enter the 6-digit OTP sent to your email address.' }));
      return;
    }

    setIsVerifyingEmailOtp(true);
    const result = await backendApplicationService.verifyRegistrationEmailOtp(email, emailOtp.trim(), {
      registrationSessionId: registrationSessionIdRef.current,
    });
    setIsVerifyingEmailOtp(false);
    if (result.ok === false) {
      setErrors(prev => ({ ...prev, emailOtp: result.error.message }));
      return;
    }

    setIsEmailVerified(true);
    setEmailVerificationToken(result.data.emailVerificationToken);
    setErrors(prev => {
      const next = { ...prev };
      delete next.email;
      delete next.emailOtp;
      return next;
    });
  };

  const handleVerifyLrnPath = async (
    forcedLrn?: string,
    forcedVerification?: { category: LrnVerificationCategory; value: string },
  ) => {
    if (verificationPath !== 'lrn') {
      return;
    }

    if (lrnAttemptsLeft <= 0) {
      setShowLrnCooldownModal(true);
      return;
    }

    const currentLrn = forcedLrn !== undefined ? forcedLrn : formData.lrn;
    const currentCategory = forcedVerification?.category ?? lrnVerificationCategory;
    const currentValue = forcedVerification?.value ?? lrnRegisteredValue;
    const currentCategoryConfig = LRN_VERIFICATION_CATEGORIES.find(category => category.value === currentCategory) ?? selectedLrnVerificationCategory;

    if (!currentLrn) {
      setErrors(prev => ({ ...prev, lrn: 'Please enter your LRN.' }));
      return;
    }
    
    if (!/^\d{12}$/.test(currentLrn)) {
      setErrors(prev => ({ ...prev, lrn: 'LRN must be exactly 12 numeric digits.' }));
      return;
    }

    if (!currentValue.trim()) {
      setErrors(prev => ({ ...prev, lrnRegisteredValue: `${currentCategoryConfig.inputLabel} is required.` }));
      return;
    }

    setIsSubmitting(true);
    const result = await backendApplicationService.verifyLrn(currentLrn, {
      category: currentCategory,
      value: currentValue.trim(),
    });
    setIsSubmitting(false);

    if (result.ok === false) {
      const nextAttempts = result.error.code === 'LRN_COOLDOWN' ? 0 : Math.max(0, lrnAttemptsLeft - 1);
      setErrors(prev => {
        const next: Record<string, string> = {
          ...prev,
          lrnRegisteredValue: result.error.message,
        };
        delete next.general;
        return next;
      });
      addAuditLog('DEPED_LRN_VERIFICATION_FAILED', `Verification failed for DepEd LRN. Code: ${result.error.code ?? 'UNKNOWN'}.`);
      if (result.error.code === 'LRN_COOLDOWN' || nextAttempts <= 0) {
        const serverRetryAfterSeconds = Number(result.error.meta?.retryAfterSeconds);
        const cooldownSeconds = Number.isFinite(serverRetryAfterSeconds) && serverRetryAfterSeconds > 0
          ? Math.ceil(serverRetryAfterSeconds)
          : LRN_COOLDOWN_SECONDS;
        storeLrnCooldownExpiry(cooldownSeconds);
        setLrnAttemptsLeft(0);
        setCooldownSecondsLeft(cooldownSeconds);
        setShowLrnCooldownModal(true);
      } else {
        setLrnAttemptsLeft(nextAttempts);
      }
      return;
    }

    const { profile, verificationToken } = result.data;
    clearStoredLrnCooldown();
    setLrnVerificationToken(verificationToken);
    setLrnVerificationReview({
      lrn: profile.lrn,
      categoryLabel: currentCategoryConfig.label,
      inputLabel: currentCategoryConfig.inputLabel,
      value: currentValue.trim(),
    });
    setLrnAttemptsLeft(5);
    setCooldownSecondsLeft(LRN_COOLDOWN_SECONDS);
    setIsIdVerified(true);
    setBiometricSelfieFileName('');
    setBiometricSelfieStatus('idle');
    setBiometricSelfieMessage('');
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
      if (verificationPath === 'lrn' && formData.lrn && !/^\d{12}$/.test(formData.lrn)) {
        newErrors.lrn = 'LRN must be exactly 12 numeric digits.';
      }
      if (formData.lrn && doesLrnAlreadyExist(formData.lrn)) {
        newErrors.lrn = 'LRN already exists in another registration.';
      }
      if (verificationPath === 'manual') {
        activeStep1ManualFields.forEach(field => {
          const value = getManualStep1FieldValue(field);
          const existingValueMessage = getExistingValueFieldMessage(field.value, value);
          if (existingValueMessage) {
            newErrors[getStep1FieldErrorKey(field)] = existingValueMessage;
          } else if (isStep1FieldRequired(field) && !value.trim()) {
            newErrors[getStep1FieldErrorKey(field)] = `${field.value} is required.`;
          }
        });
        if (biometricSelfieStatus !== 'stored') {
          newErrors.selfie = 'Capture and store your biometric selfie before continuing.';
        }
      }
      if (isPwdMaintenanceEnabled && formData.isPwd) {
        if (isPwdFieldActive('PWD Type') && isPwdFieldRequired('PWD Type') && !formData.pwdType.trim()) {
          newErrors.pwdType = 'PWD type is required.';
        }
        if (formData.pwdType === PWD_MULTIPLE_CATEGORY && selectedMultiplePwdEntries.length < 2) {
          newErrors.pwdMultipleCategories = 'Select at least 2 disability categories and a specific type for each.';
        } else if (isPwdFieldActive('Condition') && isPwdFieldRequired('Condition') && !formData.pwdCondition.trim()) {
          newErrors.pwdCondition = 'PWD condition is required.';
        }
        if (isPwdFieldActive('PWD ID Number') && isPwdFieldRequired('PWD ID Number') && !formData.pwdIdNumber.trim()) {
          newErrors.pwdIdNumber = 'PWD ID number is required.';
        }
        if (isPwdFieldActive('PWD ID Attachment') && isPwdFieldRequired('PWD ID Attachment') && !formData.pwdIdFilename.trim()) {
          newErrors.pwdIdFilename = 'Upload your PWD ID before continuing.';
        }
      }
      if (verificationPath === 'lrn' && !lrnRegisteredValue.trim()) {
        newErrors.lrnRegisteredValue = `${selectedLrnVerificationCategory.inputLabel} is required.`;
      }
      if (!isIdVerified && verificationPath !== 'manual') {
        if (verificationPath === 'lrn') {
          newErrors.lrnRegisteredValue = 'Verify your LRN with the selected registered information before continuing.';
        } else {
          newErrors.general = 'Complete identity verification before continuing.';
        }
      } else if (verificationPath === 'lrn' && biometricSelfieStatus !== 'stored') {
        newErrors.selfie = 'Capture and store your biometric selfie before continuing.';
      }
    }

    if (currentSection === 1) {
      if (!formData.email) {
        newErrors.email = 'Email address is required';
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'Invalid email address format';
      } else if (doesEmailAlreadyExist(formData.email)) {
        newErrors.email = 'Email address already exists in another registration.';
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

  const resetRegistrationFormAfterSubmit = () => {
    clearRegistrationSessionDraft();
    registrationSessionIdRef.current = createNewRegistrationSessionId();
    if (pwdIdPreviewUrlRef.current) {
      URL.revokeObjectURL(pwdIdPreviewUrlRef.current);
      pwdIdPreviewUrlRef.current = '';
    }
    stopSelfieCamera();
    setFormData(getEmptyRegistrationFormData());
    setIsIdVerified(false);
    setRegistryLockedFields([]);
    setLrnVerificationCategory('email');
    setLrnRegisteredValue('');
    setLrnVerificationReview(null);
    setBiometricSelfieFileName('');
    setBiometricSelfieStatus('idle');
    setBiometricSelfieMessage('');
    setCapturedSelfiePreview('');
    setPendingSelfieFile(null);
    setSelfieFaceStatus('idle');
    setSelfieFaceValidated(false);
    setCapturedSelfieValidationStatus('idle');
    setSelfieCountdown(null);
    setVerificationPath(activeVerificationPath);
    setLrnVerificationToken('');
    setEmailOtp('');
    setEmailOtpSentTo('');
    setIsEmailVerified(false);
    setEmailVerificationToken('');
    setCurrentSection(0);
    setVisitedSections([0]);
    setReviewCertified(false);
    setErrors({});
  };

  const handleSubmit = async () => {
    if (!reviewCertified) {
      setErrors({ general: 'Certify that the reviewed registration details are accurate before submitting.' });
      return;
    }
    if (!isEmailVerified || emailOtpSentTo !== formData.email.trim() || !emailVerificationToken) {
      setErrors({ emailOtp: 'Please verify your email address using the OTP before continuing.' });
      setCurrentSection(1);
      return;
    }

    clearRegistrationSessionDraft();

    setIsSubmitting(true);
    const result = await backendApplicationService.createAndSubmit(
      createBackendApplicationDraftInput(lrnVerificationToken, emailVerificationToken, {
        ...formData,
        selfiePhotoUrl: capturedSelfiePreview,
      }),
      { registrationSessionId: registrationSessionIdRef.current },
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
    setCandidateId(result.data.candidateId || formatCandidateId(submittedApplication.id, result.data.submittedAt ?? result.data.createdAt));
    resetRegistrationFormAfterSubmit();
    setIsSubmitted(true);
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
          {isAdminPreview && (
            <div className="flex items-center gap-3 px-5 py-3 mb-6 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <p className="text-xs font-bold">
                Preview mode — this Student Portal view is showing demo data, not a real application record.
              </p>
            </div>
          )}
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

            {myApp.status !== 'FOR_CORRECTION' && (
              <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto mb-2">
                <Link to="/student/dashboard" className="btn-secondary flex-1 py-3 text-center">
                  Go to Dashboard
                </Link>
                <Link to="/student/permit" className="btn-primary flex-1 py-3 text-center flex items-center justify-center gap-2">
                  <Shield className="w-4 h-4" /> View Exam Permit
                </Link>
              </div>
            )}

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
                clearRegistrationSessionDraft();
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

                   <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                      {step1ModeDescription}
                   </p>

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
                        <div className="space-y-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
                          <div className="flex items-center gap-3">
                            <Shield className="w-4 h-4 text-philsa-red" />
                            <div>
                              <p className="text-[10px] font-black text-philsa-navy uppercase tracking-widest">LRN Registered Information Verification</p>
                              <p className="text-[10px] text-slate-500 font-bold">Enter your LRN and one registered detail associated with that learner record.</p>
                            </div>
                          </div>

                          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
                            <div className="space-y-2">
                              <label className="label-philsa text-philsa-gray">LRN Number *</label>
                              <input 
                                type="text" 
                                inputMode="numeric"
                                placeholder="e.g. 101234567890" 
                                className={cn("input-philsa font-mono tracking-wider bg-white w-full", (errors.lrn || existingLrnMessage) && "border-philsa-red bg-philsa-red/5")}
                                value={formData.lrn} 
                                onChange={(e) => {
                                  setFormData({...formData, lrn: e.target.value});
                                  resetLrnIdentityVerification();
                                  if (errors.lrn || errors.general) {
                                    setErrors(prev => {
                                      const next = {...prev};
                                      delete next.lrn;
                                      delete next.general;
                                      return next;
                                    });
                                  }
                                }} 
                              />
                              {(errors.lrn || existingLrnMessage) && (
                                <p className="text-xs text-philsa-red font-bold pl-1">{errors.lrn || existingLrnMessage}</p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <label className="label-philsa text-philsa-gray">1. Select Verification Category *</label>
                              <select
                                className="input-philsa bg-white"
                                value={lrnVerificationCategory}
                                onChange={(e) => {
                                  setLrnVerificationCategory(e.target.value as LrnVerificationCategory);
                                  setLrnRegisteredValue('');
                                  resetLrnIdentityVerification();
                                  if (errors.lrnRegisteredValue || errors.general) {
                                    setErrors(prev => {
                                      const next = {...prev};
                                      delete next.lrnRegisteredValue;
                                      delete next.general;
                                      return next;
                                    });
                                  }
                                }}
                              >
                                {LRN_VERIFICATION_CATEGORIES.map(category => (
                                  <option key={category.value} value={category.value}>{category.label}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
                            <div className="space-y-2">
                              <label className="label-philsa text-philsa-gray">2. Enter Your {selectedLrnVerificationCategory.inputLabel} *</label>
                              <input
                                type={selectedLrnVerificationCategory.inputType ?? 'text'}
                                className="input-philsa bg-white w-full"
                                placeholder={selectedLrnVerificationCategory.placeholder}
                                value={lrnRegisteredValue}
                                onChange={(e) => {
                                  setLrnRegisteredValue(e.target.value);
                                  resetLrnIdentityVerification();
                                  if (errors.lrnRegisteredValue || errors.general) {
                                    setErrors(prev => {
                                      const next = {...prev};
                                      delete next.lrnRegisteredValue;
                                      delete next.general;
                                      return next;
                                    });
                                  }
                                }}
                              />
                              <p className="text-[10px] text-slate-500 font-bold">{selectedLrnVerificationCategory.helpText}</p>
                              {errors.lrnRegisteredValue && <p className="text-xs text-philsa-red font-bold pl-1">{errors.lrnRegisteredValue}</p>}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleVerifyLrnPath()}
                              disabled={isSubmitting}
                              className="w-full lg:w-auto lg:mt-[27px] btn-primary py-3 px-8 font-black uppercase text-xs tracking-widest cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
                            >
                              <School className="w-4 h-4" /> Verify Information
                            </button>
                          </div>

                          {isIdVerified && (
                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 flex items-start gap-2">
                              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                              LRN identity verified. Capture your selfie to enroll your biometric reference.
                            </div>
                          )}

                          <div className={cn("rounded-2xl border bg-white p-4 sm:p-5 space-y-4", isIdVerified ? "border-slate-200" : "border-slate-200 opacity-60")}>
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-philsa-navy text-white flex items-center justify-center">
                                  <Camera className="w-5 h-5" />
                                </div>
                                <div>
                                  <p className="text-[10px] font-black text-philsa-navy uppercase tracking-widest">Biometric Selfie Capture *</p>
                                  <p className="text-[10px] text-slate-500 font-bold">This selfie becomes your enrolled facial identity reference.</p>
                                </div>
                              </div>

                              <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                                {biometricSelfieStatus === 'reviewing' && pendingSelfieFile ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={handleConfirmSelfie}
                                      disabled={capturedSelfieValidationStatus !== 'passed'}
                                      className={cn(
                                        "px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest border transition-all duration-200 flex items-center justify-center gap-2",
                                        capturedSelfieValidationStatus === 'passed'
                                          ? "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
                                          : "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                                      )}
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                      {capturedSelfieValidationStatus === 'checking' ? 'Checking Photo' : 'Use This Photo'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleRetakeSelfie}
                                      className="px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest border border-philsa-navy bg-white text-philsa-navy hover:bg-philsa-bg transition-all duration-200 flex items-center justify-center gap-2"
                                    >
                                      <RefreshCw className="w-4 h-4" />
                                      Retake Photo
                                    </button>
                                  </>
                                ) : biometricSelfieStatus === 'stored' || (biometricSelfieStatus === 'failed' && Boolean(capturedSelfiePreview)) ? (
                                    <button
                                      type="button"
                                      onClick={handleRetakeSelfie}
                                      className="px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest border border-philsa-navy bg-white text-philsa-navy hover:bg-philsa-bg transition-all duration-200 flex items-center justify-center gap-2"
                                    >
                                      <RefreshCw className="w-4 h-4" />
                                      Retake Photo
                                    </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={startSelfieCamera}
                                    disabled={!isIdVerified || biometricSelfieStatus === 'uploading' || isSelfieCameraActive}
                                    className={cn(
                                      "px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest border transition-all duration-200 flex items-center justify-center gap-2",
                                      isIdVerified ? "bg-philsa-navy text-white border-philsa-navy hover:bg-philsa-navy/90 cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed" : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                                    )}
                                  >
                                    <Camera className="w-4 h-4" />
                                    {isSelfieCameraActive ? 'Detecting Face' : 'Start Camera'}
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 aspect-video">
                              <video
                                ref={selfieVideoRef}
                                className={cn("h-full w-full object-cover", !isSelfieCameraActive && "hidden")}
                                playsInline
                                muted
                              />
                              {isSelfieCameraActive && (
                                <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                                  <div className={cn(
                                    "relative h-[72%] max-h-[78%] min-h-[52%] aspect-[3/4] rounded-[50%] border-2 shadow-[0_0_0_999px_rgba(15,23,42,0.18)]",
                                    selfieFaceStatus === 'detected' || selfieFaceStatus === 'counting'
                                      ? "border-emerald-300/95"
                                      : "border-white/90"
                                  )}>
                                    <div className="absolute left-[20%] right-[20%] top-[38%] border-t border-dashed border-white/70" />
                                    <div className="absolute left-1/2 top-[38%] h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80" />
                                    <div className="absolute bottom-[16%] left-1/2 h-1.5 w-12 -translate-x-1/2 rounded-full bg-white/70" />
                                    <div className="absolute -inset-1 rounded-[50%] border border-white/35" />
                                  </div>
                                </div>
                              )}
                              {!isSelfieCameraActive && capturedSelfiePreview && (
                                <>
                                  <img
                                    src={capturedSelfiePreview}
                                    alt="Captured biometric selfie preview"
                                    className="h-full w-full object-cover"
                                  />
                                  <div className="absolute inset-x-0 bottom-0 bg-slate-950/80 px-4 py-3 text-center backdrop-blur-sm">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-white">Captured selfie preview</p>
                                  </div>
                                </>
                              )}
                              {!isSelfieCameraActive && !capturedSelfiePreview && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                                  <Camera className="w-10 h-10 text-slate-400 mb-3" />
                                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Live camera preview</p>
                                  <p className="text-[10px] text-slate-500 font-bold mt-1">Start the camera after LRN verification.</p>
                                </div>
                              )}
                              {isSelfieCameraActive && (
                                <div className="absolute inset-x-0 bottom-0 z-20 bg-slate-950/80 px-4 py-3 text-center backdrop-blur-sm">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-white">
                                    {selfieCountdown !== null
                                      ? `Hold still. Auto capture in ${selfieCountdown} seconds`
                                      : selfieFaceStatus === 'scanning'
                                        ? 'Server validating single face'
                                        : selfieFaceStatus === 'detected'
                                          ? 'Single face detected'
                                          : 'Hold still'}
                                  </p>
                                </div>
                              )}
                            </div>

                            {(biometricSelfieFileName || biometricSelfieMessage || errors.selfie) && (
                              <div className={cn(
                                "rounded-xl px-4 py-3 text-xs font-bold border",
                                biometricSelfieStatus === 'stored' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                                biometricSelfieStatus === 'failed' || capturedSelfieValidationStatus === 'failed' || errors.selfie ? "bg-philsa-red/5 text-philsa-red border-philsa-red/20" :
                                biometricSelfieStatus === 'reviewing' ? "bg-amber-50 text-amber-700 border-amber-100" :
                                "bg-slate-50 text-slate-600 border-slate-200"
                              )}>
                                {biometricSelfieStatus === 'uploading'
                                  ? 'Storing captured selfie...'
                                  : biometricSelfieMessage || biometricSelfieFileName || errors.selfie}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {verificationPath === 'manual' && (
                        <div className="space-y-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
                          <div className="flex items-center gap-3">
                            <User className="w-4 h-4 text-philsa-red" />
                            <div>
                              <p className="text-[10px] font-black text-philsa-navy uppercase tracking-widest">Manual Registration Fields</p>
                              <p className="text-[10px] text-slate-500 font-bold">These inputs follow the active Step 1 Fields maintenance table.</p>
                            </div>
                          </div>

                          {activeStep1ManualFields.length === 0 ? (
                            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-bold text-amber-800">
                              No active Step 1 fields are configured. Please contact an administrator.
                            </div>
                          ) : (
                            manualStep1Sections.map(section => {
                              const fieldsInSection = activeStep1ManualFields.filter(field => getStep1FieldSection(field.value) === section);
                              if (fieldsInSection.length === 0) return null;

                              return (
                                <div key={section} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                                  <div>
                                    <p className="text-[10px] font-black text-philsa-navy uppercase tracking-widest">{section}</p>
                                    <p className="text-[10px] text-slate-500 font-bold">Fields marked with * are high-priority required entries.</p>
                                  </div>
                                  <div className="grid gap-4 md:grid-cols-2">
                                    {fieldsInSection.map(renderManualStep1Field)}
                                  </div>
                                </div>
                              );
                            })
                          )}

                          {isPwdMaintenanceEnabled && (
                          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                            <label className={cn(
                              "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors",
                              formData.isPwd ? "border-philsa-red/30 bg-philsa-red/5" : "border-slate-200 bg-slate-50 hover:border-philsa-red/30"
                            )}>
                              <input
                                type="checkbox"
                                checked={formData.isPwd}
                                onChange={(e) => setPwdEnabled(e.target.checked)}
                                className="mt-1 h-5 w-5 shrink-0 rounded border-slate-300 text-philsa-red focus:ring-philsa-red"
                              />
                              <span>
                                <span className="block text-[10px] font-black uppercase tracking-widest text-philsa-navy">
                                  I am a person with disability (PWD)
                                </span>
                                <span className="mt-1 block text-[10px] font-bold text-slate-500">
                                  Check this if you need disability-related testing accommodations.
                                </span>
                              </span>
                            </label>

                            {formData.isPwd && (
                              <div className="grid gap-4 md:grid-cols-2">
                                {isPwdFieldActive('PWD Type') && (
                                <div className="space-y-2">
                                  <label className={cn("label-philsa", errors.pwdType ? "text-philsa-red" : "text-philsa-gray")}>PWD Type{isPwdFieldRequired('PWD Type') ? ' *' : ''}</label>
                                  <select
                                    className={cn("input-philsa bg-white", errors.pwdType && "border-philsa-red bg-philsa-red/5")}
                                    value={formData.pwdType}
                                    onChange={(e) => {
                                      setFormData(prev => ({
                                        ...prev,
                                        pwdType: e.target.value,
                                        pwdCondition: '',
                                        pwdMultipleCategories: {},
                                      }));
                                      if (errors.pwdType || errors.pwdCondition || errors.pwdMultipleCategories) {
                                        setErrors(prev => {
                                          const next = { ...prev };
                                          delete next.pwdType;
                                          delete next.pwdCondition;
                                          delete next.pwdMultipleCategories;
                                          return next;
                                        });
                                      }
                                    }}
                                  >
                                    <option value="">Select PWD type</option>
                                    {normalizedActivePwdTypes.map(option => (
                                      <option key={option} value={option}>{option}</option>
                                    ))}
                                  </select>
                                  {errors.pwdType && <p className="text-xs text-philsa-red font-bold pl-1">{errors.pwdType}</p>}
                                </div>
                                )}

                                {isPwdFieldActive('Condition') && formData.pwdType !== PWD_MULTIPLE_CATEGORY && (
                                <div className="space-y-2">
                                  <label className={cn("label-philsa", errors.pwdCondition ? "text-philsa-red" : "text-philsa-gray")}>Condition{isPwdFieldRequired('Condition') ? ' *' : ''}</label>
                                  <select
                                    className={cn("input-philsa bg-white", errors.pwdCondition && "border-philsa-red bg-philsa-red/5")}
                                    value={formData.pwdCondition}
                                    disabled={!formData.pwdType}
                                    onChange={(e) => {
                                      setFormData(prev => ({ ...prev, pwdCondition: e.target.value }));
                                      if (errors.pwdCondition) {
                                        setErrors(prev => {
                                          const next = { ...prev };
                                          delete next.pwdCondition;
                                          return next;
                                        });
                                      }
                                    }}
                                  >
                                    <option value="">{formData.pwdType ? 'Select condition' : 'Select PWD type first'}</option>
                                    {activePwdConditions.map(condition => (
                                      <option key={condition} value={condition}>{condition}</option>
                                    ))}
                                  </select>
                                  {errors.pwdCondition && <p className="text-xs text-philsa-red font-bold pl-1">{errors.pwdCondition}</p>}
                                </div>
                                )}

                                {isPwdFieldActive('Condition') && formData.pwdType === PWD_MULTIPLE_CATEGORY && (
                                <div className="space-y-3 md:col-span-2">
                                  <label className={cn("label-philsa", errors.pwdMultipleCategories ? "text-philsa-red" : "text-philsa-gray")}>Disability categories and specific types *</label>
                                  <div className="grid gap-3 md:grid-cols-2">
                                    {PWD_CATEGORY_OPTIONS.map(category => {
                                      const selectedCondition = formData.pwdMultipleCategories[category.type] || '';
                                      const categoryConditions = category.conditions.filter(condition => configuredPwdConditions.includes(condition));
                                      const conditionOptions = categoryConditions.length > 0 ? categoryConditions : category.conditions;
                                      return (
                                        <label key={category.type} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                          <span className="flex items-start gap-2 text-[11px] font-black text-philsa-navy">
                                            <input
                                              type="checkbox"
                                              className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-philsa-red focus:ring-philsa-red"
                                              checked={Boolean(selectedCondition)}
                                              onChange={(e) => {
                                                setFormData(prev => {
                                                  const nextCategories = { ...prev.pwdMultipleCategories };
                                                  if (e.target.checked) {
                                                    nextCategories[category.type] = conditionOptions[0] || '';
                                                  } else {
                                                    delete nextCategories[category.type];
                                                  }
                                                  return { ...prev, pwdMultipleCategories: nextCategories };
                                                });
                                                if (errors.pwdMultipleCategories) {
                                                  setErrors(prev => {
                                                    const next = { ...prev };
                                                    delete next.pwdMultipleCategories;
                                                    return next;
                                                  });
                                                }
                                              }}
                                            />
                                            {category.type}
                                          </span>
                                          {selectedCondition && (
                                            <select
                                              aria-label={`${category.type} specific type`}
                                              className="mt-2 input-philsa bg-white"
                                              value={selectedCondition}
                                              onChange={(e) => {
                                                setFormData(prev => ({
                                                  ...prev,
                                                  pwdMultipleCategories: {
                                                    ...prev.pwdMultipleCategories,
                                                    [category.type]: e.target.value,
                                                  },
                                                }));
                                              }}
                                            >
                                              {conditionOptions.map(condition => (
                                                <option key={condition} value={condition}>{condition}</option>
                                              ))}
                                            </select>
                                          )}
                                        </label>
                                      );
                                    })}
                                  </div>
                                  {errors.pwdMultipleCategories && <p className="text-xs text-philsa-red font-bold pl-1">{errors.pwdMultipleCategories}</p>}
                                </div>
                                )}

                                {isPwdFieldActive('PWD ID Number') && (
                                <div className="space-y-2">
                                  <label className={cn("label-philsa", errors.pwdIdNumber ? "text-philsa-red" : "text-philsa-gray")}>PWD ID Number{isPwdFieldRequired('PWD ID Number') ? ' *' : ''}</label>
                                  <input
                                    type="text"
                                    className={cn("input-philsa bg-white", errors.pwdIdNumber && "border-philsa-red bg-philsa-red/5")}
                                    value={formData.pwdIdNumber}
                                    onChange={(e) => {
                                      setFormData(prev => ({ ...prev, pwdIdNumber: e.target.value }));
                                      if (errors.pwdIdNumber) {
                                        setErrors(prev => {
                                          const next = { ...prev };
                                          delete next.pwdIdNumber;
                                          return next;
                                        });
                                      }
                                    }}
                                    placeholder="Enter PWD ID number"
                                  />
                                  {errors.pwdIdNumber && <p className="text-xs text-philsa-red font-bold pl-1">{errors.pwdIdNumber}</p>}
                                </div>
                                )}

                                {isPwdFieldActive('PWD ID Attachment') && (
                                <div className="space-y-2">
                                  <label className={cn("label-philsa", errors.pwdIdFilename ? "text-philsa-red" : "text-philsa-gray")}>Upload PWD ID{isPwdFieldRequired('PWD ID Attachment') ? ' *' : ''}</label>
                                  <label className={cn(
                                    "flex min-h-[48px] cursor-pointer items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3 text-sm font-bold text-philsa-navy shadow-sm transition-colors hover:border-philsa-red/40",
                                    errors.pwdIdFilename && "border-philsa-red bg-philsa-red/5"
                                  )}>
                                    <span className="min-w-0 truncate">{formData.pwdIdFilename || 'Choose file'}</span>
                                    <Upload className="h-4 w-4 shrink-0 text-philsa-red" />
                                    <input
                                      type="file"
                                      accept=".jpg,.jpeg,.png,.pdf"
                                      className="hidden"
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (pwdIdPreviewUrlRef.current) {
                                          URL.revokeObjectURL(pwdIdPreviewUrlRef.current);
                                          pwdIdPreviewUrlRef.current = '';
                                        }
                                        if (file && !PWD_ID_ALLOWED_TYPES.has(file.type)) {
                                          e.target.value = '';
                                          setFormData(prev => ({ ...prev, pwdIdFilename: '', pwdIdPreviewUrl: '' }));
                                          setErrors(prev => ({ ...prev, pwdIdFilename: 'PWD ID upload must be a JPEG, PNG, or PDF file.' }));
                                          return;
                                        }
                                        if (file && file.size > PWD_ID_MAX_BYTES) {
                                          e.target.value = '';
                                          setFormData(prev => ({ ...prev, pwdIdFilename: '', pwdIdPreviewUrl: '' }));
                                          setErrors(prev => ({ ...prev, pwdIdFilename: 'PWD ID upload must not exceed 5 MB.' }));
                                          return;
                                        }
                                        if (file) {
                                          try {
                                            await uploadRegistrationAttachmentFile('PWD ID Attachment', file);
                                          } catch (error) {
                                            e.target.value = '';
                                            setFormData(prev => ({ ...prev, pwdIdFilename: '', pwdIdPreviewUrl: '' }));
                                            setErrors(prev => ({ ...prev, pwdIdFilename: error instanceof Error ? error.message : 'PWD ID upload failed.' }));
                                            return;
                                          }
                                        }
                                        const previewUrl = file ? URL.createObjectURL(file) : '';
                                        pwdIdPreviewUrlRef.current = previewUrl;
                                        setFormData(prev => ({
                                          ...prev,
                                          pwdIdFilename: file?.name || '',
                                          pwdIdPreviewUrl: previewUrl,
                                        }));
                                        if (errors.pwdIdFilename) {
                                          setErrors(prev => {
                                            const next = { ...prev };
                                            delete next.pwdIdFilename;
                                            return next;
                                          });
                                        }
                                      }}
                                    />
                                  </label>
                                  {errors.pwdIdFilename && <p className="text-xs text-philsa-red font-bold pl-1">{errors.pwdIdFilename}</p>}
                                </div>
                                )}

                                {isPwdFieldActive('Accommodation Needed') && (
                                <div className="space-y-2 md:col-span-2">
                                  <label className={cn("label-philsa", errors.pwdAccommodation ? "text-philsa-red" : "text-philsa-gray")}>What accommodation do you need? Please describe{isPwdFieldRequired('Accommodation Needed') ? ' *' : ''}</label>
                                  <textarea
                                    className={cn("input-philsa min-h-[92px] resize-y bg-white", errors.pwdAccommodation && "border-philsa-red bg-philsa-red/5")}
                                    value={formData.pwdAccommodation}
                                    onChange={(e) => {
                                      setFormData(prev => ({ ...prev, pwdAccommodation: e.target.value }));
                                      if (errors.pwdAccommodation) {
                                        setErrors(prev => {
                                          const next = { ...prev };
                                          delete next.pwdAccommodation;
                                          return next;
                                        });
                                      }
                                    }}
                                    placeholder="Describe the assistance, equipment, or testing accommodation needed."
                                  />
                                  {errors.pwdAccommodation && <p className="text-xs text-philsa-red font-bold pl-1">{errors.pwdAccommodation}</p>}
                                </div>
                                )}
                              </div>
                            )}
                          </div>
                          )}

                          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-philsa-navy text-white flex items-center justify-center">
                                  <Camera className="w-5 h-5" />
                                </div>
                                <div>
                                  <p className="text-[10px] font-black text-philsa-navy uppercase tracking-widest">Biometric Selfie Capture *</p>
                                  <p className="text-[10px] text-slate-500 font-bold">This selfie becomes your manual registration identity reference.</p>
                                </div>
                              </div>

                              <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                                {biometricSelfieStatus === 'reviewing' && pendingSelfieFile ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={handleConfirmSelfie}
                                      disabled={capturedSelfieValidationStatus !== 'passed'}
                                      className={cn(
                                        "px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest border transition-all duration-200 flex items-center justify-center gap-2",
                                        capturedSelfieValidationStatus === 'passed'
                                          ? "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
                                          : "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                                      )}
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                      {capturedSelfieValidationStatus === 'checking' ? 'Checking Photo' : 'Use This Photo'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleRetakeSelfie}
                                      className="px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest border border-philsa-navy bg-white text-philsa-navy hover:bg-philsa-bg transition-all duration-200 flex items-center justify-center gap-2"
                                    >
                                      <RefreshCw className="w-4 h-4" />
                                      Retake Photo
                                    </button>
                                  </>
                                ) : biometricSelfieStatus === 'stored' || (biometricSelfieStatus === 'failed' && Boolean(capturedSelfiePreview)) ? (
                                  <button
                                    type="button"
                                    onClick={handleRetakeSelfie}
                                    className="px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest border border-philsa-navy bg-white text-philsa-navy hover:bg-philsa-bg transition-all duration-200 flex items-center justify-center gap-2"
                                  >
                                    <RefreshCw className="w-4 h-4" />
                                    Retake Photo
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={startSelfieCamera}
                                    disabled={biometricSelfieStatus === 'uploading' || isSelfieCameraActive}
                                    className="px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest border transition-all duration-200 flex items-center justify-center gap-2 bg-philsa-navy text-white border-philsa-navy hover:bg-philsa-navy/90 cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed"
                                  >
                                    <Camera className="w-4 h-4" />
                                    {isSelfieCameraActive ? 'Detecting Face' : 'Start Camera'}
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 aspect-video">
                              <video
                                ref={selfieVideoRef}
                                className={cn("h-full w-full object-cover", !isSelfieCameraActive && "hidden")}
                                playsInline
                                muted
                              />
                              {isSelfieCameraActive && (
                                <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                                  <div className={cn(
                                    "relative h-[72%] max-h-[78%] min-h-[52%] aspect-[3/4] rounded-[50%] border-2 shadow-[0_0_0_999px_rgba(15,23,42,0.18)]",
                                    selfieFaceStatus === 'detected' || selfieFaceStatus === 'counting'
                                      ? "border-emerald-300/95"
                                      : "border-white/90"
                                  )}>
                                    <div className="absolute left-[20%] right-[20%] top-[38%] border-t border-dashed border-white/70" />
                                    <div className="absolute left-1/2 top-[38%] h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80" />
                                    <div className="absolute bottom-[16%] left-1/2 h-1.5 w-12 -translate-x-1/2 rounded-full bg-white/70" />
                                    <div className="absolute -inset-1 rounded-[50%] border border-white/35" />
                                  </div>
                                </div>
                              )}
                              {!isSelfieCameraActive && capturedSelfiePreview && (
                                <>
                                  <img
                                    src={capturedSelfiePreview}
                                    alt="Captured biometric selfie preview"
                                    className="h-full w-full object-cover"
                                  />
                                  <div className="absolute inset-x-0 bottom-0 bg-slate-950/80 px-4 py-3 text-center backdrop-blur-sm">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-white">Captured selfie preview</p>
                                  </div>
                                </>
                              )}
                              {!isSelfieCameraActive && !capturedSelfiePreview && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                                  <Camera className="w-10 h-10 text-slate-400 mb-3" />
                                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Live camera preview</p>
                                  <p className="text-[10px] text-slate-500 font-bold mt-1">Start the camera to capture your manual registration selfie.</p>
                                </div>
                              )}
                              {isSelfieCameraActive && (
                                <div className="absolute inset-x-0 bottom-0 z-20 bg-slate-950/80 px-4 py-3 text-center backdrop-blur-sm">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-white">
                                    {selfieCountdown !== null
                                      ? `Hold still. Auto capture in ${selfieCountdown} seconds`
                                      : selfieFaceStatus === 'scanning'
                                        ? 'Detecting single face'
                                        : selfieFaceStatus === 'detected'
                                          ? 'Single face detected'
                                          : 'Hold still'}
                                  </p>
                                </div>
                              )}
                            </div>

                            {(biometricSelfieFileName || biometricSelfieMessage || errors.selfie) && (
                              <div className={cn(
                                "rounded-xl px-4 py-3 text-xs font-bold border",
                                biometricSelfieStatus === 'stored' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                                biometricSelfieStatus === 'failed' || capturedSelfieValidationStatus === 'failed' || errors.selfie ? "bg-philsa-red/5 text-philsa-red border-philsa-red/20" :
                                biometricSelfieStatus === 'reviewing' ? "bg-amber-50 text-amber-700 border-amber-100" :
                                "bg-slate-50 text-slate-600 border-slate-200"
                              )}>
                                {biometricSelfieStatus === 'uploading'
                                  ? 'Storing captured selfie...'
                                  : biometricSelfieMessage || biometricSelfieFileName || errors.selfie}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {errors.general && (
                         <p className="text-xs text-philsa-red font-bold pl-1 border-l-2 border-philsa-red py-0.5 mt-1">{errors.general}</p>
                      )}

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
                                    className={cn("input-philsa pl-11", (errors.email || existingEmailMessage) && "border-philsa-red bg-philsa-red/5", isEmailVerified && !existingEmailMessage && "border-green-500 bg-green-50/60")}
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
                                 disabled={isEmailVerified || Boolean(existingEmailMessage) || isSendingEmailOtp}
                                 className={cn(
                                    "px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest border transition-all duration-200",
                                    isEmailVerified
                                      ? "bg-green-50 text-green-700 border-green-200 cursor-not-allowed"
                                      : existingEmailMessage || isSendingEmailOtp
                                        ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                                      : "bg-philsa-navy text-white border-philsa-navy hover:bg-philsa-navy/90"
                                 )}
                              >
                                 {isSendingEmailOtp ? 'Sending...' : emailOtpSentTo ? 'Resend OTP' : 'Send OTP'}
                              </button>
                           </div>
                           {(errors.email || existingEmailMessage) && (
                              <p className="text-xs text-philsa-red font-bold pl-1">{errors.email || existingEmailMessage}</p>
                           )}
                           {isEmailVerified && (
                              <p className="text-xs text-green-700 font-black uppercase tracking-wider flex items-center gap-1.5 pl-1">
                                 <CheckCircle className="w-3.5 h-3.5" /> Email verified
                              </p>
                           )}
                        </div>

                        {emailOtpSentTo && !isEmailVerified && (
                           <div className="space-y-3 p-5 rounded-2xl border border-blue-200 bg-blue-50">
                              <div className="flex items-start gap-3">
                                 <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                                    <Mail className="w-5 h-5" />
                                 </div>
                                 <div>
                                    <h5 className="text-xs font-black text-blue-900 uppercase tracking-widest">Email OTP Sent</h5>
                                    <p className="text-xs text-blue-800 font-medium mt-1">
                                       Enter the 6-digit OTP sent to your email address. Check your inbox and spam folder if it does not arrive soon.
                                    </p>
                                    <p className="text-[11px] text-blue-700 mt-1">Target email: {emailOtpSentTo}</p>
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
                                    disabled={isVerifyingEmailOtp}
                                    className={cn(
                                       "px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest border transition-all duration-200",
                                       isVerifyingEmailOtp
                                         ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                                         : "border-green-600 bg-green-600 text-white hover:bg-green-700"
                                    )}
                                 >
                                    {isVerifyingEmailOtp ? 'Verifying...' : 'Verify OTP'}
                                 </button>
                              </div>
                              {errors.emailOtp && <p className="text-xs text-philsa-red font-bold pl-1">{errors.emailOtp}</p>}
                           </div>
                        )}

                        {!emailOtpSentTo && !isEmailVerified && errors.emailOtp && (
                           <p className="text-xs text-philsa-red font-bold pl-1">{errors.emailOtp}</p>
                        )}

                        <div className={cn("p-4 rounded-2xl border flex items-start gap-3", isEmailVerified ? "bg-green-50 border-green-200" : "bg-blue-50 border-blue-200")}>
                           <ShieldCheck className={cn("w-5 h-5 mt-0.5 shrink-0", isEmailVerified ? "text-green-700" : "text-blue-700")} />
                           <p className={cn("text-xs font-bold leading-relaxed", isEmailVerified ? "text-green-800" : "text-blue-800")}>
                              Email must be verified using OTP before setting password and mobile number. Select Send OTP and use the code delivered to your email address.
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
               <div className="card-philsa !p-6 sm:!p-8 bg-white border border-slate-200 shadow-xl rounded-2xl space-y-8">
                  <div className="space-y-2 border-b border-slate-200 pb-5">
                     {verificationPath !== 'manual' && (
                        <p className="text-[9px] font-black text-philsa-red uppercase tracking-[0.35em]">Step 03</p>
                     )}
                     <h4 className="text-xl sm:text-2xl font-black text-philsa-navy tracking-tight">
                        {verificationPath === 'manual' ? 'Review your registration' : 'Review Your Registration Dossier'}
                     </h4>
                     <p className="text-xs text-slate-600 font-medium">
                        {verificationPath === 'manual'
                           ? 'Check each section before you submit. You can edit any section from here.'
                           : 'Please inspect and verify your profile summary before executing your final admission registry submission.'}
                     </p>
                  </div>

                  {verificationPath !== 'manual' && (
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/50">
                     <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 bg-slate-50 px-5 py-5">
                        <div>
                           <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.35em]">Registry Profile Digest</p>
                           <h5 className="mt-1 text-sm font-black uppercase tracking-[0.18em] text-philsa-navy">Candidate Identity Record</h5>
                        </div>
                        <span className="w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[8px] font-black uppercase tracking-[0.18em] text-emerald-700">
                           Ready to Submit
                        </span>
                     </div>

                     <div className="grid gap-6 p-5 lg:grid-cols-[210px_1fr]">
                        <div className="space-y-3">
                           <p className="text-[8px] font-black uppercase tracking-[0.25em] text-slate-400">Biometric Face Record</p>
                           <div className="relative h-36 w-36 overflow-hidden rounded-xl border border-slate-200 bg-slate-900 shadow-md">
                              {capturedSelfiePreview ? (
                                 <img src={capturedSelfiePreview} alt="Verified biometric face record" className="h-full w-full object-cover" />
                              ) : (
                                 <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-800 via-slate-600 to-slate-900">
                                    <User className="h-16 w-16 text-slate-300" />
                                 </div>
                              )}
                              <span className="absolute inset-x-5 bottom-2 rounded-md bg-emerald-600 py-1 text-center text-[8px] font-black uppercase tracking-widest text-white">
                                 Verified
                              </span>
                           </div>
                        </div>

                        <div className="grid content-start gap-4 sm:grid-cols-2">
                           <DossierField label="Learner Reference Number (LRN)" value={lrnVerificationReview?.lrn || formData.lrn || 'Pending verification'} />
                           <DossierField
                              label={dossierVerificationLabel}
                              value={lrnVerificationReview?.value || lrnRegisteredValue || 'Pending verification'}
                           />
                           <DossierField
                              className="sm:col-span-2"
                              label="Authorized Testing School Profile"
                              value={`${formData.schoolName || 'Pending school'} — ${formData.gradeLevel || 'Pending grade'}${formData.academicTrack ? ` (${formData.academicTrack} Track)` : ''}`}
                           />
                        </div>
                     </div>
                  </div>
                  )}

                  {verificationPath === 'manual' && (
                     <div className="space-y-4">
                        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                           <div className="mb-4 flex items-center justify-between gap-3">
                              <h5 className="flex items-center gap-2 text-sm font-black text-philsa-navy">
                                 <User className="h-4 w-4" />
                                 Personal information
                              </h5>
                              <button
                                 type="button"
                                 onClick={() => jumpToSection(0)}
                                 className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-bold text-philsa-navy hover:border-philsa-red hover:text-philsa-red"
                              >
                                 <Pencil className="h-3.5 w-3.5" />
                                 Edit
                              </button>
                           </div>

                           <div className="flex items-center gap-4 pb-4">
                              <div className="h-14 w-14 shrink-0 overflow-hidden rounded border border-slate-200 bg-slate-100">
                                 {capturedSelfiePreview ? (
                                    <img src={capturedSelfiePreview} alt="Biometric face record" className="h-full w-full object-cover" />
                                 ) : (
                                    <div className="flex h-full w-full items-center justify-center">
                                       <User className="h-6 w-6 text-slate-400" />
                                    </div>
                                 )}
                              </div>
                              <div className="min-w-0">
                                 <p className="truncate text-sm font-black text-philsa-navy">{manualReviewFullName}</p>
                                 <p className="text-xs font-medium text-slate-500">Biometric face record on file</p>
                              </div>
                           </div>

                           <div className="grid gap-x-8 gap-y-3 border-t border-slate-200 pt-4 sm:grid-cols-2">
                              {getManualReviewFields('Personal Information').map(field => (
                                 <div key={field.id || field.value} className="min-w-0">
                                    <p className="text-[11px] font-bold text-slate-500">{field.value}</p>
                                    <p className="break-words text-xs font-black text-philsa-navy">{getManualStep1FieldValue(field) || 'Not entered'}</p>
                                 </div>
                              ))}
                           </div>
                        </section>

                        {getManualReviewFields('School Information').length > 0 && (
                           <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                              <div className="mb-4 flex items-center justify-between gap-3">
                                 <h5 className="flex items-center gap-2 text-sm font-black text-philsa-navy">
                                    <School className="h-4 w-4" />
                                    School information
                                 </h5>
                                 <button
                                    type="button"
                                    onClick={() => jumpToSection(0)}
                                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-bold text-philsa-navy hover:border-philsa-red hover:text-philsa-red"
                                 >
                                    <Pencil className="h-3.5 w-3.5" />
                                    Edit
                                 </button>
                              </div>
                              <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
                                 {getManualReviewFields('School Information').map(field => (
                                    <div key={field.id || field.value} className="min-w-0">
                                       <p className="text-[11px] font-bold text-slate-500">{field.value}</p>
                                       <p className="break-words text-xs font-black text-philsa-navy">{getManualStep1FieldValue(field) || 'Not entered'}</p>
                                    </div>
                                 ))}
                              </div>
                           </section>
                        )}

                        {getManualReviewFields('Additional Information').length > 0 && (
                           <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                              <div className="mb-4 flex items-center justify-between gap-3">
                                 <h5 className="flex items-center gap-2 text-sm font-black text-philsa-navy">
                                    <Shield className="h-4 w-4" />
                                    Additional information
                                 </h5>
                                 <button
                                    type="button"
                                    onClick={() => jumpToSection(0)}
                                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-bold text-philsa-navy hover:border-philsa-red hover:text-philsa-red"
                                 >
                                    <Pencil className="h-3.5 w-3.5" />
                                    Edit
                                 </button>
                              </div>
                              <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
                                 {getManualReviewFields('Additional Information').map(field => (
                                    <div key={field.id || field.value} className="min-w-0">
                                       <p className="text-[11px] font-bold text-slate-500">{field.value}</p>
                                       <p className="break-words text-xs font-black text-philsa-navy">{getManualStep1FieldValue(field) || 'Not entered'}</p>
                                    </div>
                                 ))}
                              </div>
                           </section>
                        )}

                        {isPwdMaintenanceEnabled && formData.isPwd && (
                           <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                              <div className="mb-4 flex items-center justify-between gap-3">
                                 <h5 className="flex items-center gap-2 text-sm font-black text-philsa-navy">
                                    <ShieldCheck className="h-4 w-4" />
                                    PWD information
                                 </h5>
                                 <button
                                    type="button"
                                    onClick={() => jumpToSection(0)}
                                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-bold text-philsa-navy hover:border-philsa-red hover:text-philsa-red"
                                 >
                                    <Pencil className="h-3.5 w-3.5" />
                                    Edit
                                 </button>
                              </div>
                              <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
                                 {isPwdFieldActive('PWD Type') && (
                                 <div className="min-w-0">
                                    <p className="text-[11px] font-bold text-slate-500">PWD Type</p>
                                    <p className="break-words text-xs font-black text-philsa-navy">{formData.pwdType || 'Not entered'}</p>
                                 </div>
                                 )}
                                 {isPwdFieldActive('Condition') && (
                                 <div className="min-w-0 sm:col-span-2">
                                    <p className="text-[11px] font-bold text-slate-500">{formData.pwdType === PWD_MULTIPLE_CATEGORY ? 'Categories and Specific Types' : 'Condition'}</p>
                                    <p className="break-words text-xs font-black text-philsa-navy">
                                      {formData.pwdType === PWD_MULTIPLE_CATEGORY
                                        ? selectedMultiplePwdEntries.map(([category, condition]) => `${category}: ${condition}`).join('; ') || 'Not entered'
                                        : formData.pwdCondition || 'Not entered'}
                                    </p>
                                 </div>
                                 )}
                                 {isPwdFieldActive('PWD ID Number') && (
                                 <div className="min-w-0">
                                    <p className="text-[11px] font-bold text-slate-500">PWD ID Number</p>
                                    <p className="break-words text-xs font-black text-philsa-navy">{formData.pwdIdNumber || 'Not entered'}</p>
                                 </div>
                                 )}
                                 {isPwdFieldActive('PWD ID Attachment') && (
                                 <div className="min-w-0">
                                    <p className="text-[11px] font-bold text-slate-500">PWD ID Attachment</p>
                                    {formData.pwdIdPreviewUrl ? (
                                       <a
                                          href={formData.pwdIdPreviewUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="break-words text-xs font-black text-philsa-red underline underline-offset-2 hover:text-philsa-red/80"
                                       >
                                          {formData.pwdIdFilename || 'View PWD ID attachment'}
                                       </a>
                                    ) : (
                                       <p className="break-words text-xs font-black text-philsa-navy">{formData.pwdIdFilename || 'Not entered'}</p>
                                    )}
                                 </div>
                                 )}
                                 {isPwdFieldActive('Accommodation Needed') && (
                                 <div className="min-w-0 sm:col-span-2">
                                    <p className="text-[11px] font-bold text-slate-500">Accommodation Needed</p>
                                    <p className="break-words text-xs font-black text-philsa-navy">{formData.pwdAccommodation || 'Not entered'}</p>
                                 </div>
                                 )}
                              </div>
                           </section>
                        )}
                     </div>
                  )}

                  <label className={cn(
                     "flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-left transition-colors",
                     reviewCertified ? "border-emerald-200 bg-emerald-50" : "border-philsa-red/20 bg-philsa-red/5 hover:border-philsa-red/40"
                  )}>
                     <input
                        type="checkbox"
                        checked={reviewCertified}
                        onChange={(e) => {
                           setReviewCertified(e.target.checked);
                           if (e.target.checked && errors.general) {
                              setErrors(prev => {
                                 const next = { ...prev };
                                 delete next.general;
                                 return next;
                              });
                           }
                        }}
                        className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 text-philsa-red focus:ring-philsa-red"
                     />
                     <span className="text-[11px] font-bold leading-relaxed text-philsa-navy">
                        I certify that all details above are accurate and match my DepEd identification records. I authorize PhilSLA to transmit my compiled registration profile for spatial testing-center allocations and admission evaluation.
                     </span>
                  </label>

                  {errors.general && (
                     <div className="rounded-xl border border-philsa-red/20 bg-philsa-red/5 px-4 py-3 text-xs font-bold text-philsa-red">
                        {errors.general}
                     </div>
                  )}

                  <div className="flex flex-col gap-4 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                     <button
                        type="button"
                        onClick={handleBack}
                        disabled={isSubmitting}
                        className="btn-secondary px-6 py-3 flex items-center justify-center gap-2 group disabled:opacity-30 w-full sm:w-auto"
                     >
                        <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> Back
                     </button>
                     <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitting || !reviewCertified}
                        className="btn-primary px-8 sm:px-12 flex items-center justify-center gap-3 py-3.5 text-sm font-black tracking-tight shadow-xl shadow-philsa-red/20 active:scale-95 transition-all w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                        <CheckCircle className="w-4 h-4" />
                        {isSubmitting ? 'Processing Registration...' : 'Submit Registration'}
                     </button>
                  </div>
               </div>
               <p className="text-center text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                  Encountering issues with registry queries? Contact <span className="text-philsa-red">support@philsa.gov.ph</span>
               </p>
            </motion.div>
          )}

        </div>

        {currentSection !== SECTIONS.length - 1 && (
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

           <button
             onClick={handleNext}
             className="btn-primary px-6 sm:px-12 flex items-center justify-center gap-2 py-3.5 sm:py-4 group w-full sm:w-auto"
           >
              Continue <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
         </div>
        )}
       </div>

      {showSelfieTutorial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-md bg-slate-900/60 transition-all">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-5xl w-full max-h-[94vh] overflow-y-auto bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-2xl relative"
          >
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-100 bg-white text-emerald-700">
                  <Camera className="h-4 w-4 text-philsa-red" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-philsa-navy">Selfie Tutorial</p>
                  <p className="mt-1 text-[11px] font-semibold leading-relaxed text-slate-500">Follow these 4 protocol steps before starting your camera capture:</p>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { number: '1', title: 'Proper Lighting', body: 'Ensure bright, even front lighting with no dark shadows or background glare.' },
                { number: '2', title: 'Face Alignment', body: 'Center your face inside the oval guide and keep camera at eye level.' },
                { number: '3', title: 'Clear Face', body: 'Remove hats, caps, dark sunglasses, or face coverings.' },
                { number: '4', title: 'Neutral Pose', body: 'Look straight forward into camera with a natural, calm expression.' },
              ].map((item, index) => {
                return (
                  <div key={item.title} className="rounded-xl border border-slate-200 bg-white px-5 py-6 text-center shadow-sm">
                    <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-white">
                      <span className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full text-xs font-black",
                        index === 0 ? "bg-amber-50 text-amber-700" :
                        index === 1 ? "bg-blue-50 text-blue-700" :
                        index === 2 ? "bg-rose-50 text-rose-700" :
                        "bg-emerald-50 text-emerald-700"
                      )}>
                        {item.number}
                      </span>
                    </div>
                    <p className="text-xs font-black uppercase tracking-widest text-philsa-navy">{item.title}</p>
                    <p className="mt-3 text-[10px] font-semibold leading-relaxed text-slate-500">{item.body}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  <p className="text-xs font-black uppercase tracking-widest text-philsa-navy">Sample Compliant Selfie Visual Reference</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-[8px] font-black uppercase tracking-widest text-emerald-700">Required Standard</span>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  {
                    status: 'pass',
                    title: 'Proper Selfie Sample',
                    body: 'Frontal face centered inside frame, bright even lighting, eyes and expression visible with no caps or dark glasses.',
                    image: passSelfieImg,
                    alt: 'Proper selfie sample',
                  },
                  {
                    status: 'fail',
                    title: 'Poor Lighting / Shadows',
                    body: 'Dark backgrounds, harsh shadows, or backlit environments will cause biometric verification failure.',
                    image: poorLightingSelfieImg,
                    alt: 'Poor lighting selfie sample',
                  },
                  {
                    status: 'fail',
                    title: 'Obstructed / Blurry Face',
                    body: 'Face coverings, sunglasses, caps, or extreme side profile angles will be automatically rejected.',
                    image: blurrySelfieImg,
                    alt: 'Blurry or obstructed selfie sample',
                  },
                ].map(item => (
                  <div
                    key={item.title}
                    className={cn(
                      "rounded-xl border p-4 text-center",
                      item.status === 'pass' ? "border-emerald-300 bg-white" : "border-rose-200 bg-white"
                    )}
                  >
                    <img src={item.image} alt={item.alt} className="mx-auto h-36 w-36 sm:h-40 sm:w-40 object-contain" />
                    <p className={cn(
                      "mx-auto mt-4 inline-flex rounded px-3 py-1 text-[9px] font-black uppercase tracking-widest",
                      item.status === 'pass' ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                    )}>
                      {item.status === 'pass' ? 'PASS ' : 'X '}{item.title}
                    </p>
                    <p className="mt-2 text-[10px] font-semibold leading-relaxed text-slate-500">{item.body}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setShowSelfieTutorial(false)}
                className="px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest border border-slate-100 bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all duration-200 flex items-center justify-center gap-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setHasSeenSelfieTutorial(true);
                  setShowSelfieTutorial(false);
                  void startSelfieCamera({ skipTutorial: true });
                }}
                className="px-7 py-3 rounded-xl text-xs font-black uppercase tracking-widest border border-black bg-black text-white hover:bg-slate-900 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20"
              >
                <Camera className="w-4 h-4 text-amber-400" />
                Start Camera Selfie
              </button>
            </div>
          </motion.div>
        </div>
      )}

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
                Your LRN could not be verified after 5 attempts. You can wait 15 minutes and try again.
              </p>
              <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                Registration requires a successful LRN identity match before biometric selfie enrollment.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                type="button"
                onClick={() => {
                  if (cooldownSecondsLeft <= 0) {
                    clearStoredLrnCooldown();
                    setShowLrnCooldownModal(false);
                    setLrnAttemptsLeft(5);
                    setCooldownSecondsLeft(LRN_COOLDOWN_SECONDS);
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
                onClick={() => {
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

function DossierField({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-slate-200 bg-white px-4 py-4", className)}>
      <p className="text-[8px] font-black uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-black leading-relaxed tracking-normal text-philsa-navy break-words">{value || '-'}</p>
    </div>
  );
}
