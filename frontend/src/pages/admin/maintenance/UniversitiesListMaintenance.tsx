import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  GraduationCap,
  Search,
  Plus,
  Edit3,
  Trash2,
  BookOpen,
  Building2,
  ChevronRight,
  ArrowLeft,
  Check,
  X,
  MapPin,
  Mail,
  Phone,
  Award,
  Download,
  Layers,
  Sparkles,
  ExternalLink,
  School as SchoolIcon,
  Table as TableIcon,
  LayoutGrid
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PHILIPPINE_REGIONS, regionLabel } from '../../../data/philippineRegions';
import {
  universityService,
  type CollegeCoursePayload,
  type CollegeCourseRecord,
  DEGREE_TYPE_SUGGESTIONS,
  type UniversityClassification,
  type UniversityPayload,
  type UniversityRecord,
} from '../../../services/backendUniversityService';
import type { ServiceFailure } from '../../../services/serviceResult';
import { ConfirmationDialog, EmptyState, ErrorState, LoadingState, ModalShell, Pagination, Select, StatusToggle } from '../../../components/ui';
import { MAINTENANCE_PAGE_SIZE, useMaintenanceData } from '../../../services/maintenanceDataContext';
import {
  ExportConfigModal,
  type ExportColumnOption,
  type ExportSelection,
} from '../../../components/maintenance/ExportConfigModal';
import { downloadBlob, downloadCsv, toCsv } from '../../../services/csvExportService';

function isUniversityClassification(value: string): value is UniversityClassification {
  return value === 'Public' || value === 'Private';
}

const EMPTY_COURSE_FORM: CollegeCoursePayload = {
  collegeName: '',
  programCode: '',
  programName: '',
  degreeType: '',
  majorSpecialization: '',
  durationYears: 4,
  totalUnits: 150,
  cutoffPercentile: 80.0,
  status: 'Active',
};

const EMPTY_UNI_FORM: UniversityPayload = {
  classification: 'Public',
  name: '',
  region: PHILIPPINE_REGIONS[0].code,
  city: '',
  presidentRector: '',
  email: '',
  phone: '',
  establishedYear: null,
  status: 'Active',
};

type UniversityExportColumn = ExportColumnOption & { get: (u: UniversityRecord) => unknown };
const UNIVERSITY_EXPORT_COLUMNS: UniversityExportColumn[] = [
  { key: 'code', label: 'Code', get: (u) => u.code },
  { key: 'name', label: 'University Name', get: (u) => u.name },
  { key: 'classification', label: 'Classification', get: (u) => u.classification },
  { key: 'region', label: 'Region', get: (u) => regionLabel(u.region) },
  { key: 'city', label: 'City', get: (u) => u.city },
  { key: 'presidentRector', label: 'President/Rector', sensitive: true, get: (u) => u.presidentRector },
  { key: 'email', label: 'Email', sensitive: true, get: (u) => u.email },
  { key: 'phone', label: 'Phone', sensitive: true, get: (u) => u.phone },
  { key: 'establishedYear', label: 'Established', get: (u) => u.establishedYear ?? '' },
  { key: 'courseCount', label: 'Course Count', get: (u) => u.courseCount },
  { key: 'status', label: 'Status', get: (u) => u.status },
];

type CourseExportColumn = ExportColumnOption & { get: (c: CollegeCourseRecord) => unknown };
const COURSE_EXPORT_COLUMNS: CourseExportColumn[] = [
  { key: 'programCode', label: 'Program Code', get: (c) => c.programCode },
  { key: 'programName', label: 'Program Name', get: (c) => c.programName },
  { key: 'collegeName', label: 'College', get: (c) => c.collegeName },
  { key: 'degreeType', label: 'Degree Type', get: (c) => c.degreeType },
  { key: 'majorSpecialization', label: 'Specialization', get: (c) => c.majorSpecialization },
  { key: 'durationYears', label: 'Duration (Yrs)', get: (c) => c.durationYears },
  { key: 'totalUnits', label: 'Total Units', get: (c) => c.totalUnits },
  { key: 'cutoffPercentile', label: 'Cutoff %', get: (c) => c.cutoffPercentile },
  { key: 'status', label: 'Status', get: (c) => c.status },
];

const EXPORT_SCOPE_OPTIONS = [
  { value: 'filtered', label: 'Only rows matching current filters' },
  { value: 'all', label: 'All rows' },
];

export default function UniversitiesListMaintenance() {
  const {
    universities,
    universityCount,
    universityQuery,
    universitiesLoaded,
    universitiesError,
    universitySummary,
    ensureUniversities,
    setUniversityQuery,
    reloadUniversities,
    adjustCourseCount,
    courses: coursesByUniversity,
    coursesError,
    ensureCourses,
    setCourseRecord,
    removeCourseRecord,
  } = useMaintenanceData();
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Selected University State (drill-down into College Courses)
  const [selectedUniversity, setSelectedUniversity] = useState<UniversityRecord | null>(null);

  // Courses come from the shared per-university cache. `undefined` means "not
  // fetched yet" (show loading); a fetched university stays cached for instant
  // re-open.
  const courseList = selectedUniversity ? coursesByUniversity[selectedUniversity.id] : undefined;
  const courses = courseList ?? [];
  const isLoadingCourses = Boolean(selectedUniversity) && courseList === undefined && !coursesError;

  // Search input (debounced) drives the server-side query held in the provider.
  const [searchInput, setSearchInput] = useState(universityQuery.search);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Search & Filter for Courses (inside selected university)
  const [courseSearch, setCourseSearch] = useState('');
  const [collegeFilter, setCollegeFilter] = useState('ALL');

  // Modals
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isUniModalOpen, setIsUniModalOpen] = useState(false);
  const [editingUniversity, setEditingUniversity] = useState<UniversityRecord | null>(null);
  const [uniFormData, setUniFormData] = useState<UniversityPayload>(EMPTY_UNI_FORM);

  const [pendingDelete, setPendingDelete] = useState<UniversityRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CollegeCourseRecord | null>(null);
  const [courseFormData, setCourseFormData] = useState<CollegeCoursePayload>(EMPTY_COURSE_FORM);
  const [isSavingCourse, setIsSavingCourse] = useState(false);
  const [pendingCourseDelete, setPendingCourseDelete] = useState<CollegeCourseRecord | null>(null);
  const [isDeletingCourse, setIsDeletingCourse] = useState(false);
  const [viewingCourse, setViewingCourse] = useState<CollegeCourseRecord | null>(null);

  // Load the university list once into the shared cache; instant on tab re-entry.
  useEffect(() => {
    ensureUniversities();
  }, [ensureUniversities]);

  // Load the selected university's courses from the nested endpoint on drill-down.
  // Load the selected university's courses once into the shared cache; a
  // previously-opened university is served from cache with no refetch.
  useEffect(() => {
    if (selectedUniversity) ensureCourses(selectedUniversity.id);
  }, [selectedUniversity, ensureCourses]);

  // Course-count deltas are applied against the shared cache (adjustCourseCount)
  // so the list-view column and totals stay accurate without a full refetch.

  // Helper to count courses for each university (server-provided on the list payload).
  const getCourseCountForUniversity = (uniId: string) => {
    return universities.find((u) => u.id === uniId)?.courseCount ?? 0;
  };

  const hasActiveFilters = Boolean(
    universityQuery.search || universityQuery.classification || universityQuery.region || universityQuery.status,
  );

  const handleSearchInput = (value: string) => {
    setSearchInput(value);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => setUniversityQuery({ search: value.trim() }), 300);
  };

  // Courses filtered for selected university
  const universityCourses = useMemo(() => {
    if (!selectedUniversity) return [];
    return courses.filter(c => c.universityId === selectedUniversity.id);
  }, [courses, selectedUniversity]);

  const uniqueCollegesInUniversity = useMemo(() => {
    return Array.from(new Set(universityCourses.map(c => c.collegeName))).sort();
  }, [universityCourses]);

  const filteredCourses = useMemo(() => {
    return universityCourses.filter(c => {
      if (collegeFilter !== 'ALL' && c.collegeName !== collegeFilter) return false;
      if (courseSearch.trim()) {
        const q = courseSearch.toLowerCase();
        const matchName = c.programName.toLowerCase().includes(q);
        const matchCode = c.programCode.toLowerCase().includes(q);
        const matchCollege = c.collegeName.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchCollege) return false;
      }
      return true;
    });
  }, [universityCourses, collegeFilter, courseSearch]);

  // Handle University Add / Edit / Delete
  const handleOpenAddUniModal = () => {
    setEditingUniversity(null);
    setError(null);
    setUniFormData({ ...EMPTY_UNI_FORM });
    setIsUniModalOpen(true);
  };

  const handleOpenEditUniModal = (uni: UniversityRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingUniversity(uni);
    setError(null);
    setUniFormData({
      classification: uni.classification,
      name: uni.name,
      region: uni.region,
      city: uni.city,
      presidentRector: uni.presidentRector,
      email: uni.email,
      phone: uni.phone,
      establishedYear: uni.establishedYear,
      status: uni.status,
    });
    setIsUniModalOpen(true);
  };

  const handleSaveUni = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uniFormData.name.trim() || !uniFormData.city.trim() || isSaving) return;

    setIsSaving(true);
    setError(null);
    const result = editingUniversity
      ? await universityService.updateUniversity(editingUniversity.id, uniFormData)
      : await universityService.createUniversity(uniFormData);
    setIsSaving(false);

    if (!result.ok) {
      setError((result as ServiceFailure).error.message);
      return;
    }

    reloadUniversities();
    if (editingUniversity && selectedUniversity?.id === result.data.id) {
      setSelectedUniversity(result.data);
    }

    setIsUniModalOpen(false);
  };

  const requestDeleteUni = (uni: UniversityRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    setError(null);
    setPendingDelete(uni);
  };

  const handleConfirmDeleteUni = async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    const result = await universityService.deleteUniversity(pendingDelete.id);
    setIsDeleting(false);

    if (!result.ok) {
      setError((result as ServiceFailure).error.message);
      setPendingDelete(null);
      return;
    }

    const removedId = pendingDelete.id;
    reloadUniversities();
    if (selectedUniversity?.id === removedId) {
      setSelectedUniversity(null);
    }
    setPendingDelete(null);
  };

  // Handle Course Add / Edit / Delete
  const handleOpenAddCourseModal = () => {
    if (!selectedUniversity) return;
    setEditingCourse(null);
    setError(null);
    setCourseFormData({
      ...EMPTY_COURSE_FORM,
      collegeName: uniqueCollegesInUniversity[0] || '',
    });
    setIsCourseModalOpen(true);
  };

  const handleOpenEditCourseModal = (course: CollegeCourseRecord) => {
    setEditingCourse(course);
    setError(null);
    setCourseFormData({
      collegeName: course.collegeName,
      programCode: course.programCode,
      programName: course.programName,
      degreeType: course.degreeType,
      majorSpecialization: course.majorSpecialization,
      durationYears: course.durationYears,
      totalUnits: course.totalUnits,
      cutoffPercentile: course.cutoffPercentile,
      status: course.status,
    });
    setIsCourseModalOpen(true);
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !selectedUniversity ||
      !courseFormData.programName.trim() ||
      !courseFormData.programCode.trim() ||
      isSavingCourse
    ) {
      return;
    }

    setIsSavingCourse(true);
    setError(null);
    const result = editingCourse
      ? await universityService.updateCourse(selectedUniversity.id, editingCourse.id, courseFormData)
      : await universityService.createCourse(selectedUniversity.id, courseFormData);
    setIsSavingCourse(false);

    if (!result.ok) {
      setError((result as ServiceFailure).error.message);
      return;
    }

    setCourseRecord(selectedUniversity.id, result.data);
    if (!editingCourse) {
      adjustCourseCount(selectedUniversity.id, 1);
    }
    setIsCourseModalOpen(false);
    setViewingCourse(null); // a completed save closes the details modal too
  };

  const handleConfirmDeleteCourse = async () => {
    if (!pendingCourseDelete || !selectedUniversity) return;
    setIsDeletingCourse(true);
    const result = await universityService.deleteCourse(selectedUniversity.id, pendingCourseDelete.id);
    setIsDeletingCourse(false);

    if (!result.ok) {
      setError((result as ServiceFailure).error.message);
      setPendingCourseDelete(null);
      return;
    }
    const removedId = pendingCourseDelete.id;
    removeCourseRecord(selectedUniversity.id, removedId);
    adjustCourseCount(selectedUniversity.id, -1);
    setPendingCourseDelete(null);
    setViewingCourse(null); // the record is gone, so close the details modal too
  };

  const handleExport = async ({ columns, scope }: ExportSelection) => {
    if (selectedUniversity) {
      // Courses are held client-side; export straight from the cache.
      setIsExportModalOpen(false);
      const cols = COURSE_EXPORT_COLUMNS.filter((c) => columns.includes(c.key));
      const source = scope === 'all' ? universityCourses : filteredCourses;
      const csv = toCsv(cols.map((c) => c.label), source.map((row) => cols.map((c) => c.get(row))));
      downloadCsv(`${selectedUniversity.code}_College_Courses.csv`, csv);
      return;
    }
    // Universities are paginated: the backend streams the whole filtered set in one request.
    setIsExporting(true);
    const result = await universityService.exportUniversities({
      columns,
      ...(scope === 'all'
        ? {}
        : {
            search: universityQuery.search,
            classification: universityQuery.classification,
            region: universityQuery.region,
            status: universityQuery.status,
          }),
    });
    setIsExporting(false);
    setIsExportModalOpen(false);
    if (result.ok) {
      downloadBlob('philSA_List_of_Universities.csv', result.data);
    } else {
      setError((result as ServiceFailure).error.message);
    }
  };

  // First load shows a distinct loading/error state; when cached it is already loaded.
  if (!universitiesLoaded && universitiesError) {
    return (
      <div className="flex justify-center py-16">
        <ErrorState
          title="University registry unavailable"
          message={universitiesError}
          action={
            <button
              onClick={reloadUniversities}
              className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-philsa-navy hover:bg-philsa-navy/90 text-white transition-all cursor-pointer"
            >
              Try again
            </button>
          }
        />
      </div>
    );
  }
  if (!universitiesLoaded) {
    return (
      <div className="flex justify-center py-16">
        <LoadingState title="Loading university registry" message="Fetching the accredited university list." />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* Breadcrumb Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-philsa-gray">
          <Link to="/admin/maintenance" className="hover:text-philsa-navy font-bold">Maintenance Center</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <button
            onClick={() => setSelectedUniversity(null)}
            className={`hover:text-philsa-navy font-bold cursor-pointer ${!selectedUniversity ? 'text-philsa-navy font-black' : ''}`}
          >
            List of Universities
          </button>
          {selectedUniversity && (
            <>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-philsa-navy font-black">{selectedUniversity.code} - College Courses</span>
            </>
          )}
        </div>

        {selectedUniversity && (
          <button
            onClick={() => setSelectedUniversity(null)}
            className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-philsa-navy text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back to All Universities
          </button>
        )}
      </div>

      {error && !isUniModalOpen && !isCourseModalOpen && (
        <div className="card-philsa bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold p-4">
          {error}
        </div>
      )}

      {/* VIEW 1: UNIVERSITIES LIST (When no university is selected) */}
      {!selectedUniversity ? (
        <>
          {/* Header Banner */}
          <div className="card-philsa bg-white p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-philsa-navy text-white text-[10px] font-black uppercase tracking-wider">
                    Higher Education Registry
                  </span>
                  <span className="text-xs font-mono text-slate-400">PhilSA Ref #M-UNI</span>
                </div>
                <h1 className="text-2xl font-black text-philsa-navy flex items-center gap-2">
                  <GraduationCap className="w-7 h-7 text-philsa-navy" />
                  List of Accredited Universities
                </h1>
                <p className="text-xs text-philsa-gray max-w-3xl">
                  Registry of accredited Higher Education Institutions (HEIs) and State Universities. Click on any university below to view, manage, and inspect its offered College Courses & Degree Programs.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => setIsExportModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-philsa-navy bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0"
                >
                  <Download className="w-4 h-4 shrink-0" /> Export CSV
                </button>
                <button
                  onClick={handleOpenAddUniModal}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-philsa-navy hover:bg-philsa-navy/90 text-white transition-all cursor-pointer shadow-lg shadow-philsa-navy/10 flex items-center gap-2 whitespace-nowrap shrink-0"
                >
                  <Plus className="w-4 h-4 shrink-0" /> Add University
                </button>
              </div>
            </div>

            {/* Quick Summary Cards (registry-wide totals) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Accredited Universities</div>
                <div className="text-2xl font-black text-philsa-navy mt-1">{universitySummary.total.toLocaleString()}</div>
              </div>
              <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl">
                <div className="text-[10px] font-extrabold uppercase text-blue-600 tracking-wider">Public / State</div>
                <div className="text-2xl font-black text-blue-900 mt-1">{universitySummary.public.toLocaleString()}</div>
              </div>
              <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-2xl">
                <div className="text-[10px] font-extrabold uppercase text-purple-600 tracking-wider">Private</div>
                <div className="text-2xl font-black text-purple-900 mt-1">{universitySummary.private.toLocaleString()}</div>
              </div>
              <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl">
                <div className="text-[10px] font-extrabold uppercase text-emerald-600 tracking-wider">Total Degree Courses</div>
                <div className="text-2xl font-black text-emerald-900 mt-1">{universitySummary.totalCourses.toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* Filter and Search Bar */}
          <div className="card-philsa bg-white p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
                {/* Search */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-philsa-gray">Search University / City</label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={searchInput}
                      onChange={e => handleSearchInput(e.target.value)}
                      placeholder="Name, code, city..."
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-philsa-navy/20"
                    />
                  </div>
                </div>

                {/* Classification */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-philsa-gray">Classification</label>
                  <Select
                    value={universityQuery.classification}
                    onChange={e => setUniversityQuery({ classification: e.target.value as UniversityClassification | '' })}
                  >
                    <option value="">All Classifications</option>
                    <option value="Public">Public</option>
                    <option value="Private">Private</option>
                  </Select>
                </div>

                {/* Region */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-philsa-gray">Region</label>
                  <Select
                    value={universityQuery.region}
                    onChange={e => setUniversityQuery({ region: e.target.value })}
                  >
                    <option value="">All Regions</option>
                    {PHILIPPINE_REGIONS.map((region) => (
                      <option key={region.code} value={region.code}>{region.label}</option>
                    ))}
                  </Select>
                </div>

                {/* Status */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-philsa-gray">Status</label>
                  <Select
                    value={universityQuery.status}
                    onChange={e => setUniversityQuery({ status: e.target.value as UniversityRecord['status'] | '' })}
                  >
                    <option value="">All Statuses</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </Select>
                </div>
              </div>

              {/* View Layout Toggle */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0 self-end md:self-auto">
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    viewMode === 'table' ? 'bg-white text-philsa-navy shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Table View"
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span>Table View</span>
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    viewMode === 'grid' ? 'bg-white text-philsa-navy shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Grid Cards</span>
                </button>
              </div>
            </div>
          </div>

          {/* LIST DISPLAY: empty-registry CTA, no-match, otherwise table/grid + pagination */}
          {universityCount === 0 && !hasActiveFilters ? (
            <div className="flex justify-center py-16">
            <EmptyState
              title="No universities yet"
              message="Add your first accredited university to start building the registry."
              action={
                <button
                  onClick={handleOpenAddUniModal}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-philsa-navy hover:bg-philsa-navy/90 text-white transition-all cursor-pointer shadow-lg shadow-philsa-navy/10 flex items-center gap-2 whitespace-nowrap"
                >
                  <Plus className="w-4 h-4 shrink-0" /> Add your first university
                </button>
              }
            />
            </div>
          ) : universityCount === 0 ? (
            <div className="card-philsa bg-white p-12 text-center text-slate-400 font-medium border border-slate-200">
              No universities match your search and filter criteria.
            </div>
          ) : viewMode === 'table' ? (
            <div className="space-y-6">
            <div className="card-philsa bg-white overflow-hidden p-0 border border-slate-200">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-philsa-border text-[11px] font-black uppercase text-philsa-navy tracking-wider">
                      <th className="py-3.5 px-4">Unique Code</th>
                      <th className="py-3.5 px-4">University Name</th>
                      <th className="py-3.5 px-4">Classification</th>
                      <th className="py-3.5 px-4">Region & Location</th>
                      <th className="py-3.5 px-4">President / Rector</th>
                      <th className="py-3.5 px-4 text-center">College Courses</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {universities.map((uni) => {
                        const count = getCourseCountForUniversity(uni.id);
                        return (
                          <tr
                            key={uni.id}
                            className="hover:bg-slate-50/80 transition-all group"
                          >
                            <td className="py-3.5 px-4">
                              <span className="inline-block whitespace-nowrap font-mono text-xs font-bold bg-slate-100 text-slate-800 px-2 py-1 rounded-md border border-slate-200">
                                {uni.code}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 space-y-0.5">
                              <div
                                onClick={() => setSelectedUniversity(uni)}
                                className="font-black text-philsa-navy hover:text-blue-700 transition-colors cursor-pointer text-sm"
                                title="Click to view offered college courses"
                              >
                                {uni.name}
                              </div>
                              <div className="text-[10px] text-slate-400 font-medium">Est. {uni.establishedYear ?? '—'}</div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border ${
                                uni.classification === 'Public'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-purple-50 text-purple-700 border-purple-200'
                              }`}>
                                {uni.classification}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 space-y-0.5">
                              <div className="font-bold text-slate-800">{uni.city}</div>
                              <div className="text-[10px] text-slate-400">{regionLabel(uni.region)}</div>
                            </td>
                            <td className="py-3.5 px-4 space-y-0.5">
                              <div className="font-bold text-philsa-navy">{uni.presidentRector}</div>
                              <div className="text-[10px] text-slate-500 font-mono">{uni.email}</div>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
                                <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                                <span>{count} {count === 1 ? 'Course' : 'Courses'}</span>
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border ${
                                uni.status === 'Active'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-slate-100 text-slate-500 border-slate-200'
                              }`}>
                                {uni.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                                <button
                                  onClick={(e) => handleOpenEditUniModal(uni, e)}
                                  className="p-1.5 rounded-lg text-slate-600 hover:text-philsa-navy hover:bg-slate-100 transition-all cursor-pointer"
                                  title="Edit University"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => requestDeleteUni(uni, e)}
                                  className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-all cursor-pointer"
                                  title="Delete University"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
            <Pagination
              page={universityQuery.page}
              pageSize={MAINTENANCE_PAGE_SIZE}
              totalCount={universityCount}
              onPageChange={(page) => setUniversityQuery({ page })}
            />
            </div>
          ) : (
            <div className="space-y-6">
            {/* GRID VIEW DISPLAY */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {universities.map((uni) => {
                const count = getCourseCountForUniversity(uni.id);
                return (
                  <div
                    key={uni.id}
                    onClick={() => setSelectedUniversity(uni)}
                    className="card-philsa bg-white p-6 hover:shadow-xl hover:border-philsa-navy/40 transition-all cursor-pointer group space-y-4 relative overflow-hidden border border-slate-200"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-philsa-bg border border-philsa-border flex items-center justify-center text-philsa-navy group-hover:bg-philsa-navy group-hover:text-white transition-all shadow-sm">
                          <GraduationCap className="w-6 h-6" />
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-black bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200 whitespace-nowrap">
                              {uni.code}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">Est. {uni.establishedYear ?? '—'}</span>
                          </div>
                          <h3 className="text-base font-black text-philsa-navy group-hover:text-blue-700 transition-colors">
                            {uni.name}
                          </h3>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => handleOpenEditUniModal(uni, e)}
                          className="p-1.5 text-slate-400 hover:text-philsa-navy hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                          title="Edit University"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => requestDeleteUni(uni, e)}
                          className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                          title="Delete University"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2 text-slate-600 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{uni.city}, {regionLabel(uni.region)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600 font-medium">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{uni.classification}</span>
                      </div>
                    </div>

                    {/* Footer Bar with Course Count Action */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-philsa-navy" />
                        <span className="text-xs font-black text-philsa-navy">
                          {count} College {count === 1 ? 'Course' : 'Courses'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-xs font-bold text-blue-600 group-hover:translate-x-1 transition-transform">
                        <span>View Courses</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <Pagination
              page={universityQuery.page}
              pageSize={MAINTENANCE_PAGE_SIZE}
              totalCount={universityCount}
              onPageChange={(page) => setUniversityQuery({ page })}
            />
            </div>
          )}
        </>
      ) : (
        /* VIEW 2: COLLEGE COURSES FOR SELECTED UNIVERSITY */
        <div className="space-y-6">

          {/* Selected University Details Header */}
          <div className="card-philsa bg-white p-6 border border-slate-200 rounded-2xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded-md border border-slate-200">
                    {selectedUniversity.code}
                  </span>
                  <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                    selectedUniversity.classification === 'Public'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-purple-50 text-purple-700 border-purple-200'
                  }`}>
                    {selectedUniversity.classification}
                  </span>
                  <span className="text-xs text-slate-400">Est. {selectedUniversity.establishedYear ?? '—'}</span>
                </div>
                <h1 className="text-2xl font-black text-philsa-navy tracking-tight flex items-center gap-2.5">
                  <GraduationCap className="w-7 h-7 text-philsa-navy" />
                  {selectedUniversity.name}
                </h1>
                <div className="text-xs text-slate-600 flex items-center gap-3 flex-wrap font-medium">
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" /> {selectedUniversity.city}, {regionLabel(selectedUniversity.region)}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-slate-400" /> {selectedUniversity.email}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-slate-400" /> {selectedUniversity.phone}</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setIsExportModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4 text-slate-500" /> Export Courses
                </button>
                <button
                  onClick={handleOpenAddCourseModal}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-philsa-navy hover:bg-slate-800 text-white transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Add College Course
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-philsa-navy" />
                <span className="font-bold text-philsa-navy">{universityCourses.length} Registered College Courses</span>
              </div>
              <div className="text-xs font-medium text-slate-500">
                President / Rector: <span className="font-bold text-slate-700">{selectedUniversity.presidentRector}</span>
              </div>
            </div>
          </div>

          {/* Search Bar for Courses */}
          <div className="card-philsa bg-white p-5">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-philsa-gray">Search Course or Code</label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={courseSearch}
                  onChange={e => setCourseSearch(e.target.value)}
                  placeholder="Search program code or program title..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-philsa-navy/20"
                />
              </div>
            </div>
          </div>

          {/* College Courses: loading, error, then empty-registry CTA, otherwise the table */}
          {isLoadingCourses ? (
            <div className="flex justify-center py-16">
              <LoadingState title="Loading college courses" message="Fetching this university's degree programs." />
            </div>
          ) : coursesError && courseList === undefined ? (
            <div className="flex justify-center py-16">
              <ErrorState
                title="Couldn't load college courses"
                message={coursesError}
                action={
                  <button
                    onClick={() => ensureCourses(selectedUniversity.id)}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-philsa-navy hover:bg-philsa-navy/90 text-white transition-all cursor-pointer"
                  >
                    Try again
                  </button>
                }
              />
            </div>
          ) : universityCourses.length === 0 ? (
            <div className="flex justify-center py-16">
            <EmptyState
              title="No college courses yet"
              message="Add the first degree program offered by this university."
              action={
                <button
                  onClick={handleOpenAddCourseModal}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-philsa-navy hover:bg-slate-800 text-white transition-all cursor-pointer shadow-xs flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Plus className="w-4 h-4 shrink-0" /> Add the first course
                </button>
              }
            />
            </div>
          ) : (
          <div className="card-philsa bg-white overflow-hidden p-0 border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-philsa-border text-[11px] font-black uppercase text-philsa-navy tracking-wider">
                    <th className="py-3.5 px-4 w-44">Program Code</th>
                    <th className="py-3.5 px-4">Program Title</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredCourses.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-12 text-center text-slate-400 font-medium bg-slate-50/50">
                        No college courses match your search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredCourses.map((crs) => (
                      <tr key={crs.id} className="hover:bg-slate-50/80 transition-all">
                        <td className="py-3.5 px-4">
                          <span className="text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-md inline-block whitespace-nowrap">
                            {crs.programCode}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => setViewingCourse(crs)}
                            className="font-extrabold text-philsa-navy text-sm text-left hover:text-blue-700 transition-colors cursor-pointer"
                            title="View program details"
                          >
                            {crs.programName}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditCourseModal(crs)}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-philsa-navy hover:bg-slate-100 transition-all cursor-pointer"
                              title="Edit Course Details"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => { setError(null); setPendingCourseDelete(crs); }}
                              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-all cursor-pointer"
                              title="Delete Course"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          )}
        </div>
      )}

      {/* University Add / Edit Modal */}
      <ModalShell
        isOpen={isUniModalOpen}
        onClose={() => { setIsUniModalOpen(false); setError(null); }}
        className="max-w-xl p-6 space-y-6"
      >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-black text-philsa-navy flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-philsa-navy" />
                {editingUniversity ? 'Edit University Details' : 'Add New University'}
              </h3>
              <button
                onClick={() => { setIsUniModalOpen(false); setError(null); }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold p-3 rounded-xl">
                {error}
              </div>
            )}

            <form onSubmit={handleSaveUni} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">University Code</label>
                  <input
                    type="text"
                    disabled
                    readOnly
                    value={editingUniversity ? editingUniversity.code : 'Auto-generated (UNI-#####)'}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl font-mono text-xs text-slate-500 cursor-not-allowed"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Classification *</label>
                  <Select
                    value={uniFormData.classification}
                    onChange={e => {
                      if (isUniversityClassification(e.target.value)) {
                        setUniFormData({ ...uniFormData, classification: e.target.value });
                      }
                    }}
                  >
                    <option value="Public">Public</option>
                    <option value="Private">Private</option>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">University Full Name *</label>
                <input
                  type="text"
                  required
                  value={uniFormData.name}
                  onChange={e => setUniFormData({ ...uniFormData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-philsa-navy/20"
                  placeholder="Official name of university..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Region *</label>
                  <Select
                    value={uniFormData.region}
                    onChange={e => setUniFormData({ ...uniFormData, region: e.target.value })}
                  >
                    {PHILIPPINE_REGIONS.map((region) => (
                      <option key={region.code} value={region.code}>{region.label}</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Main Campus City *</label>
                  <input
                    type="text"
                    required
                    value={uniFormData.city}
                    onChange={e => setUniFormData({ ...uniFormData, city: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-philsa-navy/20"
                    placeholder="e.g. Quezon City"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">President / Rector</label>
                <input
                  type="text"
                  value={uniFormData.presidentRector}
                  onChange={e => setUniFormData({ ...uniFormData, presidentRector: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-philsa-navy/20"
                  placeholder="e.g. Dr. Angelo A. Jimenez"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Official Email</label>
                  <input
                    type="email"
                    value={uniFormData.email}
                    onChange={e => setUniFormData({ ...uniFormData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-philsa-navy/20"
                    placeholder="info@university.edu.ph"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Contact Number</label>
                  <input
                    type="text"
                    value={uniFormData.phone}
                    onChange={e => setUniFormData({ ...uniFormData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-philsa-navy/20"
                    placeholder="(02) 8981-8500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Year Established</label>
                  <input
                    type="number"
                    min={1500}
                    max={new Date().getFullYear()}
                    value={uniFormData.establishedYear ?? ''}
                    onChange={e => setUniFormData({ ...uniFormData, establishedYear: e.target.value ? Number(e.target.value) : null })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-philsa-navy/20"
                    placeholder="e.g. 1908"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Status</label>
                  <StatusToggle
                    value={uniFormData.status}
                    onChange={status => setUniFormData({ ...uniFormData, status })}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setIsUniModalOpen(false); setError(null); }}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-philsa-navy hover:bg-philsa-navy/90 text-white font-bold transition-all cursor-pointer shadow-lg shadow-philsa-navy/10 flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Check className="w-4 h-4" /> {isSaving ? 'Saving...' : 'Save University'}
                </button>
              </div>
            </form>
      </ModalShell>

      {/* College Course Details Modal — full-screen backdrop; the edit/delete modals stack above it (z-[110]) so cancelling returns here */}
      <ModalShell
        isOpen={viewingCourse !== null}
        onClose={() => setViewingCourse(null)}
        backdrop={!isCourseModalOpen && pendingCourseDelete === null}
        className="max-w-lg p-6 space-y-5"
      >
        {viewingCourse && (
          <>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-black text-philsa-navy flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-philsa-navy" />
                Program Details
              </h3>
              <button
                onClick={() => setViewingCourse(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-all cursor-pointer"
                aria-label="Close details"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold bg-blue-50 border border-blue-200 text-blue-700 px-2 py-0.5 rounded-md inline-block whitespace-nowrap">
                  {viewingCourse.programCode}
                </span>
                <h4 className="text-xl font-black text-philsa-navy">{viewingCourse.programName}</h4>
                <p className="text-xs font-semibold text-philsa-gray">{viewingCourse.collegeName}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-philsa-gray">Degree Type</div>
                  <div className="font-bold text-slate-700">{viewingCourse.degreeType || '—'}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-philsa-gray">Major / Specialization</div>
                  <div className="font-bold text-slate-700">{viewingCourse.majorSpecialization || '—'}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-philsa-gray">Duration</div>
                  <div className="font-bold text-slate-700">{viewingCourse.durationYears} {viewingCourse.durationYears === 1 ? 'Year' : 'Years'}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-philsa-gray">Total Units</div>
                  <div className="font-bold text-slate-700 font-mono">{viewingCourse.totalUnits}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-philsa-gray">Cutoff Percentile</div>
                  <div className="font-bold text-slate-700 font-mono">{viewingCourse.cutoffPercentile}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-philsa-gray">Status</div>
                  <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border ${viewingCourse.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    {viewingCourse.status}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-philsa-gray">Created</div>
                  <div className="font-medium text-slate-600">{new Date(viewingCourse.createdAt).toLocaleString()}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-philsa-gray">Last Updated</div>
                  <div className="font-medium text-slate-600">{new Date(viewingCourse.updatedAt).toLocaleString()}</div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                onClick={() => { setError(null); setPendingCourseDelete(viewingCourse); }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
              <button
                onClick={() => handleOpenEditCourseModal(viewingCourse)}
                className="px-5 py-2 rounded-xl bg-philsa-navy hover:bg-philsa-navy/90 text-white text-xs font-bold transition-all cursor-pointer shadow-lg shadow-philsa-navy/10 flex items-center gap-1.5"
              >
                <Edit3 className="w-4 h-4" /> Edit
              </button>
            </div>
          </>
        )}
      </ModalShell>

      {/* College Course Add / Edit Modal */}
      <ModalShell
        isOpen={isCourseModalOpen}
        onClose={() => { setIsCourseModalOpen(false); setError(null); }}
        zClass="z-[110]"
        className="max-w-xl p-6 space-y-6"
      >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-black text-philsa-navy flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-philsa-navy" />
                {editingCourse ? 'Edit College Course' : `Add Course to ${selectedUniversity?.code}`}
              </h3>
              <button
                onClick={() => { setIsCourseModalOpen(false); setError(null); }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold p-3 rounded-xl">
                {error}
              </div>
            )}

            <form onSubmit={handleSaveCourse} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Program Code *</label>
                  <input
                    type="text"
                    required
                    value={courseFormData.programCode || ''}
                    onChange={e => setCourseFormData({ ...courseFormData, programCode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-philsa-navy/20"
                    placeholder="e.g. BSCS"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Degree Type</label>
                  <input
                    type="text"
                    list="degree-type-suggestions"
                    value={courseFormData.degreeType}
                    onChange={e => setCourseFormData({ ...courseFormData, degreeType: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-philsa-navy/20"
                    placeholder="Choose or type a degree type..."
                  />
                  <datalist id="degree-type-suggestions">
                    {DEGREE_TYPE_SUGGESTIONS.map((degree) => (
                      <option key={degree} value={degree} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Course / Program Name *</label>
                <input
                  type="text"
                  required
                  value={courseFormData.programName || ''}
                  onChange={e => setCourseFormData({ ...courseFormData, programName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-philsa-navy/20"
                  placeholder="e.g. Bachelor of Science in Computer Science"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">College / Faculty / Department *</label>
                <input
                  type="text"
                  required
                  value={courseFormData.collegeName || ''}
                  onChange={e => setCourseFormData({ ...courseFormData, collegeName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-philsa-navy/20"
                  placeholder="e.g. College of Engineering"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Major / Specialization</label>
                  <input
                    type="text"
                    value={courseFormData.majorSpecialization || ''}
                    onChange={e => setCourseFormData({ ...courseFormData, majorSpecialization: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-philsa-navy/20"
                    placeholder="e.g. Software Engineering"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">philSA Cutoff Percentile (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    min={50}
                    max={99}
                    value={courseFormData.cutoffPercentile || 80.0}
                    onChange={e => setCourseFormData({ ...courseFormData, cutoffPercentile: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-philsa-navy/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Duration (Years)</label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={courseFormData.durationYears || 4}
                    onChange={e => setCourseFormData({ ...courseFormData, durationYears: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-philsa-navy/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Total Units</label>
                  <input
                    type="number"
                    value={courseFormData.totalUnits || 150}
                    onChange={e => setCourseFormData({ ...courseFormData, totalUnits: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-philsa-navy/20"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setIsCourseModalOpen(false); setError(null); }}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCourse}
                  className="px-5 py-2 rounded-xl bg-philsa-navy hover:bg-philsa-navy/90 text-white font-bold transition-all cursor-pointer shadow-lg shadow-philsa-navy/10 flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Check className="w-4 h-4" /> {isSavingCourse ? 'Saving...' : 'Save College Course'}
                </button>
              </div>
            </form>
      </ModalShell>

      <ExportConfigModal
        isOpen={isExportModalOpen}
        title={selectedUniversity ? 'Export college courses' : 'Export universities'}
        columns={selectedUniversity ? COURSE_EXPORT_COLUMNS : UNIVERSITY_EXPORT_COLUMNS}
        scopeOptions={EXPORT_SCOPE_OPTIONS}
        scopeCounts={
          selectedUniversity
            ? { filtered: filteredCourses.length, all: universityCourses.length }
            : { filtered: universityCount, all: universitySummary.total }
        }
        isExporting={isExporting}
        onCancel={() => setIsExportModalOpen(false)}
        onExport={handleExport}
      />

      <ConfirmationDialog
        isOpen={pendingDelete !== null}
        title={pendingDelete ? `Are you sure you want to remove ${pendingDelete.name} at Maintenance Table?` : ''}
        message="This will be removed to other modules. All associated college courses will also be removed."
        details={pendingDelete ? `${pendingDelete.name} • ${pendingDelete.code}` : ''}
        confirmLabel="Agree"
        tone="danger"
        isConfirming={isDeleting}
        onConfirm={handleConfirmDeleteUni}
        onCancel={() => setPendingDelete(null)}
      />

      <ConfirmationDialog
        isOpen={pendingCourseDelete !== null}
        title={pendingCourseDelete ? `Remove ${pendingCourseDelete.programCode} from ${selectedUniversity?.code ?? ''}?` : ''}
        message="This college course will be removed from this university."
        details={pendingCourseDelete ? `${pendingCourseDelete.programName} • ${pendingCourseDelete.programCode}` : ''}
        confirmLabel="Agree"
        tone="danger"
        isConfirming={isDeletingCourse}
        onConfirm={handleConfirmDeleteCourse}
        onCancel={() => setPendingCourseDelete(null)}
      />

    </div>
  );
}
