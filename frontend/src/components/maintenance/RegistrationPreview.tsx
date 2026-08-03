import React, { useState } from 'react';
import { X, AlertCircle, ShieldCheck, Eye, Sparkles, Check, ArrowRight, ArrowLeft, Camera, Shield, Laptop, Monitor, FileText } from 'lucide-react';
import type { MaintenanceRecord } from './MaintenancePageTemplate';

interface RegistrationPreviewProps {
  data: MaintenanceRecord[];
  onClose: () => void;
}

const INITIAL_FORM_STATE = {
  verificationMethod: 'LRN',
  lrn: '123456789012',
  dob: '2008-07-24',
  firstName: 'Juan',
  middleName: 'Agoncillo',
  lastName: 'Dela Cruz',
  extensionName: '',
  sex: 'Male',
  schoolId: '300123',
  schoolName: 'Rizal National High School',
  gradeLevel: 'Grade 12',
  enrollmentStatus: 'Currently Enrolled',
  schoolYear: '2026-2027',
  email: 'juan.delacruz@gmail.com',
  mobileNumber: '09171234567',
  password: '••••••••••••',
  confirmPassword: '••••••••••••',
  idFrontUploaded: true,
  idBackUploaded: true,
  selfieUploaded: true,
  faceMatchResult: '98.7% Confidence',
  livenessResult: 'Passed (99.1%)',
  verificationStatus: 'Pending (Auto-Verified)',
};

export default function RegistrationPreview({ data, onClose }: RegistrationPreviewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [simulationSuccess, setSimulationSuccess] = useState(false);

  // Form State for simulation
  const [formState, setFormState] = useState(INITIAL_FORM_STATE);

  const handleInputChange = (field: string, val: string) => {
    setFormState(prev => ({ ...prev, [field]: val }));
  };

  // Helper to check if a configuration item is active
  const isFieldActive = (fieldName: string) => {
    const item = data.find(i => typeof i.value === 'string' && i.value.toLowerCase() === fieldName.toLowerCase());
    if (!item) return true; // Default to active if config doesn't exist
    return item.status === 'Active' || item.status === true;
  };

  const isMethodActive = (methodName: string) => {
    const item = data.find(i => i.type === 'Verification Method' && typeof i.value === 'string' && i.value.toLowerCase().includes(methodName.toLowerCase()));
    if (!item) return true; // Default to active
    return item.status === 'Active' || item.status === true;
  };

  // Check which general fields should be shown
  const showLrn = isFieldActive('LRN');
  const showBirthDate = isFieldActive('Birth Date');
  const showFirstName = isFieldActive('First Name');
  const showMiddleName = isFieldActive('Middle Name');
  const showLastName = isFieldActive('Last Name');
  const showExtensionName = isFieldActive('Extension Name');
  const showSex = isFieldActive('Sex');

  const showSchoolId = isFieldActive('School ID');
  const showSchoolName = isFieldActive('School Name');
  const showGradeLevel = isFieldActive('Grade Level');
  const showEnrollmentStatus = isFieldActive('Enrollment Status');
  const showSchoolYear = isFieldActive('School Year');

  const showEmailAddress = isFieldActive('Email Address');
  const showMobileNumber = isFieldActive('Mobile Number');
  const showPassword = isFieldActive('Password');
  const showConfirmPassword = isFieldActive('Confirm Password');

  const showIdFront = isFieldActive('Student ID Front');
  const showIdBack = isFieldActive('Student ID Back');
  const showSelfie = isFieldActive('Selfie Photo');
  const showFaceMatch = isFieldActive('Face Match Result');
  const showLiveness = isFieldActive('Liveness Result');
  const showVerificationStatus = isFieldActive('Verification Status');

  const renderRegistrationForm = (isCompact: boolean) => {
    if (simulationSuccess) {
      return (
        <div className="text-center py-12 px-6 bg-white rounded-3xl border border-slate-100 space-y-6 animate-fadeIn">
          <div className="w-16 h-16 bg-emerald-100 text-[#00563F] rounded-full flex items-center justify-center mx-auto shadow-inner">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h4 className="text-xl font-black text-philsa-navy">Simulated Registration Successful!</h4>
            <p className="text-xs text-philsa-gray font-semibold mt-1">
              Your configurations are working beautifully. This sandbox demonstrates real-time compliance with the maintenance rules.
            </p>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 text-left max-w-lg mx-auto space-y-3">
            <p className="text-[10px] font-black uppercase text-philsa-navy tracking-wider pb-1 border-b border-slate-200">
              Administrative Compliance Receipt:
            </p>
            <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 text-[10px] text-philsa-gray font-bold">
              <div>Verification Method:</div>
              <div className="text-philsa-navy text-right font-black uppercase">{formState.verificationMethod}</div>
              {showFirstName && (
                <>
                  <div>Name:</div>
                  <div className="text-philsa-navy text-right">{formState.firstName} {formState.lastName}</div>
                </>
              )}
              {showSchoolName && (
                <>
                  <div>School:</div>
                  <div className="text-philsa-navy text-right">{formState.schoolName}</div>
                </>
              )}
              {showEmailAddress && (
                <>
                  <div>Account:</div>
                  <div className="text-philsa-navy text-right">{formState.email}</div>
                </>
              )}
              {showFaceMatch && (
                <>
                  <div>Biometric Audit:</div>
                  <div className="text-emerald-700 text-right font-black uppercase">{formState.faceMatchResult}</div>
                </>
              )}
            </div>
          </div>
          <button
            onClick={() => {
              setSimulationSuccess(false);
              setActiveStep(1);
            }}
            className="px-6 py-2.5 bg-philsa-navy hover:bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
          >
            Reset Simulator
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Multi-step indicator for 4 Steps */}
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { step: 1, label: '1. Identity' },
            { step: 2, label: '2. School' },
            { step: 3, label: '3. Account' },
            { step: 4, label: '4. Verification' }
          ].map((s) => (
            <button
              key={s.step}
              onClick={() => setActiveStep(s.step)}
              className={`text-[9px] font-black uppercase py-2 px-1 rounded-lg border transition-all ${
                activeStep === s.step
                  ? 'text-[#8A1538] bg-red-50 border-red-100'
                  : 'text-slate-500 bg-slate-50 border-slate-100 opacity-60'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {activeStep === 1 && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <h3 className="text-xs font-black text-philsa-navy uppercase tracking-wider">1. Identity Verification</h3>
              <p className="text-[10px] text-slate-400 font-semibold">Standard National Registry matching. Please select verification path.</p>
            </div>

            {/* Verification Methods Selectors */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'LRN', label: 'LRN matching', active: isMethodActive('LRN') },
                { key: 'PhilSys', label: 'PhilSys ID', active: isMethodActive('PhilSys') },
                { key: 'Manual Entry', label: 'Manual Entry', active: isMethodActive('Manual Entry') }
              ].map((method) => (
                <button
                  key={method.key}
                  type="button"
                  onClick={() => method.active && handleInputChange('verificationMethod', method.key)}
                  disabled={!method.active}
                  className={`py-2.5 px-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                    !method.active 
                      ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed opacity-50'
                      : formState.verificationMethod === method.key
                      ? 'bg-red-50 border-[#8A1538] text-[#8A1538] shadow-inner'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>{method.label}</span>
                  {!method.active && <span className="text-[8px] font-black text-red-500 lowercase">(disabled)</span>}
                </button>
              ))}
            </div>

            {/* Input Form Fields based on Admin Configs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {showLrn && (formState.verificationMethod === 'LRN' || formState.verificationMethod === 'Manual Entry') && (
                <div className="space-y-1">
                  <label className="label-philsa text-[10px] flex items-center gap-1">
                    Learner Reference Number (LRN) *
                    <span className="text-[9px] bg-red-100 text-red-800 px-1.5 rounded">High Priority</span>
                  </label>
                  <input
                    type="text"
                    value={formState.lrn}
                    onChange={(e) => handleInputChange('lrn', e.target.value)}
                    placeholder="Enter 12-digit LRN"
                    className="input-philsa text-xs py-2 bg-white"
                  />
                </div>
              )}

              {showBirthDate && (
                <div className="space-y-1">
                  <label className="label-philsa text-[10px] flex items-center gap-1">
                    Birth Date *
                    <span className="text-[9px] bg-red-100 text-red-800 px-1.5 rounded">Verify against DepEd</span>
                  </label>
                  <input
                    type="date"
                    value={formState.dob}
                    onChange={(e) => handleInputChange('dob', e.target.value)}
                    className="input-philsa text-xs py-2 bg-white cursor-pointer"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {showFirstName && (
                <div className="space-y-1">
                  <label className="label-philsa text-[10px] flex items-center gap-1">
                    First Name *
                    {formState.verificationMethod !== 'Manual Entry' && (
                      <span className="text-[8px] bg-slate-100 text-slate-600 px-1.5 rounded">Read-only DepEd</span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={formState.firstName}
                    disabled={formState.verificationMethod !== 'Manual Entry'}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    placeholder="Enter first name"
                    className="input-philsa text-xs py-2 disabled:bg-slate-50 disabled:text-slate-500"
                  />
                </div>
              )}

              {showMiddleName && (
                <div className="space-y-1">
                  <label className="label-philsa text-[10px] flex items-center gap-1">
                    Middle Name *
                    {formState.verificationMethod !== 'Manual Entry' && (
                      <span className="text-[8px] bg-slate-100 text-slate-600 px-1.5 rounded">Read-only DepEd</span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={formState.middleName}
                    disabled={formState.verificationMethod !== 'Manual Entry'}
                    onChange={(e) => handleInputChange('middleName', e.target.value)}
                    placeholder="Enter middle name"
                    className="input-philsa text-xs py-2 disabled:bg-slate-50 disabled:text-slate-500"
                  />
                </div>
              )}

              {showLastName && (
                <div className="space-y-1">
                  <label className="label-philsa text-[10px] flex items-center gap-1">
                    Last Name *
                    {formState.verificationMethod !== 'Manual Entry' && (
                      <span className="text-[8px] bg-slate-100 text-slate-600 px-1.5 rounded">Read-only DepEd</span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={formState.lastName}
                    disabled={formState.verificationMethod !== 'Manual Entry'}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    placeholder="Enter last name"
                    className="input-philsa text-xs py-2 disabled:bg-slate-50 disabled:text-slate-500"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {showExtensionName && (
                <div className="space-y-1">
                  <label className="label-philsa text-[10px]">Extension Name (Suffix)</label>
                  <select
                    value={formState.extensionName}
                    onChange={(e) => handleInputChange('extensionName', e.target.value)}
                    className="input-philsa text-xs py-2 bg-white cursor-pointer"
                  >
                    <option value="">N/A</option>
                    <option value="Jr.">Jr.</option>
                    <option value="Sr.">Sr.</option>
                    <option value="III">III</option>
                  </select>
                </div>
              )}

              {showSex && (
                <div className="space-y-1">
                  <label className="label-philsa text-[10px] flex items-center gap-1">
                    Sex *
                    <span className="text-[8px] bg-slate-100 text-slate-600 px-1.5 rounded">Read-only</span>
                  </label>
                  <select
                    value={formState.sex}
                    disabled={formState.verificationMethod !== 'Manual Entry'}
                    onChange={(e) => handleInputChange('sex', e.target.value)}
                    className="input-philsa text-xs py-2 disabled:bg-slate-50 disabled:text-slate-500 cursor-pointer"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              )}
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveStep(2)}
                className="bg-philsa-navy hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                Next Step: School <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {activeStep === 2 && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <h3 className="text-xs font-black text-philsa-navy uppercase tracking-wider">2. School Information</h3>
              <p className="text-[10px] text-slate-400 font-semibold">Verify current institutional registry and enrollment status.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {showSchoolId && (
                <div className="space-y-1">
                  <label className="label-philsa text-[10px] flex items-center gap-1">
                    School ID *
                    <span className="text-[9px] bg-red-100 text-red-800 px-1.5 rounded">High</span>
                  </label>
                  <input
                    type="text"
                    value={formState.schoolId}
                    onChange={(e) => handleInputChange('schoolId', e.target.value)}
                    placeholder="Enter DepEd School ID"
                    className="input-philsa text-xs py-2 bg-white"
                  />
                </div>
              )}

              {showSchoolName && (
                <div className="space-y-1">
                  <label className="label-philsa text-[10px] flex items-center gap-1">
                    School Name *
                    <span className="text-[9px] bg-red-100 text-red-800 px-1.5 rounded">High</span>
                  </label>
                  <input
                    type="text"
                    value={formState.schoolName}
                    onChange={(e) => handleInputChange('schoolName', e.target.value)}
                    placeholder="Enter complete secondary school name"
                    className="input-philsa text-xs py-2 bg-white"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {showGradeLevel && (
                <div className="space-y-1">
                  <label className="label-philsa text-[10px]">Grade Level *</label>
                  <select
                    value={formState.gradeLevel}
                    onChange={(e) => handleInputChange('gradeLevel', e.target.value)}
                    className="input-philsa text-xs py-2 bg-white cursor-pointer"
                  >
                    <option value="Grade 11">Grade 11</option>
                    <option value="Grade 12">Grade 12</option>
                    <option value="ALS Graduate">ALS Graduate</option>
                  </select>
                </div>
              )}

              {showEnrollmentStatus && (
                <div className="space-y-1">
                  <label className="label-philsa text-[10px]">Enrollment Status *</label>
                  <select
                    value={formState.enrollmentStatus}
                    onChange={(e) => handleInputChange('enrollmentStatus', e.target.value)}
                    className="input-philsa text-xs py-2 bg-white cursor-pointer"
                  >
                    <option value="Currently Enrolled">Currently Enrolled</option>
                    <option value="Graduated">Graduated</option>
                    <option value="Candidate for Graduation">Candidate for Graduation</option>
                  </select>
                </div>
              )}

              {showSchoolYear && (
                <div className="space-y-1">
                  <label className="label-philsa text-[10px]">School Year *</label>
                  <select
                    value={formState.schoolYear}
                    onChange={(e) => handleInputChange('schoolYear', e.target.value)}
                    className="input-philsa text-xs py-2 bg-white cursor-pointer"
                  >
                    <option value="2025-2026">2025-2026</option>
                    <option value="2026-2027">2026-2027</option>
                  </select>
                </div>
              )}
            </div>

            <div className="pt-4 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setActiveStep(1)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <button
                type="button"
                onClick={() => setActiveStep(3)}
                className="bg-philsa-navy hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                Next Step: Account <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {activeStep === 3 && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <h3 className="text-xs font-black text-philsa-navy uppercase tracking-wider">3. Account Setup</h3>
              <p className="text-[10px] text-slate-400 font-semibold">Establish secure portal credentials for examination permits and results.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {showEmailAddress && (
                <div className="space-y-1">
                  <label className="label-philsa text-[10px]">Email Address *</label>
                  <input
                    type="email"
                    value={formState.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="name@domain.com"
                    className="input-philsa text-xs py-2 bg-white"
                  />
                </div>
              )}

              {showMobileNumber && (
                <div className="space-y-1">
                  <label className="label-philsa text-[10px]">Mobile Number *</label>
                  <input
                    type="text"
                    value={formState.mobileNumber}
                    onChange={(e) => handleInputChange('mobileNumber', e.target.value)}
                    placeholder="0917XXXXXXX"
                    className="input-philsa text-xs py-2 bg-white"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {showPassword && (
                <div className="space-y-1">
                  <label className="label-philsa text-[10px]">Password *</label>
                  <input
                    type="password"
                    value={formState.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="input-philsa text-xs py-2 bg-white"
                  />
                </div>
              )}

              {showConfirmPassword && (
                <div className="space-y-1">
                  <label className="label-philsa text-[10px]">Confirm Password *</label>
                  <input
                    type="password"
                    value={formState.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    className="input-philsa text-xs py-2 bg-white"
                  />
                </div>
              )}
            </div>

            <div className="pt-4 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setActiveStep(2)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <button
                type="button"
                onClick={() => setActiveStep(4)}
                className="bg-philsa-navy hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                Next Step: Verification <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {activeStep === 4 && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <h3 className="text-xs font-black text-philsa-navy uppercase tracking-wider">4. Automated Verification & Audits</h3>
              <p className="text-[10px] text-slate-400 font-semibold">Execute high-priority biometric and liveness checks to issue permits.</p>
            </div>

            <div className="space-y-3">
              {/* File Uploders */}
              <div className="grid grid-cols-2 gap-4">
                {showIdFront && (
                  <div className="p-3 bg-white border border-dashed border-slate-200 rounded-2xl text-center space-y-1">
                    <span className="text-[8px] font-black uppercase tracking-wider text-philsa-gray block">Student ID Front</span>
                    <div className="w-8 h-8 rounded-full bg-red-50 text-[#8A1538] flex items-center justify-center mx-auto">
                      <Camera className="w-4 h-4" />
                    </div>
                    <span className="text-[8px] text-emerald-700 font-extrabold block">ID_Front_Captured.png</span>
                  </div>
                )}

                {showIdBack && (
                  <div className="p-3 bg-white border border-dashed border-slate-200 rounded-2xl text-center space-y-1">
                    <span className="text-[8px] font-black uppercase tracking-wider text-philsa-gray block">Student ID Back</span>
                    <div className="w-8 h-8 rounded-full bg-red-50 text-[#8A1538] flex items-center justify-center mx-auto">
                      <Camera className="w-4 h-4" />
                    </div>
                    <span className="text-[8px] text-emerald-700 font-extrabold block">ID_Back_Captured.png</span>
                  </div>
                )}
              </div>

              {showSelfie && (
                <div className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-red-50 text-[#8A1538] flex items-center justify-center">
                      <Camera className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-philsa-navy uppercase">Live Selfie Photo *</p>
                      <p className="text-[8px] text-slate-400 font-semibold">Biometric face enrollment</p>
                    </div>
                  </div>
                  <span className="text-[9px] bg-emerald-50 text-emerald-800 border border-emerald-100 px-2 py-0.5 rounded-full font-black uppercase">Captured</span>
                </div>
              )}

              {/* Automatic System Checks (High Priority) */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-2.5">
                <span className="text-[9px] font-black text-philsa-gray uppercase tracking-widest block">System Diagnostics (High Priority)</span>
                
                <div className="space-y-1.5">
                  {showFaceMatch && (
                    <div className="flex justify-between items-center text-[10px] font-bold">
                      <span className="text-slate-600">Face Match Result:</span>
                      <span className="text-emerald-700 font-black">{formState.faceMatchResult}</span>
                    </div>
                  )}

                  {showLiveness && (
                    <div className="flex justify-between items-center text-[10px] font-bold">
                      <span className="text-slate-600">Liveness Result:</span>
                      <span className="text-emerald-700 font-black">{formState.livenessResult}</span>
                    </div>
                  )}

                  {showVerificationStatus && (
                    <div className="flex justify-between items-center text-[10px] font-bold">
                      <span className="text-slate-600">Verification Status:</span>
                      <span className="text-amber-700 font-black">{formState.verificationStatus}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setActiveStep(3)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <button
                type="button"
                onClick={() => setSimulationSuccess(true)}
                className="bg-[#00563F] hover:bg-emerald-800 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" /> Submit Simulator Entry
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Compact Side Panel Card */}
      <div className="bg-white border border-philsa-border rounded-[2.5rem] p-6 shadow-xl shadow-philsa-navy/[0.02] space-y-6">
        {/* Panel Header */}
        <div className="flex items-center justify-between pb-4 border-b border-philsa-border">
          <div>
            <h2 className="text-base font-black text-philsa-navy tracking-tight uppercase">Registration Preview</h2>
            <p className="text-[11px] font-semibold text-philsa-gray">Changes in administrative tables reflect here immediately.</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsFullscreen(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#8A1538] hover:bg-[#6D102C] text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm"
            >
              <Eye className="w-3.5 h-3.5" />
              Full Screen
            </button>
            <button
              onClick={onClose}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-philsa-navy rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Simulated Form Wrapper */}
        <div className="border border-slate-100 bg-slate-50/50 rounded-3xl p-5 space-y-6 overflow-y-auto max-h-[60vh] custom-scrollbar">
          {/* PhilSLA Logo and Auth Link */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black text-philsa-navy tracking-tight flex items-center">
                Phil<span className="text-philsa-red">SLA</span>
              </span>
            </div>
            <span className="text-[9px] font-bold text-slate-400">
              Already have an account? <span className="text-philsa-red hover:underline cursor-pointer">Log in</span>
            </span>
          </div>

          {/* Render standard form */}
          {renderRegistrationForm(true)}
        </div>

        {/* Warning/Info Footer */}
        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200/40 flex items-start gap-3">
          <div className="p-1 bg-white rounded-lg border border-amber-300 text-amber-700 flex-shrink-0">
            <AlertCircle className="w-3.5 h-3.5" />
          </div>
          <div>
            <p className="text-[9px] font-black text-amber-900 mb-0.5 uppercase tracking-widest">Active Table Configuration</p>
            <p className="text-[10px] leading-relaxed text-amber-800 font-semibold">
              Disabling categories or setting fields to inactive immediately updates this workspace preview.
            </p>
          </div>
        </div>
      </div>

      {/* FULLSCREEN SIMULATION MODAL OVERLAY */}
      {isFullscreen && (
        <div className="fixed inset-0 z-[200] bg-slate-900/80 backdrop-blur-md flex flex-col justify-between overflow-hidden animate-fadeIn">
          {/* Simulation Header */}
          <div className="bg-[#8A1538] text-white px-8 py-3.5 flex items-center justify-between font-black text-xs uppercase tracking-widest shadow-lg border-b border-red-900">
            <div className="flex items-center gap-3">
              <span className="bg-white text-[#8A1538] px-2.5 py-1 rounded text-[10px] font-black tracking-normal">Simulation only</span>
              <span>PhilSLA Candidate Registration Portal &mdash; Live Administration Simulator</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setSimulationSuccess(false);
                  setActiveStep(1);
                  setFormState(INITIAL_FORM_STATE);
                }}
                className="bg-white/10 hover:bg-white/20 text-white px-3.5 py-1.5 rounded-xl transition-all cursor-pointer text-[10px] font-bold"
              >
                Reset Form
              </button>
              <button
                onClick={() => setIsFullscreen(false)}
                className="bg-white text-[#8A1538] hover:bg-red-50 px-4 py-1.5 rounded-xl transition-all cursor-pointer text-[10px] font-black flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> Close Simulator
              </button>
            </div>
          </div>

          {/* Simulation Content Body */}
          <div className="flex-1 overflow-y-auto p-8 md:p-12 flex justify-center items-start">
            <div className="w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col">
              
              {/* Fake Browser Toolbar */}
              <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex items-center gap-3 text-slate-400 select-none">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <div className="flex-1 bg-white border border-slate-200/80 rounded-lg px-3 py-1 text-[11px] font-medium flex items-center gap-2 text-slate-500">
                  <Laptop className="w-3.5 h-3.5 text-slate-400" />
                  <span>https://portal.philsa.gov.ph/register?ref=admin_sandbox</span>
                </div>
              </div>

              {/* Portal Content Area */}
              <div className="p-8 md:p-12 space-y-8">
                {/* Header Brand */}
                <div className="flex items-center justify-between pb-6 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-[#8A1538] rounded-xl flex items-center justify-center text-white font-black text-xl">
                      Φ
                    </div>
                    <div>
                      <h1 className="text-xl font-black text-philsa-navy tracking-tight">
                        Phil<span className="text-philsa-red">SLA</span> Portal
                      </h1>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Philippine Space Law Assessment</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-philsa-navy">GOVERNMENT SECURE PORTAL</p>
                    <p className="text-[9px] text-emerald-600 font-bold flex items-center justify-end gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Sandbox Connection Secured
                    </p>
                  </div>
                </div>

                {/* Simulated Content */}
                {renderRegistrationForm(false)}
              </div>

              {/* Simulation Information Footer banner */}
              <div className="bg-amber-50 px-8 py-4 border-t border-amber-200/50 flex items-center justify-between text-amber-800">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-700" />
                  <p className="text-[11px] font-bold leading-relaxed">
                    This sandbox environment reflects real-time lookups configured in the <span className="font-black text-[#8A1538]">Student Registration Maintenance</span> table.
                  </p>
                </div>
                <span className="text-[10px] bg-amber-100 px-3 py-1 rounded-lg border border-amber-200 text-amber-900 font-black uppercase tracking-wider">
                  Simulation Only
                </span>
              </div>

            </div>
          </div>

          {/* Mini-footer bar */}
          <div className="bg-slate-950 text-slate-500 text-[10px] font-bold px-8 py-2.5 text-center flex justify-between items-center select-none">
            <span>Philippine Space Agency &copy; {new Date().getFullYear()}</span>
            <span className="flex items-center gap-1 text-[#8A1538]">
              <span className="w-2 h-2 rounded-full bg-[#8A1538] inline-block animate-ping"></span>
              Administrative Engine Live Update Active
            </span>
          </div>
        </div>
      )}
    </>
  );
}
