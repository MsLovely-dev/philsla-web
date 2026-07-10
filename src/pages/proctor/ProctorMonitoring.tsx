import { useState, useEffect } from "react";
import {
  Users,
  Monitor,
  Shield,
  AlertTriangle,
  CheckCircle,
  Search,
  Filter,
  Camera,
  VideoOff,
  Activity,
  Cpu,
  RefreshCcw,
  MoreVertical,
  Radio,
  X,
  Play,
  Pause,
  StopCircle,
  Clock,
  Eye,
  Send,
  Database,
  Sparkles,
  Fingerprint,
  UserCheck,
  Download,
  ArrowRight,
  Lock,
  Check,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useLocation, Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { usePhilSA } from "../../PhilSAContext";

const MOCK_ROSTER = [
  {
    id: "STU-2026-001",
    name: "Juan P. Pangilinan",
    status: "Ongoing",
    progress: 45,
    subject: "Reading Comp (English, Filipino)",
    currentQuestion: 24,
    totalQuestions: 60,
    answered: 22,
    unanswered: 38,
    flagged: 0,
    activeQuestionText:
      "Identify the primary function of the PhilSA Ground Station Network in sustainable orbital management.",
    seat: "12A",
    camera: "ON",
    feedUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=facearea&facepad=2&w=400&h=400&q=80",
    incidentLogs: [] as { id: string; time: string; note: string }[],
  },
  {
    id: "STU-2026-002",
    name: "Maria Elena Soriano",
    status: "Ongoing",
    progress: 12,
    subject: "Lang Proficiency (English, Filipino)",
    currentQuestion: 8,
    totalQuestions: 60,
    answered: 5,
    unanswered: 55,
    flagged: 2,
    activeQuestionText:
      "Define the legal framework for domestic satellite registration under current space treaty protocols.",
    seat: "12B",
    camera: "ON",
    feedUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=facearea&facepad=2&w=400&h=400&q=80",
    incidentLogs: [
      { id: "1", time: "10:05 AM", note: "Multiple face detection observed" },
      { id: "2", time: "10:12 AM", note: "Unidentified audio source detected" },
    ],
  },
  {
    id: "STU-2026-003",
    name: "Ricardo M. Silva",
    status: "Ongoing",
    progress: 28,
    subject: "Math",
    currentQuestion: 15,
    totalQuestions: 60,
    answered: 14,
    unanswered: 46,
    flagged: 0,
    seat: "13A",
    camera: "OFF",
    feedUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=facearea&facepad=2&w=400&h=400&q=80",
    activeQuestionText:
      "What is the expected resolution of the upcoming Diwata-3 satellite's multispectral imager?",
    incidentLogs: [],
  },
  {
    id: "STU-2026-004",
    name: "Liza Monica Bautista",
    status: "Completed",
    progress: 100,
    subject: "Science",
    currentQuestion: 60,
    totalQuestions: 60,
    answered: 60,
    unanswered: 0,
    flagged: 0,
    seat: "13B",
    camera: "ON",
    feedUrl:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=facearea&facepad=2&w=400&h=400&q=80",
    activeQuestionText: "Final summary and submission verification module.",
    incidentLogs: [],
  },
  {
    id: "STU-2026-005",
    name: "Enrique S. Gatus",
    status: "Disconnected",
    progress: 0,
    subject: "Reading Comp (English, Filipino)",
    currentQuestion: 1,
    totalQuestions: 60,
    answered: 0,
    unanswered: 60,
    flagged: 0,
    seat: "14A",
    camera: "N/A",
    feedUrl:
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=facearea&facepad=2&w=400&h=400&q=80",
    activeQuestionText: "Connecting to secure exam server...",
    incidentLogs: [],
  },
];

export default function ProctorMonitoring() {
  const { addAuditLog, user } = usePhilSA();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [roster, setRoster] = useState(MOCK_ROSTER);
  const [selectedStudent, setSelectedStudent] = useState<
    (typeof MOCK_ROSTER)[0] | null
  >(null);
  const [confirmAction, setConfirmAction] = useState<{
    studentId: string;
    action: "RESUME" | "PAUSE" | "TERMINATE";
  } | null>(null);

  // New incident report states
  const [activeActionIncidentReport, setActiveActionIncidentReport] = useState<{
    studentId: string;
    studentName: string;
    action: "PAUSE" | "TERMINATE";
    violationType: string;
    severityTier: string;
    notes: string;
    techIssueType?: string;
  } | null>(null);

  const [detailViolationType, setDetailViolationType] =
    useState("Tab Switching");
  const [detailTechIssueType, setDetailTechIssueType] =
    useState("Hardware Malfunction");
  const [detailSeverityTier, setDetailSeverityTier] = useState("HIGH");
  const [detailNotes, setDetailNotes] = useState("");
  const [showToast, setShowToast] = useState("");

  const [batchStatus, setBatchStatus] = useState<'pending' | 'submitting' | 'submitted'>(() => {
    return (localStorage.getItem('philsa_batch_submission_status') as 'pending' | 'submitting' | 'submitted') || 'pending';
  });
  const [batchReceipt, setBatchReceipt] = useState<any>(() => {
    const saved = localStorage.getItem('philsa_batch_submission_receipt');
    return saved ? JSON.parse(saved) : null;
  });
  const [showConfirmSubmitModal, setShowConfirmSubmitModal] = useState(false);
  const [proctorSignature, setProctorSignature] = useState("");
  const [consentChecked, setConsentChecked] = useState(false);
  const [submissionLogs, setSubmissionLogs] = useState<string[]>([]);
  const [currentLogIndex, setCurrentLogIndex] = useState(-1);

  const allFinished = roster.length > 0 && roster.every(
    (s) => s.status === "Completed" || s.status === "Disconnected"
  );

  // Auto-complete roster for testing
  const handleSimulateAllCompleted = () => {
    setRoster(prev => prev.map(s => ({
      ...s,
      status: s.id === "STU-2026-005" ? "Disconnected" : "Completed", // keep one disconnected/terminated for realism
      progress: s.id === "STU-2026-005" ? s.progress : 100,
      currentQuestion: s.id === "STU-2026-005" ? s.currentQuestion : 60,
      answered: s.id === "STU-2026-005" ? s.answered : 60,
      unanswered: 0,
    })));
    setShowToast("Successfully simulated: All exams completed or disconnected!");
    setTimeout(() => setShowToast(""), 3000);
  };

  const handleResetSimulation = () => {
    setRoster(MOCK_ROSTER);
    setBatchStatus('pending');
    setBatchReceipt(null);
    setProctorSignature("");
    setConsentChecked(false);
    localStorage.removeItem('philsa_batch_submission_status');
    localStorage.removeItem('philsa_batch_submission_receipt');
    setShowToast("Simulation state has been reset to default!");
    setTimeout(() => setShowToast(""), 3000);
  };

  const executeBatchSubmission = () => {
    setShowConfirmSubmitModal(false);
    setBatchStatus('submitting');
    setSubmissionLogs([
      "Initiating secure handshake with PhilSA central administrative servers...",
      "Compiling digital answer packet payloads for active seating allocation...",
      "Generating unique SHA-256 integrity check hashes for proctor signatures...",
      "Synchronizing biometric live-feed logs and multi-face incident timelines...",
      "Verifying electronic credentials and registering central transaction keys...",
      "Batch records officially locked, sealed, and archived in central system!"
    ]);
    setCurrentLogIndex(0);
  };

  useEffect(() => {
    if (batchStatus === 'submitting' && currentLogIndex >= 0) {
      if (currentLogIndex < submissionLogs.length) {
        const delay = currentLogIndex === 0 ? 800 : currentLogIndex === submissionLogs.length - 1 ? 1500 : 1000;
        const timer = setTimeout(() => {
          setCurrentLogIndex(prev => prev + 1);
        }, delay);
        return () => clearTimeout(timer);
      } else {
        // finished submitting
        const receiptId = `BATCH-PHILSAR-2026-${Math.floor(100000 + Math.random() * 900000)}`;
        const generatedHash = `SHA256:${Array.from({length:32}, () => Math.floor(Math.random()*16).toString(16)).join('')}`;
        const newReceipt = {
          id: receiptId,
          hash: generatedHash,
          timestamp: new Date().toLocaleString(),
          proctor: location.state?.proctorName || user?.name || "Officer De Leon",
          center: location.state?.centerName || "UST Manila - Thomasian Pavilion",
          totalCandidates: roster.length,
          completed: roster.filter(s => s.status === 'Completed').length,
          terminated: roster.filter(s => s.status === 'Disconnected').length,
          incidents: roster.reduce((acc, s) => acc + s.incidentLogs.length, 0)
        };
        setBatchStatus('submitted');
        setBatchReceipt(newReceipt);
        localStorage.setItem('philsa_batch_submission_status', 'submitted');
        localStorage.setItem('philsa_batch_submission_receipt', JSON.stringify(newReceipt));
        addAuditLog("PHILSA_PROCTOR_BATCH_SUBMITTED", `BATCH: ${receiptId} | PROCTOR: ${newReceipt.proctor} | KEY: ${generatedHash}`);
        setShowToast("Exam batch successfully signed and submitted to central system!");
        setTimeout(() => setShowToast(""), 4000);
      }
    }
  }, [batchStatus, currentLogIndex, submissionLogs]);

  // Dual-sync incident reporting function
  const submitIncidentReport = (
    studentId: string,
    studentName: string,
    type: string,
    severity: string,
    notes: string,
  ) => {
    // 1. Update Candidate Timeline
    setRoster((prev) =>
      prev.map((s) => {
        if (s.id === studentId) {
          return {
            ...s,
            incidentLogs: [
              ...s.incidentLogs,
              {
                id: String(Date.now()),
                time: new Date().toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
                note: `${type} [Severity: ${severity}]: ${notes || "No observation details provided."}`,
              },
            ],
          };
        }
        return s;
      }),
    );

    // If selectedStudent is open, also sync it immediately
    if (selectedStudent?.id === studentId) {
      setSelectedStudent((curr) => {
        if (!curr) return null;
        return {
          ...curr,
          incidentLogs: [
            ...curr.incidentLogs,
            {
              id: String(Date.now()),
              time: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              note: `${type} [Severity: ${severity}]: ${notes || "No observation details provided."}`,
            },
          ],
        };
      });
    }

    // 2. Save to global incidents list in localStorage to sync with IncidentEvidence page
    try {
      const savedStr = localStorage.getItem("philsa_incidents");
      const saved = savedStr
        ? JSON.parse(savedStr)
        : [
            {
              id: "INC-2026-001",
              student: "Juan P. Pangilinan",
              type: "Manual Ref Flag",
              severity: "HIGH",
              time: "2026-05-15 10:15",
              status: "PENDING",
              univ: "UP Diliman",
            },
            {
              id: "INC-2026-002",
              student: "Maria Elena Soriano",
              type: "Tab Switching",
              severity: "MEDIUM",
              time: "2026-05-15 11:02",
              status: "RESOLVED",
              univ: "UST Manila",
            },
            {
              id: "INC-2026-003",
              student: "Ricardo M. Silva",
              type: "External Device",
              severity: "CRITICAL",
              time: "2026-05-14 09:45",
              status: "ESCALATED",
              univ: "DLSU Manila",
            },
            {
              id: "INC-2026-004",
              student: "Liza Monica Bautista",
              type: "Communication",
              severity: "LOW",
              time: "2026-05-14 14:22",
              status: "PENDING",
              univ: "PUP Manila",
            },
            {
              id: "INC-2026-005",
              student: "Federico T. Guzman",
              type: "Unauthorized Material",
              severity: "HIGH",
              time: "2026-05-13 15:10",
              status: "PENDING",
              univ: "UP Diliman",
            },
          ];
      const lastNum = saved.reduce((max: number, item: any) => {
        const match = item.id.match(/INC-2026-(\d+)/);
        if (match) {
          const num = parseInt(match[1]);
          return num > max ? num : max;
        }
        return max;
      }, 5);

      const nextNum = String(lastNum + 1).padStart(3, "0");
      const newId = `INC-2026-${nextNum}`;

      const now = new Date();
      const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      const newCase = {
        id: newId,
        student: studentName,
        type: type,
        severity: severity,
        time: formattedDate,
        status: "PENDING",
        univ: "UP Diliman",
      };

      const updatedIncidents = [newCase, ...saved];
      localStorage.setItem(
        "philsa_incidents",
        JSON.stringify(updatedIncidents),
      );
    } catch (e) {
      console.error(e);
    }

    addAuditLog(
      "INCIDENT_REGISTRY",
      `ACTOR: ${user?.id} | TARGET: ${studentId} | VIOLATION: ${type} | SEVERITY: ${severity} | NOTE: ${notes}`,
    );

    setShowToast(`Incident documented successfully for ${studentName}!`);
    setTimeout(() => setShowToast(""), 4000);
  };

  // Simulate real-time progress updates
  useEffect(() => {
    const interval = setInterval(() => {
      setRoster((prev) =>
        prev.map((s) => {
          if (s.status === "Ongoing" && s.progress < 100) {
            const newProgress = Math.min(
              100,
              s.progress + Math.floor(Math.random() * 2),
            );
            const newQuestion = Math.min(
              60,
              s.currentQuestion + (Math.random() > 0.8 ? 1 : 0),
            );
            return {
              ...s,
              progress: newProgress,
              currentQuestion: newQuestion,
              status: newProgress === 100 ? "Completed" : s.status,
            };
          }
          return s;
        }),
      );
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleControlAction = (
    studentId: string,
    action: "RESUME" | "PAUSE" | "TERMINATE",
  ) => {
    const student = roster.find((s) => s.id === studentId);
    if (!student) return;

    setRoster((prev) =>
      prev.map((s) => {
        if (s.id === studentId) {
          if (action === "PAUSE") return { ...s, status: "Paused" };
          if (action === "RESUME") return { ...s, status: "Ongoing" };
          if (action === "TERMINATE") return { ...s, status: "Disconnected" };
        }
        return s;
      }),
    );

    addAuditLog(
      "SESSION_GOVERNANCE",
      `ACTOR: ${user?.id} | TARGET: ${student.id} | PROTOCOL: ${action} | INSTANT: ${new Date().toISOString()}`,
    );

    if (selectedStudent?.id === studentId) {
      setTimeout(() => {
        setRoster((current) => {
          const updated = current.find((s) => s.id === studentId);
          if (updated) setSelectedStudent(updated);
          return current;
        });
      }, 0);
    }
    if (action === "TERMINATE") setSelectedStudent(null);
  };

  const handleActionClick = (
    studentId: string,
    action: "RESUME" | "PAUSE" | "TERMINATE",
  ) => {
    setConfirmAction({ studentId, action });
  };

  const executeAction = () => {
    if (confirmAction) {
      const { studentId, action } = confirmAction;
      handleControlAction(studentId, action);

      const student = roster.find((s) => s.id === studentId);
      if (student && (action === "PAUSE" || action === "TERMINATE")) {
        setActiveActionIncidentReport({
          studentId,
          studentName: student.name,
          action,
          violationType:
            action === "PAUSE" ? "Tab Switching" : "External Device",
          severityTier: action === "PAUSE" ? "MEDIUM" : "CRITICAL",
          notes: `Exam session ${action.toLowerCase()}d by proctor due to active live feed audit.`,
        });
      }
      setConfirmAction(null);
    }
  };

  const filtered = roster.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = statusFilter === "ALL" || s.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-8">
      {location.state?.proctorName && (
        <div className="bg-[#8A1538]/5 border border-[#8A1538]/20 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider font-extrabold text-[#8A1538]">Authorized Command Center Proxy Audit</p>
            <p className="text-sm font-semibold text-slate-800">
              Viewing exam sessions allocated to proctor <strong className="text-[#8A1538]">{location.state.proctorName}</strong> at <strong className="text-[#8A1538]">{location.state.centerName || 'Testing Facility'}</strong>
            </p>
          </div>
          <Link
            to="/admin/command-center"
            className="px-3 py-1.5 bg-[#8A1538] hover:bg-slate-900 text-white font-bold rounded-lg text-xs uppercase tracking-wider transition-all shadow-xs shrink-0 flex items-center gap-1.5"
          >
            ← Return to Command Center
          </Link>
        </div>
      )}

      {/* Header & KPIs */}
      <div className="flex flex-col lg:flex-row justify-between items-start gap-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-philsa-navy mb-2 tracking-tight">
            Exam Monitoring
          </h1>
          <p className="text-philsa-gray text-sm font-medium">
            Real-time supervision and academic integrity auditing for active
            examination sessions.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-xl border border-blue-100">
          <Activity className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-wider">
            Live System Active
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard
          label="Total Candidates"
          value={roster.length}
          icon={Users}
          color="text-philsa-navy"
        />
        <KPICard
          label="Ongoing"
          value={roster.filter((s) => s.status === "Ongoing").length}
          icon={Play}
          color="text-emerald-600"
        />
        <KPICard
          label="Paused"
          value={roster.filter((s) => s.status === "Paused").length}
          icon={Pause}
          color="text-amber-500"
        />
        <KPICard
          label="Disconnected"
          value={roster.filter((s) => s.status === "Disconnected").length}
          icon={AlertTriangle}
          color="text-philsa-red"
        />
        <KPICard
          label="Completed"
          value={roster.filter((s) => s.status === "Completed").length}
          icon={CheckCircle}
          color="text-blue-600"
        />
      </div>

      {/* Session Finalization & Batch Submission Module */}
      {(allFinished || batchStatus === 'submitted') && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[2.5rem] border-2 border-slate-200 p-8 shadow-xl relative overflow-hidden"
        >
          {/* Subtle architectural background accent */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-philsa-navy/5 via-transparent to-transparent pointer-events-none rounded-bl-[100%]" />
          
          {batchStatus === 'pending' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shadow-inner">
                    <Fingerprint className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-philsa-navy tracking-tight uppercase leading-none">
                      All Examinations Concluded
                    </h2>
                    <p className="text-xs text-amber-600 font-black uppercase tracking-widest mt-2 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                      Proctor Action Required: Finalize & Submit Batch
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setProctorSignature("");
                      setConsentChecked(false);
                      setShowConfirmSubmitModal(true);
                    }}
                    className="px-6 py-3.5 bg-philsa-navy hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2 cursor-pointer border-none"
                  >
                    <Send className="w-4 h-4" /> Finalize & Submit Session Records
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  <h3 className="text-sm font-black text-philsa-navy uppercase tracking-wider">
                    Administrative Summary & Guidelines
                  </h3>
                  <p className="text-xs text-slate-600 font-bold uppercase tracking-wide leading-relaxed">
                    You have reached the end of the scheduled examination session. All active student terminals under your monitoring domain have completed their tests or were terminated. 
                  </p>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    Before submitting, please ensure you have documented any notable integrity deviations, tab-switching violations, or technical interventions in the candidate timelines. Once you click <strong>"Finalize & Submit"</strong>, all session telemetry, answer packets, live-feed camera streams, and incident audit logs will be cryptographically sealed and sent to the <strong>PhilSA Central Admin Registry</strong> for final examination board reviews.
                  </p>
                  
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">Total Registered</p>
                      <p className="text-lg font-black text-philsa-navy">{roster.length} Candidates</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-emerald-600 font-bold uppercase">Completed</p>
                      <p className="text-lg font-black text-emerald-600">{roster.filter(s => s.status === 'Completed').length}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-philsa-red font-bold uppercase">Disconnected</p>
                      <p className="text-lg font-black text-philsa-red">{roster.filter(s => s.status === 'Disconnected').length}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-amber-600 font-bold uppercase">Incident Flags</p>
                      <p className="text-lg font-black text-amber-600">{roster.reduce((acc, s) => acc + s.incidentLogs.length, 0)} Flags</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-slate-50 border border-slate-200 rounded-3xl flex flex-col justify-between">
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-philsa-navy uppercase tracking-wider flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-philsa-navy" /> Secure Packet Handshake
                    </h4>
                    <ul className="space-y-2 text-[10px] text-slate-600 font-semibold uppercase tracking-wide">
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span>Attendance Manifest Sealed</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span>Biometric Streams Packaged</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span>Incident Timelines Finalized</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div className="pt-4 border-t border-slate-200 mt-4 text-[10px] text-slate-500 font-medium">
                    This session is registered to testing node: <strong className="text-slate-800">{location.state?.centerName || "UST Manila Center"}</strong>.
                  </div>
                </div>
              </div>
            </div>
          )}

          {batchStatus === 'submitting' && (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-6">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 rounded-full border-4 border-slate-100" />
                <div className="absolute inset-0 rounded-full border-4 border-t-philsa-navy animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Database className="w-8 h-8 text-philsa-navy animate-pulse" />
                </div>
              </div>
              
              <div className="space-y-2 max-w-lg">
                <h3 className="text-lg font-black text-philsa-navy uppercase tracking-tight">
                  Packaging & Transmitting Exam Batch
                </h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                  Secure cryptographic pipeline establishing connection to central servers...
                </p>
              </div>

              {/* Animated Logging Terminal */}
              <div className="w-full max-w-2xl bg-slate-950 text-slate-300 rounded-2xl p-5 text-left border border-slate-800 shadow-inner font-mono text-xs space-y-2 max-h-[220px] overflow-y-auto">
                {submissionLogs.slice(0, currentLogIndex + 1).map((log, index) => {
                  const isActive = index === currentLogIndex;
                  const isDone = index < currentLogIndex;
                  return (
                    <div 
                      key={index} 
                      className={cn(
                        "flex items-start gap-2.5 transition-all duration-300",
                        isActive ? "text-amber-400 font-bold text-[13px] scale-101" :
                        isDone ? "text-emerald-500/80" : "text-slate-600 opacity-40"
                      )}
                    >
                      <span>
                        {isDone ? "[SUCCESS]" : isActive ? "[ACTIVE ]" : "[PENDING]"}
                      </span>
                      <span>{log}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {batchStatus === 'submitted' && batchReceipt && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shadow-inner">
                    <UserCheck className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase leading-none">
                      Batch Transmitted & Finalized
                    </h2>
                    <p className="text-xs text-emerald-600 font-black uppercase tracking-widest mt-2 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                      Locked & Signed in Central Cloud Registry
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <span className="px-4 py-2 bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-blue-600" /> Awaiting Admin Review
                  </span>
                  <button 
                    onClick={() => {
                      setShowToast("Official Session Manifest downloaded locally!");
                      setTimeout(() => setShowToast(""), 3000);
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-slate-200"
                  >
                    <Download className="w-4 h-4" /> Manifest
                  </button>
                </div>
              </div>

              {/* Receipt Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-4">
                  <h3 className="text-sm font-black text-philsa-navy uppercase tracking-wider flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-philsa-navy" /> Official Submission Receipt
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-400 font-bold uppercase">Transaction / Batch ID</span>
                      <p className="text-sm font-black text-philsa-navy font-mono">{batchReceipt.id}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-400 font-bold uppercase">Timestamp Sealed</span>
                      <p className="text-sm font-black text-philsa-navy">{batchReceipt.timestamp}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-400 font-bold uppercase">Authorized Proctor Signature</span>
                      <p className="text-sm font-black text-philsa-navy">{batchReceipt.proctor}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-400 font-bold uppercase">Testing Center Hub</span>
                      <p className="text-sm font-black text-philsa-navy">{batchReceipt.center}</p>
                    </div>
                    <div className="sm:col-span-2 pt-3 border-t border-slate-100 space-y-1">
                      <span className="text-[9px] text-slate-400 font-bold uppercase block">Digital Security Handshake Hash (SHA-256)</span>
                      <p className="text-xs font-mono text-slate-600 bg-white border border-slate-100 p-2.5 rounded-lg truncate select-all" title="Click to copy hash">
                        {batchReceipt.hash}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-500/5 to-teal-500/5 border border-emerald-500/10 p-6 rounded-3xl flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-emerald-600" />
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                        Integrity Verified
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                      This batch packet has successfully completed all security assertions, biometric sync benchmarks, and attendance alignments. The session records are now fully synced across <strong>PhilSA Central Servers</strong> and are safely stored in read-only audit lockers awaiting regional examination board verification.
                    </p>
                  </div>
                  
                  <button 
                    onClick={handleResetSimulation}
                    className="w-full py-3 bg-white hover:bg-slate-50 text-slate-700 text-[10px] font-black uppercase tracking-widest border border-slate-200 rounded-xl transition-all shadow-xs cursor-pointer text-center mt-4"
                  >
                    Reset & Test Again
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row items-center gap-6 bg-white p-6 rounded-3xl border border-philsa-border shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-philsa-gray" />
          <input
            type="text"
            placeholder="Search candidate name or student ID..."
            className="input-philsa pl-12 h-12"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-60">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-philsa-gray" />
            <select
              className="input-philsa h-12 pl-12 pr-8 text-xs font-bold uppercase tracking-wider"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Session States</option>
              <option value="Ongoing">Ongoing</option>
              <option value="Paused">Paused</option>
              <option value="Disconnected">Disconnected</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
          <button className="h-12 w-12 flex items-center justify-center bg-philsa-bg border border-philsa-border rounded-xl text-philsa-navy hover:bg-white transition-all shadow-sm">
            <RefreshCcw className="w-5 h-5" />
          </button>
          {!allFinished && (
            <button 
              type="button"
              onClick={handleSimulateAllCompleted}
              className="h-12 px-4 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-sm flex items-center gap-1.5 shrink-0 cursor-pointer border-none"
              title="Fast-forward all student exams to completed or disconnected states for finalization"
            >
              <Sparkles className="w-4 h-4 animate-pulse" /> Fast-Forward All
            </button>
          )}
          {allFinished && (
            <button 
              type="button"
              onClick={handleResetSimulation}
              className="h-12 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold border border-slate-200 rounded-xl text-xs uppercase tracking-wider transition-all shadow-sm flex items-center gap-1.5 shrink-0 cursor-pointer"
              title="Reset the simulation back to default candidate roster and pending submission states"
            >
              <RefreshCcw className="w-4 h-4" /> Reset Simulation
            </button>
          )}
        </div>
      </div>

      {/* Grid of Student Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <AnimatePresence>
          {filtered.map((student) => (
            <motion.div
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              key={student.id}
              className={cn(
                "bg-white rounded-3xl border-2 p-5 transition-all relative group overflow-hidden flex flex-col shadow-sm card-philsa",
                student.status === "Disconnected"
                  ? "border-amber-400 bg-amber-50/10"
                  : "border-philsa-border hover:border-philsa-navy",
              )}
            >
              {/* Video Feed Component */}
              <div
                className={cn(
                  "aspect-video rounded-2xl bg-slate-100 mb-4 relative overflow-hidden flex items-center justify-center border border-philsa-border group",
                  student.status === "Disconnected" && "opacity-60 grayscale",
                )}
              >
                {student.camera === "ON" ? (
                  <>
                    <img
                      src={student.feedUrl}
                      alt="Student Webcam"
                      referrerPolicy="no-referrer"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md border border-white/10">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                      <span className="text-[7px] font-bold text-white uppercase tracking-wider">
                        Live Feed
                      </span>
                    </div>
                    <div className="absolute top-2 left-2">
                      <div className="bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded text-[8px] font-bold text-philsa-navy border border-philsa-border shadow-sm">
                        {student.seat}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <VideoOff className="w-6 h-6 text-philsa-gray opacity-30" />
                    <span className="text-[9px] font-bold text-philsa-gray uppercase tracking-widest">
                      {student.camera === "OFF" ? "Camera Disabled" : "Offline"}
                    </span>
                  </div>
                )}
              </div>

              {/* Student Info */}
              <div className="space-y-3 flex-1">
                <div>
                  <h3 className="text-sm font-bold text-philsa-navy truncate">
                    {student.name}
                  </h3>
                  <div className="flex justify-between items-center mt-0.5">
                    <p className="text-[9px] text-philsa-gray font-bold uppercase tracking-wider">
                      {student.id}
                    </p>
                    <div
                      className={cn(
                        "badge-status",
                        student.status === "Ongoing"
                          ? "bg-emerald-100 text-emerald-800"
                          : student.status === "Paused"
                            ? "bg-amber-100 text-amber-800"
                            : student.status === "Completed"
                              ? "bg-blue-100 text-blue-800"
                              : student.status === "Disconnected"
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-800",
                      )}
                    >
                      <span className="w-1 h-1 rounded-full bg-current mr-1.5" />
                      {student.status}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-philsa-bg space-y-2">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-philsa-gray font-medium">
                      Subject:
                    </span>
                    <span className="text-philsa-navy font-bold">
                      {student.subject}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-philsa-gray font-medium">
                      Progress:
                    </span>
                    <span className="text-philsa-navy font-bold">
                      Q{student.currentQuestion}/60 ({student.progress}%)
                    </span>
                  </div>
                  <div className="w-full h-1 bg-philsa-bg rounded-full overflow-hidden">
                    <motion.div
                      animate={{ width: `${student.progress}%` }}
                      className="h-full bg-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Grid Actions */}
              <div className="mt-4 pt-4 border-t border-philsa-bg grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedStudent(student)}
                  className={cn(
                    "py-2 h-auto text-xs font-bold uppercase transition-all rounded-xl",
                    batchStatus === 'submitted'
                      ? "col-span-2 bg-emerald-50 text-emerald-800 border border-emerald-200/50 hover:bg-emerald-100/50"
                      : "col-span-2 btn-secondary"
                  )}
                >
                  {batchStatus === 'submitted' ? "View Sealed Record" : "View Details"}
                </button>
                {batchStatus !== 'submitted' && (
                  <>
                    {student.status === "Ongoing" ? (
                      <button
                        type="button"
                        onClick={() => handleActionClick(student.id, "PAUSE")}
                        title="Pause session"
                        className="p-2 border border-amber-200 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors flex items-center justify-center cursor-pointer"
                      >
                        <Pause className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleActionClick(student.id, "RESUME")}
                        title="Resume session"
                        className="p-2 border border-emerald-200 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors flex items-center justify-center cursor-pointer"
                      >
                        <Play className="w-4 h-4 fill-current" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleActionClick(student.id, "TERMINATE")}
                      title="Terminate Session"
                      className="p-2 border border-philsa-red/20 rounded-lg text-philsa-red hover:bg-red-50 transition-colors flex items-center justify-center cursor-pointer"
                    >
                      <StopCircle className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {selectedStudent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-8 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-philsa-bg rounded-3xl shadow-2xl max-w-6xl w-full flex flex-col md:flex-row overflow-hidden max-h-[90vh] border border-philsa-border"
            >
              {/* Left Section: Video Feed */}
              <div className="md:w-3/5 bg-slate-100 flex flex-col min-h-[400px] border-r border-philsa-border">
                <div className="p-6 border-b border-philsa-border flex justify-between items-center bg-white">
                  <div className="flex items-center gap-3">
                    <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg flex items-center gap-2 border border-emerald-200">
                      <div className="w-2 h-2 bg-emerald-600 rounded-full animate-pulse" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">
                        Live Webcam Feed
                      </span>
                    </div>
                    <div className="px-3 py-1 bg-philsa-bg border border-philsa-border rounded-lg text-philsa-navy text-[10px] font-bold uppercase tracking-wider">
                      Seat {selectedStudent.seat}
                    </div>
                  </div>
                </div>

                <div className="flex-1 relative bg-slate-950 flex items-center justify-center m-6 rounded-2xl overflow-hidden shadow-inner border border-philsa-border">
                  {selectedStudent.camera === "ON" ? (
                    <>
                      <img
                        src={selectedStudent.feedUrl}
                        alt="Active Student"
                        referrerPolicy="no-referrer"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                    </>
                  ) : (
                    <div className="text-center space-y-3">
                      <VideoOff className="w-12 h-12 text-white/20 mx-auto" />
                      <p className="text-white/40 font-bold text-[10px] uppercase tracking-widest leading-relaxed">
                        Camera transmission unavailable
                      </p>
                    </div>
                  )}
                </div>

                {/* Live Webcam Feed container finishes cleanly here */}
              </div>

              {/* Right Section: Details & Controls */}
              <div className="md:w-2/5 flex flex-col bg-white overflow-hidden">
                <div className="p-6 border-b border-philsa-border flex justify-between items-center bg-white sticky top-0 z-10">
                  <div>
                    <h3 className="text-lg font-bold text-philsa-navy leading-tight">
                      {selectedStudent.name}
                    </h3>
                    <p className="label-philsa mt-0.5">{selectedStudent.id}</p>
                  </div>
                  <button
                    onClick={() => setSelectedStudent(null)}
                    className="p-2 hover:bg-philsa-bg rounded-xl transition-all text-philsa-gray hover:text-philsa-navy"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                  {/* Info Card */}
                  <div className="space-y-4">
                    <h4 className="label-philsa flex items-center gap-2">
                      <Users className="w-3.5 h-3.5" /> Student Information
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-philsa-bg rounded-xl border border-philsa-border">
                        <p className="text-[9px] text-philsa-gray uppercase font-bold mb-1">
                          Subject
                        </p>
                        <p className="text-xs font-bold text-philsa-navy">
                          {selectedStudent.subject}
                        </p>
                      </div>
                      <div className="p-3 bg-philsa-bg rounded-xl border border-philsa-border">
                        <p className="text-[9px] text-philsa-gray uppercase font-bold mb-1">
                          Status
                        </p>
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              selectedStudent.status === "Ongoing"
                                ? "bg-emerald-500"
                                : selectedStudent.status === "Paused"
                                  ? "bg-amber-500"
                                  : "bg-red-500",
                            )}
                          />
                          <p className="text-xs font-bold text-philsa-navy">
                            {selectedStudent.status}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Progress Card */}
                  <div className="space-y-4">
                    <h4 className="label-philsa flex items-center gap-2">
                      <Activity className="w-3.5 h-3.5" /> Exam Progress
                    </h4>
                    <div className="p-4 bg-philsa-bg rounded-xl border border-philsa-border space-y-4">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-lg font-extrabold text-philsa-navy">
                            {selectedStudent.answered}
                          </p>
                          <p className="text-[8px] text-philsa-gray font-bold uppercase tracking-tight">
                            Answered
                          </p>
                        </div>
                        <div className="border-x border-philsa-border">
                          <p className="text-lg font-extrabold text-philsa-navy">
                            {selectedStudent.unanswered}
                          </p>
                          <p className="text-[8px] text-philsa-gray font-bold uppercase tracking-tight">
                            Pending
                          </p>
                        </div>
                        <div>
                          <p className="text-lg font-extrabold text-philsa-red">
                            {selectedStudent.flagged}
                          </p>
                          <p className="text-[8px] text-philsa-red font-bold uppercase tracking-tight">
                            Flagged
                          </p>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-bold px-1">
                          <span className="text-philsa-navy">
                            Question {selectedStudent.currentQuestion}/60
                          </span>
                          <span className="text-philsa-gray">
                            {selectedStudent.progress}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-white rounded-full overflow-hidden border border-philsa-border shadow-inner">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${selectedStudent.progress}%` }}
                            className="h-full bg-blue-500 rounded-full"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Current Question Below Exam Progress */}
                  <div className="space-y-4 pt-4 border-t border-philsa-border">
                    <h4 className="label-philsa flex items-center gap-2">
                      <Monitor className="w-3.5 h-3.5 text-philsa-red" />{" "}
                      Current Question
                    </h4>
                    <div className="p-4 bg-philsa-bg rounded-xl border border-philsa-border space-y-2">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[9px] font-bold text-philsa-gray uppercase tracking-wider">
                          Active Terminal Feed
                        </span>
                        <span className="text-[9px] font-mono text-philsa-navy font-bold">
                          Seat {selectedStudent.seat}
                        </span>
                      </div>
                      <div className="p-3 bg-white rounded-lg border border-philsa-border">
                        <p className="text-xs font-semibold text-philsa-navy leading-relaxed">
                          {selectedStudent.activeQuestionText ||
                            "Connecting to secure exam server..."}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="space-y-4 pt-4 border-t border-philsa-border">
                    <h4 className="label-philsa flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5" /> Administrative Actions
                    </h4>
                    {batchStatus === 'submitted' ? (
                      <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 text-emerald-800 rounded-2xl text-xs font-black uppercase tracking-wider text-center flex items-center justify-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-emerald-600" /> Session Record Sealed & Secured
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-2">
                        {selectedStudent.status === "Paused" ? (
                          <button
                            onClick={() =>
                              handleActionClick(selectedStudent.id, "RESUME")
                            }
                            className="btn-primary py-3 bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center gap-2"
                          >
                            <Play className="w-4 h-4 fill-current" /> Resume
                            Student Session
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              handleActionClick(selectedStudent.id, "PAUSE")
                            }
                            className="btn-secondary py-3 text-amber-700 border-amber-200 hover:bg-amber-50 flex items-center justify-center gap-2"
                          >
                            <Pause className="w-4 h-4 fill-current" /> Pause
                            Session
                          </button>
                        )}
                        <button
                          onClick={() =>
                            handleActionClick(selectedStudent.id, "TERMINATE")
                          }
                          className="btn-secondary py-3 text-philsa-red border-philsa-red/20 hover:bg-red-50 flex items-center justify-center gap-2"
                        >
                          <StopCircle className="w-4 h-4" /> Terminate Examination
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Incident Report Form */}
                  <div className="space-y-4 pt-4 border-t border-philsa-border">
                    <h4 className="label-philsa flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5" /> Incident
                      Documentation
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <label className="label-philsa mb-1.5 block">
                          Automated Timeline
                        </label>
                        <div className="bg-philsa-bg rounded-xl border border-philsa-border divide-y divide-philsa-border overflow-hidden">
                          {selectedStudent.incidentLogs.length > 0 ? (
                            selectedStudent.incidentLogs.map((log) => (
                              <div
                                key={log.id}
                                className="p-3 flex gap-3 text-[10px]"
                              >
                                <span className="font-bold text-philsa-gray shrink-0">
                                  {log.time}
                                </span>
                                <p className="text-philsa-navy font-medium">
                                  {log.note}
                                </p>
                              </div>
                            ))
                          ) : (
                            <div className="p-4 text-center">
                              <p className="text-[10px] text-philsa-gray font-bold uppercase italic">
                                No integrity violations logged.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {batchStatus === 'submitted' ? (
                        <div className="p-4 bg-slate-50 border border-slate-200 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-wider text-center flex items-center justify-center gap-1.5 mt-3">
                          <Lock className="w-3.5 h-3.5 text-slate-400" /> Incident Logs sealed at submission
                        </div>
                      ) : (
                        <div className="space-y-3 pt-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[10px] text-philsa-gray font-bold uppercase tracking-wider block">
                                Violation Type *
                              </label>
                              <select
                                value={detailViolationType}
                                onChange={(e) =>
                                  setDetailViolationType(e.target.value)
                                }
                                className="w-full bg-philsa-bg border border-philsa-border rounded-xl px-3 py-2 text-xs font-bold text-philsa-navy focus:outline-none"
                              >
                                <option value="Tab Switching">
                                  Tab Switching
                                </option>
                                <option value="Manual Ref Flag">
                                  Manual Ref Flag
                                </option>
                                <option value="External Device">
                                  External Device
                                </option>
                                <option value="Communication Assistance">
                                  Communication Assistance
                                </option>
                                <option value="Unauthorized Material">
                                  Unauthorized Material
                                </option>
                                <option value="No Face Detected">
                                  No Face Detected
                                </option>
                                <option value="Multiple Faces Detected">
                                  Multiple Faces Detected
                                </option>
                                <option value="Technical Issue">
                                  Technical Issue
                                </option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] text-philsa-gray font-bold uppercase tracking-wider block">
                                Severity Tier *
                              </label>
                              <select
                                value={detailSeverityTier}
                                onChange={(e) =>
                                  setDetailSeverityTier(e.target.value)
                                }
                                className="w-full bg-philsa-bg border border-philsa-border rounded-xl px-3 py-2 text-xs font-bold text-philsa-navy focus:outline-none"
                              >
                                <option value="LOW">LOW</option>
                                <option value="MEDIUM">MEDIUM</option>
                                <option value="HIGH">HIGH</option>
                                <option value="CRITICAL">CRITICAL</option>
                              </select>
                            </div>
                          </div>

                          {/* Technical Issue sub-dropdown */}
                          {detailViolationType === "Technical Issue" && (
                            <div className="space-y-1 animate-in fade-in duration-200">
                              <label className="text-[10px] text-philsa-gray font-bold uppercase tracking-wider block mb-1">
                                Technical Issue Detail *
                              </label>
                              <select
                                value={detailTechIssueType}
                                onChange={(e) =>
                                  setDetailTechIssueType(e.target.value)
                                }
                                className="w-full bg-philsa-bg border border-philsa-border rounded-xl px-3 py-2 text-xs font-bold text-philsa-navy focus:outline-none"
                              >
                                <option value="Hardware Malfunction">Hardware Malfunction</option>
                                <option value="Connectivity Disruption">Connectivity Disruption</option>
                                <option value="Software / App Freeze">Software / App Freeze</option>
                                <option value="Identity Verification Error">Identity Verification Error</option>
                                <option value="Other Technical Issue">Other Technical Issue</option>
                              </select>
                            </div>
                          )}

                          <div className="space-y-1">
                            <label className="text-[10px] text-philsa-gray font-bold uppercase tracking-wider block mb-1">
                              Observation Notes
                            </label>
                            <textarea
                              placeholder="Enter detailed proctor observation notes..."
                              value={detailNotes}
                              onChange={(e) => setDetailNotes(e.target.value)}
                              className="input-philsa min-h-[80px] resize-none w-full"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              const finalType = detailViolationType === "Technical Issue" 
                                ? `Technical Issue: ${detailTechIssueType}` 
                                : detailViolationType;
                              submitIncidentReport(
                                selectedStudent.id,
                                selectedStudent.name,
                                finalType,
                                detailSeverityTier,
                                detailNotes,
                              );
                              setDetailNotes("");
                            }}
                            className="w-full btn-primary py-2.5 bg-philsa-navy hover:bg-slate-800 cursor-pointer text-xs font-bold uppercase tracking-wider rounded-xl"
                          >
                            Acknowledge & Record Incident
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                  <div className="p-6 bg-philsa-bg border-t border-philsa-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-[8px] font-bold text-philsa-gray uppercase tracking-widest">
                      Full Audit Trail Active
                    </span>
                  </div>
                  <p className="text-[8px] font-mono text-philsa-gray/40">
                    {new Date().toISOString()}
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modals */}
      <AnimatePresence>
        {confirmAction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-[2px]"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl border border-philsa-border text-center"
            >
              <div
                className={cn(
                  "w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center",
                  confirmAction.action === "TERMINATE"
                    ? "bg-red-50 text-philsa-red"
                    : "bg-amber-50 text-amber-600",
                )}
              >
                {confirmAction.action === "TERMINATE" ? (
                  <StopCircle className="w-8 h-8" />
                ) : confirmAction.action === "PAUSE" ? (
                  <Pause className="w-8 h-8" />
                ) : (
                  <Play className="w-8 h-8" />
                )}
              </div>
              <h3 className="text-xl font-extrabold text-philsa-navy mb-2 leading-tight">
                {confirmAction.action === "PAUSE"
                  ? "Pause Examination?"
                  : confirmAction.action === "RESUME"
                    ? "Resume Examination?"
                    : "Terminate Examination?"}
              </h3>
              <p className="text-sm text-philsa-gray font-medium mb-8">
                {confirmAction.action === "PAUSE"
                  ? "Are you sure you want to pause this student’s exam session? They will be locked out until resumed."
                  : confirmAction.action === "RESUME"
                    ? "Resume this student’s exam session? They will regain access to their unanswered items."
                    : "Are you sure you want to terminate this student’s examination? This action is permanent and cannot be undone."}
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={executeAction}
                  className={cn(
                    "btn-primary w-full py-3.5",
                    confirmAction.action === "TERMINATE"
                      ? "bg-philsa-red hover:bg-philsa-red-hover"
                      : "bg-philsa-navy hover:bg-slate-800",
                  )}
                >
                  Confirm & Create Report
                </button>
                <button
                  onClick={() => setConfirmAction(null)}
                  className="btn-secondary w-full py-3 hover:bg-philsa-bg"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Post-Action Incident reporting Modal */}
      <AnimatePresence>
        {activeActionIncidentReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 30 }}
              className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col border border-philsa-border"
            >
              <div className="p-8 border-b border-philsa-border flex justify-between items-center bg-amber-500/10">
                <div>
                  <h2 className="text-xl font-black text-philsa-navy tracking-tight uppercase leading-none">
                    Log <span className="text-philsa-red">Incident Report</span>
                  </h2>
                  <p className="text-[10px] text-philsa-gray font-black uppercase tracking-widest mt-2">{activeActionIncidentReport.action} Protocol Active</p>
                </div>
                <button
                  onClick={() => setActiveActionIncidentReport(null)}
                  className="w-10 h-10 flex items-center justify-center hover:bg-philsa-bg rounded-full transition-all cursor-pointer animate-none"
                >
                  <X className="w-5 h-5 text-philsa-navy" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                {/* Readonly Candidate & Action Info */}
                <div className="grid grid-cols-2 gap-4 pb-4 border-b border-philsa-border bg-slate-50/50 p-4 rounded-2xl">
                  <div>
                    <label className="text-[9px] text-philsa-gray font-black uppercase tracking-wider block mb-1">
                      Candidate
                    </label>
                    <p className="text-sm font-black text-philsa-navy truncate">
                      {activeActionIncidentReport.studentName}
                    </p>
                    <p className="text-[10px] text-philsa-gray font-mono mt-0.5">{activeActionIncidentReport.studentId}</p>
                  </div>
                  <div>
                    <label className="text-[9px] text-philsa-gray font-black uppercase tracking-wider block mb-1">
                      Governance Protocol
                    </label>
                    <span className={cn(
                      "inline-block px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-md border",
                      activeActionIncidentReport.action === "TERMINATE" 
                        ? "bg-red-50 text-philsa-red border-philsa-red/20"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    )}>
                      {activeActionIncidentReport.action}D
                    </span>
                  </div>
                </div>

                {/* Violation Type & Severity selects */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] text-philsa-navy font-black uppercase tracking-wider block">
                      Violation Type *
                    </label>
                    <select
                      value={activeActionIncidentReport.violationType}
                      onChange={(e) =>
                        setActiveActionIncidentReport((prev: any) => ({
                          ...prev,
                          violationType: e.target.value,
                          techIssueType: e.target.value === "Technical Issue" ? "Hardware Malfunction" : undefined,
                        }))
                      }
                      className="w-full bg-philsa-bg border border-philsa-border/80 rounded-2xl px-4 py-3.5 text-xs font-bold text-philsa-navy focus:outline-none focus:ring-4 focus:ring-philsa-red/5 shadow-sm transition-all"
                    >
                      <option value="Tab Switching">Tab Switching</option>
                      <option value="Manual Ref Flag">Manual Ref Flag</option>
                      <option value="External Device">External Device</option>
                      <option value="Communication Assistance">Communication Assistance</option>
                      <option value="Unauthorized Material">Unauthorized Material</option>
                      <option value="No Face Detected">No Face Detected</option>
                      <option value="Multiple Faces Detected">Multiple Faces Detected</option>
                      <option value="Proctor Intervention">Proctor Intervention (Force Pause/End)</option>
                      <option value="Technical Issue">Technical Issue</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] text-philsa-navy font-black uppercase tracking-wider block">
                      Severity Tier *
                    </label>
                    <select
                      value={activeActionIncidentReport.severityTier}
                      onChange={(e) =>
                        setActiveActionIncidentReport((prev: any) => ({
                          ...prev,
                          severityTier: e.target.value,
                        }))
                      }
                      className="w-full bg-philsa-bg border border-philsa-border/80 rounded-2xl px-4 py-3.5 text-xs font-bold text-philsa-navy focus:outline-none focus:ring-4 focus:ring-philsa-red/5 shadow-sm transition-all"
                    >
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                      <option value="CRITICAL">CRITICAL</option>
                    </select>
                  </div>
                </div>

                {/* Sub-dropdown for Technical Issues */}
                {activeActionIncidentReport.violationType === "Technical Issue" && (
                  <div className="space-y-2 animate-in fade-in duration-200">
                    <label className="text-[10px] text-philsa-navy font-black uppercase tracking-wider block">
                      Technical Issue Detail *
                    </label>
                    <select
                      value={activeActionIncidentReport.techIssueType || "Hardware Malfunction"}
                      onChange={(e) =>
                        setActiveActionIncidentReport((prev: any) => ({
                          ...prev,
                          techIssueType: e.target.value,
                        }))
                      }
                      className="w-full bg-philsa-bg border border-philsa-border/80 rounded-2xl px-4 py-3.5 text-xs font-bold text-philsa-navy focus:outline-none focus:ring-4 focus:ring-philsa-red/5 shadow-sm transition-all"
                    >
                      <option value="Hardware Malfunction">Hardware Malfunction</option>
                      <option value="Connectivity Disruption">Connectivity Disruption</option>
                      <option value="Software / App Freeze">Software / App Freeze</option>
                      <option value="Identity Verification Error">Identity Verification Error</option>
                      <option value="Other Technical Issue">Other Technical Issue</option>
                    </select>
                  </div>
                )}

                {/* Observation Notes textarea */}
                <div className="space-y-2">
                  <label className="text-[10px] text-philsa-navy font-black uppercase tracking-wider block">
                    Detailed Observations *
                  </label>
                  <textarea
                    required
                    value={activeActionIncidentReport.notes}
                    onChange={(e) =>
                      setActiveActionIncidentReport((prev: any) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    placeholder="Document active webcam observation and trigger reason..."
                    className="input-philsa w-full text-sm py-3.5 min-h-[90px] resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveActionIncidentReport(null)}
                    className="flex-1 py-4 bg-philsa-bg text-philsa-navy rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white border border-philsa-border transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const finalType = activeActionIncidentReport.violationType === "Technical Issue"
                        ? `Technical Issue: ${activeActionIncidentReport.techIssueType || "Hardware Malfunction"}`
                        : activeActionIncidentReport.violationType;
                      submitIncidentReport(
                        activeActionIncidentReport.studentId,
                        activeActionIncidentReport.studentName,
                        finalType,
                        activeActionIncidentReport.severityTier,
                        activeActionIncidentReport.notes,
                      );
                      setActiveActionIncidentReport(null);
                    }}
                    className="flex-[1.5] py-4 bg-philsa-red text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-philsa-red/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                  >
                    Create Report
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification Banner */}
      {showToast && (
        <div className="fixed bottom-6 right-6 z-[200] bg-philsa-navy border-l-4 border-philsa-red text-white py-4 px-6 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-300">
          <CheckCircle className="w-5 h-5 text-emerald-400 animate-pulse" />
          <p className="text-xs font-bold tracking-wide uppercase">
            {showToast}
          </p>
        </div>
      )}
    </div>
  );
}

function KPICard({ label, value, icon: Icon, color, opacity = "" }: any) {
  return (
    <div
      className={cn(
        "bg-white p-6 rounded-[2rem] border border-philsa-border shadow-sm flex items-center gap-4",
        opacity,
      )}
    >
      <div
        className={cn(
          "w-12 h-12 rounded-[1.25rem] bg-philsa-bg flex items-center justify-center",
          color,
        )}
      >
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-[10px] text-philsa-gray font-black uppercase tracking-widest leading-none mb-1.5">
          {label}
        </p>
        <p className={cn("text-2xl font-black leading-none", color)}>{value}</p>
      </div>
    </div>
  );
}
