# Syllabys

<p align="center">
  <img src="frontend/public/Logo.png" alt="Syllabys logo" width="160" />
</p>

<p align="center">A focused learning companion for planning coursework, tracking progress, testing knowledge, and learning with others.</p>

<p align="center"><a href="https://final-year-yynk.onrender.com"><strong>Open the live demo</strong></a></p>

## Overview

Syllabys is a full-stack learning platform for learners who want a clearer path through their coursework. It combines course planning, learning material, assessments, goals, progress analytics, peer collaboration, and AI-assisted study support in one product.

It is split into a React single-page application and an Express/PostgreSQL API, so the web client and API can be deployed independently.

## Interactive demo

The deployed application is available at [final-year-yynk.onrender.com](https://final-year-yynk.onrender.com). It is a live, authenticated demo—not a static mock-up.

| Demo URL | Administrator login |
| --- | --- |
| [Open Syllabys](https://final-year-yynk.onrender.com/auth) | **Email:** `admin@gmail.com`<br>**Password:** `Adminlan!` |

This account is intentionally a resume/demo account. Do not reuse these credentials for any personal or production service.

### Demo walkthrough

1. Open the [sign-in page](https://final-year-yynk.onrender.com/auth) and use the demo credentials above.
2. After login, open the dashboard to review the learner overview.
3. Use the sidebar to explore courses, challenges, insights, collaboration, profile, and administrator views.
4. Create or update learning content to demonstrate the full course-to-progress workflow.

> The live interactive demo is the canonical walkthrough. A standalone recorded video is not committed because one has not been supplied; adding a real YouTube, Loom, or MP4 URL here is the appropriate final step if a recruiter specifically requests video playback.

## Product preview

### Sign in

![Syllabys sign-in screen](docs/images/sign-in.png)

### Learning dashboard

![Syllabys learning dashboard](docs/images/dashboard.png)

### Learning insights

![Syllabys learning insights](docs/images/insights.png)

### Administrator dashboard

![Syllabys administrator dashboard](docs/images/admin-panel.png)

These images were captured from the deployed application with the documented demo administrator account. They show the sign-in flow, learner activity overview, progress analytics, and platform-management view.

## Features

- Account creation, email verification, sign-in, password reset, and profile management.
- Interest flow and personalised learning recommendations.
- Courses, modules, materials, deadlines, and progress tracking.
- Quizzes, goals, XP, streaks, leaderboards, and learning insights.
- Collaboration through chats, events, and Socket.IO real-time updates.
- AI study assistant where OpenAI/DeepSeek credentials are configured.
- User and platform management through administrator views.

## Architecture

```mermaid
flowchart LR
  U[Learner or administrator] --> W[React + Vite web application]
  W -->|HTTPS JSON + JWT| A[Express API]
  W <-->|Realtime updates| S[Socket.IO]
  A --> P[(PostgreSQL)]
  A --> M[SMTP email provider]
  A --> C[Cloudinary media storage]
  A --> I[AI providers]
  S --> A
```

| Area | Location | Responsibility |
| --- | --- | --- |
| Web application | `frontend/` | React UI, navigation, API client, browser sessions |
| API | `server/` | Express routes, authentication, business logic, Socket.IO |
| Database schema | `server/src/config/migrate.js` | PostgreSQL tables and indexes |
| API client | `frontend/src/api/` | Axios configuration and endpoint helpers |
| Authentication | `server/src/controllers/authController.js` | Registration, verification, login, passwords |

## Technology

| Layer | Tools |
| --- | --- |
| Frontend | React 19, Vite, React Router, Material UI, Recharts |
| Backend | Node.js, Express, Socket.IO |
| Data | PostgreSQL with `pg` |
| Auth | JWT, bcrypt, email verification |
| Integrations | Nodemailer, Cloudinary, OpenAI, DeepSeek, Dialogflow |

## Project structure

```text
final_year/
├── frontend/                 # React/Vite client
│   ├── public/               # Logo, voices, public assets
│   └── src/                  # Pages, components, routes, API client
├── server/                   # Express API
│   ├── scripts/              # Operational scripts
│   └── src/
│       ├── controllers/      # Request handlers
│       ├── models/           # Data access helpers
│       ├── routes/           # API route definitions
│       └── config/           # Database and runtime configuration
└── README.md
```

## Local setup

### Prerequisites

- Node.js 20 LTS or newer
- npm 9 or newer
- PostgreSQL database
- SMTP credentials for verification and password email

Cloudinary and AI-provider credentials are optional unless those features are enabled.

### Configure environment files

```powershell
copy frontend\.env.example frontend\.env
copy server\.env.example server\.env
```

On macOS/Linux, replace `copy` with `cp`. Set real secret values in `server/.env`; never commit environment files, database URLs, API keys, or email passwords.

### Install, migrate, and run

```powershell
cd frontend
npm ci

cd ..\server
npm ci
npm run create-tables
```

Start the API and frontend in separate terminals:

```powershell
# Terminal 1
cd server
npm run dev

# Terminal 2
cd frontend
npm run dev
```

The local frontend runs at `http://localhost:5173`; the API runs at `http://localhost:4000` by default.

## Environment variables

Templates are included at `frontend/.env.example` and `server/.env.example`.

### Frontend: `frontend/.env`

```env
VITE_API_BASE_URL=http://localhost:4000
VITE_SUPPORT_EMAIL=admin@your-domain.example
```

`VITE_*` values are embedded at build time. Rebuild and redeploy the frontend whenever one changes.

### Backend: `server/.env`

```env
NODE_ENV=development
PORT=4000
POSTGRES_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
JWT_SECRET=replace-with-a-long-random-secret
FRONTEND_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173
BASE_URL=http://localhost:4000

APP_NAME=Syllabys
SUPPORT_EMAIL=admin@your-domain.example
EMAIL_FROM=admin@your-domain.example
EMAIL_PASS=your-email-provider-app-password
```

For a custom SMTP provider, configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and optionally `SMTP_SECURE`. Gmail settings are used when no custom SMTP host is supplied.

## Authentication and reliability

- JWTs are sent in the `Authorization: Bearer <token>` header.
- Normal sessions use `sessionStorage`; “Remember me” sessions use `localStorage`.
- Password hashes and verification/reset tokens are never returned by user endpoints.
- Registration responds after the account is created; verification delivery runs in the background so a slow SMTP provider does not cause sign-up timeouts.
- An unverified sign-in triggers a non-blocking verification email resend.
- Database connection/query limits and browser timeouts are bounded to provide clear failure feedback rather than indefinite loading.

## API overview

All endpoints are mounted under `/api`.

| Domain | Representative endpoints |
| --- | --- |
| Authentication | `POST /auth/register`, `POST /auth/login`, `GET /auth/verify/:token` |
| Passwords | `PUT /auth/forgot-password`, `PUT /auth/update-password` |
| Users | `GET /users`, `GET /users/:userId`, `PUT /users/:userId/bio` |
| Learning | `/courses`, `/progress`, `/quizzes` |
| Engagement | `/goals`, `/leaderboard`, `/insights`, `/recommendations` |
| Collaboration | `/chats`, `/events`, Socket.IO |
| Supporting features | `/interest-flow`, `/assistant`, `/feedback`, `/analytics` |

Protected routes require a valid bearer token. See `server/src/routes/` for the complete route definitions.

## Administrator operations

Use the one-time account management script to change an existing account’s email/password and assign the `admin` role. It requires an existing user matching `CURRENT_ADMIN_EMAIL`, never prints the password, and requires a password of at least 12 characters.

```powershell
cd server
$env:CURRENT_ADMIN_EMAIL='existing-admin@example.com'
$env:ADMIN_EMAIL='new-admin@example.com'
$env:ADMIN_PASSWORD='use-a-unique-password-of-at-least-12-characters'
npm run manage-admin
```

## Deployment

Deploy `frontend` and `server` as separate services.

| Service | Root | Build | Start/publish |
| --- | --- | --- | --- |
| API | `server` | `npm ci` | `npm start` |
| Web | `frontend` | `npm ci && npm run build` | publish `dist` |

Set `POSTGRES_URL`, `JWT_SECRET`, email settings, `FRONTEND_URL`, and `CORS_ORIGIN` in the API host’s secret manager. Set `VITE_API_BASE_URL=https://your-api.example.com` in the frontend build environment.

## Quality checks

```powershell
cd frontend
npm run lint
npm run build
```

```powershell
cd server
node --check src/controllers/authController.js
node --check src/utils/sendEmail.js
```

## Security and operations

- Use HTTPS in production for the web app, API, and database connection.
- Restrict `CORS_ORIGIN` to approved frontend origins; do not use `*` with authenticated requests.
- Use a distinct high-entropy `JWT_SECRET` in every environment.
- Keep deployment secrets in the host’s secret manager, not committed `.env` files.
- Add rate limiting, structured logs, uptime monitoring, and error tracking before substantial public traffic.
- Back up PostgreSQL and test recovery procedures.

## Troubleshooting

| Problem | What to check |
| --- | --- |
| Login or registration times out | API availability, `POSTGRES_URL`, SMTP configuration, and browser/server logs. |
| Browser blocks API requests | `CORS_ORIGIN` must exactly match the frontend origin, including `https://`. |
| Frontend cannot reach the API | Set `VITE_API_BASE_URL` to the API origin without `/api`, then rebuild. |
| Verification email does not arrive | Sender credentials, spam folders, and `BASE_URL`/`FRONTEND_URL`. |
| Database connection fails | PostgreSQL URL, SSL settings, provider firewall access, and connection limits. |

## License

No license is currently declared. Add a license file before public distribution.
