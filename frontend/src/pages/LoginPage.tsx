import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { AlertTriangle, ArrowLeft, ArrowRight, Camera, CheckCircle2, Clock, KeyRound, LogIn, Mail, RotateCcw, Shield } from 'lucide-react';
import { Logo } from '../components/Logo';
import { usePhilSA } from '../PhilSAContext';
import type { UserRole } from '../types';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MESSAGE_AUTO_DISMISS_MS = 10000;

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

function formatOtpTime(seconds: number): string {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
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
  const [resendingOtp, setResendingOtp] = useState(false);
  const [otpResendCooldown, setOtpResendCooldown] = useState(0);
  const [otpExpiresIn, setOtpExpiresIn] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { startLoginIdentifier, verifyLoginPassword, completeStaffActivation, resendLoginOtp, verifyLoginOtp, completeLoginSelfie } = usePhilSA();
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

  useEffect(() => {
    if (step !== 'otp' || otpResendCooldown <= 0) return;

    const timer = window.setTimeout(() => {
      setOtpResendCooldown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [otpResendCooldown, step]);

  useEffect(() => {
    if (step !== 'otp' || otpExpiresIn <= 0) return;

    const timer = window.setTimeout(() => {
      setOtpExpiresIn((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [otpExpiresIn, step]);

  useEffect(() => {
    if (!error) return;

    const timer = window.setTimeout(() => {
      setError('');
    }, MESSAGE_AUTO_DISMISS_MS);

    return () => window.clearTimeout(timer);
  }, [error]);

  useEffect(() => {
    if (!notice) return;

    const timer = window.setTimeout(() => {
      setNotice('');
    }, MESSAGE_AUTO_DISMISS_MS);

    return () => window.clearTimeout(timer);
  }, [notice]);

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
    setOtpResendCooldown(result.data.resendCooldownSeconds);
    setOtpExpiresIn(result.data.expiresInSeconds);
    setSelfiePendingAuthToken('');
    resetSelfieCapture();
    setOtp(['', '', '', '', '', '']);
    setNotice('');
    setStep('otp');
  };

  const handleResendOtp = async () => {
    if (!otpPendingAuthToken || otpResendCooldown > 0 || resendingOtp) return;

    setResendingOtp(true);
    setError('');
    setNotice('');
    const result = await resendLoginOtp(otpPendingAuthToken);
    setResendingOtp(false);

    if (result.ok === false) {
      setError(result.error.message);
      return;
    }

    setOtpPendingAuthToken(result.data.otpPendingAuthToken);
    setOtpResendCooldown(result.data.resendCooldownSeconds);
    setOtpExpiresIn(result.data.expiresInSeconds);
    setOtp(['', '', '', '', '', '']);
    setNotice(`A new verification code was sent to ${maskIdentifier(identifier)}.`);
    document.getElementById('otp-0')?.focus();
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

  const focusOtpInput = (index: number) => {
    document.getElementById(`otp-${index}`)?.focus();
  };

  const handleOtpPaste = (event: React.ClipboardEvent<HTMLInputElement>, index: number) => {
    event.preventDefault();

    const clipboardDigits = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const startIndex = clipboardDigits.length === 6 ? 0 : index;
    const pastedDigits = clipboardDigits.slice(0, 6 - startIndex);
    if (!pastedDigits) return;

    const newOtp = [...otp];
    pastedDigits.split('').forEach((digit, offset) => {
      newOtp[startIndex + offset] = digit;
    });
    setOtp(newOtp);

    focusOtpInput(Math.min(startIndex + pastedDigits.length, 5));
  };

  const handleOtpKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key !== 'Backspace') return;

    event.preventDefault();
    const newOtp = [...otp];

    if (newOtp[index]) {
      newOtp[index] = '';
      setOtp(newOtp);
      return;
    }

    if (index > 0) {
      newOtp[index - 1] = '';
      setOtp(newOtp);
      focusOtpInput(index - 1);
    }
  };

  const clearOtp = () => {
    setOtp(['', '', '', '', '', '']);
    focusOtpInput(0);
  };

  const resetToIdentifier = () => {
    setStep('identifier');
    setPendingAuthToken('');
    setActivationToken('');
    setOtpPendingAuthToken('');
    setSelfiePendingAuthToken('');
    setOtpResendCooldown(0);
    setOtpExpiresIn(0);
    setResendingOtp(false);
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

          {error && step !== 'otp' && (
            <div className="bg-red-50 border border-red-100 text-red-600 px-5 py-4 rounded-2xl mb-8 text-sm font-bold flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
              {error}
            </div>
          )}

          {notice && step !== 'otp' && (
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

          {step === 'otp' && otpExpiresIn <= 0 && (
            <div className="pt-4 text-center">
              <div className="relative mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-philsa-red/10">
                <Clock className="h-14 w-14 text-philsa-red" strokeWidth={2.2} />
                <div className="absolute -bottom-1 -right-1 flex h-10 w-10 items-center justify-center rounded-full bg-red-500 text-white shadow-md ring-4 ring-white">
                  <AlertTriangle className="h-5 w-5" fill="currentColor" strokeWidth={2.5} />
                </div>
              </div>

              <h3 className="mb-5 text-xl font-black text-philsa-navy tracking-tight">
                Verification Session Expired
              </h3>
              <p className="mx-auto mb-8 max-w-sm text-sm font-medium leading-7 text-philsa-navy/80">
                Your verification session has expired for security reasons.
                <br />
                Please sign in again to request a new verification code.
              </p>

              <div className="mb-8 h-px bg-philsa-border" />

              <button
                type="button"
                onClick={resetToIdentifier}
                className="mx-auto flex h-12 w-full max-w-xs items-center justify-center gap-3 rounded-lg border border-philsa-red bg-white text-sm font-black text-philsa-red transition-colors hover:bg-philsa-red hover:text-white"
              >
                <ArrowLeft className="h-5 w-5" />
                Return to Login
              </button>
            </div>
          )}

          {step === 'otp' && otpExpiresIn > 0 && (
            <form onSubmit={handleOtpStep} className="space-y-8">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50/80 p-4 text-left shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-500 text-white">
                      <AlertTriangle className="h-4 w-4" fill="currentColor" strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-black text-red-600">Incorrect verification code</h3>
                      <p className="mt-2 text-xs font-medium leading-5 text-philsa-navy">
                        The code you entered is incorrect or has already expired.
                      </p>
                    </div>
                  </div>
                  <div className="my-3 h-px bg-red-200/80" />
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-500">
                      <Mail className="h-4 w-4" />
                    </div>
                    <p className="text-xs font-medium leading-5 text-philsa-navy">
                      Use the latest verification code sent to <span className="font-black">{maskIdentifier(identifier)}</span>.
                      <br />
                      Request a new code if this one has expired.
                    </p>
                  </div>
                </div>
              )}

              {notice && (
                <div className="rounded-lg border border-[#00563F]/20 bg-[#e5f1ec]/70 p-4 text-left shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0f8b5f] text-white">
                      <CheckCircle2 className="h-4 w-4" fill="currentColor" strokeWidth={2.5} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-[#00563F]">New verification code sent</h3>
                      <p className="mt-2 text-xs font-medium leading-5 text-philsa-navy">
                        A new code has been sent to <span className="font-black">{maskIdentifier(identifier)}</span>.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="mb-2 block text-base font-black text-philsa-navy">Email Verification</label>
                <p className="mb-5 text-xs font-medium leading-5 text-philsa-navy">
                  Enter the 6-digit code sent to <span className="font-black text-[#31548a]">{maskIdentifier(identifier)}</span>
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
                      onKeyDown={(event) => handleOtpKeyDown(event, index)}
                      onPaste={(event) => handleOtpPaste(event, index)}
                      className="h-16 w-full rounded-lg border border-philsa-border bg-white text-center text-2xl font-black shadow-sm transition-all focus:border-philsa-red focus:ring-4 focus:ring-philsa-red/10"
                    />
                  ))}
                </div>
                <div className="mt-6 text-center">
                  <p className="inline-flex items-center justify-center gap-2 text-sm font-medium text-philsa-navy">
                    <Clock className="h-4 w-4 text-philsa-gray" />
                    Code expires in <span className="font-black text-[#0f8b5f]">{formatOtpTime(otpExpiresIn)}</span>
                  </p>
                  <div className="mt-5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-philsa-navy">
                    <span>Didn't receive the code?</span>
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      className="font-bold text-[#31548a] hover:underline disabled:text-philsa-gray/60 disabled:no-underline disabled:cursor-not-allowed"
                      disabled={otpResendCooldown > 0 || loading || resendingOtp}
                    >
                      {resendingOtp
                        ? 'Resending...'
                        : otpResendCooldown > 0
                        ? `Resend in ${otpResendCooldown}s`
                        : 'Resend code'}
                    </button>
                  </div>
                </div>
                {otp.some(Boolean) && (
                  <button
                    type="button"
                    onClick={clearOtp}
                    className="mx-auto mt-5 block text-[11px] text-philsa-gray font-black uppercase tracking-widest hover:text-philsa-red transition-colors"
                  >
                    Clear Code
                  </button>
                )}
              </div>

              <button disabled={loading || resendingOtp} className="btn-primary w-full flex items-center justify-center gap-3">
                {loading ? 'Verifying Code...' : 'Verify Code'}
                <ArrowRight className="w-5 h-5 text-white/70" />
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
