import React, { useState } from 'react';
import {
  Search,
  Filter,
  Plus,
  MoreVertical,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  Upload,
  X,
  Check,
  AlertTriangle,
  Info,
  Users,
  Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

export interface MaintenanceColumn {
  key: string;
  label: string;
  render?: (row: any) => React.ReactNode;
  sortable?: boolean;
}

export interface MaintenanceField {
  name: string;
  label: string;
  type: 'text' | 'select' | 'textarea' | 'number' | 'toggle' | 'location';
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
  dependsOn?: string;
  validation?: (val: any) => string | null;
  disabled?: boolean;
  onChange?: (val: any, currentData: any) => any;
}

interface MaintenancePageProps {
  title: string;
  subtitle: string;
  breadcrumb?: string[];
  columns: MaintenanceColumn[];
  data: any[];
  onAdd?: (data: any) => void;
  onEdit?: (row: any) => void;
  onDelete?: (row: any) => void;
  onView?: (row: any) => void;
  fields: MaintenanceField[];
  bulkUpload?: {
    templateUrl: string;
    allowedTypes: string[];
  };
  extraHeaderActions?: React.ReactNode;
  sidePanel?: React.ReactNode;
  isSidePanelOpen?: boolean;
  aboveTableContent?: React.ReactNode;
}

export default function MaintenancePageTemplate({
  title,
  subtitle,
  breadcrumb = ['Maintenance'],
  columns,
  data,
  onAdd,
  onEdit,
  onDelete,
  onView,
  fields,
  bulkUpload,
  extraHeaderActions,
  sidePanel,
  isSidePanelOpen,
  aboveTableContent
}: MaintenancePageProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleOpenCreate = () => {
    setEditingRow(null);
    setFormData({});
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (row: any) => {
    setEditingRow(row);
    setFormData({ ...row });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    fields.forEach(field => {
      if (field.required && !formData[field.name]) {
        errors[field.name] = `${field.label} is required`;
      }
      if (field.validation) {
        const error = field.validation(formData[field.name]);
        if (error) errors[field.name] = error;
      }
    });
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (editingRow) {
      onEdit?.(formData);
    } else {
      onAdd?.(formData);
    }
    setIsModalOpen(false);
  };

  const filteredData = data.filter(row =>
    Object.values(row).some(val =>
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-philsa-navy mb-2 tracking-tight">{title}</h1>
          <p className="text-philsa-gray text-sm font-medium">{subtitle}</p>
        </div>
        <div className="flex gap-3">
          {extraHeaderActions}
          {bulkUpload && (
            <button
              onClick={() => setIsBulkUploadOpen(true)}
              className="btn-secondary py-2.5 px-6 text-sm flex items-center gap-2"
            >
              <Upload className="w-4 h-4" /> Bulk Import
            </button>
          )}
          <button
            onClick={handleOpenCreate}
            className="bg-philsa-navy text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-philsa-navy/10 hover:bg-philsa-navy/90 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Create New Entry
          </button>
        </div>
      </div>

      {/* Main Grid Layout for Side Panel Support */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        <div className={cn("space-y-8", sidePanel && isSidePanelOpen ? "xl:col-span-6" : "xl:col-span-12")}>
          {aboveTableContent}
          {/* Filter Bar */}
          <div className="bg-white border border-philsa-border rounded-3xl p-6 flex flex-wrap gap-4 items-center justify-between shadow-sm">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-philsa-gray" />
          <input
            type="text"
            placeholder="Search records..."
            className="w-full bg-philsa-bg border-none rounded-2xl pl-14 pr-6 py-3.5 text-sm font-bold text-philsa-navy shadow-inner outline-none focus:ring-2 focus:ring-philsa-navy/5 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-3">
           <button className="btn-secondary py-3.5 px-6 text-sm flex items-center gap-2">
             <Filter className="w-4 h-4" /> Advanced Filters
           </button>
           <button className="btn-secondary py-3.5 px-4 text-sm">
             <Download className="w-4 h-4" />
           </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="card-philsa !p-0 overflow-hidden border-philsa-border bg-white shadow-xl shadow-philsa-navy/[0.02]">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left">
            <thead className="bg-philsa-bg text-[10px] text-philsa-gray font-black uppercase tracking-[0.2em] border-b border-philsa-border">
              <tr>
                {columns.map(col => (
                  <th key={col.key} className="px-8 py-5">{col.label}</th>
                ))}
                <th className="px-8 py-5">Audit Details</th>
                <th className="px-8 py-5">Approval</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-philsa-border">
              {filteredData.map((row, idx) => (
                <tr key={idx} className="hover:bg-philsa-bg/30 transition-colors group">
                  {columns.map(col => (
                    <td key={col.key} className="px-8 py-6">
                      {col.render ? col.render(row) : (
                        <span className="text-sm font-bold text-philsa-navy">{row[col.key]}</span>
                      )}
                    </td>
                  ))}
                  <td className="px-8 py-6">
                    {row.updatedBy || row.updatedAt ? (
                      <div className="flex flex-col gap-1">
                        {row.updatedBy && (
                          <div className="flex items-center gap-2 text-[10px] font-bold text-philsa-gray">
                            <Users className="w-3 h-3" /> {row.updatedBy}
                          </div>
                        )}
                        {row.updatedAt && (
                          <div className="flex items-center gap-2 text-[10px] font-bold text-philsa-gray/60">
                            <Clock className="w-3 h-3" /> {row.updatedAt}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm font-bold text-philsa-gray/50">—</span>
                    )}
                  </td>
                  <td className="px-8 py-6">
                    {row.approvalStatus ? (
                      <StatusBadge status={row.approvalStatus} isApproval />
                    ) : (
                      <span className="text-sm font-bold text-philsa-gray/50">—</span>
                    )}
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => onView?.(row)}
                        className="p-2.5 bg-white border border-philsa-border rounded-xl text-philsa-gray hover:text-philsa-navy transition-all shadow-sm"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(row)}
                        className="p-2.5 bg-white border border-philsa-border rounded-xl text-philsa-gray hover:text-philsa-navy transition-all shadow-sm"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete?.(row)}
                        className="p-2.5 bg-white border border-philsa-border rounded-xl text-philsa-gray hover:text-philsa-red transition-all shadow-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 3} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center justify-center grayscale opacity-30">
                       <Database className="w-16 h-16 mb-4" />
                       <p className="text-xl font-bold uppercase tracking-widest">No Records Found</p>
                       <p className="text-sm font-medium mt-2">Try adjusting your search criteria</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-6 bg-philsa-bg/30 border-t border-philsa-border flex items-center justify-between">
           <p className="text-xs font-bold text-philsa-gray">
             Showing <span className="text-philsa-navy">{filteredData.length}</span> of <span className="text-philsa-navy">{data.length}</span> records
           </p>
           <div className="flex items-center gap-3">
              <button className="p-2 bg-white border border-philsa-border rounded-xl text-philsa-gray disabled:opacity-30">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex gap-1">
                 {[1, 2, 3].map(p => (
                   <button key={p} className={cn("w-8 h-8 rounded-xl text-xs font-black transition-all", p === 1 ? "bg-philsa-navy text-white shadow-lg" : "bg-white border border-philsa-border text-philsa-gray hover:border-philsa-navy")}>
                     {p}
                   </button>
                 ))}
              </div>
              <button className="p-2 bg-white border border-philsa-border rounded-xl text-philsa-gray">
                <ChevronRight className="w-4 h-4" />
              </button>
           </div>
        </div>
      </div>
        </div>

        {sidePanel && isSidePanelOpen && (
          <div className="xl:col-span-6 sticky top-8">
            {sidePanel}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-philsa-navy/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="px-6 py-5 border-b border-philsa-border flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-black text-philsa-red uppercase tracking-widest mb-0.5">Maintenance Editor</div>
                  <h2 className="text-xl font-black text-philsa-navy">
                    {editingRow ? 'Edit Record' : 'Create New Entry'}
                  </h2>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2.5 bg-philsa-bg rounded-xl text-philsa-gray hover:text-philsa-navy transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
                <div className="p-6 space-y-5 overflow-y-auto max-h-[55vh]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    {fields.map(field => (
                      <div key={field.name} className={cn("space-y-1.5", field.type === 'textarea' && "md:col-span-2")}>
                        <label className="text-[11px] font-extrabold text-philsa-navy uppercase tracking-wider flex items-center gap-1">
                          {field.label} {field.required && <span className="text-philsa-red">*</span>}
                        </label>

                        {field.type === 'text' || field.type === 'number' ? (
                          <input
                            type={field.type}
                            placeholder={field.placeholder}
                            disabled={field.disabled}
                            className={cn(
                              "w-full bg-philsa-bg border-none rounded-xl px-4 py-2.5 text-xs font-bold text-philsa-navy outline-none focus:ring-2 transition-all disabled:opacity-65 disabled:bg-gray-100/80 disabled:cursor-not-allowed",
                              formErrors[field.name] ? "ring-2 ring-philsa-red/30" : "focus:ring-philsa-navy/10"
                            )}
                            value={formData[field.name] || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              let updated = { ...formData, [field.name]: val };
                              if (field.onChange) {
                                updated = field.onChange(val, updated);
                              }
                              setFormData(updated);
                            }}
                          />
                        ) : field.type === 'select' ? (
                          <div className="relative">
                            <select
                              disabled={field.disabled}
                              className={cn(
                                "w-full bg-philsa-bg border-none rounded-xl px-4 py-2.5 text-xs font-bold text-philsa-navy outline-none focus:ring-2 transition-all appearance-none pr-10 disabled:opacity-65 disabled:bg-gray-100/80 disabled:cursor-not-allowed",
                                formErrors[field.name] ? "ring-2 ring-philsa-red/30" : "focus:ring-philsa-navy/10"
                              )}
                              value={formData[field.name] || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                let updated = { ...formData, [field.name]: val };
                                if (field.onChange) {
                                  updated = field.onChange(val, updated);
                                }
                                setFormData(updated);
                              }}
                            >
                              <option value="">{field.placeholder || "Select an option"}</option>
                              {field.options?.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-philsa-gray">
                              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                              </svg>
                            </div>
                          </div>
                        ) : field.type === 'textarea' ? (
                          <textarea
                            rows={2}
                            placeholder={field.placeholder}
                            className={cn(
                              "w-full bg-philsa-bg border-none rounded-xl px-4 py-2.5 text-xs font-bold text-philsa-navy outline-none focus:ring-2 transition-all resize-none",
                              formErrors[field.name] ? "ring-2 ring-philsa-red/30" : "focus:ring-philsa-navy/10"
                            )}
                            value={formData[field.name] || ''}
                            onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                          />
                        ) : field.type === 'toggle' ? (
                          <div className="flex items-center gap-3 py-1 animate-fadeIn">
                             <button
                               type="button"
                               onClick={() => setFormData({ ...formData, [field.name]: !formData[field.name] })}
                               className={cn("w-10 h-5.5 rounded-full transition-all relative outline-none", formData[field.name] ? "bg-green-500" : "bg-slate-200")}
                             >
                                <div className={cn("w-3.5 h-3.5 bg-white rounded-full absolute top-[4px] transition-all", formData[field.name] ? "right-[4px]" : "left-[4px]")}></div>
                             </button>
                             <span className="text-xs font-bold text-philsa-navy">{formData[field.name] ? 'Active' : 'Inactive'}</span>
                          </div>
                        ) : null}

                        {formErrors[field.name] && (
                          <p className="text-[10px] font-extrabold text-philsa-red">{formErrors[field.name]}</p>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-3">
                     <div className="p-1.5 bg-white rounded-lg border border-slate-200 text-philsa-navy flex-shrink-0">
                        <AlertCircle className="w-4 h-4" />
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-philsa-navy mb-0.5 uppercase tracking-widest">Audit Event Trail</p>
                        <p className="text-[10px] leading-relaxed text-philsa-gray font-semibold">
                          This submission will automatically log your administrative identifier. All system records are verified continuously.
                        </p>
                     </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-philsa-border/60 flex gap-3 justify-end items-center">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 bg-white border border-philsa-border rounded-xl text-xs font-bold text-philsa-navy hover:bg-slate-100 transition-all uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-philsa-navy text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-philsa-navy/10 hover:bg-slate-900 transition-all"
                  >
                    {editingRow ? 'Save Changes' : 'Submit Entry'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Upload Modal */}
      <AnimatePresence>
        {isBulkUploadOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBulkUploadOpen(false)}
              className="absolute inset-0 bg-philsa-navy/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden p-10"
            >
              <div className="flex justify-between items-start mb-8">
                <div>
                   <h2 className="text-2xl font-black text-philsa-navy mb-1">Bulk Integration</h2>
                   <p className="text-sm font-medium text-philsa-gray">Import multiple records using official templates.</p>
                </div>
                <button onClick={() => setIsBulkUploadOpen(false)} className="p-2 hover:bg-philsa-bg rounded-lg transition-colors">
                   <X className="w-5 h-5 text-philsa-gray" />
                </button>
              </div>

              <div className="space-y-8">
                <div className="bg-philsa-bg/50 border border-dashed border-philsa-border rounded-3xl p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-philsa-bg transition-colors group">
                   <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center border border-philsa-border mb-4 group-hover:scale-110 transition-transform">
                      <Upload className="w-8 h-8 text-philsa-navy" />
                   </div>
                   <p className="text-sm font-bold text-philsa-navy mb-1">Click to upload or drag & drop</p>
                   <p className="text-[10px] font-bold text-philsa-gray uppercase tracking-widest">Supports: {bulkUpload?.allowedTypes.join(', ')}</p>
                </div>

                <div className="flex flex-col gap-4">
                   <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-white rounded-xl border border-slate-200 flex items-center justify-center text-philsa-navy">
                            <Download className="w-4 h-4" />
                         </div>
                         <div>
                            <p className="text-xs font-black text-philsa-navy mb-0.5">Official Template</p>
                            <p className="text-[10px] font-bold text-philsa-gray uppercase tracking-tighter">XLSX • 142KB</p>
                         </div>
                      </div>
                      <a href={bulkUpload?.templateUrl} className="text-[10px] font-black text-philsa-red hover:underline uppercase tracking-widest">Download</a>
                   </div>
                </div>

                <div className="pt-4">
                   <button
                     disabled
                     className="w-full py-4 bg-philsa-navy text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-philsa-navy/20 disabled:opacity-50"
                   >
                     Initialize Validation
                   </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatusBadge({ status, isApproval }: { status: string; isApproval?: boolean }) {
  const configs: Record<string, { bg: string; text: string; border: string; icon: any }> = {
    'Active': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-100', icon: CheckCircle2 },
    'Inactive': { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-100', icon: AlertCircle },
    'Approved': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100', icon: CheckCircle2 },
    'Pending Approval': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100', icon: Clock },
    'Draft': { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-100', icon: Info },
    'Rejected': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-100', icon: AlertTriangle }
  };

  const config = configs[status] || configs['Draft'];

  return (
    <span className={cn(
      "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border flex items-center gap-1.5 w-fit",
      config.bg, config.text, config.border
    )}>
      <config.icon className="w-3 h-3" />
      {status}
    </span>
  );
}
