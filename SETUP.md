# KMRL Kochi Metro Rail — Full Setup Guide

Follow these steps to run the complete KMRL trainset operations dashboard locally or via Docker.

---

## Option A: Docker (Recommended — No local installs required)

### Prerequisites
- Install [Docker Desktop](https://docker.com) (Windows/Mac) or Docker Engine + Docker Compose (Linux)

### Steps
1. **Clone the repository**
   ```bash
   git clone https://github.com/GoyardGlasses/kmrl-kochi-metro.git
   cd kmrl-kochi-metro
   ```

2. **Start all services**
   ```bash
   docker compose up -d
   ```

3. **Wait for services to be ready** (usually 30–60 seconds)

4. **Open the application**
   - Frontend: http://localhost:8080
   - Backend API: http://localhost:3000

5. **Create an account and log in**
   - Navigate to http://localhost:8080/admin/signup
   - Enter any email and password (min 6 chars)
   - Then log in at http://localhost:8080/admin/login

6. **Explore the dashboard**
   - Decision Dashboard: http://localhost:8080/decision
   - Ingestion: http://localhost:8080/ingest
   - Audit Logs: http://localhost:8080/audit
   - What-If Scenarios: http://localhost:8080/whatif

---

## Option B: Manual Local Setup

### Prerequisites
- Node.js 20+ (download from [nodejs.org](https://nodejs.org))
- MongoDB 8+ running locally on `mongodb://localhost:27017`
- Git

### Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/GoyardGlasses/kmrl-kochi-metro.git
   cd kmrl-kochi-metro
   ```

2. **Start MongoDB** (if not already running)
   - Windows/Mac: Start MongoDB Community Server service
   - Linux: `sudo systemctl start mongod`

3. **Backend setup**
   ```bash
   cd kmrl-fullstack/backend
   npm install
   npm run dev
   ```
   - Backend runs on http://localhost:3000

4. **Frontend setup** (open a new terminal)
   ```bash
   cd kmrl-frontend
   npm install
   npm run dev
   ```
   - Frontend runs on http://localhost:8080

5. **Create account and log in**
   - Go to http://localhost:8080/admin/signup
   - Register with any email/password
   - Log in at http://localhost:8080/admin/login

6. **Use the app**
   - Visit http://localhost:8080
   - Browse all pages from the sidebar

---

## What You’ll See

### Home Dashboard
- Fleet overview with 40 trainsets (TS-01 to TS-40)
- KPI widgets: availability, conflicts, mileage, cleaning slots
- Status badges and quick actions

### Decision Dashboard
- Active conflict alerts with ML suggestions
- Manual resolution dialog
- Real-time monitoring status
- WhatsApp test integration
- Manual fitness/mileage update forms

### Data Ingestion
- Submit Maximo job cards (JSON)
- Submit fitness records (JSON)
- View ingestion runs and status

### What-If Scenarios
- Model changes to trainset availability
- Impact on revenue and operations

### Audit Logs
- History of all system actions
- Searchable and filterable

---

## Troubleshooting

### Docker
- `docker compose ps` — check if all containers are running
- `docker compose logs backend` — view backend logs
- `docker compose logs frontend` — view frontend logs
- `docker compose down && docker compose up -d` — restart services

### Manual Setup
- Ensure MongoDB is running: `mongosh --eval "db.adminCommand('ismaster')"`
- Backend port 3000 must be free
- Frontend port 8080 must be free
- Check `backend/.env` and `frontend/.env` if you changed defaults

---

## Environment Variables (Optional)

### Backend (`kmrl-fullstack/backend/.env`)
```
MONGODB_URI=mongodb://localhost:27017/kmrl
JWT_SECRET=your-jwt-secret
PORT=3000
NODE_ENV=development
```

### Frontend (`kmrl-frontend/.env`)
```
VITE_API_BASE_URL=http://localhost:3000/api
VITE_ENABLE_MOCK_API=false
```

---

## Need Help?

- Open an issue on GitHub: https://github.com/GoyardGlasses/kmrl-kochi-metro/issues
- Check the README.md for architecture details
- Review the Docker logs or console output for errors
