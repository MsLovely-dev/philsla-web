import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ChevronDown,
  ClipboardList,
  Copy,
  Eye,
  Filter,
  Plus,
  Search,
  Shield,
  Sparkles,
  Layers,
  Save,
  Trash2,
  Edit3,
  X,
} from 'lucide-react';
import { usePhilSA } from '../PhilSAContext';
import { cn } from '../lib/utils';
import { ExamHubTabs, type ExamHubTabKey } from '../components/ExamHubTabs';
import { examBlueprintService } from '../services/backendExamBlueprintService';
import {
  INITIAL_BLUEPRINTS,
  type Blueprint,
  type BlueprintSection,
} from './admin/hub/blueprintMockData';

type PersonaKey = 'EXAM_ADMIN' | 'SYSTEM_ADMIN' | 'REVIEWER';
type BlueprintStatusFilter = 'ALL' | Blueprint['status'];
type BlueprintExamTypeFilter = 'ALL' | Blueprint['examType'];
type BlueprintSortOption = 'NEWEST_CREATED' | 'OLDEST_CREATED' | 'NAME_ASC' | 'NAME_DESC';
type BlueprintEditorMode = 'create' | 'edit';
type ContributorAgency = 'UP' | 'CHED' | 'TESDA' | 'DepEd';
type SectionCollapseState = Record<string, boolean>;

const CONTRIBUTOR_AGENCIES: ContributorAgency[] = ['UP', 'CHED', 'TESDA', 'DepEd'];
const SCIENCE_TOPIC_OPTIONS = [
  'Earth and Life Science',
  'Physical Science',
  'General Biology 1 & 2',
  'General Chemistry 1 & 2',
  'General Physics 1 & 2',
];

const PERSONA_OPTIONS: Array<{ key: PersonaKey; label: string }> = [
  { key: 'EXAM_ADMIN', label: 'Exam Admin' },
  { key: 'SYSTEM_ADMIN', label: 'System Admin' },
  { key: 'REVIEWER', label: 'Reviewer' },
];

const STATUS_OPTIONS: Array<BlueprintStatusFilter> = [
  'ALL',
  'DRAFT',
  'SUBMITTED',
  'ACADEMIC_REVIEW',
  'REVISION_REQUIRED',
  'APPROVED',
  'PUBLISHED',
  'RETIRED',
  'ARCHIVED',
];

const EXAM_TYPE_OPTIONS: Array<BlueprintExamTypeFilter> = ['ALL', 'Admission', 'Scholarship', 'Technical', 'Specialization'];

const SORT_OPTIONS: Array<{ value: BlueprintSortOption; label: string }> = [
  { value: 'NEWEST_CREATED', label: 'Newest Created' },
  { value: 'OLDEST_CREATED', label: 'Oldest Created' },
  { value: 'NAME_ASC', label: 'Name A-Z' },
  { value: 'NAME_DESC', label: 'Name Z-A' },
];

function statusLabel(status: Blueprint['status']) {
  switch (status) {
    case 'DRAFT':
      return 'Draft';
    case 'SUBMITTED':
      return 'Pending';
    case 'ACADEMIC_REVIEW':
      return 'Academic Review';
    case 'REVISION_REQUIRED':
      return 'Requires Calibration';
    case 'APPROVED':
      return 'Approved';
    case 'PUBLISHED':
      return 'Published';
    case 'RETIRED':
      return 'Retired';
    case 'ARCHIVED':
      return 'Archived';
    default:
      return status;
  }
}

function statusTone(status: Blueprint['status']) {
  switch (status) {
    case 'DRAFT':
      return 'bg-slate-100 text-slate-700 border-slate-200';
    case 'SUBMITTED':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'ACADEMIC_REVIEW':
      return 'bg-sky-50 text-sky-700 border-sky-200';
    case 'REVISION_REQUIRED':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'APPROVED':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'PUBLISHED':
      return 'bg-green-50 text-green-700 border-green-200';
    case 'RETIRED':
      return 'bg-zinc-100 text-zinc-700 border-zinc-200';
    case 'ARCHIVED':
      return 'bg-stone-100 text-stone-700 border-stone-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

function personaFromRole(role?: string | null): PersonaKey {
  if (role === 'SYSTEM_ADMIN') return 'SYSTEM_ADMIN';
  if (role === 'ACADEMIC_REVIEWER' || role === 'ADMISSIONS_REVIEWER') return 'REVIEWER';
  return 'EXAM_ADMIN';
}

function buildDefaultSection(): BlueprintSection {
  return {
    id: `SEC-${Date.now()}`,
    name: 'Section I: General Evaluation',
    subject: 'Science',
    topics: ['General Concepts'],
    competencies: ['Evaluate foundational curriculum requirements'],
    cognitiveLevels: {
      remembering: 1,
      understanding: 1,
      applying: 1,
      analyzing: 0,
      evaluating: 0,
      creating: 0,
    },
    itemCount: 3,
    marksPerItem: 5,
    totalMarks: 15,
    passingScore: 9,
    timeAllocation: 20,
    instructions: 'Answer all items carefully.',
    difficultyDistribution: {
      easy: 1,
      moderate: 1,
      difficult: 1,
    },
    itemTypeDistribution: {
      mcq: 2,
      tf: 1,
      essay: 0,
      fib: 0,
    },
  };
}

function buildDefaultAccessibilityAccommodations() {
  return {
    screenReader: true,
    extendedTimeAllowance: true,
    highContrastMode: true,
    dyslexiaTypography: false,
    audioPrompts: false,
  };
}

function normalizeBlueprintRules(rules: Blueprint['rules']): Blueprint['rules'] {
  return {
    ...rules,
    sharedStimulusRequirement: {
      required: false,
      minCount: 0,
      questionsPerStimulus: 0,
      ...rules.sharedStimulusRequirement,
    },
    randomizationRules: {
      shuffleQuestions: false,
      shuffleChoices: false,
      fixedSequence: false,
      ...rules.randomizationRules,
    },
    accessibilityAccommodations: {
      ...buildDefaultAccessibilityAccommodations(),
      ...rules.accessibilityAccommodations,
    },
  };
}

function normalizeBlueprint(blueprint: Blueprint): Blueprint {
  return {
    ...blueprint,
    rules: normalizeBlueprintRules(blueprint.rules),
  };
}

function summarizeBlueprintSections(sections: BlueprintSection[]) {
  return sections.reduce(
    (totals, section) => ({
      totalItems: totals.totalItems + section.itemCount,
      totalMarks: totals.totalMarks + section.totalMarks,
      totalTimeLimit: totals.totalTimeLimit + section.timeAllocation,
    }),
    {
      totalItems: 0,
      totalMarks: 0,
      totalTimeLimit: 0,
    },
  );
}

function syncBlueprintTotalsFromSections(blueprint: Blueprint): Blueprint {
  const totals = summarizeBlueprintSections(blueprint.sections);
  return {
    ...blueprint,
    rules: {
      ...blueprint.rules,
      totalItems: totals.totalItems,
      totalMarks: totals.totalMarks,
      totalTimeLimit: totals.totalTimeLimit,
    },
  };
}

function buildDefaultBlueprint(ownerName: string): Blueprint {
  const now = new Date();
  const nextYear = new Date(now);
  nextYear.setFullYear(now.getFullYear() + 1);

  return {
    id: `BP-${Date.now()}`,
    code: `BP-${now.getFullYear()}-NEW`,
    name: 'Untitled Blueprint',
    description: 'Curriculum examination specifications and blueprinting.',
    examType: 'Admission',
    academicYear: `${now.getFullYear()}-${nextYear.getFullYear()}`,
    institution: 'Philippine Space Agency (PhilSA)',
    examCategory: 'General Academic & Science',
    status: 'DRAFT',
    version: '1.0',
    owner: ownerName,
    createdAt: now.toISOString(),
    effectiveDate: now.toISOString().slice(0, 10),
    expirationDate: nextYear.toISOString().slice(0, 10),
    sections: [buildDefaultSection()],
    rules: {
      totalItems: 3,
      totalMarks: 15,
      totalTimeLimit: 20,
      sharedStimulusRequirement: {
        required: false,
        minCount: 0,
        questionsPerStimulus: 0,
      },
      randomizationRules: {
        shuffleQuestions: true,
        shuffleChoices: true,
        fixedSequence: false,
      },
      maxReuseLimit: 3,
      versionCompatibility: '>= 1.0',
      activeItemOnly: true,
      accessibilityAccommodations: buildDefaultAccessibilityAccommodations(),
    },
    history: [
      {
        id: `LH-${Date.now()}`,
        version: '1.0',
        action: 'Created',
        updatedBy: ownerName,
        updatedAt: now.toISOString(),
        comments: 'Initial draft created from the blueprint designer.',
      },
    ],
  };
}

function summarizeSubjects(blueprint: Blueprint) {
  const subjects = Array.from(new Set(blueprint.sections.map((section) => section.subject)));
  if (subjects.length <= 3) {
    return subjects.join(', ');
  }

  return `${subjects.slice(0, 3).join(', ')}Ã¢â‚¬Â¦`;
}

function summarizeCount(blueprint: Blueprint) {
  return blueprint.rules.totalMarks;
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

export default function ExamBlueprints() {
  const { user } = usePhilSA();
  const navigate = useNavigate();

  const [blueprints, setBlueprints] = useState<Blueprint[]>(INITIAL_BLUEPRINTS);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<BlueprintStatusFilter>('ALL');
  const [examTypeFilter, setExamTypeFilter] = useState<BlueprintExamTypeFilter>('ALL');
  const [academicYearFilter, setAcademicYearFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<BlueprintSortOption>('NEWEST_CREATED');
  const [activePersona, setActivePersona] = useState<PersonaKey>(() => personaFromRole(user?.role));
  const [showFilters, setShowFilters] = useState(false);
  const [selectedBlueprint, setSelectedBlueprint] = useState<Blueprint | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isDesignerOpen, setIsDesignerOpen] = useState(false);
  const [designerMode, setDesignerMode] = useState<BlueprintEditorMode>('create');
  const [designerDraft, setDesignerDraft] = useState<Blueprint | null>(null);
  const [expandedSections, setExpandedSections] = useState<SectionCollapseState>({});

  useEffect(() => {
    setActivePersona(personaFromRole(user?.role));
  }, [user?.role]);

  useEffect(() => {
    let active = true;

    const loadBlueprints = async () => {
      const remote = await examBlueprintService.listBlueprints();
      if (!active) return;

      if (remote.ok && remote.data.length > 0) {
        const normalizedRemote = remote.data.map((blueprint) => normalizeBlueprint(blueprint));
        setBlueprints(normalizedRemote);
        localStorage.setItem('philsa_blueprints', JSON.stringify(normalizedRemote));
        return;
      }

      const saved = localStorage.getItem('philsa_blueprints');
      if (saved) {
        try {
          setBlueprints((JSON.parse(saved) as Blueprint[]).map((blueprint) => normalizeBlueprint(blueprint)));
          return;
        } catch {
          localStorage.removeItem('philsa_blueprints');
        }
      }
    };

    void loadBlueprints();

    return () => {
      active = false;
    };
  }, []);

  const saveBlueprints = (next: Blueprint[]) => {
    setBlueprints(next);
    localStorage.setItem('philsa_blueprints', JSON.stringify(next));
  };

  const filteredBlueprints = useMemo(() => {
    const query = normalizeText(searchTerm);

    return blueprints
      .filter((blueprint) => {
        if (statusFilter !== 'ALL' && blueprint.status !== statusFilter) return false;
        if (examTypeFilter !== 'ALL' && blueprint.examType !== examTypeFilter) return false;
        if (academicYearFilter !== 'ALL' && blueprint.academicYear !== academicYearFilter) return false;
        if (!query) return true;

        const searchable = [
          blueprint.code,
          blueprint.name,
          blueprint.description,
          blueprint.institution,
          blueprint.examCategory,
          blueprint.examType,
          blueprint.academicYear,
          blueprint.owner,
          summarizeSubjects(blueprint),
        ]
          .join(' ')
          .toLowerCase();

        return searchable.includes(query);
      })
      .sort((left, right) => {
        switch (sortBy) {
          case 'OLDEST_CREATED':
            return left.createdAt.localeCompare(right.createdAt);
          case 'NAME_ASC':
            return left.name.localeCompare(right.name);
          case 'NAME_DESC':
            return right.name.localeCompare(left.name);
          case 'NEWEST_CREATED':
          default:
            return right.createdAt.localeCompare(left.createdAt);
        }
      });
  }, [blueprints, searchTerm, statusFilter, examTypeFilter, academicYearFilter, sortBy]);

  const academicYearOptions = useMemo(
    () => Array.from(new Set(blueprints.map((blueprint) => blueprint.academicYear))).sort((left, right) => right.localeCompare(left)),
    [blueprints],
  );

  const designerMetrics = useMemo(() => {
    if (!designerDraft) {
      return { totalItems: 0, totalMarks: 0, totalTimeLimit: 0 };
    }

    return summarizeBlueprintSections(designerDraft.sections);
  }, [designerDraft]);

  const handleHubTabChange = (tab: ExamHubTabKey) => {
    if (tab === 'blueprints') return;
    if (tab === 'setAssembly') {
      navigate('/admin/hub/exam-sets/content#dashboard');
      return;
    }
    if (tab === 'builder') {
      navigate('/admin/hub/exam-sets/content#assembly');
      return;
    }
    if (tab === 'published') {
      navigate('/admin/hub/exam-sets/content#packages');
      return;
    }
    navigate('/admin/hub/exam-sets/content#audit');
  };

  const openDetails = (blueprint: Blueprint) => {
    setSelectedBlueprint(blueprint);
    setIsDetailsOpen(true);
  };

  const openDesigner = (mode: BlueprintEditorMode, blueprint?: Blueprint) => {
    setDesignerMode(mode);
    setDesignerDraft(
      blueprint ? JSON.parse(JSON.stringify(blueprint)) as Blueprint : buildDefaultBlueprint(`${user?.firstName ?? 'Exam'} ${user?.lastName ?? 'Admin'}`),
    );
    setIsDesignerOpen(true);
    const sections = blueprint?.sections ?? [buildDefaultSection()];
    setExpandedSections(
      sections.reduce<SectionCollapseState>((accumulator, section) => {
        accumulator[section.id] = true;
        return accumulator;
      }, {}),
    );
  };

  const saveDesigner = async () => {
    if (!designerDraft) return;

    const payload = syncBlueprintTotalsFromSections(designerDraft);

    const result =
      designerMode === 'edit'
        ? await examBlueprintService.updateBlueprint(payload)
        : await examBlueprintService.createBlueprint(payload);

    if (result.ok) {
      const next = designerMode === 'edit'
        ? blueprints.map((item) => (item.id === result.data.id ? result.data : item))
        : [result.data, ...blueprints.filter((item) => item.id !== result.data.id)];
      saveBlueprints(next);
      setSelectedBlueprint(result.data);
      setIsDetailsOpen(true);
      setIsDesignerOpen(false);
      setExpandedSections({});
      return;
    }

    if (designerMode === 'edit') {
      const next = blueprints.map((item) => (item.id === designerDraft.id ? designerDraft : item));
      saveBlueprints(next);
      setSelectedBlueprint(designerDraft);
      setIsDetailsOpen(true);
      setIsDesignerOpen(false);
      return;
    }

    saveBlueprints([designerDraft, ...blueprints]);
    setSelectedBlueprint(designerDraft);
    setIsDetailsOpen(true);
    setIsDesignerOpen(false);
    setExpandedSections({});
  };

  const cloneBlueprint = async (blueprint: Blueprint) => {
    const result = await examBlueprintService.cloneBlueprint(blueprint.id);
    if (result.ok) {
      saveBlueprints([result.data, ...blueprints]);
      setSelectedBlueprint(result.data);
      return;
    }

    const cloned: Blueprint = {
      ...JSON.parse(JSON.stringify(blueprint)) as Blueprint,
      id: `BP-${Date.now()}`,
      code: `${blueprint.code}-COPY`,
      status: 'DRAFT',
      version: blueprint.version,
      createdAt: new Date().toISOString(),
      owner: `${user?.firstName ?? 'Exam'} ${user?.lastName ?? 'Admin'}`,
      rules: {
        ...blueprint.rules,
        accessibilityAccommodations: { ...blueprint.rules.accessibilityAccommodations },
      },
    };
    saveBlueprints([cloned, ...blueprints]);
    setSelectedBlueprint(cloned);
  };

  const deleteDraft = async (blueprint: Blueprint) => {
    if (blueprint.status !== 'DRAFT') return;

    if (!window.confirm(`Delete draft blueprint "${blueprint.name}"?`)) return;

    const result = await examBlueprintService.deleteBlueprint(blueprint.id);
    if (!result.ok) {
      const remaining = blueprints.filter((item) => item.id !== blueprint.id);
      saveBlueprints(remaining);
      setSelectedBlueprint(null);
      setIsDetailsOpen(false);
      return;
    }

    const remaining = blueprints.filter((item) => item.id !== blueprint.id);
    saveBlueprints(remaining);
    setSelectedBlueprint(null);
    setIsDetailsOpen(false);
  };

  return (
    <div className="mx-auto flex w-full max-w-[1420px] flex-col gap-5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <ExamHubTabs activeTab="blueprints" onTabChange={handleHubTabChange} className="border-none" />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5">
        {!isDesignerOpen ? (
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-rose-50 p-3 text-philsa-red">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-[22px] font-extrabold leading-none text-slate-900">Exam Blueprints</h1>
                <p className="mt-1 text-[12px] text-slate-500">Curriculum examination specifications and blueprinting</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => openDesigner('create')}
                className="inline-flex items-center gap-2 rounded-xl bg-philsa-red px-4 py-2.5 text-[13px] font-extrabold uppercase tracking-[0.15em] text-white shadow-sm transition hover:bg-philsa-red/90"
              >
                <Plus className="h-4 w-4" />
                Design Blueprint
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsDesignerOpen(false);
                  setDesignerDraft(null);
                }}
                className="mt-0.5 rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-slate-600 transition hover:bg-slate-100"
                title="Back to exam blueprints"
              >
                <X className="h-4 w-4" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-rose-50 p-1.5 text-philsa-red">
                    <ClipboardList className="h-4 w-4" />
                  </span>
                  <h1 className="text-xl font-black tracking-tight text-slate-900">
                    {designerMode === 'create' ? 'Design New Exam Blueprint Schema' : 'Modify Exam Blueprint Spec'}
                  </h1>
                </div>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  Academic Year {designerDraft?.academicYear ?? ''} â€¢ PhilSA Framework
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsDesignerOpen(false);
                  setDesignerDraft(null);
                }}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
              >
                Cancel Draft
              </button>
              <button
                type="button"
                onClick={() => void saveDesigner()}
                className="inline-flex items-center gap-2 rounded-xl bg-philsa-red px-5 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-philsa-red/90"
              >
                <Save className="h-4 w-4" />
                Save Specification Draft
              </button>
            </div>
          </div>
        )}
      </section>

      {!isDesignerOpen && (
        <>
      <section className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5">
        <div className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search code, name, institution..."
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-[13px] font-medium text-slate-700 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-100"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowFilters((current) => !current)}
              className={cn(
                'inline-flex h-11 items-center gap-2 rounded-2xl border px-4 text-[13px] font-bold uppercase tracking-[0.12em] shadow-sm transition',
                showFilters
                  ? 'border-rose-200 bg-rose-50 text-philsa-red hover:bg-rose-100'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
              )}
            >
              <Filter className="h-4 w-4" />
              Filters
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <label className="space-y-1.5">
                <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Status</span>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as BlueprintStatusFilter)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-800 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-100"
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status === 'ALL' ? 'All Statuses' : statusLabel(status as Blueprint['status'])}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1.5">
                <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Exam Type</span>
                <select
                  value={examTypeFilter}
                  onChange={(event) => setExamTypeFilter(event.target.value as BlueprintExamTypeFilter)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-800 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-100"
                >
                  {EXAM_TYPE_OPTIONS.map((examType) => (
                    <option key={examType} value={examType}>
                      {examType === 'ALL' ? 'All Types' : examType}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1.5">
                <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Academic Year</span>
                <select
                  value={academicYearFilter}
                  onChange={(event) => setAcademicYearFilter(event.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-800 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-100"
                >
                  <option value="ALL">All Years</option>
                  {academicYearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1.5">
                <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Sort By</span>
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as BlueprintSortOption)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-800 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-100"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </div>
      </section>

      {!isDetailsOpen && (
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-5">
          <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
            Available Blueprint Specifications ({filteredBlueprints.length})
          </p>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Table view • click row to view details
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
                <th className="px-5 py-4">Code</th>
                <th className="px-5 py-4">Exam Blueprint Name</th>
                <th className="px-5 py-4">Contributor</th>
                <th className="px-5 py-4">Subjects</th>
                <th className="px-5 py-4">Total Marks</th>
                <th className="px-5 py-4">Academic Year</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBlueprints.map((blueprint) => {
                const editable = blueprint.status === 'DRAFT' || blueprint.status === 'REVISION_REQUIRED';

                return (
                  <tr
                    key={blueprint.id}
                    onClick={() => openDetails(blueprint)}
                    className="cursor-pointer border-b border-slate-100 transition hover:bg-slate-50/80"
                  >
                    <td className="px-5 py-4 align-middle">
                      <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[11px] font-bold text-slate-700">
                        {blueprint.code}
                      </span>
                    </td>
                    <td className="px-5 py-4 align-middle">
                      <div>
                        <p className="text-[13px] font-bold text-slate-900">{blueprint.name}</p>
                        <p className="mt-0.5 max-w-[420px] truncate text-[12px] text-slate-500">{blueprint.description}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 align-middle text-[13px] font-semibold text-slate-700">
                      {blueprint.owner}
                    </td>
                    <td className="px-5 py-4 align-middle text-[13px] text-slate-600">
                      <span className="max-w-[260px] truncate inline-block">{summarizeSubjects(blueprint)}</span>
                    </td>
                    <td className="px-5 py-4 align-middle">
                      <span className="inline-flex rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-[12px] font-bold text-rose-700">
                        {summarizeCount(blueprint)} pts
                      </span>
                    </td>
                    <td className="px-5 py-4 align-middle text-[13px] font-semibold text-slate-700">
                      {blueprint.academicYear}
                    </td>
                    <td className="px-5 py-4 align-middle">
                      <span className={cn('inline-flex rounded-full border px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.14em]', statusTone(blueprint.status))}>
                        {statusLabel(blueprint.status)}
                      </span>
                    </td>
                    <td className="px-5 py-4 align-middle">
                      <div className="flex items-center justify-end gap-2">
                        {editable && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openDesigner('edit', blueprint);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[12px] font-bold text-blue-700 transition hover:bg-blue-100"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            Edit
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      )}

      {isDetailsOpen && selectedBlueprint && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                    {selectedBlueprint.code}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                    Version {selectedBlueprint.version}
                  </span>
                  <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em]', statusTone(selectedBlueprint.status))}>
                    {statusLabel(selectedBlueprint.status)}
                  </span>
                </div>
                <h2 className="mt-2 text-[22px] font-extrabold leading-tight text-slate-900">
                  {selectedBlueprint.name}
                </h2>
                <p className="mt-1 text-[13px] text-slate-500">
                  {selectedBlueprint.examCategory} • {selectedBlueprint.academicYear}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => openDesigner('edit', selectedBlueprint)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  <Edit3 className="h-4 w-4" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setIsDetailsOpen(false)}
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white p-2.5 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                  aria-label="Close blueprint details"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="border-b border-slate-200 px-4 py-3 sm:px-5">
            <div className="flex items-center justify-end">
              {selectedBlueprint.status === 'DRAFT' ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl bg-philsa-red px-4 py-2 text-[13px] font-extrabold uppercase tracking-[0.12em] text-white shadow-sm transition hover:bg-philsa-red/90"
                >
                  Submit for Review
                  <ChevronDown className="h-4 w-4 rotate-[-90deg]" />
                </button>
              ) : (
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Ready for review workflow</span>
              )}
            </div>
          </div>

          <div className="px-4 py-4 sm:px-5">
            <div className="mb-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Examination Structure ({selectedBlueprint.sections.length})</p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full border-collapse text-left">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
                    <th className="px-4 py-3 text-center">#</th>
                    <th className="px-4 py-3">Section Name</th>
                    <th className="px-4 py-3">Subject</th>
                    <th className="px-4 py-3 text-center">Items</th>
                    <th className="px-4 py-3 text-center">Marks/Q</th>
                    <th className="px-4 py-3 text-center">Total Pts</th>
                    <th className="px-4 py-3 text-center">Time</th>
                    <th className="px-4 py-3">Difficulty (E/M/D)</th>
                    <th className="px-4 py-3">Topics Covered</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[13px]">
                  {selectedBlueprint.sections.map((section, index) => (
                    <tr key={section.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 text-center font-mono text-slate-400">{index + 1}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{section.name}</p>
                        <p className="mt-0.5 line-clamp-1 text-[12px] text-slate-500">{section.instructions}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{section.subject}</td>
                      <td className="px-4 py-3 text-center font-semibold text-slate-800">{section.itemCount}</td>
                      <td className="px-4 py-3 text-center text-slate-600">{section.marksPerItem}</td>
                      <td className="px-4 py-3 text-center font-semibold text-slate-800">{section.totalMarks} pts</td>
                      <td className="px-4 py-3 text-center text-slate-600">{section.timeAllocation} min</td>
                      <td className="px-4 py-3 text-slate-600">
                        {section.difficultyDistribution.easy} / {section.difficultyDistribution.moderate} / {section.difficultyDistribution.difficult}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <span className="line-clamp-1">{section.topics.join(', ')}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => openDesigner('edit', selectedBlueprint)}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] font-bold text-slate-700 transition hover:bg-slate-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => cloneBlueprint(selectedBlueprint)}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] font-bold text-slate-700 transition hover:bg-slate-50"
                          >
                            Copy
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
        </>
      )}

      {isDesignerOpen && designerDraft && (
        <div className="mx-auto flex w-full max-w-[1420px] flex-col gap-6 pb-6">
            <div className="space-y-6 text-xs">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-rose-50 p-1.5 text-philsa-red">
                      <ClipboardList className="h-4 w-4" />
                    </span>
                    <h2 className="text-sm font-black uppercase tracking-wide text-slate-900">1. Metadata Properties</h2>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase text-slate-600">
                    Blueprint Identifier & Scope
                  </span>
                </div>

                <div className="mt-5 flex flex-wrap gap-5 items-start">
                  <label className="w-full sm:w-48 space-y-1.5">
                    <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Blueprint Spec Code</span>
                    <input
                      type="text"
                      value={designerDraft.code}
                      onChange={(event) => setDesignerDraft({ ...designerDraft, code: event.target.value.toUpperCase() })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-xs font-bold text-slate-800 outline-none focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-philsa-red/20"
                    />
                  </label>

                  <label className="w-full sm:w-80 space-y-1.5">
                    <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Exam Blueprint Name</span>
                    <input
                      type="text"
                      value={designerDraft.name}
                      onChange={(event) => setDesignerDraft({ ...designerDraft, name: event.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-philsa-red/20"
                    />
                  </label>

                  <label className="w-full sm:w-44 space-y-1.5">
                    <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Contributor Agency</span>
                    <select
                      value={designerDraft.institution}
                      onChange={(event) => setDesignerDraft({ ...designerDraft, institution: event.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-philsa-red/20"
                    >
                      {CONTRIBUTOR_AGENCIES.map((agency) => (
                        <option key={agency} value={agency}>
                          {agency}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="w-full sm:w-40 space-y-1.5">
                    <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Academic Year</span>
                    <input
                      type="text"
                      value={designerDraft.academicYear}
                      onChange={(event) => setDesignerDraft({ ...designerDraft, academicYear: event.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-philsa-red/20"
                    />
                  </label>
                </div>

                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-philsa-red" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Overall Calculated Rule Metrics</span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <DetailCard label="Total Questions" value={`${designerMetrics.totalItems} questions`} />
                    <DetailCard label="Total Marks / Points" value={`${designerMetrics.totalMarks} points`} />
                    <DetailCard label="Time Constraint" value={`${designerMetrics.totalTimeLimit} minutes`} />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-rose-50 p-1.5 text-philsa-red">
                      <Shield className="h-4 w-4" />
                    </span>
                    <h2 className="text-sm font-black uppercase tracking-wide text-slate-900">2. Configure Rules & Accessibility</h2>
                  </div>
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-700">
                    Universal Standard
                  </span>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-5">
                      <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Delivery & Shuffling Rules
                      </p>

                      <button
                        type="button"
                        onClick={() => setDesignerDraft({
                          ...designerDraft,
                          rules: {
                            ...designerDraft.rules,
                            randomizationRules: {
                              ...designerDraft.rules.randomizationRules,
                              shuffleQuestions: !designerDraft.rules.randomizationRules.shuffleQuestions,
                            },
                          },
                        })}
                        className="flex w-full items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-left shadow-2xs transition hover:bg-emerald-100/80"
                      >
                        <div>
                          <span className="block text-[11px] font-bold text-emerald-900">Shuffle Question Sequence</span>
                          <span className="text-[9px] font-medium text-emerald-700/70">Randomize question order for each candidate</span>
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">
                          ACTIVE
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDesignerDraft({
                          ...designerDraft,
                          rules: {
                            ...designerDraft.rules,
                            randomizationRules: {
                              ...designerDraft.rules.randomizationRules,
                              shuffleChoices: !designerDraft.rules.randomizationRules.shuffleChoices,
                            },
                          },
                        })}
                        className="flex w-full items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-left shadow-2xs transition hover:bg-emerald-100/80"
                      >
                        <div>
                          <span className="block text-[11px] font-bold text-emerald-900">Shuffle Choice Options</span>
                          <span className="text-[9px] font-medium text-emerald-700/70">Randomize answer choices for multiple choice questions</span>
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">
                          ACTIVE
                        </span>
                      </button>
                    </div>

                  <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-5">
                    <p className="mb-2 flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      <Sparkles className="h-3 w-3 text-amber-500" />
                      Accessibility Accommodations
                    </p>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs">
                        <div>
                          <span className="block text-[11px] font-bold text-slate-800">Screen Reader (NVDA/JAWS)</span>
                          <span className="text-[9px] font-medium text-slate-400">ARIA tags compliance</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={designerDraft.rules.accessibilityAccommodations.screenReader}
                          onChange={(event) => setDesignerDraft({
                            ...designerDraft,
                            rules: {
                              ...designerDraft.rules,
                              accessibilityAccommodations: {
                                ...designerDraft.rules.accessibilityAccommodations,
                                screenReader: event.target.checked,
                              },
                            },
                          })}
                          className="h-4 w-4 cursor-pointer rounded accent-philsa-red"
                        />
                      </label>

                      <label className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs">
                        <div>
                          <span className="block text-[11px] font-bold text-slate-800">Extended Time Allowance</span>
                          <span className="text-[9px] font-medium text-slate-400">1.5x time extension</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={designerDraft.rules.accessibilityAccommodations.extendedTimeAllowance}
                          onChange={(event) => setDesignerDraft({
                            ...designerDraft,
                            rules: {
                              ...designerDraft.rules,
                              accessibilityAccommodations: {
                                ...designerDraft.rules.accessibilityAccommodations,
                                extendedTimeAllowance: event.target.checked,
                              },
                            },
                          })}
                          className="h-4 w-4 cursor-pointer rounded accent-philsa-red"
                        />
                      </label>

                      <label className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs">
                        <div>
                          <span className="block text-[11px] font-bold text-slate-800">High Contrast Mode</span>
                          <span className="text-[9px] font-medium text-slate-400">WCAG AAA contrast ratio</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={designerDraft.rules.accessibilityAccommodations.highContrastMode}
                          onChange={(event) => setDesignerDraft({
                            ...designerDraft,
                            rules: {
                              ...designerDraft.rules,
                              accessibilityAccommodations: {
                                ...designerDraft.rules.accessibilityAccommodations,
                                highContrastMode: event.target.checked,
                              },
                            },
                          })}
                          className="h-4 w-4 cursor-pointer rounded accent-philsa-red"
                        />
                      </label>

                      <label className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs">
                        <div>
                          <span className="block text-[11px] font-bold text-slate-800">Dyslexia Typography</span>
                          <span className="text-[9px] font-medium text-slate-400">OpenDyslexic font support</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={designerDraft.rules.accessibilityAccommodations.dyslexiaTypography}
                          onChange={(event) => setDesignerDraft({
                            ...designerDraft,
                            rules: {
                              ...designerDraft.rules,
                              accessibilityAccommodations: {
                                ...designerDraft.rules.accessibilityAccommodations,
                                dyslexiaTypography: event.target.checked,
                              },
                            },
                          })}
                          className="h-4 w-4 cursor-pointer rounded accent-philsa-red"
                        />
                      </label>

                      <label className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs sm:col-span-2">
                        <div>
                          <span className="block text-[11px] font-bold text-slate-800">Audio Prompts / Text-To-Speech</span>
                          <span className="text-[9px] font-medium text-slate-400">Synthetic audio playback for question items</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={designerDraft.rules.accessibilityAccommodations.audioPrompts}
                          onChange={(event) => setDesignerDraft({
                            ...designerDraft,
                            rules: {
                              ...designerDraft.rules,
                              accessibilityAccommodations: {
                                ...designerDraft.rules.accessibilityAccommodations,
                                audioPrompts: event.target.checked,
                              },
                            },
                          })}
                          className="h-4 w-4 cursor-pointer rounded accent-philsa-red"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-rose-50 p-1.5 text-philsa-red">
                      <Layers className="h-4 w-4" />
                    </span>
                    <h2 className="text-sm font-black uppercase tracking-wide text-slate-900">3. Examination Sections Configuration</h2>
                  </div>
                  <button
                    type="button"
                    className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-2 text-xs font-bold text-philsa-red transition hover:bg-rose-100"
                    onClick={() => {
                      const nextSection = buildDefaultSection();
                      setDesignerDraft({
                        ...designerDraft,
                        sections: [...designerDraft.sections, nextSection],
                      });
                    }}
                  >
                    <Plus className="mr-1 inline h-4 w-4" />
                    Add Section Block
                  </button>
                </div>

                <div className="mt-5 space-y-4">
                  {designerDraft.sections.map((section, index) => (
                    <div key={section.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-200 font-mono text-xs font-black text-slate-700">
                            {index + 1}
                          </span>
                          <div className="font-extrabold uppercase tracking-wide text-slate-800 text-xs">
                            SECTION I: GENERAL EVALUATION
                            <span className="ml-2 font-semibold normal-case text-slate-500">
                              ({section.subject} • {section.itemCount} Items)
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setExpandedSections((current) => ({ ...current, [section.id]: !current[section.id] }))}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                            title={expandedSections[section.id] ? 'Collapse section block' : 'Expand section block'}
                          >
                            <ChevronDown className={cn('h-4 w-4 transition-transform', expandedSections[section.id] ? 'rotate-180' : '')} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const nextSections = designerDraft.sections.filter((item) => item.id !== section.id);
                              setDesignerDraft({ ...designerDraft, sections: nextSections.length ? nextSections : [buildDefaultSection()] });
                            }}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                            title="Remove section block"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {expandedSections[section.id] !== false && (
                        <div className="space-y-6 bg-white p-6">
                          <div className="flex flex-wrap gap-5 items-start">
                            <label className="w-full sm:w-[320px] space-y-1.5">
                              <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Section Name</span>
                              <input
                                type="text"
                                value={section.name}
                                onChange={(event) => {
                                  const nextSections = designerDraft.sections.map((item) =>
                                    item.id === section.id ? { ...item, name: event.target.value } : item,
                                  );
                                  setDesignerDraft({ ...designerDraft, sections: nextSections });
                                }}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-philsa-red/20"
                              />
                            </label>

                            <label className="w-full sm:w-[240px] space-y-1.5">
                              <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Subject</span>
                              <select
                                value={section.subject}
                                onChange={(event) => {
                                  const nextSections = designerDraft.sections.map((item) =>
                                    item.id === section.id ? { ...item, subject: event.target.value } : item,
                                  );
                                  setDesignerDraft({ ...designerDraft, sections: nextSections });
                                }}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-philsa-red/20"
                              >
                                <option value="Science">Science</option>
                                <option value="Math">Math</option>
                                <option value="Reading Comp (English, Filipino)">Reading Comp (English, Filipino)</option>
                                <option value="Lang Proficiency (English, Filipino)">Lang Proficiency (English, Filipino)</option>
                              </select>
                            </label>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Topic Constraints</span>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                              <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
                                Select topics from maintenance table for {section.subject}:
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {(section.subject === 'Science' ? SCIENCE_TOPIC_OPTIONS : [section.subject]).map((topic) => (
                                  <button
                                    key={topic}
                                    type="button"
                                    onClick={() => {
                                      const existing = section.topics;
                                      const nextTopics = existing.includes(topic)
                                        ? existing.filter((item) => item !== topic)
                                        : [...existing, topic];
                                      const nextSections = designerDraft.sections.map((item) =>
                                        item.id === section.id ? { ...item, topics: nextTopics } : item,
                                      );
                                      setDesignerDraft({ ...designerDraft, sections: nextSections });
                                    }}
                                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-100"
                                  >
                                    <Plus className="h-3 w-3" />
                                    {topic}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <input
                              type="text"
                              value={section.topics.join(', ')}
                              onChange={(event) => {
                                const nextSections = designerDraft.sections.map((item) =>
                                  item.id === section.id
                                    ? { ...item, topics: event.target.value.split(',').map((topic) => topic.trim()).filter(Boolean) }
                                    : item,
                                );
                                setDesignerDraft({ ...designerDraft, sections: nextSections });
                              }}
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-philsa-red/20"
                            />
                            <p className="text-[10px] text-slate-400">Click topics above from the Exam Blueprint Maintenance table or type topics separated by commas.</p>
                          </div>

                          <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
                            <label className="space-y-1.5">
                              <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Item Count (Questions)</span>
                              <input
                                type="number"
                                value={section.itemCount}
                                onChange={(event) => {
                                  const nextSections = designerDraft.sections.map((item) =>
                                    item.id === section.id ? { ...item, itemCount: Number(event.target.value) } : item,
                                  );
                                  setDesignerDraft({ ...designerDraft, sections: nextSections });
                                }}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-slate-300 focus:ring-2 focus:ring-philsa-red/20"
                              />
                            </label>

                            <label className="space-y-1.5">
                              <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Time (Minutes)</span>
                              <input
                                type="number"
                                value={section.timeAllocation}
                                onChange={(event) => {
                                  const nextSections = designerDraft.sections.map((item) =>
                                    item.id === section.id ? { ...item, timeAllocation: Number(event.target.value) } : item,
                                  );
                                  setDesignerDraft({ ...designerDraft, sections: nextSections });
                                }}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-slate-300 focus:ring-2 focus:ring-philsa-red/20"
                              />
                            </label>
                          </div>

                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <div className="mb-3">
                              <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                                Difficulty Distribution Weights (Sum: {section.itemCount} Items)
                              </span>
                            </div>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                              <label className="space-y-1.5">
                                <span className="block text-center text-[10px] font-black uppercase text-emerald-600">Easy Items</span>
                                <input
                                  type="number"
                                  value={section.difficultyDistribution.easy}
                                  onChange={(event) => {
                                    const nextSections = designerDraft.sections.map((item) =>
                                      item.id === section.id
                                        ? {
                                            ...item,
                                            difficultyDistribution: {
                                              ...item.difficultyDistribution,
                                              easy: Number(event.target.value),
                                            },
                                          }
                                        : item,
                                    );
                                    setDesignerDraft({ ...designerDraft, sections: nextSections });
                                  }}
                                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-center text-xs font-bold text-slate-800 outline-none focus:border-slate-300 focus:ring-2 focus:ring-philsa-red/20"
                                />
                              </label>

                              <label className="space-y-1.5">
                                <span className="block text-center text-[10px] font-black uppercase text-orange-500">Moderate Items</span>
                                <input
                                  type="number"
                                  value={section.difficultyDistribution.moderate}
                                  onChange={(event) => {
                                    const nextSections = designerDraft.sections.map((item) =>
                                      item.id === section.id
                                        ? {
                                            ...item,
                                            difficultyDistribution: {
                                              ...item.difficultyDistribution,
                                              moderate: Number(event.target.value),
                                            },
                                          }
                                        : item,
                                    );
                                    setDesignerDraft({ ...designerDraft, sections: nextSections });
                                  }}
                                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-center text-xs font-bold text-slate-800 outline-none focus:border-slate-300 focus:ring-2 focus:ring-philsa-red/20"
                                />
                              </label>

                              <label className="space-y-1.5">
                                <span className="block text-center text-[10px] font-black uppercase text-rose-500">Difficult Items</span>
                                <input
                                  type="number"
                                  value={section.difficultyDistribution.difficult}
                                  onChange={(event) => {
                                    const nextSections = designerDraft.sections.map((item) =>
                                      item.id === section.id
                                        ? {
                                            ...item,
                                            difficultyDistribution: {
                                              ...item.difficultyDistribution,
                                              difficult: Number(event.target.value),
                                            },
                                          }
                                        : item,
                                    );
                                    setDesignerDraft({ ...designerDraft, sections: nextSections });
                                  }}
                                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-center text-xs font-bold text-slate-800 outline-none focus:border-slate-300 focus:ring-2 focus:ring-philsa-red/20"
                                />
                              </label>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 text-[13px] font-semibold text-slate-800">{value}</p>
    </div>
  );
}
