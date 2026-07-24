import { BrowserRouter, useRoutes } from 'react-router-dom';
import { PhilSAProvider } from './PhilSAContext';
import { MockDataProvider } from './services/mockService';
import { ExamRoute, ProtectedRoute, PublicRoute } from './routing/RouteGuards';
import { APP_ROUTES, AppRouteDefinition } from './routing/routes';

function renderRouteElement(route: AppRouteDefinition) {
  if (route.access === 'public') return <PublicRoute>{route.element}</PublicRoute>;
  if (route.access === 'exam') return <ExamRoute>{route.element}</ExamRoute>;
  if (route.access === 'protected') {
    return (
      <ProtectedRoute allowedRoles={route.allowedRoles ?? []} layout={route.layout}>
        {route.element}
      </ProtectedRoute>
    );
  }
  return route.element;
}

export default function App() {
  return (
    <PhilSAProvider>
      <MockDataProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </MockDataProvider>
    </PhilSAProvider>
  );
}

function AppRoutes() {
  return useRoutes(APP_ROUTES.map((route) => ({
    path: route.path,
    element: renderRouteElement(route),
  })));
}
