import React, { useState } from 'react';
import { 
  Monitor, 
  Cpu, 
  ShieldCheck, 
  Key, 
  Download, 
  CheckCircle, 
  Sparkles, 
  Plus, 
  Search, 
  Trash2, 
  Smartphone,
  CheckCircle2, 
  Clock, 
  AlertCircle,
  HardDrive,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useMockData } from '../../services/mockService';
import { usePhilSA } from '../../PhilSAContext';
import { StudentDevice } from '../../types';

export default function StudentDeviceRegistration() {
  const { user } = usePhilSA();
  const { studentDevices, registerStudentDevice } = useMockData();
  const [activeTab, setActiveTab] = useState<'list' | 'register'>('list');
  const [searchTerm, setSearchTerm] = useState('');

  // Wizard state
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [installProgress, setInstallProgress] = useState(0);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installStepText, setInstallStepText] = useState('');

  // Prototyped local registration & PhilSA App download states
  const [downloadModal, setDownloadModal] = useState(false);
  const [isDownloadingApp, setIsDownloadingApp] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStep, setDownloadStep] = useState('');
  const [localRegSuccessToast, setLocalRegSuccessToast] = useState(false);

  const handleQuickRegister = () => {
    const randomId = Math.floor(Math.random() * 900) + 100;
    const cleanCenterCode = proctorCenter.substring(0, 3).toUpperCase();
    const mockPcName = `${cleanCenterCode}-LOCAL-PC${randomId}`;
    
    const macParts = [];
    for (let i = 0; i < 6; i++) {
      macParts.push(Math.floor(Math.random() * 256).toString(16).toUpperCase().padStart(2, '0'));
    }
    const mockMac = macParts.join(':');
    const mockIp = `192.168.10.${100 + (randomId % 100)}`;

    registerStudentDevice({
      pcName: mockPcName,
      macAddress: mockMac,
      ipAddress: mockIp,
      specs: 'AMD Ryzen 5, 16GB RAM, Windows 11 Enterprise (Local Dev)',
      registeredBy: proctorName,
      center: proctorCenter,
      status: 'READY',
      loginAccount: `sandbox_user_${randomId}`
    });

    setLocalRegSuccessToast(true);
    setTimeout(() => {
      setLocalRegSuccessToast(false);
    }, 4000);
  };

  const triggerAppDownloadSim = () => {
    setDownloadModal(true);
    setIsDownloadingApp(true);
    setDownloadProgress(0);
    setDownloadStep('Connecting to safe Government Cloud CDN mirror...');

    const interval = setInterval(() => {
      setDownloadProgress(prev => {
        const next = prev + 5;
        if (next === 20) {
          setDownloadStep('Downloading PhilSA_SafeExam_Client_v2.0.msi (14.2 MB)...');
        } else if (next === 50) {
          setDownloadStep('Performing secure digital signature & SHA-256 integrity validation...');
        } else if (next === 75) {
          setDownloadStep('Extracting sandbox loopback services & SSL certificates locally...');
        } else if (next >= 100) {
          clearInterval(interval);
          setDownloadStep('PhilSA Client Desktop App successfully deployed! Workstation secured on port 3000.');
          setIsDownloadingApp(false);
          return 100;
        }
        return next;
      });
    }, 120);
  };

  // Form parameters
  const [pcName, setPcName] = useState('');
  const [macAddress, setMacAddress] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [specs, setSpecs] = useState('Intel Core i5-12400, 16GB DDR4, Windows 11 Enterprise');
  const [loginAccount, setLoginAccount] = useState('');
  const [loginPassword, setLoginPassword] = useState('philsa_secure_sandbox');

  const proctorCenter = user?.center || 'UP Diliman';
  const proctorName = user ? `${user.firstName} ${user.lastName}` : 'Santiago Reyes';

  // Filters
  const filteredDevices = studentDevices.filter(d => {
    // Only show devices belonging to this proctor's center
    const centerMatch = d.center?.toLowerCase() === proctorCenter.toLowerCase();
    
    // Search filter
    const searchMatch = d.pcName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        d.macAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        d.ipAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (d.seatNumber && d.seatNumber.toLowerCase().includes(searchTerm.toLowerCase()));
                        
    return centerMatch && searchMatch;
  });

  const handleAutoDetect = () => {
    setIsDetecting(true);
    setTimeout(() => {
      const randomId = Math.floor(Math.random() * 90) + 10;
      const cleanCenterCode = proctorCenter.substring(0, 3).toUpperCase();
      setPcName(`${cleanCenterCode}-LAB-PC${randomId}`);
      
      const macParts = [];
      for (let i = 0; i < 6; i++) {
        macParts.push(Math.floor(Math.random() * 256).toString(16).toUpperCase().padStart(2, '0'));
      }
      setMacAddress(macParts.join(':'));
      setIpAddress(`192.168.10.${100 + randomId}`);
      setIsDetecting(false);
    }, 1500);
  };

  const handlePCAccountLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginAccount) return;
    setIsLoggingIn(true);
    setTimeout(() => {
      setIsLoggingIn(false);
      setStep(3);
    }, 1200);
  };

  const handleStartInstallation = () => {
    setIsInstalling(true);
    setInstallProgress(0);
    setInstallStepText('Initializing secure boot policies...');
    
    const interval = setInterval(() => {
      setInstallProgress(prev => {
        const next = prev + 5;
        if (next === 25) {
          setInstallStepText('Starting PhilSA security sandbox listener daemon...');
        } else if (next === 50) {
          setInstallStepText('Blocking unauthorized background processes (chrome.exe, discord.exe)...');
        } else if (next === 75) {
          setInstallStepText('Downloading and storing cached examination modules locally...');
        } else if (next >= 100) {
          clearInterval(interval);
          setInstallStepText('SEB Sandbox Installed and Certified Successfully.');
          setIsInstalling(false);
          return 100;
        }
        return next;
      });
    }, 150);
  };

  const handleFinishAndSave = () => {
    // Save to global state
    registerStudentDevice({
      pcName,
      macAddress,
      ipAddress,
      specs,
      registeredBy: proctorName,
      center: proctorCenter,
      status: 'READY',
      loginAccount
    });

    // Reset states and exit
    setPcName('');
    setMacAddress('');
    setIpAddress('');
    setLoginAccount('');
    setStep(1);
    setActiveTab('list');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold text-philsa-navy tracking-tight leading-none mb-3">
            Student Device Registration
          </h1>
          <p className="text-philsa-gray font-medium">
            Deploy secure PhilSA Safe Exam Browser accounts, scan hardware metrics, and link local testing PCs to center nodes at <span className="text-philsa-blue">{proctorCenter}</span>.
          </p>
        </div>
        
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-philsa-border shadow-sm">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-philsa-navy">{proctorName}</span>
          <span className="text-xs text-philsa-gray">| Proctor Mode</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-philsa-border">
        <button
          onClick={() => setActiveTab('list')}
          className={`px-5 py-3 border-b-2 font-bold text-sm transition-all flex items-center gap-2 ${
            activeTab === 'list' 
              ? 'border-philsa-red text-philsa-red' 
              : 'border-transparent text-philsa-gray hover:text-philsa-navy'
          }`}
        >
          <Monitor className="w-4 h-4" />
          Active Registered PCs ({filteredDevices.length})
        </button>
        <button
          onClick={() => {
            setActiveTab('register');
            setStep(1);
          }}
          className={`px-5 py-3 border-b-2 font-bold text-sm transition-all flex items-center gap-2 ${
            activeTab === 'register' 
              ? 'border-philsa-red text-philsa-red' 
              : 'border-transparent text-philsa-gray hover:text-philsa-navy'
          }`}
        >
          <Plus className="w-4 h-4" />
          Register New Node
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'list' ? (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Native Calibration & App Installer panel */}
            <div className="bg-gradient-to-br from-slate-900 to-[#8A1538] text-white p-6 rounded-2xl border border-philsa-border shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 bg-white/10 w-fit px-3 py-1 rounded-full border border-white/20">
                  <Monitor className="w-3.5 h-3.5 text-rose-300" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-200">Local Station Setup</span>
                </div>
                <h3 className="text-xl font-bold tracking-tight">Configure Active Local Workstation</h3>
                <p className="text-rose-100/70 text-xs font-medium max-w-xl">
                  Quickly register this physical workstation with the {proctorCenter} node list, and download the PhilSA Safe Exam App for client-side locking.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto self-stretch md:self-auto shrink-0">
                <button
                  type="button"
                  onClick={handleQuickRegister}
                  className="bg-white hover:bg-slate-50 text-slate-900 font-bold px-4 py-3 rounded-lg text-xs uppercase tracking-wider transition-all h-fit flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-slate-800" />
                  Quick Register PC
                </button>
                <button
                  type="button"
                  onClick={triggerAppDownloadSim}
                  className="bg-rose-900 hover:bg-rose-950 text-white border border-white/20 font-bold px-4 py-3 rounded-lg text-xs uppercase tracking-wider transition-all h-fit flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Download PhilSA Software App
                </button>
              </div>
            </div>

            {/* Search and context banner */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-philsa-gray/70 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Filter active PCs by name, MAC, seat..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-philsa-border rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-philsa-blue text-slate-800 font-medium"
                />
              </div>
            </div>

            {/* List Table */}
            <div className="bg-white rounded-xl border border-philsa-border shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-philsa-border text-[10px] font-bold text-philsa-gray uppercase tracking-wider">
                      <th className="px-6 py-4">Node ID</th>
                      <th className="px-6 py-4">PC Identifier</th>
                      <th className="px-6 py-4">Hardware Specs</th>
                      <th className="px-6 py-4">Network Info</th>
                      <th className="px-6 py-4">System User</th>
                      <th className="px-6 py-4">Seat Allocation</th>
                      <th className="px-6 py-4">Integrity State</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredDevices.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-philsa-gray">
                          <Monitor className="w-12 h-12 mx-auto mb-3 text-slate-300 stroke-1" />
                          <p className="font-semibold text-slate-700">No active student PCs discovered</p>
                          <p className="text-xs text-slate-400 mt-1">Start by registering and provisioning a secure computer node using the register wizard.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredDevices.map((dev) => (
                        <tr key={dev.id} className="hover:bg-slate-50/55 transition-colors">
                          <td className="px-6 py-4 font-mono font-bold text-philsa-navy">{dev.id}</td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-800">{dev.pcName}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">{dev.macAddress}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded font-medium">
                              {dev.specs}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-mono text-slate-600 text-xs">
                            {dev.ipAddress}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-xs text-slate-800 font-semibold">{dev.loginAccount || 'N/A'}</div>
                            <div className="text-[10px] text-slate-400">Authenticated Proxy</div>
                          </td>
                          <td className="px-6 py-4">
                            {dev.seatNumber ? (
                              <span className="bg-emerald-50 text-emerald-700 font-bold px-2.5 py-1 rounded text-xs border border-emerald-200">
                                {dev.seatNumber}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-xs">Under Review (TCA)</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs bg-emerald-50 border border-emerald-150 px-2 py-1 rounded-full w-fit">
                              <ShieldCheck className="w-3.5 h-3.5 fill-emerald-100" />
                              SEB INSTALLED
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="register-wizard"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="max-w-2xl mx-auto"
          >
            {/* Step Indicators */}
            <div className="flex items-center justify-between mb-8 px-4">
              {[
                { s: 1, label: 'PC Discovery', icon: Cpu },
                { s: 2, label: 'Windows Guest Login', icon: Key },
                { s: 3, label: 'Secure Sandbox Install', icon: ShieldCheck },
              ].map((stepObj) => {
                const IconComp = stepObj.icon;
                const isActive = step >= stepObj.s;
                const isCurrent = step === stepObj.s;
                return (
                  <div key={stepObj.s} className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isCurrent 
                        ? 'bg-philsa-red text-white ring-4 ring-philsa-red/20' 
                        : isActive 
                          ? 'bg-slate-800 text-white' 
                          : 'bg-slate-200 text-slate-500'
                    }`}>
                      <IconComp className="w-3.5 h-3.5" />
                    </div>
                    <span className={`text-xs font-bold whitespace-nowrap hidden sm:inline ${
                      isCurrent ? 'text-philsa-navy' : isActive ? 'text-slate-700' : 'text-slate-400'
                    }`}>
                      {stepObj.label}
                    </span>
                    {stepObj.s < 3 && <div className="w-6 sm:w-12 h-[2px] bg-slate-200 mx-1" />}
                  </div>
                );
              })}
            </div>

            {/* Step 内容 */}
            <div className="bg-white border border-philsa-border rounded-xl shadow-md p-8">
              
              {/* STEP 1: PC Discovery */}
              {step === 1 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      <Cpu className="w-5 h-5 text-philsa-red" />
                      Discovered Machine Hardware Interface
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Querying local device characteristics. Click "Detect" to poll actual physical components.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">PC Host Name</label>
                      <input
                        type="text"
                        value={pcName}
                        onChange={(e) => setPcName(e.target.value)}
                        placeholder="e.g. UPD-MELCHOR-LAB-PC44"
                        className="w-full px-3 py-2 border border-philsa-border rounded-md text-sm focus:ring-1 focus:ring-philsa-blue text-slate-800 font-semibold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Discovered MAC Address</label>
                      <input
                        type="text"
                        value={macAddress}
                        onChange={(e) => setMacAddress(e.target.value)}
                        placeholder="e.g. 00:1A:2B:3C:4D:5E"
                        className="w-full px-3 py-2 border border-philsa-border rounded-md text-sm font-mono focus:ring-1 focus:ring-philsa-blue text-slate-800"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Allocated IP Address</label>
                      <input
                        type="text"
                        value={ipAddress}
                        onChange={(e) => setIpAddress(e.target.value)}
                        placeholder="e.g. 192.168.10.144"
                        className="w-full px-3 py-2 border border-philsa-border rounded-md text-sm font-mono focus:ring-1 focus:ring-philsa-blue text-slate-800"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Physical Hardware Profile</label>
                      <input
                        type="text"
                        value={specs}
                        onChange={(e) => setSpecs(e.target.value)}
                        className="w-full px-3 py-2 border border-philsa-border rounded-md text-sm focus:ring-1 focus:ring-philsa-blue text-slate-600 font-medium"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handleAutoDetect}
                      disabled={isDetecting}
                      className="px-4 py-2 border border-philsa-red hover:bg-philsa-red/5 rounded-md text-sm font-bold text-philsa-red transition-all flex items-center gap-2"
                    >
                      {isDetecting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-philsa-red border-t-transparent rounded-full animate-spin" />
                          Probing hardware...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Auto-Recognize Local Machine
                        </>
                      )}
                    </button>
                    
                    <button
                      type="button"
                      disabled={!pcName || !macAddress || !ipAddress}
                      onClick={() => setStep(2)}
                      className="px-6 py-2 bg-philsa-navy hover:bg-philsa-navy/95 text-white rounded-md text-sm font-bold transition-all disabled:opacity-50"
                    >
                      Proceed to Account Logins
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: Account Login Simulation */}
              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      <Key className="w-5 h-5 text-philsa-red" />
                      Virtual Sandbox Guest Account Logon
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      PhilSA requires logged safe accounts to ensure students cannot access their secondary web browser instances or cloud folders. Log in to the target machine's Exam Sandbox Account.
                    </p>
                  </div>

                  <form onSubmit={handlePCAccountLogin} className="space-y-4">
                    <div className="space-y-1 bg-slate-50 p-4 rounded-lg border border-slate-100 text-xs text-slate-500 space-y-1.5 font-medium mb-3">
                      <p className="font-bold text-slate-700">Provision Instructions:</p>
                      <p>1. Type the designated classroom workstation account username.</p>
                      <p>2. Keep the secure sandbox token password intact. It restricts browser escapes.</p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Windows exam login account name</label>
                      <input
                        type="text"
                        required
                        value={loginAccount}
                        onChange={(e) => setLoginAccount(e.target.value)}
                        placeholder="e.g. up_student_entry_24"
                        className="w-full px-3 py-2 border border-philsa-border rounded-md text-sm focus:ring-1 focus:ring-philsa-blue text-slate-800 font-semibold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Sandbox System Token (Encrypted Keyphrase)</label>
                      <div className="relative">
                        <input
                          type="password"
                          readOnly
                          value={loginPassword}
                          className="w-full px-3 py-2 border border-philsa-border rounded-md text-sm bg-slate-50 text-slate-500 cursor-not-allowed font-mono"
                        />
                        <ShieldCheck className="w-4 h-4 text-emerald-500 absolute right-3 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>

                    <div className="flex justify-between pt-4 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="px-4 py-2 border border-slate-300 hover:bg-slate-50 rounded-md text-sm font-bold text-slate-700"
                      >
                        Back
                      </button>
                      
                      <button
                        type="submit"
                        disabled={isLoggingIn}
                        className="px-6 py-2 bg-philsa-navy hover:bg-philsa-navy/95 text-white rounded-md text-sm font-bold transition-all flex items-center gap-2"
                      >
                        {isLoggingIn ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Establishing Secure Session...
                          </>
                        ) : (
                          'Authenticate & Login PC Account'
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* STEP 3: Deploy Safe Exam Browser */}
              {step === 3 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-philsa-red" />
                      App Deploy, Lock & Certify
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Initialize deployment of PhilSA Safe Exam Browser app and hardware integrity lock mechanism.
                    </p>
                  </div>

                  <div className="border border-slate-100 rounded-lg p-6 bg-slate-50 space-y-4">
                    <div className="flex justify-between text-xs text-slate-500 font-bold">
                      <span>DEPLOYMENT SEQUENCE</span>
                      <span>{installProgress}%</span>
                    </div>
                    
                    <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 transition-all duration-150" 
                        style={{ width: `${installProgress}%` }}
                      />
                    </div>

                    <p className="text-xs font-mono text-slate-500 bg-slate-950 text-emerald-400 p-3 h-20 overflow-y-auto rounded-md border border-slate-800 shrink-0">
                      {installStepText || 'Awaiting activation trigger... Ready.'}
                    </p>
                  </div>

                  <div className="flex justify-between pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      disabled={isInstalling || installProgress === 100}
                      onClick={() => setStep(2)}
                      className="px-4 py-2 border border-slate-300 hover:bg-slate-50 rounded-md text-sm font-bold text-slate-700 disabled:opacity-40"
                    >
                      Back
                    </button>

                    <div className="flex items-center gap-2">
                      {installProgress < 100 ? (
                        <button
                          type="button"
                          onClick={handleStartInstallation}
                          disabled={isInstalling}
                          className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-sm font-bold transition-all flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Deploy Safe Exam Browser
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleFinishAndSave}
                          className="px-6 py-2 bg-philsa-navy hover:bg-philsa-navy/95 text-white rounded-md text-sm font-bold transition-all flex items-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                          Certify and Register PC
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Prototype App Download Simulator Modal */}
      <AnimatePresence>
        {downloadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl border border-philsa-border overflow-hidden"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-rose-50 text-[#8A1538] flex items-center justify-center shrink-0">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">PhilSA Safe Desktop Simulator</h3>
                  <p className="text-xs text-slate-500">Secure Examination Lock Framework (Prototype)</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                  <div className="flex justify-between text-xs font-semibold text-slate-700">
                    <span>Downloading Client Package</span>
                    <span className="font-mono text-[#8A1538]">{downloadProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#8A1538] to-rose-500 transition-all duration-300" 
                      style={{ width: `${downloadProgress}%` }}
                    />
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono h-24 overflow-y-auto shrink-0 flex flex-col justify-end text-rose-300">
                  <p className="text-slate-500 mb-auto">// Securing Local Area loopback...</p>
                  <p className="text-emerald-400 font-bold">{downloadStep}</p>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  disabled={isDownloadingApp}
                  onClick={() => setDownloadModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer text-center"
                >
                  Close Simulator
                </button>
                {downloadProgress === 100 && (
                  <button
                    type="button"
                    onClick={() => {
                      setDownloadModal(false);
                      handleQuickRegister();
                    }}
                    className="px-5 py-2 bg-[#8A1538] hover:bg-[#6D102C] text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer text-center"
                  >
                    Auto-Register This Node
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Toast Notification */}
      <AnimatePresence>
        {localRegSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 right-6 z-50 bg-[#8A1538] text-white border-l-4 border-rose-300 py-4 px-6 rounded-xl shadow-2xl flex items-center gap-3"
          >
            <CheckCircle2 className="w-5 h-5 text-rose-300 animate-pulse" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider">Workstation Registered!</p>
              <p className="text-[10px] text-rose-200 mt-0.5">Physical device successfully linked as active node in server list.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
