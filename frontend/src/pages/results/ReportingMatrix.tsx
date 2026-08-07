import { useCallback, useEffect, useRef, useState } from 'react';
import { BarChart3, RefreshCw, Users } from 'lucide-react';
import { resultsAnalyticsService, type ResultsAnalyticsOverview, type ResultsSessionAggregate } from '../../services/resultsAnalyticsService';

type LoadState = 'loading' | 'ready' | 'error';

function displayScore(value: number | null): string {
  return value === null ? 'Not available' : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function displayReleasedAt(value: string | null): string {
  if (value === null) return 'Not available';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Not available' : parsed.toLocaleDateString();
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-philsa p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-philsa-gray">{label}</p>
      <p className="mt-2 text-3xl font-black text-philsa-navy">{value}</p>
    </div>
  );
}

function SessionRow({ session }: { session: ResultsSessionAggregate }) {
  return (
    <tr className="border-t border-philsa-border">
      <td className="px-4 py-3 font-semibold text-philsa-navy">{session.sessionName}</td>
      <td className="px-4 py-3 text-right">{session.releasedCandidates.toLocaleString()}</td>
      <td className="px-4 py-3 text-right">{displayScore(session.meanFinalScore)}</td>
      <td className="px-4 py-3 text-right">{displayReleasedAt(session.releasedAt)}</td>
    </tr>
  );
}

export default function ReportingMatrix() {
  const [state, setState] = useState<LoadState>('loading');
  const [overview, setOverview] = useState<ResultsAnalyticsOverview | null>(null);
  const mounted = useRef(false);
  const requestSequence = useRef(0);

  const loadOverview = useCallback(async () => {
    const requestId = ++requestSequence.current;
    setState('loading');
    const result = await resultsAnalyticsService.getOverview();
    if (!mounted.current || requestId !== requestSequence.current) return;

    if (result.ok) {
      setOverview(result.data);
      setState('ready');
      return;
    }

    setOverview(null);
    setState('error');
  }, []);

  useEffect(() => {
    mounted.current = true;
    void loadOverview();
    return () => {
      mounted.current = false;
      requestSequence.current += 1;
    };
  }, [loadOverview]);

  const isEmpty = overview !== null && overview.releasedCandidates === 0;
  const maximumBandCount = Math.max(...(overview?.scoreBands.map((band) => band.count) ?? [0]), 1);

  return (
    <main className="space-y-8 text-left" aria-labelledby="released-results-overview-heading">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 id="released-results-overview-heading" className="text-3xl font-extrabold tracking-tight text-philsa-navy">Released Results Overview</h1>
          <p className="mt-2 text-sm font-medium text-philsa-gray">Aggregate statistics for released examination results.</p>
        </div>
        <button
          type="button"
          onClick={() => void loadOverview()}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-philsa-border bg-white px-4 py-2.5 text-sm font-bold text-philsa-navy hover:bg-philsa-bg focus:outline-none focus:ring-2 focus:ring-philsa-red focus:ring-offset-2"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Refresh analytics
        </button>
      </header>

      {state === 'loading' && (
        <div role="status" className="card-philsa p-6 text-sm font-medium text-philsa-gray">
          Loading released results analytics…
        </div>
      )}

      {state === 'error' && (
        <div role="alert" className="card-philsa flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-medium text-philsa-navy">Released results analytics could not be loaded. Please try again.</p>
          <button
            type="button"
            onClick={() => void loadOverview()}
            className="rounded-xl bg-philsa-navy px-4 py-2 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-philsa-red focus:ring-offset-2"
          >
            Retry
          </button>
        </div>
      )}

      {state === 'ready' && overview !== null && (isEmpty ? (
        <section className="card-philsa p-8" aria-label="Released results empty state">
          <h2 className="text-xl font-bold text-philsa-navy">No released result data yet</h2>
          <p className="mt-2 text-sm text-philsa-gray">Aggregate analytics will appear after results are released.</p>
        </section>
      ) : (
        <>
          <section aria-label="Released result totals" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <MetricCard label="Released candidates" value={overview.releasedCandidates.toLocaleString()} />
            <MetricCard label="Released sessions" value={overview.releasedSessions.toLocaleString()} />
            <MetricCard label="Mean final score" value={displayScore(overview.meanFinalScore)} />
          </section>

          <section className="card-philsa p-6" aria-labelledby="score-bands-heading">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-5 w-5 text-philsa-red" aria-hidden="true" />
              <div>
                <h2 id="score-bands-heading" className="text-xl font-bold text-philsa-navy">Score-band distribution</h2>
                <p className="text-sm text-philsa-gray">Released candidate counts by server-provided score band.</p>
              </div>
            </div>
            <div className="mt-6 space-y-4" aria-label="Score-band visualization">
              {overview.scoreBands.map((band) => (
                <div key={`${band.minimum}-${band.maximum}`}>
                  <div className="mb-1 flex justify-between gap-4 text-sm">
                    <span className="font-semibold text-philsa-navy">{band.label}</span>
                    <span>{band.count.toLocaleString()}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-philsa-red" style={{ width: `${(band.count / maximumBandCount) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[420px] text-sm">
                <caption className="sr-only">Released candidates in each score band</caption>
                <thead className="text-left text-xs uppercase tracking-wider text-philsa-gray">
                  <tr><th className="px-3 py-2">Score band</th><th className="px-3 py-2 text-right">Minimum</th><th className="px-3 py-2 text-right">Maximum</th><th className="px-3 py-2 text-right">Released candidates</th></tr>
                </thead>
                <tbody>{overview.scoreBands.map((band) => <tr key={band.label} className="border-t border-philsa-border"><td className="px-3 py-2 font-semibold">{band.label}</td><td className="px-3 py-2 text-right">{band.minimum}</td><td className="px-3 py-2 text-right">{band.maximum}</td><td className="px-3 py-2 text-right">{band.count.toLocaleString()}</td></tr>)}</tbody>
              </table>
            </div>
          </section>

          <section className="card-philsa p-6" aria-labelledby="session-summary-heading">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-philsa-red" aria-hidden="true" />
              <div><h2 id="session-summary-heading" className="text-xl font-bold text-philsa-navy">Released session summary</h2><p className="text-sm text-philsa-gray">Session-level aggregates from released results.</p></div>
            </div>
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm"><caption className="sr-only">Released result aggregates by examination session</caption><thead className="text-left text-xs uppercase tracking-wider text-philsa-gray"><tr><th className="px-4 py-3">Session</th><th className="px-4 py-3 text-right">Released candidates</th><th className="px-4 py-3 text-right">Mean final score</th><th className="px-4 py-3 text-right">Released at</th></tr></thead><tbody>{overview.sessions.map((session) => <SessionRow key={session.sessionId} session={session} />)}</tbody></table>
            </div>
          </section>
        </>
      ))}
    </main>
  );
}
