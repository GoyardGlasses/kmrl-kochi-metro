# KMRL Website Deployment Guide

This guide covers multiple deployment options for the KMRL Kochi Metro Rail website.

## Table of Contents
1. [Docker Deployment (Recommended)](#docker-deployment)
2. [Cloud Platform Deployment](#cloud-platform-deployment)
3. [VPS/Server Deployment](#vpsserver-deployment)
4. [Environment Variables](#environment-variables)
5. [Security Checklist](#security-checklist)

---

## Docker Deployment

### Prerequisites
- Docker Desktop (Windows/Mac) or Docker Engine + Docker Compose (Linux)
- At least 4GB RAM available
- Ports 3000, 8080, and 27017 available

### Steps

1. **Navigate to project directory**
   ```bash
   cd kmrl-kochi-metro
   ```

2. **Update environment variables** (if needed)
   - Edit `docker-compose.yml` to change:
     - MongoDB credentials
     - JWT_SECRET (use a strong random string)
     - Ports if needed

3. **Build and start services**
   ```bash
   docker compose up -d --build
   ```

4. **Verify services are running**
   ```bash
   docker compose ps
   ```

5. **View logs** (if needed)
   ```bash
   docker compose logs -f backend
   docker compose logs -f frontend
   ```

6. **Access the application**
   - Frontend: http://localhost:8080
   - Backend API: http://localhost:3000

### Production Docker Deployment

For production, create a `docker-compose.prod.yml`:

```yaml
services:
  mongodb:
    image: mongo:8
    restart: always
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_USER}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
      MONGO_INITDB_DATABASE: kmrl
    volumes:
      - mongo_data:/data/db
    networks:
      - kmrl-network

  backend:
    build:
      context: ./kmrl-fullstack/backend
      dockerfile: Dockerfile
    restart: always
    environment:
      NODE_ENV: production
      MONGODB_URI: mongodb://${MONGO_USER}:${MONGO_PASSWORD}@mongodb:27017/kmrl?authSource=admin
      JWT_SECRET: ${JWT_SECRET}
      PORT: 3000
    depends_on:
      - mongodb
    networks:
      - kmrl-network

  frontend:
    build:
      context: ./kmrl-frontend
      dockerfile: Dockerfile
    restart: always
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend
    networks:
      - kmrl-network

volumes:
  mongo_data:

networks:
  kmrl-network:
    driver: bridge
```

Deploy with:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

---

## Cloud Platform Deployment

### Option 1: Railway.app (Easiest)

1. **Sign up** at [railway.app](https://railway.app)
2. **Create new project** → "Deploy from GitHub repo"
3. **Add services**:
   - MongoDB (use Railway's MongoDB service)
   - Backend (connect to your repo, set root to `kmrl-fullstack/backend`)
   - Frontend (connect to your repo, set root to `kmrl-frontend`)

4. **Configure environment variables**:
   - Backend: `MONGODB_URI`, `JWT_SECRET`, `PORT`
   - Frontend: `VITE_API_BASE_URL` (use Railway's backend URL)

5. **Deploy** - Railway will automatically build and deploy

### Option 2: Render.com

#### Backend Deployment
1. Create new **Web Service**
2. Connect your GitHub repository
3. Set:
   - **Root Directory**: `kmrl-fullstack/backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment**: Node

4. Add environment variables:
   ```
   MONGODB_URI=mongodb://...
   JWT_SECRET=your-secret
   PORT=3000
   NODE_ENV=production
   ```

#### Frontend Deployment
1. Create new **Static Site**
2. Connect your GitHub repository
3. Set:
   - **Root Directory**: `kmrl-frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`

4. Add environment variable:
   ```
   VITE_API_BASE_URL=https://your-backend.onrender.com/api
   ```

#### MongoDB
- Use Render's MongoDB service or MongoDB Atlas (free tier available)

### Option 3: AWS (EC2 + RDS)

1. **Launch EC2 instance** (Ubuntu 22.04, t2.medium or larger)
2. **Install Docker**:
   ```bash
   sudo apt update
   sudo apt install docker.io docker-compose -y
   sudo usermod -aG docker $USER
   ```

3. **Clone repository**:
   ```bash
   git clone <your-repo-url>
   cd kmrl-kochi-metro
   ```

4. **Set up MongoDB Atlas** (or use EC2 MongoDB):
   - Create cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
   - Get connection string

5. **Create `.env` files**:
   - Backend: `kmrl-fullstack/backend/.env`
   - Update `docker-compose.yml` with MongoDB Atlas URI

6. **Deploy**:
   ```bash
   docker compose up -d --build
   ```

7. **Configure security groups**:
   - Allow HTTP (80), HTTPS (443), and SSH (22)

8. **Set up domain** (optional):
   - Point DNS to EC2 IP
   - Use Nginx reverse proxy or AWS Application Load Balancer

### Option 4: Vercel (Frontend) + Railway/Render (Backend)

#### Frontend on Vercel
1. Import project from GitHub
2. Set:
   - **Root Directory**: `kmrl-frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Framework Preset**: Vite

3. Add environment variable:
   ```
   VITE_API_BASE_URL=https://your-backend-url.com/api
   ```

#### Backend on Railway/Render
- Follow steps from Option 1 or 2 above

### Option 5: DigitalOcean App Platform

1. **Create App** → Connect GitHub repository
2. **Add Components**:
   - **Backend**: Node.js service
     - Root: `kmrl-fullstack/backend`
     - Build: `npm install && npm run build`
     - Run: `npm start`
   
   - **Frontend**: Static site
     - Root: `kmrl-frontend`
     - Build: `npm install && npm run build`
     - Output: `dist`

3. **Add Database**: MongoDB (managed database)

4. **Configure environment variables** (same as above)

---

## VPS/Server Deployment

### Prerequisites
- Ubuntu 22.04 or similar Linux distribution
- Root or sudo access
- Domain name (optional but recommended)

### Step-by-Step

1. **Update system**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Install Docker**
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo usermod -aG docker $USER
   ```

3. **Install Docker Compose**
   ```bash
   sudo apt install docker-compose -y
   ```

4. **Clone repository**
   ```bash
   git clone <your-repo-url>
   cd kmrl-kochi-metro
   ```

5. **Set up environment variables**
   - Create `.env` files or update `docker-compose.yml`
   - Use strong passwords and secrets

6. **Deploy with Docker Compose**
   ```bash
   docker compose up -d --build
   ```

7. **Set up Nginx reverse proxy** (for custom domain)
   ```bash
   sudo apt install nginx -y
   ```

   Create `/etc/nginx/sites-available/kmrl`:
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com www.yourdomain.com;

       location / {
           proxy_pass http://localhost:8080;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }

       location /api {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

   Enable site:
   ```bash
   sudo ln -s /etc/nginx/sites-available/kmrl /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

8. **Set up SSL with Let's Encrypt**
   ```bash
   sudo apt install certbot python3-certbot-nginx -y
   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
   ```

9. **Set up auto-restart** (if containers stop)
   ```bash
   # Docker Compose already has restart: unless-stopped
   # For system-level restart:
   sudo systemctl enable docker
   ```

---

## Environment Variables

### Backend (`kmrl-fullstack/backend/.env`)

```env
# Database
MONGODB_URI=mongodb://localhost:27017/kmrl
# For MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/kmrl

# Server
NODE_ENV=production
PORT=3000

# Security
JWT_SECRET=your-strong-random-secret-key-change-this
JWT_EXPIRE=7d

# CORS
CORS_ORIGIN=https://yourdomain.com

# File Paths (if using file-based ingestion)
MAXIMO_JOBCARDS_CSV_PATH=/app/data/maximo/jobcards.csv
FITNESS_JSON_PATH=/app/data/fitness/fitness.json

# External Services (optional)
UNS_INGEST_TOKEN=your-uns-token
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@kmrl.com
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_FROM=+1234567890
```

### Frontend (`kmrl-frontend/.env`)

```env
VITE_APP_NAME=KMRL Decision Support
VITE_API_BASE_URL=https://your-backend-url.com/api
VITE_ENABLE_MOCK_API=false
```

**Note**: For Vite, environment variables must be prefixed with `VITE_` to be accessible in the browser.

---

## Security Checklist

### Before Going Live

- [ ] Change default MongoDB credentials
- [ ] Use strong `JWT_SECRET` (generate with: `openssl rand -base64 32`)
- [ ] Enable HTTPS/SSL (Let's Encrypt or cloud provider SSL)
- [ ] Set up firewall rules (only allow necessary ports)
- [ ] Use environment variables for all secrets (never commit `.env` files)
- [ ] Enable MongoDB authentication
- [ ] Set up regular database backups
- [ ] Configure CORS to only allow your frontend domain
- [ ] Set up monitoring and logging
- [ ] Review and update dependencies regularly
- [ ] Use a reverse proxy (Nginx) for additional security
- [ ] Set up rate limiting on API endpoints
- [ ] Enable MongoDB network access restrictions (if using Atlas)

### MongoDB Atlas Security

1. **Network Access**: Whitelist only your server IPs
2. **Database Users**: Create specific users with minimal privileges
3. **Encryption**: Enable encryption at rest and in transit
4. **Backups**: Enable automated backups

### Production Docker Security

- Use non-root user (already configured in Dockerfiles)
- Keep base images updated
- Scan images for vulnerabilities: `docker scan <image>`
- Use secrets management (Docker secrets or cloud provider secrets)

---

## Monitoring & Maintenance

### Health Checks

Add health check endpoints to monitor your services:

```bash
# Backend health
curl http://localhost:3000/api/health

# Frontend
curl http://localhost:8080
```

### Logs

```bash
# Docker logs
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f mongodb

# View last 100 lines
docker compose logs --tail=100 backend
```

### Backup MongoDB

```bash
# Create backup
docker exec kmrl-mongo mongodump --out /data/backup

# Restore backup
docker exec kmrl-mongo mongorestore /data/backup
```

### Update Application

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker compose up -d --build

# Or restart specific service
docker compose restart backend
```

---

## Troubleshooting

### Services won't start
- Check logs: `docker compose logs`
- Verify ports aren't in use: `netstat -tulpn | grep :3000`
- Check disk space: `df -h`

### Database connection errors
- Verify MongoDB is running: `docker compose ps`
- Check connection string format
- Verify network connectivity between containers

### Frontend can't reach backend
- Check `VITE_API_BASE_URL` is correct
- Verify CORS settings in backend
- Check firewall/security group rules

### Out of memory
- Increase Docker memory limit
- Use smaller base images (already using alpine)
- Consider upgrading server resources

---

## Quick Reference

### Common Commands

```bash
# Start services
docker compose up -d

# Stop services
docker compose down

# View logs
docker compose logs -f

# Rebuild after code changes
docker compose up -d --build

# Access MongoDB shell
docker exec -it kmrl-mongo mongosh

# Restart a service
docker compose restart backend

# View running containers
docker compose ps

# Remove everything (including volumes)
docker compose down -v
```

---

## Support

For issues or questions:
- Check logs: `docker compose logs`
- Review [SETUP.md](./SETUP.md) for local setup
- Open an issue on GitHub

