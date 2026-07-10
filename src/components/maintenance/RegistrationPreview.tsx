import React, { useState } from 'react';
import { X, AlertCircle, ShieldCheck, Eye, Sparkles, Check, ArrowRight, ArrowLeft, Camera, Shield, Laptop, Monitor, FileText } from 'lucide-react';

interface RegistrationPreviewProps {
  data: any[];
  onClose: () => void;
}

export default function RegistrationPreview({ data, onClose }: RegistrationPreviewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [simulationSuccess, setSimulationSuccess] = useState(false);

  // Form State for simulation
  const [formState, setFormState] = useState({
    candidateType: '',
    idType: '',
    idNumber: '',
    firstName: '',
    middleName: '',
    lastName: '',
    suffix: '',
    dob: '',
    sex: '',
    civilStatus: '',
    citizenship: '',
    phone: '',
    email: '',
    shsTrack: '',
    program: '',
    schoolName: '',
    schoolAddress: '',
    gradeLevel: ''
  });

  const handleInputChange = (field: string, val: string) => {
    setFormState(prev => ({ ...prev, [field]: val }));
  };

  // Helper to check if a configuration item is active
  const isActive = (item: any) => {
    return item.status === 'Active' || item.status === 'ACTIVE' || item.status === true;
  };

  // Extract active options dynamically from maintenance data
  const candidateTypes = data
    .filter(item => item.type === 'Candidate Type' && isActive(item))
    .map(item => item.value);

  const idTypes = data
    .filter(item => item.type === 'ID Type' && isActive(item))
    .map(item => item.value);

  const shsTracks = data
    .filter(item => item.type === 'SHS Track' && isActive(item))
    .map(item => item.value);

  const gradeLevels = data
    .filter(item => item.type === 'Grade Level' && isActive(item))
    .map(item => item.value);

  const suffixes = data
    .filter(item => item.type === 'Suffix' && isActive(item))
    .map(item => item.value);

  const nationalities = data
    .filter(item => item.type === 'Nationality' && isActive(item))
    .map(item => item.value);

  // Dynamic field toggles parsed from "Field Toggle" rows
  const isFieldActive = (fieldLabel: string) => {
    const item = data.find(i => i.value === fieldLabel || i.value?.includes(fieldLabel));
    if (!item) return true; // Default to active if config doesn't exist
    return isActive(item);
  };

  // Fallback defaults if list is empty
  const activeCandidateTypes = candidateTypes.length > 0 ? candidateTypes : ['Regular Senior High', 'ALS Graduate'];
  const activeIdTypes = idTypes.length > 0 ? idTypes : ['Philippine Identification Card', 'Student ID', 'Passport'];
  const activeShsTracks = shsTracks.length > 0 ? shsTracks : ['STEM', 'ABM', 'HUMSS', 'GAS', 'TVL'];
  const activeGradeLevels = gradeLevels.length > 0 ? gradeLevels : ['Grade 11', 'Grade 12'];
  const activeSuffixes = suffixes.length > 0 ? suffixes : ['Jr.', 'Sr.', 'III', 'IV'];
  const activeNationalities = nationalities.length > 0 ? nationalities : ['Filipino', 'Dual Citizen', 'Foreign National'];

  // Check which general fields should disappear
  const showFirstName = isFieldActive('First Name');
  const showLastName = isFieldActive('Last Name');
  const showPhilSys = isFieldActive('PhilSys');
  const showSchoolName = isFieldActive('School Name');
  const showSchoolAddress = isFieldActive('School Address');
  const showGradeLevel = isFieldActive('Grade Level');

  const renderRegistrationForm = (isCompact: boolean) => {
    if (simulationSuccess) {
      return (
        <div className="text-center py-12 px-6 bg-white rounded-3xl border border-slate-100 space-y-6 animate-fadeIn">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h4 className="text-xl font-black text-philsa-navy">Simulated Registration Successful!</h4>
            <p className="text-xs text-philsa-gray font-semibold mt-1">
              This demonstrates how the student portal responds to your active administrative configuration.
            </p>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left max-w-md mx-auto space-y-2">
            <p className="text-[10px] font-black uppercase text-philsa-navy tracking-wider pb-1 border-b border-slate-200">
              Active Parameters Captured:
            </p>
            <div className="grid grid-cols-2 gap-2 text-[10px] text-philsa-gray font-bold">
              <div>Candidate Type:</div>
              <div className="text-philsa-navy text-right">{formState.candidateType || activeCandidateTypes[0]}</div>
              <div>ID Type:</div>
              <div className="text-philsa-navy text-right">{formState.idType || activeIdTypes[0]}</div>
              {showSchoolName && (
                <>
                  <div>School:</div>
                  <div className="text-philsa-navy text-right overflow-hidden text-ellipsis whitespace-nowrap">{formState.schoolName || 'U.P. Diliman'}</div>
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
            Reset Simulation
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Multi-step indicator */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <button
            onClick={() => setActiveStep(1)}
            className={`text-[9px] font-black uppercase py-2 px-3 rounded-lg border transition-all ${
              activeStep === 1
                ? 'text-philsa-red bg-red-50 border-red-100'
                : 'text-slate-500 bg-slate-50 border-slate-100 opacity-60'
            }`}
          >
            1. Personal Information
          </button>
          <button
            onClick={() => setActiveStep(2)}
            className={`text-[9px] font-black uppercase py-2 px-3 rounded-lg border transition-all ${
              activeStep === 2
                ? 'text-philsa-red bg-red-50 border-red-100'
                : 'text-slate-500 bg-slate-50 border-slate-100 opacity-60'
            }`}
          >
            2. Academic Track
          </button>
          <button
            onClick={() => setActiveStep(3)}
            className={`text-[9px] font-black uppercase py-2 px-3 rounded-lg border transition-all ${
              activeStep === 3
                ? 'text-philsa-red bg-red-50 border-red-100'
                : 'text-slate-500 bg-slate-50 border-slate-100 opacity-60'
            }`}
          >
            3. Review & Finish
          </button>
        </div>

        {activeStep === 1 && (
          <div className="space-y-4 animate-fadeIn">
            {/* Heading */}
            <div>
              <h3 className="text-xs font-black text-philsa-navy uppercase tracking-wider">1. Personal Identity Verification</h3>
              <p className="text-[10px] text-slate-400 font-semibold">Verify identity through PhilSys or civil identifiers.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Candidate Type */}
              <div className="space-y-1">
                <label className="label-philsa text-[10px]">Candidate Type *</label>
                <select
                  value={formState.candidateType}
                  onChange={(e) => handleInputChange('candidateType', e.target.value)}
                  className="input-philsa text-xs py-2 bg-white cursor-pointer"
                >
                  <option value="">Select candidate type</option>
                  {activeCandidateTypes.map((type, idx) => (
                    <option key={idx} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* ID Type */}
              <div className="space-y-1">
                <label className="label-philsa text-[10px]">Valid ID Type *</label>
                <select
                  value={formState.idType}
                  onChange={(e) => handleInputChange('idType', e.target.value)}
                  className="input-philsa text-xs py-2 bg-white cursor-pointer"
                >
                  <option value="">Select ID type</option>
                  {activeIdTypes.map((type, idx) => (
                    <option key={idx} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* First Name */}
              {showFirstName && (
                <div className="space-y-1">
                  <label className="label-philsa text-[10px]">First Name *</label>
                  <input
                    type="text"
                    value={formState.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    placeholder="Enter first name"
                    className="input-philsa text-xs py-2 bg-white"
                  />
                </div>
              )}

              {/* Last Name */}
              {showLastName && (
                <div className="space-y-1">
                  <label className="label-philsa text-[10px]">Last Name *</label>
                  <input
                    type="text"
                    value={formState.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    placeholder="Enter last name"
                    className="input-philsa text-xs py-2 bg-white"
                  />
                </div>
              )}

              {/* Suffix */}
              <div className="space-y-1">
                <label className="label-philsa text-[10px]">Suffix</label>
                <select
                  value={formState.suffix}
                  onChange={(e) => handleInputChange('suffix', e.target.value)}
                  className="input-philsa text-xs py-2 bg-white cursor-pointer"
                >
                  <option value="">None</option>
                  {activeSuffixes.map((suffix, idx) => (
                    <option key={idx} value={suffix}>{suffix}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* PhilSys ID Number */}
            {showPhilSys && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                <div className="flex items-center gap-2 text-slate-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span className="text-[10px] font-black uppercase tracking-wider">PhilSys Secure Registry Verification</span>
                </div>
                <div className="space-y-1">
                  <label className="label-philsa text-[10px]">Philippine National ID Number *</label>
                  <input
                    type="text"
                    value={formState.idNumber}
                    onChange={(e) => handleInputChange('idNumber', e.target.value)}
                    placeholder="e.g. 1234-5678-9012"
                    className="input-philsa text-xs py-2 bg-white"
                  />
                  <p className="text-[9px] text-slate-400 font-bold">Secure verification happens in real time via Philsys Registry API.</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="label-philsa text-[10px]">Citizenship *</label>
                <select
                  value={formState.citizenship}
                  onChange={(e) => handleInputChange('citizenship', e.target.value)}
                  className="input-philsa text-xs py-2 bg-white cursor-pointer"
                >
                  <option value="">Select citizenship</option>
                  {activeNationalities.map((nat, idx) => (
                    <option key={idx} value={nat}>{nat}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="label-philsa text-[10px]">Mobile Contact *</label>
                <input
                  type="text"
                  value={formState.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="09XXXXXXXXX"
                  className="input-philsa text-xs py-2 bg-white"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveStep(2)}
                className="bg-philsa-navy hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                Next Step: Academics <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {activeStep === 2 && (
          <div className="space-y-4 animate-fadeIn">
            {/* Heading */}
            <div>
              <h3 className="text-xs font-black text-philsa-navy uppercase tracking-wider">2. Academic Track & Preferred Major</h3>
              <p className="text-[10px] text-slate-400 font-semibold">Verify current school credentials and program choice.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* SHS Track */}
              <div className="space-y-1">
                <label className="label-philsa text-[10px]">SHS Track / Strand *</label>
                <select
                  value={formState.shsTrack}
                  onChange={(e) => handleInputChange('shsTrack', e.target.value)}
                  className="input-philsa text-xs py-2 bg-white cursor-pointer"
                >
                  <option value="">Select track</option>
                  {activeShsTracks.map((track, idx) => (
                    <option key={idx} value={track}>{track}</option>
                  ))}
                </select>
              </div>

              {/* Grade Level */}
              {showGradeLevel && (
                <div className="space-y-1">
                  <label className="label-philsa text-[10px]">Current Grade Level *</label>
                  <select
                    value={formState.gradeLevel}
                    onChange={(e) => handleInputChange('gradeLevel', e.target.value)}
                    className="input-philsa text-xs py-2 bg-white cursor-pointer"
                  >
                    <option value="">Select grade</option>
                    {activeGradeLevels.map((g, idx) => (
                      <option key={idx} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4">
              {/* School Name */}
              {showSchoolName && (
                <div className="space-y-1">
                  <label className="label-philsa text-[10px]">School Name *</label>
                  <input
                    type="text"
                    value={formState.schoolName}
                    onChange={(e) => handleInputChange('schoolName', e.target.value)}
                    placeholder="Enter current senior high school name"
                    className="input-philsa text-xs py-2 bg-white"
                  />
                </div>
              )}

              {/* School Address */}
              {showSchoolAddress && (
                <div className="space-y-1">
                  <label className="label-philsa text-[10px]">School Address *</label>
                  <input
                    type="text"
                    value={formState.schoolAddress}
                    onChange={(e) => handleInputChange('schoolAddress', e.target.value)}
                    placeholder="Enter complete school address"
                    className="input-philsa text-xs py-2 bg-white"
                  />
                </div>
              )}

              {/* Preferred program */}
              <div className="space-y-1">
                <label className="label-philsa text-[10px]">Preferred Space Science Program *</label>
                <select
                  value={formState.program}
                  onChange={(e) => handleInputChange('program', e.target.value)}
                  className="input-philsa text-xs py-2 bg-white cursor-pointer"
                >
                  <option value="">Select preferred major</option>
                  <option value="BS Aerospace Engineering">BS Aerospace Engineering</option>
                  <option value="BS Space Science">BS Space Science & Technology</option>
                  <option value="BS Geodetic Engineering">BS Geodetic Engineering</option>
                </select>
              </div>
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
                Review & Confirm <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {activeStep === 3 && (
          <div className="space-y-4 animate-fadeIn">
            {/* Heading */}
            <div>
              <h3 className="text-xs font-black text-philsa-navy uppercase tracking-wider">3. Review Administrative Settings</h3>
              <p className="text-[10px] text-slate-400 font-semibold">Please review the captured configuration values before completing the simulation.</p>
            </div>

            <div className="border border-slate-100 rounded-2xl bg-slate-50/60 p-4 space-y-3.5">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60">
                <Sparkles className="w-4 h-4 text-philsa-red" />
                <span className="text-[10px] font-black uppercase text-philsa-navy">Dynamic Setup Summary</span>
              </div>

              <div className="space-y-2 text-[11px] font-semibold text-slate-600">
                <div className="flex justify-between">
                  <span>Primary Role:</span>
                  <span className="font-bold text-philsa-navy">{formState.candidateType || activeCandidateTypes[0]}</span>
                </div>
                <div className="flex justify-between">
                  <span>ID Verification System:</span>
                  <span className="font-bold text-philsa-navy">{formState.idType || activeIdTypes[0]}</span>
                </div>
                {showFirstName && (
                  <div className="flex justify-between">
                    <span>Candidate Name:</span>
                    <span className="font-bold text-philsa-navy">
                      {formState.firstName || 'Candidate'} {formState.lastName || 'User'} {formState.suffix}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Citizenship:</span>
                  <span className="font-bold text-philsa-navy">{formState.citizenship || activeNationalities[0]}</span>
                </div>
                <div className="flex justify-between">
                  <span>Senior High Track:</span>
                  <span className="font-bold text-philsa-navy">{formState.shsTrack || activeShsTracks[0]}</span>
                </div>
                {showSchoolName && (
                  <div className="flex justify-between">
                    <span>School Institution:</span>
                    <span className="font-bold text-philsa-navy">{formState.schoolName || 'U.P. Diliman'}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Desired Degree Program:</span>
                  <span className="font-bold text-philsa-navy">{formState.program || 'BS Space Science & Technology'}</span>
                </div>
              </div>
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
                onClick={() => setSimulationSuccess(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" /> Submit Simulated Entry
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
                  setFormState({
                    candidateType: '',
                    idType: '',
                    idNumber: '',
                    firstName: '',
                    middleName: '',
                    lastName: '',
                    suffix: '',
                    dob: '',
                    sex: '',
                    civilStatus: '',
                    citizenship: '',
                    phone: '',
                    email: '',
                    shsTrack: '',
                    program: '',
                    schoolName: '',
                    schoolAddress: '',
                    gradeLevel: ''
                  });
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
