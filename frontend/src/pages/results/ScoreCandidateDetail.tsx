import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Award, BookOpen, Camera, ChevronLeft, ClipboardList, Fingerprint, MapPin, MessageSquare, Search, ShieldAlert, ShieldCheck, User } from 'lucide-react';
import {
  getScoreManagementCandidateProfile,
  scoreReleaseStatusLabel,
  type ScoreManagementCandidateActivityLog,
  type ScoreManagementCandidateProfile,
  type ScoreManagementResult,
} from '../../services/scoreManagementService';

type ActivityFilter = 'ALL' | 'SUCCESS' | 'FAILED' | 'OTP' | 'VALIDATION' | 'BIOMETRIC';

const PWD_FIELD_KEYS = new Set(['isPwd', 'pwdType', 'pwdCondition', 'pwdIdNumber', 'pwdIdFilename', 'pwdAccommodation']);
const KNOWN_PERSONAL_FIELDS = new Set([
  'firstName',
  'middleName',
  'lastName',
  'suffix',
  'extensionName',
  'dateOfBirth',
  'sex',
  'email',
  'mobile',
  'identityVerificationStatus',
]);
const ACTIVITY_FILTERS: Array<{ label: string; value: ActivityFilter }> = [
  { label: 'All Activity Logs', value: 'ALL' },
  { label: 'Successful Events', value: 'SUCCESS' },
  { label: 'Failed / Alerts', value: 'FAILED' },
  { label: 'OTP Events', value: 'OTP' },
  { label: 'Validation Errors', value: 'VALIDATION' },
  { label: 'Biometric Checks', value: 'BIOMETRIC' },
];
export default function ScoreCandidateDetail() {
  const { batchId, candidateId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const stateResult = (location.state as { result?: ScoreManagementResult } | null)?.result ?? null;
  const [result, setResult] = useState<ScoreManagementResult | null>(stateResult);
  const [isLoading, setIsLoading] = useState(!stateResult);
  const [profile, setProfile] = useState<ScoreManagementCandidateProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('ALL');
  const [activitySearch, setActivitySearch] = useState('');

  useEffect(() => {
    if (!batchId || !candidateId) return;

    let cancelled = false;
    if (!stateResult) setIsLoading(true);
    setIsLoadingProfile(true);
    setErrorMessage('');

    getScoreManagementCandidateProfile(batchId, candidateId)
      .then((payload) => {
        if (cancelled) return;
        setResult(payload.score);
        setProfile(payload.profile);
      })
      .catch((error) => {
        if (!cancelled) setErrorMessage(error instanceof Error ? error.message : 'Unable to load candidate profile.');
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
          setIsLoadingProfile(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [batchId, candidateId, stateResult]);

  const displayId = result?.candidateId ?? candidateId ?? '';
  const percentileValue = result?.percentile === null || result?.percentile === undefined
    ? 'N/A'
    : result.percentile.toFixed(2);
  const personal = profile?.personal ?? {};
  const address = profile?.address ?? {};
  const school = profile?.school ?? {};
  const reviewStep = profile?.reviewStep ?? {};
  const additionalRegistrationFields = Object.entries(personal).filter(
    ([field, value]) => !knownPersonalField(field) && !PWD_FIELD_KEYS.has(field) && Boolean(value),
  );
  const pwdFields = Object.entries(personal)
    .filter(([field, value]) => PWD_FIELD_KEYS.has(field) && Boolean(value))
    .map(([field, value]) => [pwdLabel(field), value] as const);
  const reviewerReason = firstNonEmptyString(reviewStep.reviewerReason, reviewStep.reason, reviewStep.reviewNotes);
  const reviewerDirectives = firstNonEmptyString(reviewerReason, reviewStep.requiredCorrections);
  const activityRows = useMemo(() => buildActivityRows(profile), [profile]);
  const filteredActivityRows = useMemo(() => {
    const query = activitySearch.trim().toLowerCase();
    return activityRows.filter((row) => {
      const matchesFilter = activityFilter === 'ALL' ||
        row.category === activityFilter ||
        (activityFilter === 'SUCCESS' && row.outcome === 'success') ||
        (activityFilter === 'FAILED' && row.outcome !== 'success');
      const matchesSearch = !query ||
        row.activity.toLowerCase().includes(query) ||
        row.details.toLowerCase().includes(query) ||
        row.timestamp.toLowerCase().includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [activityFilter, activityRows, activitySearch]);

  return (
    <div className="space-y-8 font-sans">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-lg border border-philsa-border p-2 text-philsa-red shadow-sm transition-colors hover:bg-philsa-bg"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-extrabold uppercase tracking-tight text-philsa-navy">
          Candidate Result: {displayId}
        </h1>
      </div>

      <div className="inline-flex w-fit items-center gap-2 rounded-2xl border border-philsa-border bg-white px-5 py-3 shadow-sm">
        <Award className="h-4 w-4 text-philsa-red" />
        <span className="text-sm font-bold text-philsa-navy">Score Result Details</span>
      </div>

      {errorMessage && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-700">
          {errorMessage}
        </div>
      )}

      {isLoading && (
        <div className="card-philsa border border-philsa-border bg-white p-10 text-center text-xs italic text-slate-400">
          Loading candidate examination record...
        </div>
      )}

      {!isLoading && result && (
        <div className="card-philsa relative space-y-8 overflow-hidden border border-philsa-border bg-white p-10">
          <div className="absolute right-0 top-0 p-8 opacity-5">
            <User className="h-32 w-32 text-philsa-navy" />
          </div>

          <section className="relative z-10 space-y-4 text-philsa-navy">
            <h2 className="flex items-center gap-2 border-b border-[#8A1538]/20 pb-1.5 text-xs font-bold uppercase tracking-wider text-[#8A1538]">
              <Award className="h-4 w-4 text-[#00563F]" />
              Examination Result
            </h2>
            <div className="grid grid-cols-1 gap-6 rounded-xl border border-gray-100 bg-gray-50/50 p-6 sm:grid-cols-2 md:grid-cols-3">
              <DataRow label="Candidate ID" value={result.candidateId} />
              <DataRow label="Candidate Name" value={result.candidateName} />
              <DataRow label="Learner Reference Number" value={result.lrn} />
              <DataRow label="Examination Set" value={result.examSetId || result.examName} />
              <DataRow label="Final Score" value={result.finalScoreDisplay} />
              <DataRow label="Percentile Rank" value={percentileValue} />
              <DataRow label="Overall Rank" value={result.rank === null ? 'N/A' : `#${result.rank}`} />
              <DataRow label="Result Status" value={scoreReleaseStatusLabel(result.releaseStatus)} />
              <DataRow label="Batch" value={batchId ?? result.examName} />
            </div>
          </section>

          <section className="relative z-10 space-y-4 text-philsa-navy">
            <h2 className="flex items-center gap-2 border-b border-[#8A1538]/20 pb-1.5 text-xs font-bold uppercase tracking-wider text-[#8A1538]">
              <BookOpen className="h-4 w-4 text-[#00563F]" />
              Score Components
            </h2>
            <div className="grid grid-cols-1 gap-6 rounded-xl border border-gray-100 bg-gray-50/50 p-6 sm:grid-cols-2 md:grid-cols-3">
              <DataRow label="Raw Score" value={String(result.rawScore)} />
              <DataRow label="Maximum Score" value={String(result.maxScore)} />
              <DataRow label="Computed Final Score" value={`${result.finalScore.toFixed(2)}%`} />
            </div>
          </section>

          {isLoadingProfile && (
            <p className="relative z-10 text-[10px] font-black uppercase tracking-widest text-philsa-gray">
              Loading registered candidate information...
            </p>
          )}

          {!isLoadingProfile && !profile && (
            <div className="relative z-10 rounded-xl border border-amber-100 bg-amber-50/60 p-6">
              <p className="text-xs font-semibold italic text-amber-800">
                No linked student application profile was found for this score record.
              </p>
            </div>
          )}

          {profile && (
            <>
              <section className="relative z-10 space-y-4 text-philsa-navy">
                <h2 className="flex items-center gap-2 border-b border-[#8A1538]/20 pb-1.5 text-xs font-bold uppercase tracking-wider text-[#8A1538]">
                  <User className="h-4 w-4 text-[#00563F]" />
                  Personal Information
                </h2>
                <div className="grid gap-6 rounded-xl border border-gray-100 bg-gray-50/50 p-6 lg:grid-cols-[minmax(0,1fr)_190px]">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
                    <DataRow label="Application Candidate ID" value={profile.candidateId} />
                    <DataRow label="Application Status" value={profile.status.replace('_', ' ')} />
                    <DataRow label="First Name" value={textValue(personal.firstName)} />
                    <DataRow label="Middle Name" value={textValue(personal.middleName, 'None')} />
                    <DataRow label="Last Name" value={textValue(personal.lastName)} />
                    <DataRow label="Suffix" value={textValue(personal.suffix || personal.extensionName, 'None')} />
                    <DataRow label="Date of Birth" value={textValue(personal.dateOfBirth)} />
                    <DataRow label="Sex" value={textValue(personal.sex)} />
                    <DataRow label="Email Address" value={textValue(personal.email)} />
                    <DataRow label="Mobile Number" value={textValue(personal.mobile)} />
                    <DataRow label="Identity Status" value={textValue(personal.identityVerificationStatus)} />
                    {additionalRegistrationFields.map(([field, value]) => (
                      <DataRow key={field} label={field} value={textValue(value)} />
                    ))}
                  </div>
                  <div className="rounded-xl border border-white bg-white p-3 shadow-xs">
                    <div className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-lg border border-gray-100 bg-philsa-bg">
                      {profile.photoUrl ? (
                        <img src={profile.photoUrl} alt={`${result.candidateName} profile`} className="h-full w-full object-cover" />
                      ) : (
                        <User className="h-14 w-14 text-slate-300" />
                      )}
                    </div>
                    <p className="mt-3 text-center text-[10px] font-black uppercase tracking-widest text-philsa-gray">
                      Student Photo
                    </p>
                  </div>
                </div>
              </section>

              <section className="relative z-10 space-y-4 text-philsa-navy">
                <h2 className="flex items-center gap-2 border-b border-[#8A1538]/20 pb-1.5 text-xs font-bold uppercase tracking-wider text-[#8A1538]">
                  <MapPin className="h-4 w-4 text-[#00563F]" />
                  Address Information
                </h2>
                <div className="grid grid-cols-1 gap-6 rounded-xl border border-gray-100 bg-gray-50/50 p-6 sm:grid-cols-2 md:grid-cols-3">
                  <DataRow label="Region" value={textValue(address.region)} />
                  <DataRow label="Province" value={textValue(address.province)} />
                  <DataRow label="City" value={textValue(address.city)} />
                  <DataRow label="Barangay" value={textValue(address.barangay)} />
                  <DataRow label="Street" value={textValue(address.street)} />
                  <DataRow label="Postal Code" value={textValue(address.postalCode)} />
                </div>
              </section>

              <section className="relative z-10 space-y-4 text-philsa-navy">
                <h2 className="flex items-center gap-2 border-b border-[#8A1538]/20 pb-1.5 text-xs font-bold uppercase tracking-wider text-[#8A1538]">
                  <BookOpen className="h-4 w-4 text-[#00563F]" />
                  Registry & Educational Background
                </h2>
                <div className="grid grid-cols-1 gap-6 rounded-xl border border-gray-100 bg-gray-50/50 p-6 sm:grid-cols-2 md:grid-cols-3">
                  <DataRow label="Learner Reference Number" value={textValue(school.lrn || result.lrn)} />
                  <DataRow label="School ID" value={textValue(school.schoolId)} />
                  <DataRow label="High School Name" value={textValue(school.name)} />
                  <DataRow label="Academic Track" value={textValue(school.academicTrack)} />
                  <DataRow label="Grade Level" value={textValue(school.gradeLevel)} />
                  <DataRow label="Enrollment Status" value={textValue(school.enrollmentStatus)} />
                  <DataRow label="School Year" value={textValue(school.schoolYear)} />
                  <DataRow label="GWA" value={textValue(school.gwa)} />
                </div>
              </section>

              <section className="relative z-10 space-y-4 text-philsa-navy">
                <h2 className="flex items-center gap-2 border-b border-[#8A1538]/20 pb-1.5 text-xs font-bold uppercase tracking-wider text-[#8A1538]">
                  <ClipboardList className="h-4 w-4 text-[#00563F]" />
                  Course Preferences
                </h2>
                <div className="grid grid-cols-1 gap-4 rounded-xl border border-gray-100 bg-gray-50/50 p-6 md:grid-cols-2">
                  {profile.coursePreferences.length === 0 ? (
                    <p className="text-xs font-semibold italic text-slate-500">No course preferences recorded.</p>
                  ) : (
                    profile.coursePreferences.map((preference, index) => (
                      <div key={`${preference.university}-${preference.course}-${index}`} className="rounded-lg border border-gray-100 bg-white p-4">
                        <DataRow label={`Preference ${index + 1}`} value={`${textValue(preference.university)} - ${textValue(preference.course)}`} />
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="relative z-10 space-y-4 text-philsa-navy">
                <h2 className="flex items-center gap-2 border-b border-[#8A1538]/20 pb-1.5 text-xs font-bold uppercase tracking-wider text-[#8A1538]">
                  <ShieldAlert className="h-4 w-4 text-[#00563F]" />
                  Person With Disability (PWD) Status & Accommodations
                </h2>
                {pwdFields.length === 0 ? (
                  <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-6">
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-700">
                      <User className="h-3.5 w-3.5" />
                      No PWD Declaration
                    </span>
                    <p className="mt-4 text-xs font-semibold italic text-slate-600">
                      Student candidate declared no disability or special examination accommodations during registration.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6 rounded-xl border border-gray-100 bg-gray-50/50 p-6 sm:grid-cols-2 md:grid-cols-3">
                    {pwdFields.map(([field, value]) => <DataRow key={field} label={field} value={textValue(value)} />)}
                  </div>
                )}
              </section>

              <section className="relative z-10 space-y-4 text-philsa-navy">
                <div className="flex items-center justify-between gap-4 border-b border-[#8A1538]/20 pb-1.5">
                  <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#8A1538]">
                    <Fingerprint className="h-4 w-4 text-[#00563F]" />
                    Biometric & Identity Verification Logs
                  </h2>
                </div>

                <div className="space-y-6 rounded-xl border border-slate-200/60 bg-slate-50/50 p-6">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div className="flex flex-wrap gap-1.5">
                      {ACTIVITY_FILTERS.map((filter) => {
                        const isSelected = activityFilter === filter.value;
                        return (
                          <button
                            key={filter.value}
                            type="button"
                            onClick={() => setActivityFilter(filter.value)}
                            className={`rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider transition-all ${
                              isSelected
                                ? 'bg-slate-800 text-white shadow-xs'
                                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {filter.label}
                          </button>
                        );
                      })}
                    </div>

                    <div className="relative w-full max-w-xs sm:w-64">
                      <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Filter date, activity, or details..."
                        value={activitySearch}
                        onChange={(event) => setActivitySearch(event.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-philsa-blue"
                      />
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
                    <div className="max-h-72 overflow-y-auto">
                      <table className="w-full min-w-[760px] border-collapse text-left text-xs">
                        <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          <tr>
                            <th className="bg-slate-50 px-4 py-3">Date & Time</th>
                            <th className="bg-slate-50 px-4 py-3">Activity</th>
                            <th className="bg-slate-50 px-4 py-3">Details</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredActivityRows.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="px-4 py-8 text-center font-medium italic text-slate-400">
                                No matched verification activity found for this candidate.
                              </td>
                            </tr>
                          ) : (
                            filteredActivityRows.map((row) => (
                              <tr key={row.id} className="transition-colors hover:bg-slate-50">
                                <td className="px-4 py-3 font-mono text-[10px] text-slate-600">{row.timestamp}</td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${activityToneClass(row.outcome)}`}>
                                    {row.category === 'BIOMETRIC' ? <Camera className="h-2.5 w-2.5" /> : <ShieldCheck className="h-2.5 w-2.5" />}
                                    {row.activity}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-slate-600">{row.details}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </section>

              <section className="relative z-10 border-t border-philsa-border pt-10">
                <h2 className="mb-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-philsa-navy">
                  <MessageSquare className="h-5 w-5 text-philsa-red" />
                  Official Reviewer Directives
                </h2>
                <textarea
                  className="min-h-[160px] w-full resize-none rounded-2xl border-none bg-philsa-bg p-6 text-sm font-medium text-philsa-navy shadow-inner outline-none focus:ring-2 focus:ring-philsa-red/10"
                  value={reviewerDirectives || 'No reviewer directives recorded for this candidate.'}
                  readOnly
                />
                <div className="mt-10 rounded-3xl border border-dashed border-philsa-border bg-philsa-bg/30 p-8">
                  <p className="flex items-center gap-2 text-xs font-bold italic text-philsa-navy">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                    Candidate profile is displayed from the score-anchored read-only registration record.
                  </p>
                </div>
              </section>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function DataRow({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-philsa-gray">{label}</p>
      <p className="text-sm font-bold leading-snug text-philsa-navy">{value}</p>
    </div>
  );
}

function textValue(value: unknown, fallback = 'Unspecified'): string {
  if (Array.isArray(value)) {
    const joined = value.map((item) => textValue(item, '')).filter(Boolean).join('; ');
    return joined || fallback;
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return String(value);
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

function firstNonEmptyString(...values: unknown[]): string {
  for (const value of values) {
    const text = textValue(value, '');
    if (text) return text;
  }
  return '';
}

function knownPersonalField(field: string): boolean {
  return KNOWN_PERSONAL_FIELDS.has(field);
}

function pwdLabel(field: string): string {
  const labels: Record<string, string> = {
    isPwd: 'PWD',
    pwdType: 'PWD Type',
    pwdCondition: 'Condition',
    pwdIdNumber: 'PWD ID Number',
    pwdIdFilename: 'PWD ID Attachment',
    pwdAccommodation: 'Accommodation Needed',
  };
  return labels[field] ?? field;
}

interface ActivityRow {
  id: string;
  timestamp: string;
  activity: string;
  details: string;
  outcome: string;
  category: ActivityFilter;
}

function buildActivityRows(profile: ScoreManagementCandidateProfile | null): ActivityRow[] {
  if (!profile) return [];
  return (profile.activityLogs ?? []).map((log) => mapActivityLog(log, profile));
}

function mapActivityLog(log: ScoreManagementCandidateActivityLog, profile: ScoreManagementCandidateProfile): ActivityRow {
  const activity = activityLabel(log.action);
  return {
    id: String(log.id),
    timestamp: formatTimestamp(log.timestamp),
    activity,
    details: activityDetails(log, activity, profile),
    outcome: log.outcome || 'success',
    category: activityCategory(log.action, log.event),
  };
}

function activityLabel(action: string): string {
  const labels: Record<string, string> = {
    REGISTRATION_SUBMITTED: 'Registration Submitted',
    REGISTRATION_STUDENT_ACCOUNT_ACTIVATED: 'Account Credentials Created',
  };
  return labels[action] ?? action.split('_').map((part) => `${part.slice(0, 1)}${part.slice(1).toLowerCase()}`).join(' ');
}

function activityDetails(log: ScoreManagementCandidateActivityLog, activity: string, profile: ScoreManagementCandidateProfile): string {
  if (log.action === 'REGISTRATION_SUBMITTED') {
    return `Application submitted for review (Registration ID: ${log.registrationId || profile.candidateId})`;
  }
  if (log.action === 'REGISTRATION_STUDENT_ACCOUNT_ACTIVATED') {
    return `Student account activated (${log.actorRole || 'Student'})`;
  }
  const session = log.sessionId ? `Session: ${log.sessionId}` : '';
  const device = log.deviceBrowser ? `Device: ${log.deviceBrowser}` : '';
  return [activity, session, device].filter(Boolean).join(' - ');
}

function activityCategory(action: string, event: string): ActivityFilter {
  const text = `${action} ${event}`.toUpperCase();
  if (text.includes('OTP')) return 'OTP';
  if (text.includes('VALIDATION')) return 'VALIDATION';
  if (text.includes('BIOMETRIC') || text.includes('SELFIE') || text.includes('FACE')) return 'BIOMETRIC';
  return 'SUCCESS';
}

function activityToneClass(outcome: string): string {
  if (outcome !== 'success') return 'border-red-200 bg-red-50 text-red-700';
  return 'border-emerald-200 bg-emerald-50 text-emerald-700';
}

function formatTimestamp(value: string | null): string {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
