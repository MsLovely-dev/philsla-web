import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePhilSA } from '../../PhilSAContext';
import { useMockData } from '../../services/mockService';
import { 
  Users, 
  Search, 
  CheckCircle, 
  XSquare, 
  AlertTriangle, 
  Monitor, 
  Smartphone, 
  Filter, 
  CheckCircle2,
  Lock,
  Unlock,
  ArrowRight,
  X,
  MessageSquare,
  FileText,
  Check,
  RotateCcw,
  UserX,
  AlertCircle,
  Clock,
  Zap,
  LifeBuoy,
  Send,
  HelpCircle,
  ShieldAlert
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
  qrCode: string;
  correctedFromAbsent?: boolean;
  correctionReasonCode?: string;
  correctionRemarks?: string;
  correctedAt?: number;
  assignedDurationMins?: number;
}

const getInitialStudentPCs = (schId: string): StudentPC[] => {
  if (schId === 'sch1') {
    return [
      { id: 'ST-001', name: 'Juan Carlos Villanueva', seat: 'A01', attendance: 'Pending', device: 'PENDING', battery: 0, distStatus: 'Pending', qrCode: 'SAMPLE_QR_ST-001' },
      { id: 'ST-002', name: 'Maria Cristina Santos', seat: 'A02', attendance: 'Pending', device: 'PENDING', battery: 0, distStatus: 'Pending', qrCode: 'SAMPLE_QR_ST-002' },
      { id: 'ST-003', name: 'Enrique S. Gatus', seat: 'A03', attendance: 'Pending', device: 'INCOMPATIBLE', battery: 15, distStatus: 'Pending', qrCode: 'SAMPLE_QR_ST-003' },
      { id: 'ST-004', name: 'Liza Monica Bautista', seat: 'A04', attendance: 'Pending', device: 'PENDING', battery: 0, distStatus: 'Pending', qrCode: 'SAMPLE_QR_ST-004' },
      { id: 'ST-005', name: 'Daniel S. Reyes', seat: 'A05', attendance: 'Pending', device: 'PENDING', battery: 0, distStatus: 'Pending', qrCode: 'SAMPLE_QR_ST-005' },
      { id: 'ST-006', name: 'Kathrine B. Mercado', seat: 'A06', attendance: 'Pending', device: 'PENDING', battery: 0, distStatus: 'Pending', qrCode: 'SAMPLE_QR_ST-006' },
    ];
  } else {
    return [
      { id: 'ST-101', name: 'Patricia Alcaraz', seat: 'B01', attendance: 'Pending', device: 'PENDING', battery: 0, distStatus: 'Pending', qrCode: 'SAMPLE_QR_ST-101' },
      { id: 'ST-102', name: 'Ramon Macaraeg', seat: 'B02', attendance: 'Pending', device: 'PENDING', battery: 0, distStatus: 'Pending', qrCode: 'SAMPLE_QR_ST-102' },
      { id: 'ST-103', name: 'Isabella Dela Cruz', seat: 'B03', attendance: 'Pending', device: 'PENDING', battery: 0, distStatus: 'Pending', qrCode: 'SAMPLE_QR_ST-103' },
      { id: 'ST-104', name: 'Gabriela Silang II', seat: 'B04', attendance: 'Pending', device: 'PENDING', battery: 0, distStatus: 'Pending', qrCode: 'SAMPLE_QR_ST-104' },
      { id: 'ST-105', name: 'Miguel De Guzman', seat: 'B05', attendance: 'Pending', device: 'PENDING', battery: 0, distStatus: 'Pending', qrCode: 'SAMPLE_QR_ST-105' },
    ];
  }
};

export default function ProctorAttendance() {
  const { addAuditLog, addTicket, tickets } = usePhilSA();
  const { schedules, examSets } = useMockData();
  const navigate = useNavigate();

  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('sch1');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('ALL');
  
  const [showReportModal, setShowReportModal] = useState<string | null>(null);
  const [reportData, setReportData] = useState({ type: 'Hardware', description: '' });
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Helpdesk simulation states
  const [showSimTicketModal, setShowSimTicketModal] = useState<StudentPC | null>(null);
  const [simTicketDesc, setSimTicketDesc] = useState<string>('');
  const [simTicketCategory, setSimTicketCategory] = useState<string>('Lost Connection / Gateway Timeout');

  // Synchronized state with ProctorSchedule
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

  // Correction modal states
  const [correctionStudent, setCorrectionStudent] = useState<StudentPC | null>(null);
  const [correctionReasonCode, setCorrectionReasonCode] = useState<string>('REASON_MISTAKE');
  const [correctionRemarks, setCorrectionRemarks] = useState<string>('');

  // Ticket detail viewing modal state
  const [viewingTicket, setViewingTicket] = useState<any | null>(null);

  // Incident state initialized from localStorage with fallbacks
  const [incidents, setIncidents] = useState<any[]>(() => {
    const saved = localStorage.getItem("philsa_incidents");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [
      {
        id: "INC-2026-001",
        student: "Juan Carlos Villanueva",
        type: "Manual Ref Flag",
        severity: "HIGH",
        time: "2026-05-15 10:15",
        status: "PENDING",
        univ: "UP Diliman",
        reason: "The candidate was caught referencing physical study notes on top of their desk during the essay portion. Proctor issued warning and logged screenshot.",
        proofName: "Mobile_Ref_Capture.png"
      },
      {
        id: "INC-2026-002",
        student: "Maria Cristina Santos",
        type: "Tab Switching",
        severity: "MEDIUM",
        time: "2026-05-15 11:02",
        status: "RESOLVED",
        univ: "UP Diliman",
        reason: "System automatically flagged candidate for tab switching activity. Candidate navigated away from the secure exam tab 5 consecutive times.",
        proofName: "Secure_Browser_Logs.txt"
      },
      {
        id: "INC-2026-003",
        student: "Ricardo M. Silva",
        type: "External Device",
        severity: "CRITICAL",
        time: "2026-05-14 09:45",
        status: "ESCALATED",
        univ: "DLSU Manila",
        reason: "Secondary video stream feed showed a secondary smartphone active on holder to the right side of the main laptop screen.",
        proofName: "Phone_In_Use_Evidence.jpeg"
      },
      {
        id: "INC-2026-004",
        student: "Liza Monica Bautista",
        type: "Communication",
        severity: "LOW",
        time: "2026-05-14 14:22",
        status: "PENDING",
        univ: "UP Diliman",
        reason: "Low volume secondary whisper voices detected in candidate surroundings during the engineering math section.",
        proofName: "Audio_Spectral_Log.wav"
      }
    ];
  });

  // State for creating new incident
  const [newIncidentStudentId, setNewIncidentStudentId] = useState<string>('');
  const [newIncidentType, setNewIncidentType] = useState<string>('Tab Switching');
  const [newIncidentSeverity, setNewIncidentSeverity] = useState<string>('HIGH');
  const [newIncidentReason, setNewIncidentReason] = useState<string>('');
  const [newIncidentSuccess, setNewIncidentSuccess] = useState<boolean>(false);

  // Sync incidents to localStorage
  useEffect(() => {
    localStorage.setItem("philsa_incidents", JSON.stringify(incidents));
  }, [incidents]);

  const handleCreateIncident = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIncidentStudentId) return;
    const targetStudent = students.find(s => s.id === newIncidentStudentId);
    if (!targetStudent) return;

    const lastNum = incidents.reduce((max, item) => {
      const match = item.id.match(/INC-2026-(\d+)/);
      if (match) {
        const num = parseInt(match[1]);
        return num > max ? num : max;
      }
      return max;
    }, 4);

    const nextNum = String(lastNum + 1).padStart(3, "0");
    const newId = `INC-2026-${nextNum}`;

    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const currentSch = schedules.find(s => s.id === selectedScheduleId);
    const centerName = currentSch?.testCenter || "UP Diliman";

    const newIncident = {
      id: newId,
      student: targetStudent.name,
      type: newIncidentType,
      severity: newIncidentSeverity,
      time: formattedDate,
      status: "PENDING",
      univ: centerName,
      reason: newIncidentReason,
    };

    const updatedIncidents = [newIncident, ...incidents];
    setIncidents(updatedIncidents);
    addAuditLog('INCIDENT_REPORTED', `Proctor reported ${newIncidentType} incident (${newId}) for candidate ${targetStudent.name} (${targetStudent.id}) at seat ${targetStudent.seat}.`);

    // Reset form
    setNewIncidentStudentId('');
    setNewIncidentReason('');
    setNewIncidentSuccess(true);
    setTimeout(() => setNewIncidentSuccess(false), 3000);
  };

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

  const schDist = getDistState(selectedScheduleId);
  const students = schDist.students;
  const attendanceComplete = schDist.attendanceComplete;
  const isExamDistributed = students.some(s => s.distStatus === 'Received' && !s.correctedFromAbsent);

  const assignedStudentNames = students.map(s => s.name.toLowerCase());
  const assignedIncidents = incidents.filter(inc => 
    assignedStudentNames.includes(inc.student.toLowerCase())
  );

  const totalExpected = students.length;
  const totalPresent = students.filter(s => s.attendance === 'Present').length;
  const totalLate = students.filter(s => s.attendance === 'Late').length;
  const totalAbsent = students.filter(s => s.attendance === 'Absent').length;
  const totalTech = students.filter(s => s.attendance === 'Technical Issue').length;
  const totalConflict = students.filter(s => s.device === 'INCOMPATIBLE').length;

  const updateStudents = (newStudents: StudentPC[]) => {
    setDistStates(prev => {
      const current = prev[selectedScheduleId] || {
        attendanceComplete: false,
        students: getInitialStudentPCs(selectedScheduleId),
        isDistributing: false,
      };
      return {
        ...prev,
        [selectedScheduleId]: {
          ...current,
          students: newStudents
        }
      };
    });
  };

  const handleToggleLock = (locked: boolean) => {
    const currentScheduleName = schedules.find(s => s.id === selectedScheduleId)?.room || selectedScheduleId;
    setDistStates(prev => {
      const current = prev[selectedScheduleId] || {
        attendanceComplete: false,
        students: getInitialStudentPCs(selectedScheduleId),
        isDistributing: false,
      };
      return {
        ...prev,
        [selectedScheduleId]: {
          ...current,
          attendanceComplete: locked
        }
      };
    });

    addAuditLog(
      locked ? 'ATTENDANCE_LOCK' : 'ATTENDANCE_UNLOCK', 
      `${locked ? 'Finalized and locked' : 'Reopened'} attendance session for schedule room: ${currentScheduleName}.`
    );
  };

  const requestUpdateStatus = (id: string, sName: string, status: string) => {
    setConfirmModal({
      title: "Confirm Attendance Update",
      message: `Are you sure you want to update the attendance state of ${sName} to "${status}"?`,
      onConfirm: () => {
        updateStatus(id, status);
        setConfirmModal(null);
      }
    });
  };

  const requestResolveConflict = (id: string, sName: string) => {
    setConfirmModal({
      title: "Resolve Device Policy Conflict",
      message: `Are you sure you want to override and bypass the detected hardware conflict on ${sName}'s device, registering it as compliant?`,
      onConfirm: () => {
        resolveConflict(id);
        setConfirmModal(null);
      }
    });
  };

  const getUIStatus = (attendance: string) => {
    if (attendance === 'Present') return 'PRESENT';
    if (attendance === 'Absent') return 'ABSENT';
    if (attendance === 'Late') return 'LATE';
    if (attendance === 'Pending') return 'PENDING';
    if (attendance === 'Technical Issue') return 'TECHNICAL_ISSUE';
    return 'PENDING';
  };

  const getStoredAttendance = (status: string): 'Present' | 'Absent' | 'Late' | 'Pending' | 'Technical Issue' => {
    if (status === 'PRESENT') return 'Present';
    if (status === 'ABSENT') return 'Absent';
    if (status === 'LATE') return 'Late';
    if (status === 'PENDING') return 'Pending';
    if (status === 'TECHNICAL_ISSUE') return 'Technical Issue';
    return 'Pending';
  };

  const filtered = students.filter(s => {
    const uiStatus = getUIStatus(s.attendance);
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'ALL' || uiStatus === filter || s.device === filter;
    return matchesSearch && matchesFilter;
  });

  const updateStatus = (id: string, uiStatus: string) => {
    const nextAttendance = getStoredAttendance(uiStatus);
    const updated = students.map(s => {
      if (s.id === id) {
        let device = s.device || 'PENDING';
        let battery = s.battery || 0;
        if (uiStatus === 'PRESENT' || uiStatus === 'LATE') {
          device = 'COMPATIBLE';
          battery = 100;
        } else if (uiStatus === 'ABSENT') {
          device = 'N/A';
          battery = 0;
        }
        return { 
          ...s, 
          attendance: nextAttendance, 
          device, 
          battery,
          distStatus: uiStatus !== 'ABSENT' ? s.distStatus : ('Pending' as const)
        };
      }
      return s;
    });
    updateStudents(updated);
  };

  const handleTechnicalIssue = (id: string) => {
    setShowReportModal(id);
  };

  const submitReport = () => {
    if (showReportModal) {
      const studentObj = students.find(s => s.id === showReportModal);
      if (studentObj) {
        addTicket({
          candidateId: studentObj.id,
          candidateName: studentObj.name,
          contactEmail: 'candidate-support@philsa.edu.ph',
          phase: 'LIVE_EXAM',
          subject: `${reportData.type} Disruption: ${studentObj.name} (Seat ${studentObj.seat})`,
          description: reportData.description,
          status: 'OPEN',
          priority: 'HIGH',
          examRoom: 'Benitez Hall R101',
          deviceDetails: `Proctor Manual Incident Log. Category: ${reportData.type}. User Agent: Chrome SEB Simulator.`
        });
      }
      updateStatus(showReportModal, 'TECHNICAL_ISSUE');
      setShowReportModal(null);
      setReportData({ type: 'Hardware', description: '' });
    }
  };

  const saveAbsenteeCorrection = () => {
    if (!correctionStudent) return;

    const reasonText = "Late candidate arrival";

    const distTime = schDist.distributedAt || (Date.now() - 15 * 60 * 1000);
    const elapsedMins = Math.floor((Date.now() - distTime) / 60000);
    const remainingMins = Math.max(1, 180 - elapsedMins);

    const updated = students.map(s => {
      if (s.id === correctionStudent.id) {
        return {
          ...s,
          attendance: 'Present' as const,
          device: 'COMPATIBLE' as const,
          battery: 100,
          distStatus: 'Received' as const,
          correctedFromAbsent: true,
          correctionReasonCode: 'REASON_LATE_ENTRY',
          correctionRemarks: correctionRemarks || undefined,
          correctedAt: Date.now(),
          assignedDurationMins: remainingMins,
        };
      }
      return s;
    });

    updateStudents(updated);

    addAuditLog(
      'EXAM_DISTRIBUTE_TERMINALS',
      `Corrected mismarked absentee ${correctionStudent.name} (Seat ${correctionStudent.seat}) to Present due to Late Arrival. Remaining duration set to ${remainingMins} minutes.`
    );

    setCorrectionStudent(null);
    setCorrectionReasonCode('REASON_LATE_ENTRY');
    setCorrectionRemarks('');
  };

  const resolveConflict = (id: string) => {
    const updated = students.map(s => s.id === id ? { ...s, device: 'COMPATIBLE' as const } : s);
    updateStudents(updated);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="pb-4 border-b border-philsa-border flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
          <div>
            <h1 className="text-2xl font-bold text-philsa-navy mb-1 tracking-tight">Candidate Attendance</h1>
            <p className="text-philsa-gray text-xs font-sans">Verify candidate presence and devices before starting the exam session.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setDistStates(prev => {
                  const updated = { ...prev };
                  delete updated[selectedScheduleId];
                  return updated;
                });
                addAuditLog('ATTENDANCE_LOCK', `Reset the attendance and distribution state for the selected room.`);
              }}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all cursor-pointer shadow-sm"
              title="Reset attendance for the current exam room to start over"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" /> Reset Session State
            </button>
            <button
              onClick={() => navigate('/proctor/schedule')}
              className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-xl transition-all cursor-pointer"
            >
              Go to Exam Schedule <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
      </div>

      {/* Connection & Lock Bar */}
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div className="space-y-1.5 flex-1 max-w-xl">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block ml-1">Exam Room & Session</label>
          <select 
            value={selectedScheduleId}
            onChange={(e) => setSelectedScheduleId(e.target.value)}
            className="input-philsa h-10 pr-8 font-semibold tracking-wide text-xs text-philsa-navy bg-white border border-slate-200 rounded-xl"
          >
            {schedules.map(sch => {
              const examSetName = examSets.find(e => e.id === sch.examSetId)?.name || 'General Exam';
              return (
                <option key={sch.id} value={sch.id}>
                  {examSetName} — {sch.testCenter} ({sch.room}) — {sch.time}
                </option>
              );
            })}
          </select>
        </div>
        
        <div className="flex items-center gap-2.5 shrink-0 self-end lg:self-center">
          {!attendanceComplete && !isExamDistributed && (
            <>
              <button
                onClick={() => {
                  const updated = students.map(s => ({
                    ...s,
                    attendance: 'Present' as const,
                    device: s.id === 'ST-003' ? ('INCOMPATIBLE' as const) : ('COMPATIBLE' as const),
                    battery: s.id === 'ST-003' ? 15 : 95,
                  }));
                  updateStudents(updated);
                  addAuditLog('ATTENDANCE_LOCK', 'Marked all room candidates as Present.');
                }}
                className="px-4 py-2.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Mark All Present
              </button>
              <button
                onClick={() => {
                  const resetStudents = getInitialStudentPCs(selectedScheduleId);
                  updateStudents(resetStudents);
                  addAuditLog('ATTENDANCE_LOCK', 'Reset all room candidates to Pending.');
                }}
                className="px-4 py-2.5 border border-slate-200 text-slate-600 hover:text-philsa-navy hover:bg-slate-50 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Reset to Pending
              </button>
            </>
          )}

          {attendanceComplete || isExamDistributed ? (
            <div className="flex items-center gap-2">
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5">
                <Check className="w-4 h-4" /> Locked & Ready
              </span>
              {!isExamDistributed ? (
                <button
                  onClick={() => handleToggleLock(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:text-philsa-red hover:border-philsa-red hover:bg-red-50/20 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Unlock Attendance
                </button>
              ) : (
                <span className="text-xs text-slate-400 bg-slate-100 border border-slate-200/60 px-4 py-2 rounded-xl font-bold flex items-center gap-1 cursor-not-allowed select-none" title="Cannot reopen attendance after exam package is distributed.">
                  <Lock className="w-3.5 h-3.5 text-slate-400" /> Locked (Distributed)
                </span>
              )}
            </div>
          ) : (
            <button
              onClick={() => handleToggleLock(true)}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/10 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Lock className="w-4 h-4" /> Lock Attendance
            </button>
          )}
        </div>
      </div>

      {(attendanceComplete || isExamDistributed) && (
        <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
          <div>
            <p className="text-xs font-bold text-emerald-800">Attendance Locked</p>
            <p className="text-[11px] text-emerald-600 mt-0.5">
              {isExamDistributed ? (
                <span>The exam is active. If a student arrived late, you can override and send the exam by clicking <strong className="text-indigo-600">"Correct Absentee"</strong> below.</span>
              ) : (
                <span>Attendance synced. You can now distribute exam packages to present students on the <span className="underline font-semibold cursor-pointer" onClick={() => navigate('/proctor/schedule')}>Exam Schedule page</span>.</span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard 
            label="Total" 
            value={totalExpected} 
            sub="Candidates" 
            icon={Users}
          />
          <StatCard 
            label="Present" 
            value={totalPresent} 
            sub="Active" 
            icon={CheckCircle2}
          />
          <StatCard 
            label="Late" 
            value={totalLate} 
            sub="Arrivals" 
            icon={Clock}
          />
          <StatCard 
            label="Absent" 
            value={totalAbsent} 
            sub="No Show" 
            icon={UserX}
          />
          <StatCard 
            label="Issues" 
            value={totalTech} 
            sub="Technical" 
            icon={AlertTriangle}
          />
          <StatCard 
            label="Conflicts" 
            value={totalConflict} 
            sub="Requires Fix" 
            icon={Monitor}
          />
      </div>



      <div className="bg-white rounded-xl border border-philsa-border overflow-hidden shadow-sm">
        <div className="p-5 border-b border-philsa-border flex flex-col md:flex-row justify-between items-center gap-4 bg-philsa-bg/10">
          <div className="relative flex-1 max-w-sm w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-philsa-gray" />
            <input 
              type="text" 
              placeholder="Search by name or ID..." 
              className="input-philsa pl-10 h-10 bg-white rounded-xl text-xs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <select 
              className="input-philsa text-xs font-semibold h-10 pr-8 bg-white rounded-xl w-full md:w-auto"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="ALL">All Candidates</option>
              <option value="PRESENT">Present</option>
              <option value="LATE">Late</option>
              <option value="ABSENT">Absent</option>
              <option value="TECHNICAL_ISSUE">Issues</option>
              <option value="PENDING">Pending</option>
              <option value="INCOMPATIBLE">Conflicts</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-philsa-bg text-[10px] text-philsa-gray font-bold uppercase tracking-wider border-b border-philsa-border">
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Seat</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Alert</th>
                <th className="px-6 py-4">Device</th>
                <th className="px-6 py-4">Support ticket</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-philsa-border">
              {filtered.map((student) => {
                const uiStatus = getUIStatus(student.attendance);
                return (
                  <tr 
                    key={student.id} 
                    className="bg-white hover:bg-slate-50/50 transition-all"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 bg-philsa-bg rounded-lg flex items-center justify-center text-[11px] font-bold text-philsa-navy">
                            {student.name.split(' ').map(n => n[0]).join('')}
                         </div>
                         <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-bold text-philsa-navy leading-snug">{student.name}</p>
                              {student.correctedFromAbsent && (
                                <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 text-[8px] font-bold rounded" title={`Administrative override: ${student.correctionRemarks || 'Late override corrected'}`}>
                                  Late Entry
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-philsa-gray font-semibold">{student.id}</p>
                         </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-philsa-bg border border-philsa-border rounded-lg text-xs font-bold text-philsa-navy font-mono">
                        {student.seat}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {uiStatus === 'PRESENT' ? (
                        <div className="flex items-center gap-1.5 text-emerald-600 font-semibold text-xs uppercase tracking-tight">
                           <CheckCircle2 className="w-3.5 h-3.5" /> Present
                        </div>
                      ) : uiStatus === 'LATE' ? (
                        <div className="flex items-center gap-1.5 text-amber-600 font-semibold text-xs uppercase tracking-tight">
                           <Clock className="w-3.5 h-3.5" /> Late
                        </div>
                      ) : uiStatus === 'ABSENT' ? (
                          <div className="flex items-center gap-1.5 text-slate-400 font-semibold text-xs uppercase tracking-tight opacity-70">
                             <XSquare className="w-3.5 h-3.5" /> Absent
                          </div>
                      ) : uiStatus === 'TECHNICAL_ISSUE' ? (
                          <div className="flex items-center gap-1.5 text-philsa-red font-semibold text-xs uppercase tracking-tight">
                             <AlertTriangle className="w-3.5 h-3.5" /> Issue
                          </div>
                      ) : (
                        <span className="flex items-center gap-1.5 text-philsa-navy font-semibold text-xs uppercase tracking-tight opacity-40">
                           <Search className="w-3.5 h-3.5" /> Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {uiStatus === 'TECHNICAL_ISSUE' ? (
                        <div className="flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-wider animate-pulse whitespace-nowrap">
                          <AlertTriangle className="w-3.5 h-3.5" /> Technical Error
                        </div>
                      ) : student.device === 'INCOMPATIBLE' ? (
                        <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-wider whitespace-nowrap">
                          <AlertCircle className="w-3.5 h-3.5" /> Dev Conflict
                        </div>
                      ) : (student.battery !== undefined && student.battery < 20) ? (
                        <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-wider whitespace-nowrap animate-bounce">
                          <Smartphone className="w-3.5 h-3.5" /> Low Battery
                        </div>
                      ) : (
                        <span className="text-slate-400 font-medium text-xs font-mono">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-6">
                         <div className={cn(
                           "flex items-center gap-1.5 text-xs font-semibold uppercase tracking-tight",
                           student.device === 'COMPATIBLE' ? "text-emerald-600" : student.device === 'INCOMPATIBLE' ? "text-philsa-red" : "text-philsa-gray opacity-40"
                         )}>
                            <Monitor className="w-4 h-4" /> 
                            {student.device === 'COMPATIBLE' ? 'Secure' : student.device === 'INCOMPATIBLE' ? 'Conflict' : student.device === 'N/A' ? 'N/A' : 'Unverified'}
                          </div>
                          {(uiStatus === 'PRESENT' || uiStatus === 'LATE') && student.battery !== undefined && (
                            <div className="flex items-center gap-1 text-xs text-philsa-gray font-medium">
                              <Smartphone className="w-3.5 h-3.5" /> 
                              <span className={cn(student.battery < 20 && "text-philsa-red font-bold")}>{student.battery}%</span>
                            </div>
                          )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        const relatedTicket = tickets.find(t => t.candidateId === student.id && t.phase === 'LIVE_EXAM');
                        if (relatedTicket) {
                          return (
                            <div className="flex flex-col gap-1 min-w-[150px]">
                              <span 
                                onClick={() => setViewingTicket(relatedTicket)}
                                title="View support ticket details"
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border w-fit cursor-pointer hover:brightness-95 transition-all ${
                                  relatedTicket.status === 'OPEN' ? 'bg-red-50 text-red-700 border-red-200' :
                                  relatedTicket.status === 'IN_PROGRESS' ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse' :
                                  'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}
                              >
                                <LifeBuoy className="w-3 h-3" /> Ticket: {relatedTicket.id}
                              </span>
                              <span className="text-[10px] text-slate-500 font-semibold font-sans truncate max-w-[150px]" title={relatedTicket.subject}>
                                {relatedTicket.subject}
                              </span>
                              <span className="text-[9px] text-slate-400 font-mono">
                                Status: {relatedTicket.status} {relatedTicket.assignedTo ? `| Tech: ${relatedTicket.assignedTo}` : ''}
                              </span>
                            </div>
                          );
                        }
                        if (uiStatus === 'TECHNICAL_ISSUE') {
                          return (
                            <div className="flex flex-col gap-1 min-w-[150px]">
                              <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded text-[9px] font-bold w-fit">
                                No Ticket Logged
                              </span>
                              <button
                                onClick={() => {
                                  setSimTicketDesc(`Candidate ${student.name} (ID: ${student.id}, Seat: ${student.seat}) is experiencing a critical connection freeze on workstation. SafeExamBrowser Wrapper unresponsive. Proctor verified physical network connectivity. Requires technician manual override key.`);
                                  setShowSimTicketModal(student);
                                }}
                                className="mt-1 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-red-600 hover:text-red-700 transition-colors cursor-pointer"
                              >
                                <LifeBuoy className="w-3 h-3 text-red-500 animate-pulse" /> Dispatch Ticket
                              </button>
                            </div>
                          );
                        }
                        return (
                          <span className="text-slate-400 font-medium text-xs font-mono">—</span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2.5">
                        {uiStatus === 'LATE' && student.distStatus !== 'Received' ? (
                          <button
                            onClick={() => {
                              const updatedStudents = students.map(s => {
                                  if (s.id === student.id) {
                                    return { ...s, distStatus: 'Received' as const };
                                  }
                                  return s;
                              });
                              updateStudents(updatedStudents);
                              addAuditLog('EXAM_DISTRIBUTE_TERMINALS', `Synchronized individual exam payload for late candidate ${student.name} (Seat ${student.seat}) in schedule ${selectedScheduleId}.`);
                            }}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1"
                          >
                            <Zap className="w-3.5 h-3.5" /> Send Exam
                          </button>
                        ) : uiStatus === 'LATE' && student.distStatus === 'Received' ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100">
                              <Check className="w-3.5 h-3.5" /> Sent
                            </span>
                            {!attendanceComplete && (
                              <button 
                                  onClick={() => requestUpdateStatus(student.id, student.name, 'PENDING')}
                                  title="Reset"
                                  className="w-7 h-7 text-slate-400 hover:text-philsa-navy hover:bg-slate-50 rounded-lg transition-all flex items-center justify-center cursor-pointer"
                              >
                                  <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {(attendanceComplete || isExamDistributed) && (
                              <button
                                onClick={() => {
                                  const updated = students.map(s => {
                                    if (s.id === student.id) {
                                      return {
                                        ...s,
                                        attendance: 'Technical Issue' as const,
                                        device: 'INCOMPATIBLE' as const,
                                        battery: 35
                                      };
                                    }
                                    return s;
                                  });
                                  updateStudents(updated);
                                  addAuditLog(
                                    'EXAM_CANDIDATE_DISRUPTION',
                                    `Candidate disruption reported during active exam: ${student.name} at seat ${student.seat}. Prompting support ticket dispatch.`
                                  );
                                  setSimTicketDesc(`During active testing, late candidate ${student.name} (Seat ${student.seat}) encountered a critical technical error. The browser wrapper froze, blocking user inputs.`);
                                  setShowSimTicketModal(student);
                                }}
                                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-sm whitespace-nowrap"
                              >
                                <AlertTriangle className="w-3.5 h-3.5 text-red-500 animate-pulse" /> Tech Issue
                              </button>
                            )}
                          </div>
                        ) : (attendanceComplete || isExamDistributed) ? (
                          uiStatus === 'ABSENT' ? (
                            <button
                              onClick={() => {
                                setCorrectionStudent(student);
                                setCorrectionReasonCode('REASON_LATE_ENTRY');
                                setCorrectionRemarks('');
                              }}
                              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1 whitespace-nowrap"
                            >
                              <RotateCcw className="w-3.5 h-3.5" /> Correct Absent
                            </button>
                          ) : uiStatus === 'TECHNICAL_ISSUE' ? (
                            (() => {
                              const activeTicket = tickets.find(t => t.candidateId === student.id && t.phase === 'LIVE_EXAM' && t.status !== 'RESOLVED');
                              const resolvedTicket = tickets.find(t => t.candidateId === student.id && t.phase === 'LIVE_EXAM' && t.status === 'RESOLVED');
                              
                              if (activeTicket) {
                                return (
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-lg whitespace-nowrap">
                                      Technician Dispatched
                                    </span>
                                    <button
                                      onClick={() => setViewingTicket(activeTicket)}
                                      title="View ticket details"
                                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap"
                                    >
                                      View Ticket
                                    </button>
                                  </div>
                                );
                              } else if (resolvedTicket) {
                                return (
                                  <button
                                    onClick={() => {
                                      const updated = students.map(stud => {
                                        if (stud.id === student.id) {
                                          return {
                                            ...stud,
                                            attendance: 'Present' as const,
                                            device: 'COMPATIBLE' as const,
                                            battery: 98
                                          };
                                        }
                                        return stud;
                                      });
                                      updateStudents(updated);
                                      addAuditLog(
                                        'EXAM_CANDIDATE_RESTORED',
                                        `Resolved and restored browser session for ${student.name} (${student.id}) at seat ${student.seat}.`
                                      );
                                    }}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-sm whitespace-nowrap"
                                  >
                                    <Check className="w-3.5 h-3.5" /> Restore Session
                                  </button>
                                );
                              } else {
                                return (
                                  <button
                                    onClick={() => {
                                      setSimTicketDesc(`Candidate ${student.name} (ID: ${student.id}, Seat: ${student.seat}) is experiencing a critical connection freeze on workstation. SafeExamBrowser Wrapper unresponsive. Proctor verified physical network connectivity. Requires technician manual override key.`);
                                      setShowSimTicketModal(student);
                                    }}
                                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-sm whitespace-nowrap"
                                  >
                                    <LifeBuoy className="w-3.5 h-3.5 animate-pulse" /> Dispatch Ticket
                                  </button>
                                );
                              }
                            })()
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1 text-xs font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                                <Lock className="w-3.5 h-3.5" /> Locked
                              </div>
                              <button
                                onClick={() => {
                                  // Mark as Technical Issue
                                  const updated = students.map(s => {
                                    if (s.id === student.id) {
                                      return {
                                        ...s,
                                        attendance: 'Technical Issue' as const,
                                        device: 'INCOMPATIBLE' as const,
                                        battery: 35
                                      };
                                    }
                                    return s;
                                  });
                                  updateStudents(updated);
                                  addAuditLog(
                                    'EXAM_CANDIDATE_DISRUPTION',
                                    `Proctor flagged active candidate ${student.name} (Seat ${student.seat}) with a Technical Issue.`
                                  );
                                  // Auto-prompt dispatch ticket
                                  setSimTicketDesc(`Candidate ${student.name} (ID: ${student.id}, Seat: ${student.seat}) encountered a workstation freeze during the active exam session.`);
                                  setShowSimTicketModal(student);
                                }}
                                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-sm whitespace-nowrap"
                              >
                                <AlertTriangle className="w-3.5 h-3.5 text-red-500 animate-pulse" /> Tech Issue
                              </button>
                            </div>
                          )
                        ) : uiStatus === 'PENDING' ? (
                          <>
                              <button 
                                  onClick={() => requestUpdateStatus(student.id, student.name, 'PRESENT')}
                                  title="Mark Present"
                                  className="w-8 h-8 bg-emerald-600 text-white rounded-lg flex items-center justify-center hover:bg-emerald-700 transition-all shadow-sm cursor-pointer"
                              >
                                  <Check className="w-4 h-4" />
                              </button>
                              <button 
                                  onClick={() => requestUpdateStatus(student.id, student.name, 'LATE')}
                                  title="Mark Late"
                                  className="w-8 h-8 bg-amber-500 text-white rounded-lg flex items-center justify-center hover:bg-amber-600 transition-all shadow-sm cursor-pointer"
                              >
                                  <Clock className="w-4 h-4" />
                              </button>
                              <button 
                                  onClick={() => requestUpdateStatus(student.id, student.name, 'ABSENT')}
                                  title="Mark Absent"
                                  className="w-8 h-8 bg-slate-100 text-slate-500 rounded-lg flex items-center justify-center hover:bg-slate-200 hover:text-slate-700 transition-all cursor-pointer"
                              >
                                  <UserX className="w-4 h-4" />
                              </button>
                              <button 
                                  onClick={() => {
                                    const updated = students.map(s => s.id === student.id ? { ...s, attendance: 'Technical Issue' as const, device: 'INCOMPATIBLE' as const, battery: 35 } : s);
                                    updateStudents(updated);
                                    addAuditLog('EXAM_CANDIDATE_DISRUPTION', `Proctor flagged candidate ${student.name} (Seat ${student.seat}) with a Technical Issue.`);
                                    setSimTicketDesc(`Candidate ${student.name} (ID: ${student.id}, Seat: ${student.seat}) was flagged with a technical issue prior to the exam start. Device compatibility verification failed.`);
                                    setShowSimTicketModal(student);
                                  }}
                                  title="Report Tech Issue"
                                  className="w-8 h-8 bg-red-50 text-red-600 border border-red-100 rounded-lg flex items-center justify-center hover:bg-red-100 hover:text-red-700 transition-all cursor-pointer"
                              >
                                  <AlertTriangle className="w-4 h-4" />
                              </button>
                          </>
                        ) : student.device === 'INCOMPATIBLE' ? (
                            <button 
                                onClick={() => requestResolveConflict(student.id, student.name)}
                                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm"
                            >
                                Allow Device
                            </button>
                        ) : uiStatus === 'PRESENT' ? (
                            <div className="flex items-center gap-2">
                                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-bold bg-emerald-50 text-emerald-700 border-emerald-100">
                                    {attendanceComplete || isExamDistributed ? <Lock className="w-3 h-3" /> : <Check className="w-3 h-3" />} Present
                                </div>
                                {!attendanceComplete && !isExamDistributed && (
                                  <button 
                                      onClick={() => requestUpdateStatus(student.id, student.name, 'PENDING')}
                                      title="Reset"
                                      className="w-7 h-7 text-slate-400 hover:text-philsa-navy hover:bg-slate-50 rounded-lg transition-all flex items-center justify-center cursor-pointer"
                                  >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                  </button>
                                )}
                            </div>
                        ) : uiStatus === 'TECHNICAL_ISSUE' ? (
                          (() => {
                            const activeTicket = tickets.find(t => t.candidateId === student.id && t.phase === 'LIVE_EXAM' && t.status !== 'RESOLVED');
                            const resolvedTicket = tickets.find(t => t.candidateId === student.id && t.phase === 'LIVE_EXAM' && t.status === 'RESOLVED');
                            
                            if (activeTicket) {
                              return (
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-lg whitespace-nowrap">
                                    Technician Dispatched
                                  </span>
                                  <button
                                    onClick={() => setViewingTicket(activeTicket)}
                                    title="View ticket details"
                                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap"
                                  >
                                    View Ticket
                                  </button>
                                </div>
                              );
                            } else if (resolvedTicket) {
                              return (
                                <button
                                  onClick={() => {
                                    const updated = students.map(stud => {
                                      if (stud.id === student.id) {
                                        return {
                                          ...stud,
                                          attendance: 'Present' as const,
                                          device: 'COMPATIBLE' as const,
                                          battery: 98
                                        };
                                      }
                                      return stud;
                                    });
                                    updateStudents(updated);
                                    addAuditLog(
                                      'EXAM_CANDIDATE_RESTORED',
                                      `Resolved and restored browser session for ${student.name} (${student.id}) at seat ${student.seat}.`
                                    );
                                  }}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-sm whitespace-nowrap"
                                >
                                  <Check className="w-3.5 h-3.5" /> Restore Session
                                </button>
                              );
                            } else {
                              return (
                                <button
                                  onClick={() => {
                                    setSimTicketDesc(`Candidate ${student.name} (ID: ${student.id}, Seat: ${student.seat}) is experiencing a critical connection freeze on workstation. SafeExamBrowser Wrapper unresponsive. Proctor verified physical network connectivity. Requires technician manual override key.`);
                                    setShowSimTicketModal(student);
                                  }}
                                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-sm whitespace-nowrap"
                                >
                                  <LifeBuoy className="w-3.5 h-3.5 animate-pulse" /> Dispatch Ticket
                                </button>
                              );
                            }
                          })()
                        ) : (
                            <button 
                                onClick={() => requestUpdateStatus(student.id, student.name, 'PENDING')}
                                className="flex items-center gap-1 text-slate-500 hover:text-philsa-navy text-xs font-bold transition-colors cursor-pointer"
                            >
                                <RotateCcw className="w-3.5 h-3.5" /> Reset
                            </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>



      {/* Incident reporting modal */}
      <AnimatePresence>
        {showReportModal && (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-philsa-navy/60 backdrop-blur-sm"
            >
                <motion.div 
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    className="bg-white rounded-[3rem] shadow-2xl max-w-lg w-full overflow-hidden"
                >
                    <div className="p-10 space-y-8">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-red-50 text-philsa-red rounded-2xl flex items-center justify-center">
                                    <AlertTriangle className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-philsa-navy tracking-tight uppercase">Technical Incident</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                                        Reporting for: {students.find(s => s.id === showReportModal)?.name}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setShowReportModal(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                <X className="w-5 h-5 text-philsa-gray" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block ml-1">Incident Type</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {['Hardware', 'Connectivity', 'Software', 'Identity'].map(type => (
                                        <button 
                                            key={type}
                                            onClick={() => setReportData(prev => ({ ...prev, type }))}
                                            className={cn(
                                                "p-4 rounded-2xl border text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer",
                                                reportData.type === type ? "bg-philsa-navy text-white border-philsa-navy shadow-lg" : "bg-white text-philsa-navy border-slate-100 hover:border-philsa-navy"
                                            )}
                                        >
                                            {type}
                                            {reportData.type === type && <CheckCircle className="w-3 h-3" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block ml-1">Detailed Description</label>
                                <div className="relative">
                                    <textarea 
                                        rows={4}
                                        placeholder="Describe the technical issue, observed errors, and proctor interventions..."
                                        className="input-philsa w-full !bg-slate-50 !pt-3 !pb-3 resize-none"
                                        value={reportData.description}
                                        onChange={(e) => setReportData(prev => ({ ...prev, description: e.target.value }))}
                                    />
                                    <MessageSquare className="absolute right-4 bottom-4 w-4 h-4 text-slate-300" />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setShowReportModal(null)} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-philsa-gray cursor-pointer">Cancel</button>
                            <button 
                                onClick={submitReport}
                                disabled={!reportData.description}
                                className={cn(
                                    "flex-[2] py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer",
                                    reportData.description ? "bg-philsa-navy text-white shadow-philsa-navy/20 hover:scale-105" : "bg-slate-100 text-slate-400 cursor-not-allowed"
                                )}
                            >
                                <FileText className="w-4 h-4" /> Submit Incident Report
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Confirmation Modal */}
      <AnimatePresence>
        {confirmModal && (
          <div className="fixed inset-0 z-[11000] flex items-center justify-center p-6 bg-philsa-navy/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 flex flex-col p-8 text-center"
            >
              <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-philsa-navy uppercase tracking-tight mb-2">{confirmModal.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed mb-8">{confirmModal.message}</p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setConfirmModal(null)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmModal.onConfirm}
                  className="flex-1 py-4 bg-philsa-navy hover:bg-philsa-red text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg transition-all cursor-pointer"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Absentee Correction Modal */}
      <AnimatePresence>
        {correctionStudent && (
          <div className="fixed inset-0 z-[11000] flex items-center justify-center p-6 bg-philsa-navy/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 flex flex-col"
            >
              <div className="p-6 space-y-5">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-lg font-bold text-philsa-navy">Correct Absentee</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Send exam to late candidate</p>
                  </div>
                  <button onClick={() => setCorrectionStudent(null)} className="p-1.5 hover:bg-slate-100 rounded-full transition-colors cursor-pointer">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                {/* Candidate Info */}
                <div className="bg-slate-50 rounded-xl p-3.5 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Candidate:</span>
                    <strong className="text-philsa-navy">{correctionStudent.name}</strong>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">ID / Seat:</span>
                    <span className="font-mono text-slate-600">{correctionStudent.id} (Seat {correctionStudent.seat})</span>
                  </div>
                </div>

                {/* Live Clock Sync */}
                <CorrectionTimerPanel distributedAt={schDist.distributedAt} />

                {/* Correction Reason */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-500 block">Correction Reason</span>
                  <div className="bg-indigo-50 border border-indigo-100/50 rounded-xl p-3 text-xs text-indigo-700 font-bold uppercase tracking-wider">
                    Late Arrival override
                  </div>
                </div>

                {/* Override Remarks */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 block">Notes (Optional)</label>
                  <textarea 
                    rows={2}
                    placeholder="e.g., arrival time, authorization note..."
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                    value={correctionRemarks}
                    onChange={(e) => setCorrectionRemarks(e.target.value)}
                  />
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => setCorrectionStudent(null)} 
                    className="flex-1 py-2.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={saveAbsenteeCorrection}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Zap className="w-4 h-4" /> Correct & Send
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Simulation Support Ticket Submission Modal */}
      <AnimatePresence>
        {showSimTicketModal && (
          <div className="fixed inset-0 z-[11000] flex items-center justify-center p-6 bg-philsa-navy/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col p-8"
            >
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <LifeBuoy className="w-5 h-5 text-indigo-600 animate-spin" />
                  <h3 className="text-lg font-black text-philsa-navy uppercase tracking-tight">Dispatch Tech Support</h3>
                </div>
                <button onClick={() => setShowSimTicketModal(null)} className="p-1.5 hover:bg-slate-100 rounded-full transition-colors cursor-pointer font-sans">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="py-6 space-y-4">
                <div className="bg-indigo-50/50 p-4 rounded-xl space-y-1.5 border border-indigo-100/50">
                  <p className="text-[10px] uppercase font-bold text-indigo-500 tracking-wider font-sans">Candidate & Room Info</p>
                  <p className="text-sm font-bold text-philsa-navy">{showSimTicketModal.name}</p>
                  <p className="text-xs text-slate-500 font-mono">ID: {showSimTicketModal.id} | Seat: {showSimTicketModal.seat} | Room: Benitez Hall R101</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 block font-sans">Support Incident Type</label>
                  <select
                    value={simTicketCategory}
                    onChange={(e) => setSimTicketCategory(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-indigo-500 outline-none font-semibold bg-white font-sans text-philsa-navy"
                  >
                    <option value="Lost Connection / Gateway Timeout">Lost Connection / Gateway Timeout</option>
                    <option value="Workstation Freeze / Browser Lockup">Workstation Freeze / Browser Lockup</option>
                    <option value="SafeExamBrowser Handshake Invalid">SafeExamBrowser Handshake Invalid</option>
                    <option value="Power Cycle / Hardware Lock">Power Cycle / Hardware Lock</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 block font-sans">Incident Description & Logs</label>
                  <textarea 
                    rows={4}
                    placeholder="Provide troubleshooting actions taken..."
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-indigo-500 outline-none resize-none bg-slate-50 font-mono text-slate-600 leading-relaxed"
                    value={simTicketDesc}
                    onChange={(e) => setSimTicketDesc(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowSimTicketModal(null)} 
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer font-sans"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    addTicket({
                      candidateId: showSimTicketModal.id,
                      candidateName: showSimTicketModal.name,
                      contactEmail: 'simulated-candidate@philsa.edu.ph',
                      phase: 'LIVE_EXAM',
                      subject: `LIVE DISRUPTION: ${simTicketCategory}`,
                      description: simTicketDesc,
                      status: 'OPEN',
                      priority: 'HIGH',
                      examRoom: 'Benitez Hall R101',
                      deviceDetails: `SEB secure client wrapper crash. Code 0x889F. Category: ${simTicketCategory}`
                    });
                    addAuditLog(
                      'TICKET_DISPATCHED',
                      `Dispatched high-priority helpdesk support ticket for candidate ${showSimTicketModal.name} (${showSimTicketModal.id}) at seat ${showSimTicketModal.seat}.`
                    );
                    setShowSimTicketModal(null);
                  }}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer font-sans"
                >
                  <Send className="w-3.5 h-3.5" /> Dispatch Ticket
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Support Ticket Detail Modal */}
      <AnimatePresence>
        {viewingTicket && (
          <div className="fixed inset-0 z-[11000] flex items-center justify-center p-6 bg-philsa-navy/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col p-8"
            >
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <LifeBuoy className="w-5 h-5 text-indigo-600 animate-spin" />
                  <h3 className="text-lg font-black text-philsa-navy uppercase tracking-tight">Support Ticket details</h3>
                </div>
                <button onClick={() => setViewingTicket(null)} className="p-1.5 hover:bg-slate-100 rounded-full transition-colors cursor-pointer font-sans">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="py-6 space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400 font-mono font-bold">Ticket ID: {viewingTicket.id}</span>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                    viewingTicket.status === 'OPEN' ? 'bg-red-50 text-red-700 border-red-200' :
                    viewingTicket.status === 'IN_PROGRESS' ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse' :
                    'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    {viewingTicket.status}
                  </span>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl space-y-1.5 border border-slate-200/60 text-xs">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-sans">Candidate & Room Info</p>
                  <p className="text-sm font-bold text-philsa-navy">{viewingTicket.candidateName}</p>
                  <p className="text-slate-500 font-mono">ID: {viewingTicket.candidateId} | Room: {viewingTicket.examRoom || 'Benitez Hall R101'}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-sans block">Incident Subject</span>
                  <p className="text-sm font-bold text-philsa-navy leading-snug">{viewingTicket.subject}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-sans block">Description & Troubleshooting Actions</span>
                  <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 font-mono whitespace-pre-wrap leading-relaxed">
                    {viewingTicket.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-sans block mb-1">Priority</span>
                    <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded border border-red-100 uppercase tracking-wide">
                      {viewingTicket.priority}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-sans block mb-1">Assigned Technician</span>
                    <span className="text-xs font-bold text-philsa-navy">
                      {viewingTicket.assignedTo || 'Unassigned Queue'}
                    </span>
                  </div>
                </div>

                {viewingTicket.notes && viewingTicket.notes.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-sans block">Technician Log Notes</span>
                    <div className="space-y-2">
                      {viewingTicket.notes.map((note: string, idx: number) => (
                        <div key={idx} className="bg-emerald-50/50 border border-emerald-100/50 p-2.5 rounded-lg text-xs text-emerald-800 leading-snug">
                          {note}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex gap-3">
                <button 
                  onClick={() => setViewingTicket(null)} 
                  className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer font-sans text-center"
                >
                  Close Details
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

const CorrectionTimerPanel = ({ distributedAt }: { distributedAt?: number }) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    const totalSecs = 180 * 60; // 3 hours
    const startTimestamp = distributedAt || (Date.now() - 15 * 60 * 1000);
    const elapsedSecs = Math.floor((Date.now() - startTimestamp) / 1000);
    return Math.max(10, totalSecs - elapsedSecs);
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 10) return 10;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const mins = Math.floor(secondsLeft / 60);

  return (
    <div className="bg-amber-50 border border-amber-100 rounded-xl p-3.5 text-xs text-left">
      <p className="font-bold text-amber-800 flex items-center gap-1.5">
        <Clock className="w-4 h-4 text-amber-600 shrink-0" />
        Synchronized Remaining Time: {mins} minutes
      </p>
      <p className="text-amber-700 mt-1 leading-normal text-[11px]">
        The candidate's local client will automatically sync to {mins} minutes remaining, aligning precisely with the current room clock.
      </p>
    </div>
  );
};

function StatCard({ label, value, sub, icon: Icon }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-philsa-border shadow-sm flex items-center gap-4 transition-all hover:scale-[1.02] active:scale-[0.98]">
       <div className="p-3 rounded-xl bg-philsa-bg text-philsa-navy shrink-0">
          <Icon className="w-6 h-6" />
       </div>
       <div>
          <p className="text-[10px] font-black text-philsa-gray uppercase tracking-widest mb-0.5">{label}</p>
          <div className="flex items-baseline gap-1.5">
             <h3 className="text-2xl font-black text-philsa-navy leading-none mb-0.5">{value}</h3>
             <span className="text-[9px] font-bold text-philsa-gray tracking-wider uppercase">({sub})</span>
          </div>
       </div>
    </div>
  );
}
