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
      return startShouldReject
        ? Promise.reject(new Error('NotAllowedError: Permission denied'))
        : Promise.resolve(null);
    },
    stop: () => {
      stopMock();
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
    startMock.mockReset();
    stopMock.mockReset();
    clearMock.mockReset();
    trackStopMock.mockReset();

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

  it('calls the close handler from the close button', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<QrScanModal isOpen onClose={onClose} onScan={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /close/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
