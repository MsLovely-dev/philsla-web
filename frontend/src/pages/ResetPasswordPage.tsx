import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Eye, EyeOff, KeyRound, LockKeyhole, LogIn } from 'lucide-react';
import { Logo } from '../components/Logo';
import { usePhilSA } from '../PhilSAContext';

function passwordPolicyError(password: string): string {
  if (password.length < 8) return 'Password must be at least 8 characters long.';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number.';
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return 'Password must contain at least one special character.';
  return '';
}

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const recoveryToken = useMemo(() => searchParams.get('token') ?? '', [searchParams]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [accountLabel, setAccountLabel] = useState('');
  const [accountLoading, setAccountLoading] = useState(false);
  const [complete, setComplete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { completePasswordRecovery, inspectPasswordRecovery } = usePhilSA();

  useEffect(() => {
    if (!recoveryToken) {
      setError('This recovery link has expired. Please request a new one.');
      return;
    }

    let isMounted = true;
    setAccountLoading(true);

    void inspectPasswordRecovery(recoveryToken).then((result) => {
      if (!isMounted) return;
      if (result.ok === false) {
        setError(result.error.message);
        setAccountLabel('');
        return;
      }
      setAccountLabel(result.data.accountLabel || result.data.maskedEmail);
    }).finally(() => {
      if (isMounted) {
        setAccountLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [inspectPasswordRecovery, recoveryToken]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!recoveryToken) {
      setError('This recovery link has expired. Please request a new one.');
      return;
    }

    const policyError = passwordPolicyError(password);
    if (policyError) {
      setError(policyError);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');
    const result = await completePasswordRecovery(recoveryToken, password, confirmPassword);
    setLoading(false);

    if (result.ok === false) {
      setError(result.error.message);
      return;
    }

    setPassword('');
    setConfirmPassword('');
    setComplete(true);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:32px_32px] opacity-30" />
      <div className="relative w-full max-w-lg">
        <div className="bg-white border border-slate-200 shadow-xl rounded-2xl overflow-hidden">
          <div className="p-9 pb-6 flex items-center gap-5">
            <Logo />
            <div>
              <h1 className="text-3xl font-black text-philsa-navy tracking-tight">Reset Password</h1>
              <p className="text-xs font-black text-philsa-gray uppercase tracking-[0.28em]">Authorized Access Only</p>
            </div>
          </div>

          <div className="px-9 pb-9">
            {complete ? (
              <div className="space-y-8">
                <div className="rounded-lg border border-[#00563F]/15 bg-[#e5f1ec]/40 p-5 flex gap-4">
                  <CheckCircle2 className="h-6 w-6 text-[#00563F] shrink-0" />
                  <div>
                    <p className="text-sm font-black uppercase tracking-widest text-[#00563F]">Password Updated</p>
                    <p className="mt-2 text-sm font-medium leading-6 text-philsa-navy/75">
                      Continue to login and complete the normal security verification flow.
                    </p>
                  </div>
                </div>
                <Link to="/login" className="btn-primary w-full flex items-center justify-center gap-3">
                  Go to Login
                  <LogIn className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="rounded-lg border border-philsa-red/20 bg-philsa-red/5 p-4 text-sm font-bold text-philsa-red">
                    {error}
                  </div>
                )}

                <div className="bg-[#e5f1ec]/30 p-4 rounded-lg border border-[#00563F]/20 flex items-center gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#00563F] text-white shadow-md">
                    <Check className="h-5 w-5" strokeWidth={3} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-[#00563F] font-black leading-5">
                      {accountLoading
                        ? 'Checking recovery link...'
                        : accountLabel
                        ? `Set a new password for ${accountLabel}.`
                        : 'Set a new password for your account.'}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-philsa-navy/75 leading-5">
                      Choose a strong password you don't use for other sites.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="label-philsa">New Password</label>
                  <div className="relative group">
                    <KeyRound className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-philsa-gray/40 group-focus-within:text-philsa-red transition-colors" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter your new password"
                      className="input-philsa pl-14 pr-12"
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-philsa-gray hover:text-philsa-navy transition-colors"
                      aria-label={showPassword ? 'Hide new password' : 'Show new password'}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  <p className="text-xs font-semibold text-philsa-gray leading-5">
                    At least 8 characters with a mix of letters, numbers, and symbols.
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="label-philsa">Confirm Password</label>
                  <div className="relative group">
                    <KeyRound className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-philsa-gray/40 group-focus-within:text-philsa-red transition-colors" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="Confirm your new password"
                      className="input-philsa pl-14 pr-12"
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((current) => !current)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-philsa-gray hover:text-philsa-navy transition-colors"
                      aria-label={showConfirmPassword ? 'Hide confirmed password' : 'Show confirmed password'}
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  <p className="text-xs font-semibold text-philsa-gray leading-5">
                    Re-enter your new password to confirm.
                  </p>
                </div>

                <button disabled={loading} className="btn-primary w-full flex items-center justify-center gap-3 group">
                  {loading ? 'Updating Password...' : 'Update Password'}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>

                <div className="flex items-center gap-4">
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-sm font-bold text-philsa-gray">or</span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>

                <Link
                  to="/login"
                  className="flex w-full items-center justify-center gap-2 text-[11px] text-philsa-red font-black uppercase tracking-widest hover:text-philsa-navy transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Login
                </Link>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
