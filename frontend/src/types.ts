export type UserRole = 
  | 'STUDENT' 
  | 'ADMISSIONS_REVIEWER' 
  | 'UNIVERSITY_ADMIN' 
  | 'ITEM_WRITER' 
  | 'ACADEMIC_REVIEWER' 
  | 'PROCTOR' 
  | 'PROCTOR_ADMIN'
  | 'GRADER' 
  | 'SYSTEM_ADMIN' 
  | 'EXECUTIVE'
  | 'GOVERNMENT'
  | 'EXAM_ADMINISTRATOR'
  | 'TESTING_CENTER_ADMIN'
  | 'TECH_SUPPORT';

export type BackendPortalRole =
  | 'STUDENT'
  | 'ADMISSIONS_REVIEWER'
  | 'ITEM_WRITER'
  | 'ACADEMIC_REVIEWER'
  | 'PROCTOR'
  | 'PROCTOR_ADMIN'
  | 'UNIVERSITY_ADMIN'
  | 'TESTING_CENTER_ADMIN'
  | 'EXAM_ADMINISTRATOR'
  | 'SYSTEM_ADMIN'
  | 'CHED_ADMIN'
  | 'DEPED_ADMIN'
  | 'TESDA_ADMIN'
  | 'EXECUTIVE';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  backendRole?: BackendPortalRole;
  permissions?: string[];
  avatar?: string;
  candidateId?: string;
  university?: string; // For university admins
}

export type ApplicationStatus = 
  | 'PENDING'
  | 'ACCEPTED' 
  | 'FOR_CORRECTION' 
  | 'REJECTED'
  | 'APPROVED'
  | 'TERMINATED'; // University specific approval

export interface Course {
  id: string;
  name: string;
  university: string;
  totalSlots: number;
  availableSlots: number;
  status: 'OPEN' | 'CLOSED';
  applicantsCount: number;
}

export type ExamStatus = 
  | 'NOT_SCHEDULED'
  | 'SCHEDULED'
  | 'CHECKED_IN'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'ABSENT'
  | 'LATE'
  | 'DENIED'
  | 'GRADED'
  | 'RESULTS_RELEASED'
  | 'TERMINATED';

export interface Application {
  id: string; // Internal application ID
  candidateId?: string;
  userId: string;
  status: ApplicationStatus;
  completionStatus?: 'COMPLETE' | 'PENDING_STUDENT_COMPLETION';
  submittedAt?: string;
  
  // Personal Info
  firstName: string;
  middleName?: string;
  noMiddleName: boolean;
  lastName: string;
  suffix?: string;
  dob: string;
  photoUrl?: string;
  birthPlace: string;
  nationality: string;
  gender: string;
  email: string;
  mobile: string;
  nationalId: string;
  philSysIdUrl?: string;

  // Socio-Economic
  fatherName?: string;
  fatherOccupation?: string;
  fatherMobile?: string;
  motherName?: string;
  motherOccupation?: string;
  motherMobile?: string;
  guardianName?: string;
  guardianOccupation?: string;
  guardianMobile?: string;
  siblingsCount?: number;
  fatherMonthlyIncome?: string;
  motherMonthlyIncome?: string;

  // Address
  region: string;
  province: string;
  city: string;
  barangay: string;
  street: string;
  zipCode: string;

  // Education
  lrn: string;
  schoolId?: string;
  schoolName: string;
  schoolAddress: string;
  academicTrack: string;
  gradeLevel: string;
  enrollmentStatus?: string;
  schoolYear?: string;
  gwa: number;
  gradeRecordsUrl?: string;
  additionalHighPriorityFields?: Record<string, string>;

  // Preferences
  universities: string[];
  courses: string[];
  examScheduleId: string;

  // Review
  reviewNotes?: string;
  reviewerId?: string;
  requiredCorrections?: string[]; // e.g. ['philSysId', 'gradeRecords']
  adminRemarks?: string;
  examStatus?: ExamStatus;
  examScore?: number;
  examPercentile?: number;
  admissionDecision?: 'PASSED' | 'FAILED' | 'WAITLISTED' | 'NOT_RELEASED';
  resultRemarks?: string;
  examDate?: string;
  examTestCenter?: string;
  examRoom?: string;
  isOfflineMode?: boolean;
}

export interface Question {
  id: string;
  text: string;
  type: 'MCQ' | 'TF' | 'FIB' | 'SHORT' | 'ESSAY' | 'IMAGE' | 'FORMULA' | 'PASSAGE';
  subject: string;
  topic: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  score: number;
  options?: string[]; // for MCQ
  correctAnswer: any;
  rubric?: string; // for essay
  status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'PUBLISHED' | 'REJECTED' | 'ARCHIVED' | 'RETIRED' | 'FOR_CORRECTION';
  authorId: string;
  stimulusId?: string; // Linked shared stimulus ID
}

export interface ExamSet {
  id: string;
  title: string;
  blueprint: {
    sections: {
      subject: string;
      items: number;
      duration: number; // minutes
    }[];
  };
  questions: string[]; // question IDs
  status: 'DRAFT' | 'PUBLISHED';
}

export interface Schedule {
  id: string;
  examSetId: string;
  date: string;
  time: string;
  endTime?: string;
  testCenter: string;
  room: string;
  totalSlots: number;
  remainingSlots: number;
}

export interface ExamPermit {
  id: string;
  userId: string;
  candidateId: string;
  fullName: string;
  scheduleId: string;
  testCenter: string;
  room: string;
  seat: string;
  qrCode: string;
  status: 'FOR_APPROVAL' | 'APPROVED';
}

export interface ExamBatch {
  id: string;
  batchCode: string;
  examDate: string;
  startTime: string;
  endTime: string;
  duration: number; // minutes
  assignedCentersCount: number;
  status: 'OPEN' | 'CLOSED';
  createdAt: string;
}

export type TestingCenterStatus = 
  | 'AVAILABLE' 
  | 'FULL_CAPACITY' 
  | 'UNDER_MAINTENANCE' 
  | 'OFFLINE' 
  | 'NETWORK_ISSUE'
  | 'UNAVAILABLE';

export interface TestingCenter {
  id: string;
  name: string;
  region: string;
  province: string;
  capacity: number;
  availableSeats: number;
  proctors?: number;
  assignedProctors?: string[];
  network?: number;
  status: TestingCenterStatus;
  lastUpdated?: string;
  updatedBy?: string;
}

export interface QuestionAttempt {
  questionId: string;
  studentAnswer: any;
  isCorrect: boolean;
  scoreEarned: number;
  feedback?: string;
  essayManualScore?: number; // For manual grading
  manualGradedBy?: string;
  timeSpentSeconds?: number; // Time spent on the question in seconds
}

export interface StudentExamAttempt {
  id: string;
  candidateId: string;
  examSetId: string;
  startTime: string;
  endTime?: string;
  status: 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED' | 'FINALIZED' | 'RELEASED';
  attempts: QuestionAttempt[];
  totalScore: number;
  systemInitialScore: number; // Essay initial auto-score (if any or 0)
  maxScore: number;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  timestamp: string;
  details: string;
  role: UserRole;
}

export interface Proctor {
  id: string;
  name: string;
  email: string;
  status: string;
  center: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  mobileNumber?: string;
  employeeId?: string;
}

export interface StudentDevice {
  id: string;
  pcName: string;
  macAddress: string;
  ipAddress: string;
  specs: string;
  registeredBy: string;
  center: string;
  status: 'PENDING_INSTALL' | 'INSTALLED' | 'READY';
  loginAccount?: string;
  seatNumber?: string;
  registeredAt: string;
}

export type StimulusType =
  | 'READING_PASSAGE'
  | 'CASE_STUDY'
  | 'GRAPH'
  | 'CHART'
  | 'TABLE'
  | 'IMAGE'
  | 'DIAGRAM'
  | 'MAP'
  | 'FORMULA'
  | 'MULTIMEDIA';

export type StimulusStatus =
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'RETIRED'
  | 'ARCHIVED';

export interface StimulusAttachment {
  id: string;
  name: string;
  url: string;
  size: string;
  type: string;
}

export interface StimulusVersion {
  version: number;
  content: string;
  title: string;
  updatedAt: string;
  updatedBy: string;
  changeLog: string;
  status: StimulusStatus;
}

export interface StimulusAuditLog {
  id: string;
  stimulusId: string;
  action: 'CREATE' | 'MODIFY' | 'SUBMIT_FOR_REVIEW' | 'APPROVE' | 'PUBLISH' | 'RETIRE' | 'ARCHIVE' | 'RESTORE' | 'DELETE' | 'LINK_QUESTION' | 'UNLINK_QUESTION';
  userId: string;
  userName: string;
  userRole: string;
  timestamp: string;
  details: string;
}

export interface SharedStimulus {
  id: string;
  title: string;
  content: string; // rich text or plain text with markup
  type: StimulusType;
  subject: string;
  topic: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  curriculum: string; // e.g., 'K-12 Basic Education', 'Specialized Space Tech'
  academicYear: string; // e.g., '2025-2026', '2026-2027'
  owner: string; // User Name or User ID
  ownerId: string;
  status: StimulusStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  attachments: StimulusAttachment[];
  versions: StimulusVersion[];
}

export interface SupportTicket {
  id: string;
  candidateId?: string;
  candidateName?: string;
  contactEmail: string;
  phase: 'REGISTRATION' | 'PRE_EXAM' | 'LIVE_EXAM';
  subject: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  createdAt: string;
  attachment?: string;
  assignedTo?: string;
  notes?: string[];
  deviceDetails?: string;
  examRoom?: string;
}


