import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldAlert, Building2, Users, BookOpen, CheckCircle2, 
  WifiOff, AlertTriangle, Search, Filter, PlayCircle, 
  PauseCircle, Siren, RefreshCw, XCircle, Clock, Check, User, 
  Eye, Monitor, Server, Bell, ArrowRight, UserCheck, ShieldClose, MoreVertical, Send, AlertOctagon, HelpCircle,
  Zap, Shield, Activity, Cpu, Laptop, CheckSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { usePhilSA } from '../../PhilSAContext';
import { 
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, PieChart, Pie, Cell
} from 'recharts';
import { DUMMY_APPLICATIONS } from '../../services/mockService';
import { Application } from '../../types';
import { 
  NationalKpiView, ExamExecutionView, SecurityIntegrityView, 
  ProctoringOpsView, RegionalOpsView, AuditOpsView, DeviceStreamView, AlertIncidentView 
} from '../../components/admin/CommandCenterPanels';

// --- Types ---
export interface CenterMonitor {
  id: string;
  name: string;
  status: 'ACTIVE' | 'OFFLINE' | 'MAINTENANCE' | 'IDLE';
  currentExam: string;
  activeStudents: number;
  assignedProctor: string;
  connectionStatus: 'EXCELLENT' | 'STABLE' | 'DEGRADED' | 'DISCONNECTED';
  lastActivity: string;
  // Pre-exam & Operations Metrics:
  cctvStatus: 'CONNECTED' | 'DEGRADED' | 'OFFLINE';
  deviceReadiness: string; // e.g., "50/50 Ready"
  biometricStatus: 'VALIDATED' | 'PENDING' | 'ISSUES';
  internetStability: string; // e.g., "99.8%" or "Offline"
  offlineMode: 'STANDBY' | 'ACTIVE' | 'NOT_SUPPORTED';
  deviceFailures: number;
  powerStatus: 'GRID' | 'UPS' | 'GENERATOR' | 'FAILURE';
  syncDelay: string; // e.g., "0.4s"
}

export interface StudentMonitor {
  id: string;
  name: string;
  exam: string;
  testingCenter: string;
  status: 'TAKING_EXAM' | 'SUBMITTED' | 'DISCONNECTED' | 'IDLE' | 'FLAGGED' | 'RECONNECTED' | 'UNDER_INVESTIGATION';
  currentQuestion: number;
  totalQuestions: number;
  timeRemaining: string; // MM:SS or HH:MM
  incidentFlag: boolean;
  warningsSent: number;
  // Real-Time & Post-Exam Tracking:
  connectionStability: 'EXCELLENT' | 'STABLE' | 'UNSTABLE';
  reconnectionEvents: number;
  evidenceStatus: 'COMPLETED' | 'PENDING' | 'FAILED' | 'NOT_COMPLETED';
  recordingUpload: string; // e.g. "85%", "Syncing", "Done"
  rawVideoSync: 'SYNCED' | 'PENDING' | 'FAILED';
  verificationStatus: 'VERIFIED' | 'MISSING_REQUISITE' | 'SKIPPED';
}

export interface ProctorMonitor {
  id: string;
  name: string;
  assignedRoom: string;
  testingCenter: string;
  studentsHandled: number;
  status: 'ONLINE' | 'AWAY' | 'OFFLINE';
  sessionDuration: string;
  responseTimeSec: number;
}

export interface LiveIncident {
  id: string;
  timestamp: string;
  studentName: string;
  studentId: string;
  type: 'Browser Exit' | 'Multiple Faces Detected' | 'Internet Disconnection' | 'Camera Disabled' | 'Suspicious Activity' | 'Power Interruption' | 'Tab Switching' | 'Multiple Devices' | 'Audio Anomaly' | 'Camera Obstruction' | 'Fast Answers';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  testingCenter: string;
  status: 'OPEN' | 'INVESTIGATING' | 'ESCALATED' | 'RESOLVED' | 'CLOSED';
  priority?: 'P1' | 'P2' | 'P3' | 'P4';
  assignedInvestigator?: string;
  investigationProgress?: number; // 0-100%
  monitoringTeam?: string; // e.g., "Team Alpha", "Team Bravo"
}

export interface LiveActivity {
  id: string;
  timestamp: string;
  type: 'LOGIN' | 'START' | 'SUBMIT' | 'DISCONNECT' | 'INCIDENT' | 'INTERVENTION' | 'RECOVERY' | 'SECURITY';
  message: string;
  center: string;
  user: string;
}

export interface LiveAlert {
  id: string;
  timestamp: string;
  title: string;
  message: string;
  severity: 'HIGH' | 'CRITICAL' | 'WARNING';
  isRead: boolean;
}

export interface SecurityAuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  module: string;
  ipAddress: string;
  beforeState: string;
  afterState: string;
  severity: 'INFO' | 'WARNING' | 'ALERT' | 'CRITICAL';
}

// --- Initial Mock Data ---
const INITIAL_CENTERS: CenterMonitor[] = [
  { id: 'C-MND-01', name: 'UP Diliman - Melchor Hall', status: 'ACTIVE', currentExam: 'PhilSA National Qualifying Exam', activeStudents: 54, assignedProctor: 'Dr. Maria Santos', connectionStatus: 'EXCELLENT', lastActivity: 'Just now', cctvStatus: 'CONNECTED', deviceReadiness: '120/120 Ready', biometricStatus: 'VALIDATED', internetStability: '99.9%', offlineMode: 'STANDBY', deviceFailures: 0, powerStatus: 'GRID', syncDelay: '0.2s' },
  { id: 'C-MND-02', name: 'UST Manila - Thomasian Pavilion', status: 'ACTIVE', currentExam: 'PhilSA Aerospace Engineering Aptitude', activeStudents: 42, assignedProctor: 'Prof. Danilo Cruz', connectionStatus: 'STABLE', lastActivity: '1m ago', cctvStatus: 'CONNECTED', deviceReadiness: '80/80 Ready', biometricStatus: 'VALIDATED', internetStability: '99.1%', offlineMode: 'STANDBY', deviceFailures: 1, powerStatus: 'GRID', syncDelay: '0.4s' },
  { id: 'C-VIS-01', name: 'UP Cebu - Campus Admin Hall', status: 'ACTIVE', currentExam: 'PhilSA National Qualifying Exam', activeStudents: 31, assignedProctor: 'Engr. Sarah Lim', connectionStatus: 'STABLE', lastActivity: '30s ago', cctvStatus: 'DEGRADED', deviceReadiness: '50/50 Ready', biometricStatus: 'PENDING', internetStability: '97.2%', offlineMode: 'STANDBY', deviceFailures: 0, powerStatus: 'UPS', syncDelay: '0.8s' },
  { id: 'C-MIN-01', name: 'Ateneo de Davao - Jubilee Hall', status: 'ACTIVE', currentExam: 'Space Science Scholarship Exam', activeStudents: 28, assignedProctor: 'Dr. James Yap', connectionStatus: 'EXCELLENT', lastActivity: 'Just now', cctvStatus: 'CONNECTED', deviceReadiness: '40/40 Ready', biometricStatus: 'VALIDATED', internetStability: '99.8%', offlineMode: 'STANDBY', deviceFailures: 0, powerStatus: 'GRID', syncDelay: '0.1s' },
  { id: 'C-MND-03', name: 'DLSU Manila - Henry Sy Grounds', status: 'IDLE', currentExam: 'PhilSA General Physics Screening', activeStudents: 0, assignedProctor: 'Arlene Garcia', connectionStatus: 'EXCELLENT', lastActivity: '12m ago', cctvStatus: 'CONNECTED', deviceReadiness: '65/65 Ready', biometricStatus: 'PENDING', internetStability: '99.9%', offlineMode: 'NOT_SUPPORTED', deviceFailures: 0, powerStatus: 'GRID', syncDelay: '0.0s' },
  { id: 'C-VIS-02', name: 'Silliman University - Science Center', status: 'MAINTENANCE', currentExam: 'None', activeStudents: 0, assignedProctor: 'No Proctor Assigned', connectionStatus: 'DEGRADED', lastActivity: '1h ago', cctvStatus: 'OFFLINE', deviceReadiness: '25/30 Ready', biometricStatus: 'ISSUES', internetStability: '62.5%', offlineMode: 'ACTIVE', deviceFailures: 5, powerStatus: 'GENERATOR', syncDelay: '5.2s' },
  { id: 'C-MIN-02', name: 'MSU Iligan - Engineering Admin', status: 'OFFLINE', currentExam: 'Space Mechanics Placement', activeStudents: 0, assignedProctor: 'Engr. Raul Perez', connectionStatus: 'DISCONNECTED', lastActivity: '45m ago', cctvStatus: 'OFFLINE', deviceReadiness: '0/40 Ready', biometricStatus: 'ISSUES', internetStability: '0.0%', offlineMode: 'ACTIVE', deviceFailures: 40, powerStatus: 'FAILURE', syncDelay: 'Offline' },
];

const INITIAL_STUDENTS: StudentMonitor[] = [
  { id: 'ST-2026-001', name: 'Juan D. Dela Cruz', exam: 'National Qualifying Exam', testingCenter: 'UP Diliman - Melchor Hall', status: 'TAKING_EXAM', currentQuestion: 34, totalQuestions: 100, timeRemaining: '01:24:15', incidentFlag: false, warningsSent: 0, connectionStability: 'EXCELLENT', reconnectionEvents: 0, evidenceStatus: 'PENDING', recordingUpload: '45%', rawVideoSync: 'PENDING', verificationStatus: 'VERIFIED' },
  { id: 'ST-2026-002', name: 'Angelica M. Ramos', exam: 'National Qualifying Exam', testingCenter: 'UST Manila - Thomasian Pavilion', status: 'FLAGGED', currentQuestion: 56, totalQuestions: 100, timeRemaining: '00:52:10', incidentFlag: true, warningsSent: 1, connectionStability: 'UNSTABLE', reconnectionEvents: 4, evidenceStatus: 'NOT_COMPLETED', recordingUpload: '10%', rawVideoSync: 'PENDING', verificationStatus: 'SKIPPED' },
  { id: 'ST-2026-003', name: 'Mark Anthony Solis', exam: 'Aerospace Engineering Aptitude', testingCenter: 'UP Cebu - Campus Admin Hall', status: 'TAKING_EXAM', currentQuestion: 72, totalQuestions: 80, timeRemaining: '00:15:30', incidentFlag: false, warningsSent: 0, connectionStability: 'STABLE', reconnectionEvents: 1, evidenceStatus: 'PENDING', recordingUpload: '80%', rawVideoSync: 'PENDING', verificationStatus: 'VERIFIED' },
  { id: 'ST-2026-004', name: 'Clarisse V. Alcantara', exam: 'National Qualifying Exam', testingCenter: 'UP Diliman - Melchor Hall', status: 'DISCONNECTED', currentQuestion: 12, totalQuestions: 100, timeRemaining: '02:10:45', incidentFlag: false, warningsSent: 0, connectionStability: 'UNSTABLE', reconnectionEvents: 5, evidenceStatus: 'NOT_COMPLETED', recordingUpload: '0%', rawVideoSync: 'FAILED', verificationStatus: 'MISSING_REQUISITE' },
  { id: 'ST-2026-005', name: 'Joshua Ryan Pineda', exam: 'Space Science Scholarship Exam', testingCenter: 'Ateneo de Davao - Jubilee Hall', status: 'TAKING_EXAM', currentQuestion: 44, totalQuestions: 90, timeRemaining: '01:05:00', incidentFlag: false, warningsSent: 0, connectionStability: 'EXCELLENT', reconnectionEvents: 0, evidenceStatus: 'PENDING', recordingUpload: '60%', rawVideoSync: 'PENDING', verificationStatus: 'VERIFIED' },
  { id: 'ST-2026-006', name: 'Bianca Louise Ocampo', exam: 'Aerospace Engineering Aptitude', testingCenter: 'UP Cebu - Campus Admin Hall', status: 'SUBMITTED', currentQuestion: 80, totalQuestions: 80, timeRemaining: '00:00:00', incidentFlag: false, warningsSent: 0, connectionStability: 'STABLE', reconnectionEvents: 1, evidenceStatus: 'COMPLETED', recordingUpload: 'Done', rawVideoSync: 'SYNCED', verificationStatus: 'VERIFIED' },
  { id: 'ST-2026-007', name: 'Dexter S. King', exam: 'Space Science Scholarship Exam', testingCenter: 'Ateneo de Davao - Jubilee Hall', status: 'IDLE', currentQuestion: 8, totalQuestions: 90, timeRemaining: '02:15:10', incidentFlag: false, warningsSent: 0, connectionStability: 'EXCELLENT', reconnectionEvents: 0, evidenceStatus: 'PENDING', recordingUpload: '10%', rawVideoSync: 'PENDING', verificationStatus: 'VERIFIED' },
  { id: 'ST-2026-008', name: 'Ronaldo J. Mercado', exam: 'National Qualifying Exam', testingCenter: 'UST Manila - Thomasian Pavilion', status: 'FLAGGED', currentQuestion: 41, totalQuestions: 100, timeRemaining: '01:12:05', incidentFlag: true, warningsSent: 2, connectionStability: 'UNSTABLE', reconnectionEvents: 3, evidenceStatus: 'NOT_COMPLETED', recordingUpload: '22%', rawVideoSync: 'PENDING', verificationStatus: 'VERIFIED' },
];

const INITIAL_PROCTORS: ProctorMonitor[] = [
  { id: 'PR-102', name: 'Dr. Maria Santos', assignedRoom: 'Lab 204-B', testingCenter: 'UP Diliman - Melchor Hall', studentsHandled: 24, status: 'ONLINE', sessionDuration: '02:30:00', responseTimeSec: 15 },
  { id: 'PR-103', name: 'Prof. Danilo Cruz', assignedRoom: 'Main Pavilion A', testingCenter: 'UST Manila - Thomasian Pavilion', studentsHandled: 30, status: 'ONLINE', sessionDuration: '02:15:00', responseTimeSec: 22 },
  { id: 'PR-104', name: 'Engr. Sarah Lim', assignedRoom: 'Seminar Room 1', testingCenter: 'UP Cebu - Campus Admin Hall', studentsHandled: 20, status: 'ONLINE', sessionDuration: '01:45:00', responseTimeSec: 12 },
  { id: 'PR-105', name: 'Dr. James Yap', assignedRoom: 'Jubilee Hall West', testingCenter: 'Ateneo de Davao - Jubilee Hall', studentsHandled: 15, status: 'ONLINE', sessionDuration: '01:10:00', responseTimeSec: 18 },
  { id: 'PR-106', name: 'Arlene Garcia', assignedRoom: 'Computer Lab 1', testingCenter: 'DLSU Manila - Henry Sy Grounds', studentsHandled: 0, status: 'AWAY', sessionDuration: '00:15:00', responseTimeSec: 45 },
  { id: 'PR-107', name: 'Engr. Raul Perez', assignedRoom: 'Audio-Visual Lab', testingCenter: 'MSU Iligan - Engineering Admin', studentsHandled: 0, status: 'OFFLINE', sessionDuration: '00:00:00', responseTimeSec: 0 },
];

const INITIAL_INCIDENTS: LiveIncident[] = [
  { id: 'INC-L01', timestamp: '15:24:12', studentName: 'Angelica M. Ramos', studentId: 'ST-2026-002', type: 'Browser Exit', severity: 'HIGH', testingCenter: 'UST Manila - Thomasian Pavilion', status: 'OPEN', priority: 'P2', assignedInvestigator: 'Inspector Ramos', investigationProgress: 40, monitoringTeam: 'M-Team Alpha' },
  { id: 'INC-L02', timestamp: '15:20:05', studentName: 'Ronaldo J. Mercado', studentId: 'ST-2026-008', type: 'Multiple Faces Detected', severity: 'CRITICAL', testingCenter: 'UST Manila - Thomasian Pavilion', status: 'INVESTIGATING', priority: 'P1', assignedInvestigator: 'Chief De Leon', investigationProgress: 65, monitoringTeam: 'SOC Cyber Team' },
  { id: 'INC-L03', timestamp: '15:05:43', studentName: 'Clarisse V. Alcantara', studentId: 'ST-2026-004', type: 'Internet Disconnection', severity: 'MEDIUM', testingCenter: 'UP Diliman - Melchor Hall', status: 'ESCALATED', priority: 'P3', assignedInvestigator: 'Engr. Bautista', investigationProgress: 90, monitoringTeam: 'NOC Infra Group' },
  { id: 'INC-L04', timestamp: '14:50:31', studentName: 'Juan D. Dela Cruz', studentId: 'ST-2026-001', type: 'Camera Disabled', severity: 'HIGH', testingCenter: 'UP Diliman - Melchor Hall', status: 'RESOLVED', priority: 'P2', assignedInvestigator: 'Inspector Ramos', investigationProgress: 100, monitoringTeam: 'M-Team Alpha' },
];

const INITIAL_ACTIVITIES: LiveActivity[] = [
  { id: 'ACT-001', timestamp: '15:26:02', type: 'SUBMIT', message: 'Bianca Louise Ocampo has submitted Aerospace Engineering Aptitude test.', center: 'UP Cebu', user: 'Bianca Louise Ocampo' },
  { id: 'ACT-002', timestamp: '15:24:12', type: 'INCIDENT', message: 'HIGH Incident Flagged: Browser Exit detected for Angelica M. Ramos.', center: 'UST Manila', user: 'Angelica M. Ramos' },
  { id: 'ACT-003', timestamp: '15:23:00', type: 'INTERVENTION', message: 'Proctor Maria Santos sent warning to Ronaldo J. Mercado.', center: 'UP Diliman', user: 'Dr. Maria Santos' },
  { id: 'ACT-004', timestamp: '15:20:05', type: 'INCIDENT', message: 'CRITICAL Incident Flagged: Multiple Faces Detected on webcam.', center: 'UST Manila', user: 'Ronaldo J. Mercado' },
  { id: 'ACT-005', timestamp: '15:18:40', type: 'LOGIN', message: 'Dexter S. King successfully passed biometric validation and logged in.', center: 'Ateneo de Davao', user: 'Dexter S. King' },
  { id: 'ACT-006', timestamp: '15:15:00', type: 'START', message: 'Space Science Scholarship Exam started in Davao Center.', center: 'Ateneo de Davao', user: 'System' },
];

const INITIAL_ALERTS: LiveAlert[] = [
  { id: 'ALR-001', timestamp: '15:24:32', title: 'Suspicious Activity Spike', message: 'Multiple high severity incidents reported within 5 minutes at Manila UST Center.', severity: 'CRITICAL', isRead: false },
  { id: 'ALR-002', timestamp: '15:10:15', title: 'Testing Center Offline', message: 'MSU Iligan physical link is currently disconnected from core server.', severity: 'HIGH', isRead: false },
  { id: 'ALR-003', timestamp: '14:45:00', title: 'Performance Degradation', message: 'Silliman University link is currently showing high telemetry latency (420ms).', severity: 'WARNING', isRead: true },
];

const INITIAL_SECURITY_LOGS: SecurityAuditLog[] = [
  { id: 'SEC-001', timestamp: '15:25:33', user: 'Unknown IP', action: 'UNAUTHORIZED_ACCESS_ATTEMPT', module: 'Auth Router', ipAddress: '192.168.4.15', beforeState: 'GUEST', afterState: 'BLOCKED', severity: 'CRITICAL' },
  { id: 'SEC-002', timestamp: '15:22:10', user: 'ST-2026-002', action: 'DEVICE_CHANGE_DETECTED', module: 'Webcam Controller', ipAddress: '202.148.11.90', beforeState: 'FaceMatch: 95%', afterState: 'FaceMatch: 52% (Substitute Detected)', severity: 'ALERT' },
  { id: 'SEC-003', timestamp: '15:19:04', user: 'ST-2026-004', action: 'VPN_PROXY_DETECTION', module: 'Network Guard', ipAddress: '103.24.120.45', beforeState: 'Direct ISP', afterState: 'VPN Active (NordVPN Node)', severity: 'WARNING' },
  { id: 'SEC-004', timestamp: '15:15:55', user: 'Admin-Santos', action: 'ADMIN_PRIVILEGE_CHANGE', module: 'User Configuration', ipAddress: '112.198.60.12', beforeState: 'Viewer Level', afterState: 'Co-Proctor Monitor Level', severity: 'INFO' },
  { id: 'SEC-005', timestamp: '15:10:12', user: 'ST-2026-008', action: 'SESSION_HIJACK_ATTEMPT', module: 'Session Manager', ipAddress: '49.145.2.19', beforeState: 'Session_A_Active', afterState: 'Session_B_Inject_Aborted', severity: 'CRITICAL' },
];

export default function CommandCenter() {
  const { user, addAuditLog } = usePhilSA();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.role !== 'SYSTEM_ADMIN') {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  if (!user || user.role !== 'SYSTEM_ADMIN') {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <ShieldAlert className="w-16 h-16 text-philsa-red" />
        <h2 className="text-2xl font-black text-philsa-navy uppercase tracking-tight">Access Restricted</h2>
        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">The Command Center is restricted to Superadmin users only.</p>
      </div>
    );
  }

  // --- Live States ---
  const [centers, setCenters] = useState<CenterMonitor[]>(INITIAL_CENTERS);
  const [students, setStudents] = useState<StudentMonitor[]>(INITIAL_STUDENTS);
  const [proctors, setProctors] = useState<ProctorMonitor[]>(INITIAL_PROCTORS);
  const [incidents, setIncidents] = useState<LiveIncident[]>(INITIAL_INCIDENTS);
  const [activities, setActivities] = useState<LiveActivity[]>(INITIAL_ACTIVITIES);
  const [alerts, setAlerts] = useState<LiveAlert[]>(INITIAL_ALERTS);

  // --- Active Tab State ---
  const [activeTab, setActiveTab] = useState<'KPI' | 'REGISTRATION' | 'EXECUTION' | 'SECURITY' | 'PROCTORING' | 'REGIONAL' | 'AUDIT' | 'DEVICE' | 'ALERT'>('KPI');
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);

  // --- Region and Time filters ---
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<string>('TODAY');

  // --- Sub-View Switchers ---
  const [centersSubView, setCentersSubView] = useState<'GENERAL' | 'NOC'>('GENERAL');
  const [examineesSubView, setExamineesSubView] = useState<'ACTIVE' | 'POST_EXAM'>('ACTIVE');

  // --- Filters ---
  const [searchQuery, setSearchQuery] = useState('');
  const [centerFilter, setCenterFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [incidentSeverityFilter, setIncidentSeverityFilter] = useState('ALL');
  const [incidentStatusFilter, setIncidentStatusFilter] = useState('ALL');
  const [securitySeverityFilter, setSecuritySeverityFilter] = useState('ALL');
  const [securityLogs, setSecurityLogs] = useState<SecurityAuditLog[]>(INITIAL_SECURITY_LOGS);

  // --- Simulation Management ---
  const [isSimulating, setIsSimulating] = useState(true);
  const [simulationSpeed, setSimulationSpeed] = useState<'NORMAL' | 'FAST'>('NORMAL');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // --- Selected Item Modals ---
  const [selectedIncident, setSelectedIncident] = useState<LiveIncident | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<StudentMonitor | null>(null);
  const [selectedCenter, setSelectedCenter] = useState<CenterMonitor | null>(null);

  // --- Sound/Alert telemetries ---
  const [flashScreen, setFlashScreen] = useState(false);

  // --- Core metrics calculator ---
  const stats = {
    activeCenters: 1480,
    totalCenters: 1500,
    activeProctors: 7420,
    studentsExamining: 142850,
    submittedExams: 53200,
    ongoingIncidents: incidents.filter(i => i.status !== 'RESOLVED').length * 28 + 3,
    disconnectedStudents: students.filter(s => s.status === 'DISCONNECTED').length * 45 + 120,
    flaggedActivities: students.filter(s => s.status === 'FLAGGED').length * 35 + 245,
  };

  // --- Timer Helper Function ---
  const getTimestamp = () => {
    const d = new Date();
    return d.toTimeString().split(' ')[0];
  };

  // --- Simulation Actions Trigger ---
  const triggerSimulationTick = () => {
    const timestamp = getTimestamp();

    // 1. Progress randomly some active/submitted student telemetry
    setStudents(prev => prev.map(student => {
      // If student is actively taking exam
      if ((student.status === 'TAKING_EXAM' || student.status === 'FLAGGED' || student.status === 'RECONNECTED' || student.status === 'UNDER_INVESTIGATION') && student.currentQuestion < student.totalQuestions) {
        const advanced = Math.random() > 0.45 ? 1 : 0;
        const newQ = Math.min(student.currentQuestion + advanced, student.totalQuestions);
        let newStatus = student.status;
        let evidenceStatus = student.evidenceStatus;
        
        // Randomly simulate connection fluctuations
        let connStability = student.connectionStability;
        let reconnEvents = student.reconnectionEvents;
        if (Math.random() > 0.85) {
          const stabilities: StudentMonitor['connectionStability'][] = ['EXCELLENT', 'STABLE', 'UNSTABLE'];
          connStability = stabilities[Math.floor(Math.random() * stabilities.length)];
          if (connStability === 'UNSTABLE') {
            reconnEvents += 1;
            newStatus = 'DISCONNECTED';
            
            // Log a disconnection activity
            setActivities(act => [
              {
                id: `ACT-${Date.now()}`,
                timestamp,
                type: 'DISCONNECT',
                message: `Examinee ${student.name} connection drop recorded at ${student.testingCenter.split(' - ')[0]}.`,
                center: student.testingCenter.split(' - ')[0],
                user: student.name
              },
              ...act.slice(0, 15)
            ]);
          } else if (student.status === 'DISCONNECTED') {
            newStatus = 'RECONNECTED';
            setActivities(act => [
              {
                id: `ACT-${Date.now()}`,
                timestamp,
                type: 'RECOVERY',
                message: `Examinee ${student.name} re-established secure tunnel. State: RECONNECTED.`,
                center: student.testingCenter.split(' - ')[0],
                user: student.name
              },
              ...act.slice(0, 15)
            ]);
          }
        }

        if (newQ === student.totalQuestions) {
          newStatus = 'SUBMITTED';
          evidenceStatus = 'PENDING';
          // Append submit activity
          setActivities(act => [
            {
              id: `ACT-${Date.now()}`,
              timestamp,
              type: 'SUBMIT',
              message: `${student.name} completed the Exam and successfully submitted. Waiting on video validation.`,
              center: student.testingCenter.split(' - ')[0],
              user: student.name
            },
            ...act.slice(0, 15)
          ]);
        }
        return {
          ...student,
          currentQuestion: newQ,
          status: newStatus as any,
          connectionStability: connStability,
          reconnectionEvents: reconnEvents,
          evidenceStatus
        };
      }

      // If already submitted: progress the recording upload stats
      if (student.status === 'SUBMITTED' && student.recordingUpload !== 'Done') {
        const currentPct = parseInt(student.recordingUpload) || 0;
        const nextPct = Math.min(currentPct + Math.floor(Math.random() * 20) + 10, 100);
        const resolvedPct = nextPct === 100 ? 'Done' : `${nextPct}%`;
        const evidenceStatus = nextPct === 100 ? 'COMPLETED' : 'PENDING';
        const rawVideoSync = nextPct === 100 ? 'SYNCED' : 'PENDING';
        
        return {
          ...student,
          recordingUpload: resolvedPct,
          evidenceStatus: evidenceStatus as any,
          rawVideoSync: rawVideoSync as any
        };
      }

      return student;
    }));

    // 2. Security Audits Random Roll
    if (Math.random() > 0.88) {
      const securityActions = [
        { action: 'VPN_PROXY_DETECTION', module: 'Network Guard', ip: '103.24.120.12', before: 'Direct ISP link', after: 'VPN Tunnel Activated (Blocked)', sev: 'WARNING' },
        { action: 'DEVICE_CHANGE_DETECTED', module: 'Camera Broker', ip: '192.168.12.92', before: 'Logitech C920', after: 'Unknown Virtual Splitter Camera Input', sev: 'ALERT' },
        { action: 'UNAUTHORIZED_ACCESS_ATTEMPT', module: 'Auth Router', ip: '45.89.23.11', before: 'Guest Session Role', after: 'Admin Panel Ingress Aborted', sev: 'CRITICAL' },
        { action: 'SESSION_HIJACK_ATTEMPT', module: 'Cookie Gatekeeper', ip: '112.198.54.43', before: 'Session Tokens Match', after: 'Injected Session Dropped', sev: 'HIGH' }
      ] as const;

      const chosenSec = securityActions[Math.floor(Math.random() * securityActions.length)];
      const randomUser = ['ST-2026-004', 'Admin-Guest', 'Unknown IP', 'ST-2026-007'][Math.floor(Math.random() * 4)];
      
      const newSecLog: SecurityAuditLog = {
        id: `SEC-${Date.now().toString().slice(-3)}`,
        timestamp,
        user: randomUser,
        action: chosenSec.action,
        module: chosenSec.module,
        ipAddress: chosenSec.ip,
        beforeState: chosenSec.before,
        afterState: chosenSec.after,
        severity: chosenSec.sev as any
      };

      setSecurityLogs(prev => [newSecLog, ...prev.slice(0, 15)]);

      setActivities(act => [
        {
          id: `ACT-SEC-${Date.now()}`,
          timestamp,
          type: 'SECURITY',
          message: `SECURITY MONITOR ALARM: ${chosenSec.action} logged on identity ${randomUser}.`,
          center: 'Central Cloud Gateway',
          user: randomUser
        },
        ...act.slice(0, 15)
      ]);
    }

    // 3. Testing Center Health fluctuations
    if (Math.random() > 0.9) {
      setCenters(prev => prev.map(c => {
        if (c.status === 'ACTIVE' && Math.random() > 0.7) {
          const powerModes: CenterMonitor['powerStatus'][] = ['GRID', 'UPS', 'GENERATOR'];
          const newPower = powerModes[Math.floor(Math.random() * powerModes.length)];
          const cctvModes: CenterMonitor['cctvStatus'][] = ['CONNECTED', 'DEGRADED', 'OFFLINE'];
          const newCctv = cctvModes[Math.floor(Math.random() * cctvModes.length)];
          const failures = Math.max(0, c.deviceFailures + (Math.random() > 0.8 ? 1 : 0) - (Math.random() > 0.9 ? 1 : 0));
          const latencyVal = (Math.random() * 2.2).toFixed(1) + 's';
          
          if (newPower !== 'GRID' && c.powerStatus === 'GRID') {
            const warningAlert: LiveAlert = {
              id: `ALR-${Date.now()}`,
              timestamp,
              title: `Power Interruption Event`,
              message: `${c.name} transitioned to ${newPower} backup battery mode.`,
              severity: 'WARNING',
              isRead: false
            };
            setAlerts(al => [warningAlert, ...al.slice(0, 8)]);
          }

          return {
            ...c,
            powerStatus: newPower,
            cctvStatus: newCctv,
            deviceFailures: failures,
            syncDelay: latencyVal
          };
        }
        return c;
      }));
    }

    // 4. Chance to create a suspicious proctored incident
    const eventRoll = Math.random();
    if (eventRoll > 0.85) {
      // Pick a random active student to flag
      const candidates = students.filter(s => s.status === 'TAKING_EXAM' || s.status === 'RECONNECTED');
      if (candidates.length > 0) {
        const student = candidates[Math.floor(Math.random() * candidates.length)];
        const incidentTypes: LiveIncident['type'][] = [
          'Browser Exit',
          'Multiple Faces Detected',
          'Internet Disconnection',
          'Camera Disabled',
          'Suspicious Activity',
          'Tab Switching',
          'Multiple Devices',
          'Audio Anomaly',
          'Camera Obstruction',
          'Fast Answers'
        ];
        const chosenType = incidentTypes[Math.floor(Math.random() * incidentTypes.length)];
        const severities: LiveIncident['severity'][] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
        const chosenSeverity = (chosenType === 'Suspicious Activity' || chosenType === 'Multiple Devices') ? 'CRITICAL' : severities[Math.floor(Math.random() * severities.length)];

        const newIncidentId = `INC-${Date.now().toString().slice(-4)}`;
        const monitoringTeams = ['SOC Cyber Team', 'M-Team Alpha', 'NOC Infra Group', 'M-Team Delta'];
        const priorities: LiveIncident['priority'][] = ['P1', 'P2', 'P3', 'P4'];
        const chosenPriority = chosenSeverity === 'CRITICAL' ? 'P1' : chosenSeverity === 'HIGH' ? 'P2' : chosenSeverity === 'MEDIUM' ? 'P3' : 'P4';

        // Add incident
        const newIncident: LiveIncident = {
          id: newIncidentId,
          timestamp,
          studentName: student.name,
          studentId: student.id,
          type: chosenType,
          severity: chosenSeverity,
          testingCenter: student.testingCenter,
          status: 'OPEN',
          priority: chosenPriority,
          assignedInvestigator: 'Inspector Ramos',
          investigationProgress: 10,
          monitoringTeam: monitoringTeams[Math.floor(Math.random() * monitoringTeams.length)]
        };

        setIncidents(prev => [newIncident, ...prev.slice(0, 20)]);

        // Update student status to flagged
        setStudents(prev => prev.map(s => s.id === student.id ? { ...s, status: 'FLAGGED', incidentFlag: true } : s));

        // Append activity feed
        setActivities(act => [
          {
            id: `ACT-${Date.now()}`,
            timestamp,
            type: 'INCIDENT',
            message: `${chosenSeverity} ${chosenType} flagged for candidate ${student.name} at ${student.testingCenter.split(' - ')[0]}.`,
            center: student.testingCenter.split(' - ')[0],
            user: student.name
          },
          ...act.slice(0, 15)
        ]);

        // Put screen alert flash
        setFlashScreen(true);
        setTimeout(() => setFlashScreen(false), 800);

        // Append system alert message
        if (chosenSeverity === 'CRITICAL' || chosenSeverity === 'HIGH') {
          const newAlert: LiveAlert = {
            id: `ALR-${Date.now()}`,
            timestamp,
            title: `Critical integrity breach: ${chosenType}`,
            message: `${student.name} at ${student.testingCenter} triggered an immediate integrity concern: (${chosenType}).`,
            severity: chosenSeverity as any,
            isRead: false
          };
          setAlerts(prev => [newAlert, ...prev.slice(0, 10)]);
        }
      }
    } else if (eventRoll > 0.78 && eventRoll <= 0.85) {
      // Toggle a Center connection latency or proctor status slightly
      const proctorNames = proctors.filter(p => p.status === 'ONLINE');
      if (proctorNames.length > 0) {
        const targetProctor = proctorNames[Math.floor(Math.random() * proctorNames.length)];
        const randomAwayStatus = Math.random() > 0.6 ? 'AWAY' : 'ONLINE';
        setProctors(prev => prev.map(p => p.id === targetProctor.id ? { ...p, status: randomAwayStatus as any } : p));
        
        if (randomAwayStatus === 'AWAY') {
          setActivities(act => [
            {
              id: `ACT-${Date.now()}`,
              timestamp,
              type: 'INTERVENTION',
              message: `System Alert: Proctor supervisor ${targetProctor.name} status updated to AWAY.`,
              center: targetProctor.testingCenter.split(' - ')[0],
              user: targetProctor.name
            },
            ...act.slice(0, 15)
          ]);
        }
      }
    }
  };

  // --- Real-time updates effect ---
  useEffect(() => {
    if (isSimulating) {
      const intervalMs = simulationSpeed === 'FAST' ? 3000 : 7000;
      timerRef.current = setInterval(() => {
        triggerSimulationTick();
      }, intervalMs);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isSimulating, simulationSpeed, students, proctors]);

  // --- Interactive Simulation Actions ---
  const forceManualIncident = () => {
    const takingExam = students.filter(s => s.status === 'TAKING_EXAM');
    if (takingExam.length === 0) return;
    const student = takingExam[Math.floor(Math.random() * takingExam.length)];
    const incidentType: LiveIncident['type'] = 'Browser Exit';
    const timestamp = getTimestamp();
    const newIncidentId = `INC-${Date.now().toString().slice(-4)}`;

    const newIncident: LiveIncident = {
      id: newIncidentId,
      timestamp,
      studentName: student.name,
      studentId: student.id,
      type: incidentType,
      severity: 'CRITICAL',
      testingCenter: student.testingCenter,
      status: 'OPEN'
    };

    setIncidents(prev => [newIncident, ...prev]);
    setStudents(prev => prev.map(s => s.id === student.id ? { ...s, status: 'FLAGGED', incidentFlag: true } : s));
    setActivities(act => [
      {
        id: `ACT-${Date.now()}`,
        timestamp,
        type: 'INCIDENT',
        message: `CRITICAL Violation Triggered Manually: Browser Exit logged for candidate ${student.name}.`,
          center: student.testingCenter.split(' - ')[0],
          user: student.name
      },
      ...act
    ]);

    setFlashScreen(true);
    setTimeout(() => setFlashScreen(false), 600);
    addAuditLog('INCIDENT_SIMULATED', `Simulated direct critical incident flag for student ${student.name}`);
  };

  const simulateForceReconnect = () => {
    setCenters(prev => prev.map(c => c.status === 'OFFLINE' ? { ...c, status: 'ACTIVE', connectionStatus: 'STABLE' } : c));
    const timestamp = getTimestamp();
    setActivities(act => [
      {
        id: `ACT-${Date.now()}`,
        timestamp,
        type: 'RECOVERY',
        message: 'System recovery: Physical downlink established. MSU Iligan back online.',
        center: 'MSU Iligan',
        user: 'Network Admin'
      },
      ...act
    ]);
    addAuditLog('CENTER_RECONNECTED', 'Forced live environment reconnection parameter simulation');
  };

  // --- Student Actions Handlers (Proctor Intervention) ---
  const handleWarnStudent = (studentId: string) => {
    setStudents(prev => prev.map(s => {
      if (s.id === studentId) {
        const warnings = s.warningsSent + 1;
        return { ...s, warningsSent: warnings };
      }
      return s;
    }));

    const std = students.find(s => s.id === studentId);
    if (std) {
      const timestamp = getTimestamp();
      setActivities(act => [
        {
          id: `ACT-${Date.now()}`,
          timestamp,
          type: 'INTERVENTION',
          message: `Official proctor warning sent to Candidate ${std.name} (${std.warningsSent + 1}/3 warnings).`,
          center: std.testingCenter.split(' - ')[0],
          user: 'Command Center'
        },
        ...act
      ]);
      addAuditLog('WARNING_SENT_COMMAND', `Sent official exam warning to student ${std.name} from control room`);
    }
  };

  const handleResolveIncident = (incId: string, studentId: string) => {
    setIncidents(prev => prev.map(inc => inc.id === incId ? { ...inc, status: 'RESOLVED' } : inc));
    // Check if other flags remain for this student
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, incidentFlag: false, status: 'TAKING_EXAM' } : s));

    const std = students.find(s => s.id === studentId);
    const inc = incidents.find(i => i.id === incId);
    if (std && inc) {
      const timestamp = getTimestamp();
      setActivities(act => [
        {
          id: `ACT-${Date.now()}`,
          timestamp,
          type: 'RECOVERY',
          message: `Incident ${inc.type} cleared by control team. Candidate ${std.name} returned to Taking Exam.`,
          center: std.testingCenter.split(' - ')[0],
          user: 'Support Team'
        },
        ...act
      ]);
      addAuditLog('INCIDENT_RESOLVED', `Incident ${inc.id} on student ${std.name} resolved and cleared`);
    }
    setSelectedIncident(null);
  };

  const handleForceSubmit = (studentId: string) => {
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, status: 'SUBMITTED', currentQuestion: s.totalQuestions } : s));
    const std = students.find(s => s.id === studentId);
    if (std) {
      const timestamp = getTimestamp();
      setActivities(act => [
        {
          id: `ACT-${Date.now()}`,
          timestamp,
          type: 'SUBMIT',
          message: `FORCED SUBMIT: Candidate ${std.name} forced to submit exam on security protocol.`,
          center: std.testingCenter.split(' - ')[0],
          user: 'Superadmin'
        },
        ...act
      ]);
      addAuditLog('EXAM_SUBMISSION_FORCED', `Forced student ${std.name} in exam session due to extreme biometric/integrity logs.`);
    }
    setSelectedStudent(null);
  };

  const handlePauseExam = (studentId: string) => {
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, status: 'IDLE' } : s));
    const std = students.find(s => s.id === studentId);
    if (std) {
      const timestamp = getTimestamp();
      setActivities(act => [
        {
          id: `ACT-${Date.now()}`,
          timestamp,
          type: 'INTERVENTION',
          message: `EXAM SESSION PAUSED: Candidate ${std.name} exam session frozen for manual verification.`,
          center: std.testingCenter.split(' - ')[0],
          user: 'Superadmin'
        },
        ...act
      ]);
      addAuditLog('EXAM_PAUSED', `Paused live exam session of student ${std.name}`);
    }
    setSelectedStudent(null);
  };

  // --- Filtering Helpers ---
  const centersFiltered = centers.filter(center => {
    const matchSearch = center.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          center.assignedProctor.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          center.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || center.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const studentsFiltered = students.filter(student => {
    const matchSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          student.exam.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          student.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCenter = centerFilter === 'ALL' || student.testingCenter.includes(centerFilter);
    const matchStatus = statusFilter === 'ALL' || student.status === statusFilter;
    return matchSearch && matchCenter && matchStatus;
  });

  const proctorsFiltered = proctors.filter(proc => {
    const matchSearch = proc.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          proc.testingCenter.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          proc.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || proc.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const incidentsFiltered = incidents.filter(inc => {
    const matchSearch = inc.studentName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          inc.type.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          inc.testingCenter.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          inc.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          inc.assignedInvestigator.toLowerCase().includes(searchQuery.toLowerCase());
    const matchSeverity = incidentSeverityFilter === 'ALL' || inc.severity === incidentSeverityFilter;
    const matchStatus = incidentStatusFilter === 'ALL' || inc.status === incidentStatusFilter;
    return matchSearch && matchSeverity && matchStatus;
  });

  const securityLogsFiltered = securityLogs.filter(log => {
    const matchSearch = log.user.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          log.action.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          log.module.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          log.ipAddress.includes(searchQuery) ||
                          log.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchSeverity = securitySeverityFilter === 'ALL' || log.severity === securitySeverityFilter;
    return matchSearch && matchSeverity;
  });

  // Clear All Notifications Helper
  const handleClearAlerts = () => {
    setAlerts(prev => prev.map(a => ({ ...a, isRead: true })));
    addAuditLog('ALERTS_CLEARED', 'Cleared all live command alerts');
  };

  return (
    <div className={cn(
      "space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 font-sans p-2 sm:p-4 transition-all duration-300",
      flashScreen ? "bg-red-500/10" : ""
    )}>
      {/* Top Simulated Alerts Banner */}
      <AnimatePresence>
        {alerts.filter(a => !a.isRead).slice(0, 1).map((alert) => (
          <motion.div 
            key={alert.id}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
              "p-3 rounded-xl border flex items-center justify-between gap-4 shadow-md",
              alert.severity === 'CRITICAL' 
                ? "bg-red-50 border-red-200 text-red-900" 
                : "bg-amber-50 border-amber-200 text-amber-900"
            )}
          >
            <div className="flex items-center gap-3">
              <span className={cn(
                "p-1.5 rounded-lg shrink-0 flex items-center justify-center animate-pulse",
                alert.severity === 'CRITICAL' ? "bg-red-200 text-red-800" : "bg-amber-200 text-amber-800"
              )}>
                <Siren className="w-4 h-4" />
              </span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider opacity-75">LIVE ALERT: {alert.timestamp}</p>
                <p className="text-sm font-bold tracking-tight">{alert.title} — {alert.message}</p>
              </div>
            </div>
            <button 
              onClick={() => setAlerts(al => al.map(a => a.id === alert.id ? { ...a, isRead: true } : a))}
              className="px-3 py-1 bg-white/80 hover:bg-white rounded-lg text-xs font-bold shadow-xs transition-all tracking-wide uppercase border border-gray-100"
            >
              Dismiss Alert
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Primary Control Room Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-6 rounded-2xl border border-philsa-border shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-philsa-red opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-philsa-red"></span>
            </span>
            <span className="text-[9px] font-black tracking-[0.2em] uppercase text-philsa-red">MONITORING STATUS</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-philsa-navy tracking-tight leading-none mb-2">
            Exam Command Center
          </h1>
          <p className="text-philsa-gray text-xs font-semibold uppercase tracking-wider">
            Live proctoring status, system metrics, and student alerts
          </p>
        </div>


      </div>

      {/* Required Feature 1: Summary Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {/* Metric 1 */}
        <div className="bg-white p-4 rounded-xl border border-philsa-border shadow-xs flex flex-col justify-between hover:border-philsa-red/30 transition-all">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-700">
              <Building2 className="w-4 h-4" />
            </div>
            <span className="w-1.5 h-1.5 rounded-full bg-[#00563F]" />
          </div>
          <div className="mt-4">
            <h3 className="text-[17px] font-black text-slate-900">{stats.activeCenters}/{stats.totalCenters}</h3>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mt-1">Active Centers</p>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-4 rounded-xl border border-philsa-border shadow-xs flex flex-col justify-between hover:border-philsa-red/30 transition-all">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
              <Users className="w-4 h-4" />
            </div>
            <span className="bg-orange-100 text-orange-800 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">Live</span>
          </div>
          <div className="mt-4">
            <h3 className="text-[17px] font-black text-slate-900">{stats.activeProctors} On-Duty</h3>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mt-1">Active Proctors</p>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-4 rounded-xl border border-philsa-border shadow-xs flex flex-col justify-between hover:border-philsa-red/30 transition-all">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="w-1.5 h-1.5 rounded-full bg-[#00563F] animate-pulse" />
          </div>
          <div className="mt-4">
            <h3 className="text-[17px] font-black text-slate-900">{stats.studentsExamining} Active</h3>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mt-1">Taking Exams</p>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-4 rounded-xl border border-philsa-border shadow-xs flex flex-col justify-between hover:border-philsa-red/30 transition-all">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <span className="text-[9px] font-black text-blue-600">Done</span>
          </div>
          <div className="mt-4">
            <h3 className="text-[17px] font-black text-slate-900">{stats.submittedExams} Done</h3>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mt-1">Submitted Exams</p>
          </div>
        </div>

        {/* Metric 5 */}
        <div className="bg-white p-4 rounded-xl border border-philsa-border shadow-xs flex flex-col justify-between hover:border-philsa-red/30 transition-all bg-red-50/20">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-[#8A1538]">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <span className={cn(
              "w-2 h-2 rounded-full",
              stats.ongoingIncidents > 0 ? "bg-[#8A1538] animate-pulse" : "bg-gray-300"
            )} />
          </div>
          <div className="mt-4">
            <h3 className={cn("text-[17px] font-black", stats.ongoingIncidents > 0 ? "text-[#8A1538]" : "text-slate-900")}>
              {stats.ongoingIncidents} Active
            </h3>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mt-1">Ongoing Incidents</p>
          </div>
        </div>

        {/* Metric 6 */}
        <div className="bg-white p-4 rounded-xl border border-philsa-border shadow-xs flex flex-col justify-between hover:border-philsa-red/30 transition-all">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-red-500">
              <WifiOff className="w-4 h-4" />
            </div>
            <span className="text-[9px] text-red-600 font-bold">Offline</span>
          </div>
          <div className="mt-4">
            <h3 className="text-[17px] font-black text-slate-900">{stats.disconnectedStudents} Offline</h3>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mt-1">Disconnected Users</p>
          </div>
        </div>

        {/* Metric 7 */}
        <div className="bg-white p-4 rounded-xl border border-philsa-border shadow-xs flex flex-col justify-between hover:border-philsa-red/30 transition-all">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <span className="bg-amber-100 text-amber-800 text-[8px] font-black px-1 py-0.2 rounded">Flag</span>
          </div>
          <div className="mt-4">
            <h3 className="text-[17px] font-black text-slate-900">{stats.flaggedActivities} Flagged</h3>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mt-1">Flagged Issues</p>
          </div>
        </div>
      </div>

      {/* Central 2-Column Monitoring Grid (Widescreen Optimized) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Custom Navigation Tab & Main Tab Panels (col-span-12) */}
        <div className="lg:col-span-12 space-y-4">
          <div className="bg-white rounded-2xl border border-philsa-border shadow-xs overflow-hidden">
            {/* Header Tabs with filters embedded */}
            <div className="border-b border-philsa-border bg-philsa-bg/50 px-6 py-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:flex lg:flex-wrap items-center gap-1.5 w-full">
                <button
                  onClick={() => { setActiveTab('KPI'); }}
                  className={cn(
                    "px-3 py-2 rounded-lg text-[10.5px] font-black transition-all uppercase tracking-wider text-center",
                    activeTab === 'KPI' 
                      ? "bg-[#8A1538] text-white shadow-sm" 
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-100 bg-slate-50 border border-slate-100"
                  )}
                >
                  KPI Overview
                </button>
                <button
                  onClick={() => { setActiveTab('REGISTRATION'); }}
                  className={cn(
                    "px-3 py-2 rounded-lg text-[10.5px] font-black transition-all uppercase tracking-wider text-center",
                    activeTab === 'REGISTRATION' 
                      ? "bg-[#8A1538] text-white shadow-sm" 
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-100 bg-slate-50 border border-slate-100"
                  )}
                >
                  Total Registration
                </button>
                <button
                  onClick={() => { setActiveTab('EXECUTION'); }}
                  className={cn(
                    "px-3 py-2 rounded-lg text-[10.5px] font-black transition-all uppercase tracking-wider text-center",
                    activeTab === 'EXECUTION' 
                      ? "bg-[#8A1538] text-white shadow-sm" 
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-100 bg-slate-50 border border-slate-100"
                  )}
                >
                  Exam Execution
                </button>
                <button
                  onClick={() => { setActiveTab('SECURITY'); }}
                  className={cn(
                    "px-3 py-2 rounded-lg text-[10.5px] font-black transition-all uppercase tracking-wider text-center",
                    activeTab === 'SECURITY' 
                      ? "bg-[#8A1538] text-white shadow-sm" 
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-100 bg-slate-50 border border-slate-100"
                  )}
                >
                  Security & Integrity
                </button>
                <button
                  onClick={() => { setActiveTab('PROCTORING'); }}
                  className={cn(
                    "px-3 py-2 rounded-lg text-[10.5px] font-black transition-all uppercase tracking-wider text-center",
                    activeTab === 'PROCTORING' 
                      ? "bg-[#8A1538] text-white shadow-sm" 
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-100 bg-slate-50 border border-slate-100"
                  )}
                >
                  Proctoring Operations
                </button>
                <button
                  onClick={() => { setActiveTab('REGIONAL'); }}
                  className={cn(
                    "px-3 py-2 rounded-lg text-[10.5px] font-black transition-all uppercase tracking-wider text-center",
                    activeTab === 'REGIONAL' 
                      ? "bg-[#8A1538] text-white shadow-sm" 
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-100 bg-slate-50 border border-slate-100"
                  )}
                >
                  Regional Operations
                </button>
                <button
                  onClick={() => { setActiveTab('AUDIT'); }}
                  className={cn(
                    "px-3 py-2 rounded-lg text-[10.5px] font-black transition-all uppercase tracking-wider text-center",
                    activeTab === 'AUDIT' 
                      ? "bg-[#8A1538] text-white shadow-sm" 
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-100 bg-slate-50 border border-slate-100"
                  )}
                >
                  Operational Audit Stream
                </button>
                <button
                  onClick={() => { setActiveTab('DEVICE'); }}
                  className={cn(
                    "px-3 py-2 rounded-lg text-[10.5px] font-black transition-all uppercase tracking-wider text-center",
                    activeTab === 'DEVICE' 
                      ? "bg-[#8A1538] text-white shadow-sm" 
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-100 bg-slate-50 border border-slate-100"
                  )}
                >
                  Device & Stream Link
                </button>
                <button
                  onClick={() => { setActiveTab('ALERT'); }}
                  className={cn(
                    "px-3 py-2 rounded-lg text-[10.5px] font-black transition-all uppercase tracking-wider text-center",
                    activeTab === 'ALERT' 
                      ? "bg-[#8A1538] text-white shadow-sm" 
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-100 bg-slate-50 border border-slate-100"
                  )}
                >
                  Incident Queue Feed
                </button>
              </div>
            </div>

            {/* Custom Interactive Views matching activeTab selection */}
            <div className="p-6">
              {activeTab === 'KPI' && (
                <NationalKpiView 
                  selectedRegion={selectedRegion}
                  setSelectedRegion={setSelectedRegion}
                  selectedTimePeriod={selectedTimePeriod}
                  setSelectedTimePeriod={setSelectedTimePeriod}
                  students={students}
                  proctors={proctors}
                  centers={centers}
                  alerts={alerts}
                  incidents={incidents}
                />
              )}
              {activeTab === 'REGISTRATION' && (
                <TotalRegistrationView 
                  applications={DUMMY_APPLICATIONS} 
                  onViewDetail={(app) => setSelectedApplication(app)} 
                />
              )}
              {activeTab === 'EXECUTION' && (
                <ExamExecutionView 
                  students={students}
                  setSelectedStudent={setSelectedStudent}
                />
              )}
              {activeTab === 'SECURITY' && (
                <SecurityIntegrityView 
                  students={students}
                  incidents={incidents}
                  securityLogs={securityLogs}
                  setSelectedIncident={setSelectedIncident}
                />
              )}
              {activeTab === 'PROCTORING' && (
                <ProctoringOpsView 
                  proctors={proctors}
                />
              )}
              {activeTab === 'REGIONAL' && (
                <RegionalOpsView />
              )}
              {activeTab === 'AUDIT' && (
                <AuditOpsView 
                  securityLogs={securityLogs}
                />
              )}
              {activeTab === 'DEVICE' && (
                <DeviceStreamView 
                  centers={centers}
                />
              )}
              {activeTab === 'ALERT' && (
                <AlertIncidentView 
                  alerts={alerts}
                  incidents={incidents}
                  setAlerts={setAlerts}
                  setIncidents={setIncidents}
                  setSelectedIncident={setSelectedIncident}
                />
              )}
            </div>

            {/* Tab Panel 1: Testing Center Monitoring Options */}
            {activeTab === 'CENTERS' && (
              <div className="space-y-4">
                {/* Sub-navigation Subtoggle for General vs NOC view */}
                <div className="px-6 py-3.5 bg-slate-50 border-b border-philsa-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
                    <button
                      onClick={() => setCentersSubView('GENERAL')}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                        centersSubView === 'GENERAL'
                          ? "bg-slate-900 text-white"
                          : "text-slate-500 hover:text-slate-800"
                      )}
                    >
                      General Ops Overview
                    </button>
                    <button
                      onClick={() => setCentersSubView('NOC')}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all inline-flex items-center gap-1.5",
                        centersSubView === 'NOC'
                          ? "bg-slate-900 text-white"
                          : "text-slate-500 hover:text-slate-800"
                      )}
                    >
                      <Server className="w-3.5 h-3.5 text-philsa-red" /> Substation NOC & Pre-Exam Readiness
                    </button>
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {centersSubView === 'GENERAL' ? 'Standard facility registers' : 'Live hardware & secure check-in telemetry'}
                  </p>
                </div>

                {centersSubView === 'GENERAL' ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-[#FAFAFA] text-[10px] text-philsa-gray font-black uppercase tracking-widest border-b border-philsa-border">
                        <tr>
                          <th className="px-6 py-4">Testing Center Name</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4">Active Session</th>
                          <th className="px-6 py-4 text-center">Active Students</th>
                          <th className="px-6 py-4">Assigned Proctor</th>
                          <th className="px-6 py-4">Uplink Status</th>
                          <th className="px-6 py-4 text-right">Context Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs text-philsa-navy">
                        {centersFiltered.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-6 py-10 text-center text-philsa-gray font-medium">
                              No matching testing centers found. Try adjusting your query parameters.
                            </td>
                          </tr>
                        ) : (
                          centersFiltered.map((center) => (
                            <tr key={center.id} className="hover:bg-philsa-bg/40 transition-colors group">
                              <td className="px-6 py-4 font-bold">
                                <div className="flex items-center gap-2.5">
                                  <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                                  <div>
                                    <p className="leading-tight">{center.name}</p>
                                    <p className="text-[10px] text-philsa-gray/70 font-bold uppercase tracking-wider mt-0.5">{center.id}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={cn(
                                  "inline-flex items-center px-2 py-0.5 rounded text-[9px] font-white uppercase tracking-wider bg-slate-100",
                                  center.status === 'ACTIVE' && "bg-green-50 text-green-700 border border-green-200",
                                  center.status === 'OFFLINE' && "bg-red-50 text-philsa-red border border-red-200",
                                  center.status === 'MAINTENANCE' && "bg-amber-50 text-amber-700 border border-amber-200",
                                  center.status === 'IDLE' && "bg-gray-100 text-philsa-gray border border-gray-200"
                                )}>
                                  {center.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 font-semibold text-slate-700 max-w-[150px] truncate">
                                {center.currentExam}
                              </td>
                              <td className="px-6 py-4 text-center font-bold">
                                {center.activeStudents > 0 ? (
                                  <span className="bg-slate-100 px-2 py-1 rounded">
                                    {center.activeStudents}
                                  </span>
                                ) : (
                                  <span className="text-slate-350">—</span>
                                )}
                              </td>
                              <td className="px-6 py-4 font-bold text-slate-700">
                                {center.assignedProctor}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-1.5">
                                  <span className={cn(
                                    "w-2 h-2 rounded-full",
                                    center.connectionStatus === 'EXCELLENT' && "bg-emerald-500 animate-pulse",
                                    center.connectionStatus === 'STABLE' && "bg-[#00563F]",
                                    center.connectionStatus === 'DEGRADED' && "bg-amber-500",
                                    center.connectionStatus === 'DISCONNECTED' && "bg-red-500"
                                  )} />
                                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                                    {center.connectionStatus}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button
                                  onClick={() => setSelectedCenter(center)}
                                  className="px-3 py-1 bg-philsa-bg hover:bg-slate-100 text-philsa-navy border border-slate-200 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-colors inline-flex items-center gap-1"
                                >
                                  <Eye className="w-3 h-3 text-[#8A1538]" /> Audit
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-[#FAFAFA] text-[10px] text-philsa-gray font-black uppercase tracking-widest border-b border-philsa-border">
                        <tr>
                          <th className="px-6 py-4">Center / Facilities</th>
                          <th className="px-6 py-4">Readiness Status</th>
                          <th className="px-6 py-4">Hardware Telemetries</th>
                          <th className="px-6 py-4">Biometrics check in</th>
                          <th className="px-6 py-4">Substation Link & Power</th>
                          <th className="px-6 py-4 text-center font-mono">Sync Delay</th>
                          <th className="px-6 py-4 text-right">Verification</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs text-philsa-navy">
                        {centersFiltered.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-6 py-10 text-center text-philsa-gray font-medium">
                              No matching testing substations found.
                            </td>
                          </tr>
                        ) : (
                          centersFiltered.map((center) => {
                            // Calculate an explicit readiness score
                            let readinessStatus: 'READY' | 'PENDING' | 'MISSING_REQUISITES' | 'OFFLINE' = 'READY';
                            if (center.status === 'OFFLINE') {
                              readinessStatus = 'OFFLINE';
                            } else if (center.cctvStatus === 'OFFLINE' || center.deviceFailures > 5) {
                              readinessStatus = 'MISSING_REQUISITES';
                            } else if (center.biometricStatus === 'PENDING' || center.cctvStatus === 'DEGRADED') {
                              readinessStatus = 'PENDING';
                            }

                            return (
                              <tr key={center.id} className="hover:bg-philsa-bg/40 transition-colors">
                                <td className="px-6 py-4 font-bold">
                                  <div>
                                    <p className="leading-tight">{center.name}</p>
                                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">PROCTOR: {center.assignedProctor}</p>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className={cn(
                                    "inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider",
                                    readinessStatus === 'READY' && "bg-green-50 text-green-700 border border-green-200",
                                    readinessStatus === 'PENDING' && "bg-amber-50 text-amber-700 border border-amber-200",
                                    readinessStatus === 'MISSING_REQUISITES' && "bg-rose-50 text-red-700 border border-red-200 animate-pulse",
                                    readinessStatus === 'OFFLINE' && "bg-red-100 text-red-900 border border-red-300"
                                  )}>
                                    {readinessStatus.replace('_', ' ')}
                                  </span>
                                </td>
                                <td className="px-6 py-4 space-y-1">
                                  <div className="flex items-center gap-1.5 font-semibold text-slate-600">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase">CCTV:</span>
                                    <span className={cn(
                                      "inline-flex w-1.5 h-1.5 rounded-full",
                                      center.cctvStatus === 'CONNECTED' && "bg-[#00563F]",
                                      center.cctvStatus === 'DEGRADED' && "bg-amber-500 animate-pulse",
                                      center.cctvStatus === 'OFFLINE' && "bg-red-500"
                                    )} />
                                    <span className="text-[10px] font-bold text-slate-800 uppercase">{center.cctvStatus}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-medium">
                                    <span className="text-[10px] text-slate-400 font-bold">DEVICES:</span>
                                    <span className="font-extrabold text-slate-800">{center.deviceReadiness}</span>
                                    {center.deviceFailures > 0 && (
                                      <span className="bg-red-50 text-philsa-red font-bold text-[8px] px-1 rounded">
                                        {center.deviceFailures} Failures
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className={cn(
                                    "inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide",
                                    center.biometricStatus === 'VALIDATED' && "bg-blue-50 text-blue-750 border border-blue-200",
                                    center.biometricStatus === 'PENDING' && "bg-amber-50 text-amber-700 border border-amber-200",
                                    center.biometricStatus === 'ISSUES' && "bg-red-50 text-red-700 border border-red-200 animate-pulse"
                                  )}>
                                    {center.biometricStatus}
                                  </span>
                                </td>
                                <td className="px-6 py-4 space-y-1">
                                  <div className="flex items-center gap-1.5 font-semibold text-slate-600">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase">LINK:</span>
                                    <span className="text-[10px] font-bold text-slate-800">{center.internetStability} Ping</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-medium">
                                    <span className="text-[10px] text-slate-400 font-bold">BACKUP:</span>
                                    <span className={cn(
                                      "px-1 py-0.5 rounded text-[8px] font-black uppercase text-white tracking-widest leading-none",
                                      center.powerStatus === 'GRID' && "bg-slate-400",
                                      center.powerStatus === 'UPS' && "bg-blue-600",
                                      center.powerStatus === 'GENERATOR' && "bg-orange-500",
                                      center.powerStatus === 'FAILURE' && "bg-red-650 animate-pulse"
                                    )}>
                                      {center.powerStatus}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-center font-mono font-bold text-[#8A1538]">
                                  {center.syncDelay}
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <button
                                    onClick={() => setSelectedCenter(center)}
                                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-philsa-navy border border-slate-200 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-colors inline-flex items-center gap-1"
                                  >
                                    <Activity className="w-3.5 h-3.5 text-slate-700" /> Verify Telemetry
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Required Feature 4: Proctor Monitoring Panel */}
            {activeTab === 'PROCTORS' && (
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left">
                  <thead className="bg-[#FAFAFA] text-[10px] text-philsa-gray font-black uppercase tracking-widest border-b border-philsa-border">
                    <tr>
                      <th className="px-6 py-4">Proctor Credentials</th>
                      <th className="px-6 py-4">Testing Facility Location</th>
                      <th className="px-6 py-4">Assigned Room</th>
                      <th className="px-6 py-4 text-center">Candidates Assigned</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 font-mono">Session Duration</th>
                      <th className="px-6 py-4 text-right">Intercom Contact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {proctorsFiltered.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-10 text-center text-philsa-gray font-medium">
                          No proctors verified matching current audit parameters.
                        </td>
                      </tr>
                    ) : (
                      proctorsFiltered.map((proc) => (
                        <tr key={proc.id} className="hover:bg-philsa-bg/40 transition-colors group">
                          <td className="px-6 py-4 font-bold text-philsa-navy">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-philsa-red/5 text-[#8A1538] flex items-center justify-center font-black">
                                {proc.name.split(' ').slice(-1)[0][0]}
                              </div>
                              <div>
                                <p className="leading-tight">{proc.name}</p>
                                <p className="text-[10px] text-gray-500 font-semibold">{proc.id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-semibold text-slate-700">
                            {proc.testingCenter}
                          </td>
                          <td className="px-6 py-4 text-slate-600 font-bold">
                            {proc.assignedRoom}
                          </td>
                          <td className="px-6 py-4 text-center font-extrabold text-philsa-navy">
                            {proc.studentsHandled > 0 ? (
                              <span className="bg-[#e5f1ec] text-[#00563F] px-2.5 py-1 rounded border border-[#00563F]/20">
                                {proc.studentsHandled} Students
                              </span>
                            ) : (
                              <span className="text-slate-300">0 Handled</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider",
                              proc.status === 'ONLINE' && "bg-green-50 text-green-700 border border-green-200",
                              proc.status === 'AWAY' && "bg-amber-50 text-amber-700 border border-amber-200",
                              proc.status === 'OFFLINE' && "bg-slate-100 text-slate-500 border border-slate-300"
                            )}>
                              {proc.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-mono text-slate-500">
                            {proc.sessionDuration}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => alert(`Opening peer-to-peer administrative intercom channel with Proctor: ${proc.name}`)}
                              className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 shadow-xs text-philsa-navy rounded-lg font-bold text-[10px] uppercase tracking-wider"
                            >
                              Message
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Required Feature 6: Exam Schedule Overview */}
            {activeTab === 'SCHEDULES' && (
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <h3 className="text-xs font-black uppercase tracking-wider text-philsa-navy">Active and Scheduled Batches</h3>
                  <span className="text-[10px] text-philsa-gray font-bold uppercase bg-slate-100 px-2.5 py-1 rounded">Semester Cycle: 2026-A</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-sans">
                  {/* Item 1 */}
                  <div className="p-4 rounded-xl border border-philsa-border bg-slate-50/50 hover:bg-white transition-all">
                    <span className="inline-flex px-2 py-0.5 bg-[#e5f1ec] text-[#00563F] border border-green-200 rounded text-[9px] font-black tracking-wider uppercase mb-3">ONGOING NOW</span>
                    <p className="font-extrabold text-[#8A1538] text-sm">PhilSA National Qualifying Exam</p>
                    <div className="mt-2 text-slate-600 font-semibold space-y-1">
                      <p>Schedule: May 28, 08:00 - 11:00 UTC</p>
                      <p>Centers: UP Diliman, UP Cebu, Ateneo de Davao</p>
                      <p>Proctors: 4 Active Supervisors</p>
                      <p className="font-extrabold text-philsa-navy mt-2">Examinees: 113 Registered Sessions</p>
                    </div>
                  </div>

                  {/* Item 2 */}
                  <div className="p-4 rounded-xl border border-philsa-border bg-slate-50/50 hover:bg-white transition-all">
                    <span className="inline-flex px-2 py-0.5 bg-[#e5f1ec] text-[#00563F] border border-green-200 rounded text-[9px] font-black tracking-wider uppercase mb-3">ONGOING NOW</span>
                    <p className="font-extrabold text-[#8A1538] text-sm">Aerospace Eng Aptitude Exam</p>
                    <div className="mt-2 text-slate-600 font-semibold space-y-1">
                      <p>Schedule: May 28, 14:00 - 17:00 UTC</p>
                      <p>Centers: UST Manila, UP Cebu</p>
                      <p>Proctors: 2 Active Supervisors</p>
                      <p className="font-extrabold text-philsa-navy mt-2">Examinees: 42 Registered Sessions</p>
                    </div>
                  </div>

                  {/* Item 3 */}
                  <div className="p-4 rounded-xl border border-philsa-border bg-slate-50/50 hover:bg-white transition-all">
                    <span className="inline-flex px-2 py-0.5 bg-gray-100 text-slate-600 border border-slate-300 rounded text-[9px] font-black tracking-wider uppercase mb-3">UPCOMING TOMORROW</span>
                    <p className="font-extrabold text-[#8A1538] text-sm">Space Physics Screening Exam</p>
                    <div className="mt-2 text-slate-600 font-semibold space-y-1">
                      <p>Schedule: May 29, 09:00 - 12:00 UTC</p>
                      <p>Centers: UP Diliman, DLSU Manila</p>
                      <p>Proctors: 3 Assigned Supervisors</p>
                      <p className="font-extrabold text-philsa-navy mt-2">Examinees: 85 Candidates Registered</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab Panel 2: Examinee Telemetry Tracker */}
            {activeTab === 'EXAMINEES' && (
              <div className="space-y-4">
                {/* Sub-navigation Switcher */}
                <div className="px-6 py-3.5 bg-slate-50 border-b border-philsa-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
                    <button
                      onClick={() => setExamineesSubView('ACTIVE')}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                        examineesSubView === 'ACTIVE'
                          ? "bg-slate-900 text-white"
                          : "text-slate-500 hover:text-slate-800"
                      )}
                    >
                      Active Session Tracker
                    </button>
                    <button
                      onClick={() => setExamineesSubView('POST_EXAM')}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all inline-flex items-center gap-1.5",
                        examineesSubView === 'POST_EXAM'
                          ? "bg-slate-900 text-white"
                          : "text-slate-500 hover:text-slate-800"
                      )}
                    >
                      <CheckSquare className="w-3.5 h-3.5 text-emerald-600" /> Post-Exam Submission Audits
                    </button>
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {examineesSubView === 'ACTIVE' ? 'Live student telemetry & link integrity' : 'Media uploads & security proof validation'}
                  </p>
                </div>

                {examineesSubView === 'ACTIVE' ? (
                  <div className="overflow-x-auto text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-[#FAFAFA] text-[10px] text-philsa-gray font-black uppercase tracking-widest border-b border-philsa-border">
                        <tr>
                          <th className="px-6 py-4">Examinee Details</th>
                          <th className="px-6 py-4">Assessment / Duration</th>
                          <th className="px-6 py-4">Connection Stabiliity</th>
                          <th className="px-6 py-4 text-center">Progress Gauge</th>
                          <th className="px-6 py-4 text-center">Verification Integrity</th>
                          <th className="px-6 py-4 text-right">Emergency Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {studentsFiltered.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-10 text-center text-philsa-gray font-medium">
                              No active candidate telemetry records found.
                            </td>
                          </tr>
                        ) : (
                          studentsFiltered.map((student) => (
                            <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4 font-bold text-slate-900">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 bg-slate-150 rounded-full flex items-center justify-center font-bold text-slate-700">
                                    {student.name[0]}
                                  </div>
                                  <div>
                                    <p className="leading-tight">{student.name}</p>
                                    <p className="text-[9px] text-philsa-red font-bold uppercase mt-0.5">{student.id} • {student.testingCenter.split(' - ')[0]}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <p className="font-semibold text-slate-700 max-w-[170px] truncate">{student.exam}</p>
                                <p className="text-[9px] font-mono text-slate-400 mt-0.5">LEFT: {student.timeRemaining}</p>
                              </td>
                              <td className="px-6 py-4 space-y-1">
                                <div className="flex items-center gap-1.5 font-semibold text-slate-600">
                                  <span className={cn(
                                    "inline-flex w-1.5 h-1.5 rounded-full",
                                    student.connectionStability === 'EXCELLENT' && "bg-[#00563F]",
                                    student.connectionStability === 'STABLE' && "bg-teal-600",
                                    student.connectionStability === 'UNSTABLE' && "bg-red-500 animate-pulse"
                                  )} />
                                  <span className="text-[10px] font-bold text-slate-800 uppercase leading-none">{student.connectionStability}</span>
                                </div>
                                {student.reconnectionEvents > 0 && (
                                  <p className="text-[8.5px] font-black text-rose-600 uppercase">
                                    {student.reconnectionEvents} Drops Re-authorized
                                  </p>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-col items-center justify-center">
                                  <span className="font-bold text-slate-700 text-[10px]">Q {student.currentQuestion}/{student.totalQuestions} ({Math.round((student.currentQuestion / student.totalQuestions) * 100)}%)</span>
                                  <div className="w-20 h-1 bg-slate-100 rounded-full overflow-hidden mt-1">
                                    <div 
                                      className="h-full bg-philsa-red" 
                                      style={{ width: `${(student.currentQuestion / student.totalQuestions) * 100}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className={cn(
                                  "inline-flex items-center px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider",
                                  student.status === 'TAKING_EXAM' && "bg-green-50 text-green-700 border border-green-200",
                                  student.status === 'FLAGGED' && "bg-rose-150 text-red-700 border border-red-350 animate-pulse",
                                  student.status === 'DISCONNECTED' && "bg-red-50 text-[#8A1538] border border-red-200",
                                  student.status === 'RECONNECTED' && "bg-blue-50 text-blue-800 border border-blue-200",
                                  student.status === 'SUBMITTED' && "bg-zinc-150 text-zinc-700 border border-zinc-300",
                                  student.status === 'IDLE' && "bg-zinc-50 text-slate-500 border border-zinc-200"
                                )}>
                                  {student.status.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button
                                  onClick={() => setSelectedStudent(student)}
                                  className="px-2 py-1 bg-white hover:bg-slate-150 border border-slate-200 rounded-lg text-[9px] font-black uppercase tracking-wider"
                                >
                                  Triage
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="overflow-x-auto text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-[#FAFAFA] text-[10px] text-philsa-gray font-black uppercase tracking-widest border-b border-philsa-border">
                        <tr>
                          <th className="px-6 py-4">Candidate Identity</th>
                          <th className="px-6 py-4">Assigned Assessment</th>
                          <th className="px-6 py-4">Submission Status</th>
                          <th className="px-6 py-4">Recording Upload</th>
                          <th className="px-6 py-4">Evidence Validation</th>
                          <th className="px-6 py-4 text-center">Video Sync State</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs text-philsa-navy">
                        {studentsFiltered.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-6 py-10 text-center text-philsa-gray font-normal">
                              No submission audit items registered today.
                            </td>
                          </tr>
                        ) : (
                          studentsFiltered.map((student) => (
                            <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4 font-bold">
                                <div>
                                  <p className="leading-tight">{student.name}</p>
                                  <p className="text-[9px] text-gray-500 font-bold uppercase mt-0.5">{student.id}</p>
                                </div>
                              </td>
                              <td className="px-6 py-4 font-semibold text-slate-650 truncate max-w-[150px]">
                                {student.exam}
                              </td>
                              <td className="px-6 py-4">
                                {student.status === 'SUBMITTED' ? (
                                  <span className="bg-[#e5f1ec] text-[#00563F] font-black text-[9px] px-2 py-0.5 rounded border border-[#00563F]/20">
                                    SUCCESSFUL SUBMISSION
                                  </span>
                                ) : (
                                  <span className="bg-amber-50 text-amber-800 font-extrabold text-[9px] px-2 py-0.5 rounded border border-amber-250">
                                    SESSION ONGOING
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                {student.recordingUpload === 'Done' ? (
                                  <span className="text-[#00563F] font-black text-[10px] flex items-center gap-1 select-none">
                                    <Check className="w-3.5 h-3.5" /> Synchronized
                                  </span>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-amber-500" 
                                        style={{ width: student.recordingUpload }}
                                      />
                                    </div>
                                    <span className="font-mono text-[9px] text-slate-500">{student.recordingUpload}</span>
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <span className={cn(
                                  "inline-flex items-center px-2 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider",
                                  student.evidenceStatus === 'COMPLETED' && "bg-green-50 text-green-705 border border-green-200",
                                  student.evidenceStatus === 'PENDING' && "bg-amber-50 text-amber-700 border border-amber-250",
                                  student.evidenceStatus === 'REJECTED' && "bg-red-50 text-[#8A1538] border border-red-250 animate-pulse",
                                  student.evidenceStatus === 'NONE' && "bg-slate-50 text-slate-400 border border-slate-200"
                                )}>
                                  {student.evidenceStatus}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className={cn(
                                  "inline-flex items-center px-1.5 py-0.5 rounded text-[8.5px] font-mono font-bold uppercase",
                                  student.rawVideoSync === 'SYNCED' && "bg-blue-50 text-blue-700 border border-blue-200",
                                  student.rawVideoSync === 'PENDING' && "bg-slate-100 text-slate-500",
                                  student.rawVideoSync === 'FAILED' && "bg-red-50 text-philsa-red border border-red-200",
                                  student.rawVideoSync === 'NONE' && "text-slate-350"
                                )}>
                                  {student.rawVideoSync}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button
                                  onClick={() => setSelectedStudent(student)}
                                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-[9px] font-black uppercase tracking-wider"
                                >
                                  View Audit
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Tab Panel 5: Incident Escalation & Response Workflow */}
            {activeTab === 'ESCALATIONS' && (
              <div className="space-y-4">
                <div className="px-6 py-3.5 bg-slate-50 border-b border-philsa-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h3 className="text-xs font-black uppercase tracking-widest text-philsa-navy">Unified Investigation Triage Dashboard</h3>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-150 px-2.5 py-1 rounded">
                    Total Active Triage Queue: {incidentsFiltered.filter(i => i.status !== 'RESOLVED' && i.status !== 'CLOSED').length} Incidents
                  </span>
                </div>

                <div className="overflow-x-auto text-xs text-philsa-navy">
                  <table className="w-full text-left">
                    <thead className="bg-[#FAFAFA] text-[10px] text-philsa-gray font-black uppercase tracking-widest border-b border-philsa-border">
                      <tr>
                        <th className="px-5 py-4">Incident Details</th>
                        <th className="px-5 py-4">Affected Examinee</th>
                        <th className="px-5 py-4">Severity / Rank</th>
                        <th className="px-5 py-4">Assigned Analyst</th>
                        <th className="px-5 py-4">Triage Step Progress</th>
                        <th className="px-5 py-4">Monitoring Squad</th>
                        <th className="px-5 py-4">Operational Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {incidentsFiltered.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-5 py-10 text-center text-slate-400 font-semibold uppercase">
                            No incident reports currently queued in triage.
                          </td>
                        </tr>
                      ) : (
                        incidentsFiltered.map((inc) => (
                          <tr key={inc.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-5 py-3.5 font-bold">
                              <div>
                                <p className="leading-tight text-slate-900">{inc.type}</p>
                                <p className="text-[9px] text-[#8A1538] font-bold uppercase mt-0.5">{inc.id} • {inc.timestamp}</p>
                              </div>
                            </td>
                            <td className="px-5 py-3.5">
                              <p className="font-extrabold text-slate-900 leading-none">{inc.studentName}</p>
                              <p className="text-[9px] text-slate-500 font-semibold mt-1">{inc.testingCenter.split(' - ')[0]}</p>
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-1.5">
                                <span className={cn(
                                  "px-2 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider",
                                  inc.severity === 'CRITICAL' && "bg-red-50 text-red-750 border border-red-200",
                                  inc.severity === 'HIGH' && "bg-amber-50 text-amber-700 border border-amber-250",
                                  inc.severity === 'MEDIUM' && "bg-indigo-50 text-indigo-700 border border-indigo-200",
                                  inc.severity === 'LOW' && "bg-slate-50 text-slate-500 border border-slate-200"
                                )}>
                                  {inc.severity}
                                </span>
                                <span className={cn(
                                  "inline-flex items-center justify-center font-black rounded text-[8.5px] px-1.5 py-0.5 text-white shadow-xs",
                                  inc.priority === 'P1' && "bg-red-600 animate-pulse",
                                  inc.priority === 'P2' && "bg-orange-500",
                                  inc.priority === 'P3' && "bg-amber-500",
                                  inc.priority === 'P4' && "bg-zinc-400"
                                )}>
                                  {inc.priority || 'P1'}
                                </span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5">
                              <select
                                value={inc.assignedInvestigator || 'Unassigned'}
                                onChange={(e) => {
                                  const nameVal = e.target.value;
                                  setIncidents(prev => prev.map(item => item.id === inc.id ? { ...item, assignedInvestigator: nameVal } : item));
                                  addAuditLog('INVESTIGATOR_ASSIGNED', `Assigned investigator ${nameVal} to incident ${inc.id}`);
                                }}
                                className="bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-[10px] font-bold focus:outline-none"
                              >
                                <option value="Unassigned">Unassigned</option>
                                <option value="Inspector Ramos">Inspector Ramos</option>
                                <option value="Superintend Santos">Superintend Santos</option>
                                <option value="Specialist Cruz">Specialist Cruz</option>
                                <option value="Analyst Torres">Analyst Torres</option>
                              </select>
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2">
                                <div className="w-14 h-1.5 bg-slate-100 rounded-full overflow-hidden shrink-0">
                                  <div 
                                    className="h-full bg-philsa-red" 
                                    style={{ width: `${inc.investigationProgress || 10}%` }}
                                  />
                                </div>
                                <span className="font-mono text-[9px] font-black text-slate-700">{inc.investigationProgress || 10}%</span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                              {inc.monitoringTeam || 'M-Team Alpha'}
                            </td>
                            <td className="px-5 py-3.5">
                              <select
                                value={inc.status}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  // Update student too if resolved
                                  setIncidents(prev => prev.map(item => item.id === inc.id ? { ...item, status: val as any, investigationProgress: val === 'RESOLVED' ? 100 : val === 'INVESTIGATING' ? 45 : 10 } : item));
                                  if (val === 'RESOLVED' || val === 'CLOSED') {
                                    setStudents(prev => prev.map(s => s.id === inc.studentId ? { ...s, incidentFlag: false, status: 'TAKING_EXAM' } : s));
                                  }
                                  addAuditLog('INCIDENT_STATUS_CHANGE', `Transitioned incident ${inc.id} status to ${val}`);
                                }}
                                className={cn(
                                  "bg-white border text-[10px] font-black uppercase rounded py-1 px-1.5 focus:outline-none tracking-widest leading-none outline-none text-left shrink-0 cursor-pointer",
                                  inc.status === 'OPEN' && "text-red-700 border-red-300 bg-red-50",
                                  inc.status === 'INVESTIGATING' && "text-amber-700 border-amber-300 bg-amber-50",
                                  inc.status === 'ESCALATED' && "text-purple-700 border-purple-300 bg-purple-50 animate-pulse",
                                  inc.status === 'RESOLVED' && "text-green-700 border-green-300 bg-green-50",
                                  inc.status === 'CLOSED' && "text-slate-505 border-slate-300 bg-slate-50"
                                )}
                              >
                                <option value="OPEN">OPEN</option>
                                <option value="INVESTIGATING">INVESTIGATING</option>
                                <option value="ESCALATED">ESCALATED</option>
                                <option value="RESOLVED">RESOLVED</option>
                                <option value="CLOSED">CLOSED</option>
                              </select>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab Panel 6: Security and Multi-Factor Audits Panel */}
            {activeTab === 'SECURITY' && (
              <div className="space-y-4">
                <div className="px-6 py-3.5 bg-slate-50 border-b border-philsa-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h3 className="text-xs font-black uppercase tracking-widest text-[#8A1538] inline-flex items-center gap-1.5">
                    <Shield className="w-4 h-4" /> Secure Identity Ingress & Node Hijacking Log
                  </h3>
                  <span className="text-[10px] font-bold text-slate-500 bg-white border px-2.5 py-1 rounded">
                    Security Watchtower Central Admin Module
                  </span>
                </div>

                <div className="overflow-x-auto text-xs text-philsa-navy">
                  <table className="w-full text-left">
                    <thead className="bg-[#FAFAFA] text-[10px] text-philsa-gray font-black uppercase tracking-widest border-b border-philsa-border">
                      <tr>
                        <th className="px-5 py-4">Timestamp / Clock</th>
                        <th className="px-5 py-4">Security Level</th>
                        <th className="px-5 py-4">Affected Identity</th>
                        <th className="px-5 py-4 font-mono">Routing Network (IP)</th>
                        <th className="px-5 py-4">Core Intercepted Event</th>
                        <th className="px-5 py-4 text-center">Security State Diff (Before &rarr; After)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {securityLogsFiltered.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-5 py-10 text-center text-slate-400 font-semibold uppercase">
                            No security incidents logged. All identities verified.
                          </td>
                        </tr>
                      ) : (
                        securityLogsFiltered.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-5 py-3.5 font-bold font-mono text-[9px] text-[#8A1538]">
                              {log.timestamp}
                            </td>
                            <td className="px-5 py-3.5">
                              <span className={cn(
                                "px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase tracking-widest leading-none",
                                log.severity === 'CRITICAL' && "bg-red-200 text-red-900 border border-red-350",
                                log.severity === 'HIGH' && "bg-orange-100 text-orange-900",
                                log.severity === 'WARNING' && "bg-amber-100 text-amber-900",
                                log.severity === 'ALERT' && "bg-amber-200 text-slate-900 border border-amber-305",
                                log.severity === 'INFO' && "bg-slate-100 text-slate-700"
                              )}>
                                {log.severity}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              <p className="font-extrabold text-slate-900 leading-none">{log.user}</p>
                              <p className="text-[9px] text-slate-450 uppercase font-bold mt-1">MODULE: {log.module}</p>
                            </td>
                            <td className="px-5 py-3.5 font-mono text-[10px] text-slate-600 font-bold">
                              {log.ipAddress}
                            </td>
                            <td className="px-5 py-3.5 font-bold text-slate-900">
                              {log.action.replace(/_/g, ' ')}
                            </td>
                            <td className="px-5 py-3.5 text-center font-semibold text-slate-600 text-[10px]">
                              <span className="bg-red-50 text-[#8A1538] px-1 rounded line-through text-[9px]">{log.beforeState}</span>
                              <span className="text-slate-400 font-black px-1.5">&rarr;</span>
                              <span className="bg-green-50 text-[#00563F] px-1.5 py-0.5 rounded font-bold text-[9px]">{log.afterState}</span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab Panel 7: Real-Time Operational Analytics (Recharts Integration) */}
            {activeTab === 'ANALYTICS' && (
              <div className="p-6 space-y-6">
                <div className="pb-4 border-b border-slate-100 flex justify-between items-center">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-philsa-navy">Command Operations Trend Analytics</h3>
                    <p className="text-[10px] text-slate-450 uppercase font-semibold mt-0.5">Statistical NOC latency & risk matrix profiles</p>
                  </div>
                  <span className="text-[9px] font-black tracking-widest uppercase bg-green-50 text-[#00563F] px-2.5 py-1 rounded animate-pulse inline-flex items-center gap-1.5">
                    <Activity className="w-3 h-3" /> Live Feed Active
                  </span>
                </div>

                {/* Grid of 4 charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Chart 1: Substation Latency and stability Index over time */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-3">Substation Latency Index (Last 10 Hours)</p>
                    <div className="h-44 text-[10px] font-mono">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={[
                            { time: '08:00', Diliman: 0.2, Cebu: 0.5, Davao: 0.4 },
                            { time: '09:00', Diliman: 0.4, Cebu: 1.2, Davao: 0.5 },
                            { time: '10:00', Diliman: 0.3, Cebu: 0.9, Davao: 0.8 },
                            { time: '11:00', Diliman: 0.8, Cebu: 2.5, Davao: 0.6 },
                            { time: '12:00', Diliman: 0.5, Cebu: 1.1, Davao: 1.2 },
                            { time: '13:00', Diliman: 0.3, Cebu: 0.8, Davao: 0.9 },
                            { time: '14:00', Diliman: 0.4, Cebu: 1.5, Davao: 1.1 },
                            { time: '15:00', Diliman: 0.6, Cebu: 1.2, Davao: 1.4 },
                          ]}
                          margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient id="colorDiliman" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8A1538" stopOpacity={0.4}/>
                              <stop offset="95%" stopColor="#8A1538" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorCebu" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#00563F" stopOpacity={0.4}/>
                              <stop offset="95%" stopColor="#00563F" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                          <XAxis dataKey="time" stroke="#94A3B8" />
                          <YAxis stroke="#94A3B8" label={{ value: 'Latency (s)', angle: -90, position: 'insideLeft', style: { fill: '#94A3B8' } }} />
                          <Tooltip contentStyle={{ fontSize: '11px', fontWeight: 'bold', fontFamily: 'monospace' }} />
                          <Legend wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontStyle: 'bold' }} />
                          <Area type="monotone" dataKey="Diliman" stroke="#8A1538" strokeWidth={1.5} fillOpacity={1} fill="url(#colorDiliman)" name="UP Diliman" />
                          <Area type="monotone" dataKey="Cebu" stroke="#00563F" strokeWidth={1.5} fillOpacity={1} fill="url(#colorCebu)" name="UP Cebu" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Chart 2: Submissions cumulative count vs security alerts index */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-3">Submissions vs Security Incidents Rate</p>
                    <div className="h-44 text-[10px] font-mono">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={[
                            { center: 'UPD', Submitted: 45, Alerts: 12 },
                            { center: 'UPC', Submitted: 24, Alerts: 8 },
                            { center: 'AdDU', Submitted: 28, Alerts: 19 },
                            { center: 'UST', Submitted: 12, Alerts: 2 },
                            { center: 'DLSU', Submitted: 32, Alerts: 4 },
                          ]}
                          margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                          <XAxis dataKey="center" stroke="#94A3B8" />
                          <YAxis stroke="#94A3B8" />
                          <Tooltip contentStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                          <Legend wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase' }} />
                          <Bar dataKey="Submitted" fill="#00563F" radius={[4, 4, 0, 0]} name="Successful Submissions" />
                          <Bar dataKey="Alerts" fill="#8A1538" radius={[4, 4, 0, 0]} name="Violation Events" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Chart 3: Proctor command response averages in seconds */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-3">Proctor Average Intervention Response (s)</p>
                    <div className="h-44 text-[10px] font-mono">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          layout="vertical"
                          data={[
                            { name: 'Dr. Mendoza', speed: 8.5 },
                            { name: 'Prof. Sanchez', speed: 18.2 },
                            { name: 'Dr. Almeda', speed: 12.0 },
                            { name: 'Engr. Ramos', speed: 5.4 },
                          ]}
                          margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                          <XAxis type="number" stroke="#94A3B8" />
                          <YAxis dataKey="name" type="category" stroke="#94A3B8" width={80} style={{ fontSize: '9px', fontWeight: 'bold' }} />
                          <Tooltip contentStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                          <Bar dataKey="speed" fill="#3B82F6" radius={[0, 4, 4, 0]} name="Response Speed (seconds)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Chart 4: Violation type fractions (Pie Chart) */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-3">Risk Distribution Category Profile</p>
                    <div className="h-44 text-[10px] font-mono relative flex items-center justify-between gap-2">
                      <div className="w-1/2 h-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: 'Browser Exit', value: 34, color: '#8A1538' },
                                { name: 'Tab Switching', value: 25, color: '#F59E0B' },
                                { name: 'Multiple Faces', value: 18, color: '#EF4444' },
                                { name: 'Camera Off', value: 13, color: '#3B82F6' },
                                { name: 'Audio Anomaly', value: 10, color: '#10B981' },
                              ]}
                              innerRadius={30}
                              outerRadius={55}
                              paddingAngle={3}
                              dataKey="value"
                            >
                              {[
                                { name: 'Browser Exit', value: 34, color: '#8A1538' },
                                { name: 'Tab Switching', value: 25, color: '#F59E0B' },
                                { name: 'Multiple Faces', value: 18, color: '#EF4444' },
                                { name: 'Camera Off', value: 13, color: '#3B82F6' },
                                { name: 'Audio Anomaly', value: 10, color: '#10B981' },
                              ].map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ fontSize: '10px' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="w-1/2 text-[9px] font-sans font-bold text-slate-650 space-y-1">
                        <div className="flex items-center gap-1.5"><span className="w-2.5 h-1.5 rounded-xs" style={{backgroundColor:'#8A1538'}} /> Browser Exit (34%)</div>
                        <div className="flex items-center gap-1.5"><span className="w-2.5 h-1.5 rounded-xs" style={{backgroundColor:'#F59E0B'}} /> Tab Switch (25%)</div>
                        <div className="flex items-center gap-1.5"><span className="w-2.5 h-1.5 rounded-xs" style={{backgroundColor:'#EF4444'}} /> Multi Faces (18%)</div>
                        <div className="flex items-center gap-1.5"><span className="w-2.5 h-1.5 rounded-xs" style={{backgroundColor:'#3B82F6'}} /> Camera Off (13%)</div>
                        <div className="flex items-center gap-1.5"><span className="w-2.5 h-1.5 rounded-xs" style={{backgroundColor:'#10B981'}} /> Audio Anom (10%)</div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* MODAL 1: HIGH FIDELITY INCIDENT INVESTIGATIVE TRIAGE CENTER (MODAL/DRAWER) */}
      <AnimatePresence>
        {selectedIncident && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setSelectedIncident(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" 
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-100 overflow-hidden text-philsa-navy"
            >
              {/* Header */}
              <div className="bg-[#8A1538] text-white p-6 relative">
                <div className="absolute top-4 right-4 text-white/50 hover:text-white pointer-events-auto">
                  <button onClick={() => setSelectedIncident(null)} className="p-1 rounded-lg hover:bg-white/10 transition-colors">
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
                <div>
                  <span className="bg-white/15 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded">
                    Triage ID: {selectedIncident.id}
                  </span>
                  <h2 className="text-xl font-bold tracking-tight mt-1">{selectedIncident.type}</h2>
                  <p className="text-white/85 text-xs font-semibold uppercase tracking-wider mt-0.5">
                    {selectedIncident.testingCenter}
                  </p>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6">
                {/* Visual Bio-feed & Proctor Snapshot simulation */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-950 rounded-xl aspect-video relative overflow-hidden flex flex-col justify-between p-3 border border-slate-800">
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Live Webcam Feed
                    </span>
                    <div className="flex justify-between items-center relative z-10">
                      <span className="text-[8px] bg-red-600 px-1.5 py-0.5 rounded text-white font-bold tracking-widest uppercase animate-pulse">PROCTOR FEED</span>
                      <span className="text-[8px] bg-white/10 text-white px-2 py-0.5 rounded font-mono">1 FPS LINK</span>
                    </div>
                    {/* Simulated student graphic */}
                    <div className="mx-auto my-auto w-12 h-12 rounded-full border-2 border-dashed border-red-500 animate-pulse bg-red-900/10 flex items-center justify-center text-red-500">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <span className="text-[9px] text-white/70 relative z-10 font-bold uppercase tracking-widest">Candidate Webcam Unavailable</span>
                  </div>

                  <div className="bg-slate-950 rounded-xl aspect-video relative overflow-hidden flex flex-col justify-between p-3 border border-slate-800">
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-slate-500 uppercase tracking-widest font-sans">
                      Biometric Health
                    </span>
                    <div className="flex justify-between items-center relative z-10">
                      <span className="text-[8px] bg-amber-500 px-1.5 py-0.5 rounded text-white font-bold tracking-widest uppercase">TELEMETRY</span>
                      <span className="text-[8px] bg-white/10 text-white px-2 py-0.5 rounded font-mono">OK</span>
                    </div>
                    {/* Simulated graph using visual markers */}
                    <div className="mx-auto my-auto w-full flex items-center justify-center px-4">
                      <div className="text-center font-mono space-y-0.5">
                        <p className="text-base font-black text-red-500">92% Match</p>
                        <p className="text-[7.5px] text-white/40 uppercase tracking-wider">Face Recognition Index</p>
                      </div>
                    </div>
                    <span className="text-[9px] text-white/70 relative z-10 font-bold uppercase tracking-widest">Active Focus Tracking</span>
                  </div>
                </div>

                {/* Candidate Info */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 grid grid-cols-2 gap-x-6 gap-y-3 text-xs">
                  <div>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Candidate Name</p>
                    <p className="font-bold text-slate-800">{selectedIncident.studentName}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest font-sans">Candidate Registration ID</p>
                    <p className="font-bold text-slate-800">{selectedIncident.studentId}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest font-sans">Timestamp Signature</p>
                    <p className="font-bold text-slate-800">{selectedIncident.timestamp} UTC</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Threat Level</p>
                    <p className="font-bold uppercase text-[#8A1538]">{selectedIncident.severity} RATING</p>
                  </div>
                </div>

                {/* Protocol Resolution Action Tray */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Administrative Intervention Actions</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <button
                      onClick={() => { handleWarnStudent(selectedIncident.studentId); }}
                      className="px-3 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors border border-amber-200"
                    >
                      Issue warning
                    </button>
                    <button
                      onClick={() => { handlePauseExam(selectedIncident.studentId); }}
                      className="px-3 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors border border-blue-200"
                    >
                      Pause session
                    </button>
                    <button
                      onClick={() => { handleResolveIncident(selectedIncident.id, selectedIncident.studentId); }}
                      className="px-3 py-2.5 col-span-2 sm:col-span-1 bg-[#e5f1ec] hover:bg-green-100 text-[#00563F] rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors border border-green-200"
                    >
                      Clear Flag
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: INTERACTIVE CANDIDATE DISCIPLINED OVERVIEW ACTION SHEET */}
      <AnimatePresence>
        {selectedStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setSelectedStudent(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" 
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 overflow-hidden text-philsa-navy"
            >
              <div className="bg-[#8A1538] text-white p-6 flex justify-between items-start">
                <div>
                  <span className="bg-white/10 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest">Candidate Profile Audit</span>
                  <h2 className="text-xl font-bold tracking-tight mt-1">{selectedStudent.name}</h2>
                  <p className="text-xs text-white/80 font-bold mt-0.5">{selectedStudent.id}</p>
                </div>
                <button onClick={() => setSelectedStudent(null)} className="text-white/60 hover:text-white p-1 rounded-lg">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-[#8A1538]/70 border-b pb-1">Testing Information</h3>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Active Exam set</p>
                      <p className="font-bold text-slate-800 leading-tight">{selectedStudent.exam}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest font-sans">Designated Facility</p>
                      <p className="font-bold text-slate-800 leading-tight">{selectedStudent.testingCenter}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest font-sans">Current Progress</p>
                      <p className="font-black text-slate-800">Q {selectedStudent.currentQuestion}/{selectedStudent.totalQuestions} ({Math.round(selectedStudent.currentQuestion/selectedStudent.totalQuestions * 100)}%)</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest font-sans">Remaining Duration</p>
                      <p className="font-bold text-slate-800 font-mono">{selectedStudent.timeRemaining}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-[#8A1538]/70 border-b pb-1">Proctor Control Suite</h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => { handleWarnStudent(selectedStudent.id); }}
                      className="w-full text-left p-3 hover:bg-amber-50 rounded-lg border border-transparent hover:border-amber-200 transition-all flex items-center justify-between"
                    >
                      <div>
                        <p className="text-xs font-bold text-amber-900 uppercase">Transmit official test warning</p>
                        <p className="text-[10px] text-amber-705 font-medium">Increment threat counter. Disqualifies automatically on warning 3.</p>
                      </div>
                      <span className="text-amber-800 font-bold bg-amber-100 text-[10px] px-2 py-0.5 rounded leading-none">{selectedStudent.warningsSent}/3</span>
                    </button>
                    <button
                      onClick={() => { handlePauseExam(selectedStudent.id); }}
                      className="w-full text-left p-3 hover:bg-blue-50 rounded-lg border border-transparent hover:border-blue-200 transition-all flex items-center justify-between"
                    >
                      <div>
                        <p className="text-xs font-bold text-blue-900 uppercase">Freeze live examination runtime</p>
                        <p className="text-[10px] text-blue-705 font-medium">Pauses timing and disables examinee input on student display.</p>
                      </div>
                      <PauseCircle className="w-4 h-4 text-blue-600" />
                    </button>
                    <button
                      onClick={() => { handleForceSubmit(selectedStudent.id); }}
                      className="w-full text-left p-3 hover:bg-slate-100 rounded-lg border border-transparent hover:border-slate-350 transition-all flex items-center justify-between"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-900 uppercase">Trigger immediate forced submission</p>
                        <p className="text-[10px] text-slate-650 font-medium">Closes exam, calculates secure grading on current answered items only.</p>
                      </div>
                      <CheckCircle2 className="w-4 h-4 text-[#8A1538]" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: TESTING CENTER TELEMETRY VERIFIER MODAL */}
      <AnimatePresence>
        {selectedCenter && (
          <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCenter(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" 
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-100 overflow-hidden text-philsa-navy font-sans max-h-[90vh] flex flex-col"
            >
              <div className="bg-[#8A1538] text-white p-6 flex justify-between items-start shrink-0">
                <div>
                  <span className="bg-white/10 px-2.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest">Physical Node Telemetry & Examinee Live Audit</span>
                  <h2 className="text-xl font-bold tracking-tight mt-1">{selectedCenter.name}</h2>
                  <p className="text-xs text-white/80 font-bold mt-0.5">Facility ID: {selectedCenter.id}</p>
                </div>
                <button onClick={() => setSelectedCenter(null)} className="text-white/60 hover:text-white p-1 rounded-lg">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6 flex-1 min-h-0 bg-slate-50/50">
                {/* 4-Column Substation Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-xs">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1.5">Infrastructure UPLINK</p>
                    <div className="flex items-center gap-1.5">
                      <span className={cn(
                        "w-2 h-2 rounded-full",
                        selectedCenter.connectionStatus === 'EXCELLENT' && "bg-[#00563F] animate-pulse",
                        selectedCenter.connectionStatus === 'STABLE' && "bg-[#00563F]",
                        selectedCenter.connectionStatus === 'DEGRADED' && "bg-amber-500",
                        selectedCenter.connectionStatus === 'DISCONNECTED' && "bg-red-500"
                      )} />
                      <span className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">{selectedCenter.connectionStatus}</span>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-xs">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1.5 font-sans">Operational status</p>
                    <span className={cn(
                      "inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider",
                      selectedCenter.status === 'ACTIVE' && "bg-green-50 text-green-700 border border-green-200",
                      selectedCenter.status === 'OFFLINE' && "bg-red-50 text-[#8A1538] border border-red-200",
                      selectedCenter.status === 'MAINTENANCE' && "bg-amber-50 text-amber-700 border border-amber-200",
                      selectedCenter.status === 'IDLE' && "bg-gray-100 text-slate-500 border border-gray-200"
                    )}>
                      {selectedCenter.status}
                    </span>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-xs flex flex-col justify-between">
                    <div>
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1.5">Assigned Proctor</p>
                      <p className="font-bold text-xs text-slate-800 truncate">{selectedCenter.assignedProctor}</p>
                    </div>
                    <button
                      onClick={() => navigate('/proctor/monitoring', { state: { proctorName: selectedCenter.assignedProctor, centerName: selectedCenter.name } })}
                      className="mt-2 text-[10px] font-extrabold uppercase tracking-widest bg-slate-50 hover:bg-[#8A1538] hover:text-white text-[#8A1538] border border-[#8A1538]/20 hover:border-[#8A1538] py-1 px-2 rounded-lg transition-all inline-flex items-center gap-1 justify-center cursor-pointer font-sans"
                    >
                      <Monitor className="w-3 h-3" /> Exam Monitoring
                    </button>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-xs">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1.5 leading-none">Sitting Examinees</p>
                    <p className="font-black text-[#8A1538] text-xs">
                      {students.filter(s => s.testingCenter === selectedCenter.name).length} Active Sessions
                    </p>
                  </div>
                </div>

                {/* Combined Live Student Monitor Section */}
                <div className="bg-white rounded-xl border border-slate-200/60 shadow-xs overflow-hidden">
                  <div className="bg-slate-50/70 border-b border-slate-200/60 px-5 py-3 flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-widest text-[#8A1538]">Candidate Session Tracker</h3>
                    <div className="text-[9px] font-black text-[#00563F] flex items-center gap-1.5 uppercase tracking-widest leading-none">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#00563F] animate-pulse" />
                      Live Feed
                    </div>
                  </div>

                  <div className="overflow-x-auto text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-[#FAFAFA] text-[9px] text-slate-500 font-extrabold uppercase tracking-widest border-b border-slate-200/40">
                        <tr>
                          <th className="px-5 py-3.5">Examinee Details</th>
                          <th className="px-5 py-3.5">Assigned Assessment</th>
                          <th className="px-5 py-3.5">Status</th>
                          <th className="px-5 py-3.5 text-center">Exam Progress</th>
                          <th className="px-5 py-3.5 text-center">Threat Rating</th>
                          <th className="px-5 py-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-sans">
                        {students.filter(s => s.testingCenter === selectedCenter.name).length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-5 py-10 text-center text-slate-400 font-semibold uppercase tracking-wider">
                              No active candidates logged at this testing facility.
                            </td>
                          </tr>
                        ) : (
                          students.filter(s => s.testingCenter === selectedCenter.name).map((student) => (
                            <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-5 py-3.5 font-bold text-slate-900">
                                <div>
                                  <p className="leading-tight text-xs">{student.name}</p>
                                  <p className="text-[9px] text-[#8A1538] font-bold uppercase tracking-wider mt-0.5">{student.id}</p>
                                </div>
                              </td>
                              <td className="px-5 py-3.5 font-semibold text-slate-600">
                                <p className="leading-tight text-[11px]">{student.exam}</p>
                                <p className="text-[9px] text-slate-400 font-mono mt-0.5 font-bold">REMAINING: {student.timeRemaining}</p>
                              </td>
                              <td className="px-5 py-3.5">
                                <span className={cn(
                                  "inline-flex items-center px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider",
                                  student.status === 'TAKING_EXAM' && "bg-green-50 text-green-700 border border-green-200",
                                  student.status === 'FLAGGED' && "bg-rose-100 text-red-700 border border-red-300 animate-pulse",
                                  student.status === 'DISCONNECTED' && "bg-red-50 text-philsa-red border border-red-200",
                                  student.status === 'SUBMITTED' && "bg-blue-50 text-blue-800 border border-blue-200",
                                  student.status === 'IDLE' && "bg-zinc-100 text-zinc-700 border border-zinc-200"
                                )}>
                                  {student.status.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="px-5 py-3.5">
                                <div className="flex flex-col items-center justify-center">
                                  <span className="font-bold text-slate-700 text-[10px]">Q {student.currentQuestion}/{student.totalQuestions}</span>
                                  <div className="w-14 h-1 bg-slate-100 rounded-full overflow-hidden mt-1">
                                    <div 
                                      className="h-full bg-[#00563F]" 
                                      style={{ width: `${(student.currentQuestion / student.totalQuestions) * 100}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-3.5 text-center">
                                {student.warningsSent > 0 ? (
                                  <span className="bg-amber-100 text-amber-800 text-[9px] font-black px-1.5 py-0.5 rounded">
                                    Warn: {student.warningsSent}/3
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 font-medium">None</span>
                                )}
                              </td>
                              <td className="px-5 py-3.5 text-right">
                                <button
                                  onClick={() => setSelectedStudent(student)}
                                  className="px-2.5 py-1 bg-slate-100 hover:bg-[#8A1538] hover:text-white text-slate-700 rounded-lg font-bold text-[9px] uppercase tracking-wider transition-all inline-flex items-center gap-0.5 border border-slate-200"
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Substation action elements */}
                <div className="bg-red-50/40 p-4 rounded-xl border border-red-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-0.5 text-center sm:text-left">
                    <p className="text-xs font-bold text-[#8A1538] uppercase">Emergency Substation Broadcast</p>
                    <p className="text-[10px] text-slate-600 font-medium">Forces visual warning popups across all live active streams at this testing center.</p>
                  </div>
                  <button
                    onClick={() => { alert(`Emergency broadcast message successfully dispatched to Proctor Supervisor: ${selectedCenter.assignedProctor}`); }}
                    className="px-4 py-2 bg-[#8A1538] hover:bg-slate-900 text-white font-bold rounded-lg text-[10px] uppercase tracking-wider transition-colors shadow-xs shrink-0"
                  >
                    Broadcast Emergency Protocol
                  </button>
                </div>
              </div>


            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: TOTAL REGISTRATION APPLICANT FILE VIEW */}
      <AnimatePresence>
        {selectedApplication && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#111111]/70 backdrop-blur-sm"
              onClick={() => setSelectedApplication(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 30 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="bg-white rounded-[2rem] shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[85vh] overflow-hidden relative z-10 flex flex-col font-sans"
            >
              {/* Header */}
              <div className="bg-[#8A1538] text-white p-6 relative flex-shrink-0">
                <button 
                  onClick={() => setSelectedApplication(null)}
                  className="absolute top-6 right-6 text-white/70 hover:text-white p-1 rounded-lg transition-all"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white/20 border border-white/10 shrink-0">
                    {selectedApplication.photoUrl ? (
                      <img referrerPolicy="no-referrer" src={selectedApplication.photoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/50">
                        <User className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight">{selectedApplication.firstName} {selectedApplication.middleName || ''} {selectedApplication.lastName}</h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-white/80 font-bold">
                      <span className="font-mono">{selectedApplication.id}</span>
                      <span>•</span>
                      <span>LRN: {selectedApplication.lrn || 'No LRN'}</span>
                      <span>•</span>
                      <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">{selectedApplication.status}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Body (Scrollable) */}
              <div className="p-8 space-y-6 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Personal & Contact Details */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-[#8A1538] uppercase tracking-widest border-b border-slate-100 pb-2">Candidate Profile</h4>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Date of Birth</p>
                        <p className="font-bold text-slate-800 mt-0.5">{selectedApplication.dob}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Gender</p>
                        <p className="font-bold text-slate-800 mt-0.5">{selectedApplication.gender}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Nationality</p>
                        <p className="font-bold text-slate-800 mt-0.5">{selectedApplication.nationality || 'Filipino'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">National ID</p>
                        <p className="font-bold text-slate-800 mt-0.5">{selectedApplication.nationalId || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="space-y-2 text-xs pt-2 border-t border-slate-50">
                      <div>
                        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Email Address</p>
                        <p className="font-bold text-slate-800">{selectedApplication.email || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Mobile Number</p>
                        <p className="font-bold text-slate-800">{selectedApplication.mobile || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Academic Profile */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-[#8A1538] uppercase tracking-widest border-b border-slate-100 pb-2">Academic Profile</h4>
                    <div className="space-y-3 text-xs">
                      <div>
                        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Secondary School</p>
                        <p className="font-bold text-slate-800 mt-0.5">{selectedApplication.schoolName || 'Unknown School'}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Academic Track</p>
                          <p className="font-bold text-emerald-700 mt-0.5">{selectedApplication.academicTrack || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">High School GWA</p>
                          <p className="font-black text-slate-900 mt-0.5">{selectedApplication.gwa !== undefined ? selectedApplication.gwa : 'N/A'}%</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2 pt-2 border-t border-slate-50 text-xs">
                      <div>
                        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Target Universities</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedApplication.universities?.map((uni: string, idx: number) => (
                            <span key={idx} className="bg-slate-50 text-slate-700 font-bold border border-slate-150 px-2.5 py-1 rounded text-[10px] uppercase">
                              {uni}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Chosen Program Course Preferences</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedApplication.courses?.map((course: string, idx: number) => (
                            <span key={idx} className="bg-red-50 text-[#8A1538] font-bold border border-red-100/50 px-2.5 py-1 rounded text-[10px] uppercase">
                              {course}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                  {/* Address Details */}
                  <div className="space-y-2 text-xs">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Philippine Residential Address</h5>
                    <p className="font-bold text-slate-800 leading-normal">
                      {selectedApplication.street && `${selectedApplication.street}, `}
                      {selectedApplication.barangay && `Brgy. ${selectedApplication.barangay}, `}
                      {selectedApplication.city || selectedApplication.municipality || ''}, {selectedApplication.province || ''}, {selectedApplication.region || ''} {selectedApplication.zipCode || ''}
                    </p>
                  </div>

                  {/* Family Background */}
                  <div className="space-y-3 text-xs">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Family Background</h5>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedApplication.fatherName && (
                        <div>
                          <p className="text-[9px] text-slate-400 font-extrabold uppercase font-sans">Father's Name</p>
                          <p className="font-bold text-slate-800 leading-tight">{selectedApplication.fatherName}</p>
                          {selectedApplication.fatherOccupation && <p className="text-[9px] text-slate-400 font-medium italic mt-0.5">{selectedApplication.fatherOccupation}</p>}
                        </div>
                      )}
                      {selectedApplication.motherName && (
                        <div>
                          <p className="text-[9px] text-slate-400 font-extrabold uppercase font-sans">Mother's Name</p>
                          <p className="font-bold text-slate-800 leading-tight">{selectedApplication.motherName}</p>
                          {selectedApplication.motherOccupation && <p className="text-[9px] text-slate-400 font-medium italic mt-0.5">{selectedApplication.motherOccupation}</p>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Footer */}
              <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-between items-center flex-shrink-0 rounded-b-[2rem]">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Review mode via command center</p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setSelectedApplication(null)}
                    className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs uppercase tracking-widest transition-all"
                  >
                    Close File
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedApplication(null);
                      navigate(`/admin/reviewer/applications/${selectedApplication.id}`);
                    }}
                    className="px-5 py-2.5 bg-[#8A1538] hover:bg-slate-900 text-white font-bold rounded-xl text-xs uppercase tracking-widest transition-all shadow-lg shadow-[#8A1538]/10"
                  >
                    Go To Applications Reviewer
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// COMPONENT: TotalRegistrationView
// ============================================
function TotalRegistrationView({ 
  applications, 
  onViewDetail 
}: { 
  applications: Application[]; 
  onViewDetail: (app: Application) => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'FOR_CORRECTION'>('ALL');
  const [trackFilter, setTrackFilter] = useState<string>('ALL');

  // Calculates metrics
  const totalCount = applications.length;
  const pendingCount = applications.filter(a => a.status === 'PENDING').length;
  const acceptedCount = applications.filter(a => a.status === 'ACCEPTED' || a.status === 'APPROVED').length;
  const rejectedCount = applications.filter(a => a.status === 'REJECTED').length;
  const correctionCount = applications.filter(a => a.status === 'FOR_CORRECTION').length;

  const filteredApps = applications.filter(app => {
    const fullName = `${app.firstName} ${app.lastName}`.toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      fullName.includes(searchLower) || 
      app.id.toLowerCase().includes(searchLower) || 
      (app.schoolName && app.schoolName.toLowerCase().includes(searchLower)) ||
      (app.lrn && app.lrn.includes(searchLower));

    const matchesStatus = 
      statusFilter === 'ALL' || 
      app.status === statusFilter ||
      (statusFilter === 'ACCEPTED' && app.status === 'APPROVED');

    const matchesTrack = 
      trackFilter === 'ALL' || 
      app.academicTrack === trackFilter;

    return matchesSearch && matchesStatus && matchesTrack;
  });

  return (
    <div className="space-y-6">
      {/* Mini metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex flex-col justify-between shadow-xs">
          <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest leading-none mb-1">Total Registered</p>
          <span className="text-xl font-black text-slate-900">{totalCount}</span>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex flex-col justify-between shadow-xs">
          <p className="text-[9px] font-black uppercase text-emerald-600 tracking-widest leading-none mb-1 text-emerald-600">Accepted</p>
          <span className="text-xl font-black text-emerald-700">{acceptedCount}</span>
        </div>
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex flex-col justify-between shadow-xs">
          <p className="text-[9px] font-black uppercase text-blue-600 tracking-widest leading-none mb-1 text-blue-600">Pending Review</p>
          <span className="text-xl font-black text-blue-700">{pendingCount}</span>
        </div>
        <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex flex-col justify-between shadow-xs">
          <p className="text-[9px] font-black uppercase text-amber-600 tracking-widest leading-none mb-1 text-amber-600">For Correction</p>
          <span className="text-xl font-black text-amber-700">{correctionCount}</span>
        </div>
        <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex flex-col justify-between shadow-xs">
          <p className="text-[9px] font-black uppercase text-red-600 tracking-widest leading-none mb-1 text-red-600">Rejected</p>
          <span className="text-xl font-black text-red-700">{rejectedCount}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search candidate, LRN, school..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-250 rounded-lg pl-9 pr-4 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#8A1538] transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter buttons */}
          <div className="flex bg-white p-1 rounded-lg border border-slate-200">
            {(['ALL', 'PENDING', 'ACCEPTED', 'FOR_CORRECTION', 'REJECTED'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-[9px] font-black uppercase tracking-wider transition-all",
                  statusFilter === status
                    ? "bg-[#8A1538] text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                {status.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Academic Track dropdown */}
          <select
            value={trackFilter}
            onChange={(e) => setTrackFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[10px] font-black text-slate-850 focus:outline-none focus:ring-1 focus:ring-[#8A1538] transition-all uppercase tracking-wider cursor-pointer"
          >
            <option value="ALL">All Tracks</option>
            <option value="STEM">STEM</option>
            <option value="ABM">ABM</option>
            <option value="HUMSS">HUMSS</option>
            <option value="GAS">GAS</option>
            <option value="TVL">TVL</option>
          </select>
        </div>
      </div>

      {/* Main Table style list */}
      <div className="border border-slate-150 rounded-xl overflow-hidden bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-150 text-[9px] text-slate-500 font-extrabold uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4">Candidate & Identity</th>
                <th className="px-6 py-4">Educational Profile</th>
                <th className="px-6 py-4">Admissions & Choices</th>
                <th className="px-6 py-4">Registration Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredApps.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400 font-bold uppercase text-xs tracking-widest">
                    No matching registration records found.
                  </td>
                </tr>
              ) : (
                filteredApps.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/50 transition-colors group">
                    {/* Candidate Info */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg overflow-hidden border border-slate-150 bg-slate-50 shrink-0">
                          {app.photoUrl ? (
                            <img referrerPolicy="no-referrer" src={app.photoUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
                              <User className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-900 group-hover:text-[#8A1538] transition-colors leading-none mb-1">
                            {app.firstName} {app.lastName}
                          </p>
                          <p className="text-[9px] text-slate-400 font-bold tracking-wider font-mono">
                            {app.id} • {app.mobile || 'No Mobile'}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Educational Profile */}
                    <td className="px-6 py-4">
                      <p className="text-xs font-bold text-slate-800 leading-tight">
                        {app.schoolName || 'Unknown High School'}
                      </p>
                      <p className="text-[9px] text-[#00563F] font-black uppercase tracking-wider mt-0.5">
                        {app.academicTrack || 'N/A'} • GWA: <span className="font-extrabold">{app.gwa || 'N/A'}</span>
                      </p>
                    </td>

                    {/* Admissions Preferences */}
                    <td className="px-6 py-4">
                      <ChipContainer label={app.universities ? app.universities[0] : 'N/A'} sublabel={app.courses ? app.courses[0] : 'N/A'} />
                    </td>

                    {/* Status badge */}
                    <td className="px-6 py-4">
                      <span className={cn(
                        "text-[9px] font-black px-2.5 py-1 rounded border uppercase tracking-wider",
                        app.status === 'ACCEPTED' || app.status === 'APPROVED' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                        app.status === 'PENDING' ? "bg-blue-50 text-blue-700 border-blue-100" :
                        app.status === 'FOR_CORRECTION' ? "bg-amber-50 text-amber-700 border-amber-100" :
                        "bg-red-50 text-red-700 border-red-100"
                      )}>
                        {app.status.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Actions button */}
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => onViewDetail(app)}
                        className="p-1 px-3 bg-white border border-slate-200 text-slate-650 hover:bg-[#8A1538] hover:text-white hover:border-[#8A1538] rounded-lg text-[10px] font-black uppercase tracking-wider transition-all shadow-2xs active:scale-95 cursor-pointer"
                      >
                        File Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ChipContainer({ label, sublabel }: { label: string; sublabel: string }) {
  return (
    <div>
      <p className="text-xs font-bold text-slate-800 leading-tight">{label}</p>
      <p className="text-[9px] text-[#8A1538] font-semibold italic mt-0.5">{sublabel}</p>
    </div>
  );
}
