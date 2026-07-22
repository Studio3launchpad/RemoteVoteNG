# 🗳️ RemoteVote NG — Frontend

> **TanStack Start + React** client application for the RemoteVote NG electronic voting platform. A full-featured electoral management interface serving voters, presiding officers, commissioners, and the INEC Secretary — built with a premium dark-mode design system.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Pages & Routes](#pages--routes)
- [Role-Based Dashboards](#role-based-dashboards)
- [Environment Variables](#environment-variables)
- [Getting Started (Local Development)](#getting-started-local-development)
- [Building for Production](#building-for-production)
- [Deployment (Vercel)](#deployment-vercel)
- [Key Features](#key-features)
- [Design System](#design-system)

---

## Overview

The RemoteVote NG frontend is a sophisticated single-page application serving the full e-voting lifecycle:

- **Voter Portal** — NIN-authenticated registration, OTP verification, and secure ballot casting
- **Commissioner Dashboard** — Election creation, candidate management, and staff onboarding
- **Secretary Dashboard** — System-wide metrics, audit logs, and oversight controls
- **Field Officer Views** — Result sheet submission, accreditation review
- **Observer/Agent Views** — Live election monitoring and dispute filing
- **Accreditation Portal** — Media and observer application submission

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | TanStack Start (SSR + file-based routing) |
| UI Library | React 19 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| Component Primitives | Radix UI |
| Icons | Lucide React |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| Routing | TanStack Router (type-safe, file-based) |
| State / Data | TanStack Query |
| Build Tool | Vite 8 |
| Deployment | Vercel (Cloudflare Workers / Nitro preset) |

---

## Project Structure

```
frontend/
├── public/                         # Static assets
├── src/
│   ├── components/
│   │   └── ui/                     # Radix UI component library (shadcn-style)
│   ├── lib/
│   │   └── api.ts                  # API client (reads VITE_API_BASE_URL from .env)
│   ├── routes/
│   │   ├── __root.tsx              # Root layout with auth context
│   │   ├── index.tsx               # Landing page / hero
│   │   ├── signup.tsx              # Voter registration
│   │   ├── onboard.tsx             # Staff onboarding (token-based invite accept)
│   │   ├── accreditation.tsx       # Observer/media accreditation portal
│   │   ├── dashboard.tsx           # Role-dispatching dashboard (all roles)
│   │   ├── vote.$id.tsx            # Ballot casting page (dynamic election ID)
│   │   └── results.tsx             # Public election results viewer
│   ├── server.ts                   # SSR error wrapper
│   └── styles.css                  # Global design system tokens
├── .env                            # Local environment variables
├── vercel.json                     # Vercel SPA routing configuration
├── vite.config.ts                  # Vite + TanStack config
├── tsconfig.json                   # TypeScript configuration
└── package.json
```

---

## Pages & Routes

| Route | Description | Auth Required |
|---|---|---|
| `/` | Landing page with login form | No |
| `/signup` | Voter NIN registration + NIMC verification | No |
| `/onboard` | Staff account activation via invitation token | No |
| `/accreditation` | Observer/media accreditation application | No |
| `/dashboard` | Role-specific control dashboard | ✅ Yes |
| `/vote/:id` | Ballot casting for a specific election | ✅ Yes (voter) |
| `/results` | Public election results and candidate stats | No |

---

## Role-Based Dashboards

The `/dashboard` route renders a different experience based on the authenticated user's role:

### 🗳️ Voter Dashboard
- Live list of active elections
- One-click ballot casting navigation
- Participation history with cryptographic receipts

### 🏛️ Commissioner Dashboard
**Tab 1 — Elections**
- Create, publish, advance, and delete elections
- Add/remove candidates with party colours and manifestos
- Multi-signature election closure approval

**Tab 2 — Accreditations**
- Review and approve/reject observer/media applications

**Tab 3 — Staff Invitations**
- Generate secure onboarding invitations
- Bulk invite via CSV upload
- Export invitation logs to CSV

**Tab 4 — Polling Units**
- Full CRUD for polling unit registry
- Import polling units from CSV
- Export to CSV

**Tab 5 — NIMC Records**
- Full CRUD for the simulated NIMC identity database
- Import and export CSV

### 📊 Secretary Dashboard
All commissioner capabilities, plus:

**Tab 1 — Metrics**
- System-wide stats: total voters, votes cast, polling units, elections, staff
- Live metric cards

**Tab 7 — System Audit Logs**
- Full audit trail of all CRUD operations
- Expandable JSON detail view per action

### 🏠 Field Officer Dashboards (PO / CO / RO)
- Assigned polling unit overview
- Form EC8A (ResultSheet) submission
- Dispute filing

### 👁️ Observer / Agent / Media Dashboard
- Read-only election status view
- Live dispute submission

---

## Environment Variables

Create a `.env` file in the `frontend/` directory:

```env
# Base URL of the Django REST API backend
# Development default: http://localhost:8000/api
# Production: replace with your deployed backend URL
VITE_API_BASE_URL=http://localhost:8000/api
```

> **Important:** All frontend environment variables must be prefixed with `VITE_` to be exposed to client-side code by Vite.

When deploying to Vercel, add `VITE_API_BASE_URL` in the Vercel **Environment Variables** dashboard.

---

## Getting Started (Local Development)

### Prerequisites
- Node.js 18+
- npm 9+

### Setup

```bash
# 1. Navigate to the frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Create your .env file
echo "VITE_API_BASE_URL=http://localhost:8000/api" > .env

# 4. Start the development server
npm run dev
```

The app will be available at `http://localhost:3000` (or the next available port).

> Make sure the Django backend is also running at `http://localhost:8000` before testing authenticated routes.

---

## Building for Production

```bash
npm run build
```

This runs a full Vite + Nitro production build outputting to `.output/`:
- `.output/public/` — Static client assets
- `.output/server/` — SSR server bundle (Nitro / Cloudflare Workers format)

---

## Deployment (Vercel)

The frontend is configured for Vercel deployment via `vercel.json`, which rewrites all paths to `index.html` to support client-side routing.

### Steps:
1. Push the `frontend/` folder to a GitHub repository (or as a monorepo subdirectory)
2. Connect the repository to Vercel
3. Set the **Root Directory** to `frontend`
4. Add the environment variable:
   ```
   VITE_API_BASE_URL = https://your-backend.vercel.app/api
   ```
5. Deploy

---

## Key Features

### 🔐 Authentication & MFA
- NIN-based login for voters
- Staff Number login for electoral officials
- OTP-based multi-factor authentication via email (Brevo)
- Persistent session via localStorage token

### 📊 CSV Import & Export
Available for Commissioners and Secretaries on Polling Units, NIMC Records, and Staff Invitations:

**Export CSV** — Downloads a properly formatted `.csv` file of the currently filtered/visible records.

**Import CSV** — Upload a `.csv` file to bulk-create records. Column headers are mapped fuzzily, so minor variations (e.g. "Name" vs "Facility Name") are handled automatically.

**Template formats:**

*Polling Units CSV:*
```csv
Code / ID,Name,Ward,LGA,State,Registered Voters
,Alausa Primary School,Ward 1,Ikeja,Lagos,1250
```

*NIMC Records CSV:*
```csv
NIN,Full Name,State,LGA,Biometric Hash
12345678901,Adaeze Nwosu,Lagos,Ikeja,mock_hash_xyz
```

*Staff Invitations CSV:*
```csv
Email,Role
po@example.com,po
co@example.com,co
```

### 🔍 Search & Filter
Every data table supports:
- Full-text search across key fields
- Status-based dropdown filtering

### 🗺️ Nigerian Electoral Context
All state and LGA selectors are pre-populated with all 36 Nigerian states + FCT and their respective LGAs.

---

## Design System

The UI uses a custom dark-mode-first design system built with Tailwind CSS v4 tokens:

- **Font:** Inter + DM Sans (via Google Fonts)
- **Primary Colour:** Deep indigo-brand palette (`--color-brand`)
- **Theme:** Rich dark mode with glass-morphism card styles
- **Animations:** CSS micro-animations on hover states and page transitions
- **Components:** Fully accessible Radix UI primitives styled with Tailwind

---

## License

MIT © RemoteVote NG — Studio3 Launchpad 2026
