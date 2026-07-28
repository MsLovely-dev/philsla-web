import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { INITIAL_MAINTENANCE_MODULES, usePhilSA, type MaintenanceModule } from '../PhilSAContext';
import { cn } from '../lib/utils';
import { 
  LayoutDashboard, 
  FileText, 
  CheckCircle, 
  Calendar, 
  Database, 
  Monitor, 
  Edit3, 
  Users, 
  BarChart2, 
  ClipboardList, 
  Layers, 
  Settings,
  LogOut,
  Bell,
  Search,
  BookOpen,
  Shield,
  Menu,
  X,
  ChevronDown,
  User,
  Clock,
  Video,
  Archive,
  ShieldAlert,
  Zap,
  PlayCircle,
  History,
  ShieldCheck,
  MapPin,
  RefreshCw,
  AlertOctagon,
  FileEdit,
  LifeBuoy
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Logo } from './Logo';

interface SidebarItem {
  icon: any;
  label: string;
  href: string;
  roles?: string[];
  subItems?: { label: string; href: string; roles?: string[] }[];
}

interface SidebarGroup {
  label: string;
  roles?: string[];
  items: SidebarItem[];
}

const SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    label: 'Student Portal',
    roles: ['STUDENT'],
    items: [
      { icon: FileText, label: 'Application', href: '/student/application' },
      { icon: ClipboardList, label: 'Exam Permit', href: '/student/permit' },
      { icon: CheckCircle, label: 'Results', href: '/student/results' },
    ]
  },
  {
    label: 'Government Oversight',
    roles: ['EXECUTIVE', 'GOVERNMENT'],
    items: [
      { icon: BarChart2, label: 'National Analytics', href: '/admin/government' },
      { icon: ShieldAlert, label: 'Incident Monitor', href: '/admin/recordings/incidents' },
      { icon: Archive, label: 'Recording Archive', href: '/admin/recordings' },
    ]
  },
  {
    label: 'System Administration',
    roles: ['UNIVERSITY_ADMIN', 'SYSTEM_ADMIN', 'ADMISSIONS_REVIEWER', 'EXECUTIVE', 'GOVERNMENT'],
    items: [
      { icon: ShieldCheck, label: 'Device Requests', href: '/admin/maintenance/proctor-device', roles: ['SYSTEM_ADMIN'] },
      {
        icon: ClipboardList,
        label: 'Review Applications',
        href: '/admin/reviewer/applications',
        roles: ['ADMISSIONS_REVIEWER'],
        subItems: [
          { label: 'Audit Logs', href: '/admin/reviewer/applications/audit', roles: ['ADMISSIONS_REVIEWER'] },
        ],
      },
      { icon: Users, label: 'University Applications', href: '/admin/university/applications', roles: ['UNIVERSITY_ADMIN', 'SYSTEM_ADMIN'] },
      { icon: Users, label: 'Proctors', href: '/admin/proctors', roles: ['SYSTEM_ADMIN', 'UNIVERSITY_ADMIN'] },
      { icon: MapPin, label: 'Center Availability', href: '/admin/reviewer/availability', roles: ['ADMISSIONS_REVIEWER', 'SYSTEM_ADMIN', 'UNIVERSITY_ADMIN'] },
      { icon: BookOpen, label: 'Manage Courses', href: '/admin/university/courses', roles: ['UNIVERSITY_ADMIN', 'SYSTEM_ADMIN'] },
      { 
        icon: Calendar, 
        label: 'Batch Management', 
        href: '/admin/university/schedules'
      },
      { icon: BarChart2, label: 'Reporting Matrix', href: '/admin/results/matrix', roles: ['SYSTEM_ADMIN', 'EXECUTIVE', 'UNIVERSITY_ADMIN', 'GOVERNMENT'] },
    ]
  },
  {
    label: 'Exam Management Hub',
    roles: ['ITEM_WRITER', 'ACADEMIC_REVIEWER', 'SYSTEM_ADMIN', 'EXAM_ADMINISTRATOR', 'UNIVERSITY_ADMIN'],
    items: [
      { icon: LayoutDashboard, label: 'Overview', href: '/admin/hub/overview' },
      { icon: ClipboardList, label: 'Exam Blueprints', href: '/admin/blueprints' },
      { icon: BookOpen, label: 'Exam Sets', href: '/admin/hub/exam-sets' },
      { 
        icon: Database, 
        label: 'Question Bank', 
        href: '/admin/questions', 
        roles: ['SYSTEM_ADMIN', 'EXAM_ADMINISTRATOR'] 
      },
      { 
        icon: Database, 
        label: 'Question Bank', 
        href: '/admin/hub/questions', 
        roles: ['ITEM_WRITER', 'ACADEMIC_REVIEWER'] 
      },
      { icon: CheckCircle, label: 'Exam Review', href: '/admin/hub/review', roles: ['SYSTEM_ADMIN', 'EXAM_ADMINISTRATOR', 'UNIVERSITY_ADMIN'] },
      { icon: CheckCircle, label: 'Results Release', href: '/admin/hub/results-release' },
      {
        icon: FileText,
        label: 'Audit Logs',
        href: '/admin/hub/audit',
        subItems: [
          { label: 'Student Registration', href: '/admin/hub/audit/student-registration', roles: ['SYSTEM_ADMIN'] },
        ],
      },
    ]
  },
  {
    label: 'Operations & Records',
    roles: ['SYSTEM_ADMIN', 'EXECUTIVE', 'UNIVERSITY_ADMIN', 'EXAM_ADMINISTRATOR', 'GOVERNMENT'],
    items: [
      { icon: Shield, label: 'Command Center', href: '/admin/command-center', roles: ['SYSTEM_ADMIN'] },
      { icon: Video, label: 'Recording Archive', href: '/admin/recordings' },
      { icon: ShieldAlert, label: 'Incident Records', href: '/admin/recordings/incidents' },
    ]
  },
  {
    label: 'Results & Analytics',
    roles: ['SYSTEM_ADMIN', 'EXECUTIVE', 'UNIVERSITY_ADMIN', 'GOVERNMENT'],
    items: [
      { icon: ClipboardList, label: 'Score Management', href: '/admin/results/scores', roles: ['SYSTEM_ADMIN', 'UNIVERSITY_ADMIN'] },
    ]
  },
  {
    label: 'Proctor Operations',
    roles: ['PROCTOR', 'PROCTOR_ADMIN', 'SYSTEM_ADMIN'],
    items: [
      { icon: Monitor, label: 'Register Device', href: '/proctor/devices', roles: ['PROCTOR', 'PROCTOR_ADMIN'] },
      { icon: Calendar, label: 'Exam Schedule', href: '/proctor/schedule' },
      { icon: ClipboardList, label: 'Device Readiness', href: '/proctor/readiness' },
      { icon: Users, label: 'Attendance', href: '/proctor/attendance' },
      { icon: Monitor, label: 'Exam Monitoring', href: '/proctor/monitoring' },
      { icon: ShieldAlert, label: 'Incident Records', href: '/proctor/incidents' },
      { icon: Monitor, label: 'Student PC Reg', href: '/proctor/student-devices', roles: ['PROCTOR_ADMIN'] },
    ]
  },
  {
    label: 'System Admin',
    roles: ['SYSTEM_ADMIN'],
    items: [
      { icon: Users, label: 'User Accounts', href: '/admin/users' },
      { icon: ClipboardList, label: 'Compliance', href: '/admin/system' },
      { icon: ShieldAlert, label: 'Student Appeals', href: '/admin/appeals' },
      { icon: Zap, label: 'System Integration', href: '/admin/integrations' },
      { icon: BarChart2, label: 'Agency Monitoring', href: '/admin/government' },
    ]
  },
  {
    label: 'Maintenance & Protocols',
    roles: ['SYSTEM_ADMIN', 'UNIVERSITY_ADMIN', 'ADMISSIONS_REVIEWER', 'EXAM_ADMINISTRATOR', 'PROCTOR', 'PROCTOR_ADMIN'],
    items: [
      { 
        icon: Settings, 
        label: 'Maintenance Center', 
        href: '/admin/maintenance',
        subItems: [
          { label: 'Student Registration', href: '/admin/maintenance/registration', roles: ['SYSTEM_ADMIN', 'UNIVERSITY_ADMIN', 'ADMISSIONS_REVIEWER'] },
          { label: 'Application Status', href: '/admin/maintenance/application-status', roles: ['SYSTEM_ADMIN', 'ADMISSIONS_REVIEWER'] },
          { label: 'Testing Centers', href: '/admin/maintenance/testing-center', roles: ['SYSTEM_ADMIN', 'UNIVERSITY_ADMIN', 'ADMISSIONS_REVIEWER'] },
          { label: 'Batch Config', href: '/admin/maintenance/batch', roles: ['SYSTEM_ADMIN', 'UNIVERSITY_ADMIN', 'ADMISSIONS_REVIEWER'] },
          { label: 'Device Validation', href: '/admin/maintenance/device', roles: ['SYSTEM_ADMIN', 'PROCTOR', 'PROCTOR_ADMIN'] },
          { label: 'Attendance Rules', href: '/admin/maintenance/attendance', roles: ['SYSTEM_ADMIN', 'PROCTOR', 'PROCTOR_ADMIN'] },
          { label: 'Exam Integrity', href: '/admin/maintenance/integrity', roles: ['SYSTEM_ADMIN', 'PROCTOR', 'PROCTOR_ADMIN'] },
          { label: 'Question Config', href: '/admin/maintenance/question-bank', roles: ['SYSTEM_ADMIN', 'UNIVERSITY_ADMIN', 'EXAM_ADMINISTRATOR'] },
          { label: 'Proctor Roles', href: '/admin/maintenance/proctor', roles: ['SYSTEM_ADMIN', 'UNIVERSITY_ADMIN'] },
          { label: 'Degree Programs', href: '/admin/maintenance/degree-programs', roles: ['SYSTEM_ADMIN', 'UNIVERSITY_ADMIN'] },
        ]
      },
    ]
  },
  {
    label: 'Testing Center Logistics',
    roles: ['TESTING_CENTER_ADMIN', 'SYSTEM_ADMIN'],
    items: [
      { icon: MapPin, label: 'Center Management', href: '/admin/center-control' },
      { icon: Users, label: 'Proctor Management', href: '/admin/proctors' },
      { icon: Monitor, label: 'Student PC Regs', href: '/admin/student-devices' },
    ]
  }
];

function isRouteActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function moduleKey(moduleName: string) {
  return moduleName.replace(/&/g, '').replace(/\s+/g, '_').toUpperCase();
}

function findModuleForNavigation(modules: MaintenanceModule[], href: string, label: string) {
  return modules
    .slice()
    .sort((left, right) => right.path.length - left.path.length)
    .find((module) => (
      module.path === href ||
      href.startsWith(`${module.path}/`) ||
      module.name.toLowerCase() === label.toLowerCase()
    ));
}

function hasAnyModulePermission(userPermissions: string[] | undefined, module?: MaintenanceModule) {
  if (!module || !userPermissions?.length) return false;

  return userPermissions.some((permission) => (
    permission.startsWith(`MOD_${module.id}_`) || permission === moduleKey(module.name)
  ));
}

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, logout, maintenanceModules } = usePhilSA();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const mockNotifications = [
    {
      id: 1,
      title: "Official Scorecard Transmitted",
      purpose: "AY 2026-2027 Space Science Scholarship Qualification & Academic Evaluation",
      time: "10 mins ago",
      type: "SUCCESS",
    },
    {
      id: 2,
      title: "System Integration Error Alert",
      purpose: "PhilSys National ID Authentication Registry - Verification Handshake Timeout",
      time: "1 hour ago",
      type: "ERROR",
    },
    {
      id: 3,
      title: "Batch 2 Schedule Verified",
      purpose: "DEPED Learner Reference Number (LRN) Automated Batch Matching",
      time: "3 hours ago",
      type: "INFO",
    },
  ];

  if (!user) return null;
  const modules = maintenanceModules?.length ? maintenanceModules : INITIAL_MAINTENANCE_MODULES;

  const agency = user.email?.includes('ched') ? 'CHED' : 
                 user.email?.includes('deped') ? 'DEPED' : 
                 user.email?.includes('tesda') ? 'TESDA' : 
                 user.email?.includes('executive') ? 'NATIONAL' : null;

  const filteredGroups = SIDEBAR_GROUPS.filter(group => {
    // Hide System Administration groups for specific government agencies (DEPED, TESDA, CHED)
    // but keep it for System Admins and University Admins
    if ((group.label === 'System Administration' || group.label === 'System Admin')) {
      if (user.role === 'GOVERNMENT' && agency !== 'NATIONAL') return false;
    }
    
    const groupHasPermission = group.items.some((item) => {
      const itemModule = findModuleForNavigation(modules, item.href, item.label);
      if (hasAnyModulePermission(user.permissions, itemModule)) return true;

      return item.subItems?.some((sub) => {
        const subModule = findModuleForNavigation(modules, sub.href, sub.label);
        return hasAnyModulePermission(user.permissions, subModule);
      });
    });

    return !group.roles || group.roles.includes(user.role) || groupHasPermission;
  }).map(group => {
    let items = [...group.items];
    
    // Prevent duplicate logs/recordings groups for CHED & DEPED admins (GOVERNMENT role)
    if (group.label === 'Operations & Records' && user.role === 'GOVERNMENT') {
      items = items.filter(item => 
        item.label !== 'Recording Archive' && item.label !== 'Incident Records'
      );
    }

    // Modify "Government Oversight" based on agency
    if (group.label === 'Government Oversight') {
      if (agency === 'TESDA') {
        // Remove Incident Monitor and Recording Archive for TESDA
        items = items.filter(item => 
          item.label !== 'Incident Monitor' && item.label !== 'Recording Archive'
        );
      }
      
      // Map names based on agency
      items = items.map(item => {
        if (item.label === 'National Analytics') {
          if (agency === 'CHED') return { ...item, label: 'Analytics & Reports' };
          if (agency === 'DEPED') return { ...item, label: 'DEPED Analytics' };
          if (agency === 'TESDA') return { ...item, label: 'TESDA Analytics' };
        }
        return item;
      });
    }

    const activeItems = items.filter(item => {
      const matched = findModuleForNavigation(modules, item.href, item.label);
      const hasItemPermission = hasAnyModulePermission(user.permissions, matched);

      // Role check
      if (item.roles && !item.roles.includes(user.role) && !hasItemPermission) return false;

      // Compliance Status Check (locked/disabled modules do not appear in the sidebar)
      if (matched && matched.status === 'MAINTENANCE') return false;

      if (hasItemPermission) return true;

      if (item.subItems?.some((sub) => {
        const matchedSub = findModuleForNavigation(modules, sub.href, sub.label);
        if (matchedSub?.status === 'MAINTENANCE') return false;
        return hasAnyModulePermission(user.permissions, matchedSub);
      })) return true;

      return !group.roles || group.roles.includes(user.role);
    }).map(item => {
      // Filter subItems if present
      if (item.subItems) {
        const activeSub = item.subItems.filter(sub => {
          const matchedSub = findModuleForNavigation(modules, sub.href, sub.label);
          const hasSubPermission = hasAnyModulePermission(user.permissions, matchedSub);

          if (sub.roles && !sub.roles.includes(user.role) && !hasSubPermission) return false;

          if (matchedSub && matchedSub.status === 'MAINTENANCE') return false;

          return hasSubPermission || !sub.roles || sub.roles.includes(user.role);
        });
        return { ...item, subItems: activeSub };
      }
      return item;
    });

    return {
      ...group,
      items: activeItems
    };
  }).filter(group => group.items.length > 0);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-philsa-bg overflow-hidden">
      {/* Mobile Sidebar Overlay / Backdrop */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileSidebarOpen(false)}
              className="fixed inset-0 bg-black z-50 md:hidden"
            />
            {/* Slide-out Sidebar Drawer */}
            <motion.aside 
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 bottom-0 left-0 w-[280px] bg-white border-r border-philsa-border text-philsa-navy z-55 md:hidden flex flex-col"
            >
              {/* Header inside Mobile Drawer */}
              <div className="h-20 flex items-center justify-between px-6 shrink-0 border-b border-philsa-border">
                <Link to="/dashboard" onClick={() => setIsMobileSidebarOpen(false)}>
                  <Logo showText size="sm" layout="horizontal" />
                </Link>
                <button 
                  onClick={() => setIsMobileSidebarOpen(false)} 
                  className="p-2 text-philsa-navy hover:bg-philsa-bg rounded-full transition-colors cursor-pointer"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation List */}
              <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-6">
                {filteredGroups.map((group, groupIdx) => (
                  <div key={groupIdx} className="space-y-1">
                    <h2 className="px-3 text-[10px] font-black uppercase tracking-[0.2em] text-philsa-gray/60 mb-2">
                      {group.label}
                    </h2>
                    {group.items.map((item) => {
                      const isActive = isRouteActive(location.pathname, item.href) || item.subItems?.some(sub => isRouteActive(location.pathname, sub.href));
                      const hasSubItems = item.subItems && item.subItems.length > 0;
                      
                      return (
                        <div key={item.href} className="space-y-1">
                          <Link
                            to={item.href}
                            onClick={() => {
                              if (!hasSubItems) {
                                setIsMobileSidebarOpen(false);
                              }
                            }}
                            className={cn(
                              "flex items-center gap-4 px-3 py-2.5 rounded-lg transition-colors group",
                              isActive 
                                ? "bg-philsa-red text-white shadow-sm" 
                                : "text-philsa-gray hover:text-philsa-navy hover:bg-philsa-bg"
                            )}
                          >
                            <item.icon className={cn("w-4 h-4 shrink-0", isActive ? "text-white" : "text-philsa-gray/50 group-hover:text-philsa-navy")} />
                            <span className="font-bold text-[13px] tracking-tight flex-1">{item.label}</span>
                          </Link>
                          
                          {hasSubItems && (
                            <div className="ml-8 space-y-1 pt-1 border-l border-philsa-border mt-1">
                              {item.subItems?.map(sub => {
                                const isSubActive = location.pathname === sub.href;
                                return (
                                  <Link
                                    key={sub.href}
                                    to={sub.href}
                                    onClick={() => setIsMobileSidebarOpen(false)}
                                    className={cn(
                                      "block px-4 py-2 text-xs font-bold transition-all rounded-r-lg",
                                      isSubActive
                                        ? "text-white bg-philsa-red shadow-xs border-l-2 border-philsa-red-hover -ml-[1px]"
                                        : "text-philsa-gray hover:text-philsa-navy hover:bg-philsa-bg"
                                    )}
                                  >
                                    {sub.label}
                                  </Link>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </nav>

              <div className="p-4 border-t border-philsa-border shrink-0">
                <button 
                  onClick={() => {
                    setIsMobileSidebarOpen(false);
                    handleLogout();
                  }}
                  className="flex items-center gap-4 w-full px-3 py-3 rounded-lg text-philsa-gray hover:text-philsa-navy hover:bg-philsa-bg transition-colors"
                >
                  <LogOut className="w-5 h-5 shrink-0 text-philsa-gray/50" />
                  <span className="font-bold text-sm">Sign Out</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside 
        className={cn(
          "bg-white border-r border-philsa-border text-philsa-navy transition-all duration-300 hidden md:flex flex-col z-50 shrink-0",
          isSidebarOpen ? "w-[260px]" : "w-[80px]"
        )}
      >
        <div className="h-20 flex items-center justify-between px-6 shrink-0 border-b border-philsa-border">
          {isSidebarOpen && (
            <Link to="/dashboard">
              <Logo showText size="sm" layout="horizontal" />
            </Link>
          )}
          {!isSidebarOpen && (
            <div className="w-full flex justify-center">
              <Logo size="sm" />
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-6">
          {filteredGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1">
              {isSidebarOpen && (
                <h2 className="px-3 text-[10px] font-black uppercase tracking-[0.2em] text-philsa-gray/60 mb-2">
                  {group.label}
                </h2>
              )}
              {group.items.map((item) => {
                const isActive = isRouteActive(location.pathname, item.href) || item.subItems?.some(sub => isRouteActive(location.pathname, sub.href));
                const hasSubItems = item.subItems && item.subItems.length > 0;
                
                return (
                  <div key={item.href} className="space-y-1">
                    <Link
                      to={item.href}
                      className={cn(
                        "flex items-center gap-4 px-3 py-2.5 rounded-lg transition-colors group",
                        isActive 
                          ? "bg-philsa-red text-white shadow-sm" 
                          : "text-philsa-gray hover:text-philsa-navy hover:bg-philsa-bg"
                      )}
                    >
                      <item.icon className={cn("w-4 h-4 shrink-0", isActive ? "text-white" : "text-philsa-gray/50 group-hover:text-philsa-navy")} />
                      {isSidebarOpen && <span className="font-bold text-[13px] tracking-tight flex-1">{item.label}</span>}
                    </Link>
                    
                    {isSidebarOpen && hasSubItems && (
                      <div className="ml-8 space-y-1 pt-1 border-l border-philsa-border mt-1">
                        {item.subItems?.map(sub => {
                          const isSubActive = location.pathname === sub.href;
                          return (
                            <Link
                              key={sub.href}
                              to={sub.href}
                              className={cn(
                                "block px-4 py-2 text-xs font-bold transition-all rounded-r-lg",
                                isSubActive
                                  ? "text-white bg-philsa-red shadow-xs border-l-2 border-philsa-red-hover -ml-[1px]"
                                  : "text-philsa-gray hover:text-philsa-navy hover:bg-philsa-bg"
                              )}
                            >
                              {sub.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-philsa-border shrink-0">
          <button 
            onClick={handleLogout}
            className={cn(
              "flex items-center gap-4 w-full px-3 py-3 rounded-lg text-philsa-gray hover:text-philsa-navy hover:bg-philsa-bg transition-colors",
              !isSidebarOpen && "justify-center"
            )}
          >
            <LogOut className="w-5 h-5 shrink-0 text-philsa-gray/50" />
            {isSidebarOpen && <span className="font-bold text-sm">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-white border-b border-philsa-border flex items-center justify-between md:justify-end px-4 sm:px-8 shrink-0">
          {/* Hamburger Menu Toggle for Mobile */}
          <button 
            onClick={() => setIsMobileSidebarOpen(true)}
            className="md:hidden p-2 text-philsa-navy hover:bg-philsa-bg rounded-xl transition-colors cursor-pointer flex items-center justify-center border border-philsa-border"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-6 relative">
            <div className="relative">
              <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="relative p-2 text-philsa-navy hover:bg-philsa-bg rounded-full transition-colors cursor-pointer"
                aria-label="Notification center"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-philsa-red rounded-full border-2 border-white animate-pulse" />
              </button>

              {/* Notification Dropdown Panel */}
              <AnimatePresence>
                {isNotificationsOpen && (
                  <>
                    {/* Click Outside Overlay */}
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setIsNotificationsOpen(false)} 
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-3 w-80 md:w-96 bg-white border border-philsa-border rounded-2xl shadow-xl py-4 z-50 text-left overflow-hidden"
                    >
                      <div className="px-4 pb-3 border-b border-philsa-border flex justify-between items-center bg-slate-50/50">
                        <span className="text-xs font-black text-philsa-navy uppercase tracking-wider">System Alerts & Notifications</span>
                        <span className="text-[10px] bg-philsa-red/10 text-philsa-red font-black px-2 py-0.5 rounded-full">3 New</span>
                      </div>
                      <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                        {mockNotifications.map((notif) => (
                          <div 
                            key={notif.id} 
                            className="p-4 hover:bg-slate-50 transition-colors space-y-1 cursor-pointer"
                            onClick={() => setIsNotificationsOpen(false)}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="text-xs font-black text-philsa-navy leading-snug">{notif.title}</h4>
                              <span className="text-[9px] text-slate-400 font-bold shrink-0">{notif.time}</span>
                            </div>
                            
                            {/* Display Notification Purpose */}
                            <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg">
                              <p className="text-[10px] font-extrabold uppercase text-philsa-red tracking-wider">Purpose:</p>
                              <p className="text-[11px] font-medium text-slate-600 leading-normal mt-0.5">{notif.purpose}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            
            <div className="h-8 w-[1px] bg-philsa-border" />
            
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-philsa-navy">{user.firstName} {user.lastName}</p>
                <p className="text-[10px] text-philsa-gray uppercase font-bold tracking-wider">{user.role.replace('_', ' ')}</p>
              </div>
              <div className="w-10 h-10 bg-philsa-red/10 border border-philsa-red/20 rounded-full flex items-center justify-center text-philsa-red font-bold">
                {user.firstName[0]}{user.lastName[0]}
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
