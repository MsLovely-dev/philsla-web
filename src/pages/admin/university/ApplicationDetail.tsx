import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  FileText, 
  ShieldAlert, 
  History, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  MessageSquare, 
  Download,
  Calendar,
  User,
  GraduationCap,
  ClipboardList,
  MapPin,
  Activity,
  ShieldCheck,
  Eye,
  BookOpen,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePhilSA } from '../../../PhilSAContext';
import SuccessModal from '../../../components/SuccessModal';

// Shared Mock application data to align Reviewer and University panels
const MOCK_APP = {
  id: 'REG-2026-8421',
  firstName: 'MARCUS',
  lastName: 'VALERIUS',
  middleName: 'ANTONIUS',
  suffix: 'JR',
  dob: '2008-04-12',
  birthPlace: 'Quezon City, Metro Manila',
  nationality: 'Filipino',
  gender: 'MALE',
  email: 'm.valerius@cloud.edu.ph',
  mobile: '+63 917 842 1002',
  nationalId: '1004-9842-4128',
  fatherName: 'AURELIUS VALERIUS',
  fatherOccupation: 'PhilSA Engineer',
  fatherMobile: '+63 917 121 2111',
  fatherMonthlyIncome: '₱85,000',
  motherName: 'SERENA ANTONIA-VALERIUS',
  motherOccupation: 'Public School Teacher',
  motherMobile: '+63 918 242 4323',
  motherMonthlyIncome: '₱45,000',
  guardianName: 'AURELIUS VALERIUS',
  guardianOccupation: 'PhilSA Engineer',
  guardianMobile: '+63 917 121 2111',
  siblingsCount: 2,
  region: 'National Capital Region (NCR)',
  province: 'Metro Manila',
  city: 'Quezon City',
  barangay: 'Diliman',
  street: '12 Laurel Street, Area 1',
  zipCode: '1101',
  currentRegion: 'National Capital Region (NCR)',
  currentProvince: 'Metro Manila',
  currentCity: 'Quezon City',
  currentBarangay: 'Diliman',
  currentStreet: '12 Laurel Street, Area 1',
  currentZipCode: '1101',
  lrn: '101234567890',
  schoolName: 'Philippine Science High School - Main',
  schoolAddress: 'Agham Road, Diliman, Quezon City',
  academicTrack: 'STEM',
  gradeLevel: 'Grade 12',
  gwa: '96.5',
  universities: ['University of the Philippines Diliman', 'De La Salle University'],
  courses: ['BS Computer Science', 'BS Mechanical Engineering'],
  examScheduleId: 'NCR-APP26-AM',
  center: 'National Capital Region Hub - Quezon City',
  risk: 'LOW',
  status: 'PENDING',
  photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
  history: [
    { date: '2026-05-01 14:32', status: 'SUBMITTED', actor: 'Marcus Valerius (Applicant)', notes: 'Initial registration payload received.' },
    { date: '2026-05-02 09:15', status: 'VERIFIED', actor: 'System Core Audit', notes: 'PhilID confirmed against registry.' }
  ],
  duplicateScore: 12,
  duplicateStatus: 'NO_RECORDS_FOUND'
};

export default function ApplicationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, addAuditLog } = usePhilSA();
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'DOCUMENTS' | 'EXAM_RESULTS' | 'INCIDENTS'>('DETAILS');
  const [status, setStatus] = useState<string>('PENDING');
  const [remarks, setRemarks] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [successConfig, setSuccessConfig] = useState<{
    isOpen: boolean;
    type: 'ACCEPTED' | 'REJECTED' | 'FOR_CORRECTION';
    title: string;
    message: string;
    actionLabel?: string;
  }>({
    isOpen: false,
    type: 'ACCEPTED',
    title: '',
    message: ''
  });

  const handleAction = (newStatus: string) => {
    setStatus(newStatus);
    const statusLabel = newStatus === 'ACCEPTED' ? 'Approved' : newStatus === 'FOR_CORRECTION' ? 'For Correction' : 'Rejected';
    
    // Comprehensive Audit Logging
    addAuditLog('APPLICATION_REVIEW', JSON.stringify({
      reviewer: user?.name || user?.email,
      reviewerId: user?.id,
      applicationId: id,
      status: newStatus,
      statusLabel: statusLabel,
      remarks: remarks,
      timestamp: new Date().toISOString(),
      action: `University Application ${id} marked as ${statusLabel}`
    }));

    setSuccessConfig({
      isOpen: true,
      type: newStatus as any,
      title: `Application ${statusLabel}`,
      message: `The university application ${id} has been successfully updated to ${statusLabel.toUpperCase()} status and logged in the audit trail.`,
      actionLabel: "Okay"
    });
  };

  return (
    <div className="space-y-8">
      {/* Top Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-philsa-bg rounded-lg transition-colors border border-philsa-border shadow-sm text-philsa-navy"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-philsa-navy tracking-tight">Review Application: {id || MOCK_APP.id}</h1>
            <p className="text-philsa-gray text-sm font-medium">Detailed student profile and academic verification audit.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <button className="bg-philsa-navy text-white font-black py-3 px-8 rounded-xl text-[10px] uppercase tracking-widest hover:bg-philsa-navy/90 active:scale-[0.98] shadow-lg shadow-philsa-navy/20 transition-all">
              Export Audit Log
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Stats/Brief */}
        <div className="lg:col-span-1 space-y-6">
          <div className="card-philsa p-6">
            <div className="w-full aspect-[3/4] rounded-2xl overflow-hidden bg-philsa-bg border-2 border-philsa-border mb-6 shadow-inner relative group">
               <img 
                 referrerPolicy="no-referrer" 
                 src={MOCK_APP.photoUrl} 
                 alt="Student" 
                 className="w-full h-full object-cover"
               />
               <div className="absolute inset-0 bg-philsa-navy/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-[8px] font-black text-white uppercase tracking-[0.3em] bg-philsa-navy/60 px-3 py-1 rounded-full backdrop-blur-md">Biometric ID</span>
               </div>
            </div>
            <h2 className="text-xl font-extrabold text-philsa-navy tracking-tight">{MOCK_APP.firstName} {MOCK_APP.lastName}</h2>
            <p className="text-philsa-gray text-sm font-medium mb-4">{id || MOCK_APP.id}</p>
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase ${
              status === 'ACCEPTED' ? 'bg-emerald-50 text-emerald-700' : 
              status === 'REJECTED' ? 'bg-red-50 text-red-700' : 
              status === 'FOR_CORRECTION' ? 'bg-amber-50 text-amber-700' :
              'bg-blue-50 text-blue-700'
            }`}>
              {status === 'ACCEPTED' ? <CheckCircle className="w-3 h-3" /> : 
               status === 'REJECTED' ? <XCircle className="w-3 h-3" /> : 
               status === 'FOR_CORRECTION' ? <AlertCircle className="w-3 h-3" /> :
               <History className="w-3 h-3" />}
              {status === 'ACCEPTED' ? 'Registration Exam Permit Approved' : 
               status === 'REJECTED' ? 'Rejected' : 
               status === 'FOR_CORRECTION' ? 'For Correction' :
               'Under Review'}
            </div>
          </div>

          <div className="card-philsa p-6">
            <h3 className="text-xs font-black text-philsa-navy tracking-[0.2em] uppercase mb-6 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-philsa-red" /> Current Choices
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-black text-philsa-gray uppercase tracking-widest mb-1">University</p>
                <p className="text-sm font-bold text-philsa-navy">{MOCK_APP.universities[0]}</p>
              </div>
              <div className="pt-4 border-t border-philsa-border">
                <p className="text-[10px] font-black text-philsa-gray uppercase tracking-widest mb-1">Course choice</p>
                <p className="text-sm font-bold text-philsa-navy">{MOCK_APP.courses[0]}</p>
              </div>
              <div className="pt-4 border-t border-philsa-border">
                <p className="text-[10px] font-black text-philsa-gray uppercase tracking-widest mb-1">Secondary choice</p>
                <p className="text-sm font-bold text-philsa-navy">{MOCK_APP.courses[1] || 'None'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Details/Tabs */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex bg-philsa-bg p-1 rounded-2xl w-fit">
            {[
              { id: 'DETAILS', label: 'Student Bio', icon: User },
              { id: 'DOCUMENTS', label: 'Verification Files', icon: FileText },
              { id: 'EXAM_RESULTS', label: 'Entrance Scores', icon: ClipboardList },
              { id: 'INCIDENTS', label: 'Proctor Audit', icon: ShieldAlert },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold tracking-tight transition-all ${
                  activeTab === tab.id 
                    ? 'bg-white text-philsa-navy shadow-lg shadow-black/5 scale-105 z-10' 
                    : 'text-philsa-gray hover:text-philsa-navy'
                }`}
              >
                <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-philsa-red' : ''}`} />
                {tab.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'DETAILS' && (
              <motion.div 
                key="details"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="card-philsa p-10 bg-white border border-philsa-border relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-8 opacity-5">
                   <User className="w-32 h-32 text-philsa-navy" />
                </div>
                <div className="space-y-10 relative z-10 text-philsa-navy font-sans">
                  {/* SECTION 1: Personal Information */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-[#8A1538] uppercase tracking-wider pb-1.5 border-b border-[#8A1538]/20 flex items-center gap-2 font-sans">
                      <User className="w-4 h-4 text-[#00563F]" /> Personal Information
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 bg-gray-50/50 p-6 rounded-xl border border-gray-100">
                      <DataRow label="First Name" value={MOCK_APP.firstName} />
                      <DataRow label="Middle Name" value={MOCK_APP.middleName} />
                      <DataRow label="Last Name" value={MOCK_APP.lastName} />
                      <DataRow label="Suffix" value={MOCK_APP.suffix || "None"} />
                      <DataRow label="Date of Birth" value={MOCK_APP.dob} />
                      <DataRow label="Gender" value={MOCK_APP.gender} />
                      <DataRow label="Place of Birth" value={MOCK_APP.birthPlace} />
                      <DataRow label="Nationality" value={MOCK_APP.nationality} />
                      <DataRow label="National ID Number" value={MOCK_APP.nationalId} />
                      <DataRow label="Email Address" value={MOCK_APP.email} />
                      <DataRow label="Mobile Number" value={MOCK_APP.mobile} />
                    </div>
                  </div>

                  {/* SECTION 2: Permanent & Current Address */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-[#8A1538] uppercase tracking-wider pb-1.5 border-b border-[#8A1538]/20 flex items-center gap-2 font-sans">
                      <MapPin className="w-4 h-4 text-[#00563F]" /> Residential Address
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Permanent Address */}
                      <div className="bg-gray-50/50 p-6 rounded-xl border border-gray-100 space-y-4">
                        <h4 className="text-[10px] font-black text-[#00563F] tracking-widest uppercase">Permanent Address</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <DataRow label="Street Address" value={MOCK_APP.street} />
                          <DataRow label="Barangay" value={MOCK_APP.barangay} />
                          <DataRow label="City / Municipality" value={MOCK_APP.city} />
                          <DataRow label="Province" value={MOCK_APP.province} />
                          <DataRow label="Region" value={MOCK_APP.region} />
                          <DataRow label="Zip Code" value={MOCK_APP.zipCode} />
                        </div>
                      </div>
                      
                      {/* Current Address */}
                      <div className="bg-gray-50/50 p-6 rounded-xl border border-gray-100 space-y-4">
                        <div className="flex justify-between items-center">
                          <h4 className="text-[10px] font-black text-[#00563F] tracking-widest uppercase">Current Address</h4>
                          <span className="text-[8px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full uppercase">Same as permanent</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <DataRow label="Street Address" value={MOCK_APP.currentStreet} />
                          <DataRow label="Barangay" value={MOCK_APP.currentBarangay} />
                          <DataRow label="City / Municipality" value={MOCK_APP.currentCity} />
                          <DataRow label="Province" value={MOCK_APP.currentProvince} />
                          <DataRow label="Region" value={MOCK_APP.currentRegion} />
                          <DataRow label="Zip Code" value={MOCK_APP.currentZipCode} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 3: Educational Background */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-[#8A1538] uppercase tracking-wider pb-1.5 border-b border-[#8A1538]/20 flex items-center gap-2 font-sans">
                      <BookOpen className="w-4 h-4 text-[#00563F]" /> Educational Background
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 bg-gray-50/50 p-6 rounded-xl border border-gray-100 font-sans">
                      <DataRow label="Learner Reference Number (LRN)" value={MOCK_APP.lrn} />
                      <DataRow label="High School Name" value={MOCK_APP.schoolName} />
                      <DataRow label="High School Address" value={MOCK_APP.schoolAddress} />
                      <DataRow label="Grade Level" value={MOCK_APP.gradeLevel} />
                      <DataRow label="Academic Track / Strand" value={MOCK_APP.academicTrack} />
                      <DataRow label="General Weighted Average (GWA)" value={`${MOCK_APP.gwa}%`} />
                    </div>
                  </div>

                  {/* SECTION 4: Socio-Economic Information */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-[#8A1538] uppercase tracking-wider pb-1.5 border-b border-[#8A1538]/20 flex items-center gap-2 font-sans">
                      <Activity className="w-4 h-4 text-[#00563F]" /> Socio-Economic Background
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-gray-50/50 p-6 rounded-xl border border-gray-100 font-sans">
                      <div className="space-y-3">
                        <h4 className="text-[9px] font-black text-philsa-gray uppercase tracking-wider">Father's Information</h4>
                        <div className="space-y-2">
                          <DataRow label="Full Name" value={MOCK_APP.fatherName} />
                          <DataRow label="Occupation" value={MOCK_APP.fatherOccupation} />
                          <DataRow label="Contact Number" value={MOCK_APP.fatherMobile} />
                          <DataRow label="Monthly Income" value={MOCK_APP.fatherMonthlyIncome} />
                        </div>
                      </div>
                      <div className="space-y-3 pt-4 md:pt-0">
                        <h4 className="text-[9px] font-black text-philsa-gray uppercase tracking-wider">Mother's Information</h4>
                        <div className="space-y-2">
                          <DataRow label="Full Name" value={MOCK_APP.motherName} />
                          <DataRow label="Occupation" value={MOCK_APP.motherOccupation} />
                          <DataRow label="Contact Number" value={MOCK_APP.motherMobile} />
                          <DataRow label="Monthly Income" value={MOCK_APP.motherMonthlyIncome} />
                        </div>
                      </div>
                      <div className="space-y-3 pt-4 lg:pt-0">
                        <h4 className="text-[9px] font-black text-philsa-gray uppercase tracking-wider">Guardian & Household Details</h4>
                        <div className="space-y-2">
                          <DataRow label="Guardian Name" value={MOCK_APP.guardianName} />
                          <DataRow label="Guardian Occupation" value={MOCK_APP.guardianOccupation} />
                          <DataRow label="Guardian Mobile" value={MOCK_APP.guardianMobile} />
                          <DataRow label="Number of Siblings" value={MOCK_APP.siblingsCount.toString()} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 5: University Selection & Exam Schedule */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-[#8A1538] uppercase tracking-wider pb-1.5 border-b border-[#8A1538]/20 flex items-center gap-2 font-sans">
                      <ShieldCheck className="w-4 h-4 text-[#00563F]" /> Admission Preferences & Scheduling
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 bg-gray-50/50 p-6 rounded-xl border border-gray-100 font-sans">
                      <DataRow label="Target Universities" value={MOCK_APP.universities.join(', ')} />
                      <DataRow label="Course / Program Preferences" value={MOCK_APP.courses.join(', ')} />
                      <DataRow label="Allocated Exam Schedule" value="NCR-APP26-AM (April 26, 2026 - Morning Slot)" />
                      <div className="sm:col-span-2 md:col-span-3">
                         <DataRow label="Designated Testing Hub" value={MOCK_APP.center} />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'INCIDENTS' && (
              <motion.div 
                key="incidents"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="bg-red-50 border border-red-100 p-6 rounded-2xl flex items-start gap-4">
                   <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-red-100 shadow-sm shrink-0">
                      <ShieldAlert className="w-6 h-6 text-red-600" />
                   </div>
                   <div>
                      <h4 className="text-red-900 font-bold mb-1 tracking-tight underline decoration-red-200 decoration-4">Integrity Violation Detected</h4>
                      <p className="text-red-700/80 text-sm leading-relaxed">Multiple window switches and unauthorized browser activity logged during the Mathematical Logic section. Proctor intervention recorded at timestamp 14:32:01.</p>
                   </div>
                </div>

                <div className="card-philsa !p-0 overflow-hidden">
                   <div className="p-6 border-b border-philsa-border">
                      <h4 className="text-philsa-navy font-bold tracking-tight">Incident Evidence Log</h4>
                   </div>
                   <div className="divide-y divide-philsa-border">
                      <IncidentRow 
                        time="14:32:01" 
                        action="Multiple Tabs Detected" 
                        severity="MEDIUM" 
                        proctor="S. Reyes" 
                        remarks="Student was warned. Screen context showed 'Formula Sheet' search query."
                      />
                      <IncidentRow 
                        time="14:15:30" 
                        action="Audio Threshold Breach" 
                        severity="LOW" 
                        proctor="System Audit" 
                        remarks="Elevated noise detected in testing center. Possible ambient crosstalk."
                      />
                   </div>
                </div>

                <div className="card-philsa p-6">
                   <h4 className="text-philsa-navy font-bold mb-4 tracking-tight">Evidence Screenshot Archive</h4>
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[1,2,3,4].map(i => (
                        <div key={i} className="aspect-video bg-philsa-bg rounded-xl border border-philsa-border flex items-center justify-center group relative overflow-hidden cursor-pointer hover:border-red-200 transition-all">
                           <ShieldAlert className="w-8 h-8 text-philsa-gray/20 group-hover:text-red-400 group-hover:scale-110 transition-all" />
                           <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/50 to-transparent flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <span className="text-[10px] text-white font-bold">SCR_{i}.jpg</span>
                              <Download className="w-3 h-3 text-white" />
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'EXAM_RESULTS' && (
              <motion.div 
                key="exam"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <ScoreCard label="Mathematics" score={98} percentile={99} color="philsa-red" />
                   <ScoreCard label="Science" score={92} percentile={94} color="blue-600" />
                   <ScoreCard label="English" score={89} percentile={91} color="philsa-navy" />
                </div>

                <div className="card-philsa p-8">
                   <h3 className="text-philsa-navy font-bold mb-6 tracking-tight">Performance Breakdown</h3>
                   <div className="space-y-6">
                      <ProgressRow label="Logic & Reasoning" score={100} />
                      <ProgressRow label="Reading Comprehension" score={88} />
                      <ProgressRow label="Abstract Reasoning" score={95} />
                      <ProgressRow label="Social Science" score={82} />
                   </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'DOCUMENTS' && (
              <motion.div 
                key="docs"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                <div className="col-span-1 lg:col-span-3 mb-4">
                   <h3 className="text-[10px] font-black text-philsa-red uppercase tracking-[0.3em] mb-4 pb-2 border-b-2 border-philsa-red w-fit">Digital Artifact Ledger</h3>
                </div>
                {[
                  { title: "PhilSys Identification Card", status: "VERIFIED", timestamp: MOCK_APP.history[0]?.date, preview: "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=1200&q=80" },
                  { title: "Certified Academic Transcript", status: "VERIFIED", timestamp: MOCK_APP.history[0]?.date, preview: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=1200&q=80" },
                  { title: "Legal Birth Certificate", status: "VERIFIED", timestamp: MOCK_APP.history[0]?.date, preview: "https://images.unsplash.com/photo-1544377193-33dcf4d68fb5?w=1200&q=80" },
                  { title: "Certificate of Good Moral", status: "VERIFIED", timestamp: MOCK_APP.history[0]?.date, preview: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=1200&q=80" }
                ].map((doc, i) => (
                  <DocCard 
                    key={i} 
                    {...doc} 
                    onView={() => setSelectedDoc(doc)}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Admin Remarks Section */}
      <div className="card-philsa p-8">
        <h3 className="text-philsa-navy font-bold mb-6 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-philsa-red" /> University Admission Remarks
        </h3>
        <textarea 
          placeholder="Add official notes or reasons for approval/rejection..."
          className="w-full bg-philsa-bg border-philsa-border rounded-xl p-4 text-sm focus:ring-2 focus:ring-philsa-red/10 min-h-[120px]"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
        />
        <div className="mt-8 flex flex-col md:flex-row justify-between items-center gap-4 border-t border-philsa-border pt-6">
           <button 
             onClick={() => {
                addAuditLog('ADMISSION_NOTE_SAVE', JSON.stringify({
                  reviewer: user?.name || user?.email,
                  applicationId: id,
                  remarks: remarks,
                  timestamp: new Date().toISOString(),
                  action: `Admin saved internal notes for university application ${id}`
                }));
                alert('Internal notes saved successfully.');
             }}
             className="w-full md:w-auto border border-philsa-border text-philsa-navy font-bold py-3 px-6 rounded-xl text-xs uppercase tracking-widest hover:bg-philsa-bg transition-all"
           >
             Save Internal Notes
           </button>
           <div className="flex items-center gap-4 w-full md:w-auto">
              <button 
                onClick={() => handleAction('FOR_CORRECTION')}
                disabled={remarks.length === 0}
                className="flex-1 md:flex-none bg-slate-100 text-slate-600 px-8 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-philsa-navy hover:text-white transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <AlertCircle className="w-4 h-4" /> For Correction
              </button>
              <button 
                onClick={() => handleAction('ACCEPTED')}
                className="flex-1 md:flex-none bg-emerald-600 text-white px-8 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <CheckCircle className="w-4 h-4" /> Approve
              </button>
              <button 
                onClick={() => handleAction('REJECTED')}
                disabled={remarks.length === 0}
                className="flex-1 md:flex-none bg-philsa-red text-white px-8 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-philsa-red/20 hover:bg-red-700 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <XCircle className="w-4 h-4" /> Reject
              </button>
           </div>
        </div>
      </div>
      
      {/* Success Feedback Modal */}
      <SuccessModal 
        isOpen={successConfig.isOpen}
        onClose={() => {
          setSuccessConfig(prev => ({ ...prev, isOpen: false }));
          navigate('/admin/university/applications');
        }}
        type={successConfig.type}
        title={successConfig.title}
        message={successConfig.message}
        actionLabel={successConfig.actionLabel}
      />

      {/* Document Viewer Modal */}
      <AnimatePresence>
        {selectedDoc && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10"
          >
             {/* Backdrop */}
             <div 
               onClick={() => setSelectedDoc(null)}
               className="absolute inset-0 bg-philsa-navy/80 backdrop-blur-md" 
             />
             
             {/* Content container */}
             <motion.div 
               initial={{ scale: 0.95, y: 20 }}
               animate={{ scale: 1, y: 0 }}
               exit={{ scale: 0.95, y: 20 }}
               className="relative bg-white w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl border border-philsa-border flex flex-col md:flex-row h-[85vh] md:h-[75vh] z-10"
             >
                {/* Visual Image Preview */}
                <div className="flex-1 bg-philsa-bg relative flex items-center justify-center overflow-hidden p-6">
                   <img 
                     src={selectedDoc.preview} 
                     alt={selectedDoc.title} 
                     className="max-w-full max-h-full object-contain rounded-2xl shadow-xl"
                   />
                   <div className="absolute top-4 left-4 bg-philsa-navy/80 text-white text-[9px] font-black tracking-widest uppercase px-3 py-1.5 rounded-lg backdrop-blur-md">
                      Digital Artifact Hub
                   </div>
                </div>

                {/* Document Metadata Panel */}
                <div className="w-full md:w-80 bg-white border-t md:border-t-0 md:border-l border-philsa-border flex flex-col justify-between">
                   <div className="p-8 space-y-6">
                      <div className="flex items-start justify-between">
                         <div>
                            <span className="text-[9px] font-black text-philsa-red bg-philsa-red/5 px-2.5 py-1 rounded-md tracking-wider uppercase">Artifact Data</span>
                            <h4 className="text-lg font-black text-philsa-navy tracking-tight leading-tight mt-3 uppercase">{selectedDoc.title}</h4>
                         </div>
                         <button 
                           onClick={() => setSelectedDoc(null)}
                           className="p-1 px-2.5 rounded-lg border border-philsa-border hover:bg-philsa-bg hover:text-philsa-red text-philsa-navy transition-all"
                         >
                            <X className="w-5 h-5" />
                         </button>
                      </div>

                      <div className="space-y-4 pt-6 border-t border-[#8A1538]/10 font-sans">
                         <div className="space-y-1">
                            <span className="text-[9px] font-black text-philsa-gray tracking-widest uppercase">Encryption Seal</span>
                            <p className="text-xs font-mono bg-gray-100 p-2 rounded-lg text-philsa-navy break-all border border-gray-200">SHA256:7B9A2CE...</p>
                         </div>
                         <div className="space-y-1">
                            <span className="text-[9px] font-black text-philsa-gray tracking-widest uppercase">Verified Status</span>
                            <p className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                               <ShieldCheck className="w-4 h-4" /> {selectedDoc.status}
                            </p>
                         </div>
                         <div className="space-y-1">
                            <span className="text-[9px] font-black text-philsa-gray tracking-widest uppercase">Audit Timestamp</span>
                            <p className="text-xs font-bold text-philsa-navy flex items-center gap-1.5">
                               <Calendar className="w-4 h-4 text-philsa-red" /> {selectedDoc.timestamp}
                            </p>
                         </div>
                      </div>
                   </div>

                   <div className="p-8 border-t border-philsa-border bg-[#FDF9F9]">
                      <button className="w-full py-4 bg-philsa-navy hover:bg-philsa-navy/90 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl shadow-philsa-navy/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all">
                         <Download className="w-4 h-4" /> Secure Download Ledger
                      </button>
                   </div>
                </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DataRow({ label, value }: { label: string, value: string }) {
  return (
    <div>
      <p className="text-[10px] font-black text-philsa-gray uppercase tracking-widest mb-1">{label}</p>
      <p className="text-sm font-bold text-philsa-navy leading-snug">{value}</p>
    </div>
  );
}

function IncidentRow({ time, action, severity, proctor, remarks }: any) {
  const getSeverityStyle = (s: string) => {
    switch(s) {
      case 'HIGH': return 'bg-red-100 text-red-700';
      case 'MEDIUM': return 'bg-amber-100 text-amber-700';
      default: return 'bg-blue-100 text-blue-700';
    }
  };
  return (
    <div className="p-6 hover:bg-philsa-bg/30 transition-colors">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black text-philsa-navy bg-philsa-bg px-2 py-1 rounded">{time}</span>
          <h5 className="text-sm font-bold text-philsa-navy">{action}</h5>
        </div>
        <span className={`text-[9px] font-black px-2 py-0.5 rounded tracking-widest ${getSeverityStyle(severity)}`}>{severity}</span>
      </div>
      <p className="text-xs text-philsa-gray mb-3 leading-relaxed">{remarks}</p>
      <div className="flex items-center gap-2 text-[10px] font-bold text-philsa-gray uppercase tracking-widest">
        <span>Logged By: {proctor}</span>
      </div>
    </div>
  );
}

function ScoreCard({ label, score, percentile, color }: any) {
  return (
    <div className="card-philsa p-6 border-l-4" style={{ borderLeftColor: `var(--${color})` }}>
       <p className="text-[10px] font-black text-philsa-gray uppercase tracking-widest mb-4">{label}</p>
       <div className="flex items-end gap-2">
          <span className="text-3xl font-extrabold text-philsa-navy">{score}</span>
          <span className="text-sm font-bold text-philsa-gray mb-1">/ 100</span>
       </div>
       <div className="mt-4 pt-4 border-t border-philsa-border flex justify-between items-center">
          <span className="text-[10px] font-bold text-philsa-gray uppercase">Percentile</span>
          <span className="text-xs font-black text-philsa-navy tracking-tight">{percentile}th</span>
       </div>
    </div>
  );
}

function ProgressRow({ label, score }: { label: string, score: number }) {
  return (
    <div className="space-y-2">
       <div className="flex justify-between items-center text-xs font-bold">
          <span className="text-philsa-navy tracking-tight">{label}</span>
          <span className="text-philsa-red uppercase tracking-widest">{score}%</span>
       </div>
       <div className="h-1.5 bg-philsa-bg rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            transition={{ duration: 1, delay: 0.5 }}
            className="h-full bg-philsa-navy rounded-full"
          />
       </div>
    </div>
  );
}

function DocCard({ title, status, timestamp, preview, onView }: any) {
  return (
    <div 
      onClick={onView}
      className="card-philsa p-0 flex flex-col justify-between group hover:border-[#8A1538] transition-all cursor-pointer bg-white overflow-hidden shadow-lg shadow-black/5"
    >
       <div className="aspect-video w-full bg-philsa-bg overflow-hidden relative border-b border-[#8A1538]/10">
          {preview ? (
            <img src={preview} alt={title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-80" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-philsa-bg">
               <FileText className="w-12 h-12 text-[#8A1538]/25" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent flex items-end p-4">
             <h5 className="text-sm font-black text-white leading-tight uppercase tracking-tight">{title}</h5>
          </div>
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
             <div className="bg-[#8A1538] p-2 rounded-lg text-white shadow-lg">
                <Eye className="w-4 h-4" />
              </div>
          </div>
       </div>
       <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
             <p className="text-[10px] text-[#00563F] font-black uppercase tracking-widest italic">{timestamp}</p>
             <span className={`text-[8px] font-black px-2 py-0.5 rounded tracking-widest uppercase ${
               status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
             }`}>
               {status}
             </span>
          </div>
          <button className="w-full py-3 bg-philsa-bg border border-philsa-border rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest group-hover:bg-[#8A1538] group-hover:text-white group-hover:border-[#8A1538] transition-all">
             <Eye className="w-3.5 h-3.5" /> Full Resolution
          </button>
       </div>
    </div>
  );
}
