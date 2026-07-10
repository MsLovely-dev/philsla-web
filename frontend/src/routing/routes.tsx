import { ReactElement } from 'react';
import AdminAppeals from '../pages/admin/AdminAppeals';
import CommandCenter from '../pages/admin/CommandCenter';
import ProctorManagement from '../pages/admin/ProctorManagement';
import AdminStudentDeviceManagement from '../pages/admin/AdminStudentDeviceManagement';
import ExamReviewDetail from '../pages/admin/hub/ExamReviewDetail';
import ExamReviewList from '../pages/admin/hub/ExamReviewList';
import HubAuditTrail from '../pages/admin/hub/AuditTrail';
import HubBulkUpload from '../pages/admin/hub/BulkUpload';
import HubExamSets from '../pages/admin/hub/ExamSets';
import HubOverview from '../pages/admin/hub/Overview';
import HubQuestionBank from '../pages/admin/hub/QuestionBank';
import ResultsRelease from '../pages/admin/hub/ResultsRelease';
import StimulusManagement from '../pages/admin/hub/StimulusManagement';
import ApplicationStatusMaintenance from '../pages/admin/maintenance/ApplicationStatusMaintenance';
import AttendanceRulesMaintenance from '../pages/admin/maintenance/AttendanceRulesMaintenance';
import BatchConfigurationMaintenance from '../pages/admin/maintenance/BatchConfigurationMaintenance';
import DegreeProgramsMaintenance from '../pages/admin/maintenance/DegreeProgramsMaintenance';
import DeviceValidationMaintenance from '../pages/admin/maintenance/DeviceValidationMaintenance';
import ExamIntegrityMaintenance from '../pages/admin/maintenance/ExamIntegrityMaintenance';
import MaintenanceHub from '../pages/admin/maintenance/MaintenanceHub';
import ProctorDeviceVerification from '../pages/admin/maintenance/ProctorDeviceVerification';
import ProctorMaintenance from '../pages/admin/maintenance/ProctorMaintenance';
import QuestionBankConfigMaintenance from '../pages/admin/maintenance/QuestionBankConfigMaintenance';
import StudentRegistrationMaintenance from '../pages/admin/maintenance/StudentRegistrationMaintenance';
import TestingCenterMaintenance from '../pages/admin/maintenance/TestingCenterMaintenance';
import ApplicationDetail from '../pages/admin/university/ApplicationDetail';
import ApplicationsList from '../pages/admin/university/ApplicationsList';
import ExamSchedules from '../pages/admin/university/ExamSchedules';
import ManageCourses from '../pages/admin/university/ManageCourses';
import CenterManagement from '../pages/testing-center/CenterManagement';
import Dashboard from '../pages/Dashboard';
import ExamBlueprints from '../pages/ExamBlueprints';
import ExamDelivery from '../pages/ExamDelivery';
import ExamPermitPage from '../pages/ExamPermitPage';
import GovernmentAccess from '../pages/GovernmentAccess';
import GradingQueue from '../pages/GradingQueue';
import IncidentEvidence from '../pages/IncidentEvidence';
import LandingPage from '../pages/LandingPage';
import LoginPage from '../pages/LoginPage';
import NotFoundPage from '../pages/NotFoundPage';
import PlaybackCenter from '../pages/PlaybackCenter';
import ProctorConsole from '../pages/ProctorConsole';
import RecordingsCommand from '../pages/RecordingsCommand';
import ResultsManagement from '../pages/ResultsManagement';
import ResultsPage from '../pages/ResultsPage';
import ScoreManagement from '../pages/results/ScoreManagement';
import ReportingMatrix from '../pages/results/ReportingMatrix';
import ReviewerApplicationDetail from '../pages/reviewer/ReviewerApplicationDetail';
import ReviewApplications from '../pages/reviewer/ReviewApplications';
import TestingCenterAvailability from '../pages/reviewer/TestingCenterAvailability';
import StudentApplication from '../pages/StudentApplication';
import SupportDashboard from '../pages/support/SupportDashboard';
import SystemCompliance from '../pages/SystemCompliance';
import SystemIntegration from '../pages/admin/SystemIntegration';
import UnauthorizedPage from '../pages/UnauthorizedPage';
import UserManagement from '../pages/UserManagement';
import ProctorAttendance from '../pages/proctor/ProctorAttendance';
import ProctorDeviceManagement from '../pages/proctor/ProctorDeviceManagement';
import ProctorIncidents from '../pages/proctor/ProctorIncidents';
import ProctorMonitoring from '../pages/proctor/ProctorMonitoring';
import ProctorReadiness from '../pages/proctor/ProctorReadiness';
import ProctorSchedule from '../pages/proctor/ProctorSchedule';
import StudentDeviceRegistration from '../pages/proctor/StudentDeviceRegistration';
import { UserRole } from '../types';

export const ALL_USER_ROLES = [
  'STUDENT', 'ADMISSIONS_REVIEWER', 'UNIVERSITY_ADMIN', 'ITEM_WRITER',
  'ACADEMIC_REVIEWER', 'PROCTOR', 'PROCTOR_ADMIN', 'GRADER', 'SYSTEM_ADMIN',
  'EXECUTIVE', 'GOVERNMENT', 'EXAM_ADMINISTRATOR', 'TESTING_CENTER_ADMIN', 'TECH_SUPPORT',
] as const satisfies readonly UserRole[];

type RouteAccess = 'public' | 'protected' | 'exam' | 'standalone';

export interface AppRouteDefinition {
  path: string;
  element: ReactElement;
  access: RouteAccess;
  allowedRoles?: readonly UserRole[];
  layout?: 'dashboard' | 'standalone';
}

const withSystemAdmin = (...roles: UserRole[]): readonly UserRole[] =>
  roles.includes('SYSTEM_ADMIN') ? roles : [...roles, 'SYSTEM_ADMIN'];

const STUDENT: readonly UserRole[] = ['STUDENT'];
const REVIEWER = withSystemAdmin('ADMISSIONS_REVIEWER');
const UNIVERSITY = withSystemAdmin('UNIVERSITY_ADMIN');
const HUB = withSystemAdmin('ITEM_WRITER', 'ACADEMIC_REVIEWER', 'EXAM_ADMINISTRATOR', 'UNIVERSITY_ADMIN');
const PROCTOR = withSystemAdmin('PROCTOR', 'PROCTOR_ADMIN');
const OVERSIGHT = withSystemAdmin('EXECUTIVE', 'GOVERNMENT', 'UNIVERSITY_ADMIN', 'EXAM_ADMINISTRATOR');

export const APP_ROUTES: readonly AppRouteDefinition[] = [
  { path: '/', element: <LandingPage />, access: 'public' },
  { path: '/login', element: <LoginPage />, access: 'public' },
  { path: '/register', element: <StudentApplication />, access: 'public' },
  { path: '/unauthorized', element: <UnauthorizedPage />, access: 'protected', allowedRoles: ALL_USER_ROLES, layout: 'standalone' },

  { path: '/dashboard', element: <Dashboard />, access: 'protected', allowedRoles: ALL_USER_ROLES },
  { path: '/student/application', element: <StudentApplication />, access: 'protected', allowedRoles: STUDENT },
  { path: '/student/permit', element: <ExamPermitPage />, access: 'protected', allowedRoles: STUDENT },
  { path: '/student/results', element: <ResultsPage />, access: 'protected', allowedRoles: STUDENT },
  { path: '/student/take-exam', element: <ExamDelivery inlineMode />, access: 'exam' },
  { path: '/exam/live', element: <ExamDelivery />, access: 'exam' },

  { path: '/admin/reviewer/applications', element: <ReviewApplications />, access: 'protected', allowedRoles: REVIEWER },
  { path: '/admin/reviewer/applications/:id', element: <ReviewerApplicationDetail />, access: 'protected', allowedRoles: REVIEWER },
  { path: '/admin/reviewer/availability', element: <TestingCenterAvailability />, access: 'protected', allowedRoles: withSystemAdmin('ADMISSIONS_REVIEWER', 'UNIVERSITY_ADMIN') },

  { path: '/admin/university/applications', element: <ApplicationsList />, access: 'protected', allowedRoles: UNIVERSITY },
  { path: '/admin/university/applications/:id', element: <ApplicationDetail />, access: 'protected', allowedRoles: UNIVERSITY },
  { path: '/admin/university/courses', element: <ManageCourses />, access: 'protected', allowedRoles: UNIVERSITY },
  { path: '/admin/university/schedules', element: <ExamSchedules />, access: 'protected', allowedRoles: UNIVERSITY },

  { path: '/admin/hub/overview', element: <HubOverview />, access: 'protected', allowedRoles: HUB },
  { path: '/admin/hub/questions', element: <HubQuestionBank />, access: 'protected', allowedRoles: withSystemAdmin('ITEM_WRITER', 'ACADEMIC_REVIEWER') },
  { path: '/admin/hub/stimuli', element: <StimulusManagement />, access: 'protected', allowedRoles: HUB },
  { path: '/admin/hub/exam-sets', element: <HubExamSets />, access: 'protected', allowedRoles: HUB },
  { path: '/admin/hub/upload', element: <HubBulkUpload />, access: 'protected', allowedRoles: withSystemAdmin('EXAM_ADMINISTRATOR') },
  { path: '/admin/hub/audit', element: <HubAuditTrail />, access: 'protected', allowedRoles: withSystemAdmin('EXAM_ADMINISTRATOR') },
  { path: '/admin/hub/review', element: <ExamReviewList />, access: 'protected', allowedRoles: withSystemAdmin('EXAM_ADMINISTRATOR', 'UNIVERSITY_ADMIN') },
  { path: '/admin/hub/review/:id', element: <ExamReviewDetail />, access: 'protected', allowedRoles: withSystemAdmin('EXAM_ADMINISTRATOR', 'UNIVERSITY_ADMIN') },
  { path: '/admin/hub/results-release', element: <ResultsRelease />, access: 'protected', allowedRoles: withSystemAdmin('EXAM_ADMINISTRATOR') },

  { path: '/admin/results/scores', element: <ScoreManagement />, access: 'protected', allowedRoles: withSystemAdmin('UNIVERSITY_ADMIN') },
  { path: '/admin/results/matrix', element: <ReportingMatrix />, access: 'protected', allowedRoles: withSystemAdmin('EXECUTIVE', 'GOVERNMENT', 'UNIVERSITY_ADMIN') },
  { path: '/admin/questions', element: <HubQuestionBank />, access: 'protected', allowedRoles: withSystemAdmin('EXAM_ADMINISTRATOR') },
  { path: '/admin/blueprints', element: <ExamBlueprints />, access: 'protected', allowedRoles: HUB },
  { path: '/admin/reports', element: <ResultsManagement />, access: 'protected', allowedRoles: withSystemAdmin('EXAM_ADMINISTRATOR') },

  { path: '/admin/users', element: <UserManagement />, access: 'protected', allowedRoles: ['SYSTEM_ADMIN'] },
  { path: '/admin/system', element: <SystemCompliance />, access: 'protected', allowedRoles: ['SYSTEM_ADMIN'] },
  { path: '/admin/appeals', element: <AdminAppeals />, access: 'protected', allowedRoles: ['SYSTEM_ADMIN'] },
  { path: '/admin/government', element: <GovernmentAccess />, access: 'protected', allowedRoles: withSystemAdmin('EXECUTIVE', 'GOVERNMENT') },
  { path: '/admin/proctors', element: <ProctorManagement />, access: 'protected', allowedRoles: withSystemAdmin('UNIVERSITY_ADMIN', 'TESTING_CENTER_ADMIN') },
  { path: '/admin/integrations', element: <SystemIntegration />, access: 'protected', allowedRoles: ['SYSTEM_ADMIN'] },
  { path: '/admin/center-control', element: <CenterManagement />, access: 'protected', allowedRoles: withSystemAdmin('TESTING_CENTER_ADMIN') },

  { path: '/admin/maintenance', element: <MaintenanceHub />, access: 'protected', allowedRoles: withSystemAdmin('UNIVERSITY_ADMIN', 'ADMISSIONS_REVIEWER', 'EXAM_ADMINISTRATOR', 'PROCTOR', 'PROCTOR_ADMIN') },
  { path: '/admin/maintenance/registration', element: <StudentRegistrationMaintenance />, access: 'protected', allowedRoles: withSystemAdmin('UNIVERSITY_ADMIN', 'ADMISSIONS_REVIEWER') },
  { path: '/admin/maintenance/application-status', element: <ApplicationStatusMaintenance />, access: 'protected', allowedRoles: REVIEWER },
  { path: '/admin/maintenance/testing-center', element: <TestingCenterMaintenance />, access: 'protected', allowedRoles: withSystemAdmin('UNIVERSITY_ADMIN', 'ADMISSIONS_REVIEWER') },
  { path: '/admin/maintenance/batch', element: <BatchConfigurationMaintenance />, access: 'protected', allowedRoles: withSystemAdmin('UNIVERSITY_ADMIN', 'ADMISSIONS_REVIEWER') },
  { path: '/admin/maintenance/device', element: <DeviceValidationMaintenance />, access: 'protected', allowedRoles: PROCTOR },
  { path: '/admin/maintenance/attendance', element: <AttendanceRulesMaintenance />, access: 'protected', allowedRoles: PROCTOR },
  { path: '/admin/maintenance/integrity', element: <ExamIntegrityMaintenance />, access: 'protected', allowedRoles: PROCTOR },
  { path: '/admin/maintenance/question-bank', element: <QuestionBankConfigMaintenance />, access: 'protected', allowedRoles: withSystemAdmin('UNIVERSITY_ADMIN', 'EXAM_ADMINISTRATOR') },
  { path: '/admin/maintenance/proctor', element: <ProctorMaintenance />, access: 'protected', allowedRoles: UNIVERSITY },
  { path: '/admin/maintenance/proctor-device', element: <ProctorDeviceVerification />, access: 'protected', allowedRoles: ['SYSTEM_ADMIN'] },
  { path: '/admin/maintenance/degree-programs', element: <DegreeProgramsMaintenance />, access: 'protected', allowedRoles: UNIVERSITY },

  { path: '/admin/command-center', element: <CommandCenter />, access: 'protected', allowedRoles: ['SYSTEM_ADMIN'] },
  { path: '/admin/recordings', element: <RecordingsCommand />, access: 'protected', allowedRoles: OVERSIGHT },
  { path: '/admin/recordings/incidents', element: <IncidentEvidence />, access: 'protected', allowedRoles: OVERSIGHT },
  { path: '/admin/recordings/playback/:id', element: <PlaybackCenter />, access: 'protected', allowedRoles: OVERSIGHT },

  { path: '/proctor/console', element: <ProctorConsole />, access: 'protected', allowedRoles: PROCTOR },
  { path: '/proctor/schedule', element: <ProctorSchedule />, access: 'protected', allowedRoles: PROCTOR },
  { path: '/proctor/readiness', element: <ProctorReadiness />, access: 'protected', allowedRoles: PROCTOR },
  { path: '/proctor/attendance', element: <ProctorAttendance />, access: 'protected', allowedRoles: PROCTOR },
  { path: '/proctor/monitoring', element: <ProctorMonitoring />, access: 'protected', allowedRoles: PROCTOR },
  { path: '/proctor/incidents', element: <ProctorIncidents />, access: 'protected', allowedRoles: PROCTOR },
  { path: '/proctor/devices', element: <ProctorDeviceManagement />, access: 'protected', allowedRoles: PROCTOR },
  { path: '/proctor/student-devices', element: <StudentDeviceRegistration />, access: 'protected', allowedRoles: withSystemAdmin('PROCTOR_ADMIN') },
  { path: '/admin/student-devices', element: <AdminStudentDeviceManagement />, access: 'protected', allowedRoles: withSystemAdmin('TESTING_CENTER_ADMIN') },
  { path: '/grader/queue', element: <GradingQueue />, access: 'protected', allowedRoles: withSystemAdmin('GRADER') },
  { path: '/support/dashboard', element: <SupportDashboard />, access: 'protected', allowedRoles: withSystemAdmin('TECH_SUPPORT') },

  { path: '*', element: <NotFoundPage />, access: 'standalone' },
];
