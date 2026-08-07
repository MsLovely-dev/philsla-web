# M.Landicho Worktree and Local System Setup Guide

**Date:** 2026-08-05  
**Goal:** Open the isolated `m.landicho` worktree, switch branches, prepare dependencies, and run the frontend and backend without changing the original workspace or GitHub branches.

## Open the correct VS Code folder

Closing a folder does not delete files, commits, branches, or anything on GitHub.

1. Select **File > Close Folder** or **File > Close Workspace**.
2. Select **File > Open Folder**.
3. Open `C:\Users\maricon.landicho\Desktop\PhilSLA\worktrees\m.landicho`.

Do not select **Delete**, **Discard Changes**, or **Remove Worktree**. Leave the original `philsla-web` checkout and its `j.ganapin/qr-scanning` changes untouched.

## Verify the worktree and branch

```powershell
git rev-parse --show-toplevel
git branch --show-current
git status --short
```

Expected for Ticket 001:

```text
C:/Users/maricon.landicho/Desktop/PhilSLA/worktrees/m.landicho
m.landicho/login
```

`git status --short` should print nothing before new work begins.

## Switch branches

For User Authentication:

```powershell
git switch m.landicho/login
```

If the Maintenance Table branch is formally activated and exists locally:

```powershell
git switch m.landicho/maintenance-student-registration
```

If it exists only on GitHub:

```powershell
git fetch origin
git switch --track origin/m.landicho/maintenance-student-registration
```

Run `git status --short` before switching. Do not switch with uncommitted changes unless they have been reviewed and safely committed or stashed. Maintenance Table remains deferred until formally reactivated.

## Prepare the backend

From the worktree root:

```powershell
cd backend
.\.venv\Scripts\python.exe --version
```

Expected: `Python 3.13.14`.

Install committed dependencies. The committed development lock currently omits WhiteNoise, so install the committed base lock too:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements\dev.txt
.\.venv\Scripts\python.exe -m pip install -r requirements\base.txt
```

These commands modify only the ignored local virtual environment, not source files or Git history.

Apply committed migrations and check Django:

```powershell
.\.venv\Scripts\python.exe manage.py migrate --settings=config.settings.local
.\.venv\Scripts\python.exe manage.py check --settings=config.settings.local
```

## Start the backend

From `worktrees\m.landicho\backend`:

```powershell
.\.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000 --settings=config.settings.local
```

Backend: `http://127.0.0.1:8000`

Leave this terminal running.

## Prepare and start the frontend

Open a second terminal at the worktree root:

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev
```

Run `npm.cmd ci` initially and whenever the dependency lock changes. Open the URL Vite displays, normally `http://localhost:3000`.

## Stop the servers

Press `Ctrl+C` in each server terminal. This does not delete the environment or Git changes.

## Safety reminders

- Run both servers from `worktrees/m.landicho`, not the original `philsla-web` checkout.
- Use only synthetic accounts, identifiers, images, and configuration data.
- Never record passwords, OTPs, tokens, LRNs, email addresses, selfies, or credentials.
- A `401 Unauthorized` response is expected from protected endpoints while logged out.
- Before committing, run `git status --short` and confirm only approved ticket files are present.
