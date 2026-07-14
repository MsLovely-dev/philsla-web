import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuditLog, SupportTicket } from './types';
import { createPrototypeAuthService } from './services';
import type { AuthIdentifierChallenge, AuthOtpChallenge, AuthSession } from './services/contracts';
import { authorizationError } from './services/serviceResult';
import type { ServiceResult } from './services/serviceResult';

const authService = createPrototypeAuthService();

interface InputModuleControl {
  id: string;
  name: string;
  description: string;
  targetForms: string[];
  isActive: boolean;
}

interface PhilSAContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  login: (email: string, password?: string) => Promise<boolean>;
  startLoginIdentifier: (identifier: string) => Promise<ServiceResult<AuthIdentifierChallenge>>;
  verifyLoginPassword: (pendingAuthToken: string, password: string) => Promise<ServiceResult<AuthOtpChallenge>>;
  verifyLoginOtp: (otpPendingAuthToken: string, code: string) => Promise<ServiceResult<AuthSession>>;
  logout: () => void;
  auditLogs: AuditLog[];
  addAuditLog: (action: string, details: string) => void;
  isLoading: boolean;
  maintenanceModules: any[];
  setMaintenanceModules: (modules: any[]) => void;
  inputModules: InputModuleControl[];
  setInputModules: (modules: InputModuleControl[]) => void;
  tickets: SupportTicket[];
  addTicket: (ticket: Omit<SupportTicket, 'id' | 'createdAt'>) => void;
  updateTicket: (updated: SupportTicket) => void;
}

const PhilSAContext = createContext<PhilSAContextType | undefined>(undefined);

export function PhilSAProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [maintenanceModules, setMaintenanceModulesInternal] = useState<any[]>([]);
  const [inputModules, setInputModulesInternal] = useState<InputModuleControl[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const setMaintenanceModules = (modules: any[]) => {
    setMaintenanceModulesInternal(modules);
    localStorage.setItem('philsa_maintenance_modules', JSON.stringify(modules));
  };

  const setInputModules = (modules: InputModuleControl[]) => {
    setInputModulesInternal(modules);
    localStorage.setItem('philsa_input_modules', JSON.stringify(modules));
  };

  useEffect(() => {
    let isMounted = true;

    void authService.getCurrentSession().then((result) => {
      if (isMounted && result.ok) {
        setUser(result.data?.user ?? null);
      }
    }).finally(() => {
      if (isMounted) {
        setIsLoading(false);
      }
    });
    
    const savedLogs = localStorage.getItem('philsa_logs');
    if (savedLogs) {
      setAuditLogs(JSON.parse(savedLogs));
    }

    const savedMaintenance = localStorage.getItem('philsa_maintenance_modules');
    const initialModules = [
      // Student Portal
      { id: '1', name: 'Dashboard', path: '/dashboard', category: 'Student Portal', status: 'ACTIVE' },
      { id: '2', name: 'Student Application', path: '/student/application', category: 'Student Portal', status: 'ACTIVE' },
      { id: '3', name: 'Exam Permit', path: '/student/permit', category: 'Student Portal', status: 'ACTIVE' },
      { id: '4', name: 'Results', path: '/student/results', category: 'Student Portal', status: 'ACTIVE' },

      // Government Oversight
      { id: '5', name: 'National Analytics', path: '/admin/government', category: 'Government Oversight', status: 'ACTIVE' },
      { id: '6', name: 'Incident Monitor', path: '/admin/recordings/incidents', category: 'Government Oversight', status: 'ACTIVE' },
      { id: '7', name: 'Recording Archive', path: '/admin/recordings', category: 'Government Oversight', status: 'ACTIVE' },

      // System Administration
      { id: '8', name: 'Device Requests', path: '/admin/maintenance/proctor-device', category: 'System Administration', status: 'ACTIVE' },
      { id: '9', name: 'Review Applications', path: '/admin/reviewer/applications', category: 'System Administration', status: 'ACTIVE' },
      { id: '10', name: 'University Applications', path: '/admin/university/applications', category: 'System Administration', status: 'ACTIVE' },
      { id: '11', name: 'Proctors', path: '/admin/proctors', category: 'System Administration', status: 'ACTIVE' },
      { id: '12', name: 'Center Availability', path: '/admin/reviewer/availability', category: 'System Administration', status: 'ACTIVE' },
      { id: '13', name: 'Manage Courses', path: '/admin/university/courses', category: 'System Administration', status: 'ACTIVE' },
      { id: '14', name: 'Batch Management', path: '/admin/university/schedules', category: 'System Administration', status: 'ACTIVE' },
      { id: '15', name: 'Reporting Matrix', path: '/admin/results/matrix', category: 'System Administration', status: 'ACTIVE' },

      // Exam Management Hub
      { id: '16', name: 'Overview', path: '/admin/hub/overview', category: 'Exam Management Hub', status: 'ACTIVE' },
      { id: '17', name: 'Question Bank', path: '/admin/questions', category: 'Exam Management Hub', status: 'ACTIVE' },
      { id: '18', name: 'Writer Question Bank', path: '/admin/hub/questions', category: 'Exam Management Hub', status: 'ACTIVE' },
      { id: '19', name: 'Exam Sets', path: '/admin/hub/exam-sets', category: 'Exam Management Hub', status: 'ACTIVE' },
      { id: '20', name: 'Exam Review', path: '/admin/hub/review', category: 'Exam Management Hub', status: 'ACTIVE' },
      { id: '21', name: 'Bulk Upload Center', path: '/admin/hub/upload', category: 'Exam Management Hub', status: 'ACTIVE' },
      { id: '22', name: 'Audit Logs', path: '/admin/hub/audit', category: 'Exam Management Hub', status: 'ACTIVE' },
      { id: '46', name: 'Results Release', path: '/admin/hub/results-release', category: 'Exam Management Hub', status: 'ACTIVE' },

      // Operations & Records
      { id: '23', name: 'Command Center', path: '/admin/command-center', category: 'Operations & Records', status: 'ACTIVE' },

      // Results & Analytics
      { id: '24', name: 'Score Management', path: '/admin/results/scores', category: 'Results & Analytics', status: 'ACTIVE' },

      // Proctor Operations
      { id: '25', name: 'Register Device', path: '/proctor/devices', category: 'Proctor Operations', status: 'ACTIVE' },
      { id: '26', name: 'Exam Schedule', path: '/proctor/schedule', category: 'Proctor Operations', status: 'ACTIVE' },
      { id: '27', name: 'Device Readiness', path: '/proctor/readiness', category: 'Proctor Operations', status: 'ACTIVE' },
      { id: '28', name: 'Attendance', path: '/proctor/attendance', category: 'Proctor Operations', status: 'ACTIVE' },
      { id: '29', name: 'Exam Monitoring', path: '/proctor/monitoring', category: 'Proctor Operations', status: 'ACTIVE' },
      { id: '30', name: 'Student PC Reg', path: '/proctor/student-devices', category: 'Proctor Operations', status: 'ACTIVE' },

      // System Admin
      { id: '31', name: 'User Accounts', path: '/admin/users', category: 'System Admin', status: 'ACTIVE' },
      { id: '32', name: 'Compliance', path: '/admin/system', category: 'System Admin', status: 'ACTIVE' },
      { id: '33', name: 'Agency Monitoring', path: '/admin/government', category: 'System Admin', status: 'ACTIVE' },
      { id: '47', name: 'System Integration', path: '/admin/integrations', category: 'System Admin', status: 'ACTIVE' },

      // Maintenance & Protocols
      { id: '34', name: 'Maintenance Center', path: '/admin/maintenance', category: 'Maintenance & Protocols', status: 'ACTIVE' },

      // Testing Center Logistics
      { id: '35', name: 'Center Management', path: '/admin/center-control', category: 'Testing Center Logistics', status: 'ACTIVE' },

      // Sub-modules of Maintenance Protocols
      { id: '36', name: 'Student Registration', path: '/admin/maintenance/registration', category: 'Maintenance Protocols', status: 'ACTIVE' },
      { id: '37', name: 'Application Status', path: '/admin/maintenance/application-status', category: 'Maintenance Protocols', status: 'ACTIVE' },
      { id: '38', name: 'Testing Centers', path: '/admin/maintenance/testing-center', category: 'Maintenance Protocols', status: 'ACTIVE' },
      { id: '39', name: 'Batch Config', path: '/admin/maintenance/batch', category: 'Maintenance Protocols', status: 'ACTIVE' },
      { id: '40', name: 'Device Validation', path: '/admin/maintenance/device', category: 'Maintenance Protocols', status: 'ACTIVE' },
      { id: '41', name: 'Attendance Rules', path: '/admin/maintenance/attendance', category: 'Maintenance Protocols', status: 'ACTIVE' },
      { id: '42', name: 'Exam Integrity', path: '/admin/maintenance/integrity', category: 'Maintenance Protocols', status: 'ACTIVE' },
      { id: '43', name: 'Question Config', path: '/admin/maintenance/question-bank', category: 'Maintenance Protocols', status: 'ACTIVE' },
      { id: '44', name: 'Proctor Roles', path: '/admin/maintenance/proctor', category: 'Maintenance Protocols', status: 'ACTIVE' },
      { id: '45', name: 'Degree Programs', path: '/admin/maintenance/degree-programs', category: 'Maintenance Protocols', status: 'ACTIVE' }
    ];

    if (savedMaintenance) {
      try {
        const parsed = JSON.parse(savedMaintenance);
        if (parsed.length < 25) {
          // Force override if old schema is found
          setMaintenanceModulesInternal(initialModules);
          localStorage.setItem('philsa_maintenance_modules', JSON.stringify(initialModules));
        } else {
          // Dynamic merge of any missing ones
          const paths = parsed.map((item: any) => item.path);
          const merged = [
            ...parsed,
            ...initialModules.filter(item => !paths.includes(item.path))
          ];
          setMaintenanceModulesInternal(merged);
          localStorage.setItem('philsa_maintenance_modules', JSON.stringify(merged));
        }
      } catch (e) {
        setMaintenanceModulesInternal(initialModules);
        localStorage.setItem('philsa_maintenance_modules', JSON.stringify(initialModules));
      }
    } else {
      setMaintenanceModulesInternal(initialModules);
      localStorage.setItem('philsa_maintenance_modules', JSON.stringify(initialModules));
    }

    const savedInputModules = localStorage.getItem('philsa_input_modules');
    const initialInputModules: InputModuleControl[] = [
      { id: 'student_reg', name: 'Student Registration Form', description: 'Controls whether the online student application form is active or suspended.', targetForms: ['Student Registration Form'], isActive: true },
      { id: 'student_reg_gender', name: 'Student Registration: Gender Selection', description: 'Controls whether the Gender selection field is active/visible in Student Application.', targetForms: ['Student Registration -> Personal Info -> Gender'], isActive: true },
      { id: 'student_reg_national_id', name: 'Student Registration: National ID', description: 'Controls whether the Philippine National ID entry field is active/visible in Student Application.', targetForms: ['Student Registration -> Personal Info -> National ID'], isActive: true },
      { id: 'student_reg_middle_name', name: 'Student Registration: Middle Name', description: 'Controls whether the Middle Name input field is active/visible in Student Application.', targetForms: ['Student Registration -> Personal Info -> Middle Name'], isActive: true },
      { id: 'student_reg_birth_place', name: 'Student Registration: Place of Birth', description: 'Controls whether the Place of Birth field is active/visible in Student Application.', targetForms: ['Student Registration -> Personal Info -> Place of Birth'], isActive: true },
      { id: 'student_reg_suffix', name: 'Student Registration: Suffix', description: 'Controls whether the Suffix dropdown is active/visible in Student Application.', targetForms: ['Student Registration -> Personal Info -> Suffix'], isActive: true },
      { id: 'admin_manual_reg', name: 'Manual Add Student Panel', description: 'Controls whether the administrator manual student registration forms/fields are active.', targetForms: ['Manual Add Student overlay'], isActive: true },
      { id: 'answer_sheet_upload', name: 'Exam Answer Sheet Upload', description: 'Controls whether student OMR answer sheet scanning and uploading fields are active.', targetForms: ['Answer Sheet Processing modal'], isActive: true },
      { id: 'score_correction', name: 'Score Correction & Dispatches', description: 'Controls whether custom score override inputs and dispatched ledger updates are active.', targetForms: ['Score Correction input'], isActive: true }
    ];

    if (savedInputModules) {
      try {
        const parsed = JSON.parse(savedInputModules);
        const existingIds = parsed.map((item: any) => item.id);
        const merged = [
          ...parsed,
          ...initialInputModules.filter(item => !existingIds.includes(item.id))
        ];
        setInputModulesInternal(merged);
        localStorage.setItem('philsa_input_modules', JSON.stringify(merged));
      } catch (e) {
        setInputModulesInternal(initialInputModules);
        localStorage.setItem('philsa_input_modules', JSON.stringify(initialInputModules));
      }
    } else {
      setInputModulesInternal(initialInputModules);
      localStorage.setItem('philsa_input_modules', JSON.stringify(initialInputModules));
    }
    
    // Support Tickets Initial Seeding & Loading
    const savedTickets = localStorage.getItem('philsa_tickets');
    if (savedTickets) {
      try {
        setTickets(JSON.parse(savedTickets));
      } catch (e) {
        console.error('Error parsing saved tickets', e);
      }
    } else {
      const initialTickets: SupportTicket[] = [
        {
          id: 'SRN-2026-44821',
          candidateId: 'CAND-2026-8801',
          candidateName: 'Jose Miguel Puno',
          contactEmail: 'stud1resubmit@philsa.edu.ph',
          phase: 'REGISTRATION',
          subject: 'Registry verification failure: LRN Match Failed',
          description: 'I entered my correct LRN (112233445566) but the DepEd Automated Registry rejected it with a mismatch on my middle name (Antonio). Please verify my records and resolve the mismatch so I can proceed.',
          status: 'OPEN',
          priority: 'HIGH',
          createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
          notes: ['Generated during DepEd Automated Sync. User requested manual review.'],
          deviceDetails: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0',
        },
        {
          id: 'SRN-2026-92183',
          candidateId: 'ST-003',
          candidateName: 'Enrique S. Gatus',
          contactEmail: 'egatus@philsa.edu.ph',
          phase: 'PRE_EXAM',
          subject: 'Device Validation Failure: SafeExamBrowser Handshake mismatch',
          description: 'My laptop is marked as INCOMPATIBLE in the proctor console. It says battery level is too low (15%) and the camera check has failed. I am at the test center and my power brick is plugged in, but the console is not updating.',
          status: 'IN_PROGRESS',
          priority: 'HIGH',
          assignedTo: 'Alexander Tech',
          createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
          notes: ['Assigned to Alexander for on-site device validation.', 'Checking client webcam hardware driver.'],
          deviceDetails: 'Tauri SafeExamBrowser Hub Client 2.1.0, Windows 11 Secure App',
          examRoom: 'Benitez Hall R101',
        },
        {
          id: 'SRN-2026-10294',
          candidateId: 'CAND-2026-8802',
          candidateName: 'Maria Cristina Santos',
          contactEmail: 'stud2waitingexam@philsa.edu.ph',
          phase: 'LIVE_EXAM',
          subject: 'Disconnection Timeout during Section 2 of Space Science Exam',
          description: "My browser lost connection to the local exam hub while submitting Question 14. An amber warning is shown: 'Offline: Resync with local proctor console'. I need my token reset or session resynced so I don't lose my answers.",
          status: 'OPEN',
          priority: 'HIGH',
          createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
          notes: [],
          deviceDetails: 'LockDownBrowser Chrome-Core 118, MacOS 14.2',
          examRoom: 'Benitez Hall R101',
        }
      ];
      setTickets(initialTickets);
      localStorage.setItem('philsa_tickets', JSON.stringify(initialTickets));
    }
    
    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email: string, password?: string): Promise<boolean> => {
    const result = await authService.login({ email, password });

    if (result.ok) {
      setUser(result.data.user);
      addAuditLog('LOGIN', `User ${result.data.user.email} logged in as ${result.data.user.role}`);
      return true;
    }

    return false;
  };

  const startLoginIdentifier = async (identifier: string): Promise<ServiceResult<AuthIdentifierChallenge>> => {
    if (!authService.startLoginIdentifier) {
      return authorizationError('Identifier login is unavailable.', 'AUTH_FLOW_UNAVAILABLE');
    }
    return authService.startLoginIdentifier(identifier);
  };

  const verifyLoginPassword = async (
    pendingAuthToken: string,
    password: string,
  ): Promise<ServiceResult<AuthOtpChallenge>> => {
    if (!authService.verifyLoginPassword) {
      return authorizationError('Password login is unavailable.', 'AUTH_FLOW_UNAVAILABLE');
    }
    return authService.verifyLoginPassword(pendingAuthToken, password);
  };

  const verifyLoginOtp = async (
    otpPendingAuthToken: string,
    code: string,
  ): Promise<ServiceResult<AuthSession>> => {
    if (!authService.verifyLoginOtp) {
      return authorizationError('OTP login is unavailable.', 'AUTH_FLOW_UNAVAILABLE');
    }

    const result = await authService.verifyLoginOtp(otpPendingAuthToken, code);
    if (result.ok) {
      setUser(result.data.user);
      addAuditLog('LOGIN', `User ${result.data.user.email} logged in as ${result.data.user.role}`);
    }
    return result;
  };

  const logout = async () => {
    if (user) {
      addAuditLog('LOGOUT', `User ${user.email} logged out`);
    }
    await authService.logout();
    setUser(null);
  };

  const addAuditLog = (action: string, details: string) => {
    const newLog: AuditLog = {
      id: Math.random().toString(36).substr(2, 9),
      userId: user?.id || 'ANONYMOUS',
      action,
      details,
      timestamp: new Date().toISOString(),
      role: user?.role || 'STUDENT',
    };
    const updated = [newLog, ...auditLogs].slice(0, 500);
    setAuditLogs(updated);
    localStorage.setItem('philsa_logs', JSON.stringify(updated));
  };

  const addTicket = (ticket: Omit<SupportTicket, 'id' | 'createdAt'>) => {
    const newTicket: SupportTicket = {
      ...ticket,
      id: 'SRN-2026-' + Math.floor(10000 + Math.random() * 90000),
      createdAt: new Date().toISOString(),
    };
    setTickets(prev => {
      const updated = [newTicket, ...prev];
      localStorage.setItem('philsa_tickets', JSON.stringify(updated));
      return updated;
    });
    addAuditLog('TICKET_CREATED', `Support ticket ${newTicket.id} was created under ${ticket.phase} phase.`);
  };

  const updateTicket = (updated: SupportTicket) => {
    setTickets(prev => {
      const next = prev.map(t => t.id === updated.id ? updated : t);
      localStorage.setItem('philsa_tickets', JSON.stringify(next));
      return next;
    });
    addAuditLog('TICKET_UPDATED', `Support ticket ${updated.id} status changed to ${updated.status}.`);
  };

  return (
    <PhilSAContext.Provider value={{ user, setUser, login, startLoginIdentifier, verifyLoginPassword, verifyLoginOtp, logout, auditLogs, addAuditLog, isLoading, maintenanceModules, setMaintenanceModules, inputModules, setInputModules, tickets, addTicket, updateTicket }}>
      {children}
    </PhilSAContext.Provider>
  );
}

export function usePhilSA() {
  const context = useContext(PhilSAContext);
  if (context === undefined) {
    throw new Error('usePhilSA must be used within a PhilSAProvider');
  }
  return context;
}
