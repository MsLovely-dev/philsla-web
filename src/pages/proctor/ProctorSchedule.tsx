import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePhilSA } from '../../PhilSAContext';
import { useMockData } from '../../services/mockService';
import { 
  Calendar, 
  Download, 
  CheckCircle, 
  ArrowRight, 
  Database, 
  MapPin, 
  Clock, 
  FileText,
  AlertCircle,
  RefreshCcw,
  ShieldCheck,
  StopCircle,
  Zap,
  Lock,
  Unlock,
  AlertTriangle,
  Users,
  X,
  Check,
  RotateCcw
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface StudentPC {
  id: string;
  name: string;
  seat: string;
  attendance: 'Present' | 'Absent' | 'Late' | 'Pending' | 'Technical Issue';
  device?: 'COMPATIBLE' | 'INCOMPATIBLE' | 'PENDING' | 'N/A';
  battery?: number;
  distStatus: 'Pending' | 'Received' | 'Failed';
  correctedFromAbsent?: boolean;
  correctionReasonCode?: string;
  correctionRemarks?: string;
  correctedAt?: number;
  assignedDurationMins?: number;
}

const getInitialStudentPCs = (schId: string): StudentPC[] => {
  if (schId === 'sch1') {
    return [
      { id: 'ST-001', name: 'Juan Carlos Villanueva', seat: 'A01', attendance: 'Pending', device: 'PENDING', battery: 0, distStatus: 'Pending' },
      { id: 'ST-002', name: 'Maria Cristina Santos', seat: 'A02', attendance: 'Pending', device: 'PENDING', battery: 0, distStatus: 'Pending' },
      { id: 'ST-003', name: 'Enrique S. Gatus', seat: 'A03', attendance: 'Pending', device: 'INCOMPATIBLE', battery: 15, distStatus: 'Pending' },
      { id: 'ST-004', name: 'Liza Monica Bautista', seat: 'A04', attendance: 'Pending', device: 'PENDING', battery: 0, distStatus: 'Pending' },
      { id: 'ST-005', name: 'Daniel S. Reyes', seat: 'A05', attendance: 'Pending', device: 'PENDING', battery: 0, distStatus: 'Pending' },
      { id: 'ST-006', name: 'Kathrine B. Mercado', seat: 'A06', attendance: 'Pending', device: 'PENDING', battery: 0, distStatus: 'Pending' },
    ];
  } else {
    return [
      { id: 'ST-101', name: 'Patricia Alcaraz', seat: 'B01', attendance: 'Pending', device: 'PENDING', battery: 0, distStatus: 'Pending' },
      { id: 'ST-102', name: 'Ramon Macaraeg', seat: 'B02', attendance: 'Pending', device: 'PENDING', battery: 0, distStatus: 'Pending' },
      { id: 'ST-103', name: 'Isabella Dela Cruz', seat: 'B03', attendance: 'Pending', device: 'PENDING', battery: 0, distStatus: 'Pending' },
      { id: 'ST-104', name: 'Gabriela Silang II', seat: 'B04', attendance: 'Pending', device: 'PENDING', battery: 0, distStatus: 'Pending' },
      { id: 'ST-105', name: 'Miguel De Guzman', seat: 'B05', attendance: 'Pending', device: 'PENDING', battery: 0, distStatus: 'Pending' },
    ];
  }
};

export default function ProctorSchedule() {
  const { addAuditLog } = usePhilSA();
  const { schedules, examSets } = useMockData();
  const navigate = useNavigate();

  const [distMode, setDistMode] = useState<'ONLINE' | 'OFFLINE'>('ONLINE');
  const [downloadStates, setDownloadStates] = useState<Record<string, 'IDLE' | 'DOWNLOADING' | 'READY'>>({});
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  const [downloadLogs, setDownloadLogs] = useState<Record<string, string>>({});
  const [networkReady, setNetworkReady] = useState(false);
  
  // Launch Modal State
  const [activeLaunchSchedule, setActiveLaunchSchedule] = useState<string | null>(null);
  const [sessionState, setSessionState] = useState<'LOCKED' | 'DISTRIBUTING' | 'PREPARING' | 'ACTIVE' | 'ENDED'>('LOCKED');
  const [showLaunchConfirm, setShowLaunchConfirm] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Distribution Simulation States
  const [onlineBroadcastState, setOnlineBroadcastState] = useState<'IDLE' | 'BROADCASTING' | 'COMPLETED'>('IDLE');
  const [offlineDeployState, setOfflineDeployState] = useState<'IDLE' | 'DEPLOYING' | 'COMPLETED'>('IDLE');
  const [onlineProgress, setOnlineProgress] = useState(0);
  const [offlineProgress, setOfflineProgress] = useState(0);
  const [offlineMethod, setOfflineMethod] = useState<'USB' | 'QR' | 'NONE'>('NONE');

  // Distribution states per schedule
  const [distStates, setDistStates] = useState<Record<string, {
    attendanceComplete: boolean;
    students: StudentPC[];
    isDistributing: boolean;
    distributedAt?: number;
  }>>(() => {
    const saved = localStorage.getItem('philsa_proctor_dist_states');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return {};
  });

  // Save to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('philsa_proctor_dist_states', JSON.stringify(distStates));
  }, [distStates]);

  const getDistState = (schId: string) => {
    if (distStates[schId]) {
      return distStates[schId];
    }
    return {
      attendanceComplete: false,
      students: getInitialStudentPCs(schId),
      isDistributing: false,
    };
  };

  const updateDistState = (schId: string, updates: Partial<{ attendanceComplete: boolean; students: StudentPC[]; isDistributing: boolean; distributedAt: number }>) => {
    setDistStates(prev => {
      const current = prev[schId] || {
        attendanceComplete: false,
        students: getInitialStudentPCs(schId),
        isDistributing: false,
      };
      return {
        ...prev,
        [schId]: {
          ...current,
          ...updates
        }
      };
    });
  };

  const changeStudentAttendance = (schId: string, studentId: string, nextAttendance: 'Present' | 'Absent' | 'Late') => {
    const currentState = getDistState(schId);
    const updatedStudents = currentState.students.map(s => {
      if (s.id === studentId) {
        return { 
          ...s, 
          attendance: nextAttendance,
          distStatus: nextAttendance !== 'Absent' ? s.distStatus : ('Pending' as const)
        };
      }
      return s;
    });
    updateDistState(schId, { students: updatedStudents });
  };

  const [warningModalSchId, setWarningModalSchId] = useState<string | null>(null);

  const handleDistributeToSingleStudent = (schId: string, studentId: string) => {
    const currentState = getDistState(schId);
    const updatedStudents = currentState.students.map(s => {
      if (s.id === studentId) {
        return { ...s, distStatus: 'Received' as const };
      }
      return s;
    });
    updateDistState(schId, { students: updatedStudents });
    const student = currentState.students.find(s => s.id === studentId);
    addAuditLog('EXAM_DISTRIBUTE_TERMINALS', `Synchronized individual exam payload for late candidate ${student?.name || studentId} (Seat ${student?.seat || 'N/A'}) in schedule ${schId}.`);
  };

  const handleDistribute = (schId: string) => {
    const currentState = getDistState(schId);
    const pendingStudents = currentState.students.filter(s => s.attendance === 'Pending');
    if (pendingStudents.length > 0) {
      setWarningModalSchId(schId);
      return;
    }

    updateDistState(schId, { isDistributing: true });
    
    setTimeout(() => {
      const stateAfter = getDistState(schId);
      const hasFailedBefore = stateAfter.students.some(s => s.distStatus === 'Failed');
      let hasGlitchOccurred = false;

      const updatedStudents = stateAfter.students.map((s) => {
        if ((s.attendance === 'Present' || s.attendance === 'Late') && s.distStatus !== 'Received') {
          // Glitch simulation: the first student encountered (and if never failed before) fails.
          if (!hasFailedBefore && !hasGlitchOccurred) {
            hasGlitchOccurred = true;
            return { ...s, distStatus: 'Failed' as const };
          }
          return { ...s, distStatus: 'Received' as const };
        }
        return s;
      });

      updateDistState(schId, { 
        students: updatedStudents, 
        isDistributing: false,
        attendanceComplete: true,
        distributedAt: Date.now()
      });

      addAuditLog('EXAM_DISTRIBUTE_TERMINALS', `Synchronized exam payload with Present/Late terminals in schedule ${schId}.`);
    }, 1800);
  };

  useEffect(() => {
    if (!activeLaunchSchedule) {
      setSessionState('LOCKED');
      setOnlineBroadcastState('IDLE');
      setOfflineDeployState('IDLE');
      setOnlineProgress(0);
      setOfflineProgress(0);
      setOfflineMethod('NONE');
    }
  }, [activeLaunchSchedule]);

  // Mock network check
  useEffect(() => {
    const check = localStorage.getItem('proctor_network_pass');
    setNetworkReady(check === 'true');
  }, []);

  useEffect(() => {
    if (sessionState === 'ACTIVE') {
      const interval = setInterval(() => {
        setCountdown(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [sessionState]);

  const startOnlineBroadcast = () => {
    setOnlineBroadcastState('BROADCASTING');
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      if (progress >= 100) {
        setOnlineProgress(100);
        setOnlineBroadcastState('COMPLETED');
        clearInterval(interval);
        addAuditLog('EXAM_DISTRIBUTE_ONLINE', `Broadcasted encrypted exam package payload to all online terminals in schedule ${activeLaunchSchedule}.`);
      } else {
        setOnlineProgress(progress);
      }
    }, 150);
  };

  const startOfflineDeploy = (method: 'USB' | 'QR') => {
    setOfflineMethod(method);
    setOfflineDeployState('DEPLOYING');
    let progress = 0;
    const interval = setInterval(() => {
      progress += 20;
      if (progress >= 100) {
        setOfflineProgress(100);
        setOfflineDeployState('COMPLETED');
        clearInterval(interval);
        addAuditLog('EXAM_DISTRIBUTE_OFFLINE', `Deployed offline exam package to standalone devices via ${method === 'USB' ? 'USB Archive (.PEP)' : 'Manual Decryption Key/QR'}.`);
      } else {
        setOfflineProgress(progress);
      }
    }, 200);
  };

  const handleDownload = (schId: string) => {
    if (!networkReady && distMode === 'ONLINE') {
      alert("Network readiness check required before package download.");
      navigate('/proctor/readiness');
      return;
    }

    setDownloadStates(prev => ({ ...prev, [schId]: 'DOWNLOADING' }));
    setDownloadProgress(prev => ({ ...prev, [schId]: 0 }));
    setDownloadLogs(prev => ({ ...prev, [schId]: distMode === 'ONLINE' ? 'Connecting to PhilSA Cloud...' : 'Initializing offline master module...' }));
    
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 15) + 8;
      if (progress >= 100) {
        setDownloadProgress(prev => ({ ...prev, [schId]: 100 }));
        setDownloadStates(prev => ({ ...prev, [schId]: 'READY' }));
        setDownloadLogs(prev => ({ 
          ...prev, 
          [schId]: distMode === 'ONLINE' 
            ? "Completed. Workstations updated automatically over Local LAN!" 
            : "Offline PEP archive successfully generated on local host storage." 
        }));
        clearInterval(interval);
        
        // Audit log
        addAuditLog(
          distMode === 'ONLINE' ? 'EXAM_DOWNLOAD_ONLINE' : 'EXAM_DOWNLOAD_OFFLINE', 
          `Synchronized ${distMode} exam package for schedule ${schId}`
        );

        // Pre-configure launch simulator states based on mode
        if (distMode === 'ONLINE') {
          setOnlineBroadcastState('COMPLETED');
          setOnlineProgress(100);
          setOfflineDeployState('COMPLETED');
          setOfflineProgress(100);
        } else {
          setOnlineBroadcastState('IDLE');
          setOnlineProgress(0);
          setOfflineDeployState('IDLE');
          setOfflineProgress(0);
          setOfflineMethod('NONE');
        }
      } else {
        setDownloadProgress(prev => ({ ...prev, [schId]: progress }));
        
        // Dynamic status description updates during download
        if (distMode === 'ONLINE') {
          if (progress < 25) {
            setDownloadLogs(prev => ({ ...prev, [schId]: "Authenticating server keys with PhilSA Cloud..." }));
          } else if (progress < 55) {
            setDownloadLogs(prev => ({ ...prev, [schId]: "Downloading central payload (EXAM-2026-A_SECURE.pkg)..." }));
          } else if (progress < 80) {
            setDownloadLogs(prev => ({ ...prev, [schId]: "Validating cryptographic file integrity signatures..." }));
          } else {
            setDownloadLogs(prev => ({ ...prev, [schId]: "Auto-broadcasting package to connected LAN terminals..." }));
          }
        } else {
          if (progress < 25) {
            setDownloadLogs(prev => ({ ...prev, [schId]: "Initializing offline hardware master module..." }));
          } else if (progress < 55) {
            setDownloadLogs(prev => ({ ...prev, [schId]: "Extracting local secure master package partition..." }));
          } else if (progress < 80) {
            setDownloadLogs(prev => ({ ...prev, [schId]: "Compiling isolated .PEP archive with hardware seed..." }));
          } else {
            setDownloadLogs(prev => ({ ...prev, [schId]: "Generating host proctor manual key indexes..." }));
          }
        }
      }
    }, 250);
  };

  const handleStartExam = (schId: string) => {
    setActiveLaunchSchedule(schId);
    setSessionState('LOCKED');
    setCountdown(0);
  };

  const confirmLaunch = () => {
    setShowLaunchConfirm(false);
    setSessionState('PREPARING');
    
    const currentSch = schedules.find(s => s.id === activeLaunchSchedule);
    
    setTimeout(() => {
      setSessionState('ACTIVE');
      addAuditLog('EXAM_LAUNCH_GLOBAL', `Proctor launched global session for ${currentSch?.testCenter}. All terminals unlocked.`);
    }, 2000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentSch = schedules.find(s => s.id === activeLaunchSchedule);
  const assignedExam = examSets.find(e => e.id === currentSch?.examSetId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4 border-b border-philsa-border">
        <div>
          <h1 className="text-2xl font-bold text-philsa-navy mb-1 tracking-tight">Exam Schedule</h1>
          <p className="text-philsa-gray max-w-2xl text-xs font-semibold">Review assigned exam sessions and sync secure packages for deployment.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setDistStates({});
              setDownloadStates({});
              setDownloadProgress({});
              setDownloadLogs({});
              addAuditLog('ATTENDANCE_LOCK', 'Reset all simulation, attendance, and exam distribution states to start over.');
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all cursor-pointer shadow-sm"
            title="Reset all schedules & attendance data to pristine state"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" /> Reset All States
          </button>
          {distMode === 'ONLINE' && !networkReady && (
            <div className="flex items-center gap-2.5 bg-red-50 text-philsa-red px-3 py-1.5 rounded-lg border border-red-100 animate-pulse">
              <AlertCircle className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold">Network verification required</span>
            </div>
          )}
        </div>
      </div>

      {/* Simulation switcher */}
      <div className="bg-white rounded-2xl border border-philsa-border p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1 max-w-lg">
          <p className="text-[10px] font-bold text-philsa-red uppercase tracking-wider">Simulation Mode</p>
          <h3 className="text-base font-bold text-philsa-navy leading-none">Delivery Method</h3>
          <p className="text-xs text-philsa-gray font-semibold">
            Choose online sync or offline air-gapped mode to simulate your target exam setup.
          </p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0 w-full md:w-auto">
          <button
            onClick={() => {
              setDistMode('ONLINE');
              setDownloadStates({});
              setDownloadProgress({});
              setDownloadLogs({});
            }}
            className={cn(
              "flex-1 md:flex-initial py-2 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
              distMode === 'ONLINE'
                ? "bg-white text-blue-600 shadow-sm"
                : "text-philsa-gray hover:text-philsa-navy"
            )}
          >
            <Zap className="w-3.5 h-3.5" /> Online Sync
          </button>
          <button
            onClick={() => {
              setDistMode('OFFLINE');
              setDownloadStates({});
              setDownloadProgress({});
              setDownloadLogs({});
            }}
            className={cn(
              "flex-1 md:flex-initial py-2 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
              distMode === 'OFFLINE'
                ? "bg-philsa-navy text-white shadow-sm"
                : "text-philsa-gray hover:text-philsa-navy"
            )}
          >
            <Database className="w-3.5 h-3.5" /> Offline Setup
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {schedules.filter(s => s.testCenter.includes('University of the Philippines') || s.testCenter.includes('UP Diliman') || s.testCenter.includes('Ateneo')).map((sch) => {
          const exam = examSets.find(e => e.id === sch.examSetId);
          const state = downloadStates[sch.id] || 'IDLE';
          const progress = downloadProgress[sch.id] || 0;
          const logMessage = downloadLogs[sch.id] || '';

          const schDist = getDistState(sch.id);
          const totalPresent = schDist.students.filter(s => s.attendance === 'Present' || s.attendance === 'Late').length;
          const totalReceived = schDist.students.filter(s => (s.attendance === 'Present' || s.attendance === 'Late') && s.distStatus === 'Received').length;
          const isDistributeDisabled = !schDist.attendanceComplete || schDist.isDistributing;
          const hasUnreceivedPresent = schDist.students.filter(s => s.attendance === 'Present' || s.attendance === 'Late').some(s => s.distStatus !== 'Received');
          const isStartDisabled = state !== 'READY' || !schDist.attendanceComplete || hasUnreceivedPresent;

          return (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              key={sch.id} 
              className="card-philsa border-l-8 border-philsa-navy hover:shadow-xl transition-all group"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-philsa-red" />
                    <span className="text-xs font-semibold text-philsa-navy">
                      {new Date(sch.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-philsa-navy leading-none">{sch.testCenter}</h3>
                  <div className="flex items-center gap-4 text-philsa-gray">
                     <span className="flex items-center gap-1.5 text-xs font-medium"><MapPin className="w-3.5 h-3.5" /> {sch.room}</span>
                     <span className="w-1 h-1 bg-philsa-border rounded-full" />
                     <span className="flex items-center gap-1.5 text-xs font-medium"><Clock className="w-3.5 h-3.5" /> {sch.time} - {sch.endTime}</span>
                  </div>
                </div>
                <div className={cn(
                  "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tight",
                  state === 'READY' ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                )}>
                  {state === 'READY' ? 'Ready' : 'Scheduled'}
                </div>
              </div>

              <div className="bg-philsa-bg rounded-xl p-5 border border-philsa-border space-y-4 mb-6 group-hover:bg-white transition-colors">
                <div className="flex justify-between items-center">
                   <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-philsa-navy text-white rounded-lg flex items-center justify-center">
                         <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] text-philsa-gray font-bold uppercase tracking-wider">Exam</p>
                        <p className="text-xs font-bold text-philsa-navy">{exam?.title || 'Not Assigned'}</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] text-philsa-gray font-bold uppercase tracking-wider">Method</p>
                      <p className="text-xs font-bold text-philsa-navy">
                        {distMode === 'ONLINE' ? 'Online Sync' : 'Offline Setup'}
                      </p>
                   </div>
                </div>

                {state === 'DOWNLOADING' && (
                  <div className="space-y-3">
                    <div className="flex justify-between text-[10px] font-bold text-philsa-navy">
                      <span>{logMessage || "Synchronizing Package..."}</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-white rounded-full overflow-hidden border border-philsa-border">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className={cn("h-full", distMode === 'ONLINE' ? 'bg-blue-600' : 'bg-purple-600')} 
                      />
                    </div>
                  </div>
                )}

                {state === 'READY' && (
                  <div className={cn(
                    "p-3 rounded-lg border text-xs font-semibold flex items-center gap-2",
                    distMode === 'ONLINE' 
                      ? "bg-emerald-50 border-emerald-100 text-emerald-700" 
                      : "bg-purple-50 border-purple-100 text-purple-700"
                  )}>
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <div>
                      <p className="font-bold">
                        {distMode === 'ONLINE' ? "Online Sync Complete" : "Offline Package Ready"}
                      </p>
                      <p className="text-[10px] opacity-80 mt-0.5 font-medium leading-normal">
                        {distMode === 'ONLINE' 
                          ? "Workstations are synced and ready." 
                          : "Proceed to Start Exam to begin."}
                      </p>
                    </div>
                  </div>
                )}

                {/* STEP 2: Attendance & Exam Distribution */}
                {state === 'READY' && (
                  <div className="mt-6 pt-6 border-t border-philsa-border/60 space-y-5 text-left">
                    {/* Distribute to Students Button & Connective Locking UI */}
                    <div className="space-y-3">
                      {!schDist.attendanceComplete ? (
                        <div className="bg-amber-50 border border-amber-200/60 p-4 rounded-2xl space-y-3">
                          <div className="flex gap-2 text-amber-800 font-bold uppercase tracking-wider text-[10px]">
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                            <div>
                              <p className="font-bold">Attendance Verification Required</p>
                              <p className="text-[10px] text-amber-600 font-medium normal-case mt-0.5 leading-normal">
                                Please verify student attendance and lock the roster on the Attendance page first.
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => navigate('/proctor/attendance')}
                            className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            Verify Attendance <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="bg-emerald-50 border border-emerald-200/60 p-3 rounded-lg flex items-center gap-2 text-xs text-emerald-800 font-bold">
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Attendance verified and locked. Ready to distribute exams.</span>
                        </div>
                      )}

                      <button
                        onClick={() => handleDistribute(sch.id)}
                        disabled={schDist.isDistributing}
                        className={cn(
                          "w-full py-3 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer",
                          schDist.isDistributing
                            ? "bg-indigo-100 text-indigo-700 cursor-wait border border-indigo-200"
                            : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/10 active:scale-95"
                        )}
                      >
                        {schDist.isDistributing ? (
                          <>
                            <RefreshCcw className="w-4 h-4 animate-spin" /> Sending Exams...
                          </>
                        ) : (
                          <>
                            <Zap className="w-4 h-4" /> Send Exams to Students
                          </>
                        )}
                      </button>

                      {schDist.attendanceComplete && hasUnreceivedPresent && !schDist.isDistributing && (
                        <p className="text-[9px] text-indigo-600 text-center font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                          Ready to send to {schDist.students.filter(s => (s.attendance === 'Present' || s.attendance === 'Late') && s.distStatus !== 'Received').length} active student(s).
                        </p>
                      )}
                    </div>

                    {/* Late Arrivals Section (for individual distribution) */}
                    {schDist.students.some(s => s.attendance === 'Late') && (
                      <div className="mt-4 pt-4 border-t border-slate-100 space-y-3 text-left">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-amber-500" />
                          <h5 className="text-[10px] font-black uppercase tracking-widest text-philsa-navy">
                            Late Arrivals
                          </h5>
                        </div>
                        <p className="text-[10px] text-philsa-gray font-medium">
                          Send the exam to late students individually.
                        </p>
                        <div className="space-y-2 bg-amber-50/40 p-3 rounded-2xl border border-amber-100/50">
                          {schDist.students.filter(s => s.attendance === 'Late').map(student => (
                            <div key={student.id} className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-100/80 shadow-sm">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-[8px] font-mono font-black text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                                    Seat {student.seat}
                                  </span>
                                  <span className="text-xs font-black text-philsa-navy">{student.name}</span>
                                </div>
                                <p className="text-[9px] text-philsa-gray font-semibold tracking-wider uppercase">{student.id}</p>
                              </div>

                              <div>
                                {student.distStatus === 'Received' ? (
                                  <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-wider px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100 font-bold">
                                    <Check className="w-3.5 h-3.5" /> Sent
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleDistributeToSingleStudent(sch.id, student.id)}
                                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all shadow-sm cursor-pointer"
                                  >
                                    Send Exam
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => handleDownload(sch.id)}
                  disabled={state !== 'IDLE' || (distMode === 'ONLINE' && !networkReady)}
                  className={cn(
                    "flex-1 btn-primary py-4 flex items-center justify-center gap-3 text-xs uppercase tracking-widest",
                    (state !== 'IDLE' || (distMode === 'ONLINE' && !networkReady)) && "opacity-50 cursor-not-allowed bg-philsa-gray"
                  )}
                >
                  {state === 'READY' ? (
                    <><CheckCircle className="w-4 h-4" /> Package Ready</>
                  ) : state === 'DOWNLOADING' ? (
                    <><RefreshCcw className="w-4 h-4 animate-spin" /> Synchronizing...</>
                  ) : (
                    <><Download className="w-4 h-4" /> Download Exam</>
                  )}
                </button>
                
                <button 
                  onClick={() => handleStartExam(sch.id)}
                  disabled={isStartDisabled}
                  className={cn(
                    "flex-1 py-4 rounded-xl flex items-center justify-center gap-3 text-xs uppercase tracking-widest font-black transition-all",
                    !isStartDisabled
                      ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 cursor-pointer" 
                      : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60"
                  )}
                >
                  <ArrowRight className="w-4 h-4" /> Start Exam
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Unified Launch Interface */}
      <AnimatePresence>
        {activeLaunchSchedule && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-philsa-navy/80 backdrop-blur-md overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
              className="bg-philsa-bg rounded-[3.5rem] shadow-2xl max-w-4xl w-full p-8 md:p-12 relative"
            >
              <button 
                onClick={() => setActiveLaunchSchedule(null)}
                className="absolute top-8 right-8 p-3 hover:bg-black/5 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-philsa-navy" />
              </button>

              <div className="space-y-10">
                <div className="flex items-center gap-6 pb-6 border-b border-philsa-border">
                  <div className="w-16 h-16 bg-philsa-red text-white rounded-[2rem] flex items-center justify-center shadow-2xl shadow-philsa-red/20 shrink-0">
                    <ShieldCheck className="w-9 h-9" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-philsa-navy tracking-tight">Exam Launch Panel</h2>
                    <p className="text-[10px] font-black tracking-widest text-philsa-gray uppercase mt-1">
                      {currentSch?.testCenter} • {currentSch?.room}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-6 rounded-3xl border border-philsa-border flex flex-col items-center text-center">
                    <Users className="w-6 h-6 text-philsa-gray mb-3" />
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Authenticated</p>
                    <p className="text-xl font-black text-philsa-navy">48 / 48</p>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-philsa-border flex flex-col items-center text-center">
                    <Clock className="w-6 h-6 text-philsa-gray mb-3" />
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Duration</p>
                    <p className="text-xl font-black text-philsa-navy">120 MIN</p>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-philsa-border flex flex-col items-center text-center overflow-hidden relative">
                    <Zap className="w-6 h-6 text-philsa-gray mb-3" />
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Terminal Status</p>
                    <p className="text-xl font-black text-emerald-600 uppercase">Secure</p>
                  </div>
                </div>

                <div className="bg-white rounded-[3rem] border border-philsa-border p-12 text-center space-y-10 relative overflow-hidden">
                  <div className="relative z-10 space-y-6">
                    <div className={cn(
                      "w-28 h-28 mx-auto rounded-[2.5rem] border-4 flex items-center justify-center transition-all duration-1000",
                      sessionState === 'LOCKED' ? "border-philsa-red bg-red-50 text-philsa-red" : 
                      sessionState === 'DISTRIBUTING' ? "border-indigo-500 bg-indigo-50 text-indigo-500 animate-pulse" :
                      sessionState === 'PREPARING' ? "border-blue-500 bg-blue-50 text-blue-500 animate-pulse" :
                      "border-emerald-500 bg-emerald-50 text-emerald-600"
                    )}>
                      {sessionState === 'LOCKED' ? <Lock className="w-12 h-12" /> : 
                       sessionState === 'DISTRIBUTING' ? <Database className="w-12 h-12" /> :
                       sessionState === 'PREPARING' ? <RefreshCcw className="w-12 h-12 animate-spin" /> :
                       <Unlock className="w-12 h-12" />}
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="text-3xl font-black text-philsa-navy tracking-tight leading-none">{assignedExam?.title}</h3>
                      <p className="text-philsa-gray text-[10px] font-bold tracking-widest uppercase">{currentSch?.id}</p>
                    </div>

                    {sessionState === 'LOCKED' && (
                      <div className="max-w-md mx-auto space-y-8 pt-4">
                        {distMode === 'ONLINE' ? (
                          <>
                            <div className="bg-emerald-50/60 border border-emerald-100 p-6 rounded-3xl text-left space-y-3">
                              <h4 className="text-xs font-black text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                                <Zap className="w-3.5 h-3.5 animate-pulse" /> ONLINE SYSTEM SYNCED
                              </h4>
                              <p className="text-xs text-emerald-700/80 font-medium leading-relaxed">
                                The test center network is connected. The exam package has been synchronized with student devices.
                              </p>
                              <div className="pt-2 flex items-center justify-between text-[10px] font-bold text-emerald-800 border-t border-emerald-100">
                                <span>Status:</span>
                                <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded uppercase text-[8px] font-bold">All Workstations Synced</span>
                              </div>
                            </div>

                            <button 
                              onClick={() => {
                                setOnlineBroadcastState('COMPLETED');
                                setOnlineProgress(100);
                                setOfflineDeployState('COMPLETED');
                                setOfflineProgress(100);
                                setSessionState('DISTRIBUTING');
                              }}
                              className="w-full btn-primary py-6 rounded-[2rem] text-xs font-black uppercase tracking-[0.15em] shadow-2xl shadow-philsa-red/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 cursor-pointer"
                            >
                              <ShieldCheck className="w-5 h-5" /> Launch Exam Panel
                            </button>
                          </>
                        ) : (
                          <>
                            <div className="bg-amber-50/60 border border-amber-100 p-6 rounded-3xl text-left space-y-3">
                              <h4 className="text-xs font-black text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                                <Database className="w-3.5 h-3.5" /> OFFLINE STORAGE SETUP
                              </h4>
                              <p className="text-xs text-amber-700/80 font-medium leading-relaxed">
                                This exam center is offline. The exam package will be deployed directly via physical media (USB or local setup codes).
                              </p>
                              <div className="pt-2 flex items-center justify-between text-[10px] font-bold text-amber-800 border-t border-amber-100">
                                <span>Status:</span>
                                <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded uppercase text-[8px] font-bold">Awaiting Setup</span>
                              </div>
                            </div>

                            <button 
                              onClick={() => {
                                setOnlineBroadcastState('IDLE');
                                setOnlineProgress(0);
                                setOfflineDeployState('IDLE');
                                setOfflineProgress(0);
                                setOfflineMethod('NONE');
                                setSessionState('DISTRIBUTING');
                              }}
                              className="w-full btn-primary py-6 rounded-[2rem] text-xs font-black uppercase tracking-[0.15em] shadow-2xl shadow-philsa-red/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 cursor-pointer"
                            >
                              <Database className="w-5 h-5 animate-pulse" /> Open Offline Installer
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    {sessionState === 'DISTRIBUTING' && (
                      <div className="max-w-2xl mx-auto space-y-8 pt-4 text-left">
                        <div className="bg-slate-50 border border-philsa-border/60 rounded-3xl p-6">
                          <h4 className="text-xs font-bold text-philsa-navy mb-1">Simulated Package Distribution</h4>
                          <p className="text-xs text-philsa-gray font-medium leading-relaxed">
                            {distMode === 'ONLINE' 
                              ? "Verify automated local LAN handshakes to connected workstation candidate terminals." 
                              : "Simulate loading the .PEP payload onto physical media to unlock offline candidate workstations."}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                          {distMode === 'ONLINE' ? (
                            /* Online Channel card */
                            <div className="bg-slate-50/50 border border-philsa-border p-6 rounded-3xl space-y-4">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2.5 py-1 rounded">Online Broadcast Sync</span>
                                <span className="text-xs font-bold text-philsa-navy">LAN / Cloud Auto-Sync</span>
                              </div>
                              <p className="text-[11px] text-philsa-gray font-medium leading-normal">
                                Central server auto-pushed the encrypted admission exam package to all authenticated LAN terminals. No physical media needed.
                              </p>
                              <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 p-4 rounded-xl flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                                <span className="flex items-center gap-2">
                                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                                  Ready • 48 Connected Terminals Verified
                                </span>
                                <span className="font-mono text-[9px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">All Synced</span>
                              </div>
                            </div>
                          ) : (
                            /* Offline Channel card */
                            <div className="bg-slate-50/50 border border-philsa-border p-6 rounded-3xl space-y-4">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-widest text-purple-600 bg-purple-50 px-2.5 py-1 rounded">Offline Physical Sync Channel</span>
                                <span className="text-xs font-bold text-philsa-navy">USB Media / Decryption Keys</span>
                              </div>
                              <p className="text-[11px] text-philsa-gray font-medium leading-normal">
                                Choose an offline deployment vector to distribute the generated secure exam packages to isolated candidate terminals.
                              </p>
                              {offlineDeployState === 'IDLE' && (
                                <div className="grid grid-cols-2 gap-3">
                                  <button
                                    onClick={() => startOfflineDeploy('USB')}
                                    className="bg-purple-600 text-white text-[10px] font-black uppercase tracking-wider py-4 px-2 rounded-xl hover:bg-purple-700 transition-colors shadow-lg shadow-purple-500/10 cursor-pointer"
                                  >
                                    Deploy via secure USB
                                  </button>
                                  <button
                                    onClick={() => startOfflineDeploy('QR')}
                                    className="bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider py-4 px-2 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/10 cursor-pointer"
                                  >
                                    Generate QR / Keys
                                  </button>
                                </div>
                              )}
                              {offlineDeployState === 'DEPLOYING' && (
                                <div className="space-y-2">
                                  <div className="flex justify-between text-[10px] font-bold text-purple-600">
                                    <span>Writing payload via {offlineMethod === 'USB' ? 'USB Archive' : 'QR code key'}...</span>
                                    <span>{offlineProgress}%</span>
                                  </div>
                                  <div className="w-full h-1.5 bg-purple-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-purple-600 transition-all duration-150" style={{ width: `${offlineProgress}%` }} />
                                  </div>
                                </div>
                              )}
                              {offlineDeployState === 'COMPLETED' && (
                                <div className="space-y-3">
                                  <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 p-3.5 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                                    Ready • Offline Payload Successfully Transferred
                                  </div>
                                  {offlineMethod === 'QR' && (
                                    <div className="p-3 bg-white border border-indigo-100 rounded-xl space-y-2">
                                      <p className="text-[8px] font-black uppercase tracking-wider text-philsa-gray">Manual Decryption Key:</p>
                                      <code className="text-xs font-mono font-bold bg-indigo-50 text-indigo-600 p-1 rounded block text-center select-all">
                                        PH-SECURE-8803-OFFLINE-X
                                      </code>
                                    </div>
                                  )}
                                  {offlineMethod === 'USB' && (
                                    <div className="p-3 bg-white border border-purple-100 rounded-xl text-center">
                                      <p className="text-[9px] font-bold text-purple-700">Encrypted `.PEP` file saved to secure USB partition.</p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Workstation Sync Roster */}
                        <div className="bg-white border border-philsa-border p-6 rounded-3xl space-y-4">
                          <h5 className="text-[10px] font-black uppercase tracking-widest text-philsa-gray">Live Workstation Sync Status (CANDIDATES)</h5>
                          <div className="space-y-3 max-h-48 overflow-y-auto">
                            {/* Candidate 1: Online */}
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-philsa-border/40">
                              <div className="space-y-0.5">
                                <p className="text-xs font-black text-philsa-navy">Juan Carlos Villanueva</p>
                                <p className="text-[9px] text-philsa-gray font-bold uppercase tracking-wider">Online Terminal • CAND-2026-8803</p>
                              </div>
                              <span className={cn(
                                "text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full",
                                distMode === 'ONLINE' ? "bg-emerald-100 text-emerald-700" : "bg-yellow-100 text-yellow-700"
                              )}>
                                {distMode === 'ONLINE' ? 'Ready (Synced)' : 'Awaiting USB/Key'}
                              </span>
                            </div>

                            {/* Candidate 2: Offline */}
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-philsa-border/40">
                              <div className="space-y-0.5">
                                <p className="text-xs font-black text-philsa-navy">Juan Carlos Villanueva (Offline)</p>
                                <p className="text-[9px] text-philsa-gray font-bold uppercase tracking-wider">Offline Terminal • CAND-2026-8803-OFFLINE</p>
                              </div>
                              <span className={cn(
                                "text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full",
                                distMode === 'ONLINE' ? "bg-emerald-100 text-emerald-700" :
                                offlineDeployState === 'COMPLETED' ? "bg-emerald-100 text-emerald-700" :
                                offlineDeployState === 'DEPLOYING' ? "bg-purple-100 text-purple-700 animate-pulse" :
                                "bg-slate-100 text-philsa-gray"
                              )}>
                                {distMode === 'ONLINE' ? 'Ready (Synced)' :
                                 offlineDeployState === 'COMPLETED' ? 'Ready (Offline Deployed)' :
                                 offlineDeployState === 'DEPLOYING' ? 'Deploying...' : 'Awaiting USB/Key'}
                              </span>
                            </div>

                            {/* Candidate 3: Online */}
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-philsa-border/40">
                              <div className="space-y-0.5">
                                <p className="text-xs font-black text-philsa-navy">Maria Cristina Santos</p>
                                <p className="text-[9px] text-philsa-gray font-bold uppercase tracking-wider">Online Terminal • CAND-2026-8802</p>
                              </div>
                              <span className={cn(
                                "text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full",
                                distMode === 'ONLINE' ? "bg-emerald-100 text-emerald-700" : "bg-yellow-100 text-yellow-700"
                              )}>
                                {distMode === 'ONLINE' ? 'Ready (Synced)' : 'Awaiting USB/Key'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions row */}
                        <div className="flex justify-between items-center pt-4">
                          <button
                            onClick={() => setSessionState('LOCKED')}
                            className="text-[10px] font-black uppercase tracking-widest text-philsa-gray px-6 py-3 border border-philsa-border rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
                          >
                            Back
                          </button>
                          
                          <button
                            onClick={() => setShowLaunchConfirm(true)}
                            disabled={distMode === 'OFFLINE' && offlineDeployState !== 'COMPLETED'}
                            className={cn(
                              "px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all cursor-pointer",
                              distMode === 'ONLINE' || offlineDeployState === 'COMPLETED'
                                ? "bg-philsa-red text-white hover:bg-red-700 shadow-xl shadow-philsa-red/20 active:scale-95"
                                : "bg-slate-100 text-slate-400 border border-philsa-border cursor-not-allowed"
                            )}
                          >
                            Authorize Global Launch
                          </button>
                        </div>
                      </div>
                    )}

                    {sessionState === 'PREPARING' && (
                      <div className="max-w-md mx-auto space-y-6 pt-4">
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] animate-pulse">Broadcasting Decryption Keys...</p>
                        <div className="h-1.5 bg-philsa-bg rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 2 }}
                            className="h-full bg-blue-500 rounded-full"
                          />
                        </div>
                      </div>
                    )}

                    {sessionState === 'ACTIVE' && (
                      <div className="max-w-md mx-auto space-y-10 pt-4">
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em]">Live Session Running</p>
                          <p className="text-6xl font-black text-philsa-navy tracking-tighter">{formatTime(countdown)}</p>
                        </div>
                        <div className="flex gap-4">
                          <button onClick={() => navigate('/proctor/monitoring')} className="flex-1 bg-philsa-navy text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest">
                            Open Monitoring
                          </button>
                          <button onClick={() => setSessionState('ENDED')} className="flex-1 bg-philsa-red/10 text-philsa-red border border-philsa-red/20 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-philsa-red hover:text-white transition-all">
                            Terminate Session
                          </button>
                        </div>
                      </div>
                    )}

                    {sessionState === 'ENDED' && (
                      <div className="max-w-md mx-auto space-y-6 pt-4">
                        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                          <CheckCircle className="w-8 h-8" />
                        </div>
                        <h3 className="text-2xl font-black text-philsa-navy">Session Terminated</h3>
                        <p className="text-sm text-philsa-gray font-medium">All terminal progress captured and encrypted. Audit logs transmitted.</p>
                        <button onClick={() => setActiveLaunchSchedule(null)} className="btn-secondary py-3 px-8 text-[10px] font-black uppercase tracking-widest">
                          Close Console
                        </button>
                      </div>
                    )}
                  </div>
                  <ShieldCheck className="absolute -right-20 -bottom-20 w-80 h-80 text-philsa-navy opacity-[0.03] pointer-events-none" />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLaunchConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-philsa-navy/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[3rem] shadow-2xl max-w-md w-full p-10 text-center space-y-8"
            >
              <div className="w-20 h-20 bg-philsa-bg rounded-[2rem] flex items-center justify-center mx-auto text-philsa-red">
                <AlertTriangle className="w-10 h-10" />
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-black text-philsa-navy tracking-tight uppercase">Launch Authorization</h3>
                <p className="text-sm text-philsa-gray leading-relaxed font-medium">You are about to unlock all student terminals in this session simultaneously.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowLaunchConfirm(false)} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-philsa-gray">Cancel</button>
                <button 
                  onClick={confirmLaunch}
                  className="flex-[2] bg-philsa-red text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-philsa-red/20 hover:scale-105 active:scale-95 transition-all"
                >
                  Authorize Launch
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {warningModalSchId && (() => {
          const sch = schedules.find(s => s.id === warningModalSchId);
          const schDist = getDistState(warningModalSchId);
          const pendingStudents = schDist.students.filter(s => s.attendance === 'Pending');
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-philsa-navy/80 backdrop-blur-md"
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-white rounded-[2.5rem] shadow-2xl max-w-lg w-full p-8 space-y-6 border border-slate-100 text-left"
              >
                <div className="flex gap-4 items-start border-b border-slate-100 pb-5">
                  <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-philsa-navy tracking-tight uppercase leading-none mb-1.5">Unchecked Attendance Detected</h3>
                    <p className="text-[10px] font-black tracking-widest text-philsa-gray uppercase">
                      {sch?.testCenter} • {sch?.room}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs text-philsa-gray font-medium leading-relaxed">
                    You cannot distribute the exam package to this room yet. There are still <strong className="text-philsa-navy font-black">{pendingStudents.length} candidate(s)</strong> whose attendance status has not been verified.
                  </p>

                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2.5 max-h-48 overflow-y-auto">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Unverified Candidates:</p>
                    <div className="divide-y divide-slate-100">
                      {pendingStudents.map(student => (
                        <div key={student.id} className="py-2 flex justify-between items-center text-xs">
                          <span className="font-black text-philsa-navy">{student.name}</span>
                          <span className="font-mono text-[9px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            Seat {student.seat}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <p className="text-[10px] text-amber-600 font-bold leading-normal">
                    * All candidates must be audited (marked as Present, Late, Absent, or Technical Issue) on the Attendance page before the session can be distributed.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setWarningModalSchId(null);
                      navigate('/proctor/attendance');
                    }}
                    className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer text-center flex items-center justify-center gap-2 shadow-md shadow-indigo-600/10"
                  >
                    <ArrowRight className="w-4 h-4" /> Go to Attendance Page
                  </button>
                  <button
                    onClick={() => setWarningModalSchId(null)}
                    className="px-6 py-3.5 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer text-center"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
