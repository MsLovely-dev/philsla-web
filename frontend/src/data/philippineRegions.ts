export interface PhilippineRegion {
  /** Stored value; mirrors the backend `PhilippineRegion` choices exactly. */
  code: string;
  /** Human-readable label shown in dropdowns. */
  label: string;
}

export const PHILIPPINE_REGIONS: PhilippineRegion[] = [
  { code: 'NCR', label: 'National Capital Region (NCR)' },
  { code: 'CAR', label: 'Cordillera Administrative Region (CAR)' },
  { code: 'Region I', label: 'Ilocos Region (Region I)' },
  { code: 'Region II', label: 'Cagayan Valley (Region II)' },
  { code: 'Region III', label: 'Central Luzon (Region III)' },
  { code: 'Region IV-A', label: 'CALABARZON (Region IV-A)' },
  { code: 'MIMAROPA', label: 'MIMAROPA (Region IV-B)' },
  { code: 'Region V', label: 'Bicol Region (Region V)' },
  { code: 'Region VI', label: 'Western Visayas (Region VI)' },
  { code: 'Region VII', label: 'Central Visayas (Region VII)' },
  { code: 'Region VIII', label: 'Eastern Visayas (Region VIII)' },
  { code: 'Region IX', label: 'Zamboanga Peninsula (Region IX)' },
  { code: 'Region X', label: 'Northern Mindanao (Region X)' },
  { code: 'Region XI', label: 'Davao Region (Region XI)' },
  { code: 'Region XII', label: 'SOCCSKSARGEN (Region XII)' },
  { code: 'Region XIII', label: 'Caraga (Region XIII)' },
  { code: 'BARMM', label: 'Bangsamoro Autonomous Region in Muslim Mindanao (BARMM)' },
];

export const PHILIPPINE_REGION_CODES = PHILIPPINE_REGIONS.map((region) => region.code);

const REGION_LABEL_BY_CODE = new Map(PHILIPPINE_REGIONS.map((region) => [region.code, region.label]));

export function regionLabel(code: string): string {
  return REGION_LABEL_BY_CODE.get(code) ?? code;
}
