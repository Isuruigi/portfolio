# 🚀 Deploy Your Chatbot Backend

> 💡 **NEW: Railway Trial Expired?**  
> Check out [ORACLE_CLOUD_DEPLOYMENT.md](ORACLE_CLOUD_DEPLOYMENT.md) for **truly free cloud options** including:
> - **Oracle Cloud** (1GB RAM, always-on, FREE FOREVER)
> - **Hugging Face Spaces** (2GB RAM, perfect for AI/ML apps)
> - **Fly.io** (3 free VMs)
>
> These platforms offer better free tiers than Render!

---

## 🔵 Option: Render (750 hours/month)

### Why Render?
- ✅ **750 free hours/month** (enough for most portfolios)
- ✅ Auto-deploy from GitHub
- ✅ Free SSL/HTTPS
- ✅ Easy environment variables
- ⚠️ Cold starts after 15 min inactivity (first request takes ~30-60s)

---

## 📋 Prerequisites
1. GitHub account
2. Your code pushed to GitHub
3. Groq API key (for LLM)

---

## 🎯 Deployment Steps

### Step 1: Push Your Backend to GitHub
```bash
cd backend
git add .
git commit -m "Add Render deployment config"
git push origin main
```

### Step 2: Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Authorize Render to access your repositories

### Step 3: Create New Web Service
1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository
3. Select your portfolio repository

### Step 4: Configure Service
Fill in these settings:

| Setting | Value |
|---------|-------|
| **Name** | `portfolio-chatbot-backend` |
| **Root Directory** | `backend` |
| **Runtime** | `Python 3` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| **Instance Type** | `Free` |

### Step 5: Add Environment Variables
Click **"Advanced"** → **"Add Environment Variable"**

Add these:
- **Key**: `GROQ_API_KEY`  
  **Value**: `your-groq-api-key-here`

- **Key**: `PYTHON_VERSION`  
  **Value**: `3.11.0`

### Step 6: Deploy!
1. Click **"Create Web Service"**
2. Wait for deployment (5-10 minutes first time)
3. Once deployed, you'll get a URL like:
   ```
   https://portfolio-chatbot-backend.onrender.com
   ```

### Step 7: Test Your Chatbot
Test the API:
```bash
curl https://your-backend-url.onrender.com/health
```

Or visit: `https://your-backend-url.onrender.com/docs` for API documentation

---

## 🔧 Update Your Frontend

Update your frontend to use the new backend URL:

**In `src/components/Chatbot.tsx`** (or wherever you make API calls):
```typescript
const API_URL = "https://portfolio-chatbot-backend.onrender.com";
```

---

## 🚨 Important Notes

### Cold Starts
- Free tier spins down after **15 minutes** of inactivity
- First request after sleep takes **30-60 seconds**
- Subsequent requests are fast

### Solutions for Cold Starts:
1. **Accept it** - Most visitors won't notice
2. **Keep-alive service** - Use [cron-job.org](https://cron-job.org) to ping your backend every 14 minutes
3. **Upgrade to paid** - $7/month for always-on instance

### Storage
- Render doesn't persist files between deploys
- Your FAISS vector store is rebuilt on each startup (this is fine for your use case)

---

## 🆓 Alternative: Fly.io (If Render Doesn't Work)

If you want to try Fly.io instead:

### Quick Setup:
```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Login
flyctl auth login

# Deploy from backend folder
cd backend
flyctl launch --now
```

Fly.io gives you **3 free VMs** with better cold start times.

---

## 📊 Free Tier Comparison

| Platform | Free Tier | Cold Starts | Pros |
|----------|-----------|-------------|------|
| **Render** | 750 hrs/month | ~30-60s after 15min | Easiest setup |
| **Fly.io** | 3 shared VMs | ~5-10s | Faster cold starts |
| **Railway** | $5 credit (trial) | None | Was your previous choice |

---

## 🛟 Troubleshooting

### Issue: Build Fails
**Solution**: Check Python version matches (`3.11.0` recommended)

### Issue: App Crashes on Start
**Solution**: Check logs in Render dashboard, ensure `GROQ_API_KEY` is set

### Issue: CORS Errors
**Solution**: Update `main.py` to allow your frontend domain:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-frontend-domain.com",
        "http://localhost:3000"  # for local dev
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## ✅ Success Checklist

- [ ] Backend deployed to Render
- [ ] `/health` endpoint returns 200 OK
- [ ] `/docs` shows FastAPI documentation
- [ ] Environment variables set (GROQ_API_KEY)
- [ ] Frontend updated with new backend URL
- [ ] Chatbot responds to messages

---

## 🎉 You're Done!

Your chatbot is now deployed for free! 

**Next Steps:**
- Update your portfolio README with the new backend URL
- Monitor usage in Render dashboard
- Consider setting up a keep-alive if cold starts bother you

---

**Need Help?** Check the Render logs or DM me your error messages!
