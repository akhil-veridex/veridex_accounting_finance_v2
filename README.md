# Veridex One - Accounting & Finance Prototype

Monorepo containing the Veridex One Finance & Accounting SaaS prototype: a Node.js/Express + MongoDB backend and a React/Vite frontend.

## Repository Layout

```
backend/    Express API, MongoDB models, services, and acceptance tests
frontend/   React + Vite SPA (Tailwind CSS)
docs/       Architecture, phase reports, QA, and test documentation
```

## Prerequisites

- Node.js 18+
- npm
- MongoDB Atlas cluster (or local MongoDB instance)

## Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Fill in MONGODB_URI and JWT_SECRET in .env
npm start
```

The API runs on `http://localhost:5050` by default. Health check: `GET /api/v1/health`.

Run acceptance tests:

```bash
npm test
```

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The app runs on `http://localhost:3000` and proxies `/api` requests to the backend on port `5050`.

Production build:

```bash
npm run build
```

## Environment Variables

See `backend/.env.example`. Never commit the real `backend/.env`; it is git-ignored.

| Variable | Description |
| --- | --- |
| `PORT` | Backend HTTP port (default `5050`) |
| `NODE_ENV` | Runtime environment |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret used to sign authentication tokens |
| `DEFAULT_TENANT_ID` | Fallback tenant identifier |
| `BASE_CURRENCY` | Base accounting currency |
| `ENABLE_LEGACY_POSTING_ADAPTER` | Enables the legacy posting adapter |
