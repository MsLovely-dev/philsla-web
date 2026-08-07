import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ExamDelivery from './ExamDelivery';

vi.mock('../PhilSAContext', () => ({
  usePhilSA: () => ({
    user: { id: 'student-1', role: 'STUDENT', firstName: 'Jan', lastName: 'Delacruz', candidateId: 'CAND-2026-8809' },
    addAuditLog: vi.fn(),
  }),
}));
vi.mock('../services/mockService', () => ({ useMockData: () => ({ applications: [] }) }));

function makeFakeTrack(): MediaStreamTrack {
  return { stop: vi.fn(), kind: 'video', enabled: true } as unknown as MediaStreamTrack;
}

class FakeMediaStream {
  private videoTracks: MediaStreamTrack[];
  private audioTracks: MediaStreamTrack[];
  constructor(tracks: MediaStreamTrack[] = [makeFakeTrack()]) {
    this.videoTracks = tracks.filter((t) => t.kind !== 'audio');
    this.audioTracks = tracks.filter((t) => t.kind === 'audio');
    if (this.audioTracks.length === 0) this.audioTracks = [{ ...makeFakeTrack(), kind: 'audio' } as MediaStreamTrack];
  }
  getTracks() { return [...this.videoTracks, ...this.audioTracks]; }
  getVideoTracks() { return this.videoTracks; }
  getAudioTracks() { return this.audioTracks; }
}

// Mirrors a real AudioContext closely enough to exercise the exact failure
// mode this test guards against: close() rejects (as real browsers do) when
// called on an already-closed context, which is precisely what happens when
// React.StrictMode double-invokes the metering effect (mount, cleanup,
// mount again) in development.
class FakeAudioContext {
  state: 'running' | 'closed' = 'running';
  currentTime = 0;
  sampleRate = 44100;
  destination = {};
  createAnalyser() {
    return {
      fftSize: 256,
      frequencyBinCount: 128,
      connect: vi.fn(),
      disconnect: vi.fn(),
      getByteFrequencyData: (arr: Uint8Array) => arr.fill(60),
    };
  }
  createMediaStreamSource() {
    return { connect: vi.fn(), disconnect: vi.fn() };
  }
  createOscillator() {
    return { type: '', connect: vi.fn(), frequency: { setValueAtTime: vi.fn() }, start: vi.fn(), stop: vi.fn() };
  }
  createGain() {
    return { connect: vi.fn(), gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() } };
  }
  createBuffer() {
    return { getChannelData: () => new Float32Array(64) };
  }
  createBufferSource() {
    return { connect: vi.fn(), start: vi.fn(), stop: vi.fn(), buffer: null };
  }
  createBiquadFilter() {
    return { type: '', frequency: { value: 0 }, connect: vi.fn() };
  }
  close() {
    if (this.state === 'closed') return Promise.reject(new Error('Cannot close a closed AudioContext'));
    this.state = 'closed';
    return Promise.resolve();
  }
}

function renderExamDelivery() {
  return render(
    <StrictMode>
      <MemoryRouter>
        <ExamDelivery />
      </MemoryRouter>
    </StrictMode>,
  );
}

describe('ExamDelivery readiness wizard', () => {
  let uncaughtErrors: unknown[] = [];

  beforeEach(() => {
    uncaughtErrors = [];
    vi.spyOn(console, 'error').mockImplementation((...args) => { uncaughtErrors.push(args); });
    (globalThis as any).MediaStream = FakeMediaStream;
    (window as any).AudioContext = FakeAudioContext;
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn().mockResolvedValue(new FakeMediaStream()) },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('completes Terms through Environment Check and reaches Additional Instructions without blanking the page (StrictMode double-invoke)', async () => {
    // Real timers throughout: the countdowns/intervals here are short (3-5s
    // real time each), and mixing fake timers with userEvent's own internal
    // delays is a well-known deadlock trap, not worth it for ~15s of extra
    // wall-clock time.
    const user = userEvent.setup({ delay: null });
    renderExamDelivery();

    // Step 1: Terms of Use
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /agree and continue/i }));

    // Step 2: Webcam Check -- bypass the real 5s recording simulation.
    await screen.findByRole('heading', { name: /webcam check/i });
    await user.click(screen.getByRole('button', { name: /bypass/i }));

    // Step 3: Student Photo -- real ~3s capture countdown.
    await screen.findByRole('heading', { name: /student photo/i });
    await user.click(screen.getByRole('button', { name: /capture student photo/i }));
    await user.click(await screen.findByRole('button', { name: /save photo & continue/i }, { timeout: 6000 }));

    // Step 4: Show ID -- same pattern.
    await screen.findByRole('heading', { name: /show id/i });
    await user.click(screen.getByRole('button', { name: /capture id image/i }));
    await user.click(await screen.findByRole('button', { name: /save id & continue/i }, { timeout: 6000 }));

    // Step 5: Environment Check -- this is where the real mic-level
    // AnalyserNode effect (the one that crashed before the fix) is active.
    await screen.findByRole('heading', { name: /environment check/i });
    await user.click(screen.getByRole('button', { name: /play test chime/i }));
    await user.click(await screen.findByRole('button', { name: /^yes$/i }));
    await user.click(screen.getByRole('button', { name: /run bandwidth check/i }));
    await user.click(screen.getByRole('button', { name: /scan workstation/i }));

    // The actual regression check: advancing away from Environment Check
    // (tearing down the real AudioContext/AnalyserNode) must not blank the
    // page. Confirm Verification must be enabled and clickable, and the
    // next step's content must render afterward.
    const confirmButton = await screen.findByRole('button', { name: /confirm verification/i }, { timeout: 6000 });
    await waitFor(() => expect(confirmButton).toBeEnabled(), { timeout: 6000 });
    await user.click(confirmButton);

    expect(await screen.findByRole('heading', { name: /additional instructions/i })).toBeInTheDocument();
    expect(document.body.textContent).not.toBe('');

    const consoleErrorsBesidesWarnings = uncaughtErrors.filter(
      (args) => !String(args[0]).includes('Warning:'),
    );
    expect(consoleErrorsBesidesWarnings).toHaveLength(0);
  }, 30000);
});
