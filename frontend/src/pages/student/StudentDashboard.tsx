import React, { useEffect, useState } from "react";
import { usePhilSA } from "../../PhilSAContext";
import { useMockData } from "../../services/mockService";
import { backendApplicationService, mapBackendApplicationToFrontend, type BackendExamSlot } from "../../services/backendApplicationService";
import {
  buildAdminPreviewApplication,
  buildAdminPreviewExamSlots,
  findAdminPreviewSlot,
  getAdminPreviewSlotId,
  setAdminPreviewSlotId,
} from "../../services/adminPreviewApplication";
import type { Application } from "../../types";
import {
  FileText,
  Shield,
  Clock,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Upload,
  AlertTriangle,
  Play,
  BookOpen,
  Award,
  FileCheck,
  Download,
  Calendar,
  MapPin,
  User,
  Camera,
  Mic,
  Wifi,
  Maximize,
  Cpu,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/utils";
import { Logo } from "../../components/Logo";

// --- SUB-COMPONENTS ---

const REQUIRED_CORRECTION_LABELS: Record<string, string> = {
  gradeRecordsUrl: "Form 137",
  photoUrl: "ID Photo",
};

// Real requiredCorrections/adminRemarks come from the application record
// (backend-mode: the real API; mock-mode: the mock array) -- both already
// correct. The actual fix flow is StudentApplication.tsx's existing,
// already-backend-connected "Open Form for Correction" wizard; this card's
// job is just to surface what's wrong and send the student there, rather
// than duplicate a second, parallel upload implementation here.
function RequirementsUploader({ app }: { app: any }) {
  const corrections: string[] = app.requiredCorrections ?? [];

  return (
    <div className="card-philsa p-5 sm:p-8">
      <div className="mb-8">
        <h3 className="text-xl font-extrabold text-philsa-navy mb-1">
          Admission Requirements
        </h3>
        <p className="text-xs font-bold text-philsa-gray uppercase tracking-widest">
          Verify your eligibility
        </p>
      </div>

      <div className="bg-red-50 border border-red-100 p-6 rounded-2xl">
        <div className="flex gap-4 items-start">
          <div className="w-10 h-10 rounded-xl bg-white border border-red-200 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-red-800 uppercase tracking-tight mb-1">
              Requirements Rejected
            </p>
            <p className="text-xs font-bold text-red-700/80 mb-4">
              {app.adminRemarks || "Some fields or documents require your immediate attention for processing to continue."}
            </p>
            {corrections.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {corrections.map((id) => (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-red-100 rounded-lg text-[10px] font-bold text-red-600 uppercase tracking-widest"
                  >
                    <Clock className="w-3 h-3" /> {REQUIRED_CORRECTION_LABELS[id] || id}
                  </span>
                ))}
              </div>
            )}
            <Link
              to="/student/application"
              className="btn-primary inline-flex items-center gap-2 py-3 px-6 text-xs"
            >
              <Upload className="w-4 h-4" /> Fix & Resubmit
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExamReadyCard({
  app,
  onOpenSoftware,
}: {
  app: any;
  onOpenSoftware: () => void;
}) {
  const isWaiting = app.examStatus === "SCHEDULED";
  const isActive = app.examStatus === "IN_PROGRESS";

  return (
    <div className="card-philsa p-6 sm:p-12 text-center flex flex-col items-center">
      <div
        className={cn(
          "w-20 h-20 rounded-3xl flex items-center justify-center mb-8 shadow-xl",
          isWaiting
            ? "bg-amber-100 text-amber-600 shadow-amber-200/50"
            : "bg-emerald-100 text-emerald-600 shadow-emerald-200/50",
        )}
      >
        {isWaiting ? (
          <Clock className="w-10 h-10" />
        ) : (
          <Play className="w-10 h-10 pl-1" />
        )}
      </div>

      <h2 className="text-3xl font-black text-philsa-navy mb-4 leading-tight uppercase tracking-tighter">
        {isWaiting
          ? "WAIT FOR PROCTOR TO START THE EXAM"
          : "YOUR EXAMINATION IS READY"}
      </h2>
      <p className="max-w-md text-philsa-gray font-medium text-lg leading-relaxed mb-10">
        {isWaiting
          ? "The proctor is currently verifying the testing environment for all students in your session."
          : "Please ensure you are in a quiet, private space before opening the secure exam software."}
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-2xl mb-12">
        <div className="p-4 bg-philsa-bg border border-philsa-border rounded-2xl">
          <Calendar className="w-4 h-4 text-philsa-red mb-2 mx-auto" />
          <p className="text-[9px] font-black text-philsa-gray uppercase tracking-widest mb-1">
            Date
          </p>
          <p className="text-sm font-black text-philsa-navy">{app.examDate}</p>
        </div>
        <div className="p-4 bg-philsa-bg border border-philsa-border rounded-2xl">
          <MapPin className="w-4 h-4 text-philsa-red mb-2 mx-auto" />
          <p className="text-[9px] font-black text-philsa-gray uppercase tracking-widest mb-1">
            Center
          </p>
          <p className="text-sm font-black text-philsa-navy leading-none mt-1">
            {app.examTestCenter}
          </p>
        </div>
        <div className="p-4 bg-philsa-bg border border-philsa-border rounded-2xl">
          <Shield className="w-4 h-4 text-philsa-red mb-2 mx-auto" />
          <p className="text-[9px] font-black text-philsa-gray uppercase tracking-widest mb-1">
            Room
          </p>
          <p className="text-sm font-black text-philsa-navy">{app.examRoom}</p>
        </div>
        <div className="p-4 bg-philsa-bg border border-philsa-border rounded-2xl">
          <User className="w-4 h-4 text-philsa-red mb-2 mx-auto" />
          <p className="text-[9px] font-black text-philsa-gray uppercase tracking-widest mb-1">
            Proctor
          </p>
          <p className="text-sm font-black text-philsa-navy">Ms. Ramos</p>
        </div>
      </div>

      <button
        onClick={onOpenSoftware}
        className="btn-primary w-full max-w-sm flex items-center justify-center gap-3 py-5"
      >
        <Maximize className="w-5 h-5" />
        OPEN SECURE SOFTWARE
      </button>

      {isWaiting && (
        <div className="mt-8 flex items-center gap-4 text-[11px] font-black text-amber-700 bg-amber-50 px-6 py-3 rounded-xl border border-amber-100 uppercase tracking-widest">
          <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
          Waiting for Authorization...
        </div>
      )}
    </div>
  );
}

function TerminatedCard({ app }: { app: any }) {
  const { addAuditLog } = usePhilSA();
  const [showAppealModal, setShowAppealModal] = useState(false);
  const [statement, setStatement] = useState("");
  const [docCategory, setDocCategory] = useState("ISP_CERTIFICATE");
  const [fileName, setFileName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Sync state with localStorage to check for active appeal
  const [appeals, setAppeals] = useState<any[]>(() => {
    const saved = localStorage.getItem("philsa_appeals");
    return saved ? JSON.parse(saved) : [];
  });

  const studentAppeal = appeals.find(
    (a) => a.studentId === app.userId || a.originalCaseId === app.id
  );

  const triggerUpload = () => {
    if (!statement.trim()) {
      alert("Please provide a written explanation statement first.");
      return;
    }
    setIsUploading(true);
    let curr = 0;
    const interval = setInterval(() => {
      curr += Math.random() * 25;
      if (curr >= 100) {
        curr = 100;
        clearInterval(interval);
        setTimeout(() => {
          setIsUploading(false);
          setFileName(`SUPPORT_${docCategory}_${Date.now().toString().substring(8)}.pdf`);
        }, 300);
      }
      setProgress(Math.floor(curr));
    }, 150);
  };

  const handleSubmitAppeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!statement.trim()) return;

    const newAppeal = {
      id: `APP-2026-${Math.floor(100 + Math.random() * 900)}`,
      studentId: app.userId,
      studentName: `${app.firstName} ${app.lastName}`,
      studentEmail: app.email,
      category: "INTEGRITY_FLAG",
      originalCaseId: "INC-PRO-7721-Z",
      originalDetails: app.adminRemarks || "Disqualified for academic integrity violations.",
      studentStatement: statement,
      evidenceName: fileName || "Written_Self_Affidavit.pdf",
      evidenceUrl: "https://images.unsplash.com/photo-1542744094-3a31f103e35f?w=600&q=80",
      filedTime: new Date().toISOString().replace("T", " ").substring(0, 16),
      status: "PENDING"
    };

    const updatedAppeals = [newAppeal, ...appeals];
    setAppeals(updatedAppeals);
    localStorage.setItem("philsa_appeals", JSON.stringify(updatedAppeals));

    addAuditLog(
      "APPEAL_SUBMITTED",
      `Student ${app.firstName} ${app.lastName} submitted appeal ${newAppeal.id} for Integrity Violation INC-PRO-7721-Z`
    );

    setShowAppealModal(false);
    setStatement("");
    setFileName("");
    setProgress(0);
  };

  return (
    <div className="card-philsa p-6 sm:p-12 text-center border-t-[12px] border-t-philsa-red bg-red-50/10">
      <div className="w-24 h-24 rounded-full bg-philsa-red text-white flex items-center justify-center mb-8 shadow-2xl shadow-philsa-red/30 mx-auto">
        <AlertCircle className="w-12 h-12" />
      </div>

      <h2 className="text-4xl font-black text-philsa-navy mb-4 tracking-tighter leading-none uppercase">
        Session Terminated
      </h2>
      <p className="text-philsa-red text-xl font-black mb-8 uppercase tracking-widest">
        Academic Integrity Violation
      </p>

      <div className="max-w-2xl mx-auto bg-white border-2 border-philsa-red/20 rounded-[2.5rem] p-10 space-y-6 shadow-sm mb-10">
        <div className="flex items-center gap-4 text-left border-b border-philsa-border pb-6">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-philsa-red flex items-center justify-center shrink-0">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-philsa-gray uppercase tracking-widest mb-1">
              Official Incident Report
            </p>
            <p className="text-sm font-bold text-philsa-navy leading-relaxed">
              {app.adminRemarks ||
                "Candidate session was forcefully terminated by the system proctor for violating the terms of service."}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-left">
          <div className="p-4 bg-philsa-bg rounded-2xl border border-philsa-border">
            <p className="text-[9px] font-black text-philsa-gray uppercase tracking-widest mb-1">
              Incident ID
            </p>
            <p className="text-xs font-mono font-black text-philsa-navy">
              INC-PRO-7721-Z
            </p>
          </div>
          <div className="p-4 bg-philsa-bg rounded-2xl border border-philsa-border">
            <p className="text-[9px] font-black text-philsa-gray uppercase tracking-widest mb-1">
              Status
            </p>
            <p className="text-xs font-black text-philsa-red uppercase">
              Disqualified
            </p>
          </div>
        </div>
      </div>

      {studentAppeal ? (
        <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-philsa-border p-8 text-left space-y-4 shadow-sm mb-8">
          <div className="flex items-center justify-between border-b border-philsa-border pb-4">
            <div>
              <p className="text-[9px] font-black text-philsa-gray uppercase tracking-widest">
                FORMAL DISPUTE FILED
              </p>
              <h4 className="text-sm font-black text-philsa-navy mt-1">
                ID: {studentAppeal.id}
              </h4>
            </div>
            <span
              className={cn(
                "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border",
                studentAppeal.status === "GRANTED"
                  ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                  : studentAppeal.status === "DENIED"
                    ? "bg-red-50 text-philsa-red border-red-200"
                    : "bg-amber-50 text-amber-600 border-amber-200 animate-pulse"
              )}
            >
              Appeal: {studentAppeal.status}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Your Statement
              </p>
              <p className="text-slate-700 leading-relaxed font-medium bg-slate-50 p-3 rounded-xl border border-slate-100 mt-1">
                "{studentAppeal.studentStatement}"
              </p>
            </div>

            {studentAppeal.evidenceName && (
              <div className="flex items-center justify-between p-3 bg-philsa-bg rounded-xl border border-philsa-border">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-philsa-navy" />
                  <span className="text-[10px] font-bold text-philsa-navy">
                    {studentAppeal.evidenceName}
                  </span>
                </div>
                <span className="text-[8px] font-black text-emerald-600 uppercase">
                  Encrypted & Secure
                </span>
              </div>
            )}

            {studentAppeal.adminRemarks && (
              <div className="p-4 bg-philsa-navy/5 border border-philsa-navy/10 rounded-xl space-y-1">
                <p className="text-[9px] font-black text-philsa-navy uppercase tracking-widest">
                  Admissions Board Resolution
                </p>
                <p className="text-slate-800 font-semibold text-[11px] leading-relaxed">
                  "{studentAppeal.adminRemarks}"
                </p>
                <p className="text-[9px] text-slate-400 font-bold mt-1">
                  Reviewed by System Administrator at {studentAppeal.reviewedTime}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4 max-w-sm mx-auto">
          <p className="text-xs text-philsa-gray font-medium leading-relaxed">
            As per the National Academic Integrity Framework, you are ineligible
            to participate in any PhilSA examination cycles for a period of 5
            years.
          </p>
          <div className="pt-4 flex flex-col gap-3">
            <button className="btn-secondary w-full py-4 border-philsa-border text-[10px] font-black uppercase tracking-widest">
              Download Violation Notice
            </button>
            <button
              onClick={() => setShowAppealModal(true)}
              className="w-full py-4 text-[10px] font-black text-philsa-red uppercase tracking-widest hover:underline cursor-pointer"
            >
              File a Formal Appeal
            </button>
          </div>
        </div>
      )}

      {/* Appeal Submission Modal */}
      <AnimatePresence>
        {showAppealModal && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAppealModal(false)}
              className="absolute inset-0 bg-philsa-navy/60 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-white rounded-[2rem] border border-philsa-border p-6 sm:p-8 shadow-2xl z-[10010] text-left overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-start border-b border-philsa-border pb-4 mb-6">
                <div>
                  <span className="text-[8px] bg-philsa-red text-white px-2 py-0.5 rounded font-black uppercase tracking-widest">
                    Formal Disqualification Appeal
                  </span>
                  <h3 className="text-xl font-black text-philsa-navy uppercase mt-1">
                    Submit Formal Dispute
                  </h3>
                </div>
                <button
                  onClick={() => setShowAppealModal(false)}
                  className="p-1 hover:bg-philsa-bg rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-philsa-gray" />
                </button>
              </div>

              <form onSubmit={handleSubmitAppeal} className="space-y-6">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-philsa-gray uppercase tracking-widest">
                    Supporting Document Category
                  </label>
                  <select
                    value={docCategory}
                    onChange={(e) => setDocCategory(e.target.value)}
                    className="w-full bg-philsa-bg border border-philsa-border rounded-xl px-4 py-3 text-xs font-bold text-philsa-navy outline-none cursor-pointer"
                  >
                    <option value="ISP_CERTIFICATE">ISP Network Outage Certificate</option>
                    <option value="MEDICAL_CERT">Medical Certificate / Emergency Proof</option>
                    <option value="AFFIDAVIT">Notarized Compliance Affidavit</option>
                    <option value="SYSTEM_LOG">Antivirus / OS Notification System Logs</option>
                    <option value="OTHER">Other Cohesive Supporting Material</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-philsa-gray uppercase tracking-widest">
                    Detailed Explanation & Statement *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={statement}
                    onChange={(e) => setStatement(e.target.value)}
                    placeholder="Provide a chronological statement explaining the context of the incident. Please cite any physical evidence, system configurations, or environment issues..."
                    className="w-full bg-philsa-bg border border-philsa-border rounded-xl p-4 text-xs font-semibold focus:ring-2 focus:ring-philsa-red/10 outline-none transition-all placeholder:text-philsa-gray/30 text-philsa-navy resize-none"
                  />
                </div>

                {/* Evidence Drag-and-drop / selector simulator */}
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-philsa-gray uppercase tracking-widest">
                    Supporting Proof Attachment (.pdf, .png, .jpg, .txt)
                  </label>
                  {fileName ? (
                    <div className="flex items-center justify-between p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <div className="flex items-center gap-2">
                        <FileCheck className="w-5 h-5 text-emerald-600" />
                        <div>
                          <p className="text-[10px] font-bold text-emerald-800 truncate max-w-[200px]">
                            {fileName}
                          </p>
                          <p className="text-[8px] font-black text-emerald-600/60 uppercase">
                            Upload Complete
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFileName("")}
                        className="p-1 hover:bg-emerald-100 rounded text-emerald-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : isUploading ? (
                    <div className="p-6 border-2 border-dashed border-philsa-navy/10 rounded-2xl bg-philsa-bg space-y-3">
                      <div className="flex justify-between text-[10px] font-bold text-philsa-navy">
                        <span>Uploading support document...</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-philsa-red h-full transition-all duration-150"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={triggerUpload}
                      className="p-8 border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50/50 hover:bg-slate-50 hover:border-philsa-red transition-all text-center cursor-pointer space-y-2"
                    >
                      <Upload className="w-8 h-8 text-philsa-gray mx-auto" />
                      <div>
                        <p className="text-[10px] font-black text-philsa-navy uppercase tracking-wider">
                          Click to upload file
                        </p>
                        <p className="text-[8px] text-philsa-gray font-medium mt-1">
                          Max size: 10MB. Transmitted over secure AES-256 encrypted channels.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4 border-t border-philsa-border">
                  <button
                    type="button"
                    onClick={() => setShowAppealModal(false)}
                    className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-4 bg-philsa-navy text-white hover:bg-philsa-red rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-philsa-navy/15 hover:shadow-philsa-red/15 transition-all cursor-pointer"
                  >
                    Submit Formal Appeal
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

function ExamResultCard({ app }: { app: any }) {
  const isPassed = app.admissionDecision === "PASSED";

  return (
    <div className="space-y-10">
      <div
        className={cn(
          "card-philsa !p-0 border-t-[12px] overflow-hidden",
          isPassed ? "border-t-philsa-success" : "border-t-philsa-red",
        )}
      >
        <div className="p-12 text-center flex flex-col items-center">
          <div
            className={cn(
              "w-24 h-24 rounded-full flex items-center justify-center mb-8 shadow-2xl",
              isPassed
                ? "bg-emerald-500 text-white shadow-emerald-200"
                : "bg-red-600 text-white shadow-red-200",
            )}
          >
            {isPassed ? (
              <Award className="w-12 h-12" />
            ) : (
              <AlertTriangle className="w-12 h-12" />
            )}
          </div>

          <h2
            className={cn(
              "text-5xl font-black mb-4 tracking-tighter leading-none",
              isPassed ? "text-philsa-success" : "text-philsa-red",
            )}
          >
            {isPassed ? "CONGRATULATIONS!" : "ADMISSION NOTICE"}
          </h2>
          <p className="text-philsa-gray text-xl font-bold mb-12">
            {isPassed
              ? "You have successfully passed the Philippine Student Assessment."
              : "Thank you for participating in the PhilSA 2026 Examination cycle."}
          </p>

          <div className="grid md:grid-cols-2 gap-8 w-full max-w-3xl mb-12">
            <div className="p-8 bg-philsa-bg border border-philsa-border rounded-3xl text-center">
              <p className="text-[10px] font-black text-philsa-gray uppercase tracking-[0.2em] mb-4">
                Official Rating
              </p>
              <div className="text-5xl font-black text-philsa-navy mb-2">
                {app.examScore}
              </div>
              <p className="text-xs font-bold text-philsa-gray">
                Points out of 400
              </p>
            </div>
            <div className="p-8 bg-philsa-bg border border-philsa-border rounded-3xl text-center">
              <p className="text-[10px] font-black text-philsa-gray uppercase tracking-[0.2em] mb-4">
                National Percentile
              </p>
              <div className="text-5xl font-black text-philsa-navy mb-2">
                {app.examPercentile}%
              </div>
              <p className="text-xs font-bold text-philsa-gray">
                Qualified candidates
              </p>
            </div>
          </div>

          <div className="w-full max-w-3xl p-8 bg-philsa-navy text-white rounded-3xl text-left relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-full bg-white/[0.03] skew-x-[-20deg] -mr-16" />
            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-4">
              Academic Remarks
            </p>
            <p className="text-lg font-bold leading-relaxed">
              {app.resultRemarks}
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              {isPassed ? (
                <>
                  <button className="bg-philsa-red text-white font-black text-[10px] uppercase tracking-widest px-8 py-3.5 rounded-xl flex items-center gap-3 shadow-xl shadow-philsa-red/30">
                    <Download className="w-4 h-4" /> Download Notice
                  </button>
                  <button className="bg-white/10 hover:bg-white/20 text-white font-black text-[10px] uppercase tracking-widest px-8 py-3.5 rounded-xl border border-white/10 transition-all">
                    Enrollment Procedure
                  </button>
                </>
              ) : (
                <button className="bg-philsa-red text-white font-black text-[10px] uppercase tracking-widest px-8 py-3.5 rounded-xl flex items-center gap-3">
                  View Alternate Opportunities
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="card-philsa p-6 sm:p-10 border-l-4 border-philsa-navy">
          <h4 className="text-[10px] font-black text-philsa-gray uppercase tracking-widest mb-6">
            Course Preferences
          </h4>
          <div className="space-y-4">
            {app.courses.map((course: string, i: number) => (
              <div
                key={i}
                className="flex justify-between items-center bg-philsa-bg p-4 rounded-2xl border border-philsa-border"
              >
                <p className="text-sm font-black text-philsa-navy">{course}</p>
                <span className="badge-status badge-approved">
                  Waitlist Status: Ready
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="card-philsa p-6 sm:p-10 border-l-4 border-philsa-red">
          <h4 className="text-[10px] font-black text-philsa-gray uppercase tracking-widest mb-6">
            Subject Breakdown
          </h4>
          <div className="space-y-4">
            {[
              { sub: "Mathematics", score: 95 },
              { sub: "Science", score: 91 },
              { sub: "English", score: 88 },
              { sub: "Abstract Reasoning", score: 96 },
            ].map((item) => (
              <div key={item.sub} className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-philsa-bg flex items-center justify-center font-black text-xs text-philsa-navy shrink-0 border border-philsa-border">
                  {item.score}%
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-philsa-navy mb-2">
                    {item.sub}
                  </p>
                  <div className="h-1.5 w-full bg-philsa-bg rounded-full overflow-hidden">
                    <div
                      className="h-full bg-philsa-red rounded-full"
                      style={{ width: `${item.score}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ScheduleSelectionCard({ onAssigned, isPreview = false }: { onAssigned: (previewSlotId?: string) => void; isPreview?: boolean }) {
  const [slots, setSlots] = useState<BackendExamSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSlots = async () => {
    if (isPreview) {
      setSlots(buildAdminPreviewExamSlots());
      setLoading(false);
      return;
    }
    setLoading(true);
    const result = await backendApplicationService.listExamSlots();
    if (result.ok) setSlots(result.data);
    setLoading(false);
  };

  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (isPreview) {
        if (isMounted) {
          setSlots(buildAdminPreviewExamSlots());
          setLoading(false);
        }
        return;
      }
      const result = await backendApplicationService.listExamSlots();
      if (!isMounted) return;
      if (result.ok) setSlots(result.data);
      setLoading(false);
    })();
    return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPreview]);

  const handleConfirm = async () => {
    if (!selectedSlotId) return;
    setConfirming(true);
    setError(null);
    if (isPreview) {
      // No real StudentApplication to assign to in preview mode, so this
      // doesn't call the real (STUDENT-only) endpoint -- it just advances
      // the client-side preview state, persisted locally so the Permit page
      // sees the same "scheduled" slot on navigation.
      setConfirming(false);
      onAssigned(selectedSlotId);
      return;
    }
    const result = await backendApplicationService.assignExamSlot(selectedSlotId);
    setConfirming(false);
    if (result.ok) {
      onAssigned();
      return;
    }
    setError(result.error.message);
    setSelectedSlotId(null);
    void loadSlots();
  };

  return (
    <div className="card-philsa p-6 sm:p-12 text-center flex flex-col items-center">
      <div className="w-16 h-16 rounded-2xl bg-red-50 text-philsa-red flex items-center justify-center mb-6">
        <Calendar className="w-8 h-8" />
      </div>
      <h2 className="text-2xl font-black text-philsa-navy mb-3 uppercase tracking-tighter">
        Select Exam Schedule
      </h2>
      <p className="max-w-md text-philsa-gray font-medium mb-10">
        Your application has been accepted! Please select your preferred exam session from the available slots below. Note that seat allocation is on a first-come, first-served basis.
      </p>

      {error && (
        <div className="w-full max-w-2xl mb-6 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-xs font-bold text-red-700 text-left">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-xs font-bold text-philsa-gray uppercase tracking-widest">Loading available slots…</p>
      ) : (
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[9px] font-black text-philsa-gray uppercase tracking-widest border-b border-philsa-border">
                <th className="pb-3 pr-4">Batch Number</th>
                <th className="pb-3 pr-4">Room Name</th>
                <th className="pb-3 pr-4">Start/End Time</th>
                <th className="pb-3 pr-4">Date</th>
                <th className="pb-3 pr-4">Seat Capacity</th>
                <th className="pb-3">Selection</th>
              </tr>
            </thead>
            <tbody>
              {slots.map((slot, index) => (
                <tr key={slot.id} className="border-b border-philsa-border last:border-0">
                  <td className="py-4 pr-4 text-xs font-black text-philsa-red">BATCH-{index + 1}</td>
                  <td className="py-4 pr-4 text-sm font-bold text-philsa-navy">{slot.room}</td>
                  <td className="py-4 pr-4 text-sm text-philsa-navy">
                    {slot.startTime.slice(0, 5)} - {slot.endTime.slice(0, 5)}
                  </td>
                  <td className="py-4 pr-4 text-sm text-philsa-navy">{slot.date}</td>
                  <td className="py-4 pr-4">
                    <span className="px-2 py-1 rounded-md bg-philsa-bg border border-philsa-border text-[10px] font-bold text-philsa-navy">
                      {slot.remainingSlots} Seats
                    </span>
                  </td>
                  <td className="py-4">
                    <input
                      type="radio"
                      name="exam-slot"
                      aria-label={`Select ${slot.room} on ${slot.date}`}
                      checked={selectedSlotId === slot.id}
                      onChange={() => setSelectedSlotId(slot.id)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && slots.length > 0 && (
        <button
          onClick={handleConfirm}
          disabled={!selectedSlotId || confirming}
          className="btn-primary mt-10 w-full max-w-sm flex items-center justify-center gap-3 py-4 disabled:opacity-50"
        >
          {confirming ? "Confirming…" : "Confirm Selected Slot"}
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// --- MAIN PAGE ---

export default function StudentDashboard() {
  const { user } = usePhilSA();
  const { applications } = useMockData();
  const navigate = useNavigate();
  const usesBackendServiceMode = import.meta.env.VITE_AUTH_SERVICE_MODE === 'backend';

  const [backendApp, setBackendApp] = useState<Application | null>(null);
  const [backendAppLoaded, setBackendAppLoaded] = useState(false);
  const [previewSlotId, setPreviewSlotId] = useState<string | null>(() => getAdminPreviewSlotId());

  const loadMyApplication = async () => {
    if (!user) return;
    const result = await backendApplicationService.getMyApplication();
    if (result.ok) {
      setBackendApp(result.data ? mapBackendApplicationToFrontend(result.data, user.id) : null);
    }
    setBackendAppLoaded(true);
  };

  useEffect(() => {
    if (!usesBackendServiceMode) return;
    void loadMyApplication();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usesBackendServiceMode, user?.id]);

  const realApp = usesBackendServiceMode
    ? backendApp
    : applications.find((a) => a.userId === user?.id);
  const isAdminPreview = !realApp && user?.role === 'SYSTEM_ADMIN';
  const myApp = realApp ?? (isAdminPreview ? buildAdminPreviewApplication(user!, findAdminPreviewSlot(previewSlotId)) : realApp);

  const handleScheduleAssigned = (confirmedPreviewSlotId?: string) => {
    if (isAdminPreview) {
      setAdminPreviewSlotId(confirmedPreviewSlotId ?? null);
      setPreviewSlotId(confirmedPreviewSlotId ?? null);
      return;
    }
    void loadMyApplication();
  };

  // Debugging log for development/prototype troubleshooting
  if (!myApp && user && !usesBackendServiceMode) {
    console.warn(
      `No application found for user ID: ${user.id}. Total applications available: ${applications.length}`,
    );
    console.log(
      "Available user IDs in applications:",
      applications.map((a) => a.userId),
    );
  }

  if (usesBackendServiceMode && !backendAppLoaded) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-xs font-black text-philsa-gray uppercase tracking-widest">Loading your application…</p>
      </div>
    );
  }

  if (!myApp) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Logo size="lg" className="mx-auto mb-8 opacity-20 grayscale" />
          <h2 className="text-2xl font-black text-philsa-navy mb-4">
            No Application Found
          </h2>
          <p className="text-philsa-gray mb-8">
            You haven't started an application for PhilSA 2026 yet.
          </p>
          <Link to="/student/application" className="btn-primary">
            Apply Now
          </Link>
        </div>
      </div>
    );
  }

  const handleOpenSoftware = () => {
    if (user?.email === 'stud3takeexam@philsa.edu.ph') {
      navigate("/student/take-exam");
    } else {
      navigate("/exam/live");
    }
  };

  return (
    <div className="space-y-12">
      {isAdminPreview && (
        <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <p className="text-xs font-bold">
            Preview mode — this Student Portal view is showing demo data, not a real application record.
          </p>
        </div>
      )}
      {/* Header section with candidate info */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div
              className={cn(
                "px-3 py-1 bg-white border rounded-full text-[9px] font-black uppercase tracking-widest",
                myApp.status === "ACCEPTED"
                  ? "border-emerald-200 text-emerald-700"
                  : myApp.status === "FOR_CORRECTION"
                    ? "border-amber-200 text-amber-700"
                    : myApp.status === "TERMINATED"
                      ? "border-philsa-red text-philsa-red bg-red-50"
                      : "border-philsa-border text-philsa-gray",
              )}
            >
              {myApp.status.replace("_", " ")}
            </div>
            {myApp.examStatus && (
              <div
                className={cn(
                  "px-3 py-1 text-white rounded-full text-[9px] font-black uppercase tracking-widest",
                  myApp.examStatus === "TERMINATED"
                    ? "bg-philsa-red"
                    : "bg-philsa-navy",
                )}
              >
                Exam: {myApp.examStatus.replace("_", " ")}
              </div>
            )}
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
            {myApp.photoUrl && (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden shadow-xl border-4 border-white shrink-0">
                <img
                  referrerPolicy="no-referrer"
                  src={myApp.photoUrl}
                  alt="Student"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-philsa-navy mb-1 sm:mb-2 leading-tight">
                Mabuhay, {user?.firstName}!
              </h1>
              <p className="text-philsa-gray text-base sm:text-lg font-medium">
                PhilSA 2026 Global Assessment Portal
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-philsa-border rounded-2xl sm:rounded-full py-3.5 px-6 sm:py-4 sm:px-8 flex items-center justify-between sm:justify-start gap-4 sm:gap-6 shadow-sm w-full sm:w-auto">
          <Logo size="sm" />
          <div className="h-4 w-[1px] bg-philsa-border" />
          <div className="text-center sm:text-left">
            <p className="text-[9px] text-philsa-gray font-bold uppercase tracking-widest leading-none mb-1">
              Candidate ID
            </p>
            <p className="font-mono text-sm font-black text-philsa-navy">
              {myApp.id}
            </p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-10">
          {/* Main Content Area based on Application State */}

          {/* STATE 1: PENDING */}
          {myApp.status === "PENDING" && (
            <div className="card-philsa p-6 sm:p-12 text-center">
              <div className="w-20 h-20 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mb-8 shadow-sm border border-amber-100 mx-auto animate-pulse animate-duration-1000">
                <Clock className="w-10 h-10" />
              </div>
              <h2 className="text-3xl font-black text-philsa-navy mb-4 uppercase tracking-tighter">
                APPLICATION UNDER REVIEW
              </h2>
              <p className="max-w-md mx-auto text-philsa-gray font-medium text-lg leading-relaxed mb-10">
                Your registration status is currently under active document
                validation by the regional admissions review board. You will be
                notified via email once approved.
              </p>
              <div className="bg-philsa-bg border border-philsa-border rounded-2xl p-6 text-left max-w-lg mx-auto">
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-philsa-border">
                  <p className="text-[10px] font-black text-philsa-gray uppercase tracking-widest">
                    Candidate ID
                  </p>
                  <p className="font-mono text-sm font-black text-philsa-navy">
                    {myApp.id}
                  </p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-black text-philsa-gray uppercase tracking-widest">
                    Submitted Date
                  </p>
                  <p className="text-xs font-black text-philsa-navy">
                    {myApp.submittedAt
                      ? new Date(myApp.submittedAt).toLocaleDateString(
                          undefined,
                          { year: "numeric", month: "long", day: "numeric" },
                        )
                      : "May 01, 2026"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STATE 1: FOR CORRECTION */}
          {myApp.status === "FOR_CORRECTION" && (
            <RequirementsUploader app={myApp} />
          )}

          {/* STATE: ACCEPTED, NO EXAM SLOT ASSIGNED YET. Gated to backend mode
              (the real flow) or an admin preview (which has no real
              application to assign -- confirming will surface the backend's
              "No application found" error, which is accurate, not broken).
              The plain mock-data flow has no equivalent, so it stays
              unaffected outside of these two cases. */}
          {(usesBackendServiceMode || isAdminPreview) && myApp.status === "ACCEPTED" && !myApp.examStatus && (
            <ScheduleSelectionCard onAssigned={handleScheduleAssigned} isPreview={isAdminPreview} />
          )}

          {/* STATE 2 & 3: WAITING FOR PROCTOR / ACTIVE EXAM */}
          {(myApp.examStatus === "SCHEDULED" ||
            myApp.examStatus === "IN_PROGRESS") && (
            <ExamReadyCard app={myApp} onOpenSoftware={handleOpenSoftware} />
          )}

          {/* STATE: TERMINATED */}
          {myApp.examStatus === "TERMINATED" && <TerminatedCard app={myApp} />}

          {/* STATE 4: COMPLETED */}
          {myApp.examStatus === "SUBMITTED" && (
            <div className="card-philsa p-6 sm:p-12 text-center">
              <div className="w-20 h-20 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-8 shadow-sm border border-emerald-100 mx-auto">
                <CheckCircle className="w-10 h-10" />
              </div>
              <h2 className="text-3xl font-black text-philsa-navy mb-4 uppercase tracking-tighter">
                EXAMINATION COMPLETED
              </h2>
              <p className="max-w-md mx-auto text-philsa-gray font-medium text-lg leading-relaxed mb-10">
                Your assessment has been securely recorded. Results are
                currently being processed by the regional grading committee.
              </p>
              <div className="bg-philsa-bg border border-philsa-border rounded-2xl p-6 text-left max-w-lg mx-auto">
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-philsa-border">
                  <p className="text-[10px] font-black text-philsa-gray uppercase tracking-widest">
                    Submission ID
                  </p>
                  <p className="text-xs font-mono font-black text-philsa-navy">
                    PH-SUB-99421-X
                  </p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-black text-philsa-gray uppercase tracking-widest">
                    Timestamp
                  </p>
                  <p className="text-xs font-black text-philsa-navy">
                    May 07, 2026 • 02:45 PM
                  </p>
                </div>
              </div>
              <div className="mt-12 flex flex-col sm:flex-row justify-center gap-3 w-full max-w-sm mx-auto sm:max-w-none">
                <button className="btn-secondary py-3 px-6 border-philsa-border font-black text-[10px] uppercase tracking-widest w-full sm:w-auto text-center justify-center flex items-center">
                  View Submission Summary
                </button>
                <button className="btn-secondary py-3 px-6 border-philsa-border font-black text-[10px] uppercase tracking-widest w-full sm:w-auto text-center justify-center flex items-center">
                  Support Ticket
                </button>
              </div>
            </div>
          )}

          {/* STATE 5: RESULTS RELEASED */}
          {myApp.examStatus === "RESULTS_RELEASED" && (
            <ExamResultCard app={myApp} />
          )}
        </div>

        <div className="space-y-8">
          <div className="card-philsa p-5 sm:p-8 bg-[#00563F] text-white border-none shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <Cpu className="w-5 h-5 text-[#FFB81C]" />
              <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40">
                Computer & Tech Check
              </h4>
            </div>
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Camera className="w-4 h-4 text-emerald-400" />
                  <span className="text-[10px] font-bold text-white/70 uppercase">
                    Camera
                  </span>
                </div>
                <span className="text-[9px] font-black text-emerald-400">
                  WORKING GOOD
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mic className="w-4 h-4 text-emerald-400" />
                  <span className="text-[10px] font-bold text-white/70 uppercase">
                    Microphone
                  </span>
                </div>
                <span className="text-[9px] font-black text-emerald-400">
                  WORKING GOOD
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Wifi className="w-4 h-4 text-amber-400" />
                  <span className="text-[10px] font-bold text-white/70 uppercase">
                    Network
                  </span>
                </div>
                <span className="text-[9px] font-black text-amber-400">
                  GOOD CONNECTION
                </span>
              </div>
            </div>
            <button className="w-full mt-8 py-3 bg-white/10 rounded-lg font-bold text-[9px] uppercase tracking-widest hover:bg-white/20 transition-all border border-white/10 cursor-pointer">
              Run Full Diagnostics
            </button>
          </div>

          {/* APPLICATION TIMELINE / PROGRESS WIDGET */}
          <div className="card-philsa p-6 sm:p-10">
            <h3 className="text-sm font-bold text-philsa-gray uppercase tracking-widest border-l-4 border-philsa-red pl-4 mb-8">
              Application Roadmap
            </h3>
            <div className="relative">
              <div className="absolute left-[19px] top-4 bottom-4 w-[2px] bg-philsa-bg" />
              <div className="space-y-8">
                {[
                  {
                    label: "Application Submitted",
                    status: "COMPLETED",
                    date: myApp.submittedAt || "2026-05-01",
                  },
                  {
                    label: "Document Verification",
                    status:
                      myApp.status === "ACCEPTED" || myApp.examStatus
                        ? "COMPLETED"
                        : "IN_PROGRESS",
                    date: "In evaluation",
                  },
                  {
                    label: "Examination Phase",
                    status:
                      myApp.examStatus === "SUBMITTED" ||
                      myApp.examStatus === "RESULTS_RELEASED"
                        ? "COMPLETED"
                        : myApp.examStatus
                          ? "IN_PROGRESS"
                          : "PENDING",
                  },
                  {
                    label: "Official Results",
                    status:
                      myApp.examStatus === "RESULTS_RELEASED"
                        ? "COMPLETED"
                        : "PENDING",
                  },
                ].map((step, i) => (
                  <div key={i} className="flex gap-6 relative z-10">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2",
                        step.status === "COMPLETED"
                          ? "bg-philsa-success border-philsa-success text-white"
                          : step.status === "IN_PROGRESS"
                            ? "bg-philsa-red border-philsa-red text-white"
                            : "bg-white border-philsa-border text-philsa-gray/30",
                      )}
                    >
                      <CheckCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <p
                        className={cn(
                          "text-sm font-black uppercase tracking-tight",
                          step.status === "PENDING"
                            ? "text-philsa-gray/40"
                            : "text-philsa-navy",
                        )}
                      >
                        {step.label}
                      </p>
                      <p className="text-[10px] font-bold text-philsa-gray uppercase tracking-widest mt-1">
                        {step.status === "COMPLETED"
                          ? "Done"
                          : step.status === "IN_PROGRESS"
                            ? "Action Required"
                            : "Waiting"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
