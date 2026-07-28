import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, Camera, CheckCircle2, KeyRound, LogIn, Mail, RotateCcw, Shield } from 'lucide-react';
import { Logo } from '../components/Logo';
import { usePhilSA } from '../PhilSAContext';
import type { UserRole } from '../types';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOCAL_BACKEND_ACCOUNTS = [
  'admissions.reviewer@yopmail.com',
  'proctor@yopmail.com',
  'proctor.admin@yopmail.com',
  'university.admin@yopmail.com',
  'testing.center.admin@yopmail.com',
  'exam.admin@yopmail.com',
  'system.admin@yopmail.com',
  'ched.admin@yopmail.com',
  'deped.admin@yopmail.com',
  'tesda.admin@yopmail.com',
  'executive@yopmail.com',
];

type LoginStep = 'identifier' | 'activation' | 'password' | 'otp' | 'selfie';

function isValidIdentifier(value: string): boolean {
  const trimmed = value.trim();
  return EMAIL_PATTERN.test(trimmed);
}

function routeForRole(role: UserRole): string {
  if (role === 'PROCTOR' || role === 'PROCTOR_ADMIN') return '/proctor/schedule';
  if (role === 'TESTING_CENTER_ADMIN') return '/admin/center-control';
  if (role === 'ADMISSIONS_REVIEWER') return '/admin/reviewer/applications';
  if (role === 'UNIVERSITY_ADMIN') return '/admin/university/applications';
  if (role === 'EXAM_ADMINISTRATOR') return '/admin/hub/overview';
  if (role === 'SYSTEM_ADMIN') return '/admin/users';
  if (role === 'GOVERNMENT' || role === 'EXECUTIVE') return '/admin/government';
  if (role === 'TECH_SUPPORT') return '/support/dashboard';
  return '/dashboard';
}

function maskIdentifier(identifier: string): string {
  if (EMAIL_PATTERN.test(identifier)) {
    return identifier.replace(/(.{3})(.*)(?=@)/, '$1***');
  }
  return identifier;
}

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<LoginStep>('identifier');
  const [pendingAuthToken, setPendingAuthToken] = useState('');
  const [activationToken, setActivationToken] = useState('');
  const [otpPendingAuthToken, setOtpPendingAuthToken] = useState('');
  const [selfiePendingAuthToken, setSelfiePendingAuthToken] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [selfiePreviewUrl, setSelfiePreviewUrl] = useState('');
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { startLoginIdentifier, verifyLoginPassword, completeStaffActivation, verifyLoginOtp, completeLoginSelfie } = usePhilSA();
  const navigate = useNavigate();

  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  useEffect(() => {
    return () => {
      cameraStream?.getTracks().forEach((track) => track.stop());
    };
  }, [cameraStream]);

  useEffect(() => {
    return () => {
      if (selfiePreviewUrl) {
        URL.revokeObjectURL(selfiePreviewUrl);
      }
    };
  }, [selfiePreviewUrl]);

  const handleIdentifierStep = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedIdentifier = identifier.trim();

    if (!normalizedIdentifier) {
      setError('Please enter your email address.');
      return;
    }
    if (!isValidIdentifier(normalizedIdentifier)) {
      setError('Enter a valid email address.');
      return;
    }

    setLoading(true);
    setError('');
    const result = await startLoginIdentifier(normalizedIdentifier);
    setLoading(false);

    if (result.ok === false) {
      setError(result.error.message);
      return;
    }

    setIdentifier(normalizedIdentifier);
    setNotice('');

    if (result.data.nextStep === 'activation') {
      setActivationToken(result.data.activationToken ?? '');
      setNewPassword('');
      setConfirmPassword('');
      setStep('activation');
      return;
    }

    setPendingAuthToken(result.data.pendingAuthToken ?? '');
    setStep('password');
  };

  const handleActivationStep = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!newPassword || !confirmPassword) {
      setError('Enter and confirm your new password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');
    setNotice('');
    const result = await completeStaffActivation(activationToken, newPassword, confirmPassword);
    setLoading(false);

    if (result.ok === false) {
      setError(result.error.message);
      return;
    }

    const loginRestart = await startLoginIdentifier(identifier);
    if (loginRestart.ok === false) {
      setError(loginRestart.error.message);
      return;
    }

    if (loginRestart.data.nextStep !== 'password') {
      setError('Password setup did not complete. Please start again.');
      return;
    }

    setPendingAuthToken(loginRestart.data.pendingAuthToken ?? '');
    setPassword(newPassword);
    setNewPassword('');
    setConfirmPassword('');
    setActivationToken('');
    setNotice('Password set. Continue with your new password.');
    setStep('password');
  };

  const handlePasswordStep = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    setError('');
    const result = await verifyLoginPassword(pendingAuthToken, password);
    setLoading(false);

    if (result.ok === false) {
      setError(result.error.message);
      return;
    }

    setOtpPendingAuthToken(result.data.otpPendingAuthToken);
    setSelfiePendingAuthToken('');
    resetSelfieCapture();
    setOtp(['', '', '', '', '', '']);
    setStep('otp');
  };

  const handleOtpStep = async (event: React.FormEvent) => {
    event.preventDefault();
    const code = otp.join('');

    if (!/^\d{6}$/.test(code)) {
      setError('Please enter the 6-digit code sent to your email.');
      return;
    }

    setLoading(true);
    setError('');
    const result = await verifyLoginOtp(otpPendingAuthToken, code);
    setLoading(false);

    if (result.ok === false) {
      setError(result.error.message);
      return;
    }

    setSelfiePendingAuthToken(result.data.selfiePendingAuthToken);
    resetSelfieCapture();
    setStep('selfie');
  };

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera access is not available in this browser.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      cameraStream?.getTracks().forEach((track) => track.stop());
      setCameraStream(stream);
      clearSelfiePreview();
    } catch {
      setError('Camera permission is required to complete login.');
    } finally {
      setLoading(false);
    }
  };

  const clearSelfiePreview = () => {
    if (selfiePreviewUrl) {
      URL.revokeObjectURL(selfiePreviewUrl);
    }
    setSelfiePreviewUrl('');
    setSelfieFile(null);
  };

  const resetSelfieCapture = () => {
    cameraStream?.getTracks().forEach((track) => track.stop());
    setCameraStream(null);
    clearSelfiePreview();
  };

  const captureSelfie = async () => {
    const video = videoRef.current;
    if (!video || !cameraStream || video.videoWidth === 0 || video.videoHeight === 0) {
      setError('Initialize the camera before capturing your selfie.');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      setError('Selfie capture failed. Please try again.');
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    if (!blob) {
      setError('Selfie capture failed. Please try again.');
      return;
    }

    clearSelfiePreview();
    const file = new File([blob], `login-selfie-${Date.now()}.jpg`, { type: 'image/jpeg' });
    cameraStream.getTracks().forEach((track) => track.stop());
    setCameraStream(null);
    setSelfieFile(file);
    setSelfiePreviewUrl(URL.createObjectURL(file));
    setError('');
  };

  const handleSelfieStep = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selfieFile) {
      setError('Capture a selfie before continuing.');
      return;
    }

    setLoading(true);
    setError('');
    const result = await completeLoginSelfie(selfiePendingAuthToken, selfieFile);
    setLoading(false);

    if (result.ok === false) {
      setError(result.error.message);
      return;
    }

    resetSelfieCapture();
    navigate(routeForRole(result.data.user.role));
  };

  const updateOtp = (value: string, index: number) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    if (digit && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };

  const resetToIdentifier = () => {
    setStep('identifier');
    setPendingAuthToken('');
    setActivationToken('');
    setOtpPendingAuthToken('');
    setSelfiePendingAuthToken('');
    setPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setOtp(['', '', '', '', '', '']);
    resetSelfieCapture();
    setError('');
    setNotice('');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full"
      >
        <div className="card-philsa relative">
          <div className="absolute -bottom-10 -right-10 opacity-[0.03] scale-150 rotate-12 pointer-events-none">
            <Logo size="xl" />
          </div>

          <div className="absolute top-0 right-0">
            <div className="bg-[#e5f1ec] text-[#00563F] font-black text-[9px] px-3 py-1.5 rounded-bl-md border-l border-b border-[#00563F]/15 flex items-center gap-1.5 tracking-widest leading-none">
              <Shield className="w-3 h-3" />
              SECURE
            </div>
          </div>

          <div className="flex items-center gap-5 mb-10">
            <Logo size="lg" />
            <div>
              <h2 className="text-2xl font-black text-philsa-navy tracking-tight leading-none mb-1">Exam Portal</h2>
              <p className="text-[10px] font-black text-philsa-gray uppercase tracking-[0.2em] opacity-60">Authorized Access Only</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 px-5 py-4 rounded-2xl mb-8 text-sm font-bold flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
              {error}
            </div>
          )}

          {notice && (
            <div className="bg-[#e5f1ec] border border-[#00563F]/15 text-[#00563F] px-5 py-4 rounded-2xl mb-8 text-sm font-bold flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4" />
              {notice}
            </div>
          )}

          {step === 'identifier' && (
            <form onSubmit={handleIdentifierStep} className="space-y-8">
              <div>
                <label className="label-philsa block mb-3 ml-1">Email</label>
                <div className="relative group">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-philsa-gray/40 group-focus-within:text-philsa-red transition-colors" />
                  <input
                    type="email"
                    inputMode="email"
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    placeholder="Enter your account email"
                    className="input-philsa pl-14"
                    autoComplete="username"
                    required
                  />
                </div>
                <p className="text-[10px] text-philsa-gray font-bold leading-relaxed uppercase tracking-wider mt-3 ml-1">
                  Students, staff, and admin users must use their registered email address.
                </p>
              </div>

              <div className="bg-philsa-bg p-5 rounded-2xl border border-philsa-border/40 ring-1 ring-inset ring-white">
                <p className="text-[10px] text-philsa-gray font-bold leading-relaxed uppercase tracking-wider block mb-3 opacity-60">
                  Local backend role accounts
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {LOCAL_BACKEND_ACCOUNTS.map((account) => (
                    <button
                      key={account}
                      type="button"
                      onClick={() => setIdentifier(account)}
                      className="text-[10px] text-philsa-navy font-bold hover:text-philsa-red transition-colors text-left flex items-center gap-2 group p-1 hover:bg-philsa-red/5 rounded-md"
                    >
                      <div className="w-1 h-1 rounded-full bg-philsa-border group-hover:bg-philsa-red" />
                      {account.split('@')[0]}
                    </button>
                  ))}
                </div>
              </div>

              <button disabled={loading} className="btn-primary w-full flex items-center justify-center gap-3 group">
                {loading ? 'Checking Email...' : 'Continue to Password'}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>
          )}

          {step === 'activation' && (
            <form onSubmit={handleActivationStep} className="space-y-8">
              <div>
                <label className="label-philsa block mb-3 ml-1">Create Password</label>
                <div className="relative group">
                  <KeyRound className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-philsa-gray/40 group-focus-within:text-philsa-red transition-colors" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="Set your account password"
                    className="input-philsa pl-14"
                    autoComplete="new-password"
                    required
                  />
                </div>
                <p className="text-[10px] text-philsa-gray font-bold leading-relaxed uppercase tracking-wider mt-3 ml-1">
                  Use at least 8 characters with uppercase, lowercase, number, and special character.
                </p>
              </div>

              <div>
                <label className="label-philsa block mb-3 ml-1">Confirm Password</label>
                <div className="relative group">
                  <KeyRound className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-philsa-gray/40 group-focus-within:text-philsa-red transition-colors" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Confirm your password"
                    className="input-philsa pl-14"
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>

              <div className="bg-[#e5f1ec]/30 p-4 rounded-lg border border-[#00563F]/15 flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-xs border border-gray-200">
                  <Shield className="w-4 h-4 text-[#00563F]" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-[#00563F] uppercase tracking-widest mb-1">Account</p>
                  <p className="text-[10px] text-[#00563F]/80 font-bold leading-tight uppercase">{maskIdentifier(identifier)}</p>
                </div>
              </div>

              <button disabled={loading} className="btn-primary w-full flex items-center justify-center gap-3 group">
                {loading ? 'Setting Password...' : 'Set Password'}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                type="button"
                onClick={resetToIdentifier}
                className="w-full text-[11px] text-philsa-gray font-black uppercase tracking-widest hover:text-philsa-navy transition-colors text-center"
              >
                Change Account
              </button>
            </form>
          )}

          {step === 'password' && (
            <form onSubmit={handlePasswordStep} className="space-y-8">
              <div>
                <div className="flex justify-between items-center mb-3 ml-1">
                  <label className="label-philsa">Password</label>
                  <button type="button" className="text-[10px] text-philsa-red font-black uppercase tracking-widest hover:underline">
                    Forgot Password?
                  </button>
                </div>
                <div className="relative group">
                  <LogIn className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-philsa-gray/40 group-focus-within:text-philsa-red transition-colors" />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your account password"
                    className="input-philsa pl-14"
                    autoComplete="current-password"
                    required
                  />
                </div>
              </div>

              <div className="bg-[#e5f1ec]/30 p-4 rounded-lg border border-[#00563F]/15 flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-xs border border-gray-200">
                  <Shield className="w-4 h-4 text-[#00563F]" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-[#00563F] uppercase tracking-widest mb-1">Account</p>
                  <p className="text-[10px] text-[#00563F]/80 font-bold leading-tight uppercase">{maskIdentifier(identifier)}</p>
                </div>
              </div>

              <button disabled={loading} className="btn-primary w-full flex items-center justify-center gap-3 group">
                {loading ? 'Verifying Password...' : 'Send Email OTP'}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                type="button"
                onClick={resetToIdentifier}
                className="w-full text-[11px] text-philsa-gray font-black uppercase tracking-widest hover:text-philsa-navy transition-colors text-center"
              >
                ← Change Account
              </button>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleOtpStep} className="space-y-10">
              <div>
                <label className="label-philsa block mb-2 text-center uppercase tracking-widest">Email Verification Code</label>
                <p className="text-[11px] text-philsa-gray font-bold text-center mb-8 uppercase">
                  Sent to {maskIdentifier(identifier)}
                </p>

                <div className="flex justify-between gap-3">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      id={`otp-${index}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(event) => updateOtp(event.target.value, index)}
                      className="w-full h-16 bg-philsa-bg border-none rounded-2xl text-center text-2xl font-black focus:ring-4 focus:ring-philsa-red/10 transition-all shadow-sm ring-1 ring-philsa-border/30"
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between mt-8">
                  <p className="text-[11px] text-philsa-gray font-bold uppercase tracking-wider">
                    Code expires in 5 minutes
                  </p>
                  <button type="button" className="text-[11px] text-philsa-red font-black uppercase tracking-widest hover:underline" disabled>
                    Resend Coming Soon
                  </button>
                </div>
              </div>

              <button disabled={loading} className="btn-primary w-full flex items-center justify-center gap-3">
                {loading ? 'Creating Session...' : 'Establish Session'}
                <LogIn className="w-5 h-5 text-white/50" />
              </button>

              <button
                type="button"
                onClick={() => setStep('password')}
                className="w-full text-[11px] text-philsa-gray font-black uppercase tracking-widest hover:text-philsa-navy transition-colors text-center"
              >
                ← Back to Password
              </button>
            </form>
          )}

          {step === 'selfie' && (
            <form onSubmit={handleSelfieStep} className="space-y-8">
              <div className="text-center">
                <p className="text-[10px] font-black text-philsa-red uppercase tracking-[0.28em] mb-2">
                  Secure Login Verification
                </p>
                <h3 className="text-2xl font-black text-philsa-navy tracking-tight leading-none mb-2">
                  Selfie Photo Log
                </h3>
                <p className="text-[10px] text-[#31548a] font-bold uppercase tracking-wider">
                  Take a quick selfie photograph to log your entry session
                </p>
              </div>

              <div className="bg-[#101827] rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-sm">
                <div className="relative aspect-video bg-[#101827] flex items-center justify-center">
                  {selfiePreviewUrl ? (
                    <img src={selfiePreviewUrl} alt="Captured login selfie preview" className="w-full h-full object-cover" />
                  ) : cameraStream ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                  ) : (
                    <div className="text-center px-6">
                      <div className="w-16 h-16 rounded-full bg-white/10 border border-white/15 flex items-center justify-center mx-auto mb-5">
                        <Camera className="w-8 h-8 text-white/80" />
                      </div>
                      <p className="text-white text-sm font-black uppercase tracking-wider mb-2">
                        Device Camera Portal Ready
                      </p>
                      <p className="text-white/50 text-[11px] font-bold leading-relaxed">
                        Camera permission is required to capture your login selfie.
                      </p>
                    </div>
                  )}
                </div>

                <div className="p-5 bg-[#101827] flex flex-col sm:flex-row gap-3">
                  {!cameraStream && !selfiePreviewUrl && (
                    <button
                      type="button"
                      onClick={startCamera}
                      disabled={loading}
                      className="w-full bg-white text-philsa-navy rounded-xl py-3 text-[11px] font-black uppercase tracking-widest hover:bg-white/90 transition-colors flex items-center justify-center gap-2"
                    >
                      <Camera className="w-4 h-4" />
                      Initialize Camera
                    </button>
                  )}

                  {cameraStream && !selfiePreviewUrl && (
                    <button
                      type="button"
                      onClick={captureSelfie}
                      disabled={loading}
                      className="w-full bg-white text-philsa-navy rounded-xl py-3 text-[11px] font-black uppercase tracking-widest hover:bg-white/90 transition-colors flex items-center justify-center gap-2"
                    >
                      <Camera className="w-4 h-4" />
                      Capture Selfie
                    </button>
                  )}

                  {selfiePreviewUrl && (
                    <button
                      type="button"
                      onClick={startCamera}
                      disabled={loading}
                      className="w-full bg-white/10 text-white rounded-xl py-3 text-[11px] font-black uppercase tracking-widest hover:bg-white/15 transition-colors flex items-center justify-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Retake
                    </button>
                  )}
                </div>
              </div>

              <button disabled={loading || !selfieFile} className="btn-primary w-full flex items-center justify-center gap-3">
                {loading ? 'Saving Selfie Log...' : 'Establish Session'}
                <LogIn className="w-5 h-5 text-white/50" />
              </button>

              <button
                type="button"
                onClick={() => {
                  resetSelfieCapture();
                  setStep('otp');
                }}
                className="w-full text-[11px] text-philsa-gray font-black uppercase tracking-widest hover:text-philsa-navy transition-colors text-center"
              >
                &larr; Back to OTP Code
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
