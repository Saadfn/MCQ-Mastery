# MCQ-Mastery Deployment Guide

This guide covers deploying the MCQ-Mastery application with:
- **Backend**: FastAPI on a free cloud platform (Render, Railway, or Fly.io)
- **Frontend**: React on Vercel

## Architecture Overview

```
┌─────────────────────┐         ┌─────────────────────┐
│   Vercel (Free)     │         │  Render/Railway     │
│   ┌─────────────┐   │  HTTPS  │   ┌─────────────┐   │
│   │   React     │◄──┼─────────┼──►│   FastAPI   │   │
│   │  Frontend   │   │         │   │   Backend   │   │
│   └─────────────┘   │         │   └─────────────┘   │
└─────────────────────┘         └──────────┬──────────┘
                                           │
                                           ▼
                                ┌─────────────────────┐
                                │   Google Gemini     │
                                │   (API Key stored   │
                                │    on backend)      │
                                └─────────────────────┘
```

---

## Option 1: Deploy Backend to Render.com (Recommended - Free)

### Step 1: Create Render Account
1. Go to [render.com](https://render.com) and sign up
2. Connect your GitHub account

### Step 2: Create New Web Service
1. Click **New** → **Web Service**
2. Connect your repository
3. Configure:
   - **Name**: `mcq-mastery-api`
   - **Region**: Choose closest to your users
   - **Branch**: `main` (or your branch)
   - **Root Directory**: `backend`
   - **Runtime**: `Docker`
   - **Instance Type**: `Free`

### Step 3: Set Environment Variables
In Render dashboard, add these environment variables:

| Key | Value |
|-----|-------|
| `GEMINI_API_KEY` | Your Google Gemini API key |
| `GEMINI_MODEL` | `gemini-2.0-flash` |
| `CORS_ORIGINS` | `https://your-app.vercel.app` |

### Step 4: Deploy
Click **Create Web Service**. Render will build and deploy automatically.

Your backend URL will be: `https://mcq-mastery-api.onrender.com`

---

## Option 2: Deploy Backend to Railway.app (Free Tier)

### Step 1: Create Railway Account
1. Go to [railway.app](https://railway.app) and sign up
2. Connect your GitHub account

### Step 2: Create New Project
1. Click **New Project** → **Deploy from GitHub repo**
2. Select your repository
3. Railway will auto-detect the Dockerfile

### Step 3: Configure
1. Go to **Settings** → **Root Directory**: Set to `backend`
2. Go to **Variables** and add:
   - `GEMINI_API_KEY`: Your API key
   - `GEMINI_MODEL`: `gemini-2.0-flash`
   - `CORS_ORIGINS`: `https://your-app.vercel.app`
   - `PORT`: `8000`

### Step 4: Generate Domain
1. Go to **Settings** → **Networking**
2. Click **Generate Domain**

Your backend URL will be: `https://mcq-mastery-api.up.railway.app`

---

## Option 3: Deploy Backend to Fly.io (Free Tier)

### Step 1: Install Fly CLI
```bash
# macOS
brew install flyctl

# Linux
curl -L https://fly.io/install.sh | sh

# Windows
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
```

### Step 2: Login and Initialize
```bash
cd backend
fly auth login
fly launch --name mcq-mastery-api
```

### Step 3: Set Secrets
```bash
fly secrets set GEMINI_API_KEY="your-api-key"
fly secrets set GEMINI_MODEL="gemini-2.0-flash"
fly secrets set CORS_ORIGINS="https://your-app.vercel.app"
```

### Step 4: Deploy
```bash
fly deploy
```

Your backend URL will be: `https://mcq-mastery-api.fly.dev`

---

## Deploy Frontend to Vercel

### Step 1: Create Vercel Account
1. Go to [vercel.com](https://vercel.com) and sign up
2. Connect your GitHub account

### Step 2: Import Project
1. Click **Add New** → **Project**
2. Import your GitHub repository
3. Vercel will auto-detect it's a Vite project

### Step 3: Configure Environment Variables
In the Vercel dashboard, add:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://mcq-mastery-api.onrender.com` (your backend URL) |

### Step 4: Deploy
Click **Deploy**. Vercel will build and deploy automatically.

Your frontend URL will be: `https://mcq-mastery.vercel.app`

### Step 5: Update Backend CORS
Go back to your backend hosting (Render/Railway/Fly.io) and update:
```
CORS_ORIGINS=https://mcq-mastery.vercel.app
```

---

## Local Development with Docker

### Run Both Services Locally
```bash
# Create .env file in root
echo "GEMINI_API_KEY=your-api-key" > .env
echo "VITE_API_URL=http://localhost:8000" >> .env

# Start both services
docker-compose up --build
```

- Frontend: http://localhost:80
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Run Backend Only (for frontend dev)
```bash
# Start just the backend
docker-compose up backend

# In another terminal, run frontend with npm
npm run dev
```

---

## Environment Variables Reference

### Backend (.env)
```bash
# Required
GEMINI_API_KEY=your_gemini_api_key_here

# Optional
GEMINI_MODEL=gemini-2.0-flash          # Default model
HOST=0.0.0.0                            # Server host
PORT=8000                               # Server port
CORS_ORIGINS=https://your-app.vercel.app  # Allowed origins (comma-separated)
```

### Frontend (.env)
```bash
# Required for production
VITE_API_URL=https://your-backend-url.com
```

---

## Troubleshooting

### Backend Issues

**"GEMINI_API_KEY not set"**
- Ensure the environment variable is set in your hosting provider
- Check for typos in the variable name

**CORS Errors**
- Update `CORS_ORIGINS` to include your frontend URL
- Make sure to include `https://` prefix
- Multiple origins: `https://app1.com,https://app2.com`

**Cold Start Delays (Free Tier)**
- Free tiers typically have cold starts (15-30 seconds after inactivity)
- Consider upgrading to paid tier for always-on service
- Add a health check ping from your frontend to keep it warm

### Frontend Issues

**API calls failing**
- Check `VITE_API_URL` is set correctly in Vercel
- Verify backend is running: visit `https://your-backend/health`
- Check browser console for CORS errors

**Build failing on Vercel**
- Ensure `package.json` has correct build script
- Check for TypeScript errors locally: `npm run build`

---

## Cost Summary (Free Tiers)

| Service | Free Tier Limits |
|---------|-----------------|
| **Render** | 750 hours/month, sleeps after 15min inactivity |
| **Railway** | $5 credit/month, 500 hours |
| **Fly.io** | 3 shared VMs, 160GB outbound |
| **Vercel** | Unlimited for personal projects |

---

## Production Checklist

- [ ] Backend deployed and healthy (`/health` returns 200)
- [ ] Frontend deployed and loading
- [ ] `VITE_API_URL` pointing to production backend
- [ ] `CORS_ORIGINS` includes frontend URL
- [ ] `GEMINI_API_KEY` set in backend environment
- [ ] Firebase security rules configured
- [ ] Test image upload and analysis
- [ ] Test PDF processing
