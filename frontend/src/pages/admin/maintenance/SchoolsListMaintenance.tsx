import React, { useEffect, useMemo, useState } from 'react';
import {
  School as SchoolIcon,
  Search,
  Plus,
  Edit3,
  Trash2,
  Download,
  X,
  Check,
  ChevronRight,
  MapPin,
  Building2,
  Table as TableIcon,
  LayoutGrid,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PHILIPPINE_REGIONS, regionLabel } from '../../../data/philippineRegions';
import {
  schoolService,
  type SchoolClassification,
  type SchoolPayload,
  type SchoolRecord,
} from '../../../services/backendSchoolService';
import type { ServiceFailure } from '../../../services/serviceResult';
import { ConfirmationDialog, EmptyState, ErrorState, LoadingState, ModalShell } from '../../../components/ui';
import { useMaintenanceData } from '../../../services/maintenanceDataContext';
import {
  ExportConfigModal,
  type ExportColumnOption,
  type ExportSelection,
} from '../../../components/maintenance/ExportConfigModal';
import { downloadCsv, toCsv } from '../../../services/csvExportService';

function isSchoolClassification(value: string): value is SchoolClassification {
  return value === 'Public' || value === 'Private';
}

const EMPTY_FORM: SchoolPayload = {
  classification: 'Public',
  name: '',
  examineeCapacity: 1000,
  region: PHILIPPINE_REGIONS[0].code,
  status: 'Active',
};

type SchoolExportColumn = ExportColumnOption & { get: (s: SchoolRecord) => unknown };
const SCHOOL_EXPORT_COLUMNS: SchoolExportColumn[] = [
  { key: 'code', label: 'Code', get: (s) => s.code },
  { key: 'classification', label: 'Classification', get: (s) => s.classification },
  { key: 'name', label: 'Name', get: (s) => s.name },
  { key: 'examineeCapacity', label: 'Examinee Capacity', get: (s) => s.examineeCapacity },
  { key: 'region', label: 'Region/Municipality/City', get: (s) => regionLabel(s.region) },
  { key: 'status', label: 'Status', get: (s) => s.status },
];

const EXPORT_SCOPE_OPTIONS = [
  { value: 'filtered', label: 'Only rows matching current filters' },
  { value: 'all', label: 'All rows' },
];

export default function SchoolsListMaintenance() {
  const {
    schools,
    schoolsLoaded,
    schoolsError,
    ensureSchools,
    reloadSchools,
    setSchoolRecord,
    removeSchoolRecord,
  } = useMaintenanceData();
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [classificationFilter, setClassificationFilter] = useState<'ALL' | SchoolClassification>('ALL');
  const [regionFilter, setRegionFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingSchool, setViewingSchool] = useState<SchoolRecord | null>(null);
  const [editingSchool, setEditingSchool] = useState<SchoolRecord | null>(null);
  const [formData, setFormData] = useState<SchoolPayload>(EMPTY_FORM);

  const [pendingDelete, setPendingDelete] = useState<SchoolRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load the school list once into the shared cache; instant on tab re-entry.
  useEffect(() => {
    ensureSchools();
  }, [ensureSchools]);

  const uniqueRegions = useMemo(() => {
    return Array.from(new Set(schools.map((s) => s.region))).sort();
  }, [schools]);

  const filteredSchools = useMemo(() => {
    return schools.filter((s) => {
      if (classificationFilter !== 'ALL' && s.classification !== classificationFilter) return false;
      if (regionFilter !== 'ALL' && s.region !== regionFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!s.name.toLowerCase().includes(q) && !s.code.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [schools, classificationFilter, regionFilter, searchQuery]);

  const totalCapacity = useMemo(
    () => schools.reduce((sum, s) => sum + s.examineeCapacity, 0),
    [schools],
  );

  const handleOpenAddModal = () => {
    setEditingSchool(null);
    setError(null);
    setFormData({ ...EMPTY_FORM, region: uniqueRegions[0] ?? PHILIPPINE_REGIONS[0].code });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (school: SchoolRecord) => {
    setEditingSchool(school);
    setError(null);
    setFormData({
      classification: school.classification,
      name: school.name,
      examineeCapacity: school.examineeCapacity,
      region: school.region,
      status: school.status,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || isSaving) return;

    setIsSaving(true);
    setError(null);
    const result = editingSchool
      ? await schoolService.updateSchool(editingSchool.id, formData)
      : await schoolService.createSchool(formData);
    setIsSaving(false);

    if (!result.ok) {
      setError((result as ServiceFailure).error.message);
      return;
    }

    setSchoolRecord(result.data);
    setIsModalOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    const result = await schoolService.deleteSchool(pendingDelete.id);
    setIsDeleting(false);

    if (!result.ok) {
      setError((result as ServiceFailure).error.message);
      setPendingDelete(null);
      return;
    }
    removeSchoolRecord(pendingDelete.id);
    setPendingDelete(null);
  };

  const handleExport = ({ columns, scope }: ExportSelection) => {
    setIsExportModalOpen(false);
    const cols = SCHOOL_EXPORT_COLUMNS.filter((c) => columns.includes(c.key));
    const source = scope === 'all' ? schools : filteredSchools;
    const csv = toCsv(cols.map((c) => c.label), source.map((row) => cols.map((c) => c.get(row))));
    downloadCsv(`philSA_List_of_Schools_${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  // First load shows a distinct loading/error state; when cached it is already loaded.
  if (!schoolsLoaded && schoolsError) {
    return (
      <div className="flex justify-center py-16">
        <ErrorState
          title="School registry unavailable"
          message={schoolsError}
          action={
            <button
              onClick={reloadSchools}
              className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-philsa-navy hover:bg-philsa-navy/90 text-white transition-all cursor-pointer"
            >
              Try again
            </button>
          }
        />
      </div>
    );
  }
  if (!schoolsLoaded) {
    return (
      <div className="flex justify-center py-16">
        <LoadingState title="Loading school registry" message="Fetching the accredited school list." />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-philsa-gray">
          <Link to="/admin/maintenance" className="hover:text-philsa-navy font-bold">Maintenance Center</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-philsa-navy font-black">List of Schools</span>
        </div>
      </div>

      {/* Header Banner */}
      <div className="card-philsa bg-white p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-philsa-navy text-white text-[10px] font-black uppercase tracking-wider">
                Ecosystem Directory
              </span>
              <span className="text-xs font-mono text-slate-400">PhilSA Ref #M-SCH</span>
            </div>
            <h1 className="text-2xl font-black text-philsa-navy flex items-center gap-2">
              <SchoolIcon className="w-7 h-7 text-philsa-navy" />
              List of Schools
            </h1>
            <p className="text-xs text-philsa-gray max-w-3xl">
              Directory of accredited schools and examination venue partner institutions across all regions of the Philippines.
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
              onClick={handleOpenAddModal}
              className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-philsa-navy hover:bg-philsa-navy/90 text-white transition-all cursor-pointer shadow-lg shadow-philsa-navy/10 flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4 shrink-0" /> Add New School
            </button>
          </div>
        </div>

        {/* Quick Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            <div className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Total Schools</div>
            <div className="text-2xl font-black text-philsa-navy mt-1">{schools.length}</div>
          </div>
          <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl">
            <div className="text-[10px] font-extrabold uppercase text-blue-600 tracking-wider">Public / State</div>
            <div className="text-2xl font-black text-blue-900 mt-1">{schools.filter((s) => s.classification === 'Public').length}</div>
          </div>
          <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-2xl">
            <div className="text-[10px] font-extrabold uppercase text-purple-600 tracking-wider">Private Schools</div>
            <div className="text-2xl font-black text-purple-900 mt-1">{schools.filter((s) => s.classification === 'Private').length}</div>
          </div>
          <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl">
            <div className="text-[10px] font-extrabold uppercase text-emerald-600 tracking-wider">Total Examinee Capacity</div>
            <div className="text-2xl font-black text-emerald-900 mt-1">{totalCapacity.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {error && !isModalOpen && (
        <div className="card-philsa bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold p-4">
          {error}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="card-philsa bg-white p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
          {/* Search */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-philsa-gray">Search School / Code</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Name or code..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-philsa-navy/20"
              />
            </div>
          </div>

          {/* Classification */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-philsa-gray">Classification</label>
            <select
              value={classificationFilter}
              onChange={(e) => {
                const value = e.target.value;
                if (value === 'ALL' || isSchoolClassification(value)) setClassificationFilter(value);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-philsa-navy/20"
            >
              <option value="ALL">All Classifications</option>
              <option value="Public">Public Schools</option>
              <option value="Private">Private Schools</option>
            </select>
          </div>

          {/* Region */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-philsa-gray">Region/Municipality/City</label>
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-philsa-navy/20"
            >
              <option value="ALL">All Regions</option>
              {uniqueRegions.map((r) => (
                <option key={r} value={r}>{regionLabel(r)}</option>
              ))}
            </select>
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

      {/* Schools List: empty-registry CTA, otherwise table or grid */}
      {schools.length === 0 ? (
        <div className="flex justify-center py-16">
        <EmptyState
          title="No schools yet"
          message="Add your first accredited school to start building the registry."
          action={
            <button
              onClick={handleOpenAddModal}
              className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-philsa-navy hover:bg-philsa-navy/90 text-white transition-all cursor-pointer shadow-lg shadow-philsa-navy/10 flex items-center gap-2 whitespace-nowrap"
            >
              <Plus className="w-4 h-4 shrink-0" /> Add your first school
            </button>
          }
        />
        </div>
      ) : viewMode === 'table' ? (
        <div className="card-philsa bg-white overflow-hidden p-0 border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-philsa-border text-[11px] font-black uppercase text-philsa-navy tracking-wider">
                  <th className="py-3.5 px-4">School Code</th>
                  <th className="py-3.5 px-4">School Name</th>
                  <th className="py-3.5 px-4">Classification</th>
                  <th className="py-3.5 px-4">Region/Municipality/City</th>
                  <th className="py-3.5 px-4 text-center">Examinee Capacity</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredSchools.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-medium bg-slate-50/50">
                      No schools match your search and filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredSchools.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-all">
                      <td className="py-3.5 px-4">
                        <span className="text-[10px] font-mono bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded-md inline-block whitespace-nowrap">
                          {s.code}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => setViewingSchool(s)}
                          className="font-extrabold text-philsa-navy hover:text-blue-700 transition-colors cursor-pointer text-left"
                          title="View school details"
                        >
                          {s.name}
                        </button>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                          s.classification === 'Public' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200'
                        }`}>
                          {s.classification}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">{regionLabel(s.region)}</td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-700 font-mono">
                        {s.examineeCapacity.toLocaleString()} Seats
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border ${
                          s.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(s)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-philsa-navy hover:bg-slate-100 transition-all cursor-pointer"
                            title="Edit School Details"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setPendingDelete(s)}
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-all cursor-pointer"
                            title="Remove School"
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
      ) : filteredSchools.length === 0 ? (
        <div className="card-philsa bg-white p-12 text-center text-slate-400 font-medium border border-slate-200">
          No schools match your search and filter criteria.
        </div>
      ) : (
        /* GRID CARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredSchools.map((s) => (
            <div
              key={s.id}
              className="card-philsa bg-white p-6 hover:shadow-xl hover:border-philsa-navy/40 transition-all group space-y-4 relative overflow-hidden border border-slate-200"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-philsa-bg border border-philsa-border flex items-center justify-center text-philsa-navy group-hover:bg-philsa-navy group-hover:text-white transition-all shadow-sm">
                    <SchoolIcon className="w-6 h-6" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-black bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200 whitespace-nowrap">
                        {s.code}
                      </span>
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                        s.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>
                        {s.status}
                      </span>
                    </div>
                    <button
                      onClick={() => setViewingSchool(s)}
                      className="text-base font-black text-philsa-navy hover:text-blue-700 transition-colors cursor-pointer text-left"
                      title="View school details"
                    >
                      {s.name}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEditModal(s)}
                    className="p-1.5 text-slate-400 hover:text-philsa-navy hover:bg-slate-100 rounded-lg transition-all"
                    title="Edit School Details"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPendingDelete(s)}
                    className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                    title="Remove School"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 text-slate-600 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{regionLabel(s.region)}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 font-medium">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{s.classification}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-black text-philsa-navy">{s.examineeCapacity.toLocaleString()} Seats</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Examinee Capacity</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit School Modal */}
      <ModalShell isOpen={isModalOpen} className="max-w-xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-black text-philsa-navy flex items-center gap-2">
                <SchoolIcon className="w-5 h-5 text-philsa-navy" />
                {editingSchool ? 'Edit Accredited School' : 'Register New Accredited School'}
              </h3>
              <button
                onClick={() => { setIsModalOpen(false); setError(null); }}
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

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">School Code</label>
                  <input
                    type="text"
                    disabled
                    readOnly
                    value={editingSchool ? editingSchool.code : 'Auto-generated (SCH-#####)'}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl font-mono text-xs text-slate-500 cursor-not-allowed"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Classification *</label>
                  <select
                    value={formData.classification}
                    onChange={(e) => {
                      if (isSchoolClassification(e.target.value)) {
                        setFormData({ ...formData, classification: e.target.value });
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-philsa-navy/20"
                  >
                    <option value="Public">Public</option>
                    <option value="Private">Private</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">School Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-philsa-navy/20"
                  placeholder="Official name of school..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Examinee Capacity *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.examineeCapacity === 0 ? '' : formData.examineeCapacity}
                    onChange={(e) => setFormData({ ...formData, examineeCapacity: e.target.value === '' ? 0 : Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-philsa-navy/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Region/Municipality/City *</label>
                  <select
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-philsa-navy/20"
                  >
                    {PHILIPPINE_REGIONS.map((region) => (
                      <option key={region.code} value={region.code}>{region.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value === 'Inactive' ? 'Inactive' : 'Active' })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-philsa-navy/20"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); setError(null); }}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-philsa-navy hover:bg-philsa-navy/90 text-white font-bold transition-all cursor-pointer shadow-lg shadow-philsa-navy/10 flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Check className="w-4 h-4" /> {isSaving ? 'Saving...' : 'Save School Record'}
                </button>
              </div>
            </form>
      </ModalShell>

      {/* School Details Modal */}
      <ModalShell isOpen={viewingSchool !== null} className="max-w-lg p-6 space-y-5">
        {viewingSchool && (
          <>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-black text-philsa-navy flex items-center gap-2">
                <SchoolIcon className="w-5 h-5 text-philsa-navy" />
                School Details
              </h3>
              <button
                onClick={() => setViewingSchool(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-all cursor-pointer"
                aria-label="Close details"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-mono bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded-md inline-block whitespace-nowrap">
                  {viewingSchool.code}
                </span>
                <h4 className="text-xl font-black text-philsa-navy">{viewingSchool.name}</h4>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-philsa-gray">Classification</div>
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${viewingSchool.classification === 'Public' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>
                    {viewingSchool.classification}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-philsa-gray">Status</div>
                  <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border ${viewingSchool.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    {viewingSchool.status}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-philsa-gray">Region/Municipality/City</div>
                  <div className="font-bold text-slate-700">{regionLabel(viewingSchool.region)}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-philsa-gray">Examinee Capacity</div>
                  <div className="font-bold text-slate-700 font-mono">{viewingSchool.examineeCapacity.toLocaleString()} Seats</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-philsa-gray">Created</div>
                  <div className="font-medium text-slate-600">{new Date(viewingSchool.createdAt).toLocaleString()}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-philsa-gray">Last Updated</div>
                  <div className="font-medium text-slate-600">{new Date(viewingSchool.updatedAt).toLocaleString()}</div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                onClick={() => { const school = viewingSchool; setViewingSchool(null); setPendingDelete(school); }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
              <button
                onClick={() => { const school = viewingSchool; setViewingSchool(null); handleOpenEditModal(school); }}
                className="px-5 py-2 rounded-xl bg-philsa-navy hover:bg-philsa-navy/90 text-white text-xs font-bold transition-all cursor-pointer shadow-lg shadow-philsa-navy/10 flex items-center gap-1.5"
              >
                <Edit3 className="w-4 h-4" /> Edit
              </button>
            </div>
          </>
        )}
      </ModalShell>

      <ExportConfigModal
        isOpen={isExportModalOpen}
        title="Export schools"
        columns={SCHOOL_EXPORT_COLUMNS}
        scopeOptions={EXPORT_SCOPE_OPTIONS}
        onCancel={() => setIsExportModalOpen(false)}
        onExport={handleExport}
      />

      <ConfirmationDialog
        isOpen={pendingDelete !== null}
        title={pendingDelete ? `Are you sure you want to remove ${pendingDelete.name} at Maintenance Table?` : ''}
        message="This will be removed to other modules."
        details={pendingDelete ? `${pendingDelete.name} • ${pendingDelete.code}` : ''}
        confirmLabel="Agree"
        tone="danger"
        isConfirming={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
