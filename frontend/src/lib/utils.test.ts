import { describe, expect, it } from 'vitest';
import { formatCandidateId } from './utils';

describe('candidate ID formatting', () => {
  it('formats an application identifier with PhilSLA prefix, registration year, and grouped code', () => {
    expect(formatCandidateId('8f4k92xm', '2026-07-22T10:15:00.000Z')).toBe('PS-2026-8F4K-92XM');
  });

  it('uses a deterministic code when formatting UUID application ids', () => {
    const formatted = formatCandidateId('b0684cc3-d1fb-4470-ba50-019939e0a9ee', '2026-01-12');

    expect(formatted).toMatch(/^PS-2026-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(formatCandidateId('b0684cc3-d1fb-4470-ba50-019939e0a9ee', '2026-01-12')).toBe(formatted);
  });

  it('preserves candidate IDs that already use the recommended format', () => {
    expect(formatCandidateId('PS-2026-H72Q-4J9P')).toBe('PS-2026-H72Q-4J9P');
  });
});
