import type { Application } from '../types';
import type { BackendExamSlot } from './backendApplicationService';

export const ADMIN_PREVIEW_CANDIDATE_ID = 'PREVIEW-2026-0001';

/**
 * Synthetic application shown only to SYSTEM_ADMIN accounts previewing
 * Student Portal pages, which have no real StudentApplication record of
 * their own. With no slot argument this is the approved/no-schedule state,
 * so the Dashboard preview demonstrates the schedule picker instead of
 * dead-ending on an empty state or restarting a fresh registration wizard.
 * Once a slot has been "confirmed" in the preview (see setAdminPreviewSlotId
 * below), pass it in so the rest of the flow -- the waiting-for-proctor
 * card, the roadmap, the permit page -- advances consistently with it.
 */
export function buildAdminPreviewApplication(
  user: { id: string; firstName?: string },
  scheduledSlot?: BackendExamSlot | null,
): Application {
  return {
    id: ADMIN_PREVIEW_CANDIDATE_ID,
    userId: user.id,
    status: 'ACCEPTED',
    submittedAt: '2026-05-01T00:00:00Z',
    firstName: user.firstName || 'Preview',
    noMiddleName: true,
    lastName: 'Candidate',
    dob: '2008-01-01',
    birthPlace: 'Manila',
    nationality: 'Filipino',
    gender: 'Prefer not to say',
    email: 'preview@example.test',
    mobile: '09000000000',
    nationalId: '',
    region: 'NCR',
    province: 'Metro Manila',
    city: 'Quezon City',
    barangay: 'Diliman',
    street: '',
    zipCode: '1101',
    lrn: '000000000000',
    schoolName: 'Preview High School',
    schoolAddress: 'Quezon City',
    academicTrack: 'STEM',
    gradeLevel: 'Grade 12',
    gwa: 90,
    universities: ['University of the Philippines Diliman'],
    courses: ['BS Computer Science'],
    examScheduleId: scheduledSlot?.id ?? '',
    examStatus: scheduledSlot ? 'SCHEDULED' : undefined,
    examDate: scheduledSlot?.date,
    examTestCenter: scheduledSlot?.testCenter,
    examRoom: scheduledSlot?.room,
  };
}

/**
 * Synthetic exam slots for the same SYSTEM_ADMIN preview case above. The real
 * GET /api/v1/applications/exam-slots/ endpoint is STUDENT-only by design
 * (see the exam-schedule-assignment spec's security requirements), so an
 * admin's request to it is correctly rejected rather than widened just for a
 * cosmetic preview -- these mirror the seed_sample_exam_slots fixture data
 * exactly, entirely client-side, so the preview never depends on backend
 * access it isn't meant to have.
 */
export function buildAdminPreviewExamSlots(): BackendExamSlot[] {
  return [
    {
      id: 'preview-slot-1',
      date: '2026-06-15',
      startTime: '08:00:00',
      endTime: '11:00:00',
      testCenter: 'University of the Philippines Diliman',
      room: 'Benitez Hall R101',
      totalSlots: 50,
      remainingSlots: 50,
    },
    {
      id: 'preview-slot-2',
      date: '2026-05-22',
      startTime: '09:00:00',
      endTime: '12:00:00',
      testCenter: 'Ateneo de Manila University',
      room: 'SEC Lecture Hall 1',
      totalSlots: 40,
      remainingSlots: 40,
    },
  ];
}

export function findAdminPreviewSlot(slotId: string | null): BackendExamSlot | null {
  if (!slotId) return null;
  return buildAdminPreviewExamSlots().find((slot) => slot.id === slotId) ?? null;
}

const PREVIEW_SLOT_STORAGE_KEY = 'philsa_admin_preview_slot_id';

/**
 * Lets the admin-preview "confirm a slot" action on the Dashboard carry
 * through to the Permit page too -- a separate route/page load, so this has
 * to be persisted somewhere the two pages both read from. localStorage-only,
 * browser-local; never sent anywhere, matching the rest of this preview
 * being entirely client-side synthetic data.
 */
export function getAdminPreviewSlotId(): string | null {
  try {
    return localStorage.getItem(PREVIEW_SLOT_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAdminPreviewSlotId(slotId: string | null): void {
  try {
    if (slotId) localStorage.setItem(PREVIEW_SLOT_STORAGE_KEY, slotId);
    else localStorage.removeItem(PREVIEW_SLOT_STORAGE_KEY);
  } catch {
    // Ignore -- worst case the preview just doesn't persist across pages.
  }
}
