import React, { useState } from "react";
import { usePhilSA } from "../PhilSAContext";

interface MaintenanceModule {
  name: string;
  path: string;
  status: "ONLINE" | "MAINTENANCE";
  reason?: string;
  downtime?: string;
}

import {
  ShieldAlert,
  Activity,
  Power,
  CheckCircle2,
  AlertTriangle,
  Play,
  Mail,
  Clock,
  UserCheck,
  FileText,
  Eye,
  Info,
  Search,
  Filter,
  Settings,
  Database,
  Sliders,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";

export default function SystemCompliance() {
  const { 
    maintenanceModules, 
    setMaintenanceModules, 
    addAuditLog, 
    auditLogs,
    inputModules,
    setInputModules
  } = usePhilSA();

  const [isRunningCheck, setIsRunningCheck] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedModForOffline, setSelectedModForOffline] =
    useState<MaintenanceModule | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<any | null>(null);

  // Modal form states
  const [maintenanceReason, setMaintenanceReason] = useState(
    "Routine database optimizations to ensure security during the upcoming national exam cycle.",
  );
  const [scheduledEndDate, setScheduledEndDate] = useState("2026-05-25");
  const [scheduledEndTime, setScheduledEndTime] = useState("11:16");
  const [recipientSelector, setRecipientSelector] = useState(
    "Student Candidates & Applicants",
  );
  const [scheduledStartDate, setScheduledStartDate] = useState("2026-05-25");
  const [scheduledStartTime, setScheduledStartTime] = useState("09:16");
  const [emailSubject, setEmailSubject] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  const categoriesList = [
    { id: "ALL", label: "All Components" },
    { id: "STUDENT", label: "Student Portal" },
    { id: "ADMIN", label: "Admin & Government" },
    { id: "EXAM", label: "Exams & Results" },
    { id: "PROCTOR", label: "Proctors & Logistics" },
    { id: "PROTOCOLS", label: "Maintenance Protocols" },
  ];

  const filteredModules = maintenanceModules.filter((mod: any) => {
    // 1. Search Query Match
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      const nameMatch = mod.name.toLowerCase().includes(q);
      const pathMatch = mod.path.toLowerCase().includes(q);
      const categoryMatch = mod.category && mod.category.toLowerCase().includes(q);
      if (!nameMatch && !pathMatch && !categoryMatch) return false;
    }

    // 2. Category Match
    if (selectedCategory === "ALL") return true;
    if (selectedCategory === "STUDENT") {
      return mod.category === "Student Portal";
    }
    if (selectedCategory === "ADMIN") {
      return mod.category === "System Administration" || mod.category === "System Admin" || mod.category === "Government Oversight" || mod.category === "Operations & Records";
    }
    if (selectedCategory === "EXAM") {
      return mod.category === "Exam Management Hub" || mod.category === "Results & Analytics";
    }
    if (selectedCategory === "PROCTOR") {
      return mod.category === "Proctor Operations" || mod.category === "Testing Center Logistics";
    }
    if (selectedCategory === "PROTOCOLS") {
      return mod.category === "Maintenance & Protocols" || mod.category === "Maintenance Protocols";
    }
    return true;
  });

  const fieldGroups = [
    {
      id: "student_reg",
      name: "Student Registration System",
      description: "Controls the active student registration forms, applicant-facing personal information fields, and authentication toggles.",
      icon: FileText,
      targetIds: [
        "student_reg",
        "student_reg_gender",
        "student_reg_national_id",
        "student_reg_middle_name",
        "student_reg_birth_place",
        "student_reg_suffix"
      ]
    },
    {
      id: "admin_reg",
      name: "Admin Operations & Directory System",
      description: "Controls the manual student registration workflows, proctor lookup widgets, and background admin panels.",
      icon: Settings,
      targetIds: ["admin_manual_reg"]
    },
    {
      id: "testing_logistics",
      name: "Testing Center Logistics & Scanning",
      description: "Controls high-throughput paper answer sheet uploading fields, OMR configurations, and testing schedules.",
      icon: Database,
      targetIds: ["answer_sheet_upload"]
    },
    {
      id: "grading_system",
      name: "Grading, Scores, & Dispatches System",
      description: "Controls manual audit score correction sliders, dispatcher ledger updates, and formal override controls.",
      icon: Sliders,
      targetIds: ["score_correction"]
    }
  ];

  const handleRunCheck = () => {
    setIsRunningCheck(true);
    setTimeout(() => {
      setIsRunningCheck(false);
      addAuditLog(
        "SYSTEM_HEALTH_CHECK",
        "Full compliance audit completed. Cryptographic structures are validated.",
      );
    }, 1500);
  };

  // Toggle switch handling
  const handleToggleState = (mod: MaintenanceModule) => {
    const isOnline = mod.status !== "MAINTENANCE";
    if (isOnline) {
      // Toggling OFF (to MAINTENANCE) -> Needs modal
      setSelectedModForOffline(mod);
      setEmailSubject(
        `System Advisory: Urgent Maintenance Notice for [${mod.name}]`,
      );
      setShowConfirmModal(true);
    } else {
      // Toggling ON -> Instant online
      const updated = maintenanceModules.map((item) => {
        if (item.name === mod.name) {
          return {
            ...item,
            status: "ONLINE" as const,
            reason: undefined,
            downtime: undefined,
          };
        }
        return item;
      });
      setMaintenanceModules(updated);
      // Log the event
      addAuditLog(
        "MAINTENANCE_TOGGLE_ON",
        `Module [${mod.name}] Operational Status restored back to ONLINE`,
      );
    }
  };

  // Confirm toggling module offline
  const confirmOfflineToggle = () => {
    if (!selectedModForOffline) return;

    const formattedStart = `${scheduledStartDate} at ${scheduledStartTime}`;
    const formattedEnd = `${scheduledEndDate} at ${scheduledEndTime}`;
    const fullDowntimeDetails = `${formattedStart} to ${formattedEnd} PHT`;

    const updated = maintenanceModules.map((item) => {
      if (item.name === selectedModForOffline.name) {
        return {
          ...item,
          status: "MAINTENANCE" as const,
          reason: maintenanceReason,
          downtime: fullDowntimeDetails,
        };
      }
      return item;
    });

    setMaintenanceModules(updated);

    // Log audit logs
    addAuditLog(
      "MAINTENANCE_TOGGLE_OFF",
      `Module [${selectedModForOffline.name}] status toggled to OFFLINE. Subject: "${emailSubject}" (Reason: ${maintenanceReason})`,
    );
    addAuditLog(
      "EMAIL_NOTIFICATION_TRIGGERED",
      `Broadcasted downtime notice to [${recipientSelector}] for module ${selectedModForOffline.name}`,
    );

    // Reset states and close
    setShowConfirmModal(false);
    setSelectedModForOffline(null);
  };

  // Filter audit logs specifically for module maintenance/health checks
  const complianceLogs = auditLogs.filter(
    (log) =>
      log.action.startsWith("MAINTENANCE_") ||
      log.action === "EMAIL_NOTIFICATION_TRIGGERED" ||
      log.action === "SYSTEM_HEALTH_CHECK",
  );

  return (
    <div className="space-y-10 font-sans">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-philsa-navy mb-2 tracking-tight">
            System & Compliance Control
          </h1>
          <p className="text-philsa-gray text-sm font-medium">
            Verify system alignment with national policy compliance, toggle
            service schedules, and inspect logs.
          </p>
        </div>
      </div>

      {/* Search and filtering tabs */}
      <div className="flex flex-col gap-6 md:flex-row md:items-center justify-between p-6 bg-white border border-philsa-border rounded-2xl">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-philsa-gray/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.value)}
            placeholder="Search modules by name, endpoint or scope..."
            className="input-philsa !pl-11 py-2.5 text-xs text-philsa-navy"
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[10px] font-black uppercase text-philsa-gray tracking-wider mr-2 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filter Group:
          </span>
          {categoriesList.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg border transition-all cursor-pointer",
                selectedCategory === cat.id
                  ? "bg-philsa-red text-white border-philsa-red"
                  : "bg-philsa-bg text-philsa-gray border-philsa-border hover:bg-slate-100"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Left Column - Module Status Table */}
        <div className="lg:col-span-3 space-y-8">
          <div className="card-philsa !p-0 overflow-hidden">


            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-philsa-bg text-[10px] text-philsa-gray font-bold uppercase tracking-[0.15em]">
                  <tr>
                    <th className="px-8 py-4">Module Component</th>
                    <th className="px-8 py-4">Operational Status</th>
                    <th className="px-8 py-4 text-right">
                      Service Control Toggle
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-philsa-border">
                  {filteredModules.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-8 py-12 text-center text-xs font-bold text-philsa-gray/50 uppercase tracking-wider">
                        No platform modules matched your query
                      </td>
                    </tr>
                  ) : (
                    filteredModules.map((mod) => {
                      const online = mod.status !== "MAINTENANCE";
                      return (
                        <tr
                          key={mod.name}
                          className="hover:bg-philsa-bg/40 transition-colors"
                        >
                          <td className="px-8 py-5">
                            <p className="text-sm font-extrabold text-philsa-navy tracking-tight">
                              {mod.name}
                            </p>
                            <p className="text-[10px] text-philsa-gray font-bold uppercase tracking-widest mt-0.5">
                              Endpoint: {mod.path}
                            </p>
                          </td>
                          <td className="px-8 py-5">
                            <span
                              className={cn(
                                "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                                online
                                  ? "bg-green-50 text-green-700 border-green-100"
                                  : "bg-red-50 text-red-700 border-red-100",
                              )}
                            >
                              {online ? "ONLINE" : "MAINTENANCE"}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-right">
                            <div className="flex justify-end items-center gap-3">
                              <span
                                className={cn(
                                  "text-[10px] font-black uppercase tracking-wider",
                                  online ? "text-green-600" : "text-philsa-gray",
                                )}
                              >
                                {online ? "Online" : "Locked"}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleToggleState(mod)}
                                className={cn(
                                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-philsa-red/20 focus:ring-offset-2",
                                  online ? "bg-green-600" : "bg-slate-300",
                                )}
                              >
                                <span
                                  className={cn(
                                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
                                    online ? "translate-x-5" : "translate-x-0",
                                  )}
                                />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Dynamic Silent Input Fields Control Registry */}
        <div className="space-y-6 pt-6 border-t border-philsa-border">
          <div>
            <h2 className="text-xl font-extrabold text-philsa-navy mb-1 flex items-center gap-2 tracking-tight">
              <Power className="w-5 h-5 text-philsa-red" />
              Dynamic Input Fields Registry & Status Overrides
            </h2>
            <p className="text-philsa-gray text-xs font-semibold">
              Leverage absolute system flexibility by activating or deactivating specific data-entry forms or overlays instantly. Modifications propagate silently without notifying users.
            </p>
          </div>

          <div className="card-philsa !p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-philsa-bg text-[10px] text-philsa-gray font-bold uppercase tracking-[0.15em]">
                  <tr>
                    <th className="px-8 py-4">Data Entry Interface Module</th>
                    <th className="px-8 py-4">Status & Field Metrics</th>
                    <th className="px-8 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-philsa-border">
                  {fieldGroups.map((group) => {
                    const GroupIcon = group.icon;
                    const groupFields = inputModules ? inputModules.filter(f => group.targetIds.includes(f.id)) : [];
                    const activeCount = groupFields.filter(f => f.isActive).length;
                    const totalCount = groupFields.length;
                    const allActive = activeCount === totalCount;
                    const noneActive = activeCount === 0;

                    return (
                      <tr key={group.id} className="hover:bg-philsa-bg/40 transition-colors">
                        <td className="px-8 py-5">
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl bg-philsa-bg border border-philsa-border text-philsa-navy flex items-center justify-center shrink-0 mt-0.5">
                              <GroupIcon className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-sm font-extrabold text-philsa-navy tracking-tight">{group.name}</p>
                              <p className="text-[11px] text-philsa-gray font-medium mt-1 leading-relaxed max-w-lg">{group.description}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
                                allActive 
                                  ? "bg-green-50 text-green-700 border-green-100" 
                                  : noneActive 
                                  ? "bg-red-50 text-red-700 border-red-100" 
                                  : "bg-amber-50 text-amber-700 border-amber-100"
                              )}>
                                {allActive ? "FULLY ACTIVE" : noneActive ? "DISABLED" : "PARTIALLY ACTIVE"}
                              </span>
                            </div>
                            <p className="text-[10px] text-philsa-gray font-bold uppercase tracking-wider">
                              {activeCount} of {totalCount} fields active
                            </p>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedGroup(group)}
                            className="inline-flex items-center gap-1.5 px-4.5 py-2 bg-philsa-navy hover:bg-slate-850 text-white font-black uppercase text-[10px] tracking-widest rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
                          >
                            <Eye className="w-3.5 h-3.5" /> View Inputs
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* CONFIRM TOGGLE OFFLINE MODAL */}
      <AnimatePresence>
        {showConfirmModal && selectedModForOffline && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-philsa-border text-left max-h-[90vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-6 bg-red-50 border-b border-red-100 flex items-start gap-4 shrink-0">
                <div className="w-12 h-12 rounded-2xl bg-red-100 text-philsa-red flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-philsa-navy leading-tight">
                    Restrict Module Operational Access
                  </h3>
                  <p className="text-xs text-philsa-gray mt-1 leading-relaxed">
                    You are initiating a system-wide administrative lockout of the{" "}
                    <strong className="text-philsa-navy font-bold">
                      [{selectedModForOffline.name}]
                    </strong>{" "}
                    module. Users currently accessing this interface will be immediately restricted from completing tasks until status is reverted back to Online.
                  </p>
                </div>
              </div>

              {/* Scrollable Modal Content Body */}
              <div className="p-6 overflow-y-auto space-y-5 flex-1">
                {/* Dynamic Cascading System Impact Assessment */}
                <div className="p-5 bg-amber-50 rounded-2xl border border-amber-200 space-y-3.5">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                    <h4 className="text-[10px] font-black tracking-wider uppercase text-amber-800">
                      Cascading System Impact Assessment
                    </h4>
                  </div>
                  <p className="text-xs text-amber-900 leading-relaxed font-bold">
                    WARNING: Putting [{selectedModForOffline.name}] offline will trigger instant service locks across the following linked modules and sub-features:
                  </p>
                  
                  <div className="space-y-2.5">
                    {(() => {
                      const nameLower = selectedModForOffline.name.toLowerCase();
                      const category = selectedModForOffline.category || "";
                      
                      // Identify real affected targets from the system
                      let affectedTargets = [];
                      
                      if (nameLower.includes("student application") || nameLower.includes("registration")) {
                        affectedTargets = [
                          { id: "9", name: "Review Applications", impact: "Evaluating admissions list will be locked since new registrations cannot be processed." },
                          { id: "10", name: "University Applications", impact: "Administrative pipeline for reviewing institution choice rosters will freeze." },
                          { id: "36", name: "Student Registration", impact: "Structural registration configuration updates will be read-only until system is restored." },
                          { id: "37", name: "Application Status", impact: "Students cannot check their active verification status indicators." }
                        ];
                      } else if (nameLower.includes("dashboard")) {
                        affectedTargets = [
                          { id: "2", name: "Student Application", impact: "Applicants will encounter navigation blocks when trying to resume application sessions." },
                          { id: "3", name: "Exam Permit", impact: "Students cannot initiate PDF printouts or QR code downloads from their primary desk." }
                        ];
                      } else if (nameLower.includes("permit")) {
                        affectedTargets = [
                          { id: "28", name: "Attendance", impact: "Check-in proctors cannot read security permits at testing gates." },
                          { id: "12", name: "Center Availability", impact: "Roster seat matching calculations will be suspended." }
                        ];
                      } else if (nameLower.includes("results") || nameLower.includes("matrix") || nameLower.includes("scores")) {
                        affectedTargets = [
                          { id: "24", name: "Score Management", impact: "Direct assessment calibration will shut down." },
                          { id: "15", name: "Reporting Matrix", impact: "Oversight tables cannot retrieve passed statistics." }
                        ];
                      } else if (nameLower.includes("incident") || nameLower.includes("recording")) {
                        affectedTargets = [
                          { id: "29", name: "Exam Monitoring", impact: "Live video feeds and browser focus track signals cannot be archived." },
                          { id: "42", name: "Exam Integrity", impact: "AI face-detection model calibrations will suspend alert dispatches." }
                        ];
                      } else if (nameLower.includes("batch management") || nameLower.includes("schedules") || nameLower.includes("batch")) {
                        affectedTargets = [
                          { id: "26", name: "Exam Schedule", impact: "Proctors cannot view active candidate shift allocations or room numbers." },
                          { id: "35", name: "Center Management", impact: "Testing center room capacities will run on outdated local lists." },
                          { id: "39", name: "Batch Config", impact: "Administrative timing adjustments are closed for all proctors." }
                        ];
                      } else if (nameLower.includes("question bank") || nameLower.includes("exam sets") || nameLower.includes("blueprints")) {
                        affectedTargets = [
                          { id: "26", name: "Exam Schedule", impact: "Active proctor sessions cannot dispatch randomize seeds." },
                          { id: "29", name: "Exam Monitoring", impact: "Invigilation console will experience quiz resource loading errors." },
                          { id: "43", name: "Question Config", impact: "Integrity constraints for draft question review will stop." }
                        ];
                      } else if (nameLower.includes("exam review") || nameLower.includes("grading")) {
                        affectedTargets = [
                          { id: "24", name: "Score Management", impact: "Academic grading totals cannot be dispatched to legislative score sheets." },
                          { id: "4", name: "Results", impact: "Student performance portals will hold feedback in 'calibrating' states." }
                        ];
                      } else if (nameLower.includes("courses") || nameLower.includes("catalog") || nameLower.includes("programs")) {
                        affectedTargets = [
                          { id: "2", name: "Student Application", impact: "Candidates select course options on registration will default to placeholder values." },
                          { id: "10", name: "University Applications", impact: "Administrative program overview list will stop synchronizations." }
                        ];
                      } else if (nameLower.includes("monitoring") || nameLower.includes("proctor")) {
                        affectedTargets = [
                          { id: "6", name: "Incident Monitor", impact: "Government inspectors cannot see live fraud notifications or room streams." },
                          { id: "7", name: "Recording Archive", impact: "Session playbacks won't save to secure cloud folders." }
                        ];
                      } else {
                        // Dynamically find modules in the same category as fallback
                        const sameCategory = maintenanceModules
                          .filter((m: any) => m.category === category && m.id !== selectedModForOffline.id)
                          .slice(0, 3);
                        affectedTargets = sameCategory.map((m: any) => ({
                          id: m.id,
                          name: m.name,
                          impact: `This linked component within the [${category}] category will experience downstream read-only access states.`
                        }));
                      }

                      // Resolve each target to its actual item in system's maintenanceModules
                      const actualAffected = affectedTargets.map(t => {
                        const matched = maintenanceModules.find((m: any) => m.id === t.id || m.name.toLowerCase() === t.name.toLowerCase());
                        return {
                          name: matched ? matched.name : t.name,
                          path: matched ? matched.path : "",
                          category: matched ? matched.category : "",
                          status: matched ? matched.status : "ONLINE",
                          impact: t.impact
                        };
                      });

                      return actualAffected.map((aff, idx) => (
                        <div key={idx} className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 bg-white p-4 rounded-2xl border border-amber-200 hover:border-amber-300 shadow-[0_2px_8px_rgba(245,158,11,0.05)] transition-all">
                          <div className="flex items-start gap-3">
                            <CheckCircle2 className="w-4 h-4 text-amber-700 mt-1 shrink-0" />
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-xs font-black text-amber-950 font-sans tracking-tight">{aff.name}</p>
                                {aff.category && (
                                  <span className="bg-amber-100/70 text-amber-800 font-mono text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">
                                    {aff.category}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-amber-950/80 mt-1 leading-relaxed font-medium">
                                {aff.impact}
                              </p>
                              {aff.path && (
                                <p className="text-[9px] text-slate-400 font-bold font-mono tracking-wider uppercase mt-1">
                                  Endpoint Path: {aff.path}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="shrink-0 pt-0.5">
                            <span className={cn(
                              "px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border",
                              aff.status === "ONLINE" 
                                ? "bg-green-50 text-green-700 border-green-200" 
                                : "bg-red-50 text-red-700 border-red-200"
                            )}>
                              {aff.status}
                            </span>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>

                {/* Modal Email Composer Form */}
                <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                  {/* Webmail Compose Header */}
                  <div className="bg-slate-100 border-b border-slate-200 px-5 py-3.5 flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                      <Mail className="w-4 h-4 text-slate-500" /> New Advisory Broadcast Dispatch
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono font-black">
                      phil-safeguard@philsa.gov.ph
                    </span>
                  </div>

                  <div className="p-5 space-y-4">
                    {/* To Field -> Recipient */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center pb-3 border-b border-slate-200">
                      <label className="sm:col-span-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        To (Recipient):
                      </label>
                      <div className="sm:col-span-10">
                        <select
                          value={recipientSelector}
                          onChange={(e) => setRecipientSelector(e.target.value)}
                          className="w-full bg-transparent border-none p-0 text-xs font-black text-philsa-navy focus:outline-none focus:ring-0 cursor-pointer"
                        >
                          <option value="Student Candidates & Applicants">
                            Student Candidates & Applicants
                          </option>
                          <option value="Admissions Reviewers & Proctors">
                            Admissions Reviewers & Proctors
                          </option>
                          <option value="Academic Institution Evaluators">
                            Academic Institution Evaluators
                          </option>
                          <option value="All active registered system platform users">
                            All registered platform users
                          </option>
                        </select>
                      </div>
                    </div>

                    {/* Subject Field */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center pb-3 border-b border-slate-200">
                      <label className="sm:col-span-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Subject:
                      </label>
                      <div className="sm:col-span-10">
                        <input
                          type="text"
                          value={emailSubject}
                          onChange={(e) => setEmailSubject(e.target.value)}
                          className="w-full bg-transparent border-none p-0 text-xs font-bold text-philsa-navy focus:outline-none focus:ring-0"
                          placeholder="e.g. System Advisory: Urgent Maintenance Notice for module"
                        />
                      </div>
                    </div>

                    {/* Scheduled Start Date and Time */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center pb-3 border-b border-slate-200">
                      <label className="sm:col-span-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Start Schedule:
                      </label>
                      <div className="sm:col-span-10 flex flex-col sm:flex-row gap-3">
                        <div className="flex-1 flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                          <span className="text-[10px] text-slate-400 font-black uppercase">Date</span>
                          <input
                            type="date"
                            value={scheduledStartDate}
                            onChange={(e) => setScheduledStartDate(e.target.value)}
                            className="bg-transparent border-none w-full text-xs font-bold text-philsa-navy focus:outline-none cursor-pointer"
                          />
                        </div>
                        <div className="flex-1 flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                          <span className="text-[10px] text-slate-400 font-black uppercase">Time</span>
                          <input
                            type="time"
                            value={scheduledStartTime}
                            onChange={(e) => setScheduledStartTime(e.target.value)}
                            className="bg-transparent border-none w-full text-xs font-bold text-philsa-navy focus:outline-none cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Scheduled End Date and Time */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center pb-3 border-b border-slate-200">
                      <label className="sm:col-span-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        End Date Schedule:
                      </label>
                      <div className="sm:col-span-10 flex flex-col sm:flex-row gap-3">
                        <div className="flex-1 flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                          <span className="text-[10px] text-slate-400 font-black uppercase">Date</span>
                          <input
                            type="date"
                            value={scheduledEndDate}
                            onChange={(e) => setScheduledEndDate(e.target.value)}
                            className="bg-transparent border-none w-full text-xs font-bold text-philsa-navy focus:outline-none cursor-pointer"
                          />
                        </div>
                        <div className="flex-1 flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                          <span className="text-[10px] text-slate-400 font-black uppercase">Time</span>
                          <input
                            type="time"
                            value={scheduledEndTime}
                            onChange={(e) => setScheduledEndTime(e.target.value)}
                            className="bg-transparent border-none w-full text-xs font-bold text-philsa-navy focus:outline-none cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Email Message body / Reason For Service Lock */}
                    <div className="space-y-2 pt-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                        Advisory Message (Email Body):
                      </label>
                      <textarea
                        rows={5}
                        value={maintenanceReason}
                        onChange={(e) => setMaintenanceReason(e.target.value)}
                        placeholder="State advisory reasons / message details precisely..."
                        className="w-full bg-white border border-slate-200 rounded-xl p-4 text-xs font-medium text-philsa-navy focus:outline-none focus:ring-2 focus:ring-philsa-red/25 resize-none leading-relaxed shadow-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="p-6 bg-philsa-bg border-t border-philsa-border flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirmModal(false);
                    setSelectedModForOffline(null);
                  }}
                  className="btn-secondary py-3 px-6 text-xs uppercase font-black"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmOfflineToggle}
                  className="px-6 py-3 bg-philsa-red hover:bg-red-800 text-white font-extrabold rounded-xl text-xs uppercase tracking-widest shadow-lg shadow-philsa-red/10 transition-colors"
                >
                  Submit Notice
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIGURE INPUTS MODAL */}
      <AnimatePresence>
        {selectedGroup && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-philsa-border text-left flex flex-col max-h-[85vh]"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-philsa-border flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-philsa-bg border border-philsa-border text-philsa-navy flex items-center justify-center shrink-0">
                    {(() => {
                      const GroupIcon = selectedGroup.icon;
                      return <GroupIcon className="w-6 h-6" />;
                    })()}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-philsa-navy leading-tight">
                      {selectedGroup.name}
                    </h3>
                    <p className="text-xs text-philsa-gray mt-1 leading-relaxed max-w-lg">
                      Configure granular field visibility and interactive overrides for this module. Swapping any switch updates the active state immediately.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedGroup(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-philsa-navy hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body - Scrollable List of Fields */}
              <div className="p-6 overflow-y-auto space-y-4">
                {inputModules && inputModules
                  .filter((item) => selectedGroup.targetIds.includes(item.id))
                  .map((mod) => {
                    return (
                      <div
                        key={mod.id}
                        className="p-5 rounded-2xl border border-philsa-border hover:border-philsa-navy/25 bg-slate-50/50 hover:bg-white transition-all space-y-4 shadow-2xs"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <h4 className="text-sm font-black text-philsa-navy tracking-tight">
                              {mod.name}
                            </h4>
                            <p className="text-xs text-philsa-gray font-medium leading-relaxed">
                              {mod.description}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span
                              className={cn(
                                "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
                                mod.isActive
                                  ? "bg-green-50 text-green-700 border-green-100"
                                  : "bg-red-50 text-red-700 border-red-100",
                              )}
                            >
                              {mod.isActive ? "ACTIVE" : "DISABLED"}
                            </span>

                            <button
                              type="button"
                              onClick={() => {
                                const updated = inputModules.map((item) => {
                                  if (item.id === mod.id) {
                                    const nextState = !item.isActive;
                                    addAuditLog(
                                      "INPUT_TOGGLE",
                                      `System admin adjusted input permissions within group: [${item.name}] set silently to ${nextState ? "ACTIVE" : "DEACTIVATED"} to support total interface compliance.`,
                                    );
                                    return { ...item, isActive: nextState };
                                  }
                                  return item;
                                });
                                setInputModules(updated);
                              }}
                              className={cn(
                                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-philsa-red/20 focus:ring-offset-2",
                                mod.isActive ? "bg-green-600" : "bg-slate-300",
                              )}
                            >
                              <span
                                className={cn(
                                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
                                  mod.isActive ? "translate-x-5" : "translate-x-0",
                                )}
                              />
                            </button>
                          </div>
                        </div>

                        {/* Associated targets */}
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                          <span className="text-[9px] font-black uppercase text-philsa-gray/60 tracking-wider">
                            Scope Path:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {mod.targetForms.map((ele) => (
                              <span
                                key={ele}
                                className="bg-white border border-slate-200 text-slate-500 font-mono text-[9px] font-bold tracking-tight px-2 py-0.5 rounded"
                              >
                                {ele}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Modal Footer */}
              <div className="p-6 bg-philsa-bg border-t border-philsa-border flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedGroup(null)}
                  className="btn-secondary py-2.5 px-6 text-xs uppercase font-black"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
