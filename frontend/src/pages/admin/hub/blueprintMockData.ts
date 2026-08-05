export interface BlueprintSection {
  id: string;
  name: string; // Section Name (e.g., "Section I: Mathematical Reasoning")
  subject: string; // Subject (e.g., "Space Science")
  topics: string[]; // List of Topics (e.g., ["Kepler's Laws", "Orbital Mechanics"])
  competencies: string[]; // Competencies (e.g., "Calculate orbital speed", "Determine semi-major axis")
  cognitiveLevels: {
    remembering: number; // Item count
    understanding: number;
    applying: number;
    analyzing: number;
    evaluating: number;
    creating: number;
  };
  itemCount: number; // Number of items in this section
  marksPerItem: number; // Marks per item
  totalMarks: number; // Calculated: itemCount * marksPerItem
  passingScore: number; // Passing score for this section
  timeAllocation: number; // Time allocation in minutes
  instructions: string; // Instructions for this section
  difficultyDistribution: {
    easy: number; // Count of easy items
    moderate: number; // Count of moderate items
    difficult: number; // Count of difficult items
  };
  itemTypeDistribution: {
    mcq: number; // Count of Multiple Choice
    tf: number; // Count of True/False
    essay: number; // Count of Essay
    fib: number; // Count of Fill in Blanks
  };
}

export interface BlueprintRules {
  totalItems: number;
  totalMarks: number;
  totalTimeLimit: number; // in minutes
  sharedStimulusRequirement: {
    required: boolean;
    minCount: number; // Minimum number of stimuli
    questionsPerStimulus: number; // e.g., at least 3 questions per stimulus
  };
  randomizationRules: {
    shuffleQuestions: boolean;
    shuffleChoices: boolean;
    fixedSequence: boolean;
  };
  maxReuseLimit: number; // Maximum times an item can be reused across different exam forms
  versionCompatibility: string; // e.g., ">= 1.0"
  activeItemOnly: boolean; // Must only select active items
  accessibilityAccommodations: {
    screenReader: boolean;
    extendedTimeAllowance: boolean;
    highContrastMode: boolean;
    dyslexiaTypography: boolean;
    audioPrompts: boolean;
  };
}

export interface BlueprintHistoryEntry {
  id: string;
  version: string;
  action: string; // e.g., "Created", "Submitted", "Academic Review", "Approved", "Published", "Retired", "Archived"
  updatedBy: string;
  updatedAt: string;
  comments: string;
}

export interface Blueprint {
  id: string;
  code: string; // e.g. BP-2026-SPACE-01
  name: string;
  description: string;
  examType: string; // "Admission" | "Scholarship" | "Technical" | "Specialization"
  academicYear: string; // "2026-2027"
  institution: string; // "Philippine Space Agency (PhilSA)"
  examCategory: string; // "Space Science and Engineering"
  status: 'DRAFT' | 'SUBMITTED' | 'ACADEMIC_REVIEW' | 'REVISION_REQUIRED' | 'APPROVED' | 'PUBLISHED' | 'RETIRED' | 'ARCHIVED';
  version: string; // e.g. "1.0" (Major/Minor)
  owner: string; // Owner name
  createdAt: string;
  effectiveDate: string;
  expirationDate: string;
  sections: BlueprintSection[];
  rules: BlueprintRules;
  history: BlueprintHistoryEntry[];
}

export interface BankQuestion {
  id: string;
  text: string;
  type: 'MCQ' | 'TF' | 'ESSAY' | 'FIB';
  subject: string;
  topic: string;
  difficulty: 'EASY' | 'MODERATE' | 'DIFFICULT';
  competency: string;
  score: number;
  status: 'ACTIVE' | 'DRAFT' | 'RETIRED';
}

// 25+ rich, pre-populated centralized space/academic assessment items for realistic assembly simulations
export const MOCK_CENTRAL_ITEM_BANK: BankQuestion[] = [
  // Subject: Science
  {
    id: 'BANK-001',
    text: "Which of the following orbits is most suitable for continuous observation of meteorological events over the Philippine archipelago?",
    type: 'MCQ',
    subject: 'Science',
    topic: "Orbital Mechanics",
    difficulty: 'EASY',
    competency: "Evaluate orbital parameters for regional coverage",
    score: 2,
    status: 'ACTIVE'
  },
  {
    id: 'BANK-002',
    text: "Calculate the orbital speed of a remote sensing satellite orbiting at 600 km altitude. (Earth mass = 5.97e24 kg, radius = 6371 km).",
    type: 'MCQ',
    subject: 'Science',
    topic: "Orbital Mechanics",
    difficulty: 'DIFFICULT',
    competency: "Calculate spacecraft velocity and period",
    score: 5,
    status: 'ACTIVE'
  },
  {
    id: 'BANK-003',
    text: "True or False: Kepler's Second Law implies that a satellite moves fastest at apogee.",
    type: 'TF',
    subject: 'Science',
    topic: "Orbital Mechanics",
    difficulty: 'EASY',
    competency: "Understand planetary and satellite laws of motion",
    score: 1,
    status: 'ACTIVE'
  },
  {
    id: 'BANK-004',
    text: "Explain the propellant performance differences between liquid hydrogen (LH2/LOX) and solid rocket motors under high-altitude space vacuum environments.",
    type: 'ESSAY',
    subject: 'Science',
    topic: "Propulsion",
    difficulty: 'DIFFICULT',
    competency: "Compare rocketry and thermal exhaust capabilities",
    score: 10,
    status: 'ACTIVE'
  },
  {
    id: 'BANK-005',
    text: "Explain the concept of specific impulse (Isp) and its fundamental formula relative to rocket thrust and mass flow rate.",
    type: 'ESSAY',
    subject: 'Science',
    topic: "Propulsion",
    difficulty: 'MODERATE',
    competency: "Understand basic rocketry metrics",
    score: 5,
    status: 'ACTIVE'
  },
  {
    id: 'BANK-006',
    text: "A satellite uses a propulsion system with an Isp of 300 s. If it burns 50 kg of fuel, calculate the total impulse.",
    type: 'FIB',
    subject: 'Science',
    topic: "Propulsion",
    difficulty: 'MODERATE',
    competency: "Apply specific impulse in quantitative tasks",
    score: 3,
    status: 'ACTIVE'
  },

  // Subject: Reading Comp (English, Filipino)
  {
    id: 'BANK-101',
    text: "The Normalized Difference Vegetation Index (NDVI) is mathematically calculated using which two primary spectral bands?",
    type: 'MCQ',
    subject: 'Reading Comp (English, Filipino)',
    topic: "NDVI Spectral Analysis",
    difficulty: 'EASY',
    competency: "Identify correct spectral channels for index calculation",
    score: 2,
    status: 'ACTIVE'
  },
  {
    id: 'BANK-102',
    text: "Calculate the GSD (Ground Sampling Distance) in meters of a satellite camera with a 5.5-micron pixel size, altitude of 500 km, and focal length of 1.2 m.",
    type: 'MCQ',
    subject: 'Reading Comp (English, Filipino)',
    topic: "Spatial Resolution",
    difficulty: 'DIFFICULT',
    competency: "Apply optical resolution equations on spacecraft payload",
    score: 5,
    status: 'ACTIVE'
  },
  {
    id: 'BANK-103',
    text: "True or False: Radar imaging (SAR) operates independently of cloud cover and solar illumination, enabling night-time agricultural telemetry.",
    type: 'TF',
    subject: 'Reading Comp (English, Filipino)',
    topic: "SAR Imaging",
    difficulty: 'MODERATE',
    competency: "Distinguish between active and passive remote sensing methods",
    score: 1,
    status: 'ACTIVE'
  },
  {
    id: 'BANK-104',
    text: "Briefly discuss the temporal, spectral, and spatial resolution requirements for active tracking of tropical storm damage in the coastal regions of Luzon.",
    type: 'ESSAY',
    subject: 'Reading Comp (English, Filipino)',
    topic: "Spatial Resolution",
    difficulty: 'DIFFICULT',
    competency: "Formulate remote sensing solutions for environmental hazards",
    score: 10,
    status: 'ACTIVE'
  },
  {
    id: 'BANK-105',
    text: "The Landsat-8 operational land imager band 5 captures NIR wavelength, which is highly reflective in healthy vegetative structures.",
    type: 'TF',
    subject: 'Reading Comp (English, Filipino)',
    topic: "NDVI Spectral Analysis",
    difficulty: 'EASY',
    competency: "Analyze spectral reflectance of organic substances",
    score: 1,
    status: 'ACTIVE'
  },

  // Subject: Math
  {
    id: 'BANK-201',
    text: "Determine the limit as x approaches infinity of the function f(x) = (3x^2 + 5x) / (10x^2 - 12).",
    type: 'MCQ',
    subject: 'Math',
    topic: "Calculus",
    difficulty: 'EASY',
    competency: "Evaluate asymptotic bounds and limit proofs",
    score: 2,
    status: 'ACTIVE'
  },
  {
    id: 'BANK-202',
    text: "A spherical payload capsule shrinks slightly in volume due to atmospheric re-entry cold. If its radius decreases at 0.05 cm/s, what is the rate of change of volume when the radius is 10 cm?",
    type: 'MCQ',
    subject: 'Math',
    topic: "Calculus",
    difficulty: 'DIFFICULT',
    competency: "Solve rates of change using differential geometry and calculus",
    score: 5,
    status: 'ACTIVE'
  },
  {
    id: 'BANK-203',
    text: "Using double integration, find the volume bounded by the paraboloid z = x^2 + y^2 and the cylinder x^2 + y^2 = 4.",
    type: 'MCQ',
    subject: 'Math',
    topic: "Calculus",
    difficulty: 'DIFFICULT',
    competency: "Evaluate multiple integrals in space parameters",
    score: 5,
    status: 'ACTIVE'
  },
  {
    id: 'BANK-204',
    text: "True or False: The matrix product AB is always equivalent to the product BA, provided both are square matrices of identical dimension.",
    type: 'TF',
    subject: 'Math',
    topic: "Linear Algebra",
    difficulty: 'EASY',
    competency: "Recall fundamental properties of matrix operations",
    score: 1,
    status: 'ACTIVE'
  },
  {
    id: 'BANK-205',
    text: "Define and discuss the mathematical and physical derivation of Divergence and Curl in coordinate systems, explaining their physical representation in satellite gas mechanics.",
    type: 'ESSAY',
    subject: 'Math',
    topic: "Calculus",
    difficulty: 'DIFFICULT',
    competency: "Formulate Vector Calculus applications for physical space fields",
    score: 10,
    status: 'ACTIVE'
  },
  {
    id: 'BANK-206',
    text: "Evaluate the determinant of the 3x3 matrix [[1, 2, 3], [0, 1, 4], [5, 6, 0]].",
    type: 'FIB',
    subject: 'Math',
    topic: "Linear Algebra",
    difficulty: 'MODERATE',
    competency: "Compute matrix determinants and inverse structures",
    score: 3,
    status: 'ACTIVE'
  },

  // Subject: Lang Proficiency (English, Filipino)
  {
    id: 'BANK-301',
    text: "The Philippine Space Agency (PhilSA) is established as an attached agency under which national government office for administrative oversight?",
    type: 'MCQ',
    subject: 'Lang Proficiency (English, Filipino)',
    topic: "History",
    difficulty: 'EASY',
    competency: "Recall national administrative structures",
    score: 2,
    status: 'ACTIVE'
  },
  {
    id: 'BANK-302',
    text: "Under Republic Act No. 11363, the Philippine Space Agency is tasked with directing the National Space Promotion, Policy, and Administration. Which of the following is NOT one of the 6 Key Development Areas?",
    type: 'MCQ',
    subject: 'Lang Proficiency (English, Filipino)',
    topic: "Space Act RA 11363",
    difficulty: 'MODERATE',
    competency: "Identify official KDA pillars for development",
    score: 3,
    status: 'ACTIVE'
  },
  {
    id: 'BANK-303',
    text: "True or False: The Outer Space Treaty of 1967 allows the deployment of nuclear devices in orbit, but prohibits weaponizing celestial bodies.",
    type: 'TF',
    subject: 'Lang Proficiency (English, Filipino)',
    topic: "International Space Law",
    difficulty: 'MODERATE',
    competency: "Evaluate legal frameworks of international celestial treaties",
    score: 1,
    status: 'ACTIVE'
  },
  {
    id: 'BANK-304',
    text: "Evaluate the liability and indemnity rules for space launch operations under the Outer Space Liability Convention, particularly in the event of uncontrolled debris landfall in sovereign territorial waters.",
    type: 'ESSAY',
    subject: 'Lang Proficiency (English, Filipino)',
    topic: "International Space Law",
    difficulty: 'DIFFICULT',
    competency: "Analyze state liability for damage caused by space objects",
    score: 10,
    status: 'ACTIVE'
  }
];

// Pre-populated enterprise-grade blueprints with version control, workflow stages and real rules
export const INITIAL_BLUEPRINTS: Blueprint[] = [
  {
    id: 'BP-001',
    code: 'BP-2026-ADM-01',
    name: 'AY 2026 Admissions Exam Blueprint',
    description: 'Academic blueprint determining the selection criteria and rigor thresholds for candidate admissions, covering reading comprehension and language proficiency.',
    examType: 'Admission',
    academicYear: '2026-2027',
    institution: 'Philippine Space Agency (PhilSA)',
    examCategory: 'General Academic & Science',
    status: 'PUBLISHED',
    version: '1.0',
    owner: 'Dr. Emil Javier',
    createdAt: '2026-06-10T08:00:00Z',
    effectiveDate: '2026-06-15',
    expirationDate: '2027-06-15',
    sections: [
      {
        id: 'SEC-001',
        name: 'Section A: Reading Comprehension',
        subject: 'Reading Comp (English, Filipino)',
        topics: ['Comprehension', 'Contextual Meaning', 'Theme Analysis'],
        competencies: ['Identify correct contextual elements', 'Analyze themes in prose', 'Compare bilingual reading fragments'],
        cognitiveLevels: {
          remembering: 1,
          understanding: 1,
          applying: 1,
          analyzing: 1,
          evaluating: 1,
          creating: 1
        },
        itemCount: 6,
        marksPerItem: 5,
        totalMarks: 30,
        passingScore: 18,
        timeAllocation: 45,
        instructions: 'Answer all comprehension and text-analysis questions carefully.',
        difficultyDistribution: {
          easy: 2,
          moderate: 2,
          difficult: 2
        },
        itemTypeDistribution: {
          mcq: 3,
          tf: 1,
          essay: 1,
          fib: 1
        }
      },
      {
        id: 'SEC-002',
        name: 'Section B: Language Proficiency',
        subject: 'Lang Proficiency (English, Filipino)',
        topics: ['Grammar Structure', 'Vocabulary', 'Translation'],
        competencies: ['Apply rules of grammar', 'Determine synonym usage', 'Identify proper spelling and usage in sentences'],
        cognitiveLevels: {
          remembering: 1,
          understanding: 1,
          applying: 1,
          analyzing: 1,
          evaluating: 1,
          creating: 0
        },
        itemCount: 5,
        marksPerItem: 4,
        totalMarks: 20,
        passingScore: 12,
        timeAllocation: 30,
        instructions: 'Questions focus on language structure, bilingual translations, and contextual accuracy.',
        difficultyDistribution: {
          easy: 2,
          moderate: 1,
          difficult: 2
        },
        itemTypeDistribution: {
          mcq: 2,
          tf: 2,
          essay: 1,
          fib: 0
        }
      }
    ],
    rules: {
      totalItems: 11,
      totalMarks: 50,
      totalTimeLimit: 75,
      sharedStimulusRequirement: {
        required: true,
        minCount: 1,
        questionsPerStimulus: 3
      },
      randomizationRules: {
        shuffleQuestions: true,
        shuffleChoices: true,
        fixedSequence: false
      },
      maxReuseLimit: 2,
      versionCompatibility: '>= 1.0',
      activeItemOnly: true,
      accessibilityAccommodations: {
        screenReader: true,
        extendedTimeAllowance: true,
        highContrastMode: true,
        dyslexiaTypography: false,
        audioPrompts: false
      }
    },
    history: [
      {
        id: 'LH-001',
        version: '0.1',
        action: 'Created',
        updatedBy: 'Dr. Emil Javier',
        updatedAt: '2026-06-10T08:00:00Z',
        comments: 'Initial draft of curriculum requirements compiled.'
      },
      {
        id: 'LH-002',
        version: '0.2',
        action: 'Submitted',
        updatedBy: 'Dr. Emil Javier',
        updatedAt: '2026-06-11T14:30:00Z',
        comments: 'Submitted for formal review.'
      },
      {
        id: 'LH-003',
        version: '0.5',
        action: 'Academic Review',
        updatedBy: 'Prof. Clara Dela Cruz',
        updatedAt: '2026-06-12T10:15:00Z',
        comments: 'Reviewed. Suggested minor balancing on linguistic metrics.'
      },
      {
        id: 'LH-004',
        version: '1.0',
        action: 'Approved',
        updatedBy: 'Director Renato Solidum',
        updatedAt: '2026-06-14T17:00:00Z',
        comments: 'Final draft verified and approved for state operations.'
      }
    ]
  },
  {
    id: 'BP-002',
    code: 'BP-2026-MATH-02',
    name: 'Advanced Quantitative Math & Logic Blueprint',
    description: 'Curriculum layout establishing core mathematical principles, quantitative reasoning, calculus, and matrix logic mandatory for applicants.',
    examType: 'Technical',
    academicYear: '2026-2027',
    institution: 'Philippine Space Agency (PhilSA)',
    examCategory: 'Mathematics',
    status: 'DRAFT',
    version: '1.0',
    owner: 'Dr. Maria Elena Santos',
    createdAt: '2026-06-20T09:12:00Z',
    effectiveDate: '2026-07-01',
    expirationDate: '2027-07-01',
    sections: [
      {
        id: 'SEC-101',
        name: 'Quantitative Math & Logic Principles',
        subject: 'Math',
        topics: ['Calculus', 'Linear Algebra', 'Arithmetic'],
        competencies: ['Evaluate asymptotic bounds and limit proofs', 'Solve rates of change using mathematical systems', 'Evaluate multiple integrals in space parameters', 'Compute matrix determinants and inverse structures'],
        cognitiveLevels: {
          remembering: 1,
          understanding: 1,
          applying: 1,
          analyzing: 1,
          evaluating: 1,
          creating: 1
        },
        itemCount: 6,
        marksPerItem: 5,
        totalMarks: 30,
        passingScore: 15,
        timeAllocation: 60,
        instructions: 'Calculators are strictly prohibited. Answers must contain absolute step proofs.',
        difficultyDistribution: {
          easy: 2,
          moderate: 1,
          difficult: 3
        },
        itemTypeDistribution: {
          mcq: 3,
          tf: 1,
          essay: 1,
          fib: 1
        }
      }
    ],
    rules: {
      totalItems: 6,
      totalMarks: 30,
      totalTimeLimit: 60,
      sharedStimulusRequirement: {
        required: false,
        minCount: 0,
        questionsPerStimulus: 0
      },
      randomizationRules: {
        shuffleQuestions: false,
        shuffleChoices: false,
        fixedSequence: true
      },
      maxReuseLimit: 3,
      versionCompatibility: '>= 1.0',
      activeItemOnly: true,
      accessibilityAccommodations: {
        screenReader: true,
        extendedTimeAllowance: true,
        highContrastMode: true,
        dyslexiaTypography: false,
        audioPrompts: false
      }
    },
    history: [
      {
        id: 'LH-101',
        version: '1.0',
        action: 'Created',
        updatedBy: 'Dr. Maria Elena Santos',
        updatedAt: '2026-06-20T09:12:00Z',
        comments: 'Created first formal copy under math syllabus.'
      }
    ]
  },
  {
    id: 'BP-003',
    code: 'BP-2026-SCI-03',
    name: 'General Science Concepts Blueprint',
    description: 'Establishes core scientific knowledge, physics parameters, orbital motion concepts, and environmental systems evaluation benchmarks.',
    examType: 'Admission',
    academicYear: '2026-2027',
    institution: 'Philippine Space Agency (PhilSA)',
    examCategory: 'Science',
    status: 'ACADEMIC_REVIEW',
    version: '0.8',
    owner: 'Prof. Sergio Aguinaldo',
    createdAt: '2026-06-22T11:05:00Z',
    effectiveDate: '2026-07-15',
    expirationDate: '2027-07-15',
    sections: [
      {
        id: 'SEC-201',
        name: 'Core Scientific Knowledge',
        subject: 'Science',
        topics: ['Physics', 'General Science', 'Astronomy'],
        competencies: ['Recall natural science structures', 'Identify physical laws of motion', 'Evaluate scientific formulas and properties', 'Analyze physical and chemical properties of materials'],
        cognitiveLevels: {
          remembering: 1,
          understanding: 1,
          applying: 1,
          analyzing: 1,
          evaluating: 0,
          creating: 0
        },
        itemCount: 4,
        marksPerItem: 5,
        totalMarks: 20,
        passingScore: 12,
        timeAllocation: 30,
        instructions: 'Requires clear conceptual understanding of scientific methodologies and standard physics laws.',
        difficultyDistribution: {
          easy: 1,
          moderate: 2,
          difficult: 1
        },
        itemTypeDistribution: {
          mcq: 2,
          tf: 1,
          essay: 1,
          fib: 0
        }
      }
    ],
    rules: {
      totalItems: 4,
      totalMarks: 20,
      totalTimeLimit: 30,
      sharedStimulusRequirement: {
        required: false,
        minCount: 0,
        questionsPerStimulus: 0
      },
      randomizationRules: {
        shuffleQuestions: true,
        shuffleChoices: false,
        fixedSequence: false
      },
      maxReuseLimit: 1,
      versionCompatibility: '>= 0.8',
      activeItemOnly: true,
      accessibilityAccommodations: {
        screenReader: true,
        extendedTimeAllowance: false,
        highContrastMode: true,
        dyslexiaTypography: false,
        audioPrompts: false
      }
    },
    history: [
      {
        id: 'LH-201',
        version: '0.1',
        action: 'Created',
        updatedBy: 'Prof. Sergio Aguinaldo',
        updatedAt: '2026-06-22T11:05:00Z',
        comments: 'Created first draft.'
      },
      {
        id: 'LH-202',
        version: '0.8',
        action: 'Submitted',
        updatedBy: 'Prof. Sergio Aguinaldo',
        updatedAt: '2026-06-23T15:20:00Z',
        comments: 'Submitted to board for compliance approval.'
      }
    ]
  }
];
