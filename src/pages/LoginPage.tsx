import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { usePhilSA } from '../PhilSAContext';
import { motion } from 'motion/react';
import { LogIn, ArrowRight, Shield, Mail, Smartphone, Check } from 'lucide-react';
import { Logo } from '../components/Logo';
import { MOCK_USERS } from '../lib/utils';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState(1); // 1: Email, 2: Password, 3: MFA Method, 4: OTP
  const [mfaMethod, setMfaMethod] = useState<'email' | 'phone'>('email');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = usePhilSA();
  const navigate = useNavigate();

  const findUserInSystem = (email: string) => {
    // Check mock users
    const mockUser = MOCK_USERS.find(u => u.email === email);
    if (mockUser) return mockUser;

    // Check local storage apps
    const savedApps = localStorage.getItem('philsa_apps');
    if (savedApps) {
      try {
        const apps = JSON.parse(savedApps);
        const app = apps.find((a: any) => a.email === email);
        if (app) {
          return {
            email: app.email,
            password: app.password,
            role: 'STUDENT'
          };
        }
      } catch (e) {
        console.error(e);
      }
    }
    return null;
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    const user = findUserInSystem(email);
    if (!user) {
      setError('Invalid email or unapproved account');
      return;
    }

    setLoading(true);
    setError('');
    setTimeout(() => {
      setStep(2);
      setLoading(false);
    }, 800);
  };

  const handlePasswordStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    // In prototype mode, we allow any password if an account exists
    const user = findUserInSystem(email);
    if (!user) {
      setError('Invalid email or unapproved account');
      setStep(1); // Go back to email step if somehow the user is gone
      return;
    }

    setLoading(true);
    setError('');
    setTimeout(() => {
      setStep(3);
      setLoading(false);
    }, 800);
  };

  const handleMfaSelection = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setTimeout(() => {
      setStep(4);
      setLoading(false);
    }, 800);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const success = await login(email, password);
    if (success) {
      // Find the user to determine navigation
      const foundUser = findUserInSystem(email);
      if (foundUser?.role === 'PROCTOR' || foundUser?.role === 'PROCTOR_ADMIN') {
        navigate('/proctor/schedule');
      } else if (foundUser?.role === 'TESTING_CENTER_ADMIN') {
        navigate('/admin/center-control');
      } else if (foundUser?.role === 'TECH_SUPPORT') {
        navigate('/support/dashboard');
      } else {
        navigate('/dashboard');
      }
    } else {
      setError('Invalid email or unapproved account');
      setLoading(false);
    }
  };

  const updateOtp = (val: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = val.slice(-1);
    setOtp(newOtp);
    // Auto focus next
    if (val && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full"
      >
        <div className="card-philsa relative">
          {/* Logo Watermark */}
          <div className="absolute -bottom-10 -right-10 opacity-[0.03] scale-150 rotate-12 pointer-events-none">
             <Logo size="xl" />
          </div>

          <div className="absolute top-0 right-0">
             <div className="bg-[#e5f1ec] text-[#00563F] font-black text-[9px] px-3 py-1.5 rounded-bl-md border-l border-b border-[#00563F]/15 flex items-center gap-1.5 tracking-widest leading-none">
                <Shield className="w-3 h-3" />
                SECURE
             </div>
          </div>

          <div className="flex items-center gap-5 mb-12">
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

          {step === 1 ? (
            <form onSubmit={handleNextStep} className="space-y-8">
              <div>
                <label className="label-philsa block mb-3 ml-1">Academic Credentials</label>
                <div className="relative group">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-philsa-gray/40 group-focus-within:text-philsa-red transition-colors" />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter Application Number or Email"
                    className="input-philsa pl-14"
                    required
                  />
                </div>
              </div>
              
              <div className="bg-philsa-bg p-5 rounded-2xl border border-philsa-border/40 mb-4 ring-1 ring-inset ring-white">
                <p className="text-[10px] text-philsa-gray font-bold leading-relaxed uppercase tracking-wider block mb-2 opacity-50">Simulation Directory</p>
                <div className="grid grid-cols-2 gap-2">
                   {[
                     'stud1resubmit@philsa.edu.ph',
                     'stud2waitingexam@philsa.edu.ph',
                     'stud3takeexam@philsa.edu.ph',
                     'stud3.1takeexamoffline@philsa.edu.ph',
                     'stud4examcomplete@philsa.edu.ph',
                     'stud5results@philsa.edu.ph',
                     'stud6cheated@philsa.edu.ph',
                     'admin@philsa.gov.ph',
                     'ched.admin@gov.ph',
                     'deped.admin@gov.ph',
                     'tesda.admin@gov.ph',
                     'executive@gov.ph',
                     'proctor@philsa.gov.ph',
                     'proctor.admin@philsa.gov.ph',
                     'reviewer@philsa.gov.ph',
                     'exam.admin@philsa.gov.ph',
                     'ateneo.admin@examhub.ph',
                     'dlsu.admin@examhub.ph',
                     'ust.admin@examhub.ph',
                     'up.admin@examhub.ph',
                     'tc.admin@examhub.ph',
                   ].map(u => (
                     <button 
                       key={u}
                       type="button"
                       onClick={() => setEmail(u)}
                       className="text-[10px] text-philsa-navy font-bold hover:text-philsa-red transition-colors text-left flex items-center gap-2 group p-1 hover:bg-philsa-red/5 rounded-md"
                     >
                       <div className="w-1 h-1 rounded-full bg-philsa-border group-hover:bg-philsa-red" />
                       {u.split('@')[0]}
                     </button>
                   ))}
                </div>
              </div>

              <button disabled={loading} className="btn-primary w-full flex items-center justify-center gap-3 group">
                {loading ? 'Validating Instance...' : 'Continue to Password'}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>
          ) : step === 2 ? (
            <form onSubmit={handlePasswordStep} className="space-y-8">
               <div>
                  <div className="flex justify-between items-center mb-3 ml-1">
                    <label className="label-philsa">Security Password</label>
                    <button type="button" className="text-[10px] text-philsa-red font-black uppercase tracking-widest hover:underline">Forgot Password?</button>
                  </div>
                  <div className="relative group">
                    <LogIn className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-philsa-gray/40 group-focus-within:text-philsa-red transition-colors" />
                    <input 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="input-philsa pl-14"
                      required
                    />
                  </div>
               </div>

                <div className="bg-[#e5f1ec]/30 p-4 rounded-lg border border-[#00563F]/15 flex items-start gap-4">
                   <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-xs border border-gray-200">
                      <Shield className="w-4 h-4 text-[#00563F]" />
                   </div>
                   <div>
                      <p className="text-[10px] font-black text-[#00563F] uppercase tracking-widest mb-1">Session Integrity</p>
                      <p className="text-[10px] text-[#00563F]/80 font-bold leading-tight uppercase">Your credentials are protected by hardware-level encryption (HSM).</p>
                   </div>
                </div>

               <button disabled={loading} className="btn-primary w-full flex items-center justify-center gap-3 group">
                {loading ? 'Authenticating...' : 'Validate Credentials'}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <button 
                type="button" 
                onClick={() => setStep(1)}
                className="w-full text-[11px] text-philsa-gray font-black uppercase tracking-widest hover:text-philsa-navy transition-colors text-center"
              >
                ← Change Account
              </button>
            </form>
          ) : step === 3 ? (
            <form onSubmit={handleMfaSelection} className="space-y-8">
              <div className="text-center mb-8">
                <label className="label-philsa block mb-2">Security Verification</label>
                <p className="text-sm text-philsa-gray font-medium">Choose where to send your security code</p>
              </div>

              <div className="space-y-4">
                <button 
                  type="button"
                  onClick={() => setMfaMethod('email')}
                  className={`w-full p-5 rounded-2xl border-2 transition-all flex items-center justify-between group ${
                    mfaMethod === 'email' ? 'border-philsa-red bg-philsa-red/5' : 'border-philsa-border/40 hover:border-philsa-red/30'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      mfaMethod === 'email' ? 'bg-philsa-red text-white' : 'bg-philsa-bg text-philsa-gray group-hover:text-philsa-red'
                    }`}>
                      <Mail className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-black text-philsa-navy uppercase tracking-widest mb-1">Send to Email</p>
                      <p className="text-[10px] text-philsa-gray font-bold uppercase">{email.replace(/(.{3})(.*)(?=@)/, '$1***')}</p>
                    </div>
                  </div>
                  {mfaMethod === 'email' && <Check className="w-5 h-5 text-philsa-red" />}
                </button>

                <button 
                  type="button"
                  onClick={() => setMfaMethod('phone')}
                  className={`w-full p-5 rounded-2xl border-2 transition-all flex items-center justify-between group ${
                    mfaMethod === 'phone' ? 'border-philsa-red bg-philsa-red/5' : 'border-philsa-border/40 hover:border-philsa-red/30'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      mfaMethod === 'phone' ? 'bg-philsa-red text-white' : 'bg-philsa-bg text-philsa-gray group-hover:text-philsa-red'
                    }`}>
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-black text-philsa-navy uppercase tracking-widest mb-1">Send to Mobile</p>
                      <p className="text-[10px] text-philsa-gray font-bold uppercase">+63 **** *** 42</p>
                    </div>
                  </div>
                  {mfaMethod === 'phone' && <Check className="w-5 h-5 text-philsa-red" />}
                </button>
              </div>

              <button disabled={loading} className="btn-primary w-full flex items-center justify-center gap-3 group mt-4">
                {loading ? 'Sending Code...' : `Send Code to ${mfaMethod === 'email' ? 'Email' : 'Mobile'}`}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <button 
                type="button" 
                onClick={() => setStep(2)}
                className="w-full text-[11px] text-philsa-gray font-black uppercase tracking-widest hover:text-philsa-navy transition-colors text-center"
              >
                ← Back to Password
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-10">
              <div>
                <label className="label-philsa block mb-2 text-center uppercase tracking-widest">Multi-Factor Security Code</label>
                <p className="text-[11px] text-philsa-gray font-bold text-center mb-8 uppercase">
                  Sent to {mfaMethod === 'email' ? email.replace(/(.{3})(.*)(?=@)/, '$1***') : '+63 **** *** 42'}
                </p>
                <div className="flex justify-between gap-3">
                  {otp.map((digit, i) => (
                    <input 
                      key={i}
                      id={`otp-${i}`}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => updateOtp(e.target.value, i)}
                      className="w-full h-16 bg-philsa-bg border-none rounded-2xl text-center text-2xl font-black focus:ring-4 focus:ring-philsa-red/10 transition-all shadow-sm ring-1 ring-philsa-border/30"
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between mt-8">
                   <p className="text-[11px] text-philsa-gray font-bold uppercase tracking-wider">
                     Code expires in 04:59
                   </p>
                   <button type="button" className="text-[11px] text-philsa-red font-black uppercase tracking-widest hover:underline">
                     Resend Security Code
                   </button>
                </div>
              </div>

              <button disabled={loading} className="btn-primary w-full flex items-center justify-center gap-3">
                {loading ? 'Authenticating...' : 'Establish Session'}
                <LogIn className="w-5 h-5 text-white/50" />
              </button>

              <button 
                type="button" 
                onClick={() => setStep(3)}
                className="w-full text-[11px] text-philsa-gray font-black uppercase tracking-widest hover:text-philsa-navy transition-colors text-center"
              >
                ← Change Method
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
