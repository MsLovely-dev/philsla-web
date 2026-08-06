import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CANDIDATE_CODE_ALPHABET = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';

function getRegistrationYear(dateInput?: string | null) {
  if (!dateInput) return new Date().getFullYear();

  const date = new Date(dateInput);
  return Number.isNaN(date.getTime()) ? new Date().getFullYear() : date.getFullYear();
}

function toCandidateCodeSeed(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function hashToCandidateCode(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  let code = '';
  let state = hash >>> 0;
  for (let index = 0; index < 6; index += 1) {
    state = Math.imul(state ^ (state >>> 15), 2246822519) >>> 0;
    code += CANDIDATE_CODE_ALPHABET[state % CANDIDATE_CODE_ALPHABET.length];
  }

  return code;
}

export function formatCandidateId(applicationId: string, submittedAt?: string | null) {
  if (/^PHL-\d{4}-[A-Z0-9]{6}$/.test(applicationId)) return applicationId;

  const year = getRegistrationYear(submittedAt);
  const seed = toCandidateCodeSeed(applicationId);
  const code = seed.length >= 6 ? seed : hashToCandidateCode(applicationId || `${year}`);

  return `PHL-${year}-${code.slice(0, 6).padEnd(6, '0')}`;
}

export const PHILSA_COLORS = {
  primary: '#8A1538',
  primaryHover: '#6D102C',
  navy: '#111111',
  textSecondary: '#475569',
  bg: '#FAFAFA',
  border: '#E2E8F0',
  success: '#00563F',
};

export const NAVIGATION_PUBLIC = [
  { label: 'About', href: '/#about' },
  { label: 'Guidelines', href: '/#guidelines' },
];

export const MOCK_USERS: any[] = [
  {
    id: 's1',
    email: 'student@example.com',
    password: 'password123',
    firstName: 'Juan',
    lastName: 'Pangilinan',
    role: 'STUDENT',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    candidateId: 'PH-2026-0001',
  },
  {
    id: 'r1',
    email: 'reviewer@philsa.gov.ph',
    password: 'password123',
    firstName: 'Maria Elena',
    lastName: 'Escueta',
    role: 'ADMISSIONS_REVIEWER',
  },
  {
    id: 'a1',
    email: 'admin@philsa.gov.ph',
    password: 'password123',
    firstName: 'Reynaldo',
    lastName: 'Velasco',
    role: 'SYSTEM_ADMIN',
  },
  {
    id: 'p1',
    email: 'proctor@philsa.gov.ph',
    password: 'password123',
    firstName: 'Santiago',
    lastName: 'Reyes',
    role: 'PROCTOR',
  },
  {
    id: 'pa1',
    email: 'proctor.admin@philsa.gov.ph',
    password: 'password123',
    firstName: 'Regina',
    lastName: 'Delgado',
    role: 'PROCTOR_ADMIN',
    center: 'UP Diliman', // Associated with UP Diliman
    university: 'University of the Philippines Diliman',
  },
  {
    id: 'ua-up',
    email: 'up.admin@examhub.ph',
    password: 'password123',
    firstName: 'Ricardo',
    lastName: 'Mendoza',
    role: 'UNIVERSITY_ADMIN',
    university: 'University of the Philippines',
  },
  {
    id: 'ua-ust',
    email: 'ust.admin@examhub.ph',
    password: 'password123',
    firstName: 'Ferdinand',
    lastName: 'De Leon',
    role: 'UNIVERSITY_ADMIN',
    university: 'University of Santo Tomas',
  },
  {
    id: 'ua-ateneo',
    email: 'ateneo.admin@examhub.ph',
    password: 'password123',
    firstName: 'Jaime',
    lastName: 'Torres',
    role: 'UNIVERSITY_ADMIN',
    university: 'Ateneo de Manila University',
  },
  {
    id: 'ua-dlsu',
    email: 'dlsu.admin@examhub.ph',
    password: 'password123',
    firstName: 'Enrique',
    lastName: 'Sanchez',
    role: 'UNIVERSITY_ADMIN',
    university: 'De La Salle University',
  },
  {
    id: 'student-resubmit',
    email: 'stud1resubmit@philsa.edu.ph',
    password: 'password123',
    firstName: 'Jose Miguel',
    lastName: 'Puno',
    role: 'STUDENT',
    candidateId: 'CAND-2026-8801',
  },
  {
    id: 'student-waiting',
    email: 'stud2waitingexam@philsa.edu.ph',
    password: 'password123',
    firstName: 'Maria Cristina',
    lastName: 'Santos',
    role: 'STUDENT',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    candidateId: 'CAND-2026-8802',
  },
  {
    id: 'student-active',
    email: 'stud3takeexam@philsa.edu.ph',
    password: 'password123',
    firstName: 'Juan Carlos',
    lastName: 'Villanueva',
    role: 'STUDENT',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    candidateId: 'CAND-2026-8803',
  },
  {
    id: 'student-offline',
    email: 'stud3.1takeexamoffline@philsa.edu.ph',
    password: 'password123',
    firstName: 'Juan Carlos',
    lastName: 'Villanueva',
    role: 'STUDENT',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    candidateId: 'CAND-2026-8803-OFFLINE',
  },
  {
    id: 'student-finished',
    email: 'stud4examcomplete@philsa.edu.ph',
    password: 'password123',
    firstName: 'Andres Phillip',
    lastName: 'Garcia',
    role: 'STUDENT',
    candidateId: 'CAND-2026-8804',
  },
  {
    id: 'student-results',
    email: 'stud5results@philsa.edu.ph',
    password: 'password123',
    firstName: 'Angela',
    lastName: 'Ramos',
    role: 'STUDENT',
    candidateId: 'CAND-2026-8805',
  },
  {
    id: 'student-cheated',
    email: 'stud6cheated@philsa.edu.ph',
    password: 'password123',
    firstName: 'Ricardo',
    lastName: 'De Mesa',
    role: 'STUDENT',
    candidateId: 'CAND-2026-666',
    status: 'CHEATED'
  },
  {
    id: 'ea1',
    email: 'exam.admin@philsa.gov.ph',
    password: 'password123',
    firstName: 'Emmanuel',
    lastName: 'Mendoza',
    role: 'EXAM_ADMINISTRATOR',
  },
  {
    id: 'ched-admin',
    email: 'ched.admin@gov.ph',
    password: 'password123',
    firstName: 'Antonio',
    lastName: 'Abad',
    role: 'GOVERNMENT',
  },
  {
    id: 'deped-admin',
    email: 'deped.admin@gov.ph',
    password: 'password123',
    firstName: 'Teresita',
    lastName: 'Reyes',
    role: 'GOVERNMENT',
  },
  {
    id: 'tesda-admin',
    email: 'tesda.admin@gov.ph',
    password: 'password123',
    firstName: 'Roberto',
    lastName: 'Cruz',
    role: 'GOVERNMENT',
  },
  {
    id: 'exec-admin',
    email: 'executive@gov.ph',
    password: 'password123',
    firstName: 'Francisco',
    lastName: 'Ramos',
    role: 'GOVERNMENT',
  },
  {
    id: 'tca1',
    email: 'tc.admin@examhub.ph',
    password: 'password123',
    firstName: 'Daniel',
    lastName: 'Santos',
    role: 'TESTING_CENTER_ADMIN',
    center: 'UP Diliman',
    university: 'University of the Philippines Diliman',
  },
];
