import { ReactNode, useEffect } from 'react';
import { AlertTriangle, ArrowLeft, Clock } from 'lucide-react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { PublicLayout } from '../components/PublicLayout';
import { LoadingState } from '../components/ui';
import { INITIAL_MAINTENANCE_MODULES, usePhilSA } from '../PhilSAContext';
import { useMockData } from '../services/mockService';
import { User, UserRole } from '../types';

function LoadingScreen() {
  return <LoadingState title="Initializing PhilSA Environment" message="Preparing your secure prototype session." fullPage />;
}

function useProtectedAuth() {
  const auth = usePhilSA();

  useEffect(() => {
    if (!auth.isAuthInitialized) {
      void auth.initializeAuth();
    }
  }, [auth.initializeAuth, auth.isAuthInitialized]);

  return auth;
}

function routeForRole(role: UserRole): string {
  if (role === 'PROCTOR' || role === 'PROCTOR_ADMIN') return '/proctor/schedule';
  if (role === 'TESTING_CENTER_ADMIN') return '/admin/center-control';
  if (role === 'ADMISSIONS_REVIEWER') return '/admin/reviewer/applications';
  if (role === 'UNIVERSITY_ADMIN') return '/admin/university/applications';
  if (role === 'EXAM_ADMINISTRATOR') return '/admin/hub/overview';
  if (role === 'SYSTEM_ADMIN') return '/admin/users';
  if (role === 'GOVERNMENT' || role === 'EXECUTIVE') return '/admin/government';
  if (role === 'TECH_SUPPORT') return '/support/dashboard';
  return '/dashboard';
}

function routeForUser(user: User, maintenanceModules: typeof INITIAL_MAINTENANCE_MODULES): string {
  if (user.permissions?.length) {
    const firstPermittedModule = user.permissions
      .map((permission) => {
        const match = permission.match(/^MOD_([^_]+)_/);
        if (!match) return null;
        return maintenanceModules.find((module) => module.id === match[1]) ?? null;
      })
      .find(Boolean);

    if (firstPermittedModule) return firstPermittedModule.path;
  }

  return routeForRole(user.role);
}

function moduleKey(moduleName: string) {
  return moduleName.replace(/&/g, '').replace(/\s+/g, '_').toUpperCase();
}

function canReadCurrentModule(user: User, pathname: string, maintenanceModules: typeof INITIAL_MAINTENANCE_MODULES) {
  if (!user.permissions?.length) return true;

  const module = maintenanceModules
    .slice()
    .sort((left, right) => right.path.length - left.path.length)
    .find((item) => pathname === item.path || pathname.startsWith(`${item.path}/`));

  if (!module) return true;

  const permissions = new Set(user.permissions);
  return permissions.has(`MOD_${module.id}_READ`) || permissions.has(moduleKey(module.name));
}

function canAccessRouteByModulePermission(user: User, pathname: string, maintenanceModules: typeof INITIAL_MAINTENANCE_MODULES) {
  if (!user.permissions?.length) return false;

  const module = maintenanceModules
    .slice()
    .sort((left, right) => right.path.length - left.path.length)
    .find((item) => pathname === item.path || pathname.startsWith(`${item.path}/`));

  if (!module) return false;

  return user.permissions.some((permission) => (
    permission.startsWith(`MOD_${module.id}_`) || permission === moduleKey(module.name)
  ));
}

function MaintenanceGuard({ children }: { children: ReactNode }) {
  const { maintenanceModules } = usePhilSA();
  const { pathname } = useLocation();
  const offlineModule = maintenanceModules?.find((item) => {
    if (item.status !== 'MAINTENANCE') return false;
    if (item.name === 'Student Application' && (pathname === '/student/application' || pathname === '/register')) return true;
    return pathname.startsWith(item.path);
  });

  if (!offlineModule) return <>{children}</>;

  return (
    <main className="min-h-screen bg-philsa-bg flex items-center justify-center p-6">
      <section className="card-philsa w-full max-w-xl text-center space-y-6 !p-12 border-t-8 border-t-philsa-red" aria-labelledby="maintenance-title">
        <div className="w-16 h-16 rounded-3xl bg-red-50 text-philsa-red flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <p className="text-[10px] font-black text-philsa-gray uppercase tracking-[0.2em]">Service Control Advisory</p>
          <h1 id="maintenance-title" className="text-3xl font-extrabold text-philsa-navy">Module Temporarily Offline</h1>
          <div className="px-3 py-1 bg-red-100 text-red-800 text-[11px] font-black uppercase tracking-wider rounded-full w-fit mx-auto">{offlineModule.name}</div>
        </div>
        <div className="p-6 bg-philsa-bg rounded-2xl border border-philsa-border/40 text-left space-y-4">
          <div>
            <p className="text-[10px] font-black text-philsa-gray uppercase tracking-widest mb-1">Maintenance Reason</p>
            <p className="text-sm font-medium text-philsa-navy leading-relaxed">{offlineModule.reason || 'We are performing routine data architecture optimizations to prepare for the live national testing cycle.'}</p>
          </div>
          <div className="pt-4 border-t border-philsa-border/40 flex items-start gap-3">
            <Clock className="w-5 h-5 text-philsa-red shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-[10px] font-black text-philsa-gray uppercase tracking-widest mb-1">Scheduled Downtime Information</p>
              <p className="text-sm font-bold text-philsa-red">{offlineModule.downtime || 'Estimated return: 2 Hours'}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button type="button" onClick={() => window.history.back()} className="btn-secondary flex items-center justify-center gap-2">
            <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Go Back
          </button>
          <Link to="/dashboard" className="btn-primary flex items-center justify-center">Return to Dashboard</Link>
        </div>
      </section>
    </main>
  );
}

export function PublicRoute({ children }: { children: ReactNode }) {
  const { user, isLoading, maintenanceModules } = usePhilSA();
  const { pathname } = useLocation();

  if (pathname === '/login') {
    if (isLoading) return <LoadingScreen />;
    if (user) return <Navigate to={routeForUser(user, maintenanceModules?.length ? maintenanceModules : INITIAL_MAINTENANCE_MODULES)} replace />;
  }

  return <PublicLayout><MaintenanceGuard>{children}</MaintenanceGuard></PublicLayout>;
}

interface ProtectedRouteProps {
  allowedRoles: readonly UserRole[];
  children: ReactNode;
  layout?: 'dashboard' | 'standalone';
  /**
   * When set, this is the exclusive authorization check: `allowedRoles`
   * and the module-permission fallback are both bypassed. A disallowed
   * role cannot use module permissions to open a strict-access route.
   */
  strictAccess?: (user: User) => boolean;
}

export function ProtectedRoute({ allowedRoles, children, layout = 'dashboard', strictAccess }: ProtectedRouteProps) {
  const { user, isAuthInitialized, isLoading, maintenanceModules } = useProtectedAuth();
  const location = useLocation();
  const modules = maintenanceModules?.length ? maintenanceModules : INITIAL_MAINTENANCE_MODULES;

  if (!isAuthInitialized || isLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;

  if (strictAccess) {
    if (!strictAccess(user)) return <Navigate to="/unauthorized" state={{ from: location.pathname }} replace />;
  } else {
    if (!allowedRoles.includes(user.role) && !canAccessRouteByModulePermission(user, location.pathname, modules)) {
      return <Navigate to="/unauthorized" state={{ from: location.pathname }} replace />;
    }
    if (!canReadCurrentModule(user, location.pathname, modules)) {
      return <Navigate to="/unauthorized" state={{ from: location.pathname }} replace />;
    }
  }

  const content = <MaintenanceGuard>{children}</MaintenanceGuard>;
  return layout === 'dashboard' ? <DashboardLayout>{content}</DashboardLayout> : content;
}

export function ExamRoute({ children }: { children: ReactNode }) {
  const { user, isAuthInitialized, isLoading } = useProtectedAuth();
  const { applications } = useMockData();
  const location = useLocation();

  if (!isAuthInitialized || isLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (user.role !== 'STUDENT' && user.role !== 'SYSTEM_ADMIN') {
    return <Navigate to="/unauthorized" state={{ from: location.pathname }} replace />;
  }

  // SYSTEM_ADMIN previewing this page has no real (or mock) application to
  // check eligibility against -- let the preview straight through, same as
  // every other Student Portal page's admin-preview path this sprint.
  if (user.role === 'SYSTEM_ADMIN') {
    return <MaintenanceGuard>{children}</MaintenanceGuard>;
  }

  const application = applications.find((item) => item.userId === user.id);
  if (!application || !['SCHEDULED', 'CHECKED_IN', 'IN_PROGRESS'].includes(application.examStatus ?? '')) {
    return <Navigate to="/dashboard" replace />;
  }

  return <MaintenanceGuard>{children}</MaintenanceGuard>;
}
