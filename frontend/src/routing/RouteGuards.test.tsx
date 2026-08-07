import { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePhilSA } from '../PhilSAContext';
import { useMockData } from '../services/mockService';
import { User } from '../types';
import { ExamRoute, ProtectedRoute, PublicRoute } from './RouteGuards';

const backendApplicationMocks = vi.hoisted(() => ({
  getStudentProfileCompletion: vi.fn(),
}));

vi.mock('../PhilSAContext', () => ({
  INITIAL_MAINTENANCE_MODULES: [
    { id: '31', name: 'User Accounts', path: '/admin/users', category: 'System Admin', status: 'ACTIVE' },
  ],
  usePhilSA: vi.fn(),
}));
vi.mock('../services/backendApplicationService', () => ({
  backendApplicationService: backendApplicationMocks,
}));
vi.mock('../services/mockService', () => ({ useMockData: vi.fn() }));

const mockUsePhilSA = vi.mocked(usePhilSA);
const mockUseMockData = vi.mocked(useMockData);

const student: User = {
  id: 'student-active',
  email: 'student@example.test',
  firstName: 'Test',
  lastName: 'Student',
  role: 'STUDENT',
};

const admin: User = {
  id: 'admin-1',
  email: 'admin@example.test',
  firstName: 'Test',
  lastName: 'Admin',
  role: 'SYSTEM_ADMIN',
};

function LocationProbe() {
  const location = useLocation();
  return <p>Location: {location.pathname}</p>;
}

function renderAtTarget(guard: (children: ReactNode) => ReactNode) {
  return render(
    <MemoryRouter initialEntries={['/target']}>
      <Routes>
        <Route path="/target" element={guard(<h1>Protected content</h1>)} />
        <Route path="/login" element={<><h1>Login page</h1><LocationProbe /></>} />
        <Route path="/unauthorized" element={<><h1>Unauthorized page</h1><LocationProbe /></>} />
        <Route path="/dashboard" element={<><h1>Dashboard page</h1><LocationProbe /></>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  backendApplicationMocks.getStudentProfileCompletion.mockReset();
  backendApplicationMocks.getStudentProfileCompletion.mockResolvedValue({
    ok: false,
    error: { kind: 'NOT_FOUND', message: 'No pending profile.' },
  });
  mockUsePhilSA.mockReturnValue({
    user: student,
    isLoading: false,
    isAuthInitialized: true,
    initializeAuth: vi.fn(),
    maintenanceModules: [],
  } as unknown as ReturnType<typeof usePhilSA>);
  mockUseMockData.mockReturnValue({ applications: [] } as ReturnType<typeof useMockData>);
});

describe('ProtectedRoute', () => {
  it('initializes authentication before deciding whether to redirect', async () => {
    const initializeAuth = vi.fn().mockResolvedValue(undefined);
    mockUsePhilSA.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthInitialized: false,
      initializeAuth,
      maintenanceModules: [],
    } as unknown as ReturnType<typeof usePhilSA>);

    renderAtTarget((children) => (
      <ProtectedRoute allowedRoles={['STUDENT']} layout="standalone">{children}</ProtectedRoute>
    ));

    expect(screen.getByText('Preparing your secure prototype session.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Login page' })).not.toBeInTheDocument();
    await waitFor(() => expect(initializeAuth).toHaveBeenCalledTimes(1));
  });

  it('redirects an unauthenticated visitor to login', () => {
    mockUsePhilSA.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthInitialized: true,
      initializeAuth: vi.fn(),
      maintenanceModules: [],
    } as unknown as ReturnType<typeof usePhilSA>);

    renderAtTarget((children) => (
      <ProtectedRoute allowedRoles={['STUDENT']} layout="standalone">{children}</ProtectedRoute>
    ));

    expect(screen.getByRole('heading', { name: 'Login page' })).toBeInTheDocument();
    expect(screen.getByText('Location: /login')).toBeInTheDocument();
  });

  it('renders content for an allowed role', async () => {
    renderAtTarget((children) => (
      <ProtectedRoute allowedRoles={['STUDENT']} layout="standalone">{children}</ProtectedRoute>
    ));

    expect(await screen.findByRole('heading', { name: 'Protected content' })).toBeInTheDocument();
  });

  it('redirects a student with pending profile completion to the profile module', async () => {
    backendApplicationMocks.getStudentProfileCompletion.mockResolvedValue({
      ok: true,
      data: {
        application: { id: 'application-id', status: 'SUBMITTED', personal: {}, address: {}, school: {}, coursePreferences: [], reviewStep: {}, examCycleId: '2026', version: 1, submittedAt: null, createdAt: '2026-07-14T00:00:00Z', updatedAt: '2026-07-14T00:00:00Z' },
        fields: [],
        progress: { completed: 1, total: 2, percent: 50, remaining: [] },
      },
    });

    render(
      <MemoryRouter initialEntries={['/student/permit']}>
        <Routes>
          <Route
            path="/student/permit"
            element={<ProtectedRoute allowedRoles={['STUDENT']} layout="standalone"><h1>Permit</h1></ProtectedRoute>}
          />
          <Route path="/student/profile" element={<><h1>Profile module</h1><LocationProbe /></>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Profile module' })).toBeInTheDocument();
    expect(screen.getByText('Location: /student/profile')).toBeInTheDocument();
  });

  it('redirects an authenticated but disallowed role to unauthorized', () => {
    mockUsePhilSA.mockReturnValue({
      user: admin,
      isLoading: false,
      isAuthInitialized: true,
      initializeAuth: vi.fn(),
      maintenanceModules: [],
    } as unknown as ReturnType<typeof usePhilSA>);

    renderAtTarget((children) => (
      <ProtectedRoute allowedRoles={['STUDENT']} layout="standalone">{children}</ProtectedRoute>
    ));

    expect(screen.getByRole('heading', { name: 'Unauthorized page' })).toBeInTheDocument();
    expect(screen.getByText('Location: /unauthorized')).toBeInTheDocument();
  });

  it('redirects an allowed role without module read permission to unauthorized', () => {
    mockUsePhilSA.mockReturnValue({
      user: { ...admin, permissions: ['MOD_31_EDIT'] },
      isLoading: false,
      isAuthInitialized: true,
      initializeAuth: vi.fn(),
      maintenanceModules: [],
    } as unknown as ReturnType<typeof usePhilSA>);

    render(
      <MemoryRouter initialEntries={['/admin/users']}>
        <Routes>
          <Route
            path="/admin/users"
            element={<ProtectedRoute allowedRoles={['SYSTEM_ADMIN']} layout="standalone"><h1>Protected content</h1></ProtectedRoute>}
          />
          <Route path="/unauthorized" element={<><h1>Unauthorized page</h1><LocationProbe /></>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Unauthorized page' })).toBeInTheDocument();
    expect(screen.getByText('Location: /unauthorized')).toBeInTheDocument();
  });

  it('renders an allowed role with module read permission', () => {
    mockUsePhilSA.mockReturnValue({
      user: { ...admin, permissions: ['MOD_31_READ'] },
      isLoading: false,
      isAuthInitialized: true,
      initializeAuth: vi.fn(),
      maintenanceModules: [],
    } as unknown as ReturnType<typeof usePhilSA>);

    render(
      <MemoryRouter initialEntries={['/admin/users']}>
        <Routes>
          <Route
            path="/admin/users"
            element={<ProtectedRoute allowedRoles={['SYSTEM_ADMIN']} layout="standalone"><h1>Protected content</h1></ProtectedRoute>}
          />
          <Route path="/unauthorized" element={<h1>Unauthorized page</h1>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Protected content' })).toBeInTheDocument();
  });

  it('renders content when strictAccess grants it, regardless of allowedRoles', () => {
    mockUsePhilSA.mockReturnValue({
      user: { ...admin, role: 'GOVERNMENT', backendRole: 'DEPED_ADMIN' },
      isLoading: false,
      isAuthInitialized: true,
      initializeAuth: vi.fn(),
      maintenanceModules: [],
    } as unknown as ReturnType<typeof usePhilSA>);

    renderAtTarget((children) => (
      <ProtectedRoute allowedRoles={['SYSTEM_ADMIN']} strictAccess={(user) => user.backendRole === 'DEPED_ADMIN'} layout="standalone">
        {children}
      </ProtectedRoute>
    ));

    expect(screen.getByRole('heading', { name: 'Protected content' })).toBeInTheDocument();
  });

  it('redirects to unauthorized when strictAccess denies, even with a matching module-permission fallback', () => {
    mockUsePhilSA.mockReturnValue({
      user: { ...admin, role: 'UNIVERSITY_ADMIN', permissions: ['MOD_31_READ'] },
      isLoading: false,
      isAuthInitialized: true,
      initializeAuth: vi.fn(),
      maintenanceModules: [{ id: '31', name: 'User Accounts', path: '/target', category: 'System Admin', status: 'ACTIVE' }],
    } as unknown as ReturnType<typeof usePhilSA>);

    renderAtTarget((children) => (
      <ProtectedRoute allowedRoles={['SYSTEM_ADMIN', 'UNIVERSITY_ADMIN']} strictAccess={() => false} layout="standalone">
        {children}
      </ProtectedRoute>
    ));

    expect(screen.getByRole('heading', { name: 'Unauthorized page' })).toBeInTheDocument();
    expect(screen.getByText('Location: /unauthorized')).toBeInTheDocument();
  });
});

describe('PublicRoute', () => {
  it('continues an authenticated backend session away from the login route', () => {
    mockUsePhilSA.mockReturnValue({
      user: admin,
      isLoading: false,
      isAuthInitialized: true,
      initializeAuth: vi.fn(),
      maintenanceModules: [],
    } as unknown as ReturnType<typeof usePhilSA>);

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<PublicRoute><h1>Login page</h1></PublicRoute>} />
          <Route path="/admin/users" element={<><h1>User Management</h1><LocationProbe /></>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'User Management' })).toBeInTheDocument();
    expect(screen.getByText('Location: /admin/users')).toBeInTheDocument();
  });

  it('keeps public non-login routes available to authenticated users', () => {
    render(
      <MemoryRouter initialEntries={['/register']}>
        <Routes>
          <Route path="/register" element={<PublicRoute><h1>Register page</h1></PublicRoute>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Register page' })).toBeInTheDocument();
  });
});

describe('ExamRoute', () => {
  it.each(['SCHEDULED', 'CHECKED_IN', 'IN_PROGRESS'] as const)(
    'allows a student with %s exam status',
    async (examStatus) => {
      mockUseMockData.mockReturnValue({
        applications: [{ userId: student.id, examStatus }],
      } as ReturnType<typeof useMockData>);

      renderAtTarget((children) => <ExamRoute>{children}</ExamRoute>);

      expect(await screen.findByRole('heading', { name: 'Protected content' })).toBeInTheDocument();
    },
  );

  it('redirects an ineligible student to the dashboard', async () => {
    mockUseMockData.mockReturnValue({
      applications: [{ userId: student.id, examStatus: 'SUBMITTED' }],
    } as ReturnType<typeof useMockData>);

    renderAtTarget((children) => <ExamRoute>{children}</ExamRoute>);

    expect(await screen.findByRole('heading', { name: 'Dashboard page' })).toBeInTheDocument();
    expect(screen.getByText('Location: /dashboard')).toBeInTheDocument();
  });

  it('redirects a non-student role to unauthorized', () => {
    mockUsePhilSA.mockReturnValue({
      user: admin,
      isLoading: false,
      isAuthInitialized: true,
      initializeAuth: vi.fn(),
      maintenanceModules: [],
    } as unknown as ReturnType<typeof usePhilSA>);

    renderAtTarget((children) => <ExamRoute>{children}</ExamRoute>);

    expect(screen.getByRole('heading', { name: 'Unauthorized page' })).toBeInTheDocument();
  });
});
