import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  Eye,
  Search,
  Filter,
  Download,
  ExternalLink,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  User,
  FileText,
  MousePointer2,
  Monitor,
  Camera,
  Shield,
  Flag,
  MoreVertical,
  LayoutGrid,
  List,
  TrendingUp,
  Activity,
  PlayCircle,
  Archive,
  PlusCircle,
} from "lucide-react";
import { cn } from "../lib/utils";
import { usePhilSA } from "../PhilSAContext";
import { Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";

const INITIAL_INCIDENTS = [
  {
    id: "INC-2026-001",
    student: "Juan P. Pangilinan",
    type: "Manual Ref Flag",
    severity: "HIGH",
    time: "2026-05-15 10:15",
    status: "PENDING",
    univ: "UP Diliman",
    reason:
      "The candidate was caught referencing physical study notes on top of their desk during the essay portion. Proctor issued warning and logged screenshot.",
    proofName: "Mobile_Ref_Capture.png",
    screenshot:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&q=80",
  },
  {
    id: "INC-2026-002",
    student: "Maria Elena Soriano",
    type: "Tab Switching",
    severity: "MEDIUM",
    time: "2026-05-15 11:02",
    status: "RESOLVED",
    univ: "UST Manila",
    reason:
      "System automatically flagged candidate for tab switching activity. Candidate navigated away from the secure exam tab 5 consecutive times.",
    proofName: "Secure_Browser_Logs.txt",
    screenshot:
      "https://images.unsplash.com/photo-1542744094-3a31f103e35f?w=600&q=80",
  },
  {
    id: "INC-2026-003",
    student: "Ricardo M. Silva",
    type: "External Device",
    severity: "CRITICAL",
    time: "2026-05-14 09:45",
    status: "ESCALATED",
    univ: "DLSU Manila",
    reason:
      "Secondary video stream feed showed a secondary smartphone active on holder to the right side of the main laptop screen.",
    proofName: "Phone_In_Use_Evidence.jpeg",
    screenshot:
      "https://images.unsplash.com/photo-1581090700227-13cf6158585f?w=600&q=80",
  },
  {
    id: "INC-2026-004",
    student: "Liza Monica Bautista",
    type: "Communication",
    severity: "LOW",
    time: "2026-05-14 14:22",
    status: "PENDING",
    univ: "PUP Manila",
    reason:
      "Low volume secondary whisper voices detected in candidate surroundings during the engineering math section.",
    proofName: "Audio_Spectral_Log.wav",
    screenshot:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&q=80",
  },
  {
    id: "INC-2026-005",
    student: "Federico T. Guzman",
    type: "Unauthorized Material",
    severity: "HIGH",
    time: "2026-05-13 15:10",
    status: "PENDING",
    univ: "UP Diliman",
    reason:
      "Candidate printed formulas sheet taped to the back of their hand was visible when holding their ID card for secondary verification.",
    proofName: "Cheat_Sheet_Capture.png",
    screenshot:
      "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=600&q=80",
  },
];

export default function IncidentEvidence() {
  const { user } = usePhilSA();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedIncident, setSelectedIncident] = useState<any>(null);

  // Dynamic Incidents state initialized from localStorage if available
  const [incidents, setIncidents] = useState<any[]>(() => {
    const saved = localStorage.getItem("philsa_incidents");
    return saved ? JSON.parse(saved) : INITIAL_INCIDENTS;
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // New Case Form state
  const [formStudent, setFormStudent] = useState("");
  const [formUniv, setFormUniv] = useState("UP Diliman");
  const [formType, setFormType] = useState("Tab Switching");
  const [formSeverity, setFormSeverity] = useState("HIGH");
  const [formStatus, setFormStatus] = useState("PENDING");
  const [formReason, setFormReason] = useState("");
  const [formProofName, setFormProofName] = useState("");
  const [formScreenshot, setFormScreenshot] = useState("");

  // Sync state with localStorage
  useEffect(() => {
    localStorage.setItem("philsa_incidents", JSON.stringify(incidents));
  }, [incidents]);

  const isUnivAdmin = user?.role === "UNIVERSITY_ADMIN";

  // Filter by both University Admin permissions and search query
  const filteredIncidents = incidents
    .filter((i) => {
      if (isUnivAdmin) {
        const adminUnivFirstWord =
          user?.university?.split(" ")[0]?.toLowerCase() || "";
        return i.univ.toLowerCase().includes(adminUnivFirstWord);
      }
      return true;
    })
    .filter((i) => {
      const query = searchQuery.toLowerCase().trim();
      if (!query) return true;
      return (
        i.id.toLowerCase().includes(query) ||
        i.student.toLowerCase().includes(query) ||
        i.type.toLowerCase().includes(query) ||
        i.univ.toLowerCase().includes(query)
      );
    });

  // Handle creating new case
  const handleCreateCase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formStudent.trim()) return;

    // Determine high counter for ID generation
    const lastNum = incidents.reduce((max, item) => {
      const match = item.id.match(/INC-2026-(\d+)/);
      if (match) {
        const num = parseInt(match[1]);
        return num > max ? num : max;
      }
      return max;
    }, 5);

    const nextNum = String(lastNum + 1).padStart(3, "0");
    const newId = `INC-2026-${nextNum}`;

    // Get current formatted date: "2026-05-21 15:51"
    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const newCase = {
      id: newId,
      student: formStudent,
      type: formType,
      severity: formSeverity,
      time: formattedDate,
      status: "PENDING",
      univ: formUniv,
      reason: formReason,
      proofName: formProofName || undefined,
      screenshot:
        formScreenshot ||
        (formProofName
          ? "https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=600&q=80"
          : undefined),
    };

    setIncidents([newCase, ...incidents]);

    // Reset Form
    setFormStudent("");
    setFormUniv("UP Diliman");
    setFormType("Tab Switching");
    setFormSeverity("HIGH");
    setFormStatus("PENDING");
    setFormReason("");
    setFormProofName("");
    setFormScreenshot("");

    // Close Modal and Show Toast
    setIsCreateModalOpen(false);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 4000);
  };

  const resetToDefault = () => {
    if (window.confirm("Reset incident records list back to defaults?")) {
      setIncidents(INITIAL_INCIDENTS);
      localStorage.removeItem("philsa_incidents");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Toast Notification */}
      <AnimatePresence>
        {showSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-8 right-8 z-[100] bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 font-semibold border border-emerald-500"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-100" />
            <div>
              <p className="text-sm font-bold">Case Created Successfully</p>
              <p className="text-xs text-emerald-100 font-medium">
                New incident record added to audit active list.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-philsa-navy tracking-tight leading-none mb-3 mt-3">
            Incident Records
          </h1>
          <p className="text-philsa-gray font-medium max-w-2xl">
            Review reported examination violations and documented evidence of
            integrity breaches.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-6 py-3 bg-philsa-red text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-philsa-red/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" /> Create Case
          </button>
          <button className="px-6 py-3 bg-philsa-navy text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-philsa-navy/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
            <Download className="w-4 h-4" /> Export logs
          </button>
        </div>
      </div>

      {/* Manual Case Queue */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-philsa-gray" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name, ID, violation type..."
              className="w-full bg-white border border-philsa-border rounded-2xl pl-12 pr-4 py-4 text-sm font-medium focus:ring-2 focus:ring-philsa-red/20 outline-none shadow-sm transition-all text-philsa-navy"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-philsa-gray hover:text-philsa-red transition-colors text-xs font-bold"
              >
                Clear
              </button>
            )}
          </div>
          <div className="flex gap-3 shrink-0 w-full md:w-auto">
            <button className="btn-secondary h-14 px-6 flex items-center gap-2 w-full md:w-auto justify-center">
              <Filter className="w-4 h-4" /> Filter Advanced
            </button>
          </div>
        </div>

        {/* Empty State */}
        {filteredIncidents.length === 0 ? (
          <div className="card-philsa text-center py-20 divide-y-0 space-y-4">
            <div className="w-20 h-20 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <ShieldAlert className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-philsa-navy mb-1">
                No Incidents Found
              </h3>
              <p className="text-sm text-philsa-gray max-w-sm mx-auto">
                There are no reported incident records matching "{searchQuery}".
                Try modifying your search filter.
              </p>
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs uppercase tracking-widest mt-2"
              >
                Clear search filters
              </button>
            )}
          </div>
        ) : (
          <div className="card-philsa !p-0 overflow-hidden shadow-2xl shadow-philsa-navy/5">
            <table className="w-full text-left">
              <thead className="bg-philsa-bg/50 text-[10px] text-philsa-gray font-black uppercase tracking-widest border-b border-philsa-border">
                <tr>
                  <th className="px-10 py-6">Incident ID</th>
                  <th className="px-10 py-6">Student Information</th>
                  <th className="px-10 py-6">Violation Type</th>
                  <th className="px-10 py-6">Severity</th>
                  <th className="px-10 py-6">Review Status</th>
                  <th className="px-10 py-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-philsa-border">
                {filteredIncidents.map((incident) => (
                  <tr
                    key={incident.id}
                    className="hover:bg-philsa-bg/30 transition-colors group"
                  >
                    <td className="px-10 py-7">
                      <div>
                        <p className="text-sm font-black text-philsa-navy tracking-tight">
                          {incident.id}
                        </p>
                        <p className="text-[10px] text-philsa-gray font-black uppercase tracking-widest">
                          {incident.time}
                        </p>
                      </div>
                    </td>
                    <td className="px-10 py-7">
                      <p className="text-sm font-bold text-philsa-navy">
                        {incident.student}
                      </p>
                      <p className="text-[10px] text-philsa-gray font-bold uppercase tracking-widest">
                        {incident.univ}
                      </p>
                    </td>
                    <td className="px-10 py-7">
                      <p className="text-xs font-bold text-philsa-navy uppercase tracking-tight">
                        {incident.type}
                      </p>
                    </td>
                    <td className="px-10 py-7">
                      <span
                        className={cn(
                          "px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 w-fit border",
                          incident.severity === "CRITICAL"
                            ? "bg-philsa-red text-white border-philsa-red shadow-lg shadow-philsa-red/20"
                            : incident.severity === "HIGH"
                              ? "bg-red-50 text-philsa-red border-philsa-red/20"
                              : incident.severity === "MEDIUM"
                                ? "bg-amber-50 text-amber-600 border-amber-200"
                                : "bg-blue-50 text-blue-600 border-blue-200",
                        )}
                      >
                        <AlertTriangle className="w-3 h-3" />{" "}
                        {incident.severity}
                      </span>
                    </td>
                    <td className="px-10 py-7">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "w-2 h-2 rounded-full",
                            incident.status === "RESOLVED"
                              ? "bg-green-500"
                              : incident.status === "ESCALATED"
                                ? "bg-philsa-red"
                                : "bg-amber-400",
                          )}
                        />
                        <span className="text-[9px] font-black uppercase tracking-widest text-philsa-navy">
                          {incident.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-10 py-7 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedIncident(incident)}
                          className="p-3 bg-white hover:bg-philsa-bg text-philsa-navy rounded-xl transition-colors border border-philsa-border shadow-sm"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <Link
                          to={`/admin/recordings/playback/${incident.id}`}
                          className="p-3 bg-philsa-bg hover:bg-philsa-navy hover:text-white text-philsa-navy rounded-xl transition-all border border-philsa-border shadow-sm"
                        >
                          <PlayCircle className="w-5 h-5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Incident Detail Modal */}
      <AnimatePresence>
        {selectedIncident && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-philsa-navy/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col border border-philsa-border"
            >
              <div className="p-10 border-b border-philsa-border flex justify-between items-center bg-philsa-bg/30">
                <div>
                  <h2 className="text-xl font-black text-philsa-navy tracking-tight uppercase leading-none">
                    Incident <span className="text-philsa-red">Case</span>
                  </h2>
                  <p className="text-[10px] text-philsa-gray font-black uppercase tracking-widest mt-2">
                    {selectedIncident.id} — Audit Log
                  </p>
                </div>
                <button
                  onClick={() => setSelectedIncident(null)}
                  className="w-10 h-10 flex items-center justify-center hover:bg-philsa-bg rounded-full transition-all cursor-pointer"
                >
                  <X className="w-6 h-6 text-philsa-gray" />
                </button>
              </div>

              <div className="p-10 space-y-8">
                <div className="space-y-4">
                  <div className="flex justify-between items-end pb-4 border-b border-philsa-border">
                    <div>
                      <p className="text-[9px] font-black text-philsa-gray uppercase tracking-widest mb-1">
                        Student Candidate
                      </p>
                      <p className="text-lg font-black text-philsa-navy tracking-tight">
                        {selectedIncident.student}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-black text-philsa-gray uppercase tracking-widest mb-1">
                        Severity Level
                      </p>
                      <span
                        className={cn(
                          "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                          selectedIncident.severity === "CRITICAL"
                            ? "bg-philsa-red text-white"
                            : selectedIncident.severity === "HIGH"
                              ? "bg-red-50 text-philsa-red border-philsa-red/20 animate-pulse"
                              : "bg-amber-50 text-amber-700 border-amber-200",
                        )}
                      >
                        {selectedIncident.severity}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 pt-2">
                    <div>
                      <p className="text-[9px] font-black text-philsa-gray uppercase tracking-widest mb-1">
                        Institution
                      </p>
                      <p className="text-xs font-bold text-philsa-navy">
                        {selectedIncident.univ}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-philsa-gray uppercase tracking-widest mb-1">
                        Timestamp
                      </p>
                      <p className="text-xs font-bold text-philsa-navy">
                        {selectedIncident.time}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-philsa-bg rounded-[2rem] border border-philsa-border space-y-4">
                  <div>
                    <p className="text-xs text-philsa-navy font-bold leading-relaxed italic opacity-80 mb-2">
                      {" "}
                      violation: {selectedIncident.type}
                    </p>
                    <p className="text-[10px] text-philsa-gray font-medium leading-relaxed">
                      {selectedIncident.reason ||
                        `Automatic flag triggered by system behavior sensors. The candidate showed patterns of ${selectedIncident.type.toLowerCase()}. Manual audit is required to verify the integrity breach.`}
                    </p>
                  </div>
                  {selectedIncident.proofName && (
                    <div className="border-t border-philsa-border/40 pt-3">
                      <p className="text-[9px] font-black text-philsa-gray uppercase tracking-widest mb-1.5">
                        Attached Documentation / Proof
                      </p>
                      <div className="flex items-center gap-2 text-xs text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-xl w-fit">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span>{selectedIncident.proofName}</span>
                      </div>

                      {selectedIncident.screenshot && (
                        <div className="mt-4">
                          <p className="text-[9px] font-black text-philsa-gray uppercase tracking-widest mb-2">
                            Proctor Captured Screenshot Evidence
                          </p>
                          <div className="relative overflow-hidden rounded-2xl border border-philsa-border shadow-md max-h-[160px]">
                            <img
                              src={selectedIncident.screenshot}
                              alt="Screenshot Evidence"
                              className="w-full object-cover max-h-[160px]"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-md text-[8px] font-bold text-white px-2 py-0.5 rounded-md uppercase tracking-wider">
                              DESKTOP OVERVIEW CAPTURE
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setSelectedIncident(null)}
                    className="flex-1 py-4 bg-philsa-bg text-philsa-navy rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white border border-philsa-border transition-all cursor-pointer"
                  >
                    Close Entry
                  </button>
                  <Link
                    to={`/admin/recordings/playback/${selectedIncident.id}`}
                    className="flex-[1.5] py-4 bg-philsa-red text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-philsa-red/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                  >
                    <PlayCircle className="w-5 h-5 text-white/80" /> Watch
                    Evidence
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE CASE MODAL */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-philsa-navy/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-philsa-border my-auto"
            >
              <div className="px-6 py-4 border-b border-philsa-border flex justify-between items-center bg-philsa-bg/30">
                <div>
                  <h2 className="text-lg font-black text-philsa-navy tracking-tight uppercase leading-none">
                    Register{" "}
                    <span className="text-philsa-red">New Incident</span>
                  </h2>
                  <p className="text-[10px] text-philsa-gray font-black uppercase tracking-widest mt-1">
                    Manual examination override process
                  </p>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="w-8 h-8 flex items-center justify-center hover:bg-philsa-bg rounded-full transition-all cursor-pointer"
                >
                  <X className="w-5 h-5 text-philsa-gray" />
                </button>
              </div>

              <form
                onSubmit={handleCreateCase}
                className="px-6 py-4 space-y-4 max-h-[75vh] overflow-y-auto"
              >
                {/* Simplified Form: Student Name */}
                <div className="space-y-1">
                  <label className="label-philsa text-[10px] font-black uppercase text-philsa-navy tracking-wider">
                    Student Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formStudent}
                    onChange={(e) => setFormStudent(e.target.value)}
                    placeholder="e.g. Juan S. Dela Cruz"
                    className="w-full bg-philsa-bg border border-philsa-border/80 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-philsa-red/10 outline-none shadow-sm transition-all placeholder:text-philsa-gray/30 text-philsa-navy"
                  />
                </div>

                {/* Simplified Form: Violation Type */}
                <div className="space-y-1">
                  <label className="label-philsa text-[10px] font-black uppercase text-philsa-navy tracking-wider">
                    Violation Type *
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full bg-philsa-bg border border-philsa-border/80 rounded-xl px-3 py-2.5 text-xs font-bold text-philsa-navy focus:outline-hidden focus:ring-2 focus:ring-philsa-red/10 shadow-sm transition-all cursor-pointer"
                  >
                    <option value="Tab Switching">Tab Switching</option>
                    <option value="Manual Ref Flag">Manual Ref Flag</option>
                    <option value="External Device">External Device</option>
                    <option value="Communication Assistance">
                      Communication Assistance
                    </option>
                    <option value="Unauthorized Material">
                      Unauthorized Material
                    </option>
                    <option value="No Face Detected">No Face Detected</option>
                    <option value="Multiple Faces Detected">
                      Multiple Faces Detected
                    </option>
                  </select>
                </div>

                {/* Simplified Form: Reason */}
                <div className="space-y-1">
                  <label className="label-philsa text-[10px] font-black uppercase text-philsa-navy tracking-wider">
                    Reason / Description of Breach *
                  </label>
                  <textarea
                    required
                    value={formReason}
                    onChange={(e) => setFormReason(e.target.value)}
                    placeholder="Detail the circumstances, verbal warnings, or visual evidence observed..."
                    rows={2}
                    className="w-full bg-philsa-bg border border-philsa-border/80 rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-philsa-red/10 outline-none shadow-sm transition-all placeholder:text-philsa-gray/30 text-philsa-navy resize-none"
                  />
                </div>

                {/* Proctor Uploaded Screenshot Proof */}
                <div className="space-y-1">
                  <label className="label-philsa text-[10px] font-black uppercase text-philsa-navy tracking-wider">
                    Screenshot Evidence
                  </label>
                  <div
                    className="border border-dashed border-slate-200 hover:border-philsa-navy hover:bg-slate-50 rounded-xl p-4 text-center cursor-pointer transition-all relative animate-fade-in"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        const file = e.dataTransfer.files[0];
                        setFormProofName(file.name);
                        setFormScreenshot(URL.createObjectURL(file));
                      }
                    }}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          setFormProofName(file.name);
                          setFormScreenshot(URL.createObjectURL(file));
                        }
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center justify-center gap-2 pointer-events-none">
                      <Archive className="w-5 h-5 text-slate-400" />
                      <div className="text-[11px] font-bold text-slate-700">
                        {formProofName ? (
                          <span className="text-emerald-600">
                            Selected: {formProofName}
                          </span>
                        ) : (
                          <span>
                            Drag screenshot here or{" "}
                            <span className="text-philsa-navy underline">
                              browse
                            </span>
                          </span>
                        )}
                      </div>
                      <p className="text-[9px] text-slate-400 font-medium">
                        JPEG, PNG, up to 10MB
                      </p>
                    </div>
                  </div>
                </div>

                {/* Live Thumbnail Preview with simulated or custom screenshot */}
                {formProofName && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 animate-fade-in">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 flex-shrink-0">
                        <img
                          src={
                            formScreenshot ||
                            "https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=100&q=80"
                          }
                          alt="Preview"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-800 truncate max-w-[180px]">
                          {formProofName}
                        </p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase">
                          PROCTOR_DESKTOP_CAPTURE
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setFormProofName("");
                        setFormScreenshot("");
                      }}
                      className="text-[10px] text-philsa-red font-black hover:underline"
                    >
                      REMOVE
                    </button>
                  </div>
                )}

                {/* Pre-fill Quick Mock button to simplify testing */}
                {!formProofName && (
                  <button
                    type="button"
                    onClick={() => {
                      setFormProofName("proctor_desktop_capture.png");
                      setFormScreenshot(
                        "https://images.unsplash.com/photo-1542744094-3a31f103e35f?w=600&q=80",
                      );
                    }}
                    className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-[9px] font-black uppercase tracking-wider border border-slate-200 transition-all cursor-pointer"
                  >
                    ⚡ Simulate Proctor Screenshot upload
                  </button>
                )}

                <div className="p-3 bg-amber-50 rounded-xl text-[9px] text-amber-800 font-semibold border border-amber-100/60 leading-normal flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    The incident is automatically assigned to your Center with
                    HIGH severity.
                  </span>
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="flex-1 py-2.5 bg-philsa-bg text-philsa-navy rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white border border-philsa-border transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-[1.5] py-2.5 bg-philsa-red text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-philsa-red/10 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
                  >
                    Create Incident
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
