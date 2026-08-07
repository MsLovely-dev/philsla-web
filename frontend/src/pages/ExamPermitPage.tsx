import { useEffect, useRef, useState } from "react";
import { usePhilSA } from "../PhilSAContext";
import { useMockData } from "../services/mockService";
import {
  Download,
  Printer,
  ShieldCheck,
  MapPin,
  Calendar,
  Clock,
  AlertTriangle,
  User as UserIcon,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { backendApplicationService, type BackendExamPermit } from "../services/backendApplicationService";
import { ADMIN_PREVIEW_CANDIDATE_ID, findAdminPreviewSlot, getAdminPreviewSlotId } from "../services/adminPreviewApplication";
import { createExamPermitPdf, downloadBlob, getExamPermitPdfFilename } from "../services/examPermitPdfExport";

function formatSlotTime(time: string): string {
  const [hourStr, minute] = time.split(":");
  const hour = Number.parseInt(hourStr, 10);
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(displayHour).padStart(2, "0")}:${minute} ${period}`;
}

function mapBackendPermit(backendPermit: BackendExamPermit, userId: string) {
  return {
    id: backendPermit.id,
    userId,
    candidateId: backendPermit.candidateId,
    fullName: backendPermit.fullName,
    scheduleId: "",
    testCenter: backendPermit.testCenter,
    room: backendPermit.room,
    seat: backendPermit.seat,
    qrCode: backendPermit.qrCode,
    status: "APPROVED" as const,
  };
}

export default function ExamPermit() {
  const { user } = usePhilSA();
  const { permits, schedules, proctors } = useMockData();
  const usesBackendServiceMode = import.meta.env.VITE_AUTH_SERVICE_MODE === "backend";

  const [backendPermit, setBackendPermit] = useState<BackendExamPermit | null>(null);
  const [backendLoaded, setBackendLoaded] = useState(false);
  const permitDocumentRef = useRef<HTMLDivElement>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  useEffect(() => {
    if (!usesBackendServiceMode || !user) return;
    let isMounted = true;
    (async () => {
      const result = await backendApplicationService.getMyExamPermit();
      if (!isMounted) return;
      if (result.ok) setBackendPermit(result.data);
      setBackendLoaded(true);
    })();
    return () => { isMounted = false; };
  }, [usesBackendServiceMode, user]);

  let permit = usesBackendServiceMode
    ? (backendPermit && user ? mapBackendPermit(backendPermit, user.id) : undefined)
    : permits.find((p) => p.userId === user?.id);
  const isMocked = !permit;

  if (!usesBackendServiceMode && isMocked && user?.role === "STUDENT") {
    permit = {
      id: "p_sample",
      userId: user.id,
      candidateId: "PH-2026-8842",
      fullName: `${user.firstName} ${user.lastName}`,
      scheduleId: "sch1",
      testCenter: "University of the Philippines - Diliman (National Center)",
      room: "Melchor Hall, Room 302",
      seat: "14B",
      qrCode: "SAMPLE_QR_PHILSA_2026",
      status: "APPROVED",
    };
  }

  // SYSTEM_ADMIN accounts previewing this page have no real permit record.
  // Once the Dashboard preview's schedule picker has "confirmed" a slot
  // (persisted client-side, see adminPreviewApplication.ts), show a permit
  // for that same slot -- before that, fall through to "No Active Permit"
  // below, accurately mirroring the real flow rather than faking a permit
  // that doesn't correspond to anything the preview has done yet.
  const previewSlot = isMocked && user?.role === "SYSTEM_ADMIN" ? findAdminPreviewSlot(getAdminPreviewSlotId()) : null;
  const isAdminPreview = Boolean(previewSlot);

  if (isMocked && previewSlot && user) {
    permit = {
      id: "p_preview",
      userId: user.id,
      candidateId: ADMIN_PREVIEW_CANDIDATE_ID,
      fullName: `${user.firstName || "Preview"} Candidate`,
      scheduleId: previewSlot.id,
      testCenter: previewSlot.testCenter,
      room: previewSlot.room,
      seat: "1A",
      qrCode: `SAMPLE_QR_PHILSA_${ADMIN_PREVIEW_CANDIDATE_ID}`,
      status: "APPROVED",
    };
  }

  const previewSchedule = previewSlot
    ? { date: previewSlot.date, time: formatSlotTime(previewSlot.startTime), endTime: formatSlotTime(previewSlot.endTime) }
    : backendPermit?.startTime && backendPermit?.endTime
      ? { date: backendPermit.examDate ?? "", time: formatSlotTime(backendPermit.startTime), endTime: formatSlotTime(backendPermit.endTime) }
      : null;
  const schedule = permit
    ? (previewSchedule ?? schedules.find((s) => s.id === permit?.scheduleId))
    : null;

  if (usesBackendServiceMode && !backendLoaded) {
    return (
      <div className="flex items-center justify-center h-[40vh]">
        <p className="text-xs font-black text-philsa-gray uppercase tracking-widest">Loading your permit…</p>
      </div>
    );
  }

  const proctor = proctors.find((p) => {
    const center = p.center?.toLowerCase() || "";
    const tc = permit?.testCenter?.toLowerCase() || "";
    return center !== "n/a" && (tc.includes(center) || center.includes(tc));
  }) || proctors[0];
  const proctorName = proctor ? proctor.name : "Dr. Emil Javier";

  const isOffline = user?.id === "student-offline" || permit?.id?.toLowerCase().includes("offline") || false;
  const examMethod = isOffline ? "Offline" : "Online";

  const handleDownloadPdf = async () => {
    if (!permitDocumentRef.current || !permit) return;
    setIsExportingPdf(true);
    try {
      const blob = await createExamPermitPdf(permitDocumentRef.current);
      downloadBlob(blob, getExamPermitPdfFilename(permit.candidateId));
    } finally {
      setIsExportingPdf(false);
    }
  };

  if (!permit) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center">
        <div className="w-16 h-16 bg-yellow-50 text-yellow-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Calendar className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-extrabold text-philsa-navy">
          No Active Permit
        </h2>
        <p className="text-philsa-gray mt-2">
          You haven't been assigned an exam schedule yet, or your application is
          still pending review.
        </p>
        {user?.role === "SYSTEM_ADMIN" && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mt-6 inline-block">
            Preview mode — go to Dashboard and confirm an exam schedule to preview a permit here.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {isAdminPreview && (
        <div className="flex items-center gap-3 px-5 py-3 mb-6 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <p className="text-xs font-bold">
            Preview mode — this permit is showing demo data, not a real record.
          </p>
        </div>
      )}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 bg-green-50 text-green-700 text-[10px] font-black uppercase tracking-widest rounded-full border border-green-200">
              Approved Permit
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-philsa-navy">
            Assessment Entry Permit
          </h1>
          <p className="text-sm text-philsa-gray mt-1">
            Please print or download this permit. Show it on the examination
            day.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="btn-secondary py-2.5 px-5 flex items-center gap-2 text-xs transition-all active:scale-95 disabled:opacity-50"
            onClick={handleDownloadPdf}
            disabled={isExportingPdf}
          >
            <Download className="w-4 h-4" /> {isExportingPdf ? "Generating…" : "PDF"}
          </button>
          <button
            className="btn-primary py-2.5 px-6 flex items-center gap-2 text-xs shadow-lg shadow-philsa-red/20 transition-all active:scale-95"
            onClick={() => window.print()}
          >
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      </div>

      {/* Simplified, Professional Permit Document */}
      <div ref={permitDocumentRef} className="bg-white rounded-3xl border border-philsa-border shadow-md overflow-hidden print:border-none print:shadow-none">
        {/* Simple Light Header */}
        <div className="bg-slate-50 text-philsa-navy px-8 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-philsa-border">
          <div>
            <span className="text-[10px] text-philsa-red uppercase tracking-[0.2em] font-black">
              PhilSA Scholarship Academy
            </span>
            <h2 className="text-xl font-bold tracking-tight text-philsa-navy">
              NATIONAL ASSESSMENT PERMIT
            </h2>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-[9px] text-philsa-gray uppercase tracking-widest font-black">
              Candidate ID
            </p>
            <p className="font-mono text-base font-extrabold tracking-wider text-philsa-red">
              {permit.candidateId}
            </p>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-8 space-y-8">
          {/* Top Section: Biometrics & QR side by size */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-8">
            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center flex-1">
              <div className="w-24 h-24 rounded-xl overflow-hidden border border-philsa-border shrink-0 bg-philsa-bg">
                <img
                  referrerPolicy="no-referrer"
                  src={
                    user?.avatar ||
                    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                  }
                  alt="Biometric ID"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="space-y-1">
                <p className="text-[9px] text-philsa-gray font-bold uppercase tracking-widest">
                  Full Name
                </p>
                <h3 className="text-xl font-black text-philsa-navy leading-none">
                  {permit.fullName}
                </h3>
                <p className="text-xs text-philsa-gray mt-1">
                  PhilID Registry verified student
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-philsa-bg/50 border border-philsa-border p-4 rounded-2xl shrink-0">
              <QRCodeSVG value={permit.qrCode} size={80} />
              <div className="text-left">
                <p className="text-[9px] text-philsa-gray font-black uppercase tracking-widest leading-none">
                  Security Code
                </p>
                <p className="font-mono text-xs font-black text-philsa-navy mt-1 tracking-tight">
                  {permit.qrCode}
                </p>
                <p className="text-[8px] text-philsa-success font-bold uppercase tracking-widest mt-1">
                  ✓ AUTHENTIC ORIGINAL
                </p>
              </div>
            </div>
          </div>

          <hr className="border-philsa-border" />

          {/* Mid Section: Simplified Details Grid */}
          <div>
            <h4 className="text-[10px] font-black text-philsa-red uppercase tracking-[0.2em] mb-4">
              Exam Schedule & Location
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 py-6 border-y border-philsa-border">
              <div>
                <p className="text-[9px] text-philsa-gray font-black uppercase tracking-widest mb-1">
                  Date
                </p>
                <p className="font-extrabold text-philsa-navy text-sm">
                  {schedule?.date || "June 15, 2026"}
                </p>
              </div>
              <div>
                <p className="text-[9px] text-philsa-gray font-black uppercase tracking-widest mb-1">
                  Time Slot
                </p>
                <p className="font-extrabold text-philsa-navy text-sm">
                  {schedule?.time || "08:00 AM"} -{" "}
                  {schedule?.endTime || "11:00 AM"}
                </p>
              </div>
              <div>
                <p className="text-[9px] text-philsa-gray font-black uppercase tracking-widest mb-1">
                  Exam Method
                </p>
                <p className="font-extrabold text-philsa-navy text-sm">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                    examMethod === "Online" ? "bg-blue-50 text-blue-800 border border-blue-100" : "bg-amber-50 text-amber-800 border border-amber-100"
                  }`}>
                    {examMethod}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-[9px] text-philsa-gray font-black uppercase tracking-widest mb-1">
                  Testing Station
                </p>
                <p className="font-extrabold text-philsa-navy text-sm" title={permit.testCenter}>
                  {permit.testCenter}
                </p>
              </div>
              <div>
                <p className="text-[9px] text-philsa-red font-black uppercase tracking-widest mb-1">
                  Room & Seat
                </p>
                <p className="font-extrabold text-philsa-navy text-sm">
                  {permit.room} • Seat {permit.seat}
                </p>
              </div>
              <div>
                <p className="text-[9px] text-philsa-gray font-black uppercase tracking-widest mb-1">
                  Assigned Proctor
                </p>
                <p className="font-extrabold text-philsa-navy text-sm">
                  {proctorName}
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Section: Instructions & Authority */}
          <div className="grid md:grid-cols-3 gap-10 items-start pt-2">
            <div className="md:col-span-2 space-y-6">
              <h4 className="text-[10px] font-black text-philsa-navy uppercase tracking-[0.2em]">
                Important Reminders
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                {[
                  {
                    title: "Arrival",
                    content:
                      "Present yourself at least 45 minutes before the exam starts.",
                  },
                  {
                    title: "Identification",
                    content:
                      "Bring this printed permit and your physical PhilID, ePhilID, or school ID Card.",
                  },
                  {
                    title: "Materials",
                    content:
                      "Only two (2) No. 2 Pencils and one (1) black ballpoint pen are permitted.",
                  },
                  {
                    title: "Prohibited",
                    content:
                      "No electronic equipment, calculators, or bags are allowed at the workspace.",
                  },
                ].map((item, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-philsa-red shrink-0" />
                      <span className="text-[10px] text-philsa-navy font-black uppercase tracking-widest">
                        {item.title}
                      </span>
                    </div>
                    <p className="text-xs text-philsa-gray font-medium leading-relaxed pl-3.5">
                      {item.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6 sm:pt-0 border-t md:border-t-0 md:border-l border-philsa-border md:pl-8 text-center md:text-left flex flex-col justify-end h-full min-h-[160px]">
              <div className="space-y-1 col">
                <p className="text-[9px] text-philsa-gray font-black uppercase tracking-widest leading-none">
                  AUTHORIZED BY
                </p>
                <p className="text-philsa-navy font-bold text-sm mt-3">
                  Office of the Registrar
                </p>
                <p className="text-[10px] text-philsa-gray font-medium">
                  PhilSA Admissions Bureau
                </p>
              </div>
              <div className="mt-4 inline-block bg-philsa-navy text-white text-[8px] font-black uppercase tracking-widest py-1 px-3 rounded-full mx-auto md:mx-0 w-fit">
                REGISTRAR ORIGINAL
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
