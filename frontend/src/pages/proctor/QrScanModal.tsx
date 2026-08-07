import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, RefreshCw, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface QrScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called once per decoded QR value (camera) or once per manual-entry submit. */
  onScan: (value: string) => void;
  /** Dialog heading. Defaults to "Scan QR Code". */
  title?: string;
  /**
   * Optional supporting copy rendered inside the modal (e.g. a
   * "Prototype — not connected to a backend" note). The caller may instead render that
   * label outside the modal, next to the trigger button — this prop exists for callers
   * that prefer it inline.
   */
  hint?: string;
  /**
   * Optional content rendered in a right-hand column (e.g. a scan history/results list).
   * This component stays decoupled from what that content means — the caller owns it
   * entirely. When provided, the modal widens into a two-column layout; omitted, it stays
   * the original single-column dialog.
   */
  results?: ReactNode;
}

type FacingMode = 'environment' | 'user';

const SCAN_CONFIG = { fps: 10, qrbox: 250 };

/**
 * Standalone camera-scanning modal for the proctor attendance prototype.
 *
 * Decoupled by design: this component knows nothing about `StudentPC`, attendance status,
 * or `qrAttendanceService` matching logic. Its only job is managing the camera lifecycle and
 * reporting a raw string back via `onScan` — once per successful decode (camera) or once per
 * manual-entry submit. The caller (not this component) decides what that string means.
 *
 * Camera privacy: video is decoded in-memory only by `html5-qrcode`; nothing is recorded,
 * stored, or uploaded. The camera stream is started/stopped from a single `useEffect` keyed
 * on `isOpen`, whose cleanup function stops the scanner — this fires both when `isOpen`
 * flips to `false` (explicit close) and when the component unmounts (e.g. navigating away
 * mid-scan), so the camera is never left running.
 */
export function QrScanModal({ isOpen, onClose, onScan, title = 'Scan QR Code', hint, results }: QrScanModalProps) {
  const rawId = useId();
  const regionId = `qr-scan-region-${rawId.replace(/[^a-zA-Z0-9]/g, '')}`;
  const titleId = useId();
  const [cameraError, setCameraError] = useState(false);
  const [manualValue, setManualValue] = useState('');
  const [facingMode, setFacingMode] = useState<FacingMode>('environment');

  // Keep the latest `onScan` in a ref instead of the camera effect's dependency array.
  // Task 4 (the caller) is expected to pass an inline `onScan={(code) => ...}` — a fresh
  // function identity on every parent render. If `onScan` were a dependency, any parent
  // re-render while the modal is open would restart the whole camera effect: it would wipe
  // in-progress manual-entry input, and — worse — if the permission-denied fallback is
  // showing (camera region div unmounted), it would call `new Html5Qrcode(regionId)` against
  // a DOM with no matching element, which throws synchronously. Reading `onScanRef.current`
  // lets the effect depend only on `isOpen`/`regionId`, so it restarts the camera lifecycle
  // only when the modal actually opens/closes, never on an unrelated parent re-render.
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setCameraError(false);
    setManualValue('');

    const scanner = new Html5Qrcode(regionId);

    // Stops the camera stream and releases the scan region. Wrapped in an outer try/catch
    // because the real `html5-qrcode` `stop()` throws *synchronously* (not a rejected
    // promise) when nothing was actually scanning — e.g. permission was denied and the
    // manual-entry fallback was used instead. Without this, that throw would escape
    // straight out of the effect cleanup (or this post-start-resolve guard) and, since
    // there's no ErrorBoundary in this app, blank the entire page.
    const stopScanner = () => {
      try {
        scanner
          .stop()
          .catch(() => {
            // Nothing running to stop (e.g. already stopped) — safe to ignore.
          })
          .finally(() => {
            try {
              scanner.clear();
            } catch {
              // No-op: the scan region element may already be gone.
            }
          });
      } catch {
        // stop() threw synchronously — nothing was scanning, safe to ignore.
      }
    };

    scanner
      .start(
        { facingMode },
        SCAN_CONFIG,
        (decodedText) => {
          // Report the raw decoded value only. Whether it matches a student, is a
          // duplicate scan, etc. is the caller's concern (Task 4), not this component's.
          onScanRef.current(decodedText);
        },
        () => {
          // Per-frame "no QR code found in this frame" callback. This fires continuously
          // while the camera is pointed away from a code — expected, not an error.
        },
      )
      .then(() => {
        // The modal may have already closed/unmounted while start() was still pending —
        // cleanup's stopScanner() call below had nothing to stop yet at that point. Stop
        // immediately now so the camera stream never keeps running with nothing left to
        // ever stop it.
        if (!isMounted) stopScanner();
      })
      .catch(() => {
        // Camera permission denied, no camera available, or any other start failure:
        // fall back to manual entry so a live demo is never blocked by hardware/permissions.
        if (isMounted) setCameraError(true);
      });

    return () => {
      isMounted = false;
      // Hard privacy requirement: stop the underlying camera stream (every
      // MediaStreamTrack) on close AND on unmount, not only on an explicit close action.
      stopScanner();
    };
  }, [isOpen, regionId, facingMode]);

  if (!isOpen) return null;

  const handleManualSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = manualValue.trim();
    if (!trimmed) return;
    onScanRef.current(trimmed);
    setManualValue('');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-philsa-navy/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'relative w-full overflow-hidden rounded-3xl border border-philsa-border bg-white shadow-2xl',
          results ? 'max-w-5xl' : 'max-w-sm',
        )}
      >
        <div className="flex items-center justify-between border-b border-philsa-border px-6 py-4">
          <h2 id={titleId} className="flex items-center gap-2 text-base font-black text-philsa-navy">
            <Camera className="h-4 w-4" aria-hidden="true" />
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-2 text-philsa-gray hover:bg-slate-100"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className={cn('px-6 py-5', results && 'grid grid-cols-1 gap-6 sm:grid-cols-[380px_1fr]')}>
          <div>
            {hint && <p className="mb-3 text-xs font-semibold text-philsa-gray">{hint}</p>}

            {/* Always rendered (visually hidden when cameraError is true) so the DOM element
                the `Html5Qrcode` constructor targets always exists on reopen — conditionally
                unmounting it left a window where a reopen's effect ran before React had
                re-rendered the div back in, and the constructor threw synchronously. */}
            <div
              id={regionId}
              data-testid="qr-scan-region"
              className={cn(
                'aspect-square w-full overflow-hidden rounded-2xl bg-slate-900',
                cameraError && 'hidden',
                // Visual-only mirror for the front camera preview, so on-screen movement
                // matches what the proctor intuitively expects (like looking in a mirror).
                // Decoding is unaffected: `Html5Qrcode` reads pixels straight from the raw
                // video frame via canvas, which this CSS transform never touches.
                facingMode === 'user' && '-scale-x-100',
              )}
            />

            {!cameraError && (
              <button
                type="button"
                onClick={() => setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-philsa-gray hover:bg-slate-50"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                {/* Named by which camera it switches TO, not which one is active — "Switch
                    Camera" alone left users unsure which direction a tap would go. */}
                {facingMode === 'environment' ? 'Switch to Front Cam' : 'Switch to Back Cam'}
              </button>
            )}

            {cameraError && (
              <form onSubmit={handleManualSubmit} className="space-y-3">
                <p className="text-xs text-philsa-gray">
                  Camera unavailable. Enter the code from the exam permit instead.
                </p>
                <label htmlFor="qr-manual-code" className="sr-only">
                  Enter code manually
                </label>
                <input
                  id="qr-manual-code"
                  name="qr-manual-code"
                  type="text"
                  value={manualValue}
                  onChange={(event) => setManualValue(event.target.value)}
                  placeholder="e.g. SAMPLE_QR_ST-001"
                  className="input-philsa w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  autoFocus
                />
                <button
                  type="submit"
                  className="w-full rounded-xl bg-philsa-navy px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white"
                >
                  Submit
                </button>
              </form>
            )}
          </div>

          {results && <div className="min-w-0">{results}</div>}
        </div>
      </section>
    </div>
  );
}
