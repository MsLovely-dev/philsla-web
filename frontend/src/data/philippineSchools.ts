export interface SchoolSeedEntry {
  name: string;
  classification: 'Public' | 'Private';
  examineeCapacity: number;
  /** Region code; mirrors a `PHILIPPINE_REGIONS` entry and the backend seed. */
  region: string;
}

/**
 * Real Philippine institutions used to seed the prototype (mock) service so the
 * List of Schools maintenance table shows data without a backend. Kept in sync
 * with the backend `seed_schools` management command.
 */
export const PHILIPPINE_SCHOOL_SEED: SchoolSeedEntry[] = [
  { name: 'Philippine Science High School - Main Campus', classification: 'Public', examineeCapacity: 1200, region: 'NCR' },
  { name: 'Manila Science High School', classification: 'Public', examineeCapacity: 900, region: 'NCR' },
  { name: 'University of the Philippines Diliman', classification: 'Public', examineeCapacity: 2500, region: 'NCR' },
  { name: 'Ateneo de Manila University', classification: 'Private', examineeCapacity: 1800, region: 'NCR' },
  { name: 'De La Salle University - Manila', classification: 'Private', examineeCapacity: 1600, region: 'NCR' },
  { name: 'University of Santo Tomas', classification: 'Private', examineeCapacity: 2000, region: 'NCR' },
  { name: 'Baguio City National High School', classification: 'Public', examineeCapacity: 1000, region: 'CAR' },
  { name: 'Saint Louis University', classification: 'Private', examineeCapacity: 1400, region: 'CAR' },
  { name: 'University of the Philippines Los Banos', classification: 'Public', examineeCapacity: 1500, region: 'Region IV-A' },
  { name: 'Ateneo de Naga University', classification: 'Private', examineeCapacity: 800, region: 'Region V' },
  { name: 'West Visayas State University', classification: 'Public', examineeCapacity: 1300, region: 'Region VI' },
  { name: 'University of San Carlos', classification: 'Private', examineeCapacity: 1500, region: 'Region VII' },
  { name: 'Philippine Science High School - Central Visayas Campus', classification: 'Public', examineeCapacity: 700, region: 'Region VII' },
  { name: 'Mindanao State University - Iligan Institute of Technology', classification: 'Public', examineeCapacity: 1200, region: 'Region X' },
  { name: 'Ateneo de Davao University', classification: 'Private', examineeCapacity: 1100, region: 'Region XI' },
];
