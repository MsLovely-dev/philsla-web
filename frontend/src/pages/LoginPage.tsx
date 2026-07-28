import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, CheckCircle2, KeyRound, LogIn, Mail, Shield } from 'lucide-react';
import { Logo } from '../components/Logo';
import { usePhilSA } from '../PhilSAContext';
import type { UserRole } from '../types';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LRN_PATTERN = /^\d{12}$/;
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

type LoginStep = 'identifier' | 'activation' | 'password' | 'otp';

function isValidIdentifier(value: string): boolean {
  const trimmed = value.trim();
  return LRN_PATTERN.test(trimmed) || EMAIL_PATTERN.test(trimmed);
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
  if (LRN_PATTERN.test(identifier)) {
    return `${identifier.slice(0, 3)}******${identifier.slice(-3)}`;
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
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const { startLoginIdentifier, verifyLoginPassword, completeStaffActivation, verifyLoginOtp } = usePhilSA();
  const navigate = useNavigate();

  const handleIdentifierStep = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedIdentifier = identifier.trim();

    if (!normalizedIdentifier) {
      setError('Please enter your LRN or email address.');
      return;
    }
    if (!isValidIdentifier(normalizedIdentifier)) {
      setError('Enter a valid LRN or email address.');
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
    setPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setOtp(['', '', '', '', '', '']);
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
                <label className="label-philsa block mb-3 ml-1">LRN or Email</label>
                <div className="relative group">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-philsa-gray/40 group-focus-within:text-philsa-red transition-colors" />
                  <input
                    type="text"
                    inputMode="email"
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    placeholder="Student LRN or account email"
                    className="input-philsa pl-14"
                    autoComplete="username"
                    required
                  />
                </div>
                <p className="text-[10px] text-philsa-gray font-bold leading-relaxed uppercase tracking-wider mt-3 ml-1">
                  Students may use LRN or email. Staff and admin users must use email.
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
                {loading ? 'Checking Identifier...' : 'Continue to Password'}
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
        </div>
      </motion.div>
    </div>
  );
}
