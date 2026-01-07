# 🚀 Deploy Your KMRL Website NOW - Step by Step

Your code is ready on GitHub: `https://github.com/GoyardGlasses/kmrl-kochi-metro.git`

## ⚡ Quick Deploy on Railway.app (5 minutes)

### Step 1: Sign Up/Login
1. Go to **https://railway.app**
2. Click **"Start a New Project"** or **"Login"**
3. Sign up with GitHub (recommended)

### Step 2: Create Project
1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Find and select **`kmrl-kochi-metro`** repository
4. Click **"Deploy Now"**

### Step 3: Add MongoDB Database
1. In your Railway project, click **"+ New"**
2. Select **"Database"**
3. Click **"Add MongoDB"**
4. Wait for it to provision (30 seconds)
5. Click on the MongoDB service
6. Go to **"Variables"** tab
7. **Copy the `MONGO_URL`** value (you'll need this)

### Step 4: Configure Backend Service
1. Railway should have auto-created a service from your repo
2. Click on the service (or create new if needed)
3. Go to **"Settings"** tab:
   - **Root Directory**: `kmrl-fullstack/backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npx tsx src/index.ts`
4. Go to **"Variables"** tab, add these:

```
NODE_ENV=production
PORT=3000
MONGODB_URI=<paste-the-MONGO_URL-from-step-3>
JWT_SECRET=<paste-from-JWT_SECRET.txt-file>
CORS_ORIGIN=https://your-frontend-url.railway.app
```

5. Go to **"Settings"** → **"Generate Domain"**
6. **Copy the domain** (e.g., `kmrl-backend-production-xxxx.up.railway.app`)

### Step 5: Deploy Frontend
1. Click **"+ New"** → **"GitHub Repo"**
2. Select **`kmrl-kochi-metro`** again
3. Go to **"Settings"**:
   - **Root Directory**: `kmrl-frontend`
   - **Build Command**: `npm install && npm run build`
   - **Output Directory**: `dist`
4. Go to **"Variables"** tab, add:

```
VITE_API_BASE_URL=https://<your-backend-domain-from-step-4>/api
VITE_ENABLE_MOCK_API=false
```

5. Go to **"Settings"** → **"Generate Domain"**
6. **Copy the frontend domain**

### Step 6: Update CORS
1. Go back to **Backend service**
2. **Variables** tab
3. Update `CORS_ORIGIN` to your frontend URL:
   ```
   CORS_ORIGIN=https://<your-frontend-domain>
   ```
4. The backend will automatically redeploy

### Step 7: Access Your Website! 🎉
Visit your frontend URL: `https://<your-frontend-domain>`

---

## 🔐 Your JWT Secret

Check the file `JWT_SECRET.txt` in your project folder for your secure JWT secret.

**⚠️ Keep this secret safe! Don't share it publicly.**

---

## 📋 Environment Variables Checklist

### Backend Variables:
- [ ] `NODE_ENV=production`
- [ ] `PORT=3000`
- [ ] `MONGODB_URI=<from-mongodb-service>`
- [ ] `JWT_SECRET=<from-JWT_SECRET.txt>`
- [ ] `CORS_ORIGIN=<your-frontend-url>`

### Frontend Variables:
- [ ] `VITE_API_BASE_URL=<your-backend-url>/api`
- [ ] `VITE_ENABLE_MOCK_API=false`

---

## 🆘 Troubleshooting

### Backend won't start
- Check logs: Click on backend service → "Deployments" → Click latest deployment → "View Logs"
- Verify MongoDB URI is correct
- Check all environment variables are set

### Frontend can't reach backend
- Verify `VITE_API_BASE_URL` matches backend domain
- Check `CORS_ORIGIN` includes frontend domain
- Make sure backend is deployed and running

### Build fails
- Check build logs in Railway dashboard
- Verify Node.js version (should auto-detect 20+)
- Ensure all files are committed to GitHub

---

## ✅ Post-Deployment Checklist

- [ ] Frontend loads at your Railway URL
- [ ] Can access `/admin/signup` page
- [ ] Can create an account
- [ ] Can log in
- [ ] Dashboard shows data
- [ ] API calls work (check browser console)

---

## 🎯 Your Deployment URLs

After deployment, you'll have:
- **Frontend**: `https://kmrl-frontend-xxxx.up.railway.app`
- **Backend**: `https://kmrl-backend-xxxx.up.railway.app`
- **MongoDB**: Managed by Railway (internal)

---

## 💡 Pro Tips

1. **Custom Domain**: Add your own domain in Railway settings
2. **Monitor**: Check Railway dashboard for usage and logs
3. **Updates**: Push to GitHub → Railway auto-deploys
4. **Backups**: MongoDB data is persisted in Railway

---

## 📞 Need Help?

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Check deployment logs in Railway dashboard

---

**Ready? Start at Step 1 above!** 🚀

