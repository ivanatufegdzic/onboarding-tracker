# GreenerField Onboarding Task Tracker

A web-based onboarding task tracker for GreenerField's HR team. Tracks cohorts and individual hires with configurable task lists, deadline rules, and automated email reminders for overdue tasks.

## Features

- **Cohort & Individual Hire Management** — Create groups of hires or add individual hires
- **Configurable Task List** — Add, edit, and soft-delete tasks that apply to all new hires
- **Deadline Tracking** — Automatic deadline calculation based on phase and owner, relative to hire start date
- **Overdue Alerts** — Visual indicators for incomplete overdue tasks
- **Email Reminders** — Daily automated reminders for overdue tasks (via Gmail SMTP)
- **Progress Reports** — Print-friendly reports showing completion status per owner
- **Settings/Admin Panel** — Manage owners, tasks, and deadline rules

## Tech Stack

- **Backend**: Node.js + TypeScript + Express
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Data**: JSON file persistence
- **Email**: Nodemailer + Gmail SMTP
- **Scheduler**: node-cron (9 AM daily reminder)

## Installation & Setup

### Prerequisites

- Node.js 14+ and npm
- Gmail account with App Password enabled

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Gmail credentials

The app sends overdue reminders via Gmail. You need a Google App Password (not your regular password).

**Steps to generate a Gmail App Password:**

1. Go to [myaccount.google.com](https://myaccount.google.com)
2. Click **Security** in the left sidebar
3. Enable **2-Step Verification** if not already enabled
4. Go back to **Security** → **App Passwords**
5. Select "Mail" and "Windows Computer" (or your device)
6. Google will generate a 16-character password
7. Copy this password

**Add credentials to `.env`:**

```bash
# Copy the example
cp .env.example .env

# Edit .env and add your Gmail credentials
GMAIL_USER=ivana_tufegdzic@greenerfield.com
GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
PORT=3000
```

### 3. Run the app

```bash
npm run dev
```

The app will start at **`http://localhost:3000`** and create `data.json` with seed data on first run.

## Usage

### Dashboard

The main page shows:
- **4 stat cards**: Total tasks, completed, remaining, overdue
- **Overall progress bar**: Completion breakdown by owner
- **Active cohorts**: Cards showing cohort progress
- **Individual hires**: Standalone hires not in cohorts

### Create a Cohort

1. Click **"+ New Cohort"**
2. Enter cohort name and start date
3. Add hire names (one per line) — they'll all get the same start date
4. Click **Create Cohort**
5. Each hire gets a copy of all active global tasks

### Create an Individual Hire

1. Click **"+ New Hire"**
2. Enter hire name and start date
3. Click **Create Hire**
4. That person gets the same task list as others but is not in a cohort

### View & Complete Tasks

1. Click a cohort or hire card to open the task view
2. Tasks are grouped by **Phase** → **Owner**
3. Check the box to mark tasks complete
4. Overdue incomplete tasks are highlighted in red with an "Overdue" badge
5. Completed tasks get a strikethrough

### Export Report

In any task view, click **"📄 Export Report"** to open a print-friendly report showing:
- Overall completion %
- Per-owner breakdown
- List of incomplete tasks

Use **Cmd+P** (Mac) or **Ctrl+P** (Windows) to save as PDF.

### Settings/Admin

Click **Settings** in the nav to:

- **Tasks Tab**: Add new tasks (applied to all future hires) or deactivate existing tasks
- **Owners Tab**: Add new owners (with optional email) or delete unused owners
- **Deadline Rules Tab**: Edit days-from-start for each phase+owner combination
  - `0` = by start date
  - `7` = end of week 1
  - `14` = end of week 2
  - Negative = before start date

### Email Reminders

**Automatic (Daily at 9 AM)**

The scheduler runs every day at 9:00 AM and:
1. Finds all incomplete overdue tasks
2. Groups them by owner
3. Sends one email per owner listing their overdue tasks

**Manual Trigger (for testing)**

```bash
curl -X POST http://localhost:3000/api/reminders/send-now
```

Owners with no email configured (e.g., Managers by default) are skipped with a warning in the console.

## Data Model

All data is stored in `data.json` with this structure:

```json
{
  "owners": [
    { "id": "hr", "name": "HR", "email": "ivana@example.com" },
    { "id": "operations", "name": "Operations", "email": "kat@example.com" }
  ],
  "deadlineRules": [
    { "id": "pre_hr", "phase": "pre_onboarding", "ownerId": "hr", "daysFromStart": 0 },
    { "id": "onboarding_ops", "phase": "onboarding", "ownerId": "operations", "daysFromStart": 7 }
  ],
  "globalTasks": [
    { "id": "task_001", "title": "...", "phase": "pre_onboarding", "ownerId": "hr", "active": true, "order": 1 }
  ],
  "cohorts": [
    {
      "id": "uuid",
      "name": "Cohort Name",
      "startDate": "2026-05-01",
      "hires": [
        {
          "id": "uuid",
          "name": "John Doe",
          "startDate": "2026-05-01",
          "tasks": [{ "taskId": "task_001", "completed": false, "completedAt": null }]
        }
      ]
    }
  ],
  "individualHires": [
    {
      "id": "uuid",
      "name": "Jane Smith",
      "startDate": "2026-05-01",
      "tasks": [{ "taskId": "task_001", "completed": false, "completedAt": null }]
    }
  ]
}
```

## API Endpoints

### Cohorts
- `GET /api/cohorts` — list all
- `POST /api/cohorts` — create new
- `GET /api/cohorts/:id` — get with hires
- `DELETE /api/cohorts/:id` — delete
- `POST /api/cohorts/:cohortId/hires` — add hire to cohort
- `DELETE /api/cohorts/:cohortId/hires/:hireId` — remove hire
- `PATCH /api/cohorts/:cohortId/hires/:hireId/tasks/:taskId` — toggle task

### Individual Hires
- `GET /api/hires` — list all
- `POST /api/hires` — create new
- `GET /api/hires/:id` — get with tasks
- `DELETE /api/hires/:id` — delete
- `PATCH /api/hires/:id/tasks/:taskId` — toggle task

### Settings
- `GET /api/settings/tasks` — list global tasks
- `POST /api/settings/tasks` — add task (propagates to all hires)
- `PATCH /api/settings/tasks/:id` — edit task
- `DELETE /api/settings/tasks/:id` — hard delete
- `GET /api/settings/owners` — list owners
- `POST /api/settings/owners` — add owner (creates default deadline rules)
- `PATCH /api/settings/owners/:id` — edit owner
- `DELETE /api/settings/owners/:id` — delete (only if no tasks assigned)
- `GET /api/settings/deadline-rules` — list rules
- `PATCH /api/settings/deadline-rules/:id` — edit rule

### Stats & Reminders
- `GET /api/stats` — summary stats (total, completed, remaining, overdue, byOwner)
- `POST /api/reminders/send-now` — manually trigger reminder send

## Development

### Build for production

```bash
npm run build
npm start
```

This compiles TypeScript to `dist/` and runs the compiled server.

### Project Structure

```
src/
  ├── server.ts                 # Express entry point
  ├── types.ts                  # TypeScript types
  ├── scheduler.ts              # node-cron daily job
  ├── emailTemplate.ts          # Email copy (all customizable here)
  ├── routes/                   # API route handlers
  │   ├── cohorts.ts
  │   ├── hires.ts
  │   ├── settings.ts
  │   ├── reminders.ts
  │   └── stats.ts
  └── services/
      ├── dataStore.ts          # JSON read/write, seed data
      └── emailService.ts       # Nodemailer integration

public/
  ├── index.html                # Dashboard
  ├── cohort.html               # Cohort view
  ├── hire.html                 # Hire task view
  ├── new-cohort.html           # Create cohort
  ├── new-hire.html             # Create hire
  ├── settings.html             # Admin settings
  ├── report.html               # Print-friendly report
  ├── css/
  │   └── style.css             # Design system
  └── js/
      ├── utils.js              # Shared utilities
      ├── dashboard.js          # Dashboard logic
      ├── cohort.js
      ├── hire.js
      ├── new-cohort.js
      ├── new-hire.js
      ├── settings.js
      └── report.js

data.json                        # Auto-created on first run
.env                            # Gmail credentials (create from .env.example)
```

## Customization

### Email Template

All email copy is in `src/emailTemplate.ts`. Edit the `getEmailSubject()` and `renderTaskEmailBody()` functions to customize reminder emails. Placeholders are marked in comments.

### Design System

Colors and spacing are defined in CSS custom properties at the top of `public/css/style.css`. Key colors:
- Green: `#2d6a4f` (accent)
- Blue: `#1d4ed8` (Operations)
- Amber: `#d97706` (Managers)
- Red: `#dc2626` (overdue)

### Default Owners

Seeded in `src/services/dataStore.ts` under `DEFAULT_OWNERS`. Edit to change default owner names or emails.

### Default Tasks

All 39 seeded tasks are defined in `src/services/dataStore.ts` under `DEFAULT_TASKS`. Edit task titles or phases here.

## Troubleshooting

### Gmail Auth Error

If you get an "Invalid login" error:
1. Verify Gmail App Password is correct (not your regular password)
2. Ensure 2-Step Verification is enabled on your Google account
3. Check that GMAIL_USER matches the email the App Password was generated for

### No Email Sent

Check the console output:
- If a rule is not found for a task's phase+owner, it's skipped
- If an owner has no email, a warning is logged but no error thrown
- If GMAIL_USER or GMAIL_APP_PASSWORD is missing from `.env`, the transporter will fail

### Tasks Not Appearing

When creating a new hire/cohort, they get a snapshot of all **active** global tasks. If a task is inactive (soft-deleted), it won't be added to new hires but remains on existing hires with their completion state preserved.

## License

Internal use for GreenerField.
