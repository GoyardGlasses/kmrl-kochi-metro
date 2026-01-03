# KMRL Kochi Metro Rail Fullstack

A modern trainset operations dashboard for Kochi Metro Rail Limited with real-time monitoring, conflict resolution, and data ingestion.

## Quick Start with Docker (Recommended)

1. Install [Docker](https://docker.com) and Docker Compose
2. Clone this repo
3. Run:

```bash
docker compose up -d
```

- Frontend: http://localhost:8080
- Backend API: http://localhost:3000
- MongoDB runs inside Docker

Then visit http://localhost:8080/signup to create an account and log in.

## Manual Setup

### Prerequisites
- Node.js 20+
- MongoDB 8+ (running locally)
- Git

### Backend
```bash
cd kmrl-fullstack/backend
npm install
npm run dev
```

### Frontend
```bash
cd kmrl-frontend
npm install
npm run dev
```

Visit http://localhost:8080/signup to create an account and log in.

## Features

- Real-time trainset monitoring
- Conflict alerts and resolution with ML suggestions
- Data ingestion (Maximo, Fitness, UNS/IoT)
- What-if scenario modeling
- Audit logs
- Simple self-service login/signup (no strict API auth)

## Authentication

- Create an account at `/signup` (any email, password ≥6 chars)
- Log in at `/login`
- After login, access all pages and features
- All dashboard pages require authentication

## Environment Variables

Backend (`.env` in `kmrl-fullstack/backend`):
```
MONGODB_URI=mongodb://localhost:27017/kmrl
JWT_SECRET=your-secret
PORT=3000
NODE_ENV=development
```

Frontend (`.env` in `kmrl-frontend`):
```
VITE_API_BASE_URL=http://localhost:3000/api
VITE_ENABLE_MOCK_API=false
```

## Tech Stack

- **Frontend**: React, Vite, TypeScript, TailwindCSS, shadcn/ui
- **Backend**: Node.js, Express, TypeScript, Mongoose, JWT
- **Database**: MongoDB
- **Deployment**: Docker, Docker Compose, Nginx

## Detailed Instructions

See [SETUP.md](./SETUP.md) for step-by-step guidance to run the full website.
