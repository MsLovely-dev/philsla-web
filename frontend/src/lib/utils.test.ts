import { describe, expect, it } from 'vitest';
import { formatCandidateId } from './utils';

describe('candidate ID formatting', () => {
  it('formats an application identifier with PHL prefix, registration year, and compact code', () => {
    expect(formatCandidateId('8f4k92xm', '2026-07-22T10:15:00.000Z')).toBe('PHL-2026-8F4K92');
  });

  it('uses a deterministic code when formatting UUID application ids', () => {
    const formatted = formatCandidateId('b0684cc3-d1fb-4470-ba50-019939e0a9ee', '2026-01-12');

    expect(formatted).toMatch(/^PHL-2026-[A-Z0-9]{6}$/);
    expect(formatCandidateId('b0684cc3-d1fb-4470-ba50-019939e0a9ee', '2026-01-12')).toBe(formatted);
  });

  it('preserves candidate IDs that already use the recommended format', () => {
    expect(formatCandidateId('PHL-2026-H72Q4J')).toBe('PHL-2026-H72Q4J');
  });
});
