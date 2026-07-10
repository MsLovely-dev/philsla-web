import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  Eye,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  X,
  FileText,
  Check,
  Building,
  ArrowRight,
  TrendingUp,
  History,
  Info,
  ExternalLink,
  Lock,
  Download,
  CheckSquare,
  AlertOctagon,
  ChevronRight,
  Sparkles,
  RefreshCw
} from "lucide-react";
import { cn } from "../../lib/utils";
import { usePhilSA } from "../../PhilSAContext";
import { useMockData } from "../../services/mockService";
import { motion, AnimatePresence } from "motion/react";

interface Appeal {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  category: "INTEGRITY_FLAG" | "TECHNICAL_DISRUPTION" | "APPLICATION_REJECTION";
  originalCaseId: string; // INC id or CAND id
  originalDetails: string;
  studentStatement: string;
  evidenceName: string;
  evidenceUrl: string;
  filedTime: string;
  status: "PENDING" | "GRANTED" | "DENIED" | "ESCALATED";
  adminRemarks?: string;
  reviewedTime?: string;
  reviewedBy?: string;
}

const INITIAL_APPEALS: Appeal[] = [
  {
    id: "APP-2026-101",
    studentId: "ST-001",
    studentName: "Juan Carlos Villanueva",
    studentEmail: "juan.villanueva@science.edu.ph",
    category: "INTEGRITY_FLAG",
    originalCaseId: "INC-2026-001",
    originalDetails: "Manual Ref Flag: Caught referencing paper study notes on desk during essay. Proctor issued warning.",
    studentStatement: "The paper in question was NOT a study note, but rather the printed room assignment guidelines and testing center instructions which I held up to verify my seat code. I tried explaining this to the proctor, but they registered the flag immediately. You can review the video recording—it shows there are no formulas or exam content on the paper.",
    evidenceName: "Room_Assignment_Guide.pdf",
    evidenceUrl: "https://images.unsplash.com/photo-1581090700227-13cf6158585f?w=600&q=80",
    filedTime: "2026-05-16 14:35",
    status: "PENDING"
  },
  {
    id: "APP-2026-102",
    studentId: "ST-002",
    studentName: "Maria Cristina Santos",
    studentEmail: "stud2waitingexam@philsa.edu.ph",
    category: "INTEGRITY_FLAG",
    originalCaseId: "INC-2026-002",
    originalDetails: "Tab Switching: Auto-flagged for navigating away from the secure exam tab 5 consecutive times.",
    studentStatement: "My operating system had background alerts popping up from my antivirus system during the exam. I did not intentionally change tabs; the windows popped over the screen and stole the browser focus. I have attached my system logs showing the antivirus alert timestamps matching the exact seconds of the flags.",
    evidenceName: "Antivirus_Focus_Logs.txt",
    evidenceUrl: "https://images.unsplash.com/photo-1542744094-3a31f103e35f?w=600&q=80",
    filedTime: "2026-05-16 11:12",
    status: "PENDING"
  },
  {
    id: "APP-2026-103",
    studentId: "CAND-2026-8801",
    studentName: "Jose Miguel Puno",
    studentEmail: "stud1resubmit@philsa.edu.ph",
    category: "APPLICATION_REJECTION",
    originalCaseId: "CAND-2026-8801",
    originalDetails: "Eligibility Rejection: Transcripts/Form 137 rejected as blurry and completely illegible.",
    studentStatement: "I apologize for the original low-quality photo submission. I have now secured the certified true copy from my high school registrar and scanned it with a professional digital scanner at 300 DPI. I kindly request a re-evaluation of my scholarship application.",
    evidenceName: "Form_137_HighRes_Scan.pdf",
    evidenceUrl: "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=600&q=80",
    filedTime: "2026-05-15 09:20",
    status: "PENDING"
  },
  {
    id: "APP-2026-104",
    studentId: "ST-003",
    studentName: "Enrique S. Gatus",
    studentEmail: "enrique.gatus@up.edu.ph",
    category: "TECHNICAL_DISRUPTION",
    originalCaseId: "sch1-A03-Device",
    originalDetails: "Device Readiness Failed: Battery health under 20% limit, running an outdated OS build.",
    studentStatement: "I was not able to upgrade my operating system before the pre-verification, resulting in a device failure. I have now upgraded my laptop to macOS Sequoia and bought an external power bank to guarantee a constant charge during the live exam. Please re-run my hardware compatibility check.",
    evidenceName: "OS_Update_Confirmation.png",
    evidenceUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&q=80",
    filedTime: "2026-05-14 17:40",
    status: "GRANTED",
    adminRemarks: "Hardware upgrade verified. Device compatibility status updated to APPROVED.",
    reviewedTime: "2026-05-15 10:10",
    reviewedBy: "Admin Soriano"
  }
];

export default function AdminAppeals() {
  const { addAuditLog } = usePhilSA();
  const { applications, setApplications } = useMockData();
  const [selectedAppeal, setSelectedAppeal] = useState<Appeal | null>(null);

  // Load state from localStorage or seed
  const [appeals, setAppeals] = useState<Appeal[]>(() => {
    const saved = localStorage.getItem("philsa_appeals");
    return saved ? JSON.parse(saved) : INITIAL_APPEALS;
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [adminRemarksText, setAdminRemarksText] = useState("");
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Sync back to localStorage
  useEffect(() => {
    localStorage.setItem("philsa_appeals", JSON.stringify(appeals));
  }, [appeals]);

  // Sync application updates when appeals are granted/denied
  const handleReviewDecision = (appealId: string, decision: "GRANTED" | "DENIED" | "ESCALATED") => {
    const remarks = adminRemarksText.trim() || `No additional remarks provided.`;
    
    // Update Appeal Status
    const updatedAppeals = appeals.map((a) => {
      if (a.id === appealId) {
        return {
          ...a,
          status: decision,
          adminRemarks: remarks,
          reviewedTime: new Date().toISOString().replace("T", " ").substring(0, 16),
          reviewedBy: "System Administrator"
        };
      }
      return a;
    });
    setAppeals(updatedAppeals);

    const targetAppeal = appeals.find((a) => a.id === appealId);
    if (!targetAppeal) return;

    // ACTUALLY MODIFY THE COHESIVE SYSTEM RECORDS
    // 1. Update the student application if it is a application rejection appeal
    if (targetAppeal.category === "APPLICATION_REJECTION") {
      setApplications((prev) =>
        prev.map((app) => {
          if (app.id === targetAppeal.originalCaseId || app.userId === targetAppeal.studentId) {
            return {
              ...app,
              status: decision === "GRANTED" ? "ACCEPTED" : "FOR_CORRECTION",
              adminRemarks: `Appeal ${decision}: ${remarks}`
            };
          }
          return app;
        })
      );
    }

    // 2. Update Incident status if it is an Integrity Flag Dispute
    if (targetAppeal.category === "INTEGRITY_FLAG") {
      const savedIncidents = localStorage.getItem("philsa_incidents");
      if (savedIncidents) {
        try {
          const incidentsList = JSON.parse(savedIncidents);
          const updatedIncidents = incidentsList.map((inc: any) => {
            if (inc.id === targetAppeal.originalCaseId) {
              return {
                ...inc,
                status: decision === "GRANTED" ? "RESOLVED" : "ESCALATED",
                reason: inc.reason + ` [Appeal Review: ${decision}. Admin Remarks: ${remarks}]`
              };
            }
            return inc;
          });
          localStorage.setItem("philsa_incidents", JSON.stringify(updatedIncidents));
        } catch (e) {
          console.error("Error updating synced incident", e);
        }
      }

      // If flag is granted (pardoned), we can update the student application state to ACTIVE/ACCEPTED
      if (decision === "GRANTED") {
        setApplications((prev) =>
          prev.map((app) => {
            if (app.userId === targetAppeal.studentId) {
              return {
                ...app,
                examStatus: "SUBMITTED" // restore status from Terminated
              };
            }
            return app;
          })
        );
      }
    }

    // Log the audit event
    addAuditLog(
      "APPEAL_DECISION",
      `System Admin ${decision} appeal ${appealId} for Candidate ${targetAppeal.studentName} (${targetAppeal.studentId}). Remarks: ${remarks}`
    );

    // Provide UI Toast Feedback
    setToastMessage(`Appeal ${appealId} has been successfully ${decision.toLowerCase()}`);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3500);

    // Reset details panel and state
    setSelectedAppeal(null);
    setAdminRemarksText("");
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case "INTEGRITY_FLAG":
        return "Integrity Flag Dispute";
      case "TECHNICAL_DISRUPTION":
        return "Technical/Device Disruption";
      case "APPLICATION_REJECTION":
        return "Eligibility Rejection Appeal";
      default:
        return cat;
    }
  };

  const filteredAppeals = appeals
    .filter((a) => {
      const query = searchQuery.toLowerCase().trim();
      if (!query) return true;
      return (
        a.id.toLowerCase().includes(query) ||
        a.studentName.toLowerCase().includes(query) ||
        a.studentId.toLowerCase().includes(query) ||
        a.studentEmail.toLowerCase().includes(query) ||
        a.originalCaseId.toLowerCase().includes(query)
      );
    })
    .filter((a) => {
      if (categoryFilter === "ALL") return true;
      return a.category === categoryFilter;
    })
    .filter((a) => {
      if (statusFilter === "ALL") return true;
      return a.status === statusFilter;
    });

  const stats = {
    total: appeals.length,
    pending: appeals.filter((a) => a.status === "PENDING").length,
    granted: appeals.filter((a) => a.status === "GRANTED").length,
    denied: appeals.filter((a) => a.status === "DENIED").length,
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Toast */}
      <AnimatePresence>
        {showSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-8 right-8 z-[11000] bg-philsa-navy text-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 font-semibold border border-philsa-border"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <div>
              <p className="text-sm font-bold">Decision Logged</p>
              <p className="text-xs text-slate-300 font-medium">{toastMessage}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-philsa-navy tracking-tight leading-none mb-3">
            Student Appeals Workspace
          </h1>
          <p className="text-philsa-gray font-medium max-w-3xl">
            Triage, investigate, and review formal disputes filed by candidates contesting academic integrity flags, eligibility rejections, or hardware system issues.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest bg-philsa-bg px-4 py-2.5 rounded-xl border border-philsa-border">
          <History className="w-4 h-4 text-philsa-red animate-spin-slow" />
          <span>Real-time Sync Active</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-3xl border border-philsa-border p-6 shadow-sm flex flex-col justify-between">
          <p className="text-[10px] font-black text-philsa-gray uppercase tracking-widest mb-4">Total Appeals Filed</p>
          <div className="flex items-end justify-between">
            <span className="text-4xl font-black text-philsa-navy">{stats.total}</span>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-bold">LIFETIME</span>
          </div>
        </div>
        <div className="bg-white rounded-3xl border border-philsa-border p-6 shadow-sm flex flex-col justify-between">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Pending Review</p>
          <div className="flex items-end justify-between">
            <span className="text-4xl font-black text-amber-500">{stats.pending}</span>
            <span className="text-[10px] bg-amber-50 text-amber-600 px-2.5 py-1 rounded-md font-bold uppercase tracking-wider">Awaiting</span>
          </div>
        </div>
        <div className="bg-white rounded-3xl border border-philsa-border p-6 shadow-sm flex flex-col justify-between">
          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-4">Appeals Granted</p>
          <div className="flex items-end justify-between">
            <span className="text-4xl font-black text-emerald-600">{stats.granted}</span>
            <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-md font-bold uppercase tracking-wider">Pardoned</span>
          </div>
        </div>
        <div className="bg-white rounded-3xl border border-philsa-border p-6 shadow-sm flex flex-col justify-between">
          <p className="text-[10px] font-black text-philsa-red uppercase tracking-widest mb-4">Appeals Denied</p>
          <div className="flex items-end justify-between">
            <span className="text-4xl font-black text-philsa-red">{stats.denied}</span>
            <span className="text-[10px] bg-red-50 text-philsa-red px-2.5 py-1 rounded-md font-bold uppercase tracking-wider">Maintained</span>
          </div>
        </div>
      </div>

      {/* Workspace Controls */}
      <div className="bg-white rounded-3xl border border-philsa-border p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-philsa-gray" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name, email, appeal ID, case ID..."
              className="w-full bg-philsa-bg border border-philsa-border rounded-xl pl-11 pr-4 py-3 text-xs font-semibold focus:ring-2 focus:ring-philsa-red/10 outline-none transition-all text-philsa-navy"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 bg-philsa-bg border border-philsa-border rounded-xl px-3.5 py-2.5">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-transparent border-none text-[10px] font-bold text-philsa-navy uppercase tracking-wider outline-none cursor-pointer"
              >
                <option value="ALL">All Categories</option>
                <option value="INTEGRITY_FLAG">Integrity Flags</option>
                <option value="TECHNICAL_DISRUPTION">Tech Disruptions</option>
                <option value="APPLICATION_REJECTION">Eligibility Appeals</option>
              </select>
            </div>

            <div className="flex items-center gap-2 bg-philsa-bg border border-philsa-border rounded-xl px-3.5 py-2.5">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent border-none text-[10px] font-bold text-philsa-navy uppercase tracking-wider outline-none cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending Review</option>
                <option value="GRANTED">Granted (Cleared)</option>
                <option value="DENIED">Denied (Rejected)</option>
                <option value="ESCALATED">Escalated</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Appeals List Layout */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Appeals Table */}
        <div className="lg:col-span-2 space-y-4">
          {filteredAppeals.length === 0 ? (
            <div className="bg-white rounded-3xl border border-philsa-border text-center py-20 px-6 space-y-4 shadow-sm">
              <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-philsa-navy">No Appeals Found</h3>
                <p className="text-xs text-philsa-gray max-w-sm mx-auto">
                  There are no submitted appeals matching the currently applied search queries or status filters.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-philsa-border overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-philsa-bg border-b border-philsa-border text-[9px] text-philsa-gray font-black uppercase tracking-widest">
                    <tr>
                      <th className="px-6 py-4">Appeal ID</th>
                      <th className="px-6 py-4">Candidate Info</th>
                      <th className="px-6 py-4">Dispute Category</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-philsa-border">
                    {filteredAppeals.map((appeal) => (
                      <tr
                        key={appeal.id}
                        onClick={() => {
                          setSelectedAppeal(appeal);
                          setAdminRemarksText(appeal.adminRemarks || "");
                        }}
                        className={cn(
                          "hover:bg-philsa-bg/30 transition-all cursor-pointer group",
                          selectedAppeal?.id === appeal.id ? "bg-philsa-bg/50" : ""
                        )}
                      >
                        <td className="px-6 py-5">
                          <p className="text-xs font-black text-philsa-navy">{appeal.id}</p>
                          <p className="text-[9px] text-philsa-gray font-medium uppercase tracking-wider">{appeal.filedTime}</p>
                        </td>
                        <td className="px-6 py-5">
                          <p className="text-xs font-bold text-philsa-navy group-hover:text-philsa-red transition-colors">
                            {appeal.studentName}
                          </p>
                          <p className="text-[9px] text-philsa-gray font-bold tracking-tight uppercase">
                            ID: {appeal.studentId}
                          </p>
                        </td>
                        <td className="px-6 py-5">
                          <p className="text-xs font-semibold text-philsa-navy">
                            {getCategoryLabel(appeal.category)}
                          </p>
                          <p className="text-[9px] text-slate-400 font-mono">
                            Case: {appeal.originalCaseId}
                          </p>
                        </td>
                        <td className="px-6 py-5">
                          <span
                            className={cn(
                              "px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-wider border",
                              appeal.status === "GRANTED"
                                ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                : appeal.status === "DENIED"
                                  ? "bg-red-50 text-philsa-red border-red-100"
                                  : appeal.status === "ESCALATED"
                                    ? "bg-purple-50 text-purple-600 border-purple-100"
                                    : "bg-amber-50 text-amber-600 border-amber-100"
                            )}
                          >
                            {appeal.status}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <button className="p-2 bg-philsa-bg text-philsa-navy rounded-lg group-hover:bg-philsa-red group-hover:text-white transition-all cursor-pointer">
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Column: side-by-side comparative analysis workspace */}
        <div className="lg:col-span-1">
          <AnimatePresence mode="wait">
            {selectedAppeal ? (
              <motion.div
                key={selectedAppeal.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="bg-white rounded-3xl border-2 border-philsa-navy/10 p-6 shadow-xl space-y-6 flex flex-col justify-between"
              >
                {/* Header */}
                <div className="border-b border-philsa-border pb-4 flex justify-between items-start">
                  <div>
                    <span className="inline-block px-2 py-0.5 bg-philsa-navy text-white text-[8px] font-black uppercase rounded-md tracking-widest mb-2">
                      CASE WORKSPACE
                    </span>
                    <h2 className="text-lg font-black text-philsa-navy tracking-tight uppercase leading-none">
                      Review Appeal
                    </h2>
                    <p className="text-[10px] text-philsa-gray font-black uppercase tracking-widest mt-2">
                      {selectedAppeal.id} — Candidate Audit
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedAppeal(null)}
                    className="p-1 hover:bg-philsa-bg rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-philsa-gray" />
                  </button>
                </div>

                {/* Candidate Info */}
                <div className="space-y-4 text-xs font-semibold">
                  <div className="p-4 bg-philsa-bg border border-philsa-border rounded-2xl">
                    <p className="text-[8px] font-black text-philsa-gray uppercase tracking-widest mb-1.5">Candidate</p>
                    <p className="text-sm font-black text-philsa-navy">{selectedAppeal.studentName}</p>
                    <p className="text-[9px] text-philsa-gray">{selectedAppeal.studentEmail}</p>
                    <p className="text-[9px] text-slate-400 mt-1">Student System ID: {selectedAppeal.studentId}</p>
                  </div>

                  {/* SIDE-BY-SIDE: Original Decision vs Appeal Statement */}
                  <div className="space-y-4">
                    {/* ORIGINAL CASE INFORMATION */}
                    <div className="p-4 border border-red-100 bg-red-50/20 rounded-2xl relative overflow-hidden">
                      <div className="absolute top-2 right-2 flex items-center gap-1 text-[8px] font-black text-philsa-red uppercase">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Original Action</span>
                      </div>
                      <p className="text-[8px] font-black text-philsa-gray uppercase tracking-widest mb-1">
                        Case: {selectedAppeal.originalCaseId}
                      </p>
                      <p className="text-[10px] text-philsa-navy font-bold leading-normal italic">
                        "{selectedAppeal.originalDetails}"
                      </p>
                    </div>

                    {/* CANDIDATE WRITTEN APPEAL STATEMENT */}
                    <div className="p-4 border border-emerald-100 bg-emerald-50/10 rounded-2xl relative overflow-hidden">
                      <div className="absolute top-2 right-2 flex items-center gap-1 text-[8px] font-black text-emerald-600 uppercase">
                        <Sparkles className="w-3 h-3 text-emerald-500" />
                        <span>Student Dispute</span>
                      </div>
                      <p className="text-[8px] font-black text-philsa-gray uppercase tracking-widest mb-1">
                        Candidate Justification
                      </p>
                      <p className="text-[10px] text-slate-700 font-medium leading-relaxed">
                        {selectedAppeal.studentStatement}
                      </p>

                      {/* Attached Document Proof Simulator */}
                      {selectedAppeal.evidenceName && (
                        <div className="mt-4 pt-3 border-t border-emerald-100/30">
                          <p className="text-[8px] font-black text-philsa-gray uppercase tracking-widest mb-1.5">
                            Attached Supporting Document
                          </p>
                          <div className="flex items-center justify-between p-2.5 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span className="text-[9px] font-bold text-emerald-800 truncate max-w-[130px]">
                                {selectedAppeal.evidenceName}
                              </span>
                            </div>
                            <button
                              onClick={() => alert(`Simulating Secure Download: Retrieving "${selectedAppeal.evidenceName}" decrypted from secure storage servers...`)}
                              className="p-1 bg-white hover:bg-emerald-100 rounded-lg text-emerald-600 transition-colors border border-emerald-100 cursor-pointer"
                            >
                              <Download className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* DECISION ACTION INTERFACE */}
                <div className="space-y-4 pt-4 border-t border-philsa-border">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-philsa-gray uppercase tracking-widest">
                      Decision Remarks & Justification *
                    </label>
                    <textarea
                      required
                      value={adminRemarksText}
                      onChange={(e) => setAdminRemarksText(e.target.value)}
                      placeholder="Input formal resolution reasoning. This statement is dispatched immediately to the student's personal portal..."
                      rows={3}
                      className="w-full bg-philsa-bg border border-philsa-border rounded-xl px-3.5 py-2 text-xs font-semibold focus:ring-2 focus:ring-philsa-red/10 outline-none transition-all placeholder:text-philsa-gray/30 text-philsa-navy resize-none"
                    />
                  </div>

                  {selectedAppeal.status === "PENDING" ? (
                    <div className="space-y-2">
                      <div className="flex gap-2.5">
                        <button
                          onClick={() => handleReviewDecision(selectedAppeal.id, "GRANTED")}
                          className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 shadow-lg shadow-emerald-500/10 transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" /> Approve & Clear
                        </button>
                        <button
                          onClick={() => handleReviewDecision(selectedAppeal.id, "DENIED")}
                          className="flex-1 py-3 bg-philsa-red text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 shadow-lg shadow-philsa-red/10 transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" /> Reject Appeal
                        </button>
                      </div>
                      <button
                        onClick={() => handleReviewDecision(selectedAppeal.id, "ESCALATED")}
                        className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[9px] font-black uppercase tracking-widest border border-slate-200 transition-all cursor-pointer"
                      >
                        Escalate for Human Arbitration
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Decision finalized</p>
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest",
                            selectedAppeal.status === "GRANTED"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-red-100 text-philsa-red"
                          )}
                        >
                          {selectedAppeal.status}
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold">{selectedAppeal.reviewedTime}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 italic">Remarks: "{selectedAppeal.adminRemarks}"</p>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="bg-philsa-bg border-2 border-dashed border-philsa-border rounded-3xl p-10 text-center space-y-4">
                <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-philsa-border flex items-center justify-center mx-auto text-philsa-gray">
                  <Info className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-philsa-navy uppercase tracking-wider">Select an Appeal</h3>
                  <p className="text-[10px] text-philsa-gray max-w-xs mx-auto mt-1 leading-relaxed">
                    Click on any candidate appeal record from the directory to review written statements, secure log logs, and launch comparative analysis.
                  </p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
