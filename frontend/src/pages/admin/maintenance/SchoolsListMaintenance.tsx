import React, { useState, useMemo } from 'react';
import { 
  School as SchoolIcon, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Building2, 
  MapPin, 
  Mail, 
  Phone, 
  Users, 
  Download,
  X,
  Check,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { Link } from 'react-router-dom';

export interface SchoolItem {
  id: string;
  code: string;
  name: string;
  classification: 'Public' | 'Private';
  schoolType: 'Senior High School' | 'Science High School' | 'Integrated School' | 'Testing Venue Partner';
  region: string;
  city: string;
  principalAdministrator: string;
  email: string;
  phone: string;
  capacity: number;
  status: 'Active' | 'Inactive';
}

function isSchoolClassification(value: string): value is SchoolItem['classification'] {
  return value === 'Public' || value === 'Private';
}

function isSchoolType(value: string): value is SchoolItem['schoolType'] {
  return ['Senior High School', 'Science High School', 'Integrated School', 'Testing Venue Partner'].includes(value);
}

export default function SchoolsListMaintenance() {
  const [schools, setSchools] = useState<SchoolItem[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [classificationFilter, setClassificationFilter] = useState<'ALL' | 'Public' | 'Private'>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [regionFilter, setRegionFilter] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<SchoolItem | null>(null);

  const [formData, setFormData] = useState<Partial<SchoolItem>>({
    code: '',
    name: '',
    classification: 'Public',
    schoolType: 'Senior High School',
    region: 'NCR - National Capital Region',
    city: '',
    principalAdministrator: '',
    email: '',
    phone: '',
    capacity: 1000,
    status: 'Active'
  });

  const saveSchools = (updated: SchoolItem[]) => {
    setSchools(updated);
  };

  const uniqueRegions = useMemo(() => {
    return Array.from(new Set(schools.map(s => s.region))).sort();
  }, [schools]);

  const filteredSchools = useMemo(() => {
    return schools.filter(s => {
      if (classificationFilter !== 'ALL' && s.classification !== classificationFilter) return false;
      if (typeFilter !== 'ALL' && s.schoolType !== typeFilter) return false;
      if (regionFilter !== 'ALL' && s.region !== regionFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = s.name.toLowerCase().includes(q);
        const matchCode = s.code.toLowerCase().includes(q);
        const matchAdmin = s.principalAdministrator.toLowerCase().includes(q);
        const matchCity = s.city.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchAdmin && !matchCity) return false;
      }
      return true;
    });
  }, [schools, classificationFilter, typeFilter, regionFilter, searchQuery]);

  const handleOpenAddModal = () => {
    setEditingSchool(null);
    setFormData({
      code: `SCH-${Math.floor(100 + Math.random() * 900)}`,
      name: '',
      classification: 'Public',
      schoolType: 'Senior High School',
      region: uniqueRegions[0] || 'NCR - National Capital Region',
      city: '',
      principalAdministrator: '',
      email: '',
      phone: '',
      capacity: 1000,
      status: 'Active'
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (school: SchoolItem) => {
    setEditingSchool(school);
    setFormData({ ...school });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.code || !formData.city) return;

    if (editingSchool) {
      const updated = schools.map(s => s.id === editingSchool.id ? { ...s, ...formData } as SchoolItem : s);
      saveSchools(updated);
    } else {
      const newSchool: SchoolItem = {
        id: `sch-${Date.now()}`,
        code: formData.code || 'SCH-NEW',
        name: formData.name || 'New School',
        classification: formData.classification || 'Public',
        schoolType: formData.schoolType || 'Senior High School',
        region: formData.region || 'NCR - National Capital Region',
        city: formData.city || 'City',
        principalAdministrator: formData.principalAdministrator || 'Administrator',
        email: formData.email || 'admin@school.edu.ph',
        phone: formData.phone || '0917-000-0000',
        capacity: Number(formData.capacity) || 1000,
        status: formData.status || 'Active'
      };
      saveSchools([newSchool, ...schools]);
    }

    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to remove this school from the accredited list?')) {
      const updated = schools.filter(s => s.id !== id);
      saveSchools(updated);
    }
  };

  const handleToggleStatus = (id: string) => {
    const updated = schools.map(s => {
      if (s.id === id) {
        return { ...s, status: s.status === 'Active' ? 'Inactive' : 'Active' } as SchoolItem;
      }
      return s;
    });
    saveSchools(updated);
  };

  const exportCSV = () => {
    const headers = ['Code', 'Name', 'Classification', 'School Type', 'Region', 'City', 'Administrator', 'Email', 'Phone', 'Capacity', 'Status'];
    const rows = filteredSchools.map(s => [
      `"${s.code}"`,
      `"${s.name}"`,
      `"${s.classification}"`,
      `"${s.schoolType}"`,
      `"${s.region}"`,
      `"${s.city}"`,
      `"${s.principalAdministrator}"`,
      `"${s.email}"`,
      `"${s.phone}"`,
      s.capacity,
      `"${s.status}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
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
              List of Accredited Schools
            </h1>
            <p className="text-xs text-philsa-gray max-w-3xl">
              Directory of secondary schools, science high schools, and examination venue partner institutions across all regions of the Philippines.
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            <div className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Total Schools</div>
            <div className="text-2xl font-black text-philsa-navy mt-1">{schools.length}</div>
          </div>
          <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl">
            <div className="text-[10px] font-extrabold uppercase text-blue-600 tracking-wider">Public / State</div>
            <div className="text-2xl font-black text-blue-900 mt-1">{schools.filter(s => s.classification === 'Public').length}</div>
          </div>
          <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-2xl">
            <div className="text-[10px] font-extrabold uppercase text-purple-600 tracking-wider">Private Schools</div>
            <div className="text-2xl font-black text-purple-900 mt-1">{schools.filter(s => s.classification === 'Private').length}</div>
          </div>
          <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl">
            <div className="text-[10px] font-extrabold uppercase text-emerald-600 tracking-wider">Active Venues</div>
            <div className="text-2xl font-black text-emerald-900 mt-1">{schools.filter(s => s.status === 'Active').length}</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card-philsa bg-white p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-philsa-gray">Search School / City</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Name, code, admin..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-philsa-navy/20"
              />
            </div>
          </div>

          {/* Classification */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-philsa-gray">Classification</label>
            <select
              value={classificationFilter}
              onChange={e => {
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

          {/* School Type */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-philsa-gray">School Type</label>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-philsa-navy/20"
            >
              <option value="ALL">All School Types</option>
              <option value="Senior High School">Senior High School</option>
              <option value="Science High School">Science High School</option>
              <option value="Integrated School">Integrated School</option>
              <option value="Testing Venue Partner">Testing Venue Partner</option>
            </select>
          </div>

          {/* Region */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-philsa-gray">Region</label>
            <select
              value={regionFilter}
              onChange={e => setRegionFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-philsa-navy/20"
            >
              <option value="ALL">All Regions</option>
              {uniqueRegions.map(r => (
                <option key={r} value={r}>{r}</option>
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
                <th className="py-3.5 px-4">Code & Name</th>
                <th className="py-3.5 px-4">Classification & Type</th>
                <th className="py-3.5 px-4">Region & Location</th>
                <th className="py-3.5 px-4">Administrator / Contact</th>
                <th className="py-3.5 px-4 text-center">Capacity</th>
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
                    <td className="py-3.5 px-4 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-philsa-navy">{s.name}</span>
                      </div>
                      <div className="text-[10px] font-mono bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded-md inline-block">
                        {s.code}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 space-y-1">
                      <div>
                        <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                          s.classification === 'Public' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200'
                        }`}>
                          {s.classification}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium">{s.schoolType}</div>
                    </td>
                    <td className="py-3.5 px-4 space-y-0.5">
                      <div className="font-bold text-slate-800">{s.city}</div>
                      <div className="text-[10px] text-slate-400">{s.region}</div>
                    </td>
                    <td className="py-3.5 px-4 space-y-0.5">
                      <div className="font-bold text-philsa-navy">{s.principalAdministrator}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {s.email} • {s.phone}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-700 font-mono">
                      {s.capacity.toLocaleString()} Seats
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleToggleStatus(s.id)}
                        className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                          s.status === 'Active' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                            : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {s.status}
                      </button>
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
                          onClick={() => handleDelete(s.id)}
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
                  <label className="font-bold text-slate-700">School Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.code || ''}
                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-philsa-navy/20"
                    placeholder="e.g. PSHS-MAIN"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Classification *</label>
                  <select
                    value={formData.classification || 'Public'}
                    onChange={e => {
                      if (isSchoolClassification(e.target.value)) {
                        setFormData({ ...formData, classification: e.target.value });
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-philsa-navy/20"
                  >
                    <option value="Public">Public (Government / State)</option>
                    <option value="Private">Private</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">School Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-philsa-navy/20"
                  placeholder="Official name of school..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">School Type</label>
                  <select
                    value={formData.schoolType || 'Senior High School'}
                    onChange={e => {
                      if (isSchoolType(e.target.value)) {
                        setFormData({ ...formData, schoolType: e.target.value });
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-philsa-navy/20"
                  >
                    <option value="Senior High School">Senior High School</option>
                    <option value="Science High School">Science High School</option>
                    <option value="Integrated School">Integrated School</option>
                    <option value="Testing Venue Partner">Testing Venue Partner</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Examinee Capacity</label>
                  <input
                    type="number"
                    min={50}
                    value={formData.capacity || 1000}
                    onChange={e => setFormData({ ...formData, capacity: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-philsa-navy/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Region *</label>
                  <input
                    type="text"
                    required
                    value={formData.region || ''}
                    onChange={e => setFormData({ ...formData, region: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-philsa-navy/20"
                    placeholder="e.g. NCR - National Capital Region"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">City / Municipality *</label>
                  <input
                    type="text"
                    required
                    value={formData.city || ''}
                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-philsa-navy/20"
                    placeholder="e.g. Quezon City"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Principal / School Administrator</label>
                <input
                  type="text"
                  value={formData.principalAdministrator || ''}
                  onChange={e => setFormData({ ...formData, principalAdministrator: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-philsa-navy/20"
                  placeholder="e.g. Dr. Maria Santos"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Official Email</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-philsa-navy/20"
                    placeholder="admin@school.edu.ph"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Contact Number</label>
                  <input
                    type="text"
                    value={formData.phone || ''}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-philsa-navy/20"
                    placeholder="0917-000-0000"
                  />
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
                  className="px-5 py-2 rounded-xl bg-philsa-navy hover:bg-philsa-navy/90 text-white font-bold transition-all cursor-pointer shadow-lg shadow-philsa-navy/10 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Save School Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
