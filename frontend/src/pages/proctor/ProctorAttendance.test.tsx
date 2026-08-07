import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Html5Qrcode } from 'html5-qrcode';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProctorAttendance from './ProctorAttendance';

// Same mocking approach as QrScanModal.test.tsx: `html5-qrcode` talks to real camera
// hardware, so it's mocked entirely. `latestSuccessCallback` lets a test simulate a decode.
vi.mock('html5-qrcode', () => ({
  Html5Qrcode: vi.fn(),
}));

type QrSuccessCallback = (decodedText: string) => void;
let latestSuccessCallback: QrSuccessCallback | undefined;

function createMockScannerInstance() {
  return {
    start: (
      _config: unknown,
      _scanConfig: unknown,
      successCallback: QrSuccessCallback,
    ) => {
      latestSuccessCallback = successCallback;
      return Promise.resolve(null);
    },
    stop: () => Promise.resolve(),
    clear: () => {},
  };
}

const addAuditLogMock = vi.fn();

vi.mock('../../PhilSAContext', () => ({
  usePhilSA: () => ({
    user: { id: 'p1', email: 'proctor@philsa.gov.ph', firstName: 'Santiago', lastName: 'Reyes', role: 'PROCTOR' },
    addAuditLog: addAuditLogMock,
    addTicket: vi.fn(),
    tickets: [],
  }),
}));

vi.mock('../../services/mockService', () => ({
  useMockData: () => ({
    schedules: [
      {
        id: 'sch1',
        examSetId: 'ex1',
        date: '2026-06-15',
        time: '08:00 AM',
        endTime: '11:00 AM',
        testCenter: 'University of the Philippines Diliman',
        room: 'Benitez Hall R101',
        totalSlots: 50,
        remainingSlots: 45,
      },
    ],
    examSets: [{ id: 'ex1', name: 'General Exam' }],
  }),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <ProctorAttendance />
    </MemoryRouter>,
  );
}

describe('ProctorAttendance — QR scan', () => {
  beforeEach(() => {
    localStorage.clear();
    latestSuccessCallback = undefined;
    addAuditLogMock.mockReset();
    vi.mocked(Html5Qrcode).mockClear();
    vi.mocked(Html5Qrcode).mockImplementation(
      function MockHtml5Qrcode() {
        return createMockScannerInstance() as unknown as Html5Qrcode;
      },
    );
    // Only `Date.now()` is mocked (not the timer queue) so `waitFor`/`userEvent` keep
    // working normally — `vi.useFakeTimers()` stalls testing-library's setTimeout-based
    // polling unless the fake clock is manually advanced.
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-06-15T08:00:00').getTime());
  });

  it('shows the Scan QR button under the same visibility condition as Mark All Present', () => {
    renderPage();

    expect(screen.getByRole('button', { name: /mark all present/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /scan permit qr/i })).toBeInTheDocument();
  });

  it('opens the scan modal when Scan QR is clicked', async () => {
    const user = userEvent.setup({ delay: null });
    renderPage();

    await user.click(screen.getByRole('button', { name: /scan permit qr/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('marks a candidate Present when scanned within the grace period', async () => {
    const user = userEvent.setup({ delay: null });
    renderPage();

    await user.click(screen.getByRole('button', { name: /scan permit qr/i }));
    await waitFor(() => expect(latestSuccessCallback).toBeDefined());

    act(() => {
      latestSuccessCallback?.('SAMPLE_QR_ST-001');
    });

    const row = within(screen.getByRole('table')).getByText('Juan Carlos Villanueva').closest('tr') as HTMLElement;
    await waitFor(() => expect(within(row).getAllByText(/present/i)[0]).toBeInTheDocument());
    expect(addAuditLogMock).toHaveBeenCalledTimes(1);
  });

  it('marks a candidate Late when scanned after the grace period', async () => {
    const user = userEvent.setup({ delay: null });
    renderPage();

    // 31 min after the 08:00 start; grace is 30 minutes.
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-06-15T08:31:00').getTime());

    await user.click(screen.getByRole('button', { name: /scan permit qr/i }));
    await waitFor(() => expect(latestSuccessCallback).toBeDefined());

    act(() => {
      latestSuccessCallback?.('SAMPLE_QR_ST-001');
    });

    const row = within(screen.getByRole('table')).getByText('Juan Carlos Villanueva').closest('tr') as HTMLElement;
    await waitFor(() => expect(within(row).getByText(/late/i)).toBeInTheDocument());
  });

  it('is a no-op with an inline message when the scanned candidate is already marked', async () => {
    localStorage.setItem(
      'philsa_proctor_dist_states',
      JSON.stringify({
        sch1: {
          attendanceComplete: false,
          isDistributing: false,
          students: [
            { id: 'ST-001', name: 'Juan Carlos Villanueva', seat: 'A01', attendance: 'Present', device: 'COMPATIBLE', battery: 95, distStatus: 'Pending', qrCode: 'SAMPLE_QR_ST-001' },
          ],
        },
      }),
    );
    const user = userEvent.setup({ delay: null });
    renderPage();

    await user.click(screen.getByRole('button', { name: /scan permit qr/i }));
    await waitFor(() => expect(latestSuccessCallback).toBeDefined());

    act(() => {
      latestSuccessCallback?.('SAMPLE_QR_ST-001');
    });

    await waitFor(() => expect(screen.getAllByText(/already marked/i).length).toBeGreaterThan(0));
    expect(addAuditLogMock).not.toHaveBeenCalled();
  });

  it('is a no-op with an inline message when the scanned code matches no one in this room', async () => {
    const user = userEvent.setup({ delay: null });
    renderPage();

    await user.click(screen.getByRole('button', { name: /scan permit qr/i }));
    await waitFor(() => expect(latestSuccessCallback).toBeDefined());

    act(() => {
      latestSuccessCallback?.('NOT_A_REAL_CODE');
    });

    await waitFor(() => expect(screen.getAllByText(/not recognized/i).length).toBeGreaterThan(0));
    expect(addAuditLogMock).not.toHaveBeenCalled();
  });

  it('handles rapid repeated decodes of the same code as exactly one scan', async () => {
    const user = userEvent.setup({ delay: null });
    renderPage();

    await user.click(screen.getByRole('button', { name: /scan permit qr/i }));
    await waitFor(() => expect(latestSuccessCallback).toBeDefined());

    act(() => {
      latestSuccessCallback?.('SAMPLE_QR_ST-001');
      latestSuccessCallback?.('SAMPLE_QR_ST-001');
      latestSuccessCallback?.('SAMPLE_QR_ST-001');
    });

    const row = within(screen.getByRole('table')).getByText('Juan Carlos Villanueva').closest('tr') as HTMLElement;
    await waitFor(() => expect(within(row).getAllByText(/present/i)[0]).toBeInTheDocument());
    expect(addAuditLogMock).toHaveBeenCalledTimes(1);
  });

  it('does not re-trigger while a code is held continuously in frame, even past the debounce window, only re-triggering after a real gap', async () => {
    const user = userEvent.setup({ delay: null });
    renderPage();

    await user.click(screen.getByRole('button', { name: /scan permit qr/i }));
    await waitFor(() => expect(latestSuccessCallback).toBeDefined());

    const baseTime = new Date('2026-06-15T08:00:00').getTime();
    // `html5-qrcode` redecodes ~10x/sec while a code stays in frame. Simulate that: 40 decodes,
    // 100ms apart (~4 seconds of continuously holding the same code up), well past the naive
    // debounce window if it were a one-shot timer instead of a sliding one.
    for (let i = 0; i < 40; i++) {
      vi.spyOn(Date, 'now').mockReturnValue(baseTime + i * 100);
      act(() => {
        latestSuccessCallback?.('SAMPLE_QR_ST-001');
      });
    }

    expect(addAuditLogMock).toHaveBeenCalledTimes(1);
    const dialog = screen.getByRole('dialog', { name: /scan qr code/i });
    expect(within(dialog).getAllByText(/present/i).length).toBeGreaterThan(0);
    expect(within(dialog).queryByText(/already marked/i)).not.toBeInTheDocument();

    // The code is removed and re-presented later, after a real gap with no decodes at all. This
    // genuinely re-triggers handleQrScan, but since the candidate is already marked and already
    // has a history entry, it's a no-op: no new audit log entry, and the detail card is unchanged
    // (history keeps only the first attempt per candidate).
    vi.spyOn(Date, 'now').mockReturnValue(baseTime + 4000 + 3500);
    act(() => {
      latestSuccessCallback?.('SAMPLE_QR_ST-001');
    });

    expect(addAuditLogMock).toHaveBeenCalledTimes(1);
    expect(within(dialog).getAllByText(/present/i).length).toBeGreaterThan(0);
    expect(within(dialog).queryByText(/already marked/i)).not.toBeInTheDocument();
  });

  it('still matches a scan when the persisted roster has no qrCode on its records (cross-page hydration defect)', async () => {
    localStorage.setItem(
      'philsa_proctor_dist_states',
      JSON.stringify({
        sch1: {
          attendanceComplete: false,
          isDistributing: false,
          students: [
            // No `qrCode` field at all — simulates a roster last written by
            // ProctorSchedule.tsx's unsynchronized StudentPC type.
            { id: 'ST-001', name: 'Juan Carlos Villanueva', seat: 'A01', attendance: 'Pending', device: 'PENDING', battery: 0, distStatus: 'Pending' },
          ],
        },
      }),
    );
    const user = userEvent.setup({ delay: null });
    renderPage();

    await user.click(screen.getByRole('button', { name: /scan permit qr/i }));
    await waitFor(() => expect(latestSuccessCallback).toBeDefined());

    // The backfill fills this in as SAMPLE_QR_<id>, same convention as fresh mock data.
    act(() => {
      latestSuccessCallback?.('SAMPLE_QR_ST-001');
    });

    const row = within(screen.getByRole('table')).getByText('Juan Carlos Villanueva').closest('tr') as HTMLElement;
    await waitFor(() => expect(within(row).getAllByText(/present/i)[0]).toBeInTheDocument());
  });

  it('shows the scanned candidate as a permit-style detail card after a successful Present scan', async () => {
    const user = userEvent.setup({ delay: null });
    renderPage();

    await user.click(screen.getByRole('button', { name: /scan permit qr/i }));
    await waitFor(() => expect(latestSuccessCallback).toBeDefined());

    act(() => {
      latestSuccessCallback?.('SAMPLE_QR_ST-001');
    });

    const dialog = screen.getByRole('dialog', { name: /scan qr code/i });
    await waitFor(() => expect(within(dialog).getByText('Juan Carlos Villanueva')).toBeInTheDocument());
    expect(within(dialog).getByText('ST-001')).toBeInTheDocument();
    expect(within(dialog).getAllByText(/present/i).length).toBeGreaterThan(0);
    // Exam schedule & location details, sourced from the selected schedule and the logged-in proctor.
    expect(within(dialog).getByText('University of the Philippines Diliman')).toBeInTheDocument();
    expect(within(dialog).getByText(/benitez hall r101/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/santiago reyes/i)).toBeInTheDocument();
    // Scan time renders in black (not the muted gray used elsewhere), with a colored status line.
    const timeEl = within(dialog).getByTestId('scan-time');
    expect(timeEl.className).not.toMatch(/text-slate-400/);
    expect(timeEl.className).toMatch(/text-black|text-philsa-navy/);
    const statusEl = within(dialog).getByTestId('scan-status-line');
    expect(statusEl.textContent).toMatch(/status:\s*present/i);
    expect(statusEl.className).toMatch(/emerald/);
  });

  it('shows how late a Late-scanned candidate is in the detail card, with an amber status line', async () => {
    // 45 min after the 08:00 start = 15 min past the 30-min grace deadline.
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-06-15T08:45:00').getTime());
    const user = userEvent.setup({ delay: null });
    renderPage();

    await user.click(screen.getByRole('button', { name: /scan permit qr/i }));
    await waitFor(() => expect(latestSuccessCallback).toBeDefined());

    act(() => {
      latestSuccessCallback?.('SAMPLE_QR_ST-001');
    });

    const dialog = screen.getByRole('dialog', { name: /scan qr code/i });
    expect(await within(dialog).findByText(/15 min late/i)).toBeInTheDocument();
    const statusEl = within(dialog).getByTestId('scan-status-line');
    expect(statusEl.textContent).toMatch(/status:\s*late/i);
    expect(statusEl.textContent).toMatch(/15 min late/i);
    expect(statusEl.className).toMatch(/amber/);
  });

  it('does not change the detail card or add a duplicate when the same QR is scanned again later', async () => {
    const user = userEvent.setup({ delay: null });
    renderPage();

    await user.click(screen.getByRole('button', { name: /scan permit qr/i }));
    await waitFor(() => expect(latestSuccessCallback).toBeDefined());

    act(() => {
      latestSuccessCallback?.('SAMPLE_QR_ST-001');
    });

    const dialog = screen.getByRole('dialog', { name: /scan qr code/i });
    await waitFor(() => expect(within(dialog).getByText('Juan Carlos Villanueva')).toBeInTheDocument());
    const statusElBefore = within(dialog).getByTestId('scan-status-line');
    expect(statusElBefore.textContent).toMatch(/status:\s*present/i);

    // Past the 3s same-code debounce window, so this is a genuine second scan attempt — but the
    // candidate is already recorded, so nothing about the card or history should change.
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-06-15T08:00:05').getTime());
    act(() => {
      latestSuccessCallback?.('SAMPLE_QR_ST-001');
    });

    expect(within(dialog).queryByText(/already marked/i)).not.toBeInTheDocument();
    const statusElAfter = within(dialog).getByTestId('scan-status-line');
    expect(statusElAfter.textContent).toMatch(/status:\s*present/i);

    await user.click(within(dialog).getByRole('button', { name: /history/i }));
    const historyDialog = screen.getByRole('dialog', { name: /scan history/i });
    expect(within(historyDialog).getAllByText('Juan Carlos Villanueva')).toHaveLength(1);
  });

  it('shows an invalid-code card with the raw scanned value for a no-match scan', async () => {
    const user = userEvent.setup({ delay: null });
    renderPage();

    await user.click(screen.getByRole('button', { name: /scan permit qr/i }));
    await waitFor(() => expect(latestSuccessCallback).toBeDefined());

    act(() => {
      latestSuccessCallback?.('NOT_A_REAL_CODE');
    });

    const dialog = screen.getByRole('dialog', { name: /scan qr code/i });
    expect(await within(dialog).findByText('NOT_A_REAL_CODE')).toBeInTheDocument();
    expect(within(dialog).getAllByText(/invalid/i).length).toBeGreaterThan(0);
  });

  it('shows an "Already Marked" detail card when the scanned candidate was already marked', async () => {
    localStorage.setItem(
      'philsa_proctor_dist_states',
      JSON.stringify({
        sch1: {
          attendanceComplete: false,
          isDistributing: false,
          students: [
            { id: 'ST-001', name: 'Juan Carlos Villanueva', seat: 'A01', attendance: 'Present', device: 'COMPATIBLE', battery: 95, distStatus: 'Pending', qrCode: 'SAMPLE_QR_ST-001' },
          ],
        },
      }),
    );
    const user = userEvent.setup({ delay: null });
    renderPage();

    await user.click(screen.getByRole('button', { name: /scan permit qr/i }));
    await waitFor(() => expect(latestSuccessCallback).toBeDefined());

    act(() => {
      latestSuccessCallback?.('SAMPLE_QR_ST-001');
    });

    const dialog = screen.getByRole('dialog', { name: /scan qr code/i });
    expect(await within(dialog).findByText(/already marked/i)).toBeInTheDocument();
  });

  it('opens a separate History modal listing past scans when History is clicked', async () => {
    const user = userEvent.setup({ delay: null });
    renderPage();

    await user.click(screen.getByRole('button', { name: /scan permit qr/i }));
    await waitFor(() => expect(latestSuccessCallback).toBeDefined());

    act(() => {
      latestSuccessCallback?.('SAMPLE_QR_ST-001');
    });

    const scanDialog = screen.getByRole('dialog', { name: /scan qr code/i });
    await waitFor(() => expect(within(scanDialog).getByText('Juan Carlos Villanueva')).toBeInTheDocument());

    await user.click(within(scanDialog).getByRole('button', { name: /history/i }));

    const historyDialog = screen.getByRole('dialog', { name: /scan history/i });
    expect(within(historyDialog).getByText('Juan Carlos Villanueva')).toBeInTheDocument();
    // The main scan dialog stays open behind the history modal.
    expect(scanDialog).toBeInTheDocument();
  });

  it('shows the full permit-style detail for a history entry when its View button is clicked', async () => {
    const user = userEvent.setup({ delay: null });
    renderPage();

    await user.click(screen.getByRole('button', { name: /scan permit qr/i }));
    await waitFor(() => expect(latestSuccessCallback).toBeDefined());

    act(() => {
      latestSuccessCallback?.('SAMPLE_QR_ST-001');
    });

    const scanDialog = screen.getByRole('dialog', { name: /scan qr code/i });
    await waitFor(() => expect(within(scanDialog).getByText('Juan Carlos Villanueva')).toBeInTheDocument());

    await user.click(within(scanDialog).getByRole('button', { name: /history/i }));
    const historyDialog = screen.getByRole('dialog', { name: /scan history/i });

    await user.click(within(historyDialog).getByRole('button', { name: /view/i }));

    // Same exam-schedule details the live detail card shows, now inside the History modal.
    expect(within(historyDialog).getByText('University of the Philippines Diliman')).toBeInTheDocument();
    expect(within(historyDialog).getByText(/benitez hall r101/i)).toBeInTheDocument();
    expect(within(historyDialog).getByText(/santiago reyes/i)).toBeInTheDocument();

    // A way back to the list.
    await user.click(within(historyDialog).getByRole('button', { name: /back/i }));
    expect(within(historyDialog).getByRole('button', { name: /view/i })).toBeInTheDocument();
  });

  it('clears all scan history — and resets the detail card — when Clear is clicked inside the History modal', async () => {
    const user = userEvent.setup({ delay: null });
    renderPage();

    await user.click(screen.getByRole('button', { name: /scan permit qr/i }));
    await waitFor(() => expect(latestSuccessCallback).toBeDefined());

    act(() => {
      latestSuccessCallback?.('SAMPLE_QR_ST-001');
    });

    const scanDialog = screen.getByRole('dialog', { name: /scan qr code/i });
    await waitFor(() => expect(within(scanDialog).getByText('Juan Carlos Villanueva')).toBeInTheDocument());

    await user.click(within(scanDialog).getByRole('button', { name: /history/i }));
    const historyDialog = screen.getByRole('dialog', { name: /scan history/i });
    await user.click(within(historyDialog).getByRole('button', { name: /clear/i }));

    expect(within(historyDialog).queryByText('Juan Carlos Villanueva')).not.toBeInTheDocument();
    expect(within(scanDialog).queryByText('Juan Carlos Villanueva')).not.toBeInTheDocument();
  });

  it('immediately swaps the detail card to the newly scanned candidate when a second candidate is scanned right after', async () => {
    const user = userEvent.setup({ delay: null });
    renderPage();

    await user.click(screen.getByRole('button', { name: /scan permit qr/i }));
    await waitFor(() => expect(latestSuccessCallback).toBeDefined());

    act(() => {
      latestSuccessCallback?.('SAMPLE_QR_ST-001');
    });

    const dialog = screen.getByRole('dialog', { name: /scan qr code/i });
    await waitFor(() => expect(within(dialog).getByText('Juan Carlos Villanueva')).toBeInTheDocument());

    act(() => {
      latestSuccessCallback?.('SAMPLE_QR_ST-002');
    });

    await waitFor(() => expect(within(dialog).getByText('Maria Cristina Santos')).toBeInTheDocument());
    expect(within(dialog).queryByText('Juan Carlos Villanueva')).not.toBeInTheDocument();
  });

  it('hides the detail card 5 seconds after the last scan, for candidate privacy', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ delay: null, advanceTimers: vi.advanceTimersByTime });
    renderPage();

    await user.click(screen.getByRole('button', { name: /scan permit qr/i }));
    await waitFor(() => expect(latestSuccessCallback).toBeDefined());

    act(() => {
      latestSuccessCallback?.('SAMPLE_QR_ST-001');
    });

    const dialog = screen.getByRole('dialog', { name: /scan qr code/i });
    await waitFor(() => expect(within(dialog).getByText('Juan Carlos Villanueva')).toBeInTheDocument());

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    await waitFor(() => expect(within(dialog).queryByText('Juan Carlos Villanueva')).not.toBeInTheDocument());
    // Still in the History modal though — only the live detail card is privacy-hidden.
    await user.click(within(dialog).getByRole('button', { name: /history/i }));
    const historyDialog = screen.getByRole('dialog', { name: /scan history/i });
    expect(within(historyDialog).getByText('Juan Carlos Villanueva')).toBeInTheDocument();

    vi.useRealTimers();
  });
});
