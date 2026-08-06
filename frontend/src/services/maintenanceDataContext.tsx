import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  universityService,
  type ActivationStatus,
  type CollegeCourseRecord,
  type UniversityClassification,
  type UniversityRecord,
} from './backendUniversityService';
import {
  schoolService,
  type SchoolClassification,
  type SchoolRecord,
  type SchoolStatus,
} from './backendSchoolService';
import type { ServiceFailure } from './serviceResult';

/** Rows per page for the paginated registry tables. */
export const MAINTENANCE_PAGE_SIZE = 20;

export interface UniversityQuery {
  page: number;
  search: string;
  classification: UniversityClassification | '';
  region: string;
  status: ActivationStatus | '';
}

export interface SchoolQuery {
  page: number;
  search: string;
  classification: SchoolClassification | '';
  region: string;
  status: SchoolStatus | '';
}

/** Global (unfiltered) totals for the summary stat cards. */
export interface RegistrySummary {
  total: number;
  public: number;
  private: number;
  active: number;
}

const DEFAULT_UNIVERSITY_QUERY: UniversityQuery = {
  page: 1,
  search: '',
  classification: '',
  region: '',
  status: '',
};
const DEFAULT_SCHOOL_QUERY: SchoolQuery = {
  page: 1,
  search: '',
  classification: '',
  region: '',
  status: '',
};
const EMPTY_SUMMARY: RegistrySummary = { total: 0, public: 0, private: 0, active: 0 };

/**
 * App-level state for the Maintenance Center registries. Mounted above the
 * router, so a tab's page/search/filters and the fetched page survive
 * navigation: returning to "List of Universities" / "List of Schools" restores
 * the exact view instantly, and a fetch only happens when a query param changes
 * or a mutation reloads the current page.
 *
 * Registries are paginated server-side (see `listUniversitiesPage` /
 * `listSchoolsPage`). College courses are the exception: they stay client-side,
 * cached per-university (`courses[universityId]`) for instant re-open.
 */
interface MaintenanceDataContextValue {
  universities: UniversityRecord[];
  universityCount: number;
  universityQuery: UniversityQuery;
  universitiesLoading: boolean;
  universitiesLoaded: boolean;
  universitiesError: string | null;
  universitySummary: RegistrySummary;
  ensureUniversities: () => void;
  setUniversityQuery: (partial: Partial<UniversityQuery>) => void;
  reloadUniversities: () => void;
  adjustCourseCount: (universityId: string, delta: number) => void;

  courses: Record<string, CollegeCourseRecord[]>;
  coursesError: string | null;
  ensureCourses: (universityId: string) => void;
  isCoursesLoaded: (universityId: string) => boolean;
  setCourseRecord: (universityId: string, course: CollegeCourseRecord) => void;
  removeCourseRecord: (universityId: string, courseId: string) => void;

  schools: SchoolRecord[];
  schoolCount: number;
  schoolQuery: SchoolQuery;
  schoolsLoading: boolean;
  schoolsLoaded: boolean;
  schoolsError: string | null;
  schoolSummary: RegistrySummary;
  ensureSchools: () => void;
  setSchoolQuery: (partial: Partial<SchoolQuery>) => void;
  reloadSchools: () => void;
}

const MaintenanceDataContext = createContext<MaintenanceDataContextValue | null>(null);

function isPageOnlyChange(partial: object): boolean {
  const keys = Object.keys(partial);
  return keys.length === 1 && keys[0] === 'page';
}

export function MaintenanceDataProvider({ children }: { children: ReactNode }) {
  // --- Universities (paginated) ---
  const [universityQuery, setUniversityQueryState] = useState<UniversityQuery>(DEFAULT_UNIVERSITY_QUERY);
  const universityQueryRef = useRef(universityQuery);
  const [universities, setUniversities] = useState<UniversityRecord[]>([]);
  const [universityCount, setUniversityCount] = useState(0);
  const [universitiesLoading, setUniversitiesLoading] = useState(false);
  const [universitiesLoaded, setUniversitiesLoaded] = useState(false);
  const [universitiesError, setUniversitiesError] = useState<string | null>(null);
  const [universitySummary, setUniversitySummary] = useState<RegistrySummary>(EMPTY_SUMMARY);
  const universitiesLoadedRef = useRef(false);
  const universityRequestId = useRef(0);

  const loadUniversitySummary = useCallback(() => {
    Promise.all([
      universityService.listUniversitiesPage({ page: 1, pageSize: 1 }),
      universityService.listUniversitiesPage({ page: 1, pageSize: 1, classification: 'Public' }),
      universityService.listUniversitiesPage({ page: 1, pageSize: 1, classification: 'Private' }),
      universityService.listUniversitiesPage({ page: 1, pageSize: 1, status: 'Active' }),
    ]).then(([total, pub, priv, active]) => {
      setUniversitySummary({
        total: total.ok ? total.data.count : 0,
        public: pub.ok ? pub.data.count : 0,
        private: priv.ok ? priv.data.count : 0,
        active: active.ok ? active.data.count : 0,
      });
    });
  }, []);

  const loadUniversities = useCallback((query: UniversityQuery) => {
    universityQueryRef.current = query;
    const requestId = ++universityRequestId.current;
    setUniversitiesLoading(true);
    setUniversitiesError(null);
    universityService.listUniversitiesPage({ ...query, pageSize: MAINTENANCE_PAGE_SIZE }).then((result) => {
      if (requestId !== universityRequestId.current) return; // ignore stale responses
      setUniversitiesLoading(false);
      if (result.ok) {
        setUniversities(result.data.results);
        setUniversityCount(result.data.count);
        universitiesLoadedRef.current = true;
        setUniversitiesLoaded(true);
      } else {
        setUniversitiesError((result as ServiceFailure).error.message);
      }
    });
  }, []);

  const ensureUniversities = useCallback(() => {
    if (universitiesLoadedRef.current) return;
    loadUniversities(universityQueryRef.current);
    loadUniversitySummary();
  }, [loadUniversities, loadUniversitySummary]);

  const setUniversityQuery = useCallback((partial: Partial<UniversityQuery>) => {
    const next: UniversityQuery = {
      ...universityQueryRef.current,
      ...partial,
      page: isPageOnlyChange(partial) ? (partial.page ?? 1) : 1,
    };
    universityQueryRef.current = next;
    setUniversityQueryState(next);
    loadUniversities(next);
  }, [loadUniversities]);

  const reloadUniversities = useCallback(() => {
    loadUniversities(universityQueryRef.current);
    loadUniversitySummary();
  }, [loadUniversities, loadUniversitySummary]);

  const adjustCourseCount = useCallback((universityId: string, delta: number) => {
    setUniversities((prev) =>
      prev.map((u) =>
        u.id === universityId ? { ...u, courseCount: Math.max(0, u.courseCount + delta) } : u,
      ),
    );
  }, []);

  // --- College courses (cached per university, client-side) ---
  const [courses, setCourses] = useState<Record<string, CollegeCourseRecord[]>>({});
  const [coursesError, setCoursesError] = useState<string | null>(null);
  const coursesLoadedRef = useRef<Set<string>>(new Set());
  const coursesInFlightRef = useRef<Set<string>>(new Set());

  const ensureCourses = useCallback((universityId: string) => {
    if (coursesLoadedRef.current.has(universityId) || coursesInFlightRef.current.has(universityId)) {
      return;
    }
    coursesInFlightRef.current.add(universityId);
    setCoursesError(null);
    universityService.listCourses(universityId).then((result) => {
      coursesInFlightRef.current.delete(universityId);
      if (result.ok) {
        coursesLoadedRef.current.add(universityId);
        setCourses((prev) => ({ ...prev, [universityId]: result.data }));
      } else {
        setCoursesError((result as ServiceFailure).error.message);
      }
    });
  }, []);

  const isCoursesLoaded = useCallback((universityId: string) => coursesLoadedRef.current.has(universityId), []);

  const setCourseRecord = useCallback((universityId: string, course: CollegeCourseRecord) => {
    setCourses((prev) => {
      const list = prev[universityId] ?? [];
      const exists = list.some((c) => c.id === course.id);
      return {
        ...prev,
        [universityId]: exists ? list.map((c) => (c.id === course.id ? course : c)) : [...list, course],
      };
    });
  }, []);

  const removeCourseRecord = useCallback((universityId: string, courseId: string) => {
    setCourses((prev) => ({
      ...prev,
      [universityId]: (prev[universityId] ?? []).filter((c) => c.id !== courseId),
    }));
  }, []);

  // --- Schools (paginated) ---
  const [schoolQuery, setSchoolQueryState] = useState<SchoolQuery>(DEFAULT_SCHOOL_QUERY);
  const schoolQueryRef = useRef(schoolQuery);
  const [schools, setSchools] = useState<SchoolRecord[]>([]);
  const [schoolCount, setSchoolCount] = useState(0);
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [schoolsLoaded, setSchoolsLoaded] = useState(false);
  const [schoolsError, setSchoolsError] = useState<string | null>(null);
  const [schoolSummary, setSchoolSummary] = useState<RegistrySummary>(EMPTY_SUMMARY);
  const schoolsLoadedRef = useRef(false);
  const schoolRequestId = useRef(0);

  const loadSchoolSummary = useCallback(() => {
    Promise.all([
      schoolService.listSchoolsPage({ page: 1, pageSize: 1 }),
      schoolService.listSchoolsPage({ page: 1, pageSize: 1, classification: 'Public' }),
      schoolService.listSchoolsPage({ page: 1, pageSize: 1, classification: 'Private' }),
      schoolService.listSchoolsPage({ page: 1, pageSize: 1, status: 'Active' }),
    ]).then(([total, pub, priv, active]) => {
      setSchoolSummary({
        total: total.ok ? total.data.count : 0,
        public: pub.ok ? pub.data.count : 0,
        private: priv.ok ? priv.data.count : 0,
        active: active.ok ? active.data.count : 0,
      });
    });
  }, []);

  const loadSchools = useCallback((query: SchoolQuery) => {
    schoolQueryRef.current = query;
    const requestId = ++schoolRequestId.current;
    setSchoolsLoading(true);
    setSchoolsError(null);
    schoolService.listSchoolsPage({ ...query, pageSize: MAINTENANCE_PAGE_SIZE }).then((result) => {
      if (requestId !== schoolRequestId.current) return;
      setSchoolsLoading(false);
      if (result.ok) {
        setSchools(result.data.results);
        setSchoolCount(result.data.count);
        schoolsLoadedRef.current = true;
        setSchoolsLoaded(true);
      } else {
        setSchoolsError((result as ServiceFailure).error.message);
      }
    });
  }, []);

  const ensureSchools = useCallback(() => {
    if (schoolsLoadedRef.current) return;
    loadSchools(schoolQueryRef.current);
    loadSchoolSummary();
  }, [loadSchools, loadSchoolSummary]);

  const setSchoolQuery = useCallback((partial: Partial<SchoolQuery>) => {
    const next: SchoolQuery = {
      ...schoolQueryRef.current,
      ...partial,
      page: isPageOnlyChange(partial) ? (partial.page ?? 1) : 1,
    };
    schoolQueryRef.current = next;
    setSchoolQueryState(next);
    loadSchools(next);
  }, [loadSchools]);

  const reloadSchools = useCallback(() => {
    loadSchools(schoolQueryRef.current);
    loadSchoolSummary();
  }, [loadSchools, loadSchoolSummary]);

  const value = useMemo<MaintenanceDataContextValue>(
    () => ({
      universities,
      universityCount,
      universityQuery,
      universitiesLoading,
      universitiesLoaded,
      universitiesError,
      universitySummary,
      ensureUniversities,
      setUniversityQuery,
      reloadUniversities,
      adjustCourseCount,
      courses,
      coursesError,
      ensureCourses,
      isCoursesLoaded,
      setCourseRecord,
      removeCourseRecord,
      schools,
      schoolCount,
      schoolQuery,
      schoolsLoading,
      schoolsLoaded,
      schoolsError,
      schoolSummary,
      ensureSchools,
      setSchoolQuery,
      reloadSchools,
    }),
    [
      universities,
      universityCount,
      universityQuery,
      universitiesLoading,
      universitiesLoaded,
      universitiesError,
      universitySummary,
      ensureUniversities,
      setUniversityQuery,
      reloadUniversities,
      adjustCourseCount,
      courses,
      coursesError,
      ensureCourses,
      isCoursesLoaded,
      setCourseRecord,
      removeCourseRecord,
      schools,
      schoolCount,
      schoolQuery,
      schoolsLoading,
      schoolsLoaded,
      schoolsError,
      schoolSummary,
      ensureSchools,
      setSchoolQuery,
      reloadSchools,
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
