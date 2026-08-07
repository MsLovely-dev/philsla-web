import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Html5Qrcode } from 'html5-qrcode';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QrScanModal } from './QrScanModal';

// `html5-qrcode` talks to real camera hardware (`getUserMedia`) and is never exercised
// against a real camera in tests. We mock the `Html5Qrcode` class entirely and simulate
// the two behaviors the component depends on:
//  - `start(...)` resolves once permission/camera is granted, or rejects when denied.
//  - `stop()` mirrors the real library, which stops every `MediaStreamTrack` on the
//    underlying camera stream as part of tearing itself down.
vi.mock('html5-qrcode', () => ({
  Html5Qrcode: vi.fn(),
}));

type QrSuccessCallback = (decodedText: string) => void;
type QrErrorCallback = (errorMessage: string) => void;

const startMock = vi.fn();
const stopMock = vi.fn();
const clearMock = vi.fn();
const trackStopMock = vi.fn();

let latestSuccessCallback: QrSuccessCallback | undefined;
let startShouldReject = false;
let stopShouldThrowSync = false;
let startShouldPend = false;
let resolvePendingStart: (() => void) | undefined;

function createMockScannerInstance() {
  return {
    start: (
      cameraIdOrConfig: string | MediaTrackConstraints,
      config: unknown,
      successCallback: QrSuccessCallback,
      errorCallback: QrErrorCallback,
    ) => {
      startMock(cameraIdOrConfig, config, successCallback, errorCallback);
      latestSuccessCallback = successCallback;
      if (startShouldPend) {
        return new Promise<null>((resolve) => {
          resolvePendingStart = () => resolve(null);
        });
      }
      return startShouldReject
        ? Promise.reject(new Error('NotAllowedError: Permission denied'))
        : Promise.resolve(null);
    },
    stop: () => {
      stopMock();
      // Real `html5-qrcode` throws *synchronously* (not a rejected promise) when `stop()`
      // is called with no active scanning session — e.g. camera permission was denied and
      // manual entry was used instead, or start() never got the chance to begin.
      if (stopShouldThrowSync) {
        throw new Error('Cannot stop, scanner is not scanning.');
      }
      // Mirrors `RenderedCameraImpl.close()` in the real library, which calls
      // `.stop()` on every `MediaStreamTrack` of the underlying camera stream.
      trackStopMock();
      return Promise.resolve();
    },
    clear: () => clearMock(),
  };
}

describe('QrScanModal', () => {
  beforeEach(() => {
    latestSuccessCallback = undefined;
    startShouldReject = false;
    stopShouldThrowSync = false;
    startShouldPend = false;
    resolvePendingStart = undefined;
    startMock.mockReset();
    stopMock.mockReset();
    clearMock.mockReset();
    trackStopMock.mockReset();

    vi.mocked(Html5Qrcode).mockClear();
    vi.mocked(Html5Qrcode).mockImplementation(function MockHtml5Qrcode(elementId: string) {
      // Mirrors the real `Html5Qrcode` constructor (verified in
      // node_modules/html5-qrcode/esm/html5-qrcode.js): it throws synchronously if the
      // target element isn't in the DOM yet. This is load-bearing for the regression test
      // below — a mock that skipped this check couldn't catch the bug it guards against.
      if (!document.getElementById(elementId)) {
        throw new Error(`HTML Element with id=${elementId} not found`);
      }
      return createMockScannerInstance() as unknown as Html5Qrcode;
    });
  });

  it('renders nothing when closed', () => {
    render(<QrScanModal isOpen={false} onClose={vi.fn()} onScan={vi.fn()} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(startMock).not.toHaveBeenCalled();
  });

  it('starts the camera and renders the scan dialog when open', async () => {
    render(<QrScanModal isOpen onClose={vi.fn()} onScan={vi.fn()} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await waitFor(() => expect(startMock).toHaveBeenCalledTimes(1));
  });

  it('falls back to a manual code-entry input when camera permission is denied', async () => {
    startShouldReject = true;
    const onScan = vi.fn();
    const user = userEvent.setup();
    render(<QrScanModal isOpen onClose={vi.fn()} onScan={onScan} />);

    const input = await screen.findByLabelText(/enter code manually/i);
    await user.type(input, 'SAMPLE_QR_ST-001');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(onScan).toHaveBeenCalledWith('SAMPLE_QR_ST-001');
    expect(onScan).toHaveBeenCalledTimes(1);
  });

  it('does not show the manual fallback while the camera is working', async () => {
    render(<QrScanModal isOpen onClose={vi.fn()} onScan={vi.fn()} />);

    await waitFor(() => expect(startMock).toHaveBeenCalledTimes(1));
    expect(screen.queryByLabelText(/enter code manually/i)).not.toBeInTheDocument();
  });

  it('calls onScan once per successful camera decode, without closing the modal or interpreting the value', async () => {
    const onScan = vi.fn();
    const onClose = vi.fn();
    render(<QrScanModal isOpen onClose={onClose} onScan={onScan} />);

    await waitFor(() => expect(latestSuccessCallback).toBeDefined());

    act(() => {
      latestSuccessCallback?.('SAMPLE_QR_ST-002');
    });

    expect(onScan).toHaveBeenCalledWith('SAMPLE_QR_ST-002');
    expect(onScan).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('stops the scanner and every MediaStreamTrack when the modal unmounts', async () => {
    const { unmount } = render(<QrScanModal isOpen onClose={vi.fn()} onScan={vi.fn()} />);
    await waitFor(() => expect(startMock).toHaveBeenCalledTimes(1));

    unmount();

    await waitFor(() => expect(stopMock).toHaveBeenCalledTimes(1));
    expect(trackStopMock).toHaveBeenCalledTimes(1);
  });

  it('stops the scanner and every MediaStreamTrack when the modal is closed (isOpen -> false)', async () => {
    const onClose = vi.fn();
    const { rerender } = render(<QrScanModal isOpen onClose={onClose} onScan={vi.fn()} />);
    await waitFor(() => expect(startMock).toHaveBeenCalledTimes(1));

    rerender(<QrScanModal isOpen={false} onClose={onClose} onScan={vi.fn()} />);

    await waitFor(() => expect(stopMock).toHaveBeenCalledTimes(1));
    expect(trackStopMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not restart the camera effect when onScan gets a new identity while the manual fallback is showing', async () => {
    // Regression test: Task 4 (the caller) is expected to pass an inline
    // `onScan={(code) => ...}`, which is a fresh function on every parent render. If the
    // camera effect depended on `onScan`, a parent re-render while the permission-denied
    // fallback is showing (camera region div unmounted) would re-run the effect and call
    // `new Html5Qrcode(regionId)` against a DOM with no matching element — which the real
    // library (and this mock, mirroring it above) throws on synchronously.
    startShouldReject = true;
    const onScanA = vi.fn();
    const onScanB = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(<QrScanModal isOpen onClose={vi.fn()} onScan={onScanA} />);

    await screen.findByLabelText(/enter code manually/i);
    await waitFor(() => expect(startMock).toHaveBeenCalledTimes(1));
    expect(vi.mocked(Html5Qrcode)).toHaveBeenCalledTimes(1);

    // Simulate a parent re-render passing a brand-new `onScan` function identity while the
    // fallback UI (no camera region element in the DOM) is showing.
    expect(() => {
      rerender(<QrScanModal isOpen onClose={vi.fn()} onScan={onScanB} />);
    }).not.toThrow();

    // The camera-construction effect must not have re-fired: still constructed/started once.
    expect(vi.mocked(Html5Qrcode)).toHaveBeenCalledTimes(1);
    expect(startMock).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText(/enter code manually/i)).toBeInTheDocument();

    // The latest `onScan` is still the one actually used going forward.
    await user.type(screen.getByLabelText(/enter code manually/i), 'SAMPLE_QR_ST-009');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(onScanB).toHaveBeenCalledWith('SAMPLE_QR_ST-009');
    expect(onScanA).not.toHaveBeenCalled();
  });

  it('does not crash the app when stop() throws synchronously during cleanup', async () => {
    stopShouldThrowSync = true;
    const { unmount } = render(<QrScanModal isOpen onClose={vi.fn()} onScan={vi.fn()} />);
    await waitFor(() => expect(startMock).toHaveBeenCalledTimes(1));

    expect(() => unmount()).not.toThrow();
    expect(stopMock).toHaveBeenCalledTimes(1);
  });

  it('stops the scanner if start() resolves only after the modal has already closed', async () => {
    startShouldPend = true;
    const onClose = vi.fn();
    const { rerender } = render(<QrScanModal isOpen onClose={onClose} onScan={vi.fn()} />);
    await waitFor(() => expect(startMock).toHaveBeenCalledTimes(1));

    // Close before start() has resolved. Cleanup's stop() call has nothing to stop yet.
    rerender(<QrScanModal isOpen={false} onClose={onClose} onScan={vi.fn()} />);
    await waitFor(() => expect(stopMock).toHaveBeenCalledTimes(1));
    trackStopMock.mockClear();
    stopMock.mockClear();

    // start() finally resolves after the close. Nothing should be left scanning.
    await act(async () => {
      resolvePendingStart?.();
    });

    expect(stopMock).toHaveBeenCalledTimes(1);
    expect(trackStopMock).toHaveBeenCalledTimes(1);
  });

  it('does not crash when reopened after a previous camera error', async () => {
    startShouldReject = true;
    const { rerender } = render(<QrScanModal isOpen onClose={vi.fn()} onScan={vi.fn()} />);
    await screen.findByLabelText(/enter code manually/i);

    rerender(<QrScanModal isOpen={false} onClose={vi.fn()} onScan={vi.fn()} />);

    startShouldReject = false;
    expect(() => {
      rerender(<QrScanModal isOpen onClose={vi.fn()} onScan={vi.fn()} />);
    }).not.toThrow();

    await waitFor(() => expect(startMock).toHaveBeenCalledTimes(2));
    expect(screen.queryByLabelText(/enter code manually/i)).not.toBeInTheDocument();
  });

  it('starts the camera with the back camera by default', async () => {
    render(<QrScanModal isOpen onClose={vi.fn()} onScan={vi.fn()} />);

    await waitFor(() => expect(startMock).toHaveBeenCalledTimes(1));
    expect(startMock.mock.calls[0][0]).toEqual({ facingMode: 'environment' });
  });

  it('labels the switch button by which camera it switches TO, so back/front is never ambiguous', async () => {
    const user = userEvent.setup();
    render(<QrScanModal isOpen onClose={vi.fn()} onScan={vi.fn()} />);
    await waitFor(() => expect(startMock).toHaveBeenCalledTimes(1));

    // Currently on the back camera, so the button offers to switch TO the front.
    expect(screen.getByRole('button', { name: /switch to front cam/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /switch to front cam/i }));
    await waitFor(() => expect(startMock).toHaveBeenCalledTimes(2));

    // Now on the front camera, so the button offers to switch back TO the back camera.
    expect(screen.getByRole('button', { name: /switch to back cam/i })).toBeInTheDocument();
  });

  it('switches between back and front camera when clicked, restarting the scanner', async () => {
    const user = userEvent.setup();
    render(<QrScanModal isOpen onClose={vi.fn()} onScan={vi.fn()} />);
    await waitFor(() => expect(startMock).toHaveBeenCalledTimes(1));
    expect(startMock.mock.calls[0][0]).toEqual({ facingMode: 'environment' });

    await user.click(screen.getByRole('button', { name: /switch to front cam/i }));

    await waitFor(() => expect(stopMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(startMock).toHaveBeenCalledTimes(2));
    expect(startMock.mock.calls[1][0]).toEqual({ facingMode: 'user' });
  });

  it('mirrors the scan region preview visually when using the front camera', async () => {
    const user = userEvent.setup();
    render(<QrScanModal isOpen onClose={vi.fn()} onScan={vi.fn()} />);
    await waitFor(() => expect(startMock).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('qr-scan-region')).not.toHaveClass('-scale-x-100');

    await user.click(screen.getByRole('button', { name: /switch to front cam/i }));
    await waitFor(() => expect(startMock).toHaveBeenCalledTimes(2));

    expect(screen.getByTestId('qr-scan-region')).toHaveClass('-scale-x-100');
  });

  it('renders a right-hand results panel and widens the modal when `results` is provided', () => {
    render(
      <QrScanModal
        isOpen
        onClose={vi.fn()}
        onScan={vi.fn()}
        results={<div data-testid="results-panel">Recent scans</div>}
      />,
    );

    expect(screen.getByTestId('results-panel')).toBeInTheDocument();
    expect(screen.getByRole('dialog').className).toMatch(/max-w-5xl/);
  });

  it('stays single-column and narrow without the `results` prop', () => {
    render(<QrScanModal isOpen onClose={vi.fn()} onScan={vi.fn()} />);

    expect(screen.queryByTestId('results-panel')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog').className).toMatch(/max-w-sm/);
  });

  it('calls the close handler from the close button', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<QrScanModal isOpen onClose={onClose} onScan={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /close/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
