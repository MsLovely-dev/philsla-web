import { useEffect, useId, useState, type FormEvent } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X } from 'lucide-react';

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
}

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
export function QrScanModal({ isOpen, onClose, onScan, title = 'Scan QR Code', hint }: QrScanModalProps) {
  const rawId = useId();
  const regionId = `qr-scan-region-${rawId.replace(/[^a-zA-Z0-9]/g, '')}`;
  const titleId = useId();
  const [cameraError, setCameraError] = useState(false);
  const [manualValue, setManualValue] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setCameraError(false);
    setManualValue('');

    const scanner = new Html5Qrcode(regionId);

    scanner
      .start(
        { facingMode: 'environment' },
        SCAN_CONFIG,
        (decodedText) => {
          // Report the raw decoded value only. Whether it matches a student, is a
          // duplicate scan, etc. is the caller's concern (Task 4), not this component's.
          onScan(decodedText);
        },
        () => {
          // Per-frame "no QR code found in this frame" callback. This fires continuously
          // while the camera is pointed away from a code — expected, not an error.
        },
      )
      .catch(() => {
        // Camera permission denied, no camera available, or any other start failure:
        // fall back to manual entry so a live demo is never blocked by hardware/permissions.
        if (isMounted) setCameraError(true);
      });

    return () => {
      isMounted = false;
      // Hard privacy requirement: stop the underlying camera stream (every
      // MediaStreamTrack) on close AND on unmount, not only on an explicit close action.
      scanner
        .stop()
        .catch(() => {
          // Nothing running to stop (e.g. start() never resolved, or already stopped) —
          // safe to ignore.
        })
        .finally(() => {
          try {
            scanner.clear();
          } catch {
            // No-op: the scan region element may already be gone.
          }
        });
    };
  }, [isOpen, onScan, regionId]);

  if (!isOpen) return null;

  const handleManualSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = manualValue.trim();
    if (!trimmed) return;
    onScan(trimmed);
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
        className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-philsa-border bg-white shadow-2xl"
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

        <div className="px-6 py-5">
          {hint && <p className="mb-3 text-xs font-semibold text-philsa-gray">{hint}</p>}

          {!cameraError && (
            <div
              id={regionId}
              data-testid="qr-scan-region"
              className="aspect-square w-full overflow-hidden rounded-2xl bg-slate-900"
            />
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
      </section>
    </div>
  );
}
