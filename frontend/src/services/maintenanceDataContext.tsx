import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { universityService, type UniversityRecord } from './backendUniversityService';
import { schoolService, type SchoolRecord } from './backendSchoolService';
import type { ServiceFailure } from './serviceResult';

/**
 * App-level cache for the Maintenance Center registry lists (universities and
 * schools). Because this provider is mounted above the router, the fetched
 * lists survive navigation between the "List of Universities" and "List of
 * Schools" tabs — so switching tabs reads cached data instantly instead of
 * remounting from empty and refetching (the previous "empty-then-filled" flash).
 *
 * College courses are intentionally NOT cached here: they are fetched
 * per-university on drill-down, which is cheap and naturally scoped.
 */
interface MaintenanceDataContextValue {
  universities: UniversityRecord[];
  universitiesLoaded: boolean;
  universitiesError: string | null;
  ensureUniversities: () => void;
  reloadUniversities: () => void;
  setUniversityRecord: (record: UniversityRecord) => void;
  removeUniversityRecord: (id: string) => void;
  adjustCourseCount: (universityId: string, delta: number) => void;

  schools: SchoolRecord[];
  schoolsLoaded: boolean;
  schoolsError: string | null;
  ensureSchools: () => void;
  reloadSchools: () => void;
  setSchoolRecord: (record: SchoolRecord) => void;
  removeSchoolRecord: (id: string) => void;
}

const MaintenanceDataContext = createContext<MaintenanceDataContextValue | null>(null);

export function MaintenanceDataProvider({ children }: { children: ReactNode }) {
  // --- Universities ---
  const [universities, setUniversities] = useState<UniversityRecord[]>([]);
  const [universitiesLoaded, setUniversitiesLoaded] = useState(false);
  const [universitiesError, setUniversitiesError] = useState<string | null>(null);
  const universitiesInFlight = useRef(false);
  const universitiesLoadedRef = useRef(false);

  const loadUniversities = useCallback(() => {
    if (universitiesInFlight.current) return;
    universitiesInFlight.current = true;
    setUniversitiesError(null);
    universityService.listUniversities().then((result) => {
      universitiesInFlight.current = false;
      if (result.ok) {
        setUniversities(result.data);
        universitiesLoadedRef.current = true;
        setUniversitiesLoaded(true);
      } else {
        setUniversitiesError((result as ServiceFailure).error.message);
      }
    });
  }, []);

  const ensureUniversities = useCallback(() => {
    if (universitiesLoadedRef.current) return;
    loadUniversities();
  }, [loadUniversities]);

  const setUniversityRecord = useCallback((record: UniversityRecord) => {
    setUniversities((prev) =>
      prev.some((u) => u.id === record.id)
        ? prev.map((u) => (u.id === record.id ? record : u))
        : [record, ...prev],
    );
  }, []);

  const removeUniversityRecord = useCallback((id: string) => {
    setUniversities((prev) => prev.filter((u) => u.id !== id));
  }, []);

  const adjustCourseCount = useCallback((universityId: string, delta: number) => {
    setUniversities((prev) =>
      prev.map((u) =>
        u.id === universityId ? { ...u, courseCount: Math.max(0, u.courseCount + delta) } : u,
      ),
    );
  }, []);

  // --- Schools ---
  const [schools, setSchools] = useState<SchoolRecord[]>([]);
  const [schoolsLoaded, setSchoolsLoaded] = useState(false);
  const [schoolsError, setSchoolsError] = useState<string | null>(null);
  const schoolsInFlight = useRef(false);
  const schoolsLoadedRef = useRef(false);

  const loadSchools = useCallback(() => {
    if (schoolsInFlight.current) return;
    schoolsInFlight.current = true;
    setSchoolsError(null);
    schoolService.listSchools().then((result) => {
      schoolsInFlight.current = false;
      if (result.ok) {
        setSchools(result.data);
        schoolsLoadedRef.current = true;
        setSchoolsLoaded(true);
      } else {
        setSchoolsError((result as ServiceFailure).error.message);
      }
    });
  }, []);

  const ensureSchools = useCallback(() => {
    if (schoolsLoadedRef.current) return;
    loadSchools();
  }, [loadSchools]);

  const setSchoolRecord = useCallback((record: SchoolRecord) => {
    setSchools((prev) =>
      prev.some((s) => s.id === record.id)
        ? prev.map((s) => (s.id === record.id ? record : s))
        : [record, ...prev],
    );
  }, []);

  const removeSchoolRecord = useCallback((id: string) => {
    setSchools((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const value = useMemo<MaintenanceDataContextValue>(
    () => ({
      universities,
      universitiesLoaded,
      universitiesError,
      ensureUniversities,
      reloadUniversities: loadUniversities,
      setUniversityRecord,
      removeUniversityRecord,
      adjustCourseCount,
      schools,
      schoolsLoaded,
      schoolsError,
      ensureSchools,
      reloadSchools: loadSchools,
      setSchoolRecord,
      removeSchoolRecord,
    }),
    [
      universities,
      universitiesLoaded,
      universitiesError,
      ensureUniversities,
      loadUniversities,
      setUniversityRecord,
      removeUniversityRecord,
      adjustCourseCount,
      schools,
      schoolsLoaded,
      schoolsError,
      ensureSchools,
      loadSchools,
      setSchoolRecord,
      removeSchoolRecord,
    ],
  );

  return <MaintenanceDataContext.Provider value={value}>{children}</MaintenanceDataContext.Provider>;
}

export function useMaintenanceData(): MaintenanceDataContextValue {
  const context = useContext(MaintenanceDataContext);
  if (!context) {
    throw new Error('useMaintenanceData must be used within a MaintenanceDataProvider');
  }
  return context;
}
