import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { usePhilSA } from '../PhilSAContext';
import { Application, Question, ExamSet, Schedule, ExamPermit, AuditLog, User, TestingCenter, StudentExamAttempt, TestingCenterStatus, Proctor, StudentDevice } from '../types';

// Mock constants
export const DUMMY_APPLICATIONS: Application[] = [
  {
    id: 'CAND-2026-0001',
    userId: 's1',
    status: 'PENDING',
    submittedAt: '2026-05-01T10:00:00Z',
    firstName: 'Juan',
    middleName: 'Rafael',
    noMiddleName: false,
    lastName: 'Pangilinan',
    dob: '2008-05-15',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    birthPlace: 'Manila',
    nationality: 'Filipino',
    gender: 'Male',
    email: 'student@example.com',
    mobile: '09171234567',
    nationalId: '1234-5678-9012',
    region: 'NCR',
    province: 'Metro Manila',
    city: 'Manila',
    barangay: 'Barangay 123',
    street: 'Luna St.',
    zipCode: '1000',
    lrn: '123456789012',
    schoolName: 'Manila Science High School',
    schoolAddress: 'Manila',
    academicTrack: 'STEM',
    gradeLevel: 'Grade 12',
    gwa: 94.5,
    universities: ['UP Diliman', 'PUP Manila'],
    courses: ['BS Computer Science', 'BS IT'],
    examScheduleId: 'sch1',
    siblingsCount: 2,
    fatherName: 'Roberto Pangilinan',
    fatherOccupation: 'Engineer',
    fatherMonthlyIncome: 'P40,000 - P50,000',
    motherName: 'Luz Pangilinan',
    motherOccupation: 'Teacher',
    motherMonthlyIncome: 'P20,000 - P40,000'
  },
  {
    id: 'CAND-2026-8802',
    userId: 'student-waiting',
    status: 'ACCEPTED',
    submittedAt: '2026-05-02T11:30:00Z',
    firstName: 'Maria Cristina',
    middleName: 'Victoria',
    noMiddleName: false,
    lastName: 'Santos',
    dob: '2008-08-20',
    photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    birthPlace: 'Quezon City',
    nationality: 'Filipino',
    gender: 'Female',
    email: 'stud2waitingexam@philsa.edu.ph',
    mobile: '09187654321',
    nationalId: '8765-4321-0987',
    region: 'NCR',
    province: 'Metro Manila',
    city: 'Quezon City',
    barangay: 'Batasan Hills',
    street: 'Commonwealth Ave',
    zipCode: '1100',
    lrn: '987654321098',
    schoolName: 'Quezon City High School',
    schoolAddress: 'Quezon City',
    academicTrack: 'HUMSS',
    gradeLevel: 'Grade 12',
    gwa: 92.0,
    universities: ['UP Diliman', 'Ateneo de Manila'],
    courses: ['AB Political Science', 'AB Philosophy'],
    examScheduleId: 'sch1',
    examStatus: 'SCHEDULED',
    examDate: '2026-06-15',
    examTestCenter: 'University of the Philippines Diliman',
    examRoom: 'Benitez Hall R101',
    siblingsCount: 1,
    fatherName: 'Santiago Santos',
    fatherOccupation: 'Lawyer',
    fatherMonthlyIncome: 'P50,000+',
    motherName: 'Isabel Santos',
    motherOccupation: 'Architect',
    motherMonthlyIncome: 'P50,000+'
  },
  {
    id: 'CAND-2026-8801',
    userId: 'student-resubmit',
    status: 'FOR_CORRECTION',
    submittedAt: '2026-05-03T09:15:00Z',
    firstName: 'Jose Miguel',
    middleName: 'Antonio',
    noMiddleName: false,
    lastName: 'Puno',
    dob: '2008-06-19',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    birthPlace: 'Calamba, Laguna',
    nationality: 'Filipino',
    gender: 'Male',
    email: 'stud1resubmit@philsa.edu.ph',
    mobile: '09192233445',
    nationalId: '1122-3344-5566',
    region: 'Region IV-A',
    province: 'Laguna',
    city: 'Calamba',
    barangay: 'Real',
    street: 'Mercado St.',
    zipCode: '4027',
    lrn: '112233445566',
    schoolName: 'Laguna State Polytechnic University',
    schoolAddress: 'Laguna',
    academicTrack: 'ABM',
    gradeLevel: 'Grade 12',
    gwa: 85.5,
    universities: ['UP Manila', 'UST'],
    courses: ['BS Accountancy', 'BS Business Admin'],
    examScheduleId: 'sch2',
    requiredCorrections: ['gradeRecordsUrl'],
    adminRemarks: 'The uploaded file for Academic Records (Form 137) is blurry. Please upload a high-resolution scanned digital copy.',
    siblingsCount: 10,
    fatherName: 'Francisco Puno',
    fatherOccupation: 'Farmer',
    fatherMonthlyIncome: 'P10,000 - P20,000',
    motherName: 'Teodora Puno',
    motherOccupation: 'Home Maker',
    motherMonthlyIncome: 'P10,000 - P20,000'
  },
  {
    id: 'CAND-2026-8804',
    userId: 'student-finished',
    status: 'ACCEPTED',
    submittedAt: '2026-05-02T15:00:00Z',
    firstName: 'Andres Phillip',
    lastName: 'Garcia',
    email: 'stud4examcomplete@philsa.edu.ph',
    examStatus: 'SUBMITTED',
    examDate: '2026-05-07',
    examTestCenter: 'University of the Philippines Diliman',
    examRoom: 'Benitez Hall R101',
    region: 'NCR',
    province: 'Metro Manila',
    city: 'Manila',
    barangay: 'Tondo',
    street: 'Lakandula St',
    zipCode: '1012',
    dob: '2008-04-04',
    birthPlace: 'Manila',
    nationality: 'Filipino',
    gender: 'Male',
    mobile: '09123456789',
    nationalId: '123-456-789',
    lrn: '123456789012',
    schoolName: 'Tondo High',
    schoolAddress: 'Manila',
    academicTrack: 'STEM',
    gradeLevel: 'Grade 12',
    gwa: 89,
    universities: ['UP Diliman'],
    courses: ['BS Mechanical Engineering'],
    examScheduleId: 'sch1',
    noMiddleName: false
  },
  {
    id: 'CAND-2026-8803',
    userId: 'student-active',
    status: 'ACCEPTED',
    submittedAt: '2026-05-04T14:20:00Z',
    firstName: 'Juan Carlos',
    lastName: 'Villanueva',
    email: 'stud3takeexam@philsa.edu.ph',
    dob: '2008-01-12',
    photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    gender: 'Male',
    mobile: '09201112222',
    nationalId: '9912-8877-6655',
    region: 'Region III',
    province: 'Bulacan',
    city: 'Malolos',
    barangay: 'San Vicente',
    street: 'McArthur Highway',
    zipCode: '3000',
    birthPlace: 'Malolos, Bulacan',
    nationality: 'Filipino',
    academicTrack: 'STEM',
    gradeLevel: 'Grade 12',
    schoolName: 'Bulacan State University Lab',
    schoolAddress: 'Malolos',
    lrn: '123123123123',
    gwa: 88,
    universities: ['BulSU', 'UP Diliman'],
    courses: ['BS Civil Engineering', 'BS Architecture'],
    examScheduleId: 'sch1',
    examStatus: 'SCHEDULED',
    examDate: '2026-05-22',
    examTestCenter: 'Ateneo de Manila University',
    examRoom: 'SEC Lecture Hall 1',
    noMiddleName: true
  },
  {
    id: 'CAND-2026-8803-OFFLINE',
    userId: 'student-offline',
    status: 'ACCEPTED',
    submittedAt: '2026-05-04T14:20:00Z',
    firstName: 'Juan Carlos',
    lastName: 'Villanueva',
    email: 'stud3.1takeexamoffline@philsa.edu.ph',
    dob: '2008-01-12',
    photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    gender: 'Male',
    mobile: '09201112222',
    nationalId: '9912-8877-6655',
    region: 'Region III',
    province: 'Bulacan',
    city: 'Malolos',
    barangay: 'San Vicente',
    street: 'McArthur Highway',
    zipCode: '3000',
    birthPlace: 'Malolos, Bulacan',
    nationality: 'Filipino',
    academicTrack: 'STEM',
    gradeLevel: 'Grade 12',
    schoolName: 'Bulacan State University Lab',
    schoolAddress: 'Malolos',
    lrn: '123123123123',
    gwa: 88,
    universities: ['BulSU', 'UP Diliman'],
    courses: ['BS Civil Engineering', 'BS Architecture'],
    examScheduleId: 'sch1',
    examStatus: 'IN_PROGRESS',
    examDate: '2026-05-22',
    examTestCenter: 'Ateneo de Manila University',
    examRoom: 'SEC Lecture Hall 1',
    noMiddleName: true,
    isOfflineMode: true
  },
  {
    id: 'CAND-2026-8805',
    userId: 'student-results',
    status: 'ACCEPTED',
    submittedAt: '2026-05-05T09:00:00Z',
    firstName: 'Angela',
    lastName: 'Ramos',
    email: 'stud5results@philsa.edu.ph',
    dob: '2008-11-25',
    photoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    gender: 'Female',
    mobile: '09213334444',
    nationalId: '4432-1122-3344',
    region: 'Region VII',
    province: 'Cebu',
    city: 'Cebu City',
    barangay: 'Lahug',
    street: 'Gorordo Ave',
    zipCode: '6000',
    birthPlace: 'Cebu City',
    nationality: 'Filipino',
    academicTrack: 'ABM',
    gradeLevel: 'Grade 12',
    schoolName: 'Cebu City National Science High School',
    schoolAddress: 'Cebu City',
    lrn: '443200001111',
    gwa: 90,
    universities: ['UP Diliman', 'Ateneo de Manila'],
    courses: ['BS Computer Science', 'BS IT'],
    examScheduleId: 'sch1',
    examStatus: 'RESULTS_RELEASED',
    admissionDecision: 'PASSED',
    examScore: 368,
    examPercentile: 98,
    resultRemarks: 'Passed with high distinction. Qualified for waitlist. Recommended to prioritize university enrollments.',
    noMiddleName: false
  },
  {
    id: 'CAND-2026-666',
    userId: 'student-cheated',
    status: 'ACCEPTED',
    submittedAt: '2026-05-06T16:45:00Z',
    firstName: 'Ricardo',
    lastName: 'De Mesa',
    email: 'stud6cheated@philsa.edu.ph',
    dob: '2008-12-30',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    gender: 'Male',
    mobile: '09225556666',
    nationalId: '7781-9988-7766',
    region: 'NCR',
    province: 'Metro Manila',
    city: 'Manila',
    barangay: 'Poblacion',
    street: 'J.P. Rizal St',
    zipCode: '1210',
    birthPlace: 'Manila',
    nationality: 'Filipino',
    academicTrack: 'HUMSS',
    gradeLevel: 'Grade 12',
    schoolName: 'Makati Science High School',
    schoolAddress: 'Makati',
    lrn: '778122334455',
    gwa: 92,
    universities: ['UP Diliman'],
    courses: ['AB Psychology'],
    examScheduleId: 'sch1',
    examStatus: 'TERMINATED',
    adminRemarks: 'Candidate session was forcefully terminated by the system proctor for violating terms of academic integrity (unauthorized secondary display running during examination phase).',
    noMiddleName: false
  }
];

export const DUMMY_TESTING_CENTERS: TestingCenter[] = [
  {
    id: 'tc1',
    name: 'University of the Philippines Diliman',
    region: 'NCR',
    province: 'Metro Manila',
    capacity: 200,
    availableSeats: 150,
    proctors: 12,
    network: 98,
    status: 'AVAILABLE',
    lastUpdated: '2026-05-10T08:00:00Z'
  },
  {
    id: 'tc2',
    name: 'Ateneo de Manila University',
    region: 'NCR',
    province: 'Metro Manila',
    capacity: 150,
    availableSeats: 0,
    proctors: 8,
    network: 95,
    status: 'FULL_CAPACITY',
    lastUpdated: '2026-05-12T14:30:00Z'
  },
  {
    id: 'tc3',
    name: 'De La Salle University',
    region: 'NCR',
    province: 'Metro Manila',
    capacity: 180,
    availableSeats: 180,
    proctors: 10,
    network: 99,
    status: 'UNDER_MAINTENANCE',
    lastUpdated: '2026-05-13T09:15:00Z'
  },
  {
    id: 'tc4',
    name: 'University of Santo Tomas',
    region: 'NCR',
    province: 'Metro Manila',
    capacity: 250,
    availableSeats: 0,
    proctors: 15,
    network: 42,
    status: 'NETWORK_ISSUE',
    lastUpdated: '2026-05-14T07:00:00Z'
  }
];

export const DUMMY_EXAM_ATTEMPTS: StudentExamAttempt[] = [
  {
    id: 'att1',
    candidateId: 'CAND-2026-8804',
    examSetId: 'ex1',
    startTime: '2026-05-07T08:00:00Z',
    endTime: '2026-05-07T11:00:00Z',
    status: 'SUBMITTED',
    totalScore: 17,
    systemInitialScore: 12,
    maxScore: 30,
    attempts: [
      {
        questionId: 'q1',
        studentAnswer: 'Manila',
        isCorrect: true,
        scoreEarned: 5
      },
      {
        questionId: 'q2',
        studentAnswer: false,
        isCorrect: false,
        scoreEarned: 0
      },
      {
        questionId: 'q_essay_1',
        studentAnswer: 'The education system in the Philippines has evolved significantly over the years. With the introduction of the K-12 program, the curriculum has become more specialized, allowing students to choose tracks that align with their career aspirations early on. This shift aims to better prepare graduates for either the workforce or higher education by providing a more comprehensive foundations in core subjects.\n\nHowever, challenges remain in the implementation phase, particularly concerning facility shortages and the training needs of educators in remote provinces. While the policy framework is solid, the success of the system ultimately depends on consistent funding and the ability of local government units to support their respective schools with the necessary digital infrastructure.',
        isCorrect: true,
        scoreEarned: 12,
        feedback: 'Good analysis of the K-12 impact.'
      }
    ]
  },
  {
    id: 'att2',
    candidateId: 'CAND-2026-8803',
    examSetId: 'ex1',
    startTime: '2026-05-08T08:00:00Z',
    endTime: '2026-05-08T11:00:00Z',
    status: 'SUBMITTED',
    totalScore: 20,
    systemInitialScore: 10,
    maxScore: 30,
    attempts: [
      { questionId: 'q1', studentAnswer: 'Manila', isCorrect: true, scoreEarned: 5 },
      { questionId: 'q2', studentAnswer: true, isCorrect: true, scoreEarned: 5 },
      { 
        questionId: 'q_essay_1', 
        studentAnswer: 'The K-12 system has its pros and cons. It provides more time for kids to learn. However, some parents say it is an additional burden for them because of the extra 2 years in high school.',
        isCorrect: true,
        scoreEarned: 10 
      }
    ]
  },
  {
    id: 'att3',
    candidateId: 'CAND-2026-8805',
    examSetId: 'ex1',
    startTime: '2026-05-09T08:00:00Z',
    endTime: '2026-05-09T11:00:00Z',
    status: 'SUBMITTED',
    totalScore: 20,
    systemInitialScore: 15,
    maxScore: 30,
    attempts: [
      { questionId: 'q1', studentAnswer: 'Cebu', isCorrect: false, scoreEarned: 0 },
      { questionId: 'q2', studentAnswer: true, isCorrect: true, scoreEarned: 5 },
      { 
        questionId: 'q_essay_1', 
        studentAnswer: 'In my humble opinion, the K-12 implementation is a step towards global competency. Although we lack facilities, the curriculum is better than the old one.',
        isCorrect: true,
        scoreEarned: 15 
      }
    ]
  },
  {
    id: 'att4',
    candidateId: 'CAND-2026-666',
    examSetId: 'ex1',
    startTime: '2026-05-10T08:00:00Z',
    endTime: '2026-05-10T11:00:00Z',
    status: 'SUBMITTED',
    totalScore: 28,
    systemInitialScore: 18,
    maxScore: 30,
    attempts: [
      { questionId: 'q1', studentAnswer: 'Manila', isCorrect: true, scoreEarned: 5 },
      { questionId: 'q2', studentAnswer: true, isCorrect: true, scoreEarned: 5 },
      { 
        questionId: 'q_essay_1', 
        studentAnswer: 'The K-12 program in the Philippines aims to enhance the country’s education system by adding two more years to basic education. This move was intended to provide students with more time to master concepts and skills, prepare them for tertiary education, and improve their readiness for employment. However, its effectiveness has been a subject of intense debate. Critics often point to the persistent lack of classrooms, updated instructional materials, and specialized teachers as major hurdles that undermine the system’s goals.',
        isCorrect: true,
        scoreEarned: 18 
      }
    ]
  }
];

export const DUMMY_PROCTORS: Proctor[] = [
  { id: 'PRC-001', name: 'Dr. Emil Javier', email: 'e.javier@philsa.ph', status: 'ACTIVE', center: 'UP Diliman' },
  { id: 'PRC-002', name: 'Prof. Maria Elena Escueta', email: 'm.escueta@ust.edu.ph', status: 'ON LEAVE', center: 'UST Manila' },
  { id: 'PRC-003', name: 'Engr. Reynaldo Velasco', email: 'r.velasco@philsa.gov', status: 'ACTIVE', center: 'DLSU Manila' },
  { id: 'PRC-004', name: 'Ms. Isabel G. Soriano', email: 'i.soriano@pup.edu.ph', status: 'ACTIVE', center: 'PUP Manila' },
  { id: 'PRC-005', name: 'Danilo P. Mendoza', email: 'd.mendoza@philsa.ph', status: 'SUSPENDED', center: 'N/A' },
  { id: 'PRC-006', name: 'Armando G. Salazar', email: 'salazar.a@manila.gov', status: 'ACTIVE', center: 'UP Manila' },
  // Adding other proctors from ALL_PROCTORS to cover initial testing center allocations beautifully
  { id: 'PRC-007', name: 'Dr. Emmanuel L. Ramos', email: 'e.ramos@philsa.ph', status: 'ACTIVE', center: 'N/A' },
  { id: 'PRC-008', name: 'Prof. Clara Dela Cruz', email: 'c.delacruz@philsa.ph', status: 'ACTIVE', center: 'N/A' },
  { id: 'PRC-009', name: 'Engr. Roberto Valenzuela', email: 'r.valenzuela@philsa.ph', status: 'ACTIVE', center: 'N/A' },
  { id: 'PRC-010', name: 'Ms. Beatrice Aquino', email: 'b.aquino@philsa.ph', status: 'ACTIVE', center: 'N/A' },
  { id: 'PRC-011', name: 'Dr. Maria Elena Santos', email: 'me.santos@philsa.ph', status: 'ACTIVE', center: 'N/A' },
  { id: 'PRC-012', name: 'Prof. Sergio Aguinaldo', email: 's.aguinaldo@philsa.ph', status: 'ACTIVE', center: 'N/A' },
  { id: 'PRC-013', name: 'Dr. Clara B. Gonzaga', email: 'c.gonzaga@philsa.ph', status: 'ACTIVE', center: 'N/A' },
  { id: 'PRC-014', name: 'Engr. Jonalyn M. Victoria', email: 'j.victoria@philsa.ph', status: 'ACTIVE', center: 'N/A' },
  { id: 'PRC-015', name: 'Ms. Patricia Mendoza', email: 'p.mendoza@philsa.ph', status: 'ACTIVE', center: 'N/A' },
  { id: 'PRC-016', name: 'Mr. Michael V. de Leon', email: 'm.deleon@philsa.ph', status: 'ACTIVE', center: 'N/A' },
  { id: 'PRC-017', name: 'Prof. Antonio K. Solis', email: 'a.solis@philsa.ph', status: 'ACTIVE', center: 'N/A' },
  { id: 'PRC-018', name: 'Dr. Elizabeth G. Ramos', email: 'eg.ramos@philsa.ph', status: 'ACTIVE', center: 'N/A' },
  { id: 'PRC-019', name: 'Mr. Gabriel P. Reyes', email: 'g.reyes@philsa.ph', status: 'ACTIVE', center: 'N/A' },
  { id: 'PRC-020', name: 'Ms. Nicole S. Mendoza', email: 'n.mendoza@philsa.ph', status: 'ACTIVE', center: 'N/A' }
];

export const DUMMY_STUDENT_DEVICES: StudentDevice[] = [
  {
    id: 'SDEV-001',
    pcName: 'UPD-MELCHOR-LAB1-PC02',
    macAddress: '3C:F8:62:A1:02:4B',
    ipAddress: '192.168.10.42',
    specs: 'Intel Core i5-11400, 16GB RAM, Windows 11',
    registeredBy: 'Dr. Emil Javier',
    center: 'UP Diliman',
    status: 'READY',
    loginAccount: 'exam_user_02',
    seatNumber: 'Seat A-12',
    registeredAt: '2026-06-08 14:32'
  },
  {
    id: 'SDEV-002',
    pcName: 'UPD-MELCHOR-LAB1-PC05',
    macAddress: 'BC:A9:23:4E:91:21',
    ipAddress: '192.168.10.45',
    specs: 'Intel Core i5-12400, 16GB RAM, Windows 11',
    registeredBy: 'Dr. Emil Javier',
    center: 'UP Diliman',
    status: 'INSTALLED',
    loginAccount: 'exam_user_05',
    seatNumber: 'Seat A-15',
    registeredAt: '2026-06-08 15:10'
  },
  {
    id: 'SDEV-003',
    pcName: 'UST-BLDG3-LAB-PC15',
    macAddress: '7E:31:0D:25:39:AA',
    ipAddress: '10.0.12.115',
    specs: 'AMD Ryzen 5 5600G, 16GB RAM, Windows 10',
    registeredBy: 'Prof. Maria Elena Escueta',
    center: 'UST Manila',
    status: 'PENDING_INSTALL',
    loginAccount: 'ust_pc_15',
    registeredAt: '2026-06-09 09:12'
  }
];

export const DUMMY_QUESTIONS: Question[] = [
  {
    id: 'q1',
    text: "Which layer of the Earth's atmosphere lies directly above the troposphere and contains the ozone layer?",
    type: 'MCQ',
    subject: 'Science',
    topic: 'Atmospheric Science',
    difficulty: 'EASY',
    score: 5,
    options: ['Stratosphere', 'Mesosphere', 'Thermosphere', 'Exosphere'],
    correctAnswer: 'Stratosphere',
    status: 'PUBLISHED',
    authorId: 'a1'
  },
  {
    id: 'q2',
    text: "In the sentence 'She read the book very quickly', the word 'quickly' is an adverb of manner.",
    type: 'TF',
    subject: 'Lang Proficiency (English, Filipino)',
    topic: 'Parts of Speech',
    difficulty: 'MEDIUM',
    score: 5,
    correctAnswer: true,
    status: 'PUBLISHED',
    authorId: 'a1'
  },
  {
    id: 'q_essay_1',
    text: "Read the provided passage on sustainable energy and analyze the author's primary argument regarding solar panel efficiency in tropical climates like the Philippines.",
    type: 'ESSAY',
    subject: 'Reading Comp (English, Filipino)',
    topic: 'Reading Analysis',
    difficulty: 'HARD',
    score: 20,
    correctAnswer: 'Graded based on rubric: clarity, evidence, and critical thinking.',
    rubric: 'Clarity (5pts), Evidence (10pts), Critical Thinking (5pts)',
    status: 'PUBLISHED',
    authorId: 'a1'
  },
  {
    id: 'q3',
    text: 'Evaluate the feasibility and socio-economic benefits of establishing a sovereign space agency in a developing nation like the Philippines.',
    type: 'ESSAY',
    subject: 'Lang Proficiency (English, Filipino)',
    topic: 'Governance',
    difficulty: 'HARD',
    score: 20,
    correctAnswer: 'Graded based on rubric: feasibility analysis, structural alignment, economic rationale.',
    status: 'IN_REVIEW',
    authorId: 'a1'
  },
  {
    id: 'q4',
    text: 'Which laws of motion describe the launching of rockets into low Earth orbit?',
    type: 'MCQ',
    subject: 'Science',
    topic: 'Mechanics',
    difficulty: 'MEDIUM',
    score: 5,
    options: ["Newton's Laws of Motion", "Kepler's Laws", "Coulomb's Law", "Ohm's Law"],
    correctAnswer: "Newton's Laws of Motion",
    status: 'IN_REVIEW',
    authorId: 'a1'
  },
  {
    id: 'q5',
    text: 'The Philippine Space Agency (PhilSA) was created by Republic Act No. 11363, also known as the Philippine Space Act.',
    type: 'TF',
    subject: 'Lang Proficiency (English, Filipino)',
    topic: 'History',
    difficulty: 'EASY',
    score: 5,
    correctAnswer: true,
    status: 'IN_REVIEW',
    authorId: 'a1'
  }
];

export const DUMMY_SCHEDULES: Schedule[] = [
  {
    id: 'sch1',
    examSetId: 'ex1',
    date: '2026-06-15',
    time: '08:00 AM',
    endTime: '11:00 AM',
    testCenter: 'University of the Philippines Diliman',
    room: 'Benitez Hall R101',
    totalSlots: 50,
    remainingSlots: 45
  },
  {
    id: 'sch2',
    examSetId: 'ex1',
    date: '2026-05-22',
    time: '09:00 AM',
    endTime: '12:00 PM',
    testCenter: 'Ateneo de Manila University',
    room: 'SEC Lecture Hall 1',
    totalSlots: 40,
    remainingSlots: 38
  }
];

interface MockDataContextType {
  applications: Application[];
  questions: Question[];
  examSets: ExamSet[];
  schedules: Schedule[];
  permits: ExamPermit[];
  testingCenters: TestingCenter[];
  proctors: Proctor[];
  examAttempts: StudentExamAttempt[];
  studentDevices: StudentDevice[];
  updateApplication: (id: string, updates: Partial<Application>) => void;
  createQuestion: (q: Partial<Question>) => void;
  createExamSet: (set: Partial<ExamSet>) => void;
  publishResults: () => void;
  updateEssayScore: (attemptId: string, questionId: string, score: number, graderId: string) => void;
  finalizeExamAttempt: (attemptId: string, userId: string) => void;
  updateTestingCenterStatus: (centerId: string, status: TestingCenterStatus, userId: string) => void;
  createTestingCenter: (tc: Partial<TestingCenter>) => TestingCenter;
  registerStudentDevice: (dev: Partial<StudentDevice>) => StudentDevice;
  updateStudentDeviceSeat: (deviceId: string, seatNumber: string) => void;
  setApplications: React.Dispatch<React.SetStateAction<Application[]>>;
  setQuestions: React.Dispatch<React.SetStateAction<Question[]>>;
  setExamSets: React.Dispatch<React.SetStateAction<ExamSet[]>>;
  setSchedules: React.Dispatch<React.SetStateAction<Schedule[]>>;
  setPermits: React.Dispatch<React.SetStateAction<ExamPermit[]>>;
  setTestingCenters: React.Dispatch<React.SetStateAction<TestingCenter[]>>;
  setProctors: React.Dispatch<React.SetStateAction<Proctor[]>>;
  setStudentDevices: React.Dispatch<React.SetStateAction<StudentDevice[]>>;
  setExamAttempts: React.Dispatch<React.SetStateAction<StudentExamAttempt[]>>;
}

const MockDataContext = createContext<MockDataContextType | undefined>(undefined);

export function MockDataProvider({ children }: { children: ReactNode }) {
  const { addAuditLog } = usePhilSA();

  const [applications, setApplications] = useState<Application[]>(() => {
    const saved = localStorage.getItem('philsa_apps');
    const parsed = saved ? JSON.parse(saved) : [];
    // Merge dummy data to ensure new mock records are available even with stale localStorage
    const merged = [...parsed];
    DUMMY_APPLICATIONS.forEach(d => {
      if (!merged.some(m => m.id === d.id)) merged.push(d);
    });
    return merged;
  });

  const [questions, setQuestions] = useState<Question[]>(() => {
    const saved = localStorage.getItem('philsa_questions');
    const parsed = saved ? JSON.parse(saved) : [];
    const merged = [...parsed];
    DUMMY_QUESTIONS.forEach(d => {
      if (!merged.some(m => m.id === d.id)) merged.push(d);
    });
    return merged;
  });

  const [examSets, setExamSets] = useState<ExamSet[]>(() => {
    const saved = localStorage.getItem('philsa_exam_sets');
    const parsed = saved ? JSON.parse(saved) : [];
    return parsed.filter((examSet: ExamSet) => examSet.id !== 'ex1');
  });

  const [schedules, setSchedules] = useState<Schedule[]>(() => {
    const saved = localStorage.getItem('philsa_schedules');
    const parsed = saved ? JSON.parse(saved) : [];
    const merged = [...parsed];
    DUMMY_SCHEDULES.forEach(d => {
      if (!merged.some(m => m.id === d.id)) merged.push(d);
    });
    return merged;
  });

  const [permits, setPermits] = useState<ExamPermit[]>(() => {
    const saved = localStorage.getItem('philsa_permits');
    return saved ? JSON.parse(saved) : [];
  });

  const [testingCenters, setTestingCenters] = useState<TestingCenter[]>(() => {
    const saved = localStorage.getItem('philsa_testing_centers');
    const parsed = saved ? JSON.parse(saved) : [];
    const merged = [...parsed];
    DUMMY_TESTING_CENTERS.forEach(d => {
      if (!merged.some(m => m.id === d.id)) merged.push(d);
    });
    return merged;
  });

  const [proctors, setProctors] = useState<Proctor[]>(() => {
    const saved = localStorage.getItem('philsa_proctors');
    const parsed = saved ? JSON.parse(saved) : [];
    const merged = [...parsed];
    DUMMY_PROCTORS.forEach(d => {
      if (!merged.some(m => m.id === d.id)) merged.push(d);
    });
    return merged;
  });

  const [examAttempts, setExamAttempts] = useState<StudentExamAttempt[]>(() => {
    const saved = localStorage.getItem('philsa_exam_attempts');
    const parsed = saved ? JSON.parse(saved) : [];
    const merged = [...parsed];
    DUMMY_EXAM_ATTEMPTS.forEach(d => {
      if (!merged.some(m => m.id === d.id)) merged.push(d);
    });
    return merged;
  });

  const [studentDevices, setStudentDevices] = useState<StudentDevice[]>(() => {
    const saved = localStorage.getItem('philsa_student_devices');
    const parsed = saved ? JSON.parse(saved) : [];
    const merged = [...parsed];
    DUMMY_STUDENT_DEVICES.forEach(d => {
      if (!merged.some(m => m.id === d.id)) merged.push(d);
    });
    return merged;
  });

  useEffect(() => { localStorage.setItem('philsa_apps', JSON.stringify(applications)); }, [applications]);
  useEffect(() => { localStorage.setItem('philsa_questions', JSON.stringify(questions)); }, [questions]);
  useEffect(() => { localStorage.setItem('philsa_exam_sets', JSON.stringify(examSets)); }, [examSets]);
  useEffect(() => { localStorage.setItem('philsa_schedules', JSON.stringify(schedules)); }, [schedules]);
  useEffect(() => { localStorage.setItem('philsa_permits', JSON.stringify(permits)); }, [permits]);
  useEffect(() => { localStorage.setItem('philsa_testing_centers', JSON.stringify(testingCenters)); }, [testingCenters]);
  useEffect(() => { localStorage.setItem('philsa_proctors', JSON.stringify(proctors)); }, [proctors]);
  useEffect(() => { localStorage.setItem('philsa_exam_attempts', JSON.stringify(examAttempts)); }, [examAttempts]);
  useEffect(() => { localStorage.setItem('philsa_student_devices', JSON.stringify(studentDevices)); }, [studentDevices]);

  const updateApplication = (id: string, updates: Partial<Application>) => {
    setApplications(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    addAuditLog('APPLICATION_UPDATE', `Updated application ${id}`);
  };

  const createQuestion = (q: Partial<Question>) => {
    const newQ: Question = {
      id: 'q_' + Date.now(),
      text: q.text || '',
      type: q.type || 'MCQ',
      subject: q.subject || 'General',
      topic: q.topic || 'General',
      difficulty: q.difficulty || 'MEDIUM',
      score: q.score || 1,
      options: q.options,
      correctAnswer: q.correctAnswer,
      status: 'DRAFT',
      authorId: 'user_current'
    };
    setQuestions(prev => [...prev, newQ]);
    addAuditLog('QUESTION_CREATE', `Created new question: ${newQ.subject}`);
  };

  const createExamSet = (set: Partial<ExamSet>) => {
    const newSet: ExamSet = {
      id: 'ex_' + Date.now(),
      title: set.title || 'Untitled Exam Set',
      blueprint: set.blueprint || { sections: [] },
      questions: set.questions || [],
      status: 'DRAFT'
    };
    setExamSets(prev => [...prev, newSet]);
    addAuditLog('EXAM_SET_CREATE', `Created new exam set: ${newSet.title}`);
  };

  const publishResults = () => {
    addAuditLog('RESULTS_RELEASED', 'University Admin officially released all exam results.');
  };

  const updateEssayScore = (attemptId: string, questionId: string, score: number, graderId: string) => {
    setExamAttempts(prev => prev.map(att => {
      if (att.id === attemptId) {
        const updatedAttempts = att.attempts.map(qAtt => {
          if (qAtt.questionId === questionId) {
            return { ...qAtt, essayManualScore: score, manualGradedBy: graderId, scoreEarned: score, isCorrect: true };
          }
          return qAtt;
        });
        const newTotal = updatedAttempts.reduce((sum, q) => sum + (q.scoreEarned || 0), 0);
        return { ...att, attempts: updatedAttempts, totalScore: newTotal, reviewedBy: graderId, reviewedAt: new Date().toISOString(), status: 'GRADED' };
      }
      return att;
    }));
    addAuditLog('EXAM_GRADE_UPDATE', `Updated essay score for attempt ${attemptId}`);
  };

  const finalizeExamAttempt = (attemptId: string, userId: string) => {
    setExamAttempts(prev => prev.map(att => 
      att.id === attemptId ? { ...att, status: 'FINALIZED', reviewedBy: userId, reviewedAt: new Date().toISOString() } : att
    ));
    addAuditLog('EXAM_FINALIZED', `Exam attempt ${attemptId} was finalized and released to Score Management.`);
  };

  const updateTestingCenterStatus = (centerId: string, status: TestingCenterStatus, userId: string) => {
    setTestingCenters(prev => prev.map(tc => 
      tc.id === centerId ? { ...tc, status, lastUpdated: new Date().toISOString(), updatedBy: userId } : tc
    ));
    addAuditLog('TESTING_CENTER_STATUS_UPDATE', `Center ${centerId} status changed to ${status}`);
  };

  const createTestingCenter = (tc: Partial<TestingCenter>) => {
    const newTC: TestingCenter = {
      id: 'TC-' + (testingCenters.length + 1).toString().padStart(4, '0'),
      name: tc.name || 'New Testing Center',
      region: tc.region || 'NCR',
      province: tc.province || 'Metro Manila',
      capacity: tc.capacity || 100,
      availableSeats: tc.availableSeats !== undefined ? tc.availableSeats : (tc.capacity || 100),
      proctors: tc.assignedProctors ? tc.assignedProctors.length : (tc.proctors || 0),
      assignedProctors: tc.assignedProctors || [],
      network: tc.network || 100,
      status: tc.status || 'AVAILABLE',
      lastUpdated: new Date().toISOString()
    };
    setTestingCenters(prev => [...prev, newTC]);
    addAuditLog('TESTING_CENTER_CREATED', `Testing center ${newTC.name} was created.`);
    return newTC;
  };

  const registerStudentDevice = (dev: Partial<StudentDevice>) => {
    const newDev: StudentDevice = {
      id: 'SDEV-' + (studentDevices.length + 1).toString().padStart(3, '0'),
      pcName: dev.pcName || 'PC-NAME',
      macAddress: dev.macAddress || '',
      ipAddress: dev.ipAddress || '',
      specs: dev.specs || '',
      registeredBy: dev.registeredBy || 'Unknown Proctor',
      center: dev.center || 'N/A',
      status: dev.status || 'PENDING_INSTALL',
      loginAccount: dev.loginAccount,
      seatNumber: dev.seatNumber,
      registeredAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    setStudentDevices(prev => [...prev, newDev]);
    addAuditLog('STUDENT_DEVICE_REGISTERED', `Registered Student PC ${newDev.pcName}`);
    return newDev;
  };

  const updateStudentDeviceSeat = (deviceId: string, seatNumber: string) => {
    setStudentDevices(prev => prev.map(d => d.id === deviceId ? { ...d, seatNumber, status: d.status === 'INSTALLED' ? 'READY' : d.status } : d));
    addAuditLog('STUDENT_DEVICE_SEAT_ASSIGNED', `Assigned PC ${deviceId} to seat ${seatNumber}`);
  };

  return React.createElement(MockDataContext.Provider, {
    value: {
      applications,
      questions,
      examSets,
      schedules,
      permits,
      testingCenters,
      proctors,
      examAttempts,
      studentDevices,
      updateApplication,
      createQuestion,
      createExamSet,
      publishResults,
      updateEssayScore,
      finalizeExamAttempt,
      updateTestingCenterStatus,
      createTestingCenter,
      registerStudentDevice,
      updateStudentDeviceSeat,
      setApplications,
      setQuestions,
      setExamSets,
      setSchedules,
      setPermits,
      setTestingCenters,
      setProctors,
      setStudentDevices,
      setExamAttempts
    }
  }, children);
}

export function useMockData() {
  const context = useContext(MockDataContext);
  if (context === undefined) {
    throw new Error('useMockData must be used within a MockDataProvider');
  }
  return context;
}
