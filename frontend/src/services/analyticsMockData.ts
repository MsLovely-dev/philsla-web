import { 
  Users, CheckCircle, Activity, Clock, 
  MapPin, AlertCircle, Monitor, ShieldAlert,
  Server, Globe, GraduationCap, Briefcase, 
  School, BookOpen, UserCheck, Shield,
  FileCheck, LayoutGrid, ClipboardCheck, BarChart2, Zap
} from 'lucide-react';

export const NATIONAL_STATS = [
  { label: 'Total Registered Examinees', value: '1.24M', trend: 2.8, icon: Users, color: '#0F172A' },
  { label: 'Total Verified Examinees', value: '1.18M', trend: 3.2, icon: UserCheck, color: '#10B981' },
  { label: 'Total Active Sessions', value: '942,800', trend: 14.5, icon: Activity, color: '#3B82F6' },
  { label: 'Total Incident Reports', value: '1,240', trend: -12.4, icon: ShieldAlert, color: '#8B0D11' },
  { label: 'Total Participating Schools', value: '12,402', icon: School, color: '#F59E0B' },
  { label: 'Total Participating Universities', value: '2,402', icon: GraduationCap, color: '#8B5CF6' },
  { label: 'Total Active Testing Centers', value: '14,500', icon: MapPin, color: '#64748B' },
];

export const DEPED_STATS = [
  { label: 'Grade 12 Registered', value: '840,210', trend: 4.5, icon: Users, color: '#0F172A' },
  { label: 'SHS Participation Rate', value: '98.2%', trend: 0.8, icon: Activity, color: '#10B981' },
  { label: 'Exam Attendance Rate', value: '96.4%', trend: 1.2, icon: UserCheck, color: '#3B82F6' },
  { label: 'Students Cleared', value: '822,500', status: 'STABLE', icon: CheckCircle, color: '#64748B' },
  { label: 'Readiness Validation', value: '94.5%', status: 'OPERATIONAL', icon: ClipboardCheck, color: '#10B981' },
  { label: 'Device Readiness', value: '92.8%', status: 'WATCH', icon: Monitor, color: '#F59E0B' },
  { label: 'Room Preparedness', value: '95.2%', status: 'STABLE', icon: LayoutGrid, color: '#3B82F6' },
  { label: 'School Compliance', value: '98.9%', status: 'STABLE', icon: Shield, color: '#10B981' },
];

export const DEPED_ACADEMIC = [
  { name: 'STEM Participation', value: 35 },
  { name: 'ABM Participation', value: 25 },
  { name: 'HUMSS Participation', value: 20 },
  { name: 'TVL Participation', value: 20 },
];

export const TESDA_STATS = [
  { label: 'TVL Examinees Assessed', value: '182,500', trend: 5.4, icon: Users, color: '#0F172A' },
  { label: 'Skills Readiness Score', value: '88.4%', trend: 2.1, icon: BarChart2, color: '#10B981' },
  { label: 'Technical Aptitude', value: '84.2%', trend: 1.5, icon: Zap, color: '#F59E0B' },
  { label: 'Assessment Participation', value: '92.5%', status: 'STABLE', icon: ClipboardCheck, color: '#3B82F6' },
  { label: 'Practical Completion', value: '89.7%', trend: 3.2, icon: CheckCircle, color: '#8B0D11' },
];

export const TESDA_QUALIFICATIONS = [
  { name: 'ICT Skills', certified: 4500, trend: 12 },
  { name: 'Industrial Arts', certified: 3800, trend: 5 },
  { name: 'Tourism Services', certified: 3100, trend: 8 },
  { name: 'Electrical Installation', certified: 2500, trend: 15 },
  { name: 'Automotive Servicing', certified: 1800, trend: -2 },
];

export const CHED_STATS = [
  { label: 'Overall PhilSA Pass Rate', value: '86.5%', trend: 1.2, icon: CheckCircle, color: '#10B981' },
  { label: 'College Readiness Score', value: '82.4%', trend: 2.5, icon: BarChart2, color: '#0F172A' },
  { label: 'University Qualification', value: '74.2%', trend: 5.4, icon: GraduationCap, color: '#3B82F6' },
  { label: 'Admission Eligibility', value: '68.5%', trend: 4.2, icon: FileCheck, color: '#8B5CF6' },
];

export const CHED_PERFORMANCE = [
  { name: 'STEM Readiness', value: 88 },
  { name: 'Literacy Indicators', value: 92 },
  { name: 'Numeracy Indicators', value: 84 },
  { name: 'Critical Thinking', value: 78 },
  { name: 'Academic Preparedness', value: 86 },
];

export const RECENT_INCIDENTS = [
  { id: 'INC-4921', agency: 'CHED', type: 'INVALIDATED SESSIONS', severity: 'HIGH', location: 'UP Diliman', time: '2m ago' },
  { id: 'INC-4922', agency: 'DEPED', type: 'CONNECTIVITY FAILURES', severity: 'LOW', location: 'Cebu City High', time: '5m ago' },
  { id: 'INC-4923', agency: 'TESDA', type: 'DEVICE VALIDATION FAILURES', severity: 'MID', location: 'TESDA Manila', time: '12m ago' },
  { id: 'INC-4924', agency: 'CHED', type: 'BROWSER VIOLATIONS', severity: 'MID', location: 'UST Manila', time: '15m ago' },
  { id: 'INC-4925', agency: 'DEPED', type: 'VERIFICATION ESCALATIONS', severity: 'HIGH', location: 'Davao South', time: '20m ago' },
  { id: 'INC-4926', agency: 'TESDA', type: 'PRACTICAL ASSESSMENT INTERRUPTIONS', severity: 'HIGH', location: 'TESDA Davao', time: '25m ago' },
  { id: 'INC-4927', agency: 'TESDA', type: 'ASSESSOR VALIDATION FLAGS', severity: 'MID', location: 'TESDA Cebu', time: '30m ago' },
];

export const REGIONAL_DATA = [
  { name: 'NCR', active: 4500, capacity: 5000, alerts: 12 },
  { name: 'Region IV-A', active: 3200, capacity: 4500, alerts: 8 },
  { name: 'Region VII', active: 2100, capacity: 3000, alerts: 5 },
  { name: 'Region XI', active: 1800, capacity: 2500, alerts: 4 },
  { name: 'Region III', active: 2800, capacity: 4000, alerts: 7 },
];

export const CHED_INCIDENTS = [
  { name: 'Invalidated Sessions', value: 1420 },
  { name: 'Browser Violations', value: 285 },
  { name: 'Verification Escalations', value: 550 },
  { name: 'Connectivity Failures', value: 832 },
  { name: 'Integrity Reports', value: 118 }
];

export const DEPED_REGIONAL = [
  { region: 'NCR', readiness: 98, status: 'OPERATIONAL' },
  { region: 'R1', readiness: 85, status: 'STABLE' },
  { region: 'R2', readiness: 72, status: 'WATCH' },
  { region: 'R3', readiness: 89, status: 'NEEDS ATTENTION' },
  { region: 'R4A', readiness: 94, status: 'OPERATIONAL' },
  { region: 'BARMM', readiness: 54, status: 'WATCH' },
];

