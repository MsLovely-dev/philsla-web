import { ChangeEvent, FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Camera, CheckCircle2, FileUp, RefreshCw, Save, Send, User, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  backendApplicationService,
  type BackendApplication,
  type StudentProfileCompletion,
  type StudentRegistrationFieldConfig,
} from '../../services/backendApplicationService';

type ProfileForm = {
  personal: Record<string, unknown>;
  address: Record<string, unknown>;
  school: Record<string, unknown>;
  coursePreferences: Record<string, unknown>[];
  reviewStep: Record<string, unknown>;
};

const FIELD_LOCATIONS: Record<string, { section: 'personal' | 'school'; key: string }> = {
  LRN: { section: 'school', key: 'lrn' },
  'Birth Date': { section: 'personal', key: 'dateOfBirth' },
  'First Name': { section: 'personal', key: 'firstName' },
  'Middle Name': { section: 'personal', key: 'middleName' },
  'Last Name': { section: 'personal', key: 'lastName' },
  'Extension Name': { section: 'personal', key: 'suffix' },
  Sex: { section: 'personal', key: 'sex' },
  'School ID': { section: 'school', key: 'schoolId' },
  'School Name': { section: 'school', key: 'name' },
  'Grade Level': { section: 'school', key: 'gradeLevel' },
  'Enrollment Status': { section: 'school', key: 'enrollmentStatus' },
  'School Year': { section: 'school', key: 'schoolYear' },
  PWD: { section: 'personal', key: 'isPwd' },
  'PWD Type': { section: 'personal', key: 'pwdType' },
  Condition: { section: 'personal', key: 'pwdCondition' },
  'PWD ID Number': { section: 'personal', key: 'pwdIdNumber' },
  'Accommodation Needed': { section: 'personal', key: 'pwdAccommodation' },
};

const STATIC_FIELDS: Array<{ section: 'personal' | 'address' | 'school'; key: string; label: string; type?: string }> = [
  { section: 'personal', key: 'firstName', label: 'First Name' },
  { section: 'personal', key: 'middleName', label: 'Middle Name' },
  { section: 'personal', key: 'lastName', label: 'Last Name' },
  { section: 'personal', key: 'suffix', label: 'Extension Name' },
  { section: 'personal', key: 'dateOfBirth', label: 'Birth Date', type: 'date' },
  { section: 'personal', key: 'sex', label: 'Sex' },
  { section: 'personal', key: 'email', label: 'Email' },
  { section: 'personal', key: 'mobile', label: 'Mobile Number' },
  { section: 'address', key: 'region', label: 'Region' },
  { section: 'address', key: 'province', label: 'Province' },
  { section: 'address', key: 'city', label: 'City/Municipality' },
  { section: 'address', key: 'barangay', label: 'Barangay' },
  { section: 'address', key: 'street', label: 'Street Address' },
  { section: 'address', key: 'postalCode', label: 'Postal Code' },
  { section: 'school', key: 'lrn', label: 'LRN' },
  { section: 'school', key: 'schoolId', label: 'School ID' },
  { section: 'school', key: 'name', label: 'School Name' },
  { section: 'school', key: 'academicTrack', label: 'Academic Track' },
  { section: 'school', key: 'gradeLevel', label: 'Grade Level' },
  { section: 'school', key: 'enrollmentStatus', label: 'Enrollment Status' },
  { section: 'school', key: 'schoolYear', label: 'School Year' },
  { section: 'school', key: 'gwa', label: 'GWA' },
];

const asString = (value: unknown) => (value === null || value === undefined ? '' : String(value));
const PWD_DEPENDENT_FIELD_NAMES = new Set(['PWD Type', 'Condition', 'PWD ID Number', 'PWD ID Attachment', 'Accommodation Needed']);
const isTruthyPwdValue = (value: unknown) => ['yes', 'true', '1'].includes(asString(value).trim().toLowerCase());
const SELFIE_CAPTURE_COUNTDOWN_SECONDS = 5;
const SELFIE_FRAME_CHECK_INTERVAL_MS = 1000;
const CAPTURED_SELFIE_RETAKE_MESSAGE = 'Retake photo. Photo must be clear.';

function buildForm(application: BackendApplication): ProfileForm {
  return {
    personal: { ...application.personal },
    address: { ...application.address },
    school: { ...application.school },
    coursePreferences: application.coursePreferences.length
      ? application.coursePreferences.map((item) => ({ ...item }))
      : [{ rank: 1, university: '', course: '' }],
    reviewStep: { privacyConsent: false, declarationAccepted: false, ...application.reviewStep },
  };
}

function locationForField(field: StudentRegistrationFieldConfig): { section: 'personal' | 'school'; key: string } {
  return FIELD_LOCATIONS[field.value] ?? { section: 'personal', key: field.value };
}

export default function StudentProfile() {
  const navigate = useNavigate();
  const location = useLocation();
  const notice = typeof location.state === 'object' && location.state && 'notice' in location.state
    ? String(location.state.notice)
    : '';
  const [profile, setProfile] = useState<StudentProfileCompletion | null>(null);
  const [form, setForm] = useState<ProfileForm | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState(notice);
  const [isSelfieCaptureOpen, setIsSelfieCaptureOpen] = useState(false);
  const [selfieStatus, setSelfieStatus] = useState<'idle' | 'scanning' | 'detected' | 'counting' | 'uploading' | 'captured'>('idle');
  const [selfieCountdown, setSelfieCountdown] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const selfieDetectionIntervalRef = useRef<number | null>(null);
  const selfieCountdownIntervalRef = useRef<number | null>(null);
  const selfieAutoCaptureRef = useRef(false);
  const selfieDetectionRequestInFlightRef = useRef(false);

  const loadProfile = async () => {
    setIsLoading(true);
    const result = await backendApplicationService.getStudentProfileCompletion();
    if (result.ok) {
      setProfile(result.data);
      setForm(buildForm(result.data.application));
      setMessage((current) => current || 'Complete your pending admissions profile to unlock student portal features.');
    } else if (result.ok === false) {
      setMessage(result.error.message);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    void loadProfile();
    return () => {
      stopSelfieCamera();
    };
  }, []);

  const dynamicFields = useMemo(() => (
    (profile?.fields ?? []).filter((field) => {
      if (!field.status || field.inputType === 'file') return false;
      if (PWD_DEPENDENT_FIELD_NAMES.has(field.value)) return isTruthyPwdValue(form?.personal.isPwd);
      return true;
    })
  ), [form?.personal.isPwd, profile?.fields]);

  const fileFields = useMemo(() => (
    (profile?.fields ?? []).filter((field) => {
      if (!field.status || field.inputType !== 'file') return false;
      if (PWD_DEPENDENT_FIELD_NAMES.has(field.value)) return isTruthyPwdValue(form?.personal.isPwd);
      return true;
    })
  ), [form?.personal.isPwd, profile?.fields]);

  const updateValue = (section: 'personal' | 'address' | 'school', key: string, value: unknown) => {
    setForm((current) => current ? { ...current, [section]: { ...current[section], [key]: value } } : current);
  };

  const updatePreference = (index: number, key: 'university' | 'course', value: string) => {
    setForm((current) => {
      if (!current) return current;
      const coursePreferences = current.coursePreferences.map((item, itemIndex) => (
        itemIndex === index ? { ...item, rank: itemIndex + 1, [key]: value } : item
      ));
      return { ...current, coursePreferences };
    });
  };

  const updateReview = (key: 'privacyConsent' | 'declarationAccepted', value: boolean) => {
    setForm((current) => current ? { ...current, reviewStep: { ...current.reviewStep, [key]: value } } : current);
  };

  const saveDraft = async () => {
    if (!profile || !form) return null;
    setIsSaving(true);
    const result = await backendApplicationService.saveStudentProfileDraft({
      version: profile.application.version,
      ...form,
    });
    setIsSaving(false);
    if (result.ok === false) {
      setMessage(result.error.message);
      return null;
    }
    setProfile(result.data);
    setForm(buildForm(result.data.application));
    setMessage('Draft saved.');
    return result.data;
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    await saveDraft();
  };

  const handleSubmit = async () => {
    const saved = await saveDraft();
    if (!saved) return;
    setIsSubmitting(true);
    const result = await backendApplicationService.submitStudentProfile(saved.application.version);
    setIsSubmitting(false);
    if (result.ok === false) {
      setMessage(result.error.message);
      return;
    }
    setMessage('Profile submitted for admissions review.');
    navigate('/dashboard', { replace: true });
  };

  const handleFile = async (fieldName: string, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const result = await backendApplicationService.uploadStudentProfileAttachment(fieldName, file);
    if (result.ok === false) {
      setMessage(result.error.message);
      return;
    }
    setMessage(`${result.data.filename} uploaded.`);
    await loadProfile();
  };

  const clearSelfieTimers = () => {
    if (selfieDetectionIntervalRef.current) {
      window.clearInterval(selfieDetectionIntervalRef.current);
      selfieDetectionIntervalRef.current = null;
    }
    if (selfieCountdownIntervalRef.current) {
      window.clearInterval(selfieCountdownIntervalRef.current);
      selfieCountdownIntervalRef.current = null;
    }
    selfieAutoCaptureRef.current = false;
    setSelfieCountdown(null);
  };

  const createSelfieFileFromCamera = async () => {
    const video = videoRef.current;
    if (!video || !streamRef.current) {
      setMessage('Start the camera before capturing a selfie.');
      return null;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const context = canvas.getContext('2d');
    if (!context) {
      setMessage('Unable to capture a selfie from the camera.');
      return null;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
    if (!blob) {
      setMessage('Unable to prepare the captured selfie image.');
      return null;
    }
    return new File([blob], `profile-selfie-${Date.now()}.jpg`, { type: 'image/jpeg' });
  };

  const validateCapturedSelfieFile = async (file: File) => {
    const result = await backendApplicationService.validateManualRegistrationSelfieFace(file);
    if (result.ok === false) {
      return {
        passed: false,
        message: result.error.message ? `Retake photo. ${result.error.message}` : CAPTURED_SELFIE_RETAKE_MESSAGE,
      };
    }
    const passed = result.data.faceDetected && result.data.faceCount === 1 && !result.data.faceCovered;
    return {
      passed,
      message: passed ? 'Captured selfie passed. Uploading your profile identity reference.' : CAPTURED_SELFIE_RETAKE_MESSAGE,
    };
  };

  const validateSelfieFrameForAutoCapture = async () => {
    const file = await createSelfieFileFromCamera();
    if (!file) {
      return { isSingleFaceStable: false, message: 'Start the live camera before taking a selfie.' };
    }
    const validation = await validateCapturedSelfieFile(file);
    return {
      isSingleFaceStable: validation.passed,
      message: validation.passed ? '' : validation.message,
    };
  };

  const uploadSelfieFile = async (file: File) => {
    setSelfieStatus('uploading');
    setMessage('Storing captured selfie...');
    const validation = await validateCapturedSelfieFile(file);
    if (!validation.passed) {
      setMessage(validation.message);
      setSelfieStatus(streamRef.current ? 'scanning' : 'idle');
      return;
    }
    const result = await backendApplicationService.uploadStudentProfileSelfie(file);
    if (result.ok === false) {
      setMessage(result.error.message);
      setSelfieStatus(streamRef.current ? 'scanning' : 'idle');
      return;
    }
    setMessage('Selfie uploaded.');
    setSelfieStatus('captured');
    stopSelfieCamera();
    setIsSelfieCaptureOpen(false);
    await loadProfile();
  };

  const captureSelfie = async () => {
    clearSelfieTimers();
    const file = await createSelfieFileFromCamera();
    if (!file) return;
    await uploadSelfieFile(file);
  };

  const startSelfieCountdown = () => {
    if (selfieCountdownIntervalRef.current || selfieAutoCaptureRef.current) return;
    if (selfieDetectionIntervalRef.current) {
      window.clearInterval(selfieDetectionIntervalRef.current);
      selfieDetectionIntervalRef.current = null;
    }
    setSelfieStatus('counting');
    let countdownValue = SELFIE_CAPTURE_COUNTDOWN_SECONDS;
    setSelfieCountdown(countdownValue);
    setMessage('Single face detected. Hold still for automatic capture.');
    selfieCountdownIntervalRef.current = window.setInterval(() => {
      if (selfieDetectionRequestInFlightRef.current) return;
      selfieDetectionRequestInFlightRef.current = true;
      void validateSelfieFrameForAutoCapture().then((validation) => {
        if (!validation.isSingleFaceStable) {
          if (selfieCountdownIntervalRef.current) {
            window.clearInterval(selfieCountdownIntervalRef.current);
            selfieCountdownIntervalRef.current = null;
          }
          selfieAutoCaptureRef.current = false;
          setSelfieCountdown(null);
          setSelfieStatus('scanning');
          setMessage(validation.message || 'Face lost. Countdown reset. Keep your face centered to start capture again.');
          startSelfieFaceDetection();
          return;
        }

        if (countdownValue <= 1) {
          if (selfieCountdownIntervalRef.current) {
            window.clearInterval(selfieCountdownIntervalRef.current);
            selfieCountdownIntervalRef.current = null;
          }
          selfieAutoCaptureRef.current = true;
          setSelfieCountdown(null);
          void captureSelfie();
          return;
        }

        countdownValue -= 1;
        setSelfieCountdown(countdownValue);
      }).catch(() => {
        setMessage('Face detection failed. Please restart the camera and try again.');
        stopSelfieCamera();
      }).finally(() => {
        selfieDetectionRequestInFlightRef.current = false;
      });
    }, SELFIE_FRAME_CHECK_INTERVAL_MS);
  };

  const startSelfieFaceDetection = () => {
    clearSelfieTimers();
    setSelfieStatus('scanning');
    setMessage('Scanning for your face with server-side validation. Keep your face centered in the frame.');
    selfieDetectionIntervalRef.current = window.setInterval(() => {
      if (selfieDetectionRequestInFlightRef.current || selfieAutoCaptureRef.current) return;
      selfieDetectionRequestInFlightRef.current = true;
      void validateSelfieFrameForAutoCapture().then((validation) => {
        if (validation.isSingleFaceStable && !selfieAutoCaptureRef.current) {
          setSelfieStatus('detected');
          startSelfieCountdown();
          return;
        }
        if (!selfieAutoCaptureRef.current) {
          setSelfieStatus('scanning');
          setMessage(validation.message || 'Keep your face centered in the camera frame.');
        }
      }).catch(() => {
        setMessage('Server-side face detection failed. Please restart the camera and try again.');
        stopSelfieCamera();
      }).finally(() => {
        selfieDetectionRequestInFlightRef.current = false;
      });
    }, SELFIE_FRAME_CHECK_INTERVAL_MS);
  };

  const startSelfieCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage('Live camera capture is not supported by this browser.');
      return;
    }
    try {
      stopSelfieCamera();
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      startSelfieFaceDetection();
    } catch {
      setMessage('Unable to start camera. Check browser camera permission.');
      stopSelfieCamera();
    }
  };

  function stopSelfieCamera() {
    clearSelfieTimers();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setSelfieStatus('idle');
  }

  const closeSelfieCapture = () => {
    stopSelfieCamera();
    setIsSelfieCaptureOpen(false);
  };

  if (isLoading) {
    return <main className="p-6 text-sm font-semibold text-slate-600">Loading profile requirements...</main>;
  }

  if (!profile || !form) {
    return (
      <main className="p-6">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">{message || 'No pending student profile was found.'}</div>
      </main>
    );
  }

  const progress = profile.progress;
  const isSelfieCameraActive = Boolean(streamRef.current) && ['scanning', 'detected', 'counting', 'uploading'].includes(selfieStatus);

  return (
    <main className="min-h-screen bg-slate-50 p-4 lg:p-6">
      <form onSubmit={handleSave} className="mx-auto max-w-6xl space-y-5">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-philsa-gray">Student Portal</p>
              <h1 className="mt-1 text-2xl font-black text-philsa-navy">Profile Completion</h1>
              <p className="mt-1 text-sm font-medium text-slate-600">Candidate ID: {profile.application.candidateId ?? profile.application.id}</p>
            </div>
            <div className="min-w-60">
              <div className="flex items-center justify-between text-sm font-bold text-slate-700">
                <span>{progress.completed}/{progress.total} completed</span>
                <span>{progress.percent}%</span>
              </div>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full bg-emerald-600" style={{ width: `${progress.percent}%` }} />
              </div>
            </div>
          </div>
          {message && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800" role="status">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{message}</span>
            </div>
          )}
        </section>

        <section className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="space-y-5">
            <FieldSection title="Personal Information" icon={<User className="h-4 w-4" />}>
              {STATIC_FIELDS.filter((field) => field.section === 'personal').map((field) => (
                <TextField key={`${field.section}-${field.key}`} label={field.label} type={field.type} value={asString(form.personal[field.key])} onChange={(value) => updateValue(field.section, field.key, value)} />
              ))}
            </FieldSection>

            <FieldSection title="Address Information">
              {STATIC_FIELDS.filter((field) => field.section === 'address').map((field) => (
                <TextField key={`${field.section}-${field.key}`} label={field.label} value={asString(form.address[field.key])} onChange={(value) => updateValue(field.section, field.key, value)} />
              ))}
            </FieldSection>

            <FieldSection title="School Information">
              {STATIC_FIELDS.filter((field) => field.section === 'school').map((field) => (
                <TextField key={`${field.section}-${field.key}`} label={field.label} value={asString(form.school[field.key])} onChange={(value) => updateValue(field.section, field.key, value)} />
              ))}
            </FieldSection>

            {dynamicFields.length > 0 && (
              <FieldSection title="Configured Registration Fields">
                {dynamicFields.map((field) => {
                  const location = locationForField(field);
                  const value = asString(form[location.section][location.key]);
                  return field.inputType === 'dropdown' ? (
                    <SelectField key={field.id} label={field.value} value={value} options={field.optionValues ?? []} onChange={(next) => updateValue(location.section, location.key, next)} />
                  ) : (
                    <TextField key={field.id} label={field.value} type={field.inputType === 'date' ? 'date' : 'text'} value={value} onChange={(next) => updateValue(location.section, location.key, next)} />
                  );
                })}
              </FieldSection>
            )}

            <FieldSection title="Course Preferences">
              {form.coursePreferences.map((preference, index) => (
                <div key={index} className="grid gap-3 md:grid-cols-2">
                  <TextField label={`University ${index + 1}`} value={asString(preference.university)} onChange={(value) => updatePreference(index, 'university', value)} />
                  <TextField label={`Course ${index + 1}`} value={asString(preference.course)} onChange={(value) => updatePreference(index, 'course', value)} />
                </div>
              ))}
            </FieldSection>

            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-black text-philsa-navy">Declaration</h2>
              <label className="mt-4 flex items-start gap-3 text-sm font-semibold text-slate-700">
                <input type="checkbox" className="mt-1 h-4 w-4" checked={form.reviewStep.privacyConsent === true} onChange={(event) => updateReview('privacyConsent', event.target.checked)} />
                <span>I consent to PhilSA processing my information for admissions review.</span>
              </label>
              <label className="mt-3 flex items-start gap-3 text-sm font-semibold text-slate-700">
                <input type="checkbox" className="mt-1 h-4 w-4" checked={form.reviewStep.declarationAccepted === true} onChange={(event) => updateReview('declarationAccepted', event.target.checked)} />
                <span>I certify that the information and uploaded documents are accurate.</span>
              </label>
            </section>
          </div>

          <aside className="space-y-5">
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-black text-philsa-navy">Remaining Requirements</h2>
              <div className="mt-4 space-y-2">
                {progress.remaining.length === 0 ? (
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm font-bold text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Ready to submit
                  </div>
                ) : progress.remaining.map((item) => (
                  <div key={`${item.type}-${item.section}-${item.fieldKey}`} className="rounded-lg border border-slate-200 p-3 text-sm">
                    <p className="font-bold text-slate-800">{item.label}</p>
                    <p className="text-xs font-semibold uppercase text-slate-400">{item.type}</p>
                  </div>
                ))}
              </div>
            </section>

            {fileFields.length > 0 && (
              <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-base font-black text-philsa-navy">Supporting Documents</h2>
                <div className="mt-4 space-y-3">
                  {fileFields.map((field) => (
                    <label key={field.id} className="block rounded-lg border border-dashed border-slate-300 p-3 text-sm font-semibold text-slate-700">
                      <span className="mb-2 flex items-center gap-2"><FileUp className="h-4 w-4" aria-hidden="true" /> {field.value}</span>
                      <input aria-label={`Upload ${field.value}`} type="file" className="w-full text-xs" onChange={(event) => handleFile(field.value, event)} />
                    </label>
                  ))}
                </div>
              </section>
            )}

            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-950 text-white">
                    <Camera className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="text-base font-black uppercase tracking-wide text-philsa-navy">Biometric Selfie Capture *</h2>
                    <p className="text-xs font-semibold text-slate-600">This selfie becomes your profile identity reference.</p>
                  </div>
                </div>
                <button type="button" onClick={() => setIsSelfieCaptureOpen(true)} className="btn-primary flex items-center gap-2">
                  <Camera className="h-4 w-4" aria-hidden="true" /> Open Capture
                </button>
              </div>
            </section>

            <div className="sticky top-4 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <button type="submit" disabled={isSaving || isSubmitting} className="btn-secondary flex items-center justify-center gap-2">
                <Save className="h-4 w-4" aria-hidden="true" /> {isSaving ? 'Saving...' : 'Save Draft'}
              </button>
              <button type="button" disabled={isSaving || isSubmitting} onClick={handleSubmit} className="btn-primary flex items-center justify-center gap-2">
                <Send className="h-4 w-4" aria-hidden="true" /> {isSubmitting ? 'Submitting...' : 'Submit Profile'}
              </button>
            </div>
          </aside>
        </section>
      </form>

      {isSelfieCaptureOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="selfie-capture-title" className="w-full max-w-4xl rounded-lg border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-950 text-white">
                  <Camera className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 id="selfie-capture-title" className="text-base font-black uppercase tracking-wide text-philsa-navy">Biometric Selfie Capture *</h2>
                  <p className="text-xs font-semibold text-slate-600">This selfie becomes your profile identity reference.</p>
                </div>
              </div>
              <button type="button" onClick={closeSelfieCapture} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label="Close selfie capture">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="relative mt-5 flex aspect-video min-h-80 items-center justify-center overflow-hidden rounded-lg bg-slate-950 text-slate-300">
              <video ref={videoRef} className={isSelfieCameraActive ? 'h-full w-full object-cover' : 'hidden'} playsInline muted />
              {isSelfieCameraActive && (
                <>
                  <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                    <div className={`relative h-[72%] max-h-[78%] min-h-[52%] aspect-[3/4] rounded-[50%] border-2 shadow-[0_0_0_999px_rgba(15,23,42,0.18)] ${selfieStatus === 'detected' || selfieStatus === 'counting' ? 'border-emerald-300/95' : 'border-white/90'}`}>
                      <div className="absolute left-[20%] right-[20%] top-[38%] border-t border-dashed border-white/70" />
                      <div className="absolute left-1/2 top-[38%] h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80" />
                      <div className="absolute bottom-[16%] left-1/2 h-1.5 w-12 -translate-x-1/2 rounded-full bg-white/70" />
                      <div className="absolute -inset-1 rounded-[50%] border border-white/35" />
                    </div>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 z-20 bg-slate-950/80 px-4 py-3 text-center backdrop-blur-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white">
                      {selfieCountdown !== null
                        ? `Hold still. Auto capture in ${selfieCountdown} seconds`
                        : selfieStatus === 'scanning'
                          ? 'Server validating single face'
                          : selfieStatus === 'detected'
                            ? 'Single face detected'
                            : selfieStatus === 'uploading'
                              ? 'Storing captured selfie'
                              : 'Hold still'}
                    </p>
                  </div>
                </>
              )}
              {!isSelfieCameraActive && (
                <div className="px-4 text-center">
                  <Camera className="mx-auto h-12 w-12 text-slate-400" aria-hidden="true" />
                  <p className="mt-3 text-sm font-black uppercase tracking-wide text-white">Live Camera Preview</p>
                  <p className="mt-1 text-xs font-semibold text-slate-400">Start the camera to capture your profile selfie.</p>
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={startSelfieCamera} disabled={selfieStatus === 'uploading' || isSelfieCameraActive} className="btn-primary flex items-center justify-center gap-2">
                <Camera className="h-4 w-4" aria-hidden="true" /> {isSelfieCameraActive ? 'Detecting Face' : 'Start Camera'}
              </button>
              <button type="button" onClick={stopSelfieCamera} disabled={!streamRef.current || selfieStatus === 'uploading'} className="btn-secondary flex items-center justify-center gap-2">
                <RefreshCw className="h-4 w-4" aria-hidden="true" /> Reset
              </button>
              <button type="button" onClick={captureSelfie} disabled={!streamRef.current || selfieStatus === 'uploading'} className="btn-primary flex items-center justify-center gap-2">
                <Camera className="h-4 w-4" aria-hidden="true" /> {selfieStatus === 'uploading' ? 'Uploading...' : 'Capture Selfie'}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function FieldSection({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-base font-black text-philsa-navy">{icon}{title}</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function TextField({ label, value, onChange, type = 'text' }: { label: string; value: string; type?: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm font-bold text-slate-700">
      <span>{label}</span>
      <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900 focus:border-philsa-navy focus:outline-none focus:ring-2 focus:ring-philsa-navy/10" type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm font-bold text-slate-700">
      <span>{label}</span>
      <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900 focus:border-philsa-navy focus:outline-none focus:ring-2 focus:ring-philsa-navy/10" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Select</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}
