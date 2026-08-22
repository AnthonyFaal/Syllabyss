# Syllabyss

Syllabyss is a full-stack learning platform for personalised learning, course progress, assessments, goals, analytics, peer collaboration, recommendations, and AI-assisted study support.

It consists of a React/Vite single-page application and an Express/PostgreSQL API, designed for separate frontend and backend deployments.

## Architecture

```text
Browser (React + Vite)
        |
        | HTTPS / JSON + Bearer JWT
        v
Express API + Socket.IO
        |
        +-- PostgreSQL
        +-- Cloudinary (media uploads)
        +-- Email provider via Nodemailer
        +-- OpenAI / DeepSeek (where configured)
```

| Area | Location | Responsibility |
| --- | --- | --- |
| Frontend | `frontend/` | React UI, routes, API client, session handling |
| Backend | `server/` | Express routes, controllers, auth, database access |
| Migrations | `server/src/config/migrate.js` | PostgreSQL schema setup |
| API client | `frontend/src/api/` | Axios setup and endpoint functions |

## Features

- Email registration, verification, login, logout, password reset, and password changes
- Normal browser-session login plus optional persistent “Remember me” login
- Courses, modules, materials, and learning-progress tracking
- Quizzes, goals, XP, streaks, leaderboards, and insights
- Interest flow and learning recommendations
- Collaboration chat, events, and Socket.IO updates
- Profile biography and image upload
- Tutor/chat assistant, feedback, and admin views

## Requirements

- Node.js 18+ (Node 20 LTS recommended)
- npm 9+
- PostgreSQL
- SMTP credentials (a Gmail app password works)

Cloudinary, OpenAI, and DeepSeek credentials are optional unless their related features are enabled.

## Local development

1. Clone and enter the repository.

   ```bash
   git clone <repository-url>
   cd final_year
   ```

2. Create your environment files.

   ```bash
   copy frontend\.env.example frontend\.env
   copy server\.env.example server\.env
   ```

   On macOS/Linux, use `cp` instead of `copy`.

3. Set the real values in `server/.env`, especially `POSTGRES_URL`, `JWT_SECRET`, email credentials, and allowed frontend URL.

4. Install dependencies.

   ```bash
   cd frontend
   npm ci

   cd ..\server
   npm ci
   ```

5. Create/update database tables. Review migrations before running against a shared or production database.

   ```bash
   npm run create-tables
   ```

6. Start the services in separate terminals.

   ```bash
   # terminal 1
   cd server
   npm run dev

   # terminal 2
   cd frontend
   npm run dev
   ```

The default URLs are `http://localhost:5173` for the UI and `http://localhost:4000` for the API.

## Environment variables

Never commit real `.env` files or credentials. Keep the supplied `.env.example` files current.

### Frontend: `frontend/.env`

```env
VITE_API_BASE_URL=http://localhost:4000
```

Vite compiles `VITE_*` values at build time. Rebuild/redeploy the frontend after changing this value.

### Backend: `server/.env`

```env
NODE_ENV=development
PORT=4000
POSTGRES_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
JWT_SECRET=use-a-long-random-secret
FRONTEND_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173
EMAIL_FROM=your-email@example.com
EMAIL_PASS=your-email-provider-app-password
```

Optional integrations:

```env
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
OPEN_AI_KEY=
DEEPSEEK_API_KEY=
BASE_URL=http://localhost:4000
```

For multiple allowed frontend origins, use a comma-separated list without trailing slashes:

```env
CORS_ORIGIN=http://localhost:5173,https://your-frontend.onrender.com
```

## Authentication

The API uses JWT bearer tokens. The frontend adds the `Authorization: Bearer <token>` header automatically.

- **Normal login:** token is stored in `sessionStorage`; it lasts for the current browser session.
- **Remember me:** token is stored in `localStorage`; it survives browser restarts.
- **Logout or expired token:** stored tokens are cleared and protected routes send the user to `/auth`.
- **Verification:** accounts must verify their email before login.
- **Password reset:** requesting a reset sends a one-hour, single-use link. The API uses a generic response to avoid account enumeration.
- **Password change:** requires a valid JWT and changes only the authenticated account.

## API overview

All routes are mounted beneath `/api`.

| Area | Example endpoints |
| --- | --- |
| Authentication | `POST /auth/register`, `POST /auth/login`, `GET /auth/verify/:token`, `PUT /auth/forgot-password`, `PUT /auth/update-password` |
| Current user | `GET /me`, `GET /users/:userId`, `PUT /users/:userId/bio` |
| Learning | `/courses`, `/progress`, `/quizzes` |
| Engagement | `/goals`, `/leaderboard`, `/insights`, `/recommendations` |
| Collaboration | `/chats`, `/events`, Socket.IO |
| Other | `/interest-flow`, `/assistant`, `/feedback`, `/analytics` |

Protected endpoints need a valid bearer token. See `server/src/routes/` and `frontend/src/api/APIs.jsx` for the full inventory.

## Deployment

Deploy `frontend` and `server` as separate services.

### Backend service

- Root directory: `server`
- Build command: `npm ci`
- Start command: `npm start`
- Configure `POSTGRES_URL`, `JWT_SECRET`, email credentials, `FRONTEND_URL`, and `CORS_ORIGIN` in the host’s secret manager.

### Frontend service

- Root directory: `frontend`
- Build command: `npm ci && npm run build`
- Publish directory: `dist`
- Set `VITE_API_BASE_URL=https://your-api.onrender.com`

### Render configuration example

```env
# Backend
FRONTEND_URL=https://your-frontend.onrender.com
CORS_ORIGIN=https://your-frontend.onrender.com,http://localhost:5173

# Frontend
VITE_API_BASE_URL=https://your-api.onrender.com
```

Deploy the backend after modifying CORS values. Redeploy the frontend after modifying any `VITE_*` variable.

## Security and operations

- Use a distinct, high-entropy `JWT_SECRET` in each environment.
- Limit `CORS_ORIGIN` to known origins. Do not use `*` for authenticated browser APIs.
- Use HTTPS for frontend, API, and database in production.
- Keep credentials in the deployment provider’s secret manager only.
- Back up PostgreSQL and test recovery.
- Add rate limiting for login, registration, and password reset before substantial public traffic.
- Add structured logs, uptime monitoring, error tracking, and database metrics for production operations.
- Restrict Socket.IO origins in `server/src/config/socket.js` before enabling real-time features for public traffic.

## Troubleshooting

### CORS or preflight failure

Ensure `CORS_ORIGIN` includes the exact frontend origin, including `https://`, with no trailing slash. Redeploy the backend after changing it.

### Login returns 401 without “Remember me”

Deploy the current frontend. `axiosInstance.jsx` must use `getAuthToken()` so it can retrieve both session and persistent tokens.

### Frontend cannot reach the API

Check `VITE_API_BASE_URL`, rebuild the frontend, and verify that it is an HTTPS API URL. Do not include `/api`; the client appends it.

### Verification/reset email does not arrive

Verify `EMAIL_FROM` and `EMAIL_PASS`, use an app password where required, inspect server logs, and ensure `FRONTEND_URL` is the deployed UI address.

### Database cannot connect

Check `POSTGRES_URL`, SSL requirements, network access, and your provider’s connection limits. The backend logs the connection failure at startup.

## Commands

```bash
# Frontend
cd frontend
npm run dev
npm run build
npm run lint

# Backend
cd server
npm run dev
npm start
npm run create-tables
```

## License

Add the appropriate license before public distribution.
