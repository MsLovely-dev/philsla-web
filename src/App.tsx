import React, { ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { PhilSAProvider, usePhilSA } from './PhilSAContext';
import { MockDataProvider } from './services/mockService';
import { PublicLayout } from './components/PublicLayout';
import { DashboardLayout } from './components/DashboardLayout';
import { FileText, Shield, Search, Filter, AlertTriangle, Clock, ArrowLeft } from 'lucide-react';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import StudentApplication from './pages/StudentApplication';
import ReviewApplications from './pages/reviewer/ReviewApplications';
import ReviewerApplicationDetail from './pages/reviewer/ReviewerApplicationDetail';
import TestingCenterAvailability from './pages/reviewer/TestingCenterAvailability';
import ExamDelivery from './pages/ExamDelivery';
import ExamPermitPage from './pages/ExamPermitPage';
import ResultsPage from './pages/ResultsPage';
import ApplicationsList from './pages/admin/university/ApplicationsList';
import ApplicationDetail from './pages/admin/university/ApplicationDetail';
import ManageCourses from './pages/admin/university/ManageCourses';
import ExamSchedules from './pages/admin/university/ExamSchedules';
import HubOverview from './pages/admin/hub/Overview';
import HubQuestionBank from './pages/admin/hub/QuestionBank';
import HubExamSets from './pages/admin/hub/ExamSets';
import HubBulkUpload from './pages/admin/hub/BulkUpload';
import HubAuditTrail from './pages/admin/hub/AuditTrail';
import ExamReviewList from './pages/admin/hub/ExamReviewList';
import ExamReviewDetail from './pages/admin/hub/ExamReviewDetail';
import StimulusManagement from './pages/admin/hub/StimulusManagement';
import CenterManagement from './pages/testing-center/CenterManagement';
import ScoreManagement from './pages/results/ScoreManagement';
import ReportingMatrix from './pages/results/ReportingMatrix';
import ExamBlueprints from './pages/ExamBlueprints';
import ResultsManagement from './pages/ResultsManagement';
import UserManagement from './pages/UserManagement';
import SystemCompliance from './pages/SystemCompliance';
import GovernmentAccess from './pages/GovernmentAccess';
import RecordingsCommand from './pages/RecordingsCommand';
import CommandCenter from './pages/admin/CommandCenter';
import IncidentEvidence from './pages/IncidentEvidence';
import PlaybackCenter from './pages/PlaybackCenter';
import ProctorConsole from './pages/ProctorConsole';
import ProctorSchedule from './pages/proctor/ProctorSchedule';
import ProctorReadiness from './pages/proctor/ProctorReadiness';
import ProctorAttendance from './pages/proctor/ProctorAttendance';
import ProctorMonitoring from './pages/proctor/ProctorMonitoring';
import GradingQueue from './pages/GradingQueue';
import SupportDashboard from './pages/support/SupportDashboard';
import ProctorManagement from './pages/admin/ProctorManagement';
import MaintenanceHub from './pages/admin/maintenance/MaintenanceHub';
import StudentRegistrationMaintenance from './pages/admin/maintenance/StudentRegistrationMaintenance';
import ApplicationStatusMaintenance from './pages/admin/maintenance/ApplicationStatusMaintenance';
import TestingCenterMaintenance from './pages/admin/maintenance/TestingCenterMaintenance';
import BatchConfigurationMaintenance from './pages/admin/maintenance/BatchConfigurationMaintenance';
import DeviceValidationMaintenance from './pages/admin/maintenance/DeviceValidationMaintenance';
import AttendanceRulesMaintenance from './pages/admin/maintenance/AttendanceRulesMaintenance';
import ExamIntegrityMaintenance from './pages/admin/maintenance/ExamIntegrityMaintenance';
import QuestionBankConfigMaintenance from './pages/admin/maintenance/QuestionBankConfigMaintenance';
import ProctorMaintenance from './pages/admin/maintenance/ProctorMaintenance';
import ProctorDeviceVerification from './pages/admin/maintenance/ProctorDeviceVerification';
import DegreeProgramsMaintenance from './pages/admin/maintenance/DegreeProgramsMaintenance';
import ProctorDeviceManagement from './pages/proctor/ProctorDeviceManagement';
import StudentDeviceRegistration from './pages/proctor/StudentDeviceRegistration';
import AdminStudentDeviceManagement from './pages/admin/AdminStudentDeviceManagement';
import ResultsRelease from './pages/admin/hub/ResultsRelease';
import SystemIntegration from './pages/admin/SystemIntegration';
import ProctorIncidents from './pages/proctor/ProctorIncidents';
import AdminAppeals from './pages/admin/AdminAppeals';

function MaintenanceGuard({ children }: { children: ReactNode }) {
  const { maintenanceModules } = usePhilSA();
  const location = useLocation();
  const pathname = location.pathname;

  const offlineModule = maintenanceModules?.find(item => {
    if (item.status !== 'MAINTENANCE') return false;
    if (item.name === 'Student Application' && (pathname === '/student/application' || pathname === '/register')) {
      return true;
    }
    return pathname.startsWith(item.path);
  });

  if (offlineModule) {
    return (
      <div className="min-h-screen bg-philsa-bg flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-full max-w-xl card-philsa text-center space-y-6 !p-12 border-t-8 border-t-philsa-red">
          <div className="w-16 h-16 rounded-3xl bg-red-50 text-philsa-red flex items-center justify-center mx-auto mb-2 animate-bounce">
            <AlertTriangle className="w-8 h-8" />
          </div>
          
          <div className="space-y-2">
            <p className="text-[10px] font-black text-philsa-gray uppercase tracking-[0.2em]">Service Control Advisory</p>
            <h2 className="text-3xl font-extrabold text-philsa-navy tracking-tight">Module Temporarily Offline</h2>
            <div className="px-3 py-1 bg-red-100 text-red-800 text-[11px] font-black uppercase tracking-wider rounded-full w-fit mx-auto mt-2">
              {offlineModule.name}
            </div>
          </div>

          <div className="p-6 bg-philsa-bg rounded-2xl border border-philsa-border/40 text-left space-y-4">
            <div>
              <p className="text-[10px] font-black text-philsa-gray uppercase tracking-widest mb-1">Maintenance Reason</p>
              <p className="text-sm font-medium text-philsa-navy leading-relaxed">
                {offlineModule.reason || "We are performing routine data architecture optimizations to prepare for the live national testing cycle."}
              </p>
            </div>
            
            <div className="pt-4 border-t border-philsa-border/40 flex items-start gap-3">
              <Clock className="w-5 h-5 text-philsa-red shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-black text-philsa-gray uppercase tracking-widest mb-1">Scheduled Downtime Information</p>
                <p className="text-sm font-bold text-philsa-red">
                  {offlineModule.downtime || "Estimated return: 2 Hours"}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <button 
              onClick={() => window.history.back()}
              className="btn-secondary py-3 px-6 flex items-center gap-2 justify-center"
            >
              <ArrowLeft className="w-4 h-4" /> Go Back
            </button>
            <a 
              href="/dashboard"
              className="px-6 py-3 bg-philsa-navy text-white font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-slate-800 transition-colors flex items-center justify-center"
            >
              Return to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = usePhilSA();
  if (isLoading) return <div className="h-screen w-full flex items-center justify-center font-bold text-philsa-navy">Initializing PhilSA Environment...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <DashboardLayout><MaintenanceGuard>{children}</MaintenanceGuard></DashboardLayout>;
}

function PublicRoute({ children }: { children: ReactNode }) {
  return <PublicLayout><MaintenanceGuard>{children}</MaintenanceGuard></PublicLayout>;
}

export default function App() {
  return (
    <PhilSAProvider>
      <MockDataProvider>
        <Router>
          <Routes>
          {/* Public Routes */}
          <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><StudentApplication /></PublicRoute>} />
          
          {/* Dashboard & Mixed Routes */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          
          {/* Student Specific */}
          <Route path="/student/application" element={<ProtectedRoute><StudentApplication /></ProtectedRoute>} />
          <Route path="/student/permit" element={<ProtectedRoute><ExamPermitPage /></ProtectedRoute>} />
          <Route path="/student/results" element={<ProtectedRoute><ResultsPage /></ProtectedRoute>} />
          <Route path="/student/take-exam" element={<ProtectedRoute><ExamDelivery inlineMode={true} /></ProtectedRoute>} />
          <Route path="/exam/live" element={<ExamDelivery />} /> {/* No layout for focus */}

          {/* Admissions Specialist Module */}
          <Route path="/admin/reviewer/applications" element={<ProtectedRoute><ReviewApplications /></ProtectedRoute>} />
          <Route path="/admin/reviewer/applications/:id" element={<ProtectedRoute><ReviewerApplicationDetail /></ProtectedRoute>} />
          <Route path="/admin/reviewer/availability" element={<ProtectedRoute><TestingCenterAvailability /></ProtectedRoute>} />
          
          {/* University Admin Specific */}
          <Route path="/admin/university/applications" element={<ProtectedRoute><ApplicationsList /></ProtectedRoute>} />
          <Route path="/admin/university/applications/:id" element={<ProtectedRoute><ApplicationDetail /></ProtectedRoute>} />
          <Route path="/admin/university/courses" element={<ProtectedRoute><ManageCourses /></ProtectedRoute>} />
          <Route path="/admin/university/schedules" element={<ProtectedRoute><ExamSchedules /></ProtectedRoute>} />

          {/* Exam Management Hub */}
          <Route path="/admin/hub/overview" element={<ProtectedRoute><HubOverview /></ProtectedRoute>} />
          <Route path="/admin/hub/questions" element={<ProtectedRoute><HubQuestionBank /></ProtectedRoute>} />
          <Route path="/admin/hub/stimuli" element={<ProtectedRoute><StimulusManagement /></ProtectedRoute>} />
          <Route path="/admin/hub/exam-sets" element={<ProtectedRoute><HubExamSets /></ProtectedRoute>} />
          <Route path="/admin/hub/upload" element={<ProtectedRoute><HubBulkUpload /></ProtectedRoute>} />
          <Route path="/admin/hub/audit" element={<ProtectedRoute><HubAuditTrail /></ProtectedRoute>} />
          <Route path="/admin/hub/review" element={<ProtectedRoute><ExamReviewList /></ProtectedRoute>} />
          <Route path="/admin/hub/review/:id" element={<ProtectedRoute><ExamReviewDetail /></ProtectedRoute>} />
          <Route path="/admin/hub/results-release" element={<ProtectedRoute><ResultsRelease /></ProtectedRoute>} />

          {/* Results & Analytics Hub */}
          <Route path="/admin/results/scores" element={<ProtectedRoute><ScoreManagement /></ProtectedRoute>} />
          <Route path="/admin/results/matrix" element={<ProtectedRoute><ReportingMatrix /></ProtectedRoute>} />

          {/* Item Writer & Question Bank */}
          <Route path="/admin/questions" element={<ProtectedRoute><HubQuestionBank /></ProtectedRoute>} />
          <Route path="/admin/blueprints" element={<ProtectedRoute><ExamBlueprints /></ProtectedRoute>} />
          
          {/* Results & Governance */}
          <Route path="/admin/reports" element={<ProtectedRoute><ResultsManagement /></ProtectedRoute>} />
          
          {/* Security & System Administration */}
          <Route path="/admin/users" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
          <Route path="/admin/system" element={<ProtectedRoute><SystemCompliance /></ProtectedRoute>} />
          <Route path="/admin/appeals" element={<ProtectedRoute><AdminAppeals /></ProtectedRoute>} />
          <Route path="/admin/government" element={<ProtectedRoute><GovernmentAccess /></ProtectedRoute>} />
          <Route path="/admin/proctors" element={<ProtectedRoute><ProctorManagement /></ProtectedRoute>} />
          <Route path="/admin/integrations" element={<ProtectedRoute><SystemIntegration /></ProtectedRoute>} />
          <Route path="/admin/center-control" element={<ProtectedRoute><CenterManagement /></ProtectedRoute>} />

          {/* Maintenance & Configuration Hub */}
          <Route path="/admin/maintenance" element={<ProtectedRoute><MaintenanceHub /></ProtectedRoute>} />
          <Route path="/admin/maintenance/registration" element={<ProtectedRoute><StudentRegistrationMaintenance /></ProtectedRoute>} />
          <Route path="/admin/maintenance/application-status" element={<ProtectedRoute><ApplicationStatusMaintenance /></ProtectedRoute>} />
          <Route path="/admin/maintenance/testing-center" element={<ProtectedRoute><TestingCenterMaintenance /></ProtectedRoute>} />
          <Route path="/admin/maintenance/batch" element={<ProtectedRoute><BatchConfigurationMaintenance /></ProtectedRoute>} />
          <Route path="/admin/maintenance/device" element={<ProtectedRoute><DeviceValidationMaintenance /></ProtectedRoute>} />
          <Route path="/admin/maintenance/attendance" element={<ProtectedRoute><AttendanceRulesMaintenance /></ProtectedRoute>} />
          <Route path="/admin/maintenance/integrity" element={<ProtectedRoute><ExamIntegrityMaintenance /></ProtectedRoute>} />
          <Route path="/admin/maintenance/question-bank" element={<ProtectedRoute><QuestionBankConfigMaintenance /></ProtectedRoute>} />
          <Route path="/admin/maintenance/proctor" element={<ProtectedRoute><ProctorMaintenance /></ProtectedRoute>} />
          <Route path="/admin/maintenance/proctor-device" element={<ProtectedRoute><ProctorDeviceVerification /></ProtectedRoute>} />
          <Route path="/admin/maintenance/degree-programs" element={<ProtectedRoute><DegreeProgramsMaintenance /></ProtectedRoute>} />
          
          {/* Evidence & Recording Management */}
          <Route path="/admin/command-center" element={<ProtectedRoute><CommandCenter /></ProtectedRoute>} />
          <Route path="/admin/recordings" element={<ProtectedRoute><RecordingsCommand /></ProtectedRoute>} />
          <Route path="/admin/recordings/incidents" element={<ProtectedRoute><IncidentEvidence /></ProtectedRoute>} />
          <Route path="/admin/recordings/playback/:id" element={<ProtectedRoute><PlaybackCenter /></ProtectedRoute>} />

          {/* Proctor & Proctor Admin */}
          <Route path="/proctor/console" element={<ProtectedRoute><ProctorConsole /></ProtectedRoute>} />
          <Route path="/proctor/schedule" element={<ProtectedRoute><ProctorSchedule /></ProtectedRoute>} />
          <Route path="/proctor/readiness" element={<ProtectedRoute><ProctorReadiness /></ProtectedRoute>} />
          <Route path="/proctor/attendance" element={<ProtectedRoute><ProctorAttendance /></ProtectedRoute>} />
          <Route path="/proctor/monitoring" element={<ProtectedRoute><ProctorMonitoring /></ProtectedRoute>} />
          <Route path="/proctor/incidents" element={<ProtectedRoute><ProctorIncidents /></ProtectedRoute>} />
          <Route path="/proctor/devices" element={<ProtectedRoute><ProctorDeviceManagement /></ProtectedRoute>} />
          <Route path="/proctor/student-devices" element={<ProtectedRoute><StudentDeviceRegistration /></ProtectedRoute>} />
          
          {/* Testing Center / Seat Allocations for Student Devices */}
          <Route path="/admin/student-devices" element={<ProtectedRoute><AdminStudentDeviceManagement /></ProtectedRoute>} />
          
          {/* Grader */}
          <Route path="/grader/queue" element={<ProtectedRoute><GradingQueue /></ProtectedRoute>} />

          {/* Technical Support Module */}
          <Route path="/support/dashboard" element={<ProtectedRoute><SupportDashboard /></ProtectedRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
      </MockDataProvider>
    </PhilSAProvider>
  );
}
