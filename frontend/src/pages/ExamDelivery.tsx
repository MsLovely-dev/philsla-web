import { useState, useEffect, useMemo, useRef } from 'react';
import { usePhilSA } from '../PhilSAContext';
import { useMockData } from '../services/mockService';
import { 
  Timer, Send, Shield, ChevronLeft, ChevronRight, 
  AlertCircle, Play, Camera, Mic, Wifi, Maximize, 
  Cpu, CheckCircle, RefreshCw, Flag, Search, 
  Eye, Monitor, AlertTriangle, Smartphone, UserCheck, Map, ArrowRight,
  Volume2, Lock, Check, Activity, RotateCcw, FileText, Info, HelpCircle,
  Database, WifiOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Logo } from '../components/Logo';

// --- AUDIO SYNTHESIS UTILITIES ---
const playChimeSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    // Double bell-like chime
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    osc.start();
    
    osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.15); // A5
    gain.gain.setValueAtTime(0.25, ctx.currentTime + 0.15);
    
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc.stop(ctx.currentTime + 0.8);
  } catch (e) {
    console.warn('Web Audio not fully loaded or blocked by browser user gesture policies:', e);
  }
};

const playShutterSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const bufferSize = ctx.sampleRate * 0.12;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1200;
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    
    noise.start();
    noise.stop(ctx.currentTime + 0.12);
  } catch (e) {
    console.warn('Web Audio not fully loaded or blocked:', e);
  }
};

// --- MOCK QUESTIONS DATA ---
const SUBJECTS = ['Mathematics', 'Science', 'English', 'Abstract Reasoning'];

const GENERATED_QUESTIONS = SUBJECTS.flatMap((subject, sIdx) => 
  Array.from({ length: 10 }).map((_, qIdx) => ({
    id: `q-${sIdx}-${qIdx}`,
    subject,
    text: `[${subject}] This is a sample question number ${qIdx + 1} for assessment. Which is the correct theoretical approach for this scenario?`,
    options: ['Hypothesis Alpha', 'Theorem Beta', 'Protocol Gamma', 'System Delta'],
    correctAnswer: 'Hypothesis Alpha',
    points: 10
  }))
);

// Shuffle helper
const shuffleArray = (array: any[]) => [...array].sort(() => Math.random() - 0.5);

export default function ExamDelivery({ inlineMode = false }: { inlineMode?: boolean }) {
  const { user, addAuditLog, addTicket } = usePhilSA();
  const { applications } = useMockData();
  
  // Support Ticket States
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportEmail, setSupportEmail] = useState(user?.email || '');
  const [supportCategory, setSupportCategory] = useState('Lost connection');
  const [supportDesc, setSupportDesc] = useState('');
  const [supportRefNum, setSupportRefNum] = useState('');
  const [isSupportSubmitted, setIsSupportSubmitted] = useState(false);
  
  // Dynamic offline detection but also allow manual toggle for easy testing
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);
  const [hasManuallyToggled, setHasManuallyToggled] = useState<boolean>(false);

  useEffect(() => {
    if (!hasManuallyToggled && user) {
      if (user.id === 'student-active' || user.email === 'stud3takeexam@philsa.edu.ph' || user.firstName === 'Juan Carlos') {
        setIsOfflineMode(false);
      } else if (user.id === 'student-offline' || user.email === 'stud3.1takeexamoffline@philsa.edu.ph' || user.firstName?.includes('Offline')) {
        setIsOfflineMode(true);
      } else {
        const isUserOffline = user.firstName?.toLowerCase().includes('offline') || user.candidateId?.includes('OFFLINE');
        const hasOfflineApp = applications?.some(app => app.userId === user.id && app.isOfflineMode);
        setIsOfflineMode(!!(isUserOffline || hasOfflineApp));
      }
    }
  }, [user, applications, hasManuallyToggled]);

  const [appState, setAppState] = useState<'READINESS' | 'WAITING' | 'EXAM' | 'FINISHED'>('READINESS');
  const [activeStep, setActiveStep] = useState(0); // 0 to 6
  
  // Interactive Check States
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [webcamStatus, setWebcamStatus] = useState<'idle' | 'recording' | 'recorded'>('idle');
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [recordingTimeLeft, setRecordingTimeLeft] = useState(5);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [isPlaybackFinished, setIsPlaybackFinished] = useState(false);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micLevelFrameRef = useRef<number | null>(null);

  // Snapshot states
  const [studentPhoto, setStudentPhoto] = useState<string | null>(null);
  const [isPhotoCounting, setIsPhotoCounting] = useState(false);
  const [photoCount, setPhotoCount] = useState(3);
  
  const [studentIdCard, setStudentIdCard] = useState<string | null>(null);
  const [isIdCounting, setIsIdCounting] = useState(false);
  const [idCount, setIdCount] = useState(3);
  
  // Environment Check states
  const [audioPlayed, setAudioPlayed] = useState(false);
  const [audioChimeVerified, setAudioChimeVerified] = useState(false);
  const [micActiveLevel, setMicActiveLevel] = useState(25);
  const [wifiChecked, setWifiChecked] = useState<'idle' | 'testing' | 'completed'>('idle');
  const [wifiProgress, setWifiProgress] = useState(0);
  const [wifiStats, setWifiStats] = useState({ ping: 12, download: 48, upload: 18 });
  const [securityScanned, setSecurityScanned] = useState<'idle' | 'scanning' | 'completed'>('idle');
  const [securityProgress, setSecurityProgress] = useState(0);
  const [securityLogs, setSecurityLogs] = useState<string[]>([]);
  
  // Tauri Offline-specific states
  const [tauriHandshake, setTauriHandshake] = useState<'idle' | 'testing' | 'completed'>('idle');
  const [tauriHandshakeProgress, setTauriHandshakeProgress] = useState(0);
  const [tauriLogs, setTauriLogs] = useState<string[]>([]);
  
  const [offlineDbVerified, setOfflineDbVerified] = useState<'idle' | 'testing' | 'completed'>('idle');
  const [offlineDbProgress, setOfflineDbProgress] = useState(0);
  const [offlineDbLogs, setOfflineDbLogs] = useState<string[]>([]);
  
  // Additional rules
  const [rulesChecked, setRulesChecked] = useState(false);
  
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [timeLeft, setTimeLeft] = useState(3600); // 1 hour
  const [isFinishing, setIsFinishing] = useState(false);
  const [cheatWarning, setCheatWarning] = useState<string | null>(null);

  // Steps definition matching Respondus mockup
  const steps = [
    { id: 'terms', label: '1. Terms of Use' },
    { id: 'webcam', label: '2. WEBCAM CHECK' },
    { id: 'photo', label: '3. STUDENT PHOTO' },
    { id: 'show_id', label: '4. SHOW ID' },
    { id: 'environment', label: '5. ENVIRONMENT CHECK' },
    { id: 'additional_instructions', label: '6. ADDITIONAL INSTRUCTIONS' },
    { id: 'begin_exam', label: '7. Begin Exam' }
  ];

  // Webcam media initialization and control. Kept alive through step 4
  // (Environment Check) too, not just 1-3, so the mic-level meter there can
  // read the real audio track instead of only the camera-check steps.
  //
  // navigator.mediaDevices itself (not just getUserMedia failing) can be
  // undefined -- insecure origins, some embedded/webview browsers, privacy
  // settings -- and accessing .getUserMedia on it throws synchronously,
  // before the promise chain (and its .catch()) even exists. With no
  // ErrorBoundary anywhere in this app, that uncaught throw blanks the
  // entire page. Guard existence first, and wrap the call itself in
  // try/catch as defense in depth.
  useEffect(() => {
    if (appState === 'READINESS' && (activeStep === 1 || activeStep === 2 || activeStep === 3 || activeStep === 4)) {
      let activeStream: MediaStream | null = null;

      if (!navigator.mediaDevices?.getUserMedia) {
        console.warn("navigator.mediaDevices.getUserMedia is unavailable in this context, launching simulated visual stream.");
        setStream(null);
        return;
      }

      try {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
          .then(s => {
            activeStream = s;
            setStream(s);
            if (videoRef.current) {
              videoRef.current.srcObject = s;
            }
          })
          .catch(err => {
            console.warn("Camera hardware access rejected or not found, launching simulated visual stream.", err);
            setStream(null);
          });
      } catch (err) {
        console.warn("Camera hardware access threw synchronously, launching simulated visual stream.", err);
        setStream(null);
      }

      return () => {
        try {
          if (activeStream) {
            activeStream.getTracks().forEach(track => track.stop());
          }
        } catch {
          // Teardown must never throw past this boundary.
        }
        setStream(null);
      };
    }
  }, [appState, activeStep]);

  // Real mic-level metering from the actual audio track, via Web Audio's
  // AnalyserNode -- replaces the old Math.random() pulse. Only runs on Step
  // 5 (Environment Check), where the meter is actually shown.
  //
  // Everything here is wrapped in try/catch, both setup and teardown. This
  // app has no ErrorBoundary anywhere (a known, pre-existing gap -- see the
  // QR-scanning ticket's identical C1 finding), so any uncaught synchronous
  // throw from a media API unmounts the entire React tree to a blank white
  // page. That's a real risk here specifically: React.StrictMode (see
  // main.tsx) double-invokes every effect once in dev -- mount, cleanup,
  // mount again -- which creates two real AudioContexts in quick
  // succession while the first is still (asynchronously) closing. Browsers
  // cap how many concurrently-live AudioContexts are allowed and throw
  // synchronously past that limit, so this is exactly the kind of edge
  // case that class of bug lives in.
  useEffect(() => {
    if (activeStep !== 4 || !stream) return;

    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let frameId: number | null = null;

    try {
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) return;

      const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextCtor) return;

      audioContext = new AudioContextCtor();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source = audioContext.createMediaStreamSource(new MediaStream(audioTracks));
      source.connect(analyser);
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const data = new Uint8Array(analyser.frequencyBinCount);
      const activeAnalyser = analyser;
      const tick = () => {
        try {
          activeAnalyser.getByteFrequencyData(data);
          const average = data.reduce((sum, value) => sum + value, 0) / data.length;
          setMicActiveLevel(Math.min(100, Math.round((average / 255) * 100)));
        } catch {
          // Stop quietly rather than let a per-frame failure loop forever.
          return;
        }
        frameId = requestAnimationFrame(tick);
        micLevelFrameRef.current = frameId;
      };
      tick();
    } catch (error) {
      console.warn('Real mic-level metering unavailable, leaving the level meter at its last value.', error);
    }

    return () => {
      try {
        if (micLevelFrameRef.current !== null) cancelAnimationFrame(micLevelFrameRef.current);
        source?.disconnect();
        analyser?.disconnect();
        if (audioContext && audioContext.state !== 'closed') {
          audioContext.close().catch(() => {});
        }
      } catch {
        // Teardown must never throw past this boundary -- there is no
        // ErrorBoundary anywhere in this app to catch it.
      } finally {
        audioContextRef.current = null;
        analyserRef.current = null;
      }
    };
  }, [activeStep, stream]);

  // Fallback pulse for the same meter when mic access was denied/unavailable
  // -- keeps the UI from just sitting at zero if there's genuinely no real
  // signal to read.
  useEffect(() => {
    if (activeStep === 4 && !stream) {
      const interval = setInterval(() => {
        setMicActiveLevel(Math.floor(10 + Math.random() * 55));
      }, 120);
      return () => clearInterval(interval);
    }
  }, [activeStep, stream]);

  // Simulated Webcam 5-second video capture
  const startWebcamRecording = () => {
    setWebcamStatus('recording');
    setRecordingProgress(0);
    setRecordingTimeLeft(5);
    
    const interval = setInterval(() => {
      setRecordingTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setWebcamStatus('recorded');
          setPlaybackProgress(0);
          setIsPlaybackFinished(false);
          
          let pbProg = 0;
          const pbInterval = setInterval(() => {
            pbProg += 10;
            setPlaybackProgress(pbProg);
            if (pbProg >= 100) {
              clearInterval(pbInterval);
              setIsPlaybackFinished(true);
            }
          }, 400);
          return 0;
        }
        return prev - 1;
      });
      setRecordingProgress(p => p + 20);
    }, 1000);
  };

  // Snapshot capture functions for photo and id card
  const captureStudentPhoto = () => {
    setIsPhotoCounting(true);
    setPhotoCount(3);
    const interval = setInterval(() => {
      setPhotoCount(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          playShutterSound();
          setIsPhotoCounting(false);
          setStudentPhoto("PHOTO_CAPTURED");
          addAuditLog('SECURITY_CAPTURE', 'Student photo snapshot captured and encrypted.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const captureIdCard = () => {
    setIsIdCounting(true);
    setIdCount(3);
    const interval = setInterval(() => {
      setIdCount(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          playShutterSound();
          setIsIdCounting(false);
          setStudentIdCard("ID_CAPTURED");
          addAuditLog('SECURITY_CAPTURE', 'Student identification permit captured.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startWifiCheck = () => {
    setWifiChecked('testing');
    setWifiProgress(0);
    const interval = setInterval(() => {
      setWifiProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setWifiChecked('completed');
          setWifiStats({
            ping: Math.floor(8 + Math.random() * 6),
            download: Math.floor(45 + Math.random() * 15),
            upload: Math.floor(15 + Math.random() * 8)
          });
          return 100;
        }
        return prev + 10;
      });
    }, 120);
  };

  // Reveal count derived purely from the progress value itself, then the
  // logs array is *replaced* (not appended to) via slice. This is the fix
  // for a real crash: the previous version tracked "which log is next" with
  // a plain mutable variable incremented as a side effect inside a setState
  // updater. React.StrictMode deliberately double-invokes updater functions
  // in dev to catch exactly this kind of impurity -- the second invocation
  // reads the already-incremented index, desyncing it from the logs array
  // and eventually pushing `undefined` into it, which crashes at render
  // time (`undefined.startsWith(...)`) with no ErrorBoundary anywhere in
  // this app to catch it. Deriving the reveal count from `next` instead
  // means both invocations compute the identical result -- idempotent by
  // construction, safe regardless of how many times React calls it.
  function revealedLogs(logs: string[], progress: number): string[] {
    const revealCount = Math.min(logs.length, Math.ceil((progress / 100) * logs.length));
    return logs.slice(0, revealCount);
  }

  const startSecurityScan = () => {
    setSecurityScanned('scanning');
    setSecurityProgress(0);
    setSecurityLogs([]);
    const logs = [
      "Initializing process scan...",
      "Analyzing active network sockets...",
      "Verifying device registry keys...",
      "Scanning dual-monitor configurations...",
      "Checking virtual machine drivers...",
      "Status: SECURE. Workspace locked."
    ];

    const interval = setInterval(() => {
      setSecurityProgress(prev => {
        const next = prev >= 100 ? 100 : prev + 5;
        setSecurityLogs(revealedLogs(logs, next));
        if (next >= 100) {
          clearInterval(interval);
          setSecurityScanned('completed');
        }
        return next;
      });
    }, 50);
  };

  const startTauriHandshake = () => {
    setTauriHandshake('testing');
    setTauriHandshakeProgress(0);
    setTauriLogs([]);
    const logs = [
      "Initializing Tauri desktop client...",
      "Binding window.__TAURI__ IPC hooks...",
      "Enforcing native window lockdown boundaries...",
      "Hooking OS keyboard listeners (Alt+Tab, Windows Key)...",
      "Disabling clipboard copying and screenshot hooks...",
      "Status: SECURE. Tauri Sandbox active."
    ];

    const interval = setInterval(() => {
      setTauriHandshakeProgress(prev => {
        const next = prev >= 100 ? 100 : prev + 5;
        setTauriLogs(revealedLogs(logs, next));
        if (next >= 100) {
          clearInterval(interval);
          setTauriHandshake('completed');
        }
        return next;
      });
    }, 50);
  };

  const startOfflineDbCheck = () => {
    setOfflineDbVerified('testing');
    setOfflineDbProgress(0);
    setOfflineDbLogs([]);
    const logs = [
      "Locating local exam bundle (philsa-2026.db)...",
      "Opening encrypted SQLite database segment...",
      "Verifying SHA-256 cryptographic packet signature...",
      "Checking local write storage capacity...",
      "Verifying biometric buffering block size (2.4 GB free)...",
      "Status: LOADED. 40 secure questions ready."
    ];

    const interval = setInterval(() => {
      setOfflineDbProgress(prev => {
        const next = prev >= 100 ? 100 : prev + 5;
        setOfflineDbLogs(revealedLogs(logs, next));
        if (next >= 100) {
          clearInterval(interval);
          setOfflineDbVerified('completed');
        }
        return next;
      });
    }, 50);
  };

  // Memoize shuffled questions once when exam starts
  const examQuestions = useMemo(() => {
    return shuffleArray(GENERATED_QUESTIONS).map(q => ({
      ...q,
      options: shuffleArray(q.options)
    }));
  }, []);

  const currentSubject = examQuestions[currentIdx]?.subject;

  useEffect(() => {
    if (appState === 'EXAM' && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
      return () => clearInterval(timer);
    }
    if (timeLeft === 0 && appState === 'EXAM') { 
      setAppState('FINISHED'); 
      addAuditLog('EXAM_TIMEOUT', 'Exam automatically submitted due to time limit.');
    }
  }, [appState, timeLeft]);

  // Simulate auto-save
  useEffect(() => {
    if (appState === 'EXAM' && Object.keys(answers).length > 0) {
      const saveInterval = setInterval(() => {
        console.log('Autosaving responses...', answers);
      }, 5000);
      return () => clearInterval(saveInterval);
    }
  }, [appState, answers]);

  // Simulate anti-cheat (fullscreen detection)
  useEffect(() => {
    if (appState === 'EXAM') {
      const handleFocus = () => setCheatWarning(null);
      const handleBlur = () => {
        setCheatWarning('Security Alert: Browser focus lost. This event has been logged.');
        addAuditLog('SECURITY_ALERT', 'Student navigated away from the exam window.');
      };
      window.addEventListener('focus', handleFocus);
      window.addEventListener('blur', handleBlur);
      return () => {
        window.removeEventListener('focus', handleFocus);
        window.removeEventListener('blur', handleBlur);
      };
    }
  }, [appState]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startExam = () => {
    setAppState('EXAM');
    addAuditLog('EXAM_START', `Official assessment session initialized for ${user?.id}`);
  };

  const handleFinalSubmit = () => {
    setIsFinishing(false);
    setAppState('FINISHED');
    addAuditLog('EXAM_SUBMIT', `Exam cycle completed. Total answered: ${Object.keys(answers).length}`);
  };

  // --- RENDERING MODES ---

  if (appState === 'READINESS') {
    return (
      <div className={cn(
        "bg-[#e2e8f0] flex flex-col font-sans select-none overflow-hidden",
        inlineMode ? "relative w-full min-h-[85vh] rounded-3xl border border-slate-200" : "fixed inset-0 z-50"
      )}>
        {/* Dynamic Mode Blue/Charcoal Banner */}
        <div className={cn(
          "text-white py-3 px-8 text-[11px] font-black uppercase tracking-[0.15em] flex items-center justify-between shadow-md select-none transition-all duration-300",
          isOfflineMode ? "bg-slate-900 border-b border-slate-800" : "bg-[#1e3a8a]"
        )}>
          <span className="flex items-center gap-2">
            <Shield className={cn("w-4 h-4", isOfflineMode ? "text-amber-400 animate-pulse" : "text-sky-400")} /> 
            {isOfflineMode 
              ? "TAURI SECURE OFFLINE DESKTOP CLIENT - WORKSTATION READINESS" 
              : "LOCKDOWN BROWSER MONITOR - WEBCAM CHECK & PREPARATION"
            }
          </span>
          <span className="font-mono text-slate-300">
            {isOfflineMode ? "PH-DESKTOP V1.2 (TAURI CORE)" : "PH-SECURE V4.1"}
          </span>
        </div>

        {/* Main interactive viewport container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-10 flex items-center justify-center">
          <div className="w-full max-w-5xl bg-white border border-slate-300 rounded-[2rem] flex shadow-2xl overflow-hidden min-h-[500px] md:min-h-[600px]">
            {/* Left Rail (Wizard Navigation Map) */}
            <aside className="w-72 bg-[#f8fafc] border-r border-slate-200 p-8 flex flex-col justify-between shrink-0 hidden md:flex">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <Logo size="sm" />
                  <div className="h-4 w-[1px] bg-slate-300" />
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider">SYSTEM INTEGRITY</p>
                </div>

                {/* PROCTORING ENGINE STATUS DISPLAY */}
                <div className="bg-slate-200/50 p-2.5 rounded-xl border border-slate-200 space-y-1">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">PROCTORING ENGINE</p>
                  {isOfflineMode ? (
                    <div className="flex items-center gap-2 bg-slate-800 text-amber-400 px-3 py-1.5 rounded-lg border border-slate-700 font-mono text-[9px] font-bold uppercase tracking-wider">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      Tauri Offline Sandbox
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 bg-white text-blue-600 px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs font-mono text-[9px] font-bold uppercase tracking-wider">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                      Online Secure Shell
                    </div>
                  )}
                </div>
                
                <div className="relative space-y-5 pl-4 border-l-2 border-slate-100">
                  {steps.map((s, index) => {
                    const isActive = activeStep === index;
                    const isCompleted = index < activeStep;
                    
                    return (
                      <div key={s.id} className="relative flex items-center gap-3 py-1 group select-none">
                        {/* Bullet indicator */}
                        <div className={cn(
                          "absolute -left-[23px] w-5 h-5 rounded-full border-2 flex items-center justify-center text-[8px] font-bold transition-all duration-300",
                          isCompleted ? "bg-emerald-500 border-emerald-500 text-white" :
                          isActive 
                            ? (isOfflineMode ? "bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-500/20" : "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20") 
                            : "bg-white border-slate-300 text-slate-400"
                        )}>
                          {isCompleted ? "✓" : index + 1}
                        </div>
                        
                        <span className={cn(
                          "text-[10px] font-black uppercase tracking-wider transition-colors duration-300",
                          isActive 
                            ? (isOfflineMode ? "text-amber-600 font-extrabold" : "text-blue-600 font-extrabold") 
                            : isCompleted ? "text-slate-500" : "text-slate-400"
                        )}>
                          {s.label.split('. ')[1]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2.5 h-2.5 rounded-full animate-pulse", isOfflineMode ? "bg-amber-500" : "bg-emerald-500")} />
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-700">
                      {isOfflineMode ? "Tauri Offline Sandbox" : "Proctor Feed Active"}
                    </span>
                  </div>
                  {isOfflineMode && <WifiOff className="w-3.5 h-3.5 text-amber-500" />}
                </div>
                <div className="flex items-center gap-2">
                  {isOfflineMode ? <Database className="w-3.5 h-3.5 text-amber-500" /> : <Lock className="w-3.5 h-3.5 text-blue-600" />}
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-700">
                    {isOfflineMode ? "Encrypted Local SQLite" : "Shell Environment"}
                  </span>
                </div>
              </div>
            </aside>

            {/* Right Panel (Active step interface content) */}
            <main className="flex-1 p-8 md:p-12 overflow-y-auto flex flex-col justify-between bg-white">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeStep}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 flex flex-col justify-between"
                >
                  {/* Step 1: Terms of Use */}
                  {activeStep === 0 && (
                    <div className="space-y-6 flex-1 flex flex-col justify-between">
                      <div className="space-y-6">
                        <div className="border-b border-slate-100 pb-4">
                          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Step 1: Terms of Use</h2>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                            {isOfflineMode ? "Tauri Desktop Offline License & Integrity Terms" : "Academic Integrity and Proctoring Terms"}
                          </p>
                        </div>
                        
                        <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                          Please review the licensing agreement, hardware permissions, and academic proctoring conditions carefully before starting the exam.
                        </p>
                        
                        <div className="h-48 overflow-y-auto p-4 border border-slate-200 rounded-xl bg-slate-50 text-[10px] text-slate-600 leading-relaxed font-mono space-y-4">
                          {isOfflineMode ? (
                            <>
                              <p className="font-bold uppercase text-slate-900">PHILSA TAURI OFFLINE APPLICATION COVENANT</p>
                              <p>1. By proceeding inside this native Tauri desktop client, you acknowledge that this client is running in exclusive process confinement mode. System screenshot capture hooks, keylog intercepts, and process monitors are enforced locally at the kernel level by the Tauri Rust core.</p>
                              <p>2. Your exam logs, biometric video frames, and responses will be saved directly to an AES-256 encrypted SQLite volume locally on this workstation's disk storage. Absolute zero cloud transmission will occur during the examination block.</p>
                              <p>3. Following exam submission, you are strictly required to let the proctor sync the encrypted database block or export the `.philsa-secured` file. Deleting, modifying, or tempering with the local database will result in immediate disqualification.</p>
                              <p>4. I certify that I am the registered candidate, and that I am sitting at the designated physical offline testing computer assigned by PhilSA officials.</p>
                            </>
                          ) : (
                            <>
                              <p className="font-bold uppercase text-slate-900">PHILSA SECURE ASSESSMENT ENVIRONMENT AGREEMENT</p>
                              <p>1. By proceeding, you authorize this secure software to launch in exclusive full-screen lock mode. System processes, active sockets, registry checks, network activity, audio feed, and optical streams will be monitored and analyzed for testing integrity.</p>
                              <p>2. Video, Audio, and Screen recordings will be securely transmitted to and stored on the central PhilSA examination servers. These recordings will only be accessible by authorised exam proctors, reviewers, and administrative specialists.</p>
                              <p>3. Any attempt to minimize the examination browser, click outside the window boundaries, disconnect peripheral devices, or display secondary mirrors or monitors will result in an immediate integrity alarm logged to the proctor's command desk.</p>
                              <p>4. I certify that I am the registered candidate, and that I will complete this assessment cycle entirely by myself with no assistance from other persons or devices.</p>
                            </>
                          )}
                        </div>
                        
                        <label className={cn(
                          "flex items-start gap-3 p-4 border rounded-2xl cursor-pointer transition-colors select-none",
                          isOfflineMode 
                            ? "bg-amber-50/50 border-amber-100 hover:bg-amber-50 text-amber-950" 
                            : "bg-blue-50/50 border-blue-100 hover:bg-blue-50 text-blue-950"
                        )}>
                          <input 
                            type="checkbox" 
                            checked={termsAccepted} 
                            onChange={(e) => setTermsAccepted(e.target.checked)}
                            className={cn(
                              "w-4 h-4 border-slate-300 rounded mt-0.5",
                              isOfflineMode ? "text-amber-600 focus:ring-amber-500" : "text-blue-600 focus:ring-blue-500"
                            )} 
                          />
                          <span className="text-xs font-bold leading-snug">
                            {isOfflineMode 
                              ? "I agree to the PhilSA Tauri Offline client terms, local encryption parameters, and security hooks."
                              : "I agree to the PhilSA terms of use, privacy policies, and proctoring surveillance requirements."
                            }
                          </span>
                        </label>
                      </div>
                      
                      <div className="flex justify-end pt-6 border-t border-slate-100 mt-8">
                        <button 
                          disabled={!termsAccepted}
                          onClick={() => setActiveStep(1)}
                          className={cn(
                            "btn-primary py-4 px-10 rounded-2xl text-[10px] uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2",
                            isOfflineMode && "!bg-slate-800 hover:!bg-slate-900 text-amber-400"
                          )}
                        >
                          Agree and Continue <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Webcam Check */}
                  {activeStep === 1 && (
                    <div className="space-y-6 flex-1 flex flex-col justify-between">
                      <div className="space-y-6">
                        <div className="border-b border-slate-100 pb-4">
                          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Step 2: Webcam Check</h2>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Video and Capture Feed Test</p>
                        </div>
                        
                        <div className="grid md:grid-cols-2 gap-8 items-start">
                          <div className="space-y-4">
                            <p className="text-xs font-bold text-slate-700 leading-relaxed">Adjust the camera so your image appears properly in the window.</p>
                            <p className="text-xs text-slate-500 leading-relaxed">
                              While speaking in your normal voice (say the alphabet or count to 10), click <strong className="text-slate-800">"Record Five Second Video"</strong>.
                            </p>
                            <p className="text-[11px] text-slate-400 font-medium italic">
                              (This video is temporary and will only be used to verify visual clarity).
                            </p>
                            
                            <div className="pt-4 space-y-4">
                              {webcamStatus === 'idle' && (
                                <button 
                                  onClick={startWebcamRecording}
                                  className="w-full py-4 bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl shadow-blue-500/10 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                  <Camera className="w-4 h-4" /> Record Five Second Video
                                </button>
                              )}
                              
                              {webcamStatus === 'recording' && (
                                <div className="space-y-3 bg-red-50 border border-red-100 p-4 rounded-2xl">
                                  <div className="flex items-center justify-between text-[11px] font-bold text-red-600">
                                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-red-600 rounded-full animate-ping" /> Recording active...</span>
                                    <span>{recordingTimeLeft}s remaining</span>
                                  </div>
                                  <div className="w-full h-1.5 bg-red-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-red-600 transition-all duration-1000" style={{ width: `${recordingProgress}%` }} />
                                  </div>
                                </div>
                              )}
                              
                              {webcamStatus === 'recorded' && (
                                <div className="space-y-4 bg-slate-50 border border-slate-200 p-5 rounded-2xl">
                                  <p className="text-[11px] font-bold text-slate-700 mb-1">Simulated Video Playback:</p>
                                  <div className="space-y-2">
                                    <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                      <span>{isPlaybackFinished ? 'Playback Complete' : 'Playing back recording...'}</span>
                                      <span>{playbackProgress}%</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                      <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${playbackProgress}%` }} />
                                    </div>
                                  </div>
                                  
                                  <div className="pt-3 border-t border-slate-200 space-y-2">
                                    <p className="text-xs font-bold text-slate-900 leading-normal">Did you see and hear your recorded video clearly?</p>
                                    <div className="flex gap-3">
                                      <button 
                                        onClick={() => setActiveStep(2)} 
                                        disabled={!isPlaybackFinished}
                                        className="flex-1 py-3 bg-emerald-600 disabled:opacity-30 text-white font-bold text-[10px] uppercase tracking-wider rounded-xl hover:bg-emerald-700 transition-all"
                                      >
                                        Yes, it is working
                                      </button>
                                      <button 
                                        onClick={() => setWebcamStatus('idle')}
                                        className="flex-1 py-3 bg-white border border-slate-300 text-slate-700 font-bold text-[10px] uppercase tracking-wider rounded-xl hover:bg-slate-50 transition-all"
                                      >
                                        No, record again
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              <button 
                                onClick={() => setActiveStep(2)}
                                className="w-full py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                              >
                                It's not working • Bypass
                              </button>
                            </div>
                          </div>
                          
                          <div className="w-full aspect-video bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-xl relative flex items-center justify-center">
                            {stream ? (
                              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                            ) : (
                              <div className="text-center p-6 space-y-4">
                                <div className="w-16 h-16 rounded-full bg-blue-500/10 border-2 border-dashed border-blue-500/30 flex items-center justify-center mx-auto text-blue-400 animate-pulse">
                                  <Camera className="w-6 h-6" />
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[11px] font-bold text-blue-400 uppercase tracking-widest">Active Scan Simulation</p>
                                  <p className="text-[10px] text-slate-500 max-w-[200px] mx-auto leading-normal">Optical hardware loop established. Scan active.</p>
                                </div>
                                <div className="absolute inset-x-0 h-0.5 bg-blue-500/30 top-0 animate-scanline pointer-events-none" />
                              </div>
                            )}
                            <span className="absolute top-4 right-4 bg-black/60 backdrop-blur-md text-[8px] font-mono font-bold text-white px-2 py-1 rounded tracking-widest uppercase">
                              LIVE OPTICAL
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between pt-6 border-t border-slate-100 mt-8">
                        <button onClick={() => setActiveStep(0)} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600">
                          Back
                        </button>
                        <div />
                      </div>
                    </div>
                  )}

                  {/* Step 3: Student Photo */}
                  {activeStep === 2 && (
                    <div className="space-y-6 flex-1 flex flex-col justify-between">
                      <div className="space-y-6">
                        <div className="border-b border-slate-100 pb-4">
                          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Step 3: Student Photo</h2>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Candidate Portrait Capture</p>
                        </div>
                        
                        <div className="grid md:grid-cols-2 gap-8 items-center">
                          <div className="space-y-4">
                            <p className="text-xs font-bold text-slate-700 leading-relaxed">Align your face in the center of the frame and click "Take Snapshot".</p>
                            <p className="text-xs text-slate-500 leading-relaxed">
                              Ensure your head and shoulders fit nicely within the guides. Your official face capture will be embedded into your proctored session record.
                            </p>
                            
                            <div className="pt-4 space-y-3">
                              {!studentPhoto ? (
                                <button 
                                  onClick={captureStudentPhoto}
                                  disabled={isPhotoCounting}
                                  className="w-full py-4 bg-blue-600 disabled:opacity-60 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl shadow-blue-500/10 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                                >
                                  <Camera className="w-4 h-4" /> {isPhotoCounting ? `Capturing in ${photoCount}...` : 'Capture Student Photo'}
                                </button>
                              ) : (
                                <div className="space-y-3">
                                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-[11px] font-bold flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" /> Snapshot successfully captured!
                                  </div>
                                  <div className="flex gap-3">
                                    <button 
                                      onClick={() => setActiveStep(3)}
                                      className="flex-1 py-3 bg-blue-600 text-white font-bold text-[10px] uppercase tracking-wider rounded-xl hover:bg-blue-700 transition-all"
                                    >
                                      Save Photo &amp; Continue
                                    </button>
                                    <button 
                                      onClick={() => setStudentPhoto(null)}
                                      className="flex-1 py-3 bg-white border border-slate-300 text-slate-700 font-bold text-[10px] uppercase tracking-wider rounded-xl hover:bg-slate-50 transition-all"
                                    >
                                      Retake photo
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="w-full aspect-video bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-xl relative flex items-center justify-center">
                            {studentPhoto ? (
                              <div className="w-full h-full relative flex items-center justify-center p-6 bg-[#0f172a]">
                                <div className="bg-white p-4 rounded-xl border-4 border-slate-200 shadow-xl w-36 text-center space-y-2 relative overflow-hidden">
                                  <div className="w-full aspect-square bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden border border-slate-200">
                                    <UserCheck className="w-12 h-12 text-slate-400" />
                                  </div>
                                  <div className="space-y-0.5">
                                    <p className="text-[9px] font-black text-slate-800 uppercase tracking-tight truncate">{user?.firstName} {user?.lastName}</p>
                                    <p className="text-[7px] font-mono font-bold text-slate-400 uppercase tracking-wider">{user?.candidateId || 'CAND-2026-8803'}</p>
                                  </div>
                                  <div className="absolute top-0 right-0 bg-blue-600 text-white text-[5px] font-black px-2 py-0.5 uppercase tracking-widest rotate-45 translate-x-3 translate-y-1">
                                    VERIFIED
                                  </div>
                                </div>
                              </div>
                            ) : stream ? (
                              <div className="relative w-full h-full">
                                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                                {isPhotoCounting && (
                                  <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
                                    <span className="text-5xl font-black text-white animate-ping">{photoCount}</span>
                                  </div>
                                )}
                                <div className="absolute inset-0 border border-dashed border-white/20 rounded-2xl m-6 pointer-events-none flex items-center justify-center">
                                  <div className="w-40 h-40 border border-white/40 rounded-full" />
                                </div>
                              </div>
                            ) : (
                              <div className="text-center p-6 space-y-4">
                                <div className="w-16 h-16 rounded-full bg-blue-500/10 border-2 border-dashed border-blue-500/30 flex items-center justify-center mx-auto text-blue-400 animate-pulse">
                                  <UserCheck className="w-6 h-6" />
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[11px] font-bold text-blue-400 uppercase tracking-widest">Portrait Camera Feed</p>
                                  <p className="text-[10px] text-slate-500 leading-normal">System snapshot framework loaded.</p>
                                </div>
                                {isPhotoCounting && (
                                  <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
                                    <span className="text-5xl font-black text-white animate-ping">{photoCount}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between pt-6 border-t border-slate-100 mt-8">
                        <button onClick={() => setActiveStep(1)} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600">
                          Back
                        </button>
                        <div />
                      </div>
                    </div>
                  )}

                  {/* Step 4: Show ID */}
                  {activeStep === 3 && (
                    <div className="space-y-6 flex-1 flex flex-col justify-between">
                      <div className="space-y-6">
                        <div className="border-b border-slate-100 pb-4">
                          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Step 4: Show ID</h2>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Candidate Credential Verification</p>
                        </div>
                        
                        <div className="grid md:grid-cols-2 gap-8 items-center">
                          <div className="space-y-4">
                            <p className="text-xs font-bold text-slate-700 leading-relaxed">Hold your school ID or Exam Permit up to the webcam and click "Capture ID Image".</p>
                            <p className="text-xs text-slate-500 leading-relaxed">
                              Ensure the photo and your full legal name on the physical card or document are clearly readable inside the dotted outline box.
                            </p>
                            
                            <div className="pt-4 space-y-3">
                              {!studentIdCard ? (
                                <button 
                                  onClick={captureIdCard}
                                  disabled={isIdCounting}
                                  className="w-full py-4 bg-blue-600 disabled:opacity-60 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl shadow-blue-500/10 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                                >
                                  <Camera className="w-4 h-4" /> {isIdCounting ? `Capturing in ${idCount}...` : 'Capture ID Image'}
                                </button>
                              ) : (
                                <div className="space-y-3">
                                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-[11px] font-bold flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" /> ID verification image captured!
                                  </div>
                                  <div className="flex gap-3">
                                    <button 
                                      onClick={() => setActiveStep(4)}
                                      className="flex-1 py-3 bg-blue-600 text-white font-bold text-[10px] uppercase tracking-wider rounded-xl hover:bg-blue-700 transition-all"
                                    >
                                      Save ID &amp; Continue
                                    </button>
                                    <button 
                                      onClick={() => setStudentIdCard(null)}
                                      className="flex-1 py-3 bg-white border border-slate-300 text-slate-700 font-bold text-[10px] uppercase tracking-wider rounded-xl hover:bg-slate-50 transition-all"
                                    >
                                      Retake ID
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="w-full aspect-video bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-xl relative flex items-center justify-center">
                            {studentIdCard ? (
                              <div className="w-full h-full relative flex items-center justify-center p-6 bg-[#0f172a]">
                                <div className="bg-gradient-to-br from-slate-800 to-slate-950 p-4 rounded-xl border border-slate-700 shadow-2xl w-56 text-left text-white space-y-2">
                                  <div className="flex justify-between items-start">
                                    <span className="text-[6px] font-black uppercase tracking-widest text-slate-400">PH STUDENT SYSTEM</span>
                                    <Shield className="w-3.5 h-3.5 text-blue-500" />
                                  </div>
                                  <div className="space-y-0.5">
                                    <p className="text-[7px] text-slate-500 font-bold uppercase tracking-wider">CANDIDATE PERMIT</p>
                                    <p className="text-[11px] font-extrabold uppercase tracking-tight truncate">{user?.firstName} {user?.lastName}</p>
                                  </div>
                                  <div className="flex justify-between items-end border-t border-slate-800 pt-1.5 mt-2">
                                    <p className="text-[5px] font-mono text-slate-500">{user?.candidateId ? `${user.candidateId}-PERMIT` : 'CAND-2026-8803-PERMIT'}</p>
                                    <span className="text-[6px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold px-1.5 py-0.5 rounded uppercase">
                                      VALID
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ) : stream ? (
                              <div className="relative w-full h-full">
                                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                                {isIdCounting && (
                                  <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
                                    <span className="text-5xl font-black text-white animate-ping">{idCount}</span>
                                  </div>
                                )}
                                <div className="absolute inset-0 border border-dashed border-white/50 rounded-xl m-6 pointer-events-none flex items-center justify-center">
                                  <div className="w-48 h-28 border-2 border-dashed border-blue-500/60 rounded-lg" />
                                </div>
                              </div>
                            ) : (
                              <div className="text-center p-6 space-y-4">
                                <div className="w-16 h-16 rounded-full bg-blue-500/10 border-2 border-dashed border-blue-500/30 flex items-center justify-center mx-auto text-blue-400 animate-pulse">
                                  <Smartphone className="w-6 h-6" />
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[11px] font-bold text-blue-400 uppercase tracking-widest">ID Card Camera Ready</p>
                                  <p className="text-[10px] text-slate-500 leading-normal">Align credentials in rectangular frame outline.</p>
                                </div>
                                {isIdCounting && (
                                  <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
                                    <span className="text-5xl font-black text-white animate-ping">{idCount}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between pt-6 border-t border-slate-100 mt-8">
                        <button onClick={() => setActiveStep(2)} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600">
                          Back
                        </button>
                        <div />
                      </div>
                    </div>
                  )}

                  {/* Step 5: Environment Check */}
                  {activeStep === 4 && (
                    <div className="space-y-6 flex-1 flex flex-col justify-between">
                      <div className="space-y-6">
                        <div className="border-b border-slate-100 pb-4">
                          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Step 5: Environment Check</h2>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                            {isOfflineMode 
                              ? "Acoustic, Tauri Sandbox & Encrypted DB Verification" 
                              : "Acoustic, Bandwidth & Security Verification"
                            }
                          </p>
                        </div>
                        
                        <div className="grid md:grid-cols-3 gap-6">
                          {/* Audio Feed Check (Common for both) */}
                          <div className={cn(
                            "border p-5 rounded-2xl space-y-4 transition-all duration-300",
                            isOfflineMode ? "bg-slate-50 border-amber-100" : "bg-[#f8fafc] border-slate-200"
                          )}>
                            <div className={cn("flex items-center gap-2", isOfflineMode ? "text-amber-950" : "text-blue-955")}>
                              <Mic className={cn("w-4.5 h-4.5 shrink-0", isOfflineMode ? "text-amber-500" : "text-blue-600")} />
                              <h4 className="text-[11px] font-black uppercase tracking-wider">1. Audio Feed Check</h4>
                            </div>
                            <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                              Test audio playback and verify microphone responsiveness.
                            </p>
                            
                            <div className="space-y-3 pt-2">
                              <button 
                                onClick={() => {
                                  playChimeSound();
                                  setAudioPlayed(true);
                                }}
                                className={cn(
                                  "w-full py-2.5 bg-white border rounded-xl transition-colors text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5",
                                  isOfflineMode ? "border-amber-200 hover:bg-amber-50 text-amber-850 animate-pulse" : "border-slate-200 hover:bg-slate-50 text-slate-700"
                                )}
                              >
                                <Volume2 className={cn("w-4 h-4 animate-pulse", isOfflineMode ? "text-amber-500" : "text-blue-500")} /> Play Test Chime
                              </button>
                              
                              {audioPlayed && (
                                <div className={cn(
                                  "bg-white border rounded-xl p-3 space-y-2",
                                  isOfflineMode ? "border-amber-100" : "border-blue-100"
                                )}>
                                  <p className={cn("text-[9px] font-bold leading-normal", isOfflineMode ? "text-amber-800" : "text-blue-800")}>Did you hear the chime clearly?</p>
                                  <div className="flex gap-2">
                                    <button 
                                      onClick={() => setAudioChimeVerified(true)} 
                                      className={cn(
                                        "flex-1 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all",
                                        audioChimeVerified 
                                          ? (isOfflineMode ? "bg-amber-600 text-white" : "bg-emerald-600 text-white") 
                                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                      )}
                                    >
                                      Yes
                                    </button>
                                    <button 
                                      onClick={() => setAudioChimeVerified(false)} 
                                      className="flex-1 py-1 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg text-[9px] font-black uppercase tracking-wider"
                                    >
                                      No
                                    </button>
                                  </div>
                                </div>
                              )}
                              
                              <div className="space-y-1 pt-1">
                                <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-slate-400">
                                  <span>Active Mic Level:</span>
                                  <span>Fluctuating</span>
                                </div>
                                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex items-end">
                                  <div className={cn("h-full transition-all duration-100", isOfflineMode ? "bg-amber-500" : "bg-blue-500")} style={{ width: `${micActiveLevel}%` }} />
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Second Column: Online Wifi vs Offline Tauri Core */}
                          {!isOfflineMode ? (
                            <div className="bg-[#f8fafc] border border-slate-200 p-5 rounded-2xl space-y-4">
                              <div className="flex items-center gap-2 text-blue-900">
                                <Wifi className="w-4.5 h-4.5 shrink-0 text-blue-600" />
                                <h4 className="text-[11px] font-black uppercase tracking-wider">2. Connectivity Test</h4>
                              </div>
                              <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                                Verify bandwidth and latency uplink speed to PhilSA servers.
                              </p>
                              
                              <div className="space-y-3 pt-2">
                                {wifiChecked === 'idle' && (
                                  <button 
                                    onClick={startWifiCheck}
                                    className="w-full py-3 bg-blue-600 text-white font-bold text-[9px] uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-500/10"
                                  >
                                    Run Bandwidth Check
                                  </button>
                                )}
                                
                                {wifiChecked === 'testing' && (
                                  <div className="space-y-2 pt-2">
                                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-blue-600">
                                      <span>Pinging central relay...</span>
                                      <span>{wifiProgress}%</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-blue-100 rounded-full overflow-hidden">
                                      <div className="h-full bg-blue-600 transition-all duration-100" style={{ width: `${wifiProgress}%` }} />
                                    </div>
                                  </div>
                                )}
                                
                                {wifiChecked === 'completed' && (
                                  <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-1.5 text-[9px] font-bold text-slate-700">
                                    <div className="flex justify-between border-b border-slate-100 pb-1">
                                      <span>Ping Latency:</span>
                                      <span className="text-emerald-600 font-mono">{wifiStats.ping} ms (Excellent)</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-100 pb-1">
                                      <span>Download Speed:</span>
                                      <span className="text-slate-900 font-mono">{wifiStats.download} Mbps</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Uplink Speed:</span>
                                      <span className="text-slate-900 font-mono">{wifiStats.upload} Mbps</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="bg-slate-50 border border-amber-100 p-5 rounded-2xl space-y-4">
                              <div className="flex items-center gap-2 text-amber-900">
                                <Cpu className="w-4.5 h-4.5 shrink-0 text-amber-500 animate-spin-slow" />
                                <h4 className="text-[11px] font-black uppercase tracking-wider">2. Tauri Sandboxing</h4>
                              </div>
                              <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                                Enforce OS kernel confinement & hook IPC native listeners.
                              </p>
                              
                              <div className="space-y-3 pt-2">
                                {tauriHandshake === 'idle' && (
                                  <button 
                                    onClick={startTauriHandshake}
                                    className="w-full py-3 bg-slate-800 hover:bg-slate-950 text-amber-400 font-bold text-[9px] uppercase tracking-widest rounded-xl transition-all shadow-md shadow-amber-500/10"
                                  >
                                    Run Tauri Handshake
                                  </button>
                                )}
                                
                                {tauriHandshake === 'testing' && (
                                  <div className="space-y-2 pt-2">
                                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-amber-600">
                                      <span>Injecting hook system...</span>
                                      <span>{tauriHandshakeProgress}%</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-amber-100 rounded-full overflow-hidden">
                                      <div className="h-full bg-amber-500 transition-all duration-100" style={{ width: `${tauriHandshakeProgress}%` }} />
                                    </div>
                                  </div>
                                )}
                                
                                {(tauriHandshake === 'testing' || tauriHandshake === 'completed') && (
                                  <div className="bg-slate-950 text-[8px] font-mono p-3 rounded-xl text-amber-300 h-20 overflow-y-auto space-y-1 select-none scrollbar-none">
                                    {tauriLogs.map((l, i) => (
                                      <p key={i} className={cn(l.startsWith('Status:') ? "text-emerald-400 font-bold" : "text-amber-300/80")}>
                                        {l}
                                      </p>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* Third Column: Online Security Scan vs Offline SQLite DB Decrypt Check */}
                          {!isOfflineMode ? (
                            <div className="bg-[#f8fafc] border border-slate-200 p-5 rounded-2xl space-y-4">
                              <div className="flex items-center gap-2 text-blue-900">
                                <Shield className="w-4.5 h-4.5 shrink-0 text-blue-600" />
                                <h4 className="text-[11px] font-black uppercase tracking-wider">3. Workstation Audit</h4>
                              </div>
                              <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                                Check hardware monitors, screen sharing block, and restricted background apps.
                              </p>
                              
                              <div className="space-y-3 pt-2">
                                {securityScanned === 'idle' && (
                                  <button 
                                    onClick={startSecurityScan}
                                    className="w-full py-3 bg-blue-600 text-white font-bold text-[9px] uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-500/10"
                                  >
                                    Scan Workstation
                                  </button>
                                )}
                                
                                {securityScanned === 'scanning' && (
                                  <div className="space-y-2 pt-2">
                                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-blue-600">
                                      <span>Auditing registers...</span>
                                      <span>{securityProgress}%</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-blue-100 rounded-full overflow-hidden">
                                      <div className="h-full bg-blue-600 transition-all duration-100" style={{ width: `${securityProgress}%` }} />
                                    </div>
                                  </div>
                                )}
                                
                                {(securityScanned === 'scanning' || securityScanned === 'completed') && (
                                  <div className="bg-slate-900 text-[8px] font-mono p-3 rounded-xl text-slate-300 h-20 overflow-y-auto space-y-1 select-none scrollbar-none">
                                    {securityLogs.map((l, i) => (
                                      <p key={i} className={cn(l.startsWith('Status:') ? "text-emerald-400 font-bold" : "text-slate-300")}>
                                        {l}
                                      </p>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="bg-slate-50 border border-amber-100 p-5 rounded-2xl space-y-4">
                              <div className="flex items-center gap-2 text-amber-900">
                                <Database className="w-4.5 h-4.5 shrink-0 text-amber-500" />
                                <h4 className="text-[11px] font-black uppercase tracking-wider">3. SQLite Database Check</h4>
                              </div>
                              <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                                Decrypt and signature-audit the offline questions bundle locally.
                              </p>
                              
                              <div className="space-y-3 pt-2">
                                {offlineDbVerified === 'idle' && (
                                  <button 
                                    onClick={startOfflineDbCheck}
                                    className="w-full py-3 bg-slate-800 hover:bg-slate-950 text-amber-400 font-bold text-[9px] uppercase tracking-widest rounded-xl transition-all shadow-md shadow-amber-500/10"
                                  >
                                    Verify Storage Bundle
                                  </button>
                                )}
                                
                                {offlineDbVerified === 'testing' && (
                                  <div className="space-y-2 pt-2">
                                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-amber-600">
                                      <span>Decrypting package...</span>
                                      <span>{offlineDbProgress}%</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-amber-100 rounded-full overflow-hidden">
                                      <div className="h-full bg-amber-500 transition-all duration-100" style={{ width: `${offlineDbProgress}%` }} />
                                    </div>
                                  </div>
                                )}
                                
                                {(offlineDbVerified === 'testing' || offlineDbVerified === 'completed') && (
                                  <div className="bg-slate-950 text-[8px] font-mono p-3 rounded-xl text-amber-300 h-20 overflow-y-auto space-y-1 select-none scrollbar-none">
                                    {offlineDbLogs.map((l, i) => (
                                      <p key={i} className={cn(l.startsWith('Status:') ? "text-emerald-400 font-bold" : "text-amber-300/80")}>
                                        {l}
                                      </p>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex justify-between pt-6 border-t border-slate-100 mt-8">
                        <button onClick={() => setActiveStep(3)} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600">
                          Back
                        </button>
                        
                        <button 
                          disabled={
                            isOfflineMode 
                              ? (!audioChimeVerified || tauriHandshake !== 'completed' || offlineDbVerified !== 'completed')
                              : (!audioChimeVerified || wifiChecked !== 'completed' || securityScanned !== 'completed')
                          }
                          onClick={() => setActiveStep(5)}
                          className={cn(
                            "btn-primary py-4 px-10 rounded-2xl text-[10px] uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2",
                            isOfflineMode && "!bg-slate-800 hover:!bg-slate-900 text-amber-400"
                          )}
                        >
                          Confirm Verification <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 6: Additional Instructions */}
                  {activeStep === 5 && (
                    <div className="space-y-6 flex-1 flex flex-col justify-between">
                      <div className="space-y-6">
                        <div className="border-b border-slate-100 pb-4">
                          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Step 6: Additional Instructions</h2>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                            {isOfflineMode ? "Offline Tauri Confinement Guidelines" : "Exam Compliance Guidelines"}
                          </p>
                        </div>
                        
                        <div className="space-y-4">
                          <p className="text-xs font-bold text-slate-700 leading-normal">Please carefully read the security and environment regulations for this assessment session:</p>
                          
                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="border border-slate-200 p-4 rounded-xl space-y-2 bg-slate-50/50">
                              <span className="text-[8px] font-black uppercase tracking-widest text-red-600 bg-red-50 px-2 py-1 rounded">PROHIBITED Actions</span>
                              <ul className="text-[10px] text-slate-600 space-y-1.5 list-disc pl-4 font-semibold leading-normal">
                                {isOfflineMode ? (
                                  <>
                                    <li>No database manipulation, editing, or copying of local db files.</li>
                                    <li>No debugging tools, system profilers, or resource monitors.</li>
                                    <li>No hotkeys to bypass full-screen mode (Ctrl+Alt+Del, Win+D).</li>
                                    <li>No speaking aloud or other individuals near the computer station.</li>
                                  </>
                                ) : (
                                  <>
                                    <li>No external web browsing, tabs, or software switches.</li>
                                    <li>No secondary displays or screen split mirrors.</li>
                                    <li>No smartwatches, headphones, or cellphones on your desk.</li>
                                    <li>No speaking aloud or other individuals in the room.</li>
                                  </>
                                )}
                              </ul>
                            </div>
                            
                            <div className="border border-slate-200 p-4 rounded-xl space-y-2 bg-slate-50/50">
                              <span className={cn(
                                "text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded",
                                isOfflineMode ? "text-amber-700 bg-amber-50" : "text-blue-600 bg-blue-50"
                              )}>
                                REQUIRED Actions
                              </span>
                              <ul className="text-[10px] text-slate-600 space-y-1.5 list-disc pl-4 font-semibold leading-normal">
                                {isOfflineMode ? (
                                  <>
                                    <li>Keep your face fully illuminated and centered in the local webcam viewport.</li>
                                    <li>Stay at the offline workstation until all questions are completed.</li>
                                    <li>Keep the Tauri client running until the proctor exports your response cache.</li>
                                    <li>Immediately call the physical proctor if hardware or disk warnings occur.</li>
                                  </>
                                ) : (
                                  <>
                                    <li>Keep your face fully illuminated and centered in your camera feed.</li>
                                    <li>Stay at your workstation for the duration of the testing block.</li>
                                    <li>Ensure the examination shell remains fully visible at all times.</li>
                                    <li>For local network loss, continue working offline securely.</li>
                                  </>
                                )}
                              </ul>
                            </div>
                          </div>
                          
                          <label className={cn(
                            "flex items-start gap-3 p-4 border rounded-2xl cursor-pointer transition-colors select-none mt-4",
                            isOfflineMode 
                              ? "bg-amber-50/50 border-amber-100 hover:bg-amber-50 text-amber-950" 
                              : "bg-blue-50/50 border-blue-100 hover:bg-blue-50 text-blue-955"
                          )}>
                            <input 
                              type="checkbox" 
                              checked={rulesChecked} 
                              onChange={(e) => setRulesChecked(e.target.checked)}
                              className={cn(
                                "w-4 h-4 border-slate-300 rounded mt-0.5",
                                isOfflineMode ? "text-amber-600 focus:ring-amber-500" : "text-blue-600 focus:ring-blue-500"
                              )} 
                            />
                            <span className="text-xs font-bold leading-snug">
                              {isOfflineMode 
                                ? "I acknowledge that I have read these offline Tauri security compliance guidelines and understand that tampering with the local binary will trigger immediate proctor disqualification."
                                : "I acknowledge that I have read these compliance instructions and understand that academic integrity violations will trigger immediate proctor disqualification."
                              }
                            </span>
                          </label>
                        </div>
                      </div>
                      
                      <div className="flex justify-between pt-6 border-t border-slate-100 mt-8">
                        <button onClick={() => setActiveStep(4)} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600">
                          Back
                        </button>
                        
                        <button 
                          disabled={!rulesChecked}
                          onClick={() => setActiveStep(6)}
                          className={cn(
                            "btn-primary py-4 px-10 rounded-2xl text-[10px] uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2",
                            isOfflineMode && "!bg-slate-800 hover:!bg-slate-900 text-amber-400"
                          )}
                        >
                          Acknowledge &amp; Continue <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 7: Begin Exam */}
                  {activeStep === 6 && (
                    <div className="space-y-6 flex-1 flex flex-col justify-between">
                      <div className="space-y-6 text-center max-w-md mx-auto pt-8">
                        <div className="w-16 h-16 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 mb-6">
                          <CheckCircle className="w-8 h-8 animate-bounce" />
                        </div>
                        
                        <div className="space-y-1.5">
                          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Step 7: Ready to Begin</h2>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Integrity Checks Complete</p>
                        </div>
                        
                        <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                          Your candidate validation checks have been fully completed. Your system is secure, connected, and authorized.
                        </p>
                        
                        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-center gap-2.5">
                          <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-700">LOCKDOWN CONTAINER SECURITY SEAL ACTIVE</span>
                        </div>
                      </div>
                      
                      <div className="flex justify-between pt-6 border-t border-slate-100 mt-8">
                        <button onClick={() => setActiveStep(5)} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600">
                          Back
                        </button>
                        
                        <button 
                          onClick={() => {
                            addAuditLog('INTEGRITY_CHECK_PASS', 'Student passed all lockdown browser system integrity checks successfully.');
                            setAppState('WAITING');
                          }}
                          className="btn-primary !bg-emerald-600 hover:!bg-emerald-700 py-4 px-10 rounded-2xl text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-emerald-500/10 active:scale-95 transition-all"
                        >
                          Enter Exam Waiting Room <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </main>
          </div>
        </div>

        <div className="bg-slate-100 text-center py-4 border-t border-slate-300">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
            Session ID: {Math.random().toString(36).substring(2, 12).toUpperCase()} • PhilSA Secure Shell v4.1
          </p>
        </div>
      </div>
    );
  }

  if (appState === 'WAITING') {
    return (
      <div className={cn(
        "bg-philsa-bg flex items-center justify-center p-8",
        inlineMode ? "relative w-full min-h-[85vh] rounded-3xl border border-slate-200" : "fixed inset-0 z-50"
      )}>
        <div className="max-w-xl w-full text-center space-y-10">
           <div className="w-24 h-24 bg-blue-50 border border-blue-100 rounded-3xl flex items-center justify-center mx-auto mb-10 text-blue-600 relative">
              <div className="absolute inset-0 bg-blue-100 rounded-3xl animate-ping opacity-20" />
              <Shield className="w-12 h-12" />
           </div>
           
           <h2 className="text-4xl font-black tracking-tight leading-tight text-philsa-navy">WAITING FOR PROCTOR<br />AUTHORIZATION</h2>
           <p className="text-philsa-gray font-medium text-lg leading-relaxed max-w-md mx-auto">
             System checks passed. Your workstation is now locked. Please wait for the remote proctor to initialize the examination block.
           </p>

           <div className="bg-white p-8 rounded-3xl border border-philsa-border shadow-xl space-y-6 text-left max-w-sm mx-auto">
              <div className="flex justify-between items-center text-xs">
                 <span className="text-philsa-gray font-bold uppercase tracking-widest">Candidate</span>
                 <span className="font-bold text-philsa-navy">{user?.firstName} {user?.lastName}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                 <span className="text-philsa-gray font-bold uppercase tracking-widest">Proctor</span>
                 <span className="font-bold text-philsa-navy">Adrias, M.</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                 <span className="text-philsa-gray font-bold uppercase tracking-widest">Security Mode</span>
                 <span className="font-bold text-emerald-600">ENFORCED</span>
              </div>
           </div>

           <div className="flex justify-center pt-8">
              <button 
                onClick={startExam}
                className="btn-primary !bg-philsa-red hover:!bg-red-700 !px-12 py-5 shadow-2xl flex items-center gap-3 active:scale-95 transition-all uppercase tracking-widest text-xs font-black"
              >
                PROCTOR RELEASE RECEIVED <ArrowRight className="w-5 h-5" />
              </button>
           </div>
        </div>
      </div>
    );
  }

  if (appState === 'FINISHED') {
    return (
      <div className={cn(
        "bg-philsa-bg flex items-center justify-center p-8",
        inlineMode ? "relative w-full min-h-[85vh] rounded-3xl border border-slate-200" : "fixed inset-0 z-50"
      )}>
         <div className="max-w-xl w-full card-philsa text-center py-20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] scale-150 rotate-12">
               <Logo size="xl" />
            </div>
            <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-10 border border-emerald-100 shadow-sm">
               <CheckCircle className="w-12 h-12" />
            </div>
            <h2 className="text-4xl font-extrabold text-philsa-navy mb-4 uppercase tracking-tighter">SUCCESSFULLY SUBMITTED</h2>
            <p className="text-philsa-gray mb-12 text-lg font-medium px-4">Your examination results have been encrypted and stored in the central PhilSA vault.</p>
            <div className="bg-slate-50 p-6 rounded-2xl border border-philsa-border mb-12 text-left space-y-4 max-w-sm mx-auto">
               <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                  <span className="text-slate-400">Total Answered</span>
                  <span className="text-philsa-navy">{Object.keys(answers).length} / {examQuestions.length}</span>
               </div>
               <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                  <span className="text-slate-400">Submission Code</span>
                  <span className="text-philsa-red font-mono text-xs">V9X-L2A-7P1</span>
               </div>
            </div>
            <button 
               onClick={() => window.location.href = '/dashboard'} 
               className="btn-primary px-16 py-4 shadow-xl"
            >
               Return to Portal Dashboard
            </button>
         </div>
      </div>
    );
  }

  const q = examQuestions[currentIdx];

  return (
    <div className={cn(
      "bg-white flex flex-col font-sans select-none overflow-hidden",
      inlineMode ? "relative w-full min-h-[85vh] rounded-3xl border border-slate-200" : "fixed inset-0 z-50"
    )}>
      {/* Header */}
      <header className="h-20 bg-white border-b border-philsa-border px-8 flex items-center justify-between shadow-sm relative z-20">
        <div className="flex items-center gap-6">
           <Logo size="sm" />
           <div className="h-6 w-[1px] bg-philsa-border" />
           <div>
              <p className="text-[10px] font-black text-philsa-gray uppercase tracking-widest leading-none mb-1">Secure Session</p>
              <p className="text-sm font-black text-philsa-navy tracking-tight">{currentSubject} | Block 1 / 4</p>
           </div>
        </div>

        {cheatWarning && (
           <motion.div 
             initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
             className="bg-red-600 text-white px-6 py-2 rounded-xl text-xs font-bold flex items-center gap-3 animate-pulse shadow-lg shadow-red-200"
           >
              <AlertTriangle className="w-4 h-4" /> {cheatWarning}
           </motion.div>
        )}

        <div className="flex items-center gap-8">
           <div className="flex items-center gap-3 border border-philsa-border px-4 py-2 rounded-xl bg-slate-50">
              <Timer className="w-4 h-4 text-philsa-red" />
              <p className="font-mono text-xl font-black text-philsa-navy tabular-nums mt-0.5">{formatTime(timeLeft)}</p>
           </div>
           <button onClick={() => setIsFinishing(true)} className="btn-primary !py-3 !px-8 !rounded-xl !text-xs !shadow-none">Finish Block</button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Subject Nav */}
        <aside className="w-72 bg-white border-r border-philsa-border flex flex-col">
           <div className="p-8 pb-4">
              <h3 className="text-[10px] font-black text-philsa-gray uppercase tracking-widest mb-6">Exam Structure</h3>
              <div className="space-y-3">
                 {SUBJECTS.map((sub, i) => (
                   <div key={sub} className={cn(
                     "p-4 rounded-2xl flex items-center gap-4 transition-all border",
                     currentSubject === sub ? "bg-philsa-navy text-white border-philsa-navy shadow-lg" : "bg-white border-philsa-border text-philsa-gray"
                   )}>
                      <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black", currentSubject === sub ? "bg-white/20" : "bg-philsa-bg")}>
                         {i + 1}
                      </div>
                      <span className="text-xs font-bold">{sub}</span>
                   </div>
                 ))}
              </div>
           </div>

           <div className="mt-auto p-8 border-t border-philsa-border bg-slate-50">
              <div className="flex items-center gap-4 mb-6">
                 <div className="w-8 h-8 rounded-full bg-philsa-navy text-white flex items-center justify-center text-[10px] font-black border-2 border-white">
                    {user?.firstName?.[0]}
                 </div>
                 <div>
                    <p className="text-xs font-black text-philsa-navy leading-none mb-0.5">{user?.firstName}</p>
                    <p className="text-[9px] font-bold text-philsa-gray uppercase tracking-widest">Candidate Monitor</p>
                 </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                 <div className="w-full h-1 relative overflow-hidden bg-white rounded-full border border-philsa-border italic">
                    <div className="h-full bg-emerald-500 w-[80%]" />
                 </div>
                 <div className="w-full h-1 relative overflow-hidden bg-white rounded-full border border-philsa-border italic">
                    <div className="h-full bg-emerald-500 w-[95%]" />
                 </div>
                 <div className="w-full h-1 relative overflow-hidden bg-white rounded-full border border-philsa-border italic">
                    <div className="h-full bg-emerald-500 w-[60%]" />
                 </div>
              </div>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-3 text-center">BIOMETRIC FEED ACTIVE</p>
              <button 
                onClick={() => {
                  setSupportEmail(user?.email || '');
                  setSupportDesc('');
                  setSupportRefNum('');
                  setIsSupportSubmitted(false);
                  setShowSupportModal(true);
                }}
                className="mt-4 w-full py-2.5 px-4 bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-300 text-philsa-red rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <HelpCircle className="w-3.5 h-3.5" /> Report Tech Issue
              </button>
           </div>
        </aside>

        {/* Main Exam Area */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-12">
           <div className="max-w-3xl mx-auto space-y-12">
              <div className="flex items-start justify-between">
                 <div>
                    <p className="text-xs font-black text-philsa-red uppercase tracking-widest mb-2">PART {SUBJECTS.indexOf(currentSubject || '') + 1} | Question {currentIdx + 1} of {examQuestions.length}</p>
                    <h2 className="text-3xl font-extrabold text-philsa-navy leading-tight tracking-tight">{q?.text}</h2>
                 </div>
                 <button 
                   onClick={() => setFlagged({...flagged, [q.id]: !flagged[q.id]})}
                   className={cn(
                     "w-12 h-12 rounded-2xl flex items-center justify-center transition-all border shrink-0",
                     flagged[q.id] ? "bg-philsa-red border-philsa-red text-white" : "bg-white border-philsa-border text-philsa-gray hover:border-philsa-red/30"
                   )}
                 >
                    <Flag className={cn("w-5 h-5", flagged[q.id] && "fill-current")} />
                 </button>
              </div>

              <div className="grid gap-4">
                 {q?.options.map((opt, i) => (
                   <button 
                     key={i} 
                     onClick={() => setAnswers({...answers, [q.id]: opt})}
                     className={cn(
                       "text-left p-8 rounded-3xl border-2 transition-all flex items-center gap-6 group relative overflow-hidden",
                       answers[q.id] === opt ? "bg-white border-philsa-red shadow-[0_12px_24px_-8px_rgba(139,13,17,0.15)] ring-4 ring-philsa-red/5" : "bg-white border-philsa-border hover:border-philsa-red/40"
                     )}
                   >
                     {answers[q.id] === opt && <div className="absolute top-0 right-0 w-24 h-24 bg-philsa-red/5 skew-x-[-20deg] px-2" />}
                     <div className={cn(
                       "w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black transition-all",
                       answers[q.id] === opt ? "bg-philsa-red text-white" : "bg-slate-50 text-slate-400 group-hover:text-philsa-red"
                     )}>
                        {String.fromCharCode(65 + i)}
                     </div>
                     <span className={cn("text-lg font-bold", answers[q.id] === opt ? "text-philsa-navy" : "text-philsa-navy")}>{opt}</span>
                   </button>
                 ))}
              </div>

              <div className="flex items-center justify-between pt-12 border-t border-philsa-border">
                 <button 
                   onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
                   disabled={currentIdx === 0}
                   className="flex items-center gap-3 text-sm font-black text-philsa-navy uppercase tracking-widest disabled:opacity-20 transition-all hover:-translate-x-2"
                 >
                   <ChevronLeft className="w-5 h-5" /> Previous
                 </button>
                 <div className="flex gap-4">
                    <button className="text-[10px] font-black text-philsa-gray uppercase tracking-widest bg-white border border-philsa-border px-6 py-2 rounded-xl">Auto-Save Active</button>
                 </div>
                 <button 
                   onClick={() => setCurrentIdx(prev => Math.min(examQuestions.length - 1, prev + 1))}
                   disabled={currentIdx === examQuestions.length - 1}
                   className="flex items-center gap-3 text-sm font-black text-philsa-navy uppercase tracking-widest disabled:opacity-20 transition-all hover:translate-x-2"
                 >
                   Next Item <ChevronRight className="w-5 h-5" />
                 </button>
              </div>
           </div>
        </main>

        {/* Right Nav Palette */}
        <aside className="w-80 bg-white border-l border-philsa-border flex flex-col p-8">
           <h3 className="text-[10px] font-black text-philsa-gray uppercase tracking-widest mb-8">Navigation Palette</h3>
           <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <div className="grid grid-cols-4 gap-3">
                 {examQuestions.map((eq, i) => (
                   <button 
                     key={eq.id}
                     onClick={() => setCurrentIdx(i)}
                     className={cn(
                       "h-12 rounded-xl flex items-center justify-center text-xs font-black border-2 transition-all relative",
                       currentIdx === i ? "border-philsa-navy text-philsa-navy bg-slate-50 ring-4 ring-slate-100" :
                       flagged[eq.id] ? "bg-red-50 border-philsa-red text-philsa-red" :
                       answers[eq.id] ? "bg-philsa-navy text-white border-philsa-navy" : "bg-white border-philsa-border text-slate-400"
                     )}
                   >
                      {i + 1}
                      {flagged[eq.id] && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-600 rounded-full border-2 border-white" />}
                   </button>
                 ))}
              </div>
           </div>

           <div className="mt-10 space-y-4 pt-8 border-t border-philsa-border">
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                 <span className="text-slate-400">Total Answered</span>
                 <span className="text-philsa-navy">{Object.keys(answers).length} / {examQuestions.length}</span>
              </div>
              <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                 <motion.div 
                   initial={{ width: 0 }} 
                   animate={{ width: `${(Object.keys(answers).length / examQuestions.length) * 100}%` }} 
                   className="h-full bg-philsa-navy" 
                 />
              </div>
           </div>
        </aside>
      </div>

      <AnimatePresence>
        {isFinishing && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-philsa-navy/80 backdrop-blur-md">
             <motion.div 
               initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
               className="bg-white rounded-[48px] p-16 max-w-md w-full text-center shadow-2xl relative overflow-hidden"
             >
                <div className="absolute top-0 right-0 p-8 h-full opacity-[0.03] scale-150 pointer-events-none">
                   <Logo size="xl" />
                </div>
                <div className="w-20 h-20 bg-yellow-50 text-yellow-600 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-yellow-100">
                   <Send className="w-10 h-10" />
                </div>
                <h2 className="text-3xl font-black text-philsa-navy mb-4 uppercase tracking-tighter">FINISH EXAMINATION?</h2>
                <p className="text-philsa-gray mb-12 font-medium leading-relaxed">
                   You have answered {Object.keys(answers).length} out of {examQuestions.length} questions. Once submitted, you cannot modify your responses.
                </p>
                <div className="flex flex-col gap-4">
                   <button onClick={handleFinalSubmit} className="btn-primary w-full py-5 !rounded-2xl">Confirm Submission</button>
                   <button onClick={() => setIsFinishing(false)} className="text-philsa-gray font-bold text-xs uppercase tracking-widest hover:text-philsa-navy py-4">Return to Exam</button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Technical Support Modal */}
      <AnimatePresence>
        {showSupportModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-philsa-navy/80 backdrop-blur-md">
             <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 15 }} 
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 15 }}
               className="bg-white rounded-[2.5rem] p-8 max-w-lg w-full shadow-2xl relative overflow-hidden border border-slate-100 text-left"
             >
                <button 
                  onClick={() => setShowSupportModal(false)}
                  className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center font-bold"
                >
                  ✕
                </button>

                <div className="flex items-center gap-4 mb-6 border-b border-slate-100 pb-4">
                  <div className="w-12 h-12 bg-red-50 text-philsa-red rounded-2xl flex items-center justify-center">
                    <HelpCircle className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-philsa-navy uppercase tracking-tight">Technical Support Ticket</h3>
                    <p className="text-xs text-philsa-gray">Immediate dispatch queue for Live Exam issues</p>
                  </div>
                </div>

                {!isSupportSubmitted ? (
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const ref = 'SRN-2026-' + Math.floor(10000 + Math.random() * 90000);
                    setSupportRefNum(ref);
                    setIsSupportSubmitted(true);
                    addTicket({
                      candidateId: user?.candidateId || user?.id || 'CAND-ACTIVE',
                      candidateName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Juan Carlos',
                      contactEmail: supportEmail,
                      phase: 'LIVE_EXAM',
                      subject: `Exam Interruption: ${supportCategory}`,
                      description: supportDesc,
                      status: 'OPEN',
                      priority: 'HIGH',
                      deviceDetails: navigator.userAgent,
                      examRoom: 'Benitez Hall R101'
                    });
                    addAuditLog('HELPDESK_TICKET_SUBMITTED', `Live exam technical support ticket created. Reference: ${ref}, Issue: ${supportCategory}`);
                  }} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-philsa-gray uppercase tracking-widest mb-1">Email address</label>
                      <input 
                        type="email"
                        required
                        value={supportEmail}
                        onChange={(e) => setSupportEmail(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-philsa-navy focus:outline-none focus:ring-2 focus:ring-philsa-red/20 focus:border-philsa-red transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-philsa-gray uppercase tracking-widest mb-1">Issue category</label>
                      <select 
                        value={supportCategory}
                        onChange={(e) => setSupportCategory(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-philsa-navy focus:outline-none focus:ring-2 focus:ring-philsa-red/20 focus:border-philsa-red transition-all"
                      >
                        <option value="Lost Connection / Gateway Timeout">Lost Connection / Gateway Timeout</option>
                        <option value="Workstation Freeze / Browser Lock">Workstation Freeze / Browser Lock</option>
                        <option value="Missing / Corrupt Question Image">Missing / Corrupt Question Image</option>
                        <option value="Keyboard Input / Navigation failure">Keyboard Input / Navigation failure</option>
                        <option value="Biometric Feed Offline error">Biometric Feed Offline error</option>
                        <option value="Other Technical Difficulty">Other Technical Difficulty</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-philsa-gray uppercase tracking-widest mb-1">Briefly explain what happened</label>
                      <textarea 
                        required
                        rows={4}
                        placeholder="Please describe exactly what error you saw, or how we can help you recover your session..."
                        value={supportDesc}
                        onChange={(e) => setSupportDesc(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-philsa-navy placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-philsa-red/20 focus:border-philsa-red transition-all resize-none"
                      />
                    </div>

                    <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 flex gap-3 text-xs text-amber-800 leading-relaxed">
                      <Shield className="w-5 h-5 shrink-0 text-amber-600 mt-0.5 animate-pulse" />
                      <p>
                        <strong>Secure Lockdown Integrity:</strong> Submitting this ticket logs your browser session parameters, client telemetry, and biometric sync logs to expedite proctor recovery. Do not close your browser tab.
                      </p>
                    </div>

                    <button 
                      type="submit"
                      className="w-full btn-primary !bg-philsa-red hover:!bg-red-700 py-4 !rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-red-200 active:scale-95 transition-all cursor-pointer"
                    >
                      <Send className="w-4 h-4" /> Dispatch Support Ticket
                    </button>
                  </form>
                ) : (
                  <div className="space-y-6 py-6 text-center">
                    <div className="w-16 h-16 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto relative">
                      <div className="absolute inset-0 bg-emerald-100 rounded-3xl animate-ping opacity-10" />
                      <CheckCircle className="w-8 h-8" />
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="text-xl font-bold text-philsa-navy">TICKET DISPATCHED</h4>
                      <p className="text-xs text-philsa-gray max-w-sm mx-auto leading-relaxed">
                        Your support ticket has been sent to the on-site Tech Support command center. A technician is being dispatched to your terminal.
                      </p>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 max-w-xs mx-auto">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Ticket Reference Number</p>
                      <p className="text-lg font-black font-mono text-philsa-navy mt-1">{supportRefNum}</p>
                    </div>

                    <button 
                      onClick={() => setShowSupportModal(false)}
                      className="btn-primary !bg-philsa-navy hover:!bg-slate-800 !px-8 py-3 !rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
                    >
                      Return to Examination
                    </button>
                  </div>
                )}
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
