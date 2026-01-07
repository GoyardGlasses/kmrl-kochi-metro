# Online Deployment Guide - KMRL Website

This guide will help you deploy your KMRL website to the cloud so it's accessible online.

## 🚀 Quick Deploy Options

### Option 1: Railway.app (Recommended - Easiest)
**Best for**: Full-stack apps with MongoDB
**Free tier**: Yes (with limits)
**Setup time**: ~10 minutes

### Option 2: Render.com
**Best for**: Separate frontend/backend deployment
**Free tier**: Yes
**Setup time**: ~15 minutes

### Option 3: Vercel (Frontend) + Railway (Backend)
**Best for**: Best performance, separate scaling
**Free tier**: Yes
**Setup time**: ~20 minutes

---

## 🎯 Option 1: Railway.app Deployment (Step-by-Step)

### Prerequisites
- GitHub account
- Railway account (free at [railway.app](https://railway.app))

### Step 1: Prepare Your Repository

1. **Push your code to GitHub** (if not already):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

### Step 2: Deploy on Railway

1. **Sign up/Login** at [railway.app](https://railway.app)
2. **Create New Project** → "Deploy from GitHub repo"
3. **Select your repository**

### Step 3: Add MongoDB Service

1. In your Railway project, click **"+ New"**
2. Select **"Database"** → **"Add MongoDB"**
3. Railway will create a MongoDB instance
4. **Copy the connection string** (you'll need it for the backend)

### Step 4: Deploy Backend

1. Click **"+ New"** → **"GitHub Repo"**
2. Select your repository
3. **Configure the service**:
   - **Name**: `kmrl-backend`
   - **Root Directory**: `kmrl-fullstack/backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npx tsx src/index.ts`

4. **Add Environment Variables**:
   ```
   NODE_ENV=production
   PORT=3000
   MONGODB_URI=<paste-mongodb-connection-string-from-step-3>
   JWT_SECRET=<generate-a-strong-random-secret>
   CORS_ORIGIN=https://your-frontend-url.railway.app
   ```

5. **Generate Domain**: Railway will assign a URL like `kmrl-backend-production.up.railway.app`
   - Copy this URL (you'll need it for frontend)

### Step 5: Deploy Frontend

1. Click **"+ New"** → **"GitHub Repo"**
2. Select your repository
3. **Configure the service**:
   - **Name**: `kmrl-frontend`
   - **Root Directory**: `kmrl-frontend`
   - **Build Command**: `npm install && npm run build`
   - **Output Directory**: `dist`

4. **Add Environment Variables**:
   ```
   VITE_API_BASE_URL=https://kmrl-backend-production.up.railway.app/api
   VITE_ENABLE_MOCK_API=false
   ```

5. **Generate Domain**: Railway will assign a URL like `kmrl-frontend-production.up.railway.app`

### Step 6: Update CORS

1. Go back to **Backend service**
2. Update `CORS_ORIGIN` environment variable:
   ```
   CORS_ORIGIN=https://kmrl-frontend-production.up.railway.app
   ```
3. **Redeploy** the backend

### Step 7: Access Your Website

Visit your frontend URL: `https://kmrl-frontend-production.up.railway.app`

---

## 🎯 Option 2: Render.com Deployment

### Backend on Render

1. **Sign up** at [render.com](https://render.com)
2. **New** → **Web Service**
3. **Connect GitHub** repository
4. **Configure**:
   - **Name**: `kmrl-backend`
   - **Root Directory**: `kmrl-fullstack/backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npx tsx src/index.ts`

5. **Environment Variables**:
   ```
   NODE_ENV=production
   PORT=10000
   MONGODB_URI=<mongodb-atlas-connection-string>
   JWT_SECRET=<your-secret>
   CORS_ORIGIN=https://kmrl-frontend.onrender.com
   ```

6. **Create MongoDB**: Use [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (free tier)

### Frontend on Render

1. **New** → **Static Site**
2. **Connect GitHub** repository
3. **Configure**:
   - **Name**: `kmrl-frontend`
   - **Root Directory**: `kmrl-frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`

4. **Environment Variables**:
   ```
   VITE_API_BASE_URL=https://kmrl-backend.onrender.com/api
   ```

---

## 🔐 Generate Secure Secrets

### Generate JWT Secret:
```bash
# On Windows PowerShell:
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})

# Or use online: https://randomkeygen.com/
```

### MongoDB Atlas Setup (if using Render):
1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create free cluster
3. Create database user
4. Whitelist IP: `0.0.0.0/0` (for Render) or your Railway IP
5. Get connection string

---

## ✅ Post-Deployment Checklist

- [ ] Frontend is accessible
- [ ] Backend API responds
- [ ] Can create account at `/admin/signup`
- [ ] Can log in
- [ ] Dashboard loads data
- [ ] CORS is configured correctly
- [ ] Environment variables are set
- [ ] MongoDB connection works

---

## 🔧 Troubleshooting

### Frontend can't reach backend
- Check `VITE_API_BASE_URL` matches backend URL
- Verify CORS_ORIGIN includes frontend URL
- Check backend logs for errors

### MongoDB connection fails
- Verify connection string format
- Check IP whitelist (MongoDB Atlas)
- Ensure credentials are correct

### Build fails
- Check build logs
- Verify Node.js version (should be 20+)
- Ensure all dependencies are in package.json

---

## 📝 Environment Variables Reference

### Backend
```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/kmrl
JWT_SECRET=your-strong-random-secret-here
CORS_ORIGIN=https://your-frontend-url.com
```

### Frontend
```env
VITE_API_BASE_URL=https://your-backend-url.com/api
VITE_ENABLE_MOCK_API=false
```

---

## 🚀 Quick Deploy Script

For Railway, you can also use Railway CLI:

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize
railway init

# Deploy
railway up
```

---

## 💡 Pro Tips

1. **Use custom domains**: Both Railway and Render support custom domains
2. **Enable HTTPS**: Automatically handled by both platforms
3. **Monitor logs**: Use Railway/Render dashboard to view logs
4. **Set up alerts**: Configure notifications for deployment failures
5. **Database backups**: Enable automatic backups on MongoDB Atlas

---

## 📞 Need Help?

- Railway Docs: https://docs.railway.app
- Render Docs: https://render.com/docs
- Check deployment logs in platform dashboard
- Verify environment variables are set correctly

