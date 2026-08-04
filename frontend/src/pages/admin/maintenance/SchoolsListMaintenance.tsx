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
import { ConfirmationDialog } from '../../../components/ui';

function isSchoolClassification(value: string): value is SchoolClassification {
  return value === 'Public' || value === 'Private';
}

const EMPTY_FORM: SchoolPayload = {
  classification: 'Public',
  name: '',
  examineeCapacity: 1000,
  region: PHILIPPINE_REGIONS[0].code,
};

export default function SchoolsListMaintenance() {
  const [schools, setSchools] = useState<SchoolRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [classificationFilter, setClassificationFilter] = useState<'ALL' | SchoolClassification>('ALL');
  const [regionFilter, setRegionFilter] = useState<string>('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<SchoolRecord | null>(null);
  const [formData, setFormData] = useState<SchoolPayload>(EMPTY_FORM);

  const [pendingDelete, setPendingDelete] = useState<SchoolRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    schoolService.listSchools().then((result) => {
      if (!active) return;
      if (result.ok) {
        setSchools(result.data);
      } else {
        setError((result as ServiceFailure).error.message);
      }
    });
    return () => {
      active = false;
    };
  }, []);

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

    if (editingSchool) {
      setSchools((prev) => prev.map((s) => (s.id === result.data.id ? result.data : s)));
    } else {
      setSchools((prev) => [result.data, ...prev]);
    }
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
    setSchools((prev) => prev.filter((s) => s.id !== pendingDelete.id));
    setPendingDelete(null);
  };

  const exportCSV = () => {
    const headers = ['Code', 'Classification', 'Name', 'Examinee Capacity', 'Region/Municipality/City'];
    const rows = filteredSchools.map((s) => [
      `"${s.code}"`,
      `"${s.classification}"`,
      `"${s.name}"`,
      s.examineeCapacity,
      `"${regionLabel(s.region)}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `philSA_List_of_Schools_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

          <div className="flex items-center gap-3">
            <button
              onClick={exportCSV}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-philsa-navy bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button
              onClick={handleOpenAddModal}
              className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-philsa-navy hover:bg-philsa-navy/90 text-white transition-all cursor-pointer shadow-lg shadow-philsa-navy/10 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add New School
            </button>
          </div>
        </div>

        {/* Quick Stat Cards */}
        <div className="grid grid-cols-3 gap-4 pt-2">
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
        </div>
      </div>

      {error && (
        <div className="card-philsa bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold p-4">
          {error}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="card-philsa bg-white p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
      </div>

      {/* Schools Table */}
      <div className="card-philsa bg-white overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-philsa-border text-[11px] font-black uppercase text-philsa-navy tracking-wider">
                <th className="py-3.5 px-4">School Code</th>
                <th className="py-3.5 px-4">School Name</th>
                <th className="py-3.5 px-4">Classification</th>
                <th className="py-3.5 px-4">Region/Municipality/City</th>
                <th className="py-3.5 px-4 text-center">Examinee Capacity</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredSchools.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-medium bg-slate-50/50">
                    No schools match your search and filter criteria.
                  </td>
                </tr>
              ) : (
                filteredSchools.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-all">
                    <td className="py-3.5 px-4">
                      <span className="text-[10px] font-mono bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded-md inline-block">
                        {s.code}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-extrabold text-philsa-navy">{s.name}</td>
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

      {/* Add / Edit School Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-black text-philsa-navy flex items-center gap-2">
                <SchoolIcon className="w-5 h-5 text-philsa-navy" />
                {editingSchool ? 'Edit Accredited School' : 'Register New Accredited School'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

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
                    min={0}
                    value={formData.examineeCapacity}
                    onChange={(e) => setFormData({ ...formData, examineeCapacity: Number(e.target.value) })}
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

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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
          </div>
        </div>
      )}

      <ConfirmationDialog
        isOpen={pendingDelete !== null}
        title="Remove accredited school?"
        message="This will remove the school from the accredited list. This cannot be undone."
        details={pendingDelete ? `${pendingDelete.name} • ${pendingDelete.code}` : ''}
        confirmLabel="Remove School"
        tone="danger"
        isConfirming={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
